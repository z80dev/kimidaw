/**
 * Pitch MIDI Effect
 * Transposes, filters, and randomizes note pitches
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
  type PitchParams,
  type RangeMode,
  type PitchedNote,
  DEFAULT_PITCH_PARAMS,
} from "./types.js";

export class Pitch extends BaseMidiEffect {
  readonly name = "Pitch";
  readonly version = "1.0.0";

  private params: PitchParams = { ...DEFAULT_PITCH_PARAMS };
  private activeNotes: Map<number, PitchedNote> = new Map(); // original note -> pitched note
  private octaveCycleIndex = 0;
  private randomSeed = Math.floor(Math.random() * 0x7fffffff);
  private randomState = this.randomSeed;

  protected onParameterChange(id: string, value: number | string | boolean): void {
    switch (id) {
      case "lowestNote":
        if (typeof value === "number") this.params.lowestNote = Math.max(-1, Math.min(127, Math.floor(value)));
        break;
      case "highestNote":
        if (typeof value === "number") this.params.highestNote = Math.max(-1, Math.min(127, Math.floor(value)));
        break;
      case "transpose":
        if (typeof value === "number") this.params.transpose = Math.max(-48, Math.min(48, Math.floor(value)));
        break;
      case "random":
        if (typeof value === "number") this.params.random = Math.max(0, Math.min(48, Math.floor(value)));
        break;
      case "scale":
        if (typeof value === "string") this.params.scale = value as ScaleType;
        break;
      case "scaleRoot":
        if (typeof value === "string") this.params.scaleRoot = value as PitchParams["scaleRoot"];
        break;
      case "octaveRangeEnabled":
        if (typeof value === "boolean") this.params.octaveRangeEnabled = value;
        break;
      case "octaveRange":
        if (typeof value === "number") this.params.octaveRange = (value >= 2 ? 2 : 1) as 1 | 2;
        break;
      case "rangeMode":
        if (typeof value === "string") this.params.rangeMode = value as RangeMode;
        break;
      case "quantizeToScale":
        if (typeof value === "boolean") this.params.quantizeToScale = value;
        break;
    }
  }

  process(events: MidiEvent[], _sampleTime: number): MidiEvent[] {
    const output: MidiEvent[] = [];

    for (const event of events) {
      if (event.type === "note-on") {
        const noteEvent = event as unknown as { type: "note-on"; note: number; velocity: number; channel: number; sampleTime: number };
        
        // Check note range filter
        if (this.params.lowestNote >= 0 && noteEvent.note < this.params.lowestNote) continue;
        if (this.params.highestNote >= 0 && noteEvent.note > this.params.highestNote) continue;

        // Calculate new pitch
        let newNote = this.transformNote(noteEvent.note);
        
        // Apply range mode
        let octaveOffset = 0;
        if (this.params.octaveRangeEnabled) {
          octaveOffset = this.calculateOctaveOffset() * 12;
          newNote += octaveOffset;
        }

        // Clamp to valid range
        newNote = Math.max(0, Math.min(127, newNote));

        // Store mapping
        this.activeNotes.set(noteEvent.note, {
          originalNote: noteEvent.note,
          currentNote: newNote,
          velocity: noteEvent.velocity,
          channel: noteEvent.channel,
          octaveOffset,
        });

        // Output transposed note
        output.push(createNoteOn(
          newNote,
          noteEvent.velocity,
          noteEvent.channel,
          noteEvent.sampleTime
        ));

      } else if (event.type === "note-off") {
        const noteEvent = event as unknown as { type: "note-off"; note: number; velocity: number; channel: number; sampleTime: number };
        
        // Find the pitched note
        const pitchedNote = this.activeNotes.get(noteEvent.note);
        
        if (pitchedNote) {
          // Release the transposed note
          output.push(createNoteOff(
            pitchedNote.currentNote,
            noteEvent.velocity,
            noteEvent.channel,
            noteEvent.sampleTime
          ));
          this.activeNotes.delete(noteEvent.note);
        } else {
          // No transformation was applied, pass through
          output.push(event);
        }

      } else {
        // Pass through non-note events
        output.push(event);
      }
    }

    return output;
  }

  private transformNote(note: number): number {
    // Apply transpose
    let newNote = note + this.params.transpose;

    // Apply randomization
    if (this.params.random > 0) {
      const randomAmount = Math.floor(this.random() * (this.params.random + 1)) - Math.floor(this.params.random / 2);
      newNote += randomAmount;
    }

    // Quantize to scale
    if (this.params.quantizeToScale && this.params.scale !== "chromatic") {
      newNote = this.quantizeToScale(newNote);
    }

    return newNote;
  }

  private quantizeToScale(note: number): number {
    const pattern = SCALE_PATTERNS[this.params.scale];
    if (!pattern || pattern.length === 0) return note;

    const rootOffset = noteNameToNumber(this.params.scaleRoot);
    const octave = Math.floor(note / 12);
    const noteInOctave = note % 12;
    
    // Find closest note in scale
    let closest = pattern[0]!;
    let minDistance = Math.abs(noteInOctave - ((closest! + rootOffset) % 12));

    for (const scaleNote of pattern) {
      const adjustedNote = (scaleNote! + rootOffset) % 12;
      const distance = Math.abs(noteInOctave - adjustedNote);
      if (distance < minDistance) {
        minDistance = distance;
        closest = scaleNote!;
      }
    }

    return octave * 12 + (closest! + rootOffset) % 12;
  }

  private calculateOctaveOffset(): number {
    const maxOctaves = this.params.octaveRange;
    
    switch (this.params.rangeMode) {
      case "up":
        this.octaveCycleIndex = (this.octaveCycleIndex + 1) % (maxOctaves + 1);
        return this.octaveCycleIndex;
        
      case "down":
        this.octaveCycleIndex = (this.octaveCycleIndex + maxOctaves) % (maxOctaves + 1);
        return maxOctaves - this.octaveCycleIndex;
        
      case "alternate": {
        const cycle = maxOctaves * 2;
        this.octaveCycleIndex = (this.octaveCycleIndex + 1) % cycle;
        if (this.octaveCycleIndex <= maxOctaves) {
          return this.octaveCycleIndex;
        } else {
          return cycle - this.octaveCycleIndex;
        }
      }
        
      case "random":
        return Math.floor(this.random() * (maxOctaves + 1));
        
      default:
        return 0;
    }
  }

  private random(): number {
    this.randomState = (this.randomState * 1103515245 + 12345) & 0x7fffffff;
    return this.randomState / 0x7fffffff;
  }

  saveState(): Record<string, unknown> {
    return {
      params: { ...this.params },
      octaveCycleIndex: this.octaveCycleIndex,
      randomSeed: this.randomSeed,
      randomState: this.randomState,
    };
  }

  loadState(state: Record<string, unknown>): void {
    if (state.params && typeof state.params === "object") {
      this.params = { ...this.params, ...(state.params as Partial<PitchParams>) };
    }
    if (typeof state.octaveCycleIndex === "number") {
      this.octaveCycleIndex = state.octaveCycleIndex;
    }
    if (typeof state.randomSeed === "number") {
      this.randomSeed = state.randomSeed;
    }
    if (typeof state.randomState === "number") {
      this.randomState = state.randomState;
    }
  }

  reset(): void {
    super.reset();
    this.params = { ...DEFAULT_PITCH_PARAMS };
    this.activeNotes.clear();
    this.octaveCycleIndex = 0;
    this.randomSeed = Math.floor(Math.random() * 0x7fffffff);
    this.randomState = this.randomSeed;
  }
}
