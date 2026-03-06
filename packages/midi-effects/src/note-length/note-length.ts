/**
 * Note Length MIDI Effect
 * Adjusts the length of incoming note events
 */

import {
  BaseMidiEffect,
  createNoteOff,
  rateToBeatMultiplier,
  type MidiEvent,
} from "../types.js";
import {
  type NoteLengthParams,
  type TriggerMode,
  type ActiveNote,
  DEFAULT_NOTE_LENGTH_PARAMS,
} from "./types.js";

export class NoteLength extends BaseMidiEffect {
  readonly name = "Note Length";
  readonly version = "1.0.0";

  private params: NoteLengthParams = { ...DEFAULT_NOTE_LENGTH_PARAMS };
  private activeNotes: Map<number, ActiveNote> = new Map();
  private sampleRate = 48000;
  private tempo = 120;

  setSampleRate(sr: number): void {
    this.sampleRate = sr;
  }

  setTempo(bpm: number): void {
    this.tempo = bpm;
  }

  protected onParameterChange(id: string, value: number | string | boolean): void {
    switch (id) {
      case "mode":
        if (typeof value === "string") this.params.mode = value as TriggerMode;
        break;
      case "timeMs":
        if (typeof value === "number") this.params.timeMs = Math.max(1, Math.min(1000, value));
        break;
      case "syncRate":
        if (typeof value === "string") this.params.syncRate = value as NoteLengthParams["syncRate"];
        break;
      case "gatePercent":
        if (typeof value === "number") this.params.gatePercent = Math.max(0, Math.min(200, value));
        break;
      case "releaseVelocity":
        if (typeof value === "boolean") this.params.releaseVelocity = value;
        break;
    }
  }

  process(events: MidiEvent[], sampleTime: number): MidiEvent[] {
    const output: MidiEvent[] = [];

    // Process incoming events
    for (const event of events) {
      if (event.type === "note-on") {
        const noteEvent = event as unknown as { type: "note-on"; note: number; velocity: number; channel: number; sampleTime: number };
        
        // Release any existing note with this number
        const existing = this.activeNotes.get(noteEvent.note);
        if (existing) {
          output.push(createNoteOff(
            existing.note,
            this.params.releaseVelocity ? existing.velocity : 0,
            existing.channel,
            sampleTime
          ));
        }

        // Calculate release time
        const releaseTime = this.calculateReleaseTime(sampleTime, noteEvent);

        // Store active note
        this.activeNotes.set(noteEvent.note, {
          note: noteEvent.note,
          velocity: noteEvent.velocity,
          channel: noteEvent.channel,
          startTime: sampleTime,
          releaseTime,
          scheduled: false,
        });

        // Pass through the note-on
        output.push(event);

      } else if (event.type === "note-off") {
        const noteEvent = event as unknown as { type: "note-off"; note: number; velocity: number; channel: number; sampleTime: number };
        const activeNote = this.activeNotes.get(noteEvent.note);

        if (activeNote) {
          // Don't pass through immediately - we'll release at the calculated time
          // Just update the scheduled release if needed
          if (this.params.mode === "gate") {
            // In gate mode, use the original note length scaled by gatePercent
            const originalLength = sampleTime - activeNote.startTime;
            const scaledLength = originalLength * (this.params.gatePercent / 100);
            activeNote.releaseTime = activeNote.startTime + scaledLength;
          }
          // Mark that we've seen the note-off
          activeNote.scheduled = true;
        } else {
          // No active note, pass through
          output.push(event);
        }

      } else {
        // Pass through non-note events
        output.push(event);
      }
    }

    // Check for notes that need to be released
    for (const [note, activeNote] of this.activeNotes) {
      if (sampleTime >= activeNote.releaseTime) {
        output.push(createNoteOff(
          note,
          this.params.releaseVelocity ? activeNote.velocity : 0,
          activeNote.channel,
          Math.floor(activeNote.releaseTime)
        ));
        this.activeNotes.delete(note);
      }
    }

    return output;
  }

  private calculateReleaseTime(sampleTime: number, _noteEvent: { note: number; velocity: number }): number {
    switch (this.params.mode) {
      case "time": {
        const samplesPerMs = this.sampleRate / 1000;
        return sampleTime + this.params.timeMs * samplesPerMs;
      }
      
      case "sync": {
        const beatDuration = (60 / this.tempo) * this.sampleRate;
        const multiplier = rateToBeatMultiplier(this.params.syncRate);
        return sampleTime + beatDuration * multiplier;
      }
      
      case "gate":
      default:
        // For gate mode, we'll calculate at note-off time
        // Return a far future time as placeholder
        return sampleTime + 10 * this.sampleRate;
    }
  }

  saveState(): Record<string, unknown> {
    return {
      params: { ...this.params },
      activeNotes: Array.from(this.activeNotes.entries()).map(([note, data]) => [
        note,
        { ...data },
      ]),
    };
  }

  loadState(state: Record<string, unknown>): void {
    if (state.params && typeof state.params === "object") {
      this.params = { ...this.params, ...(state.params as Partial<NoteLengthParams>) };
    }
    if (Array.isArray(state.activeNotes)) {
      this.activeNotes = new Map(state.activeNotes as [number, ActiveNote][]);
    }
  }

  reset(): void {
    super.reset();
    this.params = { ...DEFAULT_NOTE_LENGTH_PARAMS };
    this.activeNotes.clear();
  }
}
