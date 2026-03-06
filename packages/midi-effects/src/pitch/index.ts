/**
 * Pitch MIDI Effect
 * 
 * Transposes, filters, and quantizes note pitches.
 * Features include note range filtering, randomization, scale quantization,
 * and octave range modes.
 * 
 * @example
 * ```typescript
 * import { Pitch } from "@daw/midi-effects/pitch";
 * 
 * const pitch = new Pitch();
 * pitch.setParameter("transpose", 12); // Up one octave
 * pitch.setParameter("lowestNote", 36); // Only allow notes above C2
 * pitch.setParameter("highestNote", 84); // Only allow notes below C6
 * 
 * // Scale quantization
 * pitch.setParameter("quantizeToScale", true);
 * pitch.setParameter("scale", "minor");
 * pitch.setParameter("scaleRoot", "A");
 * 
 * // Octave range
 * pitch.setParameter("octaveRangeEnabled", true);
 * pitch.setParameter("octaveRange", 2);
 * pitch.setParameter("rangeMode", "alternate");
 * ```
 */

export { Pitch } from "./pitch.js";
export type { PitchParams, RangeMode, PitchedNote } from "./types.js";
export { DEFAULT_PITCH_PARAMS } from "./types.js";
