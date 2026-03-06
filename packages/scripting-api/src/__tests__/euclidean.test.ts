import { describe, it, expect } from 'vitest';
import {
  euclidean,
  polyrhythm,
  nestedEuclidean,
  patternToOnsets,
  density,
  evenness,
  invertPattern,
  reversePattern,
  patternAnd,
  patternOr,
  patternXor,
  RHYTHM_PRESETS,
} from '../euclidean';

describe('Euclidean Rhythms', () => {
  describe('euclidean', () => {
    it('should generate tresillo pattern (3 on 8)', () => {
      const pattern = euclidean(8, 3);
      expect(pattern).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
    });

    it('should generate cinquillo pattern (5 on 16)', () => {
      const pattern = euclidean(16, 5);
      expect(pattern).toEqual([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0]);
    });

    it('should handle full fill (pulses = steps)', () => {
      const pattern = euclidean(8, 8);
      expect(pattern).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    });

    it('should handle empty pattern (pulses = 0)', () => {
      const pattern = euclidean(8, 0);
      expect(pattern).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('should handle single pulse', () => {
      const pattern = euclidean(8, 1);
      expect(pattern[0]).toBe(1);
      expect(pattern.filter(p => p === 1)).toHaveLength(1);
    });

    it('should support rotation', () => {
      const base = euclidean(8, 3);
      const rotated = euclidean(8, 3, 1);
      
      expect(rotated).toEqual([0, 1, 0, 0, 1, 0, 0, 1]);
      
      // Rotating by steps should equal original
      const fullRotate = euclidean(8, 3, 8);
      expect(fullRotate).toEqual(base);
    });

    it('should handle negative rotation', () => {
      const pattern = euclidean(8, 3, -1);
      expect(pattern).toEqual([0, 0, 1, 0, 0, 1, 0, 1]);
    });

    it('should throw on invalid steps', () => {
      expect(() => euclidean(0, 1)).toThrow();
      expect(() => euclidean(-1, 1)).toThrow();
    });

    it('should throw on invalid pulses', () => {
      expect(() => euclidean(8, -1)).toThrow();
      expect(() => euclidean(8, 9)).toThrow();
    });

    it('should be deterministic', () => {
      const p1 = euclidean(16, 5);
      const p2 = euclidean(16, 5);
      expect(p1).toEqual(p2);
    });
  });

  describe('polyrhythm', () => {
    it('should combine two rhythms', () => {
      const result = polyrhythm([
        [4, 3],
        [3, 2],
      ]);

      expect(result.patterns).toHaveLength(2);
      expect(result.length).toBe(12); // LCM of 4 and 3
    });

    it('should create 3:2 polyrhythm', () => {
      const result = polyrhythm([
        [3, 3], // 3 pulses in 3 steps
        [2, 2], // 2 pulses in 2 steps
      ]);

      // Combined pattern should have pulses from both
      expect(result.combined.length).toBe(6);
    });

    it('should handle rotation in sub-patterns', () => {
      const result = polyrhythm([
        [4, 3, 1],
        [4, 3, 0],
      ]);

      expect(result.patterns[0]).not.toEqual(result.patterns[1]);
    });
  });

  describe('nestedEuclidean', () => {
    it('should create nested rhythms', () => {
      const pattern = nestedEuclidean(4, 2, 4, 2);
      
      // 4 steps, 2 pulses, each pulse subdivided into 4 with 2 sub-pulses
      expect(pattern.length).toBe(16); // 4 * 4
    });

    it('should handle different subdivisions per step', () => {
      const pattern = nestedEuclidean(4, 2, 4, [2, 1, 2, 1]);
      expect(pattern.length).toBe(16);
    });
  });

  describe('patternToOnsets', () => {
    it('should convert pattern to tick positions', () => {
      const pattern = [1, 0, 0, 1, 0, 0, 1, 0];
      const onsets = patternToOnsets(pattern, 0, 120);

      expect(onsets).toEqual([0, 360, 720]);
    });

    it('should handle offset start tick', () => {
      const pattern = [1, 0, 1, 0];
      const onsets = patternToOnsets(pattern, 480, 120);

      expect(onsets).toEqual([480, 720]);
    });
  });

  describe('density', () => {
    it('should calculate correct density', () => {
      expect(density([1, 0, 0, 0])).toBe(0.25);
      expect(density([1, 1, 1, 1])).toBe(1);
      expect(density([0, 0, 0, 0])).toBe(0);
      expect(density([1, 0, 1, 0])).toBe(0.5);
    });

    it('should handle empty pattern', () => {
      expect(density([])).toBe(0);
    });
  });

  describe('evenness', () => {
    it('should be 1 for evenly distributed patterns', () => {
      // Perfectly even: pulses at equal intervals
      const even = euclidean(12, 4);
      expect(evenness(even)).toBeCloseTo(1, 1);
    });

    it('should be lower for clustered patterns', () => {
      // Clustered: all pulses together
      const clustered = [1, 1, 1, 0, 0, 0, 0, 0];
      expect(evenness(clustered)).toBeLessThan(0.5);
    });

    it('should be 1 for single pulse', () => {
      expect(evenness([1, 0, 0, 0])).toBe(1);
    });
  });

  describe('pattern transformations', () => {
    it('should invert pattern', () => {
      const pattern = [1, 0, 0, 1, 0];
      expect(invertPattern(pattern)).toEqual([0, 1, 1, 0, 1]);
    });

    it('should reverse pattern', () => {
      const pattern = [1, 0, 0, 1, 0];
      expect(reversePattern(pattern)).toEqual([0, 1, 0, 0, 1]);
    });
  });

  describe('pattern logic operations', () => {
    it('should AND patterns', () => {
      const a = [1, 1, 0, 0];
      const b = [1, 0, 1, 0];
      expect(patternAnd(a, b)).toEqual([1, 0, 0, 0]);
    });

    it('should OR patterns', () => {
      const a = [1, 1, 0, 0];
      const b = [1, 0, 1, 0];
      expect(patternOr(a, b)).toEqual([1, 1, 1, 0]);
    });

    it('should XOR patterns', () => {
      const a = [1, 1, 0, 0];
      const b = [1, 0, 1, 0];
      expect(patternXor(a, b)).toEqual([0, 1, 1, 0]);
    });

    it('should handle different length patterns', () => {
      const a = [1, 0];
      const b = [1, 0, 0, 1];
      expect(patternAnd(a, b)).toHaveLength(4);
    });
  });

  describe('RHYTHM_PRESETS', () => {
    it('should provide tresillo preset', () => {
      const pattern = RHYTHM_PRESETS.tresillo();
      expect(pattern).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
    });

    it('should provide cinquillo preset', () => {
      const pattern = RHYTHM_PRESETS.cinquillo();
      expect(pattern).toHaveLength(16);
    });

    it('should provide four-on-floor preset', () => {
      const pattern = RHYTHM_PRESETS.fourOnFloor();
      expect(pattern.filter(p => p === 1)).toHaveLength(4);
    });

    it('should provide son clave preset', () => {
      const pattern = RHYTHM_PRESETS.sonClave();
      expect(pattern).toHaveLength(16);
    });
  });
});
