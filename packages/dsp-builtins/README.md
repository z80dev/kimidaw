# @daw/dsp-builtins

Built-in instruments and effects for the In-Browser DAW. All processors are designed for realtime-safe operation in AudioWorklet environments.

## Overview

This package provides professional-grade DSP processors:

### Instruments
- **Sampler** - Multi-zone sample player with envelopes and filter
- **Drum Rack** - 16-pad drum sampler with choke groups
- **Subtractive Synth** - Classic analog-style synthesizer
- **Wavetable Synth** - Wavetable-based synthesizer (MVP)
- **FM Synth** - 4-operator FM synthesizer (MVP)

### Effects
- **EQ** - 4-band parametric equalizer
- **Compressor** - Stereo compressor with RMS/peak detection
- **Limiter** - Brick-wall limiter with lookahead
- **Delay** - Stereo delay with modulation
- **Reverb** - Schroeder-style algorithmic reverb
- **Filter** - Multimode filter with LFO/envelope modulation
- **Chorus** - Multi-voice chorus effect

## Installation

```bash
pnpm add @daw/dsp-builtins
```

## Usage

### Creating an Instrument

```typescript
import { createSubtractiveSynthDefinition } from "@daw/dsp-builtins";
import type { PluginHostContext } from "@daw/plugin-api";

const context: PluginHostContext = {
  sampleRate: 48000,
  maxBlockSize: 128,
  // ... other context properties
};

const synth = await createSubtractiveSynthDefinition().createInstance(context);

// Connect to audio graph
synth.connect({
  audioInputs: [],
  audioOutputs: [destinationNode],
  midiInput: { onReceive: (handler) => { /* ... */ } },
});

// Process audio
const inputs: AudioBuffer[] = [];
const outputs: AudioBuffer[] = [outputBuffer];
const midi: MidiEvent[] = [];
synth.process(inputs, outputs, midi, 128);
```

### Creating an Effect

```typescript
import { createReverbDefinition } from "@daw/dsp-builtins";

const reverb = await createReverbDefinition().createInstance(context);
reverb.prepare({ sampleRate: 48000, blockSize: 128 });

// Process audio
reverb.process(inputBuffers, outputBuffers, [], blockSize);
```

### Using the Sampler

```typescript
import { SamplerInstance, ZoneMap } from "@daw/dsp-builtins";

const sampler = new SamplerInstance(32, 128);

// Create zone map
const zoneMap = new ZoneMap();
zoneMap.autoMap(
  ["sample1", "sample2", "sample3"],
  [48, 60, 72], // root notes
  { velocityLayers: 2 }
);

sampler.zoneMap.import(zoneMap.export());
await sampler.loadZoneSamples();
```

### Using the Drum Rack

```typescript
import { DrumRackInstance } from "@daw/dsp-builtins";

const drumRack = new DrumRackInstance(16, 128);

// Load sample onto a pad (note 36 = C1, typically kick)
await drumRack.loadSampleOnPad(36, "kick.wav", {
  gainDb: 0,
  pan: 0,
  tuneCents: 0,
});

// Set choke group for hi-hats
const pad = drumRack.getPad(42); // F#1, typically closed hat
drumRack.setPadChokeGroup(42, 1);
drumRack.setPadChokeGroup(46, 1); // open hat in same group

// Trigger from code
drumRack.triggerPad(36, 100); // Kick at velocity 100
```

## Realtime Safety

All DSP code follows these rules:

- No memory allocation in `process()`
- Pre-allocated buffers only
- No closures with changing state
- Fixed-size loops
- Minimal branching in hot paths
- Parameter smoothing for all modulations

## Architecture

### Voice-Based Instruments

Polyphonic instruments use a voice allocator pattern:

```
VoiceAllocator
  ├─ Voice 1 (active/inactive)
  ├─ Voice 2
  ├─ Voice 3
  └─ ...
```

### Effects Chain

Effects process stereo input/output:

```
Input L/R → Process → Output L/R
```

All effects support:
- Smooth parameter changes
- Bypass mode
- Proper tail time reporting

## Parameter Ranges

### Subtractive Synth
- Oscillators: Sine, Triangle, Saw, Square, Pulse
- Filter: LP/HP/BP/Notch types
- Envelopes: 1ms - 30s
- Unison: Off, 2, 4, 8 voices

### Sampler
- Multi-zone key/velocity mapping
- ADSR envelopes
- Lowpass filter with envelope
- Loop modes: Off, Forward, Ping-Pong

### Effects
- EQ: 4 bands (low shelf, 2x peak, high shelf)
- Compressor: 1:1 to 20:1 ratio, RMS/Peak modes
- Limiter: Lookahead up to 10ms
- Delay: 1ms - 4s, with feedback filter
- Reverb: Size, decay, damping control

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Type check
pnpm typecheck
```

## Performance Targets

- 128-sample buffer @ 48kHz on modern hardware
- 32+ voices for samplers
- 16+ voices for subtractive synth
- <1% CPU per effect instance

## License

MIT
