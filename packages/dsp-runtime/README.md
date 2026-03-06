# @daw/dsp-runtime

DSP runtime and AudioWorklet processors for the In-Browser DAW.

## Overview

This package provides the audio processing infrastructure:

- **Worklet Base** - Base class for DAW AudioWorklet processors
- **Voice Allocator** - Polyphonic voice management with stealing strategies
- **SAB Ring Buffer** - Lock-free SharedArrayBuffer ring buffers
- **WAM Adapter** - Web Audio Module plugin compatibility
- **Pre-built Worklets** - Scheduler, Meter, Metronome processors

## Installation

```bash
pnpm add @daw/dsp-runtime
```

## AudioWorklet Base Class

```typescript
import { DAWWorkletProcessor, defineParameterDescriptors } from '@daw/dsp-runtime';

class MySynth extends DAWWorkletProcessor {
  constructor(options) {
    super(options);
  }
  
  static get parameterDescriptors() {
    return defineParameterDescriptors([
      { id: 'cutoff', name: 'Cutoff', defaultValue: 20000, min: 20, max: 20000, automationRate: 'a-rate' },
    ]).parameterDescriptors;
  }
  
  process(inputs, outputs, parameters) {
    this.beginProcess();
    
    const output = outputs[0];
    const cutoff = this.getParam('cutoff');
    
    // Process audio...
    for (let ch = 0; ch < output.length; ch++) {
      for (let i = 0; i < output[ch].length; i++) {
        output[ch][i] = /* synthesis */;
      }
    }
    
    this.endProcess();
    return true;
  }
}

// Register
registerProcessor('my-synth', MySynth);
```

## Voice Allocator

```typescript
import { VoiceAllocator, createSynthVoice } from '@daw/dsp-runtime';

const allocator = new VoiceAllocator({
  maxVoices: 16,
  stealStrategy: 'oldest',
  legato: false,
  unison: 2,
  unisonDetune: 15,
}, createSynthVoice);

// Trigger note
const voiceIds = allocator.triggerNote(60, 100, 0);

// Release note
allocator.releaseNote(60);

// Get active voices
console.log(`Active: ${allocator.getActiveVoiceCount()}`);
```

### Voice Steal Strategies

- `oldest` - Steal longest-playing voice
- `newest` - Steal most recently triggered voice
- `quietest` - Steal voice with lowest velocity
- `lowest` - Steal lowest pitch
- `highest` - Steal highest pitch

## SharedArrayBuffer Ring Buffer

```typescript
import { createRingBuffer, createEventRingBuffer } from '@daw/dsp-runtime';

// Generic ring buffer
const buffer = createRingBuffer({
  capacity: 1024,
  elementSize: 8,
});

// Write data
const data = new Float64Array([1, 2, 3, 4, 5, 6, 7, 8]);
buffer.write(data);

// Read data
const result = new Float64Array(8);
buffer.read(result);

// Event ring buffer (for MIDI/events)
const eventBuffer = createEventRingBuffer(256);
eventBuffer.writeEvent(
  0,        // type code (note-on)
  1000,     // sample time
  480,      // tick time
  12345,    // track hash
  [60, 100, 0, 0]  // data (note, velocity, channel, ...)
);
```

## WAM Plugin Adapter

```typescript
import { createWAMAdapter, registerWorklets } from '@daw/dsp-runtime';

// Register DAW worklets first
await registerWorklets(audioContext);

// Load WAM plugin
await audioContext.audioWorklet.addModule('path/to/wam-plugin.js');

// Create adapter
const adapter = createWAMAdapter('wam-group-1', 'wam-plugin-1');

// Connect to WAM via MessagePort
const wamNode = new AudioWorkletNode(audioContext, 'wam-plugin');
await adapter.initialize(wamNode.port);

// Get parameter info
const params = adapter.getParameterDescriptors();

// Control plugin
await adapter.setParam('gain', 0.8);
```

## Pre-built Worklets

### Scheduler Worklet

```typescript
// In main thread
const schedulerNode = new AudioWorkletNode(audioContext, 'daw-scheduler');

// Register SAB for events
const sab = new SharedArrayBuffer(/* ... */);
schedulerNode.port.postMessage({
  type: 'buffer',
  payload: { sab, type: 'events' }
});
```

### Meter Worklet

```typescript
const meterNode = new AudioWorkletNode(audioContext, 'daw-meter', {
  processorOptions: {
    updateRate: 30,        // Hz
    truePeak: true,        // Enable true peak detection
    lufs: false,           // Disable LUFS
    clipThreshold: -0.1,   // dBFS
  }
});

meterNode.port.onmessage = (e) => {
  if (e.data.type === 'meter-update') {
    const { peak, rms, truePeak, clipped } = e.data.payload;
    updateUI(peak, rms, truePeak, clipped);
  }
};

// Connect audio
source.connect(meterNode).connect(destination);
```

### Metronome Worklet

```typescript
const metronomeNode = new AudioWorkletNode(audioContext, 'daw-metronome', {
  processorOptions: { sampleRate: audioContext.sampleRate }
});

// Enable and set volume
const volumeParam = metronomeNode.parameters.get('volume');
const enabledParam = metronomeNode.parameters.get('enabled');

volumeParam.value = 0.7;
enabledParam.value = 1;
```

## Realtime Constraints

All AudioWorklet code must follow these rules:

1. **No allocations** - Pre-allocate all buffers in constructor
2. **No GC-triggering operations** - No object creation in process()
3. **No locks** - Use lock-free data structures (SAB + Atomics)
4. **No exceptions** - Validate inputs, use return codes
5. **Bounded loops** - All loops have known maximum iterations

## Audio Ring Buffer

For interleaved multi-channel audio:

```typescript
import { createAudioRingBuffer } from '@daw/dsp-runtime';

// 2 channels, 8 blocks of 128 samples each
const audioBuffer = createAudioRingBuffer(2, 8, 128);

// Write interleaved block
const block = [
  new Float32Array(128).fill(0.5),   // Left
  new Float32Array(128).fill(-0.5),  // Right
];
audioBuffer.writeBlock(block);

// Read block
const readBlock = [new Float32Array(128), new Float32Array(128)];
audioBuffer.readBlock(readBlock);
```

## Capability Detection

```typescript
import { getDSPCapabilities, isAudioWorkletSupported } from '@daw/dsp-runtime';

const caps = getDSPCapabilities();
console.log({
  audioWorklet: caps.audioWorklet,
  sharedArrayBuffer: caps.sharedArrayBuffer,
  offlineAudioContext: caps.offlineAudioContext,
});

if (!caps.audioWorklet) {
  // Fallback to ScriptProcessorNode (deprecated but functional)
}
```

## API Reference

### DAWWorkletProcessor Methods

| Method | Description |
|--------|-------------|
| `process(inputs, outputs, params)` | Main audio callback (override) |
| `handleEvent(event, offset)` | Handle scheduled events |
| `updateParameters(blockSize)` | Smooth parameter changes |
| `getParam(id)` | Get smoothed parameter value |
| `beginProcess()` / `endProcess()` | Performance timing |
| `noteToFrequency(note)` | MIDI note to Hz |
| `applyGain(buffer, gain)` | Apply gain in-place |
| `mix(src, dst, gain)` | Mix with gain |

### VoiceAllocator Methods

| Method | Description |
|--------|-------------|
| `triggerNote(note, velocity, channel)` | Allocate voice(s) |
| `releaseNote(note)` | Release voice(s) |
| `killVoice(id)` | Kill immediately |
| `findVoiceByNote(note)` | Find playing voice |
| `getActiveVoiceCount()` | Count active |

## License

MIT
