# Audio Quantization

Quantize audio clips by aligning warp markers to grid for the In-Browser DAW.

## Features

- **Grid Quantization** - Align warp markers to note grid
- **Swing** - Apply swing to quantization
- **Strength** - Control amount of quantization
- **Humanize** - Reverse quantization (add randomness)

## Usage

```typescript
import { AudioQuantizer, BatchQuantizer } from '@daw/waveforms';

const quantizer = new AudioQuantizer(960, 120); // PPQ, BPM

// Quantize clip
const result = quantizer.quantize(audioClip, {
  gridDivision: 240,  // 16th note
  strength: 100,      // 100% quantization
  swing: 0            // No swing
});

console.log(`Adjusted ${result.markersAdjusted} markers`);
console.log(`Average offset: ${result.averageOffset}ms`);

// Batch quantize multiple clips
const results = BatchQuantizer.quantizeClips(
  selectedClips,
  { strength: 80, swing: 0 },
  960,
  120
);
```

## Options

### Grid Divisions

```typescript
// Common grid divisions at 960 PPQ
AudioQuantizer.getGridDivisions(960);
// Returns:
// [
//   { name: '1/1', division: 3840 },
//   { name: '1/2', division: 1920 },
//   { name: '1/4', division: 960 },
//   { name: '1/8', division: 480 },
//   { name: '1/16', division: 240 },
//   { name: '1/32', division: 120 },
//   { name: '1/8T', division: 320 },  // Triplets
//   { name: '1/16T', division: 160 }
// ]
```

### Strength

Control how much quantization is applied:

```typescript
// 100% - Full quantization
quantizer.quantize(clip, { strength: 100 });

// 50% - Halfway between original and quantized
quantizer.quantize(clip, { strength: 50 });

// 0% - No change
quantizer.quantize(clip, { strength: 0 });
```

### Swing

Apply swing to off-beat markers:

```typescript
quantizer.quantize(clip, {
  gridDivision: 480,  // 8th note grid
  swing: 66           // 66% swing (shuffle feel)
});
```

## Humanize

Add random variation to warp markers:

```typescript
// Humanize with 10ms random variation
const humanized = quantizer.humanize(clip, 10, 12345);
// Third parameter is optional random seed
```

## Analysis

Analyze clip to determine quantization needs:

```typescript
const analysis = quantizer.analyzeQuantization(clip, 240);

console.log(analysis);
// {
//   maxDeviation: 0.15,        // beats
//   averageDeviation: 0.08,    // beats
//   outOfSyncMarkers: 3,       // count
//   suggestedStrength: 100     // %
// }
```

## Tempo Alignment

Align clip recorded at different tempo:

```typescript
// Align 100 BPM recording to 120 BPM project
const aligned = quantizer.alignToTempo(clip, 100, 120);
```

## Batch Operations

### Quantize All Clips

```typescript
const results = BatchQuantizer.quantizeClips(
  allClips,
  { gridDivision: 240, strength: 100 }
);
```

### Quantize Time Range

```typescript
const results = BatchQuantizer.quantizeRange(
  clips,
  startTick,
  endTick,
  { gridDivision: 240, strength: 100 }
);
```

### Uniform Quantization

Apply same quantization to multiple clips based on reference:

```typescript
const results = BatchQuantizer.applyUniformQuantization(
  selectedClips,
  referenceClip,
  100  // strength
);
```

## API

### AudioQuantizer

- `quantize(clip, options?)` - Quantize audio clip
- `quantizeBeat(beat, options)` - Quantize single beat
- `snapMarker(marker, gridDivision)` - Snap marker to grid
- `humanize(clip, amountMs, seed?)` - Add random variation
- `analyzeQuantization(clip, gridDivision)` - Analyze quality
- `alignToTempo(clip, sourceBpm, targetBpm)` - Tempo alignment

### BatchQuantizer

- `quantizeClips(clips, options, ppq?, bpm?)` - Quantize multiple
- `quantizeRange(clips, startTick, endTick, options, ppq?, bpm?)` - Quantize range
- `applyUniformQuantization(clips, referenceClip, strength?, ppq?, bpm?)` - Uniform quantize
