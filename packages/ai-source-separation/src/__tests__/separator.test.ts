import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSourceSeparator } from '../separator.js';
import type { SeparationConfig, StemType } from '../types.js';

describe('Source Separator', () => {
  let audioContext: AudioContext;
  
  beforeEach(() => {
    audioContext = new AudioContext({ sampleRate: 44100 });
  });
  
  afterEach(async () => {
    await audioContext.close();
  });
  
  function createTestBuffer(
    duration: number, 
    frequency: number = 440
  ): AudioBuffer {
    const sampleRate = 44100;
    const length = Math.floor(duration * sampleRate);
    const buffer = audioContext.createBuffer(2, length, sampleRate);
    
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5;
      }
    }
    
    return buffer;
  }
  
  describe('createSourceSeparator', () => {
    it('should create a separator with default config', async () => {
      const config: SeparationConfig = {
        model: 'demucs-v4-fast',
        stems: ['vocals', 'drums', 'bass', 'other'],
        quality: 'fast'
      };
      
      const separator = await createSourceSeparator(config);
      
      expect(separator).toBeDefined();
      expect(separator.getModelInfo).toBeDefined();
      expect(separator.separate).toBeDefined();
      
      await separator.dispose();
    });
    
    it('should return model info', async () => {
      const config: SeparationConfig = {
        model: 'demucs-v4-fast',
        stems: ['vocals'],
        quality: 'fast'
      };
      
      const separator = await createSourceSeparator(config);
      const info = separator.getModelInfo();
      
      expect(info.name).toBe('demucs-v4-fast');
      expect(info.supportedStems).toContain('vocals');
      expect(info.quality).toBe('fast');
      
      await separator.dispose();
    });
  });
  
  describe('separation', () => {
    it('should separate audio into stems', async () => {
      const config: SeparationConfig = {
        model: 'demucs-v4-fast',
        stems: ['vocals', 'other'],
        quality: 'fast'
      };
      
      const separator = await createSourceSeparator(config);
      const testBuffer = createTestBuffer(1.0);
      
      const result = await separator.separate(testBuffer);
      
      expect(result).toBeDefined();
      expect(result.getStem('vocals')).toBeDefined();
      expect(result.getStem('other')).toBeDefined();
      expect(result.duration).toBeCloseTo(testBuffer.duration, 1);
      expect(result.sampleRate).toBe(testBuffer.sampleRate);
      
      await separator.dispose();
    });
    
    it('should support progressive separation', async () => {
      const config: SeparationConfig = {
        model: 'demucs-v4-fast',
        stems: ['vocals'],
        quality: 'fast'
      };
      
      const separator = await createSourceSeparator(config);
      const testBuffer = createTestBuffer(0.5);
      
      const progressCalls: number[] = [];
      
      await separator.separateProgressive(testBuffer, (progress) => {
        progressCalls.push(progress.progress);
      });
      
      // Should have received progress updates
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1]).toBe(1);
      
      await separator.dispose();
    });
    
    it('should allow mixing stems', async () => {
      const config: SeparationConfig = {
        model: 'demucs-v4-fast',
        stems: ['vocals', 'drums', 'bass', 'other'],
        quality: 'fast'
      };
      
      const separator = await createSourceSeparator(config);
      const testBuffer = createTestBuffer(0.5);
      
      const result = await separator.separate(testBuffer);
      
      // Mix some stems
      const mixed = result.mix(['drums', 'bass'], {
        drums: 1.0,
        bass: 0.8
      });
      
      expect(mixed).toBeDefined();
      expect(mixed.numberOfChannels).toBe(2);
      expect(mixed.sampleRate).toBe(testBuffer.sampleRate);
      
      await separator.dispose();
    });
    
    it('should return all stems', async () => {
      const config: SeparationConfig = {
        model: 'demucs-v4-fast',
        stems: ['vocals', 'drums'],
        quality: 'fast'
      };
      
      const separator = await createSourceSeparator(config);
      const testBuffer = createTestBuffer(0.5);
      
      const result = await separator.separate(testBuffer);
      const allStems = result.getAllStems();
      
      expect(allStems.size).toBe(2);
      expect(allStems.has('vocals')).toBe(true);
      expect(allStems.has('drums')).toBe(true);
      
      await separator.dispose();
    });
  });
  
  describe('error handling', () => {
    it('should throw on unknown model', async () => {
      await expect(createSourceSeparator({
        model: 'unknown-model' as any,
        stems: ['vocals'],
        quality: 'fast'
      })).rejects.toThrow();
    });
    
    it('should throw when using disposed separator', async () => {
      const separator = await createSourceSeparator({
        model: 'demucs-v4-fast',
        stems: ['vocals'],
        quality: 'fast'
      });
      
      await separator.dispose();
      
      const testBuffer = createTestBuffer(0.5);
      await expect(separator.separate(testBuffer)).rejects.toThrow('disposed');
    });
  });
});
