# @daw/ui-detail-view

Ableton-style clip detail view components for the In-Browser DAW.

## Features

- **Clip View** - Waveform/MIDI note display
- **Sample Settings** - Warp, gain, transpose
- **Envelopes** - Clip envelope editor
- **Launch Settings** - Quantization and follow actions

## Installation

```bash
pnpm add @daw/ui-detail-view
```

## Usage

```tsx
import { ClipDetailView } from '@daw/ui-detail-view';

function App() {
  const [clip, setClip] = useState(selectedClip);

  return (
    <ClipDetailView
      clip={clip}
      onClipChange={setClip}
      sampleRate={44100}
      ppq={960}
    />
  );
}
```

## Components

### ClipDetailView

Main container with tabbed interface:

```tsx
<ClipDetailView
  clip={clip}                    // AudioClip or MidiClip
  onClipChange={(clip) => {}}   // Called when clip is modified
  sampleRate={44100}             // For audio calculations
  ppq={960}                      // Pulses per quarter note
/>
```

Tabs:
- **Clip** - Overview and basic editing
- **Sample** - Audio clip settings (audio clips only)
- **MIDI** - MIDI note editing (MIDI clips only)
- **Envelopes** - Automation envelope editor
- **Launch** - Quantization and follow actions

### SampleEditor

Audio clip editing:

```tsx
import { SampleEditor } from '@daw/ui-detail-view';

<SampleEditor
  clip={audioClip}
  sampleRate={44100}
  onClipChange={handleChange}
/>
```

Features:
- Warp mode selection (Re-Pitch, Beats, Tones, Texture, Complex, etc.)
- Transpose (-48 to +48 semitones)
- Detune (-100 to +100 cents)
- Gain (-48 to +24 dB)
- Reverse playback
- Warp/transient marker display options

### MidiDetailView

MIDI clip editing:

```tsx
import { MidiDetailView } from '@daw/ui-detail-view';

<MidiDetailView
  clip={midiClip}
  ppq={960}
  onClipChange={handleChange}
/>
```

Features:
- Note list with selection
- Fold modes: None, To Scale, To Used
- Scale highlighting (Major, Minor, Modes, Pentatonic, Blues)
- Velocity display and editing
- Note statistics

### EnvelopeEditor

Clip automation:

```tsx
import { EnvelopeEditor } from '@daw/ui-detail-view';

<EnvelopeEditor
  clip={clip}
  automationLanes={lanes}
  ppq={960}
  onLaneChange={handleLanes}
/>
```

Features:
- Volume, Pan, Send envelopes
- Device parameter automation
- Pencil, line, and selection tools
- Multiple visible lanes

### LaunchSettings

Clip launch configuration:

```tsx
import { LaunchSettings } from '@daw/ui-detail-view';

<LaunchSettings
  clip={clip}
  onSettingsChange={handleSettings}
/>
```

Features:
- Quantization (None, 1/8, 1/16, 1/32, Global, etc.)
- Launch Mode (Trigger, Gate, Toggle, Repeat)
- Follow Actions (Next, Previous, Any, Self, etc.)
- Velocity sensitivity
- Legato mode

## State Types

### Sample Editor State

```typescript
interface SampleEditorState {
  warpMode: WarpMode;
  transposeSemitones: number;
  detuneCents: number;
  gainDb: number;
  reverse: boolean;
  showTransientMarkers: boolean;
  showWarpMarkers: boolean;
  showGrid: boolean;
  selectedWarpMarker: string | null;
}
```

### MIDI Editor State

```typescript
interface MidiEditorState {
  showVelocity: boolean;
  showModulation: boolean;
  showPitchBend: boolean;
  showAftertouch: boolean;
  showNoteNames: boolean;
  foldMode: 'none' | 'to-scale' | 'to-used';
  scaleHighlight: {
    rootNote: number;
    mode: ScaleMode;
  } | null;
}
```

### Launch Settings State

```typescript
interface LaunchSettingsState {
  quantization: LaunchQuantization;
  followAction: FollowAction | null;
  launchMode: 'trigger' | 'gate' | 'toggle' | 'repeat';
  velocitySensitivity: boolean;
  legato: boolean;
}
```

## Warp Modes

- `repitch` - Changes pitch with speed (like a turntable)
- `beats` - Slices audio at transients, maintains pitch
- `tones` - Optimized for tonal/monophonic material
- `texture` - Granular synthesis for pads/textures
- `complex` - High-quality time-stretch for complex mixes
- `complex-pro` - Advanced formant preservation
- `granular` - Full granular synthesis control
- `formants` - Formant preservation for vocals

## Styling

Components use CSS classes for styling:

```css
.clip-detail-view { }
.detail-tabs { }
.detail-toolbar { }
.detail-content { }
.sample-editor { }
.midi-detail-view { }
.envelope-editor { }
.launch-settings { }
```

## Dependencies

- React 18+
- @daw/project-schema
- @daw/waveforms
