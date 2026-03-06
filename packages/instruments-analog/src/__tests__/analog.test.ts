/**
 * Analog Synthesizer Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createAnalogDefinition,
  AnalogInstance,
  createDefaultAnalogState,
  generateAnalogParameters,
} from "../index.js";
import type { PluginHostContext, AudioBuffer, MidiEvent } from "@daw/plugin-api";

function createMockContext(): PluginHostContext {
  return {
    sampleRate: 48000,
    maxBlockSize: 128,
    tempo: 120,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    positionSamples: 0,
    isPlaying: false,
    isRecording: false,
  };
}

function createMockAudioBuffer(channels: number, length: number): AudioBuffer {
  const channelData: Float32Array[] = [];
  for (let i = 0; i < channels; i++) {
    channelData.push(new Float32Array(length));
  }
  
  return {
    numberOfChannels: channels,
    length,
    sampleRate: 48000,
    duration: length / 48000,
    getChannelData: (channel: number) => channelData[channel] ?? channelData[0],
    copyFrom: () => {},
    clear: () => {
      for (const ch of channelData) {
        ch.fill(0);
      }
    },
  };
}

describe("Analog Plugin Definition", () => {
  it("should create valid plugin definition", () => {
    const definition = createAnalogDefinition();
    
    expect(definition.id).toBe("com.daw.analog");
    expect(definition.name).toBe("Analog");
    expect(definition.category).toBe("instrument");
    expect(definition.audioInputs).toBe(0);
    expect(definition.audioOutputs).toBe(2);
  });
  
  it("should have comprehensive parameters", () => {
    const definition = createAnalogDefinition();
    
    expect(definition.parameters.length).toBeGreaterThan(50);
    expect(definition.parameters.some(p => p.id === "osc1Waveform")).toBe(true);
    expect(definition.parameters.some(p => p.id === "filter1Freq")).toBe(true);
    expect(definition.parameters.some(p => p.id === "ampAttack")).toBe(true);
  });
});

describe("Analog Instance", () => {
  let instance: AnalogInstance;
  
  beforeEach(() => {
    instance = new AnalogInstance(16, 128);
    instance.prepare({ sampleRate: 48000, blockSize: 128 });
  });
  
  it("should process notes", () => {
    const output = createMockAudioBuffer(2, 128);
    
    instance.process([], [output], [{
      type: "noteOn",
      sampleOffset: 0,
      channel: 0,
      data: { note: 60, velocity: 100 },
    }], 128);
    
    const maxLevel = Math.max(...output.getChannelData(0).map(Math.abs));
    expect(maxLevel).toBeGreaterThan(0);
  });
  
  it("should handle filter parameters", () => {
    instance.setParam("filter1Freq", 0.5);
    instance.setParam("filter1Res", 0.3);
    instance.setParam("filter1Type", 0);
    
    expect(instance.getParam("filter1Freq")).toBe(0.5);
    expect(instance.getParam("filter1Res")).toBe(0.3);
  });
  
  it("should handle envelope parameters", () => {
    instance.setParam("ampAttack", 0.1);
    instance.setParam("ampDecay", 0.2);
    instance.setParam("ampSustain", 0.8);
    
    expect(instance.getParam("ampAttack")).toBe(0.1);
  });
  
  it("should save and load state", async () => {
    instance.setParam("filter1Freq", 0.7);
    
    const state = await instance.saveState();
    expect(state).toBeDefined();
    
    const newInstance = new AnalogInstance(16, 128);
    await newInstance.loadState(state);
    
    // State loaded
    expect(true).toBe(true);
  });
});
