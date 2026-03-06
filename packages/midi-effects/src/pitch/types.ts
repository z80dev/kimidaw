/**
 * Pitch MIDI effect types
 */

import type { ScaleType, NoteName } from "../types.js";

/** Range mode for pitch */
export type RangeMode = "up" | "down" | "alternate" | "random";

/** Pitch effect parameters */
export interface PitchParams {
  /** Lowest note to allow (0-127, -1 = off) */
  lowestNote: number;
  /** Highest note to allow (0-127, -1 = off) */
  highestNote: number;
  /** Transpose amount (-48 to +48 semitones) */
  transpose: number;
  /** Random amount (0-48 semitones) */
  random: number;
  /** Scale for quantization */
  scale: ScaleType;
  /** Scale root note */
  scaleRoot: NoteName;
  /** Enable octave range */
  octaveRangeEnabled: boolean;
  /** Octave range (+1 or +2) */
  octaveRange: 1 | 2;
  /** Range mode */
  rangeMode: RangeMode;
  /** Enable scale quantization */
  quantizeToScale: boolean;
}

/** Default pitch parameters */
export const DEFAULT_PITCH_PARAMS: PitchParams = {
  lowestNote: -1,
  highestNote: -1,
  transpose: 0,
  random: 0,
  scale: "chromatic",
  scaleRoot: "C",
  octaveRangeEnabled: false,
  octaveRange: 1,
  rangeMode: "up",
  quantizeToScale: false,
};

/** Active note with pitch modification state */
export interface PitchedNote {
  /** Original note */
  originalNote: number;
  /** Current transposed note */
  currentNote: number;
  /** Velocity */
  velocity: number;
  /** Channel */
  channel: number;
  /** Octave offset for range mode */
  octaveOffset: number;
}
