/**
 * SharedArrayBuffer Ring Buffer
 * 
 * Lock-free ring buffer using Atomics for thread-safe communication
 * between main thread and AudioWorklet.
 * 
 * Layout:
 * [0-3]: Header (writeIndex, readIndex, capacity, dropped)
 * [4...]: Data
 */

import type { RingHeader, RingBufferConfig } from './types.js';

/** SAB Ring Buffer for single producer, single consumer */
export class SABRingBuffer {
  private sab: SharedArrayBuffer;
  private header: RingHeader;
  private data: Float64Array;
  private capacity: number;
  private elementSize: number;
  private readonly HEADER_SIZE = 4;
  
  constructor(config: RingBufferConfig, existingSAB?: SharedArrayBuffer) {
    this.capacity = config.capacity;
    this.elementSize = config.elementSize;
    
    const headerBytes = this.HEADER_SIZE * Int32Array.BYTES_PER_ELEMENT;
    const dataBytes = this.capacity * this.elementSize * Float64Array.BYTES_PER_ELEMENT;
    
    if (existingSAB) {
      this.sab = existingSAB;
    } else {
      this.sab = new SharedArrayBuffer(headerBytes + dataBytes);
      this.initializeHeader();
    }
    
    this.header = {
      writeIndex: new Int32Array(this.sab, 0, 1),
      readIndex: new Int32Array(this.sab, 4, 1),
      capacity: new Int32Array(this.sab, 8, 1),
      dropped: new Int32Array(this.sab, 12, 1),
    };
    
    this.data = new Float64Array(this.sab, headerBytes, this.capacity * this.elementSize);
  }
  
  private initializeHeader(): void {
    const header = new Int32Array(this.sab, 0, this.HEADER_SIZE);
    header[0] = 0;  // writeIndex
    header[1] = 0;  // readIndex
    header[2] = this.capacity;
    header[3] = 0;  // dropped
  }
  
  /** Get underlying SAB */
  getSAB(): SharedArrayBuffer {
    return this.sab;
  }
  
  /** Get header for Atomics operations */
  getHeader(): RingHeader {
    return this.header;
  }
  
  /** Get current write position */
  getWriteIndex(): number {
    return Atomics.load(this.header.writeIndex, 0);
  }
  
  /** Get current read position */
  getReadIndex(): number {
    return Atomics.load(this.header.readIndex, 0);
  }
  
  /** Get dropped count */
  getDropped(): number {
    return Atomics.load(this.header.dropped, 0);
  }
  
  /** Get available space for writing */
  availableWrite(): number {
    const writeIdx = this.getWriteIndex();
    const readIdx = this.getReadIndex();
    
    if (writeIdx >= readIdx) {
      return this.capacity - (writeIdx - readIdx) - 1;
    } else {
      return readIdx - writeIdx - 1;
    }
  }
  
  /** Get available data for reading */
  availableRead(): number {
    const writeIdx = this.getWriteIndex();
    const readIdx = this.getReadIndex();
    
    if (writeIdx >= readIdx) {
      return writeIdx - readIdx;
    } else {
      return this.capacity - (readIdx - writeIdx);
    }
  }
  
  /** Write data to buffer (producer only) */
  write(data: Float64Array): number {
    const available = this.availableWrite();
    const toWrite = Math.min(available, Math.floor(data.length / this.elementSize));
    
    if (toWrite === 0) {
      Atomics.add(this.header.dropped, 0, 1);
      return 0;
    }
    
    let writeIdx = this.getWriteIndex();
    
    for (let i = 0; i < toWrite; i++) {
      const baseIdx = writeIdx * this.elementSize;
      for (let j = 0; j < this.elementSize; j++) {
        this.data[baseIdx + j] = data[i * this.elementSize + j];
      }
      writeIdx = (writeIdx + 1) % this.capacity;
    }
    
    Atomics.store(this.header.writeIndex, 0, writeIdx);
    return toWrite;
  }
  
  /** Read data from buffer (consumer only) */
  read(into: Float64Array): number {
    const available = this.availableRead();
    const toRead = Math.min(available, Math.floor(into.length / this.elementSize));
    
    if (toRead === 0) return 0;
    
    let readIdx = this.getReadIndex();
    
    for (let i = 0; i < toRead; i++) {
      const baseIdx = readIdx * this.elementSize;
      for (let j = 0; j < this.elementSize; j++) {
        into[i * this.elementSize + j] = this.data[baseIdx + j];
      }
      readIdx = (readIdx + 1) % this.capacity;
    }
    
    Atomics.store(this.header.readIndex, 0, readIdx);
    return toRead;
  }
  
  /** Peek at data without consuming (consumer only) */
  peek(offset = 0): Float64Array | null {
    const available = this.availableRead();
    if (offset >= available) return null;
    
    const readIdx = (this.getReadIndex() + offset) % this.capacity;
    const result = new Float64Array(this.elementSize);
    const baseIdx = readIdx * this.elementSize;
    
    for (let j = 0; j < this.elementSize; j++) {
      result[j] = this.data[baseIdx + j];
    }
    
    return result;
  };
  
  /** Clear the buffer */
  clear(): void {
    Atomics.store(this.header.readIndex, 0, this.getWriteIndex());
  }
  
  /** Reset to initial state */
  reset(): void {
    Atomics.store(this.header.writeIndex, 0, 0);
    Atomics.store(this.header.readIndex, 0, 0);
    Atomics.store(this.header.dropped, 0, 0);
  }
}

/** Ring buffer optimized for audio samples (interleaved multi-channel) */
export class AudioRingBuffer {
  private ringBuffer: SABRingBuffer;
  private channelCount: number;
  private blockSize: number;
  
  constructor(
    channelCount: number,
    maxBlocks: number,
    blockSize: number,
    existingSAB?: SharedArrayBuffer
  ) {
    this.channelCount = channelCount;
    this.blockSize = blockSize;
    // Each block = blockSize * channelCount samples
    const elementSize = blockSize * channelCount;
    
    this.ringBuffer = new SABRingBuffer(
      { capacity: maxBlocks, elementSize },
      existingSAB
    );
  }
  
  /** Write an audio block */
  writeBlock(block: Float32Array[]): boolean {
    if (block.length !== this.channelCount) return false;
    
    // Flatten interleaved
    const flat = new Float64Array(this.blockSize * this.channelCount);
    for (let ch = 0; ch < this.channelCount; ch++) {
      for (let i = 0; i < this.blockSize; i++) {
        flat[i * this.channelCount + ch] = block[ch][i];
      }
    }
    
    return this.ringBuffer.write(flat) === 1;
  }
  
  /** Read an audio block */
  readBlock(block: Float32Array[]): boolean {
    if (block.length !== this.channelCount) return false;
    
    const flat = new Float64Array(this.blockSize * this.channelCount);
    if (this.ringBuffer.read(flat) === 0) return false;
    
    // Deinterleave
    for (let ch = 0; ch < this.channelCount; ch++) {
      for (let i = 0; i < this.blockSize; i++) {
        block[ch][i] = flat[i * this.channelCount + ch];
      }
    }
    
    return true;
  }
  
  /** Get underlying SAB */
  getSAB(): SharedArrayBuffer {
    return this.ringBuffer.getSAB();
  }
  
  /** Available blocks */
  availableBlocks(): number {
    return this.ringBuffer.availableRead();
  }
}

/** Event ring buffer for scheduled events */
export class EventRingBuffer {
  private ringBuffer: SABRingBuffer;
  
  // Event format in SAB:
  // [0] = type code
  // [1] = sample time
  // [2] = tick time  
  // [3] = track ID hash
  // [4] = data 1
  // [5] = data 2
  // [6] = data 3
  // [7] = data 4
  private readonly EVENT_FIELDS = 8;
  
  constructor(capacity: number, existingSAB?: SharedArrayBuffer) {
    this.ringBuffer = new SABRingBuffer(
      { capacity, elementSize: this.EVENT_FIELDS },
      existingSAB
    );
  }
  
  /** Write an event */
  writeEvent(
    type: number,
    sampleTime: number,
    tickTime: number,
    trackIdHash: number,
    data: number[]
  ): boolean {
    const event = new Float64Array(this.EVENT_FIELDS);
    event[0] = type;
    event[1] = sampleTime;
    event[2] = tickTime;
    event[3] = trackIdHash;
    for (let i = 0; i < 4 && i < data.length; i++) {
      event[4 + i] = data[i];
    }
    
    return this.ringBuffer.write(event) === 1;
  }
  
  /** Read an event */
  readEvent(): {
    type: number;
    sampleTime: number;
    tickTime: number;
    trackIdHash: number;
    data: number[];
  } | null {
    const event = new Float64Array(this.EVENT_FIELDS);
    if (this.ringBuffer.read(event) === 0) return null;
    
    return {
      type: event[0],
      sampleTime: event[1],
      tickTime: event[2],
      trackIdHash: event[3],
      data: [event[4], event[5], event[6], event[7]],
    };
  }
  
  /** Get available events */
  availableEvents(): number {
    return this.ringBuffer.availableRead();
  }
  
  /** Get underlying SAB */
  getSAB(): SharedArrayBuffer {
    return this.ringBuffer.getSAB();
  }
}

/** Create a ring buffer */
export function createRingBuffer(
  config: RingBufferConfig,
  existingSAB?: SharedArrayBuffer
): SABRingBuffer {
  return new SABRingBuffer(config, existingSAB);
}

/** Create an audio ring buffer */
export function createAudioRingBuffer(
  channelCount: number,
  maxBlocks: number,
  blockSize: number,
  existingSAB?: SharedArrayBuffer
): AudioRingBuffer {
  return new AudioRingBuffer(channelCount, maxBlocks, blockSize, existingSAB);
}

/** Create an event ring buffer */
export function createEventRingBuffer(
  capacity: number,
  existingSAB?: SharedArrayBuffer
): EventRingBuffer {
  return new EventRingBuffer(capacity, existingSAB);
}
