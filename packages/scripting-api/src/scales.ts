/**
 * Scale and Chord Utilities
 * 
 * Musical theory helpers for generating notes, scales, and chords
 * All functions are pure and deterministic
 */

import type { Scale, Chord, ScaleMode } from './types';

// ============================================================================
// Constants
// ============================================================================

/** Note names in chromatic order */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Alternative enharmonic spellings */
const ENHARMONIC_MAP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'C#': 'C#', 'D#': 'D#', 'F#': 'F#', 'G#': 'G#', 'A#': 'A#',
};

/** Scale interval definitions (semitones from root) */
const SCALE_INTERVALS: Record<ScaleMode, number[]> = {
  'major': [0, 2, 4, 5, 7, 9, 11],
  'minor': [0, 2, 3, 5, 7, 8, 10],
  'natural minor': [0, 2, 3, 5, 7, 8, 10],
  'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic minor': [0, 2, 3, 5, 7, 9, 11],
  'dorian': [0, 2, 3, 5, 7, 9, 10],
  'phrygian': [0, 1, 3, 5, 7, 8, 10],
  'lydian': [0, 2, 4, 6, 7, 9, 11],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'locrian': [0, 1, 3, 5, 6, 8, 10],
  'pentatonic major': [0, 2, 4, 7, 9],
  'pentatonic minor': [0, 3, 5, 7, 10],
  'blues': [0, 3, 5, 6, 7, 10],
  'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  'whole tone': [0, 2, 4, 6, 8, 10],
  'diminished': [0, 2, 3, 5, 6, 8, 9, 11],
};

/** Chord interval definitions */
const CHORD_INTERVALS: Record<string, number[]> = {
  // Triads
  '': [0, 4, 7],
  'maj': [0, 4, 7],
  'min': [0, 3, 7],
  'm': [0, 3, 7],
  'dim': [0, 3, 6],
  'aug': [0, 4, 8],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  // Sevenths
  '7': [0, 4, 7, 10],
  'maj7': [0, 4, 7, 11],
  'm7': [0, 3, 7, 10],
  'min7': [0, 3, 7, 10],
  'dim7': [0, 3, 6, 9],
  'm7b5': [0, 3, 6, 10],
  'maj7b5': [0, 4, 6, 11],
  '7sus4': [0, 5, 7, 10],
  // Extensions
  '9': [0, 4, 7, 10, 14],
  'maj9': [0, 4, 7, 11, 14],
  'm9': [0, 3, 7, 10, 14],
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 17, 21],
  // Sixths
  '6': [0, 4, 7, 9],
  'm6': [0, 3, 7, 9],
  // Add
  'add9': [0, 4, 7, 14],
  'madd9': [0, 3, 7, 14],
};

// ============================================================================
// Note Utilities
// ============================================================================

/**
 * Parse a note name to MIDI note number
 * Supports formats: "C4", "F#3", "Bb-1", etc.
 */
export function noteToMidi(note: string): number {
  const match = note.match(/^([A-G][#b]?)(-?\d+)$/i);
  if (!match) {
    throw new Error(`Invalid note format: ${note}. Expected format like "C4" or "F#3"`);
  }
  
  const [, noteName, octaveStr] = match;
  let normalizedName = noteName.charAt(0).toUpperCase() + noteName.slice(1).toLowerCase();
  
  // Handle enharmonics
  if (ENHARMONIC_MAP[normalizedName]) {
    normalizedName = ENHARMONIC_MAP[normalizedName];
  }
  
  const noteIndex = NOTE_NAMES.indexOf(normalizedName);
  if (noteIndex === -1) {
    throw new Error(`Invalid note name: ${noteName}`);
  }
  
  const octave = parseInt(octaveStr, 10);
  // C4 = 60 (middle C)
  return (octave + 1) * 12 + noteIndex;
}

/**
 * Convert MIDI note number to note name
 */
export function midiToNote(midi: number, useSharps = true): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  const name = NOTE_NAMES[noteIndex];
  return `${name}${octave}`;
}

/**
 * Get frequency in Hz for a MIDI note number
 */
export function midiToFrequency(midi: number): number {
  // A4 = 69 = 440Hz
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Get MIDI note from frequency
 */
export function frequencyToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

// ============================================================================
// Scale Functions
// ============================================================================

/**
 * Create a scale from root note and mode
 */
export function scale(root: string, mode: ScaleMode | string): Scale {
  const rootMidi = noteToMidi(root + '4'); // Use octave 4 for root calculation
  const rootNoteIndex = rootMidi % 12;
  
  const intervals = SCALE_INTERVALS[mode as ScaleMode];
  if (!intervals) {
    throw new Error(`Unknown scale mode: ${mode}. Known modes: ${Object.keys(SCALE_INTERVALS).join(', ')}`);
  }
  
  // Calculate notes for one octave starting from C4 range
  const baseC = Math.floor(rootMidi / 12) * 12;
  const notes = intervals.map(interval => baseC + ((rootNoteIndex + interval) % 12));
  
  return {
    root,
    mode,
    notes,
    intervals: [...intervals],
  };
}

/**
 * Get scale degree note (1-indexed)
 * degree 1 = tonic, 2 = supertonic, etc.
 */
export function scaleDegree(scale: Scale, degree: number, octave = 0): number {
  const normalizedDegree = ((degree - 1) % scale.intervals.length) + 1;
  const intervalIndex = normalizedDegree - 1;
  const interval = scale.intervals[intervalIndex];
  
  const rootMidi = noteToMidi(scale.root + '4');
  const rootNoteIndex = rootMidi % 12;
  const baseC = Math.floor((rootMidi + octave * 12) / 12) * 12;
  
  return baseC + ((rootNoteIndex + interval) % 12);
}

/**
 * Check if a MIDI note is in the scale
 */
export function isInScale(midi: number, scale: Scale): boolean {
  const normalized = midi % 12;
  return scale.notes.some(note => note % 12 === normalized);
}

/**
 * Quantize a MIDI note to the nearest scale note
 */
export function quantizeToScale(midi: number, scale: Scale): number {
  const octave = Math.floor(midi / 12);
  const normalized = midi % 12;
  
  // Find closest scale note
  let closest = scale.notes[0];
  let minDistance = Math.abs(normalized - (closest % 12));
  
  for (const note of scale.notes) {
    const noteNormalized = note % 12;
    const distance = Math.abs(normalized - noteNormalized);
    if (distance < minDistance) {
      minDistance = distance;
      closest = note;
    }
  }
  
  return octave * 12 + (closest % 12);
}

/**
 * Get all scale notes across octaves
 */
export function scaleRange(scale: Scale, startOctave: number, endOctave: number): number[] {
  const notes: number[] = [];
  for (let oct = startOctave; oct <= endOctave; oct++) {
    for (const interval of scale.intervals) {
      const rootMidi = noteToMidi(scale.root + '4');
      const rootNoteIndex = rootMidi % 12;
      const baseC = (oct + 1) * 12;
      notes.push(baseC + ((rootNoteIndex + interval) % 12));
    }
  }
  return notes;
}

// ============================================================================
// Chord Functions
// ============================================================================

/**
 * Parse a chord symbol and return chord notes
 * Supports: "C", "Am", "F#maj7", "G7", "Dm9", etc.
 */
export function chord(symbol: string): number[] {
  // Parse chord symbol: root + quality
  // Root can be: C, C#, Db, D, D#, Eb, etc.
  // Quality can be: maj, min/m, dim, aug, 7, maj7, m7, dim7, etc.
  
  const match = symbol.match(/^([A-G][#b]?)(.*)$/i);
  if (!match) {
    throw new Error(`Invalid chord symbol: ${symbol}`);
  }
  
  const [, rootNote, quality] = match;
  let normalizedRoot = rootNote.charAt(0).toUpperCase() + rootNote.slice(1).toLowerCase();
  
  // Handle enharmonics
  if (ENHARMONIC_MAP[normalizedRoot]) {
    normalizedRoot = ENHARMONIC_MAP[normalizedRoot];
  }
  
  const rootIndex = NOTE_NAMES.indexOf(normalizedRoot);
  if (rootIndex === -1) {
    throw new Error(`Invalid root note: ${rootNote}`);
  }
  
  // Normalize quality
  const normalizedQuality = quality.toLowerCase().replace(/\s+/g, '');
  const intervals = CHORD_INTERVALS[normalizedQuality] || CHORD_INTERVALS[''];
  
  // C4 as base for chord calculation
  const baseC = 60; 
  const rootMidi = baseC - (baseC % 12) + rootIndex;
  
  return intervals.map(interval => rootMidi + interval);
}

/**
 * Create a chord from root MIDI note and intervals
 */
export function chordFromIntervals(rootMidi: number, intervals: number[]): number[] {
  return intervals.map(interval => rootMidi + interval);
}

/**
 * Invert a chord (move bottom note up an octave)
 * @param inversion - Number of times to invert (0 = root position, 1 = first inversion, etc.)
 */
export function invertChord(chordNotes: number[], inversion: number): number[] {
  const result = [...chordNotes].sort((a, b) => a - b);
  const inv = ((inversion % result.length) + result.length) % result.length;
  
  for (let i = 0; i < inv; i++) {
    result[i] += 12;
  }
  
  return result.sort((a, b) => a - b);
}

/**
 * Voice lead two chords (minimize movement between them)
 */
export function voiceLead(fromChord: number[], toChord: number[], maxRange: number = 12): number[] {
  const sortedFrom = [...fromChord].sort((a, b) => a - b);
  const possibilities: number[][] = [];
  
  // Generate all octavations of toChord
  for (let octaveOffset = -24; octaveOffset <= 24; octaveOffset += 12) {
    const candidate = toChord.map(n => n + octaveOffset).sort((a, b) => a - b);
    
    // Calculate total voice leading distance
    let distance = 0;
    for (let i = 0; i < Math.min(sortedFrom.length, candidate.length); i++) {
      distance += Math.abs(sortedFrom[i] - candidate[i]);
    }
    
    possibilities.push({ notes: candidate, distance });
  }
  
  // Return the voicing with minimum distance
  possibilities.sort((a, b) => a.distance - b.distance);
  return possibilities[0]?.notes || toChord;
}

/**
 * Create a chord from scale degree
 */
export function chordFromDegree(
  scale: Scale, 
  degree: number, 
  quality: string = '',
  octave = 0
): number[] {
  const root = scaleDegree(scale, degree, octave);
  const intervals = CHORD_INTERVALS[quality] || CHORD_INTERVALS[''];
  return chordFromIntervals(root, intervals);
}

// ============================================================================
// Utility Functions
// ============================================================================

/** Get all available scale modes */
export function getAvailableScales(): string[] {
  return Object.keys(SCALE_INTERVALS);
}

/** Get all available chord qualities */
export function getAvailableChords(): string[] {
  return Object.keys(CHORD_INTERVALS);
}

/** Get interval name between two notes */
export function getIntervalName(semitones: number): string {
  const normalized = ((semitones % 12) + 12) % 12;
  const names: Record<number, string> = {
    0: 'unison', 1: 'minor 2nd', 2: 'major 2nd', 3: 'minor 3rd',
    4: 'major 3rd', 5: 'perfect 4th', 6: 'tritone', 7: 'perfect 5th',
    8: 'minor 6th', 9: 'major 6th', 10: 'minor 7th', 11: 'major 7th',
  };
  return names[normalized] || `${semitones} semitones`;
}
