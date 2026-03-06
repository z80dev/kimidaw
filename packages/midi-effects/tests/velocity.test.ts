import { describe, it, expect, beforeEach } from "vitest";
import { Velocity, DEFAULT_VELOCITY_PARAMS } from "../src/velocity/index.js";
import { createNoteOn } from "../src/types.js";

describe("Velocity", () => {
  let velocity: Velocity;

  beforeEach(() => {
    velocity = new Velocity();
    velocity.reset();
  });

  it("should create a velocity effect with default parameters", () => {
    expect(velocity.name).toBe("Velocity");
    expect(velocity.version).toBe("1.0.0");
  });

  it("should pass through non-note-on events", () => {
    const noteOff = {
      type: "note-off" as const,
      channel: 0,
      note: 60,
      velocity: 0,
      sampleTime: 0,
      data: [0x80, 60, 0],
    };

    const result = velocity.process([noteOff], 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("note-off");
  });

  it("should clip velocity to output range in clip mode", () => {
    velocity.setParameter("mode", "clip");
    velocity.setParameter("outLow", 20);
    velocity.setParameter("outHigh", 100);
    
    // Low velocity should be raised to outLow
    let result = velocity.process([createNoteOn(60, 10, 0, 0)], 0);
    expect((result[0]! as { velocity: number }).velocity).toBe(20);
    
    // High velocity should be lowered to outHigh
    result = velocity.process([createNoteOn(60, 127, 0, 0)], 0);
    expect((result[0]! as { velocity: number }).velocity).toBe(100);
    
    // Middle velocity should pass through
    result = velocity.process([createNoteOn(60, 60, 0, 0)], 0);
    expect((result[0]! as { velocity: number }).velocity).toBe(60);
  });

  it("should gate notes in gate mode", () => {
    velocity.setParameter("mode", "gate");
    velocity.setParameter("outLow", 40);
    velocity.setParameter("outHigh", 127);
    
    // Note below threshold should be zeroed
    let result = velocity.process([createNoteOn(60, 30, 0, 0)], 0);
    expect((result[0]! as { velocity: number }).velocity).toBe(0);
    
    // Note above threshold should pass
    result = velocity.process([createNoteOn(60, 50, 0, 0)], 0);
    expect((result[0]! as { velocity: number }).velocity).toBe(50);
  });

  it("should set fixed velocity in fixed mode", () => {
    velocity.setParameter("mode", "fixed");
    velocity.setParameter("outHigh", 100);
    
    const result = velocity.process([createNoteOn(60, 50, 0, 0)], 0);
    expect((result[0]! as { velocity: number }).velocity).toBe(100);
  });

  it("should add drive in relative mode", () => {
    velocity.setParameter("mode", "relative");
    velocity.setParameter("drive", 20);
    
    const result = velocity.process([createNoteOn(60, 50, 0, 0)], 0);
    expect((result[0]! as { velocity: number }).velocity).toBe(70);
  });

  it("should subtract drive in relative mode when negative", () => {
    velocity.setParameter("mode", "relative");
    velocity.setParameter("drive", -20);
    
    const result = velocity.process([createNoteOn(60, 50, 0, 0)], 0);
    expect((result[0]! as { velocity: number }).velocity).toBe(30);
  });

  it("should clamp velocity to 0-127 range", () => {
    velocity.setParameter("mode", "relative");
    velocity.setParameter("drive", 100);
    
    const result = velocity.process([createNoteOn(60, 100, 0, 0)], 0);
    expect((result[0]! as { velocity: number }).velocity).toBe(127);
  });

  it("should only affect notes in range", () => {
    velocity.setParameter("mode", "relative");
    velocity.setParameter("drive", 20);
    velocity.setParameter("rangeLow", 60);
    velocity.setParameter("rangeHigh", 64);
    
    const events = [
      createNoteOn(59, 50, 0, 0), // Out of range
      createNoteOn(60, 50, 0, 0), // In range
      createNoteOn(65, 50, 0, 0), // Out of range
    ];
    
    const result = velocity.process(events, 0);
    
    expect((result[0]! as { velocity: number }).velocity).toBe(50); // Unchanged
    expect((result[1]! as { velocity: number }).velocity).toBe(70); // +20
    expect((result[2]! as { velocity: number }).velocity).toBe(50); // Unchanged
  });

  it("should save and load state", () => {
    velocity.setParameter("mode", "compand");
    velocity.setParameter("drive", -30);
    velocity.setParameter("compand", 50);
    velocity.setParameter("outLow", 10);
    velocity.setParameter("outHigh", 120);
    
    const state = velocity.saveState();
    
    const newVelocity = new Velocity();
    newVelocity.loadState(state);
    
    expect(newVelocity.getParameter("mode")).toBe("compand");
    expect(newVelocity.getParameter("drive")).toBe(-30);
    expect(newVelocity.getParameter("compand")).toBe(50);
    expect(newVelocity.getParameter("outLow")).toBe(10);
    expect(newVelocity.getParameter("outHigh")).toBe(120);
  });

  it("should reset to default state", () => {
    velocity.setParameter("mode", "fixed");
    velocity.setParameter("drive", 50);
    velocity.setParameter("outHigh", 100);
    
    velocity.reset();
    
    expect(velocity.getParameter("mode")).toBe(DEFAULT_VELOCITY_PARAMS.mode);
    expect(velocity.getParameter("drive")).toBe(DEFAULT_VELOCITY_PARAMS.drive);
    expect(velocity.getParameter("outHigh")).toBe(DEFAULT_VELOCITY_PARAMS.outHigh);
  });

  it("should clamp parameters to valid ranges", () => {
    velocity.setParameter("drive", 200);
    expect(velocity.getParameter("drive")).toBe(127);
    
    velocity.setParameter("drive", -200);
    expect(velocity.getParameter("drive")).toBe(-128);
    
    velocity.setParameter("compand", 150);
    expect(velocity.getParameter("compand")).toBe(100);
    
    velocity.setParameter("compand", -150);
    expect(velocity.getParameter("compand")).toBe(-100);
    
    velocity.setParameter("random", 200);
    expect(velocity.getParameter("random")).toBe(127);
    
    velocity.setParameter("outLow", -10);
    expect(velocity.getParameter("outLow")).toBe(0);
    
    velocity.setParameter("outHigh", 200);
    expect(velocity.getParameter("outHigh")).toBe(127);
  });
});
