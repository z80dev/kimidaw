/**
 * Note Renderer
 * 
 * Renders MIDI notes on the piano roll grid.
 */

import { DAW_COLORS, DAW_TYPOGRAPHY } from '@daw/ui-shell';
import type { MidiNote } from '@daw/project-schema';
import type { PianoRollViewport, PianoRollConfig } from '../types.js';

/**
 * Note render options
 */
export interface NoteRenderOptions {
  width: number;
  height: number;
  viewport: PianoRollViewport;
  notes: MidiNote[];
  selectedNoteIds: Set<string>;
  config: PianoRollConfig;
}

/**
 * Visual representation of a note
 */
export interface NoteVisual {
  note: MidiNote;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
}

/**
 * Note renderer
 */
export class NoteRenderer {
  private ctx: CanvasRenderingContext2D;
  private options: NoteRenderOptions;
  
  constructor(ctx: CanvasRenderingContext2D, options: NoteRenderOptions) {
    this.ctx = ctx;
    this.options = options;
  }
  
  render(): void {
    const { ctx, options } = this;
    const { width, height, viewport, notes, selectedNoteIds } = options;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Sort notes by pitch (draw lower notes first)
    const sortedNotes = [...notes].sort((a, b) => a.pitch - b.pitch);
    
    for (const note of sortedNotes) {
      // Skip if outside viewport
      if (note.pitch < viewport.minPitch || note.pitch > viewport.maxPitch) continue;
      if (note.startTick + note.duration < viewport.startTick) continue;
      
      const noteEnd = note.startTick + note.duration;
      const visibleEnd = viewport.startTick + width / viewport.pixelsPerTick;
      if (note.startTick > visibleEnd) continue;
      
      const x = (note.startTick - viewport.startTick) * viewport.pixelsPerTick;
      const y = (viewport.maxPitch - note.pitch) * viewport.pixelsPerSemitone;
      const noteWidth = note.duration * viewport.pixelsPerTick;
      const noteHeight = viewport.pixelsPerSemitone;
      
      const isSelected = selectedNoteIds.has(note.id);
      
      this.renderNote(note, x, y, noteWidth, noteHeight, isSelected);
    }
  }
  
  private renderNote(
    note: MidiNote,
    x: number,
    y: number,
    width: number,
    height: number,
    isSelected: boolean
  ): void {
    const { ctx } = this;
    const { options } = this;
    
    // Note color based on velocity
    const velocityAlpha = 0.5 + (note.velocity / 127) * 0.5;
    const baseColor = DAW_COLORS.accentBlue;
    
    // Note body
    ctx.fillStyle = isSelected 
      ? DAW_COLORS.accentCyan
      : this.hexToRgba(baseColor, velocityAlpha);
    
    const padding = 1;
    ctx.fillRect(
      Math.max(0, x),
      y + padding,
      Math.max(2, width),
      height - padding * 2
    );
    
    // Selection border
    if (isSelected) {
      ctx.strokeStyle = DAW_COLORS.selectionBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.max(0, x) + 1,
        y + padding + 1,
        Math.max(2, width) - 2,
        height - padding * 2 - 2
      );
    } else {
      // Subtle border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(
        Math.max(0, x),
        y + padding,
        Math.max(2, width),
        height - padding * 2
      );
    }
    
    // Velocity indicator (small bar at bottom)
    const velocityWidth = (note.velocity / 127) * Math.max(2, width);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(
      Math.max(0, x),
      y + height - 4,
      velocityWidth,
      3
    );
    
    // Note name for longer notes
    if (width > 30 && height > 14) {
      ctx.font = `${DAW_TYPOGRAPHY.sizeXs} ${DAW_TYPOGRAPHY.fontFamilySans}`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(
        `${note.pitch}`,
        Math.max(2, x + 2),
        y + 4
      );
    }
  }
  
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  /**
   * Hit test for note click
   */
  hitTest(screenX: number, screenY: number): MidiNote | null {
    const { viewport, notes } = this.options;
    
    const tick = viewport.startTick + screenX / viewport.pixelsPerTick;
    const pitch = viewport.maxPitch - Math.floor(screenY / viewport.pixelsPerSemitone);
    
    // Find note at position (reverse order to get top-most)
    for (let i = notes.length - 1; i >= 0; i--) {
      const note = notes[i];
      if (
        tick >= note.startTick &&
        tick < note.startTick + note.duration &&
        pitch === note.pitch
      ) {
        return note;
      }
    }
    
    return null;
  }
}
