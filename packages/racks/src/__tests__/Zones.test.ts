import { describe, it, expect, beforeEach } from "vitest";
import {
  Zone,
  ChainZoneManager,
  ZoneEditor,
  findZoneOverlaps,
  calculateCrossfadeGain,
  applyCrossfadeCurve,
  createVelocityLayers,
  createKeySplit,
  MIDI_NOTE_MIN,
  MIDI_NOTE_MAX,
  DEFAULT_KEY_ZONE,
  DEFAULT_VELOCITY_ZONE,
  DEFAULT_CHAIN_SELECT_ZONE,
  DEFAULT_CHAIN_ZONES,
} from "../Zones.js";
import type { ChainZones, ChainSelectionContext } from "../types.js";

describe("Zone", () => {
  it("should create a zone with default values", () => {
    const zone = new Zone();
    expect(zone.low).toBe(0);
    expect(zone.high).toBe(127);
  });

  it("should clamp values to valid range", () => {
    const zone = new Zone();
    zone.low = -10;
    expect(zone.low).toBe(0);
    
    zone.high = 200;
    expect(zone.high).toBe(127);
  });

  it("should calculate gain correctly", () => {
    const zone = new Zone({
      low: 40,
      high: 80,
      fadeLow: 30,
      fadeHigh: 90,
    }, 0, 127);

    expect(zone.calculateGain(20)).toBe(0); // Outside fade zone
    expect(zone.calculateGain(35)).toBe(0.5); // In fade zone (halfway from 30 to 40)
    expect(zone.calculateGain(60)).toBe(1); // In hard zone
    expect(zone.calculateGain(85)).toBe(0.5); // In fade zone (halfway from 80 to 90)
  });

  it("should serialize and deserialize", () => {
    const zone = new Zone({
      low: 40,
      high: 80,
      fadeLow: 30,
      fadeHigh: 90,
    });

    const json = zone.toJSON();
    const restored = Zone.fromJSON(json);
    
    expect(restored.low).toBe(40);
    expect(restored.high).toBe(80);
  });
});

describe("ChainZoneManager", () => {
  let manager: ChainZoneManager;

  beforeEach(() => {
    manager = new ChainZoneManager();
  });

  it("should create with default zones", () => {
    const zones = manager.getZones();
    expect(zones.key.low).toBe(MIDI_NOTE_MIN);
    expect(zones.key.high).toBe(MIDI_NOTE_MAX);
  });

  it("should evaluate zones correctly", () => {
    // Set up a velocity layer
    manager.velocityZone.low = 60;
    manager.velocityZone.high = 100;
    manager.velocityZone.fadeLow = 50;
    manager.velocityZone.fadeHigh = 110;

    const context: ChainSelectionContext = {
      note: 60,
      velocity: 80,
      chainSelect: 0,
      channel: 0,
    };

    const result = manager.evaluate(context);
    expect(result.active).toBe(true);
    expect(result.gain).toBe(1);
  });

  it("should reject notes outside velocity zone", () => {
    manager.velocityZone.low = 60;
    manager.velocityZone.high = 100;

    const context: ChainSelectionContext = {
      note: 60,
      velocity: 40, // Below range
      chainSelect: 0,
      channel: 0,
    };

    const result = manager.evaluate(context);
    expect(result.active).toBe(false);
    expect(result.zoneType).toBe("velocity");
  });

  it("should reset to full range", () => {
    manager.keyZone.low = 40;
    manager.keyZone.high = 60;
    
    manager.resetToFull();
    
    const zones = manager.getZones();
    expect(zones.key.low).toBe(MIDI_NOTE_MIN);
    expect(zones.key.high).toBe(MIDI_NOTE_MAX);
  });
});

describe("ZoneEditor", () => {
  it("should toggle crossfade display", () => {
    const editor = new ZoneEditor();
    expect(editor.state.showCrossfades).toBe(true);
    
    editor.toggleCrossfades();
    expect(editor.state.showCrossfades).toBe(false);
  });

  it("should snap values to grid", () => {
    const editor = new ZoneEditor({ snapToGrid: true, gridSize: 10 });
    
    expect(editor.snap(12)).toBe(10);
    expect(editor.snap(18)).toBe(20);
    expect(editor.snap(4)).toBe(0); // 4 rounds down to 0
    expect(editor.snap(5)).toBe(10); // 5 rounds up to 10
  });

  it("should not snap when disabled", () => {
    const editor = new ZoneEditor({ snapToGrid: false });
    
    expect(editor.snap(12)).toBe(12);
  });
});

describe("findZoneOverlaps", () => {
  it("should find overlapping zones", () => {
    const chains = [
      {
        id: "chain1",
        zones: {
          key: { low: 0, high: 60, fadeLow: 0, fadeHigh: 70 },
          velocity: DEFAULT_VELOCITY_ZONE,
          chainSelect: DEFAULT_CHAIN_SELECT_ZONE,
        },
      },
      {
        id: "chain2",
        zones: {
          key: { low: 50, high: 127, fadeLow: 40, fadeHigh: 127 },
          velocity: DEFAULT_VELOCITY_ZONE,
          chainSelect: DEFAULT_CHAIN_SELECT_ZONE,
        },
      },
    ];

    const overlaps = findZoneOverlaps(chains as { id: string; zones: ChainZones }[], "key");
    
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]!.overlapStart).toBe(40);
    expect(overlaps[0]!.overlapEnd).toBe(70);
  });

  it("should return empty array when no overlaps", () => {
    const chains = [
      {
        id: "chain1",
        zones: {
          key: { low: 0, high: 40, fadeLow: 0, fadeHigh: 40 },
          velocity: DEFAULT_VELOCITY_ZONE,
          chainSelect: DEFAULT_CHAIN_SELECT_ZONE,
        },
      },
      {
        id: "chain2",
        zones: {
          key: { low: 60, high: 127, fadeLow: 60, fadeHigh: 127 },
          velocity: DEFAULT_VELOCITY_ZONE,
          chainSelect: DEFAULT_CHAIN_SELECT_ZONE,
        },
      },
    ];

    const overlaps = findZoneOverlaps(chains as { id: string; zones: ChainZones }[], "key");
    
    expect(overlaps).toHaveLength(0);
  });
});

describe("calculateCrossfadeGain", () => {
  it("should calculate equal-power crossfade", () => {
    const zone1 = { low: 0, high: 50, fadeLow: 0, fadeHigh: 60 };
    const zone2 = { low: 40, high: 127, fadeLow: 30, fadeHigh: 127 };

    const result = calculateCrossfadeGain(45, zone1, zone2, "high");
    
    expect(result.gain1).toBeGreaterThan(0);
    expect(result.gain2).toBeGreaterThan(0);
    expect(result.gain1 ** 2 + result.gain2 ** 2).toBeCloseTo(1, 1);
  });

  it("should return full gain when outside overlap", () => {
    const zone1 = { low: 0, high: 40, fadeLow: 0, fadeHigh: 40 };
    const zone2 = { low: 60, high: 127, fadeLow: 60, fadeHigh: 127 };

    const result = calculateCrossfadeGain(20, zone1, zone2, "high");
    
    expect(result.gain1).toBe(1);
    expect(result.gain2).toBe(0);
  });
});

describe("createVelocityLayers", () => {
  it("should create evenly distributed layers", () => {
    const layers = createVelocityLayers(3);
    
    expect(layers).toHaveLength(3);
    expect(layers[0]!.low).toBe(0);
    expect(layers[2]!.high).toBe(127);
  });

  it("should include crossfade zones", () => {
    const layers = createVelocityLayers(3, 10);
    
    expect(layers[1]!.fadeLow).toBeLessThan(layers[1]!.low);
    expect(layers[1]!.fadeHigh).toBeGreaterThan(layers[1]!.high);
  });
});

describe("createKeySplit", () => {
  it("should create splits at specified points", () => {
    const splits = createKeySplit([60, 72]);
    
    expect(splits).toHaveLength(3);
    expect(splits[0]!.high).toBe(60);
    expect(splits[1]!.low).toBe(60);
    expect(splits[1]!.high).toBe(72);
  });
});
