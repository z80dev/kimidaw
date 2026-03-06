import { describe, it, expect } from 'vitest';
import {
  PPQ,
  musicalTimeToTicks,
  ticksToMusicalTime,
  ticksToSamples,
  samplesToTicks,
  ticksToSeconds,
  secondsToTicks,
  formatTickPosition,
  parseTickPosition,
  tickToBeat,
  beatToTick,
  getTempoAtTick,
  type TempoEvent,
} from '../timing.js';

describe('timing', () => {
  describe('musicalTimeToTicks', () => {
    it('converts simple musical time to ticks', () => {
      const time = { bars: 1, beats: 2, ticks: 120 };
      const ticks = musicalTimeToTicks(time, 4);
      expect(ticks).toBe(1 * 4 * PPQ + 2 * PPQ + 120);
    });

    it('converts with different time signatures', () => {
      const time = { bars: 2, beats: 0, ticks: 0 };
      expect(musicalTimeToTicks(time, 4)).toBe(2 * 4 * PPQ); // 4/4
      expect(musicalTimeToTicks(time, 3)).toBe(2 * 3 * PPQ); // 3/4
    });

    it('handles zero values', () => {
      const time = { bars: 0, beats: 0, ticks: 0 };
      expect(musicalTimeToTicks(time)).toBe(0);
    });
  });

  describe('ticksToMusicalTime', () => {
    it('converts ticks to musical time', () => {
      const ticks = 1 * 4 * PPQ + 2 * PPQ + 120;
      const time = ticksToMusicalTime(ticks, 4);
      expect(time).toEqual({ bars: 1, beats: 2, ticks: 120 });
    });

    it('handles zero', () => {
      expect(ticksToMusicalTime(0)).toEqual({ bars: 0, beats: 0, ticks: 0 });
    });

    it('handles exact bar boundaries', () => {
      const ticks = 4 * PPQ; // One bar in 4/4
      const time = ticksToMusicalTime(ticks, 4);
      expect(time).toEqual({ bars: 1, beats: 0, ticks: 0 });
    });
  });

  describe('round-trip conversion', () => {
    it('preserves values through round-trip', () => {
      const original = { bars: 5, beats: 3, ticks: 480 };
      const ticks = musicalTimeToTicks(original, 4);
      const result = ticksToMusicalTime(ticks, 4);
      expect(result).toEqual(original);
    });
  });

  describe('ticksToSamples / samplesToTicks', () => {
    it('converts ticks to samples correctly', () => {
      const ticks = PPQ; // One beat
      const tempo = 120;
      const sampleRate = 48000;
      const samples = ticksToSamples(ticks, tempo, sampleRate);
      
      // At 120 BPM, one beat = 0.5 seconds = 24000 samples at 48k
      expect(samples).toBe(24000);
    });

    it('round-trips correctly', () => {
      const originalTicks = PPQ * 4; // One bar
      const tempo = 128;
      const sampleRate = 44100;
      
      const samples = ticksToSamples(originalTicks, tempo, sampleRate);
      const ticks = samplesToTicks(samples, tempo, sampleRate);
      
      // Allow for small rounding error (within 1 tick)
      expect(Math.abs(ticks - originalTicks)).toBeLessThanOrEqual(1);
    });
  });

  describe('ticksToSeconds / secondsToTicks', () => {
    it('converts ticks to seconds correctly', () => {
      const ticks = PPQ; // One beat
      const tempo = 120;
      const seconds = ticksToSeconds(ticks, tempo);
      
      expect(seconds).toBe(0.5); // 60/120 = 0.5s per beat
    });

    it('round-trips correctly', () => {
      const originalTicks = PPQ * 8;
      const tempo = 140;
      
      const seconds = ticksToSeconds(originalTicks, tempo);
      const ticks = secondsToTicks(seconds, tempo);
      
      expect(ticks).toBe(originalTicks);
    });
  });

  describe('formatTickPosition', () => {
    it('formats tick position correctly', () => {
      const ticks = 1 * 4 * PPQ + 2 * PPQ + 120; // 2:3.120 (1-indexed)
      expect(formatTickPosition(ticks, 4)).toBe('2:3.120');
    });

    it('formats zero correctly', () => {
      expect(formatTickPosition(0)).toBe('1:1.0');
    });
  });

  describe('parseTickPosition', () => {
    it('parses position string correctly', () => {
      const ticks = parseTickPosition('2:3.120');
      expect(ticks).toBe(1 * 4 * PPQ + 2 * PPQ + 120);
    });

    it('parses start position', () => {
      const ticks = parseTickPosition('1:1.0');
      expect(ticks).toBe(0);
    });

    it('throws on invalid format', () => {
      expect(() => parseTickPosition('invalid')).toThrow();
    });
  });

  describe('tickToBeat / beatToTick', () => {
    it('converts ticks to beats', () => {
      expect(tickToBeat(PPQ)).toBe(1);
      expect(tickToBeat(PPQ * 4)).toBe(4);
      expect(tickToBeat(PPQ / 2)).toBe(0.5);
    });

    it('converts beats to ticks', () => {
      expect(beatToTick(1)).toBe(PPQ);
      expect(beatToTick(4)).toBe(PPQ * 4);
      expect(beatToTick(0.5)).toBe(PPQ / 2);
    });

    it('round-trips correctly', () => {
      const original = 3.5;
      const ticks = beatToTick(original);
      const beats = tickToBeat(ticks);
      expect(beats).toBe(original);
    });
  });

  describe('getTempoAtTick', () => {
    it('returns default tempo for empty map', () => {
      expect(getTempoAtTick(0, [])).toBe(120);
      expect(getTempoAtTick(1000, [])).toBe(120);
    });

    it('returns correct tempo at position', () => {
      const tempoMap: TempoEvent[] = [
        { tick: 0, bpm: 120, curve: 'jump' },
        { tick: PPQ * 4, bpm: 140, curve: 'jump' },
        { tick: PPQ * 8, bpm: 128, curve: 'jump' },
      ];
      
      expect(getTempoAtTick(0, tempoMap)).toBe(120);
      expect(getTempoAtTick(PPQ * 2, tempoMap)).toBe(120);
      expect(getTempoAtTick(PPQ * 4, tempoMap)).toBe(140);
      expect(getTempoAtTick(PPQ * 6, tempoMap)).toBe(140);
      expect(getTempoAtTick(PPQ * 8, tempoMap)).toBe(128);
      expect(getTempoAtTick(PPQ * 16, tempoMap)).toBe(128);
    });
  });
});
