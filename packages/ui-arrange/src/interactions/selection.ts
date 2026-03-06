/**
 * Selection Model
 * 
 * Manages selection state for tracks, clips, and other timeline items.
 * Supports single selection, multi-selection, and range selection.
 */

/**
 * Selectable item type
 */
export type SelectableItem =
  | { type: 'track'; id: string }
  | { type: 'clip'; id: string; trackId: string }
  | { type: 'note'; id: string; clipId: string }
  | { type: 'automation'; id: string };

/**
 * Selection state
 */
export interface SelectionState {
  /** Selected track IDs */
  tracks: Set<string>;
  
  /** Selected clip IDs */
  clips: Set<string>;
  
  /** Selected note IDs */
  notes: Set<string>;
  
  /** Primary selection (for context menus) */
  primary?: SelectableItem;
}

/**
 * Selection options
 */
export interface SelectionOptions {
  /** Allow multiple selection */
  multiSelect?: boolean;
  
  /** Allow range selection */
  rangeSelect?: boolean;
  
  /** Callback when selection changes */
  onChange?: (state: SelectionState) => void;
}

/**
 * Selection model class
 * 
 * Manages complex selection state with support for:
 * - Single selection
 * - Multi-selection (ctrl/cmd click)
 * - Range selection (shift click)
 * - Select all/none/invert
 * 
 * @example
 * ```ts
 * const selection = new SelectionModel({
 *   onChange: (state) => updateUI(state),
 * });
 * 
 * selection.select({ type: 'clip', id: 'clip1', trackId: 'track1' });
 * selection.toggle({ type: 'clip', id: 'clip2', trackId: 'track1' });
 * selection.clear();
 * ```
 */
export class SelectionModel {
  private state: SelectionState;
  private options: SelectionOptions;
  private lastSelected: SelectableItem | null = null;
  
  constructor(options: SelectionOptions = {}) {
    this.options = {
      multiSelect: true,
      rangeSelect: true,
      ...options,
    };
    
    this.state = {
      tracks: new Set(),
      clips: new Set(),
      notes: new Set(),
    };
  }
  
  /**
   * Get current selection state
   */
  getState(): SelectionState {
    return {
      tracks: new Set(this.state.tracks),
      clips: new Set(this.state.clips),
      notes: new Set(this.state.notes),
      primary: this.state.primary,
    };
  }
  
  /**
   * Select an item
   */
  select(item: SelectableItem, options?: { additive?: boolean; range?: boolean }): void {
    const { additive = false, range = false } = options ?? {};
    
    if (!additive && !range) {
      // Clear existing selection
      this.state.tracks.clear();
      this.state.clips.clear();
      this.state.notes.clear();
    }
    
    if (range && this.lastSelected && this.options.rangeSelect) {
      // Range selection logic would go here
      // This requires knowledge of item ordering
    }
    
    // Add to appropriate set
    switch (item.type) {
      case 'track':
        this.state.tracks.add(item.id);
        break;
      case 'clip':
        this.state.clips.add(item.id);
        break;
      case 'note':
        this.state.notes.add(item.id);
        break;
    }
    
    this.state.primary = item;
    this.lastSelected = item;
    
    this.notifyChange();
  }
  
  /**
   * Toggle selection of an item
   */
  toggle(item: SelectableItem): void {
    const set = this.getSetForType(item.type);
    
    if (set.has(item.id)) {
      set.delete(item.id);
      if (this.state.primary?.id === item.id) {
        this.state.primary = undefined;
      }
    } else {
      set.add(item.id);
      this.state.primary = item;
      this.lastSelected = item;
    }
    
    this.notifyChange();
  }
  
  /**
   * Deselect an item
   */
  deselect(item: SelectableItem): void {
    const set = this.getSetForType(item.type);
    set.delete(item.id);
    
    if (this.state.primary?.id === item.id) {
      this.state.primary = undefined;
    }
    
    this.notifyChange();
  }
  
  /**
   * Check if item is selected
   */
  isSelected(item: SelectableItem): boolean {
    const set = this.getSetForType(item.type);
    return set.has(item.id);
  }
  
  /**
   * Clear all selections
   */
  clear(): void {
    this.state.tracks.clear();
    this.state.clips.clear();
    this.state.notes.clear();
    this.state.primary = undefined;
    this.lastSelected = null;
    
    this.notifyChange();
  }
  
  /**
   * Clear specific type
   */
  clearType(type: SelectableItem['type']): void {
    switch (type) {
      case 'track':
        this.state.tracks.clear();
        break;
      case 'clip':
        this.state.clips.clear();
        break;
      case 'note':
        this.state.notes.clear();
        break;
    }
    
    if (this.state.primary?.type === type) {
      this.state.primary = undefined;
    }
    
    this.notifyChange();
  }
  
  /**
   * Select all items of a type
   */
  selectAll(type: SelectableItem['type'], ids: string[]): void {
    const set = this.getSetForType(type);
    ids.forEach(id => set.add(id));
    
    if (ids.length > 0) {
      this.state.primary = { type, id: ids[0] } as SelectableItem;
    }
    
    this.notifyChange();
  }
  
  /**
   * Invert selection for a type
   */
  invert(type: SelectableItem['type'], allIds: string[]): void {
    const set = this.getSetForType(type);
    
    for (const id of allIds) {
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
    }
    
    this.notifyChange();
  }
  
  /**
   * Get the count of selected items
   */
  getCount(): number {
    return this.state.tracks.size + this.state.clips.size + this.state.notes.size;
  }
  
  /**
   * Get selected items of a specific type
   */
  getSelected(type: SelectableItem['type']): string[] {
    return Array.from(this.getSetForType(type));
  }
  
  /**
   * Check if anything is selected
   */
  hasSelection(): boolean {
    return this.getCount() > 0;
  }
  
  /**
   * Get the primary selection
   */
  getPrimary(): SelectableItem | undefined {
    return this.state.primary;
  }
  
  /**
   * Set the primary selection without changing selection state
   */
  setPrimary(item: SelectableItem): void {
    this.state.primary = item;
    this.notifyChange();
  }
  
  /**
   * Get the Set for a specific item type
   */
  private getSetForType(type: SelectableItem['type']): Set<string> {
    switch (type) {
      case 'track':
        return this.state.tracks;
      case 'clip':
        return this.state.clips;
      case 'note':
        return this.state.notes;
      default:
        return new Set();
    }
  }
  
  /**
   * Notify listeners of selection change
   */
  private notifyChange(): void {
    this.options.onChange?.(this.getState());
  }
}
