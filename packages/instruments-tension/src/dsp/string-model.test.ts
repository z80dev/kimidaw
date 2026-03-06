import { describe, it, expect } from 'vitest';
import { StringVoice } from './string-model.js';

describe('StringVoice', () => {
  const sampleRate = 44100;
  const defaultParams = {
    excitationType: 'hammer' as const,
    force: 0.8,
    friction: 0.7,
    velocity: 0.7,
    position: 0.15,
    mass: 0.7,
    stiffness: 0.6,
    damping: 0.3,
    decay: 2.0,
    ratio: 1.0,
    inharmonics: 0.15,
    stringDamping: 0.3,
    tension: 0.7,
    tone: 0.6,
    pickupPosition: 0.12,
    nutReflection: 0.95,
    bridgeReflection: 0.9,
    damperEnabled: true,
    damperMass: 0.6,
    damperStiffness: 0.4,
    damperVelocity: 0.4,
    damperPosition: 0.08,
  };

  it('should create a string voice', () => {
    const voice = new StringVoice(0, sampleRate, defaultParams);
    expect(voice).toBeDefined();
  });

  it('should trigger and produce output', () => {
    const voice = new StringVoice(0, sampleRate, defaultParams);
    voice.trigger(60, 100);
    
    expect(voice.isPlaying()).toBe(true);
    expect(voice.getCurrentNote()).toBe(60);
    
    let maxOutput = 0;
    for (let i = 0; i < 1000; i++) {
      const output = voice.process();
      maxOutput = Math.max(maxOutput, Math.abs(output));
    }
    
    expect(maxOutput).toBeGreaterThan(0);
  });

  it('should support bow excitation', () => {
    const bowParams = { ...defaultParams, excitationType: 'bow' as const };
    const voice = new StringVoice(0, sampleRate, bowParams);
    voice.trigger(60, 100);
    
    let maxOutput = 0;
    for (let i = 0; i < 5000; i++) {
      const output = voice.process();
      maxOutput = Math.max(maxOutput, Math.abs(output));
    }
    
    expect(maxOutput).toBeGreaterThan(0);
  });

  it('should support plectrum excitation', () => {
    const plectrumParams = { ...defaultParams, excitationType: 'plectrum' as const };
    const voice = new StringVoice(0, sampleRate, plectrumParams);
    voice.trigger(60, 100);
    
    let maxOutput = 0;
    for (let i = 0; i < 1000; i++) {
      const output = voice.process();
      maxOutput = Math.max(maxOutput, Math.abs(output));
    }
    
    expect(maxOutput).toBeGreaterThan(0);
  });

  it('should decay over time', () => {
    const voice = new StringVoice(0, sampleRate, defaultParams);
    voice.trigger(60, 100);
    
    let earlySum = 0;
    for (let i = 0; i < 1000; i++) {
      earlySum += Math.abs(voice.process());
    }
    
    // Wait for decay
    for (let i = 0; i < 44100; i++) {
      voice.process();
    }
    
    let lateSum = 0;
    for (let i = 0; i < 1000; i++) {
      lateSum += Math.abs(voice.process());
    }
    
    expect(lateSum).toBeLessThan(earlySum * 0.5);
  });
});
