/**
 * Piano Roll Types
 */

import type { MidiClip, MidiNote } from '@daw/project-schema';

/**
 * Complete piano roll state
 */
export interface PianoRollState {
  /** Current viewport */
  viewport: PianoRollViewport;
  
  /** Current clip being edited */
  clip: MidiClip | null;
  
  /** Selected note IDs */
  selectedNoteIds: Set<string>;
  
  /** Edit configuration */
  config: PianoRollConfig;
  
  /** Current edit operation */
  editOperation: NoteInputMode;
}

/**
 * Piano roll viewport
 */
export interface PianoRollViewport {
  /** Start tick visible */
  startTick: number;
  
  /** End tick visible */
  endTick: number;
  
  /** Lowest visible pitch (MIDI note number) */
  minPitch: number;
  
  /** Highest visible pitch */
  maxPitch: number;
  
  /** Pixels per tick */
  pixelsPerTick: number;
  
  /** Pixels per semitone */
  pixelsPerSemitone: number;
}

/**
 * Piano roll configuration
 */
export interface PianoRollConfig {
  /** Show piano keys on left */
  showPianoKeys: boolean;
  
  /** Show velocity lane */
  showVelocity: boolean;
  /** Velocity lane height in pixels */
  velocityHeight: number;
  
  /** Show scale highlighting */
  showScaleHighlight: boolean;
  
  /** Root note for scale (0-11, where 0=C) */
  scaleRoot: number;
  
  /** Scale mode (major, minor, etc.) */
  scaleMode: ScaleMode;
  
  /** Show note names on keys */
  showKeyLabels: boolean;
  
  /** Snap to grid enabled */
  snapToGrid: boolean;
  
  /** Snap division (1 = quarter, 4 = 16th) */
  snapDivision: number;
  
  /** Fold to used notes only */
  foldMode: boolean;
  
  /** Drum grid mode */
  drumMode: boolean;
  
  /** Minimum zoom */
  minZoom: number;
  
  /** Maximum zoom */
  maxZoom: number;
}

/**
 * Scale mode
 */
export type ScaleMode =
  | 'chromatic'
  | 'major'
  | 'minor'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'
  | 'pentatonic-major'
  | 'pentatonic-minor'
  | 'blues';

/**
 * Note input modes
 */
export type NoteInputMode =
  | 'select'
  | 'draw'
  | 'erase'
  | 'mute'
  | 'velocity'
  | 'slice';

/**
 * Note edit data for rendering
 */
export interface NoteRenderData {
  note: MidiNote;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  isPreview: boolean;
  velocity: number;
}

/**
 * Piano key data
 */
export interface PianoKeyData {
  pitch: number;
  noteName: string;
  isBlack: boolean;
  isInScale: boolean;
  y: number;
  height: number;
}

/**
 * Grid line data
 */
export interface PianoRollGridLine {
  x?: number;
  y?: number;
  tick?: number;
  pitch?: number;
  isBar: boolean;
  isBeat: boolean;
  isScale: boolean;
}

/**
 * Scale interval patterns (semitones from root)
 */
export const SCALE_PATTERNS: Record<ScaleMode, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'pentatonic-major': [0, 2, 4, 7, 9],
  'pentatonic-minor': [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
};

/**
 * Note names
 */
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Get note name from pitch
 */
export function getNoteName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const noteIndex = pitch % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Check if pitch is in scale
 */
export function isPitchInScale(pitch: number, root: number, mode: ScaleMode): boolean {
  if (mode === 'chromatic') return true;
  
  const pattern = SCALE_PATTERNS[mode];
  const relativePitch = ((pitch % 12) - root + 12) % 12;
  return pattern.includes(relativePitch);
}

/**
 * Check if pitch is black key
 */
export function isBlackKey(pitch: number): boolean {
  const noteIndex = pitch % 12;
  return [1, 3, 6, 8, 10].includes(noteIndex);
}
