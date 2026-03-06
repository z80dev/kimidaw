/**
 * AI Pitch Correction Types
 */

export type PitchAlgorithm = 'monophonic' | 'polyphonic' | 'percussive';
export type CorrectionQuality = 'draft' | 'standard' | 'high' | 'ultra';

export interface PitchCorrectionConfig {
  algorithm: PitchAlgorithm;
  quality: CorrectionQuality;
  preserveFormants: boolean;
  sampleRate?: number;
  fftSize?: number;
  hopSize?: number;
}

export interface DetectedNote {
  id: string;
  startTime: number;
  duration: number;
  pitch: number; // MIDI note number
  pitchCents: number; // cents deviation from equal temperament
  confidence: number; // 0-1
  amplitude: number; // dB
  
  // Editable properties
  targetPitch?: number;
  pitchShift?: number; // semitones
  pitchDrift?: number; // cents
  formantShift?: number; // semitones
  
  // Vibrato
  vibratoRate?: number; // Hz
  vibratoDepth?: number; // cents
  vibratoDelay?: number; // seconds
  
  // Modulation
  modulationDepth?: number;
  modulationRate?: number;
  
  // Visual
  color?: string;
  selected?: boolean;
}

export interface PitchAnalysis {
  notes: DetectedNote[];
  sampleRate: number;
  duration: number;
  detectedKey?: string;
  detectedScale?: string;
  confidence: number;
  
  getNotesInRange(start: number, end: number): DetectedNote[];
  getNoteAt(time: number, pitch?: number): DetectedNote | null;
  addNote(note: Partial<DetectedNote>): DetectedNote;
  removeNote(id: string): void;
  splitNote(id: string, time: number): [DetectedNote, DetectedNote];
  mergeNotes(ids: string[]): DetectedNote;
}

export interface ScaleCorrectionOptions {
  root: string; // 'C', 'C#', 'Db', etc.
  scale: string; // 'major', 'minor', 'pentatonic', etc.
  strength: number; // 0-1, how strongly to correct
  snapToNearest: boolean;
  preserveSlides: boolean;
}

export interface CorrectionOptions {
  preserveFormants: boolean;
  preserveBreath: boolean;
  preserveSibilance: boolean;
  transitionTime: number; // ms between notes
  
  // Advanced
  formantCorrection: boolean;
  envelopeSmoothing: boolean;
  transientPreservation: boolean;
}

export interface PitchCorrector {
  analyze(audioBuffer: AudioBuffer): Promise<PitchAnalysis>;
  correctToScale(
    analysis: PitchAnalysis, 
    options: ScaleCorrectionOptions
  ): Promise<PitchAnalysis>;
  correctNote(
    analysis: PitchAnalysis,
    noteId: string,
    newPitch: number,
    options?: Partial<CorrectionOptions>
  ): Promise<PitchAnalysis>;
  quantizePitch(
    analysis: PitchAnalysis,
    gridSize: number // cents
  ): Promise<PitchAnalysis>;
  render(analysis: PitchAnalysis): Promise<AudioBuffer>;
  renderPreview(analysis: PitchAnalysis, timeRange: [number, number]): Promise<AudioBuffer>;
  getCorrectionCurve(analysis: PitchAnalysis): Float32Array;
  dispose(): Promise<void>;
}

export interface NoteEditor {
  // Selection
  selectNote(id: string): void;
  selectNotesInRange(start: number, end: number): void;
  selectAll(): void;
  deselectAll(): void;
  invertSelection(): void;
  
  // Editing
  transpose(semitones: number): void;
  quantizeTime(grid: string): void;
  quantizePitch(strength: number): void;
  setVibrato(depth: number, rate: number): void;
  removeVibrato(): void;
  flattenPitch(): void;
  setFormant(shift: number): void;
  
  // Clipboard
  copy(): void;
  cut(): void;
  paste(time?: number): void;
  duplicate(): void;
  
  // History
  undo(): void;
  redo(): void;
}

export interface Scale {
  name: string;
  intervals: number[]; // semitones from root
  degrees: string[];
}

export const SCALES: Record<string, Scale> = {
  major: {
    name: 'Major',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    degrees: ['1', '2', '3', '4', '5', '6', '7']
  },
  minor: {
    name: 'Natural Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7']
  },
  harmonicMinor: {
    name: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    degrees: ['1', '2', 'b3', '4', '5', 'b6', '7']
  },
  pentatonicMajor: {
    name: 'Major Pentatonic',
    intervals: [0, 2, 4, 7, 9],
    degrees: ['1', '2', '3', '5', '6']
  },
  pentatonicMinor: {
    name: 'Minor Pentatonic',
    intervals: [0, 3, 5, 7, 10],
    degrees: ['1', 'b3', '4', '5', 'b7']
  },
  blues: {
    name: 'Blues',
    intervals: [0, 3, 5, 6, 7, 10],
    degrees: ['1', 'b3', '4', 'b5', '5', 'b7']
  },
  chromatic: {
    name: 'Chromatic',
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    degrees: ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']
  }
};

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number, includeOctave = true): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  const noteName = NOTE_NAMES[noteIndex];
  return includeOctave ? `${noteName}${octave}` : noteName;
}

export function noteNameToMidi(noteName: string): number {
  const match = noteName.match(/^([A-G]#?b?)(-?\d+)?$/);
  if (!match) return 60;
  
  const name = match[1];
  const octave = match[2] ? parseInt(match[2]) : 4;
  
  const noteIndex = NOTE_NAMES.findIndex(n => 
    n.toLowerCase() === name.toLowerCase()
  );
  
  if (noteIndex === -1) return 60;
  
  return (octave + 1) * 12 + noteIndex;
}
