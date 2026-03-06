/**
 * AI Source Separation Types
 * 
 * Type definitions for source separation using deep learning models
 * like Demucs, Spleeter, and Open-Unmix.
 */

export type StemType = 
  | 'vocals' 
  | 'drums' 
  | 'bass' 
  | 'other'
  | 'piano'
  | 'guitar'
  | 'synthesizer'
  | 'wind';

export type SeparationModel = 
  | 'demucs-v4' 
  | 'demucs-v4-fast'
  | 'demucs-v4-rt'
  | 'demucs-v3'
  | 'spleeter-4stems'
  | 'spleeter-5stems'
  | 'spleeter-2stems'
  | 'open-unmix';

export type SeparationQuality = 'draft' | 'fast' | 'high' | 'ultra';

export interface SeparationConfig {
  model: SeparationModel;
  stems: StemType[];
  quality: SeparationQuality;
  sampleRate?: number;
  useGPU?: boolean;
  batchSize?: number;
}

export interface RealtimeConfig {
  model: 'demucs-v4-rt' | 'spleeter-rt';
  latency: number; // samples
  lookahead: number; // samples
  stems: StemType[];
  sampleRate: number;
}

export interface ModelInfo {
  name: SeparationModel;
  version: string;
  supportedStems: StemType[];
  estimatedInferenceTime: number; // ms per second of audio
  modelSize: number; // MB
  quality: SeparationQuality;
  description: string;
}

export interface SeparationProgress {
  stage: 'loading' | 'preprocessing' | 'inference' | 'postprocessing' | 'complete';
  progress: number; // 0-1
  stem?: StemType;
  estimatedTimeRemaining?: number; // ms
}

export interface SeparatedStems {
  getStem(type: StemType): AudioBuffer | null;
  getAllStems(): Map<StemType, AudioBuffer>;
  mix(stems: StemType[], gains?: Partial<Record<StemType, number>>): AudioBuffer;
  duration: number;
  sampleRate: number;
  originalBuffer: AudioBuffer;
}

export interface VocalIsolationConfig {
  bleedReduction: number; // 0-1
  preserveBreath: boolean;
  deEssing: boolean;
  pitchCorrection: boolean;
  formantPreservation: number; // 0-1
}

export interface InstrumentalConfig {
  vocalRemovalStrength: number; // 0-1
  preserveBacking: boolean;
  preserveAdlibs: boolean;
  quality: 'standard' | 'high';
}

export interface SourceSeparator {
  separate(audioBuffer: AudioBuffer): Promise<SeparatedStems>;
  separateProgressive(
    audioBuffer: AudioBuffer,
    onProgress: (progress: SeparationProgress) => void
  ): Promise<SeparatedStems>;
  getModelInfo(): ModelInfo;
  warmup(): Promise<void>;
  dispose(): Promise<void>;
}

export interface RealtimeSeparator {
  initialize(): Promise<void>;
  processBlock(
    input: Float32Array[],
    output: Map<StemType, Float32Array[]>
  ): void;
  setActiveStems(stems: StemType[]): void;
  flush(): Map<StemType, Float32Array[]>;
  dispose(): Promise<void>;
}

export interface VocalIsolator {
  process(audioBuffer: AudioBuffer): Promise<AudioBuffer>;
  processStream(
    inputChunk: Float32Array,
    outputCallback: (output: Float32Array) => void
  ): void;
  configure(config: Partial<VocalIsolationConfig>): void;
  dispose(): Promise<void>;
}

export interface InstrumentalGenerator {
  process(audioBuffer: AudioBuffer): Promise<AudioBuffer>;
  configure(config: Partial<InstrumentalConfig>): void;
  dispose(): Promise<void>;
}

// ONNX Runtime specific types
export interface ONNXSessionConfig {
  backend: 'cpu' | 'webgl' | 'webgpu' | 'wasm';
  threads?: number;
  simd?: boolean;
}

export interface ModelManifest {
  id: SeparationModel;
  url: string;
  checksum: string;
  stems: StemType[];
  sampleRate: number;
  hopLength: number;
  fftSize: number;
  onnxConfig: ONNXSessionConfig;
}
