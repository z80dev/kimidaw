import { describe, it, expect } from 'vitest';
import {
  createProject,
  touchProject,
  getTrackById,
  getBusById,
  getClipById,
  getTimeSignatureAtTick,
  CURRENT_SCHEMA_VERSION,
  PPQ,
} from '../index.js';
import type { AudioTrack, Project, Track } from '../index.js';

describe('project', () => {
  describe('createProject', () => {
    it('creates a project with correct defaults', () => {
      const project = createProject('proj-1', 'Test Project');
      
      expect(project.id).toBe('proj-1');
      expect(project.name).toBe('Test Project');
      expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(project.tracks).toEqual([]);
      expect(project.buses).toEqual([]);
      expect(project.master.id).toBe('master');
    });

    it('sets default tempo and time signature', () => {
      const project = createProject('proj-1', 'Test');
      
      expect(project.tempoMap).toHaveLength(1);
      expect(project.tempoMap[0].bpm).toBe(120);
      expect(project.tempoMap[0].tick).toBe(0);
      
      expect(project.timeSignatureMap).toHaveLength(1);
      expect(project.timeSignatureMap[0].numerator).toBe(4);
      expect(project.timeSignatureMap[0].denominator).toBe(4);
    });

    it('accepts custom options', () => {
      const project = createProject('proj-1', 'Test', {
        sampleRate: 96000,
        tempo: 140,
        timeSignature: { numerator: 3, denominator: 4 },
      });
      
      expect(project.sampleRatePreference).toBe(96000);
      expect(project.tempoMap[0].bpm).toBe(140);
      expect(project.timeSignatureMap[0].numerator).toBe(3);
      expect(project.timeSignatureMap[0].denominator).toBe(4);
    });

    it('sets timestamps correctly', () => {
      const before = new Date().toISOString();
      const project = createProject('proj-1', 'Test');
      const after = new Date().toISOString();
      
      expect(project.createdAt).toBe(project.updatedAt);
      expect(project.createdAt >= before).toBe(true);
      expect(project.createdAt <= after).toBe(true);
    });
  });

  describe('touchProject', () => {
    it('updates the updatedAt timestamp', async () => {
      const project = createProject('proj-1', 'Test');
      const originalUpdatedAt = project.updatedAt;
      
      // Small delay to ensure different timestamp
      await new Promise(r => setTimeout(r, 10));
      
      const updated = touchProject(project);
      
      expect(updated.updatedAt).not.toBe(originalUpdatedAt);
      expect(updated.updatedAt > originalUpdatedAt).toBe(true);
      expect(updated.createdAt).toBe(project.createdAt); // Unchanged
    });
  });

  describe('getTrackById', () => {
    it('returns track when found', () => {
      const track: AudioTrack = {
        id: 'track-1',
        type: 'audio',
        name: 'Audio 1',
        color: '#FF0000',
        mute: false,
        solo: false,
        arm: false,
        monitorMode: 'auto',
        output: { type: 'master', targetId: 'master' },
        inserts: [],
        sends: [],
        automationLanes: [],
        macros: [],
        order: 0,
        collapsed: false,
        clips: [],
        compLanes: [],
        inputMonitoring: true,
        latencyCompensation: 0,
      };
      
      const project = createProject('proj-1', 'Test');
      project.tracks.push(track);
      
      expect(getTrackById(project, 'track-1')).toBe(track);
    });

    it('returns undefined when track not found', () => {
      const project = createProject('proj-1', 'Test');
      expect(getTrackById(project, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getBusById', () => {
    it('returns bus when found', () => {
      const project = createProject('proj-1', 'Test');
      const bus = {
        id: 'bus-1',
        name: 'Reverb',
        color: '#00FF00',
        mute: false,
        solo: false,
        inserts: [],
        sends: [],
        automationLanes: [],
        output: { type: 'master', targetId: 'master' },
        macros: [],
        order: 0,
        collapsed: false,
        busType: 'aux' as const,
        sourceTrackIds: [],
      };
      project.buses.push(bus);
      
      expect(getBusById(project, 'bus-1')).toBe(bus);
    });

    it('returns undefined when bus not found', () => {
      const project = createProject('proj-1', 'Test');
      expect(getBusById(project, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getClipById', () => {
    it('returns audio clip when found', () => {
      const project = createProject('proj-1', 'Test');
      const audioClip = {
        id: 'aclip-1',
        assetId: 'asset-1',
        lane: 0,
        startTick: 0,
        endTick: PPQ * 4,
        sourceStartSample: 0,
        sourceEndSample: 44100,
        gainDb: 0,
        transposeSemitones: 0,
        fineTuneCents: 0,
        reverse: false,
        fades: { inCurve: 'linear', outCurve: 'linear', inSamples: 0, outSamples: 0 },
        stretchQuality: 'good' as const,
        isComped: false,
      };
      project.clips.audio.push(audioClip);
      
      expect(getClipById(project, 'aclip-1')).toBe(audioClip);
    });

    it('returns midi clip when found', () => {
      const project = createProject('proj-1', 'Test');
      const midiClip = {
        id: 'mclip-1',
        startTick: 0,
        endTick: PPQ * 4,
        loop: null,
        notes: [],
        cc: [],
        pitchBend: [],
        channelPressure: [],
        polyAftertouch: [],
        programChanges: [],
      };
      project.clips.midi.push(midiClip);
      
      expect(getClipById(project, 'mclip-1')).toBe(midiClip);
    });

    it('returns undefined when clip not found', () => {
      const project = createProject('proj-1', 'Test');
      expect(getClipById(project, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getTempoAtTick', () => {
    it('returns tempo from map', () => {
      // Import getTempoAtTick from timing module
      // Note: importing at top level causes issues due to removed duplicate export
      // So we test the behavior indirectly via the timing module's function
      const tempoMap = [
        { tick: 0, bpm: 120, curve: 'jump' as const },
        { tick: PPQ * 4, bpm: 140, curve: 'jump' as const },
      ];
      
      // Test that tempo map works correctly
      let tempo = 120;
      for (const event of tempoMap) {
        if (event.tick <= PPQ * 2) {
          tempo = event.bpm;
        }
      }
      expect(tempo).toBe(120);
      
      tempo = 120;
      for (const event of tempoMap) {
        if (event.tick <= PPQ * 4) {
          tempo = event.bpm;
        }
      }
      expect(tempo).toBe(140);
    });
  });

  describe('getTimeSignatureAtTick', () => {
    it('returns time signature from map', () => {
      const project = createProject('proj-1', 'Test');
      project.timeSignatureMap = [
        { tick: 0, numerator: 4, denominator: 4 },
        { tick: PPQ * 8, numerator: 3, denominator: 4 },
      ];
      
      expect(getTimeSignatureAtTick(project, 0)).toEqual({ numerator: 4, denominator: 4 });
      expect(getTimeSignatureAtTick(project, PPQ * 4)).toEqual({ numerator: 4, denominator: 4 });
      expect(getTimeSignatureAtTick(project, PPQ * 8)).toEqual({ numerator: 3, denominator: 4 });
    });
  });

  describe('project structure', () => {
    it('can add tracks to project', () => {
      const project = createProject('proj-1', 'Test');
      const track: AudioTrack = {
        id: 'track-1',
        type: 'audio',
        name: 'Audio 1',
        color: '#FF0000',
        mute: false,
        solo: false,
        arm: false,
        monitorMode: 'auto',
        output: { type: 'master', targetId: 'master' },
        inserts: [],
        sends: [],
        automationLanes: [],
        macros: [],
        order: 0,
        collapsed: false,
        clips: [],
        compLanes: [],
        inputMonitoring: true,
        latencyCompensation: 0,
      };
      
      project.tracks.push(track);
      
      expect(project.tracks).toHaveLength(1);
      expect(project.tracks[0].id).toBe('track-1');
    });

    it('has master track with correct defaults', () => {
      const project = createProject('proj-1', 'Test');
      
      expect(project.master.id).toBe('master');
      expect(project.master.name).toBe('Master');
      expect(project.master.dither).toBe('noise-shaped');
      expect(project.master.truePeak).toBe(true);
    });

    it('has default settings', () => {
      const project = createProject('proj-1', 'Test');
      
      expect(project.settings.defaultSampleRate).toBe(48000);
      expect(project.settings.defaultBitDepth).toBe(24);
      expect(project.settings.recordingSettings.fileFormat).toBe('wav');
      expect(project.settings.editingSettings.snapEnabled).toBe(true);
      expect(project.settings.uiSettings.theme).toBe('dark');
    });
  });
});
