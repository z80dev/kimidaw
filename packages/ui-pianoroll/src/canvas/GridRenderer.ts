/**
 * Grid Renderer
 * 
 * Renders the piano roll grid with bar/beat lines and scale highlighting.
 */

import { DAW_COLORS, DAW_TYPOGRAPHY } from '@daw/ui-shell';
import type { PianoRollViewport, PianoRollConfig } from '../types.js';
import { isPitchInScale, isBlackKey } from '../types.js';

/**
 * Grid render options
 */
export interface GridRenderOptions {
  width: number;
  height: number;
  viewport: PianoRollViewport;
  config: PianoRollConfig;
  ppq?: number;
}

/**
 * Grid metrics
 */
export interface GridMetrics {
  barLines: number[];
  beatLines: number[];
  subdivisionLines: number[];
}

/**
 * Grid renderer
 */
export class GridRenderer {
  private ctx: CanvasRenderingContext2D;
  private options: GridRenderOptions;
  private ppq: number;
  
  constructor(ctx: CanvasRenderingContext2D, options: GridRenderOptions) {
    this.ctx = ctx;
    this.options = options;
    this.ppq = options.ppq ?? 960;
  }
  
  render(): void {
    const { ctx, options } = this;
    const { width, height, viewport, config } = options;
    
    // Clear background
    ctx.fillStyle = DAW_COLORS.bgDark;
    ctx.fillRect(0, 0, width, height);
    
    // Render row backgrounds (pitch-based)
    this.renderRows();
    
    // Render vertical grid lines (time-based)
    this.renderVerticalGrid();
    
    // Render octave lines
    this.renderOctaveLines();
  }
  
  private renderRows(): void {
    const { ctx, options } = this;
    const { width, viewport, config } = options;
    
    for (let pitch = viewport.minPitch; pitch <= viewport.maxPitch; pitch++) {
      const y = (viewport.maxPitch - pitch) * viewport.pixelsPerSemitone;
      const isBlack = isBlackKey(pitch);
      const inScale = isPitchInScale(pitch, config.scaleRoot, config.scaleMode);
      
      // Row background
      if (isBlack) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, y, width, viewport.pixelsPerSemitone);
      }
      
      // Scale highlighting
      if (inScale && config.showScaleHighlight) {
        ctx.fillStyle = 'rgba(74, 158, 255, 0.05)';
        ctx.fillRect(0, y, width, viewport.pixelsPerSemitone);
      }
      
      // Row separator
      ctx.strokeStyle = DAW_COLORS.borderSubtle;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y + viewport.pixelsPerSemitone - 0.5);
      ctx.lineTo(width, y + viewport.pixelsPerSemitone - 0.5);
      ctx.stroke();
    }
  }
  
  private renderVerticalGrid(): void {
    const { ctx, options } = this;
    const { width, viewport, config } = options;
    
    const startTick = viewport.startTick;
    const endTick = startTick + width / viewport.pixelsPerTick;
    
    const pixelsPerBar = this.ppq * 4 * viewport.pixelsPerTick;
    const pixelsPerBeat = this.ppq * viewport.pixelsPerTick;
    
    // Determine grid density based on zoom
    let showSubdivisions = pixelsPerBeat > 40 && config.snapToGrid;
    let subdivisionTicks = this.ppq / config.snapDivision;
    
    // Bar lines
    const firstBar = Math.floor(startTick / (this.ppq * 4));
    const lastBar = Math.ceil(endTick / (this.ppq * 4));
    
    for (let bar = firstBar; bar <= lastBar; bar++) {
      const tick = bar * this.ppq * 4;
      const x = (tick - startTick) * viewport.pixelsPerTick;
      
      if (x >= -1 && x <= width + 1) {
        ctx.strokeStyle = DAW_COLORS.gridBar;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, options.height);
        ctx.stroke();
        
        // Bar number
        ctx.font = `${DAW_TYPOGRAPHY.sizeXs} ${DAW_TYPOGRAPHY.fontFamilySans}`;
        ctx.fillStyle = DAW_COLORS.textTertiary;
        ctx.textAlign = 'left';
        ctx.fillText(`${bar + 1}`, x + 2, 12);
      }
    }
    
    // Beat lines
    if (pixelsPerBeat > 15) {
      for (let bar = firstBar; bar <= lastBar; bar++) {
        for (let beat = 1; beat < 4; beat++) {
          const tick = bar * this.ppq * 4 + beat * this.ppq;
          const x = (tick - startTick) * viewport.pixelsPerTick;
          
          if (x >= -1 && x <= width + 1) {
            ctx.strokeStyle = DAW_COLORS.gridMajor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, options.height);
            ctx.stroke();
          }
        }
      }
    }
    
    // Subdivision lines
    if (showSubdivisions) {
      for (let tick = Math.floor(startTick / subdivisionTicks) * subdivisionTicks;
           tick <= endTick;
           tick += subdivisionTicks) {
        if (tick % this.ppq === 0) continue; // Skip beat lines
        
        const x = (tick - startTick) * viewport.pixelsPerTick;
        
        if (x >= -1 && x <= width + 1) {
          ctx.strokeStyle = DAW_COLORS.gridMinor;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, options.height);
          ctx.stroke();
        }
      }
    }
  }
  
  private renderOctaveLines(): void {
    const { ctx, options } = this;
    const { width, viewport } = options;
    
    // Highlight octave boundaries (C notes)
    for (let pitch = viewport.minPitch; pitch <= viewport.maxPitch; pitch++) {
      if (pitch % 12 === 0) {
        const y = (viewport.maxPitch - pitch) * viewport.pixelsPerSemitone;
        ctx.strokeStyle = DAW_COLORS.borderStrong;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }
    }
  }
}
