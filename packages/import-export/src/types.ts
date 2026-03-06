/**
 * Import/Export Package - Type Definitions
 * 
 * Type definitions for audio/MIDI import, export/render, and project archiving.
 * Follows the engineering spec sections 18, 19, and 17.3.
 */

import type { MidiFile } from "@daw/midi";

// ============================================================================
// Import Types
// ============================================================================

export type ImportStatus = "pending" | "analyzing" | "decoding" | "processing" | "complete" | "error";

export interface ImportJob {
  id: string;
  file: File;
  status: ImportStatus;
  progress: number; // 0-100
  error?: string;
  result?: ImportResult;
}

export interface ImportResult {
  assetId: string;
  hash: string;
  metadata: AudioMetadata | MidiMetadata;
  duration: number; // seconds
  peaks?: PeakData;
}

export interface AudioMetadata {
  type: "audio";
  format: "wav" | "aiff" | "mp3" | "ogg" | "flac" | "m4a" | "webm";
  sampleRate: number;
  channels: number;
  bitDepth?: number;
  duration: number;
  transientHints?: TransientHint[];
  tempoHint?: number;
  keyHint?: string;
}

export interface MidiMetadata {
  type: "midi";
  format: 0 | 1 | 2;
  numTracks: number;
  ticksPerQuarter: number;
  duration: number;
  tempoMap: TempoEvent[];
  timeSignatures: TimeSignatureEvent[];
}

export interface TransientHint {
  time: number;
  amplitude: number;
}

export interface TempoEvent {
  tick: number;
  bpm: number;
}

export interface TimeSignatureEvent {
  tick: number;
  numerator: number;
  denominator: number;
}

export interface PeakData {
  sampleRate: number;
  channels: number;
  // Peak data organized by level (0 = full resolution)
  levels: PeakLevel[];
}

export interface PeakLevel {
  zoom: number; // samples per pixel
  data: Float32Array; // Min/max pairs per pixel
}

// ============================================================================
// Export/Render Types
// ============================================================================

export type RenderStatus = "queued" | "preparing" | "rendering" | "encoding" | "complete" | "error" | "cancelled";

export interface RenderJob {
  id: string;
  projectSnapshotId: string;
  scope: "master" | "stems" | "selectedTracks" | "bus" | "clip";
  format: {
    container: "wav" | "flac" | "ogg" | "aac" | "mp3";
    bitDepth?: 16 | 24 | 32;
    float?: boolean;
    sampleRate: 44100 | 48000 | 96000;
  };
  normalize: boolean;
  dither: "none" | "triangular" | "noise-shaped";
  includeTailMs: number;
  trackIds?: string[]; // For "selectedTracks" scope
  busId?: string; // For "bus" scope
  clipId?: string; // For "clip" scope
  timeRange?: { start: number; end: number }; // Optional time range
}

export interface RenderProgress {
  jobId: string;
  status: RenderStatus;
  progress: number; // 0-100
  currentTime?: number; // Current render position in seconds
  estimatedTimeRemaining?: number; // seconds
  error?: string;
}

export interface RenderResult {
  jobId: string;
  status: RenderStatus;
  url?: string; // Blob URL for download
  filename?: string;
  duration: number;
  size: number; // bytes
  metadata: {
    sampleRate: number;
    channels: number;
    bitDepth: number;
    lufsIntegrated?: number;
    truePeak?: number;
  };
}

// ============================================================================
// Stem Export Types
// ============================================================================

export interface StemExportConfig {
  trackIds: string[];
  format: RenderJob["format"];
  includeEffects: boolean; // Pre/post-fader option
  normalize: boolean;
  dither: RenderJob["dither"];
  includeTailMs: number;
}

export interface StemResult extends RenderResult {
  trackId: string;
  trackName: string;
}

// ============================================================================
// Project Archive Types
// ============================================================================

export interface ProjectArchive {
  version: string;
  manifest: ArchiveManifest;
  project: ProjectData;
  assets: ArchiveAsset[];
  presets: ArchivePreset[];
  scripts: ArchiveScript[];
}

export interface ArchiveManifest {
  version: string;
  createdAt: string;
  updatedAt: string;
  appVersion: string;
  schemaVersion: number;
  compression?: "gzip" | "deflate" | null;
}

export interface ProjectData {
  id: string;
  name: string;
  data: unknown; // Project JSON
}

export interface ArchiveAsset {
  id: string;
  hash: string;
  path: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

export interface ArchivePreset {
  id: string;
  name: string;
  pluginType: string;
  path: string;
  data: unknown;
}

export interface ArchiveScript {
  id: string;
  name: string;
  path: string;
  source: string;
}

export interface ArchiveOptions {
  includeAssets?: boolean;
  includePeaks?: boolean;
  includePresets?: boolean;
  includeScripts?: boolean;
  compression?: "gzip" | "deflate" | null;
}

// ============================================================================
// Worker Message Types
// ============================================================================

export type WorkerMessageType = 
  | "import:start"
  | "import:progress"
  | "import:complete"
  | "import:error"
  | "import:cancel"
  | "render:start"
  | "render:progress"
  | "render:complete"
  | "render:error"
  | "render:cancel";

export interface WorkerMessage {
  type: WorkerMessageType;
  jobId: string;
  payload?: unknown;
}

// ============================================================================
// Event Handler Types
// ============================================================================

export type ImportProgressHandler = (job: ImportJob) => void;
export type RenderProgressHandler = (progress: RenderProgress) => void;
export type ImportCompleteHandler = (result: ImportResult) => void;
export type RenderCompleteHandler = (result: RenderResult) => void;
export type ErrorHandler = (error: Error, jobId: string) => void;
