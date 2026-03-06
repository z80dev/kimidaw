# Agent Development Guide

This document provides guidance for AI agents working on the In-Browser DAW codebase.

## Architecture Overview

The DAW follows a layered architecture:

1. **UI Layer** (`packages/ui-*`) - React components, canvas renderers
2. **Domain Layer** (`packages/project-schema`) - Immutable data models
3. **Command Layer** (`packages/storage`) - Event sourcing, undo/redo
4. **Engine Layer** (`packages/engine-*`) - Audio scheduling, transport
5. **DSP Layer** (`packages/dsp-*`) - Synthesis, effects, AudioWorklets
6. **I/O Layer** (`packages/midi`, `import-export`) - File handling, MIDI

## Key Principles

### 1. Audio Clock is Truth

All timing derives from the Web Audio API clock. Never use `Date.now()` or `performance.now()` for musical timing.

```typescript
// ✅ Good - Use audio context time
const currentTime = audioContext.currentTime;

// ❌ Bad - Wall clock time
const currentTime = Date.now() / 1000;
```

### 2. Realtime Safety

AudioWorklet code must follow strict rules:

- No memory allocations in `process()`
- No dynamic object creation
- No closures in hot paths
- Use pre-allocated typed arrays

```typescript
// ✅ Good - Pre-allocated
class MyProcessor extends AudioWorkletProcessor {
  private buffer = new Float32Array(128);
  
  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const output = outputs[0][0];
    for (let i = 0; i < 128; i++) {
      output[i] = this.buffer[i]; // No allocation
    }
    return true;
  }
}
```

### 3. Determinism

Scripts must produce identical output from the same seed:

```typescript
// ✅ Good - Seeded PRNG
const rng = ctx.rand('my-seed');
const value = rng.next(); // Always same for same seed

// ❌ Bad - Non-deterministic
const value = Math.random();
```

### 4. Worker Boundaries

Heavy work belongs in workers:

| Main Thread | Workers |
|-------------|---------|
| User input | Audio decode |
| Selection | Waveform peaks |
| Command dispatch | Script execution |
| Visual updates | Export render |

### 5. State Management

Use command-based event sourcing:

```typescript
// ✅ Good - Emit command
const command: Command = {
  id: generateId(),
  type: 'clip.create',
  timestamp: now(),
  payload: { trackId, startTick, duration },
  actor: 'user'
};

store.dispatch(command);
```

## Package Guidelines

### Adding to `project-schema`

1. Define interface in TypeScript
2. Create Zod schema for validation
3. Add migration if changing existing types
4. Export from `index.ts`

### Adding to `dsp-builtins`

1. Implement `PluginDefinition` interface
2. Create parameter specs with ranges
3. Support state serialization
4. Create AudioWorklet processor
5. Add golden tests

### Adding to UI packages

1. Use canvas for heavy rendering (timeline, piano roll)
2. Keep React for chrome/shell only
3. Virtualize large lists
4. Support keyboard navigation

## Testing Guidelines

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('Timing', () => {
  it('converts ticks to samples', () => {
    const result = ticksToSamples(960, { sampleRate: 48000, bpm: 120 });
    expect(result).toBe(24000); // 1 beat at 120bpm = 0.5s = 24000 samples
  });
});
```

### Audio Golden Tests

```typescript
it('renders sine wave correctly', async () => {
  const offline = new OfflineAudioContext(1, 48000, 48000);
  const osc = new OscillatorNode(offline);
  osc.connect(offline.destination);
  osc.start();
  
  const buffer = await offline.startRendering();
  const result = buffer.getChannelData(0);
  
  // Compare against reference
  expect(compareToReference(result, 'sine-440hz')).toBeCloseTo(0, 5);
});
```

## Common Patterns

### Ring Buffer Communication

```typescript
// Main thread
const sab = new SharedArrayBuffer(1024 * 4);
const ringBuffer = new SabRingBuffer(sab);
ringBuffer.write(events);
worklet.port.postMessage({ type: 'events', sab }, [sab]);

// Worklet
this.port.onmessage = (e) => {
  if (e.data.type === 'events') {
    this.ringBuffer = new SabRingBuffer(e.data.sab);
  }
};
```

### Capability Detection

```typescript
const capabilities = detectCapabilities();

if (capabilities.audioWorklet) {
  // Use AudioWorklet
} else {
  // Fallback or error
}
```

### Script Execution

```typescript
const result = await executeScript({
  source: scriptCode,
  seed: 'deterministic-seed',
  projectId: project.id
});

// Apply generated clips
for (const clip of result.clips) {
  store.dispatch(createClipCommand(clip));
}
```

## Debugging

### Audio Issues

1. Check capability matrix in diagnostics panel
2. Verify COOP/COEP headers are set
3. Look for worklet errors in console
4. Check scheduler queue fill in diagnostics

### Performance Issues

1. Use Chrome DevTools Performance tab
2. Look for long tasks (>50ms)
3. Check for main thread audio decode
4. Verify canvas virtualization is working

### Script Issues

1. Check determinism validator output
2. Verify seed is being used
3. Look for Math.random() or Date.now()
4. Check worker console for errors

## Resources

- [Web Audio API Spec](https://webaudio.github.io/web-audio-api/)
- [AudioWorklet Spec](https://webaudio.github.io/web-audio-api/#AudioWorklet)
- [WAM Specification](https://github.com/WebAudioModules/wam-spec/)
- [Engineering Spec](./in_browser_daw_engineering_spec.md)
