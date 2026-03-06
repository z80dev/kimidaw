import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGroovePoolManager,
  createGrooveExtractor,
  createGrooveApplier,
  createSwingGroove,
  createShuffleGroove,
  createMPCGroove,
  quantizeNotes,
  humanizeNotes,
} from '../index.js';
import type { Groove, MidiNote } from '../types.js';

interface TestMidiNote {
  id: string;
  start: number;
  velocity: number;
  duration: number;
}

describe('GroovePoolManager', () => {
  let pool: ReturnType<typeof createGroovePoolManager>;

  beforeEach(() => {
    pool = createGroovePoolManager();
  });

  it('should add and remove grooves', () => {
    const groove: Groove = {
      id: 'test-1',
      name: 'Test Groove',
      timingPoints: [],
      base: 0.25,
      quantize: 0,
      timing: 100,
      random: 0,
      velocity: 100,
      duration: 100,
      tags: [],
    };

    pool.addGroove(groove);
    expect(pool.getAllGrooves().length).toBe(1);

    pool.removeGroove('test-1');
    expect(pool.getAllGrooves().length).toBe(0);
  });

  it('should set current groove', () => {
    const groove: Groove = {
      id: 'test-1',
      name: 'Test Groove',
      timingPoints: [],
      base: 0.25,
      quantize: 0,
      timing: 100,
      random: 0,
      velocity: 100,
      duration: 100,
      tags: [],
    };

    pool.addGroove(groove);
    pool.setCurrentGroove('test-1');

    expect(pool.getCurrentGroove()?.id).toBe('test-1');
  });

  it('should load factory grooves', async () => {
    await pool.loadFactoryGrooves();
    expect(pool.getAllGrooves().length).toBeGreaterThan(0);
  });

  it('should emit events', () => {
    const events: string[] = [];
    const unsubscribe = pool.onEvent((event) => {
      events.push(event.type);
    });

    const groove: Groove = {
      id: 'test-1',
      name: 'Test',
      timingPoints: [],
      base: 0.25,
      quantize: 0,
      timing: 100,
      random: 0,
      velocity: 100,
      duration: 100,
      tags: [],
    };

    pool.addGroove(groove);
    expect(events).toContain('groove-added');

    pool.removeGroove('test-1');
    expect(events).toContain('groove-removed');

    unsubscribe();
  });
});

describe('GrooveExtractor', () => {
  let extractor: ReturnType<typeof createGrooveExtractor>;

  beforeEach(() => {
    extractor = createGrooveExtractor();
  });

  it('should extract groove from notes', () => {
    const notes = [
      { start: 0, velocity: 100, duration: 0.25 },
      { start: 0.52, velocity: 80, duration: 0.25 },
      { start: 1, velocity: 100, duration: 0.25 },
      { start: 1.54, velocity: 80, duration: 0.25 },
    ];

    const groove = extractor.extractGroove(notes, 'Test Groove');

    expect(groove.name).toBe('Test Groove');
    expect(groove.timingPoints.length).toBeGreaterThan(0);
  });

  it('should analyze groove', () => {
    const notes = [
      { start: 0, velocity: 100, duration: 0.25 },
      { start: 0.5, velocity: 80, duration: 0.25 },
      { start: 1, velocity: 100, duration: 0.25 },
      { start: 1.5, velocity: 80, duration: 0.25 },
    ];

    const analysis = extractor.analyzeGroove(notes);

    expect(analysis.noteDensity).toBeGreaterThan(0);
    expect(analysis.averageVelocity).toBeGreaterThan(0);
    expect(analysis.suggestedBase).toBeGreaterThan(0);
  });

  it('should handle empty note list', () => {
    const groove = extractor.extractGroove([], 'Empty');

    expect(groove.timingPoints.length).toBe(0);
    expect(groove.base).toBe(0.25);
  });
});

describe('GrooveApplier', () => {
  let applier: ReturnType<typeof createGrooveApplier>;

  beforeEach(() => {
    applier = createGrooveApplier();
  });

  it('should apply groove to notes', () => {
    const notes: TestMidiNote[] = [
      { id: '1', start: 0, velocity: 100, duration: 0.25 },
      { id: '2', start: 0.5, velocity: 100, duration: 0.25 },
      { id: '3', start: 1, velocity: 100, duration: 0.25 },
    ];

    const groove = createSwingGroove('Swing', 50, 0.5);
    const result = applier.applyGroove(notes, groove);

    expect(result.length).toBe(3);
    // Notes should have been moved slightly
    expect(result[0].start).not.toBe(0);
  });

  it('should handle empty groove', () => {
    const notes: TestMidiNote[] = [
      { id: '1', start: 0, velocity: 100, duration: 0.25 },
    ];

    const emptyGroove: Groove = {
      id: 'empty',
      name: 'Empty',
      timingPoints: [],
      base: 0.25,
      quantize: 0,
      timing: 100,
      random: 0,
      velocity: 100,
      duration: 100,
      tags: [],
    };

    const result = applier.applyGroove(notes, emptyGroove);
    expect(result[0].start).toBe(0);
  });

  it('should apply quantization', () => {
    const notes: TestMidiNote[] = [
      { id: '1', start: 0.1, velocity: 100, duration: 0.25 },
    ];

    const groove = createSwingGroove('Swing', 0);
    const result = applier.applyGroove(notes, groove, {
      quantize: 100,
    });

    // Should be quantized to grid
    expect(result[0].start).toBeCloseTo(0, 2);
  });
});

describe('Utility Functions', () => {
  it('should quantize notes', () => {
    const notes = [
      { start: 0.1, id: '1' },
      { start: 0.55, id: '2' },
      { start: 1.05, id: '3' },
    ];

    const quantized = quantizeNotes(notes, 0.5, 1.0);

    expect(quantized[0].start).toBe(0);
    expect(quantized[1].start).toBe(0.5);
    expect(quantized[2].start).toBe(1);
  });

  it('should humanize notes', () => {
    const notes = [
      { start: 0, velocity: 100, id: '1' },
      { start: 0.5, velocity: 100, id: '2' },
    ];

    const humanized = humanizeNotes(notes, 0.01, 10);

    // Should have slight variations
    expect(humanized[0].start).not.toBe(0);
    expect(humanized[0].velocity).not.toBe(100);
  });
});

describe('Factory Grooves', () => {
  it('should create swing groove', () => {
    const groove = createSwingGroove('Test Swing', 57);

    expect(groove.name).toBe('Test Swing');
    expect(groove.timingPoints.length).toBeGreaterThan(0);
    expect(groove.timing).toBe(100);
  });

  it('should create shuffle groove', () => {
    const groove = createShuffleGroove(60);

    expect(groove.name).toBe('Shuffle 60%');
    expect(groove.timingPoints.length).toBeGreaterThan(0);
  });

  it('should create MPC groove', () => {
    const groove = createMPCGroove(50);

    expect(groove.name).toBe('MPC Swing 50%');
    expect(groove.base).toBe(0.25);
  });
});
