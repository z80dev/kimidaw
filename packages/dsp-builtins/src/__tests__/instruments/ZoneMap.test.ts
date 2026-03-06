import { describe, it, expect } from "vitest";
import { ZoneMap, calculateVelocityCrossfade, createVelocityLayers } from "../../instruments/sampler/ZoneMap.js";
import type { SampleZone } from "@daw/plugin-api";

describe("ZoneMap", () => {
  it("should add zones and find by note", () => {
    const map = new ZoneMap();
    
    map.addZone({
      rootNote: 60,
      minNote: 48,
      maxNote: 72,
      minVelocity: 0,
      maxVelocity: 127,
      sampleId: "sample1",
      sampleStart: 0,
      sampleEnd: 1000,
      tuneCents: 0,
      gainDb: 0,
    });
    
    const zone = map.findZone(60, 100);
    expect(zone).not.toBeNull();
    expect(zone?.rootNote).toBe(60);
  });

  it("should find best zone for note", () => {
    const map = new ZoneMap();
    
    // Add two overlapping zones
    map.addZone({
      rootNote: 60,
      minNote: 48,
      maxNote: 66,
      minVelocity: 0,
      maxVelocity: 127,
      sampleId: "sample1",
      sampleStart: 0,
      sampleEnd: 1000,
      tuneCents: 0,
      gainDb: 0,
    });
    
    map.addZone({
      rootNote: 72,
      minNote: 67,
      maxNote: 84,
      minVelocity: 0,
      maxVelocity: 127,
      sampleId: "sample2",
      sampleStart: 0,
      sampleEnd: 1000,
      tuneCents: 0,
      gainDb: 0,
    });
    
    // Should find closest to root
    const zone60 = map.findZone(60, 100);
    expect(zone60?.rootNote).toBe(60);
    
    const zone72 = map.findZone(72, 100);
    expect(zone72?.rootNote).toBe(72);
  });

  it("should auto-map samples by root note", () => {
    const map = new ZoneMap();
    
    map.autoMap(
      ["kick", "snare", "hat"],
      [36, 40, 42],
      { velocityLayers: 1 }
    );
    
    expect(map.zoneCount).toBe(3);
    
    const kickZone = map.findZone(36, 100);
    expect(kickZone?.sampleId).toBe("kick");
  });

  it("should handle velocity layers", () => {
    const map = new ZoneMap();
    
    map.addZone({
      rootNote: 60,
      minNote: 48,
      maxNote: 72,
      minVelocity: 0,
      maxVelocity: 63,
      sampleId: "soft",
      sampleStart: 0,
      sampleEnd: 1000,
      tuneCents: 0,
      gainDb: 0,
      roundRobinGroup: 0,
    });
    
    map.addZone({
      rootNote: 60,
      minNote: 48,
      maxNote: 72,
      minVelocity: 64,
      maxVelocity: 127,
      sampleId: "hard",
      sampleStart: 0,
      sampleEnd: 1000,
      tuneCents: 0,
      gainDb: 0,
      roundRobinGroup: 0,
    });
    
    const soft = map.findZone(60, 30);
    expect(soft?.sampleId).toBe("soft");
    
    const hard = map.findZone(60, 100);
    expect(hard?.sampleId).toBe("hard");
  });

  it("should export and import zones", () => {
    const map = new ZoneMap();
    
    map.addZone({
      rootNote: 60,
      minNote: 48,
      maxNote: 72,
      minVelocity: 0,
      maxVelocity: 127,
      sampleId: "sample1",
      sampleStart: 0,
      sampleEnd: 1000,
      tuneCents: 0,
      gainDb: 0,
    });
    
    const exported = map.export();
    expect(exported).toHaveLength(1);
    
    const newMap = new ZoneMap();
    newMap.import(exported);
    
    expect(newMap.zoneCount).toBe(1);
    expect(newMap.findZone(60, 100)?.sampleId).toBe("sample1");
  });

  it("should get key range", () => {
    const map = new ZoneMap();
    
    map.addZone({
      rootNote: 60,
      minNote: 48,
      maxNote: 72,
      minVelocity: 0,
      maxVelocity: 127,
      sampleId: "sample1",
      sampleStart: 0,
      sampleEnd: 1000,
      tuneCents: 0,
      gainDb: 0,
    });
    
    const range = map.keyRange;
    expect(range?.min).toBe(48);
    expect(range?.max).toBe(72);
  });

  it("should check note coverage", () => {
    const map = new ZoneMap();
    
    map.addZone({
      rootNote: 60,
      minNote: 48,
      maxNote: 72,
      minVelocity: 0,
      maxVelocity: 127,
      sampleId: "sample1",
      sampleStart: 0,
      sampleEnd: 1000,
      tuneCents: 0,
      gainDb: 0,
    });
    
    expect(map.hasZoneForNote(60)).toBe(true);
    expect(map.hasZoneForNote(100)).toBe(false);
  });
});

describe("Velocity utilities", () => {
  it("should create velocity layers", () => {
    const layers = createVelocityLayers(["soft", "medium", "hard"], 3);
    
    expect(layers).toHaveLength(3);
    expect(layers[0].minVel).toBe(0);
    expect(layers[2].maxVel).toBe(127);
  });

  it("should calculate velocity crossfade", () => {
    // Middle of zone should be full gain
    expect(calculateVelocityCrossfade(64, 0, 127, 0.2)).toBe(1);
    
    // At edges with fade range should blend
    const atEdge = calculateVelocityCrossfade(64, 0, 127, 0.5);
    expect(atEdge).toBeGreaterThan(0);
    expect(atEdge).toBeLessThan(1);
  });
});
