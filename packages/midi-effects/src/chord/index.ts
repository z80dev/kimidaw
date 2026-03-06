/**
 * Chord MIDI Effect
 * 
 * Transforms single notes into chords by adding up to 6 additional notes.
 * Includes chord memory for storing and recalling common chord shapes.
 * 
 * @example
 * ```typescript
 * import { Chord } from "@daw/midi-effects/chord";
 * 
 * const chord = new Chord();
 * chord.setParameter("monitorInput", true);
 * chord.setParameter("note0enabled", true);
 * chord.setParameter("note0shift", 4);  // Major third
 * chord.setParameter("note0velocity", 90);
 * chord.setParameter("note1enabled", true);
 * chord.setParameter("note1shift", 7);  // Perfect fifth
 * chord.setParameter("note1velocity", 90);
 * 
 * // Or use a preset
 * chord.setParameter("memoryIndex", 0); // Major chord
 * ```
 */

export { Chord } from "./chord.js";
export type { ChordParams, ChordNote, ChordMemory } from "./types.js";
export { DEFAULT_CHORD_PARAMS } from "./types.js";
