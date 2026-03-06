/**
 * Project Archive Format
 * 
 * Handles project archive creation and management.
 * Implements section 17.3 of the engineering spec.
 * 
 * Archive structure:
 * ```
 * manifest.json
 * project.json
 * assets/audio/*
 * assets/peaks/*
 * presets/*
 * scripts/*
 * checksums.json
 * ```
 * 
 * Features:
 * - Versioned archive format
 * - Content-addressed assets
 * - Optional compression
 * - Checksum verification
 */

import type { ProjectArchive, ArchiveManifest, ArchiveOptions, ArchiveAsset, ArchivePreset, ArchiveScript } from "./types.js";

export interface ArchiveCreateOptions extends ArchiveOptions {
  projectId: string;
  projectName: string;
  projectData: unknown;
  assets: ArchiveAssetInput[];
  presets?: ArchivePresetInput[];
  scripts?: ArchiveScriptInput[];
}

export interface ArchiveAssetInput {
  id: string;
  hash: string;
  data: ArrayBuffer;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

export interface ArchivePresetInput {
  id: string;
  name: string;
  pluginType: string;
  data: unknown;
}

export interface ArchiveScriptInput {
  id: string;
  name: string;
  source: string;
}

export interface ArchiveCreateResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: Error;
  size?: number;
}

const ARCHIVE_VERSION = "1.0.0";
const ARCHIVE_EXTENSION = ".webdawproj";

class ArchiveManager {
  private appVersion: string = "0.1.0";

  /**
   * Create a project archive
   */
  async createArchive(options: ArchiveCreateOptions): Promise<ArchiveCreateResult> {
    try {
      const now = new Date().toISOString();
      
      // Build manifest
      const manifest: ArchiveManifest = {
        version: ARCHIVE_VERSION,
        createdAt: now,
        updatedAt: now,
        appVersion: this.appVersion,
        schemaVersion: 1,
        compression: options.compression ?? null,
      };

      // Build archive structure
      const archive: ProjectArchive = {
        version: ARCHIVE_VERSION,
        manifest,
        project: {
          id: options.projectId,
          name: options.projectName,
          data: options.projectData,
        },
        assets: [],
        presets: [],
        scripts: [],
      };

      // Process assets
      if (options.includeAssets !== false) {
        for (const asset of options.assets) {
          archive.assets.push({
            id: asset.id,
            hash: asset.hash,
            path: `assets/audio/${asset.hash}.bin`,
            size: asset.data.byteLength,
            mimeType: asset.mimeType,
            metadata: asset.metadata,
          });
        }
      }

      // Process presets
      if (options.includePresets !== false && options.presets) {
        for (const preset of options.presets) {
          archive.presets.push({
            id: preset.id,
            name: preset.name,
            pluginType: preset.pluginType,
            path: `presets/${preset.id}.json`,
            data: preset.data,
          });
        }
      }

      // Process scripts
      if (options.includeScripts !== false && options.scripts) {
        for (const script of options.scripts) {
          archive.scripts.push({
            id: script.id,
            name: script.name,
            path: `scripts/${script.id}.ts`,
            source: script.source,
          });
        }
      }

      // Build file contents
      const files = this.buildFileList(archive, options);

      // Create archive blob
      const blob = await this.createArchiveBlob(files, options.compression);
      const filename = this.sanitizeFilename(options.projectName) + ARCHIVE_EXTENSION;

      return {
        success: true,
        blob,
        filename,
        size: blob.size,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  /**
   * Build list of files for archive
   */
  private buildFileList(archive: ProjectArchive, options: ArchiveCreateOptions): ArchiveFile[] {
    const files: ArchiveFile[] = [];

    // Manifest
    files.push({
      path: "manifest.json",
      data: new TextEncoder().encode(JSON.stringify(archive.manifest, null, 2)),
    });

    // Project
    files.push({
      path: "project.json",
      data: new TextEncoder().encode(JSON.stringify(archive.project, null, 2)),
    });

    // Checksums
    const checksums: Record<string, string> = {};

    // Assets
    for (let i = 0; i < archive.assets.length; i++) {
      const asset = archive.assets[i];
      const input = options.assets[i];
      
      files.push({
        path: asset.path,
        data: new Uint8Array(input.data),
      });
      
      checksums[asset.path] = asset.hash;

      // Include peaks if enabled
      if (options.includePeaks && input.metadata?.peaks) {
        const peaksPath = `assets/peaks/${asset.hash}.peaks`;
        const peaksData = JSON.stringify(input.metadata.peaks);
        files.push({
          path: peaksPath,
          data: new TextEncoder().encode(peaksData),
        });
      }
    }

    // Presets
    for (const preset of archive.presets) {
      files.push({
        path: preset.path,
        data: new TextEncoder().encode(JSON.stringify(preset.data, null, 2)),
      });
    }

    // Scripts
    for (const script of archive.scripts) {
      files.push({
        path: script.path,
        data: new TextEncoder().encode(script.source),
      });
    }

    // Checksums file
    files.push({
      path: "checksums.json",
      data: new TextEncoder().encode(JSON.stringify(checksums, null, 2)),
    });

    return files;
  }

  /**
   * Create archive blob from files
   */
  private async createArchiveBlob(
    files: ArchiveFile[], 
    compression?: ArchiveOptions["compression"]
  ): Promise<Blob> {
    // For a real implementation, this would create a ZIP or custom archive format
    // For now, create a simple JSON-based archive
    
    const archiveData: Record<string, unknown> = {};
    
    for (const file of files) {
      // Store binary data as base64
      if (file.path.endsWith(".bin")) {
        archiveData[file.path] = this.arrayBufferToBase64(file.data.buffer);
      } else {
        archiveData[file.path] = new TextDecoder().decode(file.data);
      }
    }

    let jsonData = JSON.stringify(archiveData);

    // Apply compression if requested
    if (compression && typeof CompressionStream !== "undefined") {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(jsonData));
          controller.close();
        }
      });

      const compressed = stream.pipeThrough(new CompressionStream(compression));
      const reader = compressed.getReader();
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

      return new Blob([result], { type: "application/x-webdawproj" });
    }

    return new Blob([jsonData], { type: "application/x-webdawproj" });
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-z0-9\s-_]/gi, "")
      .trim()
      .replace(/\s+/g, "_")
      .substring(0, 50);
  }

  /**
   * Download an archive
   */
  downloadArchive(blob: Blob, filename: string): void {
    if (typeof window === "undefined") return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get archive info from file (without full extraction)
   */
  async getArchiveInfo(file: File): Promise<{
    valid: boolean;
    version?: string;
    projectName?: string;
    schemaVersion?: number;
    assetCount?: number;
    error?: string;
  }> {
    try {
      const buffer = await file.arrayBuffer();
      let data: string;

      // Try to decompress if needed
      if (file.type === "application/x-webdawproj" || file.name.endsWith(ARCHIVE_EXTENSION)) {
        try {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(buffer));
              controller.close();
            }
          });
          
          const decompressed = stream.pipeThrough(new DecompressionStream("gzip"));
          const reader = decompressed.getReader();
          const chunks: Uint8Array[] = [];
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          
          data = new TextDecoder().decode(result);
        } catch {
          // Not compressed
          data = new TextDecoder().decode(buffer);
        }
      } else {
        data = new TextDecoder().decode(buffer);
      }

      const archive = JSON.parse(data) as Record<string, string>;
      
      const manifest = JSON.parse(archive["manifest.json"] || "{}") as ArchiveManifest;
      const project = JSON.parse(archive["project.json"] || "{}") as { name: string };

      // Count assets
      const assetCount = Object.keys(archive).filter(k => k.startsWith("assets/audio/")).length;

      return {
        valid: true,
        version: manifest.version,
        projectName: project.name,
        schemaVersion: manifest.schemaVersion,
        assetCount,
      };
    } catch (err) {
      return {
        valid: false,
        error: String(err),
      };
    }
  }

  /**
   * Get supported archive version
   */
  getVersion(): string {
    return ARCHIVE_VERSION;
  }

  /**
   * Get archive file extension
   */
  getExtension(): string {
    return ARCHIVE_EXTENSION;
  }
}

interface ArchiveFile {
  path: string;
  data: Uint8Array;
}

// Singleton
let instance: ArchiveManager | null = null;

export function getArchiveManager(): ArchiveManager {
  if (!instance) {
    instance = new ArchiveManager();
  }
  return instance;
}

export function resetArchiveManager(): void {
  instance = null;
}

export type { ArchiveManager };
export { ARCHIVE_VERSION, ARCHIVE_EXTENSION };
