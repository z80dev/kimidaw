/**
 * Source Separator Implementation
 * 
 * Main implementation using ONNX Runtime Web for deep learning inference.
 * Supports Demucs, Spleeter, and Open-Unmix models.
 */

import type { 
  SeparationConfig, 
  SourceSeparator, 
  SeparatedStems,
  SeparationProgress,
  ModelInfo,
  StemType,
  ModelManifest 
} from './types.js';
import { preprocessAudio, postprocessAudio, stft, istft } from './utils/audio-processing.js';
import { createONNXSession, runInference } from './utils/onnx-runtime.js';
import { MODEL_MANIFESTS } from './models/manifests.js';

interface ONNXSession {
  run(inputs: Record<string, Tensor>): Promise<Record<string, Tensor>>;
  release(): Promise<void>;
}

interface Tensor {
  data: Float32Array;
  dims: number[];
}

class SeparatedStemsImpl implements SeparatedStems {
  private stems: Map<StemType, AudioBuffer>;
  
  constructor(
    stems: Map<StemType, AudioBuffer>,
    public readonly originalBuffer: AudioBuffer
  ) {
    this.stems = stems;
  }
  
  get duration(): number {
    return this.originalBuffer.duration;
  }
  
  get sampleRate(): number {
    return this.originalBuffer.sampleRate;
  }
  
  getStem(type: StemType): AudioBuffer | null {
    return this.stems.get(type) || null;
  }
  
  getAllStems(): Map<StemType, AudioBuffer> {
    return new Map(this.stems);
  }
  
  mix(
    stems: StemType[], 
    gains: Partial<Record<StemType, number>> = {}
  ): AudioBuffer {
    if (stems.length === 0) {
      throw new Error('At least one stem must be specified for mixing');
    }
    
    const reference = this.getStem(stems[0])!;
    const { sampleRate, length, numberOfChannels } = reference;
    
    // Create output buffer
    const audioContext = new OfflineAudioContext(
      numberOfChannels,
      length,
      sampleRate
    );
    
    const outputBuffer = audioContext.createBuffer(
      numberOfChannels,
      length,
      sampleRate
    );
    
    // Mix stems
    for (const stem of stems) {
      const stemBuffer = this.getStem(stem);
      if (!stemBuffer) continue;
      
      const gain = gains[stem] ?? 1.0;
      
      for (let ch = 0; ch < numberOfChannels; ch++) {
        const stemData = stemBuffer.getChannelData(ch);
        const outputData = outputBuffer.getChannelData(ch);
        
        for (let i = 0; i < length; i++) {
          outputData[i] += stemData[i] * gain;
        }
      }
    }
    
    return outputBuffer;
  }
}

export class SourceSeparatorImpl implements SourceSeparator {
  private config: SeparationConfig;
  private session: ONNXSession | null = null;
  private manifest: ModelManifest;
  private audioContext: AudioContext | null = null;
  private isDisposed = false;
  
  constructor(config: SeparationConfig) {
    this.config = { 
      sampleRate: 44100,
      useGPU: true,
      batchSize: 1,
      ...config 
    };
    
    const manifest = MODEL_MANIFESTS[config.model];
    if (!manifest) {
      throw new Error(`Unknown model: ${config.model}`);
    }
    
    this.manifest = manifest;
  }
  
  async warmup(): Promise<void> {
    if (this.isDisposed) throw new Error('Separator has been disposed');
    
    // Initialize ONNX session
    this.session = await createONNXSession(
      this.manifest.url,
      this.manifest.onnxConfig
    );
    
    // Run a dummy inference to warm up
    const dummyLength = this.manifest.hopLength * 4;
    const dummyInput = new Float32Array(dummyLength);
    await this.runInference(dummyInput, [1, 2, dummyLength]);
  }
  
  async separate(audioBuffer: AudioBuffer): Promise<SeparatedStems> {
    return this.separateProgressive(audioBuffer, () => {});
  }
  
  async separateProgressive(
    audioBuffer: AudioBuffer,
    onProgress: (progress: SeparationProgress) => void
  ): Promise<SeparatedStems> {
    if (this.isDisposed) throw new Error('Separator has been disposed');
    
    // Initialize if needed
    if (!this.session) {
      onProgress({ stage: 'loading', progress: 0 });
      await this.warmup();
    }
    
    onProgress({ stage: 'preprocessing', progress: 0 });
    
    // Resample if needed
    const targetSampleRate = this.manifest.sampleRate;
    let processedBuffer = audioBuffer;
    
    if (audioBuffer.sampleRate !== targetSampleRate) {
      processedBuffer = await this.resampleBuffer(audioBuffer, targetSampleRate);
    }
    
    // Preprocess: STFT
    const { magnitude, phase, originalShape } = await preprocessAudio(
      processedBuffer,
      this.manifest.fftSize,
      this.manifest.hopLength,
      (progress) => onProgress({ 
        stage: 'preprocessing', 
        progress: progress * 0.5 
      })
    );
    
    onProgress({ stage: 'inference', progress: 0 });
    
    // Run inference for each stem
    const stems = new Map<StemType, AudioBuffer>();
    const totalStems = this.config.stems.length;
    
    for (let i = 0; i < totalStems; i++) {
      const stem = this.config.stems[i];
      
      onProgress({ 
        stage: 'inference', 
        progress: i / totalStems,
        stem,
        estimatedTimeRemaining: (totalStems - i) * 500
      });
      
      const stemMagnitude = await this.inferStem(magnitude, stem);
      
      onProgress({ 
        stage: 'postprocessing', 
        progress: 0,
        stem 
      });
      
      // Inverse STFT
      const stemAudio = await postprocessAudio(
        stemMagnitude,
        phase,
        this.manifest.fftSize,
        this.manifest.hopLength,
        originalShape
      );
      
      // Create AudioBuffer
      const stemBuffer = await this.createAudioBuffer(stemAudio, targetSampleRate);
      
      // Resample back to original if needed
      if (targetSampleRate !== audioBuffer.sampleRate) {
        const resampledStem = await this.resampleBuffer(stemBuffer, audioBuffer.sampleRate);
        stems.set(stem, resampledStem);
      } else {
        stems.set(stem, stemBuffer);
      }
    }
    
    onProgress({ stage: 'complete', progress: 1 });
    
    return new SeparatedStemsImpl(stems, audioBuffer);
  }
  
  private async inferStem(
    magnitude: Float32Array, 
    stem: StemType
  ): Promise<Float32Array> {
    if (!this.session) throw new Error('Session not initialized');
    
    // Create input tensor
    const inputTensor: Tensor = {
      data: magnitude,
      dims: [1, 1, magnitude.length] // batch, channel, time
    };
    
    // Run inference
    const outputs = await runInference(this.session, {
      input: inputTensor,
      stem
    });
    
    // Extract output
    const outputName = `output_${stem}`;
    const output = outputs[outputName] || outputs.output || Object.values(outputs)[0];
    
    return output.data;
  }
  
  private async runInference(
    input: Float32Array,
    dims: number[]
  ): Promise<Record<string, Tensor>> {
    if (!this.session) throw new Error('Session not initialized');
    
    const inputTensor: Tensor = { data: input, dims };
    return this.session.run({ input: inputTensor });
  }
  
  private async resampleBuffer(
    buffer: AudioBuffer,
    targetSampleRate: number
  ): Promise<AudioBuffer> {
    const offlineContext = new OfflineAudioContext(
      buffer.numberOfChannels,
      Math.ceil(buffer.duration * targetSampleRate),
      targetSampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start();
    
    return offlineContext.startRendering();
  }
  
  private async createAudioBuffer(
    audioData: Float32Array[],
    sampleRate: number
  ): Promise<AudioBuffer> {
    const numChannels = audioData.length;
    const length = audioData[0].length;
    
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate });
    }
    
    const buffer = this.audioContext.createBuffer(numChannels, length, sampleRate);
    
    for (let ch = 0; ch < numChannels; ch++) {
      buffer.copyToChannel(audioData[ch], ch);
    }
    
    return buffer;
  }
  
  getModelInfo(): ModelInfo {
    return {
      name: this.config.model,
      version: '4.0.0',
      supportedStems: this.manifest.stems,
      estimatedInferenceTime: this.manifest.stems.length * 300,
      modelSize: 150, // MB
      quality: this.config.quality,
      description: `ONNX model for ${this.config.model}`
    };
  }
  
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
    
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isDisposed = true;
  }
}

// Factory function
export async function createSourceSeparator(
  config: SeparationConfig
): Promise<SourceSeparator> {
  const separator = new SourceSeparatorImpl(config);
  await separator.warmup();
  return separator;
}
