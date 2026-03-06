# @daw/slicing

Ableton-style "Slice to New MIDI Track" feature for the In-Browser DAW.

## Features

- **Transient Detection** - Find slice points automatically
- **Beat Slicing** - Slice on beat grid with swing
- **MIDI Export** - Export slices to drum rack or MIDI clip

## Installation

```bash
pnpm add @daw/slicing
```

## Usage

```typescript
import { TransientSlicer, MidiExporter } from '@daw/slicing';

// Detect transients and slice
const slicer = new TransientSlicer(44100, {
  sensitivity: 50,
  minTimeMs: 100,
  threshold: 0.1
});

const result = slicer.slice(audioBuffer);

// Export to MIDI
const exporter = new MidiExporter({
  startNote: 36,
  bpm: 120,
  ppq: 960
});

const midiClip = exporter.exportToMidiClip(result);
const midiFileData = exporter.createMidiFile(midiClip);
```

## Slicing Modes

### Transient Detection

```typescript
import { TransientSlicer } from '@daw/slicing';

const slicer = new TransientSlicer(44100, {
  sensitivity: 50,    // 0-100, affects onset detection
  minTimeMs: 100,     // Minimum time between transients
  threshold: 0.1      // Amplitude threshold
});

const result = slicer.slice(audioBuffer);
console.log(`Created ${result.slices.length} slices`);
```

### Beat Slicing

```typescript
import { BeatSlicer } from '@daw/slicing';

const slicer = new BeatSlicer(44100, {
  bpm: 120,
  division: '1/16',  // Grid division
  swing: 0           // Swing amount 0-100
});

const result = slicer.slice(audioBuffer);
```

Available divisions:
- `1/1`, `1/2`, `1/4`, `1/8`, `1/16`, `1/32`
- `1/2t`, `1/4t`, `1/8t`, `1/16t`, `1/32t` (triplets)
- `1/2d`, `1/4d`, `1/8d`, `1/16d`, `1/32d` (dotted)

### Slicing from Warp Markers

```typescript
const result = slicer.sliceFromWarpMarkers(audioBuffer, [
  { time: 0, beat: 0 },
  { time: 0.5, beat: 1 },
  { time: 1.0, beat: 2 }
]);
```

## MIDI Export

### Export to Drum Rack

```typescript
const exporter = new MidiExporter();

// Export as drum rack mapping
const drumRack = exporter.exportToDrumRack(sliceResult, {
  startNote: 36,
  oneShot: true
});

// Each pad contains slice info
for (const [note, pad] of drumRack) {
  console.log(`Note ${note}: ${pad.name} (${pad.slice.duration}s)`);
}
```

### Export as MIDI Clip

```typescript
const midiClip = exporter.exportToMidiClip(sliceResult, {
  startNote: 36,
  noteDurationTicks: 240,  // 16th note
  velocity: 100
});

// Notes are sequential in time
for (const note of midiClip.notes) {
  console.log(`Note ${note.midiNote} at tick ${note.startTicks}`);
}
```

### Export with Velocity Based on Amplitude

```typescript
const midiClip = exporter.exportWithVelocityMapping(
  sliceResult,
  audioBuffer,
  { startNote: 36 }
);
```

### Create Pattern from Slices

```typescript
// Create a pattern using slice indices
const pattern = [0, 1, 0, 2, 0, 3, 0, 2]; // 8-step pattern
const midiClip = exporter.exportPattern(sliceResult, pattern);
```

## Slice Results

```typescript
interface SliceResult {
  slices: AudioSlice[];
  mode: SliceMode;
  originalDuration: number;
  sampleRate: number;
}

interface AudioSlice {
  index: number;
  startTime: number;
  endTime: number;
  startSample: number;
  endSample: number;
  duration: number;
  midiNote: number;  // Assigned note for drum rack
}
```

## MIDI File Export

```typescript
// Create standard MIDI file (Type 0)
const midiFile = exporter.createMidiFile(midiClip);

// Save to file
const blob = new Blob([midiFile], { type: 'audio/midi' });
const url = URL.createObjectURL(blob);
```

## API Reference

### TransientSlicer

- `detectTransients(audioData)` - Detect transient positions
- `slice(audioData)` - Create slices from transients
- `setSensitivity(sensitivity)` - Adjust detection sensitivity
- `setMinTimeMs(minTimeMs)` - Set minimum time between transients

### BeatSlicer

- `slice(audioData, offsetSeconds?)` - Slice by beat divisions
- `sliceFromWarpMarkers(audioData, markers)` - Slice at warp markers
- `sliceRange(audioData, startBeat, endBeat)` - Slice specific range
- `setBpm(bpm)` / `setDivision(division)` / `setSwing(swing)`

### MidiExporter

- `exportToMidiClip(sliceResult, options?)` - Export as MIDI clip
- `exportToDrumRack(sliceResult, options?)` - Export as drum rack
- `exportWithVelocityMapping(sliceResult, audioData, options?)` - With velocity
- `exportPattern(sliceResult, pattern, options?)` - Create pattern
- `createMidiFile(clip)` - Generate MIDI file data
