# Tension - String Physical Modeling

Physical modeling string instrument with bow, hammer, and plectrum excitation.

## Overview

Tension implements waveguide synthesis for realistic string instruments:

- **Bidirectional delay lines** - Wave propagation simulation
- **Multiple excitation types** - Bow, hammer, bouncing hammer, plectrum
- **Body resonance** - Guitar, violin, cello, piano body models
- **Variable damping** - Position-dependent dampers
- **Real-time control** - Continuous bowing support

## Physical Model

### Waveguide String

The string is modeled using two delay lines representing waves traveling in opposite directions:

```
Excitation ──▶ [Forward Delay] ──▶ Bridge Filter ──▶ [Backward Delay] ──▶ Nut Filter ──┐
    ▲                                                                                    │
    └──────────────────────────────────────┴─────────────────────────────────────────────┘
```

### Excitation Types

| Type | Description |
|------|-------------|
| **Bow** | Continuous friction-based excitation with stick-slip behavior |
| **Hammer** | Single impulse strike like a piano |
| **Hammer (bouncing)** | Multiple impacts like a bouncing mallet |
| **Plectrum** | Snap action like a guitar pick |

### Bow Model

The bow uses a friction curve model:
- **Force** - Bow pressure on string
- **Friction** - Coefficient affecting stick-slip
- **Velocity** - Bow speed across string
- Real-time continuous control

### Body Resonance

Simulated instrument bodies:

| Body | Frequency Range | Decay |
|------|----------------|-------|
| Guitar | 80-200 Hz | Medium |
| Violin | 250-400 Hz | Fast |
| Cello | 60-150 Hz | Medium-Slow |
| Piano | 70-250 Hz | Slow |

## Usage

```typescript
import { TensionInstrument, bowPreset, hammerPreset, plectrumPreset } from '@daw/instruments-tension';

const tension = new TensionInstrument({ audioContext });
await tension.load();

tension.getOutputNode().connect(audioContext.destination);

// Select excitation preset
tension.setPreset('bow');    // Violin-style bowing
tension.setPreset('hammer'); // Piano-style
tension.setPreset('plectrum'); // Guitar-style pluck

// Bow requires continuous notes
tension.noteOn(60, 100);
// ... hold for bowed sound ...
tension.noteOff(60);
```

## Architecture

```
Excitation ──▶ String ──▶ Damper ──▶ Pickup ──▶ Filter ──▶ Body ──▶ Output
  │            (Waveguide)            (Position)         (Resonance)
  │
  ▼
[Friction/    
 Hammer/      
 Plectrum]
```

## API Reference

### Presets

```typescript
bowPreset      // Violin-style sustained
hammerPreset   // Piano-style percussive
plectrumPreset // Guitar-style plucked
```

### State

```typescript
interface TensionState {
  excitator: {
    type: 'bow' | 'hammer' | 'hammer-bounce' | 'plectrum';
    force: number;
    friction: number;
    velocity: number;
    position: number;    // Excitation position on string
    mass: number;
    stiffness: number;
    damping: number;
  };
  string: {
    decay: number;
    ratio: number;
    inharmonics: number; // Stiffness effect
    damping: number;     // High freq damping
    tension: number;
    tone: number;
  };
  termination: {
    pickupPosition: number;
    nutReflection: number;
    bridgeReflection: number;
  };
  damper: DamperParams;
  filter: FilterParams;
  body: BodyParams;
  global: GlobalParams;
}
```

## Performance

- Polyphony: 1-16 voices
- Bow mode uses continuous processing
- Waveguide buffer: Variable (frequency-dependent)
- Body modes: 5 parallel resonators

## References

- Karplus-Strong string synthesis
- Digital waveguide modeling (Julius O. Smith)
- Bowed string friction models (McIntyre et al.)
