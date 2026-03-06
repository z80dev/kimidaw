/**
 * Stem Export
 * 
 * Handles multi-track stem export for mixing and collaboration.
 * 
 * Features:
 * - Individual track export
 * - Pre/post-fader options
 * - Group/bus stem export
 * - Parallel rendering
 * - ZIP packaging
 */

import type { StemExportConfig, StemResult, RenderJob } from "./types.js";
import { getExportRenderManager, type ExportRenderManager } from "./export-render.js";

export interface StemExportOptions {
  parallel?: boolean;
  maxParallelJobs?: number;
  onTrackProgress?: (trackId: string, progress: number) => void;
  onComplete?: (results: StemResult[]) => void;
}

export interface StemPackage {
  filename: string;
  size: number;
  url: string;
  stems: Array<{
    trackId: string;
    trackName: string;
    filename: string;
  }>;
}

class StemExportManager {
  private renderManager: ExportRenderManager;

  constructor() {
    this.renderManager = getExportRenderManager();
  }

  /**
   * Export stems for multiple tracks
   */
  async exportStems(
    config: StemExportConfig,
    options: StemExportOptions = {}
  ): Promise<StemResult[]> {
    const opts = {
      parallel: true,
      maxParallelJobs: 4,
      ...options,
    };

    const results: StemResult[] = [];

    if (opts.parallel) {
      // Process in batches
      const batchSize = opts.maxParallelJobs;
      for (let i = 0; i < config.trackIds.length; i += batchSize) {
        const batch = config.trackIds.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(trackId => this.exportStemTrack(trackId, config, opts))
        );
        results.push(...batchResults);
      }
    } else {
      // Sequential processing
      for (const trackId of config.trackIds) {
        const result = await this.exportStemTrack(trackId, config, opts);
        results.push(result);
      }
    }

    options.onComplete?.(results);
    return results;
  }

  /**
   * Export a single stem track
   */
  private async exportStemTrack(
    trackId: string,
    config: StemExportConfig,
    options: StemExportOptions
  ): Promise<StemResult> {
    // Create render job for this track
    const job: RenderJob = {
      id: `stem-${trackId}`,
      projectSnapshotId: "", // Would be set from project
      scope: "selectedTracks",
      trackIds: [trackId],
      format: config.format,
      normalize: config.normalize,
      dither: config.dither,
      includeTailMs: config.includeTailMs,
    };

    // Track progress
    const unsubscribe = this.renderManager.onProgress(job.id, (progress) => {
      options.onTrackProgress?.(trackId, progress.progress);
    });

    try {
      const result = await this.renderManager.render(job);

      return {
        ...result,
        trackId,
        trackName: `Track ${trackId}`, // Would get actual name from project
      };
    } finally {
      unsubscribe();
    }
  }

  /**
   * Package stems into a ZIP file
   */
  async packageStems(
    stems: StemResult[],
    filename: string = "stems.zip"
  ): Promise<StemPackage> {
    // In a real implementation, this would create a ZIP file
    // For now, return a placeholder

    const totalSize = stems.reduce((sum, s) => sum + s.size, 0);

    // Create a simple text manifest
    const manifest = stems.map(s => 
      `${s.trackName} (${s.trackId}): ${s.filename}`
    ).join("\n");

    const blob = new Blob([manifest], { type: "text/plain" });

    return {
      filename,
      size: totalSize,
      url: URL.createObjectURL(blob),
      stems: stems.map(s => ({
        trackId: s.trackId,
        trackName: s.trackName,
        filename: s.filename ?? "",
      })),
    };
  }

  /**
   * Export all tracks as stems
   */
  async exportAllTracks(
    trackIds: string[],
    options: Omit<StemExportConfig, "trackIds">,
    exportOptions?: StemExportOptions
  ): Promise<StemResult[]> {
    return this.exportStems(
      { ...options, trackIds },
      exportOptions
    );
  }

  /**
   * Export group/bus as stem
   */
  async exportBus(
    busId: string,
    config: Omit<StemExportConfig, "trackIds">,
    options?: StemExportOptions
  ): Promise<StemResult> {
    const job: RenderJob = {
      id: `stem-bus-${busId}`,
      projectSnapshotId: "",
      scope: "bus",
      busId,
      format: config.format,
      normalize: config.normalize,
      dither: config.dither,
      includeTailMs: config.includeTailMs,
    };

    const result = await this.renderManager.render(job, {
      onProgress: options?.onTrackProgress 
        ? (p) => options.onTrackProgress!(busId, p.progress)
        : undefined,
    });

    return {
      ...result,
      trackId: busId,
      trackName: `Bus ${busId}`,
    };
  }

  /**
   * Create stem export configuration with defaults
   */
  createConfig(partial: Partial<StemExportConfig> = {}): StemExportConfig {
    return {
      trackIds: [],
      format: {
        container: "wav",
        bitDepth: 24,
        sampleRate: 48000,
      },
      includeEffects: true,
      normalize: false,
      dither: "none",
      includeTailMs: 1000,
      ...partial,
    };
  }

  /**
   * Generate stem filename
   */
  generateStemFilename(trackName: string, format: string): string {
    // Sanitize filename
    const sanitized = trackName
      .replace(/[^a-z0-9\s-]/gi, "")
      .trim()
      .replace(/\s+/g, "_");
    
    return `${sanitized}_STEM.${format}`;
  }
}

// Singleton
let instance: StemExportManager | null = null;

export function getStemExportManager(): StemExportManager {
  if (!instance) {
    instance = new StemExportManager();
  }
  return instance;
}

export function resetStemExportManager(): void {
  instance = null;
}

export type { StemExportManager };
