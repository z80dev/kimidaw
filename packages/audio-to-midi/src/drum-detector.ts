/**
 * Drum detection for audio-to-MIDI conversion
 * Detects drum hits and classifies drum types
 */

import type { DetectedDrumHit, DrumClass, OnsetEvent, ConversionOptions } from './types.js';

interface FrequencyBand {
  name: DrumClass;
  lowFreq: number;
  highFreq: number;
  transientThreshold: number;
}

// Frequency bands for drum classification
const DRUM_BANDS: FrequencyBand[] = [
  { name: 'kick', lowFreq: 30, highFreq: 150, transientThreshold: 0.3 },
  { name: 'snare', lowFreq: 150, highFreq: 400, transientThreshold: 0.25 },
  { name: 'hihat-closed', lowFreq: 5000, highFreq: 15000, transientThreshold: 0.15 },
  { name: 'hihat-open', lowFreq: 3000, highFreq: 8000, transientThreshold: 0.2 },
  { name: 'tom-low', lowFreq: 80, highFreq: 180, transientThreshold: 0.25 },
  { name: 'tom-mid', lowFreq: 180, highFreq: 300, transientThreshold: 0.25 },
  { name: 'tom-high', lowFreq: 300, highFreq: 500, transientThreshold: 0.25 },
  { name: 'crash', lowFreq: 2000, highFreq: 15000, transientThreshold: 0.2 },
  { name: 'ride', lowFreq: 2000, highFreq: 8000, transientThreshold: 0.18 },
  { name: 'clap', lowFreq: 1000, highFreq: 5000, transientThreshold: 0.22 },
  { name: 'rim', lowFreq: 2000, highFreq: 8000, transientThreshold: 0.2 },
];

export interface DrumDetectionResult {
  hits: DetectedDrumHit[];
  onsets: OnsetEvent[];
}

export class DrumDetector {
  private sampleRate: number;
  private options: ConversionOptions;
  private fftSize: number = 2048;

  constructor(sampleRate: number, options: ConversionOptions) {
    this.sampleRate = sampleRate;
    this.options = options;
  }

  /**
   * Detect drum hits in audio buffer
   */
  detect(audioData: Float32Array): DrumDetectionResult {
    const onsets = this.detectOnsets(audioData);
    const hits = this.classifyDrumHits(audioData, onsets);
    
    return {
      hits: this.mergeNearbyHits(hits),
      onsets
    };
  }

  /**
   * Detect transient onsets using spectral flux
   */
  private detectOnsets(audioData: Float32Array): OnsetEvent[] {
    const hopSize = this.fftSize / 4;
    const onsets: OnsetEvent[] = [];
    const spectralFlux: number[] = [];
    
    // Compute STFT and spectral flux
    const numFrames = Math.floor((audioData.length - this.fftSize) / hopSize) + 1;
    let previousMagnitude: Float32Array | null = null;
    
    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      const frame = audioData.slice(start, start + this.fftSize);
      
      // Apply Hann window
      const windowed = this.applyHannWindow(frame);
      
      // Compute FFT magnitude
      const magnitude = this.computeFFT magnitude(windowed);
      
      if (previousMagnitude) {
        // Spectral flux (sum of positive differences)
        let flux = 0;
        for (let j = 0; j < magnitude.length; j++) {
          const diff = magnitude[j] - previousMagnitude[j];
          if (diff > 0) flux += diff;
        }
        spectralFlux.push(flux);
      }
      
      previousMagnitude = magnitude;
    }
    
    // Find peaks in spectral flux
    const threshold = this.calculateAdaptiveThreshold(spectralFlux);
    const minDistanceFrames = Math.floor(0.05 * this.sampleRate / hopSize); // 50ms minimum
    
    for (let i = 2; i < spectralFlux.length - 2; i++) {
      const flux = spectralFlux[i];
      
      // Check if local maximum and above threshold
      if (flux > threshold[i] &&
          flux > spectralFlux[i - 1] &&
          flux > spectralFlux[i - 2] &&
          flux > spectralFlux[i + 1] &&
          flux > spectralFlux[i + 2]) {
        
        // Check minimum distance from previous onset
        if (onsets.length === 0 || i - onsets[onsets.length - 1].time * (this.sampleRate / hopSize) > minDistanceFrames) {
          const time = (i * hopSize) / this.sampleRate;
          onsets.push({
            time,
            strength: flux / Math.max(...spectralFlux)
          });
        }
      }
    }
    
    return onsets;
  }

  /**
   * Classify detected onsets into drum types
   */
  private classifyDrumHits(audioData: Float32Array, onsets: OnsetEvent[]): DetectedDrumHit[] {
    const hits: DetectedDrumHit[] = [];
    const analysisWindowMs = 50; // 50ms window for classification
    const windowSamples = Math.floor(analysisWindowMs * this.sampleRate / 1000);
    
    for (const onset of onsets) {
      const startSample = Math.floor(onset.time * this.sampleRate);
      const endSample = Math.min(startSample + windowSamples, audioData.length);
      const window = audioData.slice(startSample, endSample);
      
      // Analyze frequency content
      const bandEnergies = this.analyzeFrequencyBands(window);
      
      // Find best matching drum class
      let bestClass: DrumClass = 'unknown';
      let bestConfidence = 0;
      
      for (const band of DRUM_BANDS) {
        const energy = bandEnergies.get(band.name) || 0;
        const normalizedEnergy = energy / (Math.max(...bandEnergies.values()) || 1);
        
        if (normalizedEnergy > band.transientThreshold && normalizedEnergy > bestConfidence) {
          bestClass = band.name;
          bestConfidence = normalizedEnergy;
        }
      }
      
      hits.push({
        time: onset.time,
        drumClass: bestClass,
        confidence: bestConfidence,
        velocity: Math.min(127, Math.floor(onset.strength * 127 * this.options.sensitivity / 50))
      });
    }
    
    return hits;
  }

  /**
   * Analyze energy in each frequency band
   */
  private analyzeFrequencyBands(window: Float32Array): Map<DrumClass, number> {
    const energies = new Map<DrumClass, number>();
    
    // Compute FFT
    const windowed = this.applyHannWindow(window);
    const magnitude = this.computeFFT magnitude(windowed);
    
    const binFreq = this.sampleRate / this.fftSize;
    
    for (const band of DRUM_BANDS) {
      let energy = 0;
      const startBin = Math.floor(band.lowFreq / binFreq);
      const endBin = Math.min(Math.floor(band.highFreq / binFreq), magnitude.length);
      
      for (let i = startBin; i < endBin; i++) {
        energy += magnitude[i] * magnitude[i];
      }
      
      energies.set(band.name, energy / (endBin - startBin || 1));
    }
    
    return energies;
  }

  /**
   * Merge nearby hits of the same class (avoid double-triggering)
   */
  private mergeNearbyHits(hits: DetectedDrumHit[]): DetectedDrumHit[] {
    const minGapMs = 30; // 30ms minimum gap
    const minGapSec = minGapMs / 1000;
    
    return hits.filter((hit, index) => {
      if (index === 0) return true;
      
      const prevHit = hits[index - 1];
      return !(hit.drumClass === prevHit.drumClass && 
               hit.time - prevHit.time < minGapSec);
    });
  }

  /**
   * Apply Hann window to frame
   */
  private applyHannWindow(frame: Float32Array): Float32Array {
    const windowed = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frame.length - 1)));
      windowed[i] = frame[i] * hann;
    }
    return windowed;
  }

  /**
   * Compute FFT magnitude (simplified - real FFT)
   */
  private computeFFT magnitude(frame: Float32Array): Float32Array {
    // In a real implementation, use a proper FFT library
    // This is a placeholder that computes a simple DFT
    const N = frame.length;
    const halfN = Math.floor(N / 2) + 1;
    const magnitude = new Float32Array(halfN);
    
    for (let k = 0; k < halfN; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += frame[n] * Math.cos(angle);
        imag += frame[n] * Math.sin(angle);
      }
      
      magnitude[k] = Math.sqrt(real * real + imag * imag) / N;
    }
    
    return magnitude;
  }

  /**
   * Calculate adaptive threshold for onset detection
   */
  private calculateAdaptiveThreshold(spectralFlux: number[]): number[] {
    const threshold: number[] = [];
    const windowSize = 10;
    const multiplier = 1.5;
    
    for (let i = 0; i < spectralFlux.length; i++) {
      const start = Math.max(0, i - windowSize);
      const end = Math.min(spectralFlux.length, i + windowSize + 1);
      
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += spectralFlux[j];
      }
      
      const mean = sum / (end - start);
      threshold.push(mean * multiplier);
    }
    
    return threshold;
  }

  /**
   * Get default MIDI note for drum class
   */
  static getDrumMidiNote(drumClass: DrumClass): number {
    const drumMap: Record<DrumClass, number> = {
      'kick': 36,
      'snare': 38,
      'hihat-closed': 42,
      'hihat-open': 46,
      'tom-low': 41,
      'tom-mid': 47,
      'tom-high': 50,
      'crash': 49,
      'ride': 51,
      'clap': 39,
      'rim': 37,
      'unknown': 60
    };
    
    return drumMap[drumClass];
  }
}
