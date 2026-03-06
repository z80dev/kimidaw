/**
 * Pack Creator
 * 
 * Create custom sound packs for the browser:
 * - Sample collection management
 * - Metadata editing
 * - Pack export/import
 * - Cloud sync hooks
 */

import { BrowserMetadata, PackInfo } from "../types.js";

export interface PackConfig {
  /** Pack ID */
  id: string;
  /** Pack name */
  name: string;
  /** Pack description */
  description: string;
  /** Pack author */
  author: string;
  /** Pack version */
  version: string;
  /** Pack category */
  category: string;
  /** Pack tags */
  tags: string[];
  /** Pack color/theme */
  color: string;
  /** License information */
  license: string;
  /** Creation date */
  created: Date;
  /** Last modified */
  modified: Date;
}

export interface PackItem {
  /** Unique item ID */
  id: string;
  /** Item type */
  type: "sample" | "preset" | "clip" | "device";
  /** File path/URL */
  path: string;
  /** Item name */
  name: string;
  /** Tags */
  tags: string[];
  /** Custom metadata */
  metadata: Record<string, unknown>;
}

export interface PackData {
  config: PackConfig;
  items: PackItem[];
  thumbnail?: string;
}

export class PackCreator {
  private _pack: PackData;
  private _dirty = false;
  private _cloudSync: CloudSyncProvider | null = null;

  constructor(config?: Partial<PackConfig>) {
    const now = new Date();
    this._pack = {
      config: {
        id: config?.id ?? `pack-${Date.now()}`,
        name: config?.name ?? "Untitled Pack",
        description: config?.description ?? "",
        author: config?.author ?? "",
        version: config?.version ?? "1.0.0",
        category: config?.category ?? "Uncategorized",
        tags: config?.tags ?? [],
        color: config?.color ?? "#3b82f6",
        license: config?.license ?? "All Rights Reserved",
        created: config?.created ?? now,
        modified: now,
      },
      items: [],
    };
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get config(): PackConfig {
    return { ...this._pack.config };
  }

  get items(): PackItem[] {
    return [...this._pack.items];
  }

  get isDirty(): boolean {
    return this._dirty;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  updateConfig(updates: Partial<PackConfig>): void {
    this._pack.config = { ...this._pack.config, ...updates };
    this._pack.config.modified = new Date();
    this._dirty = true;
  }

  setName(name: string): void {
    this._pack.config.name = name;
    this._pack.config.modified = new Date();
    this._dirty = true;
  }

  setDescription(description: string): void {
    this._pack.config.description = description;
    this._pack.config.modified = new Date();
    this._dirty = true;
  }

  setTags(tags: string[]): void {
    this._pack.config.tags = [...tags];
    this._pack.config.modified = new Date();
    this._dirty = true;
  }

  addTag(tag: string): void {
    if (!this._pack.config.tags.includes(tag)) {
      this._pack.config.tags.push(tag);
      this._pack.config.modified = new Date();
      this._dirty = true;
    }
  }

  removeTag(tag: string): void {
    const index = this._pack.config.tags.indexOf(tag);
    if (index >= 0) {
      this._pack.config.tags.splice(index, 1);
      this._pack.config.modified = new Date();
      this._dirty = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Items
  // ---------------------------------------------------------------------------

  addItem(item: Omit<PackItem, "id">): PackItem {
    const newItem: PackItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    this._pack.items.push(newItem);
    this._pack.config.modified = new Date();
    this._dirty = true;
    return newItem;
  }

  removeItem(itemId: string): boolean {
    const index = this._pack.items.findIndex(i => i.id === itemId);
    if (index >= 0) {
      this._pack.items.splice(index, 1);
      this._pack.config.modified = new Date();
      this._dirty = true;
      return true;
    }
    return false;
  }

  updateItem(itemId: string, updates: Partial<PackItem>): boolean {
    const item = this._pack.items.find(i => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
      this._pack.config.modified = new Date();
      this._dirty = true;
      return true;
    }
    return false;
  }

  getItem(itemId: string): PackItem | undefined {
    return this._pack.items.find(i => i.id === itemId);
  }

  getItemsByType(type: PackItem["type"]): PackItem[] {
    return this._pack.items.filter(i => i.type === type);
  }

  getItemsByTag(tag: string): PackItem[] {
    return this._pack.items.filter(i => i.tags.includes(tag));
  }

  clearItems(): void {
    this._pack.items = [];
    this._pack.config.modified = new Date();
    this._dirty = true;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  /**
   * Export pack to JSON
   */
  toJSON(): string {
    return JSON.stringify(this._pack, null, 2);
  }

  /**
   * Import pack from JSON
   */
  fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as PackData;
      this._pack = data;
      this._dirty = true;
    } catch (error) {
      throw new Error(`Failed to parse pack JSON: ${error}`);
    }
  }

  /**
   * Export pack to Blob (for download)
   */
  async toBlob(): Promise<Blob> {
    const json = this.toJSON();
    return new Blob([json], { type: "application/json" });
  }

  /**
   * Create pack from file
   */
  static async fromFile(file: File): Promise<PackCreator> {
    const text = await file.text();
    const creator = new PackCreator();
    creator.fromJSON(text);
    return creator;
  }

  /**
   * Duplicate the current pack
   */
  duplicate(): PackCreator {
    const newPack = new PackCreator({
      ...this._pack.config,
      id: `pack-${Date.now()}`,
      name: `${this._pack.config.name} (Copy)`,
    });
    newPack._pack.items = this._pack.items.map(item => ({
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    return newPack;
  }

  // ---------------------------------------------------------------------------
  // Cloud Sync
  // ---------------------------------------------------------------------------

  setCloudProvider(provider: CloudSyncProvider): void {
    this._cloudSync = provider;
  }

  /**
   * Upload pack to cloud
   */
  async uploadToCloud(): Promise<void> {
    if (!this._cloudSync) {
      throw new Error("No cloud provider configured");
    }
    
    const blob = await this.toBlob();
    await this._cloudSync.upload(this._pack.config.id, blob, {
      name: this._pack.config.name,
      description: this._pack.config.description,
      tags: this._pack.config.tags,
    });
    
    this._dirty = false;
  }

  /**
   * Download pack from cloud
   */
  async downloadFromCloud(packId: string): Promise<void> {
    if (!this._cloudSync) {
      throw new Error("No cloud provider configured");
    }
    
    const blob = await this._cloudSync.download(packId);
    const text = await blob.text();
    this.fromJSON(text);
  }

  /**
   * List available packs from cloud
   */
  async listCloudPacks(): Promise<CloudPackInfo[]> {
    if (!this._cloudSync) {
      throw new Error("No cloud provider configured");
    }
    
    return this._cloudSync.listPacks();
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate(): string[] {
    const errors: string[] = [];
    
    if (!this._pack.config.name.trim()) {
      errors.push("Pack name is required");
    }
    
    if (!this._pack.config.author.trim()) {
      errors.push("Author is required");
    }
    
    if (this._pack.items.length === 0) {
      errors.push("Pack must contain at least one item");
    }
    
    // Check for duplicate item names
    const names = new Set<string>();
    for (const item of this._pack.items) {
      if (names.has(item.name)) {
        errors.push(`Duplicate item name: ${item.name}`);
      }
      names.add(item.name);
    }
    
    return errors;
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  markClean(): void {
    this._dirty = false;
  }

  getPackInfo(): PackInfo {
    return {
      id: this._pack.config.id,
      name: this._pack.config.name,
      author: this._pack.config.author,
      category: this._pack.config.category,
      tags: [...this._pack.config.tags],
      installed: true,
      version: this._pack.config.version,
      itemCount: this._pack.items.length,
    };
  }
}

// =============================================================================
// Cloud Sync Interface
// =============================================================================

export interface CloudPackInfo {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  downloadUrl: string;
  size: number;
  uploadedAt: Date;
}

export interface CloudSyncProvider {
  upload(packId: string, data: Blob, metadata: {
    name: string;
    description: string;
    tags: string[];
  }): Promise<void>;
  download(packId: string): Promise<Blob>;
  listPacks(): Promise<CloudPackInfo[]>;
  delete(packId: string): Promise<void>;
}

// =============================================================================
// Factory
// =============================================================================

export function createPack(config?: Partial<PackConfig>): PackCreator {
  return new PackCreator(config);
}

export async function loadPackFromFile(file: File): Promise<PackCreator> {
  return PackCreator.fromFile(file);
}
