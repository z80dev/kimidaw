import { describe, it, expect, beforeEach } from "vitest";
import {
  lerp,
  clamp,
  dbToLinear,
  linearToDb,
  midiToFreq,
  freqToMidi,
  SmoothedParameter,
  RMSDetector,
  EnvelopeFollower,
  DelayLine,
  LFO,
  DCFilter,
  whiteNoise,
} from "../core/DspUtils.js";

describe("DSP Utils", () => {
  describe("Math utilities", () => {
    it("lerp interpolates correctly", () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 1)).toBe(10);
    });

    it("clamps values correctly", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe("dB conversions", () => {
    it("converts dB to linear", () => {
      expect(dbToLinear(0)).toBe(1);
      expect(dbToLinear(-6)).toBeCloseTo(0.5, 2);
      expect(dbToLinear(-12)).toBeCloseTo(0.25, 2);
      expect(dbToLinear(-100)).toBe(0);
    });

    it("converts linear to dB", () => {
      expect(linearToDb(1)).toBe(0);
      expect(linearToDb(0.5)).toBeCloseTo(-6, 1);
      expect(linearToDb(0)).toBe(-Infinity);
    });
  });

  describe("Frequency conversions", () => {
    it("converts MIDI to frequency", () => {
      expect(midiToFreq(69)).toBe(440);
      expect(midiToFreq(60)).toBeCloseTo(261.63, 1);
      expect(midiToFreq(57)).toBeCloseTo(220, 1);
    });

    it("converts frequency to MIDI", () => {
      expect(freqToMidi(440)).toBe(69);
      expect(freqToMidi(261.63)).toBeCloseTo(60, 0);
      expect(freqToMidi(220)).toBeCloseTo(57, 0);
    });
  });

  describe("SmoothedParameter", () => {
    it("sets and gets values", () => {
      const param = new SmoothedParameter(0, 0, 48000);
      param.setImmediate(0.5);
      expect(param.current).toBe(0.5);
    });

    it("processes smoothing", () => {
      const param = new SmoothedParameter(0, 10, 48000);
      param.setTarget(1, 10, 48000);
      
      // Process a few samples
      for (let i = 0; i < 100; i++) {
        param.process();
      }
      
      expect(param.current).toBeGreaterThan(0);
      expect(param.current).toBeLessThan(1);
    });
  });

  describe("EnvelopeFollower", () => {
    it("follows envelope correctly", () => {
      const env = new EnvelopeFollower();
      env.setAttack(1, 48000);
      env.setRelease(10, 48000);
      
      // Process impulse
      let result = env.process(1);
      expect(result).toBeGreaterThan(0);
      
      // Process silence
      for (let i = 0; i < 1000; i++) {
        result = env.process(0);
      }
      expect(result).toBeLessThan(0.01);
    });
  });

  describe("DelayLine", () => {
    it("delays signal correctly", () => {
      const delay = new DelayLine(0.1, 48000);
      
      // Write impulse
      delay.write(1);
      delay.write(0);
      delay.write(0);
      
      // Read back
      const delayed = delay.read(3); // 3 samples
      expect(delayed).toBeGreaterThan(0);
    });

    it("supports fractional delay", () => {
      const delay = new DelayLine(0.1, 48000);
      
      delay.write(1);
      delay.write(0);
      
      const delayed1 = delay.read(1);
      const delayed1_5 = delay.read(1.5);
      
      expect(delayed1_5).toBeGreaterThan(0);
      expect(delayed1_5).toBeLessThan(delayed1);
    });
  });

  describe("LFO", () => {
    it("produces expected waveforms", () => {
      const lfo = new LFO(48000);
      lfo.setRate(1);
      lfo.setWaveform("sine");
      
      // Process half period (should go from 0 to ~0)
      let sum = 0;
      for (let i = 0; i < 24000; i++) {
        sum += lfo.process();
      }
      
      // Average should be near 0 for sine
      expect(Math.abs(sum / 24000)).toBeLessThan(0.1);
    });
  });

  describe("DCFilter", () => {
    it("removes DC offset", () => {
      const filter = new DCFilter();
      filter.setCutoff(20, 48000);
      
      // Process DC input
      let output = 0;
      for (let i = 0; i < 1000; i++) {
        output = filter.process(1);
      }
      
      expect(Math.abs(output)).toBeLessThan(0.1);
    });
  });
});
