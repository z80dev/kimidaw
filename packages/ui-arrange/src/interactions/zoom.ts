/**
 * Zoom Controller
 * 
 * Manages zoom and pan state for the timeline.
 * Provides smooth zooming with mouse wheel and keyboard shortcuts.
 */

/**
 * Zoom state
 */
export interface ZoomState {
  /** Horizontal zoom (pixels per tick) */
  pixelsPerTick: number;
  
  /** Vertical zoom (track height in pixels) */
  trackHeight: number;
  
  /** Start tick in view */
  startTick: number;
  
  /** Start track index in view */
  startTrackIndex: number;
}

/**
 * Zoom constraints
 */
export interface ZoomConstraints {
  /** Minimum horizontal zoom */
  minZoom: number;
  
  /** Maximum horizontal zoom */
  maxZoom: number;
  
  /** Minimum track height */
  minTrackHeight: number;
  
  /** Maximum track height */
  maxTrackHeight: number;
}

/**
 * Zoom options
 */
export interface ZoomOptions extends Partial<ZoomConstraints> {
  /** Initial zoom state */
  initialState?: Partial<ZoomState>;
  
  /** Zoom factor for wheel zoom */
  zoomFactor?: number;
  
  /** Callback when zoom changes */
  onZoomChange?: (state: ZoomState) => void;
  
  /** Callback when pan changes */
  onPanChange?: (state: ZoomState) => void;
}

/**
 * Zoom controller class
 * 
 * Manages zoom and pan state with constraints and smooth transitions.
 * 
 * @example
 * ```ts
 * const zoom = new ZoomController({
 *   minZoom: 0.01,
 *   maxZoom: 10,
 *   onZoomChange: (state) => updateViewport(state),
 * });
 * 
 * zoom.zoomIn();
 * zoom.zoomOut();
 * zoom.zoomToFit(0, 960 * 16); // Fit 16 bars
 * zoom.panTo(tick);
 * ```
 */
export class ZoomController {
  private state: ZoomState;
  private constraints: ZoomConstraints;
  private options: ZoomOptions;
  
  constructor(options: ZoomOptions = {}) {
    this.constraints = {
      minZoom: options.minZoom ?? 0.001,
      maxZoom: options.maxZoom ?? 10,
      minTrackHeight: options.minTrackHeight ?? 32,
      maxTrackHeight: options.maxTrackHeight ?? 256,
    };
    
    this.options = {
      zoomFactor: 1.2,
      ...options,
    };
    
    this.state = {
      pixelsPerTick: 0.1,
      trackHeight: 64,
      startTick: 0,
      startTrackIndex: 0,
      ...options.initialState,
    };
    
    this.clampState();
  }
  
  /**
   * Get current zoom state
   */
  getState(): ZoomState {
    return { ...this.state };
  }
  
  /**
   * Zoom in horizontally
   */
  zoomIn(focusPoint?: { tick: number; x: number }): void {
    const factor = this.options.zoomFactor ?? 1.2;
    this.setHorizontalZoom(this.state.pixelsPerTick * factor, focusPoint);
  }
  
  /**
   * Zoom out horizontally
   */
  zoomOut(focusPoint?: { tick: number; x: number }): void {
    const factor = this.options.zoomFactor ?? 1.2;
    this.setHorizontalZoom(this.state.pixelsPerTick / factor, focusPoint);
  }
  
  /**
   * Set horizontal zoom level
   */
  setHorizontalZoom(pixelsPerTick: number, focusPoint?: { tick: number; x: number }): void {
    const oldZoom = this.state.pixelsPerTick;
    const newZoom = this.clamp(pixelsPerTick, this.constraints.minZoom, this.constraints.maxZoom);
    
    if (focusPoint) {
      // Zoom towards focus point
      const focusTick = focusPoint.tick;
      const focusOffset = focusPoint.x;
      
      // Calculate new start tick to keep focus point in same screen position
      const newStartTick = focusTick - (focusOffset / newZoom);
      this.state.startTick = Math.max(0, newStartTick);
    }
    
    this.state.pixelsPerTick = newZoom;
    this.options.onZoomChange?.(this.getState());
  }
  
  /**
   * Zoom to fit a range
   */
  zoomToFit(startTick: number, endTick: number, width: number, padding = 0.1): void {
    const duration = endTick - startTick;
    const paddedDuration = duration * (1 + padding * 2);
    const targetZoom = width / paddedDuration;
    
    this.state.pixelsPerTick = this.clamp(
      targetZoom,
      this.constraints.minZoom,
      this.constraints.maxZoom
    );
    
    this.state.startTick = Math.max(0, startTick - duration * padding);
    
    this.options.onZoomChange?.(this.getState());
  }
  
  /**
   * Zoom to selection
   */
  zoomToSelection(selectionStart: number, selectionEnd: number, width: number): void {
    this.zoomToFit(selectionStart, selectionEnd, width);
  }
  
  /**
   * Zoom to show entire project
   */
  zoomToProject(totalTicks: number, width: number): void {
    this.zoomToFit(0, totalTicks, width);
  }
  
  /**
   * Reset zoom to default
   */
  resetZoom(): void {
    this.state.pixelsPerTick = 0.1;
    this.options.onZoomChange?.(this.getState());
  }
  
  /**
   * Increase track height
   */
  increaseTrackHeight(): void {
    this.setTrackHeight(this.state.trackHeight * 1.2);
  }
  
  /**
   * Decrease track height
   */
  decreaseTrackHeight(): void {
    this.setTrackHeight(this.state.trackHeight / 1.2);
  }
  
  /**
   * Set track height
   */
  setTrackHeight(height: number): void {
    this.state.trackHeight = this.clamp(
      height,
      this.constraints.minTrackHeight,
      this.constraints.maxTrackHeight
    );
    this.options.onZoomChange?.(this.getState());
  }
  
  /**
   * Pan to a specific tick
   */
  panTo(tick: number): void {
    this.state.startTick = Math.max(0, tick);
    this.options.onPanChange?.(this.getState());
  }
  
  /**
   * Pan by delta
   */
  panDelta(deltaTicks: number): void {
    this.state.startTick = Math.max(0, this.state.startTick + deltaTicks);
    this.options.onPanChange?.(this.getState());
  }
  
  /**
   * Pan to track
   */
  panToTrack(trackIndex: number): void {
    this.state.startTrackIndex = Math.max(0, trackIndex);
    this.options.onPanChange?.(this.getState());
  }
  
  /**
   * Scroll tracks by delta
   */
  scrollTracks(delta: number): void {
    this.state.startTrackIndex = Math.max(0, this.state.startTrackIndex + delta);
    this.options.onPanChange?.(this.getState());
  }
  
  /**
   * Center on tick
   */
  centerOn(tick: number, width: number): void {
    const visibleTicks = width / this.state.pixelsPerTick;
    this.state.startTick = Math.max(0, tick - visibleTicks / 2);
    this.options.onPanChange?.(this.getState());
  }
  
  /**
   * Get visible tick range
   */
  getVisibleRange(width: number): { start: number; end: number } {
    const visibleTicks = width / this.state.pixelsPerTick;
    return {
      start: this.state.startTick,
      end: this.state.startTick + visibleTicks,
    };
  }
  
  /**
   * Get visible track range
   */
  getVisibleTracks(height: number): { start: number; count: number } {
    const visibleCount = Math.floor(height / this.state.trackHeight);
    return {
      start: this.state.startTrackIndex,
      count: visibleCount,
    };
  }
  
  /**
   * Convert screen X to tick
   */
  screenToTick(screenX: number): number {
    return this.state.startTick + screenX / this.state.pixelsPerTick;
  }
  
  /**
   * Convert tick to screen X
   */
  tickToScreen(tick: number): number {
    return (tick - this.state.startTick) * this.state.pixelsPerTick;
  }
  
  /**
   * Convert screen Y to track index
   */
  screenToTrack(screenY: number): number {
    return this.state.startTrackIndex + Math.floor(screenY / this.state.trackHeight);
  }
  
  /**
   * Convert track index to screen Y
   */
  trackToScreen(trackIndex: number): number {
    return (trackIndex - this.state.startTrackIndex) * this.state.trackHeight;
  }
  
  /**
   * Check if zoomed in to max
   */
  isMaxZoom(): boolean {
    return this.state.pixelsPerTick >= this.constraints.maxZoom;
  }
  
  /**
   * Check if zoomed out to min
   */
  isMinZoom(): boolean {
    return this.state.pixelsPerTick <= this.constraints.minZoom;
  }
  
  /**
   * Clamp a value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
  
  /**
   * Clamp current state to constraints
   */
  private clampState(): void {
    this.state.pixelsPerTick = this.clamp(
      this.state.pixelsPerTick,
      this.constraints.minZoom,
      this.constraints.maxZoom
    );
    
    this.state.trackHeight = this.clamp(
      this.state.trackHeight,
      this.constraints.minTrackHeight,
      this.constraints.maxTrackHeight
    );
    
    this.state.startTick = Math.max(0, this.state.startTick);
    this.state.startTrackIndex = Math.max(0, this.state.startTrackIndex);
  }
}
