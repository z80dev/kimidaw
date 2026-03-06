/**
 * MIDI File Writer (SMF - Standard MIDI File)
 * 
 * Writes Type 0 and Type 1 MIDI files.
 * Complements the parser for round-trip MIDI file support.
 * 
 * Features:
 * - Type 0 and Type 1 MIDI file generation
 * - Variable-length quantity (VLQ) encoding
 * - Meta event generation
 * - Running status optimization
 * - Tempo map and time signature support
 */

import {
  type MidiFile,
  type MidiFileHeader,
  type MidiTrack,
  type MidiTrackEvent,
  type MidiMessageType,
  META_EVENT_TYPES,
} from "./types.js";

export interface WriteOptions {
  format?: 0 | 1;
  ticksPerQuarter?: number;
  useRunningStatus?: boolean; // Optimize using running status
}

export interface WriteResult {
  success: boolean;
  data?: Uint8Array;
  error?: Error;
}

// Status byte constants
const STATUS = {
  NOTE_OFF: 0x80,
  NOTE_ON: 0x90,
  POLY_PRESSURE: 0xA0,
  CONTROL_CHANGE: 0xB0,
  PROGRAM_CHANGE: 0xC0,
  CHANNEL_PRESSURE: 0xD0,
  PITCH_BEND: 0xE0,
  SYSEX: 0xF0,
  SYSEX_ESCAPE: 0xF7,
  META: 0xFF,
} as const;

class MidiWriter {
  private options: Required<WriteOptions>;
  private chunks: Uint8Array[] = [];

  constructor(options: WriteOptions = {}) {
    this.options = {
      format: 1,
      ticksPerQuarter: 960,
      useRunningStatus: true,
      ...options,
    };
  }

  /**
   * Write a MIDI file to a Uint8Array
   */
  static write(file: MidiFile, options?: WriteOptions): WriteResult {
    const writer = new MidiWriter(options);
    return writer.write(file);
  }

  /**
   * Create a simple MIDI file with a single track
   */
  static createSimple(
    events: Omit<MidiTrackEvent, "deltaTime">[],
    options?: WriteOptions & { tempo?: number; timeSignature?: [number, number] }
  ): WriteResult {
    const opts = options ?? {};
    const ticksPerQuarter = opts.ticksPerQuarter ?? 960;

    // Create track with initial tempo and time signature
    const trackEvents: MidiTrackEvent[] = [];

    // Add tempo if specified
    if (opts.tempo) {
      trackEvents.push(MidiWriter.createTempoEvent(0, opts.tempo));
    }

    // Add time signature if specified
    if (opts.timeSignature) {
      trackEvents.push(
        MidiWriter.createTimeSignatureEvent(0, opts.timeSignature[0], opts.timeSignature[1])
      );
    }

    // Add the events with proper delta times
    for (const evt of events) {
      // For simplicity, assume all events have absolute time stored somewhere
      // In a real implementation, you'd want proper absolute time tracking
      trackEvents.push({
        ...evt,
        deltaTime: 0, // Caller must provide proper delta times
      });
    }

    // Add end of track
    trackEvents.push(MidiWriter.createEndOfTrackEvent(0));

    const file: MidiFile = {
      header: {
        format: opts.format ?? 0,
        numTracks: 1,
        ticksPerQuarter,
      },
      tracks: [
        {
          name: "Track 1",
          events: trackEvents,
        },
      ],
    };

    return MidiWriter.write(file, opts);
  }

  /**
   * Main write method
   */
  write(file: MidiFile): WriteResult {
    try {
      this.chunks = [];

      // Validate header
      if (file.header.format !== 0 && file.header.format !== 1 && file.header.format !== 2) {
        throw new Error(`Invalid MIDI format: ${file.header.format}`);
      }

      if (file.header.format === 0 && file.tracks.length !== 1) {
        throw new Error("Type 0 MIDI files must have exactly 1 track");
      }

      // Write header chunk
      this.writeHeader(file.header);

      // Write track chunks
      for (const track of file.tracks) {
        this.writeTrack(track);
      }

      // Combine all chunks
      const totalLength = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let pos = 0;
      for (const chunk of this.chunks) {
        result.set(chunk, pos);
        pos += chunk.length;
      }

      return {
        success: true,
        data: result,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  // ============================================================================
  // Header Writing
  // ============================================================================

  private writeHeader(header: MidiFileHeader): void {
    // Chunk ID
    this.writeString("MThd");
    // Chunk length (always 6)
    this.writeUint32(6);
    // Format
    this.writeUint16(header.format);
    // Number of tracks
    this.writeUint16(header.numTracks);
    // Division (ticks per quarter)
    this.writeUint16(header.ticksPerQuarter);
  }

  // ============================================================================
  // Track Writing
  // ============================================================================

  private writeTrack(track: MidiTrack): void {
    // Collect track data
    const trackData: number[] = [];
    let runningStatus: number = 0;

    // Add track name meta event if provided
    if (track.name) {
      const nameEvent = MidiWriter.createTrackNameEvent(0, track.name);
      this.writeEventToArray(nameEvent, trackData, runningStatus);
    }

    for (const event of track.events) {
      const newRunningStatus = this.writeEventToArray(event, trackData, runningStatus);
      if (this.options.useRunningStatus) {
        runningStatus = newRunningStatus;
      }
    }

    // Write track chunk
    this.writeString("MTrk");
    this.writeUint32(trackData.length);
    this.writeBytes(new Uint8Array(trackData));
  }

  private writeEventToArray(event: MidiTrackEvent, data: number[], runningStatus: number): number {
    // Write delta time
    this.writeVariableLengthToArray(event.deltaTime, data);

    // Determine new running status
    let newRunningStatus = runningStatus;

    if (event.type === "meta") {
      // Meta events don't use running status
      data.push(STATUS.META);
      data.push(event.metaType ?? 0);
      this.writeVariableLengthToArray(event.metaData?.length ?? 0, data);
      if (event.metaData) {
        data.push(...event.metaData);
      }
      newRunningStatus = 0;
    } else if (event.type === "sysex") {
      // SysEx events clear running status
      data.push(STATUS.SYSEX);
      this.writeVariableLengthToArray(event.data.length, data);
      data.push(...event.data);
      newRunningStatus = 0;
    } else {
      // Channel events
      const statusByte = this.getStatusByte(event.type, event.channel ?? 0);
      
      // Use running status if possible
      if (this.options.useRunningStatus && statusByte === runningStatus) {
        // Skip status byte
      } else {
        data.push(statusByte);
      }
      
      // Write data bytes
      data.push(...event.data);
      newRunningStatus = statusByte;
    }

    return newRunningStatus;
  }

  private getStatusByte(type: MidiMessageType, channel: number): number {
    const ch = channel & 0x0F;
    switch (type) {
      case "noteOff": return STATUS.NOTE_OFF | ch;
      case "noteOn": return STATUS.NOTE_ON | ch;
      case "polyPressure": return STATUS.POLY_PRESSURE | ch;
      case "controlChange": return STATUS.CONTROL_CHANGE | ch;
      case "programChange": return STATUS.PROGRAM_CHANGE | ch;
      case "channelPressure": return STATUS.CHANNEL_PRESSURE | ch;
      case "pitchBend": return STATUS.PITCH_BEND | ch;
      default: throw new Error(`Cannot write event type: ${type}`);
    }
  }

  // ============================================================================
  // Binary Writing Helpers
  // ============================================================================

  private writeUint16(value: number): void {
    this.chunks.push(new Uint8Array([
      (value >> 8) & 0xFF,
      value & 0xFF,
    ]));
  }

  private writeUint32(value: number): void {
    this.chunks.push(new Uint8Array([
      (value >> 24) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 8) & 0xFF,
      value & 0xFF,
    ]));
  }

  private writeString(str: string): void {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    this.chunks.push(bytes);
  }

  private writeBytes(bytes: Uint8Array): void {
    this.chunks.push(bytes);
  }

  private writeVariableLengthToArray(value: number, array: number[]): void {
    if (value < 0) {
      throw new Error("Cannot encode negative variable-length quantity");
    }

    if (value === 0) {
      array.push(0);
      return;
    }

    const bytes: number[] = [];
    let v = value;
    
    do {
      bytes.unshift((v & 0x7F) | 0x80);
      v >>= 7;
    } while (v > 0);
    
    // Clear continuation bit on last byte
    bytes[bytes.length - 1] &= 0x7F;
    
    array.push(...bytes);
  }

  // ============================================================================
  // Static Event Factory Methods
  // ============================================================================

  /**
   * Create a note on event
   */
  static createNoteOn(
    deltaTime: number,
    note: number,
    velocity: number,
    channel: number = 0
  ): MidiTrackEvent {
    return {
      deltaTime,
      type: "noteOn",
      channel: channel & 0x0F,
      data: [note & 0x7F, velocity & 0x7F],
    };
  }

  /**
   * Create a note off event
   */
  static createNoteOff(
    deltaTime: number,
    note: number,
    velocity: number = 0,
    channel: number = 0
  ): MidiTrackEvent {
    return {
      deltaTime,
      type: "noteOff",
      channel: channel & 0x0F,
      data: [note & 0x7F, velocity & 0x7F],
    };
  }

  /**
   * Create a control change event
   */
  static createControlChange(
    deltaTime: number,
    controller: number,
    value: number,
    channel: number = 0
  ): MidiTrackEvent {
    return {
      deltaTime,
      type: "controlChange",
      channel: channel & 0x0F,
      data: [controller & 0x7F, value & 0x7F],
    };
  }

  /**
   * Create a program change event
   */
  static createProgramChange(
    deltaTime: number,
    program: number,
    channel: number = 0
  ): MidiTrackEvent {
    return {
      deltaTime,
      type: "programChange",
      channel: channel & 0x0F,
      data: [program & 0x7F],
    };
  }

  /**
   * Create a pitch bend event
   */
  static createPitchBend(
    deltaTime: number,
    value: number, // -8192 to 8191
    channel: number = 0
  ): MidiTrackEvent {
    const centered = Math.max(-8192, Math.min(8191, value));
    const unsigned = centered + 8192;
    return {
      deltaTime,
      type: "pitchBend",
      channel: channel & 0x0F,
      data: [unsigned & 0x7F, (unsigned >> 7) & 0x7F],
    };
  }

  /**
   * Create a channel pressure event
   */
  static createChannelPressure(
    deltaTime: number,
    pressure: number,
    channel: number = 0
  ): MidiTrackEvent {
    return {
      deltaTime,
      type: "channelPressure",
      channel: channel & 0x0F,
      data: [pressure & 0x7F],
    };
  }

  /**
   * Create a polyphonic pressure event
   */
  static createPolyPressure(
    deltaTime: number,
    note: number,
    pressure: number,
    channel: number = 0
  ): MidiTrackEvent {
    return {
      deltaTime,
      type: "polyPressure",
      channel: channel & 0x0F,
      data: [note & 0x7F, pressure & 0x7F],
    };
  }

  /**
   * Create a tempo meta event
   */
  static createTempoEvent(deltaTime: number, bpm: number): MidiTrackEvent {
    // Convert BPM to microseconds per quarter note
    const microsecondsPerQuarter = Math.round(60000000 / bpm);
    const data = new Uint8Array([
      (microsecondsPerQuarter >> 16) & 0xFF,
      (microsecondsPerQuarter >> 8) & 0xFF,
      microsecondsPerQuarter & 0xFF,
    ]);

    return {
      deltaTime,
      type: "setTempo",
      channel: 0,
      data: [],
      metaType: META_EVENT_TYPES.SET_TEMPO,
      metaData: data,
    };
  }

  /**
   * Create a time signature meta event
   */
  static createTimeSignatureEvent(
    deltaTime: number,
    numerator: number,
    denominator: number
  ): MidiTrackEvent {
    // Denominator is encoded as power of 2 (e.g., 4 = 2^2, 8 = 2^3)
    const denominatorPower = Math.log2(denominator);
    const data = new Uint8Array([
      numerator & 0xFF,
      denominatorPower & 0xFF,
      24, // MIDI clocks per metronome click
      8,  // Number of 32nd notes per quarter
    ]);

    return {
      deltaTime,
      type: "timeSignature",
      channel: 0,
      data: [],
      metaType: META_EVENT_TYPES.TIME_SIGNATURE,
      metaData: data,
    };
  }

  /**
   * Create a key signature meta event
   */
  static createKeySignatureEvent(
    deltaTime: number,
    sharpsFlats: number, // -7 to 7 (negative = flats, positive = sharps)
    isMinor: boolean = false
  ): MidiTrackEvent {
    const data = new Uint8Array([
      sharpsFlats & 0xFF,
      isMinor ? 1 : 0,
    ]);

    return {
      deltaTime,
      type: "keySignature",
      channel: 0,
      data: [],
      metaType: META_EVENT_TYPES.KEY_SIGNATURE,
      metaData: data,
    };
  }

  /**
   * Create a track name meta event
   */
  static createTrackNameEvent(deltaTime: number, name: string): MidiTrackEvent {
    const encoder = new TextEncoder();
    const data = encoder.encode(name);

    return {
      deltaTime,
      type: "meta",
      channel: 0,
      data: [],
      metaType: META_EVENT_TYPES.TRACK_NAME,
      metaData: data,
    };
  }

  /**
   * Create an instrument name meta event
   */
  static createInstrumentNameEvent(deltaTime: number, name: string): MidiTrackEvent {
    const encoder = new TextEncoder();
    const data = encoder.encode(name);

    return {
      deltaTime,
      type: "meta",
      channel: 0,
      data: [],
      metaType: META_EVENT_TYPES.INSTRUMENT_NAME,
      metaData: data,
    };
  }

  /**
   * Create a marker meta event
   */
  static createMarkerEvent(deltaTime: number, text: string): MidiTrackEvent {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    return {
      deltaTime,
      type: "meta",
      channel: 0,
      data: [],
      metaType: META_EVENT_TYPES.MARKER,
      metaData: data,
    };
  }

  /**
   * Create a text meta event
   */
  static createTextEvent(deltaTime: number, text: string): MidiTrackEvent {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    return {
      deltaTime,
      type: "meta",
      channel: 0,
      data: [],
      metaType: META_EVENT_TYPES.TEXT,
      metaData: data,
    };
  }

  /**
   * Create a copyright meta event
   */
  static createCopyrightEvent(deltaTime: number, text: string): MidiTrackEvent {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    return {
      deltaTime,
      type: "meta",
      channel: 0,
      data: [],
      metaType: META_EVENT_TYPES.COPYRIGHT,
      metaData: data,
    };
  }

  /**
   * Create an end-of-track meta event
   */
  static createEndOfTrackEvent(deltaTime: number): MidiTrackEvent {
    return {
      deltaTime,
      type: "endOfTrack",
      channel: 0,
      data: [],
      metaType: META_EVENT_TYPES.END_OF_TRACK,
      metaData: new Uint8Array(0),
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Convert ticks to milliseconds at a given tempo
   */
  static ticksToMs(ticks: number, bpm: number, ticksPerQuarter: number): number {
    const msPerTick = (60000 / bpm) / ticksPerQuarter;
    return ticks * msPerTick;
  }

  /**
   * Convert milliseconds to ticks at a given tempo
   */
  static msToTicks(ms: number, bpm: number, ticksPerQuarter: number): number {
    const ticksPerMs = (bpm * ticksPerQuarter) / 60000;
    return Math.round(ms * ticksPerMs);
  }

  /**
   * Create a MIDI file from note events
   */
  static createFromNotes(
    notes: Array<{
      note: number;
      startTick: number;
      durationTicks: number;
      velocity: number;
      channel?: number;
    }>,
    options?: WriteOptions & { tempo?: number }
  ): WriteResult {
    const opts = options ?? {};
    const ticksPerQuarter = opts.ticksPerQuarter ?? 960;
    const tempo = opts.tempo ?? 120;

    // Sort notes by start time
    const sortedNotes = [...notes].sort((a, b) => a.startTick - b.startTick);

    // Create events
    const events: MidiTrackEvent[] = [];
    
    // Add tempo
    events.push(MidiWriter.createTempoEvent(0, tempo));
    
    // Create note on/off events
    const noteEvents: Array<{ tick: number; type: "on" | "off"; note: typeof sortedNotes[0] }> = [];
    
    for (const note of sortedNotes) {
      noteEvents.push({ tick: note.startTick, type: "on", note });
      noteEvents.push({ tick: note.startTick + note.durationTicks, type: "off", note });
    }
    
    // Sort by tick
    noteEvents.sort((a, b) => a.tick - b.tick);

    // Convert to delta times
    let lastTick = 0;
    for (const evt of noteEvents) {
      const deltaTime = evt.tick - lastTick;
      lastTick = evt.tick;
      
      if (evt.type === "on") {
        events.push(
          MidiWriter.createNoteOn(
            deltaTime,
            evt.note.note,
            evt.note.velocity,
            evt.note.channel ?? 0
          )
        );
      } else {
        events.push(
          MidiWriter.createNoteOff(
            deltaTime,
            evt.note.note,
            0,
            evt.note.channel ?? 0
          )
        );
      }
    }

    // Add end of track
    events.push(MidiWriter.createEndOfTrackEvent(0));

    const file: MidiFile = {
      header: {
        format: opts.format ?? 0,
        numTracks: 1,
        ticksPerQuarter,
      },
      tracks: [{ name: "Notes", events }],
    };

    return MidiWriter.write(file, opts);
  }

  /**
   * Download the MIDI file
   */
  static download(data: Uint8Array, filename: string = "output.mid"): void {
    if (typeof window === "undefined") return;

    const blob = new Blob([data.buffer as ArrayBuffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Convenience function
export function writeMidiFile(file: MidiFile, options?: WriteOptions): WriteResult {
  return MidiWriter.write(file, options);
}

// Re-export types
export type { MidiWriter };
