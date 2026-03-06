/**
 * Plugin/Instrument type definitions
 * 
 * Supports the plugin architecture defined in section 16
 */

/** Plugin parameter specification */
export interface PluginParameterSpec {
  id: string;
  name: string;
  kind: 'float' | 'int' | 'bool' | 'enum';
  min: number;
  max: number;
  defaultValue: number;
  step?: number;
  automationRate?: 'a-rate' | 'k-rate';
  unit?: string;
  labels?: string[];
}

/** Plugin UI descriptor */
export interface PluginUiDescriptor {
  type: 'native' | 'custom' | 'wam';
  width?: number;
  height?: number;
  resizeable?: boolean;
}

/** Plugin definition (type information) */
export interface PluginDefinition {
  id: string;
  name: string;
  category: 'instrument' | 'audioFx' | 'midiFx' | 'utility' | 'analysis';
  version: string;
  vendor?: string;
  description?: string;
  parameters: PluginParameterSpec[];
  ui: PluginUiDescriptor;
  hasCustomUi: boolean;
  latencySamples: number;
}

/** Plugin instance (in project) */
export interface PluginInstance {
  id: string;
  definitionId: string;
  name?: string; // Custom name override
  
  // Parameter values (normalized 0-1 or actual values)
  parameterValues: Record<string, number>;
  
  // State blob for complex plugin state
  state?: unknown;
  
  // Bypass state
  bypass: boolean;
  
  // Preset reference if loaded from preset
  presetId?: string;
  
  // Enabled/disabled (different from bypass - saves CPU)
  enabled: boolean;
  
  // Sidechain input for plugins that support it
  sidechainSource?: string; // Track or bus ID
}

/** Plugin target reference */
export interface PluginTarget {
  type: 'plugin';
  pluginId: string;
}

/** Built-in instrument definitions */
export const BUILTIN_INSTRUMENTS = {
  DRUM_RACK: 'builtin:drum-rack',
  SAMPLER: 'builtin:sampler',
  SUBTRACTIVE_SYNTH: 'builtin:subtractive-synth',
  WAVETABLE_SYNTH: 'builtin:wavetable-synth',
  FM_SYNTH: 'builtin:fm-synth',
  GRANULAR: 'builtin:granular',
} as const;

/** Built-in effect definitions */
export const BUILTIN_EFFECTS = {
  EQ: 'builtin:eq',
  COMPRESSOR: 'builtin:compressor',
  LIMITER: 'builtin:limiter',
  GATE: 'builtin:gate',
  DELAY: 'builtin:delay',
  REVERB: 'builtin:reverb',
  CHORUS: 'builtin:chorus',
  FLANGER: 'builtin:flanger',
  PHASER: 'builtin:phaser',
  SATURATOR: 'builtin:saturator',
  BITCRUSHER: 'builtin:bitcrusher',
  UTILITY: 'builtin:utility',
  FILTER: 'builtin:filter',
  TRANSIENT_SHAPER: 'builtin:transient-shaper',
  CONVOLUTION_REVERB: 'builtin:convolution-reverb',
  TUNER: 'builtin:tuner',
  SPECTRUM_ANALYZER: 'builtin:spectrum-analyzer',
  OSCILLOSCOPE: 'builtin:oscilloscope',
} as const;

/** Drum pad state for drum rack */
export interface DrumPadState {
  note: number;
  chokeGroup: number | null;
  layers: SampleLayer[];
  gainDb: number;
  pan: number;
  inserts: PluginInstance[];
  sends: SendSlot[];
  color?: string;
  name?: string;
}

/** Sample layer for multi-sampling */
export interface SampleLayer {
  id: string;
  assetId: string;
  rootNote: number;
  minNote?: number;
  maxNote?: number;
  minVelocity: number;
  maxVelocity: number;
  roundRobinGroup?: number;
  
  // Sample playback settings
  startSample: number;
  endSample: number;
  loopStart?: number;
  loopEnd?: number;
  loopEnabled: boolean;
  
  // Processing
  gainDb: number;
  pan: number;
  tuneCents: number;
  reverse: boolean;
  
  // Envelope
  attackMs: number;
  decayMs: number;
  sustain: number;
  releaseMs: number;
  
  // Filter
  filterEnabled: boolean;
  filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  filterFreq: number;
  filterResonance: number;
}

/** Send slot (re-export for drum pad) */
export interface SendSlot {
  id: string;
  targetBusId: string;
  levelDb: number;
  preFader: boolean;
  active: boolean;
}

/** Drum rack specific state */
export interface DrumRackState {
  pads: DrumPadState[];
  globalInsert: PluginInstance[];
  globalSends: SendSlot[];
  chokeGroups: number; // Number of choke groups
}

/** Sampler state */
export interface SamplerState {
  zones: SampleLayer[];
  globalTune: number;
  globalGainDb: number;
  
  // Playback settings
  glide: number;
  glideMode: 'off' | 'portamento' | 'constant-rate';
  legato: boolean;
  
  // Voice settings
  polyphony: number;
  voiceStealing: 'oldest' | 'newest' | 'quietest';
  
  // Filter
  filterEnabled: boolean;
  filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  filterFreq: number;
  filterResonance: number;
  filterEnvelopeAmount: number;
  
  // LFOs
  lfo1: LfoSettings;
  lfo2: LfoSettings;
  
  // Mod matrix
  modMatrix: ModMatrixEntry[];
}

/** LFO settings */
export interface LfoSettings {
  rate: number; // Hz or beats depending on sync
  sync: boolean;
  waveform: 'sine' | 'triangle' | 'saw' | 'square' | 'random';
  phase: number;
  depth: number;
}

/** Mod matrix entry */
export interface ModMatrixEntry {
  source: ModSource;
  target: ModTarget;
  amount: number; // -1 to 1
}

/** Modulation sources */
export type ModSource =
  | { type: 'velocity' }
  | { type: 'keytrack' }
  | { type: 'modwheel' }
  | { type: 'aftertouch' }
  | { type: 'pitchbend' }
  | { type: 'lfo'; lfo: number }
  | { type: 'envelope'; env: number }
  | { type: 'random' };

/** Modulation targets */
export type ModTarget =
  | { type: 'pitch'; rangeSemitones?: number }
  | { type: 'filter'; param: 'freq' | 'resonance' }
  | { type: 'amp' }
  | { type: 'pan' }
  | { type: 'lfo'; lfo: number; param: 'rate' | 'depth' }
  | { type: 'oscillator'; param: string };

/** Synth oscillator settings */
export interface OscillatorSettings {
  type: 'sine' | 'triangle' | 'saw' | 'square' | 'pulse' | 'supersaw' | 'noise';
  gainDb: number;
  pan: number;
  transpose: number;
  fineTune: number;
  
  // Pulse width for pulse wave
  pulseWidth?: number;
  pulseWidthMod?: number;
  
  // Hard sync
  hardSync: boolean;
  syncSource?: number;
  
  // Supersaw
  supersawDetune?: number;
  supersawMix?: number;
}

/** Subtractive synth state */
export interface SubtractiveSynthState {
  oscillators: OscillatorSettings[];
  subOscillator: {
    enabled: boolean;
    octave: -1 | -2;
    gainDb: number;
  };
  noiseOscillator: {
    enabled: boolean;
    type: 'white' | 'pink' | 'brown';
    gainDb: number;
  };
  
  // Filter
  filter: {
    type: 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'ladder';
    cutoff: number;
    resonance: number;
    drive: number;
    keyTracking: number;
  };
  
  // Envelopes
  filterEnvelope: AdsrEnvelope;
  ampEnvelope: AdsrEnvelope;
  modEnvelope: AdsrEnvelope;
  
  // LFOs
  lfo1: LfoSettings;
  lfo2: LfoSettings;
  
  // Unison
  unison: {
    enabled: boolean;
    voices: number;
    detune: number;
    spread: number;
  };
  
  // Play mode
  playMode: 'poly' | 'mono' | 'legato';
  portamento: number;
  portamentoMode: 'rate' | 'time';
}

/** ADSR Envelope */
export interface AdsrEnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  attackCurve: number; // -1 (log) to 1 (exp), 0 = linear
  decayCurve: number;
  releaseCurve: number;
}

/** Wavetable synth state */
export interface WavetableSynthState {
  oscillators: WavetableOscillator[];
  filter: {
    type: 'lowpass' | 'highpass' | 'bandpass';
    cutoff: number;
    resonance: number;
  };
  ampEnvelope: AdsrEnvelope;
  modEnvelope: AdsrEnvelope;
  lfo1: LfoSettings;
  lfo2: LfoSettings;
  macros: Record<string, number>;
}

/** Wavetable oscillator */
export interface WavetableOscillator {
  wavetableId: string;
  position: number; // Morph position
  gainDb: number;
  pan: number;
  transpose: number;
  fineTune: number;
  unison: {
    voices: number;
    detune: number;
    spread: number;
  };
  phaseModulation?: {
    source: number;
    amount: number;
  };
}

/** FM Synth operator */
export interface FmOperator {
  ratio: number;
  fixedFreq?: number;
  useFixedFreq: boolean;
  level: number;
  feedback: number;
  envelope: AdsrEnvelope;
}

/** FM Synth algorithm */
export interface FmAlgorithm {
  id: number;
  connections: FmConnection[];
}

/** FM connection between operators */
export interface FmConnection {
  from: number;
  to: number; // -1 = output
  amount: number;
}

/** FM Synth state */
export interface FmSynthState {
  operators: FmOperator[];
  algorithm: number;
  feedback: number[];
  macros: Record<string, number>;
}

/** Granular synth state */
export interface GranularSynthState {
  assetId: string;
  
  // Grain settings
  position: number; // 0-1 position in sample
  positionSpray: number;
  sizeMs: number;
  sizeSpray: number;
  density: number; // Grains per second
  densitySpray: number;
  
  // Pitch
  pitch: number;
  pitchSpray: number;
  pitchQuantize: boolean;
  
  // Envelope
  grainEnvelope: 'gaussian' | 'triangle' | 'sine' | 'exp';
  grainAttack: number;
  grainDecay: number;
  
  // Advanced
  formant: number;
  reverse: boolean;
  freeze: boolean;
  
  // Mode
  mode: 'retrigger' | 'cloud';
}
