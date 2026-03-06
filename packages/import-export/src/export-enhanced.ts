/**
 * Enhanced Export Options
 * Advanced audio export with multiple formats and options
 */

import type { AudioBufferData } from './types.js';

export type ExportSource = 'master' | 'all-tracks' | 'selected-tracks' | 'individual-tracks';
export type BitDepth = 16 | 24 | 32;
export type SampleRate = 44100 | 48000 | 88200 | 96000;
export type DitherAlgorithm = 'none' | 'pow-r-1' | 'pow-r-2' | 'pow-r-3' | 'mb';

export interface ExportOptions {
  source: ExportSource;
  includeReturnEffects: boolean;
  includeMasterEffects: boolean;
  convertToMono: boolean;
  normalize: boolean;
  normalizeTargetDb: number; // Target peak in dB (usually -1 to -0.1)
  sampleRate: SampleRate;
  bitDepth: BitDepth;
  dither: DitherAlgorithm;
  format: 'wav' | 'aiff' | 'flac';
  
  // Range
  exportLength: 'selection' | 'loop' | 'entire-song';
  startTime?: number; // seconds
  endTime?: number; // seconds
  
  // Upload
  uploadToSoundCloud?: boolean;
  soundCloudOptions?: SoundCloudUploadOptions;
}

export interface SoundCloudUploadOptions {
  title: string;
  description?: string;
  tags?: string[];
  genre?: string;
  public: boolean;
  downloadable: boolean;
}

export interface ExportJob {
  id: string;
  options: ExportOptions;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  result?: ExportResult;
  error?: string;
}

export interface ExportResult {
  files: ExportFile[];
  totalDuration: number;
  totalSize: number;
}

export interface ExportFile {
  name: string;
  path: string;
  size: number;
  duration: number;
  format: string;
  sampleRate: number;
  bitDepth: number;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  source: 'master',
  includeReturnEffects: true,
  includeMasterEffects: true,
  convertToMono: false,
  normalize: true,
  normalizeTargetDb: -1.0,
  sampleRate: 44100,
  bitDepth: 24,
  dither: 'none',
  format: 'wav',
  exportLength: 'entire-song',
};

export interface EnhancedExporter {
  createJob(options: ExportOptions): ExportJob;
  startJob(jobId: string): Promise<ExportResult>;
  cancelJob(jobId: string): void;
  getJobStatus(jobId: string): ExportJob | undefined;
  getAllJobs(): ExportJob[];
  clearCompletedJobs(): void;
  
  // Export functions
  exportAudio(
    audioData: AudioBufferData[],
    options: ExportOptions
  ): Promise<ExportResult>;
  
  // Utilities
  normalizeAudio(buffer: Float32Array, targetDb: number): Float32Array;
  applyDither(buffer: Float32Array, bits: number, algorithm: DitherAlgorithm): Float32Array;
  convertToMono(buffer: AudioBufferData): Float32Array;
  resampleBuffer(
    buffer: Float32Array,
    sourceRate: number,
    targetRate: number
  ): Float32Array;
}

export function createEnhancedExporter(): EnhancedExporter {
  const jobs = new Map<string, ExportJob>();
  let jobIdCounter = 0;
  
  function createJob(options: ExportOptions): ExportJob {
    const job: ExportJob = {
      id: `export-${++jobIdCounter}-${Date.now()}`,
      options,
      status: 'pending',
      progress: 0,
    };
    
    jobs.set(job.id, job);
    return job;
  }
  
  async function startJob(jobId: string): Promise<ExportResult> {
    const job = jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    job.status = 'processing';
    
    try {
      // This is a mock implementation - real would process actual audio
      const result: ExportResult = {
        files: [{
          name: `export-${Date.now()}.wav`,
          path: `/exports/export-${Date.now()}.wav`,
          size: 0,
          duration: 0,
          format: job.options.format,
          sampleRate: job.options.sampleRate,
          bitDepth: job.options.bitDepth,
        }],
        totalDuration: 0,
        totalSize: 0,
      };
      
      job.status = 'complete';
      job.progress = 100;
      job.result = result;
      
      return result;
    } catch (error) {
      job.status = 'error';
      job.error = String(error);
      throw error;
    }
  }
  
  function cancelJob(jobId: string): void {
    const job = jobs.get(jobId);
    if (job && job.status === 'processing') {
      job.status = 'error';
      job.error = 'Cancelled by user';
    }
  }
  
  function getJobStatus(jobId: string): ExportJob | undefined {
    return jobs.get(jobId);
  }
  
  function getAllJobs(): ExportJob[] {
    return Array.from(jobs.values());
  }
  
  function clearCompletedJobs(): void {
    for (const [id, job] of jobs) {
      if (job.status === 'complete' || job.status === 'error') {
        jobs.delete(id);
      }
    }
  }
  
  async function exportAudio(
    audioData: AudioBufferData[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const files: ExportFile[] = [];
    
    for (let i = 0; i < audioData.length; i++) {
      const data = audioData[i];
      
      // Process based on options
      let processed = processAudioData(data, options);
      
      // Create file
      const file: ExportFile = {
        name: generateFileName(options, i, audioData.length),
        path: `/exports/${generateFileName(options, i, audioData.length)}`,
        size: calculateSize(processed, options),
        duration: data.duration,
        format: options.format,
        sampleRate: options.sampleRate,
        bitDepth: options.bitDepth,
      };
      
      files.push(file);
    }
    
    return {
      files,
      totalDuration: files.reduce((sum, f) => sum + f.duration, 0),
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
    };
  }
  
  function processAudioData(
    data: AudioBufferData,
    options: ExportOptions
  ): Float32Array[] {
    let channels = data.channelData;
    
    // Convert to mono if requested
    if (options.convertToMono) {
      channels = [convertToMonoFn(channels)];
    }
    
    // Resample if needed
    if (data.sampleRate !== options.sampleRate) {
      channels = channels.map(ch => 
        resampleBuffer(ch, data.sampleRate, options.sampleRate)
      );
    }
    
    // Normalize if requested
    if (options.normalize) {
      channels = channels.map(ch => 
        normalizeAudio(ch, options.normalizeTargetDb)
      );
    }
    
    // Apply dither
    if (options.dither !== 'none') {
      channels = channels.map(ch => 
        applyDither(ch, options.bitDepth, options.dither)
      );
    }
    
    return channels;
  }
  
  function generateFileName(
    options: ExportOptions,
    index: number,
    total: number
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (total === 1) {
      return `export-${timestamp}.${options.format}`;
    }
    
    return `export-track${index + 1}-${timestamp}.${options.format}`;
  }
  
  function calculateSize(channels: Float32Array[], options: ExportOptions): number {
    const samples = channels[0]?.length || 0;
    const bytesPerSample = options.bitDepth / 8;
    return samples * channels.length * bytesPerSample;
  }
  
  function convertToMonoFn(channels: Float32Array[]): Float32Array {
    if (channels.length === 1) return channels[0];
    
    const length = channels[0]?.length || 0;
    const mono = new Float32Array(length);
    
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (const ch of channels) {
        sum += ch[i] || 0;
      }
      mono[i] = sum / channels.length;
    }
    
    return mono;
  }
  
  function normalizeAudio(buffer: Float32Array, targetDb: number): Float32Array {
    // Find peak
    let peak = 0;
    for (let i = 0; i < buffer.length; i++) {
      peak = Math.max(peak, Math.abs(buffer[i]));
    }
    
    if (peak === 0) return buffer;
    
    // Calculate gain
    const targetLinear = Math.pow(10, targetDb / 20);
    const gain = targetLinear / peak;
    
    // Apply gain
    const result = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      result[i] = buffer[i] * gain;
    }
    
    return result;
  }
  
  function applyDither(
    buffer: Float32Array,
    bits: number,
    algorithm: DitherAlgorithm
  ): Float32Array {
    if (algorithm === 'none') return buffer;
    
    const result = new Float32Array(buffer.length);
    const quantStep = 1 / Math.pow(2, bits - 1);
    
    // Previous error for error diffusion
    let error = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      let ditherValue = 0;
      
      switch (algorithm) {
        case 'pow-r-1':
          // Simple rectangular dither
          ditherValue = (Math.random() - 0.5) * quantStep;
          break;
        case 'pow-r-2':
          // Triangular dither
          ditherValue = ((Math.random() + Math.random()) / 2 - 0.5) * quantStep;
          break;
        case 'pow-r-3':
          // Gaussian dither (approximation)
          ditherValue = ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * quantStep * 1.5;
          break;
        case 'mb':
          // High-passed dither (simplified)
          const noise = (Math.random() - 0.5) * quantStep;
          ditherValue = noise - error * 0.5;
          break;
      }
      
      // Quantize
      const quantized = Math.round((buffer[i] + ditherValue) / quantStep) * quantStep;
      result[i] = quantized;
      
      // Update error for noise shaping
      error = buffer[i] - quantized;
    }
    
    return result;
  }
  
  function resampleBuffer(
    buffer: Float32Array,
    sourceRate: number,
    targetRate: number
  ): Float32Array {
    if (sourceRate === targetRate) return buffer;
    
    const ratio = targetRate / sourceRate;
    const newLength = Math.floor(buffer.length * ratio);
    const result = new Float32Array(newLength);
    
    // Simple linear interpolation
    for (let i = 0; i < newLength; i++) {
      const sourcePos = i / ratio;
      const index = Math.floor(sourcePos);
      const frac = sourcePos - index;
      
      const s0 = buffer[index] || 0;
      const s1 = buffer[index + 1] || s0;
      
      result[i] = s0 + (s1 - s0) * frac;
    }
    
    return result;
  }
  
  return {
    createJob,
    startJob,
    cancelJob,
    getJobStatus,
    getAllJobs,
    clearCompletedJobs,
    exportAudio,
    normalizeAudio,
    applyDither,
    convertToMono: convertToMonoFn,
    resampleBuffer,
  };
}

/**
 * SoundCloud upload helper
 */
export interface SoundCloudUploader {
  upload(file: Blob, options: SoundCloudUploadOptions): Promise<string>;
}

export function createSoundCloudUploader(clientId: string): SoundCloudUploader {
  async function upload(file: Blob, options: SoundCloudUploadOptions): Promise<string> {
    // This is a mock implementation
    // Real implementation would use SoundCloud API
    console.log('Uploading to SoundCloud:', options.title);
    
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return `https://soundcloud.com/user/track-${Date.now()}`;
  }
  
  return { upload };
}
