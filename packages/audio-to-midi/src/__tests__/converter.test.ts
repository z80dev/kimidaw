import { describe, it, expect } from 'vitest';
import { AudioToMidiConverter } from '../converter.js';
import { DrumDetector } from '../drum-detector.js';
import { MelodyDetector } from '../melody-detector.js';
import { HarmonyDetector } from '../harmony-detector.js';

describe('AudioToMidiConverter', () => {
  const sampleRate = 44100;

  // Helper to create a simple sine wave
  function createSineWave(freq: number, duration: number, sampleRate: number): Float32Array {
    const samples = Math.floor(duration * sampleRate);
    const buffer = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      buffer[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
    }
    return buffer;
  }

  // Helper to create a drum-like transient
  function createTransient(time: number, sampleRate: number): Float32Array {
    const buffer = new Float32Array(sampleRate); // 1 second
    const start = Math.floor(time * sampleRate);
    const length = Math.floor(0.01 * sampleRate); // 10ms
    
    for (let i = 0; i < length && start + i < buffer.length; i++) {
      const decay = Math.exp(-i / (length / 5));
      buffer[start + i] = decay * (Math.random() * 2 - 1);
    }
    
    return buffer;
  }

  describe('Drum conversion', () => {
    it('should detect drum hits', async () => {
      // Create audio with drum transients at 0s, 0.5s, 1s
      const audio = new Float32Array(sampleRate * 1.5);
      const transients = [0, 0.5, 1];
      
      for (const time of transients) {
        const start = Math.floor(time * sampleRate);
        for (let i = 0; i < 100 && start + i < audio.length; i++) {
          audio[start + i] = Math.exp(-i / 20) * 0.8;
        }
      }

      const converter = new AudioToMidiConverter(sampleRate, {
        mode: 'drums',
        sensitivity: 50,
        minDurationMs: 50
      });

      const result = await converter.convert(audio);

      expect(result.mode).toBe('drums');
      expect(result.notes.length).toBeGreaterThan(0);
      expect(result.sampleRate).toBe(sampleRate);
    });

    it('should map drum classes to correct MIDI notes', () => {
      expect(DrumDetector.getDrumMidiNote('kick')).toBe(36);
      expect(DrumDetector.getDrumMidiNote('snare')).toBe(38);
      expect(DrumDetector.getDrumMidiNote('hihat-closed')).toBe(42);
      expect(DrumDetector.getDrumMidiNote('hihat-open')).toBe(46);
      expect(DrumDetector.getDrumMidiNote('crash')).toBe(49);
      expect(DrumDetector.getDrumMidiNote('unknown')).toBe(60);
    });
  });

  describe('Melody conversion', () => {
    it('should detect melody notes', async () => {
      // Create a simple melody: C4 (261.63 Hz) for 0.2s, E4 for 0.2s, G4 for 0.2s
      const c4 = createSineWave(261.63, 0.2, sampleRate);
      const e4 = createSineWave(329.63, 0.2, sampleRate);
      const g4 = createSineWave(392.00, 0.2, sampleRate);
      
      const audio = new Float32Array(c4.length + e4.length + g4.length);
      audio.set(c4, 0);
      audio.set(e4, c4.length);
      audio.set(g4, c4.length + e4.length);

      const converter = new AudioToMidiConverter(sampleRate, {
        mode: 'melody',
        sensitivity: 50,
        minDurationMs: 100
      });

      const result = await converter.convert(audio);

      expect(result.mode).toBe('melody');
      expect(result.notes.length).toBeGreaterThan(0);
    });

    it('should convert frequency to MIDI note', () => {
      const detector = new MelodyDetector(sampleRate, {
        mode: 'melody',
        sensitivity: 50,
        minDurationMs: 50,
        maxPolyphony: 1,
        velocitySensitive: false,
        quantizeToGrid: false,
        gridDivision: 240
      });

      // A4 = 440Hz should be MIDI note 69
      const note = (detector as any).frequencyToMidi(440);
      expect(note).toBe(69);

      // C4 = 261.63Hz should be MIDI note 60
      const noteC4 = (detector as any).frequencyToMidi(261.63);
      expect(noteC4).toBe(60);
    });
  });

  describe('Harmony conversion', () => {
    it('should detect chords', async () => {
      // Create a C major chord: C4 + E4 + G4
      const duration = 0.5;
      const c4 = createSineWave(261.63, duration, sampleRate);
      const e4 = createSineWave(329.63, duration, sampleRate);
      const g4 = createSineWave(392.00, duration, sampleRate);
      
      const audio = new Float32Array(c4.length);
      for (let i = 0; i < audio.length; i++) {
        audio[i] = (c4[i] + e4[i] + g4[i]) / 3;
      }

      const converter = new AudioToMidiConverter(sampleRate, {
        mode: 'harmony',
        sensitivity: 50,
        minDurationMs: 200
      });

      const result = await converter.convert(audio);

      expect(result.mode).toBe('harmony');
      // Should detect some notes from the chord
      expect(result.notes.length).toBeGreaterThan(0);
    });
  });

  describe('Options and configuration', () => {
    it('should respect sensitivity setting', () => {
      const converter1 = new AudioToMidiConverter(sampleRate, { sensitivity: 25 });
      const converter2 = new AudioToMidiConverter(sampleRate, { sensitivity: 75 });

      expect(converter1.getOptions().sensitivity).toBe(25);
      expect(converter2.getOptions().sensitivity).toBe(75);
    });

    it('should allow mode switching', () => {
      const converter = new AudioToMidiConverter(sampleRate);
      
      expect(converter.getOptions().mode).toBe('melody');
      
      converter.setMode('drums');
      expect(converter.getOptions().mode).toBe('drums');
      
      converter.setMode('harmony');
      expect(converter.getOptions().mode).toBe('harmony');
    });

    it('should support progress callbacks', async () => {
      const audio = createSineWave(440, 0.5, sampleRate);
      const converter = new AudioToMidiConverter(sampleRate, { mode: 'melody' });

      const progressUpdates: number[] = [];

      await converter.convert(audio, (progress) => {
        progressUpdates.push(progress.progress);
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });
  });

  describe('Audio analysis', () => {
    it('should analyze audio and suggest mode', async () => {
      const audio = createSineWave(440, 1.0, sampleRate);
      const converter = new AudioToMidiConverter(sampleRate);

      const analysis = await converter.analyze(audio);

      expect(analysis.suggestedMode).toBeDefined();
      expect(analysis.transientDensity).toBeGreaterThanOrEqual(0);
      expect(analysis.polyphonyEstimate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Quantization', () => {
    it('should quantize notes when enabled', async () => {
      const audio = createSineWave(440, 0.5, sampleRate);
      const converter = new AudioToMidiConverter(sampleRate, {
        mode: 'melody',
        quantizeToGrid: true,
        gridDivision: 240 // 16th note
      });

      const result = await converter.convert(audio);

      // Notes should be aligned to grid
      for (const note of result.notes) {
        // At 120 BPM, 16th note = 0.125s
        const gridSize = 0.125;
        const gridPosition = note.startTime / gridSize;
        const deviation = Math.abs(gridPosition - Math.round(gridPosition));
        expect(deviation).toBeLessThan(0.01); // Very close to grid
      }
    });
  });
});

describe('DrumDetector', () => {
  it('should detect transients in audio', () => {
    const sampleRate = 44100;
    const audio = new Float32Array(sampleRate);
    
    // Create artificial transient
    for (let i = 0; i < 100; i++) {
      audio[i] = Math.exp(-i / 20) * 0.9;
    }

    const detector = new DrumDetector(sampleRate, {
      mode: 'drums',
      sensitivity: 50,
      minDurationMs: 50,
      maxPolyphony: 1,
      velocitySensitive: true,
      quantizeToGrid: false,
      gridDivision: 240
    });

    const result = detector.detect(audio);
    
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.onsets.length).toBeGreaterThan(0);
  });
});

describe('MelodyDetector', () => {
  it('should compute YIN pitch contour', () => {
    const sampleRate = 44100;
    const audio = new Float32Array(4096);
    
    // Create 440Hz sine wave
    for (let i = 0; i < audio.length; i++) {
      audio[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }

    const detector = new MelodyDetector(sampleRate, {
      mode: 'melody',
      sensitivity: 50,
      minDurationMs: 50,
      maxPolyphony: 1,
      velocitySensitive: false,
      quantizeToGrid: false,
      gridDivision: 240
    });

    const result = detector.detect(audio);
    
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.pitchContour.length).toBeGreaterThan(0);
  });
});

describe('HarmonyDetector', () => {
  it('should compute chromagram', () => {
    const sampleRate = 44100;
    const audio = new Float32Array(8192);
    
    // Create C major chord
    for (let i = 0; i < audio.length; i++) {
      const c = Math.sin(2 * Math.PI * 261.63 * i / sampleRate);
      const e = Math.sin(2 * Math.PI * 329.63 * i / sampleRate);
      const g = Math.sin(2 * Math.PI * 392.00 * i / sampleRate);
      audio[i] = (c + e + g) / 3;
    }

    const detector = new HarmonyDetector(sampleRate, {
      mode: 'harmony',
      sensitivity: 50,
      minDurationMs: 100,
      maxPolyphony: 4,
      velocitySensitive: false,
      quantizeToGrid: false,
      gridDivision: 240
    });

    const result = detector.detect(audio);
    
    expect(result.chromagram.length).toBeGreaterThan(0);
  });
});
