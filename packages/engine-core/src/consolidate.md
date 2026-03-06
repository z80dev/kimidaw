# Consolidate & Flatten

Render selections and tracks to new audio clips for the In-Browser DAW.

## Features

- **Consolidate Selection** - Render time selection to new clip
- **Flatten Track** - Render all clips to single audio track
- **Freeze/Flatten** - Freeze instrument tracks to audio
- **Bounce in Place** - Quick bounce of single clip

## Usage

```typescript
import { ConsolidateEngine, AudioRenderer } from '@daw/engine-core';

const engine = new ConsolidateEngine(44100);

// Consolidate time selection
const result = await engine.consolidateSelection(
  tracks,
  startTick,
  endTick,
  {
    includeEffects: true,
    normalize: false,
    bitDepth: 24
  }
);

// Flatten track
const results = await engine.flattenTrack(track, {
  freezeOnly: false,
  renderToNewTrack: false
});

// Freeze instrument track
const freezeState = await engine.freezeTrack(instrumentTrack);

// Later, unfreeze to restore
engine.unfreezeTrack(trackId);
```

## Operations

### Consolidate Selection

Renders multiple tracks in a time range to a single clip:

```typescript
const result = await engine.consolidateSelection(
  selectedTracks,    // Tracks to include
  0,                 // Start tick
  3840,              // End tick (4 bars at 960 PPQ)
  {
    includeEffects: true,     // Include insert effects
    includePan: true,         // Include panning
    normalize: true,          // Normalize to 0dB
    tailDurationMs: 1000,     // Include reverb tail
    bitDepth: 24,             // Output bit depth
    dither: true              // Apply dithering
  }
);
```

### Flatten Track

Renders all clips on a track to audio:

```typescript
// Full flatten - convert to audio
const results = await engine.flattenTrack(track, {
  freezeOnly: false,
  includeEffects: true
});

// Freeze only - preserve MIDI, render audio backup
const results = await engine.flattenTrack(track, {
  freezeOnly: true
});
```

### Bounce in Place

Quick bounce of single clip:

```typescript
const result = await engine.consolidateClip(track, clip, {
  includeEffects: true,
  tailDurationMs: 100
});
```

## Clip Operations

### Split Clip

```typescript
const [clip1, clip2] = engine.splitClip(clip, splitTick);
```

### Merge Clips

```typescript
const result = await engine.mergeClips(clips, gapDurationTicks);
```

### Crop Clip

```typescript
const cropped = engine.cropClip(clip, startSample, endSample);
```

### Normalize

```typescript
const normalized = engine.normalizeClip(clip, targetDb);
```

### Reverse

```typescript
const reversed = engine.reverseClip(clip);
```

## Freeze State

Frozen tracks maintain original data while rendering to audio:

```typescript
interface FreezeState {
  trackId: string;
  frozenClipId: string;
  originalClips: (AudioClip | MidiClip)[];
  originalPlugins: string[];
  isFrozen: boolean;
}

// Check if frozen
const isFrozen = engine.isTrackFrozen(trackId);

// Get freeze state
const state = engine.getFreezeState(trackId);
```

## Audio Rendering

### Analyze Levels

```typescript
const { peak, rms } = AudioRenderer.analyzeLevels(buffer);
```

### Apply Fades

```typescript
const faded = AudioRenderer.applyFade(
  buffer,
  fadeInSamples,
  fadeOutSamples,
  'equal-power'
);
```

### Find Zero Crossing

```typescript
const crossing = AudioRenderer.findZeroCrossing(buffer, position, 100);
```

## API

### ConsolidateEngine

- `consolidateSelection(tracks, startTick, endTick, options?)` - Render selection
- `consolidateClip(track, clip, options?)` - Bounce single clip
- `flattenTrack(track, options?)` - Flatten track
- `freezeTrack(track)` - Freeze instrument track
- `unfreezeTrack(trackId)` - Unfreeze track
- `splitClip(clip, splitTick)` - Split clip
- `mergeClips(clips, gapDuration?)` - Merge clips
- `cropClip(clip, startSample, endSample)` - Crop clip
- `normalizeClip(clip, targetDb?)` - Normalize
- `reverseClip(clip)` - Reverse playback

### AudioRenderer

- `analyzeLevels(buffer)` - Calculate peak and RMS
- `applyFade(buffer, fadeIn, fadeOut, curve)` - Apply fades
- `findZeroCrossing(buffer, position, range)` - Find zero crossing
