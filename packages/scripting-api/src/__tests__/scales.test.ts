import { describe, it, expect } from 'vitest';
import {
  noteToMidi,
  midiToNote,
  midiToFrequency,
  frequencyToMidi,
  scale,
  scaleDegree,
  isInScale,
  quantizeToScale,
  scaleRange,
  chord,
  chordFromIntervals,
  invertChord,
  voiceLead,
  chordFromDegree,
  getAvailableScales,
  getAvailableChords,
} from '../scales';

describe('Scales', () => {
  describe('noteToMidi', () => {
    it('should convert note names to MIDI numbers', () => {
      expect(noteToMidi('C4')).toBe(60); // Middle C
      expect(noteToMidi('A4')).toBe(69); // A440
      expect(noteToMidi('C0')).toBe(12);
      expect(noteToMidi('C-1')).toBe(0); // Lowest MIDI note
    });

    it('should handle sharps', () => {
      expect(noteToMidi('C#4')).toBe(61);
      expect(noteToMidi('F#3')).toBe(54);
    });

    it('should handle enharmonic equivalents', () => {
      expect(noteToMidi('Db4')).toBe(61); // Same as C#4
      expect(noteToMidi('Bb3')).toBe(70); // Same as A#3
    });

    it('should throw on invalid notes', () => {
      expect(() => noteToMidi('H4')).toThrow();
      expect(() => noteToMidi('invalid')).toThrow();
    });
  });

  describe('midiToNote', () => {
    it('should convert MIDI numbers to note names', () => {
      expect(midiToNote(60)).toBe('C4');
      expect(midiToNote(69)).toBe('A4');
      expect(midiToNote(0)).toBe('C-1');
    });

    it('should handle sharps', () => {
      expect(midiToNote(61)).toBe('C#4');
      expect(midiToNote(66)).toBe('F#4');
    });
  });

  describe('midiToFrequency', () => {
    it('should convert A4 to 440Hz', () => {
      expect(midiToFrequency(69)).toBeCloseTo(440, 1);
    });

    it('should convert C4 to ~261.63Hz', () => {
      expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
    });

    it('should handle octave doubling', () => {
      const f1 = midiToFrequency(69); // A4
      const f2 = midiToFrequency(81); // A5
      expect(f2).toBeCloseTo(f1 * 2, 1);
    });
  });

  describe('frequencyToMidi', () => {
    it('should convert 440Hz to A4', () => {
      expect(frequencyToMidi(440)).toBeCloseTo(69, 1);
    });

    it('should convert 261.63Hz to C4', () => {
      expect(frequencyToMidi(261.63)).toBeCloseTo(60, 1);
    });
  });

  describe('scale', () => {
    it('should create major scale', () => {
      const cMajor = scale('C', 'major');
      expect(cMajor.root).toBe('C');
      expect(cMajor.mode).toBe('major');
      expect(cMajor.intervals).toEqual([0, 2, 4, 5, 7, 9, 11]);
    });

    it('should create minor scale', () => {
      const aMinor = scale('A', 'minor');
      expect(aMinor.intervals).toEqual([0, 2, 3, 5, 7, 8, 10]);
    });

    it('should create pentatonic scale', () => {
      const cPentatonic = scale('C', 'pentatonic major');
      expect(cPentatonic.intervals).toEqual([0, 2, 4, 7, 9]);
    });

    it('should throw on unknown scale mode', () => {
      expect(() => scale('C', 'unknown')).toThrow();
    });
  });

  describe('scaleDegree', () => {
    it('should get notes by degree', () => {
      const cMajor = scale('C', 'major');
      expect(scaleDegree(cMajor, 1)).toBe(60); // C
      expect(scaleDegree(cMajor, 3)).toBe(64); // E
      expect(scaleDegree(cMajor, 5)).toBe(67); // G
    });

    it('should handle octave offsets', () => {
      const cMajor = scale('C', 'major');
      expect(scaleDegree(cMajor, 1, 1)).toBe(72); // C5
      expect(scaleDegree(cMajor, 1, -1)).toBe(48); // C3
    });

    it('should wrap degrees greater than scale length', () => {
      const cMajor = scale('C', 'major');
      expect(scaleDegree(cMajor, 8)).toBe(72); // C5 (octave up)
    });
  });

  describe('isInScale', () => {
    it('should identify notes in scale', () => {
      const cMajor = scale('C', 'major');
      expect(isInScale(60, cMajor)).toBe(true); // C
      expect(isInScale(64, cMajor)).toBe(true); // E
      expect(isInScale(61, cMajor)).toBe(false); // C#
    });
  });

  describe('quantizeToScale', () => {
    it('should quantize notes to nearest scale note', () => {
      const cMajor = scale('C', 'major');
      expect(quantizeToScale(61, cMajor)).toBe(60); // C# -> C
      expect(quantizeToScale(62, cMajor)).toBe(62); // D stays
      expect(quantizeToScale(63, cMajor)).toBe(64); // D# -> E
    });
  });

  describe('scaleRange', () => {
    it('should generate scale notes across octaves', () => {
      const cMajor = scale('C', 'major');
      const range = scaleRange(cMajor, 4, 5);
      
      // Should have 14 notes (7 per octave * 2 octaves)
      expect(range).toHaveLength(14);
      
      // First note should be C4
      expect(range[0]).toBe(60);
      
      // Last note should be B5
      expect(range[range.length - 1]).toBe(83);
    });
  });

  describe('chord', () => {
    it('should create major triad', () => {
      const cMajor = chord('C');
      expect(cMajor).toEqual([60, 64, 67]); // C E G
    });

    it('should create minor triad', () => {
      const aMinor = chord('Am');
      expect(aMinor).toEqual([69, 72, 76]); // A C E
    });

    it('should create seventh chords', () => {
      const g7 = chord('G7');
      expect(g7).toEqual([67, 71, 74, 77]); // G B D F
    });

    it('should create major 7th chords', () => {
      const cMaj7 = chord('Cmaj7');
      expect(cMaj7).toEqual([60, 64, 67, 71]); // C E G B
    });

    it('should handle sharp roots', () => {
      const fSharp = chord('F#');
      expect(fSharp[0]).toBe(66); // F#
    });
  });

  describe('chordFromIntervals', () => {
    it('should create chord from intervals', () => {
      const cMajor = chordFromIntervals(60, [0, 4, 7]);
      expect(cMajor).toEqual([60, 64, 67]);
    });
  });

  describe('invertChord', () => {
    it('should create first inversion', () => {
      const cMajor = [60, 64, 67];
      const firstInv = invertChord(cMajor, 1);
      expect(firstInv).toEqual([64, 67, 72]); // E G C
    });

    it('should create second inversion', () => {
      const cMajor = [60, 64, 67];
      const secondInv = invertChord(cMajor, 2);
      expect(secondInv).toEqual([60, 67, 76]); // G C E (sorted)
    });
  });

  describe('voiceLead', () => {
    it('should minimize voice movement', () => {
      const cMajor = [60, 64, 67];
      const gMajor = [67, 71, 74];
      
      const voiced = voiceLead(cMajor, gMajor);
      
      // Should be close to C Major position
      expect(voiced[0]).toBeGreaterThanOrEqual(55);
      expect(voiced[0]).toBeLessThanOrEqual(79);
    });
  });

  describe('chordFromDegree', () => {
    it('should create chord from scale degree', () => {
      const cMajor = scale('C', 'major');
      const iChord = chordFromDegree(cMajor, 1);
      expect(iChord).toEqual([60, 64, 67]); // C major
      
      const viChord = chordFromDegree(cMajor, 6, 'min');
      expect(viChord[0]).toBe(69); // A
    });
  });

  describe('getAvailableScales', () => {
    it('should return list of scale modes', () => {
      const scales = getAvailableScales();
      expect(scales).toContain('major');
      expect(scales).toContain('minor');
      expect(scales).toContain('dorian');
      expect(scales).toContain('pentatonic major');
    });
  });

  describe('getAvailableChords', () => {
    it('should return list of chord qualities', () => {
      const chords = getAvailableChords();
      expect(chords).toContain('');
      expect(chords).toContain('m');
      expect(chords).toContain('7');
      expect(chords).toContain('maj7');
    });
  });
});
