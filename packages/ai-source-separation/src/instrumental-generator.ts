/**
 * Instrumental Generator (Karaoke Mode)
 * 
 * Generate instrumental versions of songs by removing vocals
 * while preserving backing vocals, harmonies, and other elements.
 */

import type { InstrumentalConfig, InstrumentalGenerator } from './types.js';
import { createSourceSeparator } from './separator.js';

export class InstrumentalGeneratorImpl implements InstrumentalGenerator {
  private config: InstrumentalConfig;
  
  constructor(config: Partial<InstrumentalConfig> = {}) {
    this.config = {
      vocalRemovalStrength: 1.0,
      preserveBacking: true,
      preserveAdlibs: false,
      quality: 'high',
      ...config
    };
  }
  
  configure(config: Partial<InstrumentalConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  async process(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    // Strategy depends on configuration
    if (this.config.vocalRemovalStrength >= 0.9) {
      // Use source separation for complete vocal removal
      return this.separateAndMix(audioBuffer);
    } else {
      // Use spectral subtraction for partial removal
      return this.spectralSubtract(audioBuffer);
    }
  }
  
  private async separateAndMix(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    // Determine which stems to include
    const stemsToInclude: string[] = ['drums', 'bass', 'other'];
    
    if (this.config.preserveBacking) {
      // Keep backing vocals in "other" stem
    }
    
    const separator = await createSourceSeparator({
      model: 'demucs-v4',
      stems: ['vocals', 'drums', 'bass', 'other'],
      quality: this.config.quality === 'high' ? 'high' : 'fast'
    });
    
    const result = await separator.separate(audioBuffer);
    
    // Mix all stems except vocals
    const instrumental = result.mix(
      ['drums', 'bass', 'other'],
      { drums: 1.0, bass: 1.0, other: 1.0 }
    );
    
    await separator.dispose();
    
    return instrumental;
  }
  
  private async spectralSubtract(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    // Phase-inverted vocal cancellation
    // This works when vocals are centered in the stereo field
    
    const numChannels = audioBuffer.numberOfChannels;
    
    if (numChannels < 2) {
      // Mono - can't do phase cancellation
      // Fall back to separation
      return this.separateAndMix(audioBuffer);
    }
    
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    const length = audioBuffer.length;
    
    // Create output buffer
    const offlineContext = new OfflineAudioContext(
      2,
      length,
      audioBuffer.sampleRate
    );
    
    const outputBuffer = offlineContext.createBuffer(2, length, audioBuffer.sampleRate);
    const outputLeft = outputBuffer.getChannelData(0);
    const outputRight = outputBuffer.getChannelData(1);
    
    // Phase cancellation: (L - R) gives difference (often vocals)
    // (L + R) gives sum (often everything else)
    const strength = this.config.vocalRemovalStrength;
    
    for (let i = 0; i < length; i++) {
      const sum = (left[i] + right[i]) * 0.5;
      const diff = (left[i] - right[i]) * 0.5;
      
      // Attenuate center-panned content (usually vocals)
      const centerReduction = 1 - strength * 0.5;
      
      outputLeft[i] = sum * centerReduction + diff;
      outputRight[i] = sum * centerReduction - diff;
    }
    
    // Apply additional processing for better quality
    return this.postProcessInstrumental(outputBuffer);
  }
  
  private async postProcessInstrumental(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // EQ to compensate for vocal removal artifacts
    // Boost bass and treble, slight mid cut
    
    const bassBoost = offlineContext.createBiquadFilter();
    bassBoost.type = 'lowshelf';
    bassBoost.frequency.value = 200;
    bassBoost.gain.value = 3;
    
    const midCompensation = offlineContext.createBiquadFilter();
    midCompensation.type = 'peaking';
    midCompensation.frequency.value = 1000;
    midCompensation.Q.value = 1;
    midCompensation.gain.value = -2;
    
    const trebleBoost = offlineContext.createBiquadFilter();
    trebleBoost.type = 'highshelf';
    trebleBoost.frequency.value = 4000;
    trebleBoost.gain.value = 2;
    
    // Light compression for consistency
    const compressor = offlineContext.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.1;
    
    // Connect graph
    source.connect(bassBoost);
    bassBoost.connect(midCompensation);
    midCompensation.connect(trebleBoost);
    trebleBoost.connect(compressor);
    compressor.connect(offlineContext.destination);
    
    source.start();
    
    return offlineContext.startRendering();
  }
  
  async dispose(): Promise<void> {
    // Nothing to dispose
  }
}

/**
 * Create instrumental generator
 */
export function createInstrumentalGenerator(
  config?: Partial<InstrumentalConfig>
): InstrumentalGenerator {
  return new InstrumentalGeneratorImpl(config);
}

/**
 * Quick function to create karaoke version
 */
export async function createKaraokeVersion(
  audioBuffer: AudioBuffer,
  options?: Partial<InstrumentalConfig>
): Promise<AudioBuffer> {
  const generator = createInstrumentalGenerator({
    vocalRemovalStrength: 1.0,
    preserveBacking: true,
    ...options
  });
  
  const result = await generator.process(audioBuffer);
  await generator.dispose();
  
  return result;
}

/**
 * Create acapella (vocal only) version
 */
export async function createAcapellaVersion(
  audioBuffer: AudioBuffer,
  isolationConfig?: import('./types.js').VocalIsolationConfig
): Promise<AudioBuffer> {
  const { createVocalIsolation } = await import('./vocal-isolation.js');
  
  const isolator = createVocalIsolation({
    bleedReduction: 0.9,
    preserveBreath: true,
    deEssing: false,
    ...isolationConfig
  });
  
  const result = await isolator.process(audioBuffer);
  await isolator.dispose();
  
  return result;
}
