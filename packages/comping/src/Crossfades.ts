/**
 * Crossfade generation and management
 * Handles smooth transitions between comp regions
 */

import type { CrossfadeConfig, FadeCurve, CompRegion } from './types.js';

export interface CrossfadeCurve {
  in: Float32Array;
  out: Float32Array;
}

export interface CrossfadeResult {
  leftGain: Float32Array;
  rightGain: Float32Array;
  durationSamples: number;
}

export class CrossfadeGenerator {
  /**
   * Generate crossfade curve samples
   */
  static generateCurve(
    durationSamples: number,
    curve: FadeCurve
  ): CrossfadeCurve {
    const inCurve = new Float32Array(durationSamples);
    const outCurve = new Float32Array(durationSamples);

    for (let i = 0; i < durationSamples; i++) {
      const t = i / (durationSamples - 1);
      
      switch (curve) {
        case 'linear':
          inCurve[i] = t;
          outCurve[i] = 1 - t;
          break;
          
        case 'equal-power':
          // Equal power crossfade for constant perceived loudness
          inCurve[i] = Math.sin(t * Math.PI / 2);
          outCurve[i] = Math.cos(t * Math.PI / 2);
          break;
          
        case 's-curve':
          // Smooth S-curve using sigmoid
          inCurve[i] = this.sigmoid((t - 0.5) * 6) / 2 + 0.5;
          outCurve[i] = 1 - inCurve[i];
          break;
          
        case 'exponential':
          inCurve[i] = t * t;
          outCurve[i] = 1 - inCurve[i];
          break;
          
        case 'logarithmic':
          inCurve[i] = Math.sqrt(t);
          outCurve[i] = 1 - inCurve[i];
          break;
          
        default:
          inCurve[i] = t;
          outCurve[i] = 1 - t;
      }
    }

    return { in: inCurve, out: outCurve };
  }

  /**
   * Apply crossfade to audio buffer
   */
  static applyCrossfade(
    leftBuffer: Float32Array,
    rightBuffer: Float32Array,
    durationSamples: number,
    curve: FadeCurve = 'equal-power'
  ): { left: Float32Array; right: Float32Array } {
    const curves = this.generateCurve(durationSamples, curve);
    
    const left = new Float32Array(leftBuffer.length);
    const right = new Float32Array(rightBuffer.length);

    // Copy non-crossfaded portions
    const preFadeSamples = leftBuffer.length - durationSamples;
    
    // Left buffer: full volume before crossfade, fade out during
    for (let i = 0; i < preFadeSamples; i++) {
      left[i] = leftBuffer[i];
    }
    for (let i = 0; i < durationSamples; i++) {
      left[preFadeSamples + i] = leftBuffer[preFadeSamples + i] * curves.out[i];
    }

    // Right buffer: fade in during crossfade, full volume after
    for (let i = 0; i < durationSamples; i++) {
      right[i] = rightBuffer[i] * curves.in[i];
    }
    for (let i = durationSamples; i < rightBuffer.length; i++) {
      right[i] = rightBuffer[i];
    }

    return { left, right };
  }

  /**
   * Calculate crossfade duration in samples
   */
  static calculateDuration(
    durationMs: number,
    sampleRate: number
  ): number {
    return Math.floor(durationMs * sampleRate / 1000);
  }

  /**
   * Calculate crossfade duration in ticks
   */
  static calculateDurationTicks(
    durationMs: number,
    bpm: number,
    ppq: number = 960
  ): number {
    const beatDurationMs = 60000 / bpm;
    return Math.floor(durationMs / beatDurationMs * ppq);
  }

  /**
   * Find optimal crossfade point at zero crossing
   */
  static findZeroCrossing(
    buffer: Float32Array,
    preferredSample: number,
    searchRange: number = 100
  ): number {
    let bestSample = preferredSample;
    let minAmplitude = Math.abs(buffer[preferredSample]);

    const start = Math.max(0, preferredSample - searchRange);
    const end = Math.min(buffer.length - 1, preferredSample + searchRange);

    for (let i = start; i <= end; i++) {
      const amp = Math.abs(buffer[i]);
      if (amp < minAmplitude) {
        minAmplitude = amp;
        bestSample = i;
      }
    }

    return bestSample;
  }

  /**
   * Generate crossfades for a list of comp regions
   */
  static generateRegionCrossfades(
    regions: CompRegion[],
    sampleRate: number,
    defaultDurationMs: number = 10,
    defaultCurve: FadeCurve = 'equal-power'
  ): Map<string, CrossfadeResult> {
    const crossfades = new Map<string, CrossfadeResult>();
    const durationSamples = this.calculateDuration(defaultDurationMs, sampleRate);

    // Sort regions by start time
    const sorted = [...regions].sort((a, b) => a.startTick - b.startTick);

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      // Check if regions are adjacent or overlapping
      if (current.endTick >= next.startTick) {
        const curve = current.crossfadeOut?.curve || defaultCurve;
        const curveData = this.generateCurve(durationSamples, curve);

        crossfades.set(current.id, {
          leftGain: curveData.out,
          rightGain: curveData.in,
          durationSamples
        });

        crossfades.set(next.id, {
          leftGain: curveData.in,
          rightGain: curveData.out,
          durationSamples
        });
      }
    }

    return crossfades;
  }

  /**
   * Render crossfaded audio from multiple regions
   */
  static renderCrossfadedRegions(
    regionBuffers: Map<string, Float32Array>,
    regions: CompRegion[],
    sampleRate: number,
    ticksToSamples: (ticks: number) => number
  ): Float32Array {
    if (regions.length === 0) return new Float32Array(0);

    // Calculate total output length
    const startTick = Math.min(...regions.map(r => r.startTick));
    const endTick = Math.max(...regions.map(r => r.endTick));
    const totalSamples = Math.ceil(ticksToSamples(endTick - startTick));

    const output = new Float32Array(totalSamples);

    // Render each region with crossfades
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      const buffer = regionBuffers.get(region.id);
      if (!buffer) continue;

      const regionStartSample = Math.floor(ticksToSamples(region.startTick - startTick));
      
      // Check for crossfade with previous region
      let crossfadeIn = false;
      if (i > 0) {
        const prevRegion = regions[i - 1];
        if (prevRegion.endTick > region.startTick) {
          crossfadeIn = true;
        }
      }

      // Check for crossfade with next region
      let crossfadeOut = false;
      if (i < regions.length - 1) {
        const nextRegion = regions[i + 1];
        if (region.endTick > nextRegion.startTick) {
          crossfadeOut = true;
        }
      }

      // Apply buffer to output with crossfades
      for (let s = 0; s < buffer.length; s++) {
        const outputIdx = regionStartSample + s;
        if (outputIdx >= output.length) break;

        let gain = 1;

        if (crossfadeIn && region.crossfadeIn) {
          const fadeSamples = region.crossfadeIn.durationSamples;
          if (s < fadeSamples) {
            const curve = this.generateCurve(fadeSamples, region.crossfadeIn.curve);
            gain = curve.in[s];
          }
        }

        if (crossfadeOut && region.crossfadeOut) {
          const fadeSamples = region.crossfadeOut.durationSamples;
          const startFade = buffer.length - fadeSamples;
          if (s >= startFade) {
            const curve = this.generateCurve(fadeSamples, region.crossfadeOut.curve);
            gain *= curve.out[s - startFade];
          }
        }

        output[outputIdx] += buffer[s] * gain;
      }
    }

    return output;
  }

  /**
   * Get recommended crossfade duration for a given BPM
   */
  static getRecommendedDurationMs(bpm: number): number {
    // Shorter crossfades at higher tempos
    if (bpm > 160) return 5;
    if (bpm > 120) return 8;
    if (bpm > 80) return 10;
    return 15;
  }

  /**
   * Validate crossfade configuration
   */
  static validateConfig(config: CrossfadeConfig, maxDurationSamples: number): boolean {
    if (config.durationSamples <= 0) return false;
    if (config.durationSamples > maxDurationSamples) return false;
    
    const validCurves: FadeCurve[] = [
      'linear', 'equal-power', 's-curve', 'exponential', 'logarithmic'
    ];
    return validCurves.includes(config.curve);
  }

  /**
   * Sigmoid function for S-curve
   */
  private static sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}

/**
 * Crossfade utilities for batch operations
 */
export class CrossfadeBatch {
  /**
   * Apply crossfades to all adjacent regions
   */
  static applyToAllRegions(
    regions: CompRegion[],
    defaultDurationMs: number,
    defaultCurve: FadeCurve
  ): CompRegion[] {
    const sorted = [...regions].sort((a, b) => a.startTick - b.startTick);

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      // Only add crossfade if regions are adjacent or overlapping
      if (current.endTick >= next.startTick) {
        const crossfade: CrossfadeConfig = {
          durationSamples: 0, // Will be calculated later
          curve: defaultCurve
        };

        current.crossfadeOut = crossfade;
        next.crossfadeIn = crossfade;
      }
    }

    return sorted;
  }

  /**
   * Remove all crossfades from regions
   */
  static removeAllCrossfades(regions: CompRegion[]): CompRegion[] {
    for (const region of regions) {
      region.crossfadeIn = null;
      region.crossfadeOut = null;
    }
    return regions;
  }

  /**
   * Adjust crossfade durations based on available overlap
   */
  static adjustForOverlap(
    regions: CompRegion[],
    sampleRate: number,
    ticksToSamples: (ticks: number) => number
  ): CompRegion[] {
    const sorted = [...regions].sort((a, b) => a.startTick - b.startTick);

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (current.crossfadeOut && next.crossfadeIn) {
        // Calculate overlap in samples
        const overlapTicks = current.endTick - next.startTick;
        const overlapSamples = ticksToSamples(overlapTicks);

        // Limit crossfade to half of overlap
        const maxFadeSamples = Math.floor(overlapSamples / 2);
        
        current.crossfadeOut.durationSamples = Math.min(
          current.crossfadeOut.durationSamples,
          maxFadeSamples
        );
        next.crossfadeIn.durationSamples = current.crossfadeOut.durationSamples;
      }
    }

    return sorted;
  }
}
