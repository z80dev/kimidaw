import { describe, it, expect } from "vitest";
import { EQInstance } from "../../effects/EQ.js";

describe("EQ Effect", () => {
  it("should process audio without errors", () => {
    const eq = new EQInstance();
    eq.prepare({ sampleRate: 48000, blockSize: 128 });
    
    // Create mock buffers
    const inputL = new Float32Array(128).fill(0.5);
    const inputR = new Float32Array(128).fill(0.5);
    const outputL = new Float32Array(128);
    const outputR = new Float32Array(128);
    
    const mockInput = [{
      numberOfChannels: 2,
      length: 128,
      sampleRate: 48000,
      duration: 128 / 48000,
      getChannelData: (ch: number) => ch === 0 ? inputL : inputR,
      copyFrom: () => {},
      clear: () => {},
    }];
    
    const mockOutput = [{
      numberOfChannels: 2,
      length: 128,
      sampleRate: 48000,
      duration: 128 / 48000,
      getChannelData: (ch: number) => ch === 0 ? outputL : outputR,
      copyFrom: () => {},
      clear: () => {},
    }];
    
    eq.connect({ audioInputs: [], audioOutputs: [] });
    eq.process(mockInput as any, mockOutput as any, [], 128);
    
    // Output should be finite
    for (let i = 0; i < 128; i++) {
      expect(Number.isFinite(outputL[i])).toBe(true);
      expect(Number.isFinite(outputR[i])).toBe(true);
    }
  });

  it("should bypass when enabled", () => {
    const eq = new EQInstance();
    eq.prepare({ sampleRate: 48000, blockSize: 128 });
    
    // Set bypass
    eq.setParam("bypass", 1);
    
    const inputL = new Float32Array(128).fill(0.5);
    const outputL = new Float32Array(128);
    
    const mockInput = [{
      numberOfChannels: 1,
      length: 128,
      sampleRate: 48000,
      duration: 128 / 48000,
      getChannelData: () => inputL,
      copyFrom: () => {},
      clear: () => {},
    }];
    
    const mockOutput = [{
      numberOfChannels: 1,
      length: 128,
      sampleRate: 48000,
      duration: 128 / 48000,
      getChannelData: () => outputL,
      copyFrom: () => {},
      clear: () => {},
    }];
    
    eq.connect({ audioInputs: [], audioOutputs: [] });
    eq.process(mockInput as any, mockOutput as any, [], 128);
    
    // In bypass mode, output should equal input
    for (let i = 0; i < 128; i++) {
      expect(outputL[i]).toBeCloseTo(0.5, 5);
    }
  });

  it("should save and load state", async () => {
    const eq = new EQInstance();
    
    // Set some parameters
    eq.setParam("lowGain", 0.8);
    eq.setParam("highGain", 0.2);
    
    const state = await eq.saveState();
    
    const newEq = new EQInstance();
    await newEq.loadState(state);
    
    expect(newEq.getParam("lowGain")).toBe(0.8);
    expect(newEq.getParam("highGain")).toBe(0.2);
  });
});
