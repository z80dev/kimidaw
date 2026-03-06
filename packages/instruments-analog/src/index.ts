/**
 * Analog Subtractive Synthesizer
 * 
 * Ableton-style dual oscillator subtractive synthesizer.
 * 
 * @example
 * ```typescript
 * import { createAnalogDefinition, AnalogInstance } from "@daw/instruments-analog";
 * 
 * const definition = createAnalogDefinition();
 * const instance = await definition.createInstance(context);
 * ```
 */

export { createAnalogDefinition, AnalogInstance } from "./Analog.js";

export type {
  AnalogWaveform,
  NoiseType,
  SubOctave,
  OscillatorConfig,
  SubOscillatorConfig,
  NoiseConfig,
  FilterRouting,
  AnalogFilterType,
  FilterSlope,
  FilterConfig,
  FilterEnvelopeConfig,
  FilterModulation,
  AmpEnvelopeConfig,
  ModEnvelopeConfig,
  AnalogLFOWaveform,
  AnalogLFOMode,
  LFOConfig,
  VoiceModeConfig,
  GlideConfig,
  MasterConfig,
  AnalogStateSnapshot,
} from "./types.js";

export {
  generateAnalogParameters,
  createDefaultAnalogState,
} from "./types.js";

export const ANALOG_VERSION = "1.0.0";
