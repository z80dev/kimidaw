/**
 * Arrange View Types
 */

import type { Track, AudioClip, MidiClip } from '@daw/project-schema';

/**
 * Complete arrange view state
 */
export interface ArrangeViewState {
  /** Current viewport position */
  viewport: ArrangeViewport;
  
  /** Timeline metrics */
  metrics: TimelineMetrics;
  
  /** Selected items */
  selection: {
    tracks: Set<string>;
    clips: Set<string>;
  };
  
  /** Playback state */
  playback: {
    isPlaying: boolean;
    currentTick: number;
    isRecording: boolean;
  };
  
  /** View configuration */
  config: ArrangeConfig;
}

/**
 * Viewport position and zoom
 */
export interface ArrangeViewport {
  /** Start tick visible in viewport */
  startTick: number;
  
  /** End tick visible in viewport */
  endTick: number;
  
  /** First visible track index */
  startTrackIndex: number;
  
  /** Number of visible tracks */
  visibleTrackCount: number;
  
  /** Pixels per tick (horizontal zoom) */
  pixelsPerTick: number;
  
  /** Track height in pixels (vertical zoom) */
  trackHeight: number;
}

/**
 * Timeline display metrics
 */
export interface TimelineMetrics {
  /** Total project duration in ticks */
  totalTicks: number;
  
  /** Total number of tracks */
  totalTracks: number;
  
  /** Current tempo */
  tempo: number;
  
  /** Time signature numerator */
  timeSigNum: number;
  
  /** Time signature denominator */
  timeSigDen: number;
  
  /** Pixels per quarter note at current zoom */
  pixelsPerQuarter: number;
  
  /** Ticks per pixel (inverse of zoom) */
  ticksPerPixel: number;
}

/**
 * Arrange view configuration
 */
export interface ArrangeConfig {
  /** Show minor grid lines */
  showMinorGrid: boolean;
  
  /** Show bar numbers */
  showBarNumbers: boolean;
  
  /** Snap to grid enabled */
  snapToGrid: boolean;
  
  /** Grid snap division (1 = quarter, 4 = 16th, etc.) */
  snapDivision: number;
  
  /** Show clip names */
  showClipNames: boolean;
  
  /** Show clip waveforms */
  showWaveforms: boolean;
  
  /** Show automation lanes */
  showAutomation: boolean;
  
  /** Loop braces visible */
  showLoopBraces: boolean;
  
  /** Minimum zoom level (pixels per tick) */
  minZoom: number;
  
  /** Maximum zoom level (pixels per tick) */
  maxZoom: number;
  
  /** Minimum track height */
  minTrackHeight: number;
  
  /** Maximum track height */
  maxTrackHeight: number;
}

/**
 * Clip render data
 */
export interface ClipRenderData {
  clip: AudioClip | MidiClip;
  trackIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  color: string;
  waveformData?: Float32Array;
}

/**
 * Track render data
 */
export interface TrackRenderData {
  track: Track;
  index: number;
  y: number;
  height: number;
  isSelected: boolean;
  isArmed: boolean;
  isMuted: boolean;
  isSolo: boolean;
}

/**
 * Grid line data
 */
export interface GridLine {
  x: number;
  tick: number;
  isBar: boolean;
  isBeat: boolean;
  label?: string;
}

/**
 * Arrange view event types
 */
export type ArrangeEventType =
  | 'clip:click'
  | 'clip:doubleClick'
  | 'clip:drag'
  | 'clip:resize'
  | 'track:click'
  | 'track:doubleClick'
  | 'timeline:click'
  | 'timeline:drag'
  | 'selection:change'
  | 'zoom:change'
  | 'viewport:change';
