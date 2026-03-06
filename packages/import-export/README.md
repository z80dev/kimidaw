# @daw/import-export

Import/export functionality for the In-Browser DAW. Handles audio/MIDI import, offline rendering, stem export, and project archiving.

## Features

- **Audio Import**: WAV, AIFF, MP3, OGG, FLAC support with peak generation
- **MIDI Import**: Type 0, 1, 2 file parsing with tempo map extraction
- **Project Import**: Archive extraction and migration
- **Offline Render**: WAV, FLAC, OGG, AAC, MP3 export with normalization and dithering
- **Stem Export**: Multi-track export with parallel rendering
- **Project Archive**: `.webdawproj` format with compression
- **Web Workers**: Heavy operations off the main thread

## Installation

```bash
npm install @daw/import-export
```

## Quick Start

### Audio Import

```typescript
import { getAudioImportManager } from "@daw/import-export";

const importer = getAudioImportManager();

// Check if file is supported
if (importer.isSupported(file)) {
  const result = await importer.importAudio(file, "job-123");
  
  console.log("Duration:", result.duration);
  console.log("Sample Rate:", result.metadata.sampleRate);
  console.log("Peaks:", result.peaks); // For waveform display
}
```

### MIDI Import

```typescript
import { getMidiImportManager } from "@daw/import-export";

const importer = getMidiImportManager();

const result = await importer.importMidi(file, "job-123");

console.log("Format:", result.metadata.format);
console.log("Tracks:", result.metadata.numTracks);
console.log("Tempo Map:", result.metadata.tempoMap);
```

### Offline Render

```typescript
import { getExportRenderManager } from "@daw/import-export";

const renderer = getExportRenderManager();

// Create render job
const job = renderer.createJob({
  projectSnapshotId: "snapshot-123",
  scope: "master", // or "stems", "selectedTracks", "bus", "clip"
  format: {
    container: "wav",
    bitDepth: 24,
    sampleRate: 48000,
  },
  normalize: true,
  dither: "triangular",
  includeTailMs: 1000,
});

// Track progress
renderer.onProgress(job.id, (progress) => {
  console.log(`${progress.progress}% - ${progress.status}`);
});

// Render
const result = await renderer.render(job);

// Download
if (result.url) {
  const a = document.createElement("a");
  a.href = result.url;
  a.download = result.filename ?? "export.wav";
  a.click();
}
```

### Stem Export

```typescript
import { getStemExportManager } from "@daw/import-export";

const stemExport = getStemExportManager();

// Export multiple tracks
const stems = await stemExport.exportStems(
  {
    trackIds: ["track-1", "track-2", "track-3"],
    format: {
      container: "wav",
      bitDepth: 24,
      sampleRate: 48000,
    },
    includeEffects: true,
    normalize: false,
    dither: "none",
    includeTailMs: 1000,
  },
  {
    parallel: true,
    maxParallelJobs: 4,
    onTrackProgress: (trackId, progress) => {
      console.log(`Track ${trackId}: ${progress}%`);
    },
  }
);

// Package as ZIP
const package = await stemExport.packageStems(stems, "my-song-stems.zip");
```

### Project Archive

```typescript
import { getArchiveManager } from "@daw/import-export";

const archive = getArchiveManager();

// Create archive
const result = await archive.createArchive({
  projectId: "proj-123",
  projectName: "My Song",
  projectData: projectJson,
  assets: [
    {
      id: "asset-1",
      hash: "sha256-hash",
      data: audioBuffer,
      mimeType: "audio/wav",
      metadata: { duration: 120 },
    },
  ],
  presets: [...],
  scripts: [...],
  compression: "gzip",
});

if (result.success && result.blob) {
  archive.downloadArchive(result.blob, result.filename);
}

// Peek at archive without full extraction
const info = await archive.getArchiveInfo(file);
console.log(info.projectName, info.assetCount);
```

## Web Workers

Use workers to keep heavy operations off the main thread:

```typescript
import { createImportWorker, createRenderWorker } from "@daw/import-export";

// Import worker
const importWorker = createImportWorker();

importWorker.postMessage({
  type: "import:start",
  payload: {
    jobId: "import-123",
    file: audioFile,
    fileType: "audio",
  },
});

importWorker.onmessage = (e) => {
  switch (e.data.type) {
    case "import:progress":
      console.log(`${e.data.payload.progress}%`);
      break;
    case "import:complete":
      console.log("Import done:", e.data.payload.result);
      break;
    case "import:error":
      console.error("Import failed:", e.data.payload.error);
      break;
  }
};

// Cancel import
importWorker.postMessage({
  type: "import:cancel",
  payload: { jobId: "import-123" },
});
```

## API Reference

### Audio Import Manager

- `isSupported(file)` - Check if file type is supported
- `getSupportedTypes()` - Get list of supported MIME types
- `importAudio(file, jobId)` - Import audio file
- `normalizeAudio(buffer)` - Normalize audio buffer

### MIDI Import Manager

- `importMidi(file, jobId)` - Import MIDI file
- `importMidiBuffer(buffer, filename)` - Import from ArrayBuffer
- `convertToClip(track)` - Convert to DAW clip format

### Export Render Manager

- `createJob(config)` - Create render job
- `render(job, options)` - Start rendering
- `cancel(jobId)` - Cancel render
- `onProgress(jobId, handler)` - Subscribe to progress
- `isFormatSupported(format)` - Check format support
- `getSupportedFormats()` - Get supported formats

### Stem Export Manager

- `exportStems(config, options)` - Export multiple stems
- `exportAllTracks(trackIds, options, exportOptions)` - Export all tracks
- `exportBus(busId, config, options)` - Export bus as stem
- `packageStems(stems, filename)` - Package as ZIP
- `generateStemFilename(trackName, format)` - Generate filename

### Archive Manager

- `createArchive(options)` - Create project archive
- `downloadArchive(blob, filename)` - Download archive
- `getArchiveInfo(file)` - Peek archive info
- `getVersion()` - Get archive format version
- `getExtension()` - Get file extension (`.webdawproj`)

## Render Job Configuration

```typescript
interface RenderJob {
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
  trackIds?: string[]; // For "selectedTracks"
  busId?: string; // For "bus"
  clipId?: string; // For "clip"
  timeRange?: { start: number; end: number };
}
```

## Project Archive Format

```
manifest.json      - Archive metadata
project.json       - Project data
assets/audio/*     - Audio files (content-addressed)
assets/peaks/*     - Waveform peak data
presets/*          - Plugin presets
scripts/*          - Script modules
checksums.json     - Asset checksums
```

## Supported Formats

### Import
- **Audio**: WAV, AIFF, MP3, OGG, FLAC, M4A, WebM
- **MIDI**: Type 0, 1, 2 Standard MIDI Files

### Export
- **WAV**: 16/24/32-bit, integer or float
- **FLAC**: Lossless compression
- **OGG**: Vorbis codec
- **AAC**: MPEG-4 AAC
- **MP3**: MPEG Layer-3

## TypeScript

All types are exported:

```typescript
import type {
  RenderJob,
  RenderProgress,
  ImportResult,
  ProjectArchive,
  StemExportConfig,
  // ... and more
} from "@daw/import-export";
```

## License

MIT
