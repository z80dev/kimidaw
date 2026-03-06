/**
 * Audio-to-MIDI conversion types
 * Based on Ableton's audio-to-MIDI features
 */

export type ConversionMode = 'drums' | 'melody' | 'harmony';

export interface ConversionOptions {
  mode: ConversionMode;
  sensitivity: number; // 0-100, affects onset detection threshold
  minDurationMs: number; // minimum note duration
  maxPolyphony: number; // for harmony mode
  velocitySensitive: boolean;
  quantizeToGrid: boolean;
  gridDivision: number; // PPQ division (e.g., 960 = quarter note)
}

export interface DetectedNote {
  startTime: number; // in seconds
  duration: number; // in seconds
  midiNote: number; // 0-127
  velocity: number; // 0-127
  confidence: number; // 0-1
}

export interface DetectedDrumHit {
  time: number; // in seconds
  drumClass: DrumClass;
  confidence: number;
  velocity: number;
}

export type DrumClass = 
  | 'kick' 
  | 'snare' 
  | 'hihat-closed' 
  | 'hihat-open' 
  | 'tom-low' 
  | 'tom-mid' 
  | 'tom-high' 
  | 'crash' 
  | 'ride' 
  | 'clap' 
  | 'rim' 
  | 'unknown';

export interface DetectedChord {
  time: number;
  duration: number;
  rootNote: number;
  chordType: ChordType;
  notes: number[]; // MIDI note numbers
  confidence: number;
}

export type ChordType =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'sus2'
  | 'sus4'
  | 'major7'
  | 'minor7'
  | 'dominant7'
  | 'minor7b5'
  | 'unknown';

export interface ConversionResult {
  mode: ConversionMode;
  notes: DetectedNote[];
  tempo: number; // detected tempo (if applicable)
  sampleRate: number;
  duration: number;
  confidence: number;
}

export interface AnalysisWindow {
  startSample: number;
  data: Float32Array;
}

export interface OnsetEvent {
  time: number;
  strength: number;
}
