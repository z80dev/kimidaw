/**
 * Track Header Renderer
 * 
 * Renders track headers with controls (mute, solo, arm, volume, pan).
 * Shows track name, color, and routing information.
 */

import { DAW_COLORS, DAW_TYPOGRAPHY, DAW_SPACING } from '@daw/ui-shell';
import type { Track } from '@daw/project-schema';
import type { ArrangeViewport } from '../types.js';

/**
 * Options for TrackHeaderRenderer
 */
export interface TrackHeaderOptions {
  /** Canvas width */
  width: number;
  
  /** Canvas height */
  height: number;
  
  /** Current viewport */
  viewport: ArrangeViewport;
  
  /** Tracks to render */
  tracks: Track[];
  
  /** Selected track IDs */
  selectedTrackIds: Set<string>;
}

/**
 * Track header metrics
 */
export interface TrackHeaderMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
  trackIndex: number;
}

/**
 * Track header renderer
 */
export class TrackHeaderRenderer {
  private ctx: CanvasRenderingContext2D;
  private options: TrackHeaderOptions;
  
  // Layout constants
  private readonly colorStripWidth = 4;
  private readonly controlSize = 16;
  private readonly controlGap = 4;
  
  constructor(ctx: CanvasRenderingContext2D, options: TrackHeaderOptions) {
    this.ctx = ctx;
    this.options = options;
  }
  
  /**
   * Main render method
   */
  render(): void {
    const { ctx, options } = this;
    const { width, height, viewport, tracks } = options;
    
    // Clear background
    ctx.fillStyle = DAW_COLORS.bgMedium;
    ctx.fillRect(0, 0, width, height);
    
    // Render visible track headers
    for (let i = 0; i < viewport.visibleTrackCount; i++) {
      const trackIndex = viewport.startTrackIndex + i;
      if (trackIndex >= tracks.length) break;
      
      const track = tracks[trackIndex];
      const y = i * viewport.trackHeight;
      
      this.renderTrackHeader(track, trackIndex, y);
    }
    
    // Draw separator line at bottom
    ctx.strokeStyle = DAW_COLORS.borderDefault;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 0.5);
    ctx.lineTo(width, height - 0.5);
    ctx.stroke();
  }
  
  /**
   * Render a single track header
   */
  private renderTrackHeader(track: Track, trackIndex: number, y: number): void {
    const { ctx, options } = this;
    const { width, viewport, selectedTrackIds } = options;
    const height = viewport.trackHeight;
    
    const isSelected = selectedTrackIds.has(track.id);
    const isArmed = track.arm;
    const isMuted = track.mute;
    const isSolo = track.solo;
    
    // Background
    if (isSelected) {
      ctx.fillStyle = DAW_COLORS.bgLight;
      ctx.fillRect(0, y, width, height);
    } else {
      ctx.fillStyle = DAW_COLORS.bgMedium;
      ctx.fillRect(0, y, width, height);
    }
    
    // Color strip on left
    ctx.fillStyle = track.color ?? DAW_COLORS.clipBlue;
    ctx.fillRect(0, y, this.colorStripWidth, height);
    
    // Border bottom
    ctx.strokeStyle = DAW_COLORS.borderSubtle;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + height - 0.5);
    ctx.lineTo(width, y + height - 0.5);
    ctx.stroke();
    
    // Controls position
    const controlsX = this.colorStripWidth + 8;
    const controlsY = y + 6;
    
    // Mute button (M)
    this.renderButton(
      controlsX,
      controlsY,
      'M',
      isMuted,
      isMuted ? DAW_COLORS.error : DAW_COLORS.textTertiary
    );
    
    // Solo button (S)
    this.renderButton(
      controlsX + this.controlSize + this.controlGap,
      controlsY,
      'S',
      isSolo,
      isSolo ? DAW_COLORS.accentYellow : DAW_COLORS.textTertiary
    );
    
    // Arm button (A)
    this.renderButton(
      controlsX + (this.controlSize + this.controlGap) * 2,
      controlsY,
      'A',
      isArmed,
      isArmed ? DAW_COLORS.record : DAW_COLORS.textTertiary
    );
    
    // Track name
    ctx.font = `${DAW_TYPOGRAPHY.weightMedium} ${DAW_TYPOGRAPHY.sizeSm} ${DAW_TYPOGRAPHY.fontFamilySans}`;
    ctx.fillStyle = isSelected ? DAW_COLORS.textPrimary : DAW_COLORS.textSecondary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const nameX = controlsX;
    const nameY = controlsY + this.controlSize + 4;
    const maxNameWidth = width - nameX - 8;
    
    // Truncate name if too long
    let displayName = track.name;
    const nameMetrics = ctx.measureText(displayName);
    if (nameMetrics.width > maxNameWidth) {
      // Simple truncation
      while (displayName.length > 3 && ctx.measureText(displayName + '...').width > maxNameWidth) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '...';
    }
    
    ctx.fillText(displayName, nameX, nameY, maxNameWidth);
    
    // Track type indicator
    ctx.font = `${DAW_TYPOGRAPHY.sizeXs} ${DAW_TYPOGRAPHY.fontFamilySans}`;
    ctx.fillStyle = DAW_COLORS.textTertiary;
    const typeY = nameY + 16;
    ctx.fillText(this.getTrackTypeLabel(track), nameX, typeY);
    
    // Volume fader (simplified representation)
    this.renderFader(
      width - 50,
      controlsY,
      40,
      height - 12,
      0.75, // Volume level
      'VOL'
    );
  }
  
  /**
   * Render a toggle button
   */
  private renderButton(
    x: number, 
    y: number, 
    label: string, 
    isActive: boolean,
    color: string
  ): void {
    const { ctx } = this;
    const size = this.controlSize;
    
    // Background
    ctx.fillStyle = isActive ? color : DAW_COLORS.bgDark;
    ctx.fillRect(x, y, size, size);
    
    // Border
    ctx.strokeStyle = isActive ? color : DAW_COLORS.borderDefault;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    
    // Label
    ctx.font = `bold ${DAW_TYPOGRAPHY.sizeXs} ${DAW_TYPOGRAPHY.fontFamilySans}`;
    ctx.fillStyle = isActive ? DAW_COLORS.bgDark : color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + size / 2, y + size / 2 + 1);
  }
  
  /**
   * Render a volume/pan fader
   */
  private renderFader(
    x: number,
    y: number,
    width: number,
    height: number,
    value: number,
    label: string
  ): void {
    const { ctx } = this;
    
    // Background track
    ctx.fillStyle = DAW_COLORS.bgDark;
    ctx.fillRect(x, y, width, height);
    
    // Filled portion
    const fillHeight = height * value;
    ctx.fillStyle = DAW_COLORS.accentBlue;
    ctx.fillRect(x, y + height - fillHeight, width, fillHeight);
    
    // Border
    ctx.strokeStyle = DAW_COLORS.borderDefault;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    
    // Label (only if fader is tall enough)
    if (height > 30) {
      ctx.font = `${DAW_TYPOGRAPHY.sizeXs} ${DAW_TYPOGRAPHY.fontFamilySans}`;
      ctx.fillStyle = DAW_COLORS.textTertiary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, x + width / 2, y + 4);
    }
  }
  
  /**
   * Get human-readable track type label
   */
  private getTrackTypeLabel(track: Track): string {
    const labels: Record<string, string> = {
      audio: 'Audio',
      midi: 'MIDI',
      instrument: 'Instrument',
      group: 'Group',
      return: 'Return',
      master: 'Master',
    };
    
    return labels[track.type] ?? track.type;
  }
  
  /**
   * Hit test for track header click
   */
  hitTest(x: number, y: number): TrackHeaderMetrics | null {
    const { viewport, tracks } = this.options;
    
    for (let i = 0; i < viewport.visibleTrackCount; i++) {
      const trackIndex = viewport.startTrackIndex + i;
      if (trackIndex >= tracks.length) break;
      
      const trackY = i * viewport.trackHeight;
      
      if (y >= trackY && y < trackY + viewport.trackHeight) {
        return {
          x: 0,
          y: trackY,
          width: this.options.width,
          height: viewport.trackHeight,
          trackIndex,
        };
      }
    }
    
    return null;
  }
}
