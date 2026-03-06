/**
 * Random MIDI Effect
 * Randomizes note pitches with various options
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
  type RandomParams,
  type SignMode,
  type RandomizedNote,
  DEFAULT_RANDOM_PARAMS,
} from "./types.js";

export class Random extends BaseMidiEffect {
  readonly name = "Random";
  readonly version = "1.0.0";

  private params: RandomParams = { ...DEFAULT_RANDOM_PARAMS };
  private activeNotes: Map<number, RandomizedNote> = new Map();
  private randomSeed = Math.floor(Math.random() * 0x7fffffff);
  private randomState = this.randomSeed;

  protected onParameterChange(id: string, value: number | string | boolean): void {
    switch (id) {
      case "chance":
        if (typeof value === "number") this.params.chance = Math.max(0, Math.min(100, value));
        break;
      case "choices":
        if (typeof value === "number") this.params.choices = Math.max(1, Math.min(24, Math.floor(value)));
        break;
      case "scale":
        if (typeof value === "string") this.params.scale = value as ScaleType;
        break;
      case "scaleRoot":
        if (typeof value === "string") this.params.scaleRoot = value as RandomParams["scaleRoot"];
        break;
      case "sign":
        if (typeof value === "string") this.params.sign = value as SignMode;
        break;
      case "scaleRandomize":
        if (typeof value === "boolean") this.params.scaleRandomize = value;
        break;
    }
  }

  process(events: MidiEvent[], _sampleTime: number): MidiEvent[] {
    const output: MidiEvent[] = [];

    for (const event of events) {
      if (event.type === "note-on") {
        const noteEvent = event as unknown as { type: "note-on"; note: number; velocity: number; channel: number; sampleTime: number };
        
        // Check if we should randomize
        const shouldRandomize = this.random() * 100 < this.params.chance;
        
        let newNote = noteEvent.note;
        let randomValue = 0;
        
        if (shouldRandomize) {
          randomValue = this.generateRandomValue();
          newNote = this.applyRandomization(noteEvent.note, randomValue);
        }

        // Clamp to valid MIDI range
        newNote = Math.max(0, Math.min(127, newNote));

        // Store mapping
        this.activeNotes.set(noteEvent.note, {
          originalNote: noteEvent.note,
          randomizedNote: newNote,
          velocity: noteEvent.velocity,
          channel: noteEvent.channel,
          randomValue,
        });

        // Output note
        output.push(createNoteOn(
          newNote,
          noteEvent.velocity,
          noteEvent.channel,
          noteEvent.sampleTime
        ));

      } else if (event.type === "note-off") {
        const noteEvent = event as unknown as { type: "note-off"; note: number; velocity: number; channel: number; sampleTime: number };
        
        // Find the randomized note
        const randomizedNote = this.activeNotes.get(noteEvent.note);
        
        if (randomizedNote) {
          // Release the randomized note
          output.push(createNoteOff(
            randomizedNote.randomizedNote,
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

  private generateRandomValue(): number {
    const choice = Math.floor(this.random() * this.params.choices);
    
    switch (this.params.sign) {
      case "add":
        return choice + 1;
      case "sub":
        return -(choice + 1);
      case "bi":
      default:
        // Center around 0
        return choice - Math.floor(this.params.choices / 2);
    }
  }

  private applyRandomization(note: number, randomValue: number): number {
    if (!this.params.scaleRandomize || this.params.scale === "chromatic") {
      return note + randomValue;
    }

    // Scale-based randomization
    const pattern = SCALE_PATTERNS[this.params.scale];
    if (!pattern || pattern.length === 0) return note + randomValue;

    const rootOffset = noteNameToNumber(this.params.scaleRoot);
    const octave = Math.floor(note / 12);
    const noteInOctave = (note % 12) - rootOffset;
    
    // Find current position in scale
    let scaleIndex = -1;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === noteInOctave) {
        scaleIndex = i;
        break;
      }
    }

    if (scaleIndex === -1) {
      // Note not in scale, quantize first
      scaleIndex = this.findClosestScaleIndex(noteInOctave, pattern);
    }

    // Apply random value as scale steps
    const newScaleIndex = scaleIndex + randomValue;
    const octaveShift = Math.floor(newScaleIndex / pattern.length);
    const wrappedIndex = ((newScaleIndex % pattern.length) + pattern.length) % pattern.length;
    
    const newNote = (octave + octaveShift) * 12 + rootOffset + pattern[wrappedIndex]!;
    return newNote;
  }

  private findClosestScaleIndex(noteInOctave: number, pattern: number[]): number {
    let closest = 0;
    let minDistance = Math.abs(noteInOctave - pattern[0]!);

    for (let i = 1; i < pattern.length; i++) {
      const distance = Math.abs(noteInOctave - pattern[i]!);
      if (distance < minDistance) {
        minDistance = distance;
        closest = i;
      }
    }

    return closest;
  }

  private random(): number {
    this.randomState = (this.randomState * 1103515245 + 12345) & 0x7fffffff;
    return this.randomState / 0x7fffffff;
  }

  saveState(): Record<string, unknown> {
    return {
      params: { ...this.params },
      randomSeed: this.randomSeed,
      randomState: this.randomState,
    };
  }

  loadState(state: Record<string, unknown>): void {
    if (state.params && typeof state.params === "object") {
      this.params = { ...this.params, ...(state.params as Partial<RandomParams>) };
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
    this.params = { ...DEFAULT_RANDOM_PARAMS };
    this.activeNotes.clear();
    this.randomSeed = Math.floor(Math.random() * 0x7fffffff);
    this.randomState = this.randomSeed;
  }
}
