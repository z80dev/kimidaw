# @daw/ui-mixer

Mixer panel for the In-Browser DAW. Provides channel strips with meters, sends, inserts, and routing controls.

## Installation

```bash
pnpm add @daw/ui-mixer
```

## Usage

### Basic Mixer

```tsx
import { Mixer } from '@daw/ui-mixer';

<Mixer
  tracks={project.tracks}
  buses={project.buses}
  master={project.master}
  selectedTrackId={selectedTrack}
  meterLevels={meterLevels}
  peakLevels={peakLevels}
  onTrackSelect={(id) => selectTrack(id)}
  onMuteToggle={(id) => toggleMute(id)}
  onSoloToggle={(id) => toggleSolo(id)}
  onVolumeChange={(id, db) => setVolume(id, db)}
  onPanChange={(id, pan) => setPan(id, pan)}
/>
```

### Channel Strip

```tsx
import { ChannelStrip } from '@daw/ui-mixer';

<ChannelStrip
  track={track}
  index={0}
  isSelected={false}
  meterLevel={-12}
  peakLevel={-6}
  onMuteToggle={() => toggleMute(track.id)}
  onVolumeChange={(db) => setVolume(track.id, db)}
/>
```

### Meter

```tsx
import { Meter } from '@daw/ui-mixer';

<Meter
  level={currentLevelDb}
  peak={peakLevelDb}
  width={12}
  height={120}
  minDb={-60}
  maxDb={6}
/>
```

### Sends

```tsx
import { Sends } from '@daw/ui-mixer';

<Sends
  sends={track.sends}
  onSendChange={(index, level) => updateSend(index, level)}
/>
```

## Features

- **Channel strips** - Volume, pan, mute, solo, arm
- **Peak/RMS meters** - Real-time level visualization
- **Send controls** - Route to effect buses
- **Color coding** - Visual track identification
- **Narrow mode** - Compact mixer view
- **Master channel** - Separate master strip

## Props Reference

### Mixer Props

- `tracks` - Array of tracks to display
- `buses` - Bus/return tracks
- `master` - Master track
- `selectedTrackId` - Currently selected track
- `meterLevels` - Map of trackId -> dB
- `peakLevels` - Map of trackId -> peak dB
- `narrow` - Compact mode flag

### ChannelStrip Props

- `track` - Track data
- `isSelected` - Selection state
- `meterLevel` - Current level
- `peakLevel` - Peak level
- `isBus` - Is a bus channel
- `isMaster` - Is master channel
- `narrow` - Compact mode

## License

MIT
