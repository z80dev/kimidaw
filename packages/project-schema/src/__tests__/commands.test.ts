import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateCommandId,
  generateBatchId,
  createCommand,
  createCommandBatch,
  createInverseCommand,
  createJournalEntry,
  COMMAND_TYPES,
  type Command,
} from '../index.js';
import { validateCommand } from '../commands.js';

describe('commands', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
  });

  describe('generateCommandId', () => {
    it('generates unique IDs', () => {
      const id1 = generateCommandId();
      const id2 = generateCommandId();
      
      expect(id1).not.toBe(id2);
      expect(id1.startsWith('cmd_')).toBe(true);
    });
  });

  describe('generateBatchId', () => {
    it('generates unique IDs', () => {
      const id1 = generateBatchId();
      const id2 = generateBatchId();
      
      expect(id1).not.toBe(id2);
      expect(id1.startsWith('batch_')).toBe(true);
    });
  });

  describe('createCommand', () => {
    it('creates command with defaults', () => {
      const cmd = createCommand('track.create', { name: 'Audio 1' });
      
      expect(cmd.type).toBe('track.create');
      expect(cmd.payload).toEqual({ name: 'Audio 1' });
      expect(cmd.timestamp).toBe(1000);
      expect(cmd.actor).toBe('user');
      expect(cmd.id.startsWith('cmd_')).toBe(true);
    });

    it('accepts custom options', () => {
      const cmd = createCommand('clip.move', { clipId: 'c1' }, {
        actor: 'script',
        actorId: 'script-1',
        id: 'custom-id',
      });
      
      expect(cmd.actor).toBe('script');
      expect(cmd.actorId).toBe('script-1');
      expect(cmd.id).toBe('custom-id');
    });
  });

  describe('createCommandBatch', () => {
    it('creates batch with all commands', () => {
      const cmd1 = createCommand('track.create', { name: 'Track 1' });
      const cmd2 = createCommand('clip.create', { name: 'Clip 1' });
      
      const batch = createCommandBatch([cmd1, cmd2]);
      
      expect(batch.commands).toHaveLength(2);
      expect(batch.id.startsWith('batch_')).toBe(true);
      expect(batch.timestamp).toBe(1000);
    });

    it('assigns batch IDs to commands', () => {
      const cmd1 = createCommand('track.create', {});
      const cmd2 = createCommand('clip.create', {});
      
      const batch = createCommandBatch([cmd1, cmd2]);
      
      expect(batch.commands[0].batchId).toBe(batch.id);
      expect(batch.commands[1].batchId).toBe(batch.id);
      expect(batch.commands[0].batchIndex).toBe(0);
      expect(batch.commands[1].batchIndex).toBe(1);
    });
  });

  describe('createInverseCommand', () => {
    it('creates inverse for rename', () => {
      const cmd: Command = {
        id: 'cmd-1',
        type: 'track.rename',
        timestamp: 1000,
        actor: 'user',
        payload: {
          trackId: 'track-1',
          name: 'New Name',
          oldName: 'Old Name',
        },
      };
      
      const inverse = createInverseCommand(cmd);
      
      expect(inverse).toBeDefined();
      expect(inverse?.type).toBe('track.rename');
      expect(inverse?.payload).toEqual({
        trackId: 'track-1',
        name: 'Old Name',
        oldName: 'New Name',
      });
    });

    it('creates inverse for mute toggle', () => {
      const cmd: Command = {
        id: 'cmd-1',
        type: 'track.mute',
        timestamp: 1000,
        actor: 'user',
        payload: { trackId: 'track-1', mute: true },
      };
      
      const inverse = createInverseCommand(cmd);
      
      expect(inverse?.payload.mute).toBe(false);
    });

    it('returns undefined for unsupported commands', () => {
      const cmd: Command = {
        id: 'cmd-1',
        type: 'unknown.command',
        timestamp: 1000,
        actor: 'user',
        payload: {},
      };
      
      expect(createInverseCommand(cmd)).toBeUndefined();
    });
  });

  describe('createJournalEntry', () => {
    it('creates entry with sequence number', () => {
      const envelope = {
        command: createCommand('track.create', {}),
        projectId: 'proj-1',
        schemaVersion: 1,
      };
      
      const entry = createJournalEntry(42, envelope);
      
      expect(entry.sequence).toBe(42);
      expect(entry.timestamp).toBe(1000);
      expect(entry.envelope).toBe(envelope);
      expect(entry.checksum).toBeDefined();
    });
  });

  describe('validateCommand', () => {
    it('validates correct command', () => {
      const cmd = createCommand('track.create', { name: 'Test' });
      const result = validateCommand(cmd);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails for missing id', () => {
      const result = validateCommand({
        type: 'track.create',
        timestamp: 1000,
        actor: 'user',
        payload: {},
      } as Command);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('fails for missing type', () => {
      const result = validateCommand({
        id: 'cmd-1',
        timestamp: 1000,
        actor: 'user',
        payload: {},
      } as Command);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('type'))).toBe(true);
    });

    it('fails for invalid actor', () => {
      const result = validateCommand({
        id: 'cmd-1',
        type: 'track.create',
        timestamp: 1000,
        actor: 'invalid' as any,
        payload: {},
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('actor'))).toBe(true);
    });
  });

  describe('COMMAND_TYPES', () => {
    it('has all expected command categories', () => {
      expect(COMMAND_TYPES.PROJECT).toBeDefined();
      expect(COMMAND_TYPES.TRACK).toBeDefined();
      expect(COMMAND_TYPES.CLIP).toBeDefined();
      expect(COMMAND_TYPES.NOTE).toBeDefined();
      expect(COMMAND_TYPES.AUTOMATION).toBeDefined();
      expect(COMMAND_TYPES.PLUGIN).toBeDefined();
      expect(COMMAND_TYPES.TRANSPORT).toBeDefined();
      expect(COMMAND_TYPES.MARKER).toBeDefined();
      expect(COMMAND_TYPES.ASSET).toBeDefined();
    });

    it('has specific commands', () => {
      expect(COMMAND_TYPES.TRACK.CREATE).toBe('track.create');
      expect(COMMAND_TYPES.TRACK.DELETE).toBe('track.delete');
      expect(COMMAND_TYPES.CLIP.CREATE).toBe('clip.create');
      expect(COMMAND_TYPES.NOTE.ADD).toBe('note.add');
    });
  });
});
