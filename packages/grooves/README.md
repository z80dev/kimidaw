# @daw/grooves

Groove Pool and timing templates for the In-Browser DAW.

## Features

- **Groove Pool**: Manage timing templates
- **Extract Groove**: Create grooves from MIDI clips
- **Apply Groove**: Apply timing to MIDI notes
- **Commit Groove**: Bake timing changes into clips
- **Factory Grooves**: Built-in swing, shuffle, humanize templates
- **AGR Support**: Ableton Groove file format

## Installation

```bash
pnpm add @daw/grooves
```

## Usage

### Groove Pool

```typescript
import { createGroovePoolManager } from '@daw/grooves';

const pool = createGroovePoolManager();

// Load factory grooves
await pool.loadFactoryGrooves();

// Add custom groove
pool.addGroove(myGroove);

// Set current groove
pool.setCurrentGroove(grooveId);
```

### Extract Groove

```typescript
import { createGrooveExtractor } from '@daw/grooves';

const extractor = createGrooveExtractor();

// Extract from MIDI notes
const groove = extractor.extractGroove(
  notes, // Array of { start, velocity, duration }
  "Funky Drummer",
  {
    base: 0.25, // 16th notes
    timingAmount: 1.0,
    velocityAmount: 0.8,
  }
);

// Analyze first
const analysis = extractor.analyzeGroove(notes);
console.log(`Density: ${analysis.noteDensity} notes/beat`);
```

### Apply Groove

```typescript
import { createGrooveApplier } from '@daw/grooves';

const applier = createGrooveApplier();

// Apply to notes
const modifiedNotes = applier.applyGroove(
  notes,
  groove,
  {
    timing: 75,    // 75% timing intensity
    velocity: 50,  // 50% velocity intensity
    random: 10,    // 10% random timing
    quantize: 20,  // 20% quantization
  }
);

// Commit (bake in)
const committed = applier.commitGroove(modifiedNotes);
```

### Create Swing Groove

```typescript
import { createSwingGroove, createShuffleGroove, createMPCGroove } from '@daw/grooves';

// 8th note swing
const swing8 = createSwingGroove("Swing 8th", 57, 0.5);

// 16th note shuffle
const shuffle = createShuffleGroove(60);

// MPC-style swing
const mpc = createMPCGroove(54);
```

### Utility Functions

```typescript
import { quantizeNotes, humanizeNotes } from '@daw/grooves';

// Quantize
const quantized = quantizeNotes(notes, 0.25, 1.0);

// Humanize
const humanized = humanizeNotes(notes, 0.01, 10);
```

## Groove Parameters

- **Base**: Base note value (1 = quarter, 0.5 = 8th, 0.25 = 16th)
- **Quantize**: How much to quantize before applying groove (0-100)
- **Timing**: Timing deviation intensity (-100 to 100)
- **Random**: Random timing variation (0-100)
- **Velocity**: Velocity deviation intensity (-100 to 100)
- **Duration**: Duration deviation intensity (-100 to 100)

## AGR File Format

```typescript
// Import
const groove = await pool.importAGR('/path/to/groove.agr');

// Export
await pool.exportAGR(grooveId, '/path/to/export.agr');
```

## API Reference

### GroovePoolManager

- `addGroove(groove)` - Add groove to pool
- `removeGroove(id)` - Remove groove
- `getAllGrooves()` - Get all grooves
- `setCurrentGroove(id)` - Set active groove
- `loadFactoryGrooves()` - Load built-in grooves

### GrooveExtractor

- `extractGroove(notes, name, settings)` - Extract from notes
- `analyzeGroove(notes)` - Analyze timing characteristics

### GrooveApplier

- `applyGroove(notes, groove, settings)` - Apply groove
- `commitGroove(notes)` - Bake in changes
- `previewGroove(notes, groove)` - Preview application

## License

MIT
