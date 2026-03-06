/**
 * Timing utilities for sample/tick/second conversions
 * PPQ = 960 as per spec section 8.1
 */

import { PPQ, DEFAULT_SAMPLE_RATE, type TempoEvent, type TimeSignatureEvent } from './types.js';

/** Timing context for conversions */
export interface TimingContext {
  /** Sample rate in Hz */
  sampleRate: number;
  /** Current tempo in BPM */
  tempo: number;
  /** Time signature numerator */
  timeSigNum: number;
  /** Time signature denominator */
  timeSigDen: number;
}

/** Default timing context */
export function createDefaultTimingContext(
  sampleRate: number = DEFAULT_SAMPLE_RATE
): TimingContext {
  return {
    sampleRate,
    tempo: 120,
    timeSigNum: 4,
    timeSigDen: 4,
  };
}

/**
 * Convert ticks to samples at a given tempo and sample rate
 * @param ticks - Musical ticks (PPQ based)
 * @param bpm - Tempo in beats per minute
 * @param sampleRate - Sample rate in Hz
 * @returns Number of samples
 */
export function ticksToSamples(ticks: number, bpm: number, sampleRate: number): number {
  // samples = ticks * (60 / bpm) * (sampleRate / PPQ)
  // = ticks * 60 * sampleRate / (bpm * PPQ)
  return (ticks * 60 * sampleRate) / (bpm * PPQ);
}

/**
 * Convert samples to ticks at a given tempo and sample rate
 * @param samples - Number of samples
 * @param bpm - Tempo in beats per minute
 * @param sampleRate - Sample rate in Hz
 * @returns Number of ticks
 */
export function samplesToTicks(samples: number, bpm: number, sampleRate: number): number {
  // ticks = samples * (bpm / 60) * (PPQ / sampleRate)
  // = samples * bpm * PPQ / (60 * sampleRate)
  return (samples * bpm * PPQ) / (60 * sampleRate);
}

/**
 * Convert ticks to seconds at a given tempo
 * @param ticks - Musical ticks
 * @param bpm - Tempo in beats per minute
 * @returns Time in seconds
 */
export function ticksToSeconds(ticks: number, bpm: number): number {
  // seconds = ticks * (60 / bpm) / PPQ
  return (ticks * 60) / (bpm * PPQ);
}

/**
 * Convert seconds to ticks at a given tempo
 * @param seconds - Time in seconds
 * @param bpm - Tempo in beats per minute
 * @returns Number of ticks
 */
export function secondsToTicks(seconds: number, bpm: number): number {
  // ticks = seconds * (bpm / 60) * PPQ
  return (seconds * bpm * PPQ) / 60;
}

/**
 * Convert samples to seconds
 * @param samples - Number of samples
 * @param sampleRate - Sample rate in Hz
 * @returns Time in seconds
 */
export function samplesToSeconds(samples: number, sampleRate: number): number {
  return samples / sampleRate;
}

/**
 * Convert seconds to samples
 * @param seconds - Time in seconds
 * @param sampleRate - Sample rate in Hz
 * @returns Number of samples
 */
export function secondsToSamples(seconds: number, sampleRate: number): number {
  return seconds * sampleRate;
}

/**
 * Calculate the duration of a beat in samples
 * @param bpm - Tempo in beats per minute
 * @param sampleRate - Sample rate in Hz
 * @returns Samples per beat
 */
export function beatDurationSamples(bpm: number, sampleRate: number): number {
  return (60 * sampleRate) / bpm;
}

/**
 * Calculate the duration of a tick in samples
 * @param bpm - Tempo in beats per minute
 * @param sampleRate - Sample rate in Hz
 * @returns Samples per tick
 */
export function tickDurationSamples(bpm: number, sampleRate: number): number {
  return (60 * sampleRate) / (bpm * PPQ);
}

/**
 * Convert ticks to beats
 * @param ticks - Musical ticks
 * @returns Number of beats (can be fractional)
 */
export function ticksToBeats(ticks: number): number {
  return ticks / PPQ;
}

/**
 * Convert beats to ticks
 * @param beats - Number of beats (can be fractional)
 * @returns Musical ticks
 */
export function beatsToTicks(beats: number): number {
  return beats * PPQ;
}

/**
 * Convert musical time (bars, beats, ticks) to total ticks
 * @param bars - Bar number (1-based)
 * @param beats - Beat within bar (1-based)
 * @param ticks - Ticks within beat (0-based)
 * @param timeSigNum - Time signature numerator
 * @returns Total ticks from the beginning
 */
export function musicalTimeToTicks(
  bars: number,
  beats: number,
  ticks: number,
  timeSigNum: number = 4
): number {
  // Convert to 0-based for calculation
  const zeroBasedBars = bars - 1;
  const zeroBasedBeats = beats - 1;
  
  const ticksPerBar = PPQ * timeSigNum;
  const ticksPerBeat = PPQ;
  
  return zeroBasedBars * ticksPerBar + zeroBasedBeats * ticksPerBeat + ticks;
}

/**
 * Convert total ticks to musical time (bars, beats, ticks)
 * @param totalTicks - Total ticks from beginning
 * @param timeSigNum - Time signature numerator
 * @returns Musical time object (bars, beats, ticks - bars/beats are 1-based)
 */
export function ticksToMusicalTime(
  totalTicks: number,
  timeSigNum: number = 4
): { bars: number; beats: number; ticks: number } {
  const ticksPerBar = PPQ * timeSigNum;
  const ticksPerBeat = PPQ;
  
  const bars = Math.floor(totalTicks / ticksPerBar) + 1;
  const remainingTicks = totalTicks % ticksPerBar;
  const beats = Math.floor(remainingTicks / ticksPerBeat) + 1;
  const ticks = remainingTicks % ticksPerBeat;
  
  return { bars, beats, ticks };
}

/**
 * Class for handling tempo map based conversions
 * Supports variable tempo throughout the project
 */
export class TempoMap {
  private tempoEvents: TempoEvent[];
  private sampleRate: number;
  
  constructor(tempoEvents: TempoEvent[], sampleRate: number = DEFAULT_SAMPLE_RATE) {
    // Sort by tick and ensure there's at least one event at tick 0
    this.tempoEvents = [...tempoEvents].sort((a, b) => a.tick - b.tick);
    if (this.tempoEvents.length === 0 || this.tempoEvents[0].tick > 0) {
      this.tempoEvents.unshift({ tick: 0, bpm: 120 });
    }
    this.sampleRate = sampleRate;
  }
  
  /**
   * Get tempo at a specific tick position
   */
  getTempoAtTick(tick: number): number {
    let tempo = this.tempoEvents[0].bpm;
    for (const event of this.tempoEvents) {
      if (event.tick <= tick) {
        tempo = event.bpm;
      } else {
        break;
      }
    }
    return tempo;
  }
  
  /**
   * Convert ticks to samples using the tempo map
   * This is a simplified linear interpolation between tempo changes
   */
  ticksToSamples(tick: number): number {
    let totalSamples = 0;
    let lastTick = 0;
    let lastBpm = this.tempoEvents[0].bpm;
    
    for (let i = 1; i < this.tempoEvents.length; i++) {
      const event = this.tempoEvents[i];
      if (event.tick > tick) {
        break;
      }
      
      // Add samples for the segment before this tempo change
      const tickDelta = event.tick - lastTick;
      totalSamples += (tickDelta * 60 * this.sampleRate) / (lastBpm * PPQ);
      
      lastTick = event.tick;
      lastBpm = event.bpm;
    }
    
    // Add remaining samples to target tick
    const remainingTicks = tick - lastTick;
    totalSamples += (remainingTicks * 60 * this.sampleRate) / (lastBpm * PPQ);
    
    return totalSamples;
  }
  
  /**
   * Convert samples to ticks using the tempo map
   * Requires iterative approach for variable tempo
   */
  samplesToTicks(samples: number): number {
    let accumulatedSamples = 0;
    let lastTick = 0;
    let lastBpm = this.tempoEvents[0].bpm;
    
    for (let i = 1; i < this.tempoEvents.length; i++) {
      const event = this.tempoEvents[i];
      const segmentTicks = event.tick - lastTick;
      const segmentSamples = (segmentTicks * 60 * this.sampleRate) / (lastBpm * PPQ);
      
      if (accumulatedSamples + segmentSamples >= samples) {
        // Target is within this segment
        const remainingSamples = samples - accumulatedSamples;
        return lastTick + (remainingSamples * lastBpm * PPQ) / (60 * this.sampleRate);
      }
      
      accumulatedSamples += segmentSamples;
      lastTick = event.tick;
      lastBpm = event.bpm;
    }
    
    // Beyond last tempo event
    const remainingSamples = samples - accumulatedSamples;
    return lastTick + (remainingSamples * lastBpm * PPQ) / (60 * this.sampleRate);
  }
}

/**
 * Quantize a tick value to a grid
 * @param ticks - Input tick position
 * @param gridTicks - Grid size in ticks (e.g., PPQ/4 for 16th notes)
 * @param strength - Quantization strength 0-1 (1 = fully quantized)
 * @returns Quantized tick position
 */
export function quantizeTicks(
  ticks: number,
  gridTicks: number,
  strength: number = 1
): number {
  const quantized = Math.round(ticks / gridTicks) * gridTicks;
  if (strength >= 1) {
    return quantized;
  }
  // Interpolate between original and quantized
  return ticks + (quantized - ticks) * strength;
}

/** Common grid divisions in ticks */
export const GridTicks = {
  /** Whole note */
  whole: PPQ * 4,
  /** Half note */
  half: PPQ * 2,
  /** Quarter note */
  quarter: PPQ,
  /** Eighth note */
  eighth: PPQ / 2,
  /** Sixteenth note */
  sixteenth: PPQ / 4,
  /** Thirty-second note */
  thirtySecond: PPQ / 8,
  /** Triplet quarter */
  tripletQuarter: (PPQ * 2) / 3,
  /** Triplet eighth */
  tripletEighth: PPQ / 3,
  /** Triplet sixteenth */
  tripletSixteenth: PPQ / 6,
} as const;
