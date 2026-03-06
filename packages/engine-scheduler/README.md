# @daw/engine-scheduler

Musical scheduler for the In-Browser DAW. Implements two-stage scheduling per engineering spec section 8.2.

## Overview

The scheduler manages the timing of musical events:

- **Event Queue** - Priority queue for scheduled events with deduplication
- **Lookahead Manager** - Calculates scheduling windows and loop boundaries  
- **Render Scheduler** - Block-accurate event consumption for AudioWorklet
- **Metronome Engine** - Click generation synchronized to transport

## Installation

```bash
pnpm add @daw/engine-scheduler
```

## Two-Stage Scheduling Model

### Stage 1: Musical Scheduler (Main Thread)

```typescript
import { createScheduler } from '@daw/engine-scheduler';

const scheduler = createScheduler({
  sampleRate: 48000,
  config: {
    prepareHorizonMs: 120,   // Look 120ms ahead
    refillThresholdMs: 60,   // Refill when < 60ms buffered
    maxChunkMs: 20,          // Max 20ms chunks
  },
});

// Register event sources
scheduler.registerSource({
  id: 'midi-clip-1',
  type: 'clip',
  isActive: () => true,
  getEvents: (startTick, endTick) => {
    // Return events in time range
    return myNotes.filter(n => n.tickTime >= startTick && n.tickTime < endTick);
  },
});

// Connect to transport
scheduler.setTransportState(transport.getState());
scheduler.start();

// Call frequently (every 10-20ms)
setInterval(() => {
  const resolution = scheduler.tick();
  if (resolution) {
    // Send chunks to AudioWorklet
    sendToWorklet(resolution.chunks);
  }
}, 10);
```

### Stage 2: Render Scheduler (AudioWorklet)

```typescript
import { createRenderScheduler } from '@daw/engine-scheduler';

// Inside AudioWorklet processor
const renderScheduler = createRenderScheduler(48000, 128);

// In process() method
process(inputs, outputs, parameters) {
  const currentSample = this.currentSample;
  
  // Get events for this block with sample offsets
  const events = renderScheduler.processBlock(currentSample);
  
  for (const { event, offset } of events) {
    // Trigger at exact sample offset within block
    this.triggerEvent(event, offset);
  }
  
  this.currentSample += 128;
  return true;
}
```

## Event Queue

```typescript
import { EventQueue, createScheduledEvent } from '@daw/engine-scheduler';

const queue = new EventQueue({ maxSize: 10000, deduplicate: true });

// Add event
queue.enqueue(createScheduledEvent(noteEvent, 'track-1', 0));

// Get range without removing
const upcoming = queue.getRange(currentTick, currentTick + 960);

// Dequeue range
const toPlay = queue.dequeueRange(currentTick, nextChunkTick);

// Statistics
const stats = queue.getStats();
console.log(`Queue fill: ${(stats.fillRatio * 100).toFixed(1)}%`);
```

## Metronome

```typescript
import { createMetronomeEngine } from '@daw/engine-scheduler';

const metronome = createMetronomeEngine(48000, {
  enabled: true,
  volumeDb: -6,
  accentFirstBeat: true,
  accentDb: 6,
  clickFrequency: 1000,
  accentFrequency: 1500,
  clickDurationMs: 50,
});

// Generate clicks for time range
const clicks = metronome.generateClicks(
  startTick,
  endTick,
  tempo,
  timeSigNum,
  timeSigDen
);

// Count-in
const countIn = metronome.generateCountIn(2, tempo, 4, 4); // 2 bars
```

## Lookahead Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `prepareHorizonMs` | 120 | How far ahead to schedule events |
| `refillThresholdMs` | 60 | When to trigger a refill |
| `maxChunkMs` | 20 | Maximum chunk size for event batches |

Larger horizons provide more buffer for complex scheduling but increase latency.
Smaller chunks allow finer-grained priority handling but increase overhead.

## Loop Handling

The scheduler automatically handles loop boundaries:

```typescript
// Loop wrap: notes that cross boundary get note-offs
scheduler.setTransportState({
  ...state,
  looping: true,
  loopStartTick: 0,
  loopEndTick: 960 * 4, // 1 bar
});

// cancelledEvents contains note-offs for sustaining notes
const resolution = scheduler.tick();
for (const event of resolution.cancelledEvents) {
  // Send note-offs at loop boundary
}
```

## API Reference

### Scheduler

| Method | Description |
|--------|-------------|
| `start()` | Begin scheduling |
| `stop()` | Stop and clear |
| `tick()` | Process scheduling (call frequently) |
| `registerSource(source)` | Add event source |
| `setTransportState(state)` | Update from transport |

### EventQueue

| Method | Description |
|--------|-------------|
| `enqueue(event)` | Add single event |
| `enqueueBatch(events)` | Add multiple events |
| `dequeue()` | Remove earliest event |
| `getRange(start, end)` | Get events in range |
| `dequeueRange(start, end)` | Remove and return range |

### LookaheadManager

| Method | Description |
|--------|-------------|
| `calculateWindow(tick, sample)` | Get lookahead window |
| `needsRefill(last, current)` | Check if refill needed |
| `chunkRange(start, end)` | Split into chunks |

## Architecture

```
Transport State
      ↓
LookaheadManager (120ms horizon)
      ↓
Event Sources → EventQueue
      ↓
Chunks (20ms max) → AudioWorklet
      ↓
RenderScheduler (128-sample blocks)
      ↓
Sample-accurate triggers
```

## License

MIT
