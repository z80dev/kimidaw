/**
 * Operator FM Synthesizer
 * 
 * Ableton-style 8-operator FM synthesizer for the In-Browser DAW.
 * 
 * @example
 * ```typescript
 * import { createOperatorDefinition, OperatorInstance } from "@daw/instruments-operator";
 * 
 * // Create plugin definition
 * const definition = createOperatorDefinition();
 * 
 * // Create instance
 * const instance = await definition.createInstance({
 *   sampleRate: 48000,
 *   maxBlockSize: 128,
 *   tempo: 120,
 *   timeSigNumerator: 4,
 *   timeSigDenominator: 4,
 *   positionSamples: 0,
 *   isPlaying: false,
 *   isRecording: false,
 * });
 * ```
 */

// =============================================================================
// Main Export
// =============================================================================

export { createOperatorDefinition, OperatorInstance } from "./Operator.js";

// =============================================================================
// Types
// =============================================================================

export type {
  OperatorWaveform,
  FixedFrequencyMode,
  OperatorEnvelope,
  OperatorState,
  FilterType,
  FilterEnvelope,
  FilterState,
  LFOState,
  PitchEnvelopeState,
  OscillatorSettings,
  TimeVelocityState,
  GlideState,
  RoutingEntry,
  OperatorStateSnapshot,
} from "./types.js";

export {
  OPERATOR_ALGORITHMS,
  getAlgorithmConnections,
  getCarriers,
  createDefaultOperatorState,
  createDefaultOperatorStateSnapshot,
  generateOperatorParameters,
} from "./types.js";

// =============================================================================
// Version
// =============================================================================

export const OPERATOR_VERSION = "1.0.0";
