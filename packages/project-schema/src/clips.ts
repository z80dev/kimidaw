/**
 * Clip type definitions for the DAW
 * 
 * Implements sections 7.3 and 7.4 of the engineering spec
 */

import type { LoopSpec } from './timing.js';

// ==================== Fade Curves ====================

/** Fade curve types */
export type FadeCurve = 
  | 'linear'
  | 'equal-power'
  | 'exponential'
  | 'logarithmic'
  | 's-curve';

/** Fade configuration for clips */
export interface FadeConfig {
  inCurve: FadeCurve;
  outCurve: FadeCurve;
  inSamples: number;
  outSamples: number;
}

// ==================== Warp/Stretch ====================

/** Warp marker for time-stretching */
export interface WarpMarker {
  sourceSample: number;
  targetTick: number;
}

/** Warp specification for audio clips */
export interface WarpSpec {
  enabled: boolean;
  markers: WarpMarker[];
  originBpm?: number;
  originalSampleRate: number;
}

/** Stretch quality settings */
export type StretchQuality = 'draft' | 'good' | 'best';

// ==================== Audio Clip ====================

/** Audio clip model */
export interface AudioClip {
  id: string;
  name?: string;
  color?: string;
  
  // Source reference
  assetId: string;
  
  // Position on track
  lane: number; // Comp lane index, 0 = main
  startTick: number;
  endTick: number;
  
  // Source region
  sourceStartSample: number;
  sourceEndSample: number;
  
  // Pitch/time
  gainDb: number;
  transposeSemitones: number;
  fineTuneCents: number;
  reverse: boolean;
  
  // Fades
  fades: FadeConfig;
  
  // Warp/time-stretch
  warp?: WarpSpec;
  stretchQuality: StretchQuality;
  
  // Metadata
  transientMarkers?: number[]; // Sample positions
  beatGrid?: BeatGridMarker[];
  
  // Take info for recording
  takeIndex?: number;
  isComped: boolean;
  
  // Gain envelope (automation-like)
  gainEnvelope?: GainEnvelopePoint[];
}

/** Beat grid marker for warping */
export interface BeatGridMarker {
  samplePosition: number;
  beatPosition: number; // In beats from clip start
}

/** Gain envelope point */
export interface GainEnvelopePoint {
  tick: number;
  gainDb: number;
  curve: 'linear' | 'bezier';
}

// ==================== MIDI Events ====================

/** MIDI note event */
export interface MidiNote {
  id: string;
  note: number; // 0-127
  velocity: number; // 0-127
  startTick: number;
  durationTicks: number;
  
  // MPE per-note expression
  pitchOffset?: number; // -8192 to 8191 (14-bit)
  timbre?: number; // 0-127 (CC74)
  pressure?: number; // 0-127
}

/** MIDI CC event */
export interface MidiCCEvent {
  id: string;
  controller: number; // 0-127
  value: number; // 0-127
  tick: number;
  
  // For continuous curves
  curve?: 'step' | 'linear' | 'bezier';
}

/** Pitch bend event */
export interface PitchBendEvent {
  id: string;
  value: number; // -8192 to 8191 (14-bit, 0 = center)
  tick: number;
}

/** Channel pressure (aftertouch) event */
export interface ChannelPressureEvent {
  id: string;
  pressure: number; // 0-127
  tick: number;
}

/** Polyphonic aftertouch event */
export interface PolyAftertouchEvent {
  id: string;
  note: number; // 0-127
  pressure: number; // 0-127
  tick: number;
}

/** Program change event */
export interface ProgramChangeEvent {
  id: string;
  program: number; // 0-127
  tick: number;
}

/** MPE per-note data (for MPE-enabled tracks) */
export interface MpeLaneData {
  noteId: string;
  pitchBend: PitchBendEvent[];
  timbre: MidiCCEvent[]; // CC74
  pressure: PolyAftertouchEvent[];
}

// ==================== Scale/Key ====================

/** Scale hint for clip display/editing */
export interface ScaleHint {
  root: number; // 0-11 (C=0)
  mode: ScaleMode;
  enabled: boolean;
}

/** Scale modes */
export type ScaleMode =
  | 'major'
  | 'minor'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'locrian'
  | 'harmonic-minor'
  | 'melodic-minor'
  | 'pentatonic-major'
  | 'pentatonic-minor'
  | 'blues'
  | 'chromatic';

/** Scale definitions (intervals in semitones) */
export const SCALE_INTERVALS: Record<ScaleMode, number[]> = {
  'major': [0, 2, 4, 5, 7, 9, 11],
  'minor': [0, 2, 3, 5, 7, 8, 10],
  'dorian': [0, 2, 3, 5, 7, 9, 10],
  'phrygian': [0, 1, 3, 5, 7, 8, 10],
  'lydian': [0, 2, 4, 6, 7, 9, 11],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'locrian': [0, 1, 3, 5, 6, 8, 10],
  'harmonic-minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic-minor': [0, 2, 3, 5, 7, 9, 11],
  'pentatonic-major': [0, 2, 4, 7, 9],
  'pentatonic-minor': [0, 3, 5, 7, 10],
  'blues': [0, 3, 5, 6, 7, 10],
  'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// ==================== MIDI Clip ====================

/** MIDI clip model */
export interface MidiClip {
  id: string;
  name?: string;
  color?: string;
  
  // Position (these are for the clip definition, may differ from track placement)
  startTick: number;
  endTick: number;
  
  // Loop configuration
  loop: LoopSpec | null;
  
  // MIDI events
  notes: MidiNote[];
  cc: MidiCCEvent[];
  pitchBend: PitchBendEvent[];
  channelPressure: ChannelPressureEvent[];
  polyAftertouch: PolyAftertouchEvent[];
  programChanges: ProgramChangeEvent[];
  
  // MPE data per-note
  mpe?: MpeLaneData[];
  
  // Display/editing hints
  scaleHint?: ScaleHint;
  
  // Generation metadata (if script-generated)
  generated?: {
    scriptId: string;
    hash: string;
    seed: string;
    generatedAt: number;
  };
}

// ==================== Clip Operations ====================

/** Calculate clip duration in ticks */
export function getClipDuration(clip: AudioClip | MidiClip): number {
  return clip.endTick - clip.startTick;
}

/** Get the looped duration accounting for loop settings */
export function getLoopedDuration(clip: MidiClip): number {
  if (!clip.loop?.enabled) {
    return getClipDuration(clip);
  }
  
  const loopDuration = clip.loop.endTick - clip.loop.startTick;
  return Math.max(loopDuration, getClipDuration(clip));
}

/** Check if a MIDI note is within a given time range */
export function noteOverlapsRange(
  note: MidiNote,
  startTick: number,
  endTick: number
): boolean {
  const noteStart = note.startTick;
  const noteEnd = note.startTick + note.durationTicks;
  return noteStart < endTick && noteEnd > startTick;
}

/** Quantize a note to a grid */
export function quantizeNote(
  note: MidiNote,
  gridTicks: number,
  strength: number = 1.0,
  swing: number = 0.0
): MidiNote {
  const originalStart = note.startTick;
  
  // Base quantization
  const gridPosition = Math.round(originalStart / gridTicks);
  let quantizedStart = gridPosition * gridTicks;
  
  // Apply swing to off-beats
  if (swing > 0 && gridPosition % 2 === 1) {
    quantizedStart += Math.floor(gridTicks * swing);
  }
  
  // Apply strength (blend between original and quantized)
  const finalStart = Math.round(
    originalStart * (1 - strength) + quantizedStart * strength
  );
  
  return {
    ...note,
    startTick: finalStart,
  };
}

/** Split a MIDI note at a given tick position */
export function splitNote(
  note: MidiNote,
  splitTick: number
): [MidiNote, MidiNote] | null {
  const noteEnd = note.startTick + note.durationTicks;
  
  // Check if split point is within the note
  if (splitTick <= note.startTick || splitTick >= noteEnd) {
    return null;
  }
  
  const firstDuration = splitTick - note.startTick;
  const secondDuration = noteEnd - splitTick;
  
  const first: MidiNote = {
    ...note,
    id: `${note.id}-a`,
    durationTicks: firstDuration,
  };
  
  const second: MidiNote = {
    ...note,
    id: `${note.id}-b`,
    startTick: splitTick,
    durationTicks: secondDuration,
  };
  
  return [first, second];
}

/** Transpose a MIDI note */
export function transposeNote(note: MidiNote, semitones: number): MidiNote {
  return {
    ...note,
    note: Math.max(0, Math.min(127, note.note + semitones)),
  };
}

/** Get notes within a time range */
export function getNotesInRange(
  clip: MidiClip,
  startTick: number,
  endTick: number
): MidiNote[] {
  return clip.notes.filter((note) =>
    noteOverlapsRange(note, startTick, endTick)
  );
}

/** Create a new empty MIDI clip */
export function createMidiClip(
  id: string,
  startTick: number,
  durationTicks: number,
  options?: {
    name?: string;
    color?: string;
    loop?: LoopSpec;
  }
): MidiClip {
  return {
    id,
    name: options?.name,
    color: options?.color,
    startTick,
    endTick: startTick + durationTicks,
    loop: options?.loop ?? null,
    notes: [],
    cc: [],
    pitchBend: [],
    channelPressure: [],
    polyAftertouch: [],
    programChanges: [],
    mpe: [],
  };
}

/** Create a new empty audio clip */
export function createAudioClip(
  id: string,
  assetId: string,
  startTick: number,
  durationTicks: number,
  options?: {
    name?: string;
    color?: string;
    lane?: number;
    gainDb?: number;
  }
): AudioClip {
  return {
    id,
    name: options?.name,
    color: options?.color,
    assetId,
    lane: options?.lane ?? 0,
    startTick,
    endTick: startTick + durationTicks,
    sourceStartSample: 0,
    sourceEndSample: 0,
    gainDb: options?.gainDb ?? 0,
    transposeSemitones: 0,
    fineTuneCents: 0,
    reverse: false,
    fades: {
      inCurve: 'linear',
      outCurve: 'linear',
      inSamples: 0,
      outSamples: 0,
    },
    stretchQuality: 'good',
    isComped: false,
  };
}

/** Check if note is in scale */
export function isNoteInScale(note: number, scale: ScaleHint): boolean {
  const intervals = SCALE_INTERVALS[scale.mode];
  const noteInOctave = note % 12;
  const rootInOctave = scale.root % 12;
  
  // Check if the note's offset from root is in the scale
  const offset = (noteInOctave - rootInOctave + 12) % 12;
  return intervals.includes(offset);
}

/** Snap note to nearest scale note */
export function snapToScale(note: number, scale: ScaleHint): number {
  if (isNoteInScale(note, scale)) {
    return note;
  }
  
  const intervals = SCALE_INTERVALS[scale.mode];
  const octave = Math.floor(note / 12);
  const noteInOctave = note % 12;
  const rootInOctave = scale.root % 12;
  
  // Find closest scale note
  let closestNote = note;
  let closestDistance = Infinity;
  
  for (const interval of intervals) {
    const scaleNoteInOctave = (rootInOctave + interval) % 12;
    const distance = Math.abs(noteInOctave - scaleNoteInOctave);
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestNote = octave * 12 + scaleNoteInOctave;
    } else if (distance === closestDistance && scaleNoteInOctave < (closestNote % 12)) {
      // Prefer lower note on tie
      closestNote = octave * 12 + scaleNoteInOctave;
    }
  }
  
  return closestNote;
}
