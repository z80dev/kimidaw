/**
 * Consolidate & Flatten operations
 * Render selections/tracks to new audio clips
 */

import type { AudioClip, MidiClip, Track, AudioTrack, InstrumentTrack } from '@daw/project-schema';

export interface ConsolidateOptions {
  includeEffects: boolean;
  includePan: boolean;
  normalize: boolean;
  tailDurationMs: number;
  bitDepth: 16 | 24 | 32;
  dither: boolean;
}

export interface ConsolidateResult {
  clipId: string;
  assetId: string;
  duration: number;
  numSamples: number;
  peakLevel: number;
  rmsLevel: number;
}

export interface FlattenOptions extends ConsolidateOptions {
  freezeOnly: boolean; // Keep MIDI/instrument, just freeze audio
  renderToNewTrack: boolean;
}

export interface FreezeState {
  trackId: string;
  frozenClipId: string;
  originalClips: (AudioClip | MidiClip)[];
  originalPlugins: string[];
  isFrozen: boolean;
}

export class ConsolidateEngine {
  private sampleRate: number;
  private frozenTracks: Map<string, FreezeState> = new Map();

  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
  }

  /**
   * Consolidate time selection to new clip
   * Renders a time range across multiple tracks into a single audio clip
   */
  async consolidateSelection(
    tracks: Track[],
    startTick: number,
    endTick: number,
    options: Partial<ConsolidateOptions> = {}
  ): Promise<ConsolidateResult> {
    const opts: ConsolidateOptions = {
      includeEffects: true,
      includePan: true,
      normalize: false,
      tailDurationMs: 0,
      bitDepth: 24,
      dither: false,
      ...options
    };

    // Calculate render parameters
    const duration = this.ticksToSeconds(endTick - startTick);
    const numSamples = Math.ceil(duration * this.sampleRate);
    
    // In a real implementation, this would:
    // 1. Set up offline render graph
    // 2. Render all tracks in selection
    // 3. Mix down to single buffer
    // 4. Write to asset storage
    // 5. Create new clip

    const result: ConsolidateResult = {
      clipId: this.generateId(),
      assetId: this.generateId(),
      duration,
      numSamples,
      peakLevel: 0,
      rmsLevel: 0
    };

    return result;
  }

  /**
   * Consolidate a single clip (bounce in place)
   */
  async consolidateClip(
    track: Track,
    clip: AudioClip | MidiClip,
    options: Partial<ConsolidateOptions> = {}
  ): Promise<ConsolidateResult> {
    const opts: ConsolidateOptions = {
      includeEffects: true,
      includePan: false,
      normalize: false,
      tailDurationMs: 100,
      bitDepth: 24,
      dither: false,
      ...options
    };

    // Render the clip with processing
    const result: ConsolidateResult = {
      clipId: this.generateId(),
      assetId: this.generateId(),
      duration: 0,
      numSamples: 0,
      peakLevel: 0,
      rmsLevel: 0
    };

    return result;
  }

  /**
   * Flatten track - render all clips to single audio track
   */
  async flattenTrack(
    track: AudioTrack | InstrumentTrack,
    options: Partial<FlattenOptions> = {}
  ): Promise<ConsolidateResult[]> {
    const opts: FlattenOptions = {
      includeEffects: true,
      includePan: true,
      normalize: false,
      tailDurationMs: 0,
      bitDepth: 24,
      dither: false,
      freezeOnly: false,
      renderToNewTrack: false,
      ...options
    };

    const results: ConsolidateResult[] = [];
    const clips = track.clips || [];

    if (clips.length === 0) {
      return results;
    }

    // If freeze only, preserve original structure
    if (opts.freezeOnly) {
      const freezeState: FreezeState = {
        trackId: track.id,
        frozenClipId: '',
        originalClips: [...clips],
        originalPlugins: track.inserts?.map(i => i.instanceId) || [],
        isFrozen: true
      };

      // Render combined audio
      const result = await this.renderTrackToAudio(track, opts);
      freezeState.frozenClipId = result.clipId;
      
      this.frozenTracks.set(track.id, freezeState);
      results.push(result);
    } else {
      // Full flatten - render each clip
      for (const clip of clips) {
        const result = await this.consolidateClip(track, clip, opts);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Freeze track (render to audio, disable processing)
   */
  async freezeTrack(track: InstrumentTrack): Promise<FreezeState | null> {
    const result = await this.flattenTrack(track, { freezeOnly: true });
    
    if (result.length === 0) return null;

    return this.frozenTracks.get(track.id) || null;
  }

  /**
   * Unfreeze track (restore original clips and processing)
   */
  unfreezeTrack(trackId: string): FreezeState | null {
    const state = this.frozenTracks.get(trackId);
    if (!state) return null;

    state.isFrozen = false;
    this.frozenTracks.delete(trackId);
    
    return state;
  }

  /**
   * Check if track is frozen
   */
  isTrackFrozen(trackId: string): boolean {
    const state = this.frozenTracks.get(trackId);
    return state ? state.isFrozen : false;
  }

  /**
   * Get freeze state for track
   */
  getFreezeState(trackId: string): FreezeState | undefined {
    return this.frozenTracks.get(trackId);
  }

  /**
   * Render track to audio
   */
  private async renderTrackToAudio(
    track: Track,
    options: ConsolidateOptions
  ): Promise<ConsolidateResult> {
    // In a real implementation, set up offline audio context
    // and render the track through its processing chain

    return {
      clipId: this.generateId(),
      assetId: this.generateId(),
      duration: 0,
      numSamples: 0,
      peakLevel: 0,
      rmsLevel: 0
    };
  }

  /**
   * Crop/trim audio clip
   */
  cropClip(
    clip: AudioClip,
    startSample: number,
    endSample: number
  ): AudioClip {
    return {
      ...clip,
      sourceStartSample: startSample,
      sourceEndSample: endSample,
      fades: {
        ...clip.fades,
        inSamples: 0,
        outSamples: 0
      }
    };
  }

  /**
   * Merge multiple clips into one
   */
  async mergeClips(
    clips: AudioClip[],
    gapDurationTicks: number = 0
  ): Promise<ConsolidateResult> {
    // Calculate total duration
    let totalDuration = 0;
    for (const clip of clips) {
      totalDuration += (clip.sourceEndSample - clip.sourceStartSample) / this.sampleRate;
    }

    return {
      clipId: this.generateId(),
      assetId: this.generateId(),
      duration: totalDuration,
      numSamples: Math.ceil(totalDuration * this.sampleRate),
      peakLevel: 0,
      rmsLevel: 0
    };
  }

  /**
   * Split clip at position
   */
  splitClip(clip: AudioClip, splitTick: number): [AudioClip, AudioClip] {
    const splitSample = this.ticksToSamples(splitTick);
    
    const clip1: AudioClip = {
      ...clip,
      id: this.generateId(),
      endTick: splitTick,
      sourceEndSample: splitSample,
      fades: {
        ...clip.fades,
        outSamples: 0
      }
    };

    const clip2: AudioClip = {
      ...clip,
      id: this.generateId(),
      startTick: splitTick,
      sourceStartSample: splitSample,
      fades: {
        ...clip.fades,
        inSamples: 0
      }
    };

    return [clip1, clip2];
  }

  /**
   * Reverse audio clip
   */
  reverseClip(clip: AudioClip): AudioClip {
    return {
      ...clip,
      reverse: !clip.reverse
    };
  }

  /**
   * Set clip gain
   */
  setClipGain(clip: AudioClip, gainDb: number): AudioClip {
    return {
      ...clip,
      gainDb
    };
  }

  /**
   * Normalize clip gain
   */
  normalizeClip(clip: AudioClip, targetDb: number = -0.1): AudioClip {
    // In a real implementation, analyze audio and calculate gain
    const currentPeakDb = 0; // Placeholder
    const gainNeeded = targetDb - currentPeakDb;
    
    return {
      ...clip,
      gainDb: clip.gainDb + gainNeeded
    };
  }

  /**
   * Set sample rate
   */
  setSampleRate(sampleRate: number): void {
    this.sampleRate = sampleRate;
  }

  /**
   * Convert ticks to samples
   */
  private ticksToSamples(ticks: number, ppq: number = 960): number {
    // Assuming 120 BPM for conversion
    const bpm = 120;
    const seconds = (ticks / ppq) * (60 / bpm);
    return Math.floor(seconds * this.sampleRate);
  }

  /**
   * Convert ticks to seconds
   */
  private ticksToSeconds(ticks: number, ppq: number = 960): number {
    const bpm = 120;
    return (ticks / ppq) * (60 / bpm);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `consolidate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Audio rendering utilities
 */
export class AudioRenderer {
  /**
   * Calculate peak and RMS levels
   */
  static analyzeLevels(buffer: Float32Array): { peak: number; rms: number } {
    let peak = 0;
    let sum = 0;
    
    for (const sample of buffer) {
      const abs = Math.abs(sample);
      peak = Math.max(peak, abs);
      sum += sample * sample;
    }
    
    const rms = Math.sqrt(sum / buffer.length);
    
    return { peak, rms };
  }

  /**
   * Find zero crossing near sample position
   */
  static findZeroCrossing(
    buffer: Float32Array,
    targetSample: number,
    searchRange: number = 100
  ): number {
    let bestSample = targetSample;
    let minValue = Math.abs(buffer[targetSample]);

    const start = Math.max(0, targetSample - searchRange);
    const end = Math.min(buffer.length - 1, targetSample + searchRange);

    for (let i = start; i <= end; i++) {
      const abs = Math.abs(buffer[i]);
      if (abs < minValue) {
        minValue = abs;
        bestSample = i;
      }
    }

    return bestSample;
  }

  /**
   * Apply fade in/out
   */
  static applyFade(
    buffer: Float32Array,
    fadeInSamples: number,
    fadeOutSamples: number,
    curve: 'linear' | 'exponential' | 'logarithmic' = 'linear'
  ): Float32Array {
    const result = new Float32Array(buffer);
    
    // Fade in
    for (let i = 0; i < fadeInSamples && i < buffer.length; i++) {
      const t = i / fadeInSamples;
      const gain = this.calculateFadeCurve(t, curve);
      result[i] *= gain;
    }
    
    // Fade out
    const fadeOutStart = buffer.length - fadeOutSamples;
    for (let i = fadeOutStart; i < buffer.length; i++) {
      const t = (buffer.length - i) / fadeOutSamples;
      const gain = this.calculateFadeCurve(t, curve);
      result[i] *= gain;
    }
    
    return result;
  }

  /**
   * Calculate fade curve
   */
  private static calculateFadeCurve(t: number, curve: string): number {
    switch (curve) {
      case 'exponential':
        return t * t;
      case 'logarithmic':
        return Math.sqrt(t);
      case 'linear':
      default:
        return t;
    }
  }
}
