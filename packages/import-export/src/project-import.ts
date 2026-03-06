/**
 * Project Import Pipeline
 * 
 * Handles project archive import (.webdawproj files).
 * Implements section 17.3 of the engineering spec.
 * 
 * Features:
 * - Archive extraction
 * - Manifest validation
 * - Asset import
 * - Project migration
 * - Checksum verification
 */

import type { ProjectArchive, ArchiveManifest, ArchiveAsset, ArchiveOptions } from "./types.js";

export interface ProjectImportOptions extends ArchiveOptions {
  skipChecksums?: boolean;
  onProgress?: (progress: number) => void;
}

export interface ProjectImportResult {
  success: boolean;
  projectId?: string;
  projectData?: unknown;
  importedAssets: string[];
  errors: string[];
  warnings: string[];
}

class ProjectImportManager {
  private options: ProjectImportOptions;

  constructor(options: ProjectImportOptions = {}) {
    this.options = {
      includeAssets: true,
      includePeaks: true,
      includePresets: true,
      includeScripts: true,
      skipChecksums: false,
      ...options,
    };
  }

  /**
   * Import a project archive file
   */
  async importProject(file: File): Promise<ProjectImportResult> {
    const result: ProjectImportResult = {
      success: false,
      importedAssets: [],
      errors: [],
      warnings: [],
    };

    try {
      // Extract archive
      const archive = await this.extractArchive(file);

      // Validate manifest
      const validation = this.validateManifest(archive.manifest);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }

      // Verify checksums
      if (!this.options.skipChecksums) {
        const checksumResult = await this.verifyChecksums(archive);
        if (!checksumResult.valid) {
          result.warnings.push(...checksumResult.warnings);
        }
      }

      // Migrate project if needed
      const migratedProject = this.migrateProject(archive.project, archive.manifest.schemaVersion);

      // Import assets
      if (this.options.includeAssets) {
        for (const asset of archive.assets) {
          try {
            await this.importAsset(asset);
            result.importedAssets.push(asset.id);
          } catch (err) {
            result.errors.push(`Failed to import asset ${asset.id}: ${err}`);
          }
        }
      }

      result.success = true;
      result.projectId = archive.project.id;
      result.projectData = migratedProject;

      return result;
    } catch (err) {
      result.errors.push(`Import failed: ${err}`);
      return result;
    }
  }

  /**
   * Extract project archive
   */
  private async extractArchive(file: File): Promise<ProjectArchive> {
    if (file.name.endsWith(".webdawproj")) {
      return this.extractZipArchive(file);
    } else {
      throw new Error("Unsupported archive format. Expected .webdawproj");
    }
  }

  /**
   * Extract ZIP archive
   */
  private async extractZipArchive(file: File): Promise<ProjectArchive> {
    // Use native DecompressionStream if available
    if (typeof DecompressionStream !== "undefined") {
      return this.extractWithNative(file);
    }

    // Fallback to JSZip or similar would go here
    throw new Error("ZIP decompression not available in this environment");
  }

  /**
   * Extract using native DecompressionStream
   */
  private async extractWithNative(file: File): Promise<ProjectArchive> {
    // This is a simplified implementation
    // Real implementation would need proper ZIP parsing
    
    const buffer = await file.arrayBuffer();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(buffer));
        controller.close();
      }
    });

    // Decompress if needed
    let data: ArrayBuffer;
    
    try {
      const decompressed = stream.pipeThrough(new DecompressionStream("gzip"));
      const reader = decompressed.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      // Concatenate chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      data = result.buffer;
    } catch {
      // Not compressed
      data = buffer;
    }

    // Parse JSON structure (simplified - real implementation needs ZIP parsing)
    const text = new TextDecoder().decode(new Uint8Array(data));
    
    // For this implementation, we assume a simple JSON structure
    // Real implementation would parse ZIP file structure
    return JSON.parse(text) as ProjectArchive;
  }

  /**
   * Validate archive manifest
   */
  private validateManifest(manifest: ArchiveManifest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!manifest.version) {
      errors.push("Missing manifest version");
    }

    if (!manifest.schemaVersion) {
      errors.push("Missing schema version");
    }

    if (!manifest.createdAt) {
      errors.push("Missing creation date");
    }

    // Check minimum supported schema version
    const MIN_SCHEMA_VERSION = 1;
    if (manifest.schemaVersion < MIN_SCHEMA_VERSION) {
      errors.push(`Schema version ${manifest.schemaVersion} is not supported (minimum: ${MIN_SCHEMA_VERSION})`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Verify checksums
   */
  private async verifyChecksums(archive: ProjectArchive): Promise<{ valid: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    
    // In a real implementation, this would verify each asset against checksums.json
    // For now, we just check if assets have the expected hash format
    
    for (const asset of archive.assets) {
      if (!asset.hash || asset.hash.length !== 64) {
        warnings.push(`Asset ${asset.id} has invalid hash format`);
      }
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Migrate project to current schema version
   */
  private migrateProject(projectData: ProjectData, fromSchemaVersion: number): unknown {
    const CURRENT_SCHEMA_VERSION = 1;
    
    if (fromSchemaVersion >= CURRENT_SCHEMA_VERSION) {
      return projectData.data;
    }

    // Apply migrations
    let migrated = projectData.data;

    // Migration from v0 to v1
    if (fromSchemaVersion < 1) {
      migrated = this.migrateV0ToV1(migrated);
    }

    return migrated;
  }

  /**
   * Migration from schema v0 to v1
   */
  private migrateV0ToV1(data: unknown): unknown {
    // Add any necessary field transformations
    // This is a placeholder for actual migration logic
    return data;
  }

  /**
   * Import a single asset
   */
  private async importAsset(asset: ArchiveAsset): Promise<void> {
    // In a real implementation, this would:
    // 1. Fetch the asset data from the archive
    // 2. Verify the hash
    // 3. Store in OPFS
    // 4. Update asset index
    
    // Placeholder implementation
    console.log(`Importing asset: ${asset.id}`);
  }

  /**
   * Peek at project info without full import
   */
  async peekProject(file: File): Promise<{ 
    name: string; 
    schemaVersion: number;
    assetCount: number;
    createdAt: string;
  } | null> {
    try {
      const archive = await this.extractArchive(file);
      
      return {
        name: archive.project.name,
        schemaVersion: archive.manifest.schemaVersion,
        assetCount: archive.assets.length,
        createdAt: archive.manifest.createdAt,
      };
    } catch {
      return null;
    }
  }
}

interface ProjectData {
  id: string;
  name: string;
  data: unknown;
}

// Singleton
let instance: ProjectImportManager | null = null;

export function getProjectImportManager(options?: ProjectImportOptions): ProjectImportManager {
  if (!instance) {
    instance = new ProjectImportManager(options);
  }
  return instance;
}

export function resetProjectImportManager(): void {
  instance = null;
}

export type { ProjectImportManager };
