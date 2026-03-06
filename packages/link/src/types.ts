/**
 * Ableton Link protocol types
 */

// ============================================================================
// Core Link Types
// ============================================================================

export interface LinkPeer {
  id: string;
  address: string;
  port: number;
  lastSeen: number;
}

export interface LinkSession {
  tempo: number;
  beat: number;
  phase: number;
  quantum: number;
  isPlaying: boolean;
  peers: LinkPeer[];
}

export interface LinkConfiguration {
  localPort: number;
  multicastAddress: string;
  multicastPort: number;
  peerTimeout: number;
  tempoMin: number;
  tempoMax: number;
  quantum: number;
}

export const DEFAULT_LINK_CONFIG: LinkConfiguration = {
  localPort: 20808,
  multicastAddress: '224.0.0.251',
  multicastPort: 20808,
  peerTimeout: 5000,
  tempoMin: 20,
  tempoMax: 999,
  quantum: 4,
};

// ============================================================================
// Session State
// ============================================================================

export interface SessionState {
  tempo: number;
  beatTime: number;
  beatAtSessionStart: number;
  isPlaying: boolean;
}

export interface Timeline {
  timeAtLastBeat: number;
  tempo: number;
  quantum: number;
}

export interface BeatTime {
  beat: number;
  phase: number;
  progress: number; // 0-1 within quantum
}

// ============================================================================
// Clock Synchronization
// ============================================================================

export interface ClockOffset {
  offset: number; // microseconds
  roundTripDelay: number; // microseconds
  confidence: number;
}

export interface NTPPacket {
  version: number;
  mode: number;
  transmitTimestamp: number;
  receiveTimestamp: number;
  originTimestamp: number;
}

// ============================================================================
// Network Messages
// ============================================================================

export enum LinkMessageType {
  ALIVE = 0,
  RESPONSE = 1,
  BYEBYE = 2,
}

export interface LinkMessage {
  type: LinkMessageType;
  senderId: string;
  sessionState: SessionState;
  timestamp: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type LinkEventType =
  | 'peer-joined'
  | 'peer-left'
  | 'tempo-changed'
  | 'phase-sync'
  | 'start-stop-sync'
  | 'session-state-changed'
  | 'error';

export interface LinkEvent {
  type: LinkEventType;
  timestamp: number;
  data?: unknown;
}

export type LinkEventHandler = (event: LinkEvent) => void;

// ============================================================================
// Tempo Sync Options
// ============================================================================

export interface TempoSyncOptions {
  catchUpDuration: number; // ms to adjust to new tempo
  maxTempoJump: number; // max BPM change without ramping
}

export const DEFAULT_TEMPO_SYNC_OPTIONS: TempoSyncOptions = {
  catchUpDuration: 500,
  maxTempoJump: 10,
};

// ============================================================================
// Start/Stop Sync
// ============================================================================

export interface StartStopSyncOptions {
  enabled: boolean;
  syncQuantum: boolean; // sync to quantum boundaries
  quantum: number;
}

export const DEFAULT_START_STOP_OPTIONS: StartStopSyncOptions = {
  enabled: true,
  syncQuantum: true,
  quantum: 4,
};
