/**
 * Real-time Source Separator
 * 
 * Low-latency stem separation for live playback.
 * Uses chunked processing with overlap-add for continuous audio.
 */

import type { RealtimeSeparator, RealtimeConfig, StemType } from './types.js';
import { createSourceSeparator } from './separator.js';
import { stft, istft } from './utils/audio-processing.js';

interface ProcessingChunk {
  input: Float32Array;
  timestamp: number;
}

interface QueuedOutput {
  stem: StemType;
  data: Float32Array;
  timestamp: number;
}

export class RealtimeSeparatorImpl implements RealtimeSeparator {
  private config: RealtimeConfig;
  private separator: Awaited<ReturnType<typeof createSourceSeparator>> | null = null;
  private inputQueue: ProcessingChunk[] = [];
  private outputQueue: Map<StemType, QueuedOutput[]> = new Map();
  private isProcessing = false;
  private chunkSize: number;
  private hopSize: number;
  private overlapBuffer: Map<StemType, Float32Array> = new Map();
  
  constructor(config: RealtimeConfig) {
    this.config = {
      latency: 512,
      lookahead: 2048,
      stems: ['vocals', 'drums', 'bass', 'other'],
      sampleRate: 44100,
      ...config
    };
    
    // Calculate chunk sizes
    this.chunkSize = this.config.lookahead * 2;
    this.hopSize = this.chunkSize / 2; // 50% overlap
  }
  
  async initialize(): Promise<void> {
    this.separator = await createSourceSeparator({
      model: this.config.model === 'demucs-v4-rt' ? 'demucs-v4-rt' : 'spleeter-rt',
      stems: this.config.stems,
      quality: 'fast',
      sampleRate: this.config.sampleRate
    });
    
    // Initialize output queues
    for (const stem of this.config.stems) {
      this.outputQueue.set(stem, []);
      this.overlapBuffer.set(stem, new Float32Array(this.hopSize));
    }
    
    await this.separator.warmup();
  }
  
  processBlock(
    input: Float32Array[],
    output: Map<StemType, Float32Array[]>
  ): void {
    if (!this.separator) {
      throw new Error('Separator not initialized');
    }
    
    // Mix down input channels if needed
    const monoInput = this.mixToMono(input);
    
    // Add to queue
    this.inputQueue.push({
      input: monoInput,
      timestamp: performance.now()
    });
    
    // Process if we have enough data
    const totalSamples = this.inputQueue.reduce((sum, chunk) => sum + chunk.input.length, 0);
    
    if (totalSamples >= this.chunkSize && !this.isProcessing) {
      this.processChunk();
    }
    
    // Return available output
    for (const [stem, queue] of this.outputQueue) {
      if (queue.length > 0) {
        const nextOutput = queue.shift()!;
        const outputArrays = output.get(stem) || [];
        outputArrays.push(nextOutput.data);
        output.set(stem, outputArrays);
      }
    }
  }
  
  private mixToMono(inputs: Float32Array[]): Float32Array {
    if (inputs.length === 1) {
      return inputs[0];
    }
    
    const length = inputs[0].length;
    const mono = new Float32Array(length);
    
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (const input of inputs) {
        sum += input[i];
      }
      mono[i] = sum / inputs.length;
    }
    
    return mono;
  }
  
  private async processChunk(): Promise<void> {
    this.isProcessing = true;
    
    // Concatenate input
    const totalLength = this.inputQueue.reduce((sum, chunk) => sum + chunk.input.length, 0);
    const combined = new Float32Array(totalLength);
    
    let offset = 0;
    for (const chunk of this.inputQueue) {
      combined.set(chunk.input, offset);
      offset += chunk.input.length;
    }
    
    // Keep overlap for next chunk
    const keepSamples = this.hopSize;
    const toProcess = combined.slice(0, this.chunkSize);
    
    if (combined.length > this.chunkSize - keepSamples) {
      this.inputQueue = [{
        input: combined.slice(-keepSamples),
        timestamp: performance.now()
      }];
    } else {
      this.inputQueue = [];
    }
    
    try {
      // Create temporary AudioBuffer
      const audioContext = new AudioContext({ 
        sampleRate: this.config.sampleRate 
      });
      
      const tempBuffer = audioContext.createBuffer(
        1,
        toProcess.length,
        this.config.sampleRate
      );
      tempBuffer.copyToChannel(toProcess, 0);
      
      // Process with separator
      const result = await this.separator!.separate(tempBuffer);
      
      // Queue outputs with overlap-add
      for (const stem of this.config.stems) {
        const stemBuffer = result.getStem(stem);
        if (!stemBuffer) continue;
        
        const stemData = stemBuffer.getChannelData(0);
        
        // Apply overlap-add with previous buffer
        const prevOverlap = this.overlapBuffer.get(stem)!;
        const outputData = new Float32Array(this.hopSize);
        
        // First half: add with overlap from previous
        for (let i = 0; i < this.hopSize; i++) {
          outputData[i] = prevOverlap[i] + stemData[i] * 0.5;
        }
        
        // Store second half for next overlap
        const newOverlap = new Float32Array(this.hopSize);
        for (let i = 0; i < this.hopSize; i++) {
          newOverlap[i] = stemData[this.hopSize + i] * 0.5;
        }
        this.overlapBuffer.set(stem, newOverlap);
        
        // Queue output
        const queue = this.outputQueue.get(stem)!;
        queue.push({
          stem,
          data: outputData,
          timestamp: performance.now()
        });
      }
      
      await audioContext.close();
      
    } catch (error) {
      console.error('Real-time separation error:', error);
    }
    
    this.isProcessing = false;
  }
  
  setActiveStems(stems: StemType[]): void {
    this.config.stems = stems;
    
    // Update output queues
    for (const [stem, queue] of this.outputQueue) {
      if (!stems.includes(stem)) {
        queue.length = 0; // Clear queue for inactive stems
      }
    }
    
    for (const stem of stems) {
      if (!this.outputQueue.has(stem)) {
        this.outputQueue.set(stem, []);
        this.overlapBuffer.set(stem, new Float32Array(this.hopSize));
      }
    }
  }
  
  flush(): Map<StemType, Float32Array[]> {
    const result = new Map<StemType, Float32Array[]>();
    
    for (const [stem, queue] of this.outputQueue) {
      const arrays = queue.map(q => q.data);
      result.set(stem, arrays);
      queue.length = 0;
    }
    
    return result;
  }
  
  async dispose(): Promise<void> {
    if (this.separator) {
      await this.separator.dispose();
      this.separator = null;
    }
    
    this.inputQueue = [];
    this.outputQueue.clear();
    this.overlapBuffer.clear();
  }
}

/**
 * Create real-time separator
 */
export async function createRealtimeSeparator(
  config: RealtimeConfig
): Promise<RealtimeSeparator> {
  const separator = new RealtimeSeparatorImpl(config);
  await separator.initialize();
  return separator;
}
