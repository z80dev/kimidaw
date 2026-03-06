# Analog Subtractive Synthesizer

Ableton-style dual oscillator subtractive synthesizer for the In-Browser DAW.

## Features

- **2 Main Oscillators**: Sine, triangle, sawtooth, square, pulse waveforms
- **Sub Oscillator**: -1/-2 octave square wave
- **Noise Generator**: White, pink, red, blue noise types
- **2 Multimode Filters**: LP, HP, BP, Notch, Formant
- **Filter Routing**: Series or parallel
- **3 Envelopes**: Amp, filter, and modulation
- **2 LFOs**: 6 waveforms, multiple destinations
- **Unison/Spread**: Up to 4 voices with detune
- **Glide**: Portamento with legato option

## Usage

```typescript
import { createAnalogDefinition } from "@daw/instruments-analog";

const definition = createAnalogDefinition();
const instance = await definition.createInstance(context);

// Trigger notes
instance.process(inputs, outputs, midiEvents, blockSize);
```

## License

MIT
