/**
 * Audio Quantization
 * Quantize audio clips by aligning warp markers to grid
 * Based on Ableton's audio quantization feature
 */

import type { AudioClip, WarpMarker, WarpSpec } from '@daw/project-schema';

export interface QuantizeOptions {
  gridDivision: number; // PPQ division (240 = 16th note at 960 PPQ)
  strength: number; // 0-100, how much to quantize
  swing: number; // 0-100, swing amount
  applyToStart: boolean;
  applyToEnd: boolean;
}

export interface QuantizeResult {
  clip: AudioClip;
  markersAdjusted: number;
  averageOffset: number; // Average distance moved
  maxOffset: number;
}

export class AudioQuantizer {
  private ppq: number;
  private bpm: number;

  constructor(ppq: number = 960, bpm: number = 120) {
    this.ppq = ppq;
    this.bpm = bpm;
  }

  /**
   * Quantize audio clip by adjusting warp markers
   */
  quantize(clip: AudioClip, options: Partial<QuantizeOptions> = {}): QuantizeResult {
    const opts: QuantizeOptions = {
      gridDivision: 240, // 16th note
      strength: 100,
      swing: 0,
      applyToStart: true,
      applyToEnd: true,
      ...options
    };

    if (!clip.warp || !clip.warp.markers || clip.warp.markers.length === 0) {
      return {
        clip,
        markersAdjusted: 0,
        averageOffset: 0,
        maxOffset: 0
      };
    }

    const originalMarkers = [...clip.warp.markers];
    const adjustedMarkers: WarpMarker[] = [];
    let totalOffset = 0;
    let maxOffset = 0;

    for (let i = 0; i < originalMarkers.length; i++) {
      const marker = originalMarkers[i];
      
      // Skip first and last markers if not applying to them
      if (i === 0 && !opts.applyToStart) {
        adjustedMarkers.push(marker);
        continue;
      }
      if (i === originalMarkers.length - 1 && !opts.applyToEnd) {
        adjustedMarkers.push(marker);
        continue;
      }

      // Calculate grid position
      const quantizedBeat = this.quantizeBeat(marker.beat, opts);
      const quantizedTime = this.beatToTime(quantizedBeat);
      
      // Calculate offset
      const offset = quantizedTime - marker.time;
      const absOffset = Math.abs(offset);
      maxOffset = Math.max(maxOffset, absOffset);
      totalOffset += absOffset;

      // Apply quantization strength
      const strengthFactor = opts.strength / 100;
      const newTime = marker.time + offset * strengthFactor;
      const newBeat = marker.beat + (quantizedBeat - marker.beat) * strengthFactor;

      adjustedMarkers.push({
        ...marker,
        time: newTime,
        beat: newBeat
      });
    }

    const adjustedClip: AudioClip = {
      ...clip,
      warp: {
        ...clip.warp!,
        markers: adjustedMarkers
      }
    };

    return {
      clip: adjustedClip,
      markersAdjusted: adjustedMarkers.length,
      averageOffset: totalOffset / adjustedMarkers.length,
      maxOffset
    };
  }

  /**
   * Quantize a beat position to grid
   */
  quantizeBeat(beat: number, options: QuantizeOptions): number {
    // Basic quantization
    const gridSize = options.gridDivision / this.ppq; // in beats
    let quantized = Math.round(beat / gridSize) * gridSize;

    // Apply swing to off-beats
    if (options.swing > 0) {
      const gridIndex = Math.round(beat / gridSize);
      const isOffBeat = gridIndex % 2 === 1;
      
      if (isOffBeat) {
        const swingAmount = (options.swing / 100) * (gridSize / 3);
        quantized += swingAmount;
      }
    }

    return quantized;
  }

  /**
   * Snap a single warp marker to grid
   */
  snapMarker(marker: WarpMarker, gridDivision: number): WarpMarker {
    const gridSize = gridDivision / this.ppq;
    const quantizedBeat = Math.round(marker.beat / gridSize) * gridSize;
    
    return {
      ...marker,
      beat: quantizedBeat,
      time: this.beatToTime(quantizedBeat)
    };
  }

  /**
   * Humanize warp markers (opposite of quantize)
   */
  humanize(
    clip: AudioClip,
    amountMs: number,
    randomSeed?: number
  ): AudioClip {
    if (!clip.warp || !clip.warp.markers) {
      return clip;
    }

    const rng = randomSeed !== undefined 
      ? this.seededRandom(randomSeed)
      : Math.random;

    const amountSeconds = amountMs / 1000;
    const humanizedMarkers = clip.warp.markers.map(marker => {
      const offset = (rng() * 2 - 1) * amountSeconds; // -amount to +amount
      
      return {
        ...marker,
        time: Math.max(0, marker.time + offset),
        beat: marker.beat + this.timeToBeat(offset)
      };
    });

    return {
      ...clip,
      warp: {
        ...clip.warp,
        markers: humanizedMarkers
      }
    };
  }

  /**
   * Analyze quantization quality
   */
  analyzeQuantization(clip: AudioClip, gridDivision: number): {
    maxDeviation: number;
    averageDeviation: number;
    outOfSyncMarkers: number;
    suggestedStrength: number;
  } {
    if (!clip.warp || !clip.warp.markers) {
      return {
        maxDeviation: 0,
        averageDeviation: 0,
        outOfSyncMarkers: 0,
        suggestedStrength: 100
      };
    }

    const gridSize = gridDivision / this.ppq;
    let maxDeviation = 0;
    let totalDeviation = 0;
    let outOfSync = 0;

    for (const marker of clip.warp.markers) {
      const quantizedBeat = Math.round(marker.beat / gridSize) * gridSize;
      const deviation = Math.abs(marker.beat - quantizedBeat);
      
      maxDeviation = Math.max(maxDeviation, deviation);
      totalDeviation += deviation;
      
      if (deviation > gridSize / 4) {
        outOfSync++;
      }
    }

    const averageDeviation = totalDeviation / clip.warp.markers.length;
    
    // Suggest strength based on current deviation
    const suggestedStrength = Math.min(100, Math.round(maxDeviation * 100));

    return {
      maxDeviation,
      averageDeviation,
      outOfSyncMarkers: outOfSync,
      suggestedStrength
    };
  }

  /**
   * Create warp markers from transients
   */
  createMarkersFromTransients(
    transientTimes: number[],
    firstBarOffset: number = 0
  ): WarpMarker[] {
    return transientTimes.map((time, index) => ({
      id: `marker_${index}`,
      samplePosition: 0, // Would be calculated
      time,
      beat: this.timeToBeat(time) + firstBarOffset
    }));
  }

  /**
   * Align clip to project tempo
   */
  alignToTempo(clip: AudioClip, sourceBpm: number, targetBpm: number): AudioClip {
    const tempoRatio = targetBpm / sourceBpm;
    
    if (!clip.warp || !clip.warp.markers) {
      return clip;
    }

    const adjustedMarkers = clip.warp.markers.map(marker => ({
      ...marker,
      beat: marker.beat / tempoRatio
    }));

    return {
      ...clip,
      warp: {
        ...clip.warp,
        markers: adjustedMarkers
      }
    };
  }

  /**
   * Convert beat to time in seconds
   */
  private beatToTime(beat: number): number {
    const beatDuration = 60 / this.bpm;
    return beat * beatDuration;
  }

  /**
   * Convert time to beat
   */
  private timeToBeat(time: number): number {
    const beatDuration = 60 / this.bpm;
    return time / beatDuration;
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  /**
   * Set tempo
   */
  setBpm(bpm: number): void {
    this.bpm = bpm;
  }

  /**
   * Set PPQ
   */
  setPpq(ppq: number): void {
    this.ppq = ppq;
  }

  /**
   * Get grid divisions for common note values
   */
  static getGridDivisions(ppq: number = 960): Array<{ name: string; division: number }> {
    return [
      { name: '1/1', division: ppq * 4 },
      { name: '1/2', division: ppq * 2 },
      { name: '1/4', division: ppq },
      { name: '1/8', division: ppq / 2 },
      { name: '1/16', division: ppq / 4 },
      { name: '1/32', division: ppq / 8 },
      { name: '1/4T', division: (ppq * 2) / 3 },
      { name: '1/8T', division: ppq / 3 },
      { name: '1/16T', division: ppq / 6 },
      { name: '1/32T', division: ppq / 12 }
    ];
  }
}

/**
 * Batch quantization operations
 */
export class BatchQuantizer {
  /**
   * Quantize multiple clips
   */
  static quantizeClips(
    clips: AudioClip[],
    options: Partial<QuantizeOptions>,
    ppq: number = 960,
    bpm: number = 120
  ): QuantizeResult[] {
    const quantizer = new AudioQuantizer(ppq, bpm);
    
    return clips.map(clip => quantizer.quantize(clip, options));
  }

  /**
   * Quantize all clips in a time range
   */
  static quantizeRange(
    clips: AudioClip[],
    startTick: number,
    endTick: number,
    options: Partial<QuantizeOptions>,
    ppq: number = 960,
    bpm: number = 120
  ): QuantizeResult[] {
    const clipsInRange = clips.filter(clip => 
      clip.startTick < endTick && clip.endTick > startTick
    );
    
    return BatchQuantizer.quantizeClips(clipsInRange, options, ppq, bpm);
  }

  /**
   * Apply the same quantization settings to all selected clips
   */
  static applyUniformQuantization(
    clips: AudioClip[],
    referenceClip: AudioClip,
    strength: number = 100,
    ppq: number = 960,
    bpm: number = 120
  ): QuantizeResult[] {
    // Analyze reference clip to determine appropriate grid
    const quantizer = new AudioQuantizer(ppq, bpm);
    const divisions = AudioQuantizer.getGridDivisions(ppq);
    
    // Find best grid division based on marker density
    let bestDivision = divisions[4].division; // Default to 1/16
    
    if (referenceClip.warp?.markers) {
      const avgBeatDelta = this.calculateAverageBeatDelta(referenceClip.warp.markers);
      
      // Find closest division
      let bestDiff = Infinity;
      for (const div of divisions) {
        const diff = Math.abs(div.division / ppq - avgBeatDelta);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestDivision = div.division;
        }
      }
    }

    return clips.map(clip => 
      quantizer.quantize(clip, {
        gridDivision: bestDivision,
        strength,
        swing: 0,
        applyToStart: true,
        applyToEnd: true
      })
    );
  }

  /**
   * Calculate average beat delta between markers
   */
  private static calculateAverageBeatDelta(markers: WarpMarker[]): number {
    if (markers.length < 2) return 0.25; // Default to 16th note
    
    let totalDelta = 0;
    for (let i = 1; i < markers.length; i++) {
      totalDelta += markers[i].beat - markers[i - 1].beat;
    }
    
    return totalDelta / (markers.length - 1);
  }
}
