/**
 * Cloud Integration
 * 
 * Optional cloud storage hooks for browser:
 * - User packs sync
 * - Settings backup
 * - Project sharing
 * - Collaboration features
 */

import { PackInfo } from "../types.js";

// =============================================================================
// Types
// =============================================================================

export interface CloudProviderConfig {
  /** Provider name */
  name: string;
  /** Provider type */
  type: "dropbox" | "google-drive" | "onedrive" | "s3" | "custom";
  /** API endpoint (for custom) */
  endpoint?: string;
  /** OAuth client ID */
  clientId?: string;
  /** API key */
  apiKey?: string;
  /** Access token */
  accessToken?: string;
  /** Refresh token */
  refreshToken?: string;
  /** Token expiry */
  tokenExpiry?: Date;
  /** Region (for S3) */
  region?: string;
  /** Bucket (for S3) */
  bucket?: string;
}

export interface CloudSyncStatus {
  /** Whether sync is enabled */
  enabled: boolean;
  /** Last sync time */
  lastSync: Date | null;
  /** Sync in progress */
  syncing: boolean;
  /** Items to sync */
  pendingItems: number;
  /** Sync errors */
  errors: string[];
  /** Storage used (bytes) */
  storageUsed: number;
  /** Storage limit (bytes) */
  storageLimit: number;
}

export interface SyncableItem {
  /** Item ID */
  id: string;
  /** Item type */
  type: "pack" | "preset" | "project" | "settings";
  /** Local path */
  localPath: string;
  /** Remote path */
  remotePath: string;
  /** Last modified locally */
  localModified: Date;
  /** Last modified remotely */
  remoteModified?: Date;
  /** Checksum for conflict detection */
  checksum: string;
  /** Sync status */
  syncStatus: "synced" | "local-newer" | "remote-newer" | "conflict" | "pending";
}

export interface ShareLink {
  /** Share URL */
  url: string;
  /** Expiry date */
  expiresAt: Date;
  /** Access permissions */
  permissions: "read" | "write";
  /** Download count */
  downloadCount: number;
}

// =============================================================================
// Cloud Provider Interface
// =============================================================================

export interface CloudProvider {
  /** Provider name */
  readonly name: string;
  
  /** Initialize connection */
  initialize(config: CloudProviderConfig): Promise<void>;
  
  /** Check if authenticated */
  isAuthenticated(): boolean;
  
  /** Authenticate user */
  authenticate(): Promise<void>;
  
  /** Refresh access token */
  refreshToken(): Promise<void>;
  
  /** List files in path */
  listFiles(path: string): Promise<CloudFile[]>;
  
  /** Download file */
  downloadFile(remotePath: string): Promise<Blob>;
  
  /** Upload file */
  uploadFile(remotePath: string, data: Blob): Promise<void>;
  
  /** Delete file */
  deleteFile(remotePath: string): Promise<void>;
  
  /** Create share link */
  createShareLink(remotePath: string, expiresInDays?: number): Promise<ShareLink>;
  
  /** Get storage info */
  getStorageInfo(): Promise<{ used: number; total: number }>;
  
  /** Disconnect */
  disconnect(): Promise<void>;
}

export interface CloudFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: Date;
  isDirectory: boolean;
}

// =============================================================================
// Cloud Integration Manager
// =============================================================================

export class CloudIntegration {
  private _providers: Map<string, CloudProvider> = new Map();
  private _activeProvider: CloudProvider | null = null;
  private _syncStatus: CloudSyncStatus = {
    enabled: false,
    lastSync: null,
    syncing: false,
    pendingItems: 0,
    errors: [],
    storageUsed: 0,
    storageLimit: 0,
  };
  private _syncQueue: SyncableItem[] = [];
  private _syncInterval: number | null = null;

  // ---------------------------------------------------------------------------
  // Provider Management
  // ---------------------------------------------------------------------------

  registerProvider(name: string, provider: CloudProvider): void {
    this._providers.set(name, provider);
  }

  unregisterProvider(name: string): boolean {
    if (this._activeProvider?.name === name) {
      this._activeProvider = null;
    }
    return this._providers.delete(name);
  }

  getProvider(name: string): CloudProvider | undefined {
    return this._providers.get(name);
  }

  getProviders(): CloudProvider[] {
    return Array.from(this._providers.values());
  }

  async setActiveProvider(name: string): Promise<void> {
    const provider = this._providers.get(name);
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }

    if (!provider.isAuthenticated()) {
      await provider.authenticate();
    }

    this._activeProvider = provider;
    await this._updateStorageInfo();
  }

  get activeProvider(): CloudProvider | null {
    return this._activeProvider;
  }

  // ---------------------------------------------------------------------------
  // Sync Operations
  // ---------------------------------------------------------------------------

  enableSync(intervalMinutes = 30): void {
    this._syncStatus.enabled = true;
    
    // Start periodic sync
    if (this._syncInterval) {
      clearInterval(this._syncInterval);
    }
    
    this._syncInterval = window.setInterval(() => {
      this.sync().catch(console.error);
    }, intervalMinutes * 60 * 1000);
  }

  disableSync(): void {
    this._syncStatus.enabled = false;
    
    if (this._syncInterval) {
      clearInterval(this._syncInterval);
      this._syncInterval = null;
    }
  }

  async sync(): Promise<void> {
    if (!this._activeProvider || !this._syncStatus.enabled || this._syncStatus.syncing) {
      return;
    }

    this._syncStatus.syncing = true;
    this._syncStatus.errors = [];

    try {
      // Process sync queue
      while (this._syncQueue.length > 0) {
        const item = this._syncQueue.shift()!;
        await this._syncItem(item);
      }

      this._syncStatus.lastSync = new Date();
      await this._updateStorageInfo();
    } catch (error) {
      this._syncStatus.errors.push(String(error));
    } finally {
      this._syncStatus.syncing = false;
    }
  }

  queueForSync(item: SyncableItem): void {
    const existingIndex = this._syncQueue.findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
      this._syncQueue[existingIndex] = item;
    } else {
      this._syncQueue.push(item);
    }
    this._syncStatus.pendingItems = this._syncQueue.length;
  }

  private async _syncItem(item: SyncableItem): Promise<void> {
    if (!this._activeProvider) return;

    try {
      // Check remote version
      const remoteFiles = await this._activeProvider.listFiles(item.remotePath);
      const remoteFile = remoteFiles.find(f => f.path === item.remotePath);

      if (!remoteFile) {
        // Upload new file
        const data = await this._getLocalData(item.localPath);
        await this._activeProvider.uploadFile(item.remotePath, data);
        item.syncStatus = "synced";
      } else if (remoteFile.modifiedAt < item.localModified) {
        // Local is newer, upload
        const data = await this._getLocalData(item.localPath);
        await this._activeProvider.uploadFile(item.remotePath, data);
        item.syncStatus = "synced";
      } else if (remoteFile.modifiedAt > item.localModified) {
        // Remote is newer, download
        const data = await this._activeProvider.downloadFile(item.remotePath);
        await this._saveLocalData(item.localPath, data);
        item.syncStatus = "synced";
      } else {
        item.syncStatus = "synced";
      }
    } catch (error) {
      item.syncStatus = "conflict";
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Pack Operations
  // ---------------------------------------------------------------------------

  async uploadPack(packPath: string, metadata: PackInfo): Promise<void> {
    if (!this._activeProvider) {
      throw new Error("No cloud provider active");
    }

    const remotePath = `/packs/${metadata.id}.json`;
    const data = await this._getLocalData(packPath);
    await this._activeProvider.uploadFile(remotePath, data);
  }

  async downloadPack(packId: string): Promise<Blob> {
    if (!this._activeProvider) {
      throw new Error("No cloud provider active");
    }

    const remotePath = `/packs/${packId}.json`;
    return this._activeProvider.downloadFile(remotePath);
  }

  async listRemotePacks(): Promise<PackInfo[]> {
    if (!this._activeProvider) {
      return [];
    }

    const files = await this._activeProvider.listFiles("/packs");
    const packs: PackInfo[] = [];

    for (const file of files.filter(f => f.name.endsWith(".json"))) {
      try {
        const data = await this._activeProvider.downloadFile(file.path);
        const text = await data.text();
        const metadata = JSON.parse(text) as PackInfo;
        packs.push(metadata);
      } catch {
        // Skip invalid files
      }
    }

    return packs;
  }

  // ---------------------------------------------------------------------------
  // Sharing
  // ---------------------------------------------------------------------------

  async shareItem(localPath: string, expiresInDays = 7): Promise<ShareLink> {
    if (!this._activeProvider) {
      throw new Error("No cloud provider active");
    }

    // Upload to shared folder
    const filename = localPath.split("/").pop() ?? "file";
    const remotePath = `/shared/${Date.now()}-${filename}`;
    const data = await this._getLocalData(localPath);
    await this._activeProvider.uploadFile(remotePath, data);

    return this._activeProvider.createShareLink(remotePath, expiresInDays);
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  getSyncStatus(): CloudSyncStatus {
    return { ...this._syncStatus };
  }

  getSyncQueue(): SyncableItem[] {
    return [...this._syncQueue];
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async _updateStorageInfo(): Promise<void> {
    if (!this._activeProvider) return;

    try {
      const info = await this._activeProvider.getStorageInfo();
      this._syncStatus.storageUsed = info.used;
      this._syncStatus.storageLimit = info.total;
    } catch {
      // Ignore errors
    }
  }

  private async _getLocalData(path: string): Promise<Blob> {
    // Would use File System Access API or IndexedDB
    throw new Error("Not implemented");
  }

  private async _saveLocalData(path: string, data: Blob): Promise<void> {
    // Would use File System Access API or IndexedDB
    throw new Error("Not implemented");
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  dispose(): void {
    this.disableSync();
    this._activeProvider = null;
    this._providers.clear();
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createCloudIntegration(): CloudIntegration {
  return new CloudIntegration();
}

// Example provider implementations would be in separate files
export function createDropboxProvider(config: CloudProviderConfig): CloudProvider {
  // Would implement Dropbox API
  throw new Error("Not implemented");
}

export function createGoogleDriveProvider(config: CloudProviderConfig): CloudProvider {
  // Would implement Google Drive API
  throw new Error("Not implemented");
}
