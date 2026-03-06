# @daw/collaboration

Real-time collaboration features for the In-Browser DAW.

## Features

- **Live Collaboration**: Real-time multi-user editing with cursors
- **Comments**: Add feedback and discussion to projects
- **Version History**: Track changes and restore previous versions
- **Share Links**: Share projects via URL

## Usage

```typescript
import { 
  createCollaborationManager,
  createCommentSystem,
  RealtimeSync 
} from '@daw/collaboration';

// Create realtime sync
const sync = new RealtimeSync({
  serverUrl: 'wss://collab.daw.app'
});

// Create collaboration manager
const collaboration = createCollaborationManager(sync);

// Connect to project
await collaboration.connect('project-id');

// Add comment
collaboration.addComment('Great bassline!', {
  view: 'arrangement',
  trackId: 'bass-track',
  time: 32
});

// Track cursor position
collaboration.updateCursor({
  view: 'arrangement',
  x: 100,
  y: 200
});
```

## Standalone Comment System

```typescript
import { createCommentSystem } from '@daw/collaboration';

const comments = createCommentSystem();

// Add comments
comments.addComment('Needs more reverb', {
  view: 'arrangement',
  trackId: 'vocal-track'
});

// Filter comments
const unresolved = comments.getComments({ resolved: false });

// Get stats
const stats = comments.getStats();
console.log(`${stats.unresolved} unresolved comments`);
```
