# @daw/ai-source-separation

AI-powered source separation for the In-Browser DAW. Extract vocals, drums, bass, and other instruments from any audio using state-of-the-art deep learning models.

## Features

- **4-Stem Separation**: Vocals, Drums, Bass, Other
- **6-Stem Separation**: Add Piano and Guitar separation
- **Real-time separation** during playback (with buffering)
- **Offline high-quality separation** for export
- **Vocal isolation** with bleed reduction
- **Instrumental generation** (karaoke mode)

## Supported Models

- **Demucs v4** (hybrid transformer architecture) - Recommended
- **Spleeter** (5-stem separation)
- **Open-Unmix** (UMX)

## Usage

```typescript
import { createSourceSeparator, StemType } from '@daw/ai-source-separation';

const separator = await createSourceSeparator({
  model: 'demucs-v4',
  stems: ['vocals', 'drums', 'bass', 'other'],
  quality: 'high',
});

const result = await separator.separate(audioBuffer);
const vocals = result.getStem('vocals');
```

## License

MIT
