import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CommandJournal,
  JournalError,
  DEFAULT_JOURNAL_CONFIG,
  formatJournalEntry,
  groupByBatch,
  validateJournal,
  replayJournal,
  type JournalConfig,
} from '../journal.js';
import type { Command, CommandJournalEntry } from '@daw/project-schema';

describe('journal', () => {
  let journal: CommandJournal;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    journal = new CommandJournal();
  });



  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('uses default config', () => {
      const j = new CommandJournal();
      expect(j).toBeDefined();
    });

    it('accepts custom config', () => {
      const config: Partial<JournalConfig> = {
        maxEntriesPerFile: 500,
        snapshotInterval: 50,
      };
      const j = new CommandJournal(config);
      expect(j).toBeDefined();
    });
  });

  describe('append', () => {
    it('appends command and returns entry', () => {
      const command: Command = {
        id: 'cmd-1',
        type: 'track.create',
        timestamp: 1000,
        payload: { name: 'Track 1' },
        actor: 'user',
      };

      const entry = journal.append(command, 'proj-1', 1);

      expect(entry.sequence).toBe(1);
      expect(entry.envelope.command).toBe(command);
      expect(entry.envelope.projectId).toBe('proj-1');
      expect(entry.checksum).toBeDefined();
    });

    it('increments sequence', () => {
      const cmd1: Command = { id: 'cmd-1', type: 'test', timestamp: 1000, payload: {}, actor: 'user' };
      const cmd2: Command = { id: 'cmd-2', type: 'test', timestamp: 1000, payload: {}, actor: 'user' };

      const entry1 = journal.append(cmd1, 'proj-1', 1);
      const entry2 = journal.append(cmd2, 'proj-1', 1);

      expect(entry1.sequence).toBe(1);
      expect(entry2.sequence).toBe(2);
    });

    it('notifies subscribers', () => {
      const listener = vi.fn();
      journal.subscribe(listener);

      const command: Command = { id: 'cmd-1', type: 'test', timestamp: 1000, payload: {}, actor: 'user' };
      journal.append(command, 'proj-1', 1);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('clears redo stack on new command', () => {
      const cmd1: Command = { id: 'cmd-1', type: 'test', timestamp: 1000, payload: {}, actor: 'user' };
      const cmd2: Command = { id: 'cmd-2', type: 'test', timestamp: 1000, payload: {}, actor: 'user' };

      journal.append(cmd1, 'proj-1', 1);
      journal.popUndo();
      expect(journal.canRedo()).toBe(true);

      journal.append(cmd2, 'proj-1', 1);
      expect(journal.canRedo()).toBe(false);
    });
  });

  describe('appendBatch', () => {
    it('appends multiple commands', () => {
      const commands: Command[] = [
        { id: 'cmd-1', type: 'test', timestamp: 1000, payload: {}, actor: 'user' },
        { id: 'cmd-2', type: 'test', timestamp: 1000, payload: {}, actor: 'user' },
        { id: 'cmd-3', type: 'test', timestamp: 1000, payload: {}, actor: 'user' },
      ];

      const entries = journal.appendBatch(commands, 'proj-1', 1);

      expect(entries).toHaveLength(3);
      expect(entries[0].sequence).toBe(1);
      expect(entries[1].sequence).toBe(2);
      expect(entries[2].sequence).toBe(3);
    });
  });

  describe('undo/redo', () => {
    const cmd1: Command = { id: 'cmd-1', type: 'test1', timestamp: 1000, payload: {}, actor: 'user' };
    const cmd2: Command = { id: 'cmd-2', type: 'test2', timestamp: 1000, payload: {}, actor: 'user' };

    beforeEach(() => {
      journal.append(cmd1, 'proj-1', 1);
      journal.append(cmd2, 'proj-1', 1);
    });

    it('can undo after appends', () => {
      expect(journal.canUndo()).toBe(true);
    });

    it('pops undo correctly', () => {
      const undone = journal.popUndo();
      expect(undone?.type).toBe('test2');
      expect(journal.canUndo()).toBe(true);
      
      const undone2 = journal.popUndo();
      expect(undone2?.type).toBe('test1');
      expect(journal.canUndo()).toBe(false);
    });

    it('moves to redo stack on undo', () => {
      journal.popUndo();
      expect(journal.canRedo()).toBe(true);
    });

    it('pops redo correctly', () => {
      journal.popUndo();
      const redone = journal.popRedo();
      expect(redone?.type).toBe('test2');
      expect(journal.canRedo()).toBe(false);
    });

    it('moves back to undo stack on redo', () => {
      journal.popUndo();
      journal.popRedo();
      expect(journal.canUndo()).toBe(true);
    });
  });

  describe('needsSnapshot', () => {
    it('returns true after snapshot interval', () => {
      expect(journal.needsSnapshot()).toBe(false);

      for (let i = 0; i < DEFAULT_JOURNAL_CONFIG.snapshotInterval; i++) {
        journal.append({ id: `cmd-${i}`, type: 'test', timestamp: 1000, payload: {}, actor: 'user' }, 'proj-1', 1);
      }

      expect(journal.needsSnapshot()).toBe(true);
    });
  });

  describe('recordSnapshot', () => {
    it('updates last snapshot sequence', () => {
      for (let i = 0; i < 150; i++) {
        journal.append({ id: `cmd-${i}`, type: 'test', timestamp: 1000, payload: {}, actor: 'user' }, 'proj-1', 1);
      }

      expect(journal.needsSnapshot()).toBe(true);

      journal.recordSnapshot({
        id: 'snap-1',
        projectId: 'proj-1',
        sequence: 150,
        timestamp: Date.now(),
        state: {},
        schemaVersion: 1,
        checksum: 'abc',
      });

      expect(journal.getLastSnapshotSequence()).toBe(150);
      expect(journal.needsSnapshot()).toBe(false);
    });
  });

  describe('serialize / deserialize', () => {
    it('round-trips correctly', () => {
      const cmd: Command = { id: 'cmd-1', type: 'test', timestamp: 1000, payload: { foo: 'bar' }, actor: 'user' };
      journal.append(cmd, 'proj-1', 1);

      const serialized = journal.serialize();
      const newJournal = new CommandJournal();
      newJournal.deserialize(serialized);

      expect(newJournal.getSequence()).toBe(1);
      expect(newJournal.getAllEntries()).toHaveLength(1);
    });

    it('throws on invalid version', () => {
      const newJournal = new CommandJournal();
      expect(() => {
        newJournal.deserialize(JSON.stringify({ version: 999 }));
      }).toThrow(JournalError);
    });
  });

  describe('getStats', () => {
    it('returns correct stats', () => {
      journal.append({ id: 'cmd-1', type: 'test', timestamp: 1000, payload: {}, actor: 'user' }, 'proj-1', 1);
      journal.append({ id: 'cmd-2', type: 'test', timestamp: 1000, payload: {}, actor: 'user' }, 'proj-1', 1);

      const stats = journal.getStats();

      expect(stats.entryCount).toBe(2);
      expect(stats.sequence).toBe(2);
      expect(stats.undoStackSize).toBe(2);
      expect(stats.redoStackSize).toBe(0);
      expect(stats.isDirty).toBe(true);
    });
  });

  describe('trim', () => {
    it('removes old entries', () => {
      for (let i = 0; i < 10; i++) {
        journal.append({ id: `cmd-${i}`, type: 'test', timestamp: 1000, payload: {}, actor: 'user' }, 'proj-1', 1);
      }

      journal.trim(5);

      expect(journal.getAllEntries()).toHaveLength(5);
    });
  });

  describe('clear', () => {
    it('clears all state', () => {
      journal.append({ id: 'cmd-1', type: 'test', timestamp: 1000, payload: {}, actor: 'user' }, 'proj-1', 1);
      journal.clear();

      expect(journal.getSequence()).toBe(0);
      expect(journal.getAllEntries()).toHaveLength(0);
      expect(journal.canUndo()).toBe(false);
    });
  });

  describe('formatJournalEntry', () => {
    it('formats entry correctly', () => {
      const entry: CommandJournalEntry = {
        sequence: 42,
        timestamp: 0,
        envelope: {
          command: {
            id: 'cmd-1',
            type: 'track.create',
            timestamp: 0,
            payload: {},
            actor: 'user',
          },
          projectId: 'proj-1',
          schemaVersion: 1,
        },
        checksum: 'abc',
      };

      const formatted = formatJournalEntry(entry);
      expect(formatted).toContain('[42]');
      expect(formatted).toContain('user');
      expect(formatted).toContain('track.create');
      expect(formatted).toContain('proj-1');
    });
  });

  describe('groupByBatch', () => {
    it('groups entries by batch ID', () => {
      const entries: CommandJournalEntry[] = [
        { sequence: 1, timestamp: 0, envelope: { command: { id: 'c1', batchId: 'batch-1' } as Command, projectId: 'p1', schemaVersion: 1 }, checksum: 'a' },
        { sequence: 2, timestamp: 0, envelope: { command: { id: 'c2', batchId: 'batch-1' } as Command, projectId: 'p1', schemaVersion: 1 }, checksum: 'b' },
        { sequence: 3, timestamp: 0, envelope: { command: { id: 'c3', batchId: 'batch-2' } as Command, projectId: 'p1', schemaVersion: 1 }, checksum: 'c' },
        { sequence: 4, timestamp: 0, envelope: { command: { id: 'c4' } as Command, projectId: 'p1', schemaVersion: 1 }, checksum: 'd' },
      ];

      const groups = groupByBatch(entries);

      expect(groups.get('batch-1')).toHaveLength(2);
      expect(groups.get('batch-2')).toHaveLength(1);
    });
  });

  describe('validateJournal', () => {
    it('validates correct entries', () => {
      const entries: CommandJournalEntry[] = [
        { sequence: 1, timestamp: 0, envelope: { command: { id: 'c1', type: 'test', timestamp: 0, payload: {}, actor: 'user' }, projectId: 'p1', schemaVersion: 1 }, checksum: 'a' },
        { sequence: 2, timestamp: 0, envelope: { command: { id: 'c2', type: 'test', timestamp: 0, payload: {}, actor: 'user' }, projectId: 'p1', schemaVersion: 1 }, checksum: 'b' },
      ];

      const result = validateJournal(entries);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects duplicate sequences', () => {
      const entries: CommandJournalEntry[] = [
        { sequence: 1, timestamp: 0, envelope: { command: { id: 'c1' } as Command, projectId: 'p1', schemaVersion: 1 }, checksum: 'a' },
        { sequence: 1, timestamp: 0, envelope: { command: { id: 'c2' } as Command, projectId: 'p1', schemaVersion: 1 }, checksum: 'b' },
      ];

      const result = validateJournal(entries);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    it('detects missing command ID', () => {
      const entries: CommandJournalEntry[] = [
        { sequence: 1, timestamp: 0, envelope: { command: { type: 'test' } as Command, projectId: 'p1', schemaVersion: 1 }, checksum: 'a' },
      ];

      const result = validateJournal(entries);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('command ID'))).toBe(true);
    });
  });

  describe('replayJournal', () => {
    it('replays commands in order', () => {
      const reducer = vi.fn((state: number, cmd: Command) => state + (cmd.payload?.value || 0));
      const entries: CommandJournalEntry[] = [
        { sequence: 1, timestamp: 0, envelope: { command: { id: 'c1', type: 'add', timestamp: 0, payload: { value: 10 }, actor: 'user' }, projectId: 'p1', schemaVersion: 1 }, checksum: 'a' },
        { sequence: 2, timestamp: 0, envelope: { command: { id: 'c2', type: 'add', timestamp: 0, payload: { value: 5 }, actor: 'user' }, projectId: 'p1', schemaVersion: 1 }, checksum: 'b' },
      ];

      const result = replayJournal(0, entries, reducer);

      expect(result).toBe(15);
      expect(reducer).toHaveBeenCalledTimes(2);
    });

    it('handles replay errors gracefully', () => {
      const reducer = vi.fn((state: number, cmd: Command) => {
        if (cmd.payload?.value === 'error') throw new Error('Test error');
        return state + 1;
      });
      const entries: CommandJournalEntry[] = [
        { sequence: 1, timestamp: 0, envelope: { command: { id: 'c1', type: 'add', timestamp: 0, payload: { value: 1 }, actor: 'user' }, projectId: 'p1', schemaVersion: 1 }, checksum: 'a' },
        { sequence: 2, timestamp: 0, envelope: { command: { id: 'c2', type: 'add', timestamp: 0, payload: { value: 'error' }, actor: 'user' }, projectId: 'p1', schemaVersion: 1 }, checksum: 'b' },
        { sequence: 3, timestamp: 0, envelope: { command: { id: 'c3', type: 'add', timestamp: 0, payload: { value: 1 }, actor: 'user' }, projectId: 'p1', schemaVersion: 1 }, checksum: 'c' },
      ];

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = replayJournal(0, entries, reducer);

      expect(result).toBe(2); // Two successful commands
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
