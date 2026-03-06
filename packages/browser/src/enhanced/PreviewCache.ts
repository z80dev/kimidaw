/**
 * Preview Cache
 * 
 * Cache audio preview files for faster browsing:
 * - LRU cache management
 * - Disk persistence
 * - Cache size limits
 * - Preloading strategies
 */

export interface CacheEntry {
  /** Cache key (usually source URL hash) */
  key: string;
  /** Original source URL */
  sourceUrl: string;
  /** Cached blob */
  data: Blob;
  /** Content type */
  contentType: string;
  /** Size in bytes */
  size: number;
  /** When cached */
  cachedAt: Date;
  /** Last accessed */
  lastAccessed: Date;
  /** Access count */
  accessCount: number;
}

export interface CacheStats {
  /** Total entries */
  entryCount: number;
  /** Total size in bytes */
  totalSize: number;
  /** Maximum size */
  maxSize: number;
  /** Hit count */
  hits: number;
  /** Miss count */
  misses: number;
  /** Hit ratio (0-1) */
  hitRatio: number;
}

export interface PreviewCacheConfig {
  /** Maximum cache size in bytes (default: 100MB) */
  maxSize: number;
  /** Maximum entries (default: 1000) */
  maxEntries: number;
  /** TTL in milliseconds (default: 7 days) */
  ttl: number;
  /** Enable persistence */
  persistent: boolean;
  /** Storage name for persistence */
  storageName: string;
}

export class PreviewCache {
  private _cache: Map<string, CacheEntry> = new Map();
  private _config: CacheCacheConfig;
  private _stats = { hits: 0, misses: 0 };
  private _currentSize = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this._config = {
      maxSize: config.maxSize ?? 100 * 1024 * 1024, // 100MB
      maxEntries: config.maxEntries ?? 1000,
      ttl: config.ttl ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      persistent: config.persistent ?? true,
      storageName: config.storageName ?? "daw-preview-cache",
    };

    if (this._config.persistent) {
      this._loadFromStorage();
    }
  }

  // ---------------------------------------------------------------------------
  // Cache Operations
  // ---------------------------------------------------------------------------

  /**
   * Get cached preview
   */
  async get(key: string): Promise<Blob | undefined> {
    const entry = this._cache.get(key);

    if (!entry) {
      this._stats.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.cachedAt.getTime() > this._config.ttl) {
      this._removeEntry(key);
      this._stats.misses++;
      return undefined;
    }

    // Update access stats
    entry.lastAccessed = new Date();
    entry.accessCount++;

    this._stats.hits++;
    return entry.data;
  }

  /**
   * Store preview in cache
   */
  async set(key: string, sourceUrl: string, data: Blob, contentType = "audio/wav"): Promise<void> {
    // Check if already exists
    if (this._cache.has(key)) {
      this._removeEntry(key);
    }

    // Make room if needed
    while (
      this._currentSize + data.size > this._config.maxSize ||
      this._cache.size >= this._config.maxEntries
    ) {
      if (!this._evictLRU()) {
        break; // Can't evict anything
      }
    }

    // Check if it fits
    if (data.size > this._config.maxSize) {
      throw new Error("Data too large for cache");
    }

    const entry: CacheEntry = {
      key,
      sourceUrl,
      data,
      contentType,
      size: data.size,
      cachedAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
    };

    this._cache.set(key, entry);
    this._currentSize += data.size;

    // Persist if enabled
    if (this._config.persistent) {
      await this._persistEntry(key, entry);
    }
  }

  /**
   * Check if key is cached
   */
  has(key: string): boolean {
    const entry = this._cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (Date.now() - entry.cachedAt.getTime() > this._config.ttl) {
      this._removeEntry(key);
      return false;
    }

    return true;
  }

  /**
   * Remove from cache
   */
  delete(key: string): boolean {
    return this._removeEntry(key);
  }

  /**
   * Clear all cached previews
   */
  clear(): void {
    this._cache.clear();
    this._currentSize = 0;

    if (this._config.persistent) {
      this._clearStorage();
    }
  }

  // ---------------------------------------------------------------------------
  // Preloading
  // ---------------------------------------------------------------------------

  /**
   * Preload multiple previews
   */
  async preload(
    items: { key: string; url: string; loader: () => Promise<Blob> }[]
  ): Promise<void> {
    // Filter out already cached
    const toLoad = items.filter(item => !this.has(item.key));

    // Load in parallel with concurrency limit
    const concurrency = 3;
    for (let i = 0; i < toLoad.length; i += concurrency) {
      const batch = toLoad.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async item => {
          try {
            const data = await item.loader();
            await this.set(item.key, item.url, data);
          } catch (error) {
            // Log but don't fail entire preload
            console.warn(`Failed to preload ${item.key}:`, error);
          }
        })
      );
    }
  }

  /**
   * Preload items near current index (for sequential browsing)
   */
  async preloadNearby(
    items: { key: string; url: string }[],
    currentIndex: number,
    range = 5,
    loader: (item: { key: string; url: string }) => Promise<Blob>
  ): Promise<void> {
    const start = Math.max(0, currentIndex - range);
    const end = Math.min(items.length, currentIndex + range + 1);

    const toPreload = items
      .slice(start, end)
      .filter(item => !this.has(item.key))
      .map(item => ({
        key: item.key,
        url: item.url,
        loader: () => loader(item),
      }));

    // Don't await - let it happen in background
    this.preload(toPreload).catch(console.error);
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  getStats(): CacheStats {
    const totalHits = this._stats.hits;
    const totalMisses = this._stats.misses;
    const total = totalHits + totalMisses;

    return {
      entryCount: this._cache.size,
      totalSize: this._currentSize,
      maxSize: this._config.maxSize,
      hits: totalHits,
      misses: totalMisses,
      hitRatio: total > 0 ? totalHits / total : 0,
    };
  }

  resetStats(): void {
    this._stats = { hits: 0, misses: 0 };
  }

  getEntries(): CacheEntry[] {
    return Array.from(this._cache.values()).sort(
      (a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime()
    );
  }

  // ---------------------------------------------------------------------------
  // Maintenance
  // ---------------------------------------------------------------------------

  /**
   * Clean expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this._cache) {
      if (now - entry.cachedAt.getTime() > this._config.ttl) {
        this._removeEntry(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Trim cache to fit within limits
   */
  trim(): number {
    let removed = 0;

    while (
      this._currentSize > this._config.maxSize * 0.9 ||
      this._cache.size > this._config.maxEntries * 0.9
    ) {
      if (!this._evictLRU()) break;
      removed++;
    }

    return removed;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _removeEntry(key: string): boolean {
    const entry = this._cache.get(key);
    if (!entry) return false;

    this._cache.delete(key);
    this._currentSize -= entry.size;

    if (this._config.persistent) {
      this._removeFromStorage(key);
    }

    return true;
  }

  private _evictLRU(): boolean {
    let oldest: CacheEntry | null = null;
    let oldestKey: string | null = null;

    for (const [key, entry] of this._cache) {
      if (!oldest || entry.lastAccessed < oldest.lastAccessed) {
        oldest = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      return this._removeEntry(oldestKey);
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Persistence (using IndexedDB)
  // ---------------------------------------------------------------------------

  private async _loadFromStorage(): Promise<void> {
    // Would use IndexedDB in real implementation
    // For now, this is a stub
  }

  private async _persistEntry(key: string, entry: CacheEntry): Promise<void> {
    // Would save to IndexedDB
  }

  private async _removeFromStorage(key: string): Promise<void> {
    // Would remove from IndexedDB
  }

  private async _clearStorage(): Promise<void> {
    // Would clear IndexedDB
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createPreviewCache(config?: Partial<PreviewCacheConfig>): PreviewCache {
  return new PreviewCache(config);
}

// Helper to generate cache key from URL
export function generateCacheKey(url: string): string {
  // Simple hash for demo - would use proper hash in production
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `preview-${Math.abs(hash).toString(16)}`;
}
