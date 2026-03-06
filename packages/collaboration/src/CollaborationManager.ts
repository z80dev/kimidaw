/**
 * Collaboration Manager
 * 
 * Manages collaborative features including live editing, comments, and version history.
 */

import type { ProjectArchive } from '@daw/import-export';

// ============================================================================
// Types
// ============================================================================

export interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor?: CursorPosition;
  isOnline: boolean;
  lastSeen: Date;
  permissions: PermissionLevel;
}

export type PermissionLevel = 'owner' | 'admin' | 'editor' | 'viewer';

export interface CursorPosition {
  view: 'arrangement' | 'session' | 'mixer';
  trackId?: string;
  time?: number;
  x: number;
  y: number;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
  position?: CommentPosition;
  replies: CommentReply[];
  reactions: Reaction[];
}

export interface CommentPosition {
  view: 'arrangement' | 'session';
  trackId?: string;
  time?: number;
  clipId?: string;
  x?: number;
  y?: number;
}

export interface CommentReply {
  id: string;
  authorId: string;
  content: string;
  timestamp: Date;
}

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  version: number;
  authorId: string;
  message: string;
  timestamp: Date;
  changes: ChangeSummary[];
  snapshot: unknown; // Project snapshot
}

export interface ChangeSummary {
  type: 'add' | 'modify' | 'delete';
  entity: 'track' | 'clip' | 'device' | 'automation' | 'mixer';
  id: string;
  name: string;
  details?: string;
}

export interface ShareConfig {
  projectId: string;
  visibility: 'private' | 'link' | 'public';
  allowComments: boolean;
  allowDownloads: boolean;
  password?: string;
  expiresAt?: Date;
}

export interface ShareLink {
  id: string;
  url: string;
  config: ShareConfig;
  createdAt: Date;
  accessCount: number;
}

// ============================================================================
// Collaboration Manager
// ============================================================================

export interface CollaborationManager {
  // Connection
  connect(projectId: string): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  
  // Collaborators
  getCollaborators(): Collaborator[];
  inviteCollaborator(email: string, permissions: PermissionLevel): Promise<void>;
  removeCollaborator(userId: string): Promise<void>;
  updatePermissions(userId: string, permissions: PermissionLevel): Promise<void>;
  
  // Cursor tracking
  updateCursor(position: CursorPosition): void;
  onCursorUpdate(callback: (userId: string, position: CursorPosition) => void): () => void;
  
  // Comments
  getComments(): Comment[];
  addComment(content: string, position?: CommentPosition): Promise<Comment>;
  replyToComment(commentId: string, content: string): Promise<CommentReply>;
  resolveComment(commentId: string): Promise<void>;
  deleteComment(commentId: string): Promise<void>;
  addReaction(commentId: string, emoji: string): Promise<void>;
  onCommentUpdate(callback: (comments: Comment[]) => void): () => void;
  
  // Versions
  createVersion(message: string): Promise<ProjectVersion>;
  getVersions(): ProjectVersion[];
  restoreVersion(versionId: string): Promise<void>;
  compareVersions(versionId1: string, versionId2: string): ChangeSummary[];
  onVersionUpdate(callback: (versions: ProjectVersion[]) => void): () => void;
  
  // Sharing
  createShareLink(config: Partial<ShareConfig>): Promise<ShareLink>;
  revokeShareLink(linkId: string): Promise<void>;
  getShareLinks(): ShareLink[];
}

export function createCollaborationManager(
  realtimeSync: RealtimeSync
): CollaborationManager {
  let projectId: string | null = null;
  let collaborators: Collaborator[] = [];
  let comments: Comment[] = [];
  let versions: ProjectVersion[] = [];
  let shareLinks: ShareLink[] = [];
  let cursorCallbacks: Array<(userId: string, position: CursorPosition) => void> = [];
  let commentCallbacks: Array<(comments: Comment[]) => void> = [];
  let versionCallbacks: Array<(versions: ProjectVersion[]) => void> = [];
  
  async function connect(projId: string): Promise<void> {
    projectId = projId;
    await realtimeSync.connect(projId);
    
    // Subscribe to events
    realtimeSync.on('collaborator-joined', handleCollaboratorJoined);
    realtimeSync.on('collaborator-left', handleCollaboratorLeft);
    realtimeSync.on('cursor-update', handleCursorUpdate);
    realtimeSync.on('comment-added', handleCommentAdded);
    realtimeSync.on('comment-updated', handleCommentUpdated);
    realtimeSync.on('version-created', handleVersionCreated);
    
    // Load initial data
    collaborators = await realtimeSync.getCollaborators();
    comments = await realtimeSync.getComments();
    versions = await realtimeSync.getVersions();
  }
  
  function disconnect(): void {
    realtimeSync.disconnect();
    projectId = null;
    collaborators = [];
    comments = [];
    versions = [];
  }
  
  function isConnected(): boolean {
    return realtimeSync.isConnected();
  }
  
  function getCollaborators(): Collaborator[] {
    return [...collaborators];
  }
  
  async function inviteCollaborator(email: string, permissions: PermissionLevel): Promise<void> {
    await realtimeSync.send('invite-collaborator', { email, permissions });
  }
  
  async function removeCollaborator(userId: string): Promise<void> {
    await realtimeSync.send('remove-collaborator', { userId });
    collaborators = collaborators.filter(c => c.id !== userId);
  }
  
  async function updatePermissions(userId: string, permissions: PermissionLevel): Promise<void> {
    await realtimeSync.send('update-permissions', { userId, permissions });
    const collaborator = collaborators.find(c => c.id === userId);
    if (collaborator) {
      collaborator.permissions = permissions;
    }
  }
  
  function updateCursor(position: CursorPosition): void {
    realtimeSync.send('cursor-update', { position });
  }
  
  function onCursorUpdate(callback: (userId: string, position: CursorPosition) => void): () => void {
    cursorCallbacks.push(callback);
    return () => {
      const index = cursorCallbacks.indexOf(callback);
      if (index !== -1) cursorCallbacks.splice(index, 1);
    };
  }
  
  function getComments(): Comment[] {
    return [...comments];
  }
  
  async function addComment(content: string, position?: CommentPosition): Promise<Comment> {
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      authorId: 'current-user', // Would be actual user ID
      content,
      timestamp: new Date(),
      resolved: false,
      position,
      replies: [],
      reactions: [],
    };
    
    await realtimeSync.send('add-comment', { comment });
    comments.push(comment);
    notifyCommentUpdate();
    
    return comment;
  }
  
  async function replyToComment(commentId: string, content: string): Promise<CommentReply> {
    const reply: CommentReply = {
      id: `reply-${Date.now()}`,
      authorId: 'current-user',
      content,
      timestamp: new Date(),
    };
    
    await realtimeSync.send('reply-comment', { commentId, reply });
    
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      comment.replies.push(reply);
      notifyCommentUpdate();
    }
    
    return reply;
  }
  
  async function resolveComment(commentId: string): Promise<void> {
    await realtimeSync.send('resolve-comment', { commentId });
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      comment.resolved = true;
      notifyCommentUpdate();
    }
  }
  
  async function deleteComment(commentId: string): Promise<void> {
    await realtimeSync.send('delete-comment', { commentId });
    comments = comments.filter(c => c.id !== commentId);
    notifyCommentUpdate();
  }
  
  async function addReaction(commentId: string, emoji: string): Promise<void> {
    await realtimeSync.send('add-reaction', { commentId, emoji });
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      const existing = comment.reactions.find(r => r.userId === 'current-user');
      if (existing) {
        existing.emoji = emoji;
      } else {
        comment.reactions.push({ userId: 'current-user', emoji });
      }
      notifyCommentUpdate();
    }
  }
  
  function onCommentUpdate(callback: (comments: Comment[]) => void): () => void {
    commentCallbacks.push(callback);
    return () => {
      const index = commentCallbacks.indexOf(callback);
      if (index !== -1) commentCallbacks.splice(index, 1);
    };
  }
  
  async function createVersion(message: string): Promise<ProjectVersion> {
    const version: ProjectVersion = {
      id: `version-${Date.now()}`,
      projectId: projectId!,
      version: versions.length + 1,
      authorId: 'current-user',
      message,
      timestamp: new Date(),
      changes: [], // Would be computed from diff
      snapshot: {}, // Would be actual project snapshot
    };
    
    await realtimeSync.send('create-version', { version });
    versions.unshift(version);
    notifyVersionUpdate();
    
    return version;
  }
  
  function getVersions(): ProjectVersion[] {
    return [...versions];
  }
  
  async function restoreVersion(versionId: string): Promise<void> {
    await realtimeSync.send('restore-version', { versionId });
    // Would load the snapshot and update the project
  }
  
  function compareVersions(versionId1: string, versionId2: string): ChangeSummary[] {
    const v1 = versions.find(v => v.id === versionId1);
    const v2 = versions.find(v => v.id === versionId2);
    
    if (!v1 || !v2) return [];
    
    // Would compute actual diff
    return [];
  }
  
  function onVersionUpdate(callback: (versions: ProjectVersion[]) => void): () => void {
    versionCallbacks.push(callback);
    return () => {
      const index = versionCallbacks.indexOf(callback);
      if (index !== -1) versionCallbacks.splice(index, 1);
    };
  }
  
  async function createShareLink(config: Partial<ShareConfig>): Promise<ShareLink> {
    const fullConfig: ShareConfig = {
      projectId: projectId!,
      visibility: 'link',
      allowComments: true,
      allowDownloads: false,
      ...config,
    };
    
    const link: ShareLink = {
      id: `link-${Date.now()}`,
      url: `https://daw.app/share/${projectId}/${Date.now()}`,
      config: fullConfig,
      createdAt: new Date(),
      accessCount: 0,
    };
    
    await realtimeSync.send('create-share-link', { link });
    shareLinks.push(link);
    
    return link;
  }
  
  async function revokeShareLink(linkId: string): Promise<void> {
    await realtimeSync.send('revoke-share-link', { linkId });
    shareLinks = shareLinks.filter(l => l.id !== linkId);
  }
  
  function getShareLinks(): ShareLink[] {
    return [...shareLinks];
  }
  
  // Event handlers
  function handleCollaboratorJoined(collaborator: Collaborator): void {
    collaborators.push(collaborator);
  }
  
  function handleCollaboratorLeft(data: { userId: string }): void {
    const collab = collaborators.find(c => c.id === data.userId);
    if (collab) {
      collab.isOnline = false;
    }
  }
  
  function handleCursorUpdate(data: { userId: string; position: CursorPosition }): void {
    for (const callback of cursorCallbacks) {
      callback(data.userId, data.position);
    }
  }
  
  function handleCommentAdded(data: { comment: Comment }): void {
    comments.push(data.comment);
    notifyCommentUpdate();
  }
  
  function handleCommentUpdated(data: { comments: Comment[] }): void {
    comments = data.comments;
    notifyCommentUpdate();
  }
  
  function handleVersionCreated(data: { version: ProjectVersion }): void {
    versions.unshift(data.version);
    notifyVersionUpdate();
  }
  
  function notifyCommentUpdate(): void {
    for (const callback of commentCallbacks) {
      callback([...comments]);
    }
  }
  
  function notifyVersionUpdate(): void {
    for (const callback of versionCallbacks) {
      callback([...versions]);
    }
  }
  
  return {
    connect,
    disconnect,
    isConnected,
    getCollaborators,
    inviteCollaborator,
    removeCollaborator,
    updatePermissions,
    updateCursor,
    onCursorUpdate,
    getComments,
    addComment,
    replyToComment,
    resolveComment,
    deleteComment,
    addReaction,
    onCommentUpdate,
    createVersion,
    getVersions,
    restoreVersion,
    compareVersions,
    onVersionUpdate,
    createShareLink,
    revokeShareLink,
    getShareLinks,
  };
}

// ============================================================================
// Realtime Sync Interface
// ============================================================================

export interface RealtimeSync {
  connect(projectId: string): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  send(event: string, data: unknown): void;
  on(event: string, callback: (data: unknown) => void): void;
  off(event: string, callback: (data: unknown) => void): void;
  getCollaborators(): Promise<Collaborator[]>;
  getComments(): Promise<Comment[]>;
  getVersions(): Promise<ProjectVersion[]>;
}
