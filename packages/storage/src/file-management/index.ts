/**
 * File Management Module
 * 
 * Provides file management capabilities for DAW projects including:
 * - Collect All and Save
 * - Find missing files
 * - File relocation
 * - Purge unused files
 * - Pack creation and installation
 */

export {
  createFileManager,
  getFileExtension,
  getFileType,
  isExternalPath,
  normalizePath,
  getRelativePath,
} from './FileManager.js';

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
} from './FileManager.js';
