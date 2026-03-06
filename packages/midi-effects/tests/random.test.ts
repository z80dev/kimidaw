import { describe, it, expect, beforeEach } from "vitest";
import { Random, DEFAULT_RANDOM_PARAMS } from "../src/random/index.js";
import { createNoteOn, createNoteOff } from "../src/types.js";

describe("Random", () => {
  let random: Random;

  beforeEach(() => {
    random = new Random();
    random.reset();
  });

  it("should create a random effect with default parameters", () => {
    expect(random.name).toBe("Random");
    expect(random.version).toBe("1.0.0");
  });

  it("should pass through non-note events", () => {
    const ccEvent = {
      type: "control-change" as const,
      channel: 0,
      controller: 1,
      value: 64,
      sampleTime: 0,
      data: [0xb0, 1, 64],
    };

    const result = random.process([ccEvent], 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("control-change");
  });

  it("should not randomize when chance is 0", () => {
    random.setParameter("chance", 0);
    
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = random.process(events, 0);
    
    expect((result[0]! as { note: number }).note).toBe(60);
  });

  it("should always randomize when chance is 100", () => {
    random.setParameter("chance", 100);
    random.setParameter("choices", 12);
    random.setParameter("sign", "bi");
    
    // Run multiple times to account for randomness
    let differentCount = 0;
    for (let i = 0; i < 10; i++) {
      const events = [createNoteOn(60, 100, 0, 0)];
      const result = random.process(events, 0);
      if ((result[0]! as { note: number }).note !== 60) {
        differentCount++;
      }
    }
    
    // Should have randomized at least some of the time
    expect(differentCount).toBeGreaterThan(0);
  });

  it("should handle add sign mode", () => {
    random.setParameter("chance", 100);
    random.setParameter("choices", 5);
    random.setParameter("sign", "add");
    
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = random.process(events, 0);
    
    // Should always add (note >= 61)
    expect((result[0]! as { note: number }).note).toBeGreaterThan(60);
  });

  it("should handle sub sign mode", () => {
    random.setParameter("chance", 100);
    random.setParameter("choices", 5);
    random.setParameter("sign", "sub");
    
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = random.process(events, 0);
    
    // Should always subtract (note <= 59)
    expect((result[0]! as { note: number }).note).toBeLessThan(60);
  });

  it("should clamp output to valid MIDI range", () => {
    random.setParameter("chance", 100);
    random.setParameter("choices", 24);
    random.setParameter("sign", "add");
    
    const events = [createNoteOn(120, 100, 0, 0)];
    const result = random.process(events, 0);
    
    expect((result[0]! as { note: number }).note).toBeLessThanOrEqual(127);
  });

  it("should handle note-off with randomization", () => {
    random.setParameter("chance", 100);
    random.setParameter("choices", 5);
    random.setParameter("sign", "add");
    
    // Trigger note
    random.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Release should match the randomized note
    const result = random.process([createNoteOff(60, 0, 0, 100)], 100);
    
    expect(result).toHaveLength(1);
    expect((result[0]! as { note: number }).note).not.toBe(60);
  });

  it("should handle scale-based randomization", () => {
    random.setParameter("chance", 100);
    random.setParameter("choices", 7);
    random.setParameter("sign", "bi");
    random.setParameter("scaleRandomize", true);
    random.setParameter("scale", "major");
    random.setParameter("scaleRoot", "C");
    
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = random.process(events, 0);
    
    // Result should be in C major scale
    const note = (result[0]! as { note: number }).note;
    const noteInOctave = note % 12;
    expect([0, 2, 4, 5, 7, 9, 11]).toContain(noteInOctave);
  });

  it("should save and load state", () => {
    random.setParameter("chance", 75);
    random.setParameter("choices", 8);
    random.setParameter("sign", "add");
    random.setParameter("scaleRandomize", true);
    random.setParameter("scale", "minor");
    
    const state = random.saveState();
    
    const newRandom = new Random();
    newRandom.loadState(state);
    
    expect(newRandom.getParameter("chance")).toBe(75);
    expect(newRandom.getParameter("choices")).toBe(8);
    expect(newRandom.getParameter("sign")).toBe("add");
    expect(newRandom.getParameter("scaleRandomize")).toBe(true);
    expect(newRandom.getParameter("scale")).toBe("minor");
  });

  it("should reset to default state", () => {
    random.setParameter("chance", 100);
    random.setParameter("choices", 12);
    random.setParameter("sign", "sub");
    
    random.reset();
    
    expect(random.getParameter("chance")).toBe(DEFAULT_RANDOM_PARAMS.chance);
    expect(random.getParameter("choices")).toBe(DEFAULT_RANDOM_PARAMS.choices);
    expect(random.getParameter("sign")).toBe(DEFAULT_RANDOM_PARAMS.sign);
  });

  it("should clamp choices to 1-24 range", () => {
    random.setParameter("choices", 50);
    expect(random.getParameter("choices")).toBe(24);
    
    random.setParameter("choices", 0);
    expect(random.getParameter("choices")).toBe(1);
  });

  it("should clamp chance to 0-100 range", () => {
    random.setParameter("chance", 150);
    expect(random.getParameter("chance")).toBe(100);
    
    random.setParameter("chance", -10);
    expect(random.getParameter("chance")).toBe(0);
  });
});
