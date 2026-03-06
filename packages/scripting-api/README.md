# @daw/scripting-api

User-facing scripting API for deterministic, programmable music generation in the In-Browser DAW.

## Overview

This package provides a comprehensive TypeScript API for generating musical content through code. All generation is fully deterministic based on a seed value, ensuring reproducible results.

## Installation

```bash
npm install @daw/scripting-api
```

## Core Concepts

### Deterministic Generation

All random operations use a seed-based PRNG (Pseudo-Random Number Generator). The same script with the same seed will always produce identical output.

```typescript
import { createContext, createPRNG } from '@daw/scripting-api';

// Create a deterministic context
const ctx = createContext({
  projectId: 'my-project',
  seed: 'my-seed-123',
});

// All operations using ctx will be deterministic
```

### MusicScriptContext

The main interface exposed to scripts. Provides access to:
- Scale and chord utilities
- Pattern and clip builders
- Deterministic random number generation
- Euclidean rhythm generation
- Humanization and velocity curves

```typescript
export default function(ctx: MusicScriptContext): ScriptModuleResult {
  // Generate a bassline
  const bassClip = ctx.clip('bassline')
    .midi()
    .note('C2', 0, 960)
    .note('G2', 960, 960)
    .build();
  
  return {
    clips: [{
      trackId: 'bass-track',
      clip: bassClip,
      provenance: {
        scriptId: 'bass-generator',
        hash: '...',
        seed: ctx.seed,
        generatedAt: Date.now(),
      },
    }],
    automation: [],
  };
}
```

## API Reference

### PRNG (Deterministic Random)

```typescript
import { createPRNG } from '@daw/scripting-api';

const prng = createPRNG('my-seed');

prng.next();           // Random float in [0, 1)
prng.range(10, 20);    // Random float in [10, 20)
prng.int(1, 6);        // Random integer in [1, 6]
prng.bool(0.5);        // Random boolean (50% chance)
prng.pick([1, 2, 3]);  // Random array element
prng.shuffle([1,2,3]); // Randomly shuffle array
prng.normal(0, 1);     // Normal distribution
prng.fork('sub-seed'); // Create derived PRNG
```

### Scales and Chords

```typescript
import { scale, chord, noteToMidi, midiToNote } from '@daw/scripting-api';

// Create scales
const cMajor = scale('C', 'major');      // [C, D, E, F, G, A, B]
const aMinor = scale('A', 'natural minor');
const dDorian = scale('D', 'dorian');

// Available modes
// - major, minor, natural minor, harmonic minor, melodic minor
// - dorian, phrygian, lydian, mixolydian, locrian
// - pentatonic major, pentatonic minor, blues
// - chromatic, whole tone, diminished

// Get chord notes
const cMajorTriad = chord('C');      // [60, 64, 67] (C E G)
const g7 = chord('G7');              // [67, 71, 74, 77] (G B D F)
const am9 = chord('Am9');            // A minor 9

// Note utilities
const midi = noteToMidi('C4');       // 60
const note = midiToNote(60);         // "C4"
```

### Euclidean Rhythms

```typescript
import { euclidean, polyrhythm } from '@daw/scripting-api';

// Generate Euclidean rhythms (evenly distributed pulses)
const tresillo = euclidean(8, 3);    // [1,0,0,1,0,0,1,0]
const cinquillo = euclidean(16, 5);  // [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0]

// With rotation
euclidean(8, 3, 1);  // Rotate by 1 step

// Create polyrhythms
const poly = polyrhythm([
  [4, 3],  // 3 pulses in 4 steps
  [3, 2],  // 2 pulses in 3 steps
]);

// Preset rhythms
import { RHYTHM_PRESETS } from '@daw/scripting-api';
RHYTHM_PRESETS.tresillo();
RHYTHM_PRESETS.cinquillo();
RHYTHM_PRESETS.fourOnFloor();
RHYTHM_PRESETS.sonClave();
```

### PatternBuilder

Fluent API for constructing rhythmic patterns.

```typescript
const pattern = ctx.pattern()
  .steps(16)              // 16 steps
  .euclidean(5)           // 5 pulses
  .velocity(100, 30)      // Base 100, variance 30
  .accent([0, 4, 8, 12], 120, 80)  // Accents on beats
  .swing(0.15)            // Apply swing
  .humanize(0.1)          // Humanize timing
  .build();
```

**Pattern Sources:**
- `.steps(n)` / `.length(n)` - Set number of steps
- `.euclidean(pulses, rotation)` - Euclidean pattern
- `.fromArray([1,0,1,0])` - From explicit array
- `.preset('tresillo')` - Use preset
- `.fill()` / `.clear()` - All on/off
- `.every(n, offset)` - Every nth step

**Transformations:**
- `.velocity(base, variance)` - Set velocity
- `.accent(indices, strong, weak)` - Add accents
- `.probability(p)` - Random gate
- `.swing(amount, every)` - Apply swing
- `.humanize(amount)` - Humanize timing
- `.rotate(amount)` / `.reverse()` / `.invert()` - Transform
- `.and(other)` / `.or(other)` - Combine patterns

### ClipBuilder

Fluent API for constructing MIDI/audio clips.

```typescript
const clip = ctx.clip('bassline')
  .midi()
  .note('C2', 0, 960)
  .note('G2', 960, 960)
  .note('A2', 1920, 960)
  .note('F2', 2880, 960)
  .loop(true, 0, 3840)
  .build();
```

**Note Operations:**
- `.note(note, startTick, duration, velocity)` - Add single note
- `.notes(array)` - Add multiple notes
- `.chord(root, intervals, startTick, duration)` - Add chord
- `.arpeggio(notes, startTick, stepDuration, pattern)` - Add arpeggio
- `.fromPattern(pattern, note, startTick, stepDuration)` - Notes from pattern

**Transformations:**
- `.quantize(scale)` - Quantize to scale
- `.transpose(semitones)` - Transpose
- `.velocityCurve(fn)` / `.setVelocity(val)` - Adjust velocity
- `.humanize(timing, velocity, duration)` - Humanize
- `.reverse()` / `.invert(center)` - Transform

**CC/Automation:**
- `.cc(controller, value, tick)` - CC event
- `.ccRamp(controller, from, to, start, end, steps)` - CC ramp
- `.pitchBend(value, tick)` - Pitch bend
- `.pressure(value, tick)` - Channel pressure

**Loop:**
- `.duration(ticks)` / `.bars(n)` - Set duration
- `.loop(enabled, start, end)` - Set loop

### AutomationBuilder

```typescript
const auto = ctx.automation({ scope: 'track', ownerId: 't1', paramId: 'volume' })
  .ramp(0, 0, 3840, 100)     // Linear ramp
  .point(7680, 50)           // Point at bar 8
  .lfo(0, 3840, 0, 100, 4, 'sine')  // LFO
  .build();
```

### SceneBuilder and SectionBuilder

```typescript
// Create scenes for session view
const scene = ctx.scene('intro')
  .addClip('track-1', 'clip-1')
  .addClip('track-2', 'clip-2')
  .setTempo(120)
  .build(0);

// Create sections for arrangement
const section = ctx.section('verse', 8)  // 8 bars
  .at(0)  // Start at tick 0
  .build();
```

### Utilities

```typescript
// Humanize existing notes
const humanized = ctx.humanize(notes, {
  timing: 10,    // Ticks variance
  velocity: 10,  // Velocity variance
  duration: 5,   // Duration variance
  preserveAccents: true,
});

// Velocity curves
const curve = ctx.velCurve('exp', 0.5);
const newVel = curve(100, 0.5);  // Apply curve at position 0.5

// Euclidean shorthand
const pattern = ctx.euclidean(16, 5, 1);

// References
const synth = ctx.instrument('synth-1');
const sample = ctx.sample('/samples/kick.wav');

// Conversions
const ticks = ctx.barsToTicks(4);      // 4 bars to ticks
const ticks2 = ctx.beatsToTicks(16);   // 16 beats to ticks
const seconds = ctx.ticksToSeconds(3840, 120);  // At 120 BPM
```

## Example Scripts

### Simple Drum Pattern

```typescript
import { MusicScriptContext, ScriptModuleResult } from '@daw/scripting-api';

export default function drumPattern(ctx: MusicScriptContext): ScriptModuleResult {
  const prng = ctx.rand();
  
  // Kick: four-on-the-floor
  const kick = ctx.pattern()
    .steps(16)
    .euclidean(4, 0)
    .velocity(110, 10)
    .build();
  
  // Snare: beats 2 and 4
  const snare = ctx.pattern()
    .steps(16)
    .fromArray([0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0])
    .velocity(100, 15)
    .build();
  
  // Hi-hat: every 8th note
  const hihat = ctx.pattern()
    .steps(16)
    .every(2, 1)
    .velocity(80, 20)
    .probability(0.9)
    .build();
  
  return {
    clips: [
      {
        trackId: 'kick-track',
        clip: ctx.clip('kick').fromPattern(kick, 'C1', 0, 240).build(),
        provenance: { scriptId: 'drums', hash: '', seed: ctx.seed, generatedAt: Date.now() },
      },
      {
        trackId: 'snare-track',
        clip: ctx.clip('snare').fromPattern(snare, 'D1', 0, 240).build(),
        provenance: { scriptId: 'drums', hash: '', seed: ctx.seed, generatedAt: Date.now() },
      },
      {
        trackId: 'hihat-track',
        clip: ctx.clip('hihat').fromPattern(hihat, 'F#1', 0, 240).build(),
        provenance: { scriptId: 'drums', hash: '', seed: ctx.seed, generatedAt: Date.now() },
      },
    ],
    automation: [],
  };
}
```

### Generative Bassline

```typescript
import { MusicScriptContext, ScriptModuleResult, scale, chord } from '@daw/scripting-api';

export default function generativeBassline(ctx: MusicScriptContext): ScriptModuleResult {
  const cMinor = ctx.scale('C', 'natural minor');
  const prng = ctx.rand();
  
  // Generate notes from scale
  const scaleNotes = [
    scaleDegree(cMinor, 1, -1),  // C2
    scaleDegree(cMinor, 5, -1),  // G2
    scaleDegree(cMinor, 6, -1),  // Ab2
    scaleDegree(cMinor, 4, -1),  // F2
  ];
  
  // Create pattern with accents on downbeats
  const pattern = ctx.pattern()
    .steps(16)
    .euclidean(prng.int(4, 8))
    .accent([0, 4, 8, 12], 120, 90)
    .swing(0.1)
    .humanize(0.05)
    .build();
  
  // Pick random notes for each pulse
  const notes: number[] = [];
  const patternArray = pattern.steps.map(s => s.active ? 1 : 0);
  for (let i = 0; i < patternArray.length; i++) {
    if (patternArray[i]) {
      notes.push(prng.pick(scaleNotes));
    }
  }
  
  return {
    clips: [{
      trackId: 'bass-track',
      clip: ctx.clip('bass')
        .fromPattern(pattern, notes, 0, 240, 200)
        .quantize(cMinor)
        .build(),
      provenance: { scriptId: 'bass', hash: '', seed: ctx.seed, generatedAt: Date.now() },
    }],
    automation: [],
  };
}
```

## Type Exports

```typescript
import type {
  MusicScriptContext,
  PRNG,
  Scale,
  Chord,
  NoteEvent,
  Pattern,
  MidiClip,
  GeneratedClip,
  ScriptModuleResult,
  ScriptDiagnostic,
} from '@daw/scripting-api';
```

## License

MIT
