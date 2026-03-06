/**
 * Beat-based slicing
 * Slices audio on beat grid divisions
 */

import type { 
  SlicePoint, 
  SliceResult, 
  AudioSlice, 
  BeatSliceOptions,
  BeatDivision 
} from './types.js';

export class BeatSlicer {
  private sampleRate: number;
  private options: BeatSliceOptions;

  constructor(sampleRate: number, options: BeatSliceOptions) {
    this.sampleRate = sampleRate;
    this.options = options;
  }

  /**
   * Slice audio by beat divisions
   */
  slice(audioData: Float32Array, offsetSeconds: number = 0): SliceResult {
    const duration = audioData.length / this.sampleRate;
    const beatDuration = 60 / this.options.bpm;
    const divisionMultiplier = this.getDivisionMultiplier(this.options.division);
    const sliceInterval = beatDuration * divisionMultiplier;
    
    // Generate slice points
    const points: SlicePoint[] = [];
    let time = offsetSeconds;
    let index = 0;
    
    while (time < duration + offsetSeconds) {
      const samplePosition = Math.floor((time - offsetSeconds) * this.sampleRate);
      
      if (samplePosition >= 0 && samplePosition < audioData.length) {
        points.push({
          id: `beat_${index}`,
          time: time - offsetSeconds,
          samplePosition,
          type: 'beat',
          strength: 1
        });
      }
      
      // Apply swing to alternating slices
      let interval = sliceInterval;
      if (index % 2 === 1 && this.options.swing > 0) {
        const swingAmount = (this.options.swing / 100) * (sliceInterval / 3);
        interval += swingAmount;
      }
      
      time += interval;
      index++;
    }

    const slices = this.createSlicesFromPoints(audioData.length, points);

    return {
      slices,
      mode: 'beat',
      originalDuration: duration,
      sampleRate: this.sampleRate
    };
  }

  /**
   * Create slice points from warp markers
   */
  sliceFromWarpMarkers(
    audioData: Float32Array,
    warpMarkers: Array<{ time: number; beat: number }>
  ): SliceResult {
    const points: SlicePoint[] = warpMarkers.map((marker, index) => ({
      id: `warp_${index}`,
      time: marker.time,
      samplePosition: Math.floor(marker.time * this.sampleRate),
      type: 'beat',
      strength: 1
    }));

    const slices = this.createSlicesFromPoints(audioData.length, points);

    return {
      slices,
      mode: 'beat',
      originalDuration: audioData.length / this.sampleRate,
      sampleRate: this.sampleRate
    };
  }

  /**
   * Generate slices for a specific time range
   */
  sliceRange(
    audioData: Float32Array,
    startBeat: number,
    endBeat: number
  ): SliceResult {
    const beatDuration = 60 / this.options.bpm;
    const startTime = startBeat * beatDuration;
    const endTime = endBeat * beatDuration;
    
    const divisionMultiplier = this.getDivisionMultiplier(this.options.division);
    const sliceInterval = beatDuration * divisionMultiplier;
    
    const points: SlicePoint[] = [];
    let currentTime = startTime;
    let index = 0;
    
    while (currentTime < endTime) {
      const samplePosition = Math.floor(currentTime * this.sampleRate);
      
      if (samplePosition >= 0 && samplePosition < audioData.length) {
        points.push({
          id: `beat_${index}`,
          time: currentTime,
          samplePosition,
          type: 'beat',
          strength: 1
        });
      }
      
      currentTime += sliceInterval;
      index++;
    }

    const slices = this.createSlicesFromPoints(audioData.length, points);

    return {
      slices,
      mode: 'beat',
      originalDuration: audioData.length / this.sampleRate,
      sampleRate: this.sampleRate
    };
  }

  /**
   * Convert beat division to time multiplier
   */
  private getDivisionMultiplier(division: BeatDivision): number {
    const divisions: Record<BeatDivision, number> = {
      '1/1': 4,
      '1/2': 2,
      '1/4': 1,
      '1/8': 0.5,
      '1/16': 0.25,
      '1/32': 0.125,
      // Triplets
      '1/2t': 4 * 2 / 3,
      '1/4t': 2 / 3,
      '1/8t': 1 / 3,
      '1/16t': 0.5 / 3,
      '1/32t': 0.25 / 3,
      // Dotted
      '1/2d': 4 * 1.5,
      '1/4d': 1.5,
      '1/8d': 0.75,
      '1/16d': 0.375,
      '1/32d': 0.1875
    };
    
    return divisions[division] || 1;
  }

  /**
   * Create audio slices from slice points
   */
  private createSlicesFromPoints(
    totalSamples: number,
    points: SlicePoint[]
  ): AudioSlice[] {
    if (points.length === 0) {
      return [{
        index: 0,
        startTime: 0,
        endTime: totalSamples / this.sampleRate,
        startSample: 0,
        endSample: totalSamples,
        duration: totalSamples / this.sampleRate,
        midiNote: 36
      }];
    }

    const slices: AudioSlice[] = [];
    
    // First slice from 0 to first point
    if (points[0].samplePosition > 0) {
      slices.push({
        index: 0,
        startTime: 0,
        endTime: points[0].time,
        startSample: 0,
        endSample: points[0].samplePosition,
        duration: points[0].time,
        midiNote: 36
      });
    }
    
    // Middle slices
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      
      slices.push({
        index: slices.length,
        startTime: current.time,
        endTime: next.time,
        startSample: current.samplePosition,
        endSample: next.samplePosition,
        duration: next.time - current.time,
        midiNote: 36 + slices.length
      });
    }
    
    // Last slice
    const lastPoint = points[points.length - 1];
    if (lastPoint.samplePosition < totalSamples) {
      slices.push({
        index: slices.length,
        startTime: lastPoint.time,
        endTime: totalSamples / this.sampleRate,
        startSample: lastPoint.samplePosition,
        endSample: totalSamples,
        duration: (totalSamples - lastPoint.samplePosition) / this.sampleRate,
        midiNote: 36 + slices.length
      });
    }

    return slices;
  }

  /**
   * Get current BPM
   */
  getBpm(): number {
    return this.options.bpm;
  }

  /**
   * Set BPM
   */
  setBpm(bpm: number): void {
    this.options.bpm = bpm;
  }

  /**
   * Get division
   */
  getDivision(): BeatDivision {
    return this.options.division;
  }

  /**
   * Set division
   */
  setDivision(division: BeatDivision): void {
    this.options.division = division;
  }

  /**
   * Get swing amount
   */
  getSwing(): number {
    return this.options.swing;
  }

  /**
   * Set swing amount (0-100)
   */
  setSwing(swing: number): void {
    this.options.swing = Math.max(0, Math.min(100, swing));
  }

  /**
   * Calculate number of slices for a duration
   */
  calculateNumSlices(durationSeconds: number): number {
    const beatDuration = 60 / this.options.bpm;
    const divisionMultiplier = this.getDivisionMultiplier(this.options.division);
    const sliceInterval = beatDuration * divisionMultiplier;
    
    return Math.ceil(durationSeconds / sliceInterval);
  }

  /**
   * Get slice times for a duration
   */
  getSliceTimes(durationSeconds: number): number[] {
    const beatDuration = 60 / this.options.bpm;
    const divisionMultiplier = this.getDivisionMultiplier(this.options.division);
    const sliceInterval = beatDuration * divisionMultiplier;
    
    const times: number[] = [];
    let time = 0;
    
    while (time < durationSeconds) {
      times.push(time);
      time += sliceInterval;
    }
    
    return times;
  }
}
