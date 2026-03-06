# Impulse Drum Sampler

Ableton-style 8-slot drum sampler for the In-Browser DAW.

## Features

- **8 Sample Slots**: Each with independent processing
- **Per-Slot Controls**: Start, length, fade, filter, saturation
- **Time Expansion**: Stretch samples without pitch change
- **Decay Envelopes**: Per-sample amplitude envelope
- **Individual Tuning**: Each slot can be tuned independently
- **Global Controls**: Transpose, spread, gain

## Usage

```typescript
import { createImpulseDefinition } from "@daw/instruments-impulse";

const definition = createImpulseDefinition();
const instance = await definition.createInstance(context);

// Load samples
instance.loadSample(0, kickBuffer, 48000);  // C1
instance.loadSample(1, snareBuffer, 48000); // C#1
instance.loadSample(2, hihatBuffer, 48000); // D1

// Trigger via MIDI
```

## Default MIDI Mappings

| Slot | Default Note |
|------|-------------|
| 1 | C1 (36) |
| 2 | C#1 (37) |
| 3 | D1 (38) |
| 4 | D#1 (39) |
| 5 | E1 (40) |
| 6 | F1 (41) |
| 7 | F#1 (42) |
| 8 | G1 (43) |

## License

MIT
