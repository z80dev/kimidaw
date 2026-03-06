/**
 * @daw/storage
 * 
 * Storage layer for the In-Browser DAW.
 * 
 * This package provides:
 * - OPFS (Origin Private File System) repository for large files
 * - IndexedDB wrapper for metadata and indices
 * - Project persistence with event sourcing
 * - Content-addressed asset storage
 * - Command journal for undo/redo
 * - Schema migration system
 */

// ==================== OPFS ====================
export {
  // Types
  type OpfsFileInfo,
  type WriteOptions,
  
  // Errors
  OpfsError,
  OpfsNotFoundError,
  OpfsExistsError,
  
  // Main class
  OpfsRepository,
  
  // Functions
  isOpfsSupported,
  isOpfsSyncSupported,
  getOpfsRepository,
  formatBytes,
  getContentPath,
} from './opfs.js';

// ==================== IndexedDB ====================
export {
  // Constants
  STORE_NAMES,
  
  // Types
  type ProjectMetadata,
  type RecentProject,
  type AssetIndexEntry,
  type WaveformIndexEntry,
  type PresetIndexEntry,
  type ScriptCacheEntry,
  type CapabilityState,
  type DiagnosticsEntry,
  type MigrationRecord,
  
  // Errors
  IndexedDBError,
  
  // Main class
  IndexedDBRepository,
  
  // Functions
  isIndexedDBSupported,
  getIndexedDBRepository,
  deleteDatabase,
} from './indexeddb.js';

// ==================== Project Store ====================
export {
  // Types
  type ProjectManifest,
  type ProjectStats,
  type StorageMode,
  
  // Errors
  ProjectStoreError,
  
  // Main class
  ProjectStore,
  
  // Functions
  getProjectStore,
} from './project-store.js';

// ==================== Asset Store ====================
export {
  // Types
  type AssetMetadata,
  type AssetImportResult,
  type AssetStoreStats,
  
  // Errors
  AssetStoreError,
  
  // Main class
  AssetStore,
  
  // Functions
  getAssetStore,
  generateAssetId,
  estimateProjectStorage,
} from './asset-store.js';

// ==================== Command Journal ====================
export {
  // Constants
  DEFAULT_JOURNAL_CONFIG,
  
  // Types
  type JournalConfig,
  type JournalState,
  type SnapshotInfo,
  
  // Errors
  JournalError,
  
  // Main class
  CommandJournal,
  
  // Functions
  getCommandJournal,
  formatJournalEntry,
  groupByBatch,
  validateJournal,
  replayJournal,
} from './journal.js';

// ==================== Migrations ====================
export {
  // Types
  type MigrationFn,
  type Migration,
  type MigrationContext,
  type MigrationResult,
  
  // Errors
  MigrationError,
  
  // Classes
  MigrationRegistry,
  MigrationRunner,
  
  // Functions
  getMigrationRegistry,
  getMigrationRunner,
  createMigration,
  validateProjectBeforeMigration,
  safeMigrate,
} from './migrations.js';

// ==================== File Management ====================
export {
  // Functions
  createFileManager,
  getFileExtension,
  getFileType,
  isExternalPath,
  normalizePath,
  getRelativePath,
} from './file-management/index.js';

export type {
  ProjectFile,
  FileCollection,
  CollectAndSaveOptions,
  CollectResult,
  MissingFileSearch,
  FileRelocation,
  PackCreationOptions,
  PackMetadata,
  FileManager,
} from './file-management/index.js';

// ==================== Project Management ====================
export {
  // Template Management
  createTemplateManager,
  BUILT_IN_TEMPLATES,
  
  // Backup Management
  createBackupManager,
  DEFAULT_BACKUP_CONFIG,
  
  // Project Info
  createProjectInfoManager,
} from './project-management/index.js';

export type {
  // Templates
  ProjectTemplate,
  TemplateCategory,
  ProjectTemplateData,
  TemplateTrack,
  TemplateReturnTrack,
  TemplateMasterTrack,
  TemplateDevice,
  TemplateScene,
  RecentProject,
  TemplateManagerOptions,
  TemplateStorage,
  TemplateManager,
  
  // Backups
  ProjectBackup,
  BackupConfig,
  ProjectVersion,
  BackupManagerOptions,
  BackupStorage,
  BackupManager,
  
  // Project Info
  ProjectInfo,
  ProjectStats,
  ProjectHealth,
  ProjectIssue,
  ProjectSuggestion,
  ProjectInfoManager,
} from './project-management/index.js';
