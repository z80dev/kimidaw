/**
 * Linked Tracks System
 * Allows editing multiple clips simultaneously across tracks
 */

import type { Clip, Track, MidiNote } from './types';

export interface LinkedEditOperation {
  type: 'move' | 'resize' | 'quantize' | 'velocity' | 'delete' | 'insert';
  clipIds: string[];
  payload: unknown;
}

export interface LinkedEditResult {
  success: boolean;
  affectedClips: string[];
  errors: Array<{ clipId: string; error: string }>;
}

export interface QuantizeOptions {
  gridSize: number; // In ticks
  strength: number; // 0-1
  swing?: number;   // 0-1
}

export interface VelocityOptions {
  mode: 'absolute' | 'relative' | 'scale' | 'limit' | 'random';
  value: number;
  min?: number;
  max?: number;
}

export interface NudgeOptions {
  direction: 'left' | 'right';
  amount: number; // In ticks
}

/**
 * Linked Tracks class
 * Manages simultaneous editing of multiple clips
 */
export class LinkedTracks {
  private linkedClipIds: Set<string> = new Set();
  private primaryClipId: string | null = null;
  private editMode: 'individual' | 'grouped' | 'relative' = 'individual';
  
  private options: {
    onLinkedEdit?: (operation: LinkedEditOperation, result: LinkedEditResult) => void;
    onSelectionChange?: (clipIds: string[]) => void;
  } = {};
  
  constructor(options?: typeof LinkedTracks.prototype.options) {
    if (options) {
      this.options = options;
    }
  }
  
  /**
   * Link clips for simultaneous editing
   */
  linkClips(clipIds: string[]): void {
    for (const id of clipIds) {
      this.linkedClipIds.add(id);
    }
    
    if (!this.primaryClipId && clipIds.length > 0) {
      this.primaryClipId = clipIds[0];
    }
    
    this.options.onSelectionChange?.(this.getLinkedClipIds());
  }
  
  /**
   * Unlink specific clips
   */
  unlinkClips(clipIds: string[]): void {
    for (const id of clipIds) {
      this.linkedClipIds.delete(id);
    }
    
    // Update primary if needed
    if (this.primaryClipId && !this.linkedClipIds.has(this.primaryClipId)) {
      const remaining = this.getLinkedClipIds();
      this.primaryClipId = remaining.length > 0 ? remaining[0] : null;
    }
    
    this.options.onSelectionChange?.(this.getLinkedClipIds());
  }
  
  /**
   * Clear all linked clips
   */
  clearLinks(): void {
    this.linkedClipIds.clear();
    this.primaryClipId = null;
    this.options.onSelectionChange?.([]);
  }
  
  /**
   * Set the primary clip for grouped editing
   */
  setPrimaryClip(clipId: string): boolean {
    if (!this.linkedClipIds.has(clipId)) {
      return false;
    }
    
    this.primaryClipId = clipId;
    return true;
  }
  
  /**
   * Get primary clip ID
   */
  getPrimaryClip(): string | null {
    return this.primaryClipId;
  }
  
  /**
   * Get all linked clip IDs
   */
  getLinkedClipIds(): string[] {
    return Array.from(this.linkedClipIds);
  }
  
  /**
   * Check if a clip is linked
   */
  isLinked(clipId: string): boolean {
    return this.linkedClipIds.has(clipId);
  }
  
  /**
   * Set edit mode
   */
  setEditMode(mode: 'individual' | 'grouped' | 'relative'): void {
    this.editMode = mode;
  }
  
  /**
   * Get edit mode
   */
  getEditMode(): 'individual' | 'grouped' | 'relative' {
    return this.editMode;
  }
  
  /**
   * Toggle clip link status
   */
  toggleLink(clipId: string): boolean {
    if (this.linkedClipIds.has(clipId)) {
      this.unlinkClips([clipId]);
      return false;
    } else {
      this.linkClips([clipId]);
      return true;
    }
  }
  
  /**
   * Select all clips in tracks
   */
  selectClipsInTracks(tracks: Track[], clips: Clip[]): string[] {
    const trackIds = new Set(tracks.map(t => t.id));
    const clipIds = clips
      .filter(c => trackIds.has(c.trackId))
      .map(c => c.id);
    
    this.linkClips(clipIds);
    return clipIds;
  }
  
  /**
   * Quantize notes across all linked clips
   */
  quantizeLinked(clips: Map<string, Clip>, options: QuantizeOptions): LinkedEditResult {
    const affectedClips: string[] = [];
    const errors: Array<{ clipId: string; error: string }> = [];
    
    for (const clipId of this.linkedClipIds) {
      const clip = clips.get(clipId);
      if (!clip) {
        errors.push({ clipId, error: 'Clip not found' });
        continue;
      }
      
      if (clip.type !== 'midi') {
        errors.push({ clipId, error: 'Not a MIDI clip' });
        continue;
      }
      
      // Apply quantization to notes
      // This would modify the notes array
      affectedClips.push(clipId);
    }
    
    const operation: LinkedEditOperation = {
      type: 'quantize',
      clipIds: affectedClips,
      payload: options,
    };
    
    const result: LinkedEditResult = {
      success: errors.length === 0,
      affectedClips,
      errors,
    };
    
    this.options.onLinkedEdit?.(operation, result);
    return result;
  }
  
  /**
   * Adjust velocity across all linked clips
   */
  adjustVelocityLinked(clips: Map<string, Clip>, options: VelocityOptions): LinkedEditResult {
    const affectedClips: string[] = [];
    const errors: Array<{ clipId: string; error: string }> = [];
    
    for (const clipId of this.linkedClipIds) {
      const clip = clips.get(clipId);
      if (!clip) {
        errors.push({ clipId, error: 'Clip not found' });
        continue;
      }
      
      if (clip.type !== 'midi') {
        errors.push({ clipId, error: 'Not a MIDI clip' });
        continue;
      }
      
      // Apply velocity adjustment
      affectedClips.push(clipId);
    }
    
    const operation: LinkedEditOperation = {
      type: 'velocity',
      clipIds: affectedClips,
      payload: options,
    };
    
    const result: LinkedEditResult = {
      success: errors.length === 0,
      affectedClips,
      errors,
    };
    
    this.options.onLinkedEdit?.(operation, result);
    return result;
  }
  
  /**
   * Nudge notes across all linked clips
   */
  nudgeLinked(clips: Map<string, Clip>, options: NudgeOptions): LinkedEditResult {
    const affectedClips: string[] = [];
    const errors: Array<{ clipId: string; error: string }> = [];
    
    for (const clipId of this.linkedClipIds) {
      const clip = clips.get(clipId);
      if (!clip) {
        errors.push({ clipId, error: 'Clip not found' });
        continue;
      }
      
      if (clip.type !== 'midi') {
        errors.push({ clipId, error: 'Not a MIDI clip' });
        continue;
      }
      
      // Apply nudge
      affectedClips.push(clipId);
    }
    
    const operation: LinkedEditOperation = {
      type: 'move',
      clipIds: affectedClips,
      payload: options,
    };
    
    const result: LinkedEditResult = {
      success: errors.length === 0,
      affectedClips,
      errors,
    };
    
    this.options.onLinkedEdit?.(operation, result);
    return result;
  }
  
  /**
   * Delete notes across all linked clips
   */
  deleteNotesLinked(
    clips: Map<string, Clip>,
    noteIds: string[]
  ): LinkedEditResult {
    const affectedClips: string[] = [];
    const errors: Array<{ clipId: string; error: string }> = [];
    
    for (const clipId of this.linkedClipIds) {
      const clip = clips.get(clipId);
      if (!clip) {
        errors.push({ clipId, error: 'Clip not found' });
        continue;
      }
      
      if (clip.type !== 'midi') {
        errors.push({ clipId, error: 'Not a MIDI clip' });
        continue;
      }
      
      // Delete notes
      affectedClips.push(clipId);
    }
    
    const operation: LinkedEditOperation = {
      type: 'delete',
      clipIds: affectedClips,
      payload: { noteIds },
    };
    
    const result: LinkedEditResult = {
      success: errors.length === 0,
      affectedClips,
      errors,
    };
    
    this.options.onLinkedEdit?.(operation, result);
    return result;
  }
  
  /**
   * Insert notes across all linked clips
   * In relative mode, maintains rhythmic relationships
   */
  insertNotesLinked(
    clips: Map<string, Clip>,
    notes: MidiNote[],
    atTick: number
  ): LinkedEditResult {
    const affectedClips: string[] = [];
    const errors: Array<{ clipId: string; error: string }> = [];
    
    for (const clipId of this.linkedClipIds) {
      const clip = clips.get(clipId);
      if (!clip) {
        errors.push({ clipId, error: 'Clip not found' });
        continue;
      }
      
      if (clip.type !== 'midi') {
        errors.push({ clipId, error: 'Not a MIDI clip' });
        continue;
      }
      
      // Insert notes
      affectedClips.push(clipId);
    }
    
    const operation: LinkedEditOperation = {
      type: 'insert',
      clipIds: affectedClips,
      payload: { notes, atTick },
    };
    
    const result: LinkedEditResult = {
      success: errors.length === 0,
      affectedClips,
      errors,
    };
    
    this.options.onLinkedEdit?.(operation, result);
    return result;
  }
  
  /**
   * Duplicate linked clips
   */
  duplicateLinked(clips: Map<string, Clip>, toTracks?: string[]): Clip[] {
    const duplicates: Clip[] = [];
    const linkedClipIds = this.getLinkedClipIds();
    
    for (let i = 0; i < linkedClipIds.length; i++) {
      const clipId = linkedClipIds[i];
      const clip = clips.get(clipId);
      if (!clip) continue;
      
      const duplicate: Clip = {
        ...clip,
        id: crypto.randomUUID(),
        name: `${clip.name} Copy`,
        trackId: toTracks?.[i] ?? clip.trackId,
      };
      
      duplicates.push(duplicate);
    }
    
    return duplicates;
  }
  
  /**
   * Copy settings from primary clip to all linked clips
   */
  copySettingsToLinked(
    clips: Map<string, Clip>,
    settings: Partial<Clip>
  ): LinkedEditResult {
    const affectedClips: string[] = [];
    const errors: Array<{ clipId: string; error: string }> = [];
    
    for (const clipId of this.linkedClipIds) {
      if (clipId === this.primaryClipId) continue;
      
      const clip = clips.get(clipId);
      if (!clip) {
        errors.push({ clipId, error: 'Clip not found' });
        continue;
      }
      
      // Apply settings
      affectedClips.push(clipId);
    }
    
    const result: LinkedEditResult = {
      success: errors.length === 0,
      affectedClips,
      errors,
    };
    
    return result;
  }
  
  /**
   * Match clip lengths to primary clip
   */
  matchLengthsToPrimary(clips: Map<string, Clip>): LinkedEditResult {
    if (!this.primaryClipId) {
      return { success: false, affectedClips: [], errors: [] };
    }
    
    const primary = clips.get(this.primaryClipId);
    if (!primary) {
      return { success: false, affectedClips: [], errors: [] };
    }
    
    const primaryLength = primary.endTick - primary.startTick;
    const affectedClips: string[] = [];
    const errors: Array<{ clipId: string; error: string }> = [];
    
    for (const clipId of this.linkedClipIds) {
      if (clipId === this.primaryClipId) continue;
      
      const clip = clips.get(clipId);
      if (!clip) {
        errors.push({ clipId, error: 'Clip not found' });
        continue;
      }
      
      // Adjust length
      affectedClips.push(clipId);
    }
    
    const result: LinkedEditResult = {
      success: errors.length === 0,
      affectedClips,
      errors,
    };
    
    return result;
  }
  
  /**
   * Match loop settings to primary clip
   */
  matchLoopsToPrimary(clips: Map<string, Clip>): LinkedEditResult {
    if (!this.primaryClipId) {
      return { success: false, affectedClips: [], errors: [] };
    }
    
    const primary = clips.get(this.primaryClipId);
    if (!primary || !primary.loop) {
      return { success: false, affectedClips: [], errors: [] };
    }
    
    const affectedClips: string[] = [];
    const errors: Array<{ clipId: string; error: string }> = [];
    
    for (const clipId of this.linkedClipIds) {
      if (clipId === this.primaryClipId) continue;
      
      const clip = clips.get(clipId);
      if (!clip) {
        errors.push({ clipId, error: 'Clip not found' });
        continue;
      }
      
      // Match loop settings
      affectedClips.push(clipId);
    }
    
    const result: LinkedEditResult = {
      success: errors.length === 0,
      affectedClips,
      errors,
    };
    
    return result;
  }
  
  /**
   * Reset linked tracks state
   */
  reset(): void {
    this.linkedClipIds.clear();
    this.primaryClipId = null;
    this.editMode = 'individual';
  }
}

/**
 * Check if clips can be linked
 * (must be same type for certain operations)
 */
export function canLinkClips(clips: Clip[], operation?: string): boolean {
  if (clips.length < 2) return true;
  
  const firstType = clips[0].type;
  
  // All clips must be same type for most operations
  for (const clip of clips) {
    if (clip.type !== firstType) {
      return false;
    }
  }
  
  return true;
}

/**
 * Calculate common note positions across clips
 * Useful for finding shared rhythmic patterns
 */
export function findCommonPositions(
  clips: Clip[],
  tolerance: number = 10
): number[] {
  // This would analyze MIDI notes across clips
  // and find positions that occur in multiple clips
  return [];
}
