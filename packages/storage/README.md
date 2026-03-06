# @daw/storage

Storage layer for the In-Browser DAW with OPFS and IndexedDB support.

## Overview

This package provides persistent storage for the DAW using:
- **OPFS (Origin Private File System)** - Large binary assets, project snapshots, command journals
- **IndexedDB** - Metadata, indices, recent projects, diagnostics

Implements the storage model from section 17 of the engineering specification.

## Installation

```bash
pnpm add @daw/storage
```

## Features

- **Hybrid storage** - OPFS for large files, IndexedDB for metadata
- **Content-addressed assets** - SHA-256 based deduplication
- **Event sourcing** - Command journal for undo/redo and crash recovery
- **Schema migrations** - Versioned project upgrades
- **Automatic fallback** - Works with or without OPFS

## Usage

### Initialize Storage

```typescript
import { getProjectStore, getAssetStore, getCommandJournal } from '@daw/storage';

const projectStore = getProjectStore();
const assetStore = getAssetStore();

await projectStore.initialize();
await assetStore.initialize();
```

### Create and Load Projects

```typescript
import { createProject } from '@daw/project-schema';

// Create project
const project = createProject('proj-123', 'My Song');
await projectStore.createProject(project);

// Load project
const loaded = await projectStore.loadProject('proj-123');
```

### Import Assets

```typescript
const file: File = /* from file input */;
const result = await assetStore.importAsset(
  file,
  {
    name: file.name,
    mimeType: file.type,
    source: { type: 'imported', importedAt: new Date().toISOString() },
  },
  'proj-123' // Optional project ID for tracking
);

console.log(result.hash);      // SHA-256 hash
console.log(result.isNew);     // True if first time importing
console.log(result.size);      // Size in bytes
```

### Command Journal

```typescript
import { getCommandJournal, formatJournalEntry } from '@daw/storage';
import { createCommand, COMMAND_TYPES } from '@daw/project-schema';

const journal = getCommandJournal();

// Create and append command
const command = createCommand(
  COMMAND_TYPES.NOTE.ADD,
  { clipId: 'clip-1', note: { id: 'n1', note: 60, velocity: 100, startTick: 0, durationTicks: 480 } }
);

const entry = journal.append(command, 'proj-123', 1);
console.log(formatJournalEntry(entry));

// Undo/Redo
if (journal.canUndo()) {
  const cmd = journal.popUndo();
  // Apply inverse...
}
```

### Snapshots

```typescript
// Save snapshot
await projectStore.saveSnapshot(project, journal.getSequence());

// Load snapshot
const restored = await projectStore.loadSnapshot('proj-123', 'snapshot-00000042');

// List snapshots
const snapshots = await projectStore.listSnapshots('proj-123');

// Cleanup old snapshots
await projectStore.pruneSnapshots('proj-123', 10); // Keep last 10
```

### Migrations

```typescript
import { getMigrationRunner, createMigration } from '@daw/storage';

const runner = getMigrationRunner();
await runner.initialize();

// Check if migration needed
if (runner.needsMigration(project)) {
  const { project: migrated, result } = await runner.migrate(project);
  
  if (result.success) {
    console.log(`Migrated from ${result.fromVersion} to ${result.toVersion}`);
  } else {
    console.error('Migration failed:', result.errors);
  }
}
```

## API Reference

### ProjectStore

```typescript
class ProjectStore {
  async initialize(): Promise<void>;
  async createProject(project: Project): Promise<void>;
  async loadProject(projectId: string): Promise<Project>;
  async saveSnapshot(project: Project, sequence: number): Promise<void>;
  async loadSnapshot(projectId: string, snapshotId: string): Promise<Project | null>;
  async listSnapshots(projectId: string): Promise<SnapshotInfo[]>;
  async appendToJournal(projectId: string, entries: CommandJournalEntry[]): Promise<void>;
  async loadJournalEntries(projectId: string, fromSequence?: number): Promise<CommandJournalEntry[]>;
  async deleteProject(projectId: string): Promise<void>;
  async listProjects(): Promise<ProjectMetadata[]>;
  async duplicateProject(projectId: string, newName?: string): Promise<string>;
  async renameProject(projectId: string, newName: string): Promise<void>;
  async exportProject(projectId: string): Promise<{ project: Project; assets: Map<string, ArrayBuffer> } | null>;
  async importProject(project: Project, assets: Map<string, ArrayBuffer>, newId?: string): Promise<string>;
}
```

### AssetStore

```typescript
class AssetStore {
  async initialize(): Promise<void>;
  async importAsset(
    data: Blob | ArrayBuffer,
    metadata?: Partial<AssetMetadata>,
    projectId?: string
  ): Promise<AssetImportResult>;
  async getAsset(hash: string): Promise<ArrayBuffer | null>;
  async hasAsset(hash: string): Promise<boolean>;
  async getAssetMetadata(hash: string): Promise<AssetMetadata | null>;
  async savePeakData(hash: string, peakData: Float32Array, levels: number): Promise<void>;
  async loadPeakData(hash: string): Promise<{ levels: number; data: Float32Array } | null>;
  async saveAnalysis(hash: string, analysis: unknown): Promise<void>;
  async loadAnalysis<T>(hash: string): Promise<T | null>;
  async deleteAsset(hash: string): Promise<void>;
  async listAssets(): Promise<AssetIndexEntry[]>;
  async getProjectAssets(projectId: string): Promise<AssetIndexEntry[]>;
  async getStats(): Promise<AssetStoreStats>;
  async cleanupOrphanedAssets(): Promise<{ removed: number; freedBytes: number }>;
}
```

### CommandJournal

```typescript
class CommandJournal {
  getSequence(): number;
  getLastSnapshotSequence(): number;
  needsSnapshot(): boolean;
  append(command: Command, projectId: string, schemaVersion: number): CommandJournalEntry;
  appendBatch(commands: Command[], projectId: string, schemaVersion: number): CommandJournalEntry[];
  getEntriesSince(sequence: number): CommandJournalEntry[];
  getAllEntries(): CommandJournalEntry[];
  canUndo(): boolean;
  canRedo(): boolean;
  popUndo(): Command | undefined;
  popRedo(): Command | undefined;
  recordSnapshot(snapshot: ProjectSnapshot): void;
  clear(): void;
  isDirty(): boolean;
  markSaved(): void;
  subscribe(listener: (entry: CommandJournalEntry) => void): () => void;
  serialize(): string;
  deserialize(data: string): void;
  getStats(): JournalStats;
}
```

### OpfsRepository

```typescript
class OpfsRepository {
  async initialize(): Promise<void>;
  async writeFile(path: string, data: Blob | ArrayBuffer | string, options?: WriteOptions): Promise<void>;
  async readFile(path: string): Promise<ArrayBuffer | null>;
  async readText(path: string): Promise<string | null>;
  async readJson<T>(path: string): Promise<T | null>;
  async exists(path: string): Promise<boolean>;
  async deleteFile(path: string): Promise<void>;
  async deleteDirectory(path: string): Promise<void>;
  async createDirectory(path: string): Promise<void>;
  async listDirectory(path?: string): Promise<OpfsFileInfo[]>;
  async getFileInfo(path: string): Promise<OpfsFileInfo | null>;
  async writeJson(path: string, data: unknown): Promise<void>;
  async copyFile(sourcePath: string, destPath: string): Promise<void>;
  async moveFile(sourcePath: string, destPath: string): Promise<void>;
  async getStorageUsage(): Promise<{ used: number; quota: number }>;
}
```

### IndexedDBRepository

```typescript
class IndexedDBRepository {
  async initialize(): Promise<void>;
  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined>;
  async put<T>(storeName: string, value: T): Promise<IDBValidKey>;
  async delete(storeName: string, key: IDBValidKey): Promise<void>;
  async getAll<T>(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]>;
  async queryByIndex<T>(storeName: string, indexName: string, key: IDBValidKey | IDBKeyRange): Promise<T[]>;
  async *cursor<T>(storeName: string, direction?: IDBCursorDirection): AsyncGenerator<T>;
  async count(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<number>;
  async clear(storeName: string): Promise<void>;
  async batchPut<T>(storeName: string, values: T[]): Promise<void>;
  close(): void;
  
  // Convenience methods
  async getProjectMetadata(projectId: string): Promise<ProjectMetadata | undefined>;
  async saveProjectMetadata(metadata: ProjectMetadata): Promise<void>;
  async getRecentProjects(limit?: number): Promise<RecentProject[]>;
  async addRecentProject(project: RecentProject): Promise<void>;
  async getAssetIndexEntry(assetId: string): Promise<AssetIndexEntry | undefined>;
  async saveAssetIndexEntry(entry: AssetIndexEntry): Promise<void>;
  async getAssetByHash(hash: string): Promise<AssetIndexEntry | undefined>;
  async logDiagnostic(entry: Omit<DiagnosticsEntry, 'id'>): Promise<void>;
  async getDiagnostics(options?: { type?: string; category?: string; limit?: number }): Promise<DiagnosticsEntry[]>;
  async recordMigration(record: MigrationRecord): Promise<void>;
  async getMigrationHistory(): Promise<MigrationRecord[]>;
}
```

## Storage Layout

### OPFS Structure

```
/daw/
  projects/
    <projectId>/
      manifest.json
      journal/
        000001.cmdlog
        000002.cmdlog
      snapshots/
        snapshot-00000010.json
      assets/
        (references only, actual assets in global assets/)
  assets/
    audio/
      ab/
        cdef1234567890.bin
    peaks/
      ab/
        cdef1234567890.peaks
    analysis/
      ab/
        cdef1234567890.meta.json
        cdef1234567890.analysis.json
```

### IndexedDB Stores

- `projects` - Project metadata
- `recents` - Recently opened projects
- `assetIndex` - Asset references and hashes
- `waveformIndex` - Waveform cache metadata
- `presetIndex` - Preset search index
- `scriptCache` - Compiled script cache
- `capabilities` - Browser capability detection
- `diagnostics` - Error/warning logs
- `migrations` - Migration history

## Browser Support

- **Chrome/Edge**: Full OPFS support
- **Firefox**: OPFS support (may need flag)
- **Safari**: OPFS support in recent versions

Graceful degradation to IndexedDB-only mode when OPFS is unavailable.

## License

MIT
