/**
 * Analog Subtractive Synthesizer Types
 * 
 * Type definitions for the Ableton-style Analog instrument.
 * Classic subtractive synthesis with dual oscillators, sub, noise,
 * dual filters, and comprehensive modulation.
 */

import type { PluginParameterSpec } from "@daw/plugin-api";

// =============================================================================
// Oscillator Types
// =============================================================================

/** Waveform types for main oscillators */
export type AnalogWaveform = "sine" | "triangle" | "sawtooth" | "pulse" | "square";

/** Noise types */
export type NoiseType = "white" | "pink" | "red" | "blue";

/** Sub oscillator octave settings */
export type SubOctave = -2 | -1;

// =============================================================================
// Oscillator Configuration
// =============================================================================

/** Main oscillator configuration */
export interface OscillatorConfig {
  /** Whether oscillator is enabled */
  enabled: boolean;
  /** Waveform type */
  waveform: AnalogWaveform;
  /** Semitone offset (-24 to +24) */
  pitch: number;
  /** Fine detune in cents (-100 to +100) */
  detune: number;
  /** Output level (0-1) */
  level: number;
  /** Pulse width for pulse wave (0-1) */
  pulseWidth: number;
  /** Enable hard sync from oscillator 1 */
  hardSync: boolean;
  /** Shape modulation amount (for certain waveforms) */
  shapeMod: number;
}

/** Sub oscillator configuration */
export interface SubOscillatorConfig {
  /** Whether sub oscillator is enabled */
  enabled: boolean;
  /** Octave offset */
  octave: SubOctave;
  /** Output level (0-1) */
  level: number;
  /** Tone/timbre control (0-1) */
  tone: number;
}

/** Noise generator configuration */
export interface NoiseConfig {
  /** Whether noise is enabled */
  enabled: boolean;
  /** Noise color/type */
  type: NoiseType;
  /** Output level (0-1) */
  level: number;
}

// =============================================================================
// Filter Configuration
// =============================================================================

/** Filter routing modes */
export type FilterRouting = "series" | "parallel";

/** Filter types */
export type AnalogFilterType = "lowpass" | "highpass" | "bandpass" | "notch" | "formant";

/** Filter slope options */
export type FilterSlope = 12 | 24;

/** Individual filter configuration */
export interface FilterConfig {
  /** Filter type */
  type: AnalogFilterType;
  /** Filter slope in dB/octave */
  slope: FilterSlope;
  /** Cutoff frequency in Hz */
  frequency: number;
  /** Resonance/boost (0-100%) */
  resonance: number;
  /** Drive/saturation amount (0-100%) */
  drive: number;
}

/** Filter envelope configuration */
export interface FilterEnvelopeConfig {
  /** Attack time in ms */
  attack: number;
  /** Decay time in ms */
  decay: number;
  /** Sustain level (0-1) */
  sustain: number;
  /** Release time in ms */
  release: number;
}

/** Filter modulation configuration */
export interface FilterModulation {
  /** Envelope amount (-100% to 100%) */
  envAmount: number;
  /** LFO amount */
  lfoAmount: number;
  /** Key tracking (0-100%) */
  keyTrack: number;
}

// =============================================================================
// Envelope Configuration
// =============================================================================

/** Amp envelope configuration */
export interface AmpEnvelopeConfig {
  /** Attack time in ms */
  attack: number;
  /** Decay time in ms */
  decay: number;
  /** Sustain level (0-1) */
  sustain: number;
  /** Release time in ms */
  release: number;
  /** Attack curve (0=linear, 1=exponential) */
  attackCurve: number;
}

/** Modulation envelope configuration */
export interface ModEnvelopeConfig {
  /** Attack time in ms */
  attack: number;
  /** Decay time in ms */
  decay: number;
  /** Sustain level (0-1) */
  sustain: number;
  /** Release time in ms */
  release: number;
  /** Loop mode for envelope */
  loop: boolean;
  /** Destination: filter, pitch, or osc2 */
  destination: "filter" | "pitch" | "osc2" | "pwm";
  /** Amount (-100% to 100%) */
  amount: number;
}

// =============================================================================
// LFO Configuration
// =============================================================================

/** LFO waveforms */
export type AnalogLFOWaveform = "sine" | "triangle" | "square" | "saw" | "s&h" | "noise";

/** LFO rate modes */
export type AnalogLFOMode = "free" | "sync" | "one-shot";

/** LFO configuration */
export interface LFOConfig {
  /** Waveform type */
  waveform: AnalogLFOWaveform;
  /** Rate in Hz (or beat divisions if synced) */
  rate: number;
  /** Sync mode */
  mode: AnalogLFOMode;
  /** Amount (-100% to 100%) */
  amount: number;
  /** Destination */
  destination: "pitch" | "filter" | "amp" | "pwm" | "osc2";
  /** Phase offset (0-360 degrees) */
  phase: number;
  /** Retrigger on note */
  retrigger: boolean;
}

// =============================================================================
// Global/Voice Configuration
// =============================================================================

/** Voice mode settings */
export interface VoiceModeConfig {
  /** Monophonic or polyphonic */
  mode: "mono" | "poly" | "legato";
  /** Number of voices (1-32) */
  voices: number;
  /** Unison voices (1, 2, 4) */
  unison: number;
  /** Unison detune amount (0-100%) */
  unisonDetune: number;
  /** Stereo spread (-100% to 100%) */
  spread: number;
}

/** Glide/portamento configuration */
export interface GlideConfig {
  /** Whether glide is enabled */
  enabled: boolean;
  /** Glide time in ms */
  time: number;
  /** Legato mode (glide only on overlapping notes) */
  legato: boolean;
  /** Glide mode: constant rate or constant time */
  mode: "rate" | "time";
}

/** Master output configuration */
export interface MasterConfig {
  /** Output level in dB (-inf to +12) */
  level: number;
  /** Stereo pan (-1 to 1) */
  pan: number;
  /** Key priority for mono mode */
  priority: "last" | "low" | "high";
}

// =============================================================================
// Complete Analog State
// =============================================================================

/** Complete state for the Analog instrument */
export interface AnalogStateSnapshot {
  /** Oscillator 1 configuration */
  osc1: OscillatorConfig;
  /** Oscillator 2 configuration */
  osc2: OscillatorConfig;
  /** Sub oscillator configuration */
  subOsc: SubOscillatorConfig;
  /** Noise generator configuration */
  noise: NoiseConfig;
  /** Filter 1 configuration */
  filter1: FilterConfig;
  /** Filter 2 configuration */
  filter2: FilterConfig;
  /** Filter routing (series or parallel) */
  filterRouting: FilterRouting;
  /** Filter envelope */
  filterEnv: FilterEnvelopeConfig;
  /** Filter modulation */
  filterMod: FilterModulation;
  /** Amp envelope */
  ampEnv: AmpEnvelopeConfig;
  /** Modulation envelope */
  modEnv: ModEnvelopeConfig;
  /** LFO 1 configuration */
  lfo1: LFOConfig;
  /** LFO 2 configuration */
  lfo2: LFOConfig;
  /** Voice mode settings */
  voiceMode: VoiceModeConfig;
  /** Glide configuration */
  glide: GlideConfig;
  /** Master settings */
  master: MasterConfig;
}

// =============================================================================
// Parameter Specifications
// =============================================================================

/** Generate parameter specs for all Analog parameters */
export function generateAnalogParameters(): PluginParameterSpec[] {
  const params: PluginParameterSpec[] = [];
  
  // ===========================================================================
  // Oscillator 1
  // ===========================================================================
  params.push(
    { id: "osc1Enabled", name: "Osc 1 On", kind: "bool", min: 0, max: 1, defaultValue: 1 },
    { 
      id: "osc1Waveform", 
      name: "Waveform", 
      kind: "enum", 
      min: 0, 
      max: 4, 
      defaultValue: 0.4, 
      labels: ["Sine", "Triangle", "Saw", "Square", "Pulse"] 
    },
    { id: "osc1Pitch", name: "Pitch", kind: "int", min: -24, max: 24, defaultValue: 0.5, unit: "st" },
    { id: "osc1Detune", name: "Detune", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "cents" },
    { id: "osc1Level", name: "Level", kind: "float", min: 0, max: 100, defaultValue: 0.8, unit: "%" },
    { id: "osc1PulseWidth", name: "Pulse Width", kind: "float", min: 1, max: 99, defaultValue: 0.5, unit: "%" },
    { id: "osc1ShapeMod", name: "Shape", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" }
  );
  
  // ===========================================================================
  // Oscillator 2
  // ===========================================================================
  params.push(
    { id: "osc2Enabled", name: "Osc 2 On", kind: "bool", min: 0, max: 1, defaultValue: 1 },
    { 
      id: "osc2Waveform", 
      name: "Waveform", 
      kind: "enum", 
      min: 0, 
      max: 4, 
      defaultValue: 0.4, 
      labels: ["Sine", "Triangle", "Saw", "Square", "Pulse"] 
    },
    { id: "osc2Pitch", name: "Pitch", kind: "int", min: -24, max: 24, defaultValue: 0.52, unit: "st" },
    { id: "osc2Detune", name: "Detune", kind: "float", min: -100, max: 100, defaultValue: 0.52, unit: "cents" },
    { id: "osc2Level", name: "Level", kind: "float", min: 0, max: 100, defaultValue: 0.6, unit: "%" },
    { id: "osc2PulseWidth", name: "Pulse Width", kind: "float", min: 1, max: 99, defaultValue: 0.5, unit: "%" },
    { id: "osc2HardSync", name: "Hard Sync", kind: "bool", min: 0, max: 1, defaultValue: 0 },
    { id: "osc2ShapeMod", name: "Shape", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" }
  );
  
  // ===========================================================================
  // Sub Oscillator
  // ===========================================================================
  params.push(
    { id: "subEnabled", name: "Sub On", kind: "bool", min: 0, max: 1, defaultValue: 0 },
    { 
      id: "subOctave", 
      name: "Octave", 
      kind: "enum", 
      min: 0, 
      max: 1, 
      defaultValue: 0, 
      labels: ["-1 Oct", "-2 Oct"] 
    },
    { id: "subLevel", name: "Level", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
    { id: "subTone", name: "Tone", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" }
  );
  
  // ===========================================================================
  // Noise
  // ===========================================================================
  params.push(
    { id: "noiseEnabled", name: "Noise On", kind: "bool", min: 0, max: 1, defaultValue: 0 },
    { 
      id: "noiseType", 
      name: "Type", 
      kind: "enum", 
      min: 0, 
      max: 3, 
      defaultValue: 0, 
      labels: ["White", "Pink", "Red", "Blue"] 
    },
    { id: "noiseLevel", name: "Level", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
    { id: "noiseColor", name: "Color", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" }
  );
  
  // ===========================================================================
  // Filter 1
  // ===========================================================================
  params.push(
    { 
      id: "filter1Type", 
      name: "Filter 1 Type", 
      kind: "enum", 
      min: 0, 
      max: 4, 
      defaultValue: 0, 
      labels: ["LP", "HP", "BP", "Notch", "Formant"] 
    },
    { 
      id: "filter1Slope", 
      name: "Slope", 
      kind: "enum", 
      min: 0, 
      max: 1, 
      defaultValue: 1, 
      labels: ["12dB", "24dB"] 
    },
    { id: "filter1Freq", name: "Frequency", kind: "float", min: 20, max: 20000, defaultValue: 0.8, unit: "Hz" },
    { id: "filter1Res", name: "Resonance", kind: "float", min: 0, max: 100, defaultValue: 0.2, unit: "%" },
    { id: "filter1Drive", name: "Drive", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" }
  );
  
  // ===========================================================================
  // Filter 2
  // ===========================================================================
  params.push(
    { 
      id: "filter2Type", 
      name: "Filter 2 Type", 
      kind: "enum", 
      min: 0, 
      max: 4, 
      defaultValue: 0, 
      labels: ["LP", "HP", "BP", "Notch", "Formant"] 
    },
    { 
      id: "filter2Slope", 
      name: "Slope", 
      kind: "enum", 
      min: 0, 
      max: 1, 
      defaultValue: 1, 
      labels: ["12dB", "24dB"] 
    },
    { id: "filter2Freq", name: "Frequency", kind: "float", min: 20, max: 20000, defaultValue: 0.8, unit: "Hz" },
    { id: "filter2Res", name: "Resonance", kind: "float", min: 0, max: 100, defaultValue: 0.2, unit: "%" },
    { id: "filter2Drive", name: "Drive", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" }
  );
  
  // ===========================================================================
  // Filter Routing & Modulation
  // ===========================================================================
  params.push(
    { 
      id: "filterRouting", 
      name: "Routing", 
      kind: "enum", 
      min: 0, 
      max: 1, 
      defaultValue: 0, 
      labels: ["Series", "Parallel"] 
    },
    { id: "filterEnvAmount", name: "F.Env", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "%" },
    { id: "filterLFOAmount", name: "F.LFO", kind: "float", min: -100, max: 100, defaultValue: 0, unit: "%" },
    { id: "filterKeyTrack", name: "F.Key", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" }
  );
  
  // ===========================================================================
  // Filter Envelope
  // ===========================================================================
  params.push(
    { id: "filterAttack", name: "F.Attack", kind: "float", min: 0.1, max: 10000, defaultValue: 0.01, unit: "ms" },
    { id: "filterDecay", name: "F.Decay", kind: "float", min: 1, max: 10000, defaultValue: 0.2, unit: "ms" },
    { id: "filterSustain", name: "F.Sustain", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
    { id: "filterRelease", name: "F.Release", kind: "float", min: 1, max: 30000, defaultValue: 0.3, unit: "ms" }
  );
  
  // ===========================================================================
  // Amp Envelope
  // ===========================================================================
  params.push(
    { id: "ampAttack", name: "Attack", kind: "float", min: 0.1, max: 10000, defaultValue: 0.01, unit: "ms" },
    { id: "ampDecay", name: "Decay", kind: "float", min: 1, max: 10000, defaultValue: 0.1, unit: "ms" },
    { id: "ampSustain", name: "Sustain", kind: "float", min: 0, max: 100, defaultValue: 0.8, unit: "%" },
    { id: "ampRelease", name: "Release", kind: "float", min: 1, max: 30000, defaultValue: 0.3, unit: "ms" }
  );
  
  // ===========================================================================
  // Modulation Envelope
  // ===========================================================================
  params.push(
    { id: "modAttack", name: "Mod Attack", kind: "float", min: 0.1, max: 10000, defaultValue: 0.01, unit: "ms" },
    { id: "modDecay", name: "Mod Decay", kind: "float", min: 1, max: 10000, defaultValue: 0.2, unit: "ms" },
    { id: "modSustain", name: "Mod Sustain", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
    { id: "modRelease", name: "Mod Release", kind: "float", min: 1, max: 30000, defaultValue: 0.3, unit: "ms" },
    { id: "modLoop", name: "Mod Loop", kind: "bool", min: 0, max: 1, defaultValue: 0 },
    { 
      id: "modDestination", 
      name: "Mod Dest", 
      kind: "enum", 
      min: 0, 
      max: 3, 
      defaultValue: 0, 
      labels: ["Filter", "Pitch", "Osc2", "PWM"] 
    },
    { id: "modAmount", name: "Mod Amt", kind: "float", min: -100, max: 100, defaultValue: 0, unit: "%" }
  );
  
  // ===========================================================================
  // LFO 1
  // ===========================================================================
  params.push(
    { 
      id: "lfo1Waveform", 
      name: "LFO1 Wave", 
      kind: "enum", 
      min: 0, 
      max: 5, 
      defaultValue: 0, 
      labels: ["Sine", "Triangle", "Square", "Saw", "S&H", "Noise"] 
    },
    { id: "lfo1Rate", name: "LFO1 Rate", kind: "float", min: 0.01, max: 100, defaultValue: 0.2, unit: "Hz" },
    { 
      id: "lfo1Mode", 
      name: "LFO1 Mode", 
      kind: "enum", 
      min: 0, 
      max: 2, 
      defaultValue: 0, 
      labels: ["Free", "Sync", "One-Shot"] 
    },
    { 
      id: "lfo1Destination", 
      name: "LFO1 Dest", 
      kind: "enum", 
      min: 0, 
      max: 4, 
      defaultValue: 0, 
      labels: ["Pitch", "Filter", "Amp", "PWM", "Osc2"] 
    },
    { id: "lfo1Amount", name: "LFO1 Amt", kind: "float", min: -100, max: 100, defaultValue: 0, unit: "%" },
    { id: "lfo1Retrigger", name: "LFO1 Retrig", kind: "bool", min: 0, max: 1, defaultValue: 1 }
  );
  
  // ===========================================================================
  // LFO 2
  // ===========================================================================
  params.push(
    { 
      id: "lfo2Waveform", 
      name: "LFO2 Wave", 
      kind: "enum", 
      min: 0, 
      max: 5, 
      defaultValue: 0, 
      labels: ["Sine", "Triangle", "Square", "Saw", "S&H", "Noise"] 
    },
    { id: "lfo2Rate", name: "LFO2 Rate", kind: "float", min: 0.01, max: 100, defaultValue: 0.3, unit: "Hz" },
    { 
      id: "lfo2Mode", 
      name: "LFO2 Mode", 
      kind: "enum", 
      min: 0, 
      max: 2, 
      defaultValue: 0, 
      labels: ["Free", "Sync", "One-Shot"] 
    },
    { 
      id: "lfo2Destination", 
      name: "LFO2 Dest", 
      kind: "enum", 
      min: 0, 
      max: 4, 
      defaultValue: 0, 
      labels: ["Pitch", "Filter", "Amp", "PWM", "Osc2"] 
    },
    { id: "lfo2Amount", name: "LFO2 Amt", kind: "float", min: -100, max: 100, defaultValue: 0, unit: "%" },
    { id: "lfo2Retrigger", name: "LFO2 Retrig", kind: "bool", min: 0, max: 1, defaultValue: 1 }
  );
  
  // ===========================================================================
  // Voice Mode & Glide
  // ===========================================================================
  params.push(
    { 
      id: "voiceMode", 
      name: "Mode", 
      kind: "enum", 
      min: 0, 
      max: 2, 
      defaultValue: 0.5, 
      labels: ["Mono", "Legato", "Poly"] 
    },
    { 
      id: "voiceCount", 
      name: "Voices", 
      kind: "enum", 
      min: 0, 
      max: 5, 
      defaultValue: 0.6, 
      labels: ["1", "2", "4", "8", "16", "32"] 
    },
    { 
      id: "unison", 
      name: "Unison", 
      kind: "enum", 
      min: 0, 
      max: 2, 
      defaultValue: 0, 
      labels: ["Off", "2", "4"] 
    },
    { id: "unisonDetune", name: "Uni Detune", kind: "float", min: 0, max: 100, defaultValue: 0.2, unit: "%" },
    { id: "spread", name: "Spread", kind: "float", min: -100, max: 100, defaultValue: 0, unit: "%" },
    { id: "glideEnabled", name: "Glide On", kind: "bool", min: 0, max: 1, defaultValue: 0 },
    { id: "glideTime", name: "Glide Time", kind: "float", min: 0, max: 5000, defaultValue: 0.01, unit: "ms" },
    { id: "glideLegato", name: "Glide Legato", kind: "bool", min: 0, max: 1, defaultValue: 0 }
  );
  
  // ===========================================================================
  // Master
  // ===========================================================================
  params.push(
    { id: "masterLevel", name: "Level", kind: "float", min: -96, max: 12, defaultValue: 0.75, unit: "dB" },
    { id: "masterPan", name: "Pan", kind: "float", min: -50, max: 50, defaultValue: 0.5 },
    { 
      id: "priority", 
      name: "Priority", 
      kind: "enum", 
      min: 0, 
      max: 2, 
      defaultValue: 0, 
      labels: ["Last", "Low", "High"] 
    }
  );
  
  return params;
}

// =============================================================================
// Default State
// =============================================================================

/** Create default Analog state */
export function createDefaultAnalogState(): AnalogStateSnapshot {
  return {
    osc1: {
      enabled: true,
      waveform: "sawtooth",
      pitch: 0,
      detune: 0,
      level: 0.8,
      pulseWidth: 0.5,
      hardSync: false,
      shapeMod: 0,
    },
    osc2: {
      enabled: true,
      waveform: "sawtooth",
      pitch: 0,
      detune: 5,
      level: 0.6,
      pulseWidth: 0.5,
      hardSync: false,
      shapeMod: 0,
    },
    subOsc: {
      enabled: false,
      octave: -1,
      level: 0,
      tone: 0.5,
    },
    noise: {
      enabled: false,
      type: "white",
      level: 0,
    },
    filter1: {
      type: "lowpass",
      slope: 24,
      frequency: 20000,
      resonance: 0,
      drive: 0,
    },
    filter2: {
      type: "lowpass",
      slope: 24,
      frequency: 20000,
      resonance: 0,
      drive: 0,
    },
    filterRouting: "series",
    filterEnv: {
      attack: 10,
      decay: 200,
      sustain: 0.3,
      release: 300,
    },
    filterMod: {
      envAmount: 0,
      lfoAmount: 0,
      keyTrack: 0,
    },
    ampEnv: {
      attack: 10,
      decay: 100,
      sustain: 0.8,
      release: 300,
      attackCurve: 0.5,
    },
    modEnv: {
      attack: 10,
      decay: 200,
      sustain: 0,
      release: 300,
      loop: false,
      destination: "filter",
      amount: 0,
    },
    lfo1: {
      waveform: "sine",
      rate: 1,
      mode: "free",
      amount: 0,
      destination: "pitch",
      phase: 0,
      retrigger: true,
    },
    lfo2: {
      waveform: "sine",
      rate: 2,
      mode: "free",
      amount: 0,
      destination: "filter",
      phase: 0,
      retrigger: true,
    },
    voiceMode: {
      mode: "poly",
      voices: 8,
      unison: 1,
      unisonDetune: 10,
      spread: 0,
    },
    glide: {
      enabled: false,
      time: 50,
      legato: false,
      mode: "time",
    },
    master: {
      level: 0,
      pan: 0,
      priority: "last",
    },
  };
}
