/**
 * Quantizer Tests
 */

import { describe, it, expect } from 'vitest';
import { Quantizer } from '../editing/quantize.js';
import type { MidiNote } from '@daw/project-schema';

describe('Quantizer', () => {
  const createNote = (startTick: number, duration: number, pitch = 60): MidiNote => ({
    id: `note-${startTick}`,
    pitch,
    velocity: 100,
    startTick,
    duration,
  });

  it('quantizes note start times', () => {
    const quantizer = new Quantizer({ division: 4, ppq: 960 });
    
    const notes = [
      createNote(100, 240),
      createNote(500, 240),
    ];
    
    const quantized = quantizer.quantize(notes);
    
    // 100 should snap to 240 (16th note at 960 PPQ)
    expect(quantized[0].startTick).toBe(240);
    // 500 should snap to 480
    expect(quantized[1].startTick).toBe(480);
  });

  it('respects quantize amount', () => {
    const quantizer = new Quantizer({ division: 4, ppq: 960, amount: 0.5 });
    
    const notes = [createNote(0, 240)];
    const quantized = quantizer.quantize(notes);
    
    // With 50% amount, should move halfway to grid
    expect(quantized[0].startTick).toBe(120);
  });

  it('applies swing', () => {
    const quantizer = new Quantizer({
      division: 4,
      ppq: 960,
      swing: 0.5,
    });
    
    const notes = [
      createNote(0, 240),
      createNote(240, 240), // Off-beat
    ];
    
    const swung = quantizer.applySwing(notes);
    
    // First note unchanged
    expect(swung[0].startTick).toBe(0);
    // Second note delayed by swing
    expect(swung[1].startTick).toBeGreaterThan(240);
  });

  it('humanizes notes', () => {
    const quantizer = new Quantizer();
    
    const notes = [createNote(0, 240)];
    const humanized = quantizer.humanize(notes, 20);
    
    // Should have some variation
    expect(humanized[0].startTick).not.toBe(0);
    expect(humanized[0].velocity).not.toBe(100);
  });

  it('applies legato', () => {
    const quantizer = new Quantizer();
    
    const notes = [
      createNote(0, 240, 60),
      createNote(480, 240, 60),
    ];
    
    const legato = quantizer.legato(notes);
    
    // First note should extend to second note
    expect(legato[0].duration).toBe(480);
  });

  it('strums chords', () => {
    const quantizer = new Quantizer();
    
    const notes = [
      createNote(0, 240, 60),
      createNote(0, 240, 64),
      createNote(0, 240, 67),
    ];
    
    const strummed = quantizer.strum(notes, 10, 'down');
    
    // Notes should be offset
    expect(strummed[0].startTick).toBe(0);
    expect(strummed[1].startTick).toBe(10);
    expect(strummed[2].startTick).toBe(20);
  });
});
