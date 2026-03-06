# @daw/diagnostics

Capability detection, diagnostics collection, and telemetry for the In-Browser DAW.

## Overview

This package provides:

- **Capability Detection**: Feature-based browser capability detection (no browser sniffing)
- **Diagnostics**: Performance monitoring and support bundle generation
- **Telemetry**: Optional anonymized usage data collection (opt-in)

## Installation

```bash
pnpm add @daw/diagnostics
```

## Usage

### Capability Detection

Detect browser capabilities at boot:

```typescript
import {
  detectCapabilities,
  determineTier,
  createCapabilityReport,
} from "@daw/diagnostics";

// Detect all capabilities
const matrix = detectCapabilities();
console.log(matrix.audioWorklet); // true/false
console.log(matrix.sharedArrayBuffer); // true/false

// Determine experience tier
const tier = determineTier(matrix);
console.log(tier); // 'A', 'B', or 'C'

// Create full report
const report = createCapabilityReport();
```

### Experience Tiers

- **Tier A**: Full experience with all advanced APIs (AudioWorklet, SAB, OPFS, Web MIDI, etc.)
- **Tier B**: Core DAW experience with fallbacks for missing advanced features
- **Tier C**: Minimal compatibility mode for limited browsers

### Diagnostics

Create and manage diagnostics data:

```typescript
import {
  createEmptyDiagnosticsData,
  createSupportBundle,
  DiagnosticsErrorCollector,
} from "@daw/diagnostics";

// Create empty diagnostics structure
const diagnostics = createEmptyDiagnosticsData("1.0.0", "1.0.0", 1);

// Create a support bundle for debugging
const bundle = createSupportBundle(diagnostics);

// Collect errors
const errorCollector = new DiagnosticsErrorCollector();
errorCollector.record("Something went wrong", "engine", "error");
const errors = errorCollector.getUnacknowledged();
```

### Telemetry

Optional usage and performance telemetry (opt-in):

```typescript
import { TelemetryCollector } from "@daw/diagnostics";

const telemetry = new TelemetryCollector("1.0.0", {}, capabilities, tier);

// Record feature usage
telemetry.recordFeatureUsage({
  featureName: "audio_export",
  category: "export",
  durationMs: 5000,
  success: true,
});

// Record performance metrics
telemetry.recordPerformance({
  metricName: "render_time",
  value: 2.5,
  unit: "ms",
  source: "scheduler",
});

// Enable with user consent
telemetry.setConsentStatus("granted");
telemetry.setEnabled(true);

// Flush on app exit
await telemetry.endSession();
```

## Capability Matrix

The `CapabilityMatrix` interface includes:

| Capability | Description |
|------------|-------------|
| `audioWorklet` | AudioWorklet API for realtime DSP |
| `sharedArrayBuffer` | SharedArrayBuffer for zero-copy worker communication |
| `crossOriginIsolated` | Cross-origin isolation status (required for SAB) |
| `webMidi` | Web MIDI API for external MIDI I/O |
| `sysex` | System exclusive MIDI messages support |
| `fileSystemAccess` | File System Access API for native file operations |
| `opfs` | Origin Private File System for internal storage |
| `opfsSyncHandle` | Synchronous OPFS file handles for workers |
| `webCodecsAudio` | WebCodecs AudioDecoder/Encoder |
| `mediaRecorder` | MediaRecorder API for audio capture |
| `audioOutputSelection` | Audio output device selection |
| `webGpu` | WebGPU for accelerated visualization |
| `offscreenCanvas` | OffscreenCanvas for worker rendering |
| `keyboardLayoutMap` | Keyboard Layout Map API |
| `webHid` | WebHID API for advanced controllers |
| `webSerial` | Web Serial API for hardware devices |

## API Reference

### Capabilities

- `detectCapabilities()` - Detect all browser capabilities
- `determineTier(matrix)` - Determine experience tier from capabilities
- `createCapabilityReport()` - Create complete capability report
- `validateCapabilities(matrix, tier)` - Validate capabilities meet tier requirement
- `detectKnownLimitations()` - Detect known browser limitations

### Diagnostics

- `createEmptyDiagnosticsData(appVersion, engineVersion, schemaVersion)` - Create empty diagnostics
- `createSupportBundle(data, options)` - Generate support bundle
- `formatSupportBundle(bundle)` - Format bundle as JSON
- `createSupportBundleBlob(bundle)` - Create download blob
- `generateSupportBundleFilename(bundle)` - Generate download filename
- `DiagnosticsErrorCollector` - Error collection utility
- `MetricsAggregator` - Metrics averaging utility

### Telemetry

- `TelemetryCollector` - Main telemetry collection class
- `generateSessionId()` - Generate unique session ID
- `generateAnonymousUserId(seed)` - Generate anonymous user ID
- `createNoOpTelemetry()` - Create no-op collector when disabled

## License

MIT
