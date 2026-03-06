/**
 * IndexedDB wrapper for metadata and indices
 * 
 * Provides structured storage for:
 * - Project metadata
 * - Asset indices
 * - Waveform indices  
 * - Preset indices
 * - Recent projects
 * - Script cache
 * - Diagnostics
 * 
 * Implements section 17.1 of the engineering spec.
 */

// Database configuration
const DB_NAME = 'daw-storage';
const DB_VERSION = 1;

// Store names
export const STORE_NAMES = {
  PROJECTS: 'projects',
  RECENTS: 'recents',
  ASSET_INDEX: 'assetIndex',
  WAVEFORM_INDEX: 'waveformIndex',
  PRESET_INDEX: 'presetIndex',
  SCRIPT_CACHE: 'scriptCache',
  CAPABILITIES: 'capabilities',
  DIAGNOSTICS: 'diagnostics',
  MIGRATIONS: 'migrations',
} as const;

// Error types
export class IndexedDBError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'IndexedDBError';
  }
}

// Types
export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  schemaVersion: number;
  thumbnail?: string; // Data URL or blob reference
  size: number; // Total project size in bytes
  isOpen: boolean;
  lastOpenedAt?: string;
}

export interface RecentProject {
  projectId: string;
  name: string;
  openedAt: string;
  path?: string; // OPFS path or file handle
}

export interface AssetIndexEntry {
  id: string;
  hash: string;
  projectIds: string[];
  name: string;
  type: 'audio' | 'sample' | 'preset' | 'waveform' | 'analysis';
  size: number;
  sampleRate?: number;
  channels?: number;
  duration?: number;
  importedAt: string;
  lastUsedAt: string;
}

export interface WaveformIndexEntry {
  assetId: string;
  hash: string;
  levels: number;
  generatedAt: string;
  peakDataSize: number;
}

export interface PresetIndexEntry {
  id: string;
  name: string;
  pluginDefinitionId: string;
  category?: string;
  tags: string[];
  author?: string;
  isFactory: boolean;
}

export interface ScriptCacheEntry {
  scriptId: string;
  sourceHash: string;
  compiledAt: string;
  compiledCode: string;
  diagnosticsHash: string;
  errorCount: number;
  warningCount: number;
}

export interface CapabilityState {
  id: string;
  detectedAt: string;
  capabilities: Record<string, boolean>;
  userAgent: string;
}

export interface DiagnosticsEntry {
  id: string;
  timestamp: string;
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export interface MigrationRecord {
  version: number;
  appliedAt: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

/**
 * IndexedDB wrapper class
 */
export class IndexedDBRepository {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new IndexedDBError(
          `Failed to open database: ${request.error?.message}`,
          'OPEN_ERROR'
        ));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Projects store
        if (!db.objectStoreNames.contains(STORE_NAMES.PROJECTS)) {
          const store = db.createObjectStore(STORE_NAMES.PROJECTS, { keyPath: 'id' });
          store.createIndex('modifiedAt', 'modifiedAt', { unique: false });
          store.createIndex('isOpen', 'isOpen', { unique: false });
        }

        // Recents store
        if (!db.objectStoreNames.contains(STORE_NAMES.RECENTS)) {
          const store = db.createObjectStore(STORE_NAMES.RECENTS, { keyPath: 'projectId' });
          store.createIndex('openedAt', 'openedAt', { unique: false });
        }

        // Asset index
        if (!db.objectStoreNames.contains(STORE_NAMES.ASSET_INDEX)) {
          const store = db.createObjectStore(STORE_NAMES.ASSET_INDEX, { keyPath: 'id' });
          store.createIndex('hash', 'hash', { unique: true });
          store.createIndex('type', 'type', { unique: false });
        }

        // Waveform index
        if (!db.objectStoreNames.contains(STORE_NAMES.WAVEFORM_INDEX)) {
          const store = db.createObjectStore(STORE_NAMES.WAVEFORM_INDEX, { keyPath: 'assetId' });
          store.createIndex('hash', 'hash', { unique: true });
        }

        // Preset index
        if (!db.objectStoreNames.contains(STORE_NAMES.PRESET_INDEX)) {
          const store = db.createObjectStore(STORE_NAMES.PRESET_INDEX, { keyPath: 'id' });
          store.createIndex('pluginDefinitionId', 'pluginDefinitionId', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }

        // Script cache
        if (!db.objectStoreNames.contains(STORE_NAMES.SCRIPT_CACHE)) {
          const store = db.createObjectStore(STORE_NAMES.SCRIPT_CACHE, { keyPath: 'scriptId' });
          store.createIndex('sourceHash', 'sourceHash', { unique: false });
        }

        // Capabilities
        if (!db.objectStoreNames.contains(STORE_NAMES.CAPABILITIES)) {
          db.createObjectStore(STORE_NAMES.CAPABILITIES, { keyPath: 'id' });
        }

        // Diagnostics
        if (!db.objectStoreNames.contains(STORE_NAMES.DIAGNOSTICS)) {
          const store = db.createObjectStore(STORE_NAMES.DIAGNOSTICS, { 
            keyPath: 'id',
            autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }

        // Migrations
        if (!db.objectStoreNames.contains(STORE_NAMES.MIGRATIONS)) {
          const store = db.createObjectStore(STORE_NAMES.MIGRATIONS, { keyPath: 'version' });
          store.createIndex('appliedAt', 'appliedAt', { unique: false });
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<IDBDatabase> {
    await this.initialize();
    if (!this.db) {
      throw new IndexedDBError('Database not initialized', 'NOT_INITIALIZED');
    }
    return this.db;
  }

  /**
   * Get a value by key
   */
  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const db = await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Put a value (insert or update)
   */
  async put<T>(storeName: string, value: T): Promise<IDBValidKey> {
    const db = await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a value
   */
  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all values from a store
   */
  async getAll<T>(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
    const db = await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll(query);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query by index
   */
  async queryByIndex<T>(
    storeName: string,
    indexName: string,
    key: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    const db = await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Open a cursor for iteration
   */
  async *cursor<T>(
    storeName: string,
    direction: IDBCursorDirection = 'next'
  ): AsyncGenerator<T> {
    const db = await this.ensureInitialized();
    
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.openCursor(undefined, direction);

    let resolve: (value: T | undefined) => void;
    let reject: (error: Error) => void;

    const nextValue = (): Promise<T | undefined> => {
      return new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
    };

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        resolve(cursor.value);
        cursor.continue();
      } else {
        resolve(undefined);
      }
    };

    request.onerror = () => {
      reject(request.error!);
    };

    while (true) {
      const value = await nextValue();
      if (value === undefined) break;
      yield value;
    }
  }

  /**
   * Count records in a store
   */
  async count(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<number> {
    const db = await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count(query);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data from a store
   */
  async clear(storeName: string): Promise<void> {
    const db = await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Batch put operation
   */
  async batchPut<T>(storeName: string, values: T[]): Promise<void> {
    const db = await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      let completed = 0;
      const total = values.length;

      if (total === 0) {
        resolve();
        return;
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      for (const value of values) {
        const request = store.put(value);
        request.onsuccess = () => {
          completed++;
        };
      }
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  // ==================== Convenience Methods ====================

  async getProjectMetadata(projectId: string): Promise<ProjectMetadata | undefined> {
    return this.get<ProjectMetadata>(STORE_NAMES.PROJECTS, projectId);
  }

  async saveProjectMetadata(metadata: ProjectMetadata): Promise<void> {
    await this.put(STORE_NAMES.PROJECTS, metadata);
  }

  async getRecentProjects(limit = 10): Promise<RecentProject[]> {
    const recents = await this.getAll<RecentProject>(STORE_NAMES.RECENTS);
    return recents
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
      .slice(0, limit);
  }

  async addRecentProject(project: RecentProject): Promise<void> {
    await this.put(STORE_NAMES.RECENTS, project);
  }

  async getAssetIndexEntry(assetId: string): Promise<AssetIndexEntry | undefined> {
    return this.get<AssetIndexEntry>(STORE_NAMES.ASSET_INDEX, assetId);
  }

  async saveAssetIndexEntry(entry: AssetIndexEntry): Promise<void> {
    await this.put(STORE_NAMES.ASSET_INDEX, entry);
  }

  async getAssetByHash(hash: string): Promise<AssetIndexEntry | undefined> {
    const results = await this.queryByIndex<AssetIndexEntry>(
      STORE_NAMES.ASSET_INDEX,
      'hash',
      hash
    );
    return results[0];
  }

  async logDiagnostic(entry: Omit<DiagnosticsEntry, 'id'>): Promise<void> {
    await this.put(STORE_NAMES.DIAGNOSTICS, entry);
  }

  async getDiagnostics(
    options?: { type?: string; category?: string; limit?: number }
  ): Promise<DiagnosticsEntry[]> {
    let entries = await this.getAll<DiagnosticsEntry>(STORE_NAMES.DIAGNOSTICS);
    
    if (options?.type) {
      entries = entries.filter(e => e.type === options.type);
    }
    if (options?.category) {
      entries = entries.filter(e => e.category === options.category);
    }
    
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }
    
    return entries;
  }

  async recordMigration(record: MigrationRecord): Promise<void> {
    await this.put(STORE_NAMES.MIGRATIONS, record);
  }

  async getMigrationHistory(): Promise<MigrationRecord[]> {
    const records = await this.getAll<MigrationRecord>(STORE_NAMES.MIGRATIONS);
    return records.sort((a, b) => a.version - b.version);
  }
}

// Singleton instance
let defaultRepository: IndexedDBRepository | null = null;

export function getIndexedDBRepository(): IndexedDBRepository {
  if (!defaultRepository) {
    defaultRepository = new IndexedDBRepository();
  }
  return defaultRepository;
}

/**
 * Check if IndexedDB is supported
 */
export function isIndexedDBSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * Delete the entire database
 */
export async function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database deletion blocked'));
  });
}
