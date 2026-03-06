/**
 * Main thread to AudioWorklet bridge
 * 
 * Manages communication between the main thread and AudioWorklet processors.
 * Handles:
 * - Message passing
 * - SharedArrayBuffer coordination
 * - Event queue transfer
 * - Parameter updates
 * - State synchronization
 */

import type { 
  AnyScheduledEvent, 
  ScheduledEvent,
  RingHeader,
  EventPriority 
} from './types.js';

/** Message types for worklet communication */
export type WorkletMessageType =
  | 'init'
  | 'event'
  | 'param'
  | 'state'
  | 'buffer'
  | 'ping'
  | 'pong'
  | 'error';

/** Base message structure */
export interface WorkletMessage {
  type: WorkletMessageType;
  timestamp: number;
  payload: unknown;
}

/** Event batch message */
export interface EventBatchMessage extends WorkletMessage {
  type: 'event';
  payload: {
    events: AnyScheduledEvent[];
    priority: EventPriority;
  };
}

/** Parameter change message */
export interface ParamChangeMessage extends WorkletMessage {
  type: 'param';
  payload: {
    nodeId: string;
    paramId: string;
    value: number;
    sampleOffset: number;
  };
}

/** State update message */
export interface StateUpdateMessage extends WorkletMessage {
  type: 'state';
  payload: {
    playing: boolean;
    currentTick: number;
    currentSample: number;
    tempo: number;
  };
}

/** SAB buffer registration message */
export interface BufferRegistrationMessage extends WorkletMessage {
  type: 'buffer';
  payload: {
    bufferId: string;
    sab: SharedArrayBuffer;
    header: RingHeader;
    type: 'events' | 'meters' | 'record';
  };
}

/** Worklet statistics from processor */
export interface WorkletStats {
  /** Process call count */
  processCount: number;
  /** Events processed */
  eventsProcessed: number;
  /** Events dropped (buffer overflow) */
  eventsDropped: number;
  /** Underrun count */
  underruns: number;
  /** Current load estimate (0-1) */
  loadEstimate: number;
  /** Last process time in ms */
  lastProcessTime: number;
}

/** Options for creating a worklet bridge */
export interface WorkletBridgeOptions {
  /** AudioWorkletNode instance */
  node: AudioWorkletNode;
  /** Use SharedArrayBuffer if available */
  useSAB: boolean;
  /** Buffer capacity for event ring buffer */
  eventBufferCapacity?: number;
  /** Callback for messages from worklet */
  onMessage?: (message: WorkletMessage) => void;
  /** Callback for statistics updates */
  onStats?: (stats: WorkletStats) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

/**
 * Bridge between main thread and AudioWorklet processor
 * Manages bidirectional communication with automatic fallback to MessagePort
 */
export class WorkletBridge {
  private node: AudioWorkletNode;
  private useSAB: boolean;
  private eventBufferCapacity: number;
  private onMessage?: (message: WorkletMessage) => void;
  private onStats?: (stats: WorkletStats) => void;
  private onError?: (error: Error) => void;
  
  // SAB ring buffers
  private eventSAB: SharedArrayBuffer | null = null;
  private eventHeader: RingHeader | null = null;
  private eventData: Float64Array | null = null;
  
  // Message batching for non-SAB mode
  private messageQueue: WorkletMessage[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_INTERVAL_MS = 5;
  
  // State
  private connected = false;
  private messageHandler: (event: MessageEvent) => void;
  
  constructor(options: WorkletBridgeOptions) {
    this.node = options.node;
    this.useSAB = options.useSAB && typeof SharedArrayBuffer !== 'undefined';
    this.eventBufferCapacity = options.eventBufferCapacity ?? 1024;
    this.onMessage = options.onMessage;
    this.onStats = options.onStats;
    this.onError = options.onError;
    
    // Bind message handler
    this.messageHandler = this.handleMessage.bind(this);
    this.node.port.addEventListener('message', this.messageHandler);
    this.node.port.start();
    
    if (this.useSAB) {
      this.initializeSAB();
    }
    
    this.connected = true;
  }
  
  /** Initialize SharedArrayBuffer ring buffer */
  private initializeSAB(): void {
    // Header: 4 Int32s (writeIndex, readIndex, capacity, dropped)
    const headerSize = 4 * Int32Array.BYTES_PER_ELEMENT;
    // Data: Each event is 8 floats (64 bytes in Float64Array)
    const dataSize = this.eventBufferCapacity * 8 * Float64Array.BYTES_PER_ELEMENT;
    
    this.eventSAB = new SharedArrayBuffer(headerSize + dataSize);
    
    this.eventHeader = {
      writeIndex: new Int32Array(this.eventSAB, 0, 1),
      readIndex: new Int32Array(this.eventSAB, 4, 1),
      capacity: new Int32Array(this.eventSAB, 8, 1),
      dropped: new Int32Array(this.eventSAB, 12, 1),
    };
    
    // Initialize header
    Atomics.store(this.eventHeader.writeIndex, 0, 0);
    Atomics.store(this.eventHeader.readIndex, 0, 0);
    Atomics.store(this.eventHeader.capacity, 0, this.eventBufferCapacity);
    Atomics.store(this.eventHeader.dropped, 0, 0);
    
    // Data buffer starts after header
    this.eventData = new Float64Array(this.eventSAB, headerSize, this.eventBufferCapacity * 8);
    
    // Send SAB to worklet
    this.sendMessage({
      type: 'buffer',
      timestamp: performance.now(),
      payload: {
        bufferId: 'events',
        sab: this.eventSAB,
        type: 'events',
      },
    } as BufferRegistrationMessage);
  }
  
  /** Handle incoming messages from worklet */
  private handleMessage(event: MessageEvent): void {
    const message = event.data as WorkletMessage;
    
    if (!message || typeof message !== 'object') {
      return;
    }
    
    // Handle statistics
    if (message.type === 'state' && this.onStats) {
      const stats = message.payload as WorkletStats;
      this.onStats(stats);
    }
    
    // Handle errors
    if (message.type === 'error' && this.onError) {
      const error = new Error(String(message.payload));
      this.onError(error);
    }
    
    // Pass to user callback
    if (this.onMessage) {
      this.onMessage(message);
    }
  }
  
  /** Send a message to the worklet */
  sendMessage(message: WorkletMessage): void {
    if (!this.connected) {
      throw new Error('Bridge is not connected');
    }
    
    this.node.port.postMessage(message);
  }
  
  /** Send events to the worklet */
  sendEvents(events: AnyScheduledEvent[], priority: EventPriority = 1): void {
    if (!this.connected) return;
    
    if (this.useSAB && this.eventSAB && this.eventHeader && this.eventData) {
      this.writeEventsToSAB(events);
    } else {
      // Batch messages for non-SAB mode
      this.queueMessage({
        type: 'event',
        timestamp: performance.now(),
        payload: { events, priority },
      } as EventBatchMessage);
    }
  }
  
  /** Write events to SAB ring buffer (thread-safe) */
  private writeEventsToSAB(events: AnyScheduledEvent[]): void {
    if (!this.eventHeader || !this.eventData) return;
    
    const capacity = this.eventBufferCapacity;
    const header = this.eventHeader;
    const data = this.eventData;
    
    for (const event of events) {
      // Get current write position
      const writeIdx = Atomics.load(header.writeIndex, 0);
      const readIdx = Atomics.load(header.readIndex, 0);
      
      // Check for overflow
      const nextWriteIdx = (writeIdx + 1) % capacity;
      if (nextWriteIdx === readIdx) {
        // Buffer full - increment drop counter
        Atomics.add(header.dropped, 0, 1);
        continue;
      }
      
      // Serialize event to buffer (8 floats per event)
      const baseIdx = writeIdx * 8;
      
      // Event format:
      // [0] = type code (0=note-on, 1=note-off, 2=automation, 3=parameter, 4=clip)
      // [1] = sample time
      // [2] = tick time
      // [3-7] = type-specific data
      
      data[baseIdx + 0] = this.encodeEventType(event.type);
      data[baseIdx + 1] = event.sampleTime;
      data[baseIdx + 2] = event.tickTime;
      
      // Encode event-specific data
      if (event.type === 'note-on' || event.type === 'note-off') {
        data[baseIdx + 3] = event.note;
        data[baseIdx + 4] = event.velocity;
        data[baseIdx + 5] = event.channel;
      } else if (event.type === 'automation') {
        // Hash paramId to number for SAB storage
        data[baseIdx + 3] = this.hashString(event.paramId);
        data[baseIdx + 4] = event.value;
        data[baseIdx + 5] = event.interpolation === 'step' ? 0 : 
                           event.interpolation === 'linear' ? 1 : 2;
      } else if (event.type === 'parameter') {
        data[baseIdx + 3] = this.hashString(event.pluginId);
        data[baseIdx + 4] = this.hashString(event.paramId);
        data[baseIdx + 5] = event.value;
        data[baseIdx + 6] = event.sampleOffset;
      }
      
      // Update write index
      Atomics.store(header.writeIndex, 0, nextWriteIdx);
    }
  }
  
  /** Encode event type to number */
  private encodeEventType(type: string): number {
    switch (type) {
      case 'note-on': return 0;
      case 'note-off': return 1;
      case 'automation': return 2;
      case 'parameter': return 3;
      case 'clip-start': return 4;
      case 'clip-end': return 5;
      default: return -1;
    }
  }
  
  /** Simple string hash for SAB encoding */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
  
  /** Queue a message for batched sending */
  private queueMessage(message: WorkletMessage): void {
    this.messageQueue.push(message);
    
    // Schedule batch send
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushMessageQueue();
      }, this.BATCH_INTERVAL_MS);
    }
  }
  
  /** Flush batched messages */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;
    
    const batch = this.messageQueue.splice(0, this.messageQueue.length);
    this.batchTimeout = null;
    
    // Send as single batch message
    this.node.port.postMessage({
      type: 'event',
      timestamp: performance.now(),
      payload: { batch },
    });
  }
  
  /** Send parameter change to worklet */
  setParameter(
    nodeId: string,
    paramId: string,
    value: number,
    sampleOffset: number = 0
  ): void {
    this.sendMessage({
      type: 'param',
      timestamp: performance.now(),
      payload: { nodeId, paramId, value, sampleOffset },
    } as ParamChangeMessage);
  }
  
  /** Update transport state in worklet */
  updateTransportState(state: {
    playing: boolean;
    currentTick: number;
    currentSample: number;
    tempo: number;
  }): void {
    this.sendMessage({
      type: 'state',
      timestamp: performance.now(),
      payload: state,
    } as StateUpdateMessage);
  }
  
  /** Ping the worklet to check responsiveness */
  ping(): Promise<number> {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 100);
      
      const handlePong = (event: MessageEvent) => {
        const message = event.data as WorkletMessage;
        if (message.type === 'pong') {
          clearTimeout(timeout);
          this.node.port.removeEventListener('message', handlePong);
          resolve(performance.now() - startTime);
        }
      };
      
      this.node.port.addEventListener('message', handlePong);
      this.sendMessage({
        type: 'ping',
        timestamp: startTime,
        payload: null,
      });
    });
  }
  
  /** Get SAB statistics */
  getSABStats(): { dropped: number; fillRatio: number } | null {
    if (!this.useSAB || !this.eventHeader) {
      return null;
    }
    
    const writeIdx = Atomics.load(this.eventHeader.writeIndex, 0);
    const readIdx = Atomics.load(this.eventHeader.readIndex, 0);
    const dropped = Atomics.load(this.eventHeader.dropped, 0);
    
    let fill = writeIdx - readIdx;
    if (fill < 0) fill += this.eventBufferCapacity;
    
    return {
      dropped,
      fillRatio: fill / this.eventBufferCapacity,
    };
  }
  
  /** Check if using SAB */
  isUsingSAB(): boolean {
    return this.useSAB;
  }
  
  /** Disconnect and cleanup */
  dispose(): void {
    this.connected = false;
    
    // Flush pending messages
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.flushMessageQueue();
    }
    
    // Remove listener
    this.node.port.removeEventListener('message', this.messageHandler);
    this.node.port.close();
    
    // Release SAB references
    this.eventSAB = null;
    this.eventHeader = null;
    this.eventData = null;
  }
}

/** Create a worklet bridge */
export function createWorkletBridge(options: WorkletBridgeOptions): WorkletBridge {
  return new WorkletBridge(options);
}

/** Check if worklet communication is supported */
export function isWorkletSupported(): boolean {
  return typeof AudioWorkletNode !== 'undefined';
}

/** Serialize an event for transfer */
export function serializeEvent(event: AnyScheduledEvent): Float64Array {
  const data = new Float64Array(8);
  
  // Type code
  switch (event.type) {
    case 'note-on': data[0] = 0; break;
    case 'note-off': data[0] = 1; break;
    case 'automation': data[0] = 2; break;
    case 'parameter': data[0] = 3; break;
    case 'clip-start': data[0] = 4; break;
    case 'clip-end': data[0] = 5; break;
  }
  
  data[1] = event.sampleTime;
  data[2] = event.tickTime;
  
  return data;
}
