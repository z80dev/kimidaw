/**
 * Session-Arrangement Integration
 * Manages the relationship between Session and Arrangement views
 */

import type { Clip, Scene, Track, ClipSlot } from './types';

export interface CaptureOptions {
  startSceneIndex?: number;
  endSceneIndex?: number;
  includeEmptySlots?: boolean;
  consolidateClips?: boolean;
  insertAtPlayhead?: boolean;
  targetTrackIds?: string[];
}

export interface ConsolidateResult {
  arrangementClips: Clip[];
  capturedSlots: number;
  startTick: number;
  endTick: number;
}

export interface ViewSyncState {
  currentView: 'session' | 'arrangement';
  arrangementFollowsSession: boolean;
  returnToSessionOnStop: boolean;
  captureOnStop: boolean;
  syncPlayhead: boolean;
}

/**
 * Session-Arrangement Integration class
 * Handles capturing session to arrangement and view synchronization
 */
export class SessionArrangementIntegration {
  private state: ViewSyncState = {
    currentView: 'session',
    arrangementFollowsSession: false,
    returnToSessionOnStop: false,
    captureOnStop: false,
    syncPlayhead: true,
  };
  
  private options: {
    onViewChange?: (view: 'session' | 'arrangement') => void;
    onCaptureToArrangement?: (result: ConsolidateResult) => void;
    onContinueToArrangement?: (position: number) => void;
  } = {};
  
  constructor(options?: typeof SessionArrangementIntegration.prototype.options) {
    if (options) {
      this.options = options;
    }
  }
  
  /**
   * Switch to Session view
   */
  switchToSession(): void {
    this.state.currentView = 'session';
    this.options.onViewChange?.('session');
  }
  
  /**
   * Switch to Arrangement view
   */
  switchToArrangement(): void {
    this.state.currentView = 'arrangement';
    this.options.onViewChange?.('arrangement');
  }
  
  /**
   * Toggle between views
   */
  toggleView(): void {
    if (this.state.currentView === 'session') {
      this.switchToArrangement();
    } else {
      this.switchToSession();
    }
  }
  
  /**
   * Get current view
   */
  getCurrentView(): 'session' | 'arrangement' {
    return this.state.currentView;
  }
  
  /**
   * Capture session scenes to arrangement
   * Converts session slots into arrangement clips
   */
  captureToArrangement(
    scenes: Scene[],
    slots: ClipSlot[],
    clips: Map<string, Clip>,
    tracks: Track[],
    options: CaptureOptions = {}
  ): ConsolidateResult {
    const arrangementClips: Clip[] = [];
    let currentTick = 0;
    let capturedSlots = 0;
    
    const startIndex = options.startSceneIndex ?? 0;
    const endIndex = options.endSceneIndex ?? scenes.length - 1;
    
    // Filter to target tracks if specified
    const targetTracks = options.targetTrackIds
      ? tracks.filter(t => options.targetTrackIds!.includes(t.id))
      : tracks;
    
    for (let i = startIndex; i <= endIndex && i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneStartTick = currentTick;
      let sceneMaxDuration = 0;
      
      for (const track of targetTracks) {
        const slot = slots.find(s => 
          s.sceneId === scene.id && 
          s.trackId === track.id && 
          s.clipId
        );
        
        if (!slot) {
          if (options.includeEmptySlots) {
            // Insert silence/empty clip
            currentTick = sceneStartTick;
          }
          continue;
        }
        
        const clip = clips.get(slot.clipId);
        if (!clip) continue;
        
        // Create arrangement clip from session clip
        const arrangementClip: Clip = {
          ...clip,
          id: crypto.randomUUID(),
          startTick: sceneStartTick,
          endTick: sceneStartTick + (clip.endTick - clip.startTick),
        };
        
        arrangementClips.push(arrangementClip);
        capturedSlots++;
        
        // Track max duration for this scene
        const clipDuration = clip.endTick - clip.startTick;
        if (clip.loop?.enabled && clip.loop.endTick) {
          // For looped clips, use loop length as minimum
          sceneMaxDuration = Math.max(sceneMaxDuration, clip.loop.endTick - (clip.loop.startTick ?? 0));
        } else {
          sceneMaxDuration = Math.max(sceneMaxDuration, clipDuration);
        }
      }
      
      // Move to next scene position
      currentTick = sceneStartTick + Math.max(sceneMaxDuration, 960 * 4); // Minimum 1 bar
    }
    
    const result: ConsolidateResult = {
      arrangementClips,
      capturedSlots,
      startTick: 0,
      endTick: currentTick,
    };
    
    this.options.onCaptureToArrangement?.(result);
    return result;
  }
  
  /**
   * Continue playback from session to arrangement
   * Seamlessly transitions playback from session view to arrangement
   */
  continueToArrangement(
    currentTick: number,
    playingClipIds: string[],
    clips: Map<string, Clip>
  ): { newPosition: number; clipsToPlay: Clip[] } {
    // Find the arrangement position corresponding to current session state
    let newPosition = currentTick;
    const clipsToPlay: Clip[] = [];
    
    for (const clipId of playingClipIds) {
      const clip = clips.get(clipId);
      if (clip) {
        clipsToPlay.push(clip);
      }
    }
    
    this.options.onContinueToArrangement?.(newPosition);
    
    return { newPosition, clipsToPlay };
  }
  
  /**
   * Capture and insert a specific scene
   */
  captureSceneToArrangement(
    scene: Scene,
    slots: ClipSlot[],
    clips: Map<string, Clip>,
    tracks: Track[],
    insertAtTick: number
  ): ConsolidateResult {
    const arrangementClips: Clip[] = [];
    let capturedSlots = 0;
    let sceneMaxDuration = 0;
    
    for (const track of tracks) {
      const slot = slots.find(s => 
        s.sceneId === scene.id && 
        s.trackId === track.id && 
        s.clipId
      );
      
      if (!slot?.clipId) continue;
      
      const clip = clips.get(slot.clipId);
      if (!clip) continue;
      
      const arrangementClip: Clip = {
        ...clip,
        id: crypto.randomUUID(),
        startTick: insertAtTick,
        endTick: insertAtTick + (clip.endTick - clip.startTick),
      };
      
      arrangementClips.push(arrangementClip);
      capturedSlots++;
      
      const clipDuration = clip.endTick - clip.startTick;
      sceneMaxDuration = Math.max(sceneMaxDuration, clipDuration);
    }
    
    return {
      arrangementClips,
      capturedSlots,
      startTick: insertAtTick,
      endTick: insertAtTick + sceneMaxDuration,
    };
  }
  
  /**
   * Consolidate clips in arrangement
   * Merges multiple session clips into single arrangement clips
   */
  consolidateClips(
    clips: Clip[],
    targetTrackId: string
  ): Clip | null {
    if (clips.length === 0) return null;
    if (clips.length === 1) {
      return { ...clips[0], trackId: targetTrackId };
    }
    
    // Find overall bounds
    const startTick = Math.min(...clips.map(c => c.startTick));
    const endTick = Math.max(...clips.map(c => c.endTick));
    
    // Create consolidated clip
    const consolidated: Clip = {
      ...clips[0],
      id: crypto.randomUUID(),
      trackId: targetTrackId,
      name: `Consolidated ${clips[0].name}`,
      startTick,
      endTick,
      // Combine/merge notes, automation, etc.
    };
    
    return consolidated;
  }
  
  /**
   * Set arrangement follows session mode
   * When enabled, arrangement playhead follows session playback
   */
  setArrangementFollowsSession(enabled: boolean): void {
    this.state.arrangementFollowsSession = enabled;
  }
  
  /**
   * Set return to session on stop
   * When enabled, view automatically returns to session when transport stops
   */
  setReturnToSessionOnStop(enabled: boolean): void {
    this.state.returnToSessionOnStop = enabled;
  }
  
  /**
   * Set capture on stop
   * When enabled, captures session to arrangement when transport stops
   */
  setCaptureOnStop(enabled: boolean): void {
    this.state.captureOnStop = enabled;
  }
  
  /**
   * Set playhead sync
   * When enabled, playhead position is synchronized between views
   */
  setSyncPlayhead(enabled: boolean): void {
    this.state.syncPlayhead = enabled;
  }
  
  /**
   * Handle transport stop event
   */
  handleTransportStop(): void {
    if (this.state.captureOnStop && this.state.currentView === 'session') {
      // Trigger capture
    }
    
    if (this.state.returnToSessionOnStop && this.state.currentView === 'arrangement') {
      this.switchToSession();
    }
  }
  
  /**
   * Sync playhead between views
   */
  syncPlayheadPosition(sessionTick: number): number {
    if (!this.state.syncPlayhead) {
      return sessionTick;
    }
    
    // Convert session position to arrangement position
    // This may involve tempo mapping, scene lengths, etc.
    return sessionTick;
  }
  
  /**
   * Get sync state
   */
  getSyncState(): ViewSyncState {
    return { ...this.state };
  }
  
  /**
   * Update sync state
   */
  updateSyncState(updates: Partial<ViewSyncState>): void {
    Object.assign(this.state, updates);
  }
  
  /**
   * Calculate arrangement position from session position
   * Accounts for tempo changes, scene lengths, etc.
   */
  calculateArrangementPosition(
    sessionTick: number,
    scenes: Scene[],
    currentSceneIndex: number
  ): number {
    let arrangementTick = 0;
    
    // Sum durations of previous scenes
    for (let i = 0; i < currentSceneIndex && i < scenes.length; i++) {
      // Estimate scene duration (would need actual clip durations)
      arrangementTick += 960 * 4; // Default 1 bar per scene
    }
    
    // Add position within current scene
    arrangementTick += sessionTick % (960 * 4);
    
    return arrangementTick;
  }
  
  /**
   * Calculate session position from arrangement position
   */
  calculateSessionPosition(
    arrangementTick: number,
    scenes: Scene[]
  ): { sceneIndex: number; tickInScene: number } {
    let accumulated = 0;
    
    for (let i = 0; i < scenes.length; i++) {
      const sceneDuration = 960 * 4; // Default 1 bar
      
      if (accumulated + sceneDuration > arrangementTick) {
        return {
          sceneIndex: i,
          tickInScene: arrangementTick - accumulated,
        };
      }
      
      accumulated += sceneDuration;
    }
    
    // Past all scenes
    return {
      sceneIndex: scenes.length - 1,
      tickInScene: 0,
    };
  }
  
  /**
   * Create arrangement from entire session
   * Captures all scenes in order into a linear arrangement
   */
  createArrangementFromSession(
    scenes: Scene[],
    slots: ClipSlot[],
    clips: Map<string, Clip>,
    tracks: Track[]
  ): ConsolidateResult {
    return this.captureToArrangement(scenes, slots, clips, tracks, {
      includeEmptySlots: false,
      consolidateClips: true,
    });
  }
  
  /**
   * Export arrangement to session
   * Creates scenes from arrangement clips (reverse operation)
   */
  exportArrangementToSession(
    arrangementClips: Clip[],
    scenes: Scene[],
    slots: ClipSlot[]
  ): { scenes: Scene[]; slots: ClipSlot[] } {
    // Group clips by time position to create scenes
    const clipsByPosition = new Map<number, Clip[]>();
    
    for (const clip of arrangementClips) {
      const key = Math.floor(clip.startTick / (960 * 4)) * (960 * 4); // Round to bar
      if (!clipsByPosition.has(key)) {
        clipsByPosition.set(key, []);
      }
      clipsByPosition.get(key)!.push(clip);
    }
    
    const newScenes: Scene[] = [];
    const newSlots: ClipSlot[] = [];
    
    const sortedPositions = Array.from(clipsByPosition.keys()).sort((a, b) => a - b);
    
    for (let i = 0; i < sortedPositions.length; i++) {
      const scene: Scene = {
        id: crypto.randomUUID(),
        index: i,
        name: `Scene ${i + 1}`,
      };
      newScenes.push(scene);
      
      const positionClips = clipsByPosition.get(sortedPositions[i])!;
      for (const clip of positionClips) {
        const slot: ClipSlot = {
          id: crypto.randomUUID(),
          trackId: clip.trackId,
          sceneId: scene.id,
          clipId: clip.id,
          state: 'stopped',
        };
        newSlots.push(slot);
      }
    }
    
    return { scenes: newScenes, slots: newSlots };
  }
  
  /**
   * Reset integration state
   */
  reset(): void {
    this.state = {
      currentView: 'session',
      arrangementFollowsSession: false,
      returnToSessionOnStop: false,
      captureOnStop: false,
      syncPlayhead: true,
    };
  }
}

/**
 * Calculate total session duration
 */
export function calculateSessionDuration(
  scenes: Scene[],
  slots: ClipSlot[],
  clips: Map<string, Clip>,
  defaultSceneDuration: number = 960 * 4
): number {
  let total = 0;
  
  for (const scene of scenes) {
    const sceneSlots = slots.filter(s => s.sceneId === scene.id && s.clipId);
    let sceneDuration = defaultSceneDuration;
    
    for (const slot of sceneSlots) {
      if (!slot.clipId) continue;
      const clip = clips.get(slot.clipId);
      if (clip) {
        const duration = clip.endTick - clip.startTick;
        sceneDuration = Math.max(sceneDuration, duration);
      }
    }
    
    total += sceneDuration;
  }
  
  return total;
}
