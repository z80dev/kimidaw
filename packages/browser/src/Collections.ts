/**
 * Collections management for browser items
 * Favorites, color tags, custom collections
 */

import type { BrowserCollection, BrowserItem } from './types.js';

export interface CollectionsManager {
  // Favorites
  addToFavorites(item: BrowserItem): void;
  removeFromFavorites(item: BrowserItem): void;
  isFavorite(item: BrowserItem): boolean;
  getFavorites(): BrowserItem[];

  // Collections
  createCollection(name: string, color: string): BrowserCollection;
  deleteCollection(id: string): void;
  renameCollection(id: string, name: string): void;
  addToCollection(item: BrowserItem, collectionId: string): void;
  removeFromCollection(item: BrowserItem, collectionId: string): void;
  getCollectionItems(collectionId: string): BrowserItem[];
  getAllCollections(): BrowserCollection[];

  // Color tags
  setColorTag(item: BrowserItem, color: string | null): void;
  getItemsByColor(color: string): BrowserItem[];

  // Recent
  addToRecent(item: BrowserItem): void;
  getRecent(limit?: number): BrowserItem[];
  clearRecent(): void;
}

// Predefined collection colors (matching Ableton)
const COLLECTION_COLORS = [
  { id: 'favorites', name: 'Favorites', color: '#FFD700' },
  { id: 'red', name: 'Red', color: '#FF6B6B' },
  { id: 'orange', name: 'Orange', color: '#FF9F43' },
  { id: 'yellow', name: 'Yellow', color: '#Feca57' },
  { id: 'green', name: 'Green', color: '#1dd1a1' },
  { id: 'blue', name: 'Blue', color: '#54a0ff' },
  { id: 'purple', name: 'Purple', color: '#5f27cd' },
];

export function createCollectionsManager(): CollectionsManager {
  const favorites = new Set<string>();
  const collections = new Map<string, BrowserCollection>();
  const colorTags = new Map<string, string>(); // itemId -> color
  const recent: string[] = [];
  const itemsMap = new Map<string, BrowserItem>();

  // Initialize default collections
  for (const colorInfo of COLLECTION_COLORS) {
    collections.set(colorInfo.id, {
      id: colorInfo.id,
      name: colorInfo.name,
      color: colorInfo.color,
      items: [],
    });
  }

  // Favorites
  function addToFavorites(item: BrowserItem): void {
    favorites.add(item.id);
    itemsMap.set(item.id, item);
    saveToStorage();
  }

  function removeFromFavorites(item: BrowserItem): void {
    favorites.delete(item.id);
    saveToStorage();
  }

  function isFavorite(item: BrowserItem): boolean {
    return favorites.has(item.id);
  }

  function getFavorites(): BrowserItem[] {
    return Array.from(favorites)
      .map(id => itemsMap.get(id))
      .filter((item): item is BrowserItem => item !== undefined);
  }

  // Collections
  function createCollection(name: string, color: string): BrowserCollection {
    const id = `collection-${Date.now()}`;
    const collection: BrowserCollection = {
      id,
      name,
      color,
      items: [],
    };
    collections.set(id, collection);
    saveToStorage();
    return collection;
  }

  function deleteCollection(id: string): void {
    // Don't allow deleting default color collections
    if (COLLECTION_COLORS.some(c => c.id === id)) {
      // Just clear items
      const collection = collections.get(id);
      if (collection) {
        collection.items = [];
      }
    } else {
      collections.delete(id);
    }
    saveToStorage();
  }

  function renameCollection(id: string, name: string): void {
    const collection = collections.get(id);
    if (collection && !COLLECTION_COLORS.some(c => c.id === id)) {
      collection.name = name;
      saveToStorage();
    }
  }

  function addToCollection(item: BrowserItem, collectionId: string): void {
    const collection = collections.get(collectionId);
    if (collection) {
      if (!collection.items.includes(item.id)) {
        collection.items.push(item.id);
        itemsMap.set(item.id, item);
        saveToStorage();
      }
    }
  }

  function removeFromCollection(item: BrowserItem, collectionId: string): void {
    const collection = collections.get(collectionId);
    if (collection) {
      const index = collection.items.indexOf(item.id);
      if (index >= 0) {
        collection.items.splice(index, 1);
        saveToStorage();
      }
    }
  }

  function getCollectionItems(collectionId: string): BrowserItem[] {
    const collection = collections.get(collectionId);
    if (!collection) return [];

    return collection.items
      .map(id => itemsMap.get(id))
      .filter((item): item is BrowserItem => item !== undefined);
  }

  function getAllCollections(): BrowserCollection[] {
    return Array.from(collections.values());
  }

  // Color tags
  function setColorTag(item: BrowserItem, color: string | null): void {
    if (color) {
      colorTags.set(item.id, color);
      itemsMap.set(item.id, item);
    } else {
      colorTags.delete(item.id);
    }
    saveToStorage();
  }

  function getItemsByColor(color: string): BrowserItem[] {
    return Array.from(colorTags.entries())
      .filter(([_, itemColor]) => itemColor === color)
      .map(([id]) => itemsMap.get(id))
      .filter((item): item is BrowserItem => item !== undefined);
  }

  // Recent
  function addToRecent(item: BrowserItem): void {
    // Remove if already exists
    const existingIndex = recent.indexOf(item.id);
    if (existingIndex >= 0) {
      recent.splice(existingIndex, 1);
    }

    // Add to front
    recent.unshift(item.id);
    itemsMap.set(item.id, item);

    // Limit to 50
    if (recent.length > 50) {
      recent.pop();
    }

    saveToStorage();
  }

  function getRecent(limit: number = 20): BrowserItem[] {
    return recent
      .slice(0, limit)
      .map(id => itemsMap.get(id))
      .filter((item): item is BrowserItem => item !== undefined);
  }

  function clearRecent(): void {
    recent.length = 0;
    saveToStorage();
  }

  // Storage
  function saveToStorage(): void {
    try {
      const data = {
        favorites: Array.from(favorites),
        collections: Array.from(collections.entries()).map(([id, col]) => [
          id,
          { ...col, items: col.items },
        ]),
        colorTags: Array.from(colorTags.entries()),
        recent,
      };
      localStorage.setItem('daw-browser-collections', JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  function loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('daw-browser-collections');
      if (stored) {
        const data = JSON.parse(stored);

        if (data.favorites) {
          for (const id of data.favorites) {
            favorites.add(id);
          }
        }

        if (data.collections) {
          for (const [id, col] of data.collections) {
            const existing = collections.get(id);
            if (existing) {
              existing.items = col.items;
            } else {
              collections.set(id, col);
            }
          }
        }

        if (data.colorTags) {
          for (const [id, color] of data.colorTags) {
            colorTags.set(id, color);
          }
        }

        if (data.recent) {
          recent.push(...data.recent);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  // Load on creation
  loadFromStorage();

  return {
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    getFavorites,
    createCollection,
    deleteCollection,
    renameCollection,
    addToCollection,
    removeFromCollection,
    getCollectionItems,
    getAllCollections,
    setColorTag,
    getItemsByColor,
    addToRecent,
    getRecent,
    clearRecent,
  };
}
