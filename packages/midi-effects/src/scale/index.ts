/**
 * Scale MIDI Effect
 * 
 * Quantizes incoming notes to a selected scale. Notes outside the scale
 * can be filtered or folded back into the scale.
 * 
 * Supports 35+ scales including Major, Minor, modes, pentatonic, and more.
 * 
 * @example
 * ```typescript
 * import { Scale } from "@daw/midi-effects/scale";
 * 
 * const scale = new Scale();
 * scale.setParameter("base", "C");
 * scale.setParameter("scale", "major");
 * 
 * // Only allow notes in C major
 * scale.setParameter("fold", false);
 * 
 * // Fold out-of-scale notes back into scale
 * scale.setParameter("fold", true);
 * 
 * // Transpose output
 * scale.setParameter("transpose", 12); // Up one octave
 * 
 * // Exotic scales
 * scale.setParameter("scale", "hirajoshi");
 * scale.setParameter("scale", "phrygian-dominant");
 * ```
 */

export { Scale } from "./scale.js";
export type { ScaleParams, ScaleNoteInfo } from "./types.js";
export { DEFAULT_SCALE_PARAMS } from "./types.js";
