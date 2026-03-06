# @daw/project-schema

Project domain model and type definitions for the In-Browser DAW.

## Overview

This package provides the core data structures, TypeScript interfaces, and Zod schemas for the Digital Audio Workstation. It implements the project model defined in section 7 of the engineering specification.

## Installation

```bash
pnpm add @daw/project-schema
```

## Features

- **Complete type definitions** for Projects, Tracks, Clips, Automation, and more
- **Zod schemas** for runtime validation
- **Timing utilities** for tick/sample/time conversions
- **Command system** for event sourcing and undo/redo
- **Type guards** and utility functions

## Usage

### Creating a Project

```typescript
import { createProject, PPQ, ticksToMusicalTime } from '@daw/project-schema';

const project = createProject('proj-123', 'My Song', {
  sampleRate: 48000,
  tempo: 128,
  timeSignature: { numerator: 4, denominator: 4 },
});
```

### Working with Clips

```typescript
import { createMidiClip, addNoteToClip, quantizeNote } from '@daw/project-schema';

const clip = createMidiClip('clip-1', 0, PPQ * 4);
// Add notes, quantize, etc.
```

### Runtime Validation

```typescript
import { validateProject, validateMidiClip } from '@daw/project-schema';

const result = validateProject(data);
if (result.success) {
  const project = result.data;
} else {
  console.error('Validation failed:', result.errors);
}
```

### Commands

```typescript
import { createCommand, COMMAND_TYPES } from '@daw/project-schema';

const command = createCommand(
  COMMAND_TYPES.TRACK.CREATE,
  { type: 'audio', name: 'Audio 1' }
);
```

## API Reference

### Project

- `createProject(id, name, options?)` - Create a new project
- `getTrackById(project, trackId)` - Find track by ID
- `getClipById(project, clipId)` - Find clip by ID
- `getTempoAtTick(project, tick)` - Get tempo at position

### Timing

- `PPQ` - Pulses Per Quarter (960)
- `musicalTimeToTicks(time, timeSigNum?)` - Convert musical time to ticks
- `ticksToMusicalTime(ticks, timeSigNum?)` - Convert ticks to musical time
- `ticksToSeconds(ticks, tempo)` - Convert ticks to seconds
- `secondsToTicks(seconds, tempo)` - Convert seconds to ticks
- `formatTickPosition(tick)` - Format as "bars:beats.ticks"

### Clips

- `createMidiClip(id, startTick, durationTicks, options?)`
- `createAudioClip(id, assetId, startTick, durationTicks, options?)`
- `quantizeNote(note, gridTicks, strength?, swing?)`
- `splitNote(note, splitTick)` - Split a note at position
- `getNotesInRange(clip, startTick, endTick)`

### Automation

- `createAutomationLane(id, target, options?)`
- `addPoint(lane, tick, value, options?)`
- `getValueAtTick(lane, tick)` - Interpolate value at position
- `shiftInTime(lane, offsetTicks)`
- `scaleValues(lane, factor)`

### Validation

- `validateProject(data)` - Validate project structure
- `validateTrack(data)` - Validate track structure
- `validateMidiClip(data)` - Validate MIDI clip
- `validateAudioClip(data)` - Validate audio clip
- `validateCommand(data)` - Validate command

## Type Definitions

### Core Types

```typescript
interface Project {
  schemaVersion: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sampleRatePreference: 44100 | 48000 | 96000;
  tempoMap: TempoEvent[];
  timeSignatureMap: TimeSignatureEvent[];
  markers: Marker[];
  tracks: Track[];
  buses: BusTrack[];
  master: MasterTrack;
  scenes: Scene[];
  assets: AssetRef[];
  presets: PresetRef[];
  scripting: ScriptModuleRef[];
  settings: ProjectSettings;
  clips: { audio: AudioClip[]; midi: MidiClip[] };
}
```

### Track Types

- `AudioTrack` - Audio recording and playback
- `MidiTrack` - External MIDI output
- `InstrumentTrack` - Built-in instrument
- `GroupTrack` - Folder/bus organization
- `ReturnTrack` - Effect sends
- `AuxTrack` - Sidechain/routing
- `ExternalMidiTrack` - Hardware instruments
- `HybridTrack` - Both audio and MIDI

### Clip Types

```typescript
interface MidiClip {
  id: string;
  startTick: number;
  endTick: number;
  loop: LoopSpec | null;
  notes: MidiNote[];
  cc: MidiCCEvent[];
  pitchBend: PitchBendEvent[];
  // ... more
}

interface AudioClip {
  id: string;
  assetId: string;
  startTick: number;
  endTick: number;
  sourceStartSample: number;
  sourceEndSample: number;
  fades: FadeConfig;
  warp?: WarpSpec;
  // ... more
}
```

## Constants

```typescript
// Timing
PPQ = 960

// Sample rates
SAMPLE_RATES = [44100, 48000, 96000]

// Built-in instruments
BUILTIN_INSTRUMENTS = {
  DRUM_RACK: 'builtin:drum-rack',
  SAMPLER: 'builtin:sampler',
  SUBTRACTIVE_SYNTH: 'builtin:subtractive-synth',
  WAVETABLE_SYNTH: 'builtin:wavetable-synth',
  FM_SYNTH: 'builtin:fm-synth',
  GRANULAR: 'builtin:granular',
}

// Command types
COMMAND_TYPES = {
  PROJECT: { CREATE, RENAME, DELETE, ... },
  TRACK: { CREATE, DELETE, RENAME, MUTE, SOLO, ... },
  CLIP: { CREATE, DELETE, MOVE, ... },
  // ... more
}
```

## License

MIT
