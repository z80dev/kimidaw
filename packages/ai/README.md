# @daw/ai

AI-powered features for the In-Browser DAW.

## Features

- **Auto-Mastering**: Intelligent limiter settings and mastering chain
- **Smart Comping**: AI-assisted take selection
- **Drum Replacement**: Replace drum sounds with samples
- **Smart Quantize**: Intelligent timing correction

## Usage

### Auto-Mastering

```typescript
import { createAutoMasteringEngine } from '@daw/ai';

const mastering = createAutoMasteringEngine();

// Analyze audio
const analysis = mastering.analyze(audioBuffer, 48000);

// Get suggested settings
const settings = mastering.suggestSettings(analysis, 'electronic');

// Apply mastering
const mastered = mastering.applySettings(settings, audioBuffer);
```

### Smart Comping

```typescript
import { createSmartCompingEngine } from '@daw/ai';

const comping = createSmartCompingEngine();

// Analyze takes
const analyses = comping.analyzeTakes(takes);

// Get comp suggestion
const suggestion = comping.suggestComp(lane, {
  prioritizeExpression: true,
});

// Auto-comp
const selections = comping.autoComp(lane);
```

### Drum Replacement

```typescript
import { createDrumReplacementEngine } from '@daw/ai';

const drums = createDrumReplacementEngine();

// Detect drums in audio
const hits = drums.detectDrums(audioData, 48000);

// Replace with samples
const result = drums.replaceDrums(hits, {
  targetSamples: drums.getDefaultSampleMap(),
  velocitySensitivity: 0.8,
});
```

### Smart Quantize

```typescript
import { createSmartQuantizeEngine, BUILT_IN_GROOVES } from '@daw/ai';

const quantize = createSmartQuantizeEngine();

// Analyze timing
const analysis = quantize.analyzeTiming(notes, '1/16');

// Get suggested settings
const settings = quantize.suggestSettings(analysis);

// Quantize with groove
const result = quantize.quantizeWithGroove(
  notes,
  BUILT_IN_GROOVES[1], // Shuffle
  0.8
);
```
