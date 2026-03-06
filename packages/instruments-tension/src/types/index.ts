/**
 * Tension - String Physical Modeling Instrument
 * 
 * Based on Ableton Tension device - a physical modeling string instrument
 * supporting bow, hammer, and plectrum excitation.
 */

// ============================================================================
// EXCITATION TYPES
// ============================================================================

export type ExcitationType = 'bow' | 'hammer' | 'hammer-bounce' | 'plectrum';

// ============================================================================
// EXCITATOR SECTION
// ============================================================================

export interface ExcitatorParams {
  /** Type of excitation */
  type: ExcitationType;
  /** Force/pressure applied (0-1) */
  force: number;
  /** Friction coefficient for bow (0-1) */
  friction: number;
  /** Velocity of excitation (0-1) */
  velocity: number;
  /** Position along string (0-1, bridge to nut) */
  position: number;
  /** Mass of hammer/plectrum (0-1) */
  mass: number;
  /** Stiffness of excitator (0-1) */
  stiffness: number;
  /** Damping of excitator (0-1) */
  damping: number;
}

// ============================================================================
// STRING SECTION
// ============================================================================

export interface StringParams {
  /** Decay time of string vibration (0.1-10s) */
  decay: number;
  /** Frequency ratio for detuning (0.5-2) */
  ratio: number;
  /** Inharmonicity factor (0-1) */
  inharmonics: number;
  /** High frequency damping (0-1) */
  damping: number;
  /** String tension (0-1) */
  tension: number;
  /** Tone character (0-1) */
  tone: number;
  /** Core stiffness parameter (0-1) */
  stiffness: number;
}

// ============================================================================
// TERMINATION SECTION
// ============================================================================

export interface TerminationParams {
  /** Pickup position along string (0-1) */
  pickupPosition: number;
  /** Nut reflection coefficient (0-1) */
  nutReflection: number;
  /** Bridge reflection coefficient (0-1) */
  bridgeReflection: number;
}

// ============================================================================
// DAMPER SECTION
// ============================================================================

export interface DamperParams {
  enabled: boolean;
  /** Damper mass (0-1) */
  mass: number;
  /** Damper stiffness (0-1) */
  stiffness: number;
  /** Velocity of damper engagement (0-1) */
  velocity: number;
  /** Damper position on string (0-1) */
  position: number;
}

// ============================================================================
// FILTER SECTION
// ============================================================================

export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'off';

export interface FilterParams {
  type: FilterType;
  /** Cutoff frequency (20-20000 Hz) */
  frequency: number;
  /** Resonance/Q (0-1) */
  resonance: number;
  /** Key tracking amount (0-1) */
  keyTracking: number;
  /** Envelope amount (-1 to 1) */
  envelopeAmount: number;
  /** Filter envelope attack (0-5s) */
  attack: number;
  /** Filter envelope decay (0-5s) */
  decay: number;
  /** Filter envelope sustain (0-1) */
  sustain: number;
  /** Filter envelope release (0-5s) */
  release: number;
}

// ============================================================================
// BODY SECTION (RESONANCE)
// ============================================================================

export type BodyType = 'off' | 'guitar' | 'violin' | 'cello' | 'piano' | 'custom';

export interface BodyParams {
  type: BodyType;
  /** Body size (0-1, affects resonant frequencies) */
  size: number;
  /** Decay of body resonance (0.01-2s) */
  decay: number;
  /** Low cut frequency (20-1000 Hz) */
  lowCut: number;
  /** High cut frequency (2000-20000 Hz) */
  highCut: number;
  /** Mix of body resonance (0-1) */
  mix: number;
}

// ============================================================================
// GLOBAL PARAMETERS
// ============================================================================

export interface GlobalParams {
  /** Global transpose in semitones (-24 to +24) */
  transpose: number;
  /** Number of voices for polyphony (1-16) */
  voices: number;
  /** Stereo spread amount (0-1) */
  spread: number;
  /** Glide/portamento time in seconds (0-1) */
  glide: number;
  /** Master volume (0-1) */
  volume: number;
  /** Voice mode */
  voiceMode: 'poly' | 'mono' | 'legato';
  /** Unison voices (1-4) */
  unison: number;
  /** Unison detune (0-1) */
  unisonDetune: number;
}

// ============================================================================
// LFO PARAMETERS
// ============================================================================

export type LfoWaveform = 'sine' | 'triangle' | 'saw' | 'square' | 'sample-hold';

export type LfoTarget = 
  | 'none'
  | 'string-decay'
  | 'string-tension'
  | 'excitator-position'
  | 'excitator-force'
  | 'filter-freq'
  | 'volume';

export interface LfoParams {
  /** Rate in Hz (0.01-50) */
  rate: number;
  /** Waveform shape */
  waveform: LfoWaveform;
  /** Modulation amount (-1 to +1) */
  amount: number;
  /** Target parameter */
  target: LfoTarget;
  /** Sync to tempo */
  sync: boolean;
  /** Phase offset (0-360) */
  phase: number;
}

// ============================================================================
// MIDI MAPPINGS
// ============================================================================

export interface MidiMappingParams {
  /** Pitch bend range in semitones */
  pitchBendRange: number;
  /** Mod wheel target */
  modWheelTarget: LfoTarget | 'none';
  /** Aftertouch target */
  aftertouchTarget: LfoTarget | 'none';
  /** Velocity to force amount (0-1) */
  velocityToForce: number;
  /** Velocity to brightness (0-1) */
  velocityToBrightness: number;
}

// ============================================================================
// COMPLETE INSTRUMENT STATE
// ============================================================================

export interface TensionState {
  /** Excitation configuration */
  excitator: ExcitatorParams;
  /** String physics parameters */
  string: StringParams;
  /** String termination/pickup */
  termination: TerminationParams;
  /** Damper settings */
  damper: DamperParams;
  /** Output filter */
  filter: FilterParams;
  /** Body resonance */
  body: BodyParams;
  /** LFO for modulation */
  lfo: LfoParams;
  /** Global settings */
  global: GlobalParams;
  /** MIDI mappings */
  midi: MidiMappingParams;
}

// ============================================================================
// EXCITATION PRESETS
// ============================================================================

export const bowPreset: Partial<TensionState> = {
  excitator: {
    type: 'bow',
    force: 0.6,
    friction: 0.7,
    velocity: 0.5,
    position: 0.12,
    mass: 0.5,
    stiffness: 0.3,
    damping: 0.2,
  },
  string: {
    decay: 3.0,
    ratio: 1.0,
    inharmonics: 0.1,
    damping: 0.2,
    tension: 0.6,
    tone: 0.5,
    stiffness: 0.4,
  },
  termination: {
    pickupPosition: 0.15,
    nutReflection: 0.95,
    bridgeReflection: 0.85,
  },
  damper: {
    enabled: false,
    mass: 0.5,
    stiffness: 0.5,
    velocity: 0.3,
    position: 0.1,
  },
  body: {
    type: 'violin',
    size: 0.5,
    decay: 0.8,
    lowCut: 100,
    highCut: 8000,
    mix: 0.6,
  },
  lfo: {
    rate: 3,
    waveform: 'sine',
    amount: 0.1,
    target: 'string-decay',
    sync: false,
    phase: 0,
  },
  global: {
    voiceMode: 'mono',
    glide: 0.1,
    unison: 1,
    unisonDetune: 0.1,
  },
};

export const hammerPreset: Partial<TensionState> = {
  excitator: {
    type: 'hammer',
    force: 0.8,
    friction: 0.5,
    velocity: 0.7,
    position: 0.15,
    mass: 0.7,
    stiffness: 0.6,
    damping: 0.3,
  },
  string: {
    decay: 2.0,
    ratio: 1.0,
    inharmonics: 0.15,
    damping: 0.3,
    tension: 0.7,
    tone: 0.6,
    stiffness: 0.5,
  },
  termination: {
    pickupPosition: 0.12,
    nutReflection: 0.95,
    bridgeReflection: 0.9,
  },
  damper: {
    enabled: true,
    mass: 0.6,
    stiffness: 0.4,
    velocity: 0.4,
    position: 0.08,
  },
  body: {
    type: 'piano',
    size: 0.6,
    decay: 0.6,
    lowCut: 80,
    highCut: 10000,
    mix: 0.5,
  },
  lfo: {
    rate: 0.5,
    waveform: 'triangle',
    amount: 0,
    target: 'none',
    sync: false,
    phase: 0,
  },
  global: {
    voiceMode: 'poly',
    glide: 0,
    unison: 1,
    unisonDetune: 0.1,
  },
};

export const plectrumPreset: Partial<TensionState> = {
  excitator: {
    type: 'plectrum',
    force: 0.7,
    friction: 0.6,
    velocity: 0.8,
    position: 0.18,
    mass: 0.4,
    stiffness: 0.8,
    damping: 0.4,
  },
  string: {
    decay: 1.5,
    ratio: 1.0,
    inharmonics: 0.2,
    damping: 0.4,
    tension: 0.5,
    tone: 0.7,
    stiffness: 0.3,
  },
  termination: {
    pickupPosition: 0.1,
    nutReflection: 0.9,
    bridgeReflection: 0.8,
  },
  damper: {
    enabled: false,
    mass: 0.5,
    stiffness: 0.5,
    velocity: 0.3,
    position: 0.1,
  },
  body: {
    type: 'guitar',
    size: 0.4,
    decay: 0.5,
    lowCut: 120,
    highCut: 12000,
    mix: 0.7,
  },
  lfo: {
    rate: 2,
    waveform: 'sine',
    amount: 0,
    target: 'none',
    sync: false,
    phase: 0,
  },
  global: {
    voiceMode: 'poly',
    glide: 0,
    unison: 2,
    unisonDetune: 0.15,
  },
};

// ============================================================================
// DEFAULT STATE
// ============================================================================

export const defaultTensionState: TensionState = {
  excitator: hammerPreset.excitator!,
  string: hammerPreset.string!,
  termination: hammerPreset.termination!,
  damper: hammerPreset.damper!,
  filter: {
    type: 'off',
    frequency: 8000,
    resonance: 0.3,
    keyTracking: 0.5,
    envelopeAmount: 0,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.5,
    release: 0.5,
  },
  body: hammerPreset.body!,
  lfo: hammerPreset.lfo!,
  global: {
    transpose: 0,
    voices: 8,
    spread: 0.3,
    glide: 0,
    volume: 0.8,
    voiceMode: 'poly',
    unison: 1,
    unisonDetune: 0.1,
  },
  midi: {
    pitchBendRange: 2,
    modWheelTarget: 'none',
    aftertouchTarget: 'none',
    velocityToForce: 0.8,
    velocityToBrightness: 0.5,
  },
};

// ============================================================================
// PARAMETER METADATA
// ============================================================================

export interface ParameterSpec {
  id: string;
  name: string;
  min: number;
  max: number;
  default: number;
  unit?: string;
  step?: number;
  type: 'float' | 'int' | 'enum' | 'bool';
  enumValues?: string[];
}

export const tensionParameterSpecs: ParameterSpec[] = [
  // Excitator
  { id: 'excitator.type', name: 'Excitator Type', min: 0, max: 3, default: 1, type: 'enum', enumValues: ['bow', 'hammer', 'hammer-bounce', 'plectrum'] },
  { id: 'excitator.force', name: 'Force', min: 0, max: 1, default: 0.8, type: 'float' },
  { id: 'excitator.friction', name: 'Friction', min: 0, max: 1, default: 0.7, type: 'float' },
  { id: 'excitator.velocity', name: 'Velocity', min: 0, max: 1, default: 0.7, type: 'float' },
  { id: 'excitator.position', name: 'Position', min: 0, max: 1, default: 0.15, type: 'float' },
  { id: 'excitator.mass', name: 'Mass', min: 0, max: 1, default: 0.7, type: 'float' },
  { id: 'excitator.stiffness', name: 'Exciter Stiffness', min: 0, max: 1, default: 0.6, type: 'float' },
  // String
  { id: 'string.decay', name: 'String Decay', min: 0.1, max: 10, default: 2, unit: 's', type: 'float' },
  { id: 'string.ratio', name: 'String Ratio', min: 0.5, max: 2, default: 1, type: 'float' },
  { id: 'string.inharmonics', name: 'Inharmonics', min: 0, max: 1, default: 0.15, type: 'float' },
  { id: 'string.damping', name: 'String Damping', min: 0, max: 1, default: 0.3, type: 'float' },
  { id: 'string.tension', name: 'String Tension', min: 0, max: 1, default: 0.7, type: 'float' },
  { id: 'string.tone', name: 'String Tone', min: 0, max: 1, default: 0.6, type: 'float' },
  // Termination
  { id: 'termination.pickupPosition', name: 'Pickup Position', min: 0, max: 1, default: 0.12, type: 'float' },
  // Damper
  { id: 'damper.enabled', name: 'Damper On', min: 0, max: 1, default: 1, type: 'bool' },
  { id: 'damper.mass', name: 'Damper Mass', min: 0, max: 1, default: 0.6, type: 'float' },
  { id: 'damper.stiffness', name: 'Damper Stiffness', min: 0, max: 1, default: 0.4, type: 'float' },
  { id: 'damper.velocity', name: 'Damper Vel', min: 0, max: 1, default: 0.4, type: 'float' },
  // Filter
  { id: 'filter.type', name: 'Filter Type', min: 0, max: 4, default: 4, type: 'enum', enumValues: ['lowpass', 'highpass', 'bandpass', 'notch', 'off'] },
  { id: 'filter.frequency', name: 'Filter Freq', min: 20, max: 20000, default: 8000, unit: 'Hz', type: 'float' },
  { id: 'filter.resonance', name: 'Filter Res', min: 0, max: 1, default: 0.3, type: 'float' },
  // Body
  { id: 'body.type', name: 'Body Type', min: 0, max: 5, default: 3, type: 'enum', enumValues: ['off', 'guitar', 'violin', 'cello', 'piano', 'custom'] },
  { id: 'body.size', name: 'Body Size', min: 0, max: 1, default: 0.6, type: 'float' },
  { id: 'body.decay', name: 'Body Decay', min: 0.01, max: 2, default: 0.6, unit: 's', type: 'float' },
  { id: 'body.mix', name: 'Body Mix', min: 0, max: 1, default: 0.5, type: 'float' },
  // Global
  { id: 'global.transpose', name: 'Transpose', min: -24, max: 24, default: 0, unit: 'st', type: 'int' },
  { id: 'global.voices', name: 'Voices', min: 1, max: 16, default: 8, type: 'int' },
  { id: 'global.spread', name: 'Spread', min: 0, max: 1, default: 0.3, type: 'float' },
  { id: 'global.glide', name: 'Glide', min: 0, max: 1, default: 0, type: 'float' },
  { id: 'global.volume', name: 'Volume', min: 0, max: 1, default: 0.8, type: 'float' },
  { id: 'global.unison', name: 'Unison', min: 1, max: 4, default: 1, type: 'int' },
  { id: 'global.unisonDetune', name: 'Unison Detune', min: 0, max: 1, default: 0.1, type: 'float' },
];

// ============================================================================
// VOICE EVENTS
// ============================================================================

export interface NoteEvent {
  type: 'note-on' | 'note-off';
  note: number;
  velocity: number;
  sampleOffset: number;
  channel?: number;
}

export interface ControlEvent {
  type: 'pitch-bend' | 'mod-wheel' | 'aftertouch' | 'sustain';
  value: number;
  sampleOffset: number;
}

export type TensionEvent = NoteEvent | ControlEvent;
