import { describe, it, expect } from 'vitest';
import {
  PPQ,
  ticksToSamples,
  samplesToTicks,
  ticksToSeconds,
  secondsToTicks,
  beatDurationSamples,
  tickDurationSamples,
  ticksToBeats,
  beatsToTicks,
  musicalTimeToTicks,
  ticksToMusicalTime,
  TempoMap,
  quantizeTicks,
  GridTicks,
} from '../timing.js';

describe('Timing conversions', () => {
  const sampleRate = 48000;
  const bpm = 120;
  
  describe('ticksToSamples', () => {
    it('converts one beat correctly at 120 BPM', () => {
      const samples = ticksToSamples(PPQ, bpm, sampleRate);
      // At 120 BPM, one beat = 0.5 seconds = 24000 samples at 48kHz
      expect(samples).toBe(24000);
    });
    
    it('converts one bar (4 beats) correctly', () => {
      const samples = ticksToSamples(PPQ * 4, bpm, sampleRate);
      expect(samples).toBe(96000);
    });
    
    it('handles zero ticks', () => {
      expect(ticksToSamples(0, bpm, sampleRate)).toBe(0);
    });
  });
  
  describe('samplesToTicks', () => {
    it('converts one beat duration back to ticks', () => {
      const beatSamples = beatDurationSamples(bpm, sampleRate);
      const ticks = samplesToTicks(beatSamples, bpm, sampleRate);
      expect(Math.round(ticks)).toBe(PPQ);
    });
    
    it('is inverse of ticksToSamples', () => {
      const originalTicks = PPQ * 8; // 2 bars
      const samples = ticksToSamples(originalTicks, bpm, sampleRate);
      const recoveredTicks = samplesToTicks(samples, bpm, sampleRate);
      expect(Math.round(recoveredTicks)).toBe(originalTicks);
    });
  });
  
  describe('ticksToSeconds / secondsToTicks', () => {
    it('converts one beat to 0.5 seconds at 120 BPM', () => {
      const seconds = ticksToSeconds(PPQ, bpm);
      expect(seconds).toBe(0.5);
    });
    
    it('is inverse operation', () => {
      const originalTicks = PPQ * 4;
      const seconds = ticksToSeconds(originalTicks, bpm);
      const recoveredTicks = secondsToTicks(seconds, bpm);
      expect(recoveredTicks).toBeCloseTo(originalTicks, 5);
    });
  });
  
  describe('beatDurationSamples', () => {
    it('returns correct samples per beat at 120 BPM 48kHz', () => {
      const duration = beatDurationSamples(bpm, sampleRate);
      expect(duration).toBe(24000);
    });
    
    it('doubles at 60 BPM', () => {
      const duration120 = beatDurationSamples(120, sampleRate);
      const duration60 = beatDurationSamples(60, sampleRate);
      expect(duration60).toBe(duration120 * 2);
    });
  });
  
  describe('ticksToBeats / beatsToTicks', () => {
    it('converts PPQ ticks to 1 beat', () => {
      expect(ticksToBeats(PPQ)).toBe(1);
    });
    
    it('converts 4 beats to 4*PPQ ticks', () => {
      expect(beatsToTicks(4)).toBe(PPQ * 4);
    });
    
    it('handles fractional beats', () => {
      expect(ticksToBeats(PPQ / 2)).toBe(0.5);
      expect(beatsToTicks(0.25)).toBe(PPQ / 4);
    });
  });
  
  describe('musicalTimeToTicks', () => {
    it('converts bar 1 beat 1 tick 0 to 0 total ticks', () => {
      const ticks = musicalTimeToTicks(1, 1, 0, 4);
      expect(ticks).toBe(0);
    });
    
    it('converts bar 2 beat 1 tick 0 to one bar of ticks', () => {
      const ticks = musicalTimeToTicks(2, 1, 0, 4);
      expect(ticks).toBe(PPQ * 4);
    });
    
    it('converts bar 1 beat 2 tick 0 to one beat of ticks', () => {
      const ticks = musicalTimeToTicks(1, 2, 0, 4);
      expect(ticks).toBe(PPQ);
    });
    
    it('handles 3/4 time signature', () => {
      // Bar 2 beat 1 should be 3 beats worth of ticks in 3/4
      const ticks = musicalTimeToTicks(2, 1, 0, 3);
      expect(ticks).toBe(PPQ * 3);
    });
  });
  
  describe('ticksToMusicalTime', () => {
    it('converts 0 ticks to bar 1 beat 1', () => {
      const time = ticksToMusicalTime(0, 4);
      expect(time).toEqual({ bars: 1, beats: 1, ticks: 0 });
    });
    
    it('converts one bar of ticks to bar 2 beat 1', () => {
      const time = ticksToMusicalTime(PPQ * 4, 4);
      expect(time).toEqual({ bars: 2, beats: 1, ticks: 0 });
    });
    
    it('converts ticks within a bar correctly', () => {
      const time = ticksToMusicalTime(PPQ + PPQ / 2, 4);
      expect(time.bars).toBe(1);
      expect(time.beats).toBe(2);
      expect(time.ticks).toBe(PPQ / 2);
    });
  });
  
  describe('round-trip musical time', () => {
    it('preserves musical time through conversion', () => {
      const original = { bars: 5, beats: 3, ticks: PPQ / 2 };
      const totalTicks = musicalTimeToTicks(original.bars, original.beats, original.ticks, 4);
      const recovered = ticksToMusicalTime(totalTicks, 4);
      
      expect(recovered.bars).toBe(original.bars);
      expect(recovered.beats).toBe(original.beats);
      expect(recovered.ticks).toBe(original.ticks);
    });
  });
});

describe('TempoMap', () => {
  const sampleRate = 48000;
  
  it('initializes with default tempo at tick 0', () => {
    const map = new TempoMap([], sampleRate);
    expect(map.getTempoAtTick(0)).toBe(120);
  });
  
  it('returns correct tempo at various positions', () => {
    const events = [
      { tick: 0, bpm: 120 },
      { tick: PPQ * 4, bpm: 140 }, // Bar 2
      { tick: PPQ * 8, bpm: 100 }, // Bar 3
    ];
    const map = new TempoMap(events, sampleRate);
    
    expect(map.getTempoAtTick(0)).toBe(120);
    expect(map.getTempoAtTick(PPQ * 2)).toBe(120); // Middle of bar 1
    expect(map.getTempoAtTick(PPQ * 4)).toBe(140); // Bar 2
    expect(map.getTempoAtTick(PPQ * 6)).toBe(140); // Middle of bar 2
    expect(map.getTempoAtTick(PPQ * 8)).toBe(100); // Bar 3
    expect(map.getTempoAtTick(PPQ * 12)).toBe(100); // After bar 3
  });
  
  it('converts ticks to samples with variable tempo', () => {
    // Simple case: constant tempo
    const map = new TempoMap([{ tick: 0, bpm: 120 }], sampleRate);
    const samples = map.ticksToSamples(PPQ);
    
    // At 120 BPM, one beat = 24000 samples
    expect(samples).toBeCloseTo(24000, 0);
  });
  
  it('converts samples to ticks with variable tempo', () => {
    const map = new TempoMap([{ tick: 0, bpm: 120 }], sampleRate);
    const ticks = map.samplesToTicks(24000);
    
    expect(Math.round(ticks)).toBe(PPQ);
  });
});

describe('quantizeTicks', () => {
  it('fully quantizes to grid when strength is 1', () => {
    const input = PPQ / 2 + 100; // Off-grid
    const quantized = quantizeTicks(input, PPQ, 1);
    expect(quantized).toBe(PPQ); // Rounded to nearest beat
  });
  
  it('does not quantize when strength is 0', () => {
    const input = PPQ / 2 + 100;
    const quantized = quantizeTicks(input, PPQ, 0);
    expect(quantized).toBe(input);
  });
  
  it('partially quantizes with 0.5 strength', () => {
    const input = PPQ / 2 + 100; // 580 ticks (PPQ=960)
    const quantized = quantizeTicks(input, PPQ, 0.5);
    const expected = input + (PPQ - input) * 0.5; // Halfway to grid
    expect(quantized).toBe(expected);
  });
  
  it('works with various grid sizes', () => {
    const input = PPQ / 4 + 50; // Off 16th note grid
    
    const to16th = quantizeTicks(input, GridTicks.sixteenth, 1);
    expect(to16th).toBe(PPQ / 4);
    
    const to8th = quantizeTicks(input, GridTicks.eighth, 1);
    expect(to8th).toBe(PPQ / 2);
  });
});
