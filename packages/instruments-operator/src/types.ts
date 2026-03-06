/**
 * Operator FM Synthesizer Types
 * 
 * Type definitions for the Ableton-style Operator instrument.
 * Supports 8 operators with independent envelopes, multiple FM algorithms,
 * and comprehensive sound design capabilities.
 */

import type { PluginParameterSpec } from "@daw/plugin-api";

// =============================================================================
// Operator Configuration
// =============================================================================

/** Waveform types available per operator */
export type OperatorWaveform = "sine" | "saw" | "square" | "triangle" | "noise" | "pulse";

/** Fixed frequency mode for operators */
export type FixedFrequencyMode = "ratio" | "fixed";

/** Operator envelope configuration */
export interface OperatorEnvelope {
  /** Attack time in milliseconds */
  attack: number;
  /** Decay time in milliseconds */
  decay: number;
  /** Sustain level (0-1) */
  sustain: number;
  /** Release time in milliseconds */
  release: number;
  /** Attack curve shape (0=linear, 1=exponential) */
  attackCurve: number;
  /** Decay/Release curve shape */
  decayCurve: number;
}

/** Individual operator state */
export interface OperatorState {
  /** Whether operator is enabled */
  enabled: boolean;
  /** Frequency mode: ratio or fixed Hz */
  fixedMode: FixedFrequencyMode;
  /** Coarse frequency ratio or Hz (depending on fixedMode) */
  coarse: number;
  /** Fine frequency adjustment in cents */
  fine: number;
  /** Waveform type */
  waveform: OperatorWaveform;
  /** Output level (0-1) */
  level: number;
  /** Pan position (-1 to 1) */
  pan: number;
  /** Envelope settings */
  envelope: OperatorEnvelope;
  /** Time scaling factor for envelope */
  timeScale: number;
  /** Velocity sensitivity (0-1) */
  velocitySens: number;
  /** Key scaling (how envelope changes with note pitch) */
  keyScaling: number;
}

/** Filter types available */
export type FilterType = "lowpass" | "highpass" | "bandpass" | "notch" | "morph";

/** Filter envelope configuration */
export interface FilterEnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/** Filter state */
export interface FilterState {
  /** Filter type */
  type: FilterType;
  /** Cutoff frequency in Hz */
  frequency: number;
  /** Resonance (0-100%) */
  resonance: number;
  /** Envelope amount (-100% to 100%) */
  envAmount: number;
  /** LFO amount */
  lfoAmount: number;
  /** Key tracking (0-100%) */
  keyTrack: number;
  /** Envelope settings */
  envelope: FilterEnvelope;
}

/** LFO configuration */
export interface LFOState {
  /** Waveform type */
  waveform: "sine" | "triangle" | "square" | "saw" | "s&h" | "noise";
  /** Rate in Hz (or synced to tempo if sync enabled) */
  rate: number;
  /** Sync to tempo */
  sync: boolean;
  /** Amount for filter modulation */
  filterAmount: number;
  /** Amount for pitch modulation */
  pitchAmount: number;
  /** Amount for global level modulation */
  levelAmount: number;
  /** Phase offset (0-360 degrees) */
  phase: number;
  /** Retrigger on note on */
  retrigger: boolean;
}

/** Pitch envelope configuration */
export interface PitchEnvelopeState {
  /** Initial pitch in semitones */
  initial: number;
  /** Attack time in ms */
  attack: number;
  /** Peak pitch in semitones */
  peak: number;
  /** Decay time in ms */
  decay: number;
  /** Final pitch in semitones */
  sustain: number;
  /** Time scaling */
  timeScale: number;
}

/** Global/Oscillator section settings */
export interface OscillatorSettings {
  /** Algorithm selection (0-10) */
  algorithm: number;
  /** Feedback amount for self-modulating operators */
  feedback: number;
  /** Global transpose in semitones */
  transpose: number;
  /** Global detune in cents */
  detune: number;
  /** Spread/unison amount (0-100%) */
  spread: number;
  /** Number of unison voices (1, 2, 4) */
  unisonVoices: number;
}

/** Time/Velocity settings */
export interface TimeVelocityState {
  /** Time key scaling (-100% to 100%) */
  timeKeyScale: number;
  /** Time velocity scaling */
  timeVelScale: number;
  /** Pitch envelope velocity scaling */
  pitchVelScale: number;
}

/** Glide/Portamento settings */
export interface GlideState {
  /** Enable glide */
  enabled: boolean;
  /** Glide time in milliseconds */
  time: number;
  /** Legato mode (glide only on overlapping notes) */
  legato: boolean;
  /** Glide mode: "constant_rate" | "constant_time" */
  mode: "rate" | "time";
}

/** Routing matrix entry - which operators modulate which */
export interface RoutingEntry {
  /** Source operator index (0-7) */
  from: number;
  /** Target operator index (0-7) */
  to: number;
  /** Modulation amount (0-100%) */
  amount: number;
}

// =============================================================================
// Complete Operator State
// =============================================================================

/** Complete state for the Operator instrument */
export interface OperatorStateSnapshot {
  /** Operator states (index 0-7) */
  operators: OperatorState[];
  /** Filter section state */
  filter: FilterState;
  /** LFO state */
  lfo: LFOState;
  /** Pitch envelope state */
  pitchEnv: PitchEnvelopeState;
  /** Oscillator/global settings */
  oscillator: OscillatorSettings;
  /** Time/velocity settings */
  timeVelocity: TimeVelocityState;
  /** Glide settings */
  glide: GlideState;
  /** Master output level in dB */
  masterLevel: number;
  /** Master pan (-1 to 1) */
  masterPan: number;
  /** Monophonic/polyphonic mode */
  voiceMode: "mono" | "poly" | "unison";
  /** Number of voices in poly mode */
  polyphony: number;
  /** Custom routing matrix (optional override) */
  routing?: RoutingEntry[];
}

// =============================================================================
// FM Algorithms
// =============================================================================

/**
 * Operator FM Algorithms
 * 
 * Defines how the 8 operators are connected for frequency modulation.
 * Based on DX7-style algorithms with additional configurations.
 * 
 * Algorithm numbering follows Ableton Operator conventions:
 * 0-3: Serial chains (operators in series)
 * 4-6: Branch configurations
 * 7-9: Parallel carriers with shared modulators
 * 10: Full parallel (all carriers)
 */
export const OPERATOR_ALGORITHMS: number[][][] = [
  // Algorithm 0: 1→2→3→4→5→6→7→8 (full serial chain)
  [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
  
  // Algorithm 1: (1+2)→3→4→5→6→7→8
  [[0, 2], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
  
  // Algorithm 2: 1→(2+3)→4→5→6→7→8
  [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
  
  // Algorithm 3: 1→2→(3+4)→5→6→7→8
  [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5], [5, 6], [6, 7]],
  
  // Algorithm 4: Branching - 1→2→3, 4→5→6, 7→8 parallel
  [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7]],
  
  // Algorithm 5: Triple branch - (1→2), (3→4), (5→6), 7, 8
  [[0, 1], [2, 3], [4, 5]],
  
  // Algorithm 6: (1+2)→3, (4+5)→6, 7, 8
  [[0, 2], [1, 2], [3, 5], [4, 5]],
  
  // Algorithm 7: 1→(2+3+4), 5, 6, 7, 8
  [[0, 1], [0, 2], [0, 3]],
  
  // Algorithm 8: 1→2, (3+4+5)→6, 7, 8
  [[0, 1], [2, 5], [3, 5], [4, 5]],
  
  // Algorithm 9: (1+2)→3, 4, 5, 6, 7, 8 (classic 3-op FM)
  [[0, 2], [1, 2]],
  
  // Algorithm 10: All parallel - 1, 2, 3, 4, 5, 6, 7, 8
  [],
];

/** Get algorithm connections for given algorithm index */
export function getAlgorithmConnections(algorithmIndex: number): number[][] {
  const clampedIndex = Math.max(0, Math.min(OPERATOR_ALGORITHMS.length - 1, algorithmIndex));
  return OPERATOR_ALGORITHMS[clampedIndex] ?? [];
}

/** Get list of carriers (operators with no outgoing connections) for an algorithm */
export function getCarriers(algorithmIndex: number): number[] {
  const connections = getAlgorithmConnections(algorithmIndex);
  const hasOutput = new Set<number>();
  
  for (const [from] of connections) {
    hasOutput.add(from);
  }
  
  const carriers: number[] = [];
  for (let i = 0; i < 8; i++) {
    if (!hasOutput.has(i)) {
      carriers.push(i);
    }
  }
  return carriers;
}

// =============================================================================
// Default State
// =============================================================================

/** Create default operator state */
export function createDefaultOperatorState(index: number): OperatorState {
  const isCarrier = index >= 4; // Operators 5-8 are carriers by default
  
  return {
    enabled: index < 4, // First 4 operators enabled by default
    fixedMode: "ratio",
    coarse: isCarrier ? 1 : [1, 2, 3, 4, 5, 6, 7, 8][index] ?? 1,
    fine: 0,
    waveform: "sine",
    level: isCarrier ? 0.8 : 0.5,
    pan: 0,
    envelope: {
      attack: index < 4 ? 1 : 10,
      decay: 200,
      sustain: 0.8,
      release: 300,
      attackCurve: 0.5,
      decayCurve: 0.5,
    },
    timeScale: 1,
    velocitySens: 0.5,
    keyScaling: 0,
  };
}

/** Create default complete state */
export function createDefaultOperatorStateSnapshot(): OperatorStateSnapshot {
  return {
    operators: Array.from({ length: 8 }, (_, i) => createDefaultOperatorState(i)),
    filter: {
      type: "lowpass",
      frequency: 20000,
      resonance: 0,
      envAmount: 0,
      lfoAmount: 0,
      keyTrack: 0,
      envelope: {
        attack: 10,
        decay: 200,
        sustain: 0.5,
        release: 300,
      },
    },
    lfo: {
      waveform: "sine",
      rate: 1,
      sync: false,
      filterAmount: 0,
      pitchAmount: 0,
      levelAmount: 0,
      phase: 0,
      retrigger: true,
    },
    pitchEnv: {
      initial: 0,
      attack: 0,
      peak: 0,
      decay: 50,
      sustain: 0,
      timeScale: 1,
    },
    oscillator: {
      algorithm: 7,
      feedback: 0,
      transpose: 0,
      detune: 0,
      spread: 0,
      unisonVoices: 1,
    },
    timeVelocity: {
      timeKeyScale: 0,
      timeVelScale: 0,
      pitchVelScale: 0,
    },
    glide: {
      enabled: false,
      time: 50,
      legato: false,
      mode: "time",
    },
    masterLevel: 0,
    masterPan: 0,
    voiceMode: "poly",
    polyphony: 8,
  };
}

// =============================================================================
// Parameter Specifications
// =============================================================================

/** Generate parameter specs for all Operator parameters */
export function generateOperatorParameters(): PluginParameterSpec[] {
  const params: PluginParameterSpec[] = [];
  
  // Algorithm and global
  params.push(
    { 
      id: "algorithm", 
      name: "Algorithm", 
      kind: "enum", 
      min: 0, 
      max: 10, 
      defaultValue: 0.7,
      labels: ["Serial", "2→3", "Branch", "Branch2", "Dual", "Triple", "Triple2", "Star", "Star2", "Classic", "Parallel"]
    },
    { id: "feedback", name: "Feedback", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
    { id: "transpose", name: "Transpose", kind: "int", min: -24, max: 24, defaultValue: 0.5, unit: "st" },
    { id: "spread", name: "Spread", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
    { id: "unisonVoices", name: "Unison", kind: "enum", min: 0, max: 2, defaultValue: 0, labels: ["1", "2", "4"] },
    { id: "masterLevel", name: "Level", kind: "float", min: -96, max: 12, defaultValue: 0.75, unit: "dB" },
    { id: "masterPan", name: "Pan", kind: "float", min: -50, max: 50, defaultValue: 0.5 }
  );
  
  // Per-operator parameters
  for (let i = 0; i < 8; i++) {
    const opNum = i + 1;
    const prefix = `op${opNum}`;
    
    params.push(
      { id: `${prefix}Enabled`, name: `Op${opNum} On`, kind: "bool", min: 0, max: 1, defaultValue: i < 4 ? 1 : 0 },
      { id: `${prefix}Coarse`, name: "Coarse", kind: "float", min: 0.25, max: 16, defaultValue: i < 4 ? 0.15 + i * 0.05 : 0.08 },
      { id: `${prefix}Fine`, name: "Fine", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "cents" },
      { id: `${prefix}Fixed`, name: "Fixed Freq", kind: "bool", min: 0, max: 1, defaultValue: 0 },
      { id: `${prefix}Waveform`, name: "Waveform", kind: "enum", min: 0, max: 5, defaultValue: 0, labels: ["Sine", "Saw", "Square", "Triangle", "Noise", "Pulse"] },
      { id: `${prefix}Level`, name: "Level", kind: "float", min: 0, max: 100, defaultValue: i < 4 ? 0.5 : 0.8, unit: "%" },
      { id: `${prefix}Pan`, name: "Pan", kind: "float", min: -50, max: 50, defaultValue: 0.5 },
      { id: `${prefix}Attack`, name: "Attack", kind: "float", min: 0.1, max: 10000, defaultValue: 0.01, unit: "ms" },
      { id: `${prefix}Decay`, name: "Decay", kind: "float", min: 1, max: 10000, defaultValue: 0.2, unit: "ms" },
      { id: `${prefix}Sustain`, name: "Sustain", kind: "float", min: 0, max: 100, defaultValue: 0.8, unit: "%" },
      { id: `${prefix}Release`, name: "Release", kind: "float", min: 1, max: 30000, defaultValue: 0.3, unit: "ms" },
      { id: `${prefix}VelSens`, name: "Vel Sens", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" }
    );
  }
  
  // Filter section
  params.push(
    { id: "filterType", name: "Filter Type", kind: "enum", min: 0, max: 4, defaultValue: 0, labels: ["LP", "HP", "BP", "Notch", "Morph"] },
    { id: "filterFreq", name: "Frequency", kind: "float", min: 20, max: 20000, defaultValue: 1, unit: "Hz" },
    { id: "filterRes", name: "Resonance", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
    { id: "filterEnv", name: "Env Amount", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "%" },
    { id: "filterAttack", name: "F.Attack", kind: "float", min: 0.1, max: 10000, defaultValue: 0.01, unit: "ms" },
    { id: "filterDecay", name: "F.Decay", kind: "float", min: 1, max: 10000, defaultValue: 0.2, unit: "ms" },
    { id: "filterSustain", name: "F.Sustain", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
    { id: "filterRelease", name: "F.Release", kind: "float", min: 1, max: 30000, defaultValue: 0.3, unit: "ms" }
  );
  
  // LFO section
  params.push(
    { id: "lfoWave", name: "LFO Wave", kind: "enum", min: 0, max: 5, defaultValue: 0, labels: ["Sine", "Triangle", "Square", "Saw", "S&H", "Noise"] },
    { id: "lfoRate", name: "LFO Rate", kind: "float", min: 0.01, max: 100, defaultValue: 0.1, unit: "Hz" },
    { id: "lfoFilter", name: "LFO→Filter", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
    { id: "lfoPitch", name: "LFO→Pitch", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" }
  );
  
  // Pitch envelope
  params.push(
    { id: "pitchInitial", name: "Pitch Init", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "st" },
    { id: "pitchAttack", name: "Pitch Attack", kind: "float", min: 0, max: 10000, defaultValue: 0, unit: "ms" },
    { id: "pitchPeak", name: "Pitch Peak", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "st" },
    { id: "pitchDecay", name: "Pitch Decay", kind: "float", min: 0, max: 10000, defaultValue: 0.05, unit: "ms" }
  );
  
  // Glide
  params.push(
    { id: "glideEnabled", name: "Glide On", kind: "bool", min: 0, max: 1, defaultValue: 0 },
    { id: "glideTime", name: "Glide Time", kind: "float", min: 0, max: 5000, defaultValue: 0.01, unit: "ms" }
  );
  
  return params;
}
