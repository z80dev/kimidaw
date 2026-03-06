import { describe, it, expect } from 'vitest';
import { TransientSlicer } from '../transient-slicer.js';

describe('TransientSlicer', () => {
  const sampleRate = 44100;

  // Helper to create audio with transients
  function createAudioWithTransients(times: number[]): Float32Array {
    const duration = Math.max(...times) + 0.5;
    const samples = Math.floor(duration * sampleRate);
    const audio = new Float32Array(samples);
    
    for (const time of times) {
      const start = Math.floor(time * sampleRate);
      // Add exponential decay transient
      for (let i = 0; i < 1000 && start + i < samples; i++) {
        audio[start + i] += Math.exp(-i / 100) * 0.8;
      }
    }
    
    return audio;
  }

  describe('Slice creation', () => {
    it('should create slices from audio', () => {
      const slicer = new TransientSlicer(sampleRate, {
        sensitivity: 50,
        minTimeMs: 100,
        threshold: 0.1
      });
      
      const audio = createAudioWithTransients([0.5, 1.0, 1.5]);
      const result = slicer.slice(audio);
      
      expect(result.mode).toBe('transient');
      expect(result.slices.length).toBeGreaterThan(0);
      expect(result.sampleRate).toBe(sampleRate);
    });

    it('should create slices with correct properties', () => {
      const slicer = new TransientSlicer(sampleRate, {
        sensitivity: 50,
        minTimeMs: 200,
        threshold: 0.1
      });
      
      const audio = createAudioWithTransients([0.0, 0.5, 1.0]);
      const result = slicer.slice(audio);
      
      for (const slice of result.slices) {
        expect(slice.startTime).toBeGreaterThanOrEqual(0);
        expect(slice.endTime).toBeGreaterThan(slice.startTime);
        expect(slice.duration).toBe(slice.endTime - slice.startTime);
        expect(slice.midiNote).toBeGreaterThanOrEqual(36);
      }
    });

    it('should assign consecutive MIDI notes', () => {
      const slicer = new TransientSlicer(sampleRate, {
        sensitivity: 50,
        minTimeMs: 100,
        threshold: 0.1
      });
      
      const audio = createAudioWithTransients([0.0, 0.5, 1.0, 1.5]);
      const result = slicer.slice(audio);
      
      if (result.slices.length >= 2) {
        expect(result.slices[1].midiNote).toBe(result.slices[0].midiNote + 1);
      }
    });
  });

  describe('Transient detection', () => {
    it('should detect transients in audio', () => {
      const slicer = new TransientSlicer(sampleRate, {
        sensitivity: 50,
        minTimeMs: 100,
        threshold: 0.1
      });
      
      const audio = createAudioWithTransients([0.5, 1.0, 1.5, 2.0]);
      const transients = slicer.detectTransients(audio);
      
      expect(transients.length).toBeGreaterThan(0);
    });

    it('should respect minimum time between transients', () => {
      const slicer = new TransientSlicer(sampleRate, {
        sensitivity: 50,
        minTimeMs: 500,
        threshold: 0.1
      });
      
      // Transients 100ms apart
      const audio = createAudioWithTransients([0.0, 0.1, 0.2, 0.3]);
      const transients = slicer.detectTransients(audio);
      
      // Should filter out transients too close together
      expect(transients.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Options', () => {
    it('should get and set sensitivity', () => {
      const slicer = new TransientSlicer(sampleRate, {
        sensitivity: 50,
        minTimeMs: 100,
        threshold: 0.1
      });
      
      expect(slicer.getSensitivity()).toBe(50);
      
      slicer.setSensitivity(75);
      expect(slicer.getSensitivity()).toBe(75);
    });

    it('should clamp sensitivity to 0-100', () => {
      const slicer = new TransientSlicer(sampleRate, {
        sensitivity: 50,
        minTimeMs: 100,
        threshold: 0.1
      });
      
      slicer.setSensitivity(150);
      expect(slicer.getSensitivity()).toBe(100);
      
      slicer.setSensitivity(-50);
      expect(slicer.getSensitivity()).toBe(0);
    });
  });
});
