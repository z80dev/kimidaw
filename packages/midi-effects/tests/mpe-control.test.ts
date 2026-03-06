import { describe, it, expect, beforeEach } from "vitest";
import { MPEControl, DEFAULT_MPE_CONTROL_PARAMS } from "../src/mpe-control/index.js";
import { createNoteOn, createNoteOff } from "../src/types.js";

describe("MPEControl", () => {
  let mpe: MPEControl;

  beforeEach(() => {
    mpe = new MPEControl();
    mpe.reset();
  });

  it("should create an MPE control effect with default parameters", () => {
    expect(mpe.name).toBe("MPE Control");
    expect(mpe.version).toBe("1.0.0");
  });

  it("should pass through events when disabled", () => {
    mpe.setParameter("mpeEnabled", false);
    
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = mpe.process(events, 0);
    
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("note-on");
  });

  it("should allocate different channels for each note", () => {
    const events = [
      createNoteOn(60, 100, 0, 0),
      createNoteOn(64, 100, 0, 0),
    ];
    const result = mpe.process(events, 0);
    
    const noteOns = result.filter(e => e.type === "note-on");
    expect(noteOns.length).toBe(2);
    
    const channels = noteOns.map(e => e.channel);
    expect(channels[0]).not.toBe(channels[1]);
  });

  it("should send MPE configuration on note-on", () => {
    const events = [createNoteOn(60, 100, 0, 0)];
    const result = mpe.process(events, 0);
    
    // Should have CC messages for MPE config plus note-on
    const ccMessages = result.filter(e => e.type === "control-change");
    expect(ccMessages.length).toBeGreaterThanOrEqual(3); // RPN MSB, RPN LSB, Data entry
  });

  it("should release notes on their assigned channels", () => {
    // Trigger note
    mpe.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Release note
    const result = mpe.process([createNoteOff(60, 0, 0, 100)], 100);
    
    const noteOffs = result.filter(e => e.type === "note-off");
    expect(noteOffs.length).toBe(1);
    expect(noteOffs[0]!.channel).not.toBe(0); // Should be on MPE channel
  });

  it("should broadcast pitch bend to all active notes", () => {
    // Trigger note
    mpe.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Send pitch bend
    const pitchBend = {
      type: "pitch-bend" as const,
      channel: 0,
      value: 4096,
      sampleTime: 100,
      data: [0xe0, 0x00, 0x40],
    };
    
    const result = mpe.process([pitchBend], 100);
    
    const pbMessages = result.filter(e => e.type === "pitch-bend");
    expect(pbMessages.length).toBeGreaterThanOrEqual(1);
  });

  it("should process slide (CC74) messages", () => {
    // Trigger note
    mpe.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Send CC74 (slide)
    const slideCC = {
      type: "control-change" as const,
      channel: 0,
      controller: 74,
      value: 64,
      sampleTime: 100,
      data: [0xb0, 74, 64],
    };
    
    const result = mpe.process([slideCC], 100);
    
    const ccMessages = result.filter(e => e.type === "control-change" && (e as { controller: number }).controller === 74);
    expect(ccMessages.length).toBeGreaterThanOrEqual(1);
  });

  it("should process pressure messages", () => {
    // Trigger note
    mpe.process([createNoteOn(60, 100, 0, 0)], 0);
    
    // Send channel aftertouch (pressure)
    const pressure = {
      type: "channel-aftertouch" as const,
      channel: 0,
      pressure: 100,
      sampleTime: 100,
      data: [0xd0, 100],
    };
    
    const result = mpe.process([pressure], 100);
    
    const atMessages = result.filter(e => e.type === "channel-aftertouch");
    expect(atMessages.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle multiple simultaneous notes", () => {
    // Trigger 5 notes (typical MPE setup)
    const events = [
      createNoteOn(60, 100, 0, 0),
      createNoteOn(62, 100, 0, 0),
      createNoteOn(64, 100, 0, 0),
      createNoteOn(65, 100, 0, 0),
      createNoteOn(67, 100, 0, 0),
    ];
    
    const result = mpe.process(events, 0);
    const noteOns = result.filter(e => e.type === "note-on");
    
    expect(noteOns.length).toBe(5);
  });

  it("should track active notes", () => {
    mpe.process([createNoteOn(60, 100, 0, 0)], 0);
    mpe.process([createNoteOn(64, 100, 0, 0)], 0);
    
    const activeNotes = mpe.getActiveNotes();
    expect(activeNotes.size).toBe(2);
    expect(activeNotes.has(60)).toBe(true);
    expect(activeNotes.has(64)).toBe(true);
  });

  it("should free channel when note is released", () => {
    // Trigger note
    mpe.process([createNoteOn(60, 100, 0, 0)], 0);
    expect(mpe.getActiveNotes().size).toBe(1);
    
    // Release note
    mpe.process([createNoteOff(60, 0, 0, 100)], 100);
    expect(mpe.getActiveNotes().size).toBe(0);
  });

  it("should save and load state", () => {
    mpe.setParameter("mpeEnabled", true);
    mpe.setParameter("pitchBendRange", 24);
    mpe.setParameter("slideEnabled", false);
    mpe.setParameter("pressureEnabled", false);
    mpe.setParameter("voiceAllocation", "lowest");
    
    const state = mpe.saveState();
    
    const newMpe = new MPEControl();
    newMpe.loadState(state);
    
    expect(newMpe.getParameter("mpeEnabled")).toBe(true);
    expect(newMpe.getParameter("pitchBendRange")).toBe(24);
    expect(newMpe.getParameter("slideEnabled")).toBe(false);
    expect(newMpe.getParameter("pressureEnabled")).toBe(false);
    expect(newMpe.getParameter("voiceAllocation")).toBe("lowest");
  });

  it("should reset to default state", () => {
    mpe.setParameter("pitchBendRange", 12);
    mpe.setParameter("slideCurve", "exp");
    mpe.setParameter("voiceAllocation", "highest");
    
    mpe.reset();
    
    expect(mpe.getParameter("pitchBendRange")).toBe(DEFAULT_MPE_CONTROL_PARAMS.pitchBend.range);
    expect(mpe.getParameter("slideCurve")).toBe(DEFAULT_MPE_CONTROL_PARAMS.slide.curve);
    expect(mpe.getParameter("voiceAllocation")).toBe(DEFAULT_MPE_CONTROL_PARAMS.voiceAllocation);
  });

  it("should clamp pitch bend range", () => {
    mpe.setParameter("pitchBendRange", 50);
    expect(mpe.getParameter("pitchBendRange")).toBe(24);
    
    mpe.setParameter("pitchBendRange", -50);
    expect(mpe.getParameter("pitchBendRange")).toBe(-24);
  });

  it("should handle slide curve options", () => {
    mpe.setParameter("slideCurve", "linear");
    expect(mpe.getParameter("slideCurve")).toBe("linear");
    
    mpe.setParameter("slideCurve", "exp");
    expect(mpe.getParameter("slideCurve")).toBe("exp");
    
    mpe.setParameter("slideCurve", "log");
    expect(mpe.getParameter("slideCurve")).toBe("log");
  });
});
