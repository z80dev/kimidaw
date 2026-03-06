# @daw/ai-mastering

AI-powered automatic mastering engine with genre-aware processing.

## Features

- **Genre-Aware Mastering** - Optimized presets for Electronic, Hip-Hop, Rock, Pop, Jazz, Classical
- **Reference Track Matching** - Match the sound of any reference track
- **Intelligent Processing Chain**:
  - EQ curve optimization
  - Multiband compression
  - Stereo width enhancement
  - Harmonic excitation
  - True-peak limiting
- **LUFS Targeting** - Precise loudness to streaming standards
  - Spotify: -14 LUFS
  - YouTube: -14 LUFS
  - Apple Music: -16 LUFS
  - Club/DJ: -8 LUFS
- **Quality Grades**:
  - Crystal: Ultra-transparent
  - Warm: Analog character
  - Punchy: Aggressive transients
  - Bright: Enhanced presence

## Usage

```typescript
import { createMasteringEngine } from '@daw/ai-mastering';

const engine = await createMasteringEngine({
  genre: 'electronic',
  targetLoudness: -14, // LUFS
  quality: 'crystal'
});

// Analyze track
const analysis = await engine.analyze(mixBuffer);

// Get suggested chain
const chain = engine.suggestChain(analysis);

// Apply mastering
const mastered = await engine.process(mixBuffer, chain);

// Or use quick preset
const quickMaster = await engine.quickMaster(mixBuffer, 'electronic-loud');
```

## License

MIT
