# @daw/midi-effects

Ableton-style MIDI effects for in-browser DAW. These effects process MIDI data, not audio, and run in the MIDI processing chain before instruments.

## Installation

```bash
npm install @daw/midi-effects
# or
yarn add @daw/midi-effects
# or
pnpm add @daw/midi-effects
```

## Usage

### Basic Example

```typescript
import { Arpeggiator, Scale, Velocity } from "@daw/midi-effects";

// Create effects
const arp = new Arpeggiator();
const scale = new Scale();
const velocity = new Velocity();

// Configure
arp.setParameter("style", "up-down");
arp.setParameter("rate", "1/16");
scale.setParameter("scale", "minor");
velocity.setParameter("mode", "compand");

// Chain effects: MIDI in -> effects -> MIDI out
let events = inputEvents;
events = arp.process(events, currentSampleTime);
events = scale.process(events, currentSampleTime);
events = velocity.process(events, currentSampleTime);
```

### Individual Imports

```typescript
import { Arpeggiator } from "@daw/midi-effects/arpeggiator";
import { Chord } from "@daw/midi-effects/chord";
import { NoteLength } from "@daw/midi-effects/note-length";
```

## Available Effects

### Arpeggiator

Transforms held notes into rhythmic patterns.

```typescript
import { Arpeggiator } from "@daw/midi-effects";

const arp = new Arpeggiator();

// Set tempo and sample rate for timing
arp.setSampleRate(48000);
arp.setTempo(120);

// Configure
arp.setParameter("style", "up-down");        // Pattern style
arp.setParameter("rate", "1/16");            // Rate division
arp.setParameter("gate", 75);                // Gate length %
arp.setParameter("distance", 2);             // Octave range
arp.setParameter("velocityMode", "original"); // Velocity handling
arp.setParameter("hold", false);             // Sustain after release

// Styles: up, down, up-down, down-up, up-and-down, down-and-up,
//         converge, diverge, converge-and-diverge,
//         pinky-up, pinky-up-down, thumb-up, thumb-up-down,
//         random, random-other, random-once, order-played
```

### Chord

Adds additional notes to incoming notes to create chords.

```typescript
import { Chord } from "@daw/midi-effects";

const chord = new Chord();

// Enable chord notes
chord.setParameter("note0enabled", true);
chord.setParameter("note0shift", 4);      // Major third
chord.setParameter("note0velocity", 100);

chord.setParameter("note1enabled", true);
chord.setParameter("note1shift", 7);      // Perfect fifth
chord.setParameter("note1velocity", 90);

// Use preset
chord.setParameter("memoryIndex", 0);      // Major chord

// Available presets: Major, Minor, Diminished, Augmented,
//                    Sus4, Sus2, Major 7, Dominant 7, Minor 7, Power
```

### Note Length

Adjusts note durations with three modes.

```typescript
import { NoteLength } from "@daw/midi-effects";

const noteLen = new NoteLength();
noteLen.setSampleRate(48000);
noteLen.setTempo(120);

// Mode: time - fixed duration in ms
noteLen.setParameter("mode", "time");
noteLen.setParameter("timeMs", 150);

// Mode: sync - tempo-synced duration
noteLen.setParameter("mode", "sync");
noteLen.setParameter("syncRate", "1/8");

// Mode: gate - percentage of original length
noteLen.setParameter("mode", "gate");
noteLen.setParameter("gatePercent", 50);

// Release velocity option
noteLen.setParameter("releaseVelocity", true);
```

### Pitch

Transposes, filters, and quantizes note pitches.

```typescript
import { Pitch } from "@daw/midi-effects";

const pitch = new Pitch();

// Transpose
pitch.setParameter("transpose", 12);      // Up one octave
pitch.setParameter("transpose", -7);      // Down perfect fifth

// Range filter
pitch.setParameter("lowestNote", 36);     // C2
pitch.setParameter("highestNote", 84);    // C6

// Scale quantization
pitch.setParameter("quantizeToScale", true);
pitch.setParameter("scale", "minor");
pitch.setParameter("scaleRoot", "A");

// Octave range (arpeggio-like behavior)
pitch.setParameter("octaveRangeEnabled", true);
pitch.setParameter("octaveRange", 2);
pitch.setParameter("rangeMode", "alternate"); // up, down, alternate, random

// Randomize
pitch.setParameter("random", 12);         // +/- 12 semitones
```

### Random

Randomizes note pitches with controllable probability.

```typescript
import { Random } from "@daw/midi-effects";

const random = new Random();

// Probability and range
random.setParameter("chance", 75);        // 75% chance to randomize
random.setParameter("choices", 7);        // 7 possible values
random.setParameter("sign", "bi");        // +/- (add, sub, bi)

// Scale-based randomization
random.setParameter("scaleRandomize", true);
random.setParameter("scale", "pentatonic-minor");
random.setParameter("scaleRoot", "A");
```

### Scale

Quantizes notes to a selected scale.

```typescript
import { Scale } from "@daw/midi-effects";

const scale = new Scale();

// Set scale
scale.setParameter("base", "C");
scale.setParameter("scale", "major");

// Or exotic scales
scale.setParameter("scale", "hirajoshi");
scale.setParameter("scale", "phrygian-dominant");

// Transpose output
scale.setParameter("transpose", 12);

// Fold out-of-scale notes (mirror instead of quantize)
scale.setParameter("fold", true);

// Octave range
scale.setParameter("octaveRangeEnabled", true);
scale.setParameter("octaveRange", 2);

// Available scales: 35+ including Major, Minor, modes, pentatonic,
// blues, whole-tone, diminished, augmented, hirajoshi, and more
```

### Velocity

Processes note velocities with multiple modes.

```typescript
import { Velocity } from "@daw/midi-effects";

const vel = new Velocity();

// Modes
vel.setParameter("mode", "clip");         // Clip to output range
vel.setParameter("mode", "gate");         // Zero out below threshold
vel.setParameter("mode", "fixed");        // Fixed output velocity
vel.setParameter("mode", "relative");     // Add/subtract drive
vel.setParameter("mode", "compand");      // Compress/expand curve

// Drive (for relative mode)
vel.setParameter("drive", 20);            // Add 20 to velocity
vel.setParameter("drive", -20);           // Subtract 20

// Compand (compress/expand)
vel.setParameter("compand", -50);         // Compress
vel.setParameter("compand", 50);          // Expand

// Output range
vel.setParameter("outLow", 20);
vel.setParameter("outHigh", 110);

// Input range filter
vel.setParameter("rangeLow", 36);         // Only affect this note range
vel.setParameter("rangeHigh", 51);

// Randomize
vel.setParameter("random", 10);           // +/- 10 velocity
```

### MPE Control

Manages MPE (MIDI Polyphonic Expression) voice allocation.

```typescript
import { MPEControl } from "@daw/midi-effects";

const mpe = new MPEControl();

// Enable MPE
mpe.setParameter("mpeEnabled", true);

// Pitch bend range
mpe.setParameter("pitchBendRange", 48);   // 48 semitones = 4 octaves
mpe.setParameter("pitchBendEnabled", true);

// Slide (CC74) settings
mpe.setParameter("slideEnabled", true);
mpe.setParameter("slideCurve", "exp");
mpe.setParameter("slideInMin", 0);
mpe.setParameter("slideInMax", 127);
mpe.setParameter("slideOutMin", 0);
mpe.setParameter("slideOutMax", 127);

// Pressure settings
mpe.setParameter("pressureEnabled", true);
mpe.setParameter("pressureCurve", "linear");

// Voice allocation
mpe.setParameter("voiceAllocation", "round-robin");
// Options: round-robin, lowest, highest, last
```

## Core Types

### MidiEffect Interface

All effects implement this interface:

```typescript
interface MidiEffect {
  process(events: MidiEvent[], sampleTime: number): MidiEvent[];
  setParameter(id: string, value: number | string | boolean): void;
  getParameter(id: string): number | string | boolean | undefined;
  saveState(): Record<string, unknown>;
  loadState(state: Record<string, unknown>): void;
  reset(): void;
  readonly name: string;
  readonly version: string;
}
```

### MidiEvent Types

```typescript
type MidiEvent = 
  | { type: "note-on"; note: number; velocity: number; channel: number; sampleTime: number; data: number[] }
  | { type: "note-off"; note: number; velocity: number; channel: number; sampleTime: number; data: number[] }
  | { type: "control-change"; controller: number; value: number; channel: number; sampleTime: number; data: number[] }
  | { type: "pitch-bend"; value: number; channel: number; sampleTime: number; data: number[] }
  | { type: "channel-aftertouch"; pressure: number; channel: number; sampleTime: number; data: number[] }
  | { type: "poly-aftertouch"; note: number; pressure: number; channel: number; sampleTime: number; data: number[] }
  | // ... more types;
```

## Helper Functions

```typescript
import { 
  createNoteOn, 
  createNoteOff, 
  createCC, 
  createPitchBend,
  noteNameToNumber,
  rateToBeatMultiplier,
  SCALE_PATTERNS 
} from "@daw/midi-effects";

// Create events
const noteOn = createNoteOn(60, 100, 0, sampleTime);
const noteOff = createNoteOff(60, 0, 0, sampleTime);
const cc = createCC(1, 64, 0, sampleTime);
const pb = createPitchBend(0, 0, sampleTime);

// Utilities
const noteNum = noteNameToNumber("C#");  // 1
const beats = rateToBeatMultiplier("1/16");  // 0.25
```

## State Serialization

All effects support state serialization for saving/loading presets:

```typescript
// Save state
const arpState = arpeggiator.saveState();
localStorage.setItem("arp-preset", JSON.stringify(arpState));

// Load state
const loadedState = JSON.parse(localStorage.getItem("arp-preset")!);
arpeggiator.loadState(loadedState);

// Reset to defaults
arpeggiator.reset();
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Watch mode
npm run test:watch

# Type check
npm run typecheck

# Build
npm run build
```

## Architecture

```
MIDI Input -> [Arpeggiator] -> [Chord] -> [Scale] -> [Velocity] -> [Note Length] -> [MPE] -> Instrument
```

Effects are pure functions that transform arrays of MIDI events. They:
- Run in the audio thread or a dedicated MIDI processing thread
- Maintain state between calls (held notes, current step, etc.)
- Use sample-accurate timing for precise synchronization
- Support parameter automation
- Are fully serializable for project save/load

## License

MIT
