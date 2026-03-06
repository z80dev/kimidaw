/**
 * MPE Control MIDI Effect
 * 
 * Manages MPE (MIDI Polyphonic Expression) voice allocation and per-note control.
 * MPE allows independent pitch bend, slide (CC74), and pressure for each note.
 * 
 * @example
 * ```typescript
 * import { MPEControl } from "@daw/midi-effects/mpe-control";
 * 
 * const mpe = new MPEControl();
 * 
 * // Configure pitch bend range
 * mpe.setParameter("pitchBendRange", 48); // 48 semitones = 4 octaves
 * mpe.setParameter("pitchBendEnabled", true);
 * 
 * // Configure slide (CC74)
 * mpe.setParameter("slideEnabled", true);
 * mpe.setParameter("slideCurve", "exp");
 * 
 * // Configure pressure
 * mpe.setParameter("pressureEnabled", true);
 * 
 * // Voice allocation mode
 * mpe.setParameter("voiceAllocation", "round-robin");
 * 
 * // Enable MPE output
 * mpe.setParameter("mpeEnabled", true);
 * ```
 */

export { MPEControl } from "./mpe-control.js";
export type {
  MPEControlParams,
  MPEZone,
  PitchBendConfig,
  SlideConfig,
  PressureConfig,
  MPENoteState,
  MPERouting,
} from "./types.js";
export { DEFAULT_MPE_CONTROL_PARAMS } from "./types.js";
