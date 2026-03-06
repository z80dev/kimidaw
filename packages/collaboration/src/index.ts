/**
 * Collaboration Module
 * 
 * Real-time collaborative features for the DAW:
 * - Live multi-user editing
 * - Comments and feedback
 * - Version history
 * - Share links
 */

// Collaboration Manager
export {
  createCollaborationManager,
} from './CollaborationManager.js';

export type {
  Collaborator,
  PermissionLevel,
  CursorPosition,
  Comment,
  CommentPosition,
  CommentReply,
  Reaction,
  ProjectVersion,
  ChangeSummary,
  ShareConfig,
  ShareLink,
  RealtimeSync as RealtimeSyncInterface,
  CollaborationManager,
} from './CollaborationManager.js';

// Realtime Sync
export {
  RealtimeSync,
  transformOperation,
  applyOperation,
} from './RealtimeSync.js';

export type {
  SyncOptions,
  SyncState,
  SyncMessage,
  Operation,
} from './RealtimeSync.js';

// Comment System
export {
  createCommentSystem,
} from './CommentSystem.js';

export type {
  CommentFilter,
  CommentThread,
  CommentStats,
  CommentSystem,
} from './CommentSystem.js';
