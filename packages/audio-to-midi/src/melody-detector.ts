/**
 * Melody detection for audio-to-MIDI conversion
 * Uses YIN algorithm for pitch tracking
 */

import type { DetectedNote, ConversionOptions } from './types.js';

export interface MelodyDetectionResult {
  notes: DetectedNote[];
  pitchContour: Float32Array; // Continuous pitch values
}

export class MelodyDetector {
  private sampleRate: number;
  private options: ConversionOptions;
  private yinThreshold: number = 0.1;
  private bufferSize: number = 2048;

  constructor(sampleRate: number, options: ConversionOptions) {
    this.sampleRate = sampleRate;
    this.options = options;
  }

  /**
   * Detect melody from audio buffer
   */
  detect(audioData: Float32Array): MelodyDetectionResult {
    // Step 1: Compute pitch contour using YIN
    const pitchContour = this.computeYINContour(audioData);
    
    // Step 2: Segment into notes
    const notes = this.segmentNotes(pitchContour);
    
    return {
      notes,
      pitchContour
    };
  }

  /**
   * Compute YIN pitch contour for entire audio buffer
   */
  private computeYINContour(audioData: Float32Array): Float32Array {
    const hopSize = this.bufferSize / 4;
    const numFrames = Math.floor((audioData.length - this.bufferSize) / hopSize) + 1;
    const contour = new Float32Array(numFrames);
    
    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      const frame = audioData.slice(start, start + this.bufferSize);
      contour[i] = this.yinPitch(frame);
    }
    
    return contour;
  }

  /**
   * YIN pitch detection algorithm
   * Returns fundamental frequency in Hz, or 0 for unvoiced
   */
  private yinPitch(frame: Float32Array): number {
    const halfBuffer = Math.floor(frame.length / 2);
    
    // Step 1: Difference function
    const difference = new Float32Array(halfBuffer);
    for (let tau = 0; tau < halfBuffer; tau++) {
      let sum = 0;
      for (let j = 0; j < halfBuffer; j++) {
        const delta = frame[j] - frame[j + tau];
        sum += delta * delta;
      }
      difference[tau] = sum;
    }
    
    // Step 2: Cumulative mean normalized difference
    const cmnd = new Float32Array(halfBuffer);
    cmnd[0] = 1;
    let runningSum = 0;
    
    for (let tau = 1; tau < halfBuffer; tau++) {
      runningSum += difference[tau];
      cmnd[tau] = difference[tau] * tau / runningSum;
    }
    
    // Step 3: Absolute threshold
    let tauEstimate = -1;
    for (let tau = 2; tau < halfBuffer; tau++) {
      if (cmnd[tau] < this.yinThreshold) {
        // Ensure it's a local minimum
        while (tau + 1 < halfBuffer && cmnd[tau + 1] < cmnd[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }
    
    // No pitch found
    if (tauEstimate === -1) return 0;
    
    // Step 4: Parabolic interpolation for better precision
    const betterTau = this.parabolicInterpolation(cmnd, tauEstimate);
    
    // Convert to frequency
    return this.sampleRate / betterTau;
  }

  /**
   * Parabolic interpolation for sub-sample precision
   */
  private parabolicInterpolation(cmnd: Float32Array, tau: number): number {
    if (tau <= 0 || tau >= cmnd.length - 1) return tau;
    
    const alpha = cmnd[tau - 1];
    const beta = cmnd[tau];
    const gamma = cmnd[tau + 1];
    
    const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
    
    return tau + p;
  }

  /**
   * Segment continuous pitch contour into discrete notes
   */
  private segmentNotes(pitchContour: Float32Array): DetectedNote[] {
    const notes: DetectedNote[] = [];
    const hopSize = this.bufferSize / 4;
    const timePerFrame = hopSize / this.sampleRate;
    
    let noteStart = -1;
    let currentPitch = 0;
    let pitchSum = 0;
    let pitchCount = 0;
    
    const minNoteDurationSec = this.options.minDurationMs / 1000;
    const pitchTolerance = 0.5; // semitones
    
    for (let i = 0; i < pitchContour.length; i++) {
      const pitch = pitchContour[i];
      const time = i * timePerFrame;
      
      if (pitch === 0) {
        // Unvoiced - end current note if exists
        if (noteStart >= 0) {
          const avgPitch = pitchSum / pitchCount;
          const duration = time - noteStart;
          
          if (duration >= minNoteDurationSec) {
            notes.push(this.createNote(noteStart, duration, avgPitch));
          }
          
          noteStart = -1;
          currentPitch = 0;
          pitchSum = 0;
          pitchCount = 0;
        }
      } else {
        // Voiced
        if (noteStart < 0) {
          // Start new note
          noteStart = time;
          currentPitch = pitch;
          pitchSum = pitch;
          pitchCount = 1;
        } else {
          // Check if pitch has changed significantly
          const semitoneDiff = Math.abs(12 * Math.log2(pitch / currentPitch));
          
          if (semitoneDiff > pitchTolerance) {
            // Pitch changed - end current note and start new one
            const avgPitch = pitchSum / pitchCount;
            const duration = time - noteStart;
            
            if (duration >= minNoteDurationSec) {
              notes.push(this.createNote(noteStart, duration, avgPitch));
            }
            
            noteStart = time;
            currentPitch = pitch;
            pitchSum = pitch;
            pitchCount = 1;
          } else {
            // Continue current note
            pitchSum += pitch;
            pitchCount++;
            // Update current pitch with moving average
            currentPitch = pitchSum / pitchCount;
          }
        }
      }
    }
    
    // Don't forget the last note
    if (noteStart >= 0) {
      const avgPitch = pitchSum / pitchCount;
      const time = pitchContour.length * timePerFrame;
      const duration = time - noteStart;
      
      if (duration >= minNoteDurationSec) {
        notes.push(this.createNote(noteStart, duration, avgPitch));
      }
    }
    
    return notes;
  }

  /**
   * Create a detected note from pitch and timing
   */
  private createNote(startTime: number, duration: number, frequency: number): DetectedNote {
    // Convert frequency to MIDI note number
    const midiNote = this.frequencyToMidi(frequency);
    
    // Quantize if requested
    let finalStart = startTime;
    if (this.options.quantizeToGrid) {
      finalStart = this.quantizeTime(startTime);
    }
    
    return {
      startTime: finalStart,
      duration,
      midiNote,
      velocity: 100, // Default velocity, could be extracted from amplitude
      confidence: 0.8 // Placeholder - could be derived from YIN clarity
    };
  }

  /**
   * Convert frequency to MIDI note number
   */
  private frequencyToMidi(frequency: number): number {
    // A4 = 440Hz = MIDI note 69
    return Math.round(69 + 12 * Math.log2(frequency / 440));
  }

  /**
   * Quantize time to grid
   */
  private quantizeTime(time: number): number {
    // Assuming 120 BPM for quantization if no tempo provided
    const bpm = 120;
    const beatDuration = 60 / bpm;
    const gridDivision = this.options.gridDivision;
    const ppq = 960; // Pulses per quarter note
    
    const ticks = time / beatDuration * ppq;
    const quantizedTicks = Math.round(ticks / gridDivision) * gridDivision;
    
    return quantizedTicks / ppq * beatDuration;
  }
}
