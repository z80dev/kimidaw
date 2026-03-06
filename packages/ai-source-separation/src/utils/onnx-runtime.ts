/**
 * ONNX Runtime Web Integration
 * 
 * Utilities for loading and running ONNX models in the browser.
 * Supports WebGL, WebGPU, and WASM backends.
 */

import type { ONNXSessionConfig } from '../types.js';

// ONNX Runtime types
interface ONNXRuntime {
  InferenceSession: {
    create(buffer: ArrayBuffer, options?: SessionOptions): Promise<ONNXSession>;
  };
  Tensor: {
    new (type: string, data: Float32Array | number[], dims: number[]): ONNXTensor;
  };
}

interface ONNXSession {
  run(feeds: Record<string, ONNXTensor>): Promise<Record<string, ONNXTensor>>;
  release(): Promise<void>;
}

interface ONNXTensor {
  data: Float32Array;
  dims: number[];
  type: string;
}

interface SessionOptions {
  executionProviders?: string[];
  interOpNumThreads?: number;
  intraOpNumThreads?: number;
  graphOptimizationLevel?: string;
}

// Lazy-loaded ONNX runtime
let onnxRuntime: ONNXRuntime | null = null;

/**
 * Load ONNX Runtime Web
 */
async function loadONNXRuntime(): Promise<ONNXRuntime> {
  if (onnxRuntime) return onnxRuntime;
  
  // Dynamic import of ONNX Runtime Web
  const ort = await import('onnxruntime-web');
  onnxRuntime = ort as unknown as ONNXRuntime;
  
  return onnxRuntime;
}

/**
 * Create ONNX inference session
 */
export async function createONNXSession(
  modelUrl: string,
  config: ONNXSessionConfig
): Promise<ONNXSession> {
  const ort = await loadONNXRuntime();
  
  // Download model
  const response = await fetch(modelUrl);
  if (!response.ok) {
    throw new Error(`Failed to load model from ${modelUrl}: ${response.statusText}`);
  }
  
  const modelBuffer = await response.arrayBuffer();
  
  // Configure execution providers based on backend
  const executionProviders: string[] = [];
  
  switch (config.backend) {
    case 'webgpu':
      if (await isWebGPUSupported()) {
        executionProviders.push('webgpu');
      }
      break;
    case 'webgl':
      executionProviders.push('webgl');
      break;
    case 'wasm':
    case 'cpu':
    default:
      executionProviders.push('wasm');
      break;
  }
  
  // Always fallback to wasm
  if (!executionProviders.includes('wasm')) {
    executionProviders.push('wasm');
  }
  
  const options: SessionOptions = {
    executionProviders,
    interOpNumThreads: config.threads || 4,
    intraOpNumThreads: config.threads || 4,
    graphOptimizationLevel: 'all'
  };
  
  return ort.InferenceSession.create(modelBuffer, options);
}

/**
 * Check WebGPU support
 */
async function isWebGPUSupported(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  
  try {
    const adapter = await (navigator as any).gpu?.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

interface InferenceInput {
  input: {
    data: Float32Array;
    dims: number[];
  };
  stem?: string;
}

interface InferenceOutput {
  data: Float32Array;
  dims: number[];
}

/**
 * Run inference on ONNX session
 */
export async function runInference(
  session: ONNXSession,
  input: InferenceInput
): Promise<Record<string, InferenceOutput>> {
  const ort = await loadONNXRuntime();
  
  // Create input tensor
  const inputTensor = new ort.Tensor(
    'float32',
    input.input.data,
    input.input.dims
  );
  
  const feeds: Record<string, ONNXTensor> = {
    input: inputTensor
  };
  
  // Add stem selector if provided
  if (input.stem) {
    const stemIndex = getStemIndex(input.stem);
    const stemTensor = new ort.Tensor(
      'int64',
      [BigInt(stemIndex)],
      [1]
    );
    feeds.stem = stemTensor;
  }
  
  // Run inference
  const results = await session.run(feeds);
  
  // Convert to serializable format
  const output: Record<string, InferenceOutput> = {};
  
  for (const [name, tensor] of Object.entries(results)) {
    output[name] = {
      data: tensor.data as Float32Array,
      dims: tensor.dims
    };
  }
  
  return output;
}

/**
 * Get stem index for multi-output models
 */
function getStemIndex(stem: string): number {
  const stemMap: Record<string, number> = {
    'vocals': 0,
    'drums': 1,
    'bass': 2,
    'other': 3,
    'piano': 4,
    'guitar': 5
  };
  
  return stemMap[stem] ?? 0;
}

/**
 * Warm up session with dummy input
 */
export async function warmupSession(
  session: ONNXSession,
  inputShape: number[]
): Promise<void> {
  const ort = await loadONNXRuntime();
  
  const dummySize = inputShape.reduce((a, b) => a * b, 1);
  const dummyData = new Float32Array(dummySize);
  
  const dummyTensor = new ort.Tensor('float32', dummyData, inputShape);
  
  await session.run({ input: dummyTensor });
}

/**
 * Estimate inference time for a given audio length
 */
export function estimateInferenceTime(
  audioLength: number,
  sampleRate: number,
  modelComplexity: 'low' | 'medium' | 'high'
): number {
  const duration = audioLength / sampleRate;
  
  const complexityMultiplier = {
    low: 0.1,
    medium: 0.3,
    high: 0.8
  };
  
  // Estimate: RT factor * duration * multiplier
  // RT factor of 1 means real-time processing
  return duration * complexityMultiplier[modelComplexity] * 1000; // ms
}

/**
 * Optimize tensor for WebGL/WebGPU
 * Some backends prefer specific tensor layouts
 */
export function optimizeTensorLayout(
  data: Float32Array,
  dims: number[],
  backend: 'webgl' | 'webgpu' | 'wasm'
): { data: Float32Array; dims: number[] } {
  // For most cases, no transformation needed
  // This is a placeholder for future optimizations
  
  if (backend === 'webgl' && dims.length === 3) {
    // WebGL might benefit from NHWC layout for convolutions
    // Transform if needed
  }
  
  return { data, dims };
}
