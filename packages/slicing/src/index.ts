/**
 * Slicing package - Ableton-style "Slice to New MIDI Track"
 * 
 * Provides transient detection, beat slicing, and MIDI export
 * for converting audio into playable sliced instruments.
 * 
 * @example
 * ```typescript
 * import { TransientSlicer, BeatSlicer, MidiExporter } from '@daw/slicing';
 * 
 * // Detect transients and slice
 * const slicer = new TransientSlicer(44100, {
 *   sensitivity: 50,
 *   minTimeMs: 100,
 *   threshold: 0.1
 * });
 * 
 * const result = slicer.slice(audioBuffer);
 * 
 * // Export to MIDI
 * const exporter = new MidiExporter({
 *   startNote: 36,
 *   bpm: 120
 * });
 * 
 * const clip = exporter.exportToMidiClip(result);
 * const midiFile = exporter.createMidiFile(clip);
 * ```
 */

// Slicers
export { TransientSlicer, type TransientDetectionResult } from './transient-slicer.js';
export { BeatSlicer } from './beat-slicer.js';

// MIDI export
export { 
  MidiExporter, 
  type MidiExportOptions,
  type DrumRackOptions 
} from './midi-exporter.js';

// Types
export type {
  SliceMode,
  SlicePoint,
  SliceSettings,
  SliceBy,
  BeatDivision,
  SliceResult,
  AudioSlice,
  DrumRackPad,
  SlicedMidiClip,
  SlicedNote,
  TransientOptions,
  BeatSliceOptions,
  RegionSliceOptions
} from './types.js';

// Default export
export { TransientSlicer as default } from './transient-slicer.js';
