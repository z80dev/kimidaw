/**
 * Metronome AudioWorklet Processor
 * 
 * Generates click sounds synchronized to transport.
 * Uses pre-generated click samples for minimal CPU usage.
 */

import { DAWWorkletProcessor, defineParameterDescriptors } from '../src/worklet-base.js';

/** Metronome processor options */
interface MetronomeProcessorOptions {
  /** Sample rate */
  sampleRate?: number;
}

/** Click configuration */
interface ClickConfig {
  frequency: number;
  durationMs: number;
  gain: number;
}

/**
 * Metronome AudioWorklet Processor
 * 
 * Generates click sounds at specified intervals.
 * Receives click events from main thread scheduler.
 */
class MetronomeProcessor extends DAWWorkletProcessor {
  // Pre-generated click samples
  private regularClick: Float32Array;
  private accentClick: Float32Array;
  
  // Current playback state
  private currentClick: Float32Array | null = null;
  private currentPosition = 0;
  private currentGain = 0;
  
  // Click configuration
  private sampleRate: number;
  private readonly CLICK_FREQ = 1000;
  private readonly ACCENT_FREQ = 1500;
  private readonly CLICK_DURATION_MS = 50;
  private readonly DEFAULT_GAIN = 0.5;
  private readonly ACCENT_GAIN = 1.0;
  
  constructor(options?: { processorOptions?: MetronomeProcessorOptions }) {
    super();
    
    this.sampleRate = options?.processorOptions?.sampleRate ?? 48000;
    
    // Pre-generate click samples
    this.regularClick = this.generateClick(this.CLICK_FREQ, this.DEFAULT_GAIN);
    this.accentClick = this.generateClick(this.ACCENT_FREQ, this.ACCENT_GAIN);
  }
  
  static get parameterDescriptors() {
    return defineParameterDescriptors([
      { id: 'volume', name: 'Volume', defaultValue: 0.5, min: 0, max: 1, automationRate: 'k-rate' },
      { id: 'enabled', name: 'Enabled', defaultValue: 0, min: 0, max: 1, automationRate: 'k-rate' },
    ]).parameterDescriptors;
  }
  
  /**
   * Main process loop
   */
  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    
    const blockSize = output[0].length;
    const enabled = (parameters.enabled?.[0] ?? 0) > 0.5;
    const volume = parameters.volume?.[0] ?? 0.5;
    
    // Clear output
    for (const channel of output) {
      channel.fill(0);
    }
    
    if (!enabled) {
      this.currentClick = null;
      return true;
    }
    
    // Continue playing current click
    if (this.currentClick) {
      const remaining = this.currentClick.length - this.currentPosition;
      const toCopy = Math.min(remaining, blockSize);
      
      for (let ch = 0; ch < output.length; ch++) {
        for (let i = 0; i < toCopy; i++) {
          output[ch][i] = this.currentClick[this.currentPosition + i] * this.currentGain * volume;
        }
      }
      
      this.currentPosition += toCopy;
      
      if (this.currentPosition >= this.currentClick.length) {
        this.currentClick = null;
      }
    }
    
    // Process new click triggers
    this.processEvents(blockSize);
    
    return true;
  }
  
  /**
   * Handle click events from main thread
   */
  protected handleEvent(event: unknown, sampleOffset: number): void {
    const clickEvent = event as { type: string; isAccent?: boolean };
    
    if (clickEvent.type !== 'metronome-click') return;
    
    // Start click at offset
    this.currentClick = clickEvent.isAccent ? this.accentClick : this.regularClick;
    this.currentGain = clickEvent.isAccent ? this.ACCENT_GAIN : this.DEFAULT_GAIN;
    this.currentPosition = 0;
    
    // Apply offset by skipping samples
    if (sampleOffset > 0 && sampleOffset < this.currentClick.length) {
      this.currentPosition = sampleOffset;
    }
  }
  
  /**
   * Generate click sample (sine wave with exponential decay)
   */
  private generateClick(frequency: number, gain: number): Float32Array {
    const durationSamples = Math.ceil((this.CLICK_DURATION_MS / 1000) * this.sampleRate);
    const click = new Float32Array(durationSamples);
    
    const decay = 0.99;
    let amplitude = gain;
    
    for (let i = 0; i < durationSamples; i++) {
      const t = i / this.sampleRate;
      click[i] = Math.sin(2 * Math.PI * frequency * t) * amplitude;
      amplitude *= decay;
    }
    
    return click;
  }
}

// Register processor
declare const registerProcessor: (name: string, processor: typeof AudioWorkletProcessor) => void;
registerProcessor('daw-metronome', MetronomeProcessor as unknown as typeof AudioWorkletProcessor);
