/**
 * Take Lane management
 * Handles creation, organization, and manipulation of take lanes
 */

import type { 
  TakeLane, 
  TakeLaneType, 
  TakeLaneGroup, 
  CompTake,
  CompingOptions,
  CompingPreferences,
  CycleRecordMode
} from './types.js';
import type { AudioClip, MidiClip } from '@daw/project-schema';

export class TakeLaneManager {
  private lanes: Map<string, TakeLane> = new Map();
  private groups: Map<string, TakeLaneGroup> = new Map();
  private preferences: CompingPreferences;
  private options: CompingOptions;

  constructor() {
    this.preferences = {
      autoCreateTakeLanes: true,
      cycleRecordMode: 'create-new-lane',
      maxTakesPerLane: 10,
      autoColorTakes: true,
      showTakeNumbers: true
    };

    this.options = {
      autoCrossfade: true,
      defaultCrossfadeMs: 10,
      defaultFadeCurve: 'equal-power',
      snapToZeroCrossings: true,
      quantizeCompEdits: true,
      compGridDivision: 240 // 16th note at 960 PPQ
    };
  }

  /**
   * Create a new take lane for a track
   */
  createTakeLane(
    trackId: string,
    type: TakeLaneType,
    name?: string
  ): TakeLane {
    const existingLanes = this.getLanesForTrack(trackId);
    const takeNumber = existingLanes.length + 1;
    
    const lane: TakeLane = {
      id: this.generateId(),
      trackId,
      name: name || `Take ${takeNumber}`,
      type,
      clips: [],
      isActive: existingLanes.length === 0, // First lane is active
      isMuted: false,
      color: this.preferences.autoColorTakes 
        ? this.generateTakeColor(takeNumber)
        : '#808080',
      order: existingLanes.length,
      metadata: {
        recordDate: Date.now(),
        takeNumber
      }
    };

    this.lanes.set(lane.id, lane);
    this.updateGroupForTrack(trackId);
    
    return lane;
  }

  /**
   * Create multiple take lanes (e.g., for cycle recording)
   */
  createTakeLanesForCycle(
    trackId: string,
    type: TakeLaneType,
    numTakes: number
  ): TakeLane[] {
    const lanes: TakeLane[] = [];

    for (let i = 0; i < numTakes; i++) {
      const lane = this.createTakeLane(trackId, type, `Take ${i + 1}`);
      lanes.push(lane);
    }

    return lanes;
  }

  /**
   * Get all take lanes for a track
   */
  getLanesForTrack(trackId: string): TakeLane[] {
    return Array.from(this.lanes.values())
      .filter(lane => lane.trackId === trackId)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get a specific take lane
   */
  getLane(laneId: string): TakeLane | undefined {
    return this.lanes.get(laneId);
  }

  /**
   * Delete a take lane
   */
  deleteLane(laneId: string): boolean {
    const lane = this.lanes.get(laneId);
    if (!lane) return false;

    this.lanes.delete(laneId);
    this.renumberLanes(lane.trackId);
    this.updateGroupForTrack(lane.trackId);
    
    return true;
  }

  /**
   * Move a take lane up or down in the stack
   */
  moveLane(laneId: string, direction: 'up' | 'down'): boolean {
    const lane = this.lanes.get(laneId);
    if (!lane) return false;

    const lanes = this.getLanesForTrack(lane.trackId);
    const currentIndex = lanes.findIndex(l => l.id === laneId);
    
    if (direction === 'up' && currentIndex > 0) {
      const targetLane = lanes[currentIndex - 1];
      const tempOrder = lane.order;
      lane.order = targetLane.order;
      targetLane.order = tempOrder;
      return true;
    }
    
    if (direction === 'down' && currentIndex < lanes.length - 1) {
      const targetLane = lanes[currentIndex + 1];
      const tempOrder = lane.order;
      lane.order = targetLane.order;
      targetLane.order = tempOrder;
      return true;
    }

    return false;
  }

  /**
   * Add a clip to a take lane
   */
  addClipToLane(laneId: string, clip: AudioClip | MidiClip): boolean {
    const lane = this.lanes.get(laneId);
    if (!lane) return false;

    // Ensure clip type matches lane type
    const isAudioClip = 'assetId' in clip;
    if ((isAudioClip && lane.type !== 'audio') || 
        (!isAudioClip && lane.type !== 'midi')) {
      return false;
    }

    lane.clips.push(clip);
    return true;
  }

  /**
   * Remove a clip from a take lane
   */
  removeClipFromLane(laneId: string, clipId: string): boolean {
    const lane = this.lanes.get(laneId);
    if (!lane) return false;

    const index = lane.clips.findIndex(c => c.id === clipId);
    if (index === -1) return false;

    lane.clips.splice(index, 1);
    return true;
  }

  /**
   * Set the active take lane
   */
  setActiveLane(trackId: string, laneId: string): boolean {
    const lanes = this.getLanesForTrack(trackId);
    
    for (const lane of lanes) {
      lane.isActive = lane.id === laneId;
    }

    return lanes.some(l => l.id === laneId);
  }

  /**
   * Mute/unmute a take lane
   */
  setLaneMuted(laneId: string, muted: boolean): boolean {
    const lane = this.lanes.get(laneId);
    if (!lane) return false;

    lane.isMuted = muted;
    return true;
  }

  /**
   * Duplicate a take lane with all its clips
   */
  duplicateLane(laneId: string): TakeLane | null {
    const lane = this.lanes.get(laneId);
    if (!lane) return null;

    const newLane = this.createTakeLane(
      lane.trackId,
      lane.type,
      `${lane.name} Copy`
    );

    // Copy clips
    newLane.clips = lane.clips.map(clip => ({
      ...clip,
      id: this.generateId()
    })) as (AudioClip | MidiClip)[];

    newLane.color = lane.color;
    
    return newLane;
  }

  /**
   * Get or create take lane group for a track
   */
  getOrCreateGroup(trackId: string): TakeLaneGroup {
    let group = this.groups.get(trackId);
    
    if (!group) {
      group = {
        id: this.generateId(),
        trackId,
        lanes: this.getLanesForTrack(trackId),
        activeComp: {
          id: this.generateId(),
          regions: [],
          isFlattened: false
        },
        history: []
      };
      this.groups.set(trackId, group);
    }

    return group;
  }

  /**
   * Handle cycle recording based on preferences
   */
  handleCycleRecording(
    trackId: string,
    type: TakeLaneType,
    cycleNumber: number
  ): TakeLane {
    switch (this.preferences.cycleRecordMode) {
      case 'create-new-lane':
        return this.createTakeLane(trackId, type, `Take ${cycleNumber}`);
        
      case 'overdub-current': {
        const lanes = this.getLanesForTrack(trackId);
        const activeLane = lanes.find(l => l.isActive);
        if (activeLane) {
          return activeLane;
        }
        return this.createTakeLane(trackId, type);
      }
        
      case 'stack-takes': {
        const lanes = this.getLanesForTrack(trackId);
        if (lanes.length === 0 || lanes[lanes.length - 1].clips.length >= this.preferences.maxTakesPerLane) {
          return this.createTakeLane(trackId, type, `Take ${cycleNumber}`);
        }
        return lanes[lanes.length - 1];
      }
        
      default:
        return this.createTakeLane(trackId, type);
    }
  }

  /**
   * Reorder lanes after deletion
   */
  private renumberLanes(trackId: string): void {
    const lanes = this.getLanesForTrack(trackId);
    lanes.forEach((lane, index) => {
      lane.order = index;
    });
  }

  /**
   * Update group for track
   */
  private updateGroupForTrack(trackId: string): void {
    const group = this.groups.get(trackId);
    if (group) {
      group.lanes = this.getLanesForTrack(trackId);
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `lane_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a color for a take based on its number
   */
  private generateTakeColor(takeNumber: number): string {
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Plum
      '#98D8C8', // Mint
      '#F7DC6F', // Gold
    ];
    return colors[(takeNumber - 1) % colors.length];
  }

  /**
   * Get preferences
   */
  getPreferences(): CompingPreferences {
    return { ...this.preferences };
  }

  /**
   * Update preferences
   */
  setPreferences(prefs: Partial<CompingPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
  }

  /**
   * Get comping options
   */
  getOptions(): CompingOptions {
    return { ...this.options };
  }

  /**
   * Update comping options
   */
  setOptions(options: Partial<CompingOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Clear all lanes for a track
   */
  clearTrackLanes(trackId: string): void {
    const lanes = this.getLanesForTrack(trackId);
    for (const lane of lanes) {
      this.lanes.delete(lane.id);
    }
    this.groups.delete(trackId);
  }

  /**
   * Get total number of take lanes
   */
  getTotalLaneCount(): number {
    return this.lanes.size;
  }

  /**
   * Export lane data for serialization
   */
  exportLanes(trackId: string): TakeLane[] {
    return this.getLanesForTrack(trackId).map(lane => ({
      ...lane,
      clips: lane.clips.map(clip => ({ ...clip })) as (AudioClip | MidiClip)[]
    }));
  }
}
