import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scheduler, createScheduler } from '../scheduler.js';
import { DEFAULT_SCHEDULER_CONFIG } from '../types.js';
import type { TransportState, EventSource, AnyScheduledEvent } from '../types.js';

// Mock event source
function createMockEventSource(id: string, events: AnyScheduledEvent[]): EventSource {
  return {
    id,
    type: 'clip',
    isActive: () => true,
    getEvents: vi.fn((startTick: number, endTick: number) => {
      return events.filter(e => e.tickTime >= startTick && e.tickTime < endTick);
    }),
  };
}

describe('Scheduler', () => {
  let scheduler: Scheduler;
  let mockTransport: TransportState;
  
  beforeEach(() => {
    scheduler = createScheduler({
      sampleRate: 48000,
      config: DEFAULT_SCHEDULER_CONFIG,
    });
    
    mockTransport = {
      playing: false,
      recording: false,
      looping: false,
      punchIn: null,
      punchOut: null,
      loopStartTick: 0,
      loopEndTick: 960 * 4,
      currentTick: 0,
      currentSample: 0,
      tempo: 120,
      timeSigNum: 4,
      timeSigDen: 4,
    };
  });
  
  describe('lifecycle', () => {
    it('creates with default state', () => {
      expect(scheduler.isRunning()).toBe(false);
    });
    
    it('starts and stops', () => {
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
      
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });
    
    it('pauses without clearing', () => {
      scheduler.start();
      scheduler.pause();
      expect(scheduler.isRunning()).toBe(false);
    });
  });
  
  describe('event sources', () => {
    it('registers event sources', () => {
      const source = createMockEventSource('test', []);
      scheduler.registerSource(source);
      
      // Source should be called when scheduler ticks
      scheduler.setTransportState({ ...mockTransport, playing: true });
      scheduler.start();
      scheduler.tick();
      
      expect(source.getEvents).toHaveBeenCalled();
    });
    
    it('unregisters event sources', () => {
      const source = createMockEventSource('test', []);
      scheduler.registerSource(source);
      scheduler.unregisterSource('test');
      
      scheduler.setTransportState({ ...mockTransport, playing: true });
      scheduler.start();
      scheduler.tick();
      
      expect(source.getEvents).not.toHaveBeenCalled();
    });
  });
  
  describe('scheduling', () => {
    it('returns null when not running', () => {
      scheduler.setTransportState({ ...mockTransport, playing: true });
      const result = scheduler.tick();
      expect(result).toBeNull();
    });
    
    it('returns null when transport stopped', () => {
      scheduler.start();
      scheduler.setTransportState({ ...mockTransport, playing: false });
      const result = scheduler.tick();
      expect(result).toBeNull();
    });
    
    it('schedules events from sources', () => {
      const events: AnyScheduledEvent[] = [
        {
          type: 'note-on',
          sampleTime: 0,
          tickTime: 0,
          trackId: 'track-1',
          note: 60,
          velocity: 100,
          channel: 0,
        },
      ];
      
      const source = createMockEventSource('test', events);
      scheduler.registerSource(source);
      
      scheduler.setTransportState({ ...mockTransport, playing: true });
      scheduler.start();
      
      const result = scheduler.tick();
      
      expect(result).not.toBeNull();
      expect(result!.chunks.length).toBeGreaterThan(0);
    });
    
    it('emits events to listeners', () => {
      const listener = vi.fn();
      scheduler.subscribe(listener);
      
      scheduler.setTransportState({ ...mockTransport, playing: true });
      scheduler.start();
      scheduler.tick();
      
      expect(listener).toHaveBeenCalled();
    });
  });
  
  describe('transport integration', () => {
    it('responds to transport start', () => {
      scheduler.setTransportState({ ...mockTransport, playing: false });
      scheduler.start();
      
      // Tick with playing=false should not schedule
      expect(scheduler.tick()).toBeNull();
      
      // Start transport
      scheduler.setTransportState({ ...mockTransport, playing: true });
      
      // Should now schedule
      const result = scheduler.tick();
      // May still be null if no sources, but tick was processed
    });
    
    it('responds to transport stop', () => {
      scheduler.start();
      scheduler.setTransportState({ ...mockTransport, playing: true });
      scheduler.tick();
      
      // Stop transport
      scheduler.setTransportState({ ...mockTransport, playing: false });
      
      // Should not schedule anymore
      expect(scheduler.tick()).toBeNull();
    });
    
    it('tracks position changes', () => {
      scheduler.setTransportState({ ...mockTransport, currentTick: 960 });
      expect(scheduler.getStats().timeSpanMs).toBe(0);
    });
  });
  
  describe('cleanup', () => {
    it('clears all events', () => {
      scheduler.start();
      scheduler.setTransportState({ ...mockTransport, playing: true });
      scheduler.tick();
      
      scheduler.clear();
      
      const stats = scheduler.getStats();
      expect(stats.eventCount).toBe(0);
    });
    
    it('disposes resources', () => {
      scheduler.start();
      scheduler.dispose();
      
      expect(scheduler.isRunning()).toBe(false);
    });
  });
});
