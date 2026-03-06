/**
 * MIDI Import Pipeline
 * 
 * Handles MIDI file import and conversion to project clips.
 * 
 * Features:
 * - SMF Type 0, 1, 2 support
 * - Tempo map extraction
 * - Note event conversion
 * - CC/pitch bend automation extraction
 * - Track merging
 */

import { parseMidiFile, parseMidiData, MidiParser, type MidiFile, type MidiTrack } from "@daw/midi";
import type { ImportResult, MidiMetadata, TempoEvent, TimeSignatureEvent } from "./types.js";

export interface MidiImportOptions {
  mergeTracks?: boolean; // Merge Type 1 tracks
  quantizeNotes?: boolean;
  defaultVelocity?: number;
  ticksPerQuarter?: number; // Target PPQ
}

class MidiImportManager {
  private options: Required<MidiImportOptions>;

  constructor(options: MidiImportOptions = {}) {
    this.options = {
      mergeTracks: false,
      quantizeNotes: false,
      defaultVelocity: 100,
      ticksPerQuarter: 960,
      ...options,
    };
  }

  /**
   * Import a MIDI file
   */
  async importMidi(file: File, jobId: string): Promise<ImportResult> {
    const parseResult = await parseMidiFile(file);

    if (!parseResult.success || !parseResult.file) {
      throw parseResult.error ?? new Error("Failed to parse MIDI file");
    }

    const midiFile = parseResult.file;
    const hash = await this.computeHash(await file.arrayBuffer());

    // Process tracks
    const processedTracks = this.processMidiFile(midiFile);

    // Build metadata
    const metadata: MidiMetadata = {
      type: "midi",
      format: midiFile.header.format,
      numTracks: midiFile.header.numTracks,
      ticksPerQuarter: midiFile.header.ticksPerQuarter,
      duration: this.calculateDuration(midiFile),
      tempoMap: this.extractTempoMap(midiFile),
      timeSignatures: this.extractTimeSignatures(midiFile),
    };

    return {
      assetId: `midi-${hash}`,
      hash,
      metadata,
      duration: metadata.duration,
    };
  }

  /**
   * Import from ArrayBuffer
   */
  async importMidiBuffer(buffer: ArrayBuffer, filename: string): Promise<ImportResult> {
    const parseResult = parseMidiData(new Uint8Array(buffer));

    if (!parseResult.success || !parseResult.file) {
      throw parseResult.error ?? new Error("Failed to parse MIDI data");
    }

    const midiFile = parseResult.file;
    const hash = await this.computeHash(buffer);

    const metadata: MidiMetadata = {
      type: "midi",
      format: midiFile.header.format,
      numTracks: midiFile.header.numTracks,
      ticksPerQuarter: midiFile.header.ticksPerQuarter,
      duration: this.calculateDuration(midiFile),
      tempoMap: this.extractTempoMap(midiFile),
      timeSignatures: this.extractTimeSignatures(midiFile),
    };

    return {
      assetId: `midi-${hash}`,
      hash,
      metadata,
      duration: metadata.duration,
    };
  }

  /**
   * Process MIDI file and extract note clips
   */
  private processMidiFile(file: MidiFile): ProcessedTrack[] {
    let tracks = file.tracks;

    // Merge tracks if requested (Type 1)
    if (this.options.mergeTracks && file.header.format === 1) {
      const merged = MidiParser.mergeTracks(file);
      tracks = [merged];
    }

    return tracks.map((track, index) => this.processTrack(track, index, file.header.ticksPerQuarter));
  }

  /**
   * Process a single track
   */
  private processTrack(track: MidiTrack, trackIndex: number, sourcePpq: number): ProcessedTrack {
    const notes: MidiNote[] = [];
    const activeNotes: Map<number, { note: number; startTick: number; velocity: number }> = new Map();
    
    const ccEvents: MidiCCEvent[] = [];
    const pitchBendEvents: MidiPitchBendEvent[] = [];

    let currentTick = 0;

    for (const event of track.events) {
      currentTick += event.deltaTime;

      // Scale ticks to target PPQ
      const scaledTick = Math.round(currentTick * (this.options.ticksPerQuarter / sourcePpq));

      switch (event.type) {
        case "noteOn": {
          const note = event.data[0];
          const velocity = event.data[1];
          
          // Note on with velocity 0 is note off
          if (velocity === 0) {
            this.endNote(activeNotes, notes, note, scaledTick);
          } else {
            activeNotes.set(note, { note, startTick: scaledTick, velocity });
          }
          break;
        }

        case "noteOff": {
          const note = event.data[0];
          this.endNote(activeNotes, notes, note, scaledTick);
          break;
        }

        case "controlChange": {
          ccEvents.push({
            tick: scaledTick,
            controller: event.data[0],
            value: event.data[1],
          });
          break;
        }

        case "pitchBend": {
          const lsb = event.data[0];
          const msb = event.data[1];
          const value = ((msb << 7) | lsb) - 8192;
          
          pitchBendEvents.push({
            tick: scaledTick,
            value,
          });
          break;
        }
      }
    }

    // Close any hanging notes
    activeNotes.forEach((data, note) => {
      notes.push({
        note,
        startTick: data.startTick,
        durationTicks: currentTick - data.startTick,
        velocity: data.velocity,
      });
    });

    // Sort notes by start time
    notes.sort((a, b) => a.startTick - b.startTick);

    return {
      index: trackIndex,
      name: track.name || `Track ${trackIndex + 1}`,
      notes,
      cc: ccEvents,
      pitchBend: pitchBendEvents,
    };
  }

  /**
   * End a note and add to list
   */
  private endNote(
    activeNotes: Map<number, { note: number; startTick: number; velocity: number }>,
    notes: MidiNote[],
    note: number,
    endTick: number
  ): void {
    const data = activeNotes.get(note);
    if (data) {
      notes.push({
        note: data.note,
        startTick: data.startTick,
        durationTicks: Math.max(1, endTick - data.startTick),
        velocity: data.velocity,
      });
      activeNotes.delete(note);
    }
  }

  /**
   * Calculate total duration of MIDI file
   */
  private calculateDuration(file: MidiFile): number {
    // Use tempo track (first track for Type 1) to calculate duration
    const tempoTrack = file.header.format === 1 ? file.tracks[0] : file.tracks[0];
    
    let totalTicks = 0;
    let currentTick = 0;
    let currentTempo = 500000; // Default 120 BPM (microseconds per quarter)

    for (const event of tempoTrack.events) {
      currentTick += event.deltaTime;

      if (event.type === "setTempo" && event.metaData) {
        currentTempo = (event.metaData[0] << 16) | (event.metaData[1] << 8) | event.metaData[2];
      }
    }

    totalTicks = currentTick;

    // Convert ticks to seconds
    // seconds = ticks * (tempo / 1,000,000) / ticksPerQuarter
    const seconds = (totalTicks * currentTempo) / 1000000 / file.header.ticksPerQuarter;
    
    return seconds;
  }

  /**
   * Extract tempo map from MIDI file
   */
  private extractTempoMap(file: MidiFile): TempoEvent[] {
    const tempoMap: TempoEvent[] = [];
    const track = file.header.format === 1 ? file.tracks[0] : file.tracks[0];

    let currentTick = 0;

    for (const event of track.events) {
      currentTick += event.deltaTime;

      if (event.type === "setTempo" && event.metaData) {
        const microsecondsPerQuarter = 
          (event.metaData[0] << 16) | (event.metaData[1] << 8) | event.metaData[2];
        const bpm = 60000000 / microsecondsPerQuarter;
        
        tempoMap.push({
          tick: currentTick,
          bpm,
        });
      }
    }

    // Add default tempo if none found
    if (tempoMap.length === 0) {
      tempoMap.push({ tick: 0, bpm: 120 });
    }

    return tempoMap;
  }

  /**
   * Extract time signatures from MIDI file
   */
  private extractTimeSignatures(file: MidiFile): TimeSignatureEvent[] {
    const timeSignatures: TimeSignatureEvent[] = [];
    const track = file.header.format === 1 ? file.tracks[0] : file.tracks[0];

    let currentTick = 0;

    for (const event of track.events) {
      currentTick += event.deltaTime;

      if (event.type === "timeSignature" && event.metaData && event.metaData.length >= 4) {
        const numerator = event.metaData[0];
        const denominator = Math.pow(2, event.metaData[1]);
        
        timeSignatures.push({
          tick: currentTick,
          numerator,
          denominator,
        });
      }
    }

    // Add default 4/4 if none found
    if (timeSignatures.length === 0) {
      timeSignatures.push({ tick: 0, numerator: 4, denominator: 4 });
    }

    return timeSignatures;
  }

  /**
   * Compute hash for deduplication
   */
  private async computeHash(data: ArrayBuffer): Promise<string> {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }
    
    // Fallback
    return `midi-${data.byteLength}`;
  }

  /**
   * Convert processed track to DAW clip format
   */
  convertToClip(track: ProcessedTrack): MidiClipData {
    const ticksPerBeat = this.options.ticksPerQuarter;
    
    // Find clip bounds
    let startTick = Infinity;
    let endTick = 0;

    for (const note of track.notes) {
      if (note.startTick < startTick) startTick = note.startTick;
      const noteEnd = note.startTick + note.durationTicks;
      if (noteEnd > endTick) endTick = noteEnd;
    }

    if (startTick === Infinity) {
      startTick = 0;
      endTick = ticksPerBeat * 4; // Default 1 bar
    }

    return {
      name: track.name,
      startTick,
      endTick,
      notes: track.notes.map(n => ({
        note: n.note,
        startTick: n.startTick - startTick,
        durationTicks: n.durationTicks,
        velocity: n.velocity,
      })),
      cc: track.cc,
      pitchBend: track.pitchBend,
    };
  }
}

// Processed track structure
interface ProcessedTrack {
  index: number;
  name: string;
  notes: MidiNote[];
  cc: MidiCCEvent[];
  pitchBend: MidiPitchBendEvent[];
}

interface MidiNote {
  note: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
}

interface MidiCCEvent {
  tick: number;
  controller: number;
  value: number;
}

interface MidiPitchBendEvent {
  tick: number;
  value: number; // -8192 to 8191
}

export interface MidiClipData {
  name: string;
  startTick: number;
  endTick: number;
  notes: Array<{
    note: number;
    startTick: number;
    durationTicks: number;
    velocity: number;
  }>;
  cc: MidiCCEvent[];
  pitchBend: MidiPitchBendEvent[];
}

// Singleton
let instance: MidiImportManager | null = null;

export function getMidiImportManager(options?: MidiImportOptions): MidiImportManager {
  if (!instance) {
    instance = new MidiImportManager(options);
  }
  return instance;
}

export function resetMidiImportManager(): void {
  instance = null;
}

export type { MidiImportManager };
