/**
 * Random MIDI Effect
 * 
 * Randomizes note pitches with controllable probability and range.
 * Can randomize chromatically or within a selected scale.
 * 
 * @example
 * ```typescript
 * import { Random } from "@daw/midi-effects/random";
 * 
 * const random = new Random();
 * random.setParameter("chance", 75); // 75% chance to randomize
 * random.setParameter("choices", 7); // 7 possible values
 * random.setParameter("sign", "bi"); // +/- values
 * 
 * // Scale-based randomization
 * random.setParameter("scaleRandomize", true);
 * random.setParameter("scale", "pentatonic-minor");
 * random.setParameter("scaleRoot", "A");
 * ```
 */

export { Random } from "./random.js";
export type { RandomParams, SignMode, RandomizedNote } from "./types.js";
export { DEFAULT_RANDOM_PARAMS } from "./types.js";
