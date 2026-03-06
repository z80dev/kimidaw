/**
 * Chord MIDI Effect
 * Adds additional notes to incoming note-on messages to create chords
 */

import {
  BaseMidiEffect,
  createNoteOn,
  createNoteOff,
  type MidiEvent,
} from "../types.js";
import {
  type ChordParams,
  type ChordNote,
  type ChordMemory,
  DEFAULT_CHORD_PARAMS,
} from "./types.js";

export class Chord extends BaseMidiEffect {
  readonly name = "Chord";
  readonly version = "1.0.0";

  private params: ChordParams = { ...DEFAULT_CHORD_PARAMS };
  
  /** Track which notes we're holding so we can release the chord together */
  private activeChords: Map<number, number[]> = new Map(); // source note -> chord notes

  protected onParameterChange(id: string, value: number | string | boolean): void {
    if (id.startsWith("note")) {
      const match = id.match(/note(\d+)(\w+)/);
      if (match) {
        const index = parseInt(match[1]!, 10);
        const prop = match[2] as keyof ChordNote;
        if (index >= 0 && index < 6) {
          if (prop === "enabled" && typeof value === "boolean") {
            this.params.notes[index]!.enabled = value;
          } else if ((prop === "shift" || prop === "velocity") && typeof value === "number") {
            if (prop === "shift") {
              this.params.notes[index]!.shift = Math.max(-64, Math.min(63, Math.floor(value)));
            } else {
              this.params.notes[index]!.velocity = Math.max(0, Math.min(200, value));
            }
          }
        }
      }
    } else {
      switch (id) {
        case "monitorInput":
          if (typeof value === "boolean") this.params.monitorInput = value;
          break;
        case "globalVelocity":
          if (typeof value === "number") this.params.globalVelocity = Math.max(0, Math.min(200, value));
          break;
        case "memoryIndex":
          if (typeof value === "number") {
            this.params.memoryIndex = Math.max(-1, Math.min(this.params.memories.length - 1, Math.floor(value)));
            this.applyMemory();
          }
          break;
      }
    }
  }

  private applyMemory(): void {
    const memory = this.params.memories[this.params.memoryIndex];
    if (!memory) return;

    // Reset all notes
    this.params.notes = Array(6).fill(null).map(() => ({
      shift: 0,
      velocity: 100,
      enabled: false,
    }));

    // Apply memory notes
    for (let i = 0; i < Math.min(memory.notes.length, 6); i++) {
      this.params.notes[i] = {
        shift: memory.notes[i]!,
        velocity: memory.velocities[i] ?? 100,
        enabled: true,
      };
    }
  }

  process(events: MidiEvent[], _sampleTime: number): MidiEvent[] {
    const output: MidiEvent[] = [];

    for (const event of events) {
      if (event.type === "note-on") {
        const noteEvent = event as unknown as { type: "note-on"; note: number; velocity: number; channel: number; sampleTime: number };
        const chordNotes: number[] = [];

        // Pass through original note if monitoring
        if (this.params.monitorInput) {
          output.push(event);
          chordNotes.push(noteEvent.note);
        }

        // Generate chord notes
        const enabledNotes = this.params.notes.filter(n => n.enabled);
        
        for (const chordNote of enabledNotes) {
          const newNote = noteEvent.note + chordNote.shift;
          
          // Clamp to valid MIDI range
          if (newNote < 0 || newNote > 127) continue;
          if (newNote === noteEvent.note && this.params.monitorInput) continue;

          const velocityScale = (chordNote.velocity / 100) * (this.params.globalVelocity / 100);
          const newVelocity = Math.min(127, Math.max(0, Math.floor(noteEvent.velocity * velocityScale)));

          output.push(createNoteOn(
            newNote,
            newVelocity,
            noteEvent.channel,
            noteEvent.sampleTime
          ));
          
          chordNotes.push(newNote);
        }

        // Track which notes this chord generated
        this.activeChords.set(noteEvent.note, chordNotes);

      } else if (event.type === "note-off") {
        const noteEvent = event as unknown as { type: "note-off"; note: number; channel: number; sampleTime: number };
        
        // If monitoring input, pass through the original note-off
        if (this.params.monitorInput) {
          output.push(event);
        }

        // Release all chord notes associated with this source note
        const chordNotes = this.activeChords.get(noteEvent.note);
        if (chordNotes) {
          for (const chordNote of chordNotes) {
            // Don't send note-off for the original note if monitoring (already sent)
            if (chordNote === noteEvent.note && this.params.monitorInput) continue;
            
            output.push(createNoteOff(
              chordNote,
              0,
              noteEvent.channel,
              noteEvent.sampleTime
            ));
          }
          this.activeChords.delete(noteEvent.note);
        }

      } else {
        // Pass through non-note events
        output.push(event);
      }
    }

    return output;
  }

  /** Add a new chord memory preset */
  addMemory(name: string, notes: number[], velocities?: number[]): void {
    this.params.memories.push({
      name,
      notes: [...notes],
      velocities: velocities ? [...velocities] : notes.map(() => 100),
    });
  }

  /** Remove a chord memory preset */
  removeMemory(index: number): void {
    if (index >= 0 && index < this.params.memories.length) {
      this.params.memories.splice(index, 1);
      if (this.params.memoryIndex >= this.params.memories.length) {
        this.params.memoryIndex = -1;
      }
    }
  }

  /** Get all chord memories */
  getMemories(): ChordMemory[] {
    return [...this.params.memories];
  }

  saveState(): Record<string, unknown> {
    return {
      params: {
        notes: this.params.notes.map(n => ({ ...n })),
        monitorInput: this.params.monitorInput,
        globalVelocity: this.params.globalVelocity,
        memories: this.params.memories.map(m => ({ ...m, notes: [...m.notes], velocities: [...m.velocities] })),
      },
    };
  }

  loadState(state: Record<string, unknown>): void {
    if (state.params && typeof state.params === "object") {
      const params = state.params as Partial<ChordParams>;
      if (params.notes) {
        this.params.notes = params.notes.map(n => ({ ...n }));
      }
      if (typeof params.monitorInput === "boolean") {
        this.params.monitorInput = params.monitorInput;
      }
      if (typeof params.globalVelocity === "number") {
        this.params.globalVelocity = params.globalVelocity;
      }
      if (params.memories) {
        this.params.memories = params.memories.map(m => ({
          ...m,
          notes: [...m.notes],
          velocities: [...m.velocities],
        }));
      }
    }
  }

  reset(): void {
    super.reset();
    this.params = { ...DEFAULT_CHORD_PARAMS };
    this.activeChords.clear();
  }
}
