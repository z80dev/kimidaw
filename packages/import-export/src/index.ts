/**
 * @daw/import-export - Import/Export Functionality
 * 
 * Comprehensive import/export package for the In-Browser DAW.
 * Handles audio/MIDI import, offline rendering, stem export, and project archives.
 * 
 * @example
 * ```typescript
 * import { 
 *   getAudioImportManager,
 *   getExportRenderManager,
 *   getArchiveManager 
 * } from "@daw/import-export";
 * 
 * // Import audio file
 * const audioImport = getAudioImportManager();
 * const result = await audioImport.importAudio(file, jobId);
 * 
 * // Render project
 * const renderer = getExportRenderManager();
 * const job = renderer.createJob({
 *   scope: "master",
 *   format: { container: "wav", sampleRate: 48000 },
 *   normalize: true,
 *   dither: "triangular",
 *   includeTailMs: 1000,
 *   projectSnapshotId: "snapshot-123"
 * });
 * const renderResult = await renderer.render(job);
 * 
 * // Create project archive
 * const archive = getArchiveManager();
 * const archiveResult = await archive.createArchive({
 *   projectId: "proj-123",
 *   projectName: "My Song",
 *   projectData: projectJson,
 *   assets: [...]
 * });
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Import
  ImportJob,
  ImportResult,
  ImportStatus,
  AudioMetadata,
  MidiMetadata,
  PeakData,
  PeakLevel,
  TransientHint,
  TempoEvent,
  TimeSignatureEvent,
  
  // Export/Render
  RenderJob,
  RenderProgress,
  RenderStatus,
  RenderResult,
  StemExportConfig,
  StemResult,
  
  // Archive
  ProjectArchive,
  ArchiveManifest,
  ArchiveAsset,
  ArchivePreset,
  ArchiveScript,
  ArchiveOptions,
  
  // Worker
  WorkerMessage,
  WorkerMessageType,
  
  // Event Handlers
  ImportProgressHandler,
  RenderProgressHandler,
  ImportCompleteHandler,
  RenderCompleteHandler,
  ErrorHandler,
} from "./types.js";

// ============================================================================
// Audio Import
// ============================================================================

export {
  getAudioImportManager,
  resetAudioImportManager,
  type AudioImportManager,
  type AudioImportOptions,
} from "./audio-import.js";

// ============================================================================
// MIDI Import
// ============================================================================

export {
  getMidiImportManager,
  resetMidiImportManager,
  type MidiImportManager,
  type MidiImportOptions,
  type MidiClipData,
} from "./midi-import.js";

// ============================================================================
// Project Import
// ============================================================================

export {
  getProjectImportManager,
  resetProjectImportManager,
  type ProjectImportManager,
  type ProjectImportOptions,
  type ProjectImportResult,
} from "./project-import.js";

// ============================================================================
// Export/Render
// ============================================================================

export {
  getExportRenderManager,
  resetExportRenderManager,
  type ExportRenderManager,
  type RenderOptions,
} from "./export-render.js";

// ============================================================================
// Stem Export
// ============================================================================

export {
  getStemExportManager,
  resetStemExportManager,
  type StemExportManager,
  type StemExportOptions,
  type StemPackage,
} from "./stem-export.js";

// ============================================================================
// Archive
// ============================================================================

export {
  getArchiveManager,
  resetArchiveManager,
  type ArchiveManager,
  type ArchiveCreateOptions,
  type ArchiveCreateResult,
  type ArchiveAssetInput,
  type ArchivePresetInput,
  type ArchiveScriptInput,
  ARCHIVE_VERSION,
  ARCHIVE_EXTENSION,
} from "./archive.js";

// ============================================================================
// Worker Utils
// ============================================================================

/**
 * Create an import worker
 */
export function createImportWorker(): Worker {
  // In a real build, this would point to the compiled worker
  return new Worker(new URL("./workers/import.worker.js", import.meta.url), {
    type: "module",
  });
}

/**
 * Create a render worker
 */
export function createRenderWorker(): Worker {
  return new Worker(new URL("./workers/render.worker.js", import.meta.url), {
    type: "module",
  });
}

// ============================================================================
// Convenience Combined Manager
// ============================================================================

import { getAudioImportManager } from "./audio-import.js";
import { getMidiImportManager } from "./midi-import.js";
import { getProjectImportManager } from "./project-import.js";
import { getExportRenderManager } from "./export-render.js";
import { getStemExportManager } from "./stem-export.js";
import { getArchiveManager } from "./archive.js";

export interface ImportExportManager {
  audioImport: ReturnType<typeof getAudioImportManager>;
  midiImport: ReturnType<typeof getMidiImportManager>;
  projectImport: ReturnType<typeof getProjectImportManager>;
  render: ReturnType<typeof getExportRenderManager>;
  stemExport: ReturnType<typeof getStemExportManager>;
  archive: ReturnType<typeof getArchiveManager>;
}

/**
 * Get all import/export managers in one call
 */
export function getImportExportManager(): ImportExportManager {
  return {
    audioImport: getAudioImportManager(),
    midiImport: getMidiImportManager(),
    projectImport: getProjectImportManager(),
    render: getExportRenderManager(),
    stemExport: getStemExportManager(),
    archive: getArchiveManager(),
  };
}

/**
 * Reset all import/export managers
 */
export function resetImportExportManager(): void {
  resetAudioImportManager();
  resetMidiImportManager();
  resetProjectImportManager();
  resetExportRenderManager();
  resetStemExportManager();
  resetArchiveManager();
}

// ============================================================================
// Enhanced Export (Wave 7)
// ============================================================================

export {
  createEnhancedExporter,
  createSoundCloudUploader,
  DEFAULT_EXPORT_OPTIONS,
  type EnhancedExporter,
  type SoundCloudUploader,
  type ExportOptions,
  type ExportSource,
  type BitDepth,
  type SampleRate,
  type DitherAlgorithm,
  type SoundCloudUploadOptions,
  type ExportJob,
  type ExportResult,
  type ExportFile,
} from "./export-enhanced.js";

// ============================================================================
// Version
// ============================================================================

// ============================================================================
// Enhanced Import (Wave 7)
// ============================================================================

export {
  createEnhancedImportManager,
  createALSImporter,
  createREXImporter,
  parseACIDChunk,
  parseAppleLoopMetadata,
  detectTempoAndWarp,
  autoSliceDrums,
  DEFAULT_ALS_IMPORT_OPTIONS,
  DEFAULT_REX_IMPORT_OPTIONS,
} from "./import-enhanced.js";

export type {
  AbletonALSProject,
  AbletonTrack,
  AbletonAudioTrack,
  AbletonMidiTrack,
  AbletonDevice,
  AbletonClip,
  AbletonAudioClip,
  AbletonMidiClip,
  AbletonWarp,
  AbletonWarpMarker,
  ALSImportOptions,
  ALSImportResult,
  ALSImporter,
  REXFile,
  REXSlice,
  REXMetadata,
  REXImportOptions,
  ACIDLoop,
  AppleLoop,
  WarpDetectionResult,
  SliceResult,
  EnhancedImportManager,
} from "./import-enhanced.js";

// ============================================================================
// Version
// ============================================================================

export const VERSION = "0.1.0";
