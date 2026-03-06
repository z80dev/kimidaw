/**
 * Metronome Engine
 * 
 * Generates click events synchronized to the transport
 * Supports accent on first beat, configurable sounds
 */

import type { TransportState, PPQ } from '@daw/engine-core';
import type { MetronomeConfig, ScheduledEvent, NoteEvent } from './types.js';
import { DEFAULT_METRONOME_CONFIG } from './types.js';
import { ticksToSamples, ticksToSeconds } from '@daw/engine-core';

/** Metronome click event */
export interface MetronomeClick {
  /** Time in ticks */
  tick: number;
  /** Time in samples */
  sample: number;
  /** Is this the first beat of the bar */
  isAccent: boolean;
  /** Frequency for the click */
  frequency: number;
  /** Volume in linear gain */
  gain: number;
  /** Duration in samples */
  durationSamples: number;
}

/** Metronome engine options */
export interface MetronomeEngineOptions {
  config?: MetronomeConfig;
  sampleRate: number;
  ppq?: number;
}

/**
 * Metronome engine for generating click events
 */
export class MetronomeEngine {
  private config: MetronomeConfig;
  private sampleRate: number;
  private ppq: number;
  private enabled = false;
  
  constructor(options: MetronomeEngineOptions) {
    this.config = options.config ?? DEFAULT_METRONOME_CONFIG;
    this.sampleRate = options.sampleRate;
    this.ppq = options.ppq ?? 960;
  }
  
  /** Update configuration */
  setConfig(config: Partial<MetronomeConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /** Get current config */
  getConfig(): Readonly<MetronomeConfig> {
    return Object.freeze({ ...this.config });
  }
  
  /** Enable/disable metronome */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /** Check if enabled */
  isEnabled(): boolean {
    return this.enabled && this.config.enabled;
  }
  
  /**
   * Generate clicks for a time range
   * @param startTick - Start tick
   * @param endTick - End tick  
   * @param tempo - Current tempo
   * @param timeSigNum - Time signature numerator
   * @param timeSigDen - Time signature denominator
   * @returns Array of click events
   */
  generateClicks(
    startTick: number,
    endTick: number,
    tempo: number,
    timeSigNum: number,
    timeSigDen: number
  ): MetronomeClick[] {
    if (!this.isEnabled()) {
      return [];
    }
    
    const clicks: MetronomeClick[] = [];
    
    // Calculate beat length in ticks
    const ticksPerBeat = (this.ppq * 4) / timeSigDen;
    
    // Find first beat in range
    const firstBeatTick = Math.ceil(startTick / ticksPerBeat) * ticksPerBeat;
    
    // Duration in samples
    const durationSamples = Math.ceil(
      (this.config.clickDurationMs / 1000) * this.sampleRate
    );
    
    // Generate clicks for each beat
    for (let tick = firstBeatTick; tick < endTick; tick += ticksPerBeat) {
      // Determine if this is the first beat of a bar
      const beatInBar = (tick / ticksPerBeat) % timeSigNum;
      const isAccent = this.config.accentFirstBeat && beatInBar === 0;
      
      const frequency = isAccent ? this.config.accentFrequency : this.config.clickFrequency;
      
      // Calculate volume
      let volumeDb = this.config.volumeDb;
      if (isAccent) {
        volumeDb += this.config.accentDb;
      }
      const gain = Math.pow(10, volumeDb / 20);
      
      // Convert tick to sample
      const sample = Math.ceil(ticksToSamples(tick, tempo, this.sampleRate));
      
      clicks.push({
        tick,
        sample,
        isAccent,
        frequency,
        gain,
        durationSamples,
      });
    }
    
    return clicks;
  }
  
  /**
   * Generate clicks with pre-roll
   * @param countInBars - Number of bars to count in
   * @param tempo - Current tempo
   * @param timeSigNum - Time signature numerator
   * @param timeSigDen - Time signature denominator
   * @returns Array of click events for count-in
   */
  generateCountIn(
    countInBars: number,
    tempo: number,
    timeSigNum: number,
    timeSigDen: number
  ): MetronomeClick[] {
    if (countInBars <= 0) {
      return [];
    }
    
    // Calculate bar length
    const ticksPerBar = (this.ppq * 4 * timeSigNum) / timeSigDen;
    const endTick = ticksPerBar * countInBars;
    
    return this.generateClicks(0, endTick, tempo, timeSigNum, timeSigDen);
  }
  
  /**
   * Convert metronome click to a note event for the audio engine
   */
  clickToNoteEvent(click: MetronomeClick, trackId: string): NoteEvent {
    // Use high MIDI note for click (C7 = 96)
    const note = click.isAccent ? 96 : 84; // C7 accent, C6 regular
    
    return {
      type: 'note-on',
      sampleTime: click.sample,
      tickTime: click.tick,
      trackId,
      note,
      velocity: Math.min(127, Math.round(click.gain * 127)),
      channel: 9, // Channel 10 (drums)
    };
  }
}

/** Create a metronome engine */
export function createMetronomeEngine(
  sampleRate: number,
  config?: MetronomeConfig
): MetronomeEngine {
  return new MetronomeEngine({ sampleRate, config });
}

/** Simple click sound generator (for worklet use) */
export function generateClickSample(
  frequency: number,
  sampleRate: number,
  durationMs: number
): Float32Array {
  const numSamples = Math.ceil((durationMs / 1000) * sampleRate);
  const samples = new Float32Array(numSamples);
  
  // Simple sine wave with exponential decay
  const decayTime = durationMs / 1000;
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t / (decayTime * 0.3));
    samples[i] = Math.sin(2 * Math.PI * frequency * t) * envelope;
  }
  
  return samples;
}
