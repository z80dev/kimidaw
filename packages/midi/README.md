# @daw/midi

MIDI I/O subsystem for the In-Browser DAW. Provides comprehensive MIDI input/output, file parsing/writing, mapping, and MPE support.

## Features

- **MIDI Input/Output**: Web MIDI API integration with graceful fallback
- **MIDI File Support**: Type 0, 1, and 2 file parsing and writing
- **MIDI Mapping**: Learn mode, controller bindings, transform support
- **Keyboard to MIDI**: Computer keyboard as MIDI controller
- **MPE Support**: MIDI Polyphonic Expression (per-note pitch bend, pressure, timbre)
- **TypeScript**: Full type safety

## Installation

```bash
npm install @daw/midi
```

## Quick Start

### MIDI Input

```typescript
import { getMidiInputManager } from "@daw/midi";

const input = getMidiInputManager();

// Initialize (requests permission)
const state = await input.initialize();

if (state.isAccessGranted) {
  // Listen for messages
  input.onMessage((message) => {
    console.log("MIDI:", message);
  });

  // Listen for device changes
  input.onDeviceChange((devices) => {
    console.log("Devices:", devices);
  });
}
```

### MIDI Output

```typescript
import { getMidiOutputManager } from "@daw/midi";

const output = getMidiOutputManager();
await output.initialize();

// Get available outputs
const devices = output.getDevices();

// Send note
if (devices.length > 0) {
  const deviceId = devices[0].id;
  output.noteOn(deviceId, 60, 100); // Middle C, velocity 100
  
  // Note off after 500ms
  setTimeout(() => {
    output.noteOff(deviceId, 60);
  }, 500);
}
```

### Keyboard to MIDI

```typescript
import { getKeyboardMidiMapper } from "@daw/midi";

const keyboard = getKeyboardMidiMapper();

// Enable keyboard MIDI mode
keyboard.enable();

// Listen for notes
keyboard.onMessage((message) => {
  if (message.type === "noteOn") {
    console.log(`Note on: ${message.note} velocity: ${message.velocity}`);
  }
});

// Adjust octave
keyboard.shiftOctave(1);  // Up one octave
keyboard.shiftOctave(-1); // Down one octave

// Scale lock (play in key)
keyboard.setScaleLock(true, 60, "major"); // C major

// Chord mode
keyboard.setChordMode(true, "triad"); // Play triads
```

### MIDI File Parsing

```typescript
import { parseMidiFile, MidiParser } from "@daw/midi";

// From file input
const fileInput = document.getElementById("midi-file") as HTMLInputElement;
const file = fileInput.files![0];

const result = await parseMidiFile(file);

if (result.success && result.file) {
  console.log("Format:", result.file.header.format);
  console.log("Tracks:", result.file.header.numTracks);
  console.log("Ticks per quarter:", result.file.header.ticksPerQuarter);

  // Get tempo
  const firstTrack = result.file.tracks[0];
  const tempoEvent = firstTrack.events.find(e => e.type === "setTempo");
  if (tempoEvent) {
    const bpm = MidiParser.getTempoBpm(tempoEvent);
    console.log("BPM:", bpm);
  }
}
```

### MIDI File Writing

```typescript
import { MidiWriter, writeMidiFile } from "@daw/midi";

// Create a simple melody
const notes = [
  { note: 60, startTick: 0, durationTicks: 480, velocity: 100 },   // C4
  { note: 62, startTick: 480, durationTicks: 480, velocity: 100 }, // D4
  { note: 64, startTick: 960, durationTicks: 480, velocity: 100 }, // E4
  { note: 65, startTick: 1440, durationTicks: 960, velocity: 100 }, // F4
];

const result = MidiWriter.createFromNotes(notes, {
  tempo: 120,
  format: 0,
});

if (result.success && result.data) {
  // Download the file
  MidiWriter.download(result.data, "my-melody.mid");
}
```

### MIDI Mapping / Learn

```typescript
import { getMidiMappingManager } from "@daw/midi";

const mapping = getMidiMappingManager();

// Create a binding manually
mapping.createBinding(
  { deviceId: "*", channel: "*", type: "cc", number: 1 }, // Mod wheel
  { kind: "plugin.param", id: "synth-1", paramId: "filter-cutoff" },
  { mode: "linear", min: 200, max: 20000 }
);

// Or use learn mode
mapping.onLearn((source) => {
  console.log("Learned:", source);
  // Create binding with learned source
  mapping.createBinding(source, { kind: "transport.play", id: "transport" });
  mapping.exitLearnMode();
});

mapping.enterLearnMode();

// Handle binding events
mapping.onBinding((binding, value, message) => {
  console.log(`Binding ${binding.id}: ${value}`);
});
```

### MPE Support

```typescript
import { getMpeManager, DEFAULT_LOWER_ZONE } from "@daw/midi";

const mpe = getMpeManager({
  enabled: true,
  lowerZone: DEFAULT_LOWER_ZONE,
});

// Allocate a channel for a note
const channel = mpe.allocateChannel("lower", 60);

// Send per-note pitch bend (2 semitones up)
const pbMessage = mpe.createPitchBend(60, 2.0);

// Send per-note pressure
const pressureMessage = mpe.createPressure(60, 100);

// Send per-note timbre (CC74)
const timbreMessage = mpe.createTimbre(60, 80);

// Process incoming MPE messages
const midiInput = getMidiInputManager();
midiInput.onMessage((message) => {
  const mpeState = mpe.processInput(message);
  if (mpeState) {
    console.log("MPE note:", mpeState);
  }
});
```

## API Reference

### MIDI Input

- `getMidiInputManager()` - Get singleton instance
- `initialize(options)` - Request MIDI access
- `onMessage(handler)` - Subscribe to MIDI messages
- `onDeviceChange(handler)` - Subscribe to device changes
- `getDevices()` - Get list of input devices
- `sendAllNotesOff(deviceId?)` - Emergency note off

### MIDI Output

- `getMidiOutputManager()` - Get singleton instance
- `initialize(options)` - Request MIDI access
- `getDevices()` - Get list of output devices
- `noteOn(deviceId, note, velocity, channel?, timestamp?)` - Send note on
- `noteOff(deviceId, note, velocity?, channel?, timestamp?)` - Send note off
- `controlChange(deviceId, controller, value, channel?, timestamp?)` - Send CC
- `pitchBend(deviceId, value, channel?, timestamp?)` - Send pitch bend
- `panic()` - All notes off on all devices

### Keyboard MIDI

- `getKeyboardMidiMapper(options?)` - Get singleton instance
- `enable()` / `disable()` - Toggle keyboard MIDI
- `shiftOctave(direction)` - Shift octave
- `setScaleLock(enabled, root, mode)` - Enable scale lock
- `setChordMode(enabled, type)` - Enable chord mode
- `onMessage(handler)` - Subscribe to MIDI messages

### MIDI File Parser

- `parseMidiFile(file, options?)` - Parse from File
- `parseMidiData(data, options?)` - Parse from Uint8Array
- `MidiParser.getTempoBpm(event)` - Extract BPM
- `MidiParser.getTimeSignature(event)` - Extract time signature
- `MidiParser.mergeTracks(file)` - Merge Type 1 tracks

### MIDI File Writer

- `writeMidiFile(file, options?)` - Write MIDI file
- `MidiWriter.createFromNotes(notes, options?)` - Create from note list
- `MidiWriter.createNoteOn(deltaTime, note, velocity, channel?)` - Factory method
- `MidiWriter.createTempoEvent(deltaTime, bpm)` - Factory method
- `MidiWriter.download(data, filename?)` - Download file

### MIDI Mapping

- `getMidiMappingManager(options?)` - Get singleton instance
- `createBinding(source, target, transform?, name?)` - Create binding
- `enterLearnMode(bindingId?)` - Enter learn mode
- `onLearn(handler)` - Subscribe to learn events
- `onBinding(handler)` - Subscribe to binding events
- `exportBindings()` / `importBindings(json)` - Import/export

### MPE

- `getMpeManager(options?)` - Get singleton instance
- `setEnabled(enabled)` - Enable/disable MPE
- `allocateChannel(zone, note)` - Allocate channel for note
- `createPitchBend(note, semitones)` - Create per-note pitch bend
- `createPressure(note, pressure)` - Create per-note pressure
- `createTimbre(note, timbre)` - Create per-note timbre
- `processInput(message)` - Process incoming MPE message

## Constants

### Keyboard Piano Map

```typescript
import { KEYBOARD_PIANO_MAP } from "@daw/midi";

// ASDF row maps to piano keys
// KeyA -> C4 (60)
// KeyW -> C#4 (61)
// KeyS -> D4 (62)
// etc.
```

### Scale Intervals

```typescript
import { SCALE_INTERVALS } from "@daw/midi";

// Available scales:
// major, minor, dorian, phrygian, lydian, mixolydian
// aeolian, locrian, pentatonic-major, pentatonic-minor
// blues, chromatic
```

### CC Numbers

```typescript
import { CC_NUMBERS } from "@daw/midi";

CC_NUMBERS.MODULATION  // 1
CC_NUMBERS.BREATH      // 2
CC_NUMBERS.VOLUME      // 7
CC_NUMBERS.PAN         // 10
CC_NUMBERS.EXPRESSION  // 11
CC_NUMBERS.SUSTAIN     // 64
```

## TypeScript

All types are exported for your convenience:

```typescript
import type {
  MidiMessage,
  NoteOnMessage,
  MidiDeviceInfo,
  MidiBinding,
  KeyboardMidiState,
  MpeConfiguration,
  MidiFile,
  // ... and more
} from "@daw/midi";
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support (with permission)
- Safari: Partial (no Web MIDI without polyfill)

Always check `isSupported()` before using MIDI features.

## License

MIT
