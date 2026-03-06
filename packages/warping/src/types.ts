/**
 * Warping types for audio time-stretching and pitch-shifting
 */

// ============================================================================
// Warp Modes
// ============================================================================

export type WarpMode =
  | 'beats'
  | 'tones'
  | 'texture'
  | 're-pitch'
  | 'complex'
  | 'complex-pro'
  | 'slice'
  | 'stutter';

export const WARP_MODES: WarpMode[] = [
  'beats',
  'tones',
  'texture',
  're-pitch',
  'complex',
  'complex-pro',
  'slice',
  'stutter',
];

// ============================================================================
// Beats Mode Settings
// ============================================================================

export type BeatsPreserve = '1/4' | '1/8' | '1/16' | '1/32' | 'transients';
export type BeatsLoop = 'off' | 'forward' | 'forward-reverse';

export interface BeatsSettings {
  preserve: BeatsPreserve;
  loop: BeatsLoop;
  envelope: number; // 0-100
}

export const DEFAULT_BEATS_SETTINGS: BeatsSettings = {
  preserve: 'transients',
  loop: 'off',
  envelope: 50,
};

// ============================================================================
// Tones Mode Settings
// ============================================================================

export interface TonesSettings {
  grainSize: number; // 10-150ms
}

export const DEFAULT_TONES_SETTINGS: TonesSettings = {
  grainSize: 75,
};

// ============================================================================
// Texture Mode Settings
// ============================================================================

export interface TextureSettings {
  grainSize: number; // 2-100ms
  flux: number; // 0-100, random grain positioning
}

export const DEFAULT_TEXTURE_SETTINGS: TextureSettings = {
  grainSize: 50,
  flux: 25,
};

// ============================================================================
// Complex/Complex Pro Settings
// ============================================================================

export interface ComplexSettings {
  formantPreserve: boolean;
  envelopePreserve: boolean;
}

export const DEFAULT_COMPLEX_SETTINGS: ComplexSettings = {
  formantPreserve: true,
  envelopePreserve: true,
};

// ============================================================================
// Slice Mode Settings
// ============================================================================

export type SlicePreserve = '1/4' | '1/8' | '1/16' | '1/32' | 'transients' | 'manual' | 'auto';
export type SlicePlayback = 'mono' | 'poly' | 'through';

export interface SliceSettings {
  preserve: SlicePreserve;
  playback: SlicePlayback;
  slices?: Slice[];
}

export const DEFAULT_SLICE_SETTINGS: SliceSettings = {
  preserve: 'transients',
  playback: 'mono',
};

// ============================================================================
// Slice Definition
// ============================================================================

export interface Slice {
  id: string;
  start: number; // samples
  end: number; // samples
  rootNote?: number; // MIDI note number for chromatic playback
}

// ============================================================================
// Stutter Mode Settings
// ============================================================================

export interface StutterSettings {
  sliceSize: number; // in ms
  repeats: number; // 1-16
  randomize: number; // 0-100
}

export const DEFAULT_STUTTER_SETTINGS: StutterSettings = {
  sliceSize: 50,
  repeats: 4,
  randomize: 0,
};

// ============================================================================
// Warp Marker
// ============================================================================

export interface WarpMarker {
  id: string;
  samplePosition: number; // position in source audio (samples)
  beatPosition: number; // position in musical time (beats)
}

// ============================================================================
// Transient
// ============================================================================

export interface Transient {
  id: string;
  position: number; // sample position
  strength: number; // 0-1
}

// ============================================================================
// Warp State
// ============================================================================

export interface WarpState {
  enabled: boolean;
  mode: WarpMode;
  settings:
    | BeatsSettings
    | TonesSettings
    | TextureSettings
    | ComplexSettings
    | SliceSettings
    | StutterSettings
    | Record<string, never>; // for re-pitch (no settings)
  markers: WarpMarker[];
  transients: Transient[];
  originalTempo: number;
  targetTempo: number;
  detune: number; // cents
}

export const DEFAULT_WARP_STATE: WarpState = {
  enabled: true,
  mode: 'complex',
  settings: { ...DEFAULT_COMPLEX_SETTINGS },
  markers: [],
  transients: [],
  originalTempo: 120,
  targetTempo: 120,
  detune: 0,
};

// ============================================================================
// Processing Options
// ============================================================================

export interface WarpProcessingOptions {
  sampleRate: number;
  blockSize: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export const DEFAULT_PROCESSING_OPTIONS: WarpProcessingOptions = {
  sampleRate: 44100,
  blockSize: 512,
  quality: 'high',
};

// ============================================================================
// Analysis Results
// ============================================================================

export interface TransientAnalysisResult {
  transients: Transient[];
  suggestedTempo: number;
  confidence: number;
}

export interface BeatGridResult {
  beats: number[]; // sample positions
  bars: number[]; // sample positions
  downbeats: number[]; // sample positions
}

// ============================================================================
// Phase Vocoder Settings
// ============================================================================

export interface PhaseVocoderSettings {
  windowSize: number;
  hopSize: number;
  fftSize: number;
}

export const DEFAULT_PHASE_VOCODER_SETTINGS: PhaseVocoderSettings = {
  windowSize: 2048,
  hopSize: 512,
  fftSize: 2048,
};

// ============================================================================
// Granular Engine Settings
// ============================================================================

export interface GranularEngineSettings {
  grainSize: number; // ms
  grainDensity: number; // grains per second
  windowType: 'hann' | 'hamming' | 'blackman' | 'gaussian';
  overlap: number; // 0-1
}

export const DEFAULT_GRANULAR_SETTINGS: GranularEngineSettings = {
  grainSize: 100,
  grainDensity: 50,
  windowType: 'hann',
  overlap: 0.5,
};

// ============================================================================
// Event Types
// ============================================================================

export type WarpEventType = 
  | 'marker-added'
  | 'marker-removed'
  | 'marker-moved'
  | 'transient-detected'
  | 'analysis-complete'
  | 'processing-start'
  | 'processing-complete'
  | 'error';

export interface WarpEvent {
  type: WarpEventType;
  timestamp: number;
  data?: unknown;
}

export type WarpEventHandler = (event: WarpEvent) => void;

// ============================================================================
// Audio Buffer
// ============================================================================

export interface AudioBufferData {
  sampleRate: number;
  length: number;
  duration: number;
  numberOfChannels: number;
  channelData: Float32Array[];
}
