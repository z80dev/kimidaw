/**
 * Velocity Renderer
 * 
 * Renders velocity bars for MIDI notes.
 */

import { DAW_COLORS, DAW_TYPOGRAPHY } from '@daw/ui-shell';
import type { MidiNote } from '@daw/project-schema';
import type { PianoRollViewport } from '../types.js';

/**
 * Velocity render options
 */
export interface VelocityRenderOptions {
  width: number;
  height: number;
  viewport: PianoRollViewport;
  notes: MidiNote[];
  selectedNoteIds: Set<string>;
}

/**
 * Velocity bar visual
 */
export interface VelocityBar {
  note: MidiNote;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
}

/**
 * Velocity renderer
 */
export class VelocityRenderer {
  private ctx: CanvasRenderingContext2D;
  private options: VelocityRenderOptions;
  
  constructor(ctx: CanvasRenderingContext2D, options: VelocityRenderOptions) {
    this.ctx = ctx;
    this.options = options;
  }
  
  render(): void {
    const { ctx, options } = this;
    const { width, height, viewport, notes, selectedNoteIds } = options;
    
    // Clear background
    ctx.fillStyle = DAW_COLORS.bgMedium;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    this.renderGrid();
    
    // Draw velocity bars
    for (const note of notes) {
      // Skip if outside viewport
      const noteEnd = note.startTick + note.duration;
      const visibleEnd = viewport.startTick + width / viewport.pixelsPerTick;
      if (note.startTick > visibleEnd || noteEnd < viewport.startTick) continue;
      
      const x = (note.startTick - viewport.startTick) * viewport.pixelsPerTick;
      const barWidth = Math.max(2, note.duration * viewport.pixelsPerTick);
      const barHeight = (note.velocity / 127) * height;
      const y = height - barHeight;
      
      const isSelected = selectedNoteIds.has(note.id);
      
      // Bar
      ctx.fillStyle = isSelected ? DAW_COLORS.accentCyan : DAW_COLORS.accentBlue;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Border
      ctx.strokeStyle = isSelected ? DAW_COLORS.selectionBorder : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x, y, barWidth, barHeight);
    }
    
    // Draw mean velocity line
    if (notes.length > 0) {
      const meanVelocity = notes.reduce((sum, n) => sum + n.velocity, 0) / notes.length;
      const y = height - (meanVelocity / 127) * height;
      
      ctx.strokeStyle = DAW_COLORS.textTertiary;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Label
      ctx.font = `${DAW_TYPOGRAPHY.sizeXs} ${DAW_TYPOGRAPHY.fontFamilySans}`;
      ctx.fillStyle = DAW_COLORS.textTertiary;
      ctx.textAlign = 'right';
      ctx.fillText(`avg: ${Math.round(meanVelocity)}`, width - 4, y - 4);
    }
  }
  
  private renderGrid(): void {
    const { ctx, options } = this;
    const { width, height } = options;
    
    // Horizontal grid lines
    const steps = [0, 32, 64, 96, 127];
    
    for (const step of steps) {
      const y = height - (step / 127) * height;
      
      ctx.strokeStyle = DAW_COLORS.borderSubtle;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Label
      ctx.font = `${DAW_TYPOGRAPHY.sizeXs} ${DAW_TYPOGRAPHY.fontFamilySans}`;
      ctx.fillStyle = DAW_COLORS.textTertiary;
      ctx.textAlign = 'left';
      ctx.fillText(`${step}`, 4, y - 4);
    }
  }
  
  /**
   * Hit test for velocity bar click
   */
  hitTest(screenX: number, screenY: number): MidiNote | null {
    const { viewport, notes, height } = this.options;
    
    const tick = viewport.startTick + screenX / viewport.pixelsPerTick;
    
    // Find note at tick position
    for (let i = notes.length - 1; i >= 0; i--) {
      const note = notes[i];
      if (tick >= note.startTick && tick < note.startTick + note.duration) {
        return note;
      }
    }
    
    return null;
  }
}
