import { describe, it, expect, beforeEach } from 'vitest';
import {
  DelayLine,
  OnePoleFilter,
  BiquadFilter,
  ADSREnvelope,
  PercussiveEnvelope,
  LFO,
  NoiseGenerator,
  midiToFreq,
  dbToGain,
  clamp,
  lerp
} from './dsp.js';

describe('DSP Utilities', () => {
  const sampleRate = 44100;

  describe('DelayLine', () => {
    it('should delay signal by specified time', () => {
      const delay = new DelayLine(100, sampleRate);
      delay.setDelayTime(10); // 10ms
      
      // Send impulse
      const output1 = delay.process(1);
      expect(output1).toBe(0); // Should be silent initially
      
      // Process silence
      let impulseReached = false;
      for (let i = 0; i < 1000; i++) {
        const out = delay.process(0);
        if (out > 0.5) {
          impulseReached = true;
          break;
        }
      }
      expect(impulseReached).toBe(true);
    });
  });

  describe('OnePoleFilter', () => {
    it('should lowpass filter signal', () => {
      const filter = new OnePoleFilter();
      filter.setCutoff(1000, sampleRate);
      
      // Send high frequency content (alternating samples)
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        const input = i % 2 === 0 ? 1 : -1;
        sum += Math.abs(filter.process(input));
      }
      
      // Output should be significantly attenuated
      expect(sum / 1000).toBeLessThan(0.5);
    });
  });

  describe('BiquadFilter', () => {
    it('should act as lowpass', () => {
      const filter = new BiquadFilter();
      filter.setLowpass(1000, 1, sampleRate);
      
      // DC should pass through
      filter.reset();
      const dcOutput = filter.process(1);
      expect(dcOutput).toBeGreaterThan(0.5);
    });
  });

  describe('ADSREnvelope', () => {
    it('should go through all stages', () => {
      const env = new ADSREnvelope(sampleRate);
      env.setAttack(0.01);
      env.setDecay(0.1);
      env.setSustain(0.5);
      env.setRelease(0.1);
      
      env.trigger();
      
      // Attack
      expect(env.getState()).toBe('attack');
      
      // Process through attack
      let maxLevel = 0;
      for (let i = 0; i < 1000; i++) {
        const level = env.process();
        maxLevel = Math.max(maxLevel, level);
      }
      expect(maxLevel).toBeGreaterThan(0.9);
      
      // Release
      env.release();
      expect(env.getState()).toBe('release');
      
      // Process through release
      for (let i = 0; i < 10000; i++) {
        env.process();
      }
      
      expect(env.getState()).toBe('idle');
    });
  });

  describe('PercussiveEnvelope', () => {
    it('should decay to zero', () => {
      const env = new PercussiveEnvelope();
      env.setDecay(0.1, sampleRate);
      env.trigger(1);
      
      expect(env.isActive()).toBe(true);
      
      // Process until silent
      let lastLevel = 1;
      for (let i = 0; i < 20000 && env.isActive(); i++) {
        lastLevel = env.process();
      }
      
      expect(env.isActive()).toBe(false);
      expect(lastLevel).toBeLessThan(0.01);
    });
  });

  describe('LFO', () => {
    it('should produce sine wave', () => {
      const lfo = new LFO(sampleRate);
      lfo.setFrequency(10); // 10 Hz
      
      const samples: number[] = [];
      for (let i = 0; i < sampleRate / 10; i++) { // One period
        samples.push(lfo.process('sine'));
      }
      
      // Should have positive and negative values
      expect(Math.max(...samples)).toBeGreaterThan(0.5);
      expect(Math.min(...samples)).toBeLessThan(-0.5);
    });
  });

  describe('NoiseGenerator', () => {
    it('should produce random values', () => {
      const noise = new NoiseGenerator();
      
      const values = [];
      for (let i = 0; i < 100; i++) {
        values.push(noise.white());
      }
      
      // Should have variation
      const min = Math.min(...values);
      const max = Math.max(...values);
      expect(max - min).toBeGreaterThan(1);
    });
  });

  describe('Utility functions', () => {
    it('midiToFreq converts correctly', () => {
      expect(midiToFreq(69)).toBeCloseTo(440, 1);
      expect(midiToFreq(60)).toBeCloseTo(261.63, 1);
    });

    it('dbToGain converts correctly', () => {
      expect(dbToGain(0)).toBeCloseTo(1, 2);
      expect(dbToGain(-6)).toBeCloseTo(0.5, 1);
      expect(dbToGain(-12)).toBeCloseTo(0.25, 1);
    });

    it('clamp restricts values', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('lerp interpolates correctly', () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
      expect(lerp(0, 10, 0.5)).toBe(5);
    });
  });
});
