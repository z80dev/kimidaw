/**
 * Velocity MIDI Effect
 * 
 * Processes and modifies note velocities with multiple modes:
 * - Clip: Limit velocity to output range
 * - Gate: Zero out notes below threshold
 * - Fixed: Set all notes to fixed velocity
 * - Relative: Add/subtract from velocity
 * - Compand: Compress or expand dynamic range
 * 
 * @example
 * ```typescript
 * import { Velocity } from "@daw/midi-effects/velocity";
 * 
 * const vel = new Velocity();
 * vel.setParameter("mode", "compand");
 * vel.setParameter("compand", -50); // Compress
 * vel.setParameter("outLow", 20);
 * vel.setParameter("outHigh", 110);
 * 
 * // Gate mode - remove quiet notes
 * vel.setParameter("mode", "gate");
 * vel.setParameter("outLow", 40); // Notes below velocity 40 become 0
 * 
 * // Fixed velocity for drum programming
 * vel.setParameter("mode", "fixed");
 * vel.setParameter("outHigh", 100);
 * 
 * // Only affect specific note range
 * vel.setParameter("rangeLow", 36);
 * vel.setParameter("rangeHigh", 51); // Only affect kick, snare, toms
 * ```
 */

export { Velocity } from "./velocity.js";
export type { VelocityParams, VelocityMode, VelocityInfo } from "./types.js";
export { DEFAULT_VELOCITY_PARAMS } from "./types.js";
