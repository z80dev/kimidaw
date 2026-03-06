import { describe, it, expect } from 'vitest';
import { TineVoice } from './tine-model.js';

describe('TineVoice', () => {
  const sampleRate = 44100;
  const defaultParams = {
    tone: 0.5,
    color: 0.5,
    decay: 1.5,
    level: 1,
    inharmonics: 0.2,
    pickupSymmetry: 0,
    pickupDistance: 0.4,
    pickupType: 'em' as const,
    hardness: 0.5,
    hammerNoise: 0.05,
    force: 0.7,
    damperAmount: 0.8,
    damperTone: 0.5,
    model: 'rhodes' as const,
  };

  it('should create a tine voice', () => {
    const voice = new TineVoice(0, sampleRate, defaultParams);
    expect(voice).toBeDefined();
  });

  it('should trigger and produce output', () => {
    const voice = new TineVoice(0, sampleRate, defaultParams);
    voice.trigger(60, 100);
    
    expect(voice.isPlaying()).toBe(true);
    expect(voice.getCurrentNote()).toBe(60);
    
    // Process some samples
    let maxOutput = 0;
    for (let i = 0; i < 1000; i++) {
      const output = voice.process();
      maxOutput = Math.max(maxOutput, Math.abs(output));
    }
    
    expect(maxOutput).toBeGreaterThan(0);
  });

  it('should decay after release', () => {
    const voice = new TineVoice(0, sampleRate, defaultParams);
    voice.trigger(60, 100);
    
    // Process initial samples
    for (let i = 0; i < 1000; i++) {
      voice.process();
    }
    
    // Release and check decay
    voice.release();
    
    let earlySum = 0;
    for (let i = 0; i < 1000; i++) {
      earlySum += Math.abs(voice.process());
    }
    
    let lateSum = 0;
    for (let i = 0; i < 44100; i++) {
      const val = voice.process();
      if (i > 40000) lateSum += Math.abs(val);
    }
    
    expect(lateSum).toBeLessThan(earlySum);
  });

  it('should support different models', () => {
    const models = ['rhodes', 'wurlitzer', 'pianet'] as const;
    
    for (const model of models) {
      const params = { ...defaultParams, model };
      const voice = new TineVoice(0, sampleRate, params);
      voice.trigger(60, 100);
      
      let maxOutput = 0;
      for (let i = 0; i < 1000; i++) {
        const output = voice.process();
        maxOutput = Math.max(maxOutput, Math.abs(output));
      }
      
      expect(maxOutput).toBeGreaterThan(0);
    }
  });
});
