/**
 * Note Length MIDI Effect
 * 
 * Adjusts the duration of MIDI notes with three modes:
 * - Time: Fixed duration in milliseconds
 * - Sync: Duration synchronized to tempo
 * - Gate: Percentage of original note length
 * 
 * @example
 * ```typescript
 * import { NoteLength } from "@daw/midi-effects/note-length";
 * 
 * const noteLen = new NoteLength();
 * noteLen.setParameter("mode", "sync");
 * noteLen.setParameter("syncRate", "1/8");
 * 
 * // Or use time mode
 * noteLen.setParameter("mode", "time");
 * noteLen.setParameter("timeMs", 150);
 * 
 * // Or use gate mode to shorten/lengthen original notes
 * noteLen.setParameter("mode", "gate");
 * noteLen.setParameter("gatePercent", 50); // Half the original length
 * ```
 */

export { NoteLength } from "./note-length.js";
export type { NoteLengthParams, TriggerMode, ActiveNote } from "./types.js";
export { DEFAULT_NOTE_LENGTH_PARAMS } from "./types.js";
