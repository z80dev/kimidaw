import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptCache, hashSource } from '../cache';
import type { CompiledScript, ScriptSource } from '../types';

describe('ScriptCache', () => {
  let cache: ScriptCache;

  beforeEach(() => {
    cache = new ScriptCache({ maxEntries: 10, maxSizeBytes: 10000, ttlMs: 60000 });
  });

  describe('basic operations', () => {
    it('should store and retrieve compiled scripts', () => {
      const source: ScriptSource = { id: 'test', code: 'export default () => {}', version: 1 };
      const compiled: CompiledScript = {
        id: 'test',
        hash: 'abc123',
        jsCode: 'function() {}',
        sourceMap: '{}',
        parameters: [],
        compiledAt: Date.now(),
      };

      cache.set(source, compiled);
      const retrieved = cache.get(source);

      expect(retrieved).toEqual(compiled);
    });

    it('should return undefined for non-existent keys', () => {
      const source: ScriptSource = { id: 'nonexistent', code: '', version: 1 };
      
      expect(cache.get(source)).toBeUndefined();
    });

    it('should check for existence', () => {
      const source: ScriptSource = { id: 'test', code: 'code', version: 1 };
      const compiled: CompiledScript = {
        id: 'test',
        hash: 'abc',
        jsCode: 'js',
        sourceMap: '',
        parameters: [],
        compiledAt: Date.now(),
      };

      expect(cache.has(source)).toBe(false);
      cache.set(source, compiled);
      expect(cache.has(source)).toBe(true);
    });

    it('should invalidate entries', () => {
      const source: ScriptSource = { id: 'test', code: 'code', version: 1 };
      const compiled: CompiledScript = {
        id: 'test',
        hash: 'abc',
        jsCode: 'js',
        sourceMap: '',
        parameters: [],
        compiledAt: Date.now(),
      };

      cache.set(source, compiled);
      cache.invalidate(source);

      expect(cache.get(source)).toBeUndefined();
    });

    it('should clear all entries', () => {
      const source1: ScriptSource = { id: 'test1', code: 'code1', version: 1 };
      const source2: ScriptSource = { id: 'test2', code: 'code2', version: 1 };
      const compiled: CompiledScript = {
        id: 'test',
        hash: 'abc',
        jsCode: 'js',
        sourceMap: '',
        parameters: [],
        compiledAt: Date.now(),
      };

      cache.set(source1, compiled);
      cache.set(source2, compiled);
      cache.clear();

      expect(cache.get(source1)).toBeUndefined();
      expect(cache.get(source2)).toBeUndefined();
    });
  });

  describe('cache key generation', () => {
    it('should use different keys for different ids', () => {
      const source1: ScriptSource = { id: 'a', code: 'code', version: 1 };
      const source2: ScriptSource = { id: 'b', code: 'code', version: 1 };
      const compiled: CompiledScript = {
        id: 'test',
        hash: 'abc',
        jsCode: 'js',
        sourceMap: '',
        parameters: [],
        compiledAt: Date.now(),
      };

      cache.set(source1, compiled);

      expect(cache.get(source1)).toBeDefined();
      expect(cache.get(source2)).toBeUndefined();
    });

    it('should use different keys for different code', () => {
      const source1: ScriptSource = { id: 'test', code: 'code1', version: 1 };
      const source2: ScriptSource = { id: 'test', code: 'code2', version: 1 };
      const compiled: CompiledScript = {
        id: 'test',
        hash: 'abc',
        jsCode: 'js',
        sourceMap: '',
        parameters: [],
        compiledAt: Date.now(),
      };

      cache.set(source1, compiled);

      expect(cache.get(source2)).toBeUndefined();
    });

    it('should use different keys for different versions', () => {
      const source1: ScriptSource = { id: 'test', code: 'code', version: 1 };
      const source2: ScriptSource = { id: 'test', code: 'code', version: 2 };
      const compiled: CompiledScript = {
        id: 'test',
        hash: 'abc',
        jsCode: 'js',
        sourceMap: '',
        parameters: [],
        compiledAt: Date.now(),
      };

      cache.set(source1, compiled);

      expect(cache.get(source2)).toBeUndefined();
    });
  });

  describe('eviction', () => {
    it('should evict oldest entry when max entries reached', () => {
      const cacheWithLimit = new ScriptCache({ maxEntries: 2, maxSizeBytes: 100000 });

      const source1: ScriptSource = { id: 'test1', code: 'code', version: 1 };
      const source2: ScriptSource = { id: 'test2', code: 'code', version: 1 };
      const source3: ScriptSource = { id: 'test3', code: 'code', version: 1 };
      
      const compiled: CompiledScript = {
        id: 'test',
        hash: 'abc',
        jsCode: 'js',
        sourceMap: '',
        parameters: [],
        compiledAt: Date.now(),
      };

      cacheWithLimit.set(source1, compiled);
      cacheWithLimit.set(source2, compiled);
      cacheWithLimit.set(source3, compiled);

      expect(cacheWithLimit.get(source1)).toBeUndefined(); // Evicted
      expect(cacheWithLimit.get(source2)).toBeDefined();
      expect(cacheWithLimit.get(source3)).toBeDefined();
    });

    it('should evict LRU entry', async () => {
      const cacheWithLimit = new ScriptCache({ maxEntries: 2 });

      const source1: ScriptSource = { id: 'test1', code: 'code', version: 1 };
      const source2: ScriptSource = { id: 'test2', code: 'code', version: 1 };
      const source3: ScriptSource = { id: 'test3', code: 'code', version: 1 };
      
      const compiled: CompiledScript = {
        id: 'test',
        hash: 'abc',
        jsCode: 'js',
        sourceMap: '',
        parameters: [],
        compiledAt: Date.now(),
      };

      cacheWithLimit.set(source1, compiled);
      await new Promise(r => setTimeout(r, 10));
      cacheWithLimit.set(source2, compiled);
      
      // Access source1 to make it more recent
      cacheWithLimit.get(source1);
      await new Promise(r => setTimeout(r, 10));
      
      cacheWithLimit.set(source3, compiled);

      // source2 should be evicted (was not accessed)
      expect(cacheWithLimit.get(source1)).toBeDefined();
      expect(cacheWithLimit.get(source2)).toBeUndefined();
      expect(cacheWithLimit.get(source3)).toBeDefined();
    });
  });

  describe('TTL', () => {
    it('should expire entries after TTL', async () => {
      const cacheWithShortTTL = new ScriptCache({ ttlMs: 50 });

      const source: ScriptSource = { id: 'test', code: 'code', version: 1 };
      const compiled: CompiledScript = {
        id: 'test',
        hash: 'abc',
        jsCode: 'js',
        sourceMap: '',
        parameters: [],
        compiledAt: Date.now(),
      };

      cacheWithShortTTL.set(source, compiled);
      expect(cacheWithShortTTL.get(source)).toBeDefined();

      await new Promise(r => setTimeout(r, 100));
      expect(cacheWithShortTTL.get(source)).toBeUndefined();
    });
  });

  describe('statistics', () => {
    it('should track hit rate', () => {
      const source: ScriptSource = { id: 'test', code: 'code', version: 1 };
      const compiled: CompiledScript = {
        id: 'test',
        hash: 'abc',
        jsCode: 'js',
        sourceMap: '',
        parameters: [],
        compiledAt: Date.now(),
      };

      cache.get(source); // Miss
      cache.set(source, compiled);
      cache.get(source); // Hit
      cache.get(source); // Hit

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(2 / 3);
    });

    it('should track entry count', () => {
      const source1: ScriptSource = { id: 'test1', code: 'code', version: 1 };
      const source2: ScriptSource = { id: 'test2', code: 'code', version: 1 };
      const compiled: CompiledScript = {
        id: 'test',
        hash: 'abc',
        jsCode: 'js',
        sourceMap: '',
        parameters: [],
        compiledAt: Date.now(),
      };

      cache.set(source1, compiled);
      cache.set(source2, compiled);

      expect(cache.getStats().entries).toBe(2);
    });
  });

  describe('hashSource', () => {
    it('should generate consistent hashes', () => {
      const source: ScriptSource = { id: 'test', code: 'code', version: 1 };
      
      const hash1 = hashSource(source);
      const hash2 = hashSource(source);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different sources', () => {
      const source1: ScriptSource = { id: 'a', code: 'code', version: 1 };
      const source2: ScriptSource = { id: 'b', code: 'code', version: 1 };
      
      const hash1 = hashSource(source1);
      const hash2 = hashSource(source2);
      
      expect(hash1).not.toBe(hash2);
    });
  });
});
