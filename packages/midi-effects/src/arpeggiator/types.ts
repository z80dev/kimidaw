/**
 * Arpeggiator types and constants
 */

import type { RateDivision } from "../types.js";

/** Arpeggiator pattern styles */
export type ArpStyle =
  | "up"
  | "down"
  | "up-down"
  | "down-up"
  | "up-and-down"
  | "down-and-up"
  | "converge"
  | "diverge"
  | "converge-and-diverge"
  | "pinky-up"
  | "pinky-up-down"
  | "thumb-up"
  | "thumb-up-down"
  | "random"
  | "random-other"
  | "random-once"
  | "order-played";

/** Velocity modes for arpeggiator output */
export type VelocityMode =
  | "original"
  | "target"
  | "target-plus-original"
  | "target-plus-original-up"
  | "target-plus-original-down"
  | "random";

/** Retrigger modes */
export type RetriggerMode = "off" | "note" | "beat" | "user";

/** Distance style for octave range */
export type DistanceStyle = "standard" | "plus1" | "plus2" | "plus3";

/** Arpeggiator parameters interface */
export interface ArpeggiatorParams {
  /** Arpeggiator style */
  style: ArpStyle;
  /** Rate division */
  rate: RateDivision;
  /** Gate length as percentage (0-200%) */
  gate: number;
  /** Shuffle amount (0-100%) */
  shuffle: number;
  /** Pattern offset in steps */
  offset: number;
  /** Hold notes after key release */
  hold: boolean;
  /** Retrigger mode */
  retrigger: RetriggerMode;
  /** Velocity mode */
  velocityMode: VelocityMode;
  /** Target velocity for non-original modes (0-127) */
  targetVelocity: number;
  /** Number of steps in pattern (1-32) */
  steps: number;
  /** Octave range (1-4) */
  distance: number;
  /** Distance style for octave jumps */
  distanceStyle: DistanceStyle;
  /** Repeat each note this many times (1-8) */
  repeat: number;
  /** Transpose each repeat by this many semitones */
  transpose: number;
  /** Velocity decay per step (0-100%) */
  velocityDecay: number;
  /** Enable step sequencer for individual step control */
  stepSequencerEnabled: boolean;
  /** Per-step velocities (0-127, -1 = use calculated) */
  stepVelocities: number[];
  /** Per-step gate lengths (0-200%, -1 = use global) */
  stepGates: number[];
  /** Per-step transposes (semitones) */
  stepTransposes: number[];
  /** Per-step on/off state */
  stepEnabled: boolean[];
  /** Swing mode: straight or triplet feel */
  swing: number;
}

/** Default arpeggiator parameters */
export const DEFAULT_ARPEGGIATOR_PARAMS: ArpeggiatorParams = {
  style: "up",
  rate: "1/16",
  gate: 50,
  shuffle: 0,
  offset: 0,
  hold: false,
  retrigger: "off",
  velocityMode: "original",
  targetVelocity: 100,
  steps: 4,
  distance: 1,
  distanceStyle: "standard",
  repeat: 1,
  transpose: 0,
  velocityDecay: 0,
  stepSequencerEnabled: false,
  stepVelocities: Array(32).fill(-1),
  stepGates: Array(32).fill(-1),
  stepTransposes: Array(32).fill(0),
  stepEnabled: Array(32).fill(true),
  swing: 0,
};

/** Arpeggiator step data */
export interface ArpStep {
  /** Step index */
  index: number;
  /** Note to play (MIDI note number) */
  note: number;
  /** Velocity */
  velocity: number;
  /** Gate length in samples */
  gateSamples: number;
  /** Transpose offset */
  transpose: number;
  /** Whether step is enabled */
  enabled: boolean;
  /** Source note index from held notes */
  sourceNoteIndex: number;
  /** Octave offset */
  octaveOffset: number;
}

/** Internal state for arpeggiator */
export interface ArpeggiatorState {
  /** Currently held notes */
  heldNotes: Map<number, { velocity: number; time: number; order: number }>;
  /** Notes being played by arpeggiator */
  playingNotes: Map<number, { startTime: number; duration: number }>;
  /** Current step in pattern */
  currentStep: number;
  /** Direction for up-down patterns (1 or -1) */
  direction: number;
  /** Time of last step */
  lastStepTime: number;
  /** Order counter for order-played mode */
  orderCounter: number;
  /** Random seed for consistent random patterns */
  randomSeed: number;
  /** Current random state */
  randomState: number;
  /** Whether arpeggiator is running */
  isRunning: boolean;
  /** Next scheduled step time */
  nextStepTime: number;
}
