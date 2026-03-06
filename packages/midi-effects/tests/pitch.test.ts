import { describe, it, expect, beforeEach } from "vitest";
import { Pitch, DEFAULT_PITCH_PARAMS } from "../src/pitch/index.js";
import { createNoteOn, createNoteOff } from "../src/types.js";

describe("Pitch", () => {
  let pitch: Pitch;

  beforeEach(() => {
    pitch = new Pitch();
    pitch.reset();
  });

  it("should create a pitch effect with default parameters", () => {
    expect(pitch.name).toBe("Pitch");
    expect(pitch.version).toBe("1.0.0");
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

    const result = pitch.process([ccEvent], 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("control-change");
  });

  it("should transpose notes", () => {
    pitch.setParameter("transpose", 12); // Up one octave
    
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = pitch.process(events, 0);
    
    expect(result).toHaveLength(1);
    expect((result[0]! as { note: number }).note).toBe(72);
  });

  it("should handle negative transpose", () => {
    pitch.setParameter("transpose", -12); // Down one octave
    
    const events = [createNoteOn(72, 100, 0, 0)];
    const result = pitch.process(events, 0);
    
    expect((result[0]! as { note: number }).note).toBe(60);
  });

  it("should clamp transpose to -48 to +48", () => {
    pitch.setParameter("transpose", 60);
    expect(pitch.getParameter("transpose")).toBe(48);
    
    pitch.setParameter("transpose", -60);
    expect(pitch.getParameter("transpose")).toBe(-48);
  });

  it("should filter notes below lowest note", () => {
    pitch.setParameter("lowestNote", 60);
    
    const events = [
      createNoteOn(59, 100, 0, 0), // Should be filtered
      createNoteOn(60, 100, 0, 0), // Should pass
    ];
    const result = pitch.process(events, 0);
    
    expect(result).toHaveLength(1);
    expect((result[0]! as { note: number }).note).toBe(60);
  });

  it("should filter notes above highest note", () => {
    pitch.setParameter("highestNote", 60);
    
    const events = [
      createNoteOn(60, 100, 0, 0), // Should pass
      createNoteOn(61, 100, 0, 0), // Should be filtered
    ];
    const result = pitch.process(events, 0);
    
    expect(result).toHaveLength(1);
    expect((result[0]! as { note: number }).note).toBe(60);
  });

  it("should quantize to scale", () => {
    pitch.setParameter("quantizeToScale", true);
    pitch.setParameter("scale", "major");
    pitch.setParameter("scaleRoot", "C");
    
    // C# is not in C major, should quantize to C or D
    const events = [createNoteOn(61, 100, 0, 0)]; // C#
    const result = pitch.process(events, 0);
    
    expect(result).toHaveLength(1);
    const note = (result[0]! as { note: number }).note;
    // Should quantize to nearest scale note (C=60 or D=62)
    expect([60, 62]).toContain(note);
  });

  it("should handle note-off with transposition", () => {
    pitch.setParameter("transpose", 12);
    
    // Trigger note
    pitch.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Release note
    const result = pitch.process([createNoteOff(60, 0, 0, 100)], 100);
    
    expect(result).toHaveLength(1);
    expect((result[0]! as { note: number }).note).toBe(72);
  });

  it("should save and load state", () => {
    pitch.setParameter("transpose", 7);
    pitch.setParameter("lowestNote", 36);
    pitch.setParameter("quantizeToScale", true);
    pitch.setParameter("scale", "minor");
    
    const state = pitch.saveState();
    
    const newPitch = new Pitch();
    newPitch.loadState(state);
    
    expect(newPitch.getParameter("transpose")).toBe(7);
    expect(newPitch.getParameter("lowestNote")).toBe(36);
    expect(newPitch.getParameter("quantizeToScale")).toBe(true);
    expect(newPitch.getParameter("scale")).toBe("minor");
  });

  it("should reset to default state", () => {
    pitch.setParameter("transpose", 12);
    pitch.setParameter("lowestNote", 36);
    
    pitch.reset();
    
    expect(pitch.getParameter("transpose")).toBe(DEFAULT_PITCH_PARAMS.transpose);
    expect(pitch.getParameter("lowestNote")).toBe(DEFAULT_PITCH_PARAMS.lowestNote);
  });

  it("should handle octave range up mode", () => {
    pitch.setParameter("octaveRangeEnabled", true);
    pitch.setParameter("octaveRange", 2);
    pitch.setParameter("rangeMode", "up");
    
    const results: number[] = [];
    
    // Trigger same note multiple times
    for (let i = 0; i < 4; i++) {
      const result = pitch.process([createNoteOn(60, 100, 0, i * 100)], i * 100);
      pitch.process([createNoteOff(60, 0, 0, i * 100 + 50)], i * 100 + 50);
      results.push((result[0]! as { note: number }).note);
    }
    
    // Should cycle through 60, 72, 84, 60
    expect(results[0]).toBe(60);
    expect(results[1]).toBe(72);
    expect(results[2]).toBe(84);
    expect(results[3]).toBe(60);
  });

  it("should handle octave range alternate mode", () => {
    pitch.setParameter("octaveRangeEnabled", true);
    pitch.setParameter("octaveRange", 1);
    pitch.setParameter("rangeMode", "alternate");
    
    const results: number[] = [];
    
    // Trigger same note multiple times
    for (let i = 0; i < 4; i++) {
      const result = pitch.process([createNoteOn(60, 100, 0, i * 100)], i * 100);
      pitch.process([createNoteOff(60, 0, 0, i * 100 + 50)], i * 100 + 50);
      results.push((result[0]! as { note: number }).note);
    }
    
    // Should go 60, 72, 60, 72
    expect(results[0]).toBe(60);
    expect(results[1]).toBe(72);
    expect(results[2]).toBe(60);
    expect(results[3]).toBe(72);
  });

  it("should clamp output to 0-127 range", () => {
    pitch.setParameter("transpose", 24);
    
    const events = [createNoteOn(110, 100, 0, 0)];
    const result = pitch.process(events, 0);
    
    expect((result[0]! as { note: number }).note).toBe(127); // Clamped
  });
});
