# @daw/audio-to-midi

Audio-to-MIDI conversion for the In-Browser DAW. Convert audio recordings to MIDI notes like Ableton's audio-to-MIDI features.

## Features

- **Drums to MIDI** - Detect drum hits and create MIDI notes with drum class detection
- **Melody to MIDI** - Monophonic pitch tracking using YIN algorithm
- **Harmony to MIDI** - Polyphonic chord detection and transcription

## Installation

```bash
pnpm add @daw/audio-to-midi
```

## Usage

```typescript
import { AudioToMidiConverter } from '@daw/audio-to-midi';

// Create converter
const converter = new AudioToMidiConverter(44100, {
  mode: 'melody',
  sensitivity: 50,
  quantizeToGrid: true
});

// Convert audio buffer
const result = await converter.convert(audioBuffer, (progress) => {
  console.log(`${progress.stage}: ${progress.progress}%`);
});

console.log(`Detected ${result.notes.length} notes`);

// Export to MIDI clip
const midiNotes = result.notes.map(n => ({
  pitch: n.midiNote,
  velocity: n.velocity,
  startTick: Math.floor(n.startTime * 960),
  durationTicks: Math.floor(n.duration * 960)
}));
```

## Modes

### Drums
Detects drum hits using spectral flux onset detection:

```typescript
const converter = new AudioToMidiConverter(44100, {
  mode: 'drums',
  sensitivity: 50,
  minDurationMs: 50
});
```

Detected drum classes:
- Kick, Snare, Hi-hat (closed/open), Toms, Crash, Ride, Clap, Rim

### Melody
Uses YIN algorithm for monophonic pitch tracking:

```typescript
const converter = new AudioToMidiConverter(44100, {
  mode: 'melody',
  minDurationMs: 100
});
```

### Harmony
Chord detection using chromagram analysis:

```typescript
const converter = new AudioToMidiConverter(44100, {
  mode: 'harmony',
  maxPolyphony: 4
});
```

Supported chords: major, minor, 7th, suspended, diminished, augmented

## API

### `AudioToMidiConverter`

Main class for audio-to-MIDI conversion.

#### Constructor

```typescript
new AudioToMidiConverter(sampleRate: number, options?: Partial<ConversionOptions>)
```

#### Methods

- `convert(audioData, onProgress?)` - Convert audio to MIDI
- `analyze(audioData)` - Analyze audio and suggest best mode
- `setMode(mode)` - Change conversion mode
- `setOptions(options)` - Update conversion options

### Individual Detectors

For advanced use cases, use the individual detectors:

```typescript
import { DrumDetector, MelodyDetector, HarmonyDetector } from '@daw/audio-to-midi';

// Drum detection
const drumDetector = new DrumDetector(44100, options);
const drums = drumDetector.detect(audioBuffer);

// Melody detection
const melodyDetector = new MelodyDetector(44100, options);
const melody = melodyDetector.detect(audioBuffer);

// Harmony detection
const harmonyDetector = new HarmonyDetector(44100, options);
const harmony = harmonyDetector.detect(audioBuffer);
```

## Algorithm Details

### Drum Detection
- Spectral flux for onset detection
- Frequency band analysis for drum classification
- Adaptive threshold for varying dynamics

### Melody Detection
- YIN algorithm for pitch tracking
- Autocorrelation-based fundamental frequency estimation
- Parabolic interpolation for sub-sample precision

### Harmony Detection
- Chromagram (12-bin pitch class profile)
- Template matching for chord identification
- Polyphonic analysis for multiple simultaneous notes

## Browser Compatibility

Requires Web Audio API support. Uses TypedArrays for efficient audio processing.
