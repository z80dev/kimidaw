/**
 * Model Manifests
 * 
 * Configuration for all supported source separation models.
 * URLs point to ONNX model files hosted on CDN.
 */

import type { ModelManifest, SeparationModel, StemType } from '../types.js';

// CDN base URL for models
const MODEL_CDN_BASE = 'https://models.daw.app/ai-source-separation';

// Stem configurations
const STEMS_4: StemType[] = ['vocals', 'drums', 'bass', 'other'];
const STEMS_5: StemType[] = ['vocals', 'drums', 'bass', 'piano', 'other'];
const STEMS_6: StemType[] = ['vocals', 'drums', 'bass', 'piano', 'guitar', 'other'];
const STEMS_2: StemType[] = ['vocals', 'instrumental'];

export const MODEL_MANIFESTS: Record<SeparationModel, ModelManifest> = {
  'demucs-v4': {
    id: 'demucs-v4',
    url: `${MODEL_CDN_BASE}/demucs-v4/demucs-v4.onnx`,
    checksum: 'sha256:abc123...', // Placeholder
    stems: STEMS_4,
    sampleRate: 44100,
    hopLength: 512,
    fftSize: 2048,
    onnxConfig: {
      backend: 'webgpu',
      threads: 4,
      simd: true
    }
  },
  
  'demucs-v4-fast': {
    id: 'demucs-v4-fast',
    url: `${MODEL_CDN_BASE}/demucs-v4-fast/demucs-v4-fast.onnx`,
    checksum: 'sha256:def456...',
    stems: STEMS_4,
    sampleRate: 44100,
    hopLength: 256,
    fftSize: 1024,
    onnxConfig: {
      backend: 'wasm',
      threads: 4,
      simd: true
    }
  },
  
  'demucs-v4-rt': {
    id: 'demucs-v4-rt',
    url: `${MODEL_CDN_BASE}/demucs-v4-rt/demucs-v4-rt.onnx`,
    checksum: 'sha256:ghi789...',
    stems: STEMS_4,
    sampleRate: 44100,
    hopLength: 128,
    fftSize: 512,
    onnxConfig: {
      backend: 'wasm',
      threads: 2,
      simd: true
    }
  },
  
  'demucs-v3': {
    id: 'demucs-v3',
    url: `${MODEL_CDN_BASE}/demucs-v3/demucs-v3.onnx`,
    checksum: 'sha256:jkl012...',
    stems: STEMS_4,
    sampleRate: 44100,
    hopLength: 512,
    fftSize: 2048,
    onnxConfig: {
      backend: 'webgpu',
      threads: 4,
      simd: true
    }
  },
  
  'spleeter-4stems': {
    id: 'spleeter-4stems',
    url: `${MODEL_CDN_BASE}/spleeter/4stems.onnx`,
    checksum: 'sha256:mno345...',
    stems: STEMS_4,
    sampleRate: 44100,
    hopLength: 1024,
    fftSize: 4096,
    onnxConfig: {
      backend: 'wasm',
      threads: 4,
      simd: true
    }
  },
  
  'spleeter-5stems': {
    id: 'spleeter-5stems',
    url: `${MODEL_CDN_BASE}/spleeter/5stems.onnx`,
    checksum: 'sha256:pqr678...',
    stems: STEMS_5,
    sampleRate: 44100,
    hopLength: 1024,
    fftSize: 4096,
    onnxConfig: {
      backend: 'wasm',
      threads: 4,
      simd: true
    }
  },
  
  'spleeter-2stems': {
    id: 'spleeter-2stems',
    url: `${MODEL_CDN_BASE}/spleeter/2stems.onnx`,
    checksum: 'sha256:stu901...',
    stems: STEMS_2,
    sampleRate: 44100,
    hopLength: 1024,
    fftSize: 4096,
    onnxConfig: {
      backend: 'wasm',
      threads: 2,
      simd: true
    }
  },
  
  'open-unmix': {
    id: 'open-unmix',
    url: `${MODEL_CDN_BASE}/open-unmix/umx.onnx`,
    checksum: 'sha256:vwx234...',
    stems: STEMS_4,
    sampleRate: 44100,
    hopLength: 512,
    fftSize: 2048,
    onnxConfig: {
      backend: 'wasm',
      threads: 4,
      simd: true
    }
  }
};

// Model metadata for UI
export const MODEL_METADATA: Record<SeparationModel, {
  name: string;
  description: string;
  quality: number; // 1-10
  speed: number; // 1-10 (higher is faster)
  size: number; // MB
  recommended: boolean;
}> = {
  'demucs-v4': {
    name: 'Demucs v4',
    description: 'Highest quality separation using hybrid transformer architecture',
    quality: 10,
    speed: 5,
    size: 150,
    recommended: true
  },
  'demucs-v4-fast': {
    name: 'Demucs v4 Fast',
    description: 'Good quality with faster processing',
    quality: 8,
    speed: 8,
    size: 80,
    recommended: false
  },
  'demucs-v4-rt': {
    name: 'Demucs v4 Real-time',
    description: 'Optimized for real-time playback with slight quality trade-off',
    quality: 7,
    speed: 9,
    size: 50,
    recommended: false
  },
  'demucs-v3': {
    name: 'Demucs v3',
    description: 'Previous generation, still excellent quality',
    quality: 9,
    speed: 4,
    size: 120,
    recommended: false
  },
  'spleeter-4stems': {
    name: 'Spleeter 4-Stem',
    description: 'Reliable 4-stem separation',
    quality: 7,
    speed: 6,
    size: 60,
    recommended: false
  },
  'spleeter-5stems': {
    name: 'Spleeter 5-Stem',
    description: 'Includes piano separation',
    quality: 7,
    speed: 5,
    size: 75,
    recommended: false
  },
  'spleeter-2stems': {
    name: 'Spleeter 2-Stem',
    description: 'Simple vocal/instrumental separation',
    quality: 6,
    speed: 9,
    size: 30,
    recommended: false
  },
  'open-unmix': {
    name: 'Open-Unmix',
    description: 'Open source benchmark model',
    quality: 7,
    speed: 5,
    size: 70,
    recommended: false
  }
};

/**
 * Get recommended model based on use case
 */
export function getRecommendedModel(useCase: 'quality' | 'speed' | 'realtime'): SeparationModel {
  switch (useCase) {
    case 'quality':
      return 'demucs-v4';
    case 'speed':
      return 'demucs-v4-fast';
    case 'realtime':
      return 'demucs-v4-rt';
    default:
      return 'demucs-v4';
  }
}

/**
 * Check if model supports specific stems
 */
export function modelSupportsStems(
  model: SeparationModel, 
  stems: StemType[]
): boolean {
  const manifest = MODEL_MANIFESTS[model];
  return stems.every(stem => manifest.stems.includes(stem));
}
