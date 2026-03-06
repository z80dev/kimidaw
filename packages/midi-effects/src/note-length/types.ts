/**
 * Note Length MIDI effect types
 */

import type { RateDivision } from "../types.js";

/** Trigger modes for note length */
export type TriggerMode = "time" | "sync" | "gate";

/** Note Length parameters */
export interface NoteLengthParams {
  /** Trigger mode */
  mode: TriggerMode;
  /** Length in milliseconds (1-1000ms) for time mode */
  timeMs: number;
  /** Length as rate division for sync mode */
  syncRate: RateDivision;
  /** Gate percentage for gate mode (0-200%) */
  gatePercent: number;
  /** Release velocity on/off */
  releaseVelocity: boolean;
}

/** Default note length parameters */
export const DEFAULT_NOTE_LENGTH_PARAMS: NoteLengthParams = {
  mode: "sync",
  timeMs: 100,
  syncRate: "1/16",
  gatePercent: 100,
  releaseVelocity: false,
};

/** Active note being held */
export interface ActiveNote {
  /** Note number */
  note: number;
  /** Original velocity */
  velocity: number;
  /** Channel */
  channel: number;
  /** Time when note was triggered */
  startTime: number;
  /** Scheduled release time */
  releaseTime: number;
  /** Whether note-off has been scheduled */
  scheduled: boolean;
}
