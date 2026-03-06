import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Transport, createTransport } from '../transport.js';
import { PPQ } from '../types.js';

describe('Transport', () => {
  let transport: Transport;
  
  beforeEach(() => {
    transport = createTransport({
      sampleRate: 48000,
      initialTempo: 120,
    });
  });
  
  describe('initialization', () => {
    it('creates with default state', () => {
      const state = transport.getState();
      expect(state.playing).toBe(false);
      expect(state.recording).toBe(false);
      expect(state.looping).toBe(false);
      expect(state.currentTick).toBe(0);
      expect(state.tempo).toBe(120);
      expect(state.timeSigNum).toBe(4);
      expect(state.timeSigDen).toBe(4);
    });
    
    it('accepts custom initial values', () => {
      const custom = createTransport({
        initialTempo: 140,
        initialTimeSigNum: 3,
        initialTimeSigDen: 4,
      });
      const state = custom.getState();
      expect(state.tempo).toBe(140);
      expect(state.timeSigNum).toBe(3);
      expect(state.timeSigDen).toBe(4);
    });
  });
  
  describe('playback control', () => {
    it('starts playing', () => {
      transport.play();
      expect(transport.getState().playing).toBe(true);
    });
    
    it('stops playing', () => {
      transport.play();
      transport.stop();
      expect(transport.getState().playing).toBe(false);
    });
    
    it('toggles playback', () => {
      transport.togglePlay();
      expect(transport.getState().playing).toBe(true);
      transport.togglePlay();
      expect(transport.getState().playing).toBe(false);
    });
    
    it('starts from specified position', () => {
      transport.play(PPQ * 4); // Start at bar 2
      expect(transport.getState().currentTick).toBe(PPQ * 4);
      expect(transport.getState().playing).toBe(true);
    });
  });
  
  describe('recording', () => {
    it('starts recording', () => {
      transport.record();
      expect(transport.getState().recording).toBe(true);
    });
    
    it('auto-starts playback when recording', () => {
      transport.record();
      expect(transport.getState().playing).toBe(true);
      expect(transport.getState().recording).toBe(true);
    });
    
    it('stops recording without stopping playback', () => {
      transport.record();
      transport.stopRecording();
      expect(transport.getState().recording).toBe(false);
      expect(transport.getState().playing).toBe(true);
    });
  });
  
  describe('looping', () => {
    it('enables looping', () => {
      transport.setLooping(true);
      expect(transport.getState().looping).toBe(true);
    });
    
    it('sets loop range', () => {
      transport.setLoopRange(0, PPQ * 4);
      const state = transport.getState();
      expect(state.loopStartTick).toBe(0);
      expect(state.loopEndTick).toBe(PPQ * 4);
    });
    
    it('throws on invalid loop range', () => {
      expect(() => transport.setLoopRange(PPQ * 4, 0)).toThrow();
      expect(() => transport.setLoopRange(100, 100)).toThrow();
    });
    
    it('wraps position during loop', () => {
      transport.setLooping(true);
      transport.setLoopRange(0, PPQ * 4); // Loop one bar
      transport.setPosition(PPQ * 3); // Near end of loop
      transport.play();
      
      // Process past loop end
      const didWrap = transport.process(48000); // Process 1 second (~2 beats at 120bpm)
      
      expect(didWrap).toBe(true);
      // Should have wrapped back near start
      expect(transport.getState().currentTick).toBeLessThan(PPQ * 4);
    });
  });
  
  describe('punch in/out', () => {
    it('sets punch range', () => {
      transport.setPunchRange(PPQ, PPQ * 2);
      const state = transport.getState();
      expect(state.punchIn).toBe(PPQ);
      expect(state.punchOut).toBe(PPQ * 2);
    });
    
    it('detects punch range membership', () => {
      transport.setPunchRange(PPQ, PPQ * 2);
      
      transport.setPosition(PPQ / 2);
      expect(transport.isInPunchRange()).toBe(false);
      
      transport.setPosition(PPQ * 1.5);
      expect(transport.isInPunchRange()).toBe(true);
      
      transport.setPosition(PPQ * 3);
      expect(transport.isInPunchRange()).toBe(false);
    });
    
    it('is always in range when no punch set', () => {
      expect(transport.isInPunchRange()).toBe(true);
    });
  });
  
  describe('position control', () => {
    it('sets position in ticks', () => {
      transport.setPosition(PPQ * 4);
      expect(transport.getState().currentTick).toBe(PPQ * 4);
    });
    
    it('does not allow negative position', () => {
      transport.setPosition(-100);
      expect(transport.getState().currentTick).toBe(0);
    });
    
    it('sets position from samples', () => {
      // At 120 BPM, 48000 Hz: 24000 samples = 1 beat = PPQ ticks
      transport.setPositionFromSample(24000);
      expect(transport.getState().currentTick).toBeCloseTo(PPQ, 0);
    });
  });
  
  describe('tempo map', () => {
    it('adds tempo events', () => {
      transport.addTempoEvent({ tick: PPQ * 4, bpm: 140 });
      
      // Position before tempo change
      transport.setPosition(0);
      expect(transport.getState().tempo).toBe(120);
      
      // Position after tempo change
      transport.setPosition(PPQ * 4);
      expect(transport.getState().tempo).toBe(140);
    });
    
    it('replaces tempo at same tick', () => {
      transport.addTempoEvent({ tick: 0, bpm: 100 });
      expect(transport.getState().tempo).toBe(100);
    });
  });
  
  describe('events', () => {
    it('emits state change events', () => {
      const listener = vi.fn();
      const unsubscribe = transport.subscribe(listener);
      
      transport.play();
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          property: 'playing',
          previousValue: false,
          newValue: true,
        })
      );
      
      unsubscribe();
    });
    
    it('stops receiving events after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = transport.subscribe(listener);
      
      unsubscribe();
      transport.play();
      
      // Should not have been called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });
  
  describe('process', () => {
    it('does not advance when stopped', () => {
      transport.setPosition(0);
      transport.process(48000);
      expect(transport.getState().currentTick).toBe(0);
    });
    
    it('advances position when playing', () => {
      transport.setPosition(0);
      transport.play();
      
      // Process 1 second at 120 BPM, 48kHz = ~2 beats = 2*PPQ ticks
      transport.process(48000);
      
      expect(transport.getState().currentTick).toBeGreaterThan(0);
    });
  });
  
  describe('reset', () => {
    it('resets to initial state', () => {
      transport.play();
      transport.setPosition(PPQ * 10);
      transport.record();
      
      transport.reset();
      
      const state = transport.getState();
      expect(state.playing).toBe(false);
      expect(state.recording).toBe(false);
      expect(state.currentTick).toBe(0);
    });
  });
  
  describe('timing context', () => {
    it('provides current timing context', () => {
      const ctx = transport.getTimingContext();
      expect(ctx.sampleRate).toBe(48000);
      expect(ctx.tempo).toBe(120);
      expect(ctx.timeSigNum).toBe(4);
      expect(ctx.timeSigDen).toBe(4);
    });
  });
});
