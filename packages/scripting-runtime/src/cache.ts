/**
 * Compiled Script Cache
 * 
 * Caches compiled JavaScript code to avoid recompiling unchanged TypeScript.
 * Uses content-addressed storage based on source hash.
 */

import type { 
  CompiledScript, 
  CacheEntry, 
  CacheStats,
  ScriptSource,
} from './types';

/** Cache configuration */
interface CacheConfig {
  maxEntries: number;
  maxSizeBytes: number;
  ttlMs: number;
}

/** Default cache configuration */
const DEFAULT_CONFIG: CacheConfig = {
  maxEntries: 100,
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
};

/** Simple hash function for source code */
function hashSource(source: ScriptSource): string {
  // Simple FNV-1a hash implementation
  const str = `${source.id}:${source.code}:${source.version}`;
  let hash = 2166136261;
  
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Compiled script cache
 */
export class ScriptCache {
  private cache: Map<string, CacheEntry>;
  private compiledScripts: Map<string, CompiledScript>;
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.compiledScripts = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get a cached compiled script
   * 
   * @param source - Script source
   * @returns Compiled script or undefined if not in cache
   */
  get(source: ScriptSource): CompiledScript | undefined {
    const key = this.getCacheKey(source);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.lastAccessed > this.config.ttlMs) {
      this.cache.delete(key);
      this.compiledScripts.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access stats
    entry.hitCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return this.compiledScripts.get(key);
  }

  /**
   * Store a compiled script in the cache
   * 
   * @param source - Original source
   * @param compiled - Compiled script
   */
  set(source: ScriptSource, compiled: CompiledScript): void {
    const key = this.getCacheKey(source);
    const sizeBytes = this.calculateSize(compiled);

    // Check if we need to evict
    while (
      this.cache.size >= this.config.maxEntries ||
      this.getTotalSize() + sizeBytes > this.config.maxSizeBytes
    ) {
      this.evictLRU();
    }

    // Store entry
    const entry: CacheEntry = {
      key,
      hash: compiled.hash,
      compiledAt: Date.now(),
      hitCount: 0,
      lastAccessed: Date.now(),
      sizeBytes,
    };

    this.cache.set(key, entry);
    this.compiledScripts.set(key, compiled);
  }

  /**
   * Check if a script is in the cache
   * 
   * @param source - Script source
   * @returns True if cached and valid
   */
  has(source: ScriptSource): boolean {
    return this.get(source) !== undefined;
  }

  /**
   * Invalidate a cached script
   * 
   * @param source - Script source to invalidate
   */
  invalidate(source: ScriptSource): void {
    const key = this.getCacheKey(source);
    this.cache.delete(key);
    this.compiledScripts.delete(key);
  }

  /**
   * Clear all cached scripts
   */
  clear(): void {
    this.cache.clear();
    this.compiledScripts.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalHits = this.stats.hits;
    const totalMisses = this.stats.misses;
    const total = totalHits + totalMisses;

    return {
      entries: this.cache.size,
      totalSizeBytes: this.getTotalSize(),
      hitCount: totalHits,
      missCount: totalMisses,
      hitRate: total > 0 ? totalHits / total : 0,
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Generate cache key from source
   */
  private getCacheKey(source: ScriptSource): string {
    return `${source.id}:${hashSource(source)}`;
  }

  /**
   * Calculate size of compiled script in bytes
   */
  private calculateSize(compiled: CompiledScript): number {
    // Rough estimate: JS code + source map + overhead
    const jsSize = new Blob([compiled.jsCode]).size;
    const mapSize = new Blob([compiled.sourceMap]).size;
    const overhead = 200; // metadata
    return jsSize + mapSize + overhead;
  }

  /**
   * Get total size of all cached entries
   */
  private getTotalSize(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.sizeBytes;
    }
    return total;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldest: CacheEntry | undefined;
    let oldestKey: string | undefined;

    for (const [key, entry] of this.cache) {
      if (!oldest || entry.lastAccessed < oldest.lastAccessed) {
        oldest = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.compiledScripts.delete(oldestKey);
    }
  }
}

/** Global cache instance */
let globalCache: ScriptCache | null = null;

/**
 * Get or create the global script cache
 */
export function getGlobalCache(config?: Partial<CacheConfig>): ScriptCache {
  if (!globalCache) {
    globalCache = new ScriptCache(config);
  }
  return globalCache;
}

/**
 * Reset the global cache
 */
export function resetGlobalCache(): void {
  globalCache = null;
}

/**
 * Hash source code for cache key
 */
export { hashSource };
