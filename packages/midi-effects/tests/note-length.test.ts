import { describe, it, expect, beforeEach } from "vitest";
import { NoteLength, DEFAULT_NOTE_LENGTH_PARAMS } from "../src/note-length/index.js";
import { createNoteOn, createNoteOff } from "../src/types.js";

describe("NoteLength", () => {
  let noteLength: NoteLength;
  const sampleRate = 48000;
  const tempo = 120;

  beforeEach(() => {
    noteLength = new NoteLength();
    noteLength.setSampleRate(sampleRate);
    noteLength.setTempo(tempo);
    noteLength.reset();
  });

  it("should create a note length effect with default parameters", () => {
    expect(noteLength.name).toBe("Note Length");
    expect(noteLength.version).toBe("1.0.0");
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

    const result = noteLength.process([ccEvent], 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("control-change");
  });

  it("should pass through note-on events immediately", () => {
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = noteLength.process(events, 0);
    
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("note-on");
  });

  it("should hold note in time mode", () => {
    noteLength.setParameter("mode", "time");
    noteLength.setParameter("timeMs", 100);
    
    // Trigger note
    noteLength.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Check at 50ms (should still be holding)
    const samples50ms = Math.floor(0.05 * sampleRate);
    let result = noteLength.process([], samples50ms);
    expect(result.filter(e => e.type === "note-off")).toHaveLength(0);
    
    // Check at 150ms (should have released)
    const samples150ms = Math.floor(0.15 * sampleRate);
    result = noteLength.process([], samples150ms);
    expect(result.filter(e => e.type === "note-off")).toHaveLength(1);
  });

  it("should hold note in sync mode", () => {
    noteLength.setParameter("mode", "sync");
    noteLength.setParameter("syncRate", "1/4"); // Quarter note at 120 BPM = 0.5 seconds
    
    // Trigger note
    noteLength.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Check at 0.3 seconds (should still be holding)
    const samples300ms = Math.floor(0.3 * sampleRate);
    let result = noteLength.process([], samples300ms);
    expect(result.filter(e => e.type === "note-off")).toHaveLength(0);
    
    // Check at 0.6 seconds (should have released)
    const samples600ms = Math.floor(0.6 * sampleRate);
    result = noteLength.process([], samples600ms);
    expect(result.filter(e => e.type === "note-off")).toHaveLength(1);
  });

  it("should scale note length in gate mode", () => {
    noteLength.setParameter("mode", "gate");
    noteLength.setParameter("gatePercent", 50); // Half the original length
    
    // Trigger note
    noteLength.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Release note after 1 second
    noteLength.process([createNoteOff(60, 0, 0, sampleRate)], sampleRate);
    
    // The note-off should be generated at 0.5 seconds (50% of 1 second)
    // Process at 0.6 seconds
    const result = noteLength.process([], Math.floor(0.6 * sampleRate));
    expect(result.filter(e => e.type === "note-off")).toHaveLength(1);
  });

  it("should handle release velocity", () => {
    noteLength.setParameter("releaseVelocity", true);
    noteLength.setParameter("mode", "time");
    noteLength.setParameter("timeMs", 50);
    
    // Trigger note with velocity 100
    noteLength.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Wait for release
    const samples100ms = Math.floor(0.1 * sampleRate);
    const result = noteLength.process([], samples100ms);
    
    const noteOffs = result.filter(e => e.type === "note-off");
    expect(noteOffs).toHaveLength(1);
    expect((noteOffs[0]! as { velocity: number }).velocity).toBe(100);
  });

  it("should release existing note when same note is triggered again", () => {
    noteLength.setParameter("mode", "time");
    noteLength.setParameter("timeMs", 500);
    
    // Trigger note
    noteLength.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Trigger same note again before release
    const result = noteLength.process([createNoteOn(60, 100, 0, 100)], 100);
    
    // Should have note-off for first note, then note-on for new note
    const noteOffs = result.filter(e => e.type === "note-off");
    const noteOns = result.filter(e => e.type === "note-on");
    
    expect(noteOffs).toHaveLength(1);
    expect(noteOns).toHaveLength(1);
  });

  it("should save and load state", () => {
    noteLength.setParameter("mode", "time");
    noteLength.setParameter("timeMs", 200);
    noteLength.setParameter("releaseVelocity", true);
    
    const state = noteLength.saveState();
    
    const newNoteLength = new NoteLength();
    newNoteLength.loadState(state);
    
    expect(newNoteLength.getParameter("mode")).toBe("time");
    expect(newNoteLength.getParameter("timeMs")).toBe(200);
    expect(newNoteLength.getParameter("releaseVelocity")).toBe(true);
  });

  it("should reset to default state", () => {
    noteLength.setParameter("mode", "time");
    noteLength.setParameter("timeMs", 200);
    
    noteLength.reset();
    
    expect(noteLength.getParameter("mode")).toBe(DEFAULT_NOTE_LENGTH_PARAMS.mode);
    expect(noteLength.getParameter("timeMs")).toBe(DEFAULT_NOTE_LENGTH_PARAMS.timeMs);
  });

  it("should clamp timeMs to 1-1000 range", () => {
    noteLength.setParameter("timeMs", 2000);
    expect(noteLength.getParameter("timeMs")).toBe(1000);
    
    noteLength.setParameter("timeMs", 0);
    expect(noteLength.getParameter("timeMs")).toBe(1);
  });

  it("should clamp gatePercent to 0-200 range", () => {
    noteLength.setParameter("gatePercent", 250);
    expect(noteLength.getParameter("gatePercent")).toBe(200);
    
    noteLength.setParameter("gatePercent", -10);
    expect(noteLength.getParameter("gatePercent")).toBe(0);
  });
});
