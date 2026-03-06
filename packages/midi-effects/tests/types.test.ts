import { describe, it, expect } from "vitest";
import {
  noteNameToNumber,
  rateToBeatMultiplier,
  SCALE_PATTERNS,
  createNoteOn,
  createNoteOff,
  createCC,
  createPitchBend,
} from "../src/types.js";

describe("Type Utilities", () => {
  describe("noteNameToNumber", () => {
    it("should convert note names to MIDI numbers", () => {
      expect(noteNameToNumber("C")).toBe(0);
      expect(noteNameToNumber("C#")).toBe(1);
      expect(noteNameToNumber("Db")).toBe(1);
      expect(noteNameToNumber("D")).toBe(2);
      expect(noteNameToNumber("D#")).toBe(3);
      expect(noteNameToNumber("Eb")).toBe(3);
      expect(noteNameToNumber("E")).toBe(4);
      expect(noteNameToNumber("F")).toBe(5);
      expect(noteNameToNumber("F#")).toBe(6);
      expect(noteNameToNumber("Gb")).toBe(6);
      expect(noteNameToNumber("G")).toBe(7);
      expect(noteNameToNumber("G#")).toBe(8);
      expect(noteNameToNumber("Ab")).toBe(8);
      expect(noteNameToNumber("A")).toBe(9);
      expect(noteNameToNumber("A#")).toBe(10);
      expect(noteNameToNumber("Bb")).toBe(10);
      expect(noteNameToNumber("B")).toBe(11);
    });

    it("should return 0 for invalid note names", () => {
      expect(noteNameToNumber("X" as never)).toBe(0);
      expect(noteNameToNumber("H" as never)).toBe(0);
    });
  });

  describe("rateToBeatMultiplier", () => {
    it("should convert rate divisions correctly", () => {
      expect(rateToBeatMultiplier("1/1")).toBe(4);
      expect(rateToBeatMultiplier("1/2")).toBe(2);
      expect(rateToBeatMultiplier("1/4")).toBe(1);
      expect(rateToBeatMultiplier("1/8")).toBe(0.5);
      expect(rateToBeatMultiplier("1/16")).toBe(0.25);
      expect(rateToBeatMultiplier("1/32")).toBe(0.125);
      expect(rateToBeatMultiplier("1/64")).toBe(0.0625);
    });

    it("should handle triplet values", () => {
      expect(rateToBeatMultiplier("1/4t")).toBeCloseTo(2 / 3, 5);
      expect(rateToBeatMultiplier("1/8t")).toBeCloseTo(1 / 3, 5);
      expect(rateToBeatMultiplier("1/16t")).toBeCloseTo(1 / 6, 5);
    });
  });

  describe("SCALE_PATTERNS", () => {
    it("should have major scale pattern", () => {
      expect(SCALE_PATTERNS.major).toEqual([0, 2, 4, 5, 7, 9, 11]);
    });

    it("should have minor scale pattern", () => {
      expect(SCALE_PATTERNS.minor).toEqual([0, 2, 3, 5, 7, 8, 10]);
    });

    it("should have chromatic scale pattern", () => {
      expect(SCALE_PATTERNS.chromatic).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it("should have pentatonic patterns", () => {
      expect(SCALE_PATTERNS["pentatonic-major"]).toEqual([0, 2, 4, 7, 9]);
      expect(SCALE_PATTERNS["pentatonic-minor"]).toEqual([0, 3, 5, 7, 10]);
    });

    it("should have blues scale pattern", () => {
      expect(SCALE_PATTERNS.blues).toEqual([0, 3, 5, 6, 7, 10]);
    });
  });

  describe("createNoteOn", () => {
    it("should create a note-on event", () => {
      const event = createNoteOn(60, 100, 0, 48000);
      
      expect(event.type).toBe("note-on");
      expect(event.note).toBe(60);
      expect(event.velocity).toBe(100);
      expect(event.channel).toBe(0);
      expect(event.sampleTime).toBe(48000);
      expect(event.data).toEqual([0x90, 60, 100]);
    });

    it("should clamp note to 0-127 range", () => {
      const low = createNoteOn(-10, 100, 0, 0);
      expect(low.note).toBe(0);
      
      const high = createNoteOn(200, 100, 0, 0);
      expect(high.note).toBe(127);
    });

    it("should clamp velocity to 0-127 range", () => {
      const low = createNoteOn(60, -10, 0, 0);
      expect(low.velocity).toBe(0);
      
      const high = createNoteOn(60, 200, 0, 0);
      expect(high.velocity).toBe(127);
    });

    it("should mask channel to 4 bits", () => {
      const event = createNoteOn(60, 100, 20, 0); // 20 = 0x14, should become 4
      expect(event.channel).toBe(4);
    });
  });

  describe("createNoteOff", () => {
    it("should create a note-off event", () => {
      const event = createNoteOff(60, 0, 0, 48000);
      
      expect(event.type).toBe("note-off");
      expect(event.note).toBe(60);
      expect(event.velocity).toBe(0);
      expect(event.channel).toBe(0);
      expect(event.sampleTime).toBe(48000);
      expect(event.data).toEqual([0x80, 60, 0]);
    });
  });

  describe("createCC", () => {
    it("should create a control change event", () => {
      const event = createCC(1, 64, 0, 48000);
      
      expect(event.type).toBe("control-change");
      expect(event.controller).toBe(1);
      expect(event.value).toBe(64);
      expect(event.channel).toBe(0);
      expect(event.sampleTime).toBe(48000);
      expect(event.data).toEqual([0xb0, 1, 64]);
    });

    it("should clamp controller to 0-127", () => {
      const high = createCC(200, 64, 0, 0);
      expect(high.controller).toBe(127);
    });

    it("should clamp value to 0-127", () => {
      const high = createCC(1, 200, 0, 0);
      expect(high.value).toBe(127);
    });
  });

  describe("createPitchBend", () => {
    it("should create a pitch bend event", () => {
      const event = createPitchBend(0, 0, 48000);
      
      expect(event.type).toBe("pitch-bend");
      expect(event.value).toBe(0);
      expect(event.channel).toBe(0);
      expect(event.sampleTime).toBe(48000);
      expect(event.data[0]).toBe(0xe0);
    });

    it("should handle negative bend values", () => {
      const event = createPitchBend(-8192, 0, 0);
      expect(event.value).toBe(-8192);
    });

    it("should handle positive bend values", () => {
      const event = createPitchBend(8191, 0, 0);
      expect(event.value).toBe(8191);
    });

    it("should clamp bend values", () => {
      const low = createPitchBend(-10000, 0, 0);
      expect(low.value).toBe(-8192);
      
      const high = createPitchBend(10000, 0, 0);
      expect(high.value).toBe(8191);
    });

    it("should calculate correct LSB and MSB", () => {
      // Center (0) should give LSB=0, MSB=64
      const center = createPitchBend(0, 0, 0);
      expect(center.data[1]).toBe(0);  // LSB
      expect(center.data[2]).toBe(64); // MSB

      // Max positive (8191) should give LSB=127, MSB=127
      const max = createPitchBend(8191, 0, 0);
      expect(max.data[1]).toBe(127);  // LSB
      expect(max.data[2]).toBe(127);  // MSB

      // Max negative (-8192) should give LSB=0, MSB=0
      const min = createPitchBend(-8192, 0, 0);
      expect(min.data[1]).toBe(0);  // LSB
      expect(min.data[2]).toBe(0);  // MSB
    });
  });
});
