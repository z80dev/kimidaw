/**
 * Harmony detection for audio-to-MIDI conversion
 * Detects chords and polyphonic content
 */

import type { DetectedChord, ChordType, ConversionOptions } from './types.js';

interface ChordTemplate {
  type: ChordType;
  intervals: number[]; // Semitone intervals from root
}

// Common chord templates
const CHORD_TEMPLATES: ChordTemplate[] = [
  { type: 'major', intervals: [0, 4, 7] },
  { type: 'minor', intervals: [0, 3, 7] },
  { type: 'diminished', intervals: [0, 3, 6] },
  { type: 'augmented', intervals: [0, 4, 8] },
  { type: 'sus2', intervals: [0, 2, 7] },
  { type: 'sus4', intervals: [0, 5, 7] },
  { type: 'major7', intervals: [0, 4, 7, 11] },
  { type: 'minor7', intervals: [0, 3, 7, 10] },
  { type: 'dominant7', intervals: [0, 4, 7, 10] },
  { type: 'minor7b5', intervals: [0, 3, 6, 10] },
];

export interface HarmonyDetectionResult {
  chords: DetectedChord[];
  chromagram: Float32Array[]; // Time-series chroma features
}

export class HarmonyDetector {
  private sampleRate: number;
  private options: ConversionOptions;
  private fftSize: number = 4096; // Larger for better frequency resolution
  private numChromaBins: number = 12;

  constructor(sampleRate: number, options: ConversionOptions) {
    this.sampleRate = sampleRate;
    this.options = options;
  }

  /**
   * Detect chords from audio buffer
   */
  detect(audioData: Float32Array): HarmonyDetectionResult {
    // Step 1: Compute chromagram
    const chromagram = this.computeChromagram(audioData);
    
    // Step 2: Detect chord changes
    const chords = this.detectChords(chromagram);
    
    return {
      chords,
      chromagram
    };
  }

  /**
   * Compute chromagram (12-dimensional pitch class profile)
   */
  private computeChromagram(audioData: Float32Array): Float32Array[] {
    const hopSize = this.fftSize / 2;
    const numFrames = Math.floor((audioData.length - this.fftSize) / hopSize) + 1;
    const chromagram: Float32Array[] = [];
    
    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      const frame = audioData.slice(start, start + this.fftSize);
      
      // Apply Hann window
      const windowed = this.applyHannWindow(frame);
      
      // Compute STFT magnitude
      const magnitude = this.computeSTFT(windowed);
      
      // Map to chroma bins
      const chroma = this.magnitudeToChroma(magnitude);
      
      // Normalize
      const maxVal = Math.max(...chroma);
      if (maxVal > 0) {
        for (let j = 0; j < chroma.length; j++) {
          chroma[j] /= maxVal;
        }
      }
      
      chromagram.push(chroma);
    }
    
    return chromagram;
  }

  /**
   * Detect chords from chromagram
   */
  private detectChords(chromagram: Float32Array[]): DetectedChord[] {
    const chords: DetectedChord[] = [];
    const hopSize = this.fftSize / 2;
    const timePerFrame = hopSize / this.sampleRate;
    
    let currentChord: DetectedChord | null = null;
    let chordStartFrame = 0;
    
    const minChordDurationFrames = Math.ceil(
      (this.options.minDurationMs / 1000) / timePerFrame
    );
    
    for (let i = 0; i < chromagram.length; i++) {
      const chroma = chromagram[i];
      const detected = this.identifyChord(chroma);
      
      if (!detected) {
        // No clear chord detected
        if (currentChord) {
          const duration = (i - chordStartFrame) * timePerFrame;
          if (duration >= this.options.minDurationMs / 1000) {
            currentChord.duration = duration;
            chords.push(currentChord);
          }
          currentChord = null;
        }
        continue;
      }
      
      const { rootNote, chordType, notes, confidence } = detected;
      
      if (!currentChord) {
        // Start new chord
        currentChord = {
          time: i * timePerFrame,
          duration: 0,
          rootNote,
          chordType,
          notes,
          confidence
        };
        chordStartFrame = i;
      } else if (currentChord.rootNote !== rootNote || 
                 currentChord.chordType !== chordType) {
        // Chord changed
        const duration = (i - chordStartFrame) * timePerFrame;
        if (duration >= this.options.minDurationMs / 1000) {
          currentChord.duration = duration;
          chords.push(currentChord);
        }
        
        // Start new chord
        currentChord = {
          time: i * timePerFrame,
          duration: 0,
          rootNote,
          chordType,
          notes,
          confidence
        };
        chordStartFrame = i;
      }
      // Same chord - continue
    }
    
    // Don't forget last chord
    if (currentChord) {
      const duration = (chromagram.length - chordStartFrame) * timePerFrame;
      if (duration >= this.options.minDurationMs / 1000) {
        currentChord.duration = duration;
        chords.push(currentChord);
      }
    }
    
    return chords;
  }

  /**
   * Identify chord from chroma vector using template matching
   */
  private identifyChord(chroma: Float32Array): { 
    rootNote: number; 
    chordType: ChordType; 
    notes: number[];
    confidence: number;
  } | null {
    let bestScore = 0;
    let bestRoot = 0;
    let bestTemplate: ChordTemplate | null = null;
    
    // Try each root note
    for (let root = 0; root < 12; root++) {
      // Try each chord template
      for (const template of CHORD_TEMPLATES) {
        const score = this.matchChordTemplate(chroma, root, template);
        
        if (score > bestScore) {
          bestScore = score;
          bestRoot = root;
          bestTemplate = template;
        }
      }
    }
    
    // Threshold for detection
    if (bestScore < 0.5 || !bestTemplate) {
      return null;
    }
    
    // Calculate MIDI notes from chord
    const notes = bestTemplate.intervals.map(interval => bestRoot + 48 + interval); // Start at C3
    
    return {
      rootNote: bestRoot + 48,
      chordType: bestTemplate.type,
      notes,
      confidence: bestScore
    };
  }

  /**
   * Match chroma against chord template
   */
  private matchChordTemplate(chroma: Float32Array, root: number, template: ChordTemplate): number {
    let score = 0;
    
    // Sum chroma values at template intervals
    for (const interval of template.intervals) {
      const bin = (root + interval) % 12;
      score += chroma[bin];
    }
    
    // Penalize non-template notes
    const templateBins = new Set(template.intervals.map(i => (root + i) % 12));
    for (let i = 0; i < 12; i++) {
      if (!templateBins.has(i)) {
        score -= chroma[i] * 0.3;
      }
    }
    
    return score / template.intervals.length;
  }

  /**
   * Map STFT magnitude to chroma bins
   */
  private magnitudeToChroma(magnitude: Float32Array): Float32Array {
    const chroma = new Float32Array(12);
    const binFreq = this.sampleRate / this.fftSize;
    
    for (let i = 0; i < magnitude.length; i++) {
      const freq = i * binFreq;
      if (freq < 20 || freq > 8000) continue; // Focus on musical range
      
      // Convert frequency to pitch class
      const midiNote = 69 + 12 * Math.log2(freq / 440);
      const pitchClass = Math.round(midiNote) % 12;
      
      // Add to chroma bin
      chroma[pitchClass] += magnitude[i];
    }
    
    return chroma;
  }

  /**
   * Compute STFT magnitude
   */
  private computeSTFT(frame: Float32Array): Float32Array {
    const N = frame.length;
    const halfN = Math.floor(N / 2) + 1;
    const magnitude = new Float32Array(halfN);
    
    // Simple DFT (use FFT library in production)
    for (let k = 0; k < halfN; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += frame[n] * Math.cos(angle);
        imag += frame[n] * Math.sin(angle);
      }
      
      magnitude[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return magnitude;
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
   * Convert detected chords to MIDI notes
   */
  static chordsToNotes(chords: DetectedChord[]): Array<{
    startTime: number;
    duration: number;
    midiNote: number;
    velocity: number;
  }> {
    const notes: Array<{
      startTime: number;
      duration: number;
      midiNote: number;
      velocity: number;
    }> = [];
    
    for (const chord of chords) {
      for (const note of chord.notes) {
        notes.push({
          startTime: chord.time,
          duration: chord.duration,
          midiNote: note,
          velocity: Math.floor(chord.confidence * 100)
        });
      }
    }
    
    return notes;
  }
}
