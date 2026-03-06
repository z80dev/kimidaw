/**
 * Piano Roll Selection
 * 
 * Manages selection state for piano roll notes.
 */

import type { MidiNote } from '@daw/project-schema';

/**
 * Piano roll selection state
 */
export interface PianoRollSelectionState {
  /** Selected note IDs */
  noteIds: Set<string>;
  
  /** Time selection start */
  timeSelectionStart?: number;
  
  /** Time selection end */
  timeSelectionEnd?: number;
  
  /** Pitch selection min */
  pitchSelectionMin?: number;
  
  /** Pitch selection max */
  pitchSelectionMax?: number;
}

/**
 * Piano roll selection manager
 */
export class PianoRollSelection {
  private state: PianoRollSelectionState;
  private onChange?: (state: PianoRollSelectionState) => void;
  
  constructor(onChange?: (state: PianoRollSelectionState) => void) {
    this.state = {
      noteIds: new Set(),
    };
    this.onChange = onChange;
  }
  
  /**
   * Get current state
   */
  getState(): PianoRollSelectionState {
    return {
      noteIds: new Set(this.state.noteIds),
      timeSelectionStart: this.state.timeSelectionStart,
      timeSelectionEnd: this.state.timeSelectionEnd,
      pitchSelectionMin: this.state.pitchSelectionMin,
      pitchSelectionMax: this.state.pitchSelectionMax,
    };
  }
  
  /**
   * Select a single note
   */
  select(noteId: string): void {
    this.state.noteIds.clear();
    this.state.noteIds.add(noteId);
    this.notifyChange();
  }
  
  /**
   * Add to selection
   */
  add(noteId: string): void {
    this.state.noteIds.add(noteId);
    this.notifyChange();
  }
  
  /**
   * Remove from selection
   */
  remove(noteId: string): void {
    this.state.noteIds.delete(noteId);
    this.notifyChange();
  }
  
  /**
   * Toggle selection
   */
  toggle(noteId: string): void {
    if (this.state.noteIds.has(noteId)) {
      this.state.noteIds.delete(noteId);
    } else {
      this.state.noteIds.add(noteId);
    }
    this.notifyChange();
  }
  
  /**
   * Clear all selection
   */
  clear(): void {
    this.state.noteIds.clear();
    this.state.timeSelectionStart = undefined;
    this.state.timeSelectionEnd = undefined;
    this.state.pitchSelectionMin = undefined;
    this.state.pitchSelectionMax = undefined;
    this.notifyChange();
  }
  
  /**
   * Select all notes
   */
  selectAll(notes: MidiNote[]): void {
    this.state.noteIds = new Set(notes.map(n => n.id));
    this.notifyChange();
  }
  
  /**
   * Invert selection
   */
  invert(notes: MidiNote[]): void {
    const allIds = new Set(notes.map(n => n.id));
    
    for (const id of allIds) {
      if (this.state.noteIds.has(id)) {
        this.state.noteIds.delete(id);
      } else {
        this.state.noteIds.add(id);
      }
    }
    
    this.notifyChange();
  }
  
  /**
   * Select notes in range
   */
  selectRange(
    startTick: number,
    endTick: number,
    minPitch: number,
    maxPitch: number,
    notes: MidiNote[]
  ): void {
    this.state.timeSelectionStart = startTick;
    this.state.timeSelectionEnd = endTick;
    this.state.pitchSelectionMin = minPitch;
    this.state.pitchSelectionMax = maxPitch;
    
    for (const note of notes) {
      const noteEnd = note.startTick + note.duration;
      
      if (
        note.startTick < endTick &&
        noteEnd > startTick &&
        note.pitch >= minPitch &&
        note.pitch <= maxPitch
      ) {
        this.state.noteIds.add(note.id);
      }
    }
    
    this.notifyChange();
  }
  
  /**
   * Check if note is selected
   */
  isSelected(noteId: string): boolean {
    return this.state.noteIds.has(noteId);
  }
  
  /**
   * Get count of selected notes
   */
  getCount(): number {
    return this.state.noteIds.size;
  }
  
  /**
   * Check if anything is selected
   */
  hasSelection(): boolean {
    return this.state.noteIds.size > 0;
  }
  
  private notifyChange(): void {
    this.onChange?.(this.getState());
  }
}
