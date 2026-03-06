/**
 * AI Mastering Types
 */

export type MasteringGenre = 
  | 'electronic' 
  | 'hip-hop' 
  | 'rock' 
  | 'pop' 
  | 'jazz' 
  | 'classical'
  | 'acoustic'
  | 'podcast'
  | 'custom';

export type MasteringQuality = 'crystal' | 'warm' | 'punchy' | 'bright' | 'vintage';
export type TargetPlatform = 'spotify' | 'youtube' | 'apple' | 'club' | 'cd' | 'custom';

export interface MasteringConfig {
  genre: MasteringGenre;
  targetLoudness: number; // LUFS
  truePeakLimit: number; // dBTP, typically -1.0
  quality: MasteringQuality;
  platform: TargetPlatform;
  preserveDynamics: boolean;
  enhanceStereo: boolean;
  addAnalogCharacter: boolean;
}

export interface AudioAnalysis {
  // Loudness
  integratedLoudness: number; // LUFS
  shortTermLoudness: number[]; // LUFS over time
  momentaryLoudness: number[];
  loudnessRange: number; // LU
  
  // Dynamics
  peakLevel: number; // dB
  truePeakLevel: number; // dBTP
  crestFactor: number; // dB (peak to RMS)
  dynamicRange: number; // dB
  
  // Frequency
  spectralBalance: Float32Array; // Energy per octave
  spectralCentroid: number; // Hz
  spectralSpread: number;
  bassEnergy: number; // 20-250Hz
  midEnergy: number; // 250-4kHz
  trebleEnergy: number; // 4k-20kHz
  
  // Stereo
  stereoWidth: number; // 0-1
  stereoBalance: number; // L/R balance
  correlation: number; // -1 to 1
  
  // Problems
  issues: AudioIssue[];
  
  // Duration
  duration: number;
  sampleRate: number;
}

export interface AudioIssue {
  type: 'clipping' | 'low-dynamics' | 'harsh-freq' | 'muddy-bass' | 'thin-mids' | 'harsh-treble' | 'mono-compatibility';
  severity: 'low' | 'medium' | 'high';
  timeRange?: [number, number];
  frequencyRange?: [number, number];
  description: string;
}

export interface ProcessingStage {
  type: 'eq' | 'compressor' | 'multiband' | 'exciter' | 'imager' | 'limiter' | 'dither';
  enabled: boolean;
  params: Record<string, number>;
}

export interface MasteringChain {
  stages: ProcessingStage[];
  estimatedLoudness: number;
  estimatedPeak: number;
  reasoning: string[];
}

export interface MasteringPreset {
  id: string;
  name: string;
  genre: MasteringGenre;
  description: string;
  config: Partial<MasteringConfig>;
  chain: ProcessingChain;
}

export interface MasteringEngine {
  analyze(audioBuffer: AudioBuffer): Promise<AudioAnalysis>;
  suggestChain(analysis: AudioAnalysis): MasteringChain;
  suggestChainForReference(
    trackAnalysis: AudioAnalysis,
    referenceAnalysis: AudioAnalysis
  ): MasteringChain;
  process(audioBuffer: AudioBuffer, chain: MasteringChain): Promise<AudioBuffer>;
  quickMaster(audioBuffer: AudioBuffer, presetId: string): Promise<AudioBuffer>;
  matchReference(
    audioBuffer: AudioBuffer,
    referenceBuffer: AudioBuffer
  ): Promise<AudioBuffer>;
  getPresets(): MasteringPreset[];
  createPreset(name: string, config: Partial<MasteringConfig>): MasteringPreset;
  dispose(): Promise<void>;
}

// Platform targets
export const PLATFORM_TARGETS: Record<TargetPlatform, { lufs: number; peak: number }> = {
  spotify: { lufs: -14, peak: -1.0 },
  youtube: { lufs: -14, peak: -1.0 },
  apple: { lufs: -16, peak: -1.0 },
  club: { lufs: -8, peak: -0.5 },
  cd: { lufs: -9, peak: -0.1 },
  custom: { lufs: -14, peak: -1.0 }
};

// Genre characteristics
export const GENRE_CHARACTERISTICS: Record<MasteringGenre, {
  targetLoudness: number;
  bassBoost: number;
  trebleBoost: number;
  stereoWidth: number;
  compression: number;
}> = {
  electronic: {
    targetLoudness: -8,
    bassBoost: 2,
    trebleBoost: 1,
    stereoWidth: 0.8,
    compression: 0.7
  },
  'hip-hop': {
    targetLoudness: -9,
    bassBoost: 3,
    trebleBoost: 0.5,
    stereoWidth: 0.6,
    compression: 0.6
  },
  rock: {
    targetLoudness: -10,
    bassBoost: 1,
    trebleBoost: 2,
    stereoWidth: 0.7,
    compression: 0.5
  },
  pop: {
    targetLoudness: -9,
    bassBoost: 1.5,
    trebleBoost: 1.5,
    stereoWidth: 0.75,
    compression: 0.6
  },
  jazz: {
    targetLoudness: -16,
    bassBoost: 0,
    trebleBoost: 0.5,
    stereoWidth: 0.9,
    compression: 0.2
  },
  classical: {
    targetLoudness: -20,
    bassBoost: 0,
    trebleBoost: 0,
    stereoWidth: 0.95,
    compression: 0.1
  },
  acoustic: {
    targetLoudness: -14,
    bassBoost: 0.5,
    trebleBoost: 0.5,
    stereoWidth: 0.8,
    compression: 0.2
  },
  podcast: {
    targetLoudness: -16,
    bassBoost: 1,
    trebleBoost: 1,
    stereoWidth: 0.5,
    compression: 0.4
  },
  custom: {
    targetLoudness: -14,
    bassBoost: 0,
    trebleBoost: 0,
    stereoWidth: 0.75,
    compression: 0.4
  }
};
