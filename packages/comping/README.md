# @daw/comping

Ableton-style take lanes and comping for the In-Browser DAW.

## Features

- **Take Lanes** - Multiple takes per track with color coding
- **Comp Tool** - Swipe-to-select best parts from takes
- **Crossfades** - Automatic crossfades at comp boundaries
- **Flatten** - Merge comp to single take

## Installation

```bash
pnpm add @daw/comping
```

## Usage

```typescript
import { TakeLaneManager, CompToolManager, CrossfadeGenerator } from '@daw/comping';

// Create take lanes
const laneManager = new TakeLaneManager();
const lane1 = laneManager.createTakeLane(trackId, 'audio', 'Take 1');
const lane2 = laneManager.createTakeLane(trackId, 'audio', 'Take 2');

// Create comp take
const compManager = new CompToolManager();
const compTake = compManager.createCompTake();

// Select regions from different takes
compManager.selectRegion(compTake.id, lane1, clip1Id, 0, 960);      // First bar from take 1
compManager.selectRegion(compTake.id, lane2, clip2Id, 960, 1920);   // Second bar from take 2

// Generate crossfades
const crossfades = CrossfadeGenerator.generateRegionCrossfades(
  compManager.getRegions(compTake.id),
  44100
);
```

## Take Lane Management

### Creating Take Lanes

```typescript
// Create individual lanes
const lane = laneManager.createTakeLane(trackId, 'audio', 'Take 1');

// Create multiple lanes for cycle recording
const lanes = laneManager.createTakeLanesForCycle(trackId, 'audio', 4);

// Set active lane
laneManager.setActiveLane(trackId, lane.id);

// Duplicate lane
const duplicate = laneManager.duplicateLane(lane.id);
```

### Cycle Recording Modes

```typescript
laneManager.setPreferences({
  cycleRecordMode: 'create-new-lane' // or 'overdub-current', 'stack-takes'
});
```

## Comp Tool

### Swipe Comping

```typescript
compManager.setTool('swipe');

// Select regions by dragging across takes
compManager.swipeSelect(compTake.id, [
  { startTick: 0, endTick: 480, takeLaneId: 'lane_1' },
  { startTick: 480, endTick: 960, takeLaneId: 'lane_2' }
]);
```

### Region Editing

```typescript
// Split region
compManager.splitRegion(compTake.id, regionId, 480);

// Move to different take
compManager.moveRegionToLane(compTake.id, regionId, newLaneId, newClipId);

// Resize region
compManager.resizeRegion(compTake.id, regionId, newStartTick, newEndTick);

// Undo/Redo
compManager.undo();
compManager.redo();
```

## Crossfades

### Automatic Crossfades

```typescript
const compManager = new CompToolManager({
  autoCrossfade: true,
  defaultCrossfadeMs: 10,
  defaultFadeCurve: 'equal-power'
});
```

### Crossfade Curves

- `linear` - Linear crossfade
- `equal-power` - Constant perceived loudness
- `s-curve` - Smooth sigmoid curve
- `exponential` - Exponential fade
- `logarithmic` - Logarithmic fade

### Manual Crossfade Generation

```typescript
const result = CrossfadeGenerator.applyCrossfade(
  leftBuffer,
  rightBuffer,
  durationSamples,
  'equal-power'
);
```

## Flattening

```typescript
// Flatten comp to single clip
const flattened = await consolidateEngine.flattenTrack(track, {
  freezeOnly: false,
  includeEffects: true
});
```

## API Reference

### TakeLaneManager

- `createTakeLane(trackId, type, name?)` - Create a take lane
- `createTakeLanesForCycle(trackId, type, numTakes)` - Create multiple lanes
- `getLanesForTrack(trackId)` - Get all lanes for a track
- `setActiveLane(trackId, laneId)` - Set active lane
- `setLaneMuted(laneId, muted)` - Mute/unmute lane
- `moveLane(laneId, direction)` - Reorder lane
- `duplicateLane(laneId)` - Duplicate lane with clips

### CompToolManager

- `createCompTake()` - Create a new comp take
- `selectRegion(compTakeId, takeLane, clipId, startTick, endTick)` - Add region
- `swipeSelect(compTakeId, selections)` - Multi-region select
- `removeRegion(compTakeId, regionId)` - Remove region
- `splitRegion(compTakeId, regionId, splitTick)` - Split region
- `undo()` / `redo()` - History navigation

### CrossfadeGenerator

- `generateCurve(durationSamples, curve)` - Generate fade curve
- `applyCrossfade(leftBuffer, rightBuffer, duration, curve)` - Apply crossfade
- `findZeroCrossing(buffer, position, range)` - Find optimal crossfade point
- `generateRegionCrossfades(regions, sampleRate)` - Generate all crossfades
