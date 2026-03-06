/**
 * Quantizer
 * 
 * Quantizes note timing to the grid.
 */

import type { MidiNote } from '@daw/project-schema';

/**
 * Quantize options
 */
export interface QuantizeOptions {
  /** Grid division (1 = quarter, 4 = 16th) */
  division?: number;
  
  /** PPQ (pulses per quarter) */
  ppq?: number;
  
  /** Amount (0-1, where 1 = full quantize) */
  amount?: number;
  
  /** Quantize start times */
  quantizeStart?: boolean;
  
  /** Quantize durations */
  quantizeDuration?: boolean;
  
  /** Swing amount (0-1) */
  swing?: number;
}

/**
 * Quantizer class
 */
export class Quantizer {
  private options: QuantizeOptions;
  
  constructor(options: QuantizeOptions = {}) {
    this.options = {
      division: 4,
      ppq: 960,
      amount: 1,
      quantizeStart: true,
      quantizeDuration: false,
      swing: 0,
      ...options,
    };
  }
  
  /**
   * Quantize notes
   */
  quantize(notes: MidiNote[]): MidiNote[] {
    const { division = 4, ppq = 960, amount = 1 } = this.options;
    const gridSize = ppq / division;
    
    return notes.map(note => {
      const quantized = { ...note };
      
      if (this.options.quantizeStart) {
        const targetTick = this.snapToGrid(note.startTick, gridSize);
        const diff = targetTick - note.startTick;
        quantized.startTick = note.startTick + diff * amount;
      }
      
      if (this.options.quantizeDuration) {
        const targetDuration = this.snapToGrid(note.duration, gridSize);
        const diff = targetDuration - note.duration;
        quantized.duration = Math.max(gridSize / 2, note.duration + diff * amount);
      }
      
      return quantized;
    });
  }
  
  /**
   * Snap a value to the grid
   */
  private snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
  }
  
  /**
   * Apply swing to notes
   */
  applySwing(notes: MidiNote[]): MidiNote[] {
    const { swing = 0, ppq = 960, division = 4 } = this.options;
    
    if (swing === 0) return notes;
    
    const gridSize = ppq / division;
    
    return notes.map(note => {
      const gridPosition = note.startTick / gridSize;
      
      // Apply swing to off-beat notes
      if (Math.floor(gridPosition) % 2 === 1) {
        return {
          ...note,
          startTick: note.startTick + gridSize * swing,
        };
      }
      
      return note;
    });
  }
  
  /**
   * Humanize notes (add slight random timing variations)
   */
  humanize(notes: MidiNote[], amount: number = 10): MidiNote[] {
    return notes.map(note => ({
      ...note,
      startTick: note.startTick + (Math.random() - 0.5) * amount * 2,
      velocity: Math.max(1, Math.min(127, note.velocity + (Math.random() - 0.5) * amount)),
    }));
  }
  
  /**
   * Legato - extend notes to fill gaps
   */
  legato(notes: MidiNote[], overlap: number = 0): MidiNote[] {
    // Group by pitch
    const byPitch = new Map<number, MidiNote[]>();
    
    for (const note of notes) {
      if (!byPitch.has(note.pitch)) {
        byPitch.set(note.pitch, []);
      }
      byPitch.get(note.pitch)!.push(note);
    }
    
    // Sort by start time and extend
    const result: MidiNote[] = [];
    
    for (const pitchNotes of byPitch.values()) {
      const sorted = [...pitchNotes].sort((a, b) => a.startTick - b.startTick);
      
      for (let i = 0; i < sorted.length; i++) {
        const note = sorted[i];
        const nextNote = sorted[i + 1];
        
        if (nextNote) {
          result.push({
            ...note,
            duration: nextNote.startTick - note.startTick + overlap,
          });
        } else {
          result.push(note);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Strum chords (delay notes slightly)
   */
  strum(notes: MidiNote[], delay: number = 20, direction: 'up' | 'down' = 'down'): MidiNote[] {
    // Group notes by start time (chords)
    const byTime = new Map<number, MidiNote[]>();
    
    for (const note of notes) {
      if (!byTime.has(note.startTick)) {
        byTime.set(note.startTick, []);
      }
      byTime.get(note.startTick)!.push(note);
    }
    
    const result: MidiNote[] = [];
    
    for (const chordNotes of byTime.values()) {
      if (chordNotes.length < 2) {
        result.push(...chordNotes);
        continue;
      }
      
      // Sort by pitch
      const sorted = [...chordNotes].sort((a, b) => 
        direction === 'down' ? a.pitch - b.pitch : b.pitch - a.pitch
      );
      
      sorted.forEach((note, index) => {
        result.push({
          ...note,
          startTick: note.startTick + index * delay,
        });
      });
    }
    
    return result;
  }
}
