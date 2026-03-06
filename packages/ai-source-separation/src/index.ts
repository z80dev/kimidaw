/**
 * AI Source Separation
 * 
 * Extract vocals, drums, bass, and other instruments from any audio
 * using state-of-the-art deep learning models (Demucs, Spleeter).
 * 
 * @example
 * ```typescript
 * import { createSourceSeparator, StemType } from '@daw/ai-source-separation';
 * 
 * const separator = await createSourceSeparator({
 *   model: 'demucs-v4',
 *   stems: ['vocals', 'drums', 'bass', 'other'],
 *   quality: 'high'
 * });
 * 
 * const result = await separator.separate(audioBuffer);
 * const vocals = result.getStem('vocals');
 * const instrumental = result.mix(['drums', 'bass', 'other']);
 * ```
 */

// Main exports
export { createSourceSeparator } from './separator.js';
export { createRealtimeSeparator } from './realtime-separator.js';
export { createVocalIsolation } from './vocal-isolation.js';
export { createInstrumentalGenerator, createKaraokeVersion, createAcapellaVersion } from './instrumental-generator.js';

// Model utilities
export { 
  MODEL_MANIFESTS, 
  MODEL_METADATA, 
  getRecommendedModel,
  modelSupportsStems 
} from './models/manifests.js';

// Types
export type {
  StemType,
  SeparationModel,
  SeparationQuality,
  SeparationConfig,
  RealtimeConfig,
  ModelInfo,
  SeparationProgress,
  SeparatedStems,
  VocalIsolationConfig,
  InstrumentalConfig,
  SourceSeparator,
  RealtimeSeparator,
  VocalIsolator,
  InstrumentalGenerator
} from './types.js';

// Version
export const VERSION = '1.0.0';

/**
 * Quick separation with default settings
 * 
 * @param audioBuffer - Input audio to separate
 * @returns Separated stems (vocals, drums, bass, other)
 * 
 * @example
 * ```typescript
 * const result = await quickSeparate(audioBuffer);
 * const vocals = result.getStem('vocals');
 * ```
 */
export async function quickSeparate(audioBuffer: AudioBuffer) {
  const { createSourceSeparator } = await import('./separator.js');
  
  const separator = await createSourceSeparator({
    model: 'demucs-v4',
    stems: ['vocals', 'drums', 'bass', 'other'],
    quality: 'high'
  });
  
  const result = await separator.separate(audioBuffer);
  
  // Don't dispose - caller should handle that
  return result;
}

/**
 * Quick vocal isolation
 * 
 * @param audioBuffer - Input audio
 * @returns Isolated vocals
 */
export async function quickIsolateVocals(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
  const { createVocalIsolation } = await import('./vocal-isolation.js');
  
  const isolator = createVocalIsolation({
    bleedReduction: 0.8,
    preserveBreath: true,
    deEssing: true
  });
  
  const result = await isolator.process(audioBuffer);
  await isolator.dispose();
  
  return result;
}

/**
 * Quick instrumental/karaoke generation
 * 
 * @param audioBuffer - Input audio
 * @returns Instrumental version
 */
export async function quickInstrumental(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
  const { createKaraokeVersion } = await import('./instrumental-generator.js');
  return createKaraokeVersion(audioBuffer);
}

/**
 * Check if the browser supports source separation
 */
export function isSeparationSupported(): boolean {
  // Check for WebAssembly
  const hasWasm = typeof WebAssembly === 'object' && 
    typeof WebAssembly.instantiate === 'function';
  
  // Check for SharedArrayBuffer (for real-time mode)
  const hasSAB = typeof SharedArrayBuffer !== 'undefined';
  
  // Check for Web Audio API
  const hasWebAudio = typeof AudioContext !== 'undefined' || 
    typeof (window as any).webkitAudioContext !== 'undefined';
  
  return hasWasm && hasWebAudio;
}

/**
 * Get separation capabilities
 */
export function getSeparationCapabilities(): {
  supported: boolean;
  realtimeSupported: boolean;
  gpuAccelerated: boolean;
  recommendedModel: string;
} {
  const supported = isSeparationSupported();
  
  // Check for WebGPU
  const hasWebGPU = typeof (navigator as any).gpu !== 'undefined';
  
  // Check for SharedArrayBuffer
  const hasSAB = typeof SharedArrayBuffer !== 'undefined';
  
  return {
    supported,
    realtimeSupported: supported && hasSAB,
    gpuAccelerated: hasWebGPU,
    recommendedModel: hasWebGPU ? 'demucs-v4' : 'demucs-v4-fast'
  };
}
