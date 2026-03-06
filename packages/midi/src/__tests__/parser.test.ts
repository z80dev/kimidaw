import { describe, it, expect } from "vitest";
import { MidiParser, parseMidiData } from "../parser.js";
import { META_EVENT_TYPES } from "../types.js";

describe("MidiParser", () => {
  // Helper to create a minimal valid MIDI file
  function createMinimalMidiFile(): Uint8Array {
    const data: number[] = [];
    
    // Header chunk
    data.push(...Array.from("MThd").map(c => c.charCodeAt(0)));
    data.push(0x00, 0x00, 0x00, 0x06); // Chunk length: 6
    data.push(0x00, 0x00); // Format: 0
    data.push(0x00, 0x01); // Number of tracks: 1
    data.push(0x01, 0xe0); // Ticks per quarter: 480
    
    // Track chunk
    data.push(...Array.from("MTrk").map(c => c.charCodeAt(0)));
    data.push(0x00, 0x00, 0x00, 0x0b); // Chunk length: 11
    
    // Events
    data.push(0x00); // Delta time: 0
    data.push(0xff, 0x03); // Meta: Track name
    data.push(0x04); // Length: 4
    data.push(...Array.from("Test").map(c => c.charCodeAt(0)));
    
    data.push(0x00); // Delta time: 0
    data.push(0xff, 0x2f, 0x00); // End of track
    
    return new Uint8Array(data);
  }

  describe("parse", () => {
    it("should parse a minimal valid Type 0 MIDI file", () => {
      const data = createMinimalMidiFile();
      const result = parseMidiData(data);
      
      expect(result.success).toBe(true);
      expect(result.file).toBeDefined();
      expect(result.error).toBeUndefined();
      
      if (result.file) {
        expect(result.file.header.format).toBe(0);
        expect(result.file.header.numTracks).toBe(1);
        expect(result.file.header.ticksPerQuarter).toBe(480);
        expect(result.file.tracks).toHaveLength(1);
        expect(result.file.tracks[0].name).toBe("Test");
      }
    });

    it("should fail on too small file", () => {
      const data = new Uint8Array([0x00, 0x01, 0x02]);
      const result = parseMidiData(data);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("too small");
    });

    it("should fail on invalid header chunk ID", () => {
      const data = new Uint8Array([
        ...Array.from("XXXX").map(c => c.charCodeAt(0)), // Invalid ID
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x00, 0x00, 0x01, 0x01, 0xe0,
      ]);
      const result = parseMidiData(data);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("header chunk ID");
    });

    it("should fail on invalid format", () => {
      const data = new Uint8Array([
        ...Array.from("MThd").map(c => c.charCodeAt(0)),
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x03, // Invalid format: 3
        0x00, 0x01, 0x01, 0xe0,
      ]);
      const result = parseMidiData(data);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("format");
    });

    it("should fail on Type 0 with multiple tracks", () => {
      const data = new Uint8Array([
        ...Array.from("MThd").map(c => c.charCodeAt(0)),
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x00, // Format: 0
        0x00, 0x02, // 2 tracks - invalid for Type 0
        0x01, 0xe0,
      ]);
      const result = parseMidiData(data);
      
      expect(result.success).toBe(false);
    });
  });

  describe("getTempoBpm", () => {
    it("should calculate BPM from tempo meta event", () => {
      const event = {
        deltaTime: 0,
        type: "setTempo" as const,
        channel: 0,
        data: [],
        metaType: META_EVENT_TYPES.SET_TEMPO,
        metaData: new Uint8Array([0x07, 0xa1, 0x20]), // 500000 μs/quarter = 120 BPM
      };
      
      const bpm = MidiParser.getTempoBpm(event);
      expect(bpm).toBe(120);
    });

    it("should handle different tempos", () => {
      const testCases = [
        { bytes: [0x07, 0xa1, 0x20], expected: 120 }, // 500000
        { bytes: [0x03, 0xd0, 0x90], expected: 250 }, // 250000
        { bytes: [0x0f, 0x42, 0x40], expected: 60 },  // 1000000
      ];
      
      for (const { bytes, expected } of testCases) {
        const event = {
          deltaTime: 0,
          type: "setTempo" as const,
          channel: 0,
          data: [],
          metaType: META_EVENT_TYPES.SET_TEMPO,
          metaData: new Uint8Array(bytes),
        };
        expect(MidiParser.getTempoBpm(event)).toBe(expected);
      }
    });

    it("should return null for non-tempo events", () => {
      const event = {
        deltaTime: 0,
        type: "noteOn" as const,
        channel: 0,
        data: [60, 100],
      };
      
      expect(MidiParser.getTempoBpm(event)).toBeNull();
    });
  });

  describe("getTimeSignature", () => {
    it("should parse time signature", () => {
      const event = {
        deltaTime: 0,
        type: "timeSignature" as const,
        channel: 0,
        data: [],
        metaType: META_EVENT_TYPES.TIME_SIGNATURE,
        metaData: new Uint8Array([0x04, 0x02, 0x18, 0x08]), // 4/4
      };
      
      const sig = MidiParser.getTimeSignature(event);
      expect(sig).toEqual({ numerator: 4, denominator: 4 });
    });

    it("should parse 3/4 time signature", () => {
      const event = {
        deltaTime: 0,
        type: "timeSignature" as const,
        channel: 0,
        data: [],
        metaType: META_EVENT_TYPES.TIME_SIGNATURE,
        metaData: new Uint8Array([0x03, 0x02, 0x18, 0x08]), // 3/4
      };
      
      const sig = MidiParser.getTimeSignature(event);
      expect(sig).toEqual({ numerator: 3, denominator: 4 });
    });

    it("should parse 6/8 time signature", () => {
      const event = {
        deltaTime: 0,
        type: "timeSignature" as const,
        channel: 0,
        data: [],
        metaType: META_EVENT_TYPES.TIME_SIGNATURE,
        metaData: new Uint8Array([0x06, 0x03, 0x18, 0x08]), // 6/8
      };
      
      const sig = MidiParser.getTimeSignature(event);
      expect(sig).toEqual({ numerator: 6, denominator: 8 });
    });
  });

  describe("convertToAbsoluteTime", () => {
    it("should convert delta times to absolute times", () => {
      const events = [
        { deltaTime: 0, type: "noteOn" as const, channel: 0, data: [60, 100] },
        { deltaTime: 480, type: "noteOff" as const, channel: 0, data: [60, 0] },
        { deltaTime: 0, type: "noteOn" as const, channel: 0, data: [64, 100] },
        { deltaTime: 480, type: "noteOff" as const, channel: 0, data: [64, 0] },
      ];
      
      const absolute = MidiParser.convertToAbsoluteTime(events);
      
      expect(absolute[0].absoluteTime).toBe(0);
      expect(absolute[1].absoluteTime).toBe(480);
      expect(absolute[2].absoluteTime).toBe(480);
      expect(absolute[3].absoluteTime).toBe(960);
    });
  });

  describe("mergeTracks", () => {
    it("should return single track for Type 0", () => {
      const file = {
        header: { format: 0 as const, numTracks: 1, ticksPerQuarter: 480 },
        tracks: [{ name: "Track 1", events: [] }],
      };
      
      const merged = MidiParser.mergeTracks(file);
      expect(merged.name).toBe("Track 1");
    });

    it("should merge multiple tracks for Type 1", () => {
      const file = {
        header: { format: 1 as const, numTracks: 2, ticksPerQuarter: 480 },
        tracks: [
          {
            name: "Track 1",
            events: [
              { deltaTime: 0, type: "noteOn" as const, channel: 0, data: [60, 100] },
              { deltaTime: 480, type: "noteOff" as const, channel: 0, data: [60, 0] },
            ],
          },
          {
            name: "Track 2",
            events: [
              { deltaTime: 240, type: "noteOn" as const, channel: 1, data: [64, 100] },
              { deltaTime: 480, type: "noteOff" as const, channel: 1, data: [64, 0] },
            ],
          },
        ],
      };
      
      const merged = MidiParser.mergeTracks(file);
      
      // Events should be sorted by time
      expect(merged.events).toHaveLength(4);
      expect(merged.events[0].type).toBe("noteOn");
      expect(merged.events[0].channel).toBe(0);
      expect(merged.events[1].type).toBe("noteOn");
      expect(merged.events[1].channel).toBe(1);
    });
  });

  describe("variable-length quantities", () => {
    it("should parse various VLQ values", () => {
      const testCases = [
        { bytes: [0x00], expected: 0 },
        { bytes: [0x40], expected: 64 },
        { bytes: [0x7f], expected: 127 },
        { bytes: [0x81, 0x00], expected: 128 },
        { bytes: [0xc0, 0x00], expected: 8192 },
        { bytes: [0xff, 0xff, 0x7f], expected: 2097151 },
      ];
      
      for (const { bytes, expected } of testCases) {
        const data = new Uint8Array([
          ...Array.from("MThd").map(c => c.charCodeAt(0)),
          0x00, 0x00, 0x00, 0x06,
          0x00, 0x00, 0x00, 0x01, 0x01, 0xe0,
          ...Array.from("MTrk").map(c => c.charCodeAt(0)),
          0x00, 0x00, 0x00, bytes.length + 4,
          ...bytes,
          0xff, 0x2f, 0x00,
        ]);
        
        const result = parseMidiData(data);
        expect(result.success).toBe(true);
        if (result.file) {
          expect(result.file.tracks[0].events[0].deltaTime).toBe(expected);
        }
      }
    });
  });
});
