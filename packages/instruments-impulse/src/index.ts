/**
 * Impulse Drum Sampler
 * 
 * Ableton-style 8-slot drum sampler.
 * 
 * @example
 * ```typescript
 * import { createImpulseDefinition, ImpulseInstance } from "@daw/instruments-impulse";
 * 
 * const definition = createImpulseDefinition();
 * const instance = await definition.createInstance(context);
 * 
 * // Load samples
 * instance.loadSample(0, [kickSampleData], 48000);
 * instance.loadSample(1, [snareSampleData], 48000);
 * ```
 */

export { createImpulseDefinition, ImpulseInstance } from "./Impulse.js";

export type {
  SampleSlot,
  ImpulseGlobalSettings,
  ImpulseStateSnapshot,
} from "./types.js";

export {
  generateImpulseParameters,
  createDefaultImpulseState,
} from "./types.js";

export const IMPULSE_VERSION = "1.0.0";
