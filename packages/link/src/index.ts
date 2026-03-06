/**
 * @daw/link - Ableton Link Protocol Implementation
 * 
 * Network tempo synchronization for the In-Browser DAW.
 * Sync tempo, beat phase, and transport across devices.
 * 
 * @example
 * ```typescript
 * import { createLinkClient } from "@daw/link";
 * 
 * const link = createLinkClient({
 *   initialTempo: 128,
 *   initialQuantum: 4,
 * });
 * 
 * // Enable Link
 * link.enable();
 * 
 * // Listen for tempo changes
 * link.onEvent((event) => {
 *   if (event.type === 'tempo-changed') {
 *     console.log('New tempo:', link.getTempo());
 *   }
 * });
 * 
 * // Get current beat time
 * const { beat, phase, progress } = link.getBeatTime();
 * console.log(`Beat: ${beat}, Phase: ${phase}`);
 * 
 * // Set tempo (propagates to all peers)
 * link.setTempo(130);
 * 
 * // Start/stop transport
 * link.setIsPlaying(true);
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  LinkConfiguration,
  LinkPeer,
  LinkSession,
  SessionState,
  Timeline,
  BeatTime,
  ClockOffset,
  NTPPacket,
  LinkMessage,
  LinkMessageType,
  LinkEvent,
  LinkEventType,
  LinkEventHandler,
  TempoSyncOptions,
  StartStopSyncOptions,
} from './types.js';

export {
  DEFAULT_LINK_CONFIG,
  DEFAULT_TEMPO_SYNC_OPTIONS,
  DEFAULT_START_STOP_OPTIONS,
} from './types.js';

// ============================================================================
// Link Client
// ============================================================================

export {
  createLinkClient,
  type LinkClient,
  type LinkClientOptions,
} from './LinkClient.js';

// ============================================================================
// Peer Discovery
// ============================================================================

export {
  createPeerDiscovery,
  createWebSocketPeerDiscovery,
  type PeerDiscovery,
  type PeerDiscoveryCallbacks,
  type WebSocketPeerDiscovery,
} from './PeerDiscovery.js';

// ============================================================================
// Tempo Sync
// ============================================================================

export {
  createTempoSync,
  createPhaseSync,
  getNextQuantumTime,
  alignToQuantum,
  getPhaseInQuantum,
  isAtQuantumBoundary,
  type TempoSync,
  type PhaseSync,
} from './TempoSync.js';

// ============================================================================
// Session State
// ============================================================================

export {
  createSessionState,
  createTimeline,
  calculateBeatTime,
  createLinkClock,
  formatBeatTime,
  parseBeatTime,
  type SessionStateManager,
  type LinkClock,
} from './SessionState.js';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate milliseconds per beat from tempo
 */
export function msPerBeat(tempo: number): number {
  return 60000 / tempo;
}

/**
 * Calculate beat duration in seconds
 */
export function beatDuration(tempo: number): number {
  return 60 / tempo;
}

/**
 * Calculate samples per beat
 */
export function samplesPerBeat(tempo: number, sampleRate: number): number {
  return (60 / tempo) * sampleRate;
}

/**
 * Convert beat to time in milliseconds
 */
export function beatToMs(beat: number, tempo: number): number {
  return beat * msPerBeat(tempo);
}

/**
 * Convert time in milliseconds to beat
 */
export function msToBeat(ms: number, tempo: number): number {
  return ms / msPerBeat(tempo);
}

/**
 * Check if two tempos are close enough to be considered equal
 */
export function temposEqual(tempo1: number, tempo2: number, tolerance: number = 0.1): boolean {
  return Math.abs(tempo1 - tempo2) < tolerance;
}

/**
 * Calculate tempo from beat duration
 */
export function durationToTempo(durationSeconds: number): number {
  return 60 / durationSeconds;
}

// ============================================================================
// Version
// ============================================================================

export const VERSION = '0.1.0';
