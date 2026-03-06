# @daw/browser

Ableton-style file browser for the In-Browser DAW.

## Features

- **Categories**: Sounds, Drums, Instruments, Effects, Samples, Clips, Templates
- **Places**: User Library, Current Project, Downloads, Custom folders
- **Search**: Full-text search with tags and filters
- **Preview**: Play samples/presets before loading
- **Collections**: Favorites, color tags, custom collections
- **Hot-swap**: Replace current device/preset
- **Recent**: Recently used items

## Installation

```bash
pnpm add @daw/browser
```

## Usage

### Search

```typescript
import { createSearchManager } from '@daw/browser';

const search = createSearchManager();

// Build index
search.rebuildIndex(allBrowserItems);

// Search by text
const results = search.searchByText('kick drum');

// Combined search
const result = search.search({
  text: '808',
  categories: ['drums', 'samples'],
  tags: ['electronic'],
});

// Get suggestions
const suggestions = search.getSuggestions('dru');
```

### Collections

```typescript
import { createCollectionsManager } from '@daw/browser';

const collections = createCollectionsManager();

// Favorites
collections.addToFavorites(item);
collections.removeFromFavorites(item);

// Color tags
collections.setColorTag(item, 'red');

// Custom collections
const myCollection = collections.createCollection('My Drums', '#FF0000');
collections.addToCollection(item, myCollection.id);

// Recent items
collections.addToRecent(item);
const recent = collections.getRecent(10);
```

### Preview

```typescript
import { createPreviewPlayer, createAutoPreviewManager } from '@daw/browser';

const preview = createPreviewPlayer({
  autoPreview: true,
  volume: 0.8,
  previewLength: 5, // 5 second preview
});

// Load and play
await preview.load(item);
preview.play();
preview.stop();

// Auto-preview on selection
const autoPreview = createAutoPreviewManager(preview);
autoPreview.enable();
autoPreview.onSelect(item);
```

### Metadata

```typescript
import { createMetadataManager } from '@daw/browser';

const metadata = createMetadataManager();

// Load and edit
const meta = await metadata.load(item);
await metadata.updateTags(item, ['drum', 'kick', '808']);
await metadata.updateDescription(item, 'Classic 808 kick drum');

// Extract from file
const fileMeta = await metadata.extractFromFile(audioFile);
```

### Hot-swap

```typescript
import { createHotSwapManager, filterCompatibleItems } from '@daw/browser';

const hotSwap = createHotSwapManager();

// Enter hot-swap mode
hotSwap.enter({
  deviceId: 'simpler-1',
  trackId: 'track-1',
  deviceType: 'instrument',
});

// Filter compatible items
const compatible = filterCompatibleItems(allItems, hotSwap.getContext()!);

// Select replacement
hotSwap.select(newPreset);

// Exit hot-swap mode
hotSwap.exit();
```

## Browser Structure

```
Browser
├── Categories
│   ├── Sounds
│   ├── Drums
│   ├── Instruments
│   ├── Audio Effects
│   ├── MIDI Effects
│   ├── Clips
│   ├── Samples
│   └── Templates
├── Places
│   ├── User Library
│   ├── Current Project
│   ├── Downloads
│   └── Custom Folders
├── Packs
│   ├── Factory Packs
│   └── User Packs
└── Collections
    ├── Favorites
    ├── Red, Orange, Yellow
    ├── Green, Blue, Purple
    └── Custom Collections
```

## API Reference

### SearchManager

- `search(query)` - Perform combined search
- `searchByText(text)` - Full-text search
- `searchByTags(tags)` - Tag search
- `rebuildIndex(items)` - Build search index

### CollectionsManager

- `addToFavorites(item)` - Add to favorites
- `createCollection(name, color)` - Create custom collection
- `addToCollection(item, collectionId)` - Add to collection
- `setColorTag(item, color)` - Set color tag
- `getRecent(limit)` - Get recent items

### PreviewPlayer

- `load(item)` - Load audio for preview
- `play()` - Start preview
- `stop()` - Stop preview
- `setVolume(volume)` - Adjust volume

## License

MIT
