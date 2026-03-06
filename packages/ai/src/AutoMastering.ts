/**
 * Auto-Mastering
 * 
 * Intelligent limiter and mastering chain settings.
 */

// ============================================================================
// Types
// ============================================================================

export interface AudioAnalysis {
  // Loudness
  lufsIntegrated: number;
  lufsShortTerm: number;
  lufsMomentary: number;
  loudnessRange: number;
  
  // Dynamics
  truePeak: number;
  dynamicRange: number;
  crestFactor: number;
  
  // Frequency
  spectralBalance: number[]; // Per octave or third-octave
  bassEnergy: number;
  midEnergy: number;
  trebleEnergy: number;
  
  // Stereo
  stereoWidth: number;
  correlation: number;
  
  // Timing
  transientsPerSecond: number;
  sustainLevel: number;
}

export interface MasteringSettings {
  limiterThreshold: number; // dB
  limiterCeiling: number; // dB (typically -1 to -0.1)
  limiterRelease: number; // ms
  
  eq: {
    enabled: boolean;
    lowShelf: { freq: number; gain: number };
    highShelf: { freq: number; gain: number };
    dips: Array<{ freq: number; q: number; gain: number }>;
  };
  
  compression: {
    enabled: boolean;
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    makeup: number;
  };
  
  stereoWidening: {
    enabled: boolean;
    amount: number;
    monoBass: boolean;
  };
  
  targetLoudness: number; // LUFS
}

export interface MasteringPreset {
  name: string;
  description: string;
  targetLoudness: number;
  targetTruePeak: number;
  targetDynamicRange: number;
  settings: MasteringSettings;
}

export type GenrePreset = 
  | 'electronic'
  | 'hip-hop'
  | 'rock'
  | 'pop'
  | 'jazz'
  | 'classical'
  | 'podcast'
  | 'streaming';

// ============================================================================
// Auto Mastering Engine
// ============================================================================

export interface AutoMasteringEngine {
  analyze(audioData: Float32Array, sampleRate: number): AudioAnalysis;
  suggestSettings(analysis: AudioAnalysis, genre?: GenrePreset): MasteringSettings;
  applySettings(settings: MasteringSettings, audioData: Float32Array): Float32Array;
  getPresets(): MasteringPreset[];
  getPresetForGenre(genre: GenrePreset): MasteringPreset;
}

export function createAutoMasteringEngine(): AutoMasteringEngine {
  function analyze(audioData: Float32Array, sampleRate: number): AudioAnalysis {
    // Calculate basic statistics
    let sum = 0;
    let sumSquared = 0;
    let peak = 0;
    let trough = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      const sample = audioData[i];
      sum += sample;
      sumSquared += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
      if (sample > 0) trough = Math.max(trough, sample);
    }
    
    const rms = Math.sqrt(sumSquared / audioData.length);
    const truePeak = peak * 1.1; // Approximation
    
    // Calculate LUFS (simplified approximation)
    const lufsIntegrated = -23 + 20 * Math.log10(rms / 0.775);
    
    // Calculate dynamic range
    const crestFactor = peak / (rms + 1e-10);
    const dynamicRange = 20 * Math.log10(crestFactor);
    
    // Analyze spectral content (simplified)
    const fftSize = 2048;
    const bassEnergy = calculateBandEnergy(audioData, sampleRate, 20, 250, fftSize);
    const midEnergy = calculateBandEnergy(audioData, sampleRate, 250, 4000, fftSize);
    const trebleEnergy = calculateBandEnergy(audioData, sampleRate, 4000, 20000, fftSize);
    
    // Estimate stereo width (mono input assumed for simplicity)
    const stereoWidth = 0;
    
    // Count transients
    const transientsPerSecond = detectTransients(audioData, sampleRate) / (audioData.length / sampleRate);
    
    return {
      lufsIntegrated,
      lufsShortTerm: lufsIntegrated,
      lufsMomentary: lufsIntegrated,
      loudnessRange: dynamicRange * 0.5,
      truePeak: 20 * Math.log10(truePeak),
      dynamicRange,
      crestFactor: 20 * Math.log10(crestFactor),
      spectralBalance: [bassEnergy, midEnergy, trebleEnergy],
      bassEnergy,
      midEnergy,
      trebleEnergy,
      stereoWidth,
      correlation: 1,
      transientsPerSecond,
      sustainLevel: rms,
    };
  }
  
  function calculateBandEnergy(
    audioData: Float32Array,
    sampleRate: number,
    lowFreq: number,
    highFreq: number,
    fftSize: number
  ): number {
    // Simplified energy calculation
    // In a real implementation, this would use FFT
    const lowSample = Math.floor((lowFreq / (sampleRate / 2)) * fftSize);
    const highSample = Math.floor((highFreq / (sampleRate / 2)) * fftSize);
    
    // Rough approximation using moving average
    let energy = 0;
    const step = Math.floor(audioData.length / fftSize);
    
    for (let i = lowSample; i < highSample && i * step < audioData.length; i++) {
      const sample = audioData[i * step];
      energy += sample * sample;
    }
    
    return Math.sqrt(energy / Math.max(1, highSample - lowSample));
  }
  
  function detectTransients(audioData: Float32Array, sampleRate: number): number {
    const windowSize = Math.floor(sampleRate * 0.01); // 10ms
    const threshold = 0.1;
    let transients = 0;
    let prevEnergy = 0;
    
    for (let i = 0; i < audioData.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += audioData[i + j] * audioData[i + j];
      }
      energy = Math.sqrt(energy / windowSize);
      
      if (energy > prevEnergy * (1 + threshold) && energy > 0.01) {
        transients++;
      }
      prevEnergy = energy * 0.9 + energy * 0.1;
    }
    
    return transients;
  }
  
  function suggestSettings(analysis: AudioAnalysis, genre?: GenrePreset): MasteringSettings {
    const preset = genre ? getPresetForGenre(genre) : MASTERING_PRESETS[0];
    
    // Adjust based on analysis
    const targetLoudness = preset.targetLoudness;
    const gainNeeded = targetLoudness - analysis.lufsIntegrated;
    
    // Calculate limiter threshold
    const limiterThreshold = analysis.truePeak > -1 
      ? analysis.truePeak - 0.5 
      : -6;
    
    // Adjust EQ based on spectral balance
    const totalEnergy = analysis.bassEnergy + analysis.midEnergy + analysis.trebleEnergy;
    const bassRatio = analysis.bassEnergy / totalEnergy;
    const trebleRatio = analysis.trebleEnergy / totalEnergy;
    
    const settings: MasteringSettings = {
      ...preset.settings,
      targetLoudness,
      limiterThreshold,
      limiterCeiling: -1.0,
      limiterRelease: analysis.transientsPerSecond > 5 ? 50 : 150,
      eq: {
        ...preset.settings.eq,
        lowShelf: {
          freq: 100,
          gain: bassRatio < 0.3 ? 2 : bassRatio > 0.4 ? -2 : 0,
        },
        highShelf: {
          freq: 10000,
          gain: trebleRatio < 0.2 ? 1.5 : trebleRatio > 0.3 ? -1.5 : 0,
        },
      },
      compression: {
        ...preset.settings.compression,
        threshold: analysis.dynamicRange > 15 ? -18 : -12,
        ratio: analysis.dynamicRange > 20 ? 2.5 : 2,
      },
    };
    
    return settings;
  }
  
  function applySettings(settings: MasteringSettings, audioData: Float32Array): Float32Array {
    // This is a placeholder - real implementation would use Web Audio API
    // or WASM for actual audio processing
    
    const result = new Float32Array(audioData.length);
    
    // Simple gain staging
    const gainDb = settings.targetLoudness + 14; // Rough approximation
    const gain = Math.pow(10, gainDb / 20);
    
    for (let i = 0; i < audioData.length; i++) {
      result[i] = audioData[i] * gain;
      
      // Soft limiting
      if (result[i] > 0.99) {
        result[i] = 0.99 + (result[i] - 0.99) * 0.1;
      } else if (result[i] < -0.99) {
        result[i] = -0.99 + (result[i] + 0.99) * 0.1;
      }
    }
    
    return result;
  }
  
  function getPresets(): MasteringPreset[] {
    return [...MASTERING_PRESETS];
  }
  
  function getPresetForGenre(genre: GenrePreset): MasteringPreset {
    const presetMap: Record<GenrePreset, string> = {
      electronic: 'Electronic',
      'hip-hop': 'Hip-Hop',
      rock: 'Rock',
      pop: 'Pop',
      jazz: 'Jazz',
      classical: 'Classical',
      podcast: 'Podcast/Speech',
      streaming: 'Streaming',
    };
    
    return MASTERING_PRESETS.find(p => p.name === presetMap[genre]) || MASTERING_PRESETS[0];
  }
  
  return {
    analyze,
    suggestSettings,
    applySettings,
    getPresets,
    getPresetForGenre,
  };
}

// ============================================================================
// Mastering Presets
// ============================================================================

const MASTERING_PRESETS: MasteringPreset[] = [
  {
    name: 'Streaming',
    description: 'Optimized for streaming platforms (-14 LUFS)',
    targetLoudness: -14,
    targetTruePeak: -1,
    targetDynamicRange: 10,
    settings: {
      limiterThreshold: -6,
      limiterCeiling: -1,
      limiterRelease: 100,
      eq: {
        enabled: true,
        lowShelf: { freq: 100, gain: 0 },
        highShelf: { freq: 10000, gain: 0.5 },
        dips: [],
      },
      compression: {
        enabled: true,
        threshold: -16,
        ratio: 2,
        attack: 10,
        release: 100,
        makeup: 3,
      },
      stereoWidening: {
        enabled: true,
        amount: 0.1,
        monoBass: true,
      },
      targetLoudness: -14,
    },
  },
  {
    name: 'Electronic',
    description: 'Punchy and loud for electronic music',
    targetLoudness: -8,
    targetTruePeak: -0.5,
    targetDynamicRange: 8,
    settings: {
      limiterThreshold: -8,
      limiterCeiling: -0.5,
      limiterRelease: 50,
      eq: {
        enabled: true,
        lowShelf: { freq: 80, gain: 1.5 },
        highShelf: { freq: 12000, gain: 1 },
        dips: [{ freq: 300, q: 1.5, gain: -1.5 }],
      },
      compression: {
        enabled: true,
        threshold: -14,
        ratio: 3,
        attack: 5,
        release: 60,
        makeup: 4,
      },
      stereoWidening: {
        enabled: true,
        amount: 0.2,
        monoBass: true,
      },
      targetLoudness: -8,
    },
  },
  {
    name: 'Hip-Hop',
    description: 'Heavy bass with controlled dynamics',
    targetLoudness: -9,
    targetTruePeak: -0.5,
    targetDynamicRange: 9,
    settings: {
      limiterThreshold: -8,
      limiterCeiling: -0.5,
      limiterRelease: 60,
      eq: {
        enabled: true,
        lowShelf: { freq: 60, gain: 2.5 },
        highShelf: { freq: 10000, gain: 0.5 },
        dips: [{ freq: 250, q: 1.2, gain: -2 }],
      },
      compression: {
        enabled: true,
        threshold: -14,
        ratio: 3.5,
        attack: 3,
        release: 50,
        makeup: 4,
      },
      stereoWidening: {
        enabled: false,
        amount: 0,
        monoBass: true,
      },
      targetLoudness: -9,
    },
  },
  {
    name: 'Rock',
    description: 'Dynamic with punchy transients',
    targetLoudness: -11,
    targetTruePeak: -0.8,
    targetDynamicRange: 11,
    settings: {
      limiterThreshold: -8,
      limiterCeiling: -0.8,
      limiterRelease: 80,
      eq: {
        enabled: true,
        lowShelf: { freq: 100, gain: 1 },
        highShelf: { freq: 8000, gain: 1.5 },
        dips: [{ freq: 400, q: 2, gain: -1 }],
      },
      compression: {
        enabled: true,
        threshold: -16,
        ratio: 2.5,
        attack: 15,
        release: 120,
        makeup: 3,
      },
      stereoWidening: {
        enabled: true,
        amount: 0.15,
        monoBass: true,
      },
      targetLoudness: -11,
    },
  },
  {
    name: 'Podcast/Speech',
    description: 'Clear vocals with consistent levels',
    targetLoudness: -16,
    targetTruePeak: -1,
    targetDynamicRange: 12,
    settings: {
      limiterThreshold: -10,
      limiterCeiling: -1,
      limiterRelease: 150,
      eq: {
        enabled: true,
        lowShelf: { freq: 100, gain: -1.5 },
        highShelf: { freq: 8000, gain: 0.5 },
        dips: [{ freq: 200, q: 2, gain: -2 }],
      },
      compression: {
        enabled: true,
        threshold: -20,
        ratio: 3,
        attack: 5,
        release: 200,
        makeup: 5,
      },
      stereoWidening: {
        enabled: false,
        amount: 0,
        monoBass: true,
      },
      targetLoudness: -16,
    },
  },
];
