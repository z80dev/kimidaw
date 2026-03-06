/**
 * Session Recording System
 * Handles recording into clip slots and scenes
 */

import type { Clip, ClipSlot, Scene, Track, ClipType } from './types';

export interface RecordingSession {
  id: string;
  slotId: string;
  trackId: string;
  sceneId?: string;
  clipType: ClipType;
  startTick: number;
  isLooping: boolean;
  punchIn?: number;
  punchOut?: number;
}

export interface RecordingOptions {
  countInBars: number;
  createNewScene: boolean;
  sceneName?: string;
  loopRecord: boolean;
  punchIn?: number;
  punchOut?: number;
  armedTracksOnly: boolean;
}

export interface RetrospectiveCapture {
  buffer: Float32Array[];
  startTime: number;
  duration: number;
  isMIDI: boolean;
}

/**
 * Session Recording class
 * Manages recording into session view slots
 */
export class SessionRecording {
  private activeRecordings: Map<string, RecordingSession> = new Map();
  private retrospectiveBuffer: RetrospectiveCapture | null = null;
  private retrospectiveEnabled: boolean = true;
  private retrospectiveDurationMs: number = 30000; // 30 seconds
  
  private options: {
    onRecordingStart?: (session: RecordingSession) => void;
    onRecordingStop?: (session: RecordingSession, clip: Clip) => void;
    onRecordingCancel?: (session: RecordingSession) => void;
    onRetrospectiveCapture?: (capture: RetrospectiveCapture) => void;
  } = {};
  
  constructor(options?: typeof SessionRecording.prototype.options) {
    if (options) {
      this.options = options;
    }
  }
  
  /**
   * Start recording into a specific slot
   */
  startSlotRecording(
    slot: ClipSlot,
    clipType: ClipType,
    currentTick: number,
    options: Partial<RecordingOptions> = {}
  ): RecordingSession | null {
    // Check if already recording in this slot
    if (this.isRecordingInSlot(slot.id)) {
      return null;
    }
    
    const session: RecordingSession = {
      id: crypto.randomUUID(),
      slotId: slot.id,
      trackId: slot.trackId,
      sceneId: slot.sceneId,
      clipType,
      startTick: currentTick,
      isLooping: options.loopRecord ?? false,
      punchIn: options.punchIn,
      punchOut: options.punchOut,
    };
    
    this.activeRecordings.set(session.id, session);
    this.options.onRecordingStart?.(session);
    
    return session;
  }
  
  /**
   * Start recording into multiple armed tracks in a scene
   */
  startSceneRecording(
    scene: Scene,
    slots: ClipSlot[],
    tracks: Track[],
    currentTick: number,
    options: RecordingOptions
  ): RecordingSession[] {
    const sessions: RecordingSession[] = [];
    
    const targetTracks = options.armedTracksOnly
      ? tracks.filter(t => t.arm)
      : tracks;
    
    for (const track of targetTracks) {
      const slot = slots.find(s => s.trackId === track.id && s.sceneId === scene.id);
      if (!slot) continue;
      
      const clipType: ClipType = track.type === 'audio' ? 'audio' : 'midi';
      const session = this.startSlotRecording(slot, clipType, currentTick, options);
      
      if (session) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }
  
  /**
   * Create a new scene and record into armed tracks
   */
  createSceneAndRecord(
    slots: ClipSlot[],
    tracks: Track[],
    currentTick: number,
    options: RecordingOptions
  ): { scene: Scene; sessions: RecordingSession[] } | null {
    // Create new scene
    const scene: Scene = {
      id: crypto.randomUUID(),
      index: -1, // Will be set by SceneManager
      name: options.sceneName ?? `Scene ${Date.now()}`,
    };
    
    // Find or create slots for this scene
    const sceneSlots: ClipSlot[] = [];
    for (const track of tracks) {
      if (options.armedTracksOnly && !track.arm) continue;
      
      let slot = slots.find(s => s.trackId === track.id && s.sceneId === scene.id);
      if (!slot) {
        slot = {
          id: crypto.randomUUID(),
          trackId: track.id,
          sceneId: scene.id,
          state: 'empty',
        };
      }
      sceneSlots.push(slot);
    }
    
    const sessions = this.startSceneRecording(scene, sceneSlots, tracks, currentTick, options);
    
    return { scene, sessions };
  }
  
  /**
   * Stop a recording session
   */
  stopRecording(sessionId: string, endTick: number): Clip | null {
    const session = this.activeRecordings.get(sessionId);
    if (!session) return null;
    
    this.activeRecordings.delete(sessionId);
    
    // Create clip from recording
    const clip: Clip = {
      id: crypto.randomUUID(),
      name: `Recorded ${session.clipType}`,
      color: '#FF5252', // Default recording color
      type: session.clipType,
      trackId: session.trackId,
      startTick: session.startTick,
      endTick: endTick,
      launchSettings: {
        launchMode: 'trigger',
        quantization: 'global',
        velocity: false,
        legato: false,
      },
      followActions: [],
    };
    
    this.options.onRecordingStop?.(session, clip);
    return clip;
  }
  
  /**
   * Stop all active recordings
   */
  stopAllRecordings(endTick: number): Clip[] {
    const clips: Clip[] = [];
    
    for (const sessionId of this.activeRecordings.keys()) {
      const clip = this.stopRecording(sessionId, endTick);
      if (clip) {
        clips.push(clip);
      }
    }
    
    return clips;
  }
  
  /**
   * Cancel a recording without saving
   */
  cancelRecording(sessionId: string): boolean {
    const session = this.activeRecordings.get(sessionId);
    if (!session) return false;
    
    this.activeRecordings.delete(sessionId);
    this.options.onRecordingCancel?.(session);
    return true;
  }
  
  /**
   * Cancel all recordings
   */
  cancelAllRecordings(): void {
    for (const session of this.activeRecordings.values()) {
      this.options.onRecordingCancel?.(session);
    }
    this.activeRecordings.clear();
  }
  
  /**
   * Check if currently recording in a slot
   */
  isRecordingInSlot(slotId: string): boolean {
    for (const session of this.activeRecordings.values()) {
      if (session.slotId === slotId) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Check if currently recording in a track
   */
  isRecordingInTrack(trackId: string): boolean {
    for (const session of this.activeRecordings.values()) {
      if (session.trackId === trackId) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Get active recording for a slot
   */
  getRecordingForSlot(slotId: string): RecordingSession | undefined {
    for (const session of this.activeRecordings.values()) {
      if (session.slotId === slotId) {
        return session;
      }
    }
    return undefined;
  }
  
  /**
   * Get all active recordings
   */
  getActiveRecordings(): RecordingSession[] {
    return Array.from(this.activeRecordings.values());
  }
  
  /**
   * Enable/disable retrospective recording
   */
  setRetrospectiveEnabled(enabled: boolean): void {
    this.retrospectiveEnabled = enabled;
    if (!enabled) {
      this.retrospectiveBuffer = null;
    }
  }
  
  /**
   * Set retrospective buffer duration
   */
  setRetrospectiveDuration(durationMs: number): void {
    this.retrospectiveDurationMs = durationMs;
  }
  
  /**
   * Start retrospective capture buffer
   */
  startRetrospectiveCapture(isMIDI: boolean = true): void {
    if (!this.retrospectiveEnabled) return;
    
    this.retrospectiveBuffer = {
      buffer: [],
      startTime: performance.now(),
      duration: 0,
      isMIDI,
    };
  }
  
  /**
   * Add data to retrospective buffer
   */
  addToRetrospective(data: Float32Array): void {
    if (!this.retrospectiveBuffer) return;
    
    this.retrospectiveBuffer.buffer.push(data.slice());
    this.retrospectiveBuffer.duration = performance.now() - this.retrospectiveBuffer.startTime;
    
    // Trim old data
    while (this.retrospectiveBuffer.duration > this.retrospectiveDurationMs) {
      this.retrospectiveBuffer.buffer.shift();
      this.retrospectiveBuffer.duration = performance.now() - this.retrospectiveBuffer.startTime;
    }
  }
  
  /**
   * Capture retrospective buffer as a clip
   */
  captureRetrospective(
    trackId: string,
    clipType: ClipType
  ): { clip: Clip; buffer: RetrospectiveCapture } | null {
    if (!this.retrospectiveBuffer || this.retrospectiveBuffer.buffer.length === 0) {
      return null;
    }
    
    const capture = { ...this.retrospectiveBuffer };
    
    const clip: Clip = {
      id: crypto.randomUUID(),
      name: 'Captured MIDI',
      color: '#00BFA5',
      type: clipType,
      trackId,
      startTick: 0,
      endTick: capture.duration * 960 / 60000 * 120, // Approximate based on 120 BPM
      launchSettings: {
        launchMode: 'trigger',
        quantization: 'global',
        velocity: false,
        legato: false,
      },
      followActions: [],
    };
    
    this.options.onRetrospectiveCapture?.(capture);
    
    // Clear buffer after capture
    this.retrospectiveBuffer = null;
    
    return { clip, buffer: capture };
  }
  
  /**
   * Get recording progress (0-1) for loop recording
   */
  getRecordingProgress(sessionId: string, currentTick: number): number | null {
    const session = this.activeRecordings.get(sessionId);
    if (!session || !session.punchOut) return null;
    
    const duration = session.punchOut - session.startTick;
    const elapsed = currentTick - session.startTick;
    
    if (session.isLooping) {
      return (elapsed % duration) / duration;
    }
    
    return Math.min(1, elapsed / duration);
  }
  
  /**
   * Check if recording should punch out
   */
  shouldPunchOut(sessionId: string, currentTick: number): boolean {
    const session = this.activeRecordings.get(sessionId);
    if (!session || !session.punchOut) return false;
    
    if (session.isLooping) {
      return false; // Loop recording continues indefinitely
    }
    
    return currentTick >= session.punchOut;
  }
  
  /**
   * Reset all recording state
   */
  reset(): void {
    this.activeRecordings.clear();
    this.retrospectiveBuffer = null;
  }
}

/**
 * Calculate pre-roll time in ticks
 */
export function calculatePreRollTicks(bars: number, ppq: number = 960): number {
  return bars * ppq * 4; // Assuming 4/4 time
}

/**
 * Format recording time display
 */
export function formatRecordingTime(ticks: number, ppq: number = 960): string {
  const seconds = ticks / ppq * 60 / 120; // Assuming 120 BPM
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
