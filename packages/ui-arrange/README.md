# @daw/ui-arrange

Arrange view (timeline) for the In-Browser DAW. Provides canvas-based rendering for high-performance timeline editing with virtualization for large sessions.

## Installation

```bash
pnpm add @daw/ui-arrange
```

## Usage

### Basic Arrange View

```tsx
import { ArrangeView } from '@daw/ui-arrange';

<ArrangeView
  project={project}
  transport={transport}
  onSelectionChange={(tracks, clips) => setSelection({ tracks, clips })}
  onTimelineClick={(tick) => transport.seek(tick)}
  onClipClick={(clipId, event) => selectClip(clipId)}
/>
```

### Canvas Renderers

The arrange view uses canvas-based rendering for performance:

```tsx
import { TimelineRenderer, ClipRenderer, TrackHeaderRenderer } from '@daw/ui-arrange';

// Timeline grid
const timelineRenderer = new TimelineRenderer(ctx, {
  width: 800,
  height: 600,
  viewport,
  config,
});
timelineRenderer.render();

// Clips
const clipRenderer = new ClipRenderer(ctx, {
  width: 800,
  height: 600,
  viewport,
  tracks: project.tracks,
  selectedClipIds,
  waveforms,
  config,
});
clipRenderer.render();

// Track headers
const headerRenderer = new TrackHeaderRenderer(ctx, {
  width: 200,
  height: 600,
  viewport,
  tracks: project.tracks,
  selectedTrackIds,
});
headerRenderer.render();
```

### Selection Model

Manage selection state for tracks and clips:

```tsx
import { SelectionModel } from '@daw/ui-arrange';

const selection = new SelectionModel({
  onChange: (state) => updateUI(state),
});

selection.select({ type: 'clip', id: 'clip1', trackId: 'track1' });
selection.toggle({ type: 'track', id: 'track1' });
selection.clear();
```

### Drag and Drop

Handle clip movement and resizing:

```tsx
import { DragDropManager } from '@daw/ui-arrange';

const dragDrop = new DragDropManager({
  snapGrid: 240, // Snap to 16th notes at 960 PPQ
  onDrop: (item, state) => {
    if (state.operation === 'move') {
      moveClip(item.id, state.targetTick!, state.targetTrackIndex!);
    }
  },
});

dragDrop.startDrag(
  { type: 'clip', id: 'clip1', sourceTrackId: 'track1' },
  { x: 100, y: 64 }
);
```

### Zoom Controller

Manage zoom and pan state:

```tsx
import { ZoomController } from '@daw/ui-arrange';

const zoom = new ZoomController({
  minZoom: 0.01,
  maxZoom: 10,
  onZoomChange: (state) => updateViewport(state),
});

zoom.zoomIn();
zoom.zoomOut();
zoom.zoomToFit(0, 960 * 16, 800); // Fit 16 bars into 800px
zoom.panTo(5000);
zoom.centerOn(1000, 800);
```

## Features

- **Canvas-based rendering** - 60fps scrolling and zooming
- **Virtualization** - Efficient rendering of large track counts
- **Selection model** - Multi-select, range select, invert
- **Drag and drop** - Move and resize clips with snapping
- **Zoom controller** - Smooth zoom and pan with constraints
- **Waveform display** - Audio clip waveform visualization
- **MIDI note display** - MIDI clip note indicators

## API Reference

### Components

- `ArrangeView` - Main arrange view component

### Canvas Renderers

- `TimelineRenderer` - Grid lines and bar numbers
- `ClipRenderer` - Audio and MIDI clips
- `TrackHeaderRenderer` - Track headers with controls

### Interactions

- `SelectionModel` - Selection state management
- `DragDropManager` - Drag and drop operations
- `ZoomController` - Zoom and pan state

### Types

- `ArrangeViewState` - Complete view state
- `ArrangeViewport` - Viewport position and zoom
- `ArrangeConfig` - View configuration

## Configuration

```tsx
const config: ArrangeConfig = {
  showMinorGrid: true,
  showBarNumbers: true,
  snapToGrid: true,
  snapDivision: 4,
  showClipNames: true,
  showWaveforms: true,
  showAutomation: true,
  showLoopBraces: true,
  minZoom: 0.01,
  maxZoom: 10,
  minTrackHeight: 32,
  maxTrackHeight: 256,
};
```

## Performance

The arrange view is optimized for large sessions:

- Only visible tracks and clips are rendered
- Canvas-based rendering avoids DOM overhead
- RequestAnimationFrame for smooth animations
- Efficient hit testing for interactions

## License

MIT
