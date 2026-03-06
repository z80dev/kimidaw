/**
 * Project Management Module
 * 
 * Provides project template management, backup/version control,
 * and project information/statistics.
 */

// Template Management
export {
  createTemplateManager,
  BUILT_IN_TEMPLATES,
} from './TemplateManager.js';

export type {
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
} from './TemplateManager.js';

// Backup Management
export {
  createBackupManager,
  DEFAULT_BACKUP_CONFIG,
} from './BackupManager.js';

export type {
  ProjectBackup,
  BackupConfig,
  ProjectVersion,
  BackupManagerOptions,
  BackupStorage,
  BackupManager,
} from './BackupManager.js';

// Project Info
export {
  createProjectInfoManager,
} from './ProjectInfo.js';

export type {
  ProjectInfo,
  ProjectStats,
  ProjectHealth,
  ProjectIssue,
  ProjectSuggestion,
  ProjectInfoManager,
} from './ProjectInfo.js';
