/**
 * AI Mastering
 * 
 * Professional-grade automatic mastering engine.
 * 
 * @example
 * ```typescript
 * import { createMasteringEngine } from '@daw/ai-mastering';
 * 
 * const engine = await createMasteringEngine({
 *   genre: 'electronic',
 *   targetLoudness: -14,
 *   platform: 'spotify'
 * });
 * 
 * // Quick master
 * const mastered = await engine.quickMaster(mixBuffer, 'electronic-loud');
 * 
 * // Or custom chain
 * const analysis = await engine.analyze(mixBuffer);
 * const chain = engine.suggestChain(analysis);
 * const mastered = await engine.process(mixBuffer, chain);
 * ```
 */

export { createMasteringEngine, MasteringEngineImpl } from './engine.js';
export { MasteringAnalyzer } from './analyzer.js';

// Types
export type {
  MasteringGenre,
  MasteringQuality,
  TargetPlatform,
  MasteringConfig,
  AudioAnalysis,
  AudioIssue,
  ProcessingStage,
  MasteringChain,
  MasteringPreset,
  MasteringEngine
} from './types.js';

export { PLATFORM_TARGETS, GENRE_CHARACTERISTICS } from './types.js';

// Version
export const VERSION = '1.0.0';

/**
 * Quick master with default settings
 */
export async function quickMaster(
  audioBuffer: AudioBuffer,
  genre: MasteringGenre = 'electronic'
): Promise<AudioBuffer> {
  const { createMasteringEngine } = await import('./engine.js');
  
  const engine = createMasteringEngine({ genre });
  const result = await engine.quickMaster(audioBuffer, `${genre}-standard`);
  await engine.dispose();
  
  return result;
}

/**
 * Match loudness to streaming standard
 */
export async function normalizeLoudness(
  audioBuffer: AudioBuffer,
  platform: TargetPlatform = 'spotify'
): Promise<AudioBuffer> {
  const { createMasteringEngine } = await import('./engine.js');
  const { PLATFORM_TARGETS } = await import('./types.js');
  
  const target = PLATFORM_TARGETS[platform];
  
  const engine = createMasteringEngine({
    targetLoudness: target.lufs,
    truePeakLimit: target.peak,
    platform
  });
  
  const analysis = await engine.analyze(audioBuffer);
  const chain = engine.suggestChain(analysis);
  const result = await engine.process(audioBuffer, chain);
  
  await engine.dispose();
  return result;
}

/**
 * Match reference track
 */
export async function matchReference(
  audioBuffer: AudioBuffer,
  referenceBuffer: AudioBuffer
): Promise<AudioBuffer> {
  const { createMasteringEngine } = await import('./engine.js');
  
  const engine = createMasteringEngine();
  const result = await engine.matchReference(audioBuffer, referenceBuffer);
  await engine.dispose();
  
  return result;
}
