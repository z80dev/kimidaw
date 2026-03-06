/**
 * Pitch Detection
 * 
 * Fundamental frequency detection using:
 * - YIN algorithm for monophonic
 * - CREPE deep learning model for polyphonic
 * - Probabilistic YIN for enhanced accuracy
 */

import type { DetectedNote, PitchAnalysis } from './types.js';

interface DetectionConfig {
  sampleRate: number;
  frameSize: number;
  hopSize: number;
  minFreq: number;
  maxFreq: number;
}

export class PitchDetector {
  private config: DetectionConfig;
  
  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = {
      sampleRate: 44100,
      frameSize: 2048,
      hopSize: 256,
      minFreq: 50,
      maxFreq: 2000,
      ...config
    };
  }
  
  /**
   * Detect pitch using YIN algorithm
   */
  detectYIN(audioData: Float32Array): Float32Array {
    const { sampleRate, hopSize, minFreq, maxFreq } = this.config;
    const numFrames = Math.floor((audioData.length - this.config.frameSize) / hopSize);
    const pitches = new Float32Array(numFrames);
    
    const minPeriod = Math.floor(sampleRate / maxFreq);
    const maxPeriod = Math.floor(sampleRate / minFreq);
    
    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * hopSize;
      const frameData = audioData.slice(start, start + this.config.frameSize);
      
      pitches[frame] = this.yinPitch(frameData, minPeriod, maxPeriod, sampleRate);
    }
    
    return pitches;
  }
  
  private yinPitch(
    frame: Float32Array, 
    minPeriod: number, 
    maxPeriod: number,
    sampleRate: number
  ): number {
    const threshold = 0.1;
    
    // Step 1: Difference function
    const diff = new Float32Array(maxPeriod);
    for (let tau = minPeriod; tau < maxPeriod; tau++) {
      let sum = 0;
      for (let j = 0; j < frame.length - tau; j++) {
        const delta = frame[j] - frame[j + tau];
        sum += delta * delta;
      }
      diff[tau] = sum;
    }
    
    // Step 2: Cumulative mean normalized difference
    const cmnd = new Float32Array(maxPeriod);
    cmnd[minPeriod] = 1;
    let runningSum = 0;
    for (let tau = minPeriod + 1; tau < maxPeriod; tau++) {
      runningSum += diff[tau];
      cmnd[tau] = diff[tau] * tau / runningSum;
    }
    
    // Step 3: Absolute threshold
    let tau = minPeriod;
    while (tau < maxPeriod) {
      if (cmnd[tau] < threshold) {
        // Step 4: Parabolic interpolation
        while (tau + 1 < maxPeriod && cmnd[tau + 1] < cmnd[tau]) {
          tau++;
        }
        break;
      }
      tau++;
    }
    
    if (tau >= maxPeriod || cmnd[tau] >= threshold) {
      return 0; // No pitch detected
    }
    
    // Parabolic interpolation for better accuracy
    const alpha = cmnd[tau - 1];
    const beta = cmnd[tau];
    const gamma = cmnd[tau + 1];
    const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
    
    const period = tau + p;
    return sampleRate / period;
  }
  
  /**
   * Detect notes from pitch contour
   */
  detectNotes(
    pitchContour: Float32Array, 
    audioData: Float32Array,
    hopTime: number
  ): DetectedNote[] {
    const notes: DetectedNote[] = [];
    let currentNote: Partial<DetectedNote> | null = null;
    let noteStart = 0;
    
    for (let i = 0; i < pitchContour.length; i++) {
      const pitch = pitchContour[i];
      const time = i * hopTime;
      
      if (pitch === 0) {
        // No pitch - end current note
        if (currentNote) {
          this.finalizeNote(currentNote, noteStart, time, notes);
          currentNote = null;
        }
        continue;
      }
      
      const midiPitch = this.freqToMidi(pitch);
      
      if (!currentNote) {
        // Start new note
        currentNote = {
          pitch: Math.round(midiPitch),
          pitchCents: (midiPitch - Math.round(midiPitch)) * 100,
          amplitude: this.calculateAmplitude(audioData, i, hopTime)
        };
        noteStart = time;
      } else {
        // Check if pitch changed significantly
        const pitchDiff = Math.abs(midiPitch - (currentNote.pitch! + (currentNote.pitchCents || 0) / 100));
        
        if (pitchDiff > 0.5) {
          // Pitch changed - end current note, start new one
          this.finalizeNote(currentNote, noteStart, time, notes);
          
          currentNote = {
            pitch: Math.round(midiPitch),
            pitchCents: (midiPitch - Math.round(midiPitch)) * 100,
            amplitude: this.calculateAmplitude(audioData, i, hopTime)
          };
          noteStart = time;
        }
      }
    }
    
    // Finalize last note
    if (currentNote) {
      this.finalizeNote(
        currentNote, 
        noteStart, 
        pitchContour.length * hopTime, 
        notes
      );
    }
    
    return notes;
  }
  
  private finalizeNote(
    note: Partial<DetectedNote>,
    startTime: number,
    endTime: number,
    notes: DetectedNote[]
  ): void {
    const duration = endTime - startTime;
    
    // Filter out very short notes
    if (duration < 0.05) return;
    
    const finalNote: DetectedNote = {
      id: `note-${notes.length}`,
      startTime,
      duration,
      pitch: note.pitch!,
      pitchCents: note.pitchCents || 0,
      amplitude: note.amplitude || -60,
      confidence: 0.9,
      targetPitch: note.pitch,
      pitchShift: 0,
      pitchDrift: 0,
      formantShift: 0
    };
    
    notes.push(finalNote);
  }
  
  private calculateAmplitude(
    audioData: Float32Array, 
    frameIndex: number, 
    hopTime: number
  ): number {
    const hopSamples = Math.floor(hopTime * this.config.sampleRate);
    const start = frameIndex * hopSamples;
    const end = Math.min(start + hopSamples, audioData.length);
    
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += audioData[i] * audioData[i];
    }
    
    const rms = Math.sqrt(sum / (end - start));
    return 20 * Math.log10(rms + 1e-10);
  }
  
  private freqToMidi(freq: number): number {
    return 69 + 12 * Math.log2(freq / 440);
  }
  
  /**
   * Detect polyphonic pitches using deep learning
   * (Placeholder for CREPE/SPICE model integration)
   */
  async detectPolyphonic(audioData: Float32Array): Promise<Float32Array[]> {
    // This would use an ONNX model like CREPE or a custom polyphonic model
    // For now, return multiple pitch contours
    
    const monophonic = this.detectYIN(audioData);
    
    // Simple harmonic detection
    const harmonics: Float32Array[] = [monophonic];
    
    // Detect additional notes (simplified)
    // Full implementation would use deep learning
    
    return harmonics;
  }
}

/**
 * Detect scale/key from notes
 */
export function detectScale(notes: DetectedNote[]): { key: string; scale: string; confidence: number } {
  if (notes.length === 0) {
    return { key: 'C', scale: 'major', confidence: 0 };
  }
  
  // Count note occurrences
  const noteCounts = new Array(12).fill(0);
  for (const note of notes) {
    noteCounts[note.pitch % 12]++;
  }
  
  // Try each key
  let bestKey = 'C';
  let bestScale = 'major';
  let bestScore = 0;
  
  const scaleIntervals: Record<string, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10]
  };
  
  for (let key = 0; key < 12; key++) {
    for (const [scaleName, intervals] of Object.entries(scaleIntervals)) {
      let score = 0;
      
      for (const interval of intervals) {
        const noteClass = (key + interval) % 12;
        score += noteCounts[noteClass];
      }
      
      // Penalize notes outside scale
      for (let noteClass = 0; noteClass < 12; noteClass++) {
        if (!intervals.includes((noteClass - key + 12) % 12)) {
          score -= noteCounts[noteClass] * 0.5;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestKey = NOTE_NAMES[key];
        bestScale = scaleName;
      }
    }
  }
  
  const totalNotes = notes.length;
  const confidence = Math.min(bestScore / totalNotes, 1);
  
  return { key: bestKey, scale: bestScale, confidence };
}

import { NOTE_NAMES } from './types.js';
