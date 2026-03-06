/**
 * Scale MIDI Effect
 * Quantizes notes to a selected scale
 */

import {
  BaseMidiEffect,
  createNoteOn,
  createNoteOff,
  SCALE_PATTERNS,
  noteNameToNumber,
  type MidiEvent,
  type ScaleType,
} from "../types.js";
import {
  type ScaleParams,
  type ScaleNoteInfo,
  DEFAULT_SCALE_PARAMS,
} from "./types.js";

export class Scale extends BaseMidiEffect {
  readonly name = "Scale";
  readonly version = "1.0.0";

  private params: ScaleParams = { ...DEFAULT_SCALE_PARAMS };
  private activeNotes: Map<number, ScaleNoteInfo> = new Map();

  protected onParameterChange(id: string, value: number | string | boolean): void {
    switch (id) {
      case "base":
        if (typeof value === "string") this.params.base = value as ScaleParams["base"];
        break;
      case "scale":
        if (typeof value === "string") this.params.scale = value as ScaleType;
        break;
      case "transpose":
        if (typeof value === "number") this.params.transpose = Math.max(-12, Math.min(12, Math.floor(value)));
        break;
      case "octaveRangeEnabled":
        if (typeof value === "boolean") this.params.octaveRangeEnabled = value;
        break;
      case "octaveRange":
        if (typeof value === "number") this.params.octaveRange = (value >= 2 ? 2 : 1) as 1 | 2;
        break;
      case "fold":
        if (typeof value === "boolean") this.params.fold = value;
        break;
    }
  }

  process(events: MidiEvent[], _sampleTime: number): MidiEvent[] {
    const output: MidiEvent[] = [];

    for (const event of events) {
      if (event.type === "note-on") {
        const noteEvent = event as unknown as { type: "note-on"; note: number; velocity: number; channel: number; sampleTime: number };
        
        const scaleInfo = this.quantizeToScale(noteEvent.note);
        
        if (scaleInfo.wasInScale || this.params.fold) {
          // Apply transpose
          let finalNote = scaleInfo.quantizedNote + this.params.transpose;
          
          // Apply octave range
          if (this.params.octaveRangeEnabled) {
            finalNote = this.applyOctaveRange(finalNote);
          }
          
          // Clamp to valid range
          finalNote = Math.max(0, Math.min(127, finalNote));

          // Store mapping
          this.activeNotes.set(noteEvent.note, {
            ...scaleInfo,
            quantizedNote: finalNote,
          });

          // Output quantized note
          output.push(createNoteOn(
            finalNote,
            noteEvent.velocity,
            noteEvent.channel,
            noteEvent.sampleTime
          ));
        }
        // If not in scale and not folding, note is filtered (not added to output)

      } else if (event.type === "note-off") {
        const noteEvent = event as unknown as { type: "note-off"; note: number; velocity: number; channel: number; sampleTime: number };
        
        // Find the quantized note
        const scaleInfo = this.activeNotes.get(noteEvent.note);
        
        if (scaleInfo) {
          // Release the quantized note
          output.push(createNoteOff(
            scaleInfo.quantizedNote,
            noteEvent.velocity,
            noteEvent.channel,
            noteEvent.sampleTime
          ));
          this.activeNotes.delete(noteEvent.note);
        }
        // If we didn't have this note active, it was filtered, so no note-off needed

      } else {
        // Pass through non-note events
        output.push(event);
      }
    }

    return output;
  }

  private quantizeToScale(note: number): ScaleNoteInfo {
    const pattern = SCALE_PATTERNS[this.params.scale];
    if (!pattern || pattern.length === 0 || this.params.scale === "chromatic") {
      return {
        originalNote: note,
        quantizedNote: note,
        wasInScale: true,
        scaleDegree: note % 12,
      };
    }

    const rootOffset = noteNameToNumber(this.params.base);
    const octave = Math.floor(note / 12);
    const noteInOctave = ((note % 12) - rootOffset + 12) % 12;

    // Check if note is already in scale
    let scaleIndex = -1;
    for (let i = 0; i < pattern.length; i++) {
      const scaleNote = pattern[i]!;
      if (scaleNote === noteInOctave) {
        scaleIndex = i;
        break;
      }
    }

    if (scaleIndex >= 0) {
      // Note is in scale
      const quantizedNote = octave * 12 + rootOffset + pattern[scaleIndex]!;
      return {
        originalNote: note,
        quantizedNote,
        wasInScale: true,
        scaleDegree: scaleIndex,
      };
    }

    // Note is not in scale - quantize to nearest
    let closestIndex = 0;
    let minDistance = Math.abs(noteInOctave - pattern[0]!);
    let direction = noteInOctave > pattern[0]! ? 1 : -1;

    for (let i = 1; i < pattern.length; i++) {
      const scaleNote = pattern[i]!;
      const distance = Math.abs(noteInOctave - scaleNote);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
        direction = noteInOctave > scaleNote ? 1 : -1;
      }
    }

    let quantizedNote: number;
    
    if (this.params.fold) {
      // Fold: mirror the note into the scale
      const closestScaleNote = pattern[closestIndex]!;
      const diff = noteInOctave - closestScaleNote;
      const foldedOffset = closestScaleNote - diff;
      
      // Ensure positive
      const positiveOffset = ((foldedOffset % 12) + 12) % 12;
      
      // Find closest scale note to the folded position
      let foldIndex = 0;
      let foldMinDist = Math.abs(positiveOffset - pattern[0]!);
      for (let i = 1; i < pattern.length; i++) {
        const dist = Math.abs(positiveOffset - pattern[i]!);
        if (dist < foldMinDist) {
          foldMinDist = dist;
          foldIndex = i;
        }
      }
      
      quantizedNote = octave * 12 + rootOffset + pattern[foldIndex]!;
    } else {
      // Normal quantization
      quantizedNote = octave * 12 + rootOffset + pattern[closestIndex]!;
      
      // If the closest note is in a different direction, adjust octave
      if (direction < 0 && pattern[closestIndex]! > noteInOctave) {
        quantizedNote -= 12;
      } else if (direction > 0 && pattern[closestIndex]! < noteInOctave) {
        quantizedNote += 12;
      }
    }

    return {
      originalNote: note,
      quantizedNote,
      wasInScale: false,
      scaleDegree: closestIndex,
    };
  }

  private applyOctaveRange(note: number): number {
    const baseNote = noteNameToNumber(this.params.base);
    
    // Calculate note relative to base
    const relativeNote = note - baseNote;
    const octave = Math.floor(relativeNote / 12);
    const noteInOctave = relativeNote % 12;
    
    // Wrap octave into range
    const wrappedOctave = ((octave % (this.params.octaveRange + 1)) + (this.params.octaveRange + 1)) % (this.params.octaveRange + 1);
    
    return baseNote + wrappedOctave * 12 + noteInOctave;
  }

  saveState(): Record<string, unknown> {
    return {
      params: { ...this.params },
    };
  }

  loadState(state: Record<string, unknown>): void {
    if (state.params && typeof state.params === "object") {
      this.params = { ...this.params, ...(state.params as Partial<ScaleParams>) };
    }
  }

  reset(): void {
    super.reset();
    this.params = { ...DEFAULT_SCALE_PARAMS };
    this.activeNotes.clear();
  }
}
