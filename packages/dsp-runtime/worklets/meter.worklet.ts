/**
 * Meter AudioWorklet Processor
 * 
 * Real-time audio metering with:
 * - Peak detection
 * - RMS calculation
 * - True peak (inter-sample peak) detection
 * - LUFS momentary (optional, simplified)
 * - Clip detection
 * 
 * Outputs meter data via MessagePort or SAB for UI visualization.
 */

import { DAWWorkletProcessor, defineParameterDescriptors } from '../src/worklet-base.js';
import type { MeterData, MeterAccumulator, RingHeader } from '../src/types.js';

/** Meter processor options */
interface MeterProcessorOptions {
  /** Update rate in Hz (how often to send data) */
  updateRate?: number;
  /** Enable true peak detection (4x oversampling) */
  truePeak?: boolean;
  /** Enable LUFS calculation */
  lufs?: boolean;
  /** Clip threshold in dBFS */
  clipThreshold?: number;
}

/**
 * Meter AudioWorklet Processor
 * 
 * Processes audio and accumulates level data.
 * Sends meter updates at specified rate.
 */
class MeterProcessor extends DAWWorkletProcessor {
  // Configuration
  private updateInterval: number;
  private enableTruePeak: boolean;
  private enableLufs: boolean;
  private clipThreshold: number;
  
  // Accumulators
  private accumulator: MeterAccumulator;
  private samplesSinceUpdate = 0;
  
  // Meter output
  private currentMeter: MeterData;
  
  // SAB for meter data (optional)
  private meterSAB: SharedArrayBuffer | null = null;
  private meterHeader: RingHeader | null = null;
  private meterData: Float64Array | null = null;
  
  // True peak upsampling (4x)
  private upsampleBuffer: Float32Array;
  private readonly UPSAMPLE_FACTOR = 4;
  
  // LUFS K-weighting filter state (simplified)
  private lufsFilterState = { x1: 0, x2: 0, y1: 0, y2: 0 };
  private lufsSum = 0;
  private lufsCount = 0;
  
  constructor(options?: { processorOptions?: MeterProcessorOptions }) {
    super();
    
    const opts = options?.processorOptions ?? {};
    this.updateInterval = Math.floor(sampleRate / (opts.updateRate ?? 30));
    this.enableTruePeak = opts.truePeak ?? true;
    this.enableLufs = opts.lufs ?? false;
    this.clipThreshold = Math.pow(10, (opts.clipThreshold ?? -0.1) / 20);
    
    this.upsampleBuffer = new Float32Array(128 * this.UPSAMPLE_FACTOR);
    
    this.accumulator = {
      sumSquares: 0,
      currentPeak: 0,
      sampleCount: 0,
      clipDetected: false,
    };
    
    this.currentMeter = {
      peak: 0,
      rms: 0,
      truePeak: 0,
      lufsMomentary: -Infinity,
      clipped: false,
    };
  }
  
  static get parameterDescriptors() {
    return defineParameterDescriptors([]).parameterDescriptors;
  }
  
  /**
   * Main process loop
   */
  process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    
    const blockSize = input[0].length;
    
    // Process each channel (stereo sum)
    for (let i = 0; i < blockSize; i++) {
      // Sum to mono
      let sample = 0;
      for (const channel of input) {
        sample += channel[i];
      }
      sample /= input.length;
      
      // Accumulate for RMS
      this.accumulator.sumSquares += sample * sample;
      this.accumulator.sampleCount++;
      
      // Track peak
      const absSample = Math.abs(sample);
      if (absSample > this.accumulator.currentPeak) {
        this.accumulator.currentPeak = absSample;
      }
      
      // Check clip
      if (absSample > this.clipThreshold) {
        this.accumulator.clipDetected = true;
      }
      
      // LUFS filter (simplified K-weighting)
      if (this.enableLufs) {
        const filtered = this.applyKWeighting(sample);
        this.lufsSum += filtered * filtered;
        this.lufsCount++;
      }
    }
    
    // True peak detection (4x oversampling)
    if (this.enableTruePeak) {
      this.calculateTruePeak(input, blockSize);
    }
    
    this.samplesSinceUpdate += blockSize;
    
    // Send update at specified rate
    if (this.samplesSinceUpdate >= this.updateInterval) {
      this.sendMeterUpdate();
      this.samplesSinceUpdate = 0;
    }
    
    return true;
  }
  
  /**
   * Calculate true peak using 4x oversampling
   */
  private calculateTruePeak(inputs: Float32Array[][], blockSize: number): void {
    // Simple upsampling using linear interpolation
    // For production, use proper polyphase FIR filter
    const channel = inputs[0]; // Use first channel
    
    for (let ch = 0; ch < channel.length; ch++) {
      const inputChannel = channel[ch];
      
      for (let i = 0; i < blockSize; i++) {
        const current = inputChannel[i];
        const next = i < blockSize - 1 ? inputChannel[i + 1] : current;
        
        for (let j = 0; j < this.UPSAMPLE_FACTOR; j++) {
          const fraction = j / this.UPSAMPLE_FACTOR;
          const upsampled = current + (next - current) * fraction;
          const absUpsampled = Math.abs(upsampled);
          
          if (absUpsampled > this.currentMeter.truePeak) {
            this.currentMeter.truePeak = absUpsampled;
          }
        }
      }
    }
  }
  
  /**
   * Simplified K-weighting filter for LUFS
   * (Pre-filter only, omitting RLB for speed)
   */
  private applyKWeighting(input: number): number {
    // Simplified high-shelf filter at ~1.5kHz
    const f0 = 1500;
    const Q = 0.7;
    const gain = 4; // dB
    
    const A = Math.pow(10, gain / 40);
    const w0 = 2 * Math.PI * f0 / sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * Q);
    
    const b0 = A * ((A + 1) + (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha);
    const b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
    const b2 = A * ((A + 1) + (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha);
    const a0 = (A + 1) - (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha;
    const a1 = 2 * ((A - 1) - (A + 1) * cosw0);
    const a2 = (A + 1) - (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha;
    
    const x0 = input;
    const { x1, x2, y1, y2 } = this.lufsFilterState;
    
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    
    this.lufsFilterState.x2 = x1;
    this.lufsFilterState.x1 = x0;
    this.lufsFilterState.y2 = y1;
    this.lufsFilterState.y1 = y0;
    
    return y0;
  }
  
  /**
   * Send meter update
   */
  private sendMeterUpdate(): void {
    // Calculate RMS
    const rms = this.accumulator.sampleCount > 0
      ? Math.sqrt(this.accumulator.sumSquares / this.accumulator.sampleCount)
      : 0;
    
    // Calculate LUFS momentary (400ms window)
    let lufs = -Infinity;
    if (this.enableLufs && this.lufsCount > 0) {
      const meanSquare = this.lufsSum / this.lufsCount;
      lufs = -0.691 + 10 * Math.log10(meanSquare + 1e-10);
    }
    
    // Update current meter
    this.currentMeter = {
      peak: this.accumulator.currentPeak,
      rms,
      truePeak: this.enableTruePeak 
        ? Math.max(this.currentMeter.truePeak, this.accumulator.currentPeak)
        : this.accumulator.currentPeak,
      lufsMomentary: lufs,
      clipped: this.accumulator.clipDetected,
    };
    
    // Send via SAB if available
    if (this.meterSAB && this.meterHeader && this.meterData) {
      const writeIdx = Atomics.load(this.meterHeader.writeIndex, 0);
      const baseIdx = writeIdx * 5;
      
      this.meterData[baseIdx] = this.currentMeter.peak;
      this.meterData[baseIdx + 1] = this.currentMeter.rms;
      this.meterData[baseIdx + 2] = this.currentMeter.truePeak;
      this.meterData[baseIdx + 3] = this.currentMeter.lufsMomentary;
      this.meterData[baseIdx + 4] = this.currentMeter.clipped ? 1 : 0;
      
      const nextIdx = (writeIdx + 1) % 10; // Keep last 10 readings
      Atomics.store(this.meterHeader.writeIndex, 0, nextIdx);
    }
    
    // Send via MessagePort
    this.port.postMessage({
      type: 'meter-update',
      timestamp: currentTime,
      payload: this.currentMeter,
    });
    
    // Reset accumulators
    this.accumulator.sumSquares = 0;
    this.accumulator.currentPeak = 0;
    this.accumulator.sampleCount = 0;
    this.accumulator.clipDetected = false;
    
    if (this.enableLufs) {
      this.lufsSum = 0;
      this.lufsCount = 0;
    }
    
    this.currentMeter.truePeak = 0;
  }
  
  /**
   * Handle buffer registration
   */
  protected handleBufferRegistration(message: { payload: { sab: SharedArrayBuffer; type: string } }): void {
    if (message.payload.type !== 'meters') return;
    
    this.meterSAB = message.payload.sab;
    
    this.meterHeader = {
      writeIndex: new Int32Array(this.meterSAB, 0, 1),
      readIndex: new Int32Array(this.meterSAB, 4, 1),
      capacity: new Int32Array(this.meterSAB, 8, 1),
      dropped: new Int32Array(this.meterSAB, 12, 1),
    };
    
    const capacity = Atomics.load(this.meterHeader.capacity, 0);
    this.meterData = new Float64Array(this.meterSAB, 16, capacity * 5);
  }
}

// Register processor
declare const registerProcessor: (name: string, processor: typeof AudioWorkletProcessor) => void;
declare const sampleRate: number;
registerProcessor('daw-meter', MeterProcessor as unknown as typeof AudioWorkletProcessor);
