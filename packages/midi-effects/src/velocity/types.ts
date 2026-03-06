/**
 * Velocity MIDI effect types
 */

/** Velocity processing modes */
export type VelocityMode = "clip" | "gate" | "fixed" | "relative" | "compand";

/** Velocity effect parameters */
export interface VelocityParams {
  /** Processing mode */
  mode: VelocityMode;
  /** Drive amount (-128 to +127) */
  drive: number;
  /** Compand curve (-100 to +100, negative=compress, positive=expand) */
  compand: number;
  /** Random amount (0-127) */
  random: number;
  /** Output low (0-127) */
  outLow: number;
  /** Output high (0-127) */
  outHigh: number;
  /** Range low - operate on notes above this (0-127) */
  rangeLow: number;
  /** Range high - operate on notes below this (0-127) */
  rangeHigh: number;
}

/** Default velocity parameters */
export const DEFAULT_VELOCITY_PARAMS: VelocityParams = {
  mode: "relative",
  drive: 0,
  compand: 0,
  random: 0,
  outLow: 0,
  outHigh: 127,
  rangeLow: 0,
  rangeHigh: 127,
};

/** Processed velocity info */
export interface VelocityInfo {
  /** Original velocity */
  original: number;
  /** Processed velocity */
  processed: number;
  /** Whether note was in range */
  inRange: boolean;
}
