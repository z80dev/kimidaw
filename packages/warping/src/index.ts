/**
 * @daw/warping - Advanced Audio Warping and Time-Stretching
 * 
 * Comprehensive warping system matching Ableton Live's capabilities.
 * Provides multiple warp modes for different audio materials.
 * 
 * @example
 * ```typescript
 * import {
 *   createWarpEngine,
 *   createTransientDetector,
 *   WarpMode,
 * } from "@daw/warping";
 * 
 * // Create warp engine
 * const warper = createWarpEngine({
 *   mode: 'complex',
 *   originalTempo: 120,
 *   targetTempo: 128,
 * });
 * 
 * // Analyze audio for transients
 * const detector = createTransientDetector();
 * const analysis = detector.detect(audioBuffer);
 * 
 * // Process audio
 * warper.setTransients(analysis.transients);
 * warper.process(input, output);
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  WarpMode,
  BeatsPreserve,
  BeatsLoop,
  BeatsSettings,
  TonesSettings,
  TextureSettings,
  ComplexSettings,
  SlicePreserve,
  SlicePlayback,
  SliceSettings,
  Slice,
  StutterSettings,
  WarpMarker,
  Transient,
  WarpState,
  WarpProcessingOptions,
  TransientAnalysisResult,
  BeatGridResult,
  PhaseVocoderSettings,
  GranularEngineSettings,
  WarpEvent,
  WarpEventType,
  WarpEventHandler,
  AudioBufferData,
} from './types.js';

export {
  WARP_MODES,
  DEFAULT_BEATS_SETTINGS,
  DEFAULT_TONES_SETTINGS,
  DEFAULT_TEXTURE_SETTINGS,
  DEFAULT_COMPLEX_SETTINGS,
  DEFAULT_SLICE_SETTINGS,
  DEFAULT_STUTTER_SETTINGS,
  DEFAULT_WARP_STATE,
  DEFAULT_PROCESSING_OPTIONS,
  DEFAULT_PHASE_VOCODER_SETTINGS,
  DEFAULT_GRANULAR_SETTINGS,
} from './types.js';

// ============================================================================
// Core Engine
// ============================================================================

export {
  createWarpEngine,
  type WarpEngine,
  type WarpEngineOptions,
} from './warp-engine.js';

// ============================================================================
// Warp Modes
// ============================================================================

export {
  createBeatsProcessor,
  type BeatsProcessor,
} from './granular-engine.js';

export {
  createTonesProcessor,
  type TonesProcessor,
} from './warp-modes/tones.js';

export {
  createTextureProcessor,
  type TextureProcessor,
} from './warp-modes/texture.js';

export {
  createRePitchProcessor,
  type RePitchProcessor,
} from './warp-modes/repitch.js';

export {
  createComplexProcessor,
  type ComplexProcessor,
} from './warp-modes/complex.js';

export {
  createComplexProProcessor,
  type ComplexProProcessor,
} from './warp-modes/complex-pro.js';

export {
  createStutterProcessor,
  createStutterTrigger,
  type StutterProcessor,
  type StutterTrigger,
} from './warp-modes/stutter.js';

// ============================================================================
// Phase Vocoder
// ============================================================================

export {
  createPhaseVocoder,
  type PhaseVocoder,
} from './phase-vocoder.js';

// ============================================================================
// Granular Engine
// ============================================================================

export {
  createGranularEngine,
  createGrainWindow,
  type Grain,
  type GranularEngine,
} from './granular-engine.js';

// ============================================================================
// Transient Detection
// ============================================================================

export {
  createTransientDetector,
  type TransientDetector,
  type TransientDetectorOptions,
} from './transient-detector.js';

// ============================================================================
// Slicing Engine
// ============================================================================

export {
  createSlicingEngine,
  createChromaticSampler,
  type SlicingEngine,
  type ChromaticSampler,
} from './slicing-engine.js';

// ============================================================================
// Warp Markers
// ============================================================================

export {
  createWarpMarkerManager,
  createWarpGrid,
  type WarpMarkerManager,
  type WarpGrid,
  type GridLine,
} from './warp-markers.js';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate time stretch ratio from tempo change
 */
export function tempoToRatio(originalTempo: number, targetTempo: number): number {
  return originalTempo / targetTempo;
}

/**
 * Calculate tempo from time stretch ratio
 */
export function ratioToTempo(originalTempo: number, ratio: number): number {
  return originalTempo / ratio;
}

/**
 * Convert semitones to playback rate ratio
 */
export function semitonesToRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/**
 * Convert playback rate ratio to semitones
 */
export function ratioToSemitones(ratio: number): number {
  return 12 * Math.log2(ratio);
}

/**
 * Create a simple grain window (Hann)
 */
function createGrainWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return window;
}

export { createGrainWindow };

// ============================================================================
// Version
// ============================================================================

export const VERSION = '0.1.0';
