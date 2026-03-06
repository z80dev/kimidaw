/**
 * File Management System
 * 
 * Manages project files including external assets, missing file detection,
 * file relocation, and project cleanup operations.
 */

import type { AssetMetadata } from '../asset-store.js';

// ============================================================================
// Types
// ============================================================================

export interface ProjectFile {
  id: string;
  path: string;
  originalPath?: string;
  name: string;
  size: number;
  type: 'audio' | 'midi' | 'preset' | 'script' | 'video' | 'other';
  status: 'available' | 'missing' | 'external' | 'unused';
  lastModified: Date;
  usedBy: string[]; // IDs of clips/devices that use this file
  metadata?: Partial<AssetMetadata>;
}

export interface FileCollection {
  audioFiles: ProjectFile[];
  midiFiles: ProjectFile[];
  presets: ProjectFile[];
  scripts: ProjectFile[];
  videos: ProjectFile[];
  other: ProjectFile[];
  missing: ProjectFile[];
  external: ProjectFile[];
  unused: ProjectFile[];
}

export interface CollectAndSaveOptions {
  includeUnused: boolean;
  organizeByType: boolean;
  createBackup: boolean;
  updateReferences: boolean;
}

export interface CollectResult {
  success: boolean;
  copied: ProjectFile[];
  failed: Array<{ file: ProjectFile; error: string }>;
  skipped: ProjectFile[];
  newProjectPath: string;
}

export interface MissingFileSearch {
  searchPaths: string[];
  searchSubdirectories: boolean;
  matchByName: boolean;
  matchBySize: boolean;
  matchByHash: boolean;
}

export interface FileRelocation {
  oldPath: string;
  newPath: string;
  updateReferences: boolean;
}

export interface PackCreationOptions {
  name: string;
  description?: string;
  author?: string;
  version?: string;
  includeUnused?: boolean;
  compression?: 'none' | 'gzip';
  icon?: Blob;
}

export interface PackMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  createdAt: Date;
  fileCount: number;
  totalSize: number;
}

// ============================================================================
// File Manager
// ============================================================================

export interface FileManager {
  // File discovery and listing
  scanProject(projectId: string): Promise<FileCollection>;
  getFileInfo(fileId: string): Promise<ProjectFile | null>;
  
  // Missing file handling
  findMissingFiles(projectId: string): Promise<ProjectFile[]>;
  searchForMissing(
    missingFiles: ProjectFile[],
    searchConfig: MissingFileSearch
  ): Promise<Map<string, string>>; // fileId -> foundPath
  
  // File relocation
  relocateFile(relocation: FileRelocation): Promise<boolean>;
  relocateFiles(relocations: FileRelocation[]): Promise<Map<string, boolean>>;
  
  // Collect and save
  collectAndSave(
    projectId: string,
    destinationPath: string,
    options?: Partial<CollectAndSaveOptions>
  ): Promise<CollectResult>;
  
  // File cleanup
  findUnusedFiles(projectId: string): Promise<ProjectFile[]>;
  purgeUnusedFiles(projectId: string, fileIds?: string[]): Promise<number>; // count deleted
  
  // Pack management
  createPack(
    projectId: string,
    options: PackCreationOptions
  ): Promise<Blob>;
  installPack(packBlob: Blob): Promise<PackMetadata>;
}

export function createFileManager(
  storage: {
    readFile: (path: string) => Promise<Uint8Array>;
    writeFile: (path: string, data: Uint8Array) => Promise<void>;
    listFiles: (directory: string) => Promise<string[]>;
    exists: (path: string) => Promise<boolean>;
    delete: (path: string) => Promise<void>;
    stat: (path: string) => Promise<{ size: number; mtime: Date }>;
  }
): FileManager {
  const projectFiles = new Map<string, Map<string, ProjectFile>>();
  
  async function scanProject(projectId: string): Promise<FileCollection> {
    const files = new Map<string, ProjectFile>();
    
    // In a real implementation, this would scan the project's file references
    // and check which files exist
    
    const collection: FileCollection = {
      audioFiles: [],
      midiFiles: [],
      presets: [],
      scripts: [],
      videos: [],
      other: [],
      missing: [],
      external: [],
      unused: [],
    };
    
    for (const file of files.values()) {
      // Categorize by type
      switch (file.type) {
        case 'audio':
          collection.audioFiles.push(file);
          break;
        case 'midi':
          collection.midiFiles.push(file);
          break;
        case 'preset':
          collection.presets.push(file);
          break;
        case 'script':
          collection.scripts.push(file);
          break;
        case 'video':
          collection.videos.push(file);
          break;
        default:
          collection.other.push(file);
      }
      
      // Categorize by status
      if (file.status === 'missing') {
        collection.missing.push(file);
      } else if (file.status === 'external') {
        collection.external.push(file);
      } else if (file.status === 'unused') {
        collection.unused.push(file);
      }
    }
    
    projectFiles.set(projectId, files);
    return collection;
  }
  
  async function getFileInfo(fileId: string): Promise<ProjectFile | null> {
    for (const projectFilesMap of projectFiles.values()) {
      const file = projectFilesMap.get(fileId);
      if (file) return file;
    }
    return null;
  }
  
  async function findMissingFiles(projectId: string): Promise<ProjectFile[]> {
    const collection = await scanProject(projectId);
    return collection.missing;
  }
  
  async function searchForMissing(
    missingFiles: ProjectFile[],
    searchConfig: MissingFileSearch
  ): Promise<Map<string, string>> {
    const found = new Map<string, string>();
    
    for (const searchPath of searchConfig.searchPaths) {
      try {
        const files = await storage.listFiles(searchPath);
        
        for (const missingFile of missingFiles) {
          if (found.has(missingFile.id)) continue;
          
          // Search for matching files
          for (const fileName of files) {
            const fullPath = `${searchPath}/${fileName}`;
            
            // Match by name
            if (searchConfig.matchByName) {
              if (fileName === missingFile.name || 
                  fileName.includes(missingFile.name.replace(/\.[^.]+$/, ''))) {
                found.set(missingFile.id, fullPath);
                break;
              }
            }
            
            // Match by size (if we have the original size)
            if (searchConfig.matchBySize && missingFile.size > 0) {
              try {
                const stats = await storage.stat(fullPath);
                if (stats.size === missingFile.size) {
                  found.set(missingFile.id, fullPath);
                  break;
                }
              } catch {
                // File might not exist
              }
            }
            
            // Match by hash would require reading the file
            // This is more expensive, so done last
          }
        }
      } catch {
        // Directory might not exist
      }
    }
    
    return found;
  }
  
  async function relocateFile(relocation: FileRelocation): Promise<boolean> {
    try {
      // Update file reference in project
      // In a real implementation, this would update the project data
      return true;
    } catch {
      return false;
    }
  }
  
  async function relocateFiles(
    relocations: FileRelocation[]
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const relocation of relocations) {
      const success = await relocateFile(relocation);
      results.set(relocation.oldPath, success);
    }
    
    return results;
  }
  
  async function collectAndSave(
    projectId: string,
    destinationPath: string,
    options: Partial<CollectAndSaveOptions> = {}
  ): Promise<CollectResult> {
    const opts: CollectAndSaveOptions = {
      includeUnused: false,
      organizeByType: true,
      createBackup: true,
      updateReferences: true,
      ...options,
    };
    
    const result: CollectResult = {
      success: true,
      copied: [],
      failed: [],
      skipped: [],
      newProjectPath: destinationPath,
    };
    
    const collection = await scanProject(projectId);
    const allFiles = [
      ...collection.audioFiles,
      ...collection.midiFiles,
      ...collection.presets,
      ...collection.scripts,
    ];
    
    // Create subdirectories if organizing by type
    const getTargetPath = (file: ProjectFile): string => {
      if (!opts.organizeByType) {
        return `${destinationPath}/${file.name}`;
      }
      
      const typeDir = file.type === 'audio' ? 'Samples' :
                      file.type === 'midi' ? 'MIDI' :
                      file.type === 'preset' ? 'Presets' :
                      file.type === 'script' ? 'Scripts' : 'Other';
      
      return `${destinationPath}/${typeDir}/${file.name}`;
    };
    
    for (const file of allFiles) {
      // Skip external files that don't need copying
      if (file.status === 'external' && !file.originalPath?.startsWith('http')) {
        result.skipped.push(file);
        continue;
      }
      
      // Skip unused files if not including them
      if (file.status === 'unused' && !opts.includeUnused) {
        result.skipped.push(file);
        continue;
      }
      
      // Skip missing files
      if (file.status === 'missing') {
        result.failed.push({ file, error: 'File is missing' });
        continue;
      }
      
      try {
        // Read source file
        const data = await storage.readFile(file.path);
        
        // Write to destination
        const targetPath = getTargetPath(file);
        await storage.writeFile(targetPath, data);
        
        result.copied.push(file);
        
        // Update reference if requested
        if (opts.updateReferences) {
          await relocateFile({
            oldPath: file.path,
            newPath: targetPath,
            updateReferences: true,
          });
        }
      } catch (error) {
        result.failed.push({
          file,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    result.success = result.failed.length === 0;
    return result;
  }
  
  async function findUnusedFiles(projectId: string): Promise<ProjectFile[]> {
    const collection = await scanProject(projectId);
    return collection.unused;
  }
  
  async function purgeUnusedFiles(
    projectId: string,
    fileIds?: string[]
  ): Promise<number> {
    const collection = await scanProject(projectId);
    const filesToDelete = fileIds
      ? collection.unused.filter(f => fileIds.includes(f.id))
      : collection.unused;
    
    let deletedCount = 0;
    
    for (const file of filesToDelete) {
      try {
        await storage.delete(file.path);
        deletedCount++;
        
        // Remove from tracking
        const projectFilesMap = projectFiles.get(projectId);
        if (projectFilesMap) {
          projectFilesMap.delete(file.id);
        }
      } catch {
        // File might already be gone
      }
    }
    
    return deletedCount;
  }
  
  async function createPack(
    projectId: string,
    options: PackCreationOptions
  ): Promise<Blob> {
    const collection = await scanProject(projectId);
    
    // Create pack manifest
    const manifest = {
      id: `pack-${Date.now()}`,
      name: options.name,
      description: options.description || '',
      author: options.author || 'Unknown',
      version: options.version || '1.0.0',
      createdAt: new Date().toISOString(),
      schema: {
        audioFiles: collection.audioFiles.map(f => ({ id: f.id, path: f.path })),
        midiFiles: collection.midiFiles.map(f => ({ id: f.id, path: f.path })),
        presets: collection.presets.map(f => ({ id: f.id, path: f.path })),
        scripts: collection.scripts.map(f => ({ id: f.id, path: f.path })),
      },
    };
    
    // Build pack archive
    const packFiles: Array<{ path: string; data: Uint8Array }> = [];
    
    // Add manifest
    packFiles.push({
      path: 'manifest.json',
      data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
    });
    
    // Add all files
    const allFiles = [
      ...collection.audioFiles,
      ...collection.midiFiles,
      ...collection.presets,
      ...collection.scripts,
    ];
    
    if (!options.includeUnused) {
      // Filter out unused files
      const unusedIds = new Set(collection.unused.map(f => f.id));
      const filteredFiles = allFiles.filter(f => !unusedIds.has(f.id));
      // Continue with filtered files
    }
    
    for (const file of allFiles) {
      if (file.status === 'missing') continue;
      
      try {
        const data = await storage.readFile(file.path);
        packFiles.push({
          path: `files/${file.type}/${file.name}`,
          data,
        });
      } catch {
        // Skip files that can't be read
      }
    }
    
    // Create ZIP-like archive (simplified - would use proper ZIP library)
    return createSimpleArchive(packFiles);
  }
  
  async function installPack(packBlob: Blob): Promise<PackMetadata> {
    // Extract and read manifest
    const arrayBuffer = await packBlob.arrayBuffer();
    
    // This is a simplified implementation
    // Real implementation would use a proper ZIP library
    const text = new TextDecoder().decode(arrayBuffer.slice(0, 1000));
    const manifestMatch = text.match(/manifest\.json.{4}(\{[^}]+\})/);
    
    if (!manifestMatch) {
      throw new Error('Invalid pack: manifest not found');
    }
    
    const manifest = JSON.parse(manifestMatch[1]);
    
    return {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      author: manifest.author,
      version: manifest.version,
      createdAt: new Date(manifest.createdAt),
      fileCount: manifest.schema.audioFiles.length +
                 manifest.schema.midiFiles.length +
                 manifest.schema.presets.length +
                 manifest.schema.scripts.length,
      totalSize: arrayBuffer.byteLength,
    };
  }
  
  function createSimpleArchive(files: Array<{ path: string; data: Uint8Array }>): Blob {
    // Simplified archive creation
    // Real implementation would use a proper ZIP library
    const parts: Uint8Array[] = [];
    
    for (const file of files) {
      const header = new TextEncoder().encode(
        `FILE:${file.path}:${file.data.length}\n`
      );
      parts.push(header);
      parts.push(file.data);
    }
    
    // Calculate total size
    const totalSize = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(totalSize);
    
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    
    return new Blob([result], { type: 'application/x-daw-pack' });
  }
  
  return {
    scanProject,
    getFileInfo,
    findMissingFiles,
    searchForMissing,
    relocateFile,
    relocateFiles,
    collectAndSave,
    findUnusedFiles,
    purgeUnusedFiles,
    createPack,
    installPack,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

export function getFileType(extension: string): ProjectFile['type'] {
  const audioExts = ['wav', 'aif', 'aiff', 'mp3', 'ogg', 'flac', 'm4a', 'wma'];
  const midiExts = ['mid', 'midi'];
  const presetExts = ['adg', 'adv', 'fxp', 'fxb'];
  const scriptExts = ['js', 'ts', 'py'];
  const videoExts = ['mp4', 'mov', 'avi', 'mkv'];
  
  if (audioExts.includes(extension)) return 'audio';
  if (midiExts.includes(extension)) return 'midi';
  if (presetExts.includes(extension)) return 'preset';
  if (scriptExts.includes(extension)) return 'script';
  if (videoExts.includes(extension)) return 'video';
  
  return 'other';
}

export function isExternalPath(path: string): boolean {
  return path.startsWith('http://') || 
         path.startsWith('https://') || 
         path.startsWith('//');
}

export function normalizePath(path: string): string {
  // Remove redundant slashes and normalize separators
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

export function getRelativePath(from: string, to: string): string {
  const fromParts = normalizePath(from).split('/').filter(Boolean);
  const toParts = normalizePath(to).split('/').filter(Boolean);
  
  // Find common prefix
  let commonLength = 0;
  while (commonLength < fromParts.length - 1 && 
         commonLength < toParts.length &&
         fromParts[commonLength] === toParts[commonLength]) {
    commonLength++;
  }
  
  // Build relative path
  const upCount = fromParts.length - commonLength - 1;
  const relativeParts = [
    ...Array(upCount).fill('..'),
    ...toParts.slice(commonLength),
  ];
  
  return relativeParts.join('/');
}
