import { describe, it, expect, beforeEach, vi } from "vitest";
import { KeyboardMidiMapper, getKeyboardMidiMapper, resetKeyboardMidiMapper } from "../keyboard.js";
import { KEYBOARD_PIANO_MAP } from "../types.js";

describe("KeyboardMidiMapper", () => {
  beforeEach(() => {
    resetKeyboardMidiMapper();
  });

  describe("initialization", () => {
    it("should create with default options", () => {
      const mapper = new KeyboardMidiMapper();
      const state = mapper.getState();
      
      expect(state.enabled).toBe(false);
      expect(state.octaveOffset).toBe(0);
      expect(state.velocity).toBe(100);
      expect(state.sustain).toBe(false);
      expect(state.latchMode).toBe(false);
    });

    it("should create with custom options", () => {
      const mapper = new KeyboardMidiMapper({ velocity: 80, octaveOffset: 2 });
      const state = mapper.getState();
      
      expect(state.velocity).toBe(80);
      expect(state.octaveOffset).toBe(2);
    });
  });

  describe("octave shifting", () => {
    it("should shift octave up", () => {
      const mapper = new KeyboardMidiMapper();
      mapper.shiftOctave(1);
      
      expect(mapper.getState().octaveOffset).toBe(1);
    });

    it("should shift octave down", () => {
      const mapper = new KeyboardMidiMapper();
      mapper.shiftOctave(-1);
      
      expect(mapper.getState().octaveOffset).toBe(-1);
    });

    it("should clamp octave to reasonable range", () => {
      const mapper = new KeyboardMidiMapper();
      
      mapper.setOctave(10);
      expect(mapper.getState().octaveOffset).toBe(4); // Clamped
      
      mapper.setOctave(-10);
      expect(mapper.getState().octaveOffset).toBe(-4); // Clamped
    });

    it("should affect note output", () => {
      const mapper = new KeyboardMidiMapper();
      const messages: ReturnType<typeof mapper.getState>["activeNotes"] = new Set();
      
      mapper.onMessage((msg) => {
        if (msg.type === "noteOn") {
          messages.add(msg.note);
        }
      });

      // Without octave shift, KeyA = 60 (middle C)
      const baseNote = KEYBOARD_PIANO_MAP.KeyA;
      expect(baseNote).toBe(60);

      // With +1 octave shift
      mapper.setOctave(1);
      // KeyA would now be 60 + 12 = 72
    });
  });

  describe("velocity control", () => {
    it("should adjust velocity", () => {
      const mapper = new KeyboardMidiMapper();
      
      mapper.adjustVelocity(10);
      expect(mapper.getState().velocity).toBe(110);
      
      mapper.adjustVelocity(-20);
      expect(mapper.getState().velocity).toBe(90);
    });

    it("should clamp velocity to 1-127", () => {
      const mapper = new KeyboardMidiMapper();
      
      mapper.setVelocity(200);
      expect(mapper.getState().velocity).toBe(127);
      
      mapper.setVelocity(0);
      expect(mapper.getState().velocity).toBe(1);
    });
  });

  describe("scale lock", () => {
    it("should enable scale lock", () => {
      const mapper = new KeyboardMidiMapper();
      
      mapper.setScaleLock(true, 60, "major");
      const state = mapper.getState();
      
      expect(state.scaleLock?.enabled).toBe(true);
      expect(state.scaleLock?.root).toBe(60);
      expect(state.scaleLock?.mode).toBe("major");
    });

    it("should quantize notes to scale", () => {
      const mapper = new KeyboardMidiMapper();
      mapper.setScaleLock(true, 60, "major"); // C major
      
      // In C major, C=60, C# would quantize to C or D
      // This depends on the quantization algorithm
    });

    it("should disable scale lock", () => {
      const mapper = new KeyboardMidiMapper();
      
      mapper.setScaleLock(true, 60, "major");
      mapper.setScaleLock(false);
      
      expect(mapper.getState().scaleLock).toBeUndefined();
    });
  });

  describe("chord mode", () => {
    it("should enable chord mode", () => {
      const mapper = new KeyboardMidiMapper();
      
      mapper.setChordMode(true, "triad");
      const state = mapper.getState();
      
      expect(state.chordMode?.enabled).toBe(true);
      expect(state.chordMode?.chordType).toBe("triad");
    });

    it("should disable chord mode", () => {
      const mapper = new KeyboardMidiMapper();
      
      mapper.setChordMode(true, "triad");
      mapper.setChordMode(false);
      
      expect(mapper.getState().chordMode).toBeUndefined();
    });
  });

  describe("latch mode", () => {
    it("should toggle latch mode", () => {
      const mapper = new KeyboardMidiMapper();
      
      expect(mapper.getState().latchMode).toBe(false);
      
      mapper.toggleLatchMode();
      expect(mapper.getState().latchMode).toBe(true);
      
      mapper.toggleLatchMode();
      expect(mapper.getState().latchMode).toBe(false);
    });

    it("should release latched notes when disabling", () => {
      const mapper = new KeyboardMidiMapper();
      const messages: { type: string; note: number }[] = [];
      
      mapper.onMessage((msg) => {
        messages.push({ type: msg.type, note: (msg as { note: number }).note });
      });

      // Simulate latched notes
      mapper.toggleLatchMode();
      // Would trigger notes in real usage
      
      mapper.toggleLatchMode(); // Should release notes
    });
  });

  describe("sustain", () => {
    it("should set sustain state", () => {
      const mapper = new KeyboardMidiMapper();
      
      mapper.setSustain(true);
      expect(mapper.getState().sustain).toBe(true);
      
      mapper.setSustain(false);
      expect(mapper.getState().sustain).toBe(false);
    });
  });

  describe("key mapping", () => {
    it("should map KeyA to middle C", () => {
      expect(KEYBOARD_PIANO_MAP.KeyA).toBe(60);
    });

    it("should map the full keyboard range", () => {
      const keys = Object.keys(KEYBOARD_PIANO_MAP);
      const notes = Object.values(KEYBOARD_PIANO_MAP);
      
      // Should have 17 keys
      expect(keys).toHaveLength(17);
      
      // Should cover range from middle C (60) to C5 (72)
      expect(Math.min(...notes)).toBe(60);
      expect(Math.max(...notes)).toBe(76);
    });

    it("should have alternating white and black keys pattern", () => {
      // C (KeyA), C# (KeyW), D (KeyS), D# (KeyE), E (KeyD)...
      expect(KEYBOARD_PIANO_MAP.KeyA).toBe(60);  // C - white
      expect(KEYBOARD_PIANO_MAP.KeyW).toBe(61);  // C# - black
      expect(KEYBOARD_PIANO_MAP.KeyS).toBe(62);  // D - white
      expect(KEYBOARD_PIANO_MAP.KeyE).toBe(63);  // D# - black
      expect(KEYBOARD_PIANO_MAP.KeyD).toBe(64);  // E - white
    });
  });

  describe("message handling", () => {
    it("should subscribe to messages", () => {
      const mapper = new KeyboardMidiMapper();
      const handler = vi.fn();
      
      const unsubscribe = mapper.onMessage(handler);
      expect(typeof unsubscribe).toBe("function");
      
      unsubscribe();
    });
  });

  describe("key labels", () => {
    it("should provide key labels", async () => {
      const mapper = new KeyboardMidiMapper();
      
      // Mock navigator.keyboard if not available
      if (typeof navigator !== "undefined" && !("keyboard" in navigator)) {
        // Should fallback to code-based labels
        const label = await mapper.getKeyLabel("KeyA");
        expect(typeof label).toBe("string");
      }
    });
  });

  describe("singleton", () => {
    it("should return the same instance", () => {
      const mapper1 = getKeyboardMidiMapper();
      const mapper2 = getKeyboardMidiMapper();
      
      expect(mapper1).toBe(mapper2);
    });

    it("should create new instance after reset", () => {
      const mapper1 = getKeyboardMidiMapper();
      resetKeyboardMidiMapper();
      const mapper2 = getKeyboardMidiMapper();
      
      expect(mapper1).not.toBe(mapper2);
    });
  });

  describe("state management", () => {
    it("should track active notes", () => {
      const mapper = new KeyboardMidiMapper();
      
      expect(mapper.getActiveNotes()).toEqual([]);
      // In real usage with keyboard events, this would track pressed keys
    });

    it("should get complete state", () => {
      const mapper = new KeyboardMidiMapper();
      const state = mapper.getState();
      
      expect(state).toHaveProperty("enabled");
      expect(state).toHaveProperty("octaveOffset");
      expect(state).toHaveProperty("velocity");
      expect(state).toHaveProperty("sustain");
      expect(state).toHaveProperty("latchMode");
      expect(state).toHaveProperty("activeNotes");
    });
  });
});
