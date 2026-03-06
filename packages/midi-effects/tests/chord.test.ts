import { describe, it, expect, beforeEach } from "vitest";
import { Chord, DEFAULT_CHORD_PARAMS } from "../src/chord/index.js";
import { createNoteOn, createNoteOff } from "../src/types.js";

describe("Chord", () => {
  let chord: Chord;

  beforeEach(() => {
    chord = new Chord();
    chord.reset();
  });

  it("should create a chord effect with default parameters", () => {
    expect(chord.name).toBe("Chord");
    expect(chord.version).toBe("1.0.0");
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

    const result = chord.process([ccEvent], 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("control-change");
  });

  it("should add chord notes when enabled", () => {
    // Enable first chord note (major third)
    chord.setParameter("note0enabled", true);
    chord.setParameter("note0shift", 4);
    chord.setParameter("note0velocity", 100);
    
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = chord.process(events, 0);
    
    // Should have original note + chord note
    const noteOns = result.filter(e => e.type === "note-on");
    expect(noteOns.length).toBe(2);
    
    // Check that we have the expected notes (60 and 64)
    const notes = noteOns.map(e => (e as { note: number }).note);
    expect(notes).toContain(60);
    expect(notes).toContain(64);
  });

  it("should release all chord notes together", () => {
    chord.setParameter("note0enabled", true);
    chord.setParameter("note0shift", 4);
    
    // Trigger note
    chord.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Release note
    const result = chord.process([createNoteOff(60, 0, 0, 100)], 100);
    
    const noteOffs = result.filter(e => e.type === "note-off");
    expect(noteOffs.length).toBe(2);
    
    const notes = noteOffs.map(e => (e as { note: number }).note);
    expect(notes).toContain(60);
    expect(notes).toContain(64);
  });

  it("should disable input monitoring when set", () => {
    chord.setParameter("monitorInput", false);
    chord.setParameter("note0enabled", true);
    chord.setParameter("note0shift", 4);
    
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = chord.process(events, 0);
    
    // Should only have chord note, not original
    const noteOns = result.filter(e => e.type === "note-on");
    expect(noteOns.length).toBe(1);
    expect((noteOns[0]! as { note: number }).note).toBe(64);
  });

  it("should apply velocity scaling", () => {
    chord.setParameter("note0enabled", true);
    chord.setParameter("note0shift", 7); // Perfect fifth
    chord.setParameter("note0velocity", 50); // 50% velocity
    
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = chord.process(events, 0);
    
    const noteOns = result.filter(e => e.type === "note-on");
    const fifthNote = noteOns.find(e => (e as { note: number }).note === 67);
    
    expect(fifthNote).toBeDefined();
    expect((fifthNote! as { velocity: number }).velocity).toBe(50); // 100 * 0.5
  });

  it("should apply global velocity scale", () => {
    chord.setParameter("globalVelocity", 50);
    chord.setParameter("note0enabled", true);
    chord.setParameter("note0shift", 4);
    chord.setParameter("note0velocity", 100);
    
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = chord.process(events, 0);
    
    const noteOns = result.filter(e => e.type === "note-on");
    const chordNote = noteOns.find(e => (e as { note: number }).note === 64);
    
    expect(chordNote).toBeDefined();
    // 100 * 0.5 * 0.5 = 25
    expect((chordNote! as { velocity: number }).velocity).toBe(25);
  });

  it("should handle negative shifts", () => {
    chord.setParameter("note0enabled", true);
    chord.setParameter("note0shift", -12); // Octave down
    
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = chord.process(events, 0);
    
    const noteOns = result.filter(e => e.type === "note-on");
    const notes = noteOns.map(e => (e as { note: number }).note);
    expect(notes).toContain(48); // C3 (octave below)
  });

  it("should clamp notes to valid MIDI range", () => {
    chord.setParameter("note0enabled", true);
    chord.setParameter("note0shift", 24); // Two octaves up
    
    const events = [createNoteOn(120, 100, 0, 0)]; // High C
    const result = chord.process(events, 0);
    
    const noteOns = result.filter(e => e.type === "note-on");
    // Should filter out notes above 127
    expect(noteOns.length).toBe(1); // Only the original
  });

  it("should save and load state", () => {
    chord.setParameter("monitorInput", false);
    chord.setParameter("globalVelocity", 75);
    
    const state = chord.saveState();
    
    const newChord = new Chord();
    newChord.loadState(state);
    
    expect(newChord.getParameter("monitorInput")).toBe(false);
    expect(newChord.getParameter("globalVelocity")).toBe(75);
  });

  it("should reset to default state", () => {
    chord.setParameter("monitorInput", false);
    chord.setParameter("globalVelocity", 50);
    
    chord.reset();
    
    expect(chord.getParameter("monitorInput")).toBe(DEFAULT_CHORD_PARAMS.monitorInput);
    expect(chord.getParameter("globalVelocity")).toBe(DEFAULT_CHORD_PARAMS.globalVelocity);
  });

  it("should provide chord memories", () => {
    const memories = chord.getMemories();
    expect(memories.length).toBeGreaterThan(0);
    expect(memories[0]!.name).toBe("Major");
  });

  it("should add and remove chord memories", () => {
    const initialCount = chord.getMemories().length;
    
    chord.addMemory("Custom", [0, 5, 7, 10]);
    expect(chord.getMemories().length).toBe(initialCount + 1);
    
    chord.removeMemory(initialCount); // Remove the one we just added
    expect(chord.getMemories().length).toBe(initialCount);
  });
});
