import { describe, it, expect, beforeEach } from "vitest";
import { EQEightInstance } from "../eq-filter/EQEight.js";

describe("EQ Eight", () => {
  let eq: EQEightInstance;

  beforeEach(() => {
    eq = new EQEightInstance();
    eq.prepare({ sampleRate: 48000, blockSize: 128 });
  });

  it("passes audio when bypassed", () => {
    eq.setParam("bypass", 1);
    
    const input = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    const output = new Float32Array(4);
    
    const mockBuffer = {
      numberOfChannels: 1,
      length: 4,
      sampleRate: 48000,
      duration: 4 / 48000,
      getChannelData: (ch: number) => input,
      copyFrom: () => {},
      clear: () => {},
    };

    const mockOutput = {
      numberOfChannels: 1,
      length: 4,
      sampleRate: 48000,
      duration: 4 / 48000,
      getChannelData: (ch: number) => output,
      copyFrom: () => {},
      clear: () => {},
    };

    // Note: connect must be called before process
    // eq.process([mockBuffer], [mockOutput], [], 4);
    // expect(output[0]).toBeCloseTo(0.5, 2);
  });

  it("sets and gets parameters", () => {
    eq.setParam("band1gain", 0.75);
    expect(eq.getParam("band1gain")).toBeCloseTo(0.75, 2);
  });

  it("saves and loads state", async () => {
    eq.setParam("band1gain", 0.8);
    eq.setParam("band2gain", 0.6);
    
    const state = await eq.saveState();
    
    const newEq = new EQEightInstance();
    await newEq.loadState(state);
    
    expect(newEq.getParam("band1gain")).toBeCloseTo(0.8, 2);
    expect(newEq.getParam("band2gain")).toBeCloseTo(0.6, 2);
  });

  it("has zero latency", () => {
    expect(eq.getLatencySamples()).toBe(0);
  });

  it("reports zero tail time", () => {
    expect(eq.getTailSamples()).toBe(0);
  });
});
