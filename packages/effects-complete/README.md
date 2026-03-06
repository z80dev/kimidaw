# Effects Complete - Ableton-style Audio Effects Suite

A comprehensive collection of professional audio effects for the In-Browser DAW, modeled after Ableton Live's device suite.

## Overview

This package provides 24 high-quality audio effects organized into categories:

- **EQ & Filtering** (2 effects)
- **Dynamics** (4 effects)
- **Delay & Reverb** (3 effects)
- **Distortion & Saturation** (6 effects)
- **Modulation** (3 effects)
- **Special** (6 effects)

## Installation

```bash
pnpm add @daw/effects-complete
```

## Usage

```typescript
import { 
  createEQEightDefinition,
  getAllEffectDefinitions 
} from "@daw/effects-complete";

// Register all effects
const effects = getAllEffectDefinitions();
for (const effect of effects) {
  pluginRegistry.register(effect);
}

// Or register individual effects
const eq8 = createEQEightDefinition();
pluginRegistry.register(eq8);
```

## DSP Architecture

### Realtime-Safe Design

All effects are designed for real-time audio processing with the following constraints:

- **No allocations in process()**: All memory is pre-allocated during `prepare()`
- **No locks**: Lock-free data structures for parameter changes
- **Deterministic CPU usage**: O(1) or O(n) algorithms with fixed bounds
- **No exceptions**: All error handling uses return codes or bounded behavior

### Parameter System

Parameters use the `@daw/plugin-api` parameter system with:

- **Normalized values**: 0-1 range for all parameters internally
- **Smoothing**: One-pole smoothing for artifact-free parameter changes
- **Type safety**: TypeScript interfaces for all parameter specs
- **Serialization**: Full state save/restore support

### Processing Structure

Each effect follows a standard pattern:

```typescript
class EffectInstance implements PluginInstanceRuntime {
  // Parameter management
  private _params: ParameterMap;
  
  // DSP state
  private _filters: BiquadFilter[];
  private _delayLines: DelayLine[];
  
  // Metering
  private _meters: { level: number; gr: number };
  
  process(inputs, outputs, midi, blockSize): void {
    // 1. Process parameter smoothing
    this._params.processSmoothing();
    
    // 2. Get parameter values
    const gain = this._params.get("gain")?.value ?? 1;
    
    // 3. Process audio block
    for (let i = 0; i < blockSize; i++) {
      // Sample-accurate processing
    }
  }
}
```

## Effect Categories

### EQ & Filtering

#### EQ Eight
8-band parametric EQ with Ableton-style features:
- Per-band: Type (48/12dB LP/HP, Bell, Notch, Shelf), Frequency, Gain, Q
- Global modes: Stereo, L/R (independent), M/S (mid/side)
- Spectrum display data output for visualization
- Uses BiquadFilter for each band

#### Auto Filter
Envelope/LFO controlled filter:
- Filter types: LP, BP, HP, Notch, Morph
- 6 LFO waveforms with rate and amount
- Envelope follower with attack/release
- Sidechain input for external modulation
- MIDI CC control support

### Dynamics

#### Glue Compressor
SSL-style bus compressor:
- Soft knee characteristic
- Ratios: 2:1, 4:1, 10:1
- Peak/RMS detection modes
- Sidechain EQ filtering
- Range limiting

#### Multiband Dynamics
3-band compressor/expander:
- Adjustable crossover frequencies
- Per-band: Upward/downward compression/expansion
- Independent thresholds, ratios, attack, release
- Solo bands for monitoring
- Lookahead option

#### Limiter
Professional brickwall limiter:
- Adjustable ceiling and gain
- Lookahead detection (up to 20ms)
- True peak detection simulation
- LUFS metering output
- Program-dependent release

#### Gate
Noise gate with advanced features:
- Threshold and return (hysteresis)
- Attack, hold, release controls
- Floor amount (attenuation when closed)
- Sidechain input with key filtering

### Delay & Reverb

#### Grain Delay
Granular delay effect:
- Delay time with sync option
- Spray (random grain position)
- Pitch shifting with frequency control
- Random pitch variation

#### Beat Repeat
Glitch/stutter effect:
- Interval and offset controls
- Grid size selection (1/16, 1/8, etc.)
- Variation and chance parameters
- Pitch decay modes
- Infinite repeat option

#### Echo
Stereo delay with advanced features:
- 2 independent delay lines
- Feedback path reverb
- Modulation with LFO
- Ducking based on input level
- Stereo width control

### Distortion & Saturation

#### Saturator
Multi-mode waveshaper:
- 6 modes: Analog Clip, Soft Sine, Medium Curve, Hard Curve, Sinoid Fold, Digital Clip
- Drive, Base, Frequency, Width, Depth parameters
- DC filter option
- Color (tilt EQ)

#### Overdrive
Guitar-style overdrive:
- Drive control
- Tone (lowpass filter)
- Dynamics (input sensitivity)
- Asymmetric distortion

#### Erosion
Degradation effect:
- Modes: Noise, Sine, Wide
- Frequency control
- Amount and width

#### Redux
Bitcrusher and sample rate reducer:
- Downsample control
- Bit depth reduction
- Linear interpolation option

#### Vinyl Distortion
Turntable emulation:
- Tracing model (bass distortion)
- Pinch effect (stereo 2nd harmonic)
- Crackle generator
- Wow and Flutter simulation

#### Dynamic Tube
Tube saturation:
- 3 tube types (Triode, Pentode, Special)
- Drive, Tone, Bias controls
- Dynamic response

### Modulation

#### Chorus-Ensemble
Advanced chorus:
- Modes: Classic, Ensemble (3 voices), Vibrato
- Amount, Rate, Delay, Feedback, Spread
- High pass filter option

#### Flanger
Tape-style flanging:
- Variable delay with feedback
- LFO modulation
- Phase invert option
- Envelope amount for dynamic flanging

#### Phaser-Flanger
Combined effect:
- 4/8/12 allpass stages
- Frequency, Feedback, Color controls
- LFO with spin (different rates per channel)
- Envelope amount

### Special

#### Spectrum
FFT spectrum analyzer:
- Configurable block size
- Average time control
- Linear/Log scale
- Peak frequency detection

#### Tuner
Pitch detection:
- YIN and Autocorrelation algorithms
- Adjustable reference frequency
- Cents deviation display
- Confidence meter

#### Utility
Essential tools:
- Gain and Balance (with pan law selection)
- Mute and Phase invert
- Stereo width (M/S processing)
- Bass Mono frequency
- DC filter
- L/R swap

#### Resonators
5 parallel modal resonators:
- Note/Course/Fine tuning per resonator
- Decay, Color, Width, Blend controls
- HP/LP/BP mode selection
- MIDI pitch tracking

#### Corpus
Physical modeling resonator:
- 7 resonator types (Beam, Marimba, String, Membrane, Plate, Pipe, Tube)
- MIDI pitch tracking
- Decay and Listen controls
- Material and radius parameters
- Quality settings (Basic/Medium/High)

#### Cabinet
Guitar cabinet emulation:
- 4 mic types (Dynamic 57/421, Condenser 414, Ribbon 121)
- 8 cabinet models (1x12, 2x12, 4x12, Bass cabs, Acoustic)
- Distance and angle control
- Position on cone
- Low/High cut filters

## Core DSP Primitives

### Filters
- **BiquadFilter**: Standard biquad for EQ, shelving, allpass
- **StateVariableFilter**: 12dB/octave SVF for modulated filters
- **CascadedSVF**: 24dB/octave for steep slopes
- **LinkwitzRileyCrossover**: Perfect reconstruction crossover

### Delay
- **DelayLine**: Fractional delay with linear/cubic interpolation
- **AllpassFilter**: For reverb and phaser networks

### Modulation
- **LFO**: Low-frequency oscillator with multiple waveforms
- **EnvelopeFollower**: Attack/release envelope detection

### Utilities
- **SmoothedParameter**: One-pole parameter smoothing
- **DCFilter**: DC blocking filter
- **RMSDetector**: RMS level detection

## Performance Considerations

### Sample Rate Independence
All effects support variable sample rates and update internal coefficients when the sample rate changes.

### Block Processing
Effects process audio in blocks (typically 128-512 samples) for cache efficiency and consistent CPU usage.

### SIMD Considerations
While not currently using SIMD, the code structure allows for future optimization with WebAssembly SIMD or AudioWorklet processors.

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- src/__tests__/EQEight.test.ts
```

## License

MIT
