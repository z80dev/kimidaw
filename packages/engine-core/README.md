# @daw/engine-core

Core audio engine types and utilities for the In-Browser DAW.

## Overview

This package provides the foundational types, utilities, and state management for the DAW audio engine:

- **Transport** - Playback state, position, looping, recording
- **Timing** - PPQ-based musical time conversions (PPQ = 960)
- **Graph** - Audio routing graph model
- **Latency** - Plugin delay compensation (PDC)
- **Worklet Bridge** - Main thread to AudioWorklet communication

## Installation

```bash
pnpm add @daw/engine-core
```

## Usage

### Transport

```typescript
import { createTransport } from '@daw/engine-core';

const transport = createTransport({
  sampleRate: 48000,
  initialTempo: 120,
  initialTimeSigNum: 4,
  initialTimeSigDen: 4,
});

// Subscribe to changes
transport.subscribe((change) => {
  console.log(`${change.property}: ${change.previousValue} -> ${change.newValue}`);
});

// Control playback
transport.play();
transport.stop();
transport.setPosition(960 * 4); // 1 bar at PPQ=960

// Enable looping
transport.setLooping(true);
transport.setLoopRange(0, 960 * 4 * 4); // Loop 4 bars
```

### Timing Conversions

```typescript
import { 
  PPQ, 
  ticksToSamples, 
  samplesToTicks,
  ticksToSeconds,
  beatsToTicks,
  ticksToMusicalTime,
  GridTicks,
  quantizeTicks,
} from '@daw/engine-core';

// Convert musical time to samples
const samples = ticksToSamples(PPQ * 4, 120, 48000);
// -> 96000 samples (1 bar at 120 BPM, 48kHz)

// Convert samples back to ticks
const ticks = samplesToTicks(96000, 120, 48000);
// -> 3840 ticks (PPQ * 4)

// Musical time conversion
const { bars, beats, ticks } = ticksToMusicalTime(PPQ * 5, 4);
// -> { bars: 2, beats: 2, ticks: 0 }

// Quantize to grid
const quantized = quantizeTicks(500, GridTicks.sixteenth, 1.0);
// -> 480 (nearest 16th note at PPQ=960)
```

### Audio Graph

```typescript
import { GraphBuilder, validateGraph } from '@daw/engine-core';

const graph = new GraphBuilder()
  .addTrack({
    id: 'track-1',
    name: 'Kick',
    source: { kind: 'audioClips', clipIds: ['clip-1'] },
    noteFx: [],
    inserts: ['eq-1', 'compressor-1'],
    sends: [{ busId: 'reverb', gainDb: -12, preFader: false }],
    outputBusId: null,
    channelCount: 2,
    faderDb: 0,
    pan: 0,
    mute: false,
    solo: false,
    arm: false,
    monitorMode: 'auto',
  })
  .addBus({
    id: 'reverb',
    name: 'Reverb Bus',
    inserts: ['reverb-plugin'],
    sends: [],
    outputBusId: null,
    channelCount: 2,
    faderDb: -6,
    pan: 0,
    mute: false,
    solo: false,
    sidechainSource: true,
  })
  .build();

// Validate graph
const errors = validateGraph(graph);
if (errors.length > 0) {
  console.error('Graph errors:', errors);
}
```

### Latency Compensation

```typescript
import { createLatencyCompensator, estimateDeviceLatency } from '@daw/engine-core';

const compensator = createLatencyCompensator(graph);

// Report device latency from AudioContext
const deviceLatency = estimateDeviceLatency(audioContext);
compensator.setDeviceLatency(deviceLatency);

// Report plugin latencies
compensator.reportPluginLatency({
  pluginId: 'lookahead-compressor',
  latencySamples: 512,
  isDynamic: false,
});

// Get compensation for a node
const delaySamples = compensator.getCompensationDelay('track-1');
```

### Worklet Bridge

```typescript
import { createWorkletBridge } from '@daw/engine-core';

const bridge = createWorkletBridge({
  node: audioWorkletNode,
  useSAB: true,
  onMessage: (msg) => console.log('From worklet:', msg),
  onStats: (stats) => console.log('Load:', stats.loadEstimate),
});

// Send events
bridge.sendEvents([
  { type: 'note-on', note: 60, velocity: 100, channel: 0, sampleTime: 1000, tickTime: 480, trackId: 't1' },
]);

// Update parameters
bridge.setParameter('synth-1', 'cutoff', 0.8, 0);

// Cleanup
bridge.dispose();
```

## API Reference

### Constants

- `PPQ = 960` - Pulses per quarter note (musical resolution)
- `DEFAULT_SAMPLE_RATE = 48000` - Default audio sample rate
- `DEFAULT_SCHEDULER_CONFIG` - Default lookahead scheduling parameters
- `GridTicks` - Common grid divisions (whole, half, quarter, etc.)

### Transport

| Method | Description |
|--------|-------------|
| `play(fromTick?)` | Start playback |
| `stop()` | Stop playback |
| `togglePlay()` | Toggle play/stop |
| `record()` | Start recording (auto-plays) |
| `setPosition(tick)` | Set position in ticks |
| `setLooping(enabled)` | Enable/disable looping |
| `setLoopRange(start, end)` | Set loop boundaries |
| `process(sampleFrames)` | Advance position (call from audio callback) |
| `subscribe(listener)` | Subscribe to state changes |

### Timing Functions

- `ticksToSamples(ticks, bpm, sampleRate)`
- `samplesToTicks(samples, bpm, sampleRate)`
- `ticksToSeconds(ticks, bpm)`
- `secondsToTicks(seconds, bpm)`
- `musicalTimeToTicks(bars, beats, ticks, timeSigNum)`
- `ticksToMusicalTime(totalTicks, timeSigNum)`
- `quantizeTicks(ticks, gridTicks, strength)`
- `TempoMap` - Class for variable tempo conversions

### Graph

- `GraphBuilder` - Fluent API for constructing graphs
- `validateGraph(graph)` - Check for errors
- `calculateLatencyCompensation(graph, pluginLatencies)` - Compute PDC

### Latency

- `LatencyCompensator` - PDC calculation
- `estimateDeviceLatency(audioContext)` - Get latency from AudioContext
- `validateLatency(samples, sampleRate)` - Check latency bounds

## Architecture

The engine-core follows the spec's timing model (section 8.1):

```
Musical Time (ticks, PPQ=960)
       ↓
   Tempo Map
       ↓
Seconds ←→ Samples (DSP)
```

All conversions are pure functions except `TempoMap` which maintains the tempo curve for variable tempo projects.

## License

MIT
