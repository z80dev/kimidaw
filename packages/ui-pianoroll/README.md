# @daw/ui-pianoroll

Piano roll editor for the In-Browser DAW. Provides canvas-based MIDI note editing with velocity lanes, scale highlighting, and advanced editing operations.

## Installation

```bash
pnpm add @daw/ui-pianoroll
```

## Usage

### Basic Piano Roll

```tsx
import { PianoRoll } from '@daw/ui-pianoroll';

<PianoRoll
  clip={midiClip}
  selectedNoteIds={selectedNotes}
  onNotesChange={(notes) => updateClip(notes)}
  onSelectionChange={(ids) => setSelectedNotes(ids)}
  onNoteClick={(note) => auditionNote(note)}
  inputMode="select"
/>
```

### Canvas Renderers

```tsx
import { GridRenderer, NoteRenderer, VelocityRenderer } from '@daw/ui-pianoroll';

// Grid
const gridRenderer = new GridRenderer(ctx, {
  width: 800,
  height: 400,
  viewport,
  config,
});
gridRenderer.render();

// Notes
const noteRenderer = new NoteRenderer(ctx, {
  width: 800,
  height: 400,
  viewport,
  notes: clip.notes,
  selectedNoteIds,
  config,
});
noteRenderer.render();

// Velocity
const velocityRenderer = new VelocityRenderer(ctx, {
  width: 800,
  height: 80,
  viewport,
  notes: clip.notes,
  selectedNoteIds,
});
velocityRenderer.render();
```

### Note Editing

```tsx
import { NoteEditor } from '@daw/ui-pianoroll';

const editor = new NoteEditor({
  snapGrid: 240,
  onChange: (notes) => updateClip(notes),
});

// Draw new note
editor.startDraw(tick, pitch, clip);
editor.updateDrag(tick, pitch);
const newNote = editor.endDraw();

// Move notes
editor.startMove(['note1', 'note2'], clip);
const movedNotes = editor.updateMove(deltaTick, deltaPitch, clip);
```

### Quantization

```tsx
import { Quantizer } from '@daw/ui-pianoroll';

const quantizer = new Quantizer({
  division: 4,      // 16th notes
  amount: 1,        // 100% quantization
  swing: 0.2,       // 20% swing
});

const quantized = quantizer.quantize(notes);
const swung = quantizer.applySwing(quantized);
const humanized = quantizer.humanize(swung, 10);
```

## Features

- **Canvas-based rendering** - 60fps note editing
- **Piano keyboard display** - Visual note reference
- **Scale highlighting** - Show notes in selected scale
- **Velocity lane** - Edit note velocities
- **Multiple input modes** - Select, draw, erase
- **Quantization** - Grid, swing, humanize
- **Advanced editing** - Legato, strum

## Configuration

```tsx
const config: PianoRollConfig = {
  showPianoKeys: true,
  showVelocity: true,
  velocityHeight: 80,
  showScaleHighlight: true,
  scaleRoot: 0,  // C
  scaleMode: 'major',
  showKeyLabels: true,
  snapToGrid: true,
  snapDivision: 4,
  foldMode: false,
  drumMode: false,
};
```

## Scale Modes

- `chromatic` - All notes
- `major`, `minor` - Common scales
- `dorian`, `phrygian`, `lydian`, `mixolydian` - Modes
- `pentatonic-major`, `pentatonic-minor` - Pentatonic
- `blues` - Blues scale

## License

MIT
