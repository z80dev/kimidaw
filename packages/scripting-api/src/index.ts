/**
 * @daw/scripting-api
 * 
 * User-facing scripting API for deterministic, programmable music generation.
 * 
 * This package provides a comprehensive TypeScript API for generating musical
 * content including clips, patterns, scales, chords, and automation through
 * code. All generation is deterministic based on a seed value.
 * 
 * @example
 * ```typescript
 * import { createContext, clip, pattern, scale } from '@daw/scripting-api';
 * 
 * export default function(ctx: MusicScriptContext) {
 *   // Create a bassline clip
 *   const bassClip = ctx.clip('bassline')
 *     .midi()
 *     .note('C2', 0, 960)
 *     .note('G2', 960, 960)
 *     .note('A2', 1920, 960)
 *     .note('F2', 2880, 960)
 *     .build();
 *   
 *   // Generate pattern
 *   const drumPattern = ctx.pattern()
 *     .steps(16)
 *     .euclidean(5)
 *     .velocity(100, 30)
 *     .build();
 *   
 *   return {
 *     clips: [{ trackId: 'track-1', clip: bassClip, provenance: {...} }],
 *     automation: [],
 *   };
 * }
 * ```
 */

// ============================================================================
// Core Types
// ============================================================================

export type {
  // Note and Event Types
  MidiNote,
  Velocity,
  Tick,
  Duration,
  NoteEvent,
  CCEvent,
  PitchBendEvent,
  ChannelPressureEvent,
  
  // Scale and Chord Types
  Scale,
  Chord,
  ScaleMode,
  
  // Builder Types
  PatternStep,
  Pattern,
  ClipType,
  GeneratedClip,
  MidiClip,
  AudioClip,
  HybridGeneratedClip,
  AutomationPoint,
  GeneratedAutomation,
  GeneratedScene,
  GeneratedSection,
  
  // Utility Types
  HumanizeOptions,
  VelocityFn,
  InstrumentRef,
  SampleRef,
  
  // Script Types
  ScriptModule,
  ScriptModuleResult,
  ScriptDiagnostic,
  DiagnosticLevel,
  ScriptParameterSpec,
} from './types';

// ============================================================================
// PRNG (Deterministic Random)
// ============================================================================

export type { PRNG } from './prng';
export { createPRNG, createScriptPRNG, deterministicId } from './prng';

// ============================================================================
// Scales and Chords
// ============================================================================

export {
  // Note utilities
  noteToMidi,
  midiToNote,
  midiToFrequency,
  frequencyToMidi,
  
  // Scale functions
  scale,
  scaleDegree,
  isInScale,
  quantizeToScale,
  scaleRange,
  
  // Chord functions
  chord,
  chordFromIntervals,
  invertChord,
  voiceLead,
  chordFromDegree,
  
  // Utility functions
  getAvailableScales,
  getAvailableChords,
  getIntervalName,
} from './scales';

// ============================================================================
// Euclidean Rhythms
// ============================================================================

export type { RhythmPattern } from './euclidean';
export {
  // Core function
  euclidean,
  
  // Advanced functions
  polyrhythm,
  nestedEuclidean,
  patternToOnsets,
  
  // Analysis
  density,
  evenness,
  
  // Transformations
  invertPattern,
  reversePattern,
  patternAnd,
  patternOr,
  patternXor,
  
  // Presets
  RHYTHM_PRESETS,
} from './euclidean';

// ============================================================================
// Pattern Builder
// ============================================================================

export { PatternBuilder, pattern, drumPattern, sequence } from './pattern';

// ============================================================================
// Clip Builder
// ============================================================================

export { ClipBuilder, clip } from './clip-builder';

// ============================================================================
// MusicScriptContext
// ============================================================================

export {
  MusicScriptContext,
  createContext,
  AutomationBuilder,
  SceneBuilder,
  SectionBuilder,
} from './context';

// ============================================================================
// Version
// ============================================================================

export const VERSION = '0.1.0';
