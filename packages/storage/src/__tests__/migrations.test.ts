import { describe, it, expect, beforeEach } from 'vitest';
import {
  MigrationRegistry,
  MigrationRunner,
  MigrationError,
  createMigration,
  validateProjectBeforeMigration,
  safeMigrate,
  getMigrationRegistry,
} from '../migrations.js';
import type { Migration, MigrationFn, Project } from '@daw/project-schema';
import type { IndexedDBRepository } from '../indexeddb.js';

describe('migrations', () => {
  describe('MigrationRegistry', () => {
    let registry: MigrationRegistry;

    beforeEach(() => {
      registry = new MigrationRegistry();
    });

    describe('register', () => {
      it('registers a migration', () => {
        const migration: Migration = {
          version: 1,
          name: 'Test',
          description: 'Test migration',
          migrate: async (p) => p,
        };

        registry.register(migration);
        expect(registry.get(1)).toBe(migration);
      });

      it('throws on duplicate version', () => {
        const migration: Migration = {
          version: 1,
          name: 'Test',
          description: 'Test migration',
          migrate: async (p) => p,
        };

        registry.register(migration);
        expect(() => registry.register(migration)).toThrow(MigrationError);
      });
    });

    describe('getAll', () => {
      it('returns migrations sorted by version', () => {
        registry.register({ version: 3, name: 'V3', description: '', migrate: async (p) => p });
        registry.register({ version: 1, name: 'V1', description: '', migrate: async (p) => p });
        registry.register({ version: 2, name: 'V2', description: '', migrate: async (p) => p });

        const all = registry.getAll();
        expect(all.map(m => m.version)).toEqual([1, 2, 3]);
      });
    });

    describe('getRange', () => {
      it('returns migrations in range', () => {
        registry.register({ version: 1, name: 'V1', description: '', migrate: async (p) => p });
        registry.register({ version: 2, name: 'V2', description: '', migrate: async (p) => p });
        registry.register({ version: 3, name: 'V3', description: '', migrate: async (p) => p });

        const range = registry.getRange(1, 2);
        expect(range.map(m => m.version)).toEqual([2]);
      });
    });

    describe('getLatestVersion', () => {
      it('returns 0 for empty registry', () => {
        expect(registry.getLatestVersion()).toBe(0);
      });

      it('returns latest version', () => {
        registry.register({ version: 1, name: 'V1', description: '', migrate: async (p) => p });
        registry.register({ version: 5, name: 'V5', description: '', migrate: async (p) => p });
        registry.register({ version: 3, name: 'V3', description: '', migrate: async (p) => p });

        expect(registry.getLatestVersion()).toBe(5);
      });
    });

    describe('hasPath', () => {
      beforeEach(() => {
        registry.register({ version: 1, name: 'V1', description: '', migrate: async (p) => p });
        registry.register({ version: 2, name: 'V2', description: '', migrate: async (p) => p });
        registry.register({ version: 3, name: 'V3', description: '', migrate: async (p) => p });
      });

      it('returns true for contiguous path', () => {
        expect(registry.hasPath(0, 3)).toBe(true);
      });

      it('returns false for non-contiguous path', () => {
        expect(registry.hasPath(0, 5)).toBe(false);
      });

      it('returns false for empty path', () => {
        expect(registry.hasPath(5, 10)).toBe(false);
      });
    });
  });

  describe('MigrationRunner', () => {
    it('needs migration when current < latest', () => {
      const registry = new MigrationRegistry();
      registry.register({ version: 2, name: 'V2', description: '', migrate: async (p) => p });

      const runner = new MigrationRunner(registry);
      const project = { schemaVersion: 1 } as Project;

      expect(runner.needsMigration(project)).toBe(true);
    });

    it('does not need migration when current == latest', () => {
      const registry = new MigrationRegistry();
      registry.register({ version: 1, name: 'V1', description: '', migrate: async (p) => p });

      const runner = new MigrationRunner(registry);
      const project = { schemaVersion: 1 } as Project;

      expect(runner.needsMigration(project)).toBe(false);
    });

    it('gets migration status', () => {
      const registry = new MigrationRegistry();
      registry.register({ version: 2, name: 'V2', description: '', migrate: async (p) => p });
      registry.register({ version: 3, name: 'V3', description: '', migrate: async (p) => p });

      const runner = new MigrationRunner(registry);
      const project = { schemaVersion: 1 } as Project;

      const status = runner.getMigrationStatus(project);

      expect(status.currentVersion).toBe(1);
      expect(status.targetVersion).toBe(3);
      expect(status.pending).toEqual([2, 3]);
      expect(status.canMigrate).toBe(true);
    });
  });

  describe('createMigration', () => {
    it('creates migration object', () => {
      const migrateFn: MigrationFn = async (p) => p;
      const migration = createMigration(1, 'Test', 'Description', migrateFn);

      expect(migration.version).toBe(1);
      expect(migration.name).toBe('Test');
      expect(migration.description).toBe('Description');
      expect(migration.migrate).toBe(migrateFn);
    });
  });

  describe('validateProjectBeforeMigration', () => {
    it('validates correct project', () => {
      const project = {
        id: 'proj-1',
        name: 'Test',
        schemaVersion: 1,
        tracks: [],
      } as Project;

      const result = validateProjectBeforeMigration(project);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing id', () => {
      const project = {
        name: 'Test',
        schemaVersion: 1,
        tracks: [],
      } as Project;

      const result = validateProjectBeforeMigration(project);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ID'))).toBe(true);
    });

    it('detects missing name', () => {
      const project = {
        id: 'proj-1',
        schemaVersion: 1,
        tracks: [],
      } as Project;

      const result = validateProjectBeforeMigration(project);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('detects invalid schemaVersion', () => {
      const project = {
        id: 'proj-1',
        name: 'Test',
        schemaVersion: 'invalid',
        tracks: [],
      } as unknown as Project;

      const result = validateProjectBeforeMigration(project);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Schema version'))).toBe(true);
    });

    it('detects invalid tracks', () => {
      const project = {
        id: 'proj-1',
        name: 'Test',
        schemaVersion: 1,
        tracks: 'not an array',
      } as unknown as Project;

      const result = validateProjectBeforeMigration(project);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Tracks'))).toBe(true);
    });
  });

  describe('safeMigrate', () => {
    it('returns success for valid migration', async () => {
      const registry = new MigrationRegistry();
      registry.register({
        version: 2,
        name: 'V2',
        description: '',
        migrate: async (p) => ({ ...p, schemaVersion: 2 }),
      });

      const mockIndexedDB = {
        initialize: async () => {},
        recordMigration: async () => {},
        getMigrationHistory: async () => [],
      } as unknown as IndexedDBRepository;

      const runner = new MigrationRunner(registry, mockIndexedDB);
      const project = {
        id: 'proj-1',
        name: 'Test',
        schemaVersion: 1,
        tracks: [],
      } as Project;

      const result = await safeMigrate(runner, project, 2);

      expect(result.result.success).toBe(true);
      expect(result.project.schemaVersion).toBe(2);
    });

    it('returns failure for invalid project', async () => {
      const registry = new MigrationRegistry();
      const runner = new MigrationRunner(registry);
      const project = {
        name: 'Test',
        schemaVersion: 1,
        tracks: [],
      } as unknown as Project;

      const result = await safeMigrate(runner, project, 2);

      expect(result.result.success).toBe(false);
      expect(result.result.errors.length).toBeGreaterThan(0);
      // backup is only set when validation passes but migration fails
    });

    it('returns backup on failure', async () => {
      const registry = new MigrationRegistry();
      registry.register({
        version: 2,
        name: 'V2',
        description: '',
        migrate: async () => { throw new Error('Migration failed'); },
      });

      const mockIndexedDB = {
        initialize: async () => {},
        recordMigration: async () => {},
        getMigrationHistory: async () => [],
      } as unknown as IndexedDBRepository;

      const runner = new MigrationRunner(registry, mockIndexedDB);
      const project = {
        id: 'proj-1',
        name: 'Test',
        schemaVersion: 1,
        tracks: [],
      } as Project;

      const result = await safeMigrate(runner, project, 2);

      expect(result.result.success).toBe(false);
      expect(result.backup).toBeDefined();
    });
  });

  describe('getMigrationRegistry', () => {
    it('returns singleton registry', () => {
      const r1 = getMigrationRegistry();
      const r2 = getMigrationRegistry();
      expect(r1).toBe(r2);
    });

    it('has built-in migrations', () => {
      const registry = getMigrationRegistry();
      expect(registry.get(1)).toBeDefined();
    });
  });
});
