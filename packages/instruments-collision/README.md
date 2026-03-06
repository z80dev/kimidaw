# Collision - Physical Modeling Percussion

A mallet and membrane physics simulator for the in-browser DAW, implementing modal synthesis approximations for realtime performance.

## Overview

Collision is inspired by Ableton Live's Collision device and models percussion instruments through:
- **Modal synthesis** - Multiple resonant modes for physical bodies
- **Dual resonators** - Two independent resonators that can be linked
- **Excitation models** - Mallet impact and noise excitation
- **Real-time DSP** - Runs in AudioWorklet for glitch-free audio

## Physical Model

### Resonator Types

| Type | Description | Use Case |
|------|-------------|----------|
| `beam` | 1D vibrating bar | Xylophone, metal bars |
| `marimba` | Beam with tuned damping | Marimba, vibes |
| `string` | Stiff string | String-like percussion |
| `membrane` | 2D circular drum | Drums, congas |
| `plate` | 2D rectangular plate | Cymbals, metal sheets |
| `pipe` | Open/closed cylindrical pipe | Tubular bells, pipes |
| `tube` | Resonant tube | Didgeridoo, breathy sounds |

### Mallet Physics

The mallet model simulates an impact excitation with:
- **Stiffness** - Harder mallets produce brighter sounds
- **Color** - Spectral shaping of the impulse
- **Noise amount** - Mechanical noise mixed with impact

### Modal Synthesis

Each resonator uses 8 parallel modal filters:
```
Output = Σ(mode_gain[i] * modal_filter[i](excitation))
```

Modal frequencies follow physical relationships:
- **Beam**: fₙ = f₀ × (2n+1)²
- **String**: Nearly harmonic with stiffness
- **Membrane**: Bessel function zeros
- **Plate**: Complex 2D mode density

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Excitation │────▶│  Resonator A    │────▶│   Output     │
│  (Mallet/   │     │  (Modal Bank)   │     │   Mix        │
│   Noise)    │     └─────────────────┘     └──────────────┘
└─────────────┘              │                        ▲
       │                     │ Link                   │
       │              ┌──────▼──────────┐             │
       └─────────────▶│  Resonator B    │─────────────┘
                      │  (Modal Bank)   │
                      └─────────────────┘
```

## Installation

```bash
pnpm add @daw/instruments-collision
```

## Usage

```typescript
import { CollisionInstrument, defaultCollisionState } from '@daw/instruments-collision';

// Create and load instrument
const collision = new CollisionInstrument({ 
  audioContext 
});
await collision.load();

// Connect to audio graph
collision.getOutputNode().connect(audioContext.destination);

// Play notes
collision.noteOn(60, 100); // Middle C
collision.noteOff(60);

// Customize sound
const state = {
  ...defaultCollisionState,
  resonatorA: {
    ...defaultCollisionState.resonatorA,
    type: 'membrane',
    decay: 0.8,
    radius: 0.3
  },
  resonatorB: {
    ...defaultCollisionState.resonatorB,
    type: 'beam',
    tune: 12,
    decay: 2.0
  }
};
collision.setState(state);
```

## API Reference

### `CollisionInstrument`

#### Constructor
```typescript
new CollisionInstrument(options: {
  audioContext: AudioContext;
  initialState?: CollisionState;
  outputChannels?: number;
})
```

#### Methods

| Method | Description |
|--------|-------------|
| `load(): Promise<void>` | Initialize the AudioWorklet |
| `getOutputNode(): AudioWorkletNode` | Get audio output node |
| `noteOn(note, velocity?, offset?)` | Trigger a note |
| `noteOff(note, offset?)` | Release a note |
| `setState(state)` | Update entire state |
| `reset()` | Clear all voices |
| `dispose()` | Clean up resources |

### State Structure

```typescript
interface CollisionState {
  excitatorType: 'mallet' | 'noise';
  mallet: {
    volume: number;      // 0-1
    noiseAmount: number; // 0-1
    stiffness: number;   // 0-1
    color: number;       // 0-1
  };
  resonatorA: ResonatorParams;
  resonatorB: ResonatorParams;
  link: {
    mode: 'off' | 'a-to-b' | 'b-to-a' | 'cross';
    amount: number; // 0-1
  };
  lfo1: LfoParams;
  lfo2: LfoParams;
  filter: FilterParams;
  global: {
    spread: number;   // Stereo spread 0-1
    transpose: number; // Semitones
    voices: number;   // Polyphony
    volume: number;   // Master volume 0-1
  };
}
```

## Performance

- **Polyphony**: Configurable 1-16 voices
- **CPU usage**: ~5-10% per voice on modern hardware
- **Latency**: Sample-accurate triggering
- **Buffer size**: Works at 128 samples or higher

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test --coverage
```

## License

MIT
