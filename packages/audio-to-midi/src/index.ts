/**
 * Audio-to-MIDI conversion package
 * Convert audio to MIDI notes like Ableton's audio-to-MIDI features
 * 
 * @example
 * ```typescript
 * import { AudioToMidiConverter, ConversionMode } from '@daw/audio-to-midi';
 * 
 * const converter = new AudioToMidiConverter(44100, {
 *   mode: 'melody',
 *   sensitivity: 50
 * });
 * 
 * const result = await converter.convert(audioBuffer, (progress) => {
 *   console.log(`${progress.stage}: ${progress.progress}%`);
 * });
 * 
 * console.log(`Detected ${result.notes.length} notes`);
 * ```
 */

// Main converter
export { AudioToMidiConverter, type ProgressCallback, type ConversionProgress } from './converter.js';

// Detectors
export { DrumDetector, type DrumDetectionResult } from './drum-detector.js';
export { MelodyDetector, type MelodyDetectionResult } from './melody-detector.js';
export { HarmonyDetector, type HarmonyDetectionResult } from './harmony-detector.js';

// Types
export type {
  ConversionMode,
  ConversionOptions,
  ConversionResult,
  DetectedNote,
  DetectedDrumHit,
  DetectedChord,
  DrumClass,
  ChordType,
  OnsetEvent,
  AnalysisWindow
} from './types.js';

// Default export
export { AudioToMidiConverter as default } from './converter.js';
