/**
 * Base AudioWorklet Processor
 * 
 * Foundation for all DAW audio processors with:
 * - Parameter handling
 * - Event processing
 * - SAB ring buffer support
 * - Statistics tracking
 * - Realtime-safe operations
 * 
 * NOTE: All methods in subclasses must follow realtime rules:
 * - No allocations in process()
 * - No GC-triggering operations
 * - No locks
 * - Use pre-allocated buffers only
 */

import type {
  ProcessorParameter,
  ProcessorMessage,
  ProcessorParamMessage,
  ProcessorEventMessage,
  ProcessorStateMessage,
  ProcessorStats,
} from './types.js';

/** Options for processor constructor */
export interface ProcessorOptions {
  parameterDescriptors?: ProcessorParameter[];
  numInputs?: number;
  numOutputs?: number;
  outputChannelCount?: number[];
}

/**
 * Base class for DAW AudioWorklet processors
 * 
 * Subclasses must override:
 * - `process(inputs, outputs, parameters)` - Audio processing
 * - Optional: `handleEvent(event)` - Event handling
 * - Optional: `handleParamChange(paramId, value, sampleOffset)` - Parameter smoothing
 */
export abstract class DAWWorkletProcessor extends AudioWorkletProcessor {
  // Port for message communication
  protected port: MessagePort;
  
  // Parameters
  protected paramValues: Map<string, number> = new Map();
  protected paramTargets: Map<string, number> = new Map();
  protected paramRates: Map<string, number> = new Map();
  
  // Transport state (mirrored from main thread)
  protected transportPlaying = false;
  protected transportTick = 0;
  protected transportSample = 0;
  protected transportTempo = 120;
  
  // Event queue (pre-allocated)
  protected eventQueue: Array<{ event: unknown; offset: number }> = [];
  protected maxEventsPerBlock = 100;
  
  // Statistics
  protected stats: ProcessorStats = {
    processCount: 0,
    eventsProcessed: 0,
    eventsDropped: 0,
    averageLoad: 0,
    peakLoad: 0,
    underruns: 0,
  };
  
  // Performance tracking
  private lastProcessStart = 0;
  private loadSum = 0;
  private loadCount = 0;
  
  constructor(options?: ProcessorOptions) {
    // @ts-expect-error AudioWorkletProcessor constructor types
    super(options);
    
    this.port = (this as unknown as { port: MessagePort }).port;
    this.port.onmessage = this.handleMessage.bind(this);
    
    // Initialize parameters
    if (options?.parameterDescriptors) {
      for (const desc of options.parameterDescriptors) {
        this.paramValues.set(desc.id, desc.defaultValue);
        this.paramTargets.set(desc.id, desc.defaultValue);
        this.paramRates.set(desc.id, 0.001); // Default smoothing
      }
    }
    
    // Pre-allocate event queue
    this.eventQueue = new Array(this.maxEventsPerBlock);
    this.clearEventQueue();
  }
  
  /**
   * Main process method - called every render quantum
   * OVERRIDE THIS in subclasses
   * 
   * @param inputs - Input audio data
   * @param outputs - Output audio data to fill
   * @param parameters - Parameter values (k-rate or a-rate)
   * @returns true to keep alive
   */
  abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
  
  /**
   * Handle incoming message from main thread
   * Override to handle custom messages
   */
  protected handleMessage(event: MessageEvent<ProcessorMessage>): void {
    const message = event.data;
    
    switch (message.type) {
      case 'param':
        this.handleParamMessage(message as ProcessorParamMessage);
        break;
      case 'event':
        this.handleEventMessage(message as ProcessorEventMessage);
        break;
      case 'state':
        this.handleStateMessage(message as ProcessorStateMessage);
        break;
      case 'ping':
        this.sendPong();
        break;
      case 'buffer':
        this.handleBufferRegistration(message);
        break;
      default:
        this.handleCustomMessage(message);
    }
  }
  
  /**
   * Handle parameter change message
   * Override for custom parameter smoothing
   */
  protected handleParamMessage(message: ProcessorParamMessage): void {
    const { paramId, value, sampleOffset } = message.payload;
    this.paramTargets.set(paramId, value);
    // Immediate change at offset, could be smoothed
    if (sampleOffset === 0) {
      this.paramValues.set(paramId, value);
    }
  }
  
  /**
   * Handle event message (notes, automation)
   * Override to process events
   */
  protected handleEventMessage(message: ProcessorEventMessage): void {
    const events = message.payload.events;
    
    for (let i = 0; i < events.length && i < this.maxEventsPerBlock; i++) {
      const event = events[i];
      const sampleOffset = (event as { sampleOffset?: number }).sampleOffset ?? 0;
      
      if (i < this.eventQueue.length) {
        this.eventQueue[i] = { event, offset: sampleOffset };
      } else {
        this.stats.eventsDropped++;
      }
    }
  }
  
  /**
   * Handle transport state update
   */
  protected handleStateMessage(message: ProcessorStateMessage): void {
    const { playing, currentTick, currentSample, tempo } = message.payload;
    this.transportPlaying = playing;
    this.transportTick = currentTick;
    this.transportSample = currentSample;
    this.transportTempo = tempo;
  }
  
  /**
   * Handle SAB buffer registration
   * Override in subclasses that use SAB
   */
  protected handleBufferRegistration(_message: ProcessorMessage): void {
    // Default: ignore
  }
  
  /**
   * Handle custom message types
   * Override for processor-specific messages
   */
  protected handleCustomMessage(_message: ProcessorMessage): void {
    // Default: ignore
  }
  
  /**
   * Send pong response
   */
  protected sendPong(): void {
    this.port.postMessage({
      type: 'pong',
      timestamp: currentTime,
      payload: null,
    });
  }
  
  /**
   * Send statistics to main thread
   */
  protected sendStats(): void {
    this.port.postMessage({
      type: 'stats',
      timestamp: currentTime,
      payload: { ...this.stats },
    });
  }
  
  /**
   * Clear event queue
   */
  protected clearEventQueue(): void {
    for (let i = 0; i < this.eventQueue.length; i++) {
      this.eventQueue[i] = { event: null, offset: -1 };
    }
  }
  
  /**
   * Process events for current block
   * Call this in subclass process() to handle events
   */
  protected processEvents(blockSize: number): void {
    for (let i = 0; i < this.eventQueue.length; i++) {
      const item = this.eventQueue[i];
      if (item.offset >= 0 && item.offset < blockSize && item.event) {
        this.handleEvent(item.event, item.offset);
        item.offset = -1; // Mark as processed
        this.stats.eventsProcessed++;
      }
    }
  }
  
  /**
   * Handle a single event
   * Override to process musical events
   */
  protected handleEvent(_event: unknown, _sampleOffset: number): void {
    // Default: ignore
  }
  
  /**
   * Update parameter smoothing
   * Call this in process() for smooth parameter changes
   */
  protected updateParameters(blockSize: number): void {
    for (const [id, target] of this.paramTargets) {
      const current = this.paramValues.get(id) ?? target;
      const rate = this.paramRates.get(id) ?? 0.001;
      
      // Simple one-pole smoothing
      const diff = target - current;
      if (Math.abs(diff) < 0.0001) {
        this.paramValues.set(id, target);
      } else {
        this.paramValues.set(id, current + diff * rate * blockSize);
      }
    }
  }
  
  /**
   * Get smoothed parameter value
   */
  protected getParam(id: string): number {
    return this.paramValues.get(id) ?? 0;
  }
  
  /**
   * Start performance measurement
   */
  protected beginProcess(): void {
    this.lastProcessStart = currentTime;
  }
  
  /**
   * End performance measurement
   */
  protected endProcess(): void {
    const elapsed = currentTime - this.lastProcessStart;
    
    this.stats.processCount++;
    this.loadSum += elapsed;
    this.loadCount++;
    
    // Update average every 100 blocks
    if (this.loadCount >= 100) {
      this.stats.averageLoad = this.loadSum / this.loadCount;
      this.loadSum = 0;
      this.loadCount = 0;
    }
    
    // Track peak
    if (elapsed > this.stats.peakLoad) {
      this.stats.peakLoad = elapsed;
    }
  }
  
  /**
   * Report underrun
   */
  protected reportUnderrun(): void {
    this.stats.underruns++;
  }
  
  /**
   * Convert MIDI note to frequency
   */
  protected noteToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }
  
  /**
   * Apply gain to buffer (in-place)
   */
  protected applyGain(buffer: Float32Array, gain: number): void {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] *= gain;
    }
  }
  
  /**
   * Mix source into destination (in-place)
   */
  protected mix(src: Float32Array, dst: Float32Array, gain = 1): void {
    const len = Math.min(src.length, dst.length);
    for (let i = 0; i < len; i++) {
      dst[i] += src[i] * gain;
    }
  }
  
  /**
   * Clear buffer
   */
  protected clearBuffer(buffer: Float32Array): void {
    buffer.fill(0);
  }
}

/** 
 * Static parameter descriptors for processor registration
 * Must be a static getter on the class
 */
export function defineParameterDescriptors(
  descriptors: ProcessorParameter[]
): { parameterDescriptors: ProcessorParameter[] } {
  return { parameterDescriptors: descriptors };
}

/** Current audio context time (for AudioWorklet global) */
declare const currentTime: number;
declare const sampleRate: number;
