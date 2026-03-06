# @daw/ui-session

Ableton-style Session View for the In-Browser DAW.

## Overview

This package provides a complete Ableton Live-style Session View implementation for browser-based DAWs, featuring:

- **Grid-based clip launcher** with vertical tracks and horizontal scenes
- **Multi-launch quantization** with configurable timing
- **Follow actions** for advanced clip sequencing
- **Clip envelopes** for parameter automation
- **Scene management** with tempo/time signature overrides
- **Session recording** into empty clip slots
- **Arrangement integration** for seamless workflow
- **Linked track editing** for simultaneous multi-clip editing

## Installation

```bash
pnpm add @daw/ui-session
```

## Quick Start

```tsx
import { 
  SessionGrid, 
  TrackHeaders, 
  SceneHeaders,
  useSessionView,
  LaunchSystem 
} from '@daw/ui-session';

function App() {
  const session = useSessionView({
    onClipLaunch: (clipId, slotId) => {
      console.log('Launched clip:', clipId);
    },
    onSceneLaunch: (sceneId) => {
      console.log('Launched scene:', sceneId);
    },
  });

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <TrackHeaders
        tracks={session.tracks}
        onTrackMuteToggle={session.toggleTrackMute}
        onTrackSoloToggle={session.toggleTrackSolo}
        onTrackArmToggle={session.toggleTrackArm}
      />
      <SessionGrid
        scenes={session.scenes}
        tracks={session.tracks}
        slots={session.slots}
        clips={session.clips}
        viewState={session.viewState}
        onSlotClick={(slot) => session.selectSlot(slot.id)}
        onSceneClick={(scene) => session.launchScene(scene.id)}
      />
      <SceneHeaders
        scenes={session.scenes}
        onSceneLaunch={session.launchScene}
        onSceneRename={session.renameScene}
        onStopAllClips={() => {/* ... */}}
      />
    </div>
  );
}
```

## Components

### SessionGrid

The main grid component displaying tracks (columns) and scenes (rows).

```tsx
<SessionGrid
  scenes={scenes}
  tracks={tracks}
  slots={slots}
  clips={clips}
  viewState={viewState}
  isPlaying={isPlaying}
  currentTick={currentTick}
  onSlotClick={handleSlotClick}
  onSceneClick={handleSceneClick}
  onSelectionChange={handleSelectionChange}
/>
```

**Features:**
- Canvas-based rendering for performance
- Multi-select with Shift/Ctrl+click
- Drag-to-select (lasso)
- Progress indicators for playing clips
- Visual feedback for queued/recording states

### TrackHeaders

Left-side track control strips.

```tsx
<TrackHeaders
  tracks={tracks}
  selectedTrackIds={selectedTracks}
  onTrackMuteToggle={handleMute}
  onTrackSoloToggle={handleSolo}
  onTrackArmToggle={handleArm}
  onVolumeChange={handleVolume}
  onPanChange={handlePan}
/>
```

**Features:**
- Mute/Solo/Arm/Cue buttons
- Volume faders with meters
- Pan knobs
- Input/output routing
- Track reordering via drag-and-drop
- Group track folding

### SceneHeaders

Right-side scene launch buttons.

```tsx
<SceneHeaders
  scenes={scenes}
  onSceneLaunch={handleLaunch}
  onSceneRename={handleRename}
  onSceneColorChange={handleColor}
  showTempo={true}
  showTimeSignature={false}
/>
```

**Features:**
- Scene launch buttons
- Tempo override display
- Time signature override
- Scene color picker
- Drag-to-reorder
- Context menu for scene operations

### ClipSlots

Individual clip slot containers.

```tsx
<ClipSlots
  slot={slot}
  clip={clip}
  isPlaying={isPlaying}
  isQueued={isQueued}
  progress={0.5}
  countdown={2}
  onLaunch={handleLaunch}
  onStop={handleStop}
  size="normal"
/>
```

**Features:**
- Launch modes: Trigger, Gate, Toggle, Repeat
- Progress indicator
- Countdown for queued clips
- Loop indicator
- Warp indicator
- Context menu

## System Classes

### LaunchSystem

Manages clip and scene launching with quantization.

```typescript
const launchSystem = new LaunchSystem({
  onClipLaunch: (clipId, slotId, velocity) => {
    // Trigger audio playback
  },
  onClipStop: (clipId, slotId) => {
    // Stop playback
  },
});

// Queue a clip for launch
const item = launchSystem.queueClipLaunch(
  clip, 
  slot, 
  { isPlaying: true, currentTick: 1920, tempo: 120, globalQuantization: '1 bar' }
);

// Process queue on each transport update
const launched = launchSystem.processQueue(transportState);
```

**Launch Modes:**
- `trigger`: Start playing, continue until stopped
- `gate`: Play while button is held
- `toggle`: Toggle between play/stop
- `repeat`: Re-trigger on each click

**Quantization Values:**
- None, 1/32, 1/16, 1/8, 1/4, 1/2
- 1 bar, 2 bars, 4 bars, 8 bars
- Global (uses project quantization)

### ClipEnvelopes

Manages parameter automation within clips.

```typescript
const envelopes = new ClipEnvelopes();

// Create volume envelope
const env = envelopes.createVolumeEnvelope(clipId, 0.8);

// Add breakpoints
envelopes.addBreakpoint(env.id, 960, 0.5, 'linear');
envelopes.addBreakpoint(env.id, 1920, 1.0, 'bezier');

// Get value at time
const { value } = envelopes.getValueAtTime(env.id, 1440);
```

**Envelope Targets:**
- Audio: Volume, Pan, Transpose, Detune
- MIDI: CC, Pitch Bend, Aftertouch
- Plugin parameters

### SceneManager

Manages scene organization and launching.

```typescript
const sceneManager = new SceneManager();

// Create scenes
const scene = sceneManager.createScene({ name: 'Intro' });

// Set tempo override
sceneManager.setSceneTempo(scene.id, 128);

// Capture current playing state
const result = sceneManager.captureScene(
  name, 
  playingSlots, 
  clips, 
  tracks
);
```

### SessionRecording

Handles recording into session slots.

```typescript
const recording = new SessionRecording();

// Record into a slot
const session = recording.startSlotRecording(
  slot, 
  'midi', 
  currentTick
);

// Stop and create clip
const clip = recording.stopRecording(session.id, endTick);

// Retrospective capture
const { clip, buffer } = recording.captureRetrospective(trackId, 'midi');
```

### SessionArrangementIntegration

Manages the relationship between Session and Arrangement views.

```typescript
const integration = new SessionArrangementIntegration();

// Capture session to arrangement
const result = integration.captureToArrangement(
  scenes, 
  slots, 
  clips, 
  tracks
);

// Continue playback to arrangement
integration.continueToArrangement(
  currentTick, 
  playingClipIds, 
  clips
);
```

### LinkedTracks

Allows editing multiple clips simultaneously.

```typescript
const linked = new LinkedTracks();

// Link clips
linked.linkClips([clipId1, clipId2, clipId3]);

// Quantize all linked clips
linked.quantizeLinked(clips, { gridSize: 240, strength: 1 });

// Adjust velocities
linked.adjustVelocityLinked(clips, { mode: 'scale', value: 0.8 });
```

## Hooks

### useSessionView

Main state management hook.

```typescript
const session = useSessionView({
  initialScenes: [],
  initialTracks: [],
  initialSlots: [],
  initialClips: [],
  onClipLaunch: (clipId, slotId) => {},
  onSceneLaunch: (sceneId) => {},
  onStateChange: (state) => {},
});

// Access state
const { scenes, tracks, slots, clips, viewState } = session;

// Scene operations
const scene = session.addScene('New Scene');
session.removeScene(sceneId);
session.launchScene(sceneId);

// Track operations
const track = session.addTrack('Drums', 'midi');
session.toggleTrackMute(trackId);
session.toggleTrackSolo(trackId);
session.toggleTrackArm(trackId);

// Clip operations
const clip = session.createClip(trackId, sceneId, 'Beat');
session.launchClip(slotId);
session.stopClip(slotId);
session.deleteClip(clipId);

// Selection
session.selectSlot(slotId, multiSelect);
session.selectScene(sceneId, multiSelect);
session.selectTrack(trackId, multiSelect);
session.clearSelection();
```

## Follow Actions

Follow actions enable powerful clip sequencing:

```typescript
import { 
  createDefaultFollowAction,
  selectFollowAction,
  resolveFollowAction 
} from '@daw/ui-session';

// Create follow action
const followAction = {
  ...createDefaultFollowAction(),
  actionA: 'playNext',
  chanceA: 70,
  actionB: 'playAny',
  chanceB: 30,
  followTimeBars: 1,
};

// Select action based on chance
const { type } = selectFollowAction(followAction, Math.random());

// Resolve to target
const result = resolveFollowAction(type, context);
```

**Available Actions:**
- No Action
- Stop
- Play Clip Again
- Play Previous/Next Clip
- Play First/Last Clip
- Play Any/Other Clip
- Play Random/Random Other Clip

## Quantization

```typescript
import {
  calculateLaunchTime,
  quantizeTick,
  formatTickTime,
} from '@daw/ui-session';

// Calculate quantized launch time
const launchTick = calculateLaunchTime(
  currentTick,      // Current transport position
  '1 bar',          // Quantization
  '1 bar'           // Global quantization (if using 'global')
);

// Format for display
const timeString = formatTickTime(launchTick); // "1.1.1"
```

## Keyboard Shortcuts

The Session View supports these keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| Space | Launch/stop selected clip |
| Delete/Backspace | Delete selected clip |
| Ctrl/Cmd + D | Duplicate selected clip |
| Ctrl/Cmd + C | Copy selected clips |
| Ctrl/Cmd + V | Paste clips |
| Arrow Keys | Navigate grid |
| Shift + Arrows | Extend selection |
| Enter | Edit clip name |
| Esc | Clear selection |

## MIDI Mapping

Session elements can be mapped to MIDI controllers:

```typescript
interface SessionMidiMapping {
  id: string;
  type: 'sceneLaunch' | 'clipLaunch' | 'stopClip' | 'stopAll';
  targetId: string;
  midiNote?: number;
  midiCC?: number;
  channel: number;
}
```

## TypeScript

All components and functions are fully typed:

```typescript
import type {
  Scene,
  Track,
  Clip,
  ClipSlot,
  SessionViewState,
  ClipLaunchSettings,
  FollowAction,
  QuantizationValue,
  LaunchMode,
} from '@daw/ui-session';
```

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14.1+

Requires:
- ES2020
- Canvas 2D
- Drag and Drop API
- ResizeObserver

## Performance Considerations

- Uses Canvas 2D for grid rendering (not DOM-heavy)
- Virtualization for large sessions
- Memoized selectors for clip lookup
- Throttled scroll handlers
- Optimized re-renders with React.memo

## License

MIT
