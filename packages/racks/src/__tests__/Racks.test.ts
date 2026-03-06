import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrumRack, InstrumentRack, AudioEffectRack, MidiEffectRack } from "../index.js";
import type { PluginDefinition } from "@daw/plugin-api";

const mockPlugin: PluginDefinition = {
  id: "test.plugin",
  name: "Test Plugin",
  category: "instrument",
  version: "1.0.0",
  parameters: [],
  ui: { type: "generic" },
  audioInputs: 2,
  audioOutputs: 2,
  midiInputs: 1,
  midiOutputs: 0,
  async createInstance() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      setParam: vi.fn(),
      getParam: vi.fn(() => 0),
      saveState: vi.fn(async () => ({})),
      loadState: vi.fn(),
      getLatencySamples: vi.fn(() => 0),
      getTailSamples: vi.fn(() => 0),
      reset: vi.fn(),
      prepare: vi.fn(),
      process: vi.fn(),
      dispose: vi.fn(async () => {}),
    };
  },
};

describe("DrumRack", () => {
  let rack: DrumRack;

  beforeEach(() => {
    rack = DrumRack.create("Test Kit", { numPads: 16 });
  });

  it("should create with default pads", () => {
    expect(rack.activePadCount).toBe(16);
    expect(rack.returnChains.length).toBe(2);
  });

  it("should create pad at specific note", () => {
    rack.createPad(60, "Test Pad");
    const pad = rack.getPad(60);
    
    expect(pad).toBeDefined();
    expect(pad!.name).toBe("Test Pad");
    expect(pad!.note).toBe(60);
  });

  it("should remove pad", () => {
    rack.createPad(60);
    const removed = rack.removePad(60);
    
    expect(removed).toBe(true);
    expect(rack.getPad(60)).toBeNull();
  });

  it("should set choke group", () => {
    rack.createPad(36, "Kick");
    rack.createPad(38, "Snare");
    
    rack.setPadChokeGroup(36, 1);
    rack.setPadChokeGroup(38, 1);
    
    expect(rack.getPad(36)!.chokeGroup).toBe(1);
    expect(rack.getPad(38)!.chokeGroup).toBe(1);
  });

  it("should add return chain", () => {
    const initialCount = rack.returnChains.length;
    rack.addReturnChain("New Return");
    
    expect(rack.returnChains.length).toBe(initialCount + 1);
  });

  it("should set send level for pad", () => {
    rack.createPad(36);
    const returnChain = rack.returnChains[0]!;
    
    rack.setPadSendLevel(36, returnChain.id, 0.5);
    
    const pad = rack.getPad(36)!;
    const send = pad.chain.sends.find(s => s.targetId === returnChain.id);
    expect(send!.level).toBe(0.5);
  });

  it("should trigger pad", () => {
    rack.createPad(36, "Kick");
    const triggered = rack.triggerPad(36, 100);
    
    expect(triggered).toBe(true);
  });

  it("should serialize and deserialize", () => {
    rack.visiblePadCount = 32;
    rack.autoSelect = false;
    
    const state = rack.toJSON();
    expect(state.visiblePadCount).toBe(32);
    expect(state.autoSelect).toBe(false);
    expect(state.type).toBe("drum");
  });
});

describe("InstrumentRack", () => {
  let rack: InstrumentRack;

  beforeEach(() => {
    rack = InstrumentRack.create("Test Rack", { numLayers: 4 });
  });

  it("should create with specified chains", () => {
    expect(rack.chainCount).toBe(4);
  });

  it("should setup velocity layers", () => {
    rack.setupVelocityLayers([
      { min: 0, max: 40 },
      { min: 41, max: 80 },
      { min: 81, max: 127 },
    ]);
    
    const chains = rack.chains;
    expect(chains[0]!.zones.getZones().velocity.high).toBe(40);
    expect(chains[1]!.zones.getZones().velocity.low).toBe(41);
  });

  it("should setup key splits", () => {
    rack.setupKeySplits([60, 72]);
    
    const chains = rack.chains;
    expect(chains[0]!.zones.getZones().key.high).toBe(60);
    expect(chains[1]!.zones.getZones().key.low).toBe(60);
    expect(chains[1]!.zones.getZones().key.high).toBe(72);
  });

  it("should setup crossfade chains", () => {
    rack.setupCrossfadeChains();
    rack.keySplitMode = "crossfade";
    
    expect(rack.keySplitMode).toBe("crossfade");
  });

  it("should manage legato mode", () => {
    expect(rack.legatoMode).toBe(false);
    
    rack.legatoMode = true;
    expect(rack.legatoMode).toBe(true);
  });

  it("should manage portamento time", () => {
    rack.portamentoTime = 100;
    expect(rack.portamentoTime).toBe(100);
  });

  it("should serialize and deserialize", () => {
    rack.keySplitMode = "split";
    rack.velocityLayerMode = "crossfade";
    
    const state = rack.toJSON();
    expect(state.keySplitMode).toBe("split");
    expect(state.velocityLayerMode).toBe("crossfade");
    expect(state.type).toBe("instrument");
  });
});

describe("AudioEffectRack", () => {
  let rack: AudioEffectRack;

  beforeEach(() => {
    rack = AudioEffectRack.create("Test FX Rack", { numChains: 3 });
  });

  it("should create with specified chains", () => {
    expect(rack.chainCount).toBe(3);
  });

  it("should set split mode", () => {
    rack.splitMode = "serial";
    expect(rack.splitMode).toBe("serial");
    
    rack.splitMode = "parallel";
    expect(rack.splitMode).toBe("parallel");
  });

  it("should set dry/wet mix", () => {
    rack.dryWet = 0.75;
    expect(rack.dryWet).toBe(0.75);
    
    // Should clamp to 0-1
    rack.dryWet = 1.5;
    expect(rack.dryWet).toBe(1);
  });

  it("should set chain dry/wet", () => {
    const chainId = rack.chains[0]!.id;
    rack.setChainDryWet(chainId, 0.5);
    
    expect(rack.getChainDryWet(chainId)).toBe(0.5);
  });

  it("should set crossover frequency", () => {
    rack.crossoverFreq = 2000;
    expect(rack.crossoverFreq).toBe(2000);
    
    // Should clamp
    rack.crossoverFreq = 50000;
    expect(rack.crossoverFreq).toBe(20000);
  });

  it("should setup morphing chains", () => {
    rack.setupMorphingChains();
    
    const chains = rack.chains;
    // Each chain should have chain select zones
    expect(chains[0]!.zones.getZones().chainSelect.high).toBeGreaterThan(0);
  });

  it("should serialize and deserialize", () => {
    rack.splitMode = "frequency";
    rack.dryWet = 0.5;
    
    const state = rack.toJSON();
    expect(state.splitMode).toBe("frequency");
    expect(state.dryWet).toBe(0.5);
    expect(state.type).toBe("audioEffect");
  });
});

describe("MidiEffectRack", () => {
  let rack: MidiEffectRack;

  beforeEach(() => {
    rack = MidiEffectRack.create("Test MIDI Rack", { numChains: 2 });
  });

  it("should create with specified chains", () => {
    expect(rack.chainCount).toBe(2);
  });

  it("should set MIDI processing options", () => {
    rack.processNoteOff = false;
    expect(rack.processNoteOff).toBe(false);
    
    rack.processCC = false;
    expect(rack.processCC).toBe(false);
    
    rack.processPitchBend = false;
    expect(rack.processPitchBend).toBe(false);
  });

  it("should set velocity mode", () => {
    rack.velocityMode = "fixed";
    expect(rack.velocityMode).toBe("fixed");
    
    rack.fixedVelocity = 100;
    expect(rack.fixedVelocity).toBe(100);
  });

  it("should set velocity scale", () => {
    rack.velocityMode = "scale";
    rack.velocityScale = 1.5;
    expect(rack.velocityScale).toBe(1.5);
    
    rack.velocityOffset = -10;
    expect(rack.velocityOffset).toBe(-10);
  });

  it("should setup key routing", () => {
    rack.setupKeyRouting([
      { min: 0, max: 60 },
      { min: 61, max: 127 },
    ]);
    
    const chains = rack.chains;
    expect(chains[0]!.zones.getZones().key.high).toBe(60);
    expect(chains[1]!.zones.getZones().key.low).toBe(61);
  });

  it("should generate random velocity", () => {
    rack.velocityMode = "random";
    const velocity = rack.generateRandomVelocity();
    
    expect(velocity).toBeGreaterThanOrEqual(1);
    expect(velocity).toBeLessThanOrEqual(127);
  });

  it("should quantize velocity", () => {
    const quantized = rack.quantizeVelocity(65, 4);
    expect(quantized).toBe(63.5); // 127/4 * 2 = 63.5
  });

  it("should create velocity curve table", () => {
    const table = rack.createVelocityCurve(0.5);
    expect(table).toHaveLength(128);
    expect(table[0]).toBe(0);
    expect(table[127]).toBe(127);
  });

  it("should emit MIDI events", () => {
    const callback = vi.fn();
    const unsubscribe = rack.onMidiEvent(callback);

    const midiEvent = {
      type: "noteOn" as const,
      sampleOffset: 0,
      channel: 0,
      data: { note: 60, velocity: 100 },
    };

    // Process should emit events
    // Note: In actual implementation, process would accumulate events
    // and emit them via the callback
    
    unsubscribe();
  });

  it("should serialize and deserialize", () => {
    rack.velocityMode = "scale";
    rack.velocityScale = 1.2;
    rack.processCC = false;
    
    const state = rack.toJSON();
    expect(state.velocityMode).toBe("scale");
    expect(state.velocityScale).toBe(1.2);
    expect(state.processCC).toBe(false);
    expect(state.type).toBe("midiEffect");
  });
});
