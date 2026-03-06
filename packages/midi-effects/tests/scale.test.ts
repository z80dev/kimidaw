import { describe, it, expect, beforeEach } from "vitest";
import { Scale, DEFAULT_SCALE_PARAMS } from "../src/scale/index.js";
import { createNoteOn, createNoteOff } from "../src/types.js";

describe("Scale", () => {
  let scale: Scale;

  beforeEach(() => {
    scale = new Scale();
    scale.reset();
  });

  it("should create a scale effect with default parameters", () => {
    expect(scale.name).toBe("Scale");
    expect(scale.version).toBe("1.0.0");
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

    const result = scale.process([ccEvent], 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("control-change");
  });

  it("should pass notes in C major scale", () => {
    scale.setParameter("base", "C");
    scale.setParameter("scale", "major");
    
    // C major scale: C, D, E, F, G, A, B (60, 62, 64, 65, 67, 69, 71)
    const events = [createNoteOn(60, 100, 0, 0)]; // C
    const result = scale.process(events, 0);
    
    expect(result).toHaveLength(1);
    expect((result[0]! as { note: number }).note).toBe(60);
  });

  it("should filter out notes not in scale", () => {
    scale.setParameter("base", "C");
    scale.setParameter("scale", "major");
    scale.setParameter("fold", false);
    
    // C# is not in C major
    const events = [createNoteOn(61, 100, 0, 0)]; // C#
    const result = scale.process(events, 0);
    
    expect(result).toHaveLength(0); // Filtered
  });

  it("should quantize out-of-scale notes when fold is disabled", () => {
    scale.setParameter("base", "C");
    scale.setParameter("scale", "major");
    scale.setParameter("fold", false);
    
    // C# should quantize to C or D
    const events = [createNoteOn(61, 100, 0, 0)]; // C#
    const result = scale.process(events, 0);
    
    expect(result).toHaveLength(1);
    const note = (result[0]! as { note: number }).note;
    expect([60, 62]).toContain(note); // C or D
  });

  it("should fold out-of-scale notes when fold is enabled", () => {
    scale.setParameter("base", "C");
    scale.setParameter("scale", "major");
    scale.setParameter("fold", true);
    
    // C# should be folded
    const events = [createNoteOn(61, 100, 0, 0)]; // C#
    const result = scale.process(events, 0);
    
    expect(result).toHaveLength(1);
    // Should be a note in the scale
    const note = (result[0]! as { note: number }).note;
    expect([60, 62]).toContain(note);
  });

  it("should apply transpose to output", () => {
    scale.setParameter("base", "C");
    scale.setParameter("scale", "major");
    scale.setParameter("transpose", 12); // Up one octave
    
    const events = [createNoteOn(60, 100, 0, 0)]; // C
    const result = scale.process(events, 0);
    
    expect((result[0]! as { note: number }).note).toBe(72); // C5
  });

  it("should handle different scales", () => {
    scale.setParameter("base", "A");
    scale.setParameter("scale", "minor");
    
    // A minor: A, B, C, D, E, F, G (69, 71, 72, 74, 76, 77, 79)
    const events = [createNoteOn(69, 100, 0, 0)]; // A
    const result = scale.process(events, 0);
    
    expect(result).toHaveLength(1);
    expect((result[0]! as { note: number }).note).toBe(69);
  });

  it("should handle note-off with quantization", () => {
    scale.setParameter("base", "C");
    scale.setParameter("scale", "major");
    
    // Trigger out-of-scale note
    scale.process([createNoteOn(61, 100, 0, 0)], 0); // C#
    
    // Release should use quantized note
    const result = scale.process([createNoteOff(61, 0, 0, 100)], 100);
    
    expect(result).toHaveLength(1);
    const note = (result[0]! as { note: number }).note;
    expect([60, 62]).toContain(note);
  });

  it("should handle chromatic scale (all notes pass)", () => {
    scale.setParameter("scale", "chromatic");
    
    const events = [
      createNoteOn(60, 100, 0, 0),
      createNoteOn(61, 100, 0, 0),
      createNoteOn(62, 100, 0, 0),
    ];
    const result = scale.process(events, 0);
    
    expect(result).toHaveLength(3);
  });

  it("should save and load state", () => {
    scale.setParameter("base", "D");
    scale.setParameter("scale", "dorian");
    scale.setParameter("transpose", 7);
    scale.setParameter("fold", true);
    
    const state = scale.saveState();
    
    const newScale = new Scale();
    newScale.loadState(state);
    
    expect(newScale.getParameter("base")).toBe("D");
    expect(newScale.getParameter("scale")).toBe("dorian");
    expect(newScale.getParameter("transpose")).toBe(7);
    expect(newScale.getParameter("fold")).toBe(true);
  });

  it("should reset to default state", () => {
    scale.setParameter("base", "D");
    scale.setParameter("scale", "minor");
    scale.setParameter("transpose", 12);
    
    scale.reset();
    
    expect(scale.getParameter("base")).toBe(DEFAULT_SCALE_PARAMS.base);
    expect(scale.getParameter("scale")).toBe(DEFAULT_SCALE_PARAMS.scale);
    expect(scale.getParameter("transpose")).toBe(DEFAULT_SCALE_PARAMS.transpose);
  });

  it("should clamp transpose to -12 to +12", () => {
    scale.setParameter("transpose", 20);
    expect(scale.getParameter("transpose")).toBe(12);
    
    scale.setParameter("transpose", -20);
    expect(scale.getParameter("transpose")).toBe(-12);
  });

  it("should handle exotic scales", () => {
    scale.setParameter("base", "C");
    scale.setParameter("scale", "hirajoshi");
    
    // Hirajoshi: C, Db, F, Gb, G (in some interpretations)
    const events = [createNoteOn(60, 100, 0, 0)]; // C
    const result = scale.process(events, 0);
    
    expect(result).toHaveLength(1);
  });

  it("should handle blues scale", () => {
    scale.setParameter("base", "C");
    scale.setParameter("scale", "blues");
    
    // Blues: C, Eb, F, F#, G, Bb
    const events = [createNoteOn(63, 100, 0, 0)]; // Eb
    const result = scale.process(events, 0);
    
    expect(result).toHaveLength(1);
    expect((result[0]! as { note: number }).note).toBe(63);
  });
});
