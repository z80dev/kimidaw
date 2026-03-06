/**
 * AI Features Module
 * 
 * Smart features for the DAW:
 * - Auto-mastering
 * - Smart comping
 * - Drum replacement
 * - Smart quantize
 */

// Auto Mastering
export type {
  AudioAnalysis,
  MasteringSettings,
  MasteringPreset,
  GenrePreset,
  AutoMasteringEngine,
} from './AutoMastering.js';

export {
  createAutoMasteringEngine,
} from './AutoMastering.js';

// Smart Comping
export type {
  Take,
  MidiTakeData,
  TakeAnalysis,
  CompSelection,
  CompLane,
  CompSuggestion,
  CompCriteria,
  SmartCompingEngine,
  ComparisonResult,
} from './SmartComping.js';

export {
  createSmartCompingEngine,
} from './SmartComping.js';

// Drum Replacement
export type {
  DrumHit,
  DrumType,
  DrumReplacementSettings,
  DetectedPattern,
  ReplacementResult,
  DrumReplacementEngine,
} from './DrumReplacement.js';

export {
  createDrumReplacementEngine,
} from './DrumReplacement.js';

// Smart Quantize
export type {
  QuantizeStrength,
  QuantizeGrid,
  QuantizeSettings,
  NoteEvent,
  QuantizedNote,
  GrooveTemplate,
  QuantizeResult,
  SmartQuantizeEngine,
  TimingAnalysis,
} from './SmartQuantize.js';

export {
  createSmartQuantizeEngine,
  BUILT_IN_GROOVES,
} from './SmartQuantize.js';
