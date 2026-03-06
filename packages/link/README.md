# @daw/link

Ableton Link protocol implementation for the In-Browser DAW.

## Features

- **Tempo Sync**: Synchronize tempo across multiple devices
- **Phase Sync**: Align beat phase across peers
- **Quantum Sync**: Sync to bar/phrase boundaries
- **Start/Stop Sync**: Optional transport synchronization
- **Peer Discovery**: Auto-discover other Link devices

## Installation

```bash
pnpm add @daw/link
```

## Usage

### Basic Setup

```typescript
import { createLinkClient } from '@daw/link';

const link = createLinkClient({
  initialTempo: 128,
  initialQuantum: 4,
});

// Enable Link
link.enable();

// Listen for changes
link.onEvent((event) => {
  switch (event.type) {
    case 'tempo-changed':
      console.log('Tempo:', link.getTempo());
      break;
    case 'peer-joined':
      console.log('Peer joined:', link.numPeers, 'peers total');
      break;
    case 'start-stop-sync':
      console.log('Transport:', link.isPlaying() ? 'playing' : 'stopped');
      break;
  }
});
```

### Tempo Control

```typescript
// Any peer can change tempo
link.setTempo(130);

// Get current beat time
const { beat, phase, progress } = link.getBeatTime();
console.log(`Beat ${beat}, Phase: ${phase}/${link.quantum}`);

// Convert between beats and time
const futureBeat = link.getBeatAtTime(performance.now() + 1000);
const futureTime = link.getTimeAtBeat(beat + 4);
```

### Transport Control

```typescript
// Enable start/stop sync
link.setStartStopSyncEnabled(true);

// Start/stop (synced across peers)
link.setIsPlaying(true);
link.setIsPlaying(false);

// Check transport state
if (link.isPlaying()) {
  // Audio is playing
}
```

### Phase Synchronization

```typescript
import { alignToQuantum, getPhaseInQuantum } from '@daw/link';

// Align a beat to quantum boundary
const aligned = alignToQuantum(4.7, 4); // 4
const nextQuantum = alignToQuantum(4.7, 4, 'ceil'); // 8

// Get phase within quantum
const phase = getPhaseInQuantum(4.7, 4); // 0.7

// Check if at quantum boundary
const atBoundary = isAtQuantumBoundary(4.01, 4); // true
```

## WebSocket Bridge

For real network synchronization, use the WebSocket bridge:

```typescript
import { createWebSocketPeerDiscovery } from '@daw/link';

const wsDiscovery = createWebSocketPeerDiscovery({
  onPeerJoined: (peer) => console.log('Joined:', peer.id),
  onPeerLeft: (peer) => console.log('Left:', peer.id),
  onStateReceived: (state, peer) => {
    // Handle received state
  },
});

wsDiscovery.connect('wss://your-link-server.com/link');
```

## Architecture

The Link implementation consists of:

- **LinkClient**: Main API for Link integration
- **PeerDiscovery**: Discovers and manages peer connections
- **TempoSync**: Handles tempo consensus and transitions
- **SessionState**: Tracks current tempo, beat, and transport state
- **PhaseSync**: Aligns beat phase across peers

## Browser Limitations

Due to browser security restrictions:

- UDP multicast is not available in browsers
- Cross-tab communication uses BroadcastChannel
- For real network sync, a WebSocket bridge is required

## API Reference

### createLinkClient(options)

Create a Link client.

**Options:**
- `initialTempo`: Starting tempo (default: 120)
- `initialQuantum`: Quantum size in beats (default: 4)
- `startStopSync`: Enable transport sync (default: true)

**Methods:**
- `enable()`: Start Link
- `disable()`: Stop Link
- `setTempo(tempo)`: Change tempo
- `getBeatTime()`: Get current beat, phase, and progress
- `setIsPlaying(playing)`: Control transport
- `onEvent(handler)`: Subscribe to events

## License

MIT
