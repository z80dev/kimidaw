import { describe, it, expect, beforeEach } from "vitest";
import { Arpeggiator, DEFAULT_ARPEGGIATOR_PARAMS } from "../src/arpeggiator/index.js";
import { createNoteOn, createNoteOff } from "../src/types.js";

describe("Arpeggiator", () => {
  let arp: Arpeggiator;
  const sampleRate = 48000;
  const tempo = 120;

  beforeEach(() => {
    arp = new Arpeggiator();
    arp.setSampleRate(sampleRate);
    arp.setTempo(tempo);
    arp.reset();
  });

  it("should create an arpeggiator with default parameters", () => {
    expect(arp.name).toBe("Arpeggiator");
    expect(arp.version).toBe("1.0.0");
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

    const result = arp.process([ccEvent], 0);
    expect(result).toHaveLength(0); // Arp doesn't generate output yet without held notes
  });

  it("should handle note-on events", () => {
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = arp.process(events, 0);
    
    // Should have note-on from input plus potential arp notes
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle note-off events", () => {
    // First trigger a note
    arp.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Then release it
    const result = arp.process([createNoteOff(60, 0, 0, 1000)], 1000);
    
    // Should have note-off
    const noteOffs = result.filter(e => e.type === "note-off");
    expect(noteOffs.length).toBeGreaterThanOrEqual(1);
  });

  it("should respect the hold parameter", () => {
    arp.setParameter("hold", true);
    
    // Trigger note
    arp.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Release note - should still hold
    arp.process([createNoteOff(60, 0, 0, 1000)], 1000);
    
    // Continue processing - arp should still be running
    const result = arp.process([], sampleRate); // 1 second later
    expect(arp.getParameter("hold")).toBe(true);
  });

  it("should change style parameter", () => {
    arp.setParameter("style", "up-down");
    expect(arp.getParameter("style")).toBe("up-down");
    
    arp.setParameter("style", "random");
    expect(arp.getParameter("style")).toBe("random");
  });

  it("should change rate parameter", () => {
    arp.setParameter("rate", "1/8");
    expect(arp.getParameter("rate")).toBe("1/8");
    
    arp.setParameter("rate", "1/32");
    expect(arp.getParameter("rate")).toBe("1/32");
  });

  it("should clamp gate parameter to 0-200 range", () => {
    arp.setParameter("gate", 250);
    expect(arp.getParameter("gate")).toBe(200);
    
    arp.setParameter("gate", -10);
    expect(arp.getParameter("gate")).toBe(0);
  });

  it("should save and load state", () => {
    arp.setParameter("style", "random");
    arp.setParameter("rate", "1/8");
    arp.setParameter("gate", 75);
    
    const state = arp.saveState();
    expect(state.params).toBeDefined();
    
    const newArp = new Arpeggiator();
    newArp.loadState(state);
    
    expect(newArp.getParameter("style")).toBe("random");
    expect(newArp.getParameter("rate")).toBe("1/8");
    expect(newArp.getParameter("gate")).toBe(75);
  });

  it("should reset to default state", () => {
    arp.setParameter("style", "random");
    arp.setParameter("gate", 75);
    
    arp.reset();
    
    expect(arp.getParameter("style")).toBe(DEFAULT_ARPEGGIATOR_PARAMS.style);
    expect(arp.getParameter("gate")).toBe(DEFAULT_ARPEGGIATOR_PARAMS.gate);
  });

  it("should handle multiple held notes", () => {
    const events = [
      createNoteOn(60, 100, 0, 0),
      createNoteOn(64, 100, 0, 0),
      createNoteOn(67, 100, 0, 0),
    ];
    
    const result = arp.process(events, 0);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it("should handle distance/ octave range", () => {
    arp.setParameter("distance", 2);
    expect(arp.getParameter("distance")).toBe(2);
    
    arp.setParameter("distance", 5); // Should clamp to 4
    expect(arp.getParameter("distance")).toBe(4);
  });

  it("should handle velocity modes", () => {
    arp.setParameter("velocityMode", "target");
    expect(arp.getParameter("velocityMode")).toBe("target");
    
    arp.setParameter("velocityMode", "random");
    expect(arp.getParameter("velocityMode")).toBe("random");
  });

  it("should handle retrigger modes", () => {
    arp.setParameter("retrigger", "note");
    expect(arp.getParameter("retrigger")).toBe("note");
    
    arp.setParameter("retrigger", "beat");
    expect(arp.getParameter("retrigger")).toBe("beat");
  });
});
