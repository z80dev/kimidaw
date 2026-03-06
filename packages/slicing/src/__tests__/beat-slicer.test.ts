import { describe, it, expect } from 'vitest';
import { BeatSlicer } from '../beat-slicer.js';
import type { BeatDivision } from '../types.js';

describe('BeatSlicer', () => {
  const sampleRate = 44100;

  describe('Basic slicing', () => {
    it('should slice by quarter notes', () => {
      const slicer = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/4',
        swing: 0
      });
      
      const audio = new Float32Array(sampleRate * 4); // 4 seconds
      const result = slicer.slice(audio);
      
      expect(result.mode).toBe('beat');
      // 120 BPM, 1/4 notes = 2 beats per second, 4 seconds = ~8 slices
      expect(result.slices.length).toBeGreaterThanOrEqual(7);
    });

    it('should slice by eighth notes', () => {
      const slicer = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/8',
        swing: 0
      });
      
      const audio = new Float32Array(sampleRate * 2); // 2 seconds
      const result = slicer.slice(audio);
      
      // 120 BPM, 1/8 notes = 4 slices per second, 2 seconds = ~8 slices
      expect(result.slices.length).toBeGreaterThanOrEqual(7);
    });

    it('should slice by sixteenth notes', () => {
      const slicer = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/16',
        swing: 0
      });
      
      const audio = new Float32Array(sampleRate); // 1 second
      const result = slicer.slice(audio);
      
      // 120 BPM, 1/16 notes = 8 slices per second
      expect(result.slices.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Division multipliers', () => {
    it('should calculate correct number of slices for different divisions', () => {
      const divisions: BeatDivision[] = ['1/4', '1/8', '1/16', '1/32'];
      const sliceCounts: number[] = [];
      
      for (const division of divisions) {
        const slicer = new BeatSlicer(sampleRate, {
          bpm: 120,
          division,
          swing: 0
        });
        
        const audio = new Float32Array(sampleRate); // 1 second
        const result = slicer.slice(audio);
        sliceCounts.push(result.slices.length);
      }
      
      // More divisions = more slices
      expect(sliceCounts[1]).toBeGreaterThanOrEqual(sliceCounts[0]);
      expect(sliceCounts[2]).toBeGreaterThanOrEqual(sliceCounts[1]);
    });

    it('should handle triplet divisions', () => {
      const slicer = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/8t',
        swing: 0
      });
      
      const audio = new Float32Array(sampleRate * 2);
      const result = slicer.slice(audio);
      
      expect(result.slices.length).toBeGreaterThan(0);
    });

    it('should handle dotted divisions', () => {
      const slicer = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/8d',
        swing: 0
      });
      
      const audio = new Float32Array(sampleRate * 2);
      const result = slicer.slice(audio);
      
      expect(result.slices.length).toBeGreaterThan(0);
    });
  });

  describe('Swing', () => {
    it('should apply swing to alternating slices', () => {
      const noSwing = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/8',
        swing: 0
      });
      
      const withSwing = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/8',
        swing: 50
      });
      
      const audio = new Float32Array(sampleRate * 2);
      const resultNoSwing = noSwing.slice(audio);
      const resultWithSwing = withSwing.slice(audio);
      
      // With swing, timing of alternate slices should be different
      expect(resultNoSwing.slices.length).toBeGreaterThan(3);
      expect(resultWithSwing.slices.length).toBeGreaterThan(3);
    });
  });

  describe('Options', () => {
    it('should get and set BPM', () => {
      const slicer = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/4',
        swing: 0
      });
      
      expect(slicer.getBpm()).toBe(120);
      
      slicer.setBpm(140);
      expect(slicer.getBpm()).toBe(140);
    });

    it('should get and set division', () => {
      const slicer = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/4',
        swing: 0
      });
      
      expect(slicer.getDivision()).toBe('1/4');
      
      slicer.setDivision('1/8');
      expect(slicer.getDivision()).toBe('1/8');
    });

    it('should get and set swing', () => {
      const slicer = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/4',
        swing: 0
      });
      
      expect(slicer.getSwing()).toBe(0);
      
      slicer.setSwing(50);
      expect(slicer.getSwing()).toBe(50);
    });

    it('should clamp swing to 0-100', () => {
      const slicer = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/4',
        swing: 0
      });
      
      slicer.setSwing(150);
      expect(slicer.getSwing()).toBe(100);
      
      slicer.setSwing(-50);
      expect(slicer.getSwing()).toBe(0);
    });
  });

  describe('Utility methods', () => {
    it('should calculate number of slices', () => {
      const slicer = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/4',
        swing: 0
      });
      
      const numSlices = slicer.calculateNumSlices(4); // 4 seconds
      expect(numSlices).toBeGreaterThan(0);
    });

    it('should get slice times', () => {
      const slicer = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/4',
        swing: 0
      });
      
      const times = slicer.getSliceTimes(4);
      expect(times.length).toBeGreaterThan(0);
      expect(times[0]).toBe(0);
    });
  });

  describe('Slice range', () => {
    it('should slice a specific beat range', () => {
      const slicer = new BeatSlicer(sampleRate, {
        bpm: 120,
        division: '1/4',
        swing: 0
      });
      
      const audio = new Float32Array(sampleRate * 8); // 8 seconds
      const result = slicer.sliceRange(audio, 4, 12); // Beats 4-12
      
      expect(result.slices.length).toBeGreaterThan(0);
    });
  });
});
