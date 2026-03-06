/**
 * Content-Addressed Asset Store
 * 
 * Implements content-addressed storage for binary assets:
 * - Audio files
 * - Waveform peak data
 * - Analysis results
 * 
 * Assets are stored by SHA-256 hash for deduplication.
 * Implements section 17.2 of the engineering spec.
 */

import { OpfsRepository, getOpfsRepository } from './opfs.js';
import { IndexedDBRepository, getIndexedDBRepository, type AssetIndexEntry } from './indexeddb.js';

// Error types
export class AssetStoreError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AssetStoreError';
  }
}

// Asset metadata
export interface AssetMetadata {
  hash: string;
  size: number;
  mimeType: string;
  name?: string;
  
  // Audio-specific
  audioInfo?: {
    sampleRate: number;
    channels: number;
    bitDepth?: number;
    duration: number;
    format: string;
  };
  
  // Source tracking
  source?: {
    type: 'recorded' | 'imported' | 'generated' | 'factory';
    originalPath?: string;
    deviceName?: string;
    importedAt: string;
  };
}

// Import result
export interface AssetImportResult {
  hash: string;
  isNew: boolean;
  size: number;
  metadata: AssetMetadata;
}

// Storage statistics
export interface AssetStoreStats {
  totalAssets: number;
  totalSize: number;
  uniqueHashes: number;
  byType: Map<string, { count: number; size: number }>;
}

/**
 * Asset Store
 * 
 * Manages content-addressed storage of binary assets.
 */
export class AssetStore {
  private opfs: OpfsRepository;
  private indexeddb: IndexedDBRepository;

  constructor(
    opfs: OpfsRepository = getOpfsRepository(),
    indexeddb: IndexedDBRepository = getIndexedDBRepository()
  ) {
    this.opfs = opfs;
    this.indexeddb = indexeddb;
  }

  /**
   * Initialize the store
   */
  async initialize(): Promise<void> {
    await this.indexeddb.initialize();
    await this.opfs.initialize();

    // Ensure asset directories exist
    await this.opfs.createDirectory('assets/audio');
    await this.opfs.createDirectory('assets/peaks');
    await this.opfs.createDirectory('assets/analysis');
  }

  /**
   * Import an asset from a Blob or ArrayBuffer
   */
  async importAsset(
    data: Blob | ArrayBuffer,
    metadata: Partial<AssetMetadata> = {},
    projectId?: string
  ): Promise<AssetImportResult> {
    // Compute hash
    const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
    const hash = await this.computeHash(buffer);

    // Check if already exists
    const existing = await this.getAssetByHash(hash);
    if (existing) {
      // Update usage tracking
      if (projectId && !existing.projectIds.includes(projectId)) {
        existing.projectIds.push(projectId);
        existing.lastUsedAt = new Date().toISOString();
        await this.indexeddb.saveAssetIndexEntry(existing);
      }

      return {
        hash,
        isNew: false,
        size: buffer.byteLength,
        metadata: await this.getAssetMetadata(hash) ?? {
          hash,
          size: buffer.byteLength,
          mimeType: metadata.mimeType ?? 'application/octet-stream',
        },
      };
    }

    // Store the asset
    const path = this.getAssetPath(hash, 'audio');
    await this.opfs.writeFile(path, buffer);

    // Create metadata
    const fullMetadata: AssetMetadata = {
      hash,
      size: buffer.byteLength,
      mimeType: metadata.mimeType ?? 'application/octet-stream',
      name: metadata.name,
      audioInfo: metadata.audioInfo,
      source: metadata.source ?? {
        type: 'imported',
        importedAt: new Date().toISOString(),
      },
    };

    // Save metadata
    await this.saveAssetMetadata(hash, fullMetadata);

    // Update index
    const entry: AssetIndexEntry = {
      id: `asset_${Date.now()}_${hash.slice(0, 8)}`,
      hash,
      projectIds: projectId ? [projectId] : [],
      name: metadata.name ?? 'Untitled',
      type: 'audio',
      size: buffer.byteLength,
      sampleRate: metadata.audioInfo?.sampleRate,
      channels: metadata.audioInfo?.channels,
      duration: metadata.audioInfo?.duration,
      importedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    await this.indexeddb.saveAssetIndexEntry(entry);

    return {
      hash,
      isNew: true,
      size: buffer.byteLength,
      metadata: fullMetadata,
    };
  }

  /**
   * Get asset data by hash
   */
  async getAsset(hash: string): Promise<ArrayBuffer | null> {
    const path = this.getAssetPath(hash, 'audio');
    return this.opfs.readFile(path);
  }

  /**
   * Check if asset exists
   */
  async hasAsset(hash: string): Promise<boolean> {
    const entry = await this.indexeddb.getAssetByHash(hash);
    return entry !== undefined;
  }

  /**
   * Get asset metadata
   */
  async getAssetMetadata(hash: string): Promise<AssetMetadata | null> {
    const path = `assets/analysis/${hash.slice(0, 2)}/${hash.slice(2)}.meta.json`;
    return this.opfs.readJson<AssetMetadata>(path);
  }

  /**
   * Save asset metadata
   */
  private async saveAssetMetadata(hash: string, metadata: AssetMetadata): Promise<void> {
    const path = `assets/analysis/${hash.slice(0, 2)}/${hash.slice(2)}.meta.json`;
    await this.opfs.writeJson(path, metadata);
  }

  /**
   * Get asset index entry
   */
  async getAssetByHash(hash: string): Promise<AssetIndexEntry | undefined> {
    return this.indexeddb.getAssetByHash(hash);
  }

  /**
   * Save peak data for an asset
   */
  async savePeakData(hash: string, peakData: Float32Array, levels: number): Promise<void> {
    const path = this.getAssetPath(hash, 'peaks');
    
    // Store metadata about peak structure
    const header = new Uint32Array([levels, peakData.length]);
    // Combine header and data into an ArrayBuffer
    const combined = new ArrayBuffer(header.byteLength + peakData.byteLength);
    const combinedView = new Uint8Array(combined);
    combinedView.set(new Uint8Array(header.buffer), 0);
    combinedView.set(new Uint8Array(peakData.buffer), header.byteLength);
    
    await this.opfs.writeFile(path, combined);

    // Update index
    const entry = await this.indexeddb.getAssetByHash(hash);
    if (entry) {
      await this.indexeddb.put('waveformIndex', {
        assetId: entry.id,
        hash,
        levels,
        generatedAt: new Date().toISOString(),
        peakDataSize: peakData.byteLength,
      });
    }
  }

  /**
   * Load peak data for an asset
   */
  async loadPeakData(hash: string): Promise<{ levels: number; data: Float32Array } | null> {
    const path = this.getAssetPath(hash, 'peaks');
    const buffer = await this.opfs.readFile(path);
    
    if (!buffer) return null;

    const view = new Uint32Array(buffer, 0, 2);
    const levels = view[0];
    const data = new Float32Array(buffer, 8);

    return { levels, data };
  }

  /**
   * Save analysis results for an asset
   */
  async saveAnalysis(hash: string, analysis: unknown): Promise<void> {
    const path = `assets/analysis/${hash.slice(0, 2)}/${hash.slice(2)}.analysis.json`;
    await this.opfs.writeJson(path, analysis);
  }

  /**
   * Load analysis results for an asset
   */
  async loadAnalysis<T = unknown>(hash: string): Promise<T | null> {
    const path = `assets/analysis/${hash.slice(0, 2)}/${hash.slice(2)}.analysis.json`;
    return this.opfs.readJson<T>(path);
  }

  /**
   * Delete an asset
   */
  async deleteAsset(hash: string): Promise<void> {
    // Check if asset is used by multiple projects
    const entry = await this.indexeddb.getAssetByHash(hash);
    if (entry && entry.projectIds.length > 1) {
      // Just remove from this project, don't delete actual data
      return;
    }

    // Delete all related files
    const paths = [
      this.getAssetPath(hash, 'audio'),
      this.getAssetPath(hash, 'peaks'),
      `assets/analysis/${hash.slice(0, 2)}/${hash.slice(2)}.meta.json`,
      `assets/analysis/${hash.slice(0, 2)}/${hash.slice(2)}.analysis.json`,
    ];

    for (const path of paths) {
      try {
        await this.opfs.deleteFile(path);
      } catch {
        // File might not exist
      }
    }

    // Remove from index
    if (entry) {
      await this.indexeddb.delete('assetIndex', entry.id);
    }
  }

  /**
   * List all assets
   */
  async listAssets(): Promise<AssetIndexEntry[]> {
    return this.indexeddb.getAll<AssetIndexEntry>('assetIndex');
  }

  /**
   * Get assets for a project
   */
  async getProjectAssets(projectId: string): Promise<AssetIndexEntry[]> {
    const allAssets = await this.listAssets();
    return allAssets.filter(a => a.projectIds.includes(projectId));
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<AssetStoreStats> {
    const assets = await this.listAssets();
    
    let totalSize = 0;
    const byType = new Map<string, { count: number; size: number }>();
    const uniqueHashes = new Set<string>();

    for (const asset of assets) {
      totalSize += asset.size;
      uniqueHashes.add(asset.hash);

      const type = asset.type ?? 'unknown';
      const current = byType.get(type) ?? { count: 0, size: 0 };
      current.count++;
      current.size += asset.size;
      byType.set(type, current);
    }

    return {
      totalAssets: assets.length,
      totalSize,
      uniqueHashes: uniqueHashes.size,
      byType,
    };
  }

  /**
   * Find and remove orphaned assets (not referenced by any project)
   */
  async cleanupOrphanedAssets(): Promise<{ removed: number; freedBytes: number }> {
    const assets = await this.listAssets();
    let removed = 0;
    let freedBytes = 0;

    for (const asset of assets) {
      if (asset.projectIds.length === 0) {
        await this.deleteAsset(asset.hash);
        removed++;
        freedBytes += asset.size;
      }
    }

    return { removed, freedBytes };
  }

  /**
   * Compute SHA-256 hash of data
   */
  private async computeHash(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get storage path for an asset
   */
  private getAssetPath(hash: string, type: 'audio' | 'peaks' | 'analysis'): string {
    const prefix = hash.slice(0, 2);
    const suffix = hash.slice(2);

    switch (type) {
      case 'audio':
        return `assets/audio/${prefix}/${suffix}.bin`;
      case 'peaks':
        return `assets/peaks/${prefix}/${suffix}.peaks`;
      case 'analysis':
        return `assets/analysis/${prefix}/${suffix}.json`;
      default:
        throw new Error(`Unknown asset type: ${type}`);
    }
  }
}

// Singleton instance
let defaultStore: AssetStore | null = null;

export function getAssetStore(): AssetStore {
  if (!defaultStore) {
    defaultStore = new AssetStore();
  }
  return defaultStore;
}

/**
 * Generate a unique asset ID
 */
export function generateAssetId(): string {
  return `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Estimate storage usage for a project
 */
export async function estimateProjectStorage(
  audioFiles: Array<{ size: number; channels: number; sampleRate: number; duration: number }>
): Promise<{ 
  audioBytes: number;
  peakBytes: number;
  estimatedTotal: number;
}> {
  let audioBytes = 0;
  let peakBytes = 0;

  for (const file of audioFiles) {
    audioBytes += file.size;
    
    // Peak data: 2 bytes per sample point per channel, typically ~1000 points per screen width
    // Rough estimate: 4 bytes per frame, 1/100th the resolution of original
    const peakFrames = Math.ceil(file.duration * file.sampleRate / 100);
    peakBytes += peakFrames * file.channels * 4;
  }

  return {
    audioBytes,
    peakBytes,
    estimatedTotal: audioBytes + peakBytes + 1024 * 1024, // Add 1MB for project data
  };
}
