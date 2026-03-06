/**
 * Schema Migration System
 * 
 * Handles versioned migrations for project data.
 * Implements section 24.3 of the engineering spec.
 * 
 * Each migration:
 * - Has a version number
 * - Is applied only once
 * - Can be forward-only (no downgrades for production)
 * - Is logged in the migrations store
 */

import type { Project } from '@daw/project-schema';
import { IndexedDBRepository, type MigrationRecord } from './indexeddb.js';

// Error types
export class MigrationError extends Error {
  constructor(
    message: string,
    public version: number,
    public code: string
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

// Migration function type
export type MigrationFn = (project: Project) => Promise<Project>;

// Migration definition
export interface Migration {
  version: number;
  name: string;
  description: string;
  migrate: MigrationFn;
}

// Migration context
export interface MigrationContext {
  projectId: string;
  fromVersion: number;
  toVersion: number;
}

// Migration result
export interface MigrationResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  applied: number[];
  errors: Array<{ version: number; error: string }>;
  durationMs: number;
}

/**
 * Migration registry
 */
export class MigrationRegistry {
  private migrations: Map<number, Migration>;

  constructor() {
    this.migrations = new Map();
  }

  /**
   * Register a migration
   */
  register(migration: Migration): void {
    if (this.migrations.has(migration.version)) {
      throw new MigrationError(
        `Migration version ${migration.version} already registered`,
        migration.version,
        'DUPLICATE_VERSION'
      );
    }
    this.migrations.set(migration.version, migration);
  }

  /**
   * Get migration by version
   */
  get(version: number): Migration | undefined {
    return this.migrations.get(version);
  }

  /**
   * Get all migrations in version order
   */
  getAll(): Migration[] {
    return Array.from(this.migrations.values())
      .sort((a, b) => a.version - b.version);
  }

  /**
   * Get migrations between two versions
   */
  getRange(fromVersion: number, toVersion: number): Migration[] {
    return this.getAll().filter(
      m => m.version > fromVersion && m.version <= toVersion
    );
  }

  /**
   * Get latest version
   */
  getLatestVersion(): number {
    const all = this.getAll();
    return all.length > 0 ? all[all.length - 1].version : 0;
  }

  /**
   * Check if migration path exists
   */
  hasPath(fromVersion: number, toVersion: number): boolean {
    const migrations = this.getRange(fromVersion, toVersion);
    if (migrations.length === 0) return false;

    // Check for contiguous versions
    let expectedVersion = fromVersion + 1;
    for (const migration of migrations) {
      if (migration.version !== expectedVersion) {
        return false;
      }
      expectedVersion++;
    }

    return expectedVersion - 1 === toVersion;
  }
}

/**
 * Migration runner
 */
export class MigrationRunner {
  private registry: MigrationRegistry;
  private indexeddb: IndexedDBRepository;

  constructor(
    registry: MigrationRegistry = getMigrationRegistry(),
    indexeddb: IndexedDBRepository = new IndexedDBRepository()
  ) {
    this.registry = registry;
    this.indexeddb = indexeddb;
  }

  /**
   * Initialize the runner
   */
  async initialize(): Promise<void> {
    await this.indexeddb.initialize();
  }

  /**
   * Migrate a project to the target version
   */
  async migrate(
    project: Project,
    targetVersion?: number
  ): Promise<{ project: Project; result: MigrationResult }> {
    const startTime = performance.now();
    const target = targetVersion ?? this.registry.getLatestVersion();
    const currentVersion = project.schemaVersion;

    // If already at target, nothing to do
    if (currentVersion === target) {
      return {
        project,
        result: {
          success: true,
          fromVersion: currentVersion,
          toVersion: target,
          applied: [],
          errors: [],
          durationMs: 0,
        },
      };
    }

    // Check for downgrade (not supported)
    if (target < currentVersion) {
      throw new MigrationError(
        `Downgrade from ${currentVersion} to ${target} is not supported`,
        target,
        'DOWNGRADE_NOT_SUPPORTED'
      );
    }

    // Get migrations to apply
    const migrations = this.registry.getRange(currentVersion, target);
    
    if (migrations.length === 0) {
      throw new MigrationError(
        `No migration path from ${currentVersion} to ${target}`,
        target,
        'NO_PATH'
      );
    }

    // Apply migrations
    const applied: number[] = [];
    const errors: Array<{ version: number; error: string }> = [];
    let migratedProject = project;

    for (const migration of migrations) {
      try {
        migratedProject = await this.applyMigration(migratedProject, migration);
        applied.push(migration.version);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ version: migration.version, error: message });
        
        // Stop on first error
        break;
      }
    }

    const durationMs = performance.now() - startTime;

    return {
      project: migratedProject,
      result: {
        success: errors.length === 0,
        fromVersion: currentVersion,
        toVersion: errors.length > 0 ? applied[applied.length - 1] ?? currentVersion : target,
        applied,
        errors,
        durationMs,
      },
    };
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(project: Project, migration: Migration): Promise<Project> {
    const startTime = performance.now();

    try {
      // Apply the migration
      const migrated = await migration.migrate(project);
      
      // Update schema version
      migrated.schemaVersion = migration.version;
      
      // Record the migration
      const record: MigrationRecord = {
        version: migration.version,
        appliedAt: new Date().toISOString(),
        durationMs: performance.now() - startTime,
        success: true,
      };
      await this.indexeddb.recordMigration(record);

      return migrated;
    } catch (error) {
      // Record failed migration
      const record: MigrationRecord = {
        version: migration.version,
        appliedAt: new Date().toISOString(),
        durationMs: performance.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      await this.indexeddb.recordMigration(record);

      throw error;
    }
  }

  /**
   * Check if project needs migration
   */
  needsMigration(project: Project): boolean {
    return project.schemaVersion < this.registry.getLatestVersion();
  }

  /**
   * Get migration status for a project
   */
  getMigrationStatus(project: Project): {
    currentVersion: number;
    targetVersion: number;
    pending: number[];
    canMigrate: boolean;
  } {
    const currentVersion = project.schemaVersion;
    const targetVersion = this.registry.getLatestVersion();
    const pending = this.registry.getRange(currentVersion, targetVersion).map(m => m.version);
    
    return {
      currentVersion,
      targetVersion,
      pending,
      canMigrate: pending.length > 0,
    };
  }

  /**
   * Get migration history
   */
  async getHistory(): Promise<MigrationRecord[]> {
    return this.indexeddb.getMigrationHistory();
  }
}

// Singleton registry
let defaultRegistry: MigrationRegistry | null = null;

export function getMigrationRegistry(): MigrationRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new MigrationRegistry();
    registerBuiltinMigrations(defaultRegistry);
  }
  return defaultRegistry;
}

// Singleton runner
let defaultRunner: MigrationRunner | null = null;

export function getMigrationRunner(): MigrationRunner {
  if (!defaultRunner) {
    defaultRunner = new MigrationRunner();
  }
  return defaultRunner;
}

/**
 * Register built-in migrations
 */
function registerBuiltinMigrations(registry: MigrationRegistry): void {
  // V0 -> V1: Initial schema (identity migration)
  registry.register({
    version: 1,
    name: 'Initial Schema',
    description: 'Base project schema',
    migrate: async (project) => project,
  });

  // Future migrations will be added here
  // Example:
  // registry.register({
  //   version: 2,
  //   name: 'Add MPE Support',
  //   description: 'Adds MPE lane data to MIDI clips',
  //   migrate: async (project) => {
  //     // Migrate each MIDI clip
  //     for (const clip of project.clips.midi) {
  //       if (!clip.mpe) {
  //         clip.mpe = [];
  //       }
  //     }
  //     return project;
  //   },
  // });
}

/**
 * Helper to create a simple migration
 */
export function createMigration(
  version: number,
  name: string,
  description: string,
  migrateFn: MigrationFn
): Migration {
  return {
    version,
    name,
    description,
    migrate: migrateFn,
  };
}

/**
 * Validate project before migration
 */
export function validateProjectBeforeMigration(project: Project): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!project.id) {
    errors.push('Project ID is required');
  }

  if (!project.name) {
    errors.push('Project name is required');
  }

  if (typeof project.schemaVersion !== 'number') {
    errors.push('Schema version must be a number');
  }

  if (!Array.isArray(project.tracks)) {
    errors.push('Tracks must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Safe migration wrapper with rollback support
 */
export async function safeMigrate(
  runner: MigrationRunner,
  project: Project,
  targetVersion?: number
): Promise<{ project: Project; result: MigrationResult; backup?: Project }> {
  // Validate before migration
  const validation = validateProjectBeforeMigration(project);
  if (!validation.valid) {
    return {
      project,
      result: {
        success: false,
        fromVersion: project.schemaVersion,
        toVersion: targetVersion ?? project.schemaVersion,
        applied: [],
        errors: validation.errors.map(e => ({ version: 0, error: e })),
        durationMs: 0,
      },
    };
  }

  // Create backup
  const backup = JSON.parse(JSON.stringify(project));

  try {
    const result = await runner.migrate(project, targetVersion);
    return {
      project: result.project,
      result: result.result,
      backup: result.result.success ? undefined : backup,
    };
  } catch (error) {
    return {
      project,
      result: {
        success: false,
        fromVersion: project.schemaVersion,
        toVersion: targetVersion ?? project.schemaVersion,
        applied: [],
        errors: [{ version: 0, error: error instanceof Error ? error.message : String(error) }],
        durationMs: 0,
      },
      backup,
    };
  }
}
