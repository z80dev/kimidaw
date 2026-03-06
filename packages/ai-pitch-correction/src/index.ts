/**
 * AI Pitch Correction
 * 
 * Melodyne-style pitch correction with polyphonic support.
 * Professional-grade pitch editing for vocals and instruments.
 * 
 * @example
 * ```typescript
 * import { createPitchCorrector } from '@daw/ai-pitch-correction';
 * 
 * const corrector = await createPitchCorrector({
 *   algorithm: 'polyphonic',
 *   preserveFormants: true
 * });
 * 
 * const analysis = await corrector.analyze(audioBuffer);
 * const notes = analysis.getNotes();
 * 
 * // Correct to scale
 * await corrector.correctToScale(analysis, {
 *   root: 'C',
 *   scale: 'major',
 *   strength: 0.8
 * });
 * 
 * const corrected = await corrector.render(analysis);
 * ```
 */

export { createPitchCorrector, PitchCorrector } from './corrector.js';
export { PitchDetector, detectScale } from './detector.js';

// Types
export type {
  PitchAlgorithm,
  CorrectionQuality,
  PitchCorrectionConfig,
  DetectedNote,
  PitchAnalysis,
  ScaleCorrectionOptions,
  CorrectionOptions,
  Scale
} from './types.js';

export { 
  SCALES, 
  NOTE_NAMES,
  midiToNoteName,
  noteNameToMidi
} from './types.js';

// Version
export const VERSION = '1.0.0';

/**
 * Quick pitch correction to nearest semitone
 */
export async function autoTune(
  audioBuffer: AudioBuffer,
  options?: {
    strength?: number;
    preserveFormants?: boolean;
  }
): Promise<AudioBuffer> {
  const { createPitchCorrector } = await import('./corrector.js');
  
  const corrector = createPitchCorrector({
    algorithm: 'monophonic',
    preserveFormants: options?.preserveFormants ?? true
  });
  
  const analysis = await corrector.analyze(audioBuffer);
  
  // Quantize pitch
  await corrector.quantizePitch(analysis, 100); // 100 cent grid (semitones)
  
  const result = await corrector.render(analysis);
  await corrector.dispose();
  
  return result;
}

/**
 * Correct to scale
 */
export async function correctToScale(
  audioBuffer: AudioBuffer,
  root: string,
  scale: string,
  strength = 0.8
): Promise<AudioBuffer> {
  const { createPitchCorrector } = await import('./corrector.js');
  
  const corrector = createPitchCorrector({
    algorithm: 'monophonic',
    preserveFormants: true
  });
  
  const analysis = await corrector.analyze(audioBuffer);
  
  await corrector.correctToScale(analysis, {
    root,
    scale,
    strength,
    snapToNearest: true,
    preserveSlides: true
  });
  
  const result = await corrector.render(analysis);
  await corrector.dispose();
  
  return result;
}

/**
 * Create harmonies from vocal
 */
export async function createHarmonies(
  audioBuffer: AudioBuffer,
  intervals: number[] // Semitones
): Promise<AudioBuffer[]> {
  const { createPitchCorrector } = await import('./corrector.js');
  
  const corrector = createPitchCorrector({
    algorithm: 'monophonic',
    preserveFormants: true
  });
  
  const analysis = await corrector.analyze(audioBuffer);
  const harmonies: AudioBuffer[] = [];
  
  for (const interval of intervals) {
    // Shift all notes by interval
    for (const note of analysis.notes) {
      note.targetPitch = note.pitch + interval;
    }
    
    const harmony = await corrector.render(analysis);
    harmonies.push(harmony);
  }
  
  await corrector.dispose();
  return harmonies;
}
