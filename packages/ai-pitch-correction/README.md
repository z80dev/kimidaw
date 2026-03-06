# @daw/ai-pitch-correction

Melodyne-style AI pitch correction with polyphonic support.

## Features

- **Polyphonic Pitch Correction** - Correct multiple notes simultaneously
- **Formant Preservation** - Maintain vocal character during pitch shifts
- **Note-Based Editing** - Edit pitch like MIDI notes
- **Automatic Scale Detection** - Detect key and scale automatically
- **Vibrato Control** - Adjust or remove vibrato
- **Pitch Drift Correction** - Smooth out pitch variations
- **ARA Integration** - Seamless DAW integration

## Usage

```typescript
import { createPitchCorrector } from '@daw/ai-pitch-correction';

const corrector = await createPitchCorrector({
  algorithm: 'polyphonic',
  preserveFormants: true,
  quality: 'high'
});

// Analyze audio
const analysis = await corrector.analyze(audioBuffer);

// Get detected notes
const notes = analysis.getNotes();

// Correct to scale
const corrected = await corrector.correctToScale(analysis, {
  root: 'C',
  scale: 'major',
  strength: 0.8
});

// Or manual correction
for (const note of notes) {
  note.pitch = 60; // Set to middle C
  note.pitchDrift = 0; // Remove drift
  note.vibratoDepth = 0.3; // Adjust vibrato
}

const result = await corrector.render(analysis);
```

## License

MIT
