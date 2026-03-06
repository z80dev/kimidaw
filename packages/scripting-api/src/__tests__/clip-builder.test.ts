import { describe, it, expect, beforeEach } from 'vitest';
import { ClipBuilder, clip } from '../clip-builder';
import { createPRNG } from '../prng';
import { pattern } from '../pattern';
import { scale } from '../scales';

describe('ClipBuilder', () => {
  let builder: ClipBuilder;

  beforeEach(() => {
    builder = new ClipBuilder('test-clip');
  });

  describe('type selection', () => {
    it('should create MIDI clip by default', () => {
      const result = builder.note('C4', 0, 960).build();
      expect(result.type).toBe('midi');
    });

    it('should create MIDI clip explicitly', () => {
      const result = builder.midi().note('C4', 0, 960).build();
      expect(result.type).toBe('midi');
    });

    it('should create hybrid clip', () => {
      const result = builder.hybrid({ id: 'inst-1', type: 'builtin', name: 'Synth' }).build();
      expect(result.type).toBe('hybrid');
    });
  });

  describe('note operations', () => {
    it('should add note by string', () => {
      const result = builder.note('C4', 0, 960, 100).buildMidi();
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].note).toBe(60);
      expect(result.notes[0].velocity).toBe(100);
    });

    it('should add note by number', () => {
      const result = builder.note(60, 0, 960).buildMidi();
      expect(result.notes[0].note).toBe(60);
    });

    it('should add multiple notes', () => {
      const notes = [
        { note: 60, velocity: 100, startTick: 0, duration: 480 },
        { note: 64, velocity: 100, startTick: 480, duration: 480 },
      ];

      const result = builder.notes(notes).buildMidi();
      expect(result.notes).toHaveLength(2);
    });

    it('should add chord', () => {
      const result = builder.chord('C4', [0, 4, 7], 0, 960).buildMidi();
      expect(result.notes).toHaveLength(3);
      expect(result.notes[0].note).toBe(60);
      expect(result.notes[1].note).toBe(64);
      expect(result.notes[2].note).toBe(67);
    });

    it('should add chord by root note number', () => {
      const result = builder.chord(60, [0, 4, 7], 0, 960).buildMidi();
      expect(result.notes[0].note).toBe(60);
    });

    it('should create arpeggio', () => {
      const result = builder.arpeggio([60, 64, 67], 0, 240, 'up').buildMidi();
      
      expect(result.notes).toHaveLength(3);
      expect(result.notes[0].note).toBe(60);
      expect(result.notes[1].note).toBe(64);
      expect(result.notes[2].note).toBe(67);
      expect(result.notes[0].startTick).toBe(0);
      expect(result.notes[1].startTick).toBe(240);
      expect(result.notes[2].startTick).toBe(480);
    });

    it('should create downward arpeggio', () => {
      const result = builder.arpeggio([60, 64, 67], 0, 240, 'down').buildMidi();
      
      expect(result.notes[0].note).toBe(67);
      expect(result.notes[1].note).toBe(64);
      expect(result.notes[2].note).toBe(60);
    });

    it('should create up-down arpeggio', () => {
      const result = builder.arpeggio([60, 64, 67], 0, 240, 'updown').buildMidi();
      
      expect(result.notes).toHaveLength(5); // up and down (minus duplicate top)
      expect(result.notes[0].note).toBe(60);
      expect(result.notes[2].note).toBe(67);
      expect(result.notes[4].note).toBe(60);
    });

    it('should create notes from pattern', () => {
      const pat = pattern().steps(4).fill();
      const result = builder.fromPattern(pat, 'C4', 0, 240).buildMidi();

      expect(result.notes).toHaveLength(4);
      expect(result.notes.every(n => n.note === 60)).toBe(true);
    });

    it('should create notes from pattern with multiple notes', () => {
      const pat = pattern().steps(4).fill();
      const notes = ['C4', 'E4', 'G4', 'B4'];
      const result = builder.fromPattern(pat, notes, 0, 240).buildMidi();

      expect(result.notes[0].note).toBe(60);
      expect(result.notes[1].note).toBe(64);
      expect(result.notes[2].note).toBe(67);
      expect(result.notes[3].note).toBe(71);
    });
  });

  describe('transformations', () => {
    it('should quantize notes to scale', () => {
      const cMajor = scale('C', 'major');
      const result = builder
        .note('C#4', 0, 480) // C# not in C major
        .note('D#4', 480, 480) // D# not in C major
        .quantize(cMajor)
        .buildMidi();

      expect(result.notes[0].note).toBe(60); // Quantized to C
      expect(result.notes[1].note).toBe(64); // Quantized to E
    });

    it('should transpose notes', () => {
      const result = builder
        .note('C4', 0, 480)
        .note('E4', 480, 480)
        .transpose(12)
        .buildMidi();

      expect(result.notes[0].note).toBe(72); // C5
      expect(result.notes[1].note).toBe(76); // E5
    });

    it('should apply negative transpose', () => {
      const result = builder
        .note('C4', 0, 480)
        .transpose(-12)
        .buildMidi();

      expect(result.notes[0].note).toBe(48); // C3
    });

    it('should set velocity', () => {
      const result = builder
        .note('C4', 0, 480, 50)
        .note('E4', 480, 480, 100)
        .setVelocity(80)
        .buildMidi();

      expect(result.notes[0].velocity).toBe(80);
      expect(result.notes[1].velocity).toBe(80);
    });

    it('should apply velocity curve', () => {
      const curve = (input: number) => input * 1.5;
      const result = builder
        .note('C4', 0, 480, 50)
        .velocityCurve(curve)
        .buildMidi();

      expect(result.notes[0].velocity).toBe(75);
    });

    it('should reverse notes', () => {
      const result = builder
        .note('C4', 0, 480)
        .note('E4', 480, 480)
        .note('G4', 960, 480)
        .reverse()
        .buildMidi();

      // After reverse, order should be reversed
      expect(result.notes[0].note).toBe(60);
      expect(result.notes[1].note).toBe(64);
      expect(result.notes[2].note).toBe(67);
    });

    it('should invert notes around center', () => {
      const result = builder
        .note('C4', 0, 480) // 60
        .note('G4', 480, 480) // 67
        .invert(64) // Around E4
        .buildMidi();

      // C4 (60) -> 68 (G#4/A4)
      expect(result.notes[0].note).toBe(68);
      // G4 (67) -> 61 (C#4/Db4)
      expect(result.notes[1].note).toBe(61);
    });

    it('should humanize notes', () => {
      const prng = createPRNG('test');
      const result = builder
        .seed(prng)
        .note('C4', 1000, 480, 100)
        .humanize(10, 5, 5)
        .buildMidi();

      // Values should be different from original
      expect(result.notes[0].startTick).not.toBe(1000);
      expect(result.notes[0].velocity).not.toBe(100);
      expect(result.notes[0].duration).not.toBe(480);
    });
  });

  describe('loop and duration', () => {
    it('should set duration in ticks', () => {
      const result = builder.duration(3840).buildMidi();
      expect(result.endTick).toBe(3840);
    });

    it('should set duration in bars', () => {
      const result = builder.bars(2, 960).buildMidi();
      expect(result.endTick).toBe(2 * 4 * 960);
    });

    it('should enable loop', () => {
      const result = builder
        .note('C4', 0, 480)
        .loop(true, 0, 1920)
        .buildMidi();

      expect(result.loop).toEqual({ startTick: 0, endTick: 1920 });
    });
  });

  describe('CC and automation', () => {
    it('should add CC event', () => {
      const result = builder
        .cc(1, 64, 0) // Mod wheel
        .cc(7, 100, 480) // Volume
        .buildMidi();

      expect(result.cc).toHaveLength(2);
      expect(result.cc[0].controller).toBe(1);
      expect(result.cc[0].value).toBe(64);
    });

    it('should add CC ramp', () => {
      const result = builder
        .ccRamp(1, 0, 127, 0, 1920, 4)
        .buildMidi();

      expect(result.cc.length).toBe(5); // 4 steps + 1 end
    });

    it('should add pitch bend', () => {
      const result = builder
        .pitchBend(8191, 0) // Max bend up
        .pitchBend(-8192, 480) // Max bend down
        .buildMidi();

      expect(result.pitchBend).toHaveLength(2);
      expect(result.pitchBend[0].value).toBe(8191);
    });

    it('should add channel pressure', () => {
      const result = builder
        .pressure(100, 0)
        .pressure(80, 480)
        .buildMidi();

      expect(result.channelPressure).toHaveLength(2);
    });
  });

  describe('auto duration calculation', () => {
    it('should calculate duration from notes', () => {
      const result = builder
        .note('C4', 0, 480)
        .note('E4', 3840, 480)
        .buildMidi();

      // Duration should include the last note
      expect(result.endTick).toBeGreaterThanOrEqual(3840 + 480);
    });

    it('should update duration from chord', () => {
      const result = builder
        .chord('C4', [0, 4, 7], 0, 1920)
        .buildMidi();

      expect(result.endTick).toBeGreaterThanOrEqual(1920);
    });
  });

  describe('notes sorting', () => {
    it('should sort notes by start tick', () => {
      const result = builder
        .note('E4', 480, 480)
        .note('C4', 0, 480) // Added second but comes first
        .note('G4', 960, 480)
        .buildMidi();

      expect(result.notes[0].note).toBe(60); // C4
      expect(result.notes[1].note).toBe(64); // E4
      expect(result.notes[2].note).toBe(67); // G4
    });
  });
});

describe('clip factory', () => {
  it('should create ClipBuilder', () => {
    const c = clip('my-clip');
    expect(c).toBeInstanceOf(ClipBuilder);
  });

  it('should accept options', () => {
    const prng = createPRNG('test');
    const c = clip('my-clip', { type: 'midi', seed: prng });
    expect(c).toBeDefined();
  });
});
