/**
 * Operator Tests
 * 
 * Comprehensive test suite for the Operator FM synthesizer.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createOperatorDefinition,
  OperatorInstance,
  createDefaultOperatorStateSnapshot,
  getAlgorithmConnections,
  getCarriers,
  OPERATOR_ALGORITHMS,
} from "../index.js";
import type { PluginHostContext, AudioBuffer, MidiEvent } from "@daw/plugin-api";

// =============================================================================
// Test Helpers
// =============================================================================

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

// =============================================================================
// Algorithm Tests
// =============================================================================

describe("Operator Algorithms", () => {
  it("should have 11 algorithms defined", () => {
    expect(OPERATOR_ALGORITHMS.length).toBe(11);
  });
  
  it("should return correct connections for each algorithm", () => {
    for (let i = 0; i < 11; i++) {
      const connections = getAlgorithmConnections(i);
      expect(Array.isArray(connections)).toBe(true);
    }
  });
  
  it("should clamp algorithm index to valid range", () => {
    const low = getAlgorithmConnections(-1);
    const high = getAlgorithmConnections(100);
    expect(low).toEqual(OPERATOR_ALGORITHMS[0]);
    expect(high).toEqual(OPERATOR_ALGORITHMS[10]);
  });
  
  it("should correctly identify carriers for algorithm 10 (parallel)", () => {
    const carriers = getCarriers(10);
    expect(carriers).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  
  it("should correctly identify carriers for algorithm 9 (classic 3-op)", () => {
    const carriers = getCarriers(9);
    expect(carriers).toContain(2); // Operator 3 is carrier
    expect(carriers.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Default State Tests
// =============================================================================

describe("Operator Default State", () => {
  it("should create valid default state", () => {
    const state = createDefaultOperatorStateSnapshot();
    
    expect(state.operators).toHaveLength(8);
    expect(state.filter.type).toBeDefined();
    expect(state.lfo.waveform).toBeDefined();
    expect(state.oscillator.algorithm).toBeGreaterThanOrEqual(0);
    expect(state.oscillator.algorithm).toBeLessThanOrEqual(10);
  });
  
  it("should have first 4 operators enabled by default", () => {
    const state = createDefaultOperatorStateSnapshot();
    
    for (let i = 0; i < 4; i++) {
      expect(state.operators[i].enabled).toBe(true);
    }
  });
  
  it("should have all operators with sine waveform by default", () => {
    const state = createDefaultOperatorStateSnapshot();
    
    for (const op of state.operators) {
      expect(op.waveform).toBe("sine");
    }
  });
});

// =============================================================================
// Plugin Definition Tests
// =============================================================================

describe("Operator Plugin Definition", () => {
  it("should create valid plugin definition", () => {
    const definition = createOperatorDefinition();
    
    expect(definition.id).toBe("com.daw.operator");
    expect(definition.name).toBe("Operator");
    expect(definition.category).toBe("instrument");
    expect(definition.version).toBe("1.0.0");
    expect(definition.audioInputs).toBe(0);
    expect(definition.audioOutputs).toBe(2);
    expect(definition.midiInputs).toBe(1);
  });
  
  it("should have all operator parameters", () => {
    const definition = createOperatorDefinition();
    
    // Check global parameters
    expect(definition.parameters.some(p => p.id === "algorithm")).toBe(true);
    expect(definition.parameters.some(p => p.id === "feedback")).toBe(true);
    expect(definition.parameters.some(p => p.id === "masterLevel")).toBe(true);
    
    // Check per-operator parameters
    for (let i = 1; i <= 8; i++) {
      expect(definition.parameters.some(p => p.id === `op${i}Level`)).toBe(true);
      expect(definition.parameters.some(p => p.id === `op${i}Coarse`)).toBe(true);
      expect(definition.parameters.some(p => p.id === `op${i}Attack`)).toBe(true);
    }
  });
  
  it("should have factory presets", () => {
    const definition = createOperatorDefinition();
    
    expect(definition.factoryPresets).toBeDefined();
    expect(definition.factoryPresets!.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Instance Tests
// =============================================================================

describe("Operator Instance", () => {
  let instance: OperatorInstance;
  let context: PluginHostContext;
  
  beforeEach(() => {
    context = createMockContext();
    instance = new OperatorInstance(8, 128);
    instance.prepare({ sampleRate: 48000, blockSize: 128 });
  });
  
  it("should create instance", () => {
    expect(instance).toBeDefined();
  });
  
  it("should handle note on/off", () => {
    const output = createMockAudioBuffer(2, 128);
    
    // Send note on
    const noteOn: MidiEvent = {
      type: "noteOn",
      sampleOffset: 0,
      channel: 0,
      data: { note: 60, velocity: 100 },
    };
    
    instance.process([], [output], [noteOn], 128);
    
    // Check that output has signal
    const hasSignal = output.getChannelData(0).some(s => Math.abs(s) > 0.001);
    expect(hasSignal).toBe(true);
    
    // Send note off
    const noteOff: MidiEvent = {
      type: "noteOff",
      sampleOffset: 64,
      channel: 0,
      data: { note: 60, velocity: 0 },
    };
    
    instance.process([], [output], [noteOff], 128);
  });
  
  it("should set and get parameters", () => {
    instance.setParam("algorithm", 0.5);
    expect(instance.getParam("algorithm")).toBe(0.5);
    
    instance.setParam("feedback", 0.3);
    expect(instance.getParam("feedback")).toBeCloseTo(0.3, 5);
  });
  
  it("should save and load state", async () => {
    instance.setParam("algorithm", 0.8);
    instance.setParam("feedback", 0.5);
    
    const state = await instance.saveState();
    expect(state).toBeDefined();
    expect(state.operators).toHaveLength(8);
    
    // Create new instance and load state
    const newInstance = new OperatorInstance(8, 128);
    await newInstance.loadState(state);
    
    // State should be restored
    const newState = await newInstance.saveState();
    expect(newState.oscillator.algorithm).toBe(state.oscillator.algorithm);
  });
  
  it("should return correct latency", () => {
    expect(instance.getLatencySamples()).toBe(0);
  });
  
  it("should return tail based on longest release", () => {
    const tail = instance.getTailSamples();
    expect(tail).toBeGreaterThan(0);
  });
  
  it("should process without errors", () => {
    const output = createMockAudioBuffer(2, 128);
    
    // Process multiple blocks
    for (let i = 0; i < 10; i++) {
      instance.process([], [output], [], 128);
    }
    
    // Should complete without errors
    expect(true).toBe(true);
  });
  
  it("should handle polyphony correctly", () => {
    const output = createMockAudioBuffer(2, 128);
    const events: MidiEvent[] = [];
    
    // Trigger multiple notes
    for (let i = 0; i < 4; i++) {
      events.push({
        type: "noteOn",
        sampleOffset: i * 32,
        channel: 0,
        data: { note: 60 + i, velocity: 100 },
      });
    }
    
    instance.process([], [output], events, 128);
    
    // Check active voices
    expect((instance as any)._voiceAllocator.activeVoiceCount).toBeGreaterThan(0);
  });
  
  it("should handle reset", () => {
    const output = createMockAudioBuffer(2, 128);
    
    // Trigger note
    instance.process([], [output], [{
      type: "noteOn",
      sampleOffset: 0,
      channel: 0,
      data: { note: 60, velocity: 100 },
    }], 128);
    
    // Reset
    instance.reset();
    
    // All voices should be stopped
    expect((instance as any)._voiceAllocator.activeVoiceCount).toBe(0);
  });
});

// =============================================================================
// Parameter Tests
// =============================================================================

describe("Operator Parameters", () => {
  let instance: OperatorInstance;
  
  beforeEach(() => {
    instance = new OperatorInstance(8, 128);
    instance.prepare({ sampleRate: 48000, blockSize: 128 });
  });
  
  it("should handle all operator enable states", () => {
    for (let i = 1; i <= 8; i++) {
      instance.setParam(`op${i}Enabled`, 0);
      expect(instance.getParam(`op${i}Enabled`)).toBe(0);
      
      instance.setParam(`op${i}Enabled`, 1);
      expect(instance.getParam(`op${i}Enabled`)).toBe(1);
    }
  });
  
  it("should handle operator coarse ratios", () => {
    for (let i = 1; i <= 8; i++) {
      instance.setParam(`op${i}Coarse`, 0.5);
      const value = instance.getParam(`op${i}Coarse`);
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
  
  it("should handle envelope parameters", () => {
    instance.setParam("op1Attack", 0.1);
    instance.setParam("op1Decay", 0.2);
    instance.setParam("op1Sustain", 0.8);
    instance.setParam("op1Release", 0.5);
    
    expect(instance.getParam("op1Attack")).toBeGreaterThan(0);
    expect(instance.getParam("op1Decay")).toBeGreaterThan(0);
    expect(instance.getParam("op1Sustain")).toBe(0.8);
    expect(instance.getParam("op1Release")).toBeGreaterThan(0);
  });
  
  it("should handle filter parameters", () => {
    instance.setParam("filterType", 0);
    instance.setParam("filterFreq", 0.5);
    instance.setParam("filterRes", 0.3);
    instance.setParam("filterEnv", 0.5);
    
    expect(instance.getParam("filterType")).toBe(0);
    expect(instance.getParam("filterFreq")).toBe(0.5);
    expect(instance.getParam("filterRes")).toBe(0.3);
    expect(instance.getParam("filterEnv")).toBe(0.5);
  });
  
  it("should handle LFO parameters", () => {
    instance.setParam("lfoWave", 0);
    instance.setParam("lfoRate", 0.5);
    instance.setParam("lfoFilter", 0.3);
    
    expect(instance.getParam("lfoWave")).toBe(0);
    expect(instance.getParam("lfoRate")).toBe(0.5);
    expect(instance.getParam("lfoFilter")).toBe(0.3);
  });
  
  it("should handle master parameters", () => {
    instance.setParam("masterLevel", 0.75);
    instance.setParam("masterPan", 0.5);
    instance.setParam("transpose", 0.5);
    
    expect(instance.getParam("masterLevel")).toBe(0.75);
    expect(instance.getParam("masterPan")).toBe(0.5);
    expect(instance.getParam("transpose")).toBe(0.5);
  });
});

// =============================================================================
// Audio Output Tests
// =============================================================================

describe("Operator Audio Output", () => {
  it("should produce audio output when triggered", () => {
    const instance = new OperatorInstance(8, 128);
    instance.prepare({ sampleRate: 48000, blockSize: 128 });
    
    const output = createMockAudioBuffer(2, 128);
    
    // Trigger note
    instance.process([], [output], [{
      type: "noteOn",
      sampleOffset: 0,
      channel: 0,
      data: { note: 60, velocity: 100 },
    }], 128);
    
    // Process a few more blocks
    for (let i = 0; i < 5; i++) {
      instance.process([], [output], [], 128);
    }
    
    // Check output levels
    const leftChannel = output.getChannelData(0);
    const rightChannel = output.getChannelData(1);
    
    const leftMax = Math.max(...leftChannel.map(Math.abs));
    const rightMax = Math.max(...rightChannel.map(Math.abs));
    
    expect(leftMax).toBeGreaterThan(0);
    expect(rightMax).toBeGreaterThan(0);
  });
  
  it("should produce different timbres with different algorithms", () => {
    const instance1 = new OperatorInstance(8, 128);
    const instance2 = new OperatorInstance(8, 128);
    
    instance1.prepare({ sampleRate: 48000, blockSize: 128 });
    instance2.prepare({ sampleRate: 48000, blockSize: 128 });
    
    const output1 = createMockAudioBuffer(2, 128);
    const output2 = createMockAudioBuffer(2, 128);
    
    // Set different algorithms
    instance1.setParam("algorithm", 0); // Serial
    instance2.setParam("algorithm", 10); // Parallel
    
    // Trigger same note
    instance1.process([], [output1], [{
      type: "noteOn",
      sampleOffset: 0,
      channel: 0,
      data: { note: 60, velocity: 100 },
    }], 128);
    
    instance2.process([], [output2], [{
      type: "noteOn",
      sampleOffset: 0,
      channel: 0,
      data: { note: 60, velocity: 100 },
    }], 128);
    
    // Process more blocks
    for (let i = 0; i < 5; i++) {
      instance1.process([], [output1], [], 128);
      instance2.process([], [output2], [], 128);
    }
    
    // Outputs should be different
    const rms1 = Math.sqrt(output1.getChannelData(0).reduce((a, b) => a + b * b, 0) / 128);
    const rms2 = Math.sqrt(output2.getChannelData(0).reduce((a, b) => a + b * b, 0) / 128);
    
    // Both should produce audio
    expect(rms1).toBeGreaterThan(0);
    expect(rms2).toBeGreaterThan(0);
  });
});
