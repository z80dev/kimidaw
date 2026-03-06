# @daw/controllers

Ableton-style MIDI controller mapping and scripts for the In-Browser DAW.

## Features

- **Instant Mapping** - Auto-map controllers to device parameters
- **User Scripts** - JavaScript controller definitions
- **MIDIRemote API** - Ableton-like remote script API
- **Push Emulation** - Push-style control surface

## Installation

```bash
pnpm add @daw/controllers
```

## Usage

```typescript
import { 
  ControllerManager, 
  InstantMappingEngine,
  RemoteScriptRuntime 
} from '@daw/controllers';

// Initialize MIDI
const manager = new ControllerManager();
await manager.initialize();

// Listen for controllers
manager.onMidiMessage((deviceId, data) => {
  console.log('MIDI:', data);
});

// Create instant mapping
const instantMap = new InstantMappingEngine(songAPI);
const mapping = instantMap.createInstantMapping(
  trackId,
  deviceId,
  deviceName,
  parameters,
  controller
);
```

## Controller Manager

### MIDI Access

```typescript
const manager = new ControllerManager();

// Initialize with browser MIDI access
const success = await manager.initialize();
if (!success) {
  console.error('MIDI access denied');
}

// Get connected controllers
const controllers = manager.getConnectedControllers();
```

### Device Mappings

```typescript
// Add a mapping
manager.addMapping({
  id: 'map_1',
  controllerId: 'ctrl_1',
  target: { type: 'transport', action: 'play' },
  input: {
    id: 'btn_play',
    type: 'button',
    midiChannel: 1,
    midiNumber: 64,
    midiType: 'note',
    minValue: 0,
    maxValue: 127,
    isRelative: false
  },
  transform: {
    inputMin: 0,
    inputMax: 127,
    outputMin: 0,
    outputMax: 1,
    curve: 'linear',
    invert: false
  },
  feedback: true
});
```

### Value Transform

Map controller values to parameter ranges:

```typescript
// Linear mapping (default)
// 0-127 -> 0-1

// Logarithmic for volume
// Better control at lower levels

// Exponential for filters
// Better control at higher frequencies

// Invert for reverse response
```

## Instant Mapping

### Auto-Map Device Parameters

```typescript
const engine = new InstantMappingEngine();

const mapping = engine.createInstantMapping(
  'track_1',
  'device_1',
  'My Synth',
  [
    { id: 'cutoff', name: 'Filter Cutoff', kind: 'float', min: 20, max: 20000, defaultValue: 1000 },
    { id: 'resonance', name: 'Resonance', kind: 'float', min: 0, max: 1, defaultValue: 0 },
    // ... more parameters
  ],
  controllerDevice
);

// First 8 encoders are mapped to macros
// Important parameters are auto-detected and mapped
```

### Update Mappings

```typescript
// Remap macro to different control
engine.updateMacroBinding(deviceId, 0, 'new_encoder_id');

// Remap parameter
engine.updateParameterBinding(deviceId, 'cutoff', 'encoder_1');
```

## Remote Scripts

### Load a Controller Script

```typescript
const runtime = new RemoteScriptRuntime(songAPI);

const script = await runtime.loadScript(
  controllerId,
  'My Controller Script',
  `
    exports.init = function() {
      api.log('Script initialized');
    };
    
    exports.handleMidi = function(channel, control, value) {
      api.log('MIDI:', channel, control, value);
    };
    
    exports.cleanup = function() {
      api.log('Script cleanup');
    };
  `
);
```

### Remote Script API

```typescript
interface RemoteScriptAPI {
  log: (...args: unknown[]) => void;
  showMessage: (message: string) => void;
  getSong: () => SongAPI;
  getRoot: () => RootAPI;
}

interface SongAPI {
  play: () => void;
  stop: () => void;
  record: () => void;
  isPlaying: () => boolean;
  currentTime: () => number;
  getTracks: () => TrackAPI[];
  view: ViewAPI;
}

interface TrackAPI {
  volume: ParameterAPI;
  pan: ParameterAPI;
  mute: ParameterAPI;
  solo: ParameterAPI;
  arm: ParameterAPI;
  getDevices: () => DeviceAPI[];
  getMacros: () => ParameterAPI[];
}

interface ParameterAPI {
  name: string;
  value: number;
  min: number;
  max: number;
  setValue: (value: number) => void;
  addValueListener: (callback: (value: number) => void) => void;
}
```

## Push Emulation

### Push-Style Controller

```typescript
import { PushEmulation } from '@daw/controllers';

const push = new PushEmulation();

// Get Push controller profile
const profile = PushEmulation.getControllerProfile();

// Handle button presses
const target = push.handleButtonPress('play');
if (target) {
  // Execute target action
}

// Update grid display
push.updateGrid([
  ['playing', 'empty', 'stopped', 'recording'],
  // ... more rows
]);

// Get button colors for LED feedback
const color = push.getButtonColor('play');
```

### Modes

- `session` - Clip launcher grid
- `note` - Note/step sequencer
- `device` - Device parameter control
- `mixer` - Mixer control
- `user` - User-defined mode

### Grid Layout

8x8 grid with note layout (bottom-left = C1):
- Each row is a 4th higher
- Chromatic layout for melodic playing
- Step sequencer mode for drums

## Mapping Targets

### Transport

```typescript
{ type: 'transport', action: 'play' | 'stop' | 'record' | 'metronome' | ... }
```

### Mixer

```typescript
{ type: 'mixer', trackId: 'track_1', parameter: 'volume' | 'pan' | 'mute' | 'solo' | 'arm' }
```

### Device

```typescript
{ type: 'device', trackId: 'track_1', deviceId: 'device_1', parameterId: 'cutoff' }
```

### Clip

```typescript
{ type: 'clip', trackId: 'track_1', clipSlot: 0, action: 'launch' | 'stop' | 'record' }
```

### Scene

```typescript
{ type: 'scene', sceneIndex: 0 }
```

## Browser Compatibility

Requires Web MIDI API support:
- Chrome/Edge: Full support
- Firefox: Requires flag
- Safari: Not supported

## API Reference

### ControllerManager

- `initialize()` - Request MIDI access
- `registerController(device)` - Add controller profile
- `addMapping(mapping)` - Add controller mapping
- `getConnectedControllers()` - Get active controllers
- `onMidiMessage(callback)` - Subscribe to MIDI
- `sendMidi(deviceId, data)` - Send MIDI output

### InstantMappingEngine

- `createInstantMapping(trackId, deviceId, deviceName, parameters, controller)` - Auto-map
- `updateMacroBinding(deviceId, macroIndex, inputId)` - Remap macro
- `updateParameterBinding(deviceId, parameterId, inputId)` - Remap parameter
- `suggestMapping(controller, deviceType)` - Get suggestions

### RemoteScriptRuntime

- `loadScript(controllerId, name, code)` - Execute script
- `unloadScript(scriptId)` - Stop script
- `callFunction(scriptId, functionName, ...args)` - Call exported function
