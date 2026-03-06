/**
 * Drag and Drop Manager
 * 
 * Handles drag and drop operations for clips and other timeline items.
 * Supports moving, copying, and resizing operations.
 */

import type { SelectableItem } from './selection.js';

/**
 * Drag item types
 */
export type DragItemType = 'clip' | 'note' | 'automation-point' | 'browser-item';

/**
 * Drag item data
 */
export interface DragItem {
  type: DragItemType;
  id: string;
  sourceTrackId?: string;
  data?: unknown;
}

/**
 * Drag operation state
 */
export interface DragDropState {
  /** Whether currently dragging */
  isDragging: boolean;
  
  /** Item being dragged */
  dragItem?: DragItem;
  
  /** Original position */
  startPosition: { x: number; y: number };
  
  /** Current position */
  currentPosition: { x: number; y: number };
  
  /** Delta from start */
  delta: { x: number; y: number };
  
  /** Operation type */
  operation: 'move' | 'copy' | 'resize-start' | 'resize-end' | 'none';
  
  /** Target track index (if applicable) */
  targetTrackIndex?: number;
  
  /** Target tick position */
  targetTick?: number;
}

/**
 * Drag and drop options
 */
export interface DragDropOptions {
  /** Grid size for snapping (in ticks) */
  snapGrid?: number;
  
  /** Whether to enable snapping */
  snapEnabled?: boolean;
  
  /** Callback when drag starts */
  onDragStart?: (item: DragItem, state: DragDropState) => void;
  
  /** Callback during drag */
  onDragMove?: (state: DragDropState) => void;
  
  /** Callback when drag ends */
  onDragEnd?: (state: DragDropState) => void;
  
  /** Callback when drop occurs */
  onDrop?: (item: DragItem, state: DragDropState) => void;
}

/**
 * Drag and drop manager
 * 
 * @example
 * ```ts
 * const dragDrop = new DragDropManager({
 *   snapGrid: 240, // Snap to 16th notes at 960 PPQ
 *   onDragEnd: (state) => {
 *     if (state.operation === 'move') {
 *       moveClip(state.dragItem!.id, state.targetTick!, state.targetTrackIndex!);
 *     }
 *   },
 * });
 * 
 * dragDrop.startDrag(
 *   { type: 'clip', id: 'clip1', sourceTrackId: 'track1' },
 *   { x: 100, y: 64 }
 * );
 * ```
 */
export class DragDropManager {
  private state: DragDropState;
  private options: DragDropOptions;
  
  constructor(options: DragDropOptions = {}) {
    this.options = {
      snapGrid: 240,
      snapEnabled: true,
      ...options,
    };
    
    this.state = {
      isDragging: false,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      delta: { x: 0, y: 0 },
      operation: 'none',
    };
  }
  
  /**
   * Get current drag state
   */
  getState(): DragDropState {
    return { ...this.state };
  }
  
  /**
   * Start a drag operation
   */
  startDrag(
    item: DragItem, 
    startPosition: { x: number; y: number },
    operation: DragDropState['operation'] = 'move'
  ): void {
    this.state = {
      isDragging: true,
      dragItem: item,
      startPosition: { ...startPosition },
      currentPosition: { ...startPosition },
      delta: { x: 0, y: 0 },
      operation,
    };
    
    this.options.onDragStart?.(item, this.state);
  }
  
  /**
   * Update drag position
   */
  updatePosition(position: { x: number; y: number }, viewport?: {
    pixelsPerTick: number;
    trackHeight: number;
    startTick: number;
    startTrackIndex: number;
  }): void {
    if (!this.state.isDragging) return;
    
    this.state.currentPosition = { ...position };
    this.state.delta = {
      x: position.x - this.state.startPosition.x,
      y: position.y - this.state.startPosition.y,
    };
    
    // Calculate target position if viewport provided
    if (viewport) {
      // Calculate target tick
      const deltaTicks = this.state.delta.x / viewport.pixelsPerTick;
      let targetTick = viewport.startTick + (this.state.startPosition.x / viewport.pixelsPerTick) + deltaTicks;
      
      // Snap to grid
      if (this.options.snapEnabled && this.options.snapGrid) {
        targetTick = Math.round(targetTick / this.options.snapGrid) * this.options.snapGrid;
      }
      
      this.state.targetTick = targetTick;
      
      // Calculate target track
      const deltaTracks = Math.round(this.state.delta.y / viewport.trackHeight);
      this.state.targetTrackIndex = viewport.startTrackIndex + 
        Math.floor(this.state.startPosition.y / viewport.trackHeight) + deltaTracks;
    }
    
    this.options.onDragMove?.(this.state);
  }
  
  /**
   * End drag operation
   */
  endDrag(): void {
    if (!this.state.isDragging) return;
    
    this.options.onDragEnd?.(this.state);
    
    if (this.state.dragItem && this.state.operation !== 'none') {
      this.options.onDrop?.(this.state.dragItem, this.state);
    }
    
    this.reset();
  }
  
  /**
   * Cancel drag operation
   */
  cancelDrag(): void {
    this.reset();
  }
  
  /**
   * Reset drag state
   */
  reset(): void {
    this.state = {
      isDragging: false,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      delta: { x: 0, y: 0 },
      operation: 'none',
    };
  }
  
  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.state.isDragging;
  }
  
  /**
   * Get the dragged item
   */
  getDragItem(): DragItem | undefined {
    return this.state.dragItem;
  }
  
  /**
   * Set operation type
   */
  setOperation(operation: DragDropState['operation']): void {
    this.state.operation = operation;
  }
  
  /**
   * Enable/disable snapping
   */
  setSnapEnabled(enabled: boolean): void {
    this.options.snapEnabled = enabled;
  }
  
  /**
   * Set snap grid size
   */
  setSnapGrid(grid: number): void {
    this.options.snapGrid = grid;
  }
  
  /**
   * Calculate snapped tick position
   */
  snapTick(tick: number): number {
    if (!this.options.snapEnabled || !this.options.snapGrid) {
      return tick;
    }
    return Math.round(tick / this.options.snapGrid) * this.options.snapGrid;
  }
}
