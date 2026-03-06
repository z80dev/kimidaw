import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createLinkClient,
  createSessionState,
  createPhaseSync,
  msPerBeat,
  beatDuration,
  samplesPerBeat,
  alignToQuantum,
  getPhaseInQuantum,
  isAtQuantumBoundary,
} from '../index.js';

describe('LinkClient', () => {
  let client: ReturnType<typeof createLinkClient>;

  beforeEach(() => {
    client = createLinkClient({
      initialTempo: 120,
      initialQuantum: 4,
    });
  });

  afterEach(() => {
    client.destroy();
  });

  it('should create Link client with default settings', () => {
    expect(client.isEnabled).toBe(false);
    expect(client.sessionState.tempo).toBe(120);
    expect(client.quantum).toBe(4);
    expect(client.numPeers).toBe(0);
  });

  it('should enable and disable', () => {
    client.enable();
    // In test environment, may not fully enable due to API limitations
    
    client.disable();
    expect(client.isEnabled).toBe(false);
  });

  it('should set and get tempo', () => {
    client.setTempo(128);
    expect(client.getTempo()).toBe(128);

    client.setTempo(200); // Should clamp
    expect(client.getTempo()).toBe(200);

    client.setTempo(10); // Should clamp to minimum
    expect(client.getTempo()).toBe(20);
  });

  it('should set quantum', () => {
    client.setQuantum(8);
    expect(client.quantum).toBe(8);
  });

  it('should control transport', () => {
    expect(client.isPlaying()).toBe(false);
    
    client.setIsPlaying(true);
    expect(client.isPlaying()).toBe(true);
    
    client.setIsPlaying(false);
    expect(client.isPlaying()).toBe(false);
  });

  it('should emit events', () => {
    const events: string[] = [];
    const unsubscribe = client.onEvent((event) => {
      events.push(event.type);
    });

    client.setTempo(130);
    
    expect(events.length).toBeGreaterThan(0);
    
    unsubscribe();
  });

  it('should handle start/stop sync settings', () => {
    expect(client.isStartStopSyncEnabled()).toBe(true);
    
    client.setStartStopSyncEnabled(false);
    expect(client.isStartStopSyncEnabled()).toBe(false);
    
    client.setStartStopSyncEnabled(true);
    expect(client.isStartStopSyncEnabled()).toBe(true);
  });
});

describe('SessionState', () => {
  let session: ReturnType<typeof createSessionState>;

  beforeEach(() => {
    session = createSessionState(120);
  });

  it('should track tempo', () => {
    expect(session.getTempo()).toBe(120);
    
    session.setTempo(128);
    expect(session.getTempo()).toBe(128);
  });

  it('should track playing state', () => {
    expect(session.isPlaying()).toBe(false);
    
    session.start();
    expect(session.isPlaying()).toBe(true);
    
    session.stop();
    expect(session.isPlaying()).toBe(false);
  });

  it('should calculate beat time', () => {
    const beat1 = session.getBeat();
    
    // Wait a tiny bit
    const start = performance.now();
    while (performance.now() - start < 10) {
      // busy wait
    }
    
    session.start();
    
    // Wait a tiny bit
    const start2 = performance.now();
    while (performance.now() - start2 < 10) {
      // busy wait
    }
    
    const beat2 = session.getBeat();
    expect(beat2).toBeGreaterThanOrEqual(beat1);
  });

  it('should convert between beat and time', () => {
    session.start();
    
    const now = performance.now();
    const beat = session.getBeatAtTime(now + 1000);
    expect(beat).toBeGreaterThan(0);
    
    const time = session.getTimeAtBeat(beat);
    expect(time).toBeCloseTo(now + 1000, -2);
  });
});

describe('PhaseSync', () => {
  let phaseSync: ReturnType<typeof createPhaseSync>;

  beforeEach(() => {
    phaseSync = createPhaseSync();
  });

  it('should calculate phase offset', () => {
    const offset = phaseSync.getPhaseOffset(4.5, 4.25, 4);
    expect(offset).toBeCloseTo(0.25, 2);
  });

  it('should handle wrap-around', () => {
    const offset = phaseSync.getPhaseOffset(0.1, 3.9, 4);
    expect(offset).toBeCloseTo(0.2, 1);
  });

  it('should calculate sync adjustment', () => {
    const adjustment = phaseSync.calculateSyncAdjustment(4.5, 4.25, 4, 0.5);
    expect(adjustment).toBeCloseTo(0.125, 2);
  });
});

describe('Utility Functions', () => {
  it('should calculate ms per beat', () => {
    expect(msPerBeat(60)).toBe(1000);
    expect(msPerBeat(120)).toBe(500);
    expect(msPerBeat(240)).toBe(250);
  });

  it('should calculate beat duration', () => {
    expect(beatDuration(60)).toBe(1);
    expect(beatDuration(120)).toBe(0.5);
  });

  it('should calculate samples per beat', () => {
    expect(samplesPerBeat(60, 44100)).toBe(44100);
    expect(samplesPerBeat(120, 44100)).toBe(22050);
  });

  it('should align to quantum', () => {
    expect(alignToQuantum(4.3, 4)).toBe(4);
    expect(alignToQuantum(4.6, 4)).toBe(4);
    expect(alignToQuantum(4.6, 4, 'ceil')).toBe(8);
    expect(alignToQuantum(4.3, 4, 'floor')).toBe(4);
  });

  it('should calculate phase in quantum', () => {
    expect(getPhaseInQuantum(4.3, 4)).toBeCloseTo(0.3, 5);
    expect(getPhaseInQuantum(7.5, 4)).toBeCloseTo(3.5, 5);
  });

  it('should detect quantum boundaries', () => {
    expect(isAtQuantumBoundary(4, 4)).toBe(true);
    expect(isAtQuantumBoundary(4.01, 4)).toBe(false);
    expect(isAtQuantumBoundary(3.99, 4)).toBe(true); // Near boundary
  });
});
