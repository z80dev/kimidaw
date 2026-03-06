# @daw/plugin-api

Plugin API and contracts for the In-Browser DAW. This package defines the interface between the host DAW and all plugins (instruments, effects, MIDI processors, and analyzers).

## Overview

The plugin API is designed to be:

- **Realtime-safe**: No allocations in the audio processing path
- **Type-safe**: Full TypeScript support with comprehensive interfaces
- **Versioned**: State serialization with migration support
- **Extensible**: Support for WAM (Web Audio Modules) compatibility

## Installation

```bash
pnpm add @daw/plugin-api
```

## Core Concepts

### Plugin Definition

A plugin is defined by implementing the `PluginDefinition` interface:

```typescript
import { PluginDefinition } from "@daw/plugin-api";

const mySynth: PluginDefinition = {
  id: "com.example.synth",
  name: "Example Synth",
  category: "instrument",
  version: "1.0.0",
  vendor: "Example Corp",
  parameters: [
    {
      id: "cutoff",
      name: "Cutoff",
      kind: "float",
      min: 20,
      max: 20000,
      defaultValue: 0.5,
      unit: "Hz",
      automationRate: "a-rate",
    },
  ],
  ui: { type: "generic" },
  audioInputs: 0,
  audioOutputs: 2,
  midiInputs: 1,
  midiOutputs: 0,
  async createInstance(ctx) {
    // Return a PluginInstanceRuntime
  },
};
```

### Parameters

Parameters support multiple types and scaling:

```typescript
import { 
  createParameter, 
  createLinearConverter,
  createLogConverter,
  createFrequencyConverter,
} from "@daw/plugin-api";

// Linear parameter (0-100%)
const gain = createParameter({
  id: "gain",
  name: "Gain",
  kind: "float",
  min: 0,
  max: 100,
  defaultValue: 0.75,
  unit: "%",
});

// Logarithmic frequency parameter (20Hz - 20kHz)
const cutoff = createParameter({
  id: "cutoff",
  name: "Cutoff",
  kind: "float",
  min: 20,
  max: 20000,
  defaultValue: 0.5,
  unit: "Hz",
});

// Parameter value conversions
console.log(cutoff.value);           // Denormalized value (~632Hz)
console.log(cutoff.normalizedValue); // Normalized value (0.5)
console.log(cutoff.toString());      // Formatted string ("632.46Hz")
```

### Parameter Smoothing

Smooth parameter changes to avoid clicks and zipper noise:

```typescript
// Set target with 10ms smoothing time constant
param.setTarget(newValue, 10, sampleRate);

// In process() loop, call for each sample or block
param.processSmoothing();
```

### State Serialization

Plugins must support state serialization for project save/load and presets:

```typescript
import { 
  StateSerializerImpl,
  createSerializedState,
} from "@daw/plugin-api";

const serializer = new StateSerializerImpl();

// Save state
const state = {
  parameters: paramMap.getNormalizedValues(),
  custom: { /* plugin-specific state */ },
};
const serialized = serializer.serialize(state);

// Load state
const loaded = serializer.deserialize(savedData, pluginDefinition);
paramMap.setNormalizedValues(loaded.parameters);
```

### State Migrations

Handle state format changes across plugin versions:

```typescript
import { globalMigrationRegistry } from "@daw/plugin-api";

globalMigrationRegistry.register("com.example.synth", {
  toVersion: 2,
  migrate: (state, fromVersion) => {
    // Transform fromVersion to version 2
    return { ...state, newField: defaultValue };
  },
});
```

### Realtime-Safe Parameter Changes

Use the parameter change queue for sample-accurate automation:

```typescript
import { ParameterChangeQueueImpl } from "@daw/plugin-api";

const queue = new ParameterChangeQueueImpl(256);

// From main thread or scheduler
queue.enqueue("cutoff", 0.75, sampleOffset);

// In AudioWorklet process()
queue.processBlock(blockSize, (paramId, value, offset) => {
  params.get(paramId)!.setNormalized(value);
});
```

## API Reference

### Types

- `PluginDefinition` - Complete plugin specification
- `PluginInstanceRuntime` - Runtime instance interface
- `PluginParameterSpec` - Parameter specification
- `PluginHostContext` - Host-provided context
- `MidiEvent` - MIDI event structure
- `AudioBuffer` - Audio buffer abstraction

### Parameter System

- `createParameter(spec)` - Create a parameter instance
- `createParameterMap(specs)` - Create a parameter collection
- `createLinearConverter(min, max)` - Linear scaling
- `createLogConverter(min, max)` - Logarithmic scaling (for frequency)
- `createExpConverter(min, max)` - Exponential scaling (for time)
- `createFrequencyConverter()` - Frequency converter preset
- `createDbConverter()` - Decibel converter preset
- `ParameterChangeQueueImpl` - Realtime-safe parameter queue
- `ModulationMatrixImpl` - Modulation routing

### State Management

- `StateSerializerImpl` - State serialization/deserialization
- `MigrationRegistryImpl` - Version migration management
- `JsonStateCompressor` - JSON-based compression
- `StateDifferImpl` - State diff/patch
- `createSerializedState()` - Helper for creating states

### Utilities

- `midiToFrequency(note)` - Convert MIDI note to Hz
- `frequencyToMidi(freq)` - Convert Hz to MIDI note
- `dbToGain(db)` - Convert dB to linear gain
- `gainToDb(gain)` - Convert linear gain to dB
- `clampNormalized(v)` - Clamp to [0, 1]
- `mapRange(v, inMin, inMax, outMin, outMax)` - Map between ranges

## Architecture

### Plugin Lifecycle

1. **Definition**: Plugin exports a `PluginDefinition`
2. **Instantiation**: Host calls `createInstance(ctx)` 
3. **Connection**: Host calls `connect(graph)` with audio/MIDI nodes
4. **Processing**: Host calls `process()` for each audio block
5. **State**: Host calls `saveState()` / `loadState()` for serialization
6. **Disposal**: Host calls `dispose()` for cleanup

### Realtime Safety

All code in `process()` must follow these rules:

- ✅ Pre-allocated buffers only
- ✅ No `new`, `malloc`, or dynamic allocation
- ✅ No closures capturing changing variables
- ✅ Fixed-size loops only
- ✅ No exceptions for control flow
- ✅ No network or file I/O
- ❌ No `console.log`
- ❌ No JSON parsing/stringifying
- ❌ No object property deletion

### Parameter Smoothing

The default smoothing is one-pole exponential:

```
y[n] = y[n-1] + (target - y[n-1]) * coeff
where coeff = 1 - exp(-1 / (τ * sampleRate))
```

Set `τ` (time constant in seconds) based on the parameter type:
- Filter cutoff: 5-20ms
- Amplitude/gain: 1-5ms
- LFO rate: 50-100ms (or no smoothing)

## WAM Compatibility

The API includes types for WAM (Web Audio Modules) compatibility:

```typescript
import { WamDescriptor, WamPlugin, WamInstance } from "@daw/plugin-api";
```

A WAM adapter can wrap WAM plugins to conform to the DAW's plugin interface.

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Type checking
pnpm typecheck
```

## License

MIT
