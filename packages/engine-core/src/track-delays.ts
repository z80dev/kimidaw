/**
 * Track Delays & Time Controls
 * Per-track delay compensation and manual delay adjustment
 */

import type { Track } from '@daw/project-schema';

export interface TrackDelay {
  trackId: string;
  manualDelayMs: number; // User-adjustable delay
  manualDelaySamples: number;
  compensationDelayMs: number; // Automatic delay compensation
  compensationDelaySamples: number;
  totalDelayMs: number;
  totalDelaySamples: number;
}

export interface DelayCompensationReport {
  trackDelays: Map<string, TrackDelay>;
  maxDelayMs: number;
  maxDelaySamples: number;
  sampleRate: number;
  timestamp: number;
}

export interface PluginLatency {
  pluginId: string;
  latencySamples: number;
  latencyMs: number;
  isReported: boolean;
}

export class TrackDelayManager {
  private sampleRate: number;
  private trackDelays: Map<string, TrackDelay> = new Map();
  private pluginLatencies: Map<string, PluginLatency[]> = new Map();
  private compensationEnabled: boolean = true;

  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
  }

  /**
   * Set track's manual delay (user-adjustable)
   * Positive = delay track, Negative = advance track (pre-delay)
   */
  setManualDelay(trackId: string, delayMs: number): TrackDelay {
    const delay = this.getOrCreateDelay(trackId);
    
    delay.manualDelayMs = delayMs;
    delay.manualDelaySamples = this.msToSamples(delayMs);
    
    this.recalculateTotalDelay(trackId);
    
    return delay;
  }

  /**
   * Set track's manual delay in samples
   */
  setManualDelaySamples(trackId: string, samples: number): TrackDelay {
    const delay = this.getOrCreateDelay(trackId);
    
    delay.manualDelaySamples = samples;
    delay.manualDelayMs = this.samplesToMs(samples);
    
    this.recalculateTotalDelay(trackId);
    
    return delay;
  }

  /**
   * Get track delay info
   */
  getTrackDelay(trackId: string): TrackDelay | undefined {
    return this.trackDelays.get(trackId);
  }

  /**
   * Report plugin latency for delay compensation
   */
  reportPluginLatency(
    trackId: string,
    pluginId: string,
    latencySamples: number
  ): void {
    const latencies = this.pluginLatencies.get(trackId) || [];
    
    const existingIndex = latencies.findIndex(l => l.pluginId === pluginId);
    const latency: PluginLatency = {
      pluginId,
      latencySamples,
      latencyMs: this.samplesToMs(latencySamples),
      isReported: true
    };
    
    if (existingIndex >= 0) {
      latencies[existingIndex] = latency;
    } else {
      latencies.push(latency);
    }
    
    this.pluginLatencies.set(trackId, latencies);
    this.recalculateCompensationDelay(trackId);
  }

  /**
   * Remove plugin latency report
   */
  removePluginLatency(trackId: string, pluginId: string): void {
    const latencies = this.pluginLatencies.get(trackId);
    if (!latencies) return;
    
    const index = latencies.findIndex(l => l.pluginId === pluginId);
    if (index >= 0) {
      latencies.splice(index, 1);
      this.recalculateCompensationDelay(trackId);
    }
  }

  /**
   * Calculate delay compensation for entire project
   * Aligns all tracks to the track with maximum latency
   */
  calculateDelayCompensation(trackIds: string[]): DelayCompensationReport {
    // Find maximum latency across all tracks
    let maxDelaySamples = 0;
    
    for (const trackId of trackIds) {
      const delay = this.trackDelays.get(trackId);
      if (delay) {
        const totalLatency = delay.manualDelaySamples + delay.compensationDelaySamples;
        maxDelaySamples = Math.max(maxDelaySamples, totalLatency);
      }
    }
    
    // Update compensation for all tracks
    for (const trackId of trackIds) {
      const delay = this.getOrCreateDelay(trackId);
      
      if (this.compensationEnabled) {
        // Compensation = difference from max
        const trackTotalLatency = delay.manualDelaySamples + delay.compensationDelaySamples;
        const additionalCompensation = maxDelaySamples - trackTotalLatency;
        
        delay.compensationDelaySamples += additionalCompensation;
        delay.compensationDelayMs = this.samplesToMs(delay.compensationDelaySamples);
      }
      
      this.recalculateTotalDelay(trackId);
    }
    
    return {
      trackDelays: new Map(this.trackDelays),
      maxDelayMs: this.samplesToMs(maxDelaySamples),
      maxDelaySamples,
      sampleRate: this.sampleRate,
      timestamp: Date.now()
    };
  }

  /**
   * Get total delay for a track (for scheduling)
   */
  getTotalDelaySamples(trackId: string): number {
    const delay = this.trackDelays.get(trackId);
    return delay ? delay.totalDelaySamples : 0;
  }

  /**
   * Get all track delays
   */
  getAllTrackDelays(): Map<string, TrackDelay> {
    return new Map(this.trackDelays);
  }

  /**
   * Enable/disable delay compensation
   */
  setCompensationEnabled(enabled: boolean): void {
    this.compensationEnabled = enabled;
  }

  /**
   * Check if delay compensation is enabled
   */
  isCompensationEnabled(): boolean {
    return this.compensationEnabled;
  }

  /**
   * Reset all delays for a track
   */
  resetTrackDelays(trackId: string): void {
    this.trackDelays.delete(trackId);
    this.pluginLatencies.delete(trackId);
  }

  /**
   * Reset all delays
   */
  resetAllDelays(): void {
    this.trackDelays.clear();
    this.pluginLatencies.clear();
  }

  /**
   * Convert milliseconds to samples
   */
  msToSamples(ms: number): number {
    return Math.round(ms * this.sampleRate / 1000);
  }

  /**
   * Convert samples to milliseconds
   */
  samplesToMs(samples: number): number {
    return samples * 1000 / this.sampleRate;
  }

  /**
   * Set sample rate (recalculates all delays)
   */
  setSampleRate(sampleRate: number): void {
    const ratio = sampleRate / this.sampleRate;
    this.sampleRate = sampleRate;
    
    // Recalculate all delays
    for (const delay of this.trackDelays.values()) {
      delay.manualDelaySamples = Math.round(delay.manualDelaySamples * ratio);
      delay.compensationDelaySamples = Math.round(delay.compensationDelaySamples * ratio);
      delay.totalDelaySamples = Math.round(delay.totalDelaySamples * ratio);
      
      delay.manualDelayMs = this.samplesToMs(delay.manualDelaySamples);
      delay.compensationDelayMs = this.samplesToMs(delay.compensationDelaySamples);
      delay.totalDelayMs = this.samplesToMs(delay.totalDelaySamples);
    }
  }

  /**
   * Get plugin latencies for a track
   */
  getPluginLatencies(trackId: string): PluginLatency[] {
    return [...(this.pluginLatencies.get(trackId) || [])];
  }

  /**
   * Get total plugin latency for a track
   */
  getTotalPluginLatency(trackId: string): number {
    const latencies = this.pluginLatencies.get(trackId) || [];
    return latencies.reduce((sum, l) => sum + l.latencySamples, 0);
  }

  /**
   * Nudge track delay by small amount
   */
  nudgeDelay(trackId: string, direction: 'earlier' | 'later', amountMs: number = 1): TrackDelay {
    const delay = this.getOrCreateDelay(trackId);
    const delta = direction === 'earlier' ? -amountMs : amountMs;
    
    return this.setManualDelay(trackId, delay.manualDelayMs + delta);
  }

  /**
   * Get recommended delay for time alignment
   */
  getRecommendedDelay(trackId: string, referenceTrackId: string): number {
    const delay1 = this.trackDelays.get(trackId);
    const delay2 = this.trackDelays.get(referenceTrackId);
    
    if (!delay1 || !delay2) return 0;
    
    return delay2.totalDelayMs - delay1.totalDelayMs;
  }

  /**
   * Get or create track delay record
   */
  private getOrCreateDelay(trackId: string): TrackDelay {
    let delay = this.trackDelays.get(trackId);
    
    if (!delay) {
      delay = {
        trackId,
        manualDelayMs: 0,
        manualDelaySamples: 0,
        compensationDelayMs: 0,
        compensationDelaySamples: 0,
        totalDelayMs: 0,
        totalDelaySamples: 0
      };
      this.trackDelays.set(trackId, delay);
    }
    
    return delay;
  }

  /**
   * Recalculate compensation delay from plugin latencies
   */
  private recalculateCompensationDelay(trackId: string): void {
    const delay = this.getOrCreateDelay(trackId);
    const latencies = this.pluginLatencies.get(trackId) || [];
    
    delay.compensationDelaySamples = latencies.reduce((sum, l) => sum + l.latencySamples, 0);
    delay.compensationDelayMs = this.samplesToMs(delay.compensationDelaySamples);
    
    this.recalculateTotalDelay(trackId);
  }

  /**
   * Recalculate total delay
   */
  private recalculateTotalDelay(trackId: string): void {
    const delay = this.getOrCreateDelay(trackId);
    
    delay.totalDelaySamples = delay.manualDelaySamples + delay.compensationDelaySamples;
    delay.totalDelayMs = this.samplesToMs(delay.totalDelaySamples);
  }
}

/**
 * Helper class for common delay calculations
 */
export class DelayCalculator {
  /**
   * Calculate delay from distance (for phase alignment)
   */
  static distanceToDelay(distanceMeters: number, speedOfSound: number = 343): number {
    return distanceMeters / speedOfSound * 1000; // ms
  }

  /**
   * Calculate sample delay for phase alignment
   */
  static phaseAlignmentDelay(frequency: number, phaseOffsetDegrees: number, sampleRate: number): number {
    const periodSamples = sampleRate / frequency;
    const phaseOffsetRatio = phaseOffsetDegrees / 360;
    return periodSamples * phaseOffsetRatio;
  }

  /**
   * Calculate Haas effect delay
   */
  static haasDelayMs(sourceWidth: number = 1): number {
    // Typical Haas effect delays: 1-35ms
    return Math.min(35, Math.max(1, sourceWidth * 10));
  }

  /**
   * Calculate delay for tempo sync
   */
  static tempoSyncDelayMs(bpm: number, noteValue: number): number {
    // noteValue: 1 = quarter, 0.5 = 8th, 0.25 = 16th, etc.
    const beatDurationMs = 60000 / bpm;
    return beatDurationMs * noteValue;
  }
}
