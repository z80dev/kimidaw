/**
 * Clip Renderer
 * 
 * Renders audio and MIDI clips on the timeline using Canvas2D.
 * Supports clip selection, naming, waveforms, and color coding.
 */

import { DAW_COLORS, DAW_TYPOGRAPHY } from '@daw/ui-shell';
import type { Track, AudioClip, MidiClip } from '@daw/project-schema';
import type { ArrangeViewport, ArrangeConfig } from '../types.js';

/**
 * Options for ClipRenderer
 */
export interface ClipRenderOptions {
  /** Canvas width */
  width: number;
  
  /** Canvas height */
  height: number;
  
  /** Current viewport */
  viewport: ArrangeViewport;
  
  /** Tracks to render */
  tracks: Track[];
  
  /** Selected clip IDs */
  selectedClipIds: Set<string>;
  
  /** Waveform data for audio clips */
  waveforms: Map<string, Float32Array>;
  
  /** View configuration */
  config: ArrangeConfig;
  
  /** PPQ (pulses per quarter) */
  ppq?: number;
}

/**
 * Visual representation of a clip
 */
export interface ClipVisual {
  clip: AudioClip | MidiClip;
  trackIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  color: string;
  name: string;
}

/**
 * Clip renderer class
 */
export class ClipRenderer {
  private ctx: CanvasRenderingContext2D;
  private options: ClipRenderOptions;
  private ppq: number;
  
  constructor(ctx: CanvasRenderingContext2D, options: ClipRenderOptions) {
    this.ctx = ctx;
    this.options = options;
    this.ppq = options.ppq ?? 960;
  }
  
  /**
   * Main render method
   */
  render(): void {
    const { tracks, viewport } = this.options;
    
    // Render each visible track
    for (let i = 0; i < viewport.visibleTrackCount; i++) {
      const trackIndex = viewport.startTrackIndex + i;
      if (trackIndex >= tracks.length) break;
      
      const track = tracks[trackIndex];
      const y = i * viewport.trackHeight;
      
      this.renderTrackClips(track, trackIndex, y);
    }
  }
  
  /**
   * Render clips for a single track
   */
  private renderTrackClips(track: Track, trackIndex: number, y: number): void {
    const { ctx, options } = this;
    const { viewport, selectedClipIds, config } = options;
    
    const clips = this.getTrackClips(track);
    
    for (const clip of clips) {
      const x = (clip.startTick - viewport.startTick) * viewport.pixelsPerTick;
      const width = (clip.endTick - clip.startTick) * viewport.pixelsPerTick;
      
      // Skip if not visible
      if (x + width < 0 || x > options.width) continue;
      
      const isSelected = selectedClipIds.has(clip.id);
      const color = this.getClipColor(clip, track);
      const name = clip.name ?? this.getClipDefaultName(clip, track);
      
      // Clip background
      ctx.fillStyle = color;
      ctx.globalAlpha = isSelected ? 0.9 : 0.7;
      
      // Draw rounded rect for clip
      this.roundRect(
        Math.max(0, x),
        y + 2,
        Math.min(width, options.width - x),
        viewport.trackHeight - 4,
        3
      );
      ctx.fill();
      
      ctx.globalAlpha = 1;
      
      // Selection border
      if (isSelected) {
        ctx.strokeStyle = DAW_COLORS.selectionBorder;
        ctx.lineWidth = 2;
        this.roundRect(
          Math.max(0, x),
          y + 2,
          Math.min(width, options.width - x),
          viewport.trackHeight - 4,
          3
        );
        ctx.stroke();
      } else {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        this.roundRect(
          Math.max(0, x),
          y + 2,
          Math.min(width, options.width - x),
          viewport.trackHeight - 4,
          3
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      
      // Render clip content based on type
      if (track.type === 'audio' && config.showWaveforms) {
        this.renderAudioClipContent(clip as AudioClip, x, y, width, color);
      } else if (track.type === 'midi' || track.type === 'instrument') {
        this.renderMidiClipContent(clip as MidiClip, x, y, width, color);
      }
      
      // Clip name
      if (config.showClipNames && width > 40) {
        ctx.font = `${DAW_TYPOGRAPHY.sizeSm} ${DAW_TYPOGRAPHY.fontFamilySans}`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const textX = Math.max(4, x + 4);
        const maxWidth = Math.max(0, x + width - textX - 4);
        
        if (maxWidth > 20) {
          ctx.fillText(name, textX, y + 6, maxWidth);
        }
      }
    }
  }
  
  /**
   * Render audio clip with waveform
   */
  private renderAudioClipContent(
    clip: AudioClip, 
    x: number, 
    y: number, 
    width: number,
    color: string
  ): void {
    const { ctx, options } = this;
    const { viewport, waveforms } = options;
    
    const waveformData = waveforms.get(clip.assetId);
    if (!waveformData || width < 2) return;
    
    const clipY = y + 20;
    const clipHeight = viewport.trackHeight - 28;
    const centerY = clipY + clipHeight / 2;
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    
    // Calculate visible range within waveform
    const sourceStart = clip.sourceStartSample ?? 0;
    const sourceEnd = clip.sourceEndSample ?? waveformData.length;
    const sourceDuration = sourceEnd - sourceStart;
    const clipDuration = clip.endTick - clip.startTick;
    
    const samplesPerPixel = sourceDuration / (clipDuration * viewport.pixelsPerTick);
    const startSample = sourceStart;
    
    const visibleWidth = Math.min(width, options.width - x);
    
    for (let px = 0; px < visibleWidth; px++) {
      const sampleIndex = Math.floor(startSample + px * samplesPerPixel);
      
      if (sampleIndex < waveformData.length) {
        const value = waveformData[sampleIndex];
        const amplitude = Math.abs(value) * clipHeight / 2;
        
        const drawX = x + px;
        if (drawX >= 0 && drawX <= options.width) {
          ctx.moveTo(drawX, centerY - amplitude);
          ctx.lineTo(drawX, centerY + amplitude);
        }
      }
    }
    
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  
  /**
   * Render MIDI clip with note indicators
   */
  private renderMidiClipContent(
    clip: MidiClip, 
    x: number, 
    y: number, 
    width: number,
    color: string
  ): void {
    const { ctx, options } = this;
    const { viewport } = options;
    
    const notes = clip.notes;
    if (!notes?.length || width < 2) return;
    
    const clipY = y + 20;
    const clipHeight = viewport.trackHeight - 28;
    
    // Find pitch range
    const pitches = notes.map(n => n.pitch);
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    const pitchRange = Math.max(1, maxPitch - minPitch);
    
    const clipDuration = clip.endTick - clip.startTick;
    
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    
    for (const note of notes) {
      const noteX = x + ((note.startTick - clip.startTick) / clipDuration) * width;
      const noteWidth = Math.max(2, (note.duration / clipDuration) * width);
      
      // Map pitch to Y position
      const normalizedPitch = (note.pitch - minPitch) / pitchRange;
      const noteY = clipY + (1 - normalizedPitch) * (clipHeight - 6);
      const noteHeight = 4;
      
      if (noteX + noteWidth >= 0 && noteX <= options.width) {
        ctx.fillRect(noteX, noteY, noteWidth, noteHeight);
      }
    }
    
    ctx.globalAlpha = 1;
  }
  
  /**
   * Get clips from a track
   */
  private getTrackClips(track: Track): (AudioClip | MidiClip)[] {
    switch (track.type) {
      case 'audio':
        return track.clips ?? [];
      case 'midi':
      case 'instrument':
        return track.clips ?? [];
      default:
        return [];
    }
  }
  
  /**
   * Get clip color
   */
  private getClipColor(clip: AudioClip | MidiClip, track: Track): string {
    // Use track color as base
    const baseColor = track.color ?? DAW_COLORS.clipBlue;
    
    // Could add clip-specific color override here
    return baseColor;
  }
  
  /**
   * Get default name for clip
   */
  private getClipDefaultName(clip: AudioClip | MidiClip, track: Track): string {
    if ('assetId' in clip) {
      return 'Audio';
    }
    return 'MIDI';
  }
  
  /**
   * Draw a rounded rectangle path
   */
  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    const { ctx } = this;
    
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
