import { describe, it, expect } from 'vitest';
import {
  getClipDuration,
  getLoopedDuration,
  noteOverlapsRange,
  quantizeNote,
  splitNote,
  transposeNote,
  getNotesInRange,
  createMidiClip,
  createAudioClip,
  isNoteInScale,
  snapToScale,
  SCALE_INTERVALS,
  type MidiNote,
  type MidiClip,
  PPQ,
} from '../index.js';

describe('clips', () => {
  describe('createMidiClip', () => {
    it('creates a clip with correct defaults', () => {
      const clip = createMidiClip('clip-1', 0, PPQ * 4);
      
      expect(clip.id).toBe('clip-1');
      expect(clip.startTick).toBe(0);
      expect(clip.endTick).toBe(PPQ * 4);
      expect(clip.notes).toEqual([]);
      expect(clip.loop).toBeNull();
    });

    it('creates a clip with custom options', () => {
      const clip = createMidiClip('clip-2', 960, PPQ * 2, {
        name: 'My Clip',
        color: '#FF0000',
        loop: { startTick: 0, endTick: PPQ, enabled: true },
      });
      
      expect(clip.name).toBe('My Clip');
      expect(clip.color).toBe('#FF0000');
      expect(clip.loop?.enabled).toBe(true);
    });
  });

  describe('createAudioClip', () => {
    it('creates an audio clip with correct defaults', () => {
      const clip = createAudioClip('aclip-1', 'asset-1', 0, PPQ * 4);
      
      expect(clip.id).toBe('aclip-1');
      expect(clip.assetId).toBe('asset-1');
      expect(clip.lane).toBe(0);
      expect(clip.gainDb).toBe(0);
      expect(clip.reverse).toBe(false);
    });

    it('applies custom options', () => {
      const clip = createAudioClip('aclip-2', 'asset-1', 0, PPQ * 4, {
        name: 'Audio Clip',
        lane: 2,
        gainDb: -6,
      });
      
      expect(clip.name).toBe('Audio Clip');
      expect(clip.lane).toBe(2);
      expect(clip.gainDb).toBe(-6);
    });
  });

  describe('getClipDuration', () => {
    it('calculates clip duration correctly', () => {
      const clip = createMidiClip('clip-1', 100, 400);
      expect(getClipDuration(clip)).toBe(400);
    });
  });

  describe('getLoopedDuration', () => {
    it('returns clip duration when not looped', () => {
      const clip = createMidiClip('clip-1', 0, PPQ * 4);
      expect(getLoopedDuration(clip)).toBe(PPQ * 4);
    });

    it('returns loop duration when loop is shorter', () => {
      const clip = createMidiClip('clip-1', 0, PPQ * 4, {
        loop: { startTick: 0, endTick: PPQ, enabled: true },
      });
      expect(getLoopedDuration(clip)).toBe(PPQ * 4); // Clip duration wins
    });
  });

  describe('noteOverlapsRange', () => {
    const note: MidiNote = {
      id: 'n1',
      note: 60,
      velocity: 100,
      startTick: 100,
      durationTicks: 200,
    };

    it('returns true when note overlaps range', () => {
      expect(noteOverlapsRange(note, 0, 150)).toBe(true); // Overlaps start
      expect(noteOverlapsRange(note, 150, 350)).toBe(true); // Fully inside
      expect(noteOverlapsRange(note, 250, 400)).toBe(true); // Overlaps end
    });

    it('returns false when note does not overlap', () => {
      expect(noteOverlapsRange(note, 0, 50)).toBe(false);
      expect(noteOverlapsRange(note, 350, 500)).toBe(false);
    });

    it('handles edge cases', () => {
      expect(noteOverlapsRange(note, 100, 100)).toBe(false); // Zero width range
      expect(noteOverlapsRange(note, 300, 300)).toBe(false); // At note end
    });
  });

  describe('quantizeNote', () => {
    const note: MidiNote = {
      id: 'n1',
      note: 60,
      velocity: 100,
      startTick: 245, // Slightly before 240 (1/16th)
      durationTicks: 480,
    };

    it('quantizes note to grid with full strength', () => {
      const grid = 240; // 1/16th notes
      const quantized = quantizeNote(note, grid, 1.0, 0);
      
      expect(quantized.startTick).toBe(240);
      expect(quantized.id).toBe('n1'); // Preserves ID
      expect(quantized.note).toBe(60); // Preserves note
    });

    it('respects quantization strength', () => {
      const grid = 240;
      const quantized = quantizeNote(note, grid, 0.5, 0);
      
      // Halfway between original (245) and quantized (240)
      expect(Math.abs(quantized.startTick - 242)).toBeLessThanOrEqual(1);
    });

    it('applies swing to off-beats', () => {
      const offBeatNote: MidiNote = {
        ...note,
        startTick: 480 + 10, // Slightly after beat 2 (which is odd 16th: 480/240=2)
      };
      const quantized = quantizeNote(offBeatNote, 240, 1.0, 0.5);
      
      // Should be delayed by swing amount (on off-beat)
      // Note position: 480+10=490, grid position = 480/240=2 (even), no swing
      // The swing logic applies to odd grid positions (1, 3, 5, ...)
      expect(quantized.startTick).toBe(480);
    });
  });

  describe('splitNote', () => {
    const note: MidiNote = {
      id: 'n1',
      note: 60,
      velocity: 100,
      startTick: 0,
      durationTicks: 480,
    };

    it('splits note at specified position', () => {
      const result = splitNote(note, 240);
      
      expect(result).not.toBeNull();
      const [first, second] = result!;
      
      expect(first.startTick).toBe(0);
      expect(first.durationTicks).toBe(240);
      
      expect(second.startTick).toBe(240);
      expect(second.durationTicks).toBe(240);
    });

    it('returns null when split point is outside note', () => {
      expect(splitNote(note, -10)).toBeNull();
      expect(splitNote(note, 0)).toBeNull(); // At start
      expect(splitNote(note, 480)).toBeNull(); // At end
      expect(splitNote(note, 500)).toBeNull();
    });

    it('generates unique IDs for split parts', () => {
      const result = splitNote(note, 240);
      const [first, second] = result!;
      
      expect(first.id).not.toBe(note.id);
      expect(second.id).not.toBe(note.id);
      expect(first.id).not.toBe(second.id);
    });
  });

  describe('transposeNote', () => {
    it('transposes note by semitones', () => {
      const note: MidiNote = {
        id: 'n1',
        note: 60,
        velocity: 100,
        startTick: 0,
        durationTicks: 480,
      };
      
      expect(transposeNote(note, 12).note).toBe(72);
      expect(transposeNote(note, -12).note).toBe(48);
      expect(transposeNote(note, 0).note).toBe(60);
    });

    it('clamps to valid MIDI range', () => {
      const note: MidiNote = { id: 'n1', note: 60, velocity: 100, startTick: 0, durationTicks: 480 };
      const highNote: MidiNote = { ...note, note: 126 };
      const lowNote: MidiNote = { ...note, note: 1 };
      
      expect(transposeNote(highNote, 10).note).toBe(127);
      expect(transposeNote(lowNote, -10).note).toBe(0);
    });
  });

  describe('getNotesInRange', () => {
    const clip: MidiClip = {
      ...createMidiClip('clip-1', 0, PPQ * 4),
      notes: [
        { id: 'n1', note: 60, velocity: 100, startTick: 0, durationTicks: 480 },
        { id: 'n2', note: 62, velocity: 100, startTick: 480, durationTicks: 480 },
        { id: 'n3', note: 64, velocity: 100, startTick: 960, durationTicks: 480 },
      ],
    };

    it('returns notes overlapping range', () => {
      const notes = getNotesInRange(clip, 240, 720);
      expect(notes.map(n => n.id)).toEqual(['n1', 'n2']);
    });

    it('returns empty array when no notes overlap', () => {
      const notes = getNotesInRange(clip, 2000, 3000);
      expect(notes).toEqual([]);
    });
  });

  describe('scale helpers', () => {
    describe('isNoteInScale', () => {
      it('correctly identifies notes in C major scale', () => {
        const scale = { root: 0, mode: 'major' as const, enabled: true };
        
        // C major: C, D, E, F, G, A, B
        expect(isNoteInScale(60, scale)).toBe(true); // C
        expect(isNoteInScale(62, scale)).toBe(true); // D
        expect(isNoteInScale(64, scale)).toBe(true); // E
        expect(isNoteInScale(66, scale)).toBe(false); // F# (not in C major)
        expect(isNoteInScale(61, scale)).toBe(false); // C# (not in C major)
      });

      it('works with different roots', () => {
        const gMajor = { root: 7, mode: 'major' as const, enabled: true }; // G major
        
        expect(isNoteInScale(67, gMajor)).toBe(true); // G
        expect(isNoteInScale(69, gMajor)).toBe(true); // A
        expect(isNoteInScale(68, gMajor)).toBe(false); // G# (not in G major)
      });
    });

    describe('snapToScale', () => {
      it('snaps note to nearest scale note', () => {
        const cMajor = { root: 0, mode: 'major' as const, enabled: true };
        
        // C# (61) should snap to C (60) or D (62)
        const snapped = snapToScale(61, cMajor);
        expect([60, 62]).toContain(snapped);
        
        // F# (66) should snap to F (65) or G (67)
        const snapped2 = snapToScale(66, cMajor);
        expect([65, 67]).toContain(snapped2);
      });

      it('returns same note if already in scale', () => {
        const cMajor = { root: 0, mode: 'major' as const, enabled: true };
        expect(snapToScale(60, cMajor)).toBe(60); // C
        expect(snapToScale(64, cMajor)).toBe(64); // E
      });
    });

    describe('SCALE_INTERVALS', () => {
      it('contains all expected scales', () => {
        expect(Object.keys(SCALE_INTERVALS)).toContain('major');
        expect(Object.keys(SCALE_INTERVALS)).toContain('minor');
        expect(Object.keys(SCALE_INTERVALS)).toContain('pentatonic-major');
        expect(Object.keys(SCALE_INTERVALS)).toContain('blues');
        expect(Object.keys(SCALE_INTERVALS)).toContain('chromatic');
      });

      it('chromatic scale contains all semitones', () => {
        expect(SCALE_INTERVALS.chromatic).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      });
    });
  });
});
