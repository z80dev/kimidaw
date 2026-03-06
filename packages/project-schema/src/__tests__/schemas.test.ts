import { describe, it, expect } from 'vitest';
import {
  validateProject,
  validateAudioClip,
  validateMidiClip,
  validateTrack,
  validateCommand,
} from '../schemas.js';
import { createProject, PPQ, CURRENT_SCHEMA_VERSION } from '../index.js';

describe('schema validation', () => {
  describe('validateProject', () => {
    it('validates a correct project', () => {
      const project = createProject('proj-1', 'Test Project');
      const result = validateProject(project);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('proj-1');
      }
    });

    it('fails for invalid project', () => {
      const invalid = {
        id: 'proj-1',
        name: 'Test',
        // Missing required fields
      };
      
      const result = validateProject(invalid);
      expect(result.success).toBe(false);
    });

    it('fails for wrong schema version', () => {
      const project = {
        ...createProject('proj-1', 'Test'),
        schemaVersion: 999,
      };
      
      const result = validateProject(project);
      expect(result.success).toBe(false);
    });

    it('validates track types', () => {
      const project = createProject('proj-1', 'Test');
      project.tracks.push({
        id: 'track-1',
        type: 'invalid-type',
        name: 'Bad Track',
      } as any);
      
      const result = validateProject(project);
      expect(result.success).toBe(false);
    });

    it('validates color format', () => {
      const project = createProject('proj-1', 'Test');
      project.master.color = 'not-a-color';
      
      const result = validateProject(project);
      expect(result.success).toBe(false);
    });

    it('validates valid hex color', () => {
      const project = createProject('proj-1', 'Test');
      project.master.color = '#FF0000';
      
      const result = validateProject(project);
      expect(result.success).toBe(true);
    });
  });

  describe('validateTrack', () => {
    it('validates audio track', () => {
      const track = {
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
      
      const result = validateTrack(track);
      expect(result.success).toBe(true);
    });

    it('validates instrument track', () => {
      const track = {
        id: 'track-1',
        type: 'instrument',
        name: 'Synth 1',
        color: '#00FF00',
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
        instrument: {
          id: 'inst-1',
          definitionId: 'builtin:synth',
          parameterValues: {},
          bypass: false,
          enabled: true,
        },
        noteFx: [],
      };
      
      const result = validateTrack(track);
      expect(result.success).toBe(true);
    });

    it('fails for missing required fields', () => {
      const track = {
        id: 'track-1',
        type: 'audio',
        // Missing name, color, etc.
      };
      
      const result = validateTrack(track);
      expect(result.success).toBe(false);
    });
  });

  describe('validateAudioClip', () => {
    it('validates correct audio clip', () => {
      const clip = {
        id: 'clip-1',
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
        fades: {
          inCurve: 'linear',
          outCurve: 'linear',
          inSamples: 0,
          outSamples: 0,
        },
        stretchQuality: 'good',
        isComped: false,
      };
      
      const result = validateAudioClip(clip);
      expect(result.success).toBe(true);
    });

    it('validates with optional fields', () => {
      const clip = {
        id: 'clip-1',
        name: 'My Clip',
        color: '#FF0000',
        assetId: 'asset-1',
        lane: 0,
        startTick: 0,
        endTick: PPQ * 4,
        sourceStartSample: 0,
        sourceEndSample: 44100,
        gainDb: -6,
        transposeSemitones: 12,
        fineTuneCents: 10,
        reverse: true,
        fades: {
          inCurve: 'equal-power',
          outCurve: 's-curve',
          inSamples: 100,
          outSamples: 200,
        },
        warp: {
          enabled: true,
          markers: [{ sourceSample: 0, targetTick: 0 }],
          originBpm: 120,
          originalSampleRate: 44100,
        },
        stretchQuality: 'best',
        transientMarkers: [0, 1000, 2000],
        isComped: true,
        takeIndex: 2,
      };
      
      const result = validateAudioClip(clip);
      expect(result.success).toBe(true);
    });

    it('fails for invalid fade curve', () => {
      const clip = {
        id: 'clip-1',
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
        fades: {
          inCurve: 'invalid-curve',
          outCurve: 'linear',
          inSamples: 0,
          outSamples: 0,
        },
        stretchQuality: 'good',
        isComped: false,
      };
      
      const result = validateAudioClip(clip);
      expect(result.success).toBe(false);
    });
  });

  describe('validateMidiClip', () => {
    it('validates correct midi clip', () => {
      const clip = {
        id: 'clip-1',
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
      
      const result = validateMidiClip(clip);
      expect(result.success).toBe(true);
    });

    it('validates with notes', () => {
      const clip = {
        id: 'clip-1',
        name: 'Bass Line',
        color: '#00FF00',
        startTick: 0,
        endTick: PPQ * 4,
        loop: { startTick: 0, endTick: PPQ, enabled: true },
        notes: [
          { id: 'n1', note: 36, velocity: 100, startTick: 0, durationTicks: 480 },
          { id: 'n2', note: 40, velocity: 90, startTick: 480, durationTicks: 480 },
        ],
        cc: [
          { id: 'cc1', controller: 1, value: 64, tick: 0 },
        ],
        pitchBend: [
          { id: 'pb1', value: 0, tick: 0 },
        ],
        channelPressure: [],
        polyAftertouch: [],
        programChanges: [
          { id: 'pc1', program: 32, tick: 0 },
        ],
        scaleHint: { root: 0, mode: 'major', enabled: true },
      };
      
      const result = validateMidiClip(clip);
      expect(result.success).toBe(true);
    });

    it('fails for invalid note number', () => {
      const clip = {
        id: 'clip-1',
        startTick: 0,
        endTick: PPQ * 4,
        loop: null,
        notes: [
          { id: 'n1', note: 128, velocity: 100, startTick: 0, durationTicks: 480 },
        ],
        cc: [],
        pitchBend: [],
        channelPressure: [],
        polyAftertouch: [],
        programChanges: [],
      };
      
      const result = validateMidiClip(clip);
      expect(result.success).toBe(false);
    });

    it('fails for invalid velocity', () => {
      const clip = {
        id: 'clip-1',
        startTick: 0,
        endTick: PPQ * 4,
        loop: null,
        notes: [
          { id: 'n1', note: 60, velocity: -1, startTick: 0, durationTicks: 480 },
        ],
        cc: [],
        pitchBend: [],
        channelPressure: [],
        polyAftertouch: [],
        programChanges: [],
      };
      
      const result = validateMidiClip(clip);
      expect(result.success).toBe(false);
    });
  });

  describe('validateCommand', () => {
    it('validates correct command', () => {
      const cmd = {
        id: 'cmd-1',
        type: 'track.create',
        timestamp: Date.now(),
        payload: { name: 'Track 1' },
        actor: 'user',
      };
      
      const result = validateCommand(cmd);
      expect(result.success).toBe(true);
    });

    it('fails for missing required fields', () => {
      const cmd = {
        type: 'track.create',
        payload: {},
      };
      
      const result = validateCommand(cmd);
      expect(result.success).toBe(false);
    });

    it('fails for invalid actor', () => {
      const cmd = {
        id: 'cmd-1',
        type: 'track.create',
        timestamp: Date.now(),
        payload: {},
        actor: 'hacker',
      };
      
      const result = validateCommand(cmd);
      expect(result.success).toBe(false);
    });
  });

  describe('asset hash validation', () => {
    it('validates correct SHA-256 hash', () => {
      const project = createProject('proj-1', 'Test');
      project.assets.push({
        id: 'asset-1',
        hash: 'a'.repeat(64), // Valid hex
        type: 'audio',
        name: 'Kick.wav',
        size: 1024,
        createdAt: new Date().toISOString(),
      });
      
      const result = validateProject(project);
      expect(result.success).toBe(true);
    });

    it('fails for invalid hash format', () => {
      const project = createProject('proj-1', 'Test');
      project.assets.push({
        id: 'asset-1',
        hash: 'not-a-valid-hash',
        type: 'audio',
        name: 'Kick.wav',
        size: 1024,
        createdAt: new Date().toISOString(),
      });
      
      const result = validateProject(project);
      expect(result.success).toBe(false);
    });

    it('fails for non-hex hash', () => {
      const project = createProject('proj-1', 'Test');
      project.assets.push({
        id: 'asset-1',
        hash: 'g'.repeat(64), // Invalid hex character
        type: 'audio',
        name: 'Kick.wav',
        size: 1024,
        createdAt: new Date().toISOString(),
      });
      
      const result = validateProject(project);
      expect(result.success).toBe(false);
    });
  });
});
