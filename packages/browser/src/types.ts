/**
 * Browser system types
 */

// ============================================================================
// Content Types
// ============================================================================

export type BrowserCategory =
  | 'sounds'
  | 'drums'
  | 'instruments'
  | 'audio-effects'
  | 'midi-effects'
  | 'max-for-live'
  | 'plugins'
  | 'clips'
  | 'samples'
  | 'grooves'
  | 'templates';

export type BrowserContentType =
  | 'preset'
  | 'sample'
  | 'clip'
  | 'device'
  | 'groove'
  | 'template'
  | 'folder';

export interface BrowserItem {
  id: string;
  name: string;
  type: BrowserContentType;
  category: BrowserCategory;
  path: string;
  
  // Metadata
  author?: string;
  description?: string;
  tags: string[];
  color?: string;
  
  // File info
  size: number;
  modified: Date;
  
  // Preview
  hasPreview: boolean;
  previewDuration?: number;
  
  // Favorites/Collections
  isFavorite: boolean;
  collection?: string;
  
  // Pack
  packId?: string;
}

// ============================================================================
// Browser Structure
// ============================================================================

export interface BrowserCategory {
  id: BrowserCategory;
  name: string;
  icon: string;
  items: BrowserItem[];
}

export interface BrowserPlace {
  id: string;
  name: string;
  path: string;
  icon: string;
  isSystem: boolean;
}

export interface BrowserPack {
  id: string;
  name: string;
  author: string;
  version: string;
  installDate: Date;
  size: number;
  isInstalled: boolean;
  isFactory: boolean;
}

export interface BrowserCollection {
  id: string;
  name: string;
  color: string;
  items: string[]; // item IDs
}

// ============================================================================
// Search
// ============================================================================

export interface SearchQuery {
  text: string;
  categories?: BrowserCategory[];
  tags?: string[];
  author?: string;
  type?: BrowserContentType;
  hasPreview?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SearchResult {
  items: BrowserItem[];
  totalCount: number;
  query: SearchQuery;
}

export interface SearchIndex {
  items: Map<string, BrowserItem>;
  tags: Map<string, Set<string>>;
  authors: Map<string, Set<string>>;
}

// ============================================================================
// Preview
// ============================================================================

export interface PreviewPlayer {
  load(item: BrowserItem): Promise<void>;
  play(): void;
  stop(): void;
  pause(): void;
  setVolume(volume: number): void;
  isPlaying(): boolean;
  getDuration(): number;
  getCurrentTime(): number;
  seek(time: number): void;
}

export interface PreviewOptions {
  autoPreview: boolean;
  previewLength: number; // seconds, 0 = full
  previewFadeIn: number; // ms
  previewFadeOut: number; // ms
  volume: number;
}

export const DEFAULT_PREVIEW_OPTIONS: PreviewOptions = {
  autoPreview: true,
  previewLength: 0,
  previewFadeIn: 10,
  previewFadeOut: 50,
  volume: 0.8,
};

// ============================================================================
// Metadata
// ============================================================================

export interface Metadata {
  title?: string;
  author?: string;
  description?: string;
  tags: string[];
  bpm?: number;
  key?: string;
  duration?: number;
  sampleRate?: number;
  channels?: number;
  fileFormat?: string;
  created?: Date;
  modified?: Date;
}

export interface MetadataEditor {
  load(item: BrowserItem): Promise<Metadata>;
  save(item: BrowserItem, metadata: Metadata): Promise<void>;
  extractFromAudio(file: File): Promise<Partial<Metadata>>;
  extractFromMidi(file: File): Promise<Partial<Metadata>>;
}

// ============================================================================
// Drag and Drop
// ============================================================================

export interface DragDropData {
  item: BrowserItem;
  source: 'browser' | 'external';
  offsetX: number;
  offsetY: number;
}

export type DropTarget =
  | 'track'
  | 'clip-slot'
  | 'device-chain'
  | 'arrangement'
  | 'sample-editor';

export interface DropOperation {
  target: DropTarget;
  targetId: string;
  action: 'load' | 'replace' | 'add';
  item: BrowserItem;
}

// ============================================================================
// Hot-swap
// ============================================================================

export interface HotSwapContext {
  deviceId: string;
  trackId: string;
  currentPresetId?: string;
  deviceType: string;
}

export interface HotSwapManager {
  enter(context: HotSwapContext): void;
  exit(): void;
  isActive(): boolean;
  getContext(): HotSwapContext | null;
  select(item: BrowserItem): void;
}

// ============================================================================
// Browser State
// ============================================================================

export interface BrowserState {
  selectedCategory: BrowserCategory | null;
  selectedPlace: string | null;
  selectedCollection: string | null;
  searchQuery: string;
  selectedItem: string | null;
  expandedFolders: Set<string>;
  recentItems: string[];
  sortBy: 'name' | 'date' | 'type' | 'size';
  sortOrder: 'asc' | 'desc';
  viewMode: 'list' | 'grid' | 'icons';
}

export const DEFAULT_BROWSER_STATE: BrowserState = {
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

// ============================================================================
// Events
// ============================================================================

export type BrowserEventType =
  | 'item-selected'
  | 'item-loaded'
  | 'search-complete'
  | 'preview-start'
  | 'preview-stop'
  | 'collection-changed'
  | 'favorites-changed'
  | 'drag-start'
  | 'drop-complete';

export interface BrowserEvent {
  type: BrowserEventType;
  timestamp: number;
  data?: unknown;
}

export type BrowserEventHandler = (event: BrowserEvent) => void;
