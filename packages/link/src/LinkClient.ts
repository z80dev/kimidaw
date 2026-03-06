/**
 * Ableton Link Client
 * Main entry point for Link integration
 */

import type {
  LinkConfiguration,
  SessionState,
  BeatTime,
  LinkEvent,
  LinkEventHandler,
  StartStopSyncOptions,
} from './types.js';
import { DEFAULT_LINK_CONFIG, DEFAULT_START_STOP_OPTIONS } from './types.js';
import { createPeerDiscovery } from './PeerDiscovery.js';
import { createTempoSync } from './TempoSync.js';
import { createSessionState } from './SessionState.js';

export interface LinkClient {
  readonly isEnabled: boolean;
  readonly sessionState: SessionState;
  readonly numPeers: number;
  readonly quantum: number;

  enable(): void;
  disable(): void;

  setQuantum(quantum: number): void;

  // Tempo
  getTempo(): number;
  setTempo(tempo: number): void;
  requestTempo(tempo: number): void;

  // Beat/Phase
  getBeatTime(): BeatTime;
  getBeatAtTime(time: number): number;
  getPhaseAtTime(time: number): number;
  getTimeAtBeat(beat: number): number;

  // Transport
  isPlaying(): boolean;
  setIsPlaying(playing: boolean, time?: number): void;

  // Start/Stop sync
  setStartStopSyncEnabled(enabled: boolean): void;
  isStartStopSyncEnabled(): boolean;

  // Commit state (broadcast changes)
  commitSessionState(): void;

  // Events
  onEvent(handler: LinkEventHandler): () => void;

  // Cleanup
  destroy(): void;
}

export interface LinkClientOptions {
  config?: Partial<LinkConfiguration>;
  startStopSync?: Partial<StartStopSyncOptions>;
  initialTempo?: number;
  initialQuantum?: number;
}

export function createLinkClient(options: LinkClientOptions = {}): LinkClient {
  const config = { ...DEFAULT_LINK_CONFIG, ...options.config };
  const startStopOptions = {
    ...DEFAULT_START_STOP_OPTIONS,
    ...options.startStopSync,
  };

  let isEnabled = false;
  let quantum = options.initialQuantum || config.quantum;

  // Event handlers
  const eventHandlers: LinkEventHandler[] = [];

  function emitEvent(event: LinkEvent): void {
    for (const handler of eventHandlers) {
      handler(event);
    }
  }

  // Core components
  const sessionStateManager = createSessionState(options.initialTempo || 120);
  const tempoSync = createTempoSync(config, (tempo) => {
    sessionStateManager.setTempo(tempo);
    emitEvent({
      type: 'tempo-changed',
      timestamp: Date.now(),
      data: { tempo },
    });
  });
  const peerDiscovery = createPeerDiscovery(config, {
    onPeerJoined: (peer) => {
      emitEvent({
        type: 'peer-joined',
        timestamp: Date.now(),
        data: { peer },
      });
    },
    onPeerLeft: (peer) => {
      emitEvent({
        type: 'peer-left',
        timestamp: Date.now(),
        data: { peer },
      });
    },
    onStateReceived: (state, peer) => {
      handlePeerState(state, peer);
    },
  });

  function handlePeerState(state: SessionState, _peer: unknown): void {
    // Apply tempo from peer
    if (state.tempo !== sessionStateManager.getTempo()) {
      tempoSync.suggestTempo(state.tempo);
    }

    // Sync start/stop if enabled
    if (startStopOptions.enabled && state.isPlaying !== sessionStateManager.isPlaying()) {
      if (state.isPlaying) {
        sessionStateManager.start();
      } else {
        sessionStateManager.stop();
      }
      emitEvent({
        type: 'start-stop-sync',
        timestamp: Date.now(),
        data: { isPlaying: state.isPlaying },
      });
    }

    emitEvent({
      type: 'session-state-changed',
      timestamp: Date.now(),
      data: { state },
    });
  }

  function enable(): void {
    if (isEnabled) return;

    try {
      peerDiscovery.start();
      tempoSync.start();
      isEnabled = true;

      // Broadcast our presence
      peerDiscovery.broadcastState(sessionStateManager.getState());
    } catch (error) {
      emitEvent({
        type: 'error',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  function disable(): void {
    if (!isEnabled) return;

    try {
      // Broadcast departure
      peerDiscovery.broadcastByeBye();

      peerDiscovery.stop();
      tempoSync.stop();
      isEnabled = false;
    } catch (error) {
      emitEvent({
        type: 'error',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  function setQuantum(newQuantum: number): void {
    quantum = Math.max(1, Math.floor(newQuantum));
  }

  function getTempo(): number {
    return sessionStateManager.getTempo();
  }

  function setTempo(tempo: number): void {
    const clampedTempo = Math.max(config.tempoMin, Math.min(config.tempoMax, tempo));
    sessionStateManager.setTempo(clampedTempo);
    
    if (isEnabled) {
      peerDiscovery.broadcastState(sessionStateManager.getState());
    }
  }

  function requestTempo(tempo: number): void {
    // Same as setTempo in Link - any peer can change tempo
    setTempo(tempo);
  }

  function getBeatTime(): BeatTime {
    const beat = sessionStateManager.getBeat();
    const phase = ((beat % quantum) + quantum) % quantum;
    const progress = phase / quantum;

    return {
      beat,
      phase,
      progress,
    };
  }

  function getBeatAtTime(time: number): number {
    return sessionStateManager.getBeatAtTime(time);
  }

  function getPhaseAtTime(time: number): number {
    const beat = getBeatAtTime(time);
    return ((beat % quantum) + quantum) % quantum;
  }

  function getTimeAtBeat(beat: number): number {
    return sessionStateManager.getTimeAtBeat(beat);
  }

  function isPlaying(): boolean {
    return sessionStateManager.isPlaying();
  }

  function setIsPlaying(playing: boolean, time?: number): void {
    if (playing) {
      sessionStateManager.start(time);
    } else {
      sessionStateManager.stop(time);
    }

    if (isEnabled) {
      peerDiscovery.broadcastState(sessionStateManager.getState());
    }

    emitEvent({
      type: 'start-stop-sync',
      timestamp: Date.now(),
      data: { isPlaying: playing },
    });
  }

  function setStartStopSyncEnabled(enabled: boolean): void {
    startStopOptions.enabled = enabled;
  }

  function isStartStopSyncEnabled(): boolean {
    return startStopOptions.enabled;
  }

  function commitSessionState(): void {
    if (isEnabled) {
      peerDiscovery.broadcastState(sessionStateManager.getState());
    }
  }

  function onEvent(handler: LinkEventHandler): () => void {
    eventHandlers.push(handler);
    return () => {
      const index = eventHandlers.indexOf(handler);
      if (index >= 0) {
        eventHandlers.splice(index, 1);
      }
    };
  }

  function destroy(): void {
    disable();
    eventHandlers.length = 0;
  }

  return {
    get isEnabled() {
      return isEnabled;
    },
    get sessionState() {
      return sessionStateManager.getState();
    },
    get numPeers() {
      return peerDiscovery.getPeers().length;
    },
    get quantum() {
      return quantum;
    },
    enable,
    disable,
    setQuantum,
    getTempo,
    setTempo,
    requestTempo,
    getBeatTime,
    getBeatAtTime,
    getPhaseAtTime,
    getTimeAtBeat,
    isPlaying,
    setIsPlaying,
    setStartStopSyncEnabled,
    isStartStopSyncEnabled,
    commitSessionState,
    onEvent,
    destroy,
  };
}
