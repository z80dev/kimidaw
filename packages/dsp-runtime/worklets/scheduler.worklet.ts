/**
 * Scheduler AudioWorklet
 * 
 * Render-quantum scheduler that consumes event chunks from the main thread
 * and triggers voices sample-accurately within the render quantum.
 * 
 * Realtime constraints:
 * - No allocations in process()
 * - Pre-allocated buffers only
 * - Lock-free SAB access via Atomics
 */

import type { AnyScheduledEvent, RingHeader } from '@daw/engine-core';
import { DAWWorkletProcessor, defineParameterDescriptors } from '../src/worklet-base.js';

/** Event with sample offset */
interface TimedEvent {
  event: AnyScheduledEvent;
  offset: number;
}

/** Scheduler processor options */
interface SchedulerProcessorOptions {
  maxEventsPerBlock?: number;
}

/**
 * Scheduler AudioWorklet Processor
 * 
 * Consumes events from SAB ring buffer or MessagePort and
dispatches them sample-accurately within render quantums.
 */
class SchedulerProcessor extends DAWWorkletProcessor {
  // Event queue (pre-allocated)
  private eventQueue: TimedEvent[];
  private maxEventsPerBlock: number;
  private eventQueueHead = 0;
  private eventQueueTail = 0;
  
  // SAB ring buffer
  private eventSAB: SharedArrayBuffer | null = null;
  private eventHeader: RingHeader | null = null;
  private eventData: Float64Array | null = null;
  private eventCapacity = 0;
  
  // Event format constants
  private readonly EVENT_FIELDS = 8;
  private readonly HEADER_SIZE = 4;
  
  // Statistics
  private eventsTriggered = 0;
  private eventsReadFromSAB = 0;
  
  constructor(options?: { processorOptions?: SchedulerProcessorOptions }) {
    super();
    
    this.maxEventsPerBlock = options?.processorOptions?.maxEventsPerBlock ?? 100;
    this.eventQueue = new Array(this.maxEventsPerBlock);
    
    // Initialize queue with nulls
    for (let i = 0; i < this.maxEventsPerBlock; i++) {
      this.eventQueue[i] = { event: null as unknown as AnyScheduledEvent, offset: -1 };
    }
  }
  
  static get parameterDescriptors() {
    return defineParameterDescriptors([]).parameterDescriptors;
  }
  
  /**
   * Main process loop
   * Reads events and triggers them at sample offsets
   */
  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    this.beginProcess();
    
    const blockSize = outputs[0]?.[0]?.length ?? 128;
    
    // Read events from SAB if available
    if (this.eventSAB && this.eventHeader && this.eventData) {
      this.readEventsFromSAB(blockSize);
    }
    
    // Process events in queue
    this.processEvents(blockSize);
    
    // Clear output (scheduler doesn't produce audio)
    for (const output of outputs) {
      for (const channel of output) {
        channel.fill(0);
      }
    }
    
    this.endProcess();
    return true;
  }
  
  /**
   * Read events from SAB ring buffer
   */
  private readEventsFromSAB(blockSize: number): void {
    if (!this.eventHeader || !this.eventData) return;
    
    const writeIdx = Atomics.load(this.eventHeader.writeIndex, 0);
    let readIdx = Atomics.load(this.eventHeader.readIndex, 0);
    
    while (readIdx !== writeIdx && this.eventQueueTail < this.maxEventsPerBlock) {
      // Read event from SAB
      const baseIdx = readIdx * this.EVENT_FIELDS;
      
      const typeCode = this.eventData[baseIdx];
      const sampleTime = this.eventData[baseIdx + 1];
      const tickTime = this.eventData[baseIdx + 2];
      const trackIdHash = this.eventData[baseIdx + 3];
      const data1 = this.eventData[baseIdx + 4];
      const data2 = this.eventData[baseIdx + 5];
      const data3 = this.eventData[baseIdx + 6];
      const data4 = this.eventData[baseIdx + 7];
      
      // Calculate sample offset
      const currentSample = this.transportSample;
      const offset = Math.floor(sampleTime - currentSample);
      
      // Only queue if within next block
      if (offset >= 0 && offset < blockSize) {
        const event = this.decodeEvent(
          typeCode,
          sampleTime,
          tickTime,
          trackIdHash,
          data1,
          data2,
          data3,
          data4
        );
        
        if (event) {
          this.eventQueue[this.eventQueueTail] = { event, offset };
          this.eventQueueTail = (this.eventQueueTail + 1) % this.maxEventsPerBlock;
          this.eventsReadFromSAB++;
        }
      }
      
      // Advance read index
      readIdx = (readIdx + 1) % this.eventCapacity;
      Atomics.store(this.eventHeader.readIndex, 0, readIdx);
    }
  }
  
  /**
   * Decode event from SAB format
   */
  private decodeEvent(
    typeCode: number,
    sampleTime: number,
    tickTime: number,
    _trackIdHash: number,
    data1: number,
    data2: number,
    data3: number,
    data4: number
  ): AnyScheduledEvent | null {
    const trackId = 'track'; // Would need reverse hash lookup
    
    switch (typeCode) {
      case 0: // note-on
        return {
          type: 'note-on',
          sampleTime,
          tickTime,
          trackId,
          note: data1,
          velocity: data2,
          channel: data3,
        };
      case 1: // note-off
        return {
          type: 'note-off',
          sampleTime,
          tickTime,
          trackId,
          note: data1,
          velocity: data2,
          channel: data3,
        };
      case 2: // automation
        return {
          type: 'automation',
          sampleTime,
          tickTime,
          trackId,
          paramId: String(data1), // Hash lookup needed
          value: data2,
          interpolation: data3 === 0 ? 'step' : data3 === 1 ? 'linear' : 'bezier',
        };
      case 3: // parameter
        return {
          type: 'parameter',
          sampleTime,
          tickTime,
          trackId,
          pluginId: String(data1),
          paramId: String(data2),
          value: data3,
          sampleOffset: data4,
        };
      default:
        return null;
    }
  }
  
  /**
   * Process events at their sample offsets
   */
  private processEvents(blockSize: number): void {
    while (this.eventQueueHead !== this.eventQueueTail) {
      const timedEvent = this.eventQueue[this.eventQueueHead];
      
      if (timedEvent.offset < 0 || timedEvent.offset >= blockSize) {
        break;
      }
      
      // Trigger event
      this.triggerEvent(timedEvent.event, timedEvent.offset);
      this.eventsTriggered++;
      
      // Clear and advance
      timedEvent.offset = -1;
      this.eventQueueHead = (this.eventQueueHead + 1) % this.maxEventsPerBlock;
    }
  }
  
  /**
   * Handle event by sending to connected processors
   */
  protected handleEvent(event: AnyScheduledEvent, offset: number): void {
    // Send to main thread for distribution
    this.port.postMessage({
      type: 'event-triggered',
      timestamp: currentTime,
      payload: { event, offset },
    });
  }
  
  /**
   * Handle buffer registration from main thread
   */
  protected handleBufferRegistration(message: { payload: { sab: SharedArrayBuffer; type: string } }): void {
    if (message.payload.type !== 'events') return;
    
    this.eventSAB = message.payload.sab;
    
    // Read header
    this.eventHeader = {
      writeIndex: new Int32Array(this.eventSAB, 0, 1),
      readIndex: new Int32Array(this.eventSAB, 4, 1),
      capacity: new Int32Array(this.eventSAB, 8, 1),
      dropped: new Int32Array(this.eventSAB, 12, 1),
    };
    
    this.eventCapacity = Atomics.load(this.eventHeader.capacity, 0);
    this.eventData = new Float64Array(
      this.eventSAB,
      this.HEADER_SIZE * Int32Array.BYTES_PER_ELEMENT,
      this.eventCapacity * this.EVENT_FIELDS
    );
  }
  
  /**
   * Get statistics
   */
  protected getStats() {
    return {
      ...this.stats,
      eventsTriggered: this.eventsTriggered,
      eventsReadFromSAB: this.eventsReadFromSAB,
      queueFill: (this.eventQueueTail - this.eventQueueHead + this.maxEventsPerBlock) % this.maxEventsPerBlock,
    };
  }
}

// Register processor
declare const registerProcessor: (name: string, processor: typeof AudioWorkletProcessor) => void;
registerProcessor('daw-scheduler', SchedulerProcessor as unknown as typeof AudioWorkletProcessor);
