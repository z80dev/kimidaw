import { describe, it, expect, beforeEach } from 'vitest';
import { ModalResonator } from './resonator.js';

describe('ModalResonator', () => {
  const sampleRate = 44100;
  
  it('should create a resonator with given type', () => {
    const resonator = new ModalResonator('membrane', sampleRate);
    expect(resonator).toBeDefined();
  });

  it('should not be active initially', () => {
    const resonator = new ModalResonator('membrane', sampleRate);
    expect(resonator.isActive()).toBe(false);
  });

  it('should become active after trigger', () => {
    const resonator = new ModalResonator('membrane', sampleRate);
    resonator.setParameters({
      freq: 440,
      decay: 1.0,
      material: 0.5,
      radius: 0.5,
      hitPosition: 0.5,
      type: 'membrane'
    });
    resonator.trigger(1.0);
    expect(resonator.isActive()).toBe(true);
  });

  it('should produce non-zero output after excitation', () => {
    const resonator = new ModalResonator('membrane', sampleRate);
    resonator.setParameters({
      freq: 440,
      decay: 0.5,
      material: 0.5,
      radius: 0.5,
      hitPosition: 0.5,
      type: 'membrane'
    });
    resonator.trigger(1.0);
    
    // Process some samples
    let maxOutput = 0;
    for (let i = 0; i < 1000; i++) {
      const output = resonator.process(0);
      maxOutput = Math.max(maxOutput, Math.abs(output));
    }
    
    expect(maxOutput).toBeGreaterThan(0);
  });

  it('should decay over time', () => {
    const resonator = new ModalResonator('membrane', sampleRate);
    resonator.setParameters({
      freq: 440,
      decay: 0.1,
      material: 0.5,
      radius: 0.5,
      hitPosition: 0.5,
      type: 'membrane'
    });
    resonator.trigger(1.0);
    
    // Get initial output
    let earlySum = 0;
    for (let i = 0; i < 100; i++) {
      earlySum += Math.abs(resonator.process(0));
    }
    
    // Wait and get later output
    let lateSum = 0;
    for (let i = 0; i < 44100; i++) { // 1 second
      const val = resonator.process(0);
      if (i > 43000) lateSum += Math.abs(val);
    }
    
    expect(lateSum).toBeLessThan(earlySum * 0.5);
  });

  it('should support different resonator types', () => {
    const types = ['beam', 'marimba', 'string', 'membrane', 'plate', 'pipe', 'tube'];
    
    for (const type of types) {
      const resonator = new ModalResonator(type, sampleRate);
      resonator.setParameters({
        freq: 440,
        decay: 1.0,
        material: 0.5,
        radius: 0.5,
        hitPosition: 0.5,
        type
      });
      resonator.trigger(1.0);
      
      // Should produce output
      const output = resonator.process(0);
      expect(typeof output).toBe('number');
    }
  });
});
