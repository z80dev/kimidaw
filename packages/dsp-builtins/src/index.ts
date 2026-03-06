/**
 * DSP Builtins
 * 
 * Built-in instruments and effects for the In-Browser DAW.
 * All processors are realtime-safe and designed for AudioWorklet usage.
 * 
 * @example
 * ```typescript
 * import { createSubtractiveSynthDefinition } from "@daw/dsp-builtins";
 * 
 * const synth = await createSubtractiveSynthDefinition().createInstance(context);
 * ```
 */

// =============================================================================
// Core DSP Utilities
// =============================================================================

export {
  // Base classes
  SmoothedValue,
  ADSREnvelope,
  ADSRPhase,
  BiquadFilter,
  DelayLine,
  Oscillator,
  LFO,
  VoiceBase,
  VoiceAllocator,
  
  // Math utilities
  lerp,
  cubicInterp,
  clamp,
  dbToLinear,
  linearToDb,
} from "./core/DspBase.js";

export type {
  ADSRConfig,
  FilterType,
  Waveform,
  LFOWaveform,
  Voice,
} from "./core/DspBase.js";

// =============================================================================
// Sampler
// =============================================================================

export { 
  SamplerInstance,
  createSamplerDefinition,
} from "./instruments/sampler/Sampler.js";

export type { 
  SamplerState,
  SampleLibrary,
} from "./instruments/sampler/Sampler.js";

export { 
  SampleVoice,
} from "./instruments/sampler/SampleVoice.js";

export type {
  SampleData,
  SampleVoiceConfig,
} from "./instruments/sampler/SampleVoice.js";

export { 
  ZoneMap,
  calculateVelocityCrossfade,
  createVelocityLayers,
} from "./instruments/sampler/ZoneMap.js";

export type { 
  ZoneEntry,
} from "./instruments/sampler/ZoneMap.js";

// =============================================================================
// Simpler (Enhanced)
// =============================================================================

export {
  SimplerInstance,
  createSimplerDefinition,
} from "./instruments/sampler/Simpler.js";

export type {
  SimplerState,
  SimplerSample,
  SimplerPlaybackMode,
  SimplerSliceMode,
  Slice,
} from "./instruments/sampler/Simpler.js";

// =============================================================================
// Drum Rack
// =============================================================================

export {
  DrumRackInstance,
  createDrumRackDefinition,
} from "./instruments/drumrack/DrumRack.js";

export type {
  PadState,
  SampleLibrary,
} from "./instruments/drumrack/DrumRack.js";

export {
  DrumPad,
} from "./instruments/drumrack/DrumPad.js";

export type {
  DrumPadLayer,
  DrumPadConfig,
} from "./instruments/drumrack/DrumPad.js";

// =============================================================================
// Synthesizers
// =============================================================================

export {
  SubtractiveSynthInstance,
  createSubtractiveSynthDefinition,
} from "./instruments/synths/SubtractiveSynth.js";

export {
  WavetableSynthInstance,
  createWavetableSynthDefinition,
} from "./instruments/synths/WavetableSynth.js";

export {
  FMSynthInstance,
  createFMSynthDefinition,
} from "./instruments/synths/FMSynth.js";

// =============================================================================
// External Instrument
// =============================================================================

export {
  ExternalInstrumentInstance,
  createExternalInstrumentDefinition,
} from "./instruments/ExternalInstrument.js";

export type {
  ExternalInstrumentState,
  MidiOutputDevice,
  AudioInputDevice,
  LatencyMode,
} from "./instruments/ExternalInstrument.js";

// =============================================================================
// Effects
// =============================================================================

export { EQInstance, createEQDefinition } from "./effects/EQ.js";
export { CompressorInstance, createCompressorDefinition } from "./effects/Compressor.js";
export { LimiterInstance, createLimiterDefinition } from "./effects/Limiter.js";
export { DelayInstance, createDelayDefinition } from "./effects/Delay.js";
export { ReverbInstance, createReverbDefinition } from "./effects/Reverb.js";
export { FilterEffectInstance, createFilterDefinition } from "./effects/Filter.js";
export { ChorusInstance, createChorusDefinition } from "./effects/Chorus.js";

// =============================================================================
// Version
// =============================================================================

export const DSP_BUILTINS_VERSION = "1.0.0";

// =============================================================================
// Plugin Registry Helper
// =============================================================================

import type { PluginDefinition } from "@daw/plugin-api";

/**
 * Get all built-in instrument definitions
 */
export function getAllInstrumentDefinitions(): PluginDefinition[] {
  return [
    createSamplerDefinition(),
    createSimplerDefinition(),
    createDrumRackDefinition(),
    createSubtractiveSynthDefinition(),
    createWavetableSynthDefinition(),
    createFMSynthDefinition(),
    createExternalInstrumentDefinition(),
  ];
}

/**
 * Get all built-in effect definitions
 */
export function getAllEffectDefinitions(): PluginDefinition[] {
  return [
    createEQDefinition(),
    createCompressorDefinition(),
    createLimiterDefinition(),
    createDelayDefinition(),
    createReverbDefinition(),
    createFilterDefinition(),
    createChorusDefinition(),
  ];
}

/**
 * Get all built-in plugin definitions
 */
export function getAllBuiltinDefinitions(): PluginDefinition[] {
  return [...getAllInstrumentDefinitions(), ...getAllEffectDefinitions()];
}
