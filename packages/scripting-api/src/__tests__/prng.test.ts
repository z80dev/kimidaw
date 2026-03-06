import { describe, it, expect } from 'vitest';
import { createPRNG, createScriptPRNG, deterministicId } from '../prng';

describe('PRNG', () => {
  describe('createPRNG', () => {
    it('should generate deterministic values from same seed', () => {
      const prng1 = createPRNG('test-seed');
      const prng2 = createPRNG('test-seed');

      const values1 = Array.from({ length: 10 }, () => prng1.next());
      const values2 = Array.from({ length: 10 }, () => prng2.next());

      expect(values1).toEqual(values2);
    });

    it('should generate different values from different seeds', () => {
      const prng1 = createPRNG('seed-a');
      const prng2 = createPRNG('seed-b');

      const values1 = Array.from({ length: 10 }, () => prng1.next());
      const values2 = Array.from({ length: 10 }, () => prng2.next());

      expect(values1).not.toEqual(values2);
    });

    it('should generate values in [0, 1) range', () => {
      const prng = createPRNG('test');

      for (let i = 0; i < 100; i++) {
        const value = prng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should support range()', () => {
      const prng = createPRNG('test');

      for (let i = 0; i < 100; i++) {
        const value = prng.range(10, 20);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThan(20);
      }
    });

    it('should support int()', () => {
      const prng = createPRNG('test');

      for (let i = 0; i < 100; i++) {
        const value = prng.int(1, 6);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should support bool()', () => {
      const prng = createPRNG('test');

      // With probability 0, always false
      expect(prng.bool(0)).toBe(false);

      // With probability 1, always true
      const prng2 = createPRNG('test2');
      expect(prng2.bool(1)).toBe(true);

      // Rough distribution test
      const prng3 = createPRNG('test3');
      let trues = 0;
      for (let i = 0; i < 1000; i++) {
        if (prng3.bool(0.5)) trues++;
      }
      expect(trues).toBeGreaterThan(400);
      expect(trues).toBeLessThan(600);
    });

    it('should support pick()', () => {
      const prng = createPRNG('test');
      const array = ['a', 'b', 'c', 'd', 'e'];

      const picked = prng.pick(array);
      expect(array).toContain(picked);
    });

    it('should support shuffle()', () => {
      const prng = createPRNG('test');
      const array = [1, 2, 3, 4, 5];

      const shuffled = prng.shuffle(array);
      expect(shuffled).toHaveLength(5);
      expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should produce deterministic shuffle from same seed', () => {
      const prng1 = createPRNG('test');
      const prng2 = createPRNG('test');
      const array = [1, 2, 3, 4, 5];

      const shuffled1 = prng1.shuffle(array);
      const shuffled2 = prng2.shuffle(array);

      expect(shuffled1).toEqual(shuffled2);
    });

    it('should support normal()', () => {
      const prng = createPRNG('test');

      const values: number[] = [];
      for (let i = 0; i < 1000; i++) {
        values.push(prng.normal(0, 1));
      }

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Mean should be close to 0
      expect(mean).toBeGreaterThan(-0.2);
      expect(mean).toBeLessThan(0.2);

      // Std dev should be close to 1
      expect(stdDev).toBeGreaterThan(0.8);
      expect(stdDev).toBeLessThan(1.2);
    });

    it('should support fork()', () => {
      const prng1 = createPRNG('test');
      const prng2 = prng1.fork('child');

      // Forked PRNG should be deterministic
      const forkedAgain = prng1.fork('child');
      expect(prng2.next()).toEqual(forkedAgain.next());
    });

    it('should support state serialization', () => {
      const prng = createPRNG('test');

      // Generate some values
      prng.next();
      prng.next();
      const state = prng.getState();

      // Continue generating
      const value1 = prng.next();

      // Restore state and regenerate
      const prng2 = createPRNG('other');
      prng2.setState(state);
      const value2 = prng2.next();

      expect(value1).toEqual(value2);
    });
  });

  describe('createScriptPRNG', () => {
    it('should create deterministic PRNG for script context', () => {
      const prng1 = createScriptPRNG('project-1', 'script-a');
      const prng2 = createScriptPRNG('project-1', 'script-a');

      expect(prng1.next()).toEqual(prng2.next());
    });

    it('should create different PRNGs for different scripts', () => {
      const prng1 = createScriptPRNG('project-1', 'script-a');
      const prng2 = createScriptPRNG('project-1', 'script-b');

      expect(prng1.next()).not.toEqual(prng2.next());
    });

    it('should create different PRNGs for different projects', () => {
      const prng1 = createScriptPRNG('project-1', 'script-a');
      const prng2 = createScriptPRNG('project-2', 'script-a');

      expect(prng1.next()).not.toEqual(prng2.next());
    });
  });

  describe('deterministicId', () => {
    it('should generate deterministic IDs', () => {
      const id1 = deterministicId('seed', 'namespace');
      const id2 = deterministicId('seed', 'namespace');

      expect(id1).toEqual(id2);
    });

    it('should generate different IDs for different seeds', () => {
      const id1 = deterministicId('seed-a', 'namespace');
      const id2 = deterministicId('seed-b', 'namespace');

      expect(id1).not.toEqual(id2);
    });

    it('should generate valid UUID-like format', () => {
      const id = deterministicId('test', 'ns');
      
      // Should match UUID format
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });
});
