/**
 * Project Backup Manager
 * 
 * Manages automatic backups and version history for projects.
 */

// ============================================================================
// Types
// ============================================================================

export interface ProjectBackup {
  id: string;
  projectId: string;
  projectName: string;
  createdAt: Date;
  size: number;
  reason: 'auto' | 'manual' | 'pre-save' | 'crash-recovery';
  description?: string;
  tags?: string[];
}

export interface BackupConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxBackups: number;
  maxAgeDays: number;
  keepManualBackups: boolean;
  backupOnSave: boolean;
  compressionEnabled: boolean;
}

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  enabled: true,
  intervalMinutes: 10,
  maxBackups: 20,
  maxAgeDays: 7,
  keepManualBackups: true,
  backupOnSave: true,
  compressionEnabled: true,
};

export interface ProjectVersion {
  id: string;
  projectId: string;
  version: number;
  createdAt: Date;
  author?: string;
  comment?: string;
  changes: string[];
  size: number;
}

export interface BackupManagerOptions {
  storage: BackupStorage;
  config?: Partial<BackupConfig>;
}

export interface BackupStorage {
  saveBackup(projectId: string, data: Uint8Array, metadata: Omit<ProjectBackup, 'id' | 'size'>): Promise<ProjectBackup>;
  loadBackup(backupId: string): Promise<{ data: Uint8Array; metadata: ProjectBackup }>;
  deleteBackup(backupId: string): Promise<void>;
  listBackups(projectId?: string): Promise<ProjectBackup[]>;
  getStorageStats(): Promise<{ used: number; available: number }>;
  
  saveVersion(projectId: string, data: Uint8Array, metadata: Omit<ProjectVersion, 'id' | 'size'>): Promise<ProjectVersion>;
  loadVersion(versionId: string): Promise<{ data: Uint8Array; metadata: ProjectVersion }>;
  listVersions(projectId: string): Promise<ProjectVersion[]>;
}

// ============================================================================
// Backup Manager
// ============================================================================

export interface BackupManager {
  // Configuration
  getConfig(): BackupConfig;
  updateConfig(config: Partial<BackupConfig>): void;
  
  // Automatic backups
  startAutoBackup(projectId: string, getProjectData: () => Promise<Uint8Array>): void;
  stopAutoBackup(projectId: string): void;
  pauseAutoBackup(projectId: string): void;
  resumeAutoBackup(projectId: string): void;
  
  // Manual backups
  createBackup(
    projectId: string,
    projectData: Uint8Array,
    options?: Partial<{
      reason: ProjectBackup['reason'];
      description: string;
      tags: string[];
    }>
  ): Promise<ProjectBackup>;
  
  // Backup management
  listBackups(projectId?: string): Promise<ProjectBackup[]>;
  restoreBackup(backupId: string): Promise<Uint8Array>;
  deleteBackup(backupId: string): Promise<void>;
  deleteOldBackups(projectId?: string): Promise<number>; // count deleted
  
  // Versions
  createVersion(
    projectId: string,
    projectData: Uint8Array,
    comment?: string
  ): Promise<ProjectVersion>;
  listVersions(projectId: string): Promise<ProjectVersion[]>;
  restoreVersion(versionId: string): Promise<Uint8Array>;
  compareVersions(versionId1: string, versionId2: string): Promise<string[]>; // list of changes
  
  // Storage
  getStorageStats(): Promise<{ used: number; available: number; backups: number }>;
  cleanup(): Promise<{ deleted: number; freed: number }>;
}

export function createBackupManager(options: BackupManagerOptions): BackupManager {
  const { storage } = options;
  let config: BackupConfig = { ...DEFAULT_BACKUP_CONFIG, ...options.config };
  
  const autoBackupTimers = new Map<string, {
    timer: ReturnType<typeof setInterval>;
    getData: () => Promise<Uint8Array>;
    paused: boolean;
  }>();
  
  function getConfig(): BackupConfig {
    return { ...config };
  }
  
  function updateConfig(newConfig: Partial<BackupConfig>): void {
    config = { ...config, ...newConfig };
    
    // Restart auto-backups with new interval if changed
    if (newConfig.intervalMinutes) {
      for (const [projectId, state] of autoBackupTimers) {
        stopAutoBackup(projectId);
        startAutoBackup(projectId, state.getData);
      }
    }
  }
  
  function startAutoBackup(
    projectId: string,
    getProjectData: () => Promise<Uint8Array>
  ): void {
    if (!config.enabled) return;
    
    // Clear existing timer
    stopAutoBackup(projectId);
    
    // Create new timer
    const intervalMs = config.intervalMinutes * 60 * 1000;
    const timer = setInterval(async () => {
      const state = autoBackupTimers.get(projectId);
      if (state && !state.paused) {
        try {
          const data = await getProjectData();
          await createBackup(projectId, data, {
            reason: 'auto',
            description: 'Automatic backup',
          });
        } catch (error) {
          console.error('Auto-backup failed:', error);
        }
      }
    }, intervalMs);
    
    autoBackupTimers.set(projectId, {
      timer,
      getData: getProjectData,
      paused: false,
    });
  }
  
  function stopAutoBackup(projectId: string): void {
    const state = autoBackupTimers.get(projectId);
    if (state) {
      clearInterval(state.timer);
      autoBackupTimers.delete(projectId);
    }
  }
  
  function pauseAutoBackup(projectId: string): void {
    const state = autoBackupTimers.get(projectId);
    if (state) {
      state.paused = true;
    }
  }
  
  function resumeAutoBackup(projectId: string): void {
    const state = autoBackupTimers.get(projectId);
    if (state) {
      state.paused = false;
    }
  }
  
  async function createBackup(
    projectId: string,
    projectData: Uint8Array,
    opts: Partial<{
      reason: ProjectBackup['reason'];
      description: string;
      tags: string[];
    }> = {}
  ): Promise<ProjectBackup> {
    const metadata: Omit<ProjectBackup, 'id' | 'size'> = {
      projectId,
      projectName: '', // Will be populated by storage
      createdAt: new Date(),
      reason: opts.reason || 'manual',
      description: opts.description,
      tags: opts.tags,
    };
    
    const backup = await storage.saveBackup(projectId, projectData, metadata);
    
    // Clean up old backups if we exceed max
    if (config.maxBackups > 0 && opts.reason !== 'manual') {
      await cleanupOldBackups(projectId);
    }
    
    return backup;
  }
  
  async function listBackups(projectId?: string): Promise<ProjectBackup[]> {
    return storage.listBackups(projectId);
  }
  
  async function restoreBackup(backupId: string): Promise<Uint8Array> {
    const { data } = await storage.loadBackup(backupId);
    return data;
  }
  
  async function deleteBackup(backupId: string): Promise<void> {
    await storage.deleteBackup(backupId);
  }
  
  async function deleteOldBackups(projectId?: string): Promise<number> {
    let deletedCount = 0;
    
    const backups = await storage.listBackups(projectId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.maxAgeDays);
    
    for (const backup of backups) {
      // Don't delete manual backups if configured
      if (backup.reason === 'manual' && config.keepManualBackups) {
        continue;
      }
      
      // Delete if older than max age
      if (backup.createdAt < cutoffDate) {
        await storage.deleteBackup(backup.id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
  
  async function cleanupOldBackups(projectId: string): Promise<void> {
    const backups = await storage.listBackups(projectId);
    
    // Sort by date (newest first)
    const sortedBackups = backups
      .filter(b => b.reason !== 'manual' || !config.keepManualBackups)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Delete excess backups
    if (sortedBackups.length > config.maxBackups) {
      const toDelete = sortedBackups.slice(config.maxBackups);
      for (const backup of toDelete) {
        await storage.deleteBackup(backup.id);
      }
    }
  }
  
  async function createVersion(
    projectId: string,
    projectData: Uint8Array,
    comment?: string
  ): Promise<ProjectVersion> {
    // Get existing versions to determine version number
    const versions = await storage.listVersions(projectId);
    const nextVersion = versions.length > 0 
      ? Math.max(...versions.map(v => v.version)) + 1 
      : 1;
    
    const metadata: Omit<ProjectVersion, 'id' | 'size'> = {
      projectId,
      version: nextVersion,
      createdAt: new Date(),
      comment,
      changes: [], // Would be populated by diff analysis
    };
    
    return storage.saveVersion(projectId, projectData, metadata);
  }
  
  async function listVersions(projectId: string): Promise<ProjectVersion[]> {
    return storage.listVersions(projectId);
  }
  
  async function restoreVersion(versionId: string): Promise<Uint8Array> {
    const { data } = await storage.loadVersion(versionId);
    return data;
  }
  
  async function compareVersions(versionId1: string, versionId2: string): Promise<string[]> {
    // In a real implementation, this would compare project data
    // and return a list of changes (tracks added, clips modified, etc.)
    return ['Comparison not implemented'];
  }
  
  async function getStorageStats(): Promise<{ used: number; available: number; backups: number }> {
    const stats = await storage.getStorageStats();
    const backups = await storage.listBackups();
    
    return {
      ...stats,
      backups: backups.length,
    };
  }
  
  async function cleanup(): Promise<{ deleted: number; freed: number }> {
    const beforeStats = await storage.getStorageStats();
    let deleted = 0;
    
    // Delete old backups
    deleted += await deleteOldBackups();
    
    // Clean up old versions
    const allBackups = await storage.listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.maxAgeDays);
    
    for (const backup of allBackups) {
      if (backup.createdAt < cutoffDate && backup.reason === 'auto') {
        await storage.deleteBackup(backup.id);
        deleted++;
      }
    }
    
    const afterStats = await storage.getStorageStats();
    
    return {
      deleted,
      freed: beforeStats.used - afterStats.used,
    };
  }
  
  return {
    getConfig,
    updateConfig,
    startAutoBackup,
    stopAutoBackup,
    pauseAutoBackup,
    resumeAutoBackup,
    createBackup,
    listBackups,
    restoreBackup,
    deleteBackup,
    deleteOldBackups,
    createVersion,
    listVersions,
    restoreVersion,
    compareVersions,
    getStorageStats,
    cleanup,
  };
}
