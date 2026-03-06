/**
 * Comment System
 * 
 * Standalone comment system for adding feedback to projects.
 */

import type { Comment, CommentPosition, CommentReply, Reaction } from './CollaborationManager.js';

// ============================================================================
// Types
// ============================================================================

export interface CommentFilter {
  resolved?: boolean;
  authorId?: string;
  searchQuery?: string;
  view?: 'arrangement' | 'session';
}

export interface CommentThread {
  comment: Comment;
  isSelected: boolean;
}

export interface CommentStats {
  total: number;
  resolved: number;
  unresolved: number;
  byAuthor: Map<string, number>;
}

// ============================================================================
// Comment System
// ============================================================================

export interface CommentSystem {
  // CRUD
  addComment(content: string, position?: CommentPosition): Comment;
  addReply(commentId: string, content: string): CommentReply;
  updateComment(commentId: string, content: string): void;
  deleteComment(commentId: string): void;
  deleteReply(commentId: string, replyId: string): void;
  
  // Status
  resolveComment(commentId: string): void;
  unresolveComment(commentId: string): void;
  toggleResolved(commentId: string): void;
  
  // Reactions
  addReaction(commentId: string, emoji: string): void;
  removeReaction(commentId: string, emoji: string): void;
  
  // Filtering
  getComments(filter?: CommentFilter): Comment[];
  getComment(commentId: string): Comment | null;
  getCommentsForTrack(trackId: string): Comment[];
  getCommentsForClip(clipId: string): Comment[];
  getCommentsInRange(startTime: number, endTime: number): Comment[];
  
  // Selection
  selectComment(commentId: string | null): void;
  getSelectedComment(): Comment | null;
  
  // Stats
  getStats(): CommentStats;
  
  // Persistence
  export(): string;
  import(data: string): void;
  
  // Events
  onChange(callback: () => void): () => void;
}

export function createCommentSystem(): CommentSystem {
  let comments: Comment[] = [];
  let selectedCommentId: string | null = null;
  let changeCallbacks: Array<() => void> = [];
  
  function notifyChange(): void {
    for (const callback of changeCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('Comment change callback error:', error);
      }
    }
  }
  
  function addComment(content: string, position?: CommentPosition): Comment {
    const comment: Comment = {
      id: generateId(),
      authorId: 'current-user',
      content: content.trim(),
      timestamp: new Date(),
      resolved: false,
      position,
      replies: [],
      reactions: [],
    };
    
    comments.push(comment);
    notifyChange();
    
    return comment;
  }
  
  function addReply(commentId: string, content: string): CommentReply {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }
    
    const reply: CommentReply = {
      id: generateId(),
      authorId: 'current-user',
      content: content.trim(),
      timestamp: new Date(),
    };
    
    comment.replies.push(reply);
    notifyChange();
    
    return reply;
  }
  
  function updateComment(commentId: string, content: string): void {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      comment.content = content.trim();
      notifyChange();
    }
  }
  
  function deleteComment(commentId: string): void {
    const index = comments.findIndex(c => c.id === commentId);
    if (index !== -1) {
      comments.splice(index, 1);
      if (selectedCommentId === commentId) {
        selectedCommentId = null;
      }
      notifyChange();
    }
  }
  
  function deleteReply(commentId: string, replyId: string): void {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      comment.replies = comment.replies.filter(r => r.id !== replyId);
      notifyChange();
    }
  }
  
  function resolveComment(commentId: string): void {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      comment.resolved = true;
      notifyChange();
    }
  }
  
  function unresolveComment(commentId: string): void {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      comment.resolved = false;
      notifyChange();
    }
  }
  
  function toggleResolved(commentId: string): void {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      comment.resolved = !comment.resolved;
      notifyChange();
    }
  }
  
  function addReaction(commentId: string, emoji: string): void {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      const existing = comment.reactions.find(
        r => r.userId === 'current-user' && r.emoji === emoji
      );
      if (!existing) {
        comment.reactions.push({ userId: 'current-user', emoji });
        notifyChange();
      }
    }
  }
  
  function removeReaction(commentId: string, emoji: string): void {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      comment.reactions = comment.reactions.filter(
        r => !(r.userId === 'current-user' && r.emoji === emoji)
      );
      notifyChange();
    }
  }
  
  function getComments(filter?: CommentFilter): Comment[] {
    let result = [...comments];
    
    if (filter) {
      if (filter.resolved !== undefined) {
        result = result.filter(c => c.resolved === filter.resolved);
      }
      
      if (filter.authorId) {
        result = result.filter(c => c.authorId === filter.authorId);
      }
      
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        result = result.filter(c => 
          c.content.toLowerCase().includes(query) ||
          c.replies.some(r => r.content.toLowerCase().includes(query))
        );
      }
      
      if (filter.view) {
        result = result.filter(c => c.position?.view === filter.view);
      }
    }
    
    // Sort by timestamp (newest first)
    result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return result;
  }
  
  function getComment(commentId: string): Comment | null {
    return comments.find(c => c.id === commentId) || null;
  }
  
  function getCommentsForTrack(trackId: string): Comment[] {
    return comments.filter(c => c.position?.trackId === trackId);
  }
  
  function getCommentsForClip(clipId: string): Comment[] {
    return comments.filter(c => c.position?.clipId === clipId);
  }
  
  function getCommentsInRange(startTime: number, endTime: number): Comment[] {
    return comments.filter(c => {
      const time = c.position?.time;
      return time !== undefined && time >= startTime && time <= endTime;
    });
  }
  
  function selectComment(commentId: string | null): void {
    selectedCommentId = commentId;
    notifyChange();
  }
  
  function getSelectedComment(): Comment | null {
    return selectedCommentId ? getComment(selectedCommentId) : null;
  }
  
  function getStats(): CommentStats {
    const byAuthor = new Map<string, number>();
    let resolved = 0;
    
    for (const comment of comments) {
      byAuthor.set(comment.authorId, (byAuthor.get(comment.authorId) || 0) + 1);
      if (comment.resolved) resolved++;
    }
    
    return {
      total: comments.length,
      resolved,
      unresolved: comments.length - resolved,
      byAuthor,
    };
  }
  
  function exportComments(): string {
    return JSON.stringify(comments, null, 2);
  }
  
  function importComments(data: string): void {
    try {
      const parsed = JSON.parse(data) as Comment[];
      comments = parsed.map(c => ({
        ...c,
        timestamp: new Date(c.timestamp),
        replies: c.replies.map(r => ({
          ...r,
          timestamp: new Date(r.timestamp),
        })),
      }));
      notifyChange();
    } catch (error) {
      console.error('Failed to import comments:', error);
      throw error;
    }
  }
  
  function onChange(callback: () => void): () => void {
    changeCallbacks.push(callback);
    return () => {
      const index = changeCallbacks.indexOf(callback);
      if (index !== -1) {
        changeCallbacks.splice(index, 1);
      }
    };
  }
  
  function generateId(): string {
    return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  return {
    addComment,
    addReply,
    updateComment,
    deleteComment,
    deleteReply,
    resolveComment,
    unresolveComment,
    toggleResolved,
    addReaction,
    removeReaction,
    getComments,
    getComment,
    getCommentsForTrack,
    getCommentsForClip,
    getCommentsInRange,
    selectComment,
    getSelectedComment,
    getStats,
    export: exportComments,
    import: importComments,
    onChange,
  };
}
