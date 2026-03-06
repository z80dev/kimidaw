/**
 * Main audio-to-MIDI conversion logic
 * Orchestrates drum, melody, and harmony detection
 */

import type { 
  ConversionOptions, 
  ConversionResult, 
  DetectedNote, 
  ConversionMode 
} from './types.js';
import { DrumDetector, type DrumDetectionResult } from './drum-detector.js';
import { MelodyDetector, type MelodyDetectionResult } from './melody-detector.js';
import { HarmonyDetector, type HarmonyDetectionResult } from './harmony-detector.js';

export interface ConversionProgress {
  stage: 'analyzing' | 'detecting' | 'quantizing' | 'complete';
  progress: number; // 0-100
  message: string;
}

export type ProgressCallback = (progress: ConversionProgress) => void;

export class AudioToMidiConverter {
  private sampleRate: number;
  private options: ConversionOptions;

  constructor(sampleRate: number = 44100, options?: Partial<ConversionOptions>) {
    this.sampleRate = sampleRate;
    this.options = {
      mode: 'melody',
      sensitivity: 50,
      minDurationMs: 50,
      maxPolyphony: 4,
      velocitySensitive: true,
      quantizeToGrid: false,
      gridDivision: 240, // 16th note at 960 PPQ
      ...options
    };
  }

  /**
   * Convert audio buffer to MIDI notes
   */
  async convert(
    audioData: Float32Array,
    onProgress?: ProgressCallback
  ): Promise<ConversionResult> {
    // Normalize audio
    const normalized = this.normalizeAudio(audioData);
    
    let detectedNotes: DetectedNote[] = [];
    let confidence = 0;

    switch (this.options.mode) {
      case 'drums':
        detectedNotes = await this.convertDrums(normalized, onProgress);
        break;
      case 'melody':
        detectedNotes = await this.convertMelody(normalized, onProgress);
        break;
      case 'harmony':
        detectedNotes = await this.convertHarmony(normalized, onProgress);
        break;
    }

    // Quantize if requested
    if (this.options.quantizeToGrid) {
      onProgress?.({
        stage: 'quantizing',
        progress: 90,
        message: 'Quantizing to grid...'
      });
      detectedNotes = this.quantizeNotes(detectedNotes);
    }

    // Calculate overall confidence
    confidence = detectedNotes.length > 0
      ? detectedNotes.reduce((sum, n) => sum + n.confidence, 0) / detectedNotes.length
      : 0;

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Conversion complete'
    });

    return {
      mode: this.options.mode,
      notes: detectedNotes,
      tempo: 0, // Could be detected
      sampleRate: this.sampleRate,
      duration: audioData.length / this.sampleRate,
      confidence
    };
  }

  /**
   * Convert drums to MIDI
   */
  private async convertDrums(
    audioData: Float32Array,
    onProgress?: ProgressCallback
  ): Promise<DetectedNote[]> {
    onProgress?.({
      stage: 'detecting',
      progress: 30,
      message: 'Detecting drum hits...'
    });

    const detector = new DrumDetector(this.sampleRate, this.options);
    const result = detector.detect(audioData);

    onProgress?.({
      stage: 'detecting',
      progress: 70,
      message: `Found ${result.hits.length} drum hits`
    });

    // Convert drum hits to notes
    return result.hits.map(hit => ({
      startTime: hit.time,
      duration: 0.1, // Short duration for drums
      midiNote: DrumDetector.getDrumMidiNote(hit.drumClass),
      velocity: hit.velocity,
      confidence: hit.confidence
    }));
  }

  /**
   * Convert melody to MIDI
   */
  private async convertMelody(
    audioData: Float32Array,
    onProgress?: ProgressCallback
  ): Promise<DetectedNote[]> {
    onProgress?.({
      stage: 'detecting',
      progress: 30,
      message: 'Tracking pitch contour...'
    });

    const detector = new MelodyDetector(this.sampleRate, this.options);
    const result = detector.detect(audioData);

    onProgress?.({
      stage: 'detecting',
      progress: 70,
      message: `Found ${result.notes.length} notes`
    });

    return result.notes;
  }

  /**
   * Convert harmony/chords to MIDI
   */
  private async convertHarmony(
    audioData: Float32Array,
    onProgress?: ProgressCallback
  ): Promise<DetectedNote[]> {
    onProgress?.({
      stage: 'detecting',
      progress: 30,
      message: 'Analyzing harmonic content...'
    });

    const detector = new HarmonyDetector(this.sampleRate, this.options);
    const result = detector.detect(audioData);

    onProgress?.({
      stage: 'detecting',
      progress: 70,
      message: `Found ${result.chords.length} chords`
    });

    // Convert chords to individual notes
    return HarmonyDetector.chordsToNotes(result.chords).map(note => ({
      ...note,
      confidence: 0.8
    }));
  }

  /**
   * Normalize audio to -1..1 range
   */
  private normalizeAudio(audioData: Float32Array): Float32Array {
    let max = 0;
    for (const sample of audioData) {
      max = Math.max(max, Math.abs(sample));
    }
    
    if (max === 0) return audioData;
    
    const normalized = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      normalized[i] = audioData[i] / max;
    }
    
    return normalized;
  }

  /**
   * Quantize detected notes to grid
   */
  private quantizeNotes(notes: DetectedNote[]): DetectedNote[] {
    const gridDivision = this.options.gridDivision;
    const ppq = 960; // Assuming 960 PPQ
    
    // Calculate grid size in seconds (assuming 120 BPM for now)
    const bpm = 120;
    const beatDuration = 60 / bpm;
    const gridSize = (gridDivision / ppq) * beatDuration;
    
    return notes.map(note => {
      const quantizedStart = Math.round(note.startTime / gridSize) * gridSize;
      const quantizedDuration = Math.max(
        gridSize / 4, // Minimum 1/64th note
        Math.round(note.duration / gridSize) * gridSize
      );
      
      return {
        ...note,
        startTime: quantizedStart,
        duration: quantizedDuration
      };
    });
  }

  /**
   * Update conversion options
   */
  setOptions(options: Partial<ConversionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): ConversionOptions {
    return { ...this.options };
  }

  /**
   * Set conversion mode
   */
  setMode(mode: ConversionMode): void {
    this.options.mode = mode;
  }

  /**
   * Analyze audio without converting (preview)
   */
  async analyze(audioData: Float32Array): Promise<{
    suggestedMode: ConversionMode;
    transientDensity: number;
    pitchStability: number;
    polyphonyEstimate: number;
  }> {
    const normalized = this.normalizeAudio(audioData);
    
    // Quick analysis to suggest mode
    const transientDensity = this.estimateTransientDensity(normalized);
    const pitchStability = this.estimatePitchStability(normalized);
    const polyphonyEstimate = this.estimatePolyphony(normalized);
    
    // Heuristic for suggested mode
    let suggestedMode: ConversionMode = 'melody';
    if (transientDensity > 0.5 && polyphonyEstimate < 2) {
      suggestedMode = 'drums';
    } else if (polyphonyEstimate > 2) {
      suggestedMode = 'harmony';
    }
    
    return {
      suggestedMode,
      transientDensity,
      pitchStability,
      polyphonyEstimate
    };
  }

  /**
   * Estimate transient density
   */
  private estimateTransientDensity(audioData: Float32Array): number {
    const frameSize = 1024;
    const hopSize = 512;
    let transients = 0;
    
    let prevEnergy = 0;
    for (let i = 0; i < audioData.length; i += hopSize) {
      const frame = audioData.slice(i, i + frameSize);
      let energy = 0;
      for (const s of frame) energy += s * s;
      
      if (prevEnergy > 0 && energy / prevEnergy > 4) {
        transients++;
      }
      prevEnergy = energy;
    }
    
    return transients / (audioData.length / this.sampleRate);
  }

  /**
   * Estimate pitch stability
   */
  private estimatePitchStability(audioData: Float32Array): number {
    // Simplified - would use YIN in practice
    return 0.7;
  }

  /**
   * Estimate polyphony level
   */
  private estimatePolyphony(audioData: Float32Array): number {
    // Simplified spectral analysis
    const fftSize = 4096;
    const magnitude = this.quickFFT(audioData.slice(0, Math.min(fftSize, audioData.length)));
    
    // Count significant peaks
    let peaks = 0;
    for (let i = 2; i < magnitude.length - 2; i++) {
      if (magnitude[i] > magnitude[i-1] && 
          magnitude[i] > magnitude[i-2] &&
          magnitude[i] > magnitude[i+1] && 
          magnitude[i] > magnitude[i+2] &&
          magnitude[i] > 0.1) {
        peaks++;
      }
    }
    
    return Math.min(8, peaks / 3);
  }

  /**
   * Quick FFT for analysis
   */
  private quickFFT(frame: Float32Array): Float32Array {
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
}
