/**
 * Collision - Physical Modeling Percussion Instrument
 * 
 * Based on Ableton Collision device - a mallet and membrane physics simulator
 * using modal synthesis approximations for realtime browser performance.
 */

// ============================================================================
// EXCITATOR TYPES
// ============================================================================

export type ExcitatorType = 'mallet' | 'noise';

export interface MalletParams {
  /** Volume of the mallet excitation (0-1) */
  volume: number;
  /** Amount of noise mixed with mallet impulse (0-1) */
  noiseAmount: number;
  /** Stiffness of the mallet material (0-1, affects high frequencies) */
  stiffness: number;
  /** Color/filter of the mallet impulse (0-1) */
  color: number;
}

export interface NoiseParams {
  /** Volume of the noise excitation (0-1) */
  volume: number;
  /** Filter cutoff frequency (20-20000 Hz) */
  filterFreq: number;
  /** Filter resonance (0-1) */
  filterResonance: number;
  /** Attack time in seconds (0-0.1) */
  attack: number;
  /** Decay time in seconds (0-2) */
  decay: number;
}

// ============================================================================
// RESONATOR TYPES
// ============================================================================

export type ResonatorType = 
  | 'beam'      // 1D bar/string vibration
  | 'marimba'   // Beam with tuned damping
  | 'string'    // Stiff string model
  | 'membrane'  // 2D circular drum head
  | 'plate'     // 2D rectangular plate
  | 'pipe'      // Open/closed cylindrical pipe
  | 'tube';     // Resonant tube with specific harmonics

export interface ResonatorParams {
  /** Enable this resonator */
  enabled: boolean;
  /** Type of physical model */
  type: ResonatorType;
  /** Tuning in semitones (-24 to +24) */
  tune: number;
  /** Fine tuning in cents (-50 to +50) */
  fineTune: number;
  /** Decay time in seconds (0.01-10) */
  decay: number;
  /** Material damping characteristic (0-1) */
  material: number;
  /** Size/radius of resonator (0-1, affects dispersion) */
  radius: number;
  /** Frequency ratio relative to base pitch (0.25-4) */
  ratio: number;
  /** Hit position on the resonator (0-1, center to edge) */
  hitPosition: number;
  /** Output level (0-1) */
  level: number;
  /** Pan position (-1 to +1) */
  pan: number;
}

export type LinkMode = 'off' | 'a-to-b' | 'b-to-a' | 'cross';

export interface ResonatorLinkParams {
  mode: LinkMode;
  /** Amount of coupling between resonators (0-1) */
  amount: number;
}

// ============================================================================
// LFO TYPES
// ============================================================================

export type LfoWaveform = 'sine' | 'triangle' | 'saw' | 'square' | 'sample-hold';

export type LfoTarget = 
  | 'none'
  | 'resonator-a-tune'
  | 'resonator-a-decay'
  | 'resonator-b-tune'
  | 'resonator-b-decay'
  | 'mallet-volume'
  | 'noise-volume'
  | 'filter-freq'
  | 'pan';

export interface LfoParams {
  /** LFO rate in Hz (0.01-50) */
  rate: number;
  /** Waveform shape */
  waveform: LfoWaveform;
  /** Modulation amount (-1 to +1) */
  amount: number;
  /** Phase offset in degrees (0-360) */
  phase: number;
  /** Target parameter to modulate */
  target: LfoTarget;
  /** Rate sync to tempo (optional, 0-1) */
  sync?: boolean;
  /** Synced division (if sync enabled) */
  syncDivision?: number;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export interface FilterParams {
  enabled: boolean;
  type: FilterType;
  /** Cutoff frequency (20-20000 Hz) */
  frequency: number;
  /** Resonance/Q (0-1) */
  resonance: number;
  /** Filter modulation amount from velocity (0-1) */
  velocityMod: number;
}

// ============================================================================
// MIDI MAPPINGS
// ============================================================================

export interface MidiMappingParams {
  /** Pitch bend range in semitones (-12 to +12 each direction) */
  pitchBendRange: number;
  /** Mod wheel target parameter */
  modWheelTarget: LfoTarget | 'none';
  /** Aftertouch target parameter */
  aftertouchTarget: LfoTarget | 'none';
  /** Velocity to volume amount (0-1) */
  velocityToVolume: number;
  /** Velocity to brightness amount (0-1) */
  velocityToBrightness: number;
}

// ============================================================================
// GLOBAL PARAMETERS
// ============================================================================

export interface GlobalParams {
  /** Stereo spread amount (0-1) */
  spread: number;
  /** Global transpose in semitones (-24 to +24) */
  transpose: number;
  /** Number of voices for polyphony (1-16) */
  voices: number;
  /** Master volume (0-1) */
  volume: number;
  /** Voice stealing mode */
  voiceMode: 'poly' | 'mono' | 'legato';
  /** Glide/portamento time in seconds (0-1) */
  glide: number;
}

// ============================================================================
// COMPLETE INSTRUMENT STATE
// ============================================================================

export interface CollisionState {
  /** Excitator type selection */
  excitatorType: ExcitatorType;
  /** Mallet parameters */
  mallet: MalletParams;
  /** Noise excitation parameters */
  noise: NoiseParams;
  /** Resonator A parameters */
  resonatorA: ResonatorParams;
  /** Resonator B parameters */
  resonatorB: ResonatorParams;
  /** Resonator linking parameters */
  link: ResonatorLinkParams;
  /** LFO 1 parameters */
  lfo1: LfoParams;
  /** LFO 2 parameters */
  lfo2: LfoParams;
  /** Filter section parameters */
  filter: FilterParams;
  /** MIDI mapping configuration */
  midi: MidiMappingParams;
  /** Global parameters */
  global: GlobalParams;
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

export const defaultCollisionState: CollisionState = {
  excitatorType: 'mallet',
  mallet: {
    volume: 0.8,
    noiseAmount: 0.1,
    stiffness: 0.5,
    color: 0.5,
  },
  noise: {
    volume: 0.5,
    filterFreq: 2000,
    filterResonance: 0.3,
    attack: 0.001,
    decay: 0.2,
  },
  resonatorA: {
    enabled: true,
    type: 'membrane',
    tune: 0,
    fineTune: 0,
    decay: 0.5,
    material: 0.5,
    radius: 0.5,
    ratio: 1.0,
    hitPosition: 0.5,
    level: 1.0,
    pan: -0.3,
  },
  resonatorB: {
    enabled: true,
    type: 'beam',
    tune: 12,
    fineTune: 0,
    decay: 1.0,
    material: 0.3,
    radius: 0.3,
    ratio: 2.0,
    hitPosition: 0.3,
    level: 0.6,
    pan: 0.3,
  },
  link: {
    mode: 'off',
    amount: 0.5,
  },
  lfo1: {
    rate: 2.0,
    waveform: 'sine',
    amount: 0.0,
    phase: 0,
    target: 'none',
    sync: false,
  },
  lfo2: {
    rate: 0.5,
    waveform: 'triangle',
    amount: 0.0,
    phase: 0,
    target: 'none',
    sync: false,
  },
  filter: {
    enabled: false,
    type: 'lowpass',
    frequency: 8000,
    resonance: 0.3,
    velocityMod: 0.2,
  },
  midi: {
    pitchBendRange: 2,
    modWheelTarget: 'none',
    aftertouchTarget: 'none',
    velocityToVolume: 1.0,
    velocityToBrightness: 0.3,
  },
  global: {
    spread: 0.3,
    transpose: 0,
    voices: 8,
    volume: 0.7,
    voiceMode: 'poly',
    glide: 0.0,
  },
};

// ============================================================================
// PARAMETER METADATA FOR AUTOMATION
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

export const collisionParameterSpecs: ParameterSpec[] = [
  // Mallet
  { id: 'mallet.volume', name: 'Mallet Volume', min: 0, max: 1, default: 0.8, type: 'float' },
  { id: 'mallet.noiseAmount', name: 'Noise Amount', min: 0, max: 1, default: 0.1, type: 'float' },
  { id: 'mallet.stiffness', name: 'Stiffness', min: 0, max: 1, default: 0.5, type: 'float' },
  { id: 'mallet.color', name: 'Color', min: 0, max: 1, default: 0.5, type: 'float' },
  // Resonator A
  { id: 'resonatorA.tune', name: 'Res A Tune', min: -24, max: 24, default: 0, unit: 'st', type: 'float' },
  { id: 'resonatorA.decay', name: 'Res A Decay', min: 0.01, max: 10, default: 0.5, unit: 's', type: 'float' },
  { id: 'resonatorA.material', name: 'Res A Material', min: 0, max: 1, default: 0.5, type: 'float' },
  { id: 'resonatorA.radius', name: 'Res A Radius', min: 0, max: 1, default: 0.5, type: 'float' },
  { id: 'resonatorA.ratio', name: 'Res A Ratio', min: 0.25, max: 4, default: 1, type: 'float' },
  { id: 'resonatorA.hitPosition', name: 'Res A Hit Pos', min: 0, max: 1, default: 0.5, type: 'float' },
  { id: 'resonatorA.level', name: 'Res A Level', min: 0, max: 1, default: 1, type: 'float' },
  // Resonator B
  { id: 'resonatorB.tune', name: 'Res B Tune', min: -24, max: 24, default: 12, unit: 'st', type: 'float' },
  { id: 'resonatorB.decay', name: 'Res B Decay', min: 0.01, max: 10, default: 1, unit: 's', type: 'float' },
  { id: 'resonatorB.level', name: 'Res B Level', min: 0, max: 1, default: 0.6, type: 'float' },
  // Global
  { id: 'global.spread', name: 'Spread', min: 0, max: 1, default: 0.3, type: 'float' },
  { id: 'global.volume', name: 'Volume', min: 0, max: 1, default: 0.7, type: 'float' },
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
  type: 'pitch-bend' | 'mod-wheel' | 'aftertouch';
  value: number;
  sampleOffset: number;
}

export type CollisionEvent = NoteEvent | ControlEvent;
