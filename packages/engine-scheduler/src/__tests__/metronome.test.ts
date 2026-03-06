import { describe, it, expect, beforeEach } from 'vitest';
import { MetronomeEngine, createMetronomeEngine, generateClickSample } from '../metronome.js';
import type { MetronomeConfig } from '../types.js';

describe('MetronomeEngine', () => {
  let metronome: MetronomeEngine;
  const defaultConfig: MetronomeConfig = {
    enabled: true,
    volumeDb: -6,
    accentFirstBeat: true,
    accentDb: 6,
    clickFrequency: 1000,
    accentFrequency: 1500,
    clickDurationMs: 50,
  };
  
  beforeEach(() => {
    metronome = createMetronomeEngine(48000, defaultConfig);
  });
  
  describe('configuration', () => {
    it('creates with default config', () => {
      const m = createMetronomeEngine(48000);
      expect(m.getConfig().volumeDb).toBe(-6);
    });
    
    it('updates config', () => {
      metronome.setConfig({ volumeDb: -12 });
      expect(metronome.getConfig().volumeDb).toBe(-12);
      // Other values unchanged
      expect(metronome.getConfig().clickFrequency).toBe(1000);
    });
    
    it('enables/disables', () => {
      metronome.setEnabled(true);
      expect(metronome.isEnabled()).toBe(true);
      
      metronome.setEnabled(false);
      expect(metronome.isEnabled()).toBe(false);
    });
    
    it('requires both config and enabled to be true', () => {
      metronome.setEnabled(true);
      metronome.setConfig({ enabled: false });
      expect(metronome.isEnabled()).toBe(false);
    });
  });
  
  describe('click generation', () => {
    it('generates clicks for time range', () => {
      const clicks = metronome.generateClicks(
        0,
        960 * 4, // 1 bar at 4/4
        120,
        4,
        4
      );
      
      // Should have 4 clicks (one per beat)
      expect(clicks).toHaveLength(4);
    });
    
    it('accents first beat', () => {
      const clicks = metronome.generateClicks(0, 960 * 4, 120, 4, 4);
      
      expect(clicks[0].isAccent).toBe(true);
      expect(clicks[1].isAccent).toBe(false);
      expect(clicks[2].isAccent).toBe(false);
      expect(clicks[3].isAccent).toBe(false);
    });
    
    it('uses accent frequency for first beat', () => {
      const clicks = metronome.generateClicks(0, 960 * 4, 120, 4, 4);
      
      expect(clicks[0].frequency).toBe(1500);
      expect(clicks[1].frequency).toBe(1000);
    });
    
    it('uses accent volume for first beat', () => {
      const clicks = metronome.generateClicks(0, 960 * 4, 120, 4, 4);
      
      // Accent: -6 + 6 = 0 dB
      expect(clicks[0].gain).toBeGreaterThan(clicks[1].gain);
    });
    
    it('respects disabled accent', () => {
      metronome.setConfig({ accentFirstBeat: false });
      
      const clicks = metronome.generateClicks(0, 960 * 4, 120, 4, 4);
      
      expect(clicks[0].isAccent).toBe(false);
      expect(clicks[0].frequency).toBe(1000);
    });
    
    it('respects 3/4 time signature', () => {
      const clicks = metronome.generateClicks(0, 960 * 3, 120, 3, 4);
      
      // Should have 3 clicks per bar
      expect(clicks).toHaveLength(3);
    });
    
    it('returns empty when disabled', () => {
      metronome.setEnabled(false);
      
      const clicks = metronome.generateClicks(0, 960 * 4, 120, 4, 4);
      
      expect(clicks).toHaveLength(0);
    });
  });
  
  describe('count-in', () => {
    it('generates count-in clicks', () => {
      const clicks = metronome.generateCountIn(1, 120, 4, 4);
      
      // 1 bar count-in at 4/4 = 4 clicks
      expect(clicks).toHaveLength(4);
    });
    
    it('generates 2-bar count-in', () => {
      const clicks = metronome.generateCountIn(2, 120, 4, 4);
      
      expect(clicks).toHaveLength(8);
    });
    
    it('returns empty for zero count-in', () => {
      const clicks = metronome.generateCountIn(0, 120, 4, 4);
      
      expect(clicks).toHaveLength(0);
    });
  });
  
  describe('conversion to note events', () => {
    it('converts click to note event', () => {
      const clicks = metronome.generateClicks(0, 960 * 4, 120, 4, 4);
      const noteEvent = metronome.clickToNoteEvent(clicks[0], 'metronome');
      
      expect(noteEvent.type).toBe('note-on');
      expect(noteEvent.note).toBe(96); // C7 for accent
      expect(noteEvent.channel).toBe(9); // Channel 10 (drums)
    });
    
    it('uses different notes for accent/regular', () => {
      const clicks = metronome.generateClicks(0, 960 * 4, 120, 4, 4);
      
      const accentNote = metronome.clickToNoteEvent(clicks[0], 'metronome');
      const regularNote = metronome.clickToNoteEvent(clicks[1], 'metronome');
      
      expect(accentNote.note).toBe(96); // C7
      expect(regularNote.note).toBe(84); // C6
    });
  });
});

describe('generateClickSample', () => {
  it('generates correct number of samples', () => {
    const samples = generateClickSample(1000, 48000, 50);
    
    // 50ms at 48kHz = 2400 samples
    expect(samples.length).toBe(2400);
  });
  
  it('generates decaying sine wave', () => {
    const samples = generateClickSample(1000, 48000, 50);
    
    // First sample should be non-zero
    expect(samples[0]).not.toBe(0);
    
    // Should decay toward end
    const startAbs = Math.abs(samples[100]);
    const endAbs = Math.abs(samples[samples.length - 1]);
    expect(endAbs).toBeLessThan(startAbs);
  });
});
