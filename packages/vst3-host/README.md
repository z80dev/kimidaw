# @daw/vst3-host

VST3, AudioUnit, and CLAP plugin support for the In-Browser DAW.

## Architecture

This package provides a hybrid architecture for hosting native plugins:

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser DAW (Web)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Plugin UI    │  │ Audio Bridge │  │ Parameter    │      │
│  │ (iframe)     │  │ (WebRTC/WS)  │  │ Sync         │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          │    WebSocket    │   Audio Stream  │   Control
          │                 │                 │
┌─────────┼─────────────────┼─────────────────┼──────────────┐
│         ▼                 ▼                 ▼              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Native Bridge (Electron/Companion)        │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │   │
│  │  │ VST3 Host │  │ AU Host   │  │ CLAP Host     │   │   │
│  │  │ (Steinberg│  │ (Apple)   │  │ (Free)        │   │   │
│  │  │  SDK)     │  │  SDK)     │  │  SDK)         │   │   │
│  │  └─────┬─────┘  └─────┬─────┘  └───────┬───────┘   │   │
│  └────────┼──────────────┼────────────────┼───────────┘   │
│           │              │                │               │
│           ▼              ▼                ▼               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Native Plugin DLLs                     │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Features

- **VST3 Support** - Full VST3 plugin hosting
- **AudioUnit Support** - macOS AudioUnit v2/v3
- **CLAP Support** - Modern CLAP plugin format
- **Low Latency** - Sub-5ms audio streaming
- **Plugin Scanning** - Automatic plugin discovery
- **Preset Management** - Save/load plugin presets
- **Parameter Automation** - Full automation support
- **MIDI Support** - Complete MIDI I/O

## Installation

```bash
pnpm add @daw/vst3-host
```

## Usage

### Browser Side

```typescript
import { createVSTBridge } from '@daw/vst3-host';

const bridge = createVSTBridge({
  serverUrl: 'ws://localhost:8765',
  audioContext: myAudioContext
});

await bridge.connect();

// Scan for plugins
const plugins = await bridge.scanPlugins();

// Load a plugin
const instance = await bridge.loadPlugin(plugins[0].id);

// Connect to audio graph
instance.connect(audioNode);

// Set parameters
instance.setParameter('cutoff', 0.75);
```

### Native Bridge (Electron)

```typescript
import { startNativeBridge } from '@daw/vst3-host/bridge';

startNativeBridge({
  port: 8765,
  pluginPaths: [
    '/Library/Audio/Plug-Ins/VST3',
    '~/Library/Audio/Plug-Ins/VST3'
  ]
});
```

## License

MIT
