/**
 * Peer Discovery for Ableton Link
 * Handles UDP multicast for peer discovery
 */

import type {
  LinkConfiguration,
  LinkPeer,
  SessionState,
  LinkMessage,
  LinkMessageType,
} from './types.js';

export interface PeerDiscovery {
  start(): void;
  stop(): void;
  getPeers(): LinkPeer[];
  broadcastState(state: SessionState): void;
  broadcastByeBye(): void;
}

export interface PeerDiscoveryCallbacks {
  onPeerJoined: (peer: LinkPeer) => void;
  onPeerLeft: (peer: LinkPeer) => void;
  onStateReceived: (state: SessionState, peer: LinkPeer) => void;
}

// Note: In a browser environment, we can't actually use UDP multicast
// This implementation simulates Link behavior for the same-machine/browser context
// For real network sync, you'd need a WebRTC or WebSocket bridge

export function createPeerDiscovery(
  config: LinkConfiguration,
  callbacks: PeerDiscoveryCallbacks
): PeerDiscovery {
  const peers = new Map<string, LinkPeer>();
  let isRunning = false;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  let cleanupInterval: ReturnType<typeof setInterval> | null = null;
  const clientId = generateClientId();

  // Storage-based communication for same-browser simulation
  // In production, use WebRTC or a WebSocket server
  const STORAGE_KEY = 'daw-link-peers';
  const BROADCAST_CHANNEL = 'daw-link-channel';

  let channel: BroadcastChannel | null = null;

  function generateClientId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function start(): void {
    if (isRunning) return;
    isRunning = true;

    try {
      // Use BroadcastChannel for cross-tab communication
      channel = new BroadcastChannel(BROADCAST_CHANNEL);
      channel.onmessage = (event) => {
        handleMessage(event.data);
      };

      // Start heartbeat
      heartbeatInterval = setInterval(() => {
        if (isRunning) {
          broadcastAlive();
        }
      }, 1000);

      // Start cleanup of stale peers
      cleanupInterval = setInterval(() => {
        cleanupStalePeers();
      }, 2000);

      // Initial broadcast
      broadcastAlive();
    } catch (error) {
      console.warn('Link peer discovery failed to start:', error);
    }
  }

  function stop(): void {
    isRunning = false;

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }

    if (channel) {
      channel.close();
      channel = null;
    }

    peers.clear();
  }

  function getPeers(): LinkPeer[] {
    return Array.from(peers.values());
  }

  function broadcastAlive(): void {
    const message: LinkMessage = {
      type: LinkMessageType.ALIVE,
      senderId: clientId,
      sessionState: {
        tempo: 120,
        beatTime: 0,
        beatAtSessionStart: 0,
        isPlaying: false,
      },
      timestamp: Date.now(),
    };

    sendMessage(message);
  }

  function broadcastState(state: SessionState): void {
    const message: LinkMessage = {
      type: LinkMessageType.RESPONSE,
      senderId: clientId,
      sessionState: state,
      timestamp: Date.now(),
    };

    sendMessage(message);
  }

  function broadcastByeBye(): void {
    const message: LinkMessage = {
      type: LinkMessageType.BYEBYE,
      senderId: clientId,
      sessionState: {
        tempo: 120,
        beatTime: 0,
        beatAtSessionStart: 0,
        isPlaying: false,
      },
      timestamp: Date.now(),
    };

    sendMessage(message);
  }

  function sendMessage(message: LinkMessage): void {
    if (channel) {
      channel.postMessage(message);
    }

    // Also store in localStorage for persistence
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const peers = stored ? JSON.parse(stored) : {};
      peers[message.senderId] = {
        ...message,
        lastSeen: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(peers));
    } catch {
      // localStorage might not be available
    }
  }

  function handleMessage(message: LinkMessage): void {
    if (message.senderId === clientId) return;

    switch (message.type) {
      case LinkMessageType.ALIVE:
        handlePeerJoined(message.senderId);
        break;

      case LinkMessageType.RESPONSE:
        handlePeerJoined(message.senderId);
        handleStateReceived(message.senderId, message.sessionState);
        break;

      case LinkMessageType.BYEBYE:
        handlePeerLeft(message.senderId);
        break;
    }
  }

  function handlePeerJoined(peerId: string): void {
    if (!peers.has(peerId)) {
      const peer: LinkPeer = {
        id: peerId,
        address: 'local',
        port: config.localPort,
        lastSeen: Date.now(),
      };

      peers.set(peerId, peer);
      callbacks.onPeerJoined(peer);
    } else {
      // Update last seen
      const peer = peers.get(peerId)!;
      peer.lastSeen = Date.now();
    }
  }

  function handlePeerLeft(peerId: string): void {
    const peer = peers.get(peerId);
    if (peer) {
      peers.delete(peerId);
      callbacks.onPeerLeft(peer);
    }
  }

  function handleStateReceived(peerId: string, state: SessionState): void {
    const peer = peers.get(peerId);
    if (peer) {
      callbacks.onStateReceived(state, peer);
    }
  }

  function cleanupStalePeers(): void {
    const now = Date.now();
    const timeout = config.peerTimeout;

    for (const [peerId, peer] of peers) {
      if (now - peer.lastSeen > timeout) {
        handlePeerLeft(peerId);
      }
    }
  }

  return {
    start,
    stop,
    getPeers,
    broadcastState,
    broadcastByeBye,
  };
}

/**
 * WebSocket-based peer discovery for server-based sync
 * Use this when you need real network synchronization
 */
export interface WebSocketPeerDiscovery {
  connect(url: string): void;
  disconnect(): void;
  broadcastState(state: SessionState): void;
}

export function createWebSocketPeerDiscovery(
  callbacks: PeerDiscoveryCallbacks
): WebSocketPeerDiscovery {
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  const clientId = generateClientId();

  function generateClientId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function connect(url: string): void {
    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('Link WebSocket connected');
        
        // Send join message
        ws?.send(JSON.stringify({
          type: 'join',
          clientId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch {
          // Ignore invalid messages
        }
      };

      ws.onclose = () => {
        // Attempt reconnect
        reconnectTimeout = setTimeout(() => {
          connect(url);
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('Link WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect Link WebSocket:', error);
    }
  }

  function disconnect(): void {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (ws) {
      ws.close();
      ws = null;
    }
  }

  function broadcastState(state: SessionState): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'state',
        clientId,
        state,
      }));
    }
  }

  function handleWebSocketMessage(message: unknown): void {
    const msg = message as { type: string; clientId: string; state?: SessionState };

    if (msg.clientId === clientId) return;

    switch (msg.type) {
      case 'join':
        callbacks.onPeerJoined({
          id: msg.clientId,
          address: 'ws',
          port: 0,
          lastSeen: Date.now(),
        });
        break;

      case 'leave':
        callbacks.onPeerLeft({
          id: msg.clientId,
          address: 'ws',
          port: 0,
          lastSeen: Date.now(),
        });
        break;

      case 'state':
        if (msg.state) {
          callbacks.onStateReceived(msg.state, {
            id: msg.clientId,
            address: 'ws',
            port: 0,
            lastSeen: Date.now(),
          });
        }
        break;
    }
  }

  return {
    connect,
    disconnect,
    broadcastState,
  };
}
