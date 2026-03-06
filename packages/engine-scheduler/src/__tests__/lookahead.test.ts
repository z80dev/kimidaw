import { describe, it, expect, beforeEach } from 'vitest';
import { LookaheadManager, RenderScheduler } from '../lookahead.js';
import { DEFAULT_SCHEDULER_CONFIG } from '../types.js';
import { TempoMap } from '@daw/engine-core';

describe('LookaheadManager', () => {
  let manager: LookaheadManager;
  
  beforeEach(() => {
    manager = new LookaheadManager({
      config: DEFAULT_SCHEDULER_CONFIG,
      sampleRate: 48000,
      tempoMap: new TempoMap([], 48000),
    });
  });
  
  describe('window calculation', () => {
    it('calculates lookahead window from current position', () => {
      manager.setCurrentTempo(120);
      
      const window = manager.calculateWindow(0, 0);
      
      expect(window.startTick).toBe(0);
      // At 120 BPM, 120ms = ~1 beat = 960 ticks
      expect(window.endTick).toBeGreaterThan(900);
      expect(window.durationMs).toBe(120);
    });
    
    it('respects prepare horizon config', () => {
      manager = new LookaheadManager({
        config: { ...DEFAULT_SCHEDULER_CONFIG, prepareHorizonMs: 200 },
        sampleRate: 48000,
        tempoMap: new TempoMap([], 48000),
      });
      manager.setCurrentTempo(120);
      
      const window = manager.calculateWindow(0, 0);
      expect(window.durationMs).toBe(200);
      // 200ms at 120 BPM = ~1.6 beats
      expect(window.endTick).toBeGreaterThan(1500);
    });
    
    it('updates last lookahead end', () => {
      manager.setCurrentTempo(120);
      manager.calculateWindow(0, 0);
      manager.updateLastLookaheadEnd(1000);
      
      // Next window should start from last end
      const window = manager.calculateWindow(500, 0);
      expect(window.startTick).toBe(1000);
    });
  });
  
  describe('loop handling', () => {
    it('splits windows at loop boundary', () => {
      manager.setCurrentTempo(120);
      
      // Set position near end of 1-bar loop
      const windows = manager.calculateWindowsWithLoop(
        960 * 3, // 3 beats into 4-beat bar
        0,       // Loop start
        960 * 4  // Loop end (1 bar)
      );
      
      // Should get two windows if crossing boundary
      expect(windows.length).toBeGreaterThanOrEqual(1);
    });
    
    it('marks windows crossing loop boundary', () => {
      manager.setCurrentTempo(120);
      
      const windows = manager.calculateWindowsWithLoop(
        960 * 3,
        0,
        960 * 4
      );
      
      const crossingWindow = windows.find(w => w.crossesLoopBoundary);
      expect(crossingWindow).toBeDefined();
    });
  });
  
  describe('refill detection', () => {
    it('detects when refill is needed', () => {
      manager.setCurrentTempo(120);
      manager.updateLastLookaheadEnd(2000);
      
      // Current at 1000, last scheduled at 2000 = 1000 ticks ahead
      // 1000 ticks at 120 BPM = ~500ms, which is > 60ms threshold
      expect(manager.needsRefill(1000, 1000)).toBe(false);
    });
    
    it('requests refill when below threshold', () => {
      manager.setCurrentTempo(120);
      manager.updateLastLookaheadEnd(1100);
      
      // Only 100 ticks = ~50ms ahead, below 60ms threshold
      expect(manager.needsRefill(1000, 1000)).toBe(true);
    });
  });
  
  describe('chunking', () => {
    it('splits range into chunks', () => {
      manager.setCurrentTempo(120);
      
      const chunks = manager.chunkRange(0, 960 * 4);
      
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].start).toBe(0);
      expect(chunks[chunks.length - 1].end).toBe(960 * 4);
    });
    
    it('respects max chunk size', () => {
      manager = new LookaheadManager({
        config: { ...DEFAULT_SCHEDULER_CONFIG, maxChunkMs: 10 },
        sampleRate: 48000,
        tempoMap: new TempoMap([], 48000),
      });
      manager.setCurrentTempo(120);
      
      const chunks = manager.chunkRange(0, 960);
      
      // 10ms chunks should create more divisions than 20ms
      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });
  });
  
  describe('reset', () => {
    it('resets lookahead state', () => {
      manager.setCurrentTempo(120);
      manager.calculateWindow(0, 0);
      manager.updateLastLookaheadEnd(1000);
      
      manager.reset();
      
      const window = manager.calculateWindow(500, 0);
      // After reset, should start from current position
      expect(window.startTick).toBe(500);
    });
  });
});

describe('RenderScheduler', () => {
  let scheduler: RenderScheduler;
  
  beforeEach(() => {
    scheduler = new RenderScheduler(48000, 128);
  });
  
  describe('event scheduling', () => {
    it('queues events', () => {
      scheduler.scheduleEvents([
        createMockEvent(64), // Middle of 128-sample block
      ]);
      
      expect(scheduler.getPendingCount()).toBe(1);
    });
    
    it('processes events within block', () => {
      scheduler.scheduleEvents([
        createMockEvent(64),
        createMockEvent(200), // Next block
      ]);
      
      const processed = scheduler.processBlock(0);
      
      expect(processed).toHaveLength(1);
      expect(processed[0].offset).toBe(64);
    });
    
    it('removes processed events', () => {
      scheduler.scheduleEvents([
        createMockEvent(64),
        createMockEvent(200),
      ]);
      
      scheduler.processBlock(0);
      
      expect(scheduler.getPendingCount()).toBe(1);
    });
    
    it('drops events in the past', () => {
      scheduler.scheduleEvents([
        createMockEvent(-10), // In the past
        createMockEvent(200),
      ]);
      
      const processed = scheduler.processBlock(0);
      
      expect(processed).toHaveLength(0);
      expect(scheduler.getPendingCount()).toBe(1);
    });
    
    it('processes multiple blocks', () => {
      scheduler.scheduleEvents([
        createMockEvent(64),   // Block 0
        createMockEvent(200),  // Block 1
      ]);
      
      const block0 = scheduler.processBlock(0);
      expect(block0).toHaveLength(1);
      expect(block0[0].offset).toBe(64);
      
      const block1 = scheduler.processBlock(128);
      expect(block1).toHaveLength(1);
      expect(block1[0].offset).toBe(200 - 128);
    });
  });
  
  describe('clearing', () => {
    it('clears all pending events', () => {
      scheduler.scheduleEvents([
        createMockEvent(64),
        createMockEvent(200),
      ]);
      
      scheduler.clear();
      
      expect(scheduler.getPendingCount()).toBe(0);
    });
  });
});

// Helper
function createMockEvent(sampleTime: number) {
  return {
    type: 'note-on' as const,
    sampleTime,
    tickTime: Math.floor(sampleTime / 10),
    trackId: 'test',
    note: 60,
    velocity: 100,
    channel: 0,
  };
}
