/**
 * Note Editor
 * 
 * Handles note editing operations including:
 * - Drawing new notes
 * - Moving notes
 * - Resizing notes
 * - Velocity editing
 */

import type { MidiClip, MidiNote } from '@daw/project-schema';

/**
 * Note edit operation type
 */
export type NoteEditOperation = 'draw' | 'move' | 'resize-start' | 'resize-end' | 'velocity';

/**
 * Note edit state
 */
export interface NoteEditState {
  operation: NoteEditOperation;
  noteIds: string[];
  startTick: number;
  startPitch: number;
  currentTick: number;
  currentPitch: number;
  originalNotes: Map<string, MidiNote>;
}

/**
 * Note edit options
 */
export interface NoteEditOptions {
  /** Snap grid size in ticks */
  snapGrid?: number;
  
  /** Minimum note duration in ticks */
  minDuration?: number;
  
  /** Callback when notes change */
  onChange?: (notes: MidiNote[]) => void;
}

/**
 * Note editor class
 */
export class NoteEditor {
  private options: NoteEditOptions;
  private currentOperation: NoteEditOperation | null = null;
  private drawingNote: MidiNote | null = null;
  private originalNotes = new Map<string, MidiNote>();
  
  constructor(options: NoteEditOptions = {}) {
    this.options = {
      snapGrid: 240,
      minDuration: 120,
      ...options,
    };
  }
  
  /**
   * Start drawing a new note
   */
  startDraw(tick: number, pitch: number, clip: MidiClip): void {
    this.currentOperation = 'draw';
    
    const snappedTick = this.snap(tick);
    
    this.drawingNote = {
      id: `note-${Date.now()}`,
      pitch,
      velocity: 100,
      startTick: snappedTick,
      duration: this.options.minDuration ?? 240,
    };
  }
  
  /**
   * Update drawing note
   */
  updateDraw(tick: number, pitch: number): void {
    if (this.currentOperation !== 'draw' || !this.drawingNote) return;
    
    const snappedTick = this.snap(tick);
    const duration = Math.max(
      this.options.minDuration ?? 120,
      snappedTick - this.drawingNote.startTick
    );
    
    this.drawingNote.duration = duration;
    this.drawingNote.pitch = pitch;
  }
  
  /**
   * End drawing and add note
   */
  endDraw(): MidiNote | null {
    if (this.currentOperation !== 'draw' || !this.drawingNote) return null;
    
    const note = { ...this.drawingNote };
    
    this.drawingNote = null;
    this.currentOperation = null;
    
    return note;
  }
  
  /**
   * Start moving notes
   */
  startMove(noteIds: string[], clip: MidiClip): void {
    this.currentOperation = 'move';
    this.originalNotes.clear();
    
    for (const id of noteIds) {
      const note = clip.notes.find(n => n.id === id);
      if (note) {
        this.originalNotes.set(id, { ...note });
      }
    }
  }
  
  /**
   * Update note positions
   */
  updateMove(deltaTick: number, deltaPitch: number, clip: MidiClip): MidiNote[] {
    if (this.currentOperation !== 'move') return clip.notes;
    
    return clip.notes.map(note => {
      if (!this.originalNotes.has(note.id)) return note;
      
      const original = this.originalNotes.get(note.id)!;
      
      return {
        ...note,
        startTick: Math.max(0, original.startTick + deltaTick),
        pitch: Math.max(0, Math.min(127, original.pitch + deltaPitch)),
      };
    });
  }
  
  /**
   * Start resizing notes
   */
  startResize(noteIds: string[], edge: 'start' | 'end', clip: MidiClip): void {
    this.currentOperation = edge === 'start' ? 'resize-start' : 'resize-end';
    this.originalNotes.clear();
    
    for (const id of noteIds) {
      const note = clip.notes.find(n => n.id === id);
      if (note) {
        this.originalNotes.set(id, { ...note });
      }
    }
  }
  
  /**
   * Update note sizes
   */
  updateResize(deltaTick: number, clip: MidiClip): MidiNote[] {
    if (!this.currentOperation?.startsWith('resize')) return clip.notes;
    
    const resizeStart = this.currentOperation === 'resize-start';
    
    return clip.notes.map(note => {
      if (!this.originalNotes.has(note.id)) return note;
      
      const original = this.originalNotes.get(note.id)!;
      
      if (resizeStart) {
        const newStart = Math.max(0, original.startTick + deltaTick);
        const newEnd = original.startTick + original.duration;
        const newDuration = Math.max(this.options.minDuration ?? 120, newEnd - newStart);
        
        return {
          ...note,
          startTick: newEnd - newDuration,
          duration: newDuration,
        };
      } else {
        return {
          ...note,
          duration: Math.max(this.options.minDuration ?? 120, original.duration + deltaTick),
        };
      }
    });
  }
  
  /**
   * Erase note at position
   */
  eraseAt(tick: number, pitch: number, clip: MidiClip, onChange?: (notes: MidiNote[]) => void): void {
    const noteToErase = clip.notes.find(n =>
      tick >= n.startTick &&
      tick < n.startTick + n.duration &&
      pitch === n.pitch
    );
    
    if (noteToErase) {
      const newNotes = clip.notes.filter(n => n.id !== noteToErase.id);
      onChange?.(newNotes);
      this.options.onChange?.(newNotes);
    }
  }
  
  /**
   * Update note velocity
   */
  setVelocity(noteIds: string[], velocity: number, clip: MidiClip): MidiNote[] {
    const clampedVelocity = Math.max(1, Math.min(127, velocity));
    
    return clip.notes.map(note => {
      if (!noteIds.includes(note.id)) return note;
      
      return {
        ...note,
        velocity: clampedVelocity,
      };
    });
  }
  
  /**
   * Cancel current operation
   */
  cancel(): void {
    this.currentOperation = null;
    this.drawingNote = null;
    this.originalNotes.clear();
  }
  
  /**
   * Get current operation
   */
  getOperation(): NoteEditOperation | null {
    return this.currentOperation;
  }
  
  /**
   * Get drawing note preview
   */
  getDrawingNote(): MidiNote | null {
    return this.drawingNote;
  }
  
  /**
   * Snap tick to grid
   */
  private snap(tick: number): number {
    const grid = this.options.snapGrid ?? 240;
    return Math.round(tick / grid) * grid;
  }
}
