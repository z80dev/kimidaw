import { describe, it, expect, beforeEach, vi } from "vitest";
import { Chain, DEFAULT_MIXER } from "../Chain.js";
import type { ChainZones, ChainMixer, ChainDevice } from "../types.js";
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

describe("Chain", () => {
  let chain: Chain;

  beforeEach(() => {
    chain = new Chain("test-chain", "Test Chain");
  });

  it("should create with default values", () => {
    expect(chain.id).toBe("test-chain");
    expect(chain.name).toBe("Test Chain");
    expect(chain.deviceCount).toBe(0);
  });

  it("should set and get name", () => {
    chain.name = "New Name";
    expect(chain.name).toBe("New Name");
  });

  it("should set and get volume", () => {
    chain.volume = -6;
    expect(chain.volume).toBe(-6);
    expect(chain.getVolumeLinear()).toBeCloseTo(0.5, 1);
  });

  it("should set and get pan", () => {
    chain.pan = -25;
    expect(chain.pan).toBe(-25);
    
    const gains = chain.getPanGains();
    expect(gains.left).toBeGreaterThan(gains.right);
  });

  it("should toggle mute", () => {
    expect(chain.isMuted).toBe(false);
    
    chain.toggleMute();
    expect(chain.isMuted).toBe(true);
    expect(chain.isActive).toBe(false);
    
    chain.toggleMute();
    expect(chain.isMuted).toBe(false);
  });

  it("should toggle solo", () => {
    expect(chain.isSolo).toBe(false);
    
    chain.toggleSolo();
    expect(chain.isSolo).toBe(true);
    
    chain.toggleSolo();
    expect(chain.isSolo).toBe(false);
  });

  it("should add devices", () => {
    const device: ChainDevice = {
      id: "device1",
      definition: mockPlugin,
      isRack: false,
      bypassed: false,
      frozen: false,
    };

    chain.addDevice(device);
    expect(chain.deviceCount).toBe(1);
    expect(chain.getDevice("device1")).toBe(device);
  });

  it("should remove devices", () => {
    const device: ChainDevice = {
      id: "device1",
      definition: mockPlugin,
      isRack: false,
      bypassed: false,
      frozen: false,
    };

    chain.addDevice(device);
    const removed = chain.removeDevice("device1");
    
    expect(removed).toBe(device);
    expect(chain.deviceCount).toBe(0);
  });

  it("should move devices", () => {
    const device1: ChainDevice = {
      id: "device1",
      definition: mockPlugin,
      isRack: false,
      bypassed: false,
      frozen: false,
    };
    const device2: ChainDevice = {
      id: "device2",
      definition: mockPlugin,
      isRack: false,
      bypassed: false,
      frozen: false,
    };

    chain.addDevice(device1);
    chain.addDevice(device2);
    
    chain.moveDevice("device2", 0);
    
    const devices = chain.devices;
    expect(devices[0]!.id).toBe("device2");
    expect(devices[1]!.id).toBe("device1");
  });

  it("should toggle device bypass", () => {
    const device: ChainDevice = {
      id: "device1",
      definition: mockPlugin,
      isRack: false,
      bypassed: false,
      frozen: false,
    };

    chain.addDevice(device);
    
    chain.toggleDeviceBypass("device1");
    expect(chain.getDevice("device1")!.bypassed).toBe(true);
    
    chain.toggleDeviceBypass("device1");
    expect(chain.getDevice("device1")!.bypassed).toBe(false);
  });

  it("should add sends", () => {
    const send = {
      id: "send1",
      targetId: "return1",
      level: 0.5,
      preFader: false,
      active: true,
    };

    chain.addSend(send);
    expect(chain.sends).toHaveLength(1);
  });

  it("should set send level", () => {
    const send = {
      id: "send1",
      targetId: "return1",
      level: 0,
      preFader: false,
      active: true,
    };

    chain.addSend(send);
    chain.setSendLevel("send1", 0.75);
    
    expect(chain.sends[0]!.level).toBe(0.75);
  });

  it("should evaluate zones", () => {
    const zones = chain.zones.getZones();
    zones.key.low = 40;
    zones.key.high = 80;
    zones.key.fadeLow = 40; // No fade - hard boundaries
    zones.key.fadeHigh = 80;
    chain.zones.setZones(zones);

    const result1 = chain.canTrigger({
      note: 60,
      velocity: 100,
      chainSelect: 0,
      channel: 0,
    });
    expect(result1).toBe(true);

    const result2 = chain.canTrigger({
      note: 20,
      velocity: 100,
      chainSelect: 0,
      channel: 0,
    });
    expect(result2).toBe(false);
  });

  it("should emit solo/mute/volume events", () => {
    const soloCallback = vi.fn();
    const muteCallback = vi.fn();
    const volumeCallback = vi.fn();

    chain.onSoloChanged(soloCallback);
    chain.onMuteChanged(muteCallback);
    chain.onVolumeChanged(volumeCallback);

    chain.toggleSolo();
    expect(soloCallback).toHaveBeenCalledWith(true);

    chain.toggleMute();
    expect(muteCallback).toHaveBeenCalledWith(true);

    chain.volume = -10;
    expect(volumeCallback).toHaveBeenCalledWith(-10);
  });

  it("should serialize and deserialize", () => {
    chain.volume = -6;
    chain.pan = 25;
    
    const json = chain.toJSON();
    expect(json.mixer.volume).toBe(-6);
    expect(json.mixer.pan).toBe(25);
  });
});
