# @daw/warping

Advanced audio warping and time-stretching system matching Ableton Live's capabilities.

## Features

### Warp Modes

- **Beats**: Preserve transients with granular synthesis
- **Tones**: Phase vocoder for monophonic pitched material
- **Texture**: Granular synthesis with flux for polyphonic material
- **Re-Pitch**: Classic varispeed (speed = pitch change)
- **Complex**: High-quality phase vocoder for complex mixes
- **Complex Pro**: Maximum quality with CPU-intensive processing
- **Slice**: Slice at transients, play chromatically
- **Stutter**: Repeating micro-slices for glitch effects

### Additional Features

- Transient detection with onset detection
- Automatic beat grid detection
- Warp marker management
- Formant preservation
- Envelope preservation
- Real-time processing support

## Installation

```bash
pnpm add @daw/warping
```

## Usage

### Basic Warping

```typescript
import { createWarpEngine, createTransientDetector } from '@daw/warping';

// Create warp engine
const warper = createWarpEngine({
  mode: 'complex',
  originalTempo: 120,
  targetTempo: 128,
});

// Analyze audio for transients
const detector = createTransientDetector();
const analysis = detector.detect(audioBuffer);

// Apply transients
warper.setTransients(analysis.transients);

// Process audio
const output = [
  new Float32Array(input.length),
  new Float32Array(input.length),
];
warper.process(input, output);
```

### Warp Markers

```typescript
import { createWarpMarkerManager } from '@daw/warping';

const manager = createWarpMarkerManager();

// Add markers
manager.addMarker(0, 0); // sample 0 = beat 0
manager.addMarker(44100, 1); // sample 44100 = beat 1

// Convert between samples and beats
const beat = manager.sampleToBeat(22050); // 0.5
const sample = manager.beatToSample(1); // 44100

// Auto-warp
manager.autoWarp(audioBuffer, 128); // 128 BPM
```

### Mode-Specific Processing

```typescript
import { 
  createBeatsProcessor,
  createTonesProcessor,
  createComplexProcessor 
} from '@daw/warping';

// Beats mode
const beats = createBeatsProcessor({
  preserve: 'transients',
  loop: 'off',
  envelope: 50,
}, sampleRate);

// Tones mode
const tones = createTonesProcessor({
  grainSize: 75,
}, sampleRate);

// Complex mode
const complex = createComplexProcessor({
  formantPreserve: true,
  envelopePreserve: true,
}, sampleRate);
```

### Slicing Mode

```typescript
import { createSlicingEngine, createChromaticSampler } from '@daw/warping';

const slicer = createSlicingEngine();

// Auto-slice at transients
const slices = slicer.autoSlice(audioBuffer, { 
  preserve: 'transients',
  playback: 'mono',
});

// Create chromatic sampler
const sampler = createChromaticSampler(audioBuffer, slices);

// Trigger slices by MIDI note
sampler.trigger(36, 127); // C2, full velocity
sampler.trigger(37, 100); // C#2

// Render audio
const output = [new Float32Array(512), new Float32Array(512)];
sampler.render(output, 512);
```

## API Reference

### createWarpEngine(options)

Create the main warp engine.

**Options:**
- `mode`: Warp mode ('beats', 'tones', 'texture', 're-pitch', 'complex', 'complex-pro', 'slice', 'stutter')
- `originalTempo`: Original tempo of the audio
- `targetTempo`: Target tempo for playback
- `detune`: Pitch shift in cents
- `sampleRate`: Audio sample rate

### createTransientDetector(options)

Detect transients and beats in audio.

**Options:**
- `sensitivity`: Detection sensitivity (0-1)
- `threshold`: Energy threshold (0-1)
- `minGapMs`: Minimum gap between transients in ms
- `sampleRate`: Audio sample rate

### createWarpMarkerManager()

Manage warp markers for time alignment.

**Methods:**
- `addMarker(samplePosition, beatPosition)`
- `removeMarker(id)`
- `moveMarker(id, samplePosition, beatPosition)`
- `sampleToBeat(samplePosition)`
- `beatToSample(beatPosition)`
- `autoWarp(audio, tempo)`

## Architecture

The warping system uses several algorithms:

- **Phase Vocoder**: STFT-based time-stretching for high quality
- **Granular Synthesis**: For beat preservation and texture effects
- **Onset Detection**: Spectral flux and energy-based transient detection
- **Warp Markers**: Time-warping function for non-linear time mapping

## Performance

- Real-time processing supported for most modes
- Complex Pro mode is CPU-intensive and may need offline rendering
- Slice mode creates minimal overhead after initial analysis

## License

MIT
