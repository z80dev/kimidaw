/**
 * Scale MIDI effect types
 */

import type { ScaleType, NoteName } from "../types.js";

/** Scale effect parameters */
export interface ScaleParams {
  /** Root note of scale */
  base: NoteName;
  /** Scale type */
  scale: ScaleType;
  /** Transpose output (-12 to +12) */
  transpose: number;
  /** Enable octave range */
  octaveRangeEnabled: boolean;
  /** Octave range (+1 or +2) */
  octaveRange: 1 | 2;
  /** Fold notes into range instead of filtering */
  fold: boolean;
}

/** Default scale parameters */
export const DEFAULT_SCALE_PARAMS: ScaleParams = {
  base: "C",
  scale: "major",
  transpose: 0,
  octaveRangeEnabled: false,
  octaveRange: 1,
  fold: false,
};

/** Processed note info */
export interface ScaleNoteInfo {
  /** Original note */
  originalNote: number;
  /** Quantized note */
  quantizedNote: number;
  /** Whether note was in scale */
  wasInScale: boolean;
  /** Scale degree (0-6 for diatonic scales) */
  scaleDegree: number;
}
