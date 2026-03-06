import { describe, it, expect } from "vitest";
import {
  SmoothedValue,
  ADSREnvelope,
  ADSRPhase,
  BiquadFilter,
  DelayLine,
  Oscillator,
  LFO,
  lerp,
  clamp,
  dbToLinear,
  linearToDb,
} from "../../core/DspBase.js";

describe("DSP Base Utilities", () => {
  describe("SmoothedValue", () => {
    it("should set target and smooth to it", () => {
      const sv = new SmoothedValue(0);
      sv.setTarget(1, 10, 48000);
      
      expect(sv.current).toBe(0);
      
      // Process several times
      for (let i = 0; i < 1000; i++) {
        sv.process();
      }
      
      expect(sv.current).toBeGreaterThan(0.5);
    });

    it("should set immediate value", () => {
      const sv = new SmoothedValue(0);
      sv.setImmediate(0.5);
      expect(sv.current).toBe(0.5);
      expect(sv.target).toBe(0.5);
    });
  });

  describe("ADSREnvelope", () => {
    it("should go through all phases", () => {
      const env = new ADSREnvelope({
        attack: 0.001,
        decay: 0.001,
        sustain: 0.5,
        release: 0.001,
      }, 48000);

      expect(env.phase).toBe(ADSRPhase.Idle);
      
      env.trigger();
      expect(env.phase).toBe(ADSRPhase.Attack);
      
      // Process through attack and decay
      for (let i = 0; i < 200; i++) env.process();
      expect(env.phase).toBe(ADSRPhase.Sustain);
      
      env.release();
      expect(env.phase).toBe(ADSRPhase.Release);
      
      // Process through release
      for (let i = 0; i < 200; i++) env.process();
      expect(env.phase).toBe(ADSRPhase.Idle);
    });

    it("should report isActive correctly", () => {
      const env = new ADSREnvelope({}, 48000);
      expect(env.isActive).toBe(false);
      
      env.trigger();
      expect(env.isActive).toBe(true);
      
      env.stop();
      expect(env.isActive).toBe(false);
    });
  });

  describe("BiquadFilter", () => {
    it("should process audio without NaN", () => {
      const filter = new BiquadFilter(48000);
      filter.setType("lowpass");
      filter.setFrequency(1000);
      filter.setQ(0.707);

      const input = new Float32Array([1, 0, -1, 0.5, -0.5]);
      const output = new Float32Array(5);
      
      filter.processBlock(input, output);
      
      for (const val of output) {
        expect(Number.isNaN(val)).toBe(false);
        expect(Number.isFinite(val)).toBe(true);
      }
    });

    it("should change filter type", () => {
      const filter = new BiquadFilter(48000);
      filter.setType("lowpass");
      filter.setType("highpass");
      filter.setType("bandpass");
      
      const sample = filter.process(1.0);
      expect(Number.isFinite(sample)).toBe(true);
    });
  });

  describe("DelayLine", () => {
    it("should delay signal correctly", () => {
      const delay = new DelayLine(0.1, 48000);
      
      // Write impulse
      delay.write(1);
      
      // Read at 1 sample delay
      expect(delay.read(1)).toBeGreaterThan(0);
      
      // Read at longer delay should be 0 (not written yet)
      expect(delay.read(10)).toBe(0);
    });

    it("should handle fractional delay with interpolation", () => {
      const delay = new DelayLine(0.1, 48000);
      
      delay.write(1);
      delay.write(0);
      
      // Fractional delay should interpolate
      const sample = delay.read(1.5);
      expect(sample).toBeGreaterThan(0);
      expect(sample).toBeLessThan(1);
    });
  });

  describe("Oscillator", () => {
    it("should generate different waveforms", () => {
      const osc = new Oscillator(48000);
      osc.setFrequency(440);
      
      const waves = ["sine", "triangle", "sawtooth", "square", "pulse"] as const;
      
      for (const wave of waves) {
        osc.setWaveform(wave);
        osc.reset();
        
        const samples: number[] = [];
        for (let i = 0; i < 100; i++) {
          samples.push(osc.process());
        }
        
        // Should produce varying output
        const min = Math.min(...samples);
        const max = Math.max(...samples);
        expect(max).toBeGreaterThan(min);
      }
    });

    it("should generate sine wave in correct range", () => {
      const osc = new Oscillator(48000);
      osc.setFrequency(440);
      osc.setWaveform("sine");
      
      for (let i = 0; i < 480; i++) {
        const sample = osc.process();
        expect(sample).toBeGreaterThanOrEqual(-1.01);
        expect(sample).toBeLessThanOrEqual(1.01);
      }
    });
  });

  describe("LFO", () => {
    it("should oscillate at correct rate", () => {
      const lfo = new LFO(48000);
      lfo.setRate(1); // 1 Hz
      
      // After 1 period (48000 samples at 48kHz)
      let peakValue = 0;
      for (let i = 0; i < 48000; i++) {
        peakValue = Math.max(peakValue, Math.abs(lfo.process()));
      }
      
      // Should have reached near 1
      expect(peakValue).toBeGreaterThan(0.9);
    });

    it("should support different waveforms", () => {
      const lfo = new LFO(48000);
      const waves = ["sine", "triangle", "square", "saw"] as const;
      
      for (const wave of waves) {
        lfo.setWaveform(wave);
        lfo.reset();
        
        const sample = lfo.process();
        expect(Number.isFinite(sample)).toBe(true);
      }
    });
  });

  describe("Math utilities", () => {
    it("lerp should interpolate correctly", () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 1)).toBe(10);
    });

    it("clamp should constrain values", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("dbToLinear should convert correctly", () => {
      expect(dbToLinear(0)).toBe(1);
      expect(dbToLinear(-6)).toBeCloseTo(0.5, 1);
      expect(dbToLinear(6)).toBeCloseTo(2, 0);
    });

    it("linearToDb should convert correctly", () => {
      expect(linearToDb(1)).toBe(0);
      expect(linearToDb(0.5)).toBeCloseTo(-6, 0);
      expect(linearToDb(0)).toBe(-Infinity);
    });
  });
});
