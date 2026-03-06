import { describe, it, expect } from "vitest";
import { MidiWriter, writeMidiFile } from "../writer.js";
import { MidiParser } from "../parser.js";
import type { MidiFile, MidiTrackEvent } from "../types.js";

describe("MidiWriter", () => {
  describe("write", () => {
    it("should write a valid Type 0 MIDI file", () => {
      const file: MidiFile = {
        header: {
          format: 0,
          numTracks: 1,
          ticksPerQuarter: 480,
        },
        tracks: [
          {
            name: "Test Track",
            events: [
              MidiWriter.createTrackNameEvent(0, "Test Track"),
              MidiWriter.createTempoEvent(0, 120),
              MidiWriter.createTimeSignatureEvent(0, 4, 4),
              MidiWriter.createNoteOn(0, 60, 100, 0),
              MidiWriter.createNoteOff(480, 60, 0, 0),
              MidiWriter.createEndOfTrackEvent(0),
            ],
          },
        ],
      };

      const result = writeMidiFile(file);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Verify by parsing back
      if (result.data) {
        const parsed = MidiParser.parseData(result.data);
        expect(parsed.success).toBe(true);
        if (parsed.file) {
          expect(parsed.file.header.format).toBe(0);
          expect(parsed.file.header.ticksPerQuarter).toBe(480);
          expect(parsed.file.tracks).toHaveLength(1);
        }
      }
    });

    it("should write a valid Type 1 MIDI file", () => {
      const file: MidiFile = {
        header: {
          format: 1,
          numTracks: 2,
          ticksPerQuarter: 960,
        },
        tracks: [
          {
            name: "Tempo Track",
            events: [
              MidiWriter.createTempoEvent(0, 120),
              MidiWriter.createTimeSignatureEvent(0, 4, 4),
              MidiWriter.createEndOfTrackEvent(0),
            ],
          },
          {
            name: "Note Track",
            events: [
              MidiWriter.createTrackNameEvent(0, "Note Track"),
              MidiWriter.createNoteOn(0, 60, 100, 0),
              MidiWriter.createNoteOff(480, 60, 0, 0),
              MidiWriter.createEndOfTrackEvent(0),
            ],
          },
        ],
      };

      const result = writeMidiFile(file);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        const parsed = MidiParser.parseData(result.data);
        expect(parsed.success).toBe(true);
        if (parsed.file) {
          expect(parsed.file.header.format).toBe(1);
          expect(parsed.file.header.numTracks).toBe(2);
          expect(parsed.file.tracks).toHaveLength(2);
        }
      }
    });

    it("should reject invalid format", () => {
      const file: MidiFile = {
        header: {
          format: 3 as 0 | 1 | 2, // Invalid
          numTracks: 1,
          ticksPerQuarter: 480,
        },
        tracks: [{ name: "Test", events: [MidiWriter.createEndOfTrackEvent(0)] }],
      };

      const result = writeMidiFile(file);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Invalid MIDI format");
    });

    it("should reject Type 0 with multiple tracks", () => {
      const file: MidiFile = {
        header: {
          format: 0,
          numTracks: 2,
          ticksPerQuarter: 480,
        },
        tracks: [
          { name: "Track 1", events: [MidiWriter.createEndOfTrackEvent(0)] },
          { name: "Track 2", events: [MidiWriter.createEndOfTrackEvent(0)] },
        ],
      };

      const result = writeMidiFile(file);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Type 0");
    });
  });

  describe("event factories", () => {
    it("should create note on events correctly", () => {
      const event = MidiWriter.createNoteOn(120, 60, 100, 5);
      expect(event.deltaTime).toBe(120);
      expect(event.type).toBe("noteOn");
      expect(event.channel).toBe(5);
      expect(event.data).toEqual([60, 100]);
    });

    it("should clamp note values", () => {
      const event = MidiWriter.createNoteOn(0, 128, 130, 20);
      expect(event.data).toEqual([0, 127]); // Clamped
      expect(event.channel).toBe(4); // 20 & 0x0F = 4
    });

    it("should create note off events correctly", () => {
      const event = MidiWriter.createNoteOff(480, 60, 64, 0);
      expect(event.deltaTime).toBe(480);
      expect(event.type).toBe("noteOff");
      expect(event.data).toEqual([60, 64]);
    });

    it("should create control change events correctly", () => {
      const event = MidiWriter.createControlChange(0, 64, 127, 0);
      expect(event.type).toBe("controlChange");
      expect(event.data).toEqual([64, 127]);
    });

    it("should create program change events correctly", () => {
      const event = MidiWriter.createProgramChange(0, 5, 0);
      expect(event.type).toBe("programChange");
      expect(event.data).toEqual([5]);
    });

    it("should create pitch bend events correctly", () => {
      // Center (no bend)
      const event1 = MidiWriter.createPitchBend(0, 0, 0);
      expect(event1.data).toEqual([0x00, 0x40]); // 8192 = 0x2000

      // Maximum bend
      const event2 = MidiWriter.createPitchBend(0, 8191, 0);
      expect(event2.data).toEqual([0x7f, 0x7f]); // 16383 = 0x3fff

      // Minimum bend
      const event3 = MidiWriter.createPitchBend(0, -8192, 0);
      expect(event3.data).toEqual([0x00, 0x00]); // 0
    });

    it("should clamp pitch bend values", () => {
      const event = MidiWriter.createPitchBend(0, 10000, 0);
      expect(event.data).toEqual([0x7f, 0x7f]); // Clamped to max
    });

    it("should create tempo events correctly", () => {
      const event = MidiWriter.createTempoEvent(0, 120);
      expect(event.type).toBe("setTempo");
      expect(event.metaType).toBe(0x51);
      // 120 BPM = 500000 μs/quarter = 0x07a120
      expect(event.metaData).toEqual(new Uint8Array([0x07, 0xa1, 0x20]));
    });

    it("should create time signature events correctly", () => {
      const event = MidiWriter.createTimeSignatureEvent(0, 4, 4);
      expect(event.type).toBe("timeSignature");
      expect(event.metaData).toEqual(new Uint8Array([0x04, 0x02, 0x18, 0x08]));
    });

    it("should create key signature events correctly", () => {
      // C major (0 sharps/flats)
      const event1 = MidiWriter.createKeySignatureEvent(0, 0, false);
      expect(event1.metaData).toEqual(new Uint8Array([0x00, 0x00]));

      // A minor (0 sharps/flats, minor)
      const event2 = MidiWriter.createKeySignatureEvent(0, 0, true);
      expect(event2.metaData).toEqual(new Uint8Array([0x00, 0x01]));

      // G major (1 sharp)
      const event3 = MidiWriter.createKeySignatureEvent(0, 1, false);
      expect(event3.metaData).toEqual(new Uint8Array([0x01, 0x00]));
    });

    it("should create track name events correctly", () => {
      const event = MidiWriter.createTrackNameEvent(0, "My Track");
      expect(event.metaType).toBe(0x03);
      expect(new TextDecoder().decode(event.metaData!)).toBe("My Track");
    });

    it("should create marker events correctly", () => {
      const event = MidiWriter.createMarkerEvent(480, "Chorus");
      expect(event.metaType).toBe(0x06);
      expect(new TextDecoder().decode(event.metaData!)).toBe("Chorus");
    });
  });

  describe("createFromNotes", () => {
    it("should create a MIDI file from note events", () => {
      const notes = [
        { note: 60, startTick: 0, durationTicks: 480, velocity: 100 },
        { note: 64, startTick: 480, durationTicks: 480, velocity: 100 },
        { note: 67, startTick: 960, durationTicks: 480, velocity: 100 },
      ];

      const result = MidiWriter.createFromNotes(notes, { tempo: 120 });
      expect(result.success).toBe(true);

      if (result.data) {
        const parsed = MidiParser.parseData(result.data);
        expect(parsed.success).toBe(true);
        if (parsed.file) {
          expect(parsed.file.tracks[0].events.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("time conversion utilities", () => {
    it("should convert ticks to milliseconds correctly", () => {
      // 480 ticks per quarter, 120 BPM
      // 480 ticks = 1 quarter = 500ms
      const ms = MidiWriter.ticksToMs(480, 120, 480);
      expect(ms).toBe(500);

      // 960 ticks at 120 BPM with 960 TPQ = 500ms
      const ms2 = MidiWriter.ticksToMs(960, 120, 960);
      expect(ms2).toBe(500);
    });

    it("should convert milliseconds to ticks correctly", () => {
      // 500ms at 120 BPM with 480 TPQ = 480 ticks
      const ticks = MidiWriter.msToTicks(500, 120, 480);
      expect(ticks).toBe(480);
    });

    it("should round-trip conversion", () => {
      const originalTicks = 1000;
      const bpm = 128;
      const tpq = 960;

      const ms = MidiWriter.ticksToMs(originalTicks, bpm, tpq);
      const convertedTicks = MidiWriter.msToTicks(ms, bpm, tpq);

      expect(convertedTicks).toBeCloseTo(originalTicks, 0);
    });
  });

  describe("running status optimization", () => {
    it("should produce smaller files with running status enabled", () => {
      const file: MidiFile = {
        header: {
          format: 0,
          numTracks: 1,
          ticksPerQuarter: 480,
        },
        tracks: [
          {
            name: "Test",
            events: [
              MidiWriter.createNoteOn(0, 60, 100, 0),
              MidiWriter.createNoteOff(480, 60, 0, 0),
              MidiWriter.createNoteOn(0, 64, 100, 0),
              MidiWriter.createNoteOff(480, 64, 0, 0),
              MidiWriter.createEndOfTrackEvent(0),
            ],
          },
        ],
      };

      const withRunningStatus = writeMidiFile(file, { useRunningStatus: true });
      const withoutRunningStatus = writeMidiFile(file, { useRunningStatus: false });

      expect(withRunningStatus.data!.length).toBeLessThan(withoutRunningStatus.data!.length);
    });
  });

  describe("round-trip parsing", () => {
    it("should correctly round-trip a complex file", () => {
      const file: MidiFile = {
        header: {
          format: 1,
          numTracks: 2,
          ticksPerQuarter: 960,
        },
        tracks: [
          {
            name: "Conductor",
            events: [
              MidiWriter.createTempoEvent(0, 128.5),
              MidiWriter.createTimeSignatureEvent(0, 6, 8),
              MidiWriter.createKeySignatureEvent(0, 2, false), // D major
              MidiWriter.createEndOfTrackEvent(1920),
            ],
          },
          {
            name: "Melody",
            events: [
              MidiWriter.createTrackNameEvent(0, "Melody"),
              MidiWriter.createProgramChange(0, 1, 0), // Piano
              MidiWriter.createNoteOn(0, 62, 110, 0), // D
              MidiWriter.createPitchBend(0, 2048, 0),
              MidiWriter.createNoteOff(960, 62, 0, 0),
              MidiWriter.createNoteOn(0, 64, 105, 0), // E
              MidiWriter.createNoteOff(960, 64, 0, 0),
              MidiWriter.createNoteOn(0, 66, 115, 0), // F#
              MidiWriter.createNoteOff(960, 66, 0, 0),
              MidiWriter.createEndOfTrackEvent(0),
            ],
          },
        ],
      };

      const writeResult = writeMidiFile(file);
      expect(writeResult.success).toBe(true);

      if (writeResult.data) {
        const parseResult = MidiParser.parseData(writeResult.data);
        expect(parseResult.success).toBe(true);

        if (parseResult.file) {
          expect(parseResult.file.header.format).toBe(1);
          expect(parseResult.file.header.ticksPerQuarter).toBe(960);
          expect(parseResult.file.tracks).toHaveLength(2);

          // Check tempo
          const tempoEvent = parseResult.file.tracks[0].events.find(e => e.type === "setTempo");
          expect(tempoEvent).toBeDefined();
          if (tempoEvent) {
            const bpm = MidiParser.getTempoBpm(tempoEvent);
            expect(bpm).toBeCloseTo(128.5, 1);
          }
        }
      }
    });
  });
});
