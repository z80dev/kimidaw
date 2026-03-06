/**
 * Transient detection and slicing
 * Detects transients and creates slice points
 */

import type { 
  SlicePoint, 
  SliceResult, 
  AudioSlice, 
  TransientOptions 
} from './types.js';

export interface TransientDetectionResult {
  transients: SlicePoint[];
  envelope: Float32Array;
}

export class TransientSlicer {
  private sampleRate: number;
  private options: TransientOptions;

  constructor(sampleRate: number, options: TransientOptions) {
    this.sampleRate = sampleRate;
    this.options = options;
  }

  /**
   * Detect transients in audio and create slices
   */
  slice(audioData: Float32Array): SliceResult {
    const transients = this.detectTransients(audioData);
    const slices = this.createSlicesFromPoints(audioData.length, transients);

    return {
      slices,
      mode: 'transient',
      originalDuration: audioData.length / this.sampleRate,
      sampleRate: this.sampleRate
    };
  }

  /**
   * Detect transient positions in audio
   */
  detectTransients(audioData: Float32Array): SlicePoint[] {
    // Step 1: Compute amplitude envelope
    const envelope = this.computeEnvelope(audioData);
    
    // Step 2: Compute onset detection function using spectral flux
    const onsetFunction = this.computeOnsetFunction(audioData);
    
    // Step 3: Find peaks in onset function
    const minTimeSamples = Math.floor(this.options.minTimeMs * this.sampleRate / 1000);
    const transients: SlicePoint[] = [];
    
    // Calculate adaptive threshold
    const threshold = this.calculateAdaptiveThreshold(onsetFunction);
    
    for (let i = 2; i < onsetFunction.length - 2; i++) {
      const onset = onsetFunction[i];
      
      // Check if local maximum and above threshold
      if (onset > threshold[i] &&
          onset > onsetFunction[i - 1] &&
          onset > onsetFunction[i - 2] &&
          onset > onsetFunction[i + 1] &&
          onset > onsetFunction[i + 2]) {
        
        // Check minimum distance from previous transient
        if (transients.length === 0) {
          const samplePosition = i * (this.sampleRate / 100); // Assuming 100 Hz analysis rate
          transients.push({
            id: `transient_${transients.length}`,
            time: samplePosition / this.sampleRate,
            samplePosition: Math.floor(samplePosition),
            type: 'transient',
            strength: onset
          });
        } else {
          const lastTransient = transients[transients.length - 1];
          const distance = i * (this.sampleRate / 100) - lastTransient.samplePosition;
          
          if (distance >= minTimeSamples) {
            const samplePosition = i * (this.sampleRate / 100);
            transients.push({
              id: `transient_${transients.length}`,
              time: samplePosition / this.sampleRate,
              samplePosition: Math.floor(samplePosition),
              type: 'transient',
              strength: onset
            });
          }
        }
      }
    }

    return transients;
  }

  /**
   * Compute amplitude envelope using RMS in sliding windows
   */
  private computeEnvelope(audioData: Float32Array): Float32Array {
    const windowSize = Math.floor(0.01 * this.sampleRate); // 10ms windows
    const hopSize = Math.floor(windowSize / 2);
    const numFrames = Math.floor((audioData.length - windowSize) / hopSize) + 1;
    
    const envelope = new Float32Array(numFrames);
    
    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      let sum = 0;
      
      for (let j = 0; j < windowSize; j++) {
        sum += audioData[start + j] * audioData[start + j];
      }
      
      envelope[i] = Math.sqrt(sum / windowSize);
    }
    
    return envelope;
  }

  /**
   * Compute onset detection function using spectral flux
   */
  private computeOnsetFunction(audioData: Float32Array): Float32Array {
    const fftSize = 1024;
    const hopSize = fftSize / 4;
    const numFrames = Math.floor((audioData.length - fftSize) / hopSize) + 1;
    
    const onsetFunction = new Float32Array(numFrames);
    let prevMagnitude: Float32Array | null = null;
    
    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      const frame = audioData.slice(start, start + fftSize);
      
      // Apply Hann window
      const windowed = this.applyHannWindow(frame);
      
      // Compute FFT magnitude
      const magnitude = this.computeFFT magnitude(windowed);
      
      if (prevMagnitude) {
        // Spectral flux - sum of positive differences
        let flux = 0;
        for (let j = 0; j < magnitude.length; j++) {
          const diff = magnitude[j] - prevMagnitude[j];
          if (diff > 0) flux += diff;
        }
        onsetFunction[i] = flux;
      }
      
      prevMagnitude = magnitude;
    }
    
    return onsetFunction;
  }

  /**
   * Calculate adaptive threshold for onset detection
   */
  private calculateAdaptiveThreshold(onsetFunction: Float32Array): number[] {
    const threshold: number[] = [];
    const windowSize = 10;
    const sensitivityFactor = 1 + (100 - this.options.sensitivity) / 50;
    
    for (let i = 0; i < onsetFunction.length; i++) {
      const start = Math.max(0, i - windowSize);
      const end = Math.min(onsetFunction.length, i + windowSize + 1);
      
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += onsetFunction[j];
      }
      
      const mean = sum / (end - start);
      threshold.push(mean * sensitivityFactor);
    }
    
    return threshold;
  }

  /**
   * Create slices from detected transient points
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
        midiNote: 36 // C1
      }];
    }

    const slices: AudioSlice[] = [];
    
    // First slice starts at 0
    slices.push({
      index: 0,
      startTime: 0,
      endTime: points[0].time,
      startSample: 0,
      endSample: points[0].samplePosition,
      duration: points[0].time,
      midiNote: 36 // C1
    });
    
    // Middle slices
    for (let i = 0; i < points.length; i++) {
      const startPoint = points[i];
      const endPoint = i < points.length - 1 ? points[i + 1] : null;
      
      slices.push({
        index: i + 1,
        startTime: startPoint.time,
        endTime: endPoint ? endPoint.time : totalSamples / this.sampleRate,
        startSample: startPoint.samplePosition,
        endSample: endPoint ? endPoint.samplePosition : totalSamples,
        duration: endPoint 
          ? endPoint.time - startPoint.time 
          : (totalSamples - startPoint.samplePosition) / this.sampleRate,
        midiNote: 36 + i // Assign consecutive notes
      });
    }

    return slices;
  }

  /**
   * Apply Hann window
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
   * Compute FFT magnitude (simplified)
   */
  private computeFFT magnitude(frame: Float32Array): Float32Array {
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
   * Get sensitivity setting
   */
  getSensitivity(): number {
    return this.options.sensitivity;
  }

  /**
   * Set sensitivity
   */
  setSensitivity(sensitivity: number): void {
    this.options.sensitivity = Math.max(0, Math.min(100, sensitivity));
  }

  /**
   * Set minimum time between transients
   */
  setMinTimeMs(minTimeMs: number): void {
    this.options.minTimeMs = minTimeMs;
  }
}
