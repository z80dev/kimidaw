/**
 * Origin Private File System (OPFS) Repository
 * 
 * Provides a content-addressed storage layer for large binary assets.
 * Implements the storage model from section 17.1 of the engineering spec.
 * 
 * OPFS Layout:
 * /opfs/
 *   projects/
 *     <projectId>/
 *       manifest.json
 *       journal/
 *         000001.cmdlog
 *       snapshots/
 *         000010.snapshot
 *       assets/
 *         audio/
 *           sha256-<hash>.bin
 *         peaks/
 *           sha256-<hash>.peaks
 *         analysis/
 *           sha256-<hash>.json
 */

// Feature detection
export function isOpfsSupported(): boolean {
  return typeof navigator !== 'undefined' && 
         'storage' in navigator && 
         'getDirectory' in navigator.storage;
}

export function isOpfsSyncSupported(): boolean {
  // Sync handles require File System Access API
  return typeof FileSystemFileHandle !== 'undefined' && 
         'createSyncAccessHandle' in FileSystemFileHandle.prototype;
}

// Error types
export class OpfsError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'OpfsError';
  }
}

export class OpfsNotFoundError extends OpfsError {
  constructor(path: string) {
    super(`Not found: ${path}`, 'NOT_FOUND');
    this.name = 'OpfsNotFoundError';
  }
}

export class OpfsExistsError extends OpfsError {
  constructor(path: string) {
    super(`Already exists: ${path}`, 'EXISTS');
    this.name = 'OpfsExistsError';
  }
}

// Types
export interface OpfsFileInfo {
  name: string;
  path: string;
  size: number;
  lastModified: number;
  type: 'file' | 'directory';
}

export interface WriteOptions {
  create?: boolean;
  append?: boolean;
}

/**
 * OPFS Repository class
 * 
 * Provides high-level operations over the Origin Private File System.
 */
export class OpfsRepository {
  private root: FileSystemDirectoryHandle | null = null;
  private initialized = false;

  constructor(private basePath: string = 'daw') {}

  /**
   * Initialize the repository, creating base directories
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!isOpfsSupported()) {
      throw new OpfsError('OPFS not supported in this environment', 'NOT_SUPPORTED');
    }

    const opfs = await navigator.storage.getDirectory();
    this.root = await opfs.getDirectoryHandle(this.basePath, { create: true });
    this.initialized = true;
  }

  /**
   * Ensure repository is initialized
   */
  private async ensureInitialized(): Promise<FileSystemDirectoryHandle> {
    if (!this.initialized || !this.root) {
      await this.initialize();
    }
    return this.root!;
  }

  /**
   * Get a nested directory handle
   */
  private async getDirectory(
    path: string[],
    create = false
  ): Promise<FileSystemDirectoryHandle> {
    const root = await this.ensureInitialized();
    let current = root;

    for (const segment of path) {
      current = await current.getDirectoryHandle(segment, { create });
    }

    return current;
  }

  /**
   * Get a file handle at the specified path
   */
  private async getFile(
    path: string[],
    create = false
  ): Promise<FileSystemFileHandle> {
    const dirPath = path.slice(0, -1);
    const fileName = path[path.length - 1];
    const dir = await this.getDirectory(dirPath, create);
    return dir.getFileHandle(fileName, { create });
  }

  /**
   * Write data to a file
   */
  async writeFile(
    path: string,
    data: Blob | ArrayBuffer | string,
    options: WriteOptions = {}
  ): Promise<void> {
    const segments = path.split('/').filter(Boolean);
    const handle = await this.getFile(segments, options.create ?? true);

    let blob: Blob;
    if (typeof data === 'string') {
      blob = new Blob([data], { type: 'text/plain' });
    } else if (data instanceof ArrayBuffer) {
      blob = new Blob([data]);
    } else {
      blob = data;
    }

    // Use createWritable for atomic writes
    const writable = await handle.createWritable();
    try {
      if (options.append) {
        // For append, we need to read existing and rewrite
        const existing = await this.readFile(path);
        if (existing) {
          const combined = new Uint8Array(existing.byteLength + blob.size);
          combined.set(new Uint8Array(existing));
          const newData = await blob.arrayBuffer();
          combined.set(new Uint8Array(newData), existing.byteLength);
          blob = new Blob([combined]);
        }
      }
      await writable.write(blob);
    } finally {
      await writable.close();
    }
  }

  /**
   * Read a file as ArrayBuffer
   */
  async readFile(path: string): Promise<ArrayBuffer | null> {
    try {
      const segments = path.split('/').filter(Boolean);
      const handle = await this.getFile(segments, false);
      const file = await handle.getFile();
      return await file.arrayBuffer();
    } catch (e) {
      if (this.isNotFoundError(e)) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Read a file as text
   */
  async readText(path: string): Promise<string | null> {
    try {
      const segments = path.split('/').filter(Boolean);
      const handle = await this.getFile(segments, false);
      const file = await handle.getFile();
      return await file.text();
    } catch (e) {
      if (this.isNotFoundError(e)) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Read a file as JSON
   */
  async readJson<T = unknown>(path: string): Promise<T | null> {
    const text = await this.readText(path);
    if (text === null) return null;
    return JSON.parse(text) as T;
  }

  /**
   * Check if a file exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      const segments = path.split('/').filter(Boolean);
      await this.getFile(segments, false);
      return true;
    } catch (e) {
      if (this.isNotFoundError(e)) {
        return false;
      }
      throw e;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<void> {
    const segments = path.split('/').filter(Boolean);
    const fileName = segments.pop()!;
    
    try {
      const dir = await this.getDirectory(segments, false);
      await dir.removeEntry(fileName);
    } catch (e) {
      if (this.isNotFoundError(e)) {
        throw new OpfsNotFoundError(path);
      }
      throw e;
    }
  }

  /**
   * Delete a directory recursively
   */
  async deleteDirectory(path: string): Promise<void> {
    const segments = path.split('/').filter(Boolean);
    const dirName = segments.pop()!;
    
    try {
      const parent = await this.getDirectory(segments, false);
      await parent.removeEntry(dirName, { recursive: true });
    } catch (e) {
      if (this.isNotFoundError(e)) {
        throw new OpfsNotFoundError(path);
      }
      throw e;
    }
  }

  /**
   * List contents of a directory
   */
  async listDirectory(path: string = ''): Promise<OpfsFileInfo[]> {
    const segments = path.split('/').filter(Boolean);
    const dir = segments.length === 0 
      ? await this.ensureInitialized()
      : await this.getDirectory(segments, false);

    const entries: OpfsFileInfo[] = [];
    
    // Type assertion needed because entries() is not in the standard types yet
    const dirEntries = (dir as any).entries();
    for await (const [name, handle] of dirEntries) {
      const entryPath = path ? `${path}/${name}` : name;
      
      if (handle.kind === 'file') {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        entries.push({
          name,
          path: entryPath,
          size: file.size,
          lastModified: file.lastModified,
          type: 'file',
        });
      } else {
        entries.push({
          name,
          path: entryPath,
          size: 0,
          lastModified: 0,
          type: 'directory',
        });
      }
    }

    return entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Create a directory
   */
  async createDirectory(path: string): Promise<void> {
    const segments = path.split('/').filter(Boolean);
    await this.getDirectory(segments, true);
  }

  /**
   * Get file info
   */
  async getFileInfo(path: string): Promise<OpfsFileInfo | null> {
    try {
      const segments = path.split('/').filter(Boolean);
      const handle = await this.getFile(segments, false);
      const file = await handle.getFile();
      const name = segments[segments.length - 1];
      
      return {
        name,
        path,
        size: file.size,
        lastModified: file.lastModified,
        type: 'file',
      };
    } catch (e) {
      if (this.isNotFoundError(e)) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Write JSON data
   */
  async writeJson(path: string, data: unknown): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    await this.writeFile(path, json);
  }

  /**
   * Copy a file
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const data = await this.readFile(sourcePath);
    if (data === null) {
      throw new OpfsNotFoundError(sourcePath);
    }
    await this.writeFile(destPath, data);
  }

  /**
   * Move/rename a file
   */
  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    await this.copyFile(sourcePath, destPath);
    await this.deleteFile(sourcePath);
  }

  /**
   * Get total storage usage
   */
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage ?? 0,
        quota: estimate.quota ?? 0,
      };
    }
    return { used: 0, quota: 0 };
  }

  /**
   * Check if error is "not found"
   */
  private isNotFoundError(e: unknown): boolean {
    return e instanceof Error && 
           (e.name === 'NotFoundError' || 
            e.message?.includes('not found'));
  }

  /**
   * Create a sync file handle (for workers only)
   */
  async createSyncHandle(path: string): Promise<FileSystemSyncAccessHandle | null> {
    if (!isOpfsSyncSupported()) {
      return null;
    }

    try {
      const segments = path.split('/').filter(Boolean);
      const handle = await this.getFile(segments, true);
      return await handle.createSyncAccessHandle();
    } catch {
      return null;
    }
  }
}

// Singleton instance
let defaultRepository: OpfsRepository | null = null;

export function getOpfsRepository(): OpfsRepository {
  if (!defaultRepository) {
    defaultRepository = new OpfsRepository();
  }
  return defaultRepository;
}

/**
 * Helper to format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper to get content hash path
 */
export function getContentPath(hash: string, type: 'audio' | 'peaks' | 'analysis'): string {
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
      throw new Error(`Unknown content type: ${type}`);
  }
}
