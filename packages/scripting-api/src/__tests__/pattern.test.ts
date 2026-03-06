import { describe, it, expect, beforeEach } from 'vitest';
import { PatternBuilder, pattern, drumPattern } from '../pattern';
import { createPRNG } from '../prng';

describe('PatternBuilder', () => {
  let builder: PatternBuilder;

  beforeEach(() => {
    builder = new PatternBuilder();
  });

  describe('basic configuration', () => {
    it('should set length', () => {
      const result = builder.length(8).clear().build();
      expect(result.length).toBe(8);
    });

    it('should set steps (alias)', () => {
      const result = builder.steps(12).clear().build();
      expect(result.length).toBe(12);
    });

    it('should set subdivision', () => {
      const result = builder.subdiv(8).clear().build();
      expect(result.division).toBe(8);
    });
  });

  describe('pattern sources', () => {
    it('should build from euclidean', () => {
      const result = builder.steps(8).euclidean(3).build();
      expect(result.steps.filter(s => s.active)).toHaveLength(3);
    });

    it('should build from array', () => {
      const result = builder.fromArray([1, 0, 1, 0, 1]).build();
      expect(result.length).toBe(5);
      expect(result.steps[0].active).toBe(true);
      expect(result.steps[1].active).toBe(false);
    });

    it('should build from preset', () => {
      const result = builder.preset('tresillo').build();
      expect(result.length).toBe(8);
      expect(result.steps.filter(s => s.active)).toHaveLength(3);
    });

    it('should fill all steps', () => {
      const result = builder.steps(8).fill().build();
      expect(result.steps.every(s => s.active)).toBe(true);
    });

    it('should clear all steps', () => {
      const result = builder.steps(8).fill().clear().build();
      expect(result.steps.every(s => !s.active)).toBe(true);
    });

    it('should create every-nth pattern', () => {
      const result = builder.steps(8).every(2).build();
      expect(result.steps[0].active).toBe(true);
      expect(result.steps[2].active).toBe(true);
      expect(result.steps[4].active).toBe(true);
      expect(result.steps[6].active).toBe(true);
    });

    it('should support every-nth with offset', () => {
      const result = builder.steps(8).every(2, 1).build();
      expect(result.steps[0].active).toBe(false);
      expect(result.steps[1].active).toBe(true);
      expect(result.steps[3].active).toBe(true);
    });
  });

  describe('transformations', () => {
    it('should apply velocity', () => {
      const result = builder.steps(4).fill().velocity(100).build();
      expect(result.steps.every(s => s.velocity === 100)).toBe(true);
    });

    it('should apply velocity with variance', () => {
      const prng = createPRNG('test');
      const result = builder.steps(16).fill().seed(prng).velocity(100, 20).build();
      
      const velocities = result.steps.map(s => s.velocity);
      const hasVariance = velocities.some(v => v !== 100);
      expect(hasVariance).toBe(true);
      
      // All velocities should be within range
      expect(velocities.every(v => v >= 80 && v <= 127)).toBe(true);
    });

    it('should apply accents', () => {
      const result = builder.steps(8).fill().accent([0, 4], 120, 80).build();
      expect(result.steps[0].velocity).toBe(120);
      expect(result.steps[4].velocity).toBe(120);
      expect(result.steps[1].velocity).toBe(80);
    });

    it('should apply probability gating', () => {
      const prng = createPRNG('test');
      const result = builder.steps(16).fill().seed(prng).probability(0.5).build();
      
      // Should have roughly half active
      const activeCount = result.steps.filter(s => s.active).length;
      expect(activeCount).toBeGreaterThan(4);
      expect(activeCount).toBeLessThan(12);
    });

    it('should apply humanization', () => {
      const prng = createPRNG('test');
      const result = builder.steps(4).fill().seed(prng).humanize(0.1).build();
      
      const hasOffset = result.steps.some(s => s.timingOffset !== 0);
      expect(hasOffset).toBe(true);
    });

    it('should apply swing', () => {
      const result = builder.steps(8).fill().swing(0.2).build();
      
      // Off-beat notes (1, 3, 5, 7) should have positive offset
      expect(result.steps[1].timingOffset).toBeGreaterThan(0);
      expect(result.steps[3].timingOffset).toBeGreaterThan(0);
      
      // On-beat notes (0, 2, 4, 6) should have no offset
      expect(result.steps[0].timingOffset).toBe(0);
    });

    it('should rotate pattern', () => {
      const result = builder.fromArray([1, 0, 0, 1]).rotate(1).build();
      expect(result.steps[0].active).toBe(false); // was last
      expect(result.steps[3].active).toBe(true); // was first
    });

    it('should reverse pattern', () => {
      const result = builder.fromArray([1, 0, 0, 1]).reverse().build();
      expect(result.steps[0].active).toBe(true);
      expect(result.steps[1].active).toBe(false);
      expect(result.steps[2].active).toBe(false);
      expect(result.steps[3].active).toBe(true);
    });

    it('should invert pattern', () => {
      const result = builder.fromArray([1, 0, 0, 1]).invert().build();
      expect(result.steps[0].active).toBe(false);
      expect(result.steps[1].active).toBe(true);
      expect(result.steps[2].active).toBe(true);
      expect(result.steps[3].active).toBe(false);
    });
  });

  describe('pattern logic', () => {
    it('should AND patterns', () => {
      const a = new PatternBuilder().fromArray([1, 1, 0, 0]);
      const result = new PatternBuilder().fromArray([1, 0, 1, 0]).and(a).build();
      
      expect(result.steps[0].active).toBe(true);
      expect(result.steps[1].active).toBe(false);
      expect(result.steps[2].active).toBe(false);
      expect(result.steps[3].active).toBe(false);
    });

    it('should OR patterns', () => {
      const a = new PatternBuilder().fromArray([1, 1, 0, 0]);
      const result = new PatternBuilder().fromArray([1, 0, 1, 0]).or(a).build();
      
      expect(result.steps[0].active).toBe(true);
      expect(result.steps[1].active).toBe(true);
      expect(result.steps[2].active).toBe(true);
      expect(result.steps[3].active).toBe(false);
    });
  });

  describe('output', () => {
    it('should build pattern array', () => {
      const pattern = builder.fromArray([1, 0, 1, 0]).buildPattern();
      expect(pattern).toEqual([1, 0, 1, 0]);
    });

    it('should convert to notes', () => {
      const result = builder.fromArray([1, 0, 1]).toNotes(60, 0, 120, 100);
      
      expect(result).toHaveLength(2);
      expect(result[0].note).toBe(60);
      expect(result[0].startTick).toBe(0);
      expect(result[0].duration).toBe(100);
      expect(result[1].startTick).toBe(240);
    });

    it('should get onsets', () => {
      const onsets = builder.fromArray([1, 0, 1, 0]).getOnsets(0, 120);
      expect(onsets).toEqual([0, 240]);
    });

    it('should apply timing offset to notes', () => {
      const prng = createPRNG('test');
      const result = builder.steps(4).fill().seed(prng).humanize(0.5).toNotes(60, 0, 120);
      
      // Timing offsets should be applied
      expect(result[1].startTick).not.toBe(120);
    });
  });
});

describe('drumPattern', () => {
  it('should create basic pattern', () => {
    const patterns = drumPattern('basic');
    expect(patterns.kick).toBeDefined();
    expect(patterns.snare).toBeDefined();
    expect(patterns.hihat).toBeDefined();
  });

  it('should create rock pattern', () => {
    const patterns = drumPattern('rock');
    expect(patterns.kick).toBeDefined();
    expect(patterns.snare).toBeDefined();
    expect(patterns.hihat).toBeDefined();
  });

  it('should create techno pattern', () => {
    const patterns = drumPattern('techno');
    expect(patterns.kick).toBeDefined();
    expect(patterns.snare).toBeDefined();
    expect(patterns.hihat).toBeDefined();
    expect(patterns.openHat).toBeDefined();
  });

  it('should create funk pattern', () => {
    const patterns = drumPattern('funk');
    expect(patterns.kick).toBeDefined();
    expect(patterns.snare).toBeDefined();
    expect(patterns.hihat).toBeDefined();
  });
});

describe('pattern factory', () => {
  it('should create PatternBuilder', () => {
    const builder = pattern();
    expect(builder).toBeInstanceOf(PatternBuilder);
  });

  it('should accept options', () => {
    const prng = createPRNG('test');
    const builder = pattern({ steps: 8, division: 8, seed: prng });
    
    const result = builder.fill().build();
    expect(result.length).toBe(8);
    expect(result.division).toBe(8);
  });
});
