import { describe, it, expect } from "vitest";
import {
  KEYBOARD_PIANO_MAP,
  SCALE_INTERVALS,
  CHORD_INTERVALS,
  META_EVENT_TYPES,
  CC_NUMBERS,
} from "../types.js";

describe("MIDI Types Constants", () => {
  describe("KEYBOARD_PIANO_MAP", () => {
    it("should have the correct number of keys", () => {
      expect(Object.keys(KEYBOARD_PIANO_MAP)).toHaveLength(17);
    });

    it("should map KeyA to middle C (60)", () => {
      expect(KEYBOARD_PIANO_MAP.KeyA).toBe(60);
    });

    it("should have correct chromatic mapping", () => {
      // C major scale from middle C
      expect(KEYBOARD_PIANO_MAP.KeyA).toBe(60); // C
      expect(KEYBOARD_PIANO_MAP.KeyW).toBe(61); // C#
      expect(KEYBOARD_PIANO_MAP.KeyS).toBe(62); // D
      expect(KEYBOARD_PIANO_MAP.KeyE).toBe(63); // D#
      expect(KEYBOARD_PIANO_MAP.KeyD).toBe(64); // E
      expect(KEYBOARD_PIANO_MAP.KeyF).toBe(65); // F
    });
  });

  describe("SCALE_INTERVALS", () => {
    it("should have all scale modes", () => {
      const modes = [
        "major",
        "minor",
        "dorian",
        "phrygian",
        "lydian",
        "mixolydian",
        "aeolian",
        "locrian",
        "pentatonic-major",
        "pentatonic-minor",
        "blues",
        "chromatic",
      ];
      modes.forEach((mode) => {
        expect(SCALE_INTERVALS[mode as keyof typeof SCALE_INTERVALS]).toBeDefined();
      });
    });

    it("should have correct major scale intervals", () => {
      expect(SCALE_INTERVALS.major).toEqual([0, 2, 4, 5, 7, 9, 11]);
    });

    it("should have correct minor scale intervals", () => {
      expect(SCALE_INTERVALS.minor).toEqual([0, 2, 3, 5, 7, 8, 10]);
    });

    it("should have correct pentatonic intervals", () => {
      expect(SCALE_INTERVALS["pentatonic-major"]).toHaveLength(5);
      expect(SCALE_INTERVALS["pentatonic-minor"]).toHaveLength(5);
    });
  });

  describe("CHORD_INTERVALS", () => {
    it("should have all chord types", () => {
      const types = ["triad", "7th", "maj7", "min7", "dim", "aug", "sus4"];
      types.forEach((type) => {
        expect(CHORD_INTERVALS[type as keyof typeof CHORD_INTERVALS]).toBeDefined();
      });
    });

    it("should have correct triad intervals", () => {
      expect(CHORD_INTERVALS.triad).toEqual([0, 4, 7]); // Root, major 3rd, perfect 5th
    });

    it("should have correct 7th chord intervals", () => {
      expect(CHORD_INTERVALS["7th"]).toEqual([0, 4, 7, 10]); // Dominant 7th
    });

    it("should have correct diminished chord intervals", () => {
      expect(CHORD_INTERVALS.dim).toEqual([0, 3, 6]);
    });
  });

  describe("META_EVENT_TYPES", () => {
    it("should have correct hex values", () => {
      expect(META_EVENT_TYPES.SEQUENCE_NUMBER).toBe(0x00);
      expect(META_EVENT_TYPES.TEXT).toBe(0x01);
      expect(META_EVENT_TYPES.TRACK_NAME).toBe(0x03);
      expect(META_EVENT_TYPES.END_OF_TRACK).toBe(0x2f);
      expect(META_EVENT_TYPES.SET_TEMPO).toBe(0x51);
      expect(META_EVENT_TYPES.TIME_SIGNATURE).toBe(0x58);
      expect(META_EVENT_TYPES.KEY_SIGNATURE).toBe(0x59);
    });
  });

  describe("CC_NUMBERS", () => {
    it("should have standard controller numbers", () => {
      expect(CC_NUMBERS.MODULATION).toBe(1);
      expect(CC_NUMBERS.BREATH).toBe(2);
      expect(CC_NUMBERS.FOOT).toBe(4);
      expect(CC_NUMBERS.VOLUME).toBe(7);
      expect(CC_NUMBERS.PAN).toBe(10);
      expect(CC_NUMBERS.EXPRESSION).toBe(11);
      expect(CC_NUMBERS.SUSTAIN).toBe(64);
    });

    it("should have sound controller CCs", () => {
      expect(CC_NUMBERS.SOUND_CONTROLLER_1).toBe(70);
      expect(CC_NUMBERS.SOUND_CONTROLLER_5).toBe(74); // Often used for MPE timbre
    });
  });
});
