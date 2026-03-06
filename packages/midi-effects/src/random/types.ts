/**
 * Random MIDI effect types
 */

import type { ScaleType, NoteName } from "../types.js";

/** Sign mode for randomization */
export type SignMode = "add" | "sub" | "bi";

/** Random effect parameters */
export interface RandomParams {
  /** Chance of randomization (0-100%) */
  chance: number;
  /** Number of possible random values (1-24) */
  choices: number;
  /** Scale for quantization */
  scale: ScaleType;
  /** Scale root */
  scaleRoot: NoteName;
  /** Sign mode for random values */
  sign: SignMode;
  /** Enable scale-based randomization */
  scaleRandomize: boolean;
}

/** Default random parameters */
export const DEFAULT_RANDOM_PARAMS: RandomParams = {
  chance: 50,
  choices: 12,
  scale: "chromatic",
  scaleRoot: "C",
  sign: "bi",
  scaleRandomize: false,
};

/** Active note with randomization state */
export interface RandomizedNote {
  /** Original note */
  originalNote: number;
  /** Randomized note */
  randomizedNote: number;
  /** Velocity */
  velocity: number;
  /** Channel */
  channel: number;
  /** Random value applied */
  randomValue: number;
}
