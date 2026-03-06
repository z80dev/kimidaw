/**
 * Impulse Drum Sampler Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createImpulseDefinition,
  ImpulseInstance,
  createDefaultImpulseState,
} from "../index.js";
import type { AudioBuffer, MidiEvent } from "@daw/plugin-api";

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

function createTestSample(length: number): Float32Array[] {
  const sample = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    sample[i] = Math.sin(2 * Math.PI * 440 * i / 48000) * Math.exp(-i / (length / 5));
  }
  return [sample];
}

describe("Impulse Plugin Definition", () => {
  it("should create valid plugin definition", () => {
    const definition = createImpulseDefinition();
    
    expect(definition.id).toBe("com.daw.impulse");
    expect(definition.name).toBe("Impulse");
    expect(definition.category).toBe("instrument");
    expect(definition.audioInputs).toBe(0);
    expect(definition.audioOutputs).toBe(2);
  });
  
  it("should have 8 slot parameters plus global", () => {
    const definition = createImpulseDefinition();
    
    expect(definition.parameters.length).toBeGreaterThan(80);
    expect(definition.parameters.some(p => p.id === "slot1Volume")).toBe(true);
    expect(definition.parameters.some(p => p.id === "slot8Volume")).toBe(true);
    expect(definition.parameters.some(p => p.id === "globalGain")).toBe(true);
  });
});

describe("Impulse Instance", () => {
  let instance: ImpulseInstance;
  
  beforeEach(() => {
    instance = new ImpulseInstance(128);
    instance.prepare({ sampleRate: 48000, blockSize: 128 });
  });
  
  it("should load and play samples", () => {
    // Load a sample into slot 0
    const sampleData = createTestSample(48000);
    instance.loadSample(0, sampleData, 48000);
    
    const output = createMockAudioBuffer(2, 128);
    
    // Trigger note 36 (mapped to slot 0 by default)
    instance.process([], [output], [{
      type: "noteOn",
      sampleOffset: 0,
      channel: 0,
      data: { note: 36, velocity: 100 },
    }], 128);
    
    // Process a few more blocks
    for (let i = 0; i < 5; i++) {
      instance.process([], [output], [], 128);
    }
    
    const maxLevel = Math.max(...output.getChannelData(0).map(Math.abs));
    expect(maxLevel).toBeGreaterThan(0);
  });
  
  it("should handle slot parameters", () => {
    instance.setParam("slot1Volume", 0.9);
    instance.setParam("slot1Pan", 0.3);
    instance.setParam("slot1Filter", 0.7);
    
    expect(instance.getParam("slot1Volume")).toBe(0.9);
    expect(instance.getParam("slot1Pan")).toBe(0.3);
  });
  
  it("should handle global parameters", () => {
    instance.setParam("globalGain", 0.8);
    instance.setParam("globalTranspose", 0.5);
    
    expect(instance.getParam("globalGain")).toBe(0.8);
  });
  
  it("should save and load state", async () => {
    instance.setParam("slot1Volume", 0.9);
    
    const state = await instance.saveState();
    expect(state.slots).toHaveLength(8);
    
    const newInstance = new ImpulseInstance(128);
    await newInstance.loadState(state);
  });
});
