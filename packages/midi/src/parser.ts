/**
 * MIDI File Parser (SMF - Standard MIDI File)
 * 
 * Parses Type 0, 1, and 2 MIDI files.
 * Implements section 12.5 of the engineering spec.
 * 
 * Features:
 * - Type 0, 1, and 2 MIDI file support
 * - Variable-length quantity (VLQ) decoding
 * - Meta event parsing (tempo, time signature, markers, etc.)
 * - Sysex event handling
 * - Running status support
 * - Comprehensive error handling
 */

import {
  type MidiFile,
  type MidiFileHeader,
  type MidiTrack,
  type MidiTrackEvent,
  type MidiMessageType,
  type MidiFileFormat,
  META_EVENT_TYPES,
} from "./types.js";

export interface ParseOptions {
  strict?: boolean; // Strict mode - throw on errors
  maxFileSize?: number; // Maximum file size in bytes
}

export interface ParseResult {
  success: boolean;
  file?: MidiFile;
  error?: Error;
  warnings: string[];
}

// MIDI file constants
const HEADER_CHUNK_ID = "MThd";
const TRACK_CHUNK_ID = "MTrk";
const HEADER_LENGTH = 6;

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

class MidiParser {
  private data: Uint8Array;
  private pos: number = 0;
  private options: ParseOptions;
  private warnings: string[] = [];
  private runningStatus: number = 0;

  constructor(data: Uint8Array, options: ParseOptions = {}) {
    this.data = data;
    this.options = {
      strict: false,
      maxFileSize: 50 * 1024 * 1024, // 50MB default limit
      ...options,
    };
  }

  /**
   * Parse a MIDI file from ArrayBuffer
   */
  static parse(buffer: ArrayBuffer, options?: ParseOptions): ParseResult {
    const data = new Uint8Array(buffer);
    const parser = new MidiParser(data, options);
    return parser.parse();
  }

  /**
   * Parse a MIDI file from Uint8Array
   */
  static parseData(data: Uint8Array, options?: ParseOptions): ParseResult {
    const parser = new MidiParser(data, options);
    return parser.parse();
  }

  /**
   * Parse a MIDI file from File/Blob
   */
  static async parseFile(file: File, options?: ParseOptions): Promise<ParseResult> {
    // Check file size
    const maxSize = options?.maxFileSize ?? 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: new Error(`File size ${file.size} exceeds maximum ${maxSize}`),
        warnings: [],
      };
    }

    try {
      const buffer = await file.arrayBuffer();
      return MidiParser.parse(buffer, options);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
        warnings: [],
      };
    }
  }

  /**
   * Main parse method
   */
  parse(): ParseResult {
    try {
      // Check minimum file size
      if (this.data.length < 14) {
        throw new Error("File too small to be a valid MIDI file");
      }

      // Check max file size
      if (this.options.maxFileSize && this.data.length > this.options.maxFileSize) {
        throw new Error(`File size ${this.data.length} exceeds maximum ${this.options.maxFileSize}`);
      }

      // Parse header
      const header = this.parseHeader();

      // Parse tracks
      const tracks: MidiTrack[] = [];
      for (let i = 0; i < header.numTracks; i++) {
        try {
          const track = this.parseTrack(i);
          tracks.push(track);
        } catch (err) {
          if (this.options.strict) {
            throw err;
          }
          this.warnings.push(`Track ${i} parse error: ${err}`);
          // Add empty track
          tracks.push({ name: `Track ${i} (error)`, events: [] });
        }
      }

      // Check for extra data
      if (this.pos < this.data.length) {
        this.warnings.push(`Extra data after last track: ${this.data.length - this.pos} bytes`);
      }

      return {
        success: true,
        file: {
          header,
          tracks,
        },
        warnings: this.warnings,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
        warnings: this.warnings,
      };
    }
  }

  // ============================================================================
  // Header Parsing
  // ============================================================================

  private parseHeader(): MidiFileHeader {
    // Check chunk ID
    const chunkId = this.readString(4);
    if (chunkId !== HEADER_CHUNK_ID) {
      throw new Error(`Invalid MIDI header chunk ID: ${chunkId}`);
    }

    // Check chunk length
    const chunkLength = this.readUint32();
    if (chunkLength !== HEADER_LENGTH) {
      throw new Error(`Invalid header chunk length: ${chunkLength} (expected ${HEADER_LENGTH})`);
    }

    // Parse format
    const format = this.readUint16() as MidiFileFormat;
    if (format !== 0 && format !== 1 && format !== 2) {
      throw new Error(`Invalid MIDI file format: ${format}`);
    }

    // Parse number of tracks
    const numTracks = this.readUint16();
    if (format === 0 && numTracks !== 1) {
      throw new Error(`Type 0 MIDI files must have exactly 1 track, found ${numTracks}`);
    }

    // Parse division (ticks per quarter or SMPTE)
    const division = this.readUint16();
    
    let ticksPerQuarter: number;
    let smpteFramesPerSecond: number | undefined;
    let smpteTicksPerFrame: number | undefined;

    if (division & 0x8000) {
      // SMPTE format
      const framesPerSecond = (division >> 8) & 0x7F;
      smpteFramesPerSecond = this.decodeSmpteFps(framesPerSecond);
      smpteTicksPerFrame = division & 0xFF;
      ticksPerQuarter = 0; // Not applicable
    } else {
      // Ticks per quarter note
      ticksPerQuarter = division & 0x7FFF;
    }

    return {
      format,
      numTracks,
      ticksPerQuarter,
      smpteFramesPerSecond,
      smpteTicksPerFrame,
    };
  }

  private decodeSmpteFps(value: number): number {
    // SMPTE frame rates are encoded as negative values
    // -24 = 24, -25 = 25, -29 = 29.97 (drop frame), -30 = 30
    switch (value) {
      case 0xE8: return 24;    // -24
      case 0xE7: return 25;    // -25
      case 0xE3: return 29.97; // -29 (drop frame)
      case 0xE2: return 30;    // -30
      default: return value;   // Unknown, return raw value
    }
  }

  // ============================================================================
  // Track Parsing
  // ============================================================================

  private parseTrack(trackIndex: number): MidiTrack {
    // Check chunk ID
    const chunkId = this.readString(4);
    if (chunkId !== TRACK_CHUNK_ID) {
      throw new Error(`Invalid track chunk ID: ${chunkId}`);
    }

    // Read track length
    const trackLength = this.readUint32();
    const trackEnd = this.pos + trackLength;

    if (trackEnd > this.data.length) {
      throw new Error(`Track ${trackIndex} extends beyond file end`);
    }

    const events: MidiTrackEvent[] = [];
    let trackName = `Track ${trackIndex}`;
    this.runningStatus = 0;

    while (this.pos < trackEnd) {
      try {
        const event = this.parseEvent();
        events.push(event);

        // Track name from meta event
        if (event.type === "meta" && event.metaType === META_EVENT_TYPES.TRACK_NAME) {
          trackName = this.decodeText(event.metaData ?? new Uint8Array());
        }
      } catch (err) {
        if (this.options.strict) {
          throw err;
        }
        this.warnings.push(`Event parse error in track ${trackIndex}: ${err}`);
        // Skip to end of track
        break;
      }
    }

    // Ensure we're at track end
    this.pos = trackEnd;

    return {
      name: trackName,
      events,
    };
  }

  private parseEvent(): MidiTrackEvent {
    // Read delta time (variable-length quantity)
    const deltaTime = this.readVariableLength();

    // Read status byte
    let status = this.readUint8();

    // Check for running status
    if (status < 0x80) {
      // Running status - use previous status
      if (this.runningStatus === 0) {
        throw new Error("Running status without previous status byte");
      }
      status = this.runningStatus;
      this.pos--; // Put back the data byte
    } else {
      // New status byte
      if (status !== STATUS.META && status !== STATUS.SYSEX && status !== STATUS.SYSEX_ESCAPE) {
        this.runningStatus = status;
      } else if (status === STATUS.SYSEX || status === STATUS.SYSEX_ESCAPE) {
        // SysEx and escape clear running status
        this.runningStatus = 0;
      }
    }

    // Parse based on status
    if (status === STATUS.META) {
      return this.parseMetaEvent(deltaTime);
    } else if (status === STATUS.SYSEX || status === STATUS.SYSEX_ESCAPE) {
      return this.parseSysexEvent(deltaTime);
    } else {
      return this.parseChannelEvent(deltaTime, status);
    }
  }

  private parseMetaEvent(deltaTime: number): MidiTrackEvent {
    const metaType = this.readUint8();
    const length = this.readVariableLength();
    const metaData = this.readBytes(length);

    const event: MidiTrackEvent = {
      deltaTime,
      type: "meta",
      metaType,
      metaData,
      channel: 0,
      data: [],
    };

    // Convert some meta events to standard types
    switch (metaType) {
      case META_EVENT_TYPES.SET_TEMPO:
        event.type = "setTempo";
        break;
      case META_EVENT_TYPES.TIME_SIGNATURE:
        event.type = "timeSignature";
        break;
      case META_EVENT_TYPES.KEY_SIGNATURE:
        event.type = "keySignature";
        break;
      case META_EVENT_TYPES.END_OF_TRACK:
        event.type = "endOfTrack";
        break;
    }

    return event;
  }

  private parseSysexEvent(deltaTime: number): MidiTrackEvent {
    const length = this.readVariableLength();
    const data = this.readBytes(length);

    return {
      deltaTime,
      type: "sysex",
      channel: 0,
      data: Array.from(data),
    };
  }

  private parseChannelEvent(deltaTime: number, status: number): MidiTrackEvent {
    const messageType = status & 0xF0;
    const channel = status & 0x0F;

    let type: MidiMessageType;
    let data: number[];

    switch (messageType) {
      case STATUS.NOTE_OFF:
        type = "noteOff";
        data = [this.readUint8(), this.readUint8()]; // note, velocity
        break;
      case STATUS.NOTE_ON:
        type = "noteOn";
        data = [this.readUint8(), this.readUint8()]; // note, velocity
        break;
      case STATUS.POLY_PRESSURE:
        type = "polyPressure";
        data = [this.readUint8(), this.readUint8()]; // note, pressure
        break;
      case STATUS.CONTROL_CHANGE:
        type = "controlChange";
        data = [this.readUint8(), this.readUint8()]; // controller, value
        break;
      case STATUS.PROGRAM_CHANGE:
        type = "programChange";
        data = [this.readUint8()]; // program
        break;
      case STATUS.CHANNEL_PRESSURE:
        type = "channelPressure";
        data = [this.readUint8()]; // pressure
        break;
      case STATUS.PITCH_BEND:
        type = "pitchBend";
        data = [this.readUint8(), this.readUint8()]; // LSB, MSB
        break;
      default:
        throw new Error(`Unknown status byte: ${status.toString(16)}`);
    }

    return {
      deltaTime,
      type,
      channel,
      data,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private readUint8(): number {
    if (this.pos >= this.data.length) {
      throw new Error("Unexpected end of file");
    }
    return this.data[this.pos++];
  }

  private readUint16(): number {
    const b1 = this.readUint8();
    const b2 = this.readUint8();
    return (b1 << 8) | b2;
  }

  private readUint32(): number {
    const b1 = this.readUint8();
    const b2 = this.readUint8();
    const b3 = this.readUint8();
    const b4 = this.readUint8();
    return (b1 << 24) | (b2 << 16) | (b3 << 8) | b4;
  }

  private readBytes(length: number): Uint8Array {
    if (this.pos + length > this.data.length) {
      throw new Error("Unexpected end of file");
    }
    const result = this.data.slice(this.pos, this.pos + length);
    this.pos += length;
    return result;
  }

  private readString(length: number): string {
    const bytes = this.readBytes(length);
    return String.fromCharCode(...bytes);
  }

  /**
   * Read a variable-length quantity
   */
  private readVariableLength(): number {
    let value = 0;
    let byte: number;

    do {
      byte = this.readUint8();
      value = (value << 7) | (byte & 0x7F);
    } while (byte & 0x80);

    return value;
  }

  private decodeText(data: Uint8Array): string {
    // Try UTF-8 first, fall back to Latin-1
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(data);
    } catch {
      return new TextDecoder("latin1").decode(data);
    }
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Get tempo in BPM from a setTempo meta event
   */
  static getTempoBpm(event: MidiTrackEvent): number | null {
    if (event.type !== "setTempo" && event.metaType !== META_EVENT_TYPES.SET_TEMPO) {
      return null;
    }

    const data = event.metaData;
    if (!data || data.length < 3) return null;

    // Tempo is in microseconds per quarter note
    const microsecondsPerQuarter = (data[0] << 16) | (data[1] << 8) | data[2];
    if (microsecondsPerQuarter === 0) return null;

    return 60000000 / microsecondsPerQuarter;
  }

  /**
   * Get time signature from a timeSignature meta event
   */
  static getTimeSignature(event: MidiTrackEvent): { numerator: number; denominator: number } | null {
    if (event.type !== "timeSignature" && event.metaType !== META_EVENT_TYPES.TIME_SIGNATURE) {
      return null;
    }

    const data = event.metaData;
    if (!data || data.length < 4) return null;

    const numerator = data[0];
    const denominator = Math.pow(2, data[1]);

    return { numerator, denominator };
  }

  /**
   * Get key signature from a keySignature meta event
   */
  static getKeySignature(event: MidiTrackEvent): { key: number; isMinor: boolean } | null {
    if (event.type !== "keySignature" && event.metaType !== META_EVENT_TYPES.KEY_SIGNATURE) {
      return null;
    }

    const data = event.metaData;
    if (!data || data.length < 2) return null;

    // Key is in sharps/flats: positive = sharps, negative = flats
    const key = data[0] > 127 ? data[0] - 256 : data[0];
    const isMinor = data[1] === 1;

    return { key, isMinor };
  }

  /**
   * Convert ticks to absolute time
   */
  static convertToAbsoluteTime(events: MidiTrackEvent[]): Array<MidiTrackEvent & { absoluteTime: number }> {
    let currentTime = 0;
    return events.map(event => {
      currentTime += event.deltaTime;
      return { ...event, absoluteTime: currentTime };
    });
  }

  /**
   * Merge tracks into a single track (for Type 1 files)
   */
  static mergeTracks(file: MidiFile): MidiTrack {
    if (file.header.format === 0) {
      return file.tracks[0];
    }

    // Convert all events to absolute time
    const allEvents: Array<MidiTrackEvent & { absoluteTime: number; trackIndex: number }> = [];
    
    file.tracks.forEach((track, trackIndex) => {
      let currentTime = 0;
      track.events.forEach(event => {
        currentTime += event.deltaTime;
        allEvents.push({ ...event, absoluteTime: currentTime, trackIndex });
      });
    });

    // Sort by absolute time
    allEvents.sort((a, b) => a.absoluteTime - b.absoluteTime);

    // Convert back to delta time
    let lastTime = 0;
    const mergedEvents: MidiTrackEvent[] = allEvents.map(event => {
      const deltaTime = event.absoluteTime - lastTime;
      lastTime = event.absoluteTime;
      const { absoluteTime, trackIndex, ...rest } = event;
      return { ...rest, deltaTime };
    });

    return {
      name: "Merged",
      events: mergedEvents,
    };
  }
}

// Convenience functions
export function parseMidiFile(buffer: ArrayBuffer, options?: ParseOptions): ParseResult {
  return MidiParser.parse(buffer, options);
}

export function parseMidiData(data: Uint8Array, options?: ParseOptions): ParseResult {
  return MidiParser.parseData(data, options);
}

export async function parseMidiBlob(file: File, options?: ParseOptions): Promise<ParseResult> {
  return MidiParser.parseFile(file, options);
}

// Re-export types
export type { MidiParser };
