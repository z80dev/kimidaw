/**
 * Project Persistence Store
 * 
 * Coordinates between OPFS (for large files) and IndexedDB (for metadata)
 * to provide complete project persistence with event sourcing.
 */

import type { Project, CommandJournalEntry, ProjectSnapshot } from '@daw/project-schema';
import { OpfsRepository, getOpfsRepository, isOpfsSupported } from './opfs.js';
import { IndexedDBRepository, getIndexedDBRepository, type ProjectMetadata } from './indexeddb.js';

// Error types
export class ProjectStoreError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ProjectStoreError';
  }
}

// Project manifest stored in OPFS
export interface ProjectManifest {
  version: number;
  projectId: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  schemaVersion: number;
  currentSnapshot: string | null; // Snapshot file name
  journalRange: {
    firstSequence: number;
    lastSequence: number;
  } | null;
  assetHashes: string[];
  settings: {
    autosaveInterval: number;
    maxJournalSize: number;
    snapshotsEnabled: boolean;
    snapshotInterval: number; // Number of commands between snapshots
  };
}

// Project statistics
export interface ProjectStats {
  projectId: string;
  totalSize: number;
  assetSize: number;
  journalSize: number;
  snapshotCount: number;
  commandCount: number;
  lastModified: string;
}

// Storage mode
export type StorageMode = 'opfs' | 'indexeddb' | 'hybrid';

/**
 * Project Store
 * 
 * Manages project persistence using a hybrid approach:
 * - OPFS: Large files, assets, snapshots, journal
 * - IndexedDB: Metadata, indices, quick lookups
 */
export class ProjectStore {
  private opfs: OpfsRepository;
  private indexeddb: IndexedDBRepository;
  private storageMode: StorageMode;

  constructor(
    opfs: OpfsRepository = getOpfsRepository(),
    indexeddb: IndexedDBRepository = getIndexedDBRepository()
  ) {
    this.opfs = opfs;
    this.indexeddb = indexeddb;
    this.storageMode = isOpfsSupported() ? 'hybrid' : 'indexeddb';
  }

  /**
   * Initialize the store
   */
  async initialize(): Promise<void> {
    await this.indexeddb.initialize();
    if (this.storageMode !== 'indexeddb') {
      await this.opfs.initialize();
    }
  }

  /**
   * Create a new project
   */
  async createProject(project: Project): Promise<void> {
    const projectPath = `projects/${project.id}`;

    // Create project directory structure
    await this.opfs.createDirectory(`${projectPath}/journal`);
    await this.opfs.createDirectory(`${projectPath}/snapshots`);
    await this.opfs.createDirectory(`${projectPath}/assets`);

    // Create manifest
    const manifest: ProjectManifest = {
      version: 1,
      projectId: project.id,
      name: project.name,
      createdAt: project.createdAt,
      modifiedAt: project.updatedAt,
      schemaVersion: project.schemaVersion,
      currentSnapshot: null,
      journalRange: null,
      assetHashes: [],
      settings: {
        autosaveInterval: 5000, // 5 seconds
        maxJournalSize: 1000, // Max commands before forcing snapshot
        snapshotsEnabled: true,
        snapshotInterval: 100,
      },
    };

    await this.saveManifest(project.id, manifest);

    // Save initial project state
    await this.saveSnapshot(project, 0);

    // Update metadata
    await this.updateProjectMetadata(project, manifest);
  }

  /**
   * Load a project
   */
  async loadProject(projectId: string): Promise<Project> {
    const manifest = await this.loadManifest(projectId);
    if (!manifest) {
      throw new ProjectStoreError(`Project not found: ${projectId}`, 'NOT_FOUND');
    }

    // Load from current snapshot
    if (manifest.currentSnapshot) {
      const project = await this.loadSnapshot(projectId, manifest.currentSnapshot);
      if (project) {
        // Load journal entries for potential replay (currently unused)
        void this.loadJournalEntries(
          projectId,
          (manifest.journalRange?.firstSequence ?? 0)
        );
        return project;
      }
    }

    throw new ProjectStoreError(
      `Failed to load project: ${projectId}`,
      'LOAD_ERROR'
    );
  }

  /**
   * Save a project snapshot
   */
  async saveSnapshot(project: Project, sequence: number): Promise<void> {
    const snapshot: ProjectSnapshot = {
      id: `snapshot-${sequence.toString().padStart(8, '0')}`,
      projectId: project.id,
      sequence,
      timestamp: Date.now(),
      state: project,
      schemaVersion: project.schemaVersion,
      checksum: await this.computeChecksum(project),
    };

    const path = `projects/${project.id}/snapshots/${snapshot.id}.json`;
    await this.opfs.writeJson(path, snapshot);

    // Update manifest
    const manifest = await this.loadManifest(project.id);
    if (manifest) {
      manifest.currentSnapshot = snapshot.id;
      manifest.modifiedAt = new Date().toISOString();
      await this.saveManifest(project.id, manifest);
      await this.updateProjectMetadata(project, manifest);
    }
  }

  /**
   * Load a snapshot
   */
  async loadSnapshot(projectId: string, snapshotId: string): Promise<Project | null> {
    const path = `projects/${projectId}/snapshots/${snapshotId}.json`;
    const snapshot = await this.opfs.readJson<ProjectSnapshot>(path);
    
    if (!snapshot) return null;
    
    // Validate checksum
    const computed = await this.computeChecksum(snapshot.state);
    if (computed !== snapshot.checksum) {
      console.warn(`Checksum mismatch for snapshot ${snapshotId}`);
      // Still return the project but log warning
    }

    return snapshot.state as Project;
  }

  /**
   * List all snapshots for a project
   */
  async listSnapshots(projectId: string): Promise<Array<{ id: string; sequence: number; timestamp: number }>> {
    const path = `projects/${projectId}/snapshots`;
    const entries = await this.opfs.listDirectory(path);
    
    return entries
      .filter(e => e.type === 'file' && e.name.endsWith('.json'))
      .map(e => {
        const match = e.name.match(/snapshot-(\d{8})\.json/);
        return {
          id: e.name.replace('.json', ''),
          sequence: match ? parseInt(match[1], 10) : 0,
          timestamp: e.lastModified,
        };
      })
      .sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * Delete old snapshots, keeping only the most recent N
   */
  async pruneSnapshots(projectId: string, keepCount: number = 10): Promise<void> {
    const snapshots = await this.listSnapshots(projectId);
    
    if (snapshots.length <= keepCount) return;

    const toDelete = snapshots.slice(0, -keepCount);
    
    for (const snapshot of toDelete) {
      const path = `projects/${projectId}/snapshots/${snapshot.id}.json`;
      await this.opfs.deleteFile(path);
    }
  }

  /**
   * Append commands to the journal
   */
  async appendToJournal(projectId: string, entries: CommandJournalEntry[]): Promise<void> {
    if (entries.length === 0) return;

    // Group by log file (each file contains up to 1000 entries)
    const groups = new Map<number, CommandJournalEntry[]>();
    
    for (const entry of entries) {
      const fileNumber = Math.floor(entry.sequence / 1000);
      const group = groups.get(fileNumber) ?? [];
      group.push(entry);
      groups.set(fileNumber, group);
    }

    // Append to each log file
    for (const [fileNumber, fileEntries] of groups) {
      const fileName = fileNumber.toString().padStart(6, '0');
      const path = `projects/${projectId}/journal/${fileName}.cmdlog`;
      
      // Serialize entries
      const lines = fileEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
      await this.opfs.writeFile(path, lines, { create: true, append: true });
    }

    // Update manifest
    const manifest = await this.loadManifest(projectId);
    if (manifest) {
      const sequences = entries.map(e => e.sequence);
      if (!manifest.journalRange) {
        manifest.journalRange = {
          firstSequence: Math.min(...sequences),
          lastSequence: Math.max(...sequences),
        };
      } else {
        manifest.journalRange.lastSequence = Math.max(
          manifest.journalRange.lastSequence,
          ...sequences
        );
      }
      manifest.modifiedAt = new Date().toISOString();
      await this.saveManifest(projectId, manifest);
    }
  }

  /**
   * Load journal entries for a project
   */
  async loadJournalEntries(
    projectId: string,
    fromSequence: number = 0
  ): Promise<CommandJournalEntry[]> {
    const entries: CommandJournalEntry[] = [];
    const path = `projects/${projectId}/journal`;
    
    try {
      const files = await this.opfs.listDirectory(path);
      const logFiles = files
        .filter(f => f.type === 'file' && f.name.endsWith('.cmdlog'))
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const file of logFiles) {
        const content = await this.opfs.readText(`${path}/${file.name}`);
        if (!content) continue;

        const lines = content.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as CommandJournalEntry;
            if (entry.sequence >= fromSequence) {
              entries.push(entry);
            }
          } catch {
            // Skip invalid lines
          }
        }
      }
    } catch {
      // Directory might not exist yet
    }

    return entries.sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    // Delete from OPFS
    await this.opfs.deleteDirectory(`projects/${projectId}`);

    // Delete from IndexedDB
    await this.indexeddb.delete('projects', projectId);
    await this.indexeddb.delete('recents', projectId);
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<ProjectMetadata[]> {
    return this.indexeddb.getAll<ProjectMetadata>('projects');
  }

  /**
   * Get project statistics
   */
  async getProjectStats(projectId: string): Promise<ProjectStats | null> {
    const manifest = await this.loadManifest(projectId);
    if (!manifest) return null;

    const journalEntries = await this.loadJournalEntries(projectId);
    const snapshots = await this.listSnapshots(projectId);

    // Calculate sizes (approximate)
    let assetSize = 0;
    for (const hash of manifest.assetHashes) {
      const info = await this.opfs.getFileInfo(`assets/audio/${hash.slice(0, 2)}/${hash.slice(2)}.bin`);
      if (info) {
        assetSize += info.size;
      }
    }

    return {
      projectId,
      totalSize: 0, // Would need to calculate recursively
      assetSize,
      journalSize: journalEntries.length * 500, // Rough estimate
      snapshotCount: snapshots.length,
      commandCount: journalEntries.length,
      lastModified: manifest.modifiedAt,
    };
  }

  /**
   * Export project to a serializable format
   */
  async exportProject(projectId: string): Promise<{ project: Project; assets: Map<string, ArrayBuffer> } | null> {
    const project = await this.loadProject(projectId);
    if (!project) return null;

    const assets = new Map<string, ArrayBuffer>();
    
    // Load all referenced assets
    for (const assetRef of project.assets) {
      const path = `assets/audio/${assetRef.hash.slice(0, 2)}/${assetRef.hash.slice(2)}.bin`;
      const data = await this.opfs.readFile(path);
      if (data) {
        assets.set(assetRef.hash, data);
      }
    }

    return { project, assets };
  }

  /**
   * Import project from exported format
   */
  async importProject(
    project: Project,
    assets: Map<string, ArrayBuffer>,
    newId?: string
  ): Promise<string> {
    // Generate new ID if not provided
    const projectId = newId ?? `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    // Update project ID
    const importedProject: Project = {
      ...project,
      id: projectId,
      name: newId ? project.name : `${project.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save assets
    for (const [hash, data] of assets) {
      const path = `assets/audio/${hash.slice(0, 2)}/${hash.slice(2)}.bin`;
      await this.opfs.writeFile(path, data);
    }

    // Create project
    await this.createProject(importedProject);

    return projectId;
  }

  /**
   * Duplicate a project
   */
  async duplicateProject(projectId: string, newName?: string): Promise<string> {
    const exported = await this.exportProject(projectId);
    if (!exported) {
      throw new ProjectStoreError(`Cannot export project: ${projectId}`, 'EXPORT_ERROR');
    }

    if (newName) {
      exported.project.name = newName;
    }

    return this.importProject(exported.project, exported.assets);
  }

  /**
   * Rename a project
   */
  async renameProject(projectId: string, newName: string): Promise<void> {
    const manifest = await this.loadManifest(projectId);
    if (!manifest) {
      throw new ProjectStoreError(`Project not found: ${projectId}`, 'NOT_FOUND');
    }

    manifest.name = newName;
    manifest.modifiedAt = new Date().toISOString();
    await this.saveManifest(projectId, manifest);

    // Update metadata
    const metadata = await this.indexeddb.getProjectMetadata(projectId);
    if (metadata) {
      metadata.name = newName;
      metadata.modifiedAt = manifest.modifiedAt;
      await this.indexeddb.saveProjectMetadata(metadata);
    }
  }

  // ==================== Private Helpers ====================

  private async loadManifest(projectId: string): Promise<ProjectManifest | null> {
    const path = `projects/${projectId}/manifest.json`;
    return this.opfs.readJson<ProjectManifest>(path);
  }

  private async saveManifest(projectId: string, manifest: ProjectManifest): Promise<void> {
    const path = `projects/${projectId}/manifest.json`;
    await this.opfs.writeJson(path, manifest);
  }

  private async updateProjectMetadata(
    project: Project,
    manifest: ProjectManifest
  ): Promise<void> {
    const metadata: ProjectMetadata = {
      id: project.id,
      name: project.name,
      createdAt: manifest.createdAt,
      modifiedAt: manifest.modifiedAt,
      schemaVersion: project.schemaVersion,
      size: 0, // Would calculate
      isOpen: false,
    };

    await this.indexeddb.saveProjectMetadata(metadata);
  }

  private async computeChecksum(data: unknown): Promise<string> {
    // Simple checksum for now - in production use proper hash
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

// Singleton instance
let defaultStore: ProjectStore | null = null;

export function getProjectStore(): ProjectStore {
  if (!defaultStore) {
    defaultStore = new ProjectStore();
  }
  return defaultStore;
}
