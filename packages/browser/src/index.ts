/**
 * @daw/browser - Ableton-style File Browser
 * 
 * File browser system for the In-Browser DAW.
 * Browse, search, preview, and organize sounds, presets, and samples.
 * 
 * @example
 * ```typescript
 * import {
 *   createSearchManager,
 *   createPreviewPlayer,
 *   createCollectionsManager,
 * } from "@daw/browser";
 * 
 * // Search for items
 * const search = createSearchManager();
 * search.rebuildIndex(allBrowserItems);
 * 
 * const results = search.search({
 *   text: "kick drum",
 *   categories: ["drums", "samples"],
 * });
 * 
 * // Preview audio
 * const preview = createPreviewPlayer({
 *   autoPreview: true,
 *   volume: 0.8,
 * });
 * 
 * await preview.load(item);
 * preview.play();
 * 
 * // Manage collections
 * const collections = createCollectionsManager();
 * collections.addToFavorites(item);
 * collections.addToCollection(item, "red");
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  BrowserCategory,
  BrowserContentType,
  BrowserItem,
  BrowserPlace,
  BrowserPack,
  BrowserCollection,
  SearchQuery,
  SearchResult,
  SearchIndex,
  PreviewPlayer,
  PreviewOptions,
  PreviewPlayerState,
  Metadata,
  DragDropData,
  DropTarget,
  DropOperation,
  HotSwapContext,
  HotSwapState,
  BrowserState,
  BrowserEvent,
  BrowserEventType,
  BrowserEventHandler,
} from './types.js';

export {
  DEFAULT_PREVIEW_OPTIONS,
  DEFAULT_BROWSER_STATE,
} from './types.js';

// ============================================================================
// Search
// ============================================================================

export {
  createSearchManager,
  type SearchManager,
} from './Search.js';

// ============================================================================
// Preview
// ============================================================================

export {
  createPreviewPlayer,
  createAutoPreviewManager,
  type AutoPreviewManager,
} from './PreviewPlayer.js';

// ============================================================================
// Metadata
// ============================================================================

export {
  createMetadataManager,
  createTagManager,
  type MetadataManager,
  type TagManager,
} from './Metadata.js';

// ============================================================================
// Collections
// ============================================================================

export {
  createCollectionsManager,
  type CollectionsManager,
} from './Collections.js';

// ============================================================================
// Hot Swap
// ============================================================================

export {
  createHotSwapManager,
  filterCompatibleItems,
  createQuickSwapManager,
  type HotSwapManager,
  type QuickSwapManager,
} from './HotSwap.js';

// ============================================================================
// Browser State Management
// ============================================================================

export interface BrowserManager {
  getState(): import('./types.js').BrowserState;
  setState(state: Partial<import('./types.js').BrowserState>): void;
  selectCategory(category: import('./types.js').BrowserCategory | null): void;
  selectPlace(placeId: string | null): void;
  selectCollection(collectionId: string | null): void;
  selectItem(itemId: string | null): void;
  setSearchQuery(query: string): void;
  toggleFolder(folderId: string): void;
  setSortBy(sortBy: 'name' | 'date' | 'type' | 'size'): void;
  setSortOrder(order: 'asc' | 'desc'): void;
  setViewMode(mode: 'list' | 'grid' | 'icons'): void;
}

export function createBrowserManager(): BrowserManager {
  const state: import('./types.js').BrowserState = {
    selectedCategory: null,
    selectedPlace: null,
    selectedCollection: null,
    searchQuery: '',
    selectedItem: null,
    expandedFolders: new Set(),
    recentItems: [],
    sortBy: 'name',
    sortOrder: 'asc',
    viewMode: 'list',
  };

  function getState(): import('./types.js').BrowserState {
    return { ...state, expandedFolders: new Set(state.expandedFolders) };
  }

  function setState(newState: Partial<import('./types.js').BrowserState>): void {
    Object.assign(state, newState);
  }

  function selectCategory(category: import('./types.js').BrowserCategory | null): void {
    state.selectedCategory = category;
    state.selectedPlace = null;
    state.selectedCollection = null;
  }

  function selectPlace(placeId: string | null): void {
    state.selectedPlace = placeId;
    state.selectedCategory = null;
    state.selectedCollection = null;
  }

  function selectCollection(collectionId: string | null): void {
    state.selectedCollection = collectionId;
    state.selectedCategory = null;
    state.selectedPlace = null;
  }

  function selectItem(itemId: string | null): void {
    state.selectedItem = itemId;
    if (itemId) {
      state.recentItems = [itemId, ...state.recentItems.filter(id => id !== itemId)].slice(0, 50);
    }
  }

  function setSearchQuery(query: string): void {
    state.searchQuery = query;
  }

  function toggleFolder(folderId: string): void {
    if (state.expandedFolders.has(folderId)) {
      state.expandedFolders.delete(folderId);
    } else {
      state.expandedFolders.add(folderId);
    }
  }

  function setSortBy(sortBy: 'name' | 'date' | 'type' | 'size'): void {
    state.sortBy = sortBy;
  }

  function setSortOrder(order: 'asc' | 'desc'): void {
    state.sortOrder = order;
  }

  function setViewMode(mode: 'list' | 'grid' | 'icons'): void {
    state.viewMode = mode;
  }

  return {
    getState,
    setState,
    selectCategory,
    selectPlace,
    selectCollection,
    selectItem,
    setSearchQuery,
    toggleFolder,
    setSortBy,
    setSortOrder,
    setViewMode,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Get icon for browser category
 */
export function getCategoryIcon(category: import('./types.js').BrowserCategory): string {
  const icons: Record<import('./types.js').BrowserCategory, string> = {
    'sounds': '🔊',
    'drums': '🥁',
    'instruments': '🎹',
    'audio-effects': '🔧',
    'midi-effects': '🎛️',
    'max-for-live': '⚡',
    'plugins': '🔌',
    'clips': '🎵',
    'samples': '🎙️',
    'grooves': '🕐',
    'templates': '📋',
  };
  return icons[category] || '📁';
}

/**
 * Get color for collection
 */
export function getCollectionColor(collectionId: string): string {
  const colors: Record<string, string> = {
    'favorites': '#FFD700',
    'red': '#FF6B6B',
    'orange': '#FF9F43',
    'yellow': '#Feca57',
    'green': '#1dd1a1',
    'blue': '#54a0ff',
    'purple': '#5f27cd',
  };
  return colors[collectionId] || '#888888';
}

// ============================================================================
// Version
// ============================================================================

export const VERSION = '0.1.0';
