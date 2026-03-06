# Electric - Electric Piano Physical Model

Physical modeling electric piano instrument emulating Rhodes, Wurlitzer, and Pianet electric pianos.

## Overview

Electric uses waveguide synthesis and physical modeling to recreate the iconic sounds of vintage electric pianos:

- **Tine/Bar model** - Simulates vibrating metal reeds
- **Pickup simulation** - Electromagnetic and field coil pickup models
- **Hammer model** - Dynamic excitation based on velocity
- **Damper model** - String damping simulation
- **Effects** - Built-in tremolo and chorus

## Physical Model

### Piano Models

| Model | Characteristics |
|-------|-----------------|
| **Rhodes** | Bell-like, singing sustain, tine-based |
| **Wurlitzer** | Reedy, hollow tone, reed-based |
| **Pianet** | Softer attack, rubber plectrum pluck |

### Component Models

#### Tine/Bar
- Waveguide string with stiffness
- Inharmonicity control
- Variable decay times

#### Pickup
- **EM (Electromagnetic)** - Brighter, more bell-like
- **FM (Field Coil)** - Softer, more hollow
- Position and distance affect tone

#### Hammer
- Hardness affects brightness
- Velocity-sensitive force
- Mechanical noise for realism

#### Damper
- Variable engagement
- Velocity-dependent action
- Tone control for damping material

### Signal Chain

```
Hammer → Tine Resonator → Pickup → Tremolo → Chorus → Amp → Output
         (Waveguide)        (Filter)
```

## Usage

```typescript
import { ElectricInstrument, rhodesPreset, wurlitzerPreset } from '@daw/instruments-electric';

const electric = new ElectricInstrument({ audioContext });
await electric.load();

electric.getOutputNode().connect(masterGain);

// Use preset
electric.setState(rhodesPreset);

// Or select by model
electric.setModel('wurlitzer');

// Play
electric.noteOn(60, 100);
electric.noteOff(60);

// Sustain pedal
electric.sendSustain(1);
```

## API

### Presets

```typescript
import { rhodesPreset, wurlitzerPreset, pianetPreset } from '@daw/instruments-electric';
```

### State

```typescript
interface ElectricState {
  model: 'rhodes' | 'wurlitzer' | 'pianet';
  pickup: PickupParams;
  tine: TineParams;
  damper: DamperParams;
  hammer: HammerParams;
  amp: AmpParams;
  tremolo: TremoloParams;
  chorus: ChorusParams;
  global: GlobalParams;
}
```

## Technical Details

- **Waveguide length**: Variable based on pitch
- **Dispersion filters**: For inharmonicity
- **Soft clipping**: Tube-style saturation on amp
- **Stereo tremolo**: Adjustable phase offset

## Performance

- Polyphony: Up to 32 voices
- CPU: ~3-6% per voice
- Memory: <10MB total
