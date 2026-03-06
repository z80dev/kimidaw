# @daw/racks

Ableton-style Racks System for the In-Browser DAW. This package provides a comprehensive implementation of Ableton Live's signature rack architecture, supporting complex nested routing with chains, zones, and macros.

## Features

- **Instrument Racks**: Layer and split instruments with velocity/key zones and chain selection
- **Drum Racks**: 128-pad drum machine with choke groups, send effects, and individual outputs
- **Audio Effect Racks**: Parallel effect processing with serial/parallel/frequency split modes
- **MIDI Effect Racks**: MIDI processing chains with routing and velocity processing
- **8 Macro Controls**: Per-rack macro knobs with full parameter mapping support
- **Zone System**: Key, Velocity, and Chain Select zones with crossfade support
- **Recursive Nesting**: Racks can contain other racks for complex setups
- **State Serialization**: Full save/load support for all rack configurations

## Installation

```bash
pnpm add @daw/racks
```

## Quick Start

### Create an Instrument Rack

```typescript
import { InstrumentRack, createVelocityLayerRack } from "@daw/racks";

// Create a velocity-layered instrument rack
const rack = createVelocityLayerRack("Layered Piano", 3);

// Or create manually with specific splits
const rack = InstrumentRack.create("Split Keys", {
  numLayers: 2,
  splitMode: "split",
});
rack.setupKeySplits([60]); // Split at middle C
```

### Create a Drum Rack

```typescript
import { DrumRack, createStandardDrumRack } from "@daw/racks";

// Create a standard 16-pad drum rack
const drums = createStandardDrumRack("My Kit");

// Or customize
const drums = DrumRack.create("Big Kit", {
  numPads: 64,
  numReturns: 4,
});

// Configure pads
drums.renamePad(36, "Kick");
drums.setPadChokeGroup(42, 1); // Choke group for hi-hats
drums.setPadSendLevel(36, "return_1", 0.3);
```

### Create an Audio Effect Rack

```typescript
import { AudioEffectRack, createParallelEffectRack } from "@daw/racks";

// Parallel processing
const fx = createParallelEffectRack("Parallel FX", 4);

// Frequency split (multiband)
const multiband = AudioEffectRack.create("Multiband", {
  numChains: 3,
  splitMode: "frequency",
});
multiband.setupFrequencySplit([
  { low: 0, high: 200 },    // Low
  { low: 200, high: 2000 }, // Mid
  { low: 2000, high: 20000 }, // High
]);

// Morphing chains
const morph = AudioEffectRack.create("Morph");
morph.setupMorphingChains();
```

### Create a MIDI Effect Rack

```typescript
import { MidiEffectRack, createChainSelectorRack } from "@daw/racks";

// Chain selector for routing
const router = createChainSelectorRack("Router", 4);

// Velocity processor
const rack = MidiEffectRack.create("Velocity");
rack.velocityMode = "scale";
rack.velocityScale = 1.2; // Boost velocity by 20%

// Humanize
const rack = MidiEffectRack.create("Humanize");
rack.velocityMode = "random";
```

## Macro System

Each rack has 8 macro controls that can map to any device parameter:

```typescript
// Map macro 1 to a device parameter
rack.mapMacro(1, "deviceId", "filterCutoff", {
  minValue: 0.2,
  maxValue: 0.8,
  inverted: false,
  curve: 0, // -1 (exponential) to 1 (logarithmic)
});

// Set macro value
rack.macros.setMacroValue(1, 0.75);

// Assign MIDI CC
rack.macros.assignMidiCC(1, 16); // CC 16

// Handle incoming MIDI
rack.macros.handleMidiCC(16, 127); // Full value
```

## Zone System

Zones determine when chains are active based on input:

```typescript
const chain = rack.chains[0];

// Key zone (MIDI note range)
chain.zones.keyZone.low = 36;
chain.zones.keyZone.high = 60;
chain.zones.keyZone.fadeLow = 30; // Crossfade start
chain.zones.keyZone.fadeHigh = 66; // Crossfade end

// Velocity zone
chain.zones.velocityZone.low = 60;
chain.zones.velocityZone.high = 127;

// Chain select zone (for key switching)
chain.zones.chainSelectZone.low = 0;
chain.zones.chainSelectZone.high = 42;

// Evaluate if chain should trigger
const shouldTrigger = chain.canTrigger({
  note: 48,
  velocity: 100,
  chainSelect: rack.chainSelector.value,
  channel: 0,
});
```

## Chain Selector

The chain selector enables dynamic chain selection:

```typescript
// Set chain select value (0-127)
rack.chainSelector.value = 64;

// Enable MIDI control
rack.chainSelector.midiCC = 1; // Mod wheel

// Smooth morphing
rack.chainSelector.smoothingMs = 100;

// Round-robin mode
rack.chainSelector.roundRobin = true;

// Note following
rack.chainSelector.followNotes = true;
rack.chainSelector.mapNoteToChain(60, "chain_1");
```

## Serialization

Save and load rack state:

```typescript
// Save
const state = rack.toJSON();
const json = JSON.stringify(state);

// Load
import { createRackFromState } from "@daw/racks";
const restored = createRackFromState(JSON.parse(json));
```

## Processing

Racks integrate with the DAW's audio processing:

```typescript
// Prepare for processing
rack.prepare(sampleRate, blockSize);

// Process audio/MIDI
rack.process(inputs, outputs, midiEvents, blockSize);

// Reset state
rack.reset();
```

## Plugin Integration

Wrap a rack as a plugin definition:

```typescript
import { rackAsPluginDefinition } from "@daw/racks";

const pluginDef = rackAsPluginDefinition(rack, {
  id: "com.mycompany.layered-piano",
  name: "Layered Piano",
  category: "instrument",
});

// Register with DAW
pluginRegistry.register(pluginDef);
```

## Architecture

```
Rack
├── Chains (parallel signal paths)
│   ├── Devices (instruments/effects)
│   ├── Zones (key/velocity/chain-select)
│   ├── Mixer (volume/pan/solo/mute)
│   └── Sends (for Drum Rack)
├── Macros (8 control knobs)
│   └── Mappings (to device parameters)
└── Chain Selector (dynamic routing)
```

## Advanced Features

### Solo/Mute Groups

```typescript
// Solo exclusive
rack.soloExclusive("chain_1");

// Clear all solos
rack.clearAllSolos();

// Check solo state
if (rack.anySoloActive) {
  // Handle solo logic
}
```

### Recursive Nesting

```typescript
// Add a rack inside another rack
const nestedRack = InstrumentRack.create("Nested");
const chain = rack.chains[0];

chain.addDevice({
  id: "nested_rack",
  definition: rackAsPluginDefinition(nestedRack),
  isRack: true,
  nestedRack: nestedRack.toJSON(),
  bypassed: false,
  frozen: false,
});
```

### Event System

```typescript
// Listen to rack events
const unsubscribe = rack.addEventHandler((event) => {
  switch (event.type) {
    case "chainAdded":
      console.log("Chain added:", event.chainId);
      break;
    case "macroChanged":
      console.log("Macro", event.macroId, "changed");
      break;
    case "soloChanged":
      console.log("Solo state changed");
      break;
  }
});

// Cleanup
unsubscribe();
```

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test:watch
```

## License

MIT
