import { describe, it, expect, beforeEach } from 'vitest';
import { SABRingBuffer, AudioRingBuffer, EventRingBuffer } from '../sab-ring-buffer.js';

describe('SABRingBuffer', () => {
  let buffer: SABRingBuffer;
  
  beforeEach(() => {
    buffer = new SABRingBuffer({ capacity: 10, elementSize: 4 });
  });
  
  describe('basic operations', () => {
    it('starts empty', () => {
      expect(buffer.availableRead()).toBe(0);
      expect(buffer.availableWrite()).toBe(9); // One slot always empty
    });
    
    it('writes and reads data', () => {
      const data = new Float64Array([1, 2, 3, 4]);
      
      const written = buffer.write(data);
      expect(written).toBe(1);
      expect(buffer.availableRead()).toBe(1);
      
      const read = new Float64Array(4);
      buffer.read(read);
      
      expect(read[0]).toBe(1);
      expect(read[1]).toBe(2);
      expect(read[2]).toBe(3);
      expect(read[3]).toBe(4);
    });
    
    it('handles multiple writes', () => {
      buffer.write(new Float64Array([1, 2, 3, 4]));
      buffer.write(new Float64Array([5, 6, 7, 8]));
      
      expect(buffer.availableRead()).toBe(2);
      
      const read1 = new Float64Array(4);
      const read2 = new Float64Array(4);
      
      buffer.read(read1);
      buffer.read(read2);
      
      expect(read1[0]).toBe(1);
      expect(read2[0]).toBe(5);
    });
    
    it('wraps around', () => {
      // Fill buffer
      for (let i = 0; i < 9; i++) {
        buffer.write(new Float64Array([i, i, i, i]));
      }
      
      // Read half
      for (let i = 0; i < 5; i++) {
        const read = new Float64Array(4);
        buffer.read(read);
      }
      
      // Write more (should wrap)
      const result = buffer.write(new Float64Array([99, 99, 99, 99]));
      expect(result).toBe(1);
    });
    
    it('returns 0 when full', () => {
      // Fill to capacity
      for (let i = 0; i < 10; i++) {
        buffer.write(new Float64Array([i, i, i, i]));
      }
      
      // Next write should fail
      const result = buffer.write(new Float64Array([99, 99, 99, 99]));
      expect(result).toBe(0);
    });
  });
  
  describe('peek', () => {
    it('peeks at data without consuming', () => {
      buffer.write(new Float64Array([1, 2, 3, 4]));
      
      const peeked = buffer.peek();
      expect(peeked).not.toBeNull();
      expect(peeked![0]).toBe(1);
      expect(buffer.availableRead()).toBe(1); // Still there
    });
    
    it('peeks at offset', () => {
      buffer.write(new Float64Array([1, 2, 3, 4]));
      buffer.write(new Float64Array([5, 6, 7, 8]));
      
      const peeked = buffer.peek(1);
      expect(peeked![0]).toBe(5);
    });
    
    it('returns null if offset exceeds available', () => {
      buffer.write(new Float64Array([1, 2, 3, 4]));
      
      const peeked = buffer.peek(5);
      expect(peeked).toBeNull();
    });
  });
  
  describe('clear', () => {
    it('clears all data', () => {
      buffer.write(new Float64Array([1, 2, 3, 4]));
      buffer.clear();
      
      expect(buffer.availableRead()).toBe(0);
    });
  });
  
  describe('reset', () => {
    it('resets to initial state', () => {
      buffer.write(new Float64Array([1, 2, 3, 4]));
      buffer.reset();
      
      expect(buffer.getWriteIndex()).toBe(0);
      expect(buffer.getReadIndex()).toBe(0);
      expect(buffer.getDropped()).toBe(0);
    });
  });
});

describe('AudioRingBuffer', () => {
  let buffer: AudioRingBuffer;
  
  beforeEach(() => {
    buffer = new AudioRingBuffer(2, 4, 128); // 2 channels, 4 blocks, 128 samples/block
  });
  
  it('writes and reads audio blocks', () => {
    const block = [
      new Float32Array(128).fill(0.5),
      new Float32Array(128).fill(-0.5),
    ];
    
    const written = buffer.writeBlock(block);
    expect(written).toBe(true);
    expect(buffer.availableBlocks()).toBe(1);
    
    const readBlock = [new Float32Array(128), new Float32Array(128)];
    const read = buffer.readBlock(readBlock);
    
    expect(read).toBe(true);
    expect(readBlock[0][0]).toBe(0.5);
    expect(readBlock[1][0]).toBe(-0.5);
  });
  
  it('returns false on empty read', () => {
    const readBlock = [new Float32Array(128), new Float32Array(128)];
    const read = buffer.readBlock(readBlock);
    
    expect(read).toBe(false);
  });
  
  it('returns false on full write', () => {
    const block = [new Float32Array(128), new Float32Array(128)];
    
    // Fill to capacity
    for (let i = 0; i < 4; i++) {
      buffer.writeBlock(block);
    }
    
    // Next should fail
    const written = buffer.writeBlock(block);
    expect(written).toBe(false);
  });
});

describe('EventRingBuffer', () => {
  let buffer: EventRingBuffer;
  
  beforeEach(() => {
    buffer = new EventRingBuffer(10);
  });
  
  it('writes and reads events', () => {
    const written = buffer.writeEvent(1, 1000, 480, 12345, [60, 100, 0, 0]);
    expect(written).toBe(true);
    
    const event = buffer.readEvent();
    expect(event).not.toBeNull();
    expect(event!.type).toBe(1);
    expect(event!.sampleTime).toBe(1000);
    expect(event!.tickTime).toBe(480);
  });
  
  it('returns null on empty read', () => {
    const event = buffer.readEvent();
    expect(event).toBeNull();
  });
  
  it('tracks available events', () => {
    buffer.writeEvent(1, 1000, 480, 12345, [60, 100, 0, 0]);
    buffer.writeEvent(1, 2000, 960, 12345, [64, 100, 0, 0]);
    
    expect(buffer.availableEvents()).toBe(2);
  });
});
