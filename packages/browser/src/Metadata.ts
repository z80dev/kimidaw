/**
 * Metadata management for browser items
 */

import type { Metadata, BrowserItem } from './types.js';

export interface MetadataManager {
  load(item: BrowserItem): Promise<Metadata>;
  save(item: BrowserItem, metadata: Metadata): Promise<void>;
  extractFromFile(file: File): Promise<Partial<Metadata>>;
  updateTags(item: BrowserItem, tags: string[]): Promise<void>;
  updateDescription(item: BrowserItem, description: string): Promise<void>;
}

export function createMetadataManager(): MetadataManager {
  // In-memory cache for metadata
  const metadataCache = new Map<string, Metadata>();

  async function load(item: BrowserItem): Promise<Metadata> {
    // Check cache first
    if (metadataCache.has(item.id)) {
      return metadataCache.get(item.id)!;
    }

    // Try to load from various sources
    let metadata = await loadFromSidecar(item);
    
    if (!metadata) {
      metadata = extractFromItem(item);
    }

    // Cache it
    metadataCache.set(item.id, metadata);

    return metadata;
  }

  async function save(item: BrowserItem, metadata: Metadata): Promise<void> {
    // Save to sidecar file
    await saveToSidecar(item, metadata);
    
    // Update cache
    metadataCache.set(item.id, metadata);
  }

  async function extractFromFile(file: File): Promise<Partial<Metadata>> {
    const metadata: Partial<Metadata> = {
      title: file.name.replace(/\.[^/.]+$/, ''),
      modified: new Date(file.lastModified),
      size: file.size,
    };

    // Extract based on file type
    if (file.type.startsWith('audio/')) {
      const audioMetadata = await extractAudioMetadata(file);
      Object.assign(metadata, audioMetadata);
    } else if (file.type === 'audio/midi' || file.name.endsWith('.mid')) {
      const midiMetadata = await extractMidiMetadata(file);
      Object.assign(metadata, midiMetadata);
    }

    return metadata;
  }

  async function updateTags(item: BrowserItem, tags: string[]): Promise<void> {
    const metadata = await load(item);
    metadata.tags = [...tags];
    await save(item, metadata);
  }

  async function updateDescription(item: BrowserItem, description: string): Promise<void> {
    const metadata = await load(item);
    metadata.description = description;
    await save(item, metadata);
  }

  // Helper functions

  async function loadFromSidecar(item: BrowserItem): Promise<Metadata | null> {
    try {
      // In a real implementation, this would load .asd or .json sidecar files
      const sidecarPath = item.path + '.json';
      
      // Simulated load - in production use actual file system access
      const stored = localStorage.getItem(`metadata:${item.id}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  async function saveToSidecar(item: BrowserItem, metadata: Metadata): Promise<void> {
    try {
      // Simulated save - in production use actual file system access
      localStorage.setItem(`metadata:${item.id}`, JSON.stringify(metadata));
    } catch {
      // Ignore errors
    }
  }

  function extractFromItem(item: BrowserItem): Metadata {
    return {
      title: item.name,
      author: item.author,
      description: item.description,
      tags: [...item.tags],
      modified: item.modified,
    };
  }

  async function extractAudioMetadata(file: File): Promise<Partial<Metadata>> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);

      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve({
          duration: audio.duration,
        });
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve({});
      });

      audio.src = url;
    });
  }

  async function extractMidiMetadata(_file: File): Promise<Partial<Metadata>> {
    // MIDI metadata extraction would go here
    return {};
  }

  return {
    load,
    save,
    extractFromFile,
    updateTags,
    updateDescription,
  };
}

/**
 * Tag management
 */
export interface TagManager {
  getAllTags(): string[];
  getTagsForCategory(category: string): string[];
  addTag(tag: string): void;
  removeTag(tag: string): void;
  renameTag(oldTag: string, newTag: string): void;
  getSuggestedTags(query: string): string[];
}

export function createTagManager(): TagManager {
  const allTags = new Set<string>();
  const categoryTags = new Map<string, Set<string>>();

  function getAllTags(): string[] {
    return Array.from(allTags).sort();
  }

  function getTagsForCategory(category: string): string[] {
    const tags = categoryTags.get(category);
    return tags ? Array.from(tags).sort() : [];
  }

  function addTag(tag: string): void {
    allTags.add(tag.toLowerCase());
  }

  function removeTag(tag: string): void {
    allTags.delete(tag.toLowerCase());
  }

  function renameTag(oldTag: string, newTag: string): void {
    removeTag(oldTag);
    addTag(newTag);
  }

  function getSuggestedTags(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    return getAllTags().filter(tag => tag.includes(lowerQuery));
  }

  return {
    getAllTags,
    getTagsForCategory,
    addTag,
    removeTag,
    renameTag,
    getSuggestedTags,
  };
}
