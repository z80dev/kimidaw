/**
 * Realtime Sync
 * 
 * WebSocket-based realtime synchronization for collaborative editing.
 */

import type { 
  RealtimeSync as IRealtimeSync,
  Collaborator,
  Comment,
  ProjectVersion 
} from './CollaborationManager.js';

// ============================================================================
// Types
// ============================================================================

export interface SyncOptions {
  serverUrl: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export interface SyncState {
  connected: boolean;
  connecting: boolean;
  projectId: string | null;
  reconnectAttempts: number;
  lastPing: number;
}

export type SyncMessage = 
  | { type: 'join'; projectId: string; userId: string }
  | { type: 'leave'; projectId: string; userId: string }
  | { type: 'cursor'; position: unknown }
  | { type: 'operation'; operation: unknown }
  | { type: 'comment'; comment: Comment }
  | { type: 'version'; version: ProjectVersion }
  | { type: 'ping' }
  | { type: 'pong' };

// ============================================================================
// Realtime Sync Implementation
// ============================================================================

export class RealtimeSync implements IRealtimeSync {
  private ws: WebSocket | null = null;
  private options: SyncOptions;
  private state: SyncState;
  private eventHandlers: Map<string, Set<(data: unknown) => void>> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  
  constructor(options: Partial<SyncOptions> = {}) {
    this.options = {
      serverUrl: 'wss://collab.daw.app',
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options,
    };
    
    this.state = {
      connected: false,
      connecting: false,
      projectId: null,
      reconnectAttempts: 0,
      lastPing: 0,
    };
  }
  
  async connect(projectId: string): Promise<void> {
    if (this.state.connected || this.state.connecting) {
      return;
    }
    
    this.state.connecting = true;
    this.state.projectId = projectId;
    
    try {
      this.ws = new WebSocket(`${this.options.serverUrl}?project=${projectId}`);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      
      await new Promise<void>((resolve, reject) => {
        const onOpen = () => {
          this.ws?.removeEventListener('open', onOpen);
          resolve();
        };
        const onError = (error: Event) => {
          this.ws?.removeEventListener('error', onError);
          reject(error);
        };
        this.ws?.addEventListener('open', onOpen);
        this.ws?.addEventListener('error', onError);
      });
    } catch (error) {
      this.state.connecting = false;
      throw error;
    }
  }
  
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.state.connected = false;
    this.state.connecting = false;
    this.state.projectId = null;
    this.state.reconnectAttempts = 0;
  }
  
  isConnected(): boolean {
    return this.state.connected && this.ws?.readyState === WebSocket.OPEN;
  }
  
  send(event: string, data: unknown): void {
    if (!this.isConnected()) {
      console.warn('Cannot send: not connected');
      return;
    }
    
    const message = JSON.stringify({
      type: event,
      data,
      timestamp: Date.now(),
    });
    
    this.ws!.send(message);
  }
  
  on(event: string, callback: (data: unknown) => void): void {
    let handlers = this.eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(event, handlers);
    }
    handlers.add(callback);
  }
  
  off(event: string, callback: (data: unknown) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(callback);
    }
  }
  
  async getCollaborators(): Promise<Collaborator[]> {
    // Would fetch from server or return cached
    return [];
  }
  
  async getComments(): Promise<Comment[]> {
    // Would fetch from server or return cached
    return [];
  }
  
  async getVersions(): Promise<ProjectVersion[]> {
    // Would fetch from server or return cached
    return [];
  }
  
  // Event handlers
  private handleOpen(): void {
    this.state.connected = true;
    this.state.connecting = false;
    this.state.reconnectAttempts = 0;
    
    this.startHeartbeat();
    this.emit('connected', { projectId: this.state.projectId });
  }
  
  private handleClose(event: CloseEvent): void {
    this.state.connected = false;
    this.state.connecting = false;
    this.stopHeartbeat();
    
    this.emit('disconnected', { code: event.code, reason: event.reason });
    
    // Attempt reconnection
    if (this.state.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }
  
  private handleError(error: Event): void {
    this.emit('error', error);
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as SyncMessage;
      
      // Handle heartbeat
      if (message.type === 'ping') {
        this.send('pong', {});
        return;
      }
      
      if (message.type === 'pong') {
        this.state.lastPing = Date.now();
        return;
      }
      
      // Emit to handlers
      this.emit(message.type, message);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }
  
  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error('Event handler error:', error);
        }
      }
    }
  }
  
  // Heartbeat
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', {});
      }
    }, this.options.heartbeatInterval);
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  // Reconnection
  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    
    this.state.reconnectAttempts++;
    const delay = this.options.reconnectInterval * Math.pow(1.5, this.state.reconnectAttempts - 1);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.state.projectId) {
        this.connect(this.state.projectId).catch(() => {
          // Reconnect failed, will schedule another if attempts remain
        });
      }
    }, Math.min(delay, 30000)); // Cap at 30 seconds
  }
  
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// ============================================================================
// Operational Transform (for conflict resolution)
// ============================================================================

export interface Operation {
  type: 'insert' | 'delete' | 'replace' | 'move';
  path: string[];
  value?: unknown;
  oldValue?: unknown;
}

export function transformOperation(
  op1: Operation,
  op2: Operation
): Operation {
  // Simplified operational transform
  // In a real implementation, this would handle all conflict cases
  
  if (op1.type === 'insert' && op2.type === 'insert') {
    // If inserting at same path, prioritize by timestamp
    return op1;
  }
  
  if (op1.path.join('.') === op2.path.join('.')) {
    // Same path - last write wins
    return op1;
  }
  
  return op1;
}

export function applyOperation(state: unknown, operation: Operation): unknown {
  // Deep clone and apply operation
  const newState = JSON.parse(JSON.stringify(state));
  
  let target: Record<string, unknown> = newState as Record<string, unknown>;
  for (let i = 0; i < operation.path.length - 1; i++) {
    target = target[operation.path[i]] as Record<string, unknown>;
  }
  
  const key = operation.path[operation.path.length - 1];
  
  switch (operation.type) {
    case 'insert':
    case 'replace':
      target[key] = operation.value;
      break;
    case 'delete':
      delete target[key];
      break;
  }
  
  return newState;
}
