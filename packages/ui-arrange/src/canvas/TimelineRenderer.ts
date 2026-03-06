/**
 * Timeline Renderer
 * 
 * Canvas-based rendering for timeline grid, bar numbers, and playhead.
 * Optimized for 60fps scrolling and zooming.
 */

import { DAW_COLORS, DAW_TYPOGRAPHY } from '@daw/ui-shell';
import type { ArrangeViewport, ArrangeConfig, GridLine } from '../types.js';

/**
 * Options for TimelineRenderer
 */
export interface TimelineRendererOptions {
  /** Canvas width */
  width: number;
  
  /** Canvas height */
  height: number;
  
  /** Current viewport */
  viewport: ArrangeViewport;
  
  /** View configuration */
  config: ArrangeConfig;
  
  /** PPQ (pulses per quarter) */
  ppq?: number;
}

/**
 * View range in ticks
 */
export interface ViewRange {
  startTick: number;
  endTick: number;
}

/**
 * Current render state
 */
export interface TimelineRenderState {
  gridLines: GridLine[];
  barNumbers: { x: number; label: string }[];
}

/**
 * Timeline grid renderer
 * 
 * Renders the background grid and bar numbers for the timeline.
 * Optimized to only render visible elements.
 */
export class TimelineRenderer {
  private ctx: CanvasRenderingContext2D;
  private options: TimelineRendererOptions;
  private ppq: number;
  
  constructor(ctx: CanvasRenderingContext2D, options: TimelineRendererOptions) {
    this.ctx = ctx;
    this.options = options;
    this.ppq = options.ppq ?? 960;
  }
  
  /**
   * Main render method
   */
  render(): void {
    this.renderGrid();
    if (this.options.config.showBarNumbers) {
      this.renderBarNumbers();
    }
  }
  
  /**
   * Render grid lines
   */
  private renderGrid(): void {
    const { ctx, options } = this;
    const { width, height, viewport, config } = options;
    
    // Calculate visible tick range
    const startTick = viewport.startTick;
    const endTick = startTick + width / viewport.pixelsPerTick;
    
    // Calculate grid divisions based on zoom
    const pixelsPerBar = this.ppq * 4 * viewport.pixelsPerTick;
    const pixelsPerBeat = this.ppq * viewport.pixelsPerTick;
    
    // Determine which grid lines to show based on zoom
    let barStep = 1;
    let beatStep = 1;
    let showSubdivisions = false;
    
    if (pixelsPerBar < 20) {
      // Very zoomed out - show every 4 bars
      barStep = 4;
    } else if (pixelsPerBar < 50) {
      // Zoomed out - show every bar
      barStep = 1;
    }
    
    if (pixelsPerBeat < 10) {
      // Too zoomed out for beats
      beatStep = 0;
    } else if (pixelsPerBeat < 30) {
      // Show every 2 beats
      beatStep = 2;
    }
    
    if (pixelsPerBeat > 60 && config.showMinorGrid) {
      showSubdivisions = true;
    }
    
    ctx.lineWidth = 1;
    
    // Render bar lines
    const firstBar = Math.floor(startTick / (this.ppq * 4));
    const lastBar = Math.ceil(endTick / (this.ppq * 4));
    
    for (let bar = firstBar; bar <= lastBar; bar += barStep) {
      const tick = bar * this.ppq * 4;
      const x = (tick - startTick) * viewport.pixelsPerTick;
      
      if (x >= -1 && x <= width + 1) {
        ctx.strokeStyle = DAW_COLORS.gridBar;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }
    
    // Render beat lines
    if (beatStep > 0) {
      for (let bar = firstBar; bar <= lastBar; bar++) {
        for (let beat = 1; beat < 4; beat += beatStep) {
          const tick = bar * this.ppq * 4 + beat * this.ppq;
          const x = (tick - startTick) * viewport.pixelsPerTick;
          
          if (x >= -1 && x <= width + 1) {
            ctx.strokeStyle = DAW_COLORS.gridMajor;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
        }
      }
    }
    
    // Render subdivision lines
    if (showSubdivisions) {
      const subdivisions = config.snapDivision;
      const ticksPerSubdivision = this.ppq / subdivisions;
      
      for (let tick = Math.floor(startTick / ticksPerSubdivision) * ticksPerSubdivision; 
           tick <= endTick; 
           tick += ticksPerSubdivision) {
        // Skip if on beat or bar
        if (tick % this.ppq === 0) continue;
        
        const x = (tick - startTick) * viewport.pixelsPerTick;
        
        if (x >= -1 && x <= width + 1) {
          ctx.strokeStyle = DAW_COLORS.gridMinor;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }
    }
  }
  
  /**
   * Render bar numbers
   */
  private renderBarNumbers(): void {
    const { ctx, options } = this;
    const { width, viewport } = options;
    
    const startTick = viewport.startTick;
    const endTick = startTick + width / viewport.pixelsPerTick;
    
    const ticksPerBar = this.ppq * 4;
    const firstBar = Math.floor(startTick / ticksPerBar);
    const lastBar = Math.ceil(endTick / ticksPerBar);
    
    ctx.font = `${DAW_TYPOGRAPHY.sizeSm} ${DAW_TYPOGRAPHY.fontFamilySans}`;
    ctx.fillStyle = DAW_COLORS.textTertiary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    for (let bar = firstBar; bar <= lastBar; bar++) {
      const tick = bar * ticksPerBar;
      const x = (tick - startTick) * viewport.pixelsPerTick;
      
      // Only draw if there's enough space
      const pixelsPerBar = ticksPerBar * viewport.pixelsPerTick;
      if (pixelsPerBar < 30 && bar % 2 !== 0) continue;
      if (pixelsPerBar < 15 && bar % 4 !== 0) continue;
      
      if (x >= 0 && x <= width - 20) {
        ctx.fillText(`${bar + 1}`, x + 4, 4);
      }
    }
  }
  
  /**
   * Calculate grid lines for a range
   */
  calculateGridLines(startTick: number, endTick: number): GridLine[] {
    const lines: GridLine[] = [];
    const ticksPerBar = this.ppq * 4;
    
    const firstBar = Math.floor(startTick / ticksPerBar);
    const lastBar = Math.ceil(endTick / ticksPerBar);
    
    for (let bar = firstBar; bar <= lastBar; bar++) {
      const tick = bar * ticksPerBar;
      lines.push({
        x: 0, // Will be calculated during render
        tick,
        isBar: true,
        isBeat: false,
        label: `${bar + 1}`,
      });
      
      // Beat lines
      for (let beat = 1; beat < 4; beat++) {
        lines.push({
          x: 0,
          tick: tick + beat * this.ppq,
          isBar: false,
          isBeat: true,
        });
      }
    }
    
    return lines;
  }
}
