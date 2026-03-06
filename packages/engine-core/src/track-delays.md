# Track Delays

Per-track delay compensation and manual delay controls for the In-Browser DAW.

## Features

- **Manual Track Delay** - User-adjustable per-track delay (ms or samples)
- **Delay Compensation** - Automatic PDC calculation from plugin latencies
- **Time Alignment** - Align tracks for phase coherence

## Usage

```typescript
import { TrackDelayManager, DelayCalculator } from '@daw/engine-core';

const delayManager = new TrackDelayManager(44100);

// Set manual track delay
delayManager.setManualDelay('track_1', 10); // 10ms delay
delayManager.setManualDelay('track_2', -5); // 5ms advance

// Report plugin latency
delayManager.reportPluginLatency('track_1', 'eq_plugin', 256); // samples

// Calculate compensation for entire project
const report = delayManager.calculateDelayCompensation([
  'track_1',
  'track_2',
  'track_3'
]);

console.log(`Max delay: ${report.maxDelayMs}ms`);
```

## Delay Types

### Manual Delay

User-adjustable delay for creative or corrective purposes:

```typescript
// Positive = delay the track
delayManager.setManualDelay(trackId, 25); // 25ms delay

// Negative = advance the track (pre-delay)
delayManager.setManualDelay(trackId, -10); // 10ms advance

// Set in samples
delayManager.setManualDelaySamples(trackId, 1102);
```

### Delay Compensation

Automatic compensation for plugin latency:

```typescript
// Plugin reports its latency
delayManager.reportPluginLatency(trackId, pluginId, latencySamples);

// When plugin is removed
delayManager.removePluginLatency(trackId, pluginId);
```

Total delay = manual delay + compensation delay

## Calculations

### Distance to Delay

```typescript
// Align speakers at different distances
const delayMs = DelayCalculator.distanceToDelay(3); // 3 meters
// Result: ~8.7ms delay for farther speaker
```

### Phase Alignment

```typescript
// Align microphones for multi-mic recording
const delaySamples = DelayCalculator.phaseAlignmentDelay(
  1000,  // Frequency (Hz)
  45,    // Phase offset (degrees)
  44100  // Sample rate
);
```

### Haas Effect

```typescript
// Create stereo width with Haas effect
const delayMs = DelayCalculator.haasDelayMs(1.5);
```

### Tempo Sync

```typescript
// Delay synced to tempo
const delayMs = DelayCalculator.tempoSyncDelayMs(128, 0.5); // 8th note at 128 BPM
```

## API

### TrackDelayManager

- `setManualDelay(trackId, delayMs)` - Set manual delay
- `setManualDelaySamples(trackId, samples)` - Set in samples
- `getTrackDelay(trackId)` - Get delay info
- `reportPluginLatency(trackId, pluginId, samples)` - Report plugin latency
- `calculateDelayCompensation(trackIds)` - Calculate PDC for all tracks
- `getTotalDelaySamples(trackId)` - Get total delay for scheduling
- `nudgeDelay(trackId, direction, amountMs)` - Fine adjustment
