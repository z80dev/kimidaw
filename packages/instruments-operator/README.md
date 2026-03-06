# Operator FM Synthesizer

Ableton-style 8-operator FM synthesizer for the In-Browser DAW.

## Overview

Operator is a powerful FM (Frequency Modulation) synthesizer inspired by Ableton Live's Operator instrument. It features 8 operators with independent envelopes and waveforms, 11 FM algorithms, and comprehensive sound design capabilities.

## Features

- **8 Operators**: Each with independent envelope, waveform, and frequency ratio
- **11 FM Algorithms**: Including DX7-style configurations and extended layouts
- **Multiple Waveforms**: Sine, saw, square, triangle, pulse, and noise
- **Filter Section**: Multimode filter (LP, HP, BP, Notch, Morph) with envelope
- **LFO Modulation**: For filter, pitch, and level modulation
- **Pitch Envelope**: For percussive attacks and effects
- **Glide/Portamento**: Smooth note transitions
- **Unison/Spread**: Stereo widening and detuning

## Installation

```bash
pnpm add @daw/instruments-operator
```

## Usage

### Basic Usage

```typescript
import { createOperatorDefinition } from "@daw/instruments-operator";

// Create plugin definition
const definition = createOperatorDefinition();

// Create instance in host context
const instance = await definition.createInstance({
  sampleRate: 48000,
  maxBlockSize: 128,
  tempo: 120,
  // ... other context
});

// Process audio
instance.process(inputs, outputs, midiEvents, blockSize);
```

### Parameter Control

```typescript
// Set algorithm (0-10)
instance.setParam("algorithm", 0.7);

// Set operator levels
instance.setParam("op1Level", 0.8);
instance.setParam("op2Level", 0.5);

// Set filter
instance.setParam("filterFreq", 0.6);
instance.setParam("filterRes", 0.3);
```

## FM Algorithms

| Algorithm | Description |
|-----------|-------------|
| 0 | Serial: 1→2→3→4→5→6→7→8 |
| 1 | (1+2)→3→4→5→6→7→8 |
| 2 | 1→(2+3)→4→5→6→7→8 |
| 3 | 1→2→(3+4)→5→6→7→8 |
| 4 | Branch: (1→2→3) + (4→5→6) + (7→8) |
| 5 | Triple branch: (1→2) + (3→4) + (5→6) |
| 6 | Triple2: (1+2)→3 + (4+5)→6 |
| 7 | Star: 1→(2+3+4) |
| 8 | Star2: 1→2 + (3+4+5)→6 |
| 9 | Classic: (1+2)→3 |
| 10 | Parallel: All carriers |

## Architecture

The synthesizer consists of:

- **FMOperator**: Individual operator with envelope and waveform
- **FMVoice**: Polyphonic voice containing 8 operators
- **VoiceAllocator**: Voice management with stealing
- **Filter**: Resonant multimode filter
- **LFO**: Low frequency oscillator for modulation

## AudioWorklet Support

For realtime processing, use the AudioWorklet processor:

```typescript
await audioContext.audioWorklet.addModule(
  "@daw/instruments-operator/worklet"
);

const workletNode = new AudioWorkletNode(
  audioContext,
  "operator-processor"
);
```

## State Serialization

```typescript
// Save state
const state = await instance.saveState();

// Load state
await instance.loadState(state);
```

## License

MIT
