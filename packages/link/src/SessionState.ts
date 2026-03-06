/**
 * Session State Management
 * Tracks tempo, beat time, and transport state
 */

import type { SessionState, Timeline, BeatTime } from './types.js';

export interface SessionStateManager {
  getState(): SessionState;
  getTempo(): number;
  setTempo(tempo: number): void;
  getBeat(): number;
  getBeatAtTime(time: number): number;
  getTimeAtBeat(beat: number): number;
  isPlaying(): boolean;
  start(time?: number): void;
  stop(time?: number): void;
  forceBeatAtTime(beat: number, time: number, quantum: number): void;
  requestBeatAtStartPlayingTime(beat: number, quantum: number): void;
}

export function createSessionState(initialTempo: number = 120): SessionStateManager {
  // Timeline state
  let tempo = initialTempo;
  let isPlaying = false;
  let sessionStartTime: number = performance.now();
  let timeAtLastBeat = sessionStartTime;
  let beatAtSessionStart = 0;

  // For start/stop sync
  let pendingStartBeat: number | null = null;
  let pendingStartQuantum: number = 4;

  function getState(): SessionState {
    return {
      tempo,
      beatTime: getBeat(),
      beatAtSessionStart,
      isPlaying,
    };
  }

  function getTempo(): number {
    return tempo;
  }

  function setTempo(newTempo: number): void {
    // Adjust beat reference to maintain continuity
    const now = performance.now();
    const currentBeat = getBeatAtTime(now);
    
    tempo = newTempo;
    timeAtLastBeat = now;
    beatAtSessionStart = currentBeat;
  }

  function getBeat(): number {
    return getBeatAtTime(performance.now());
  }

  function getBeatAtTime(time: number): number {
    if (!isPlaying) {
      return beatAtSessionStart;
    }

    const elapsedMs = time - timeAtLastBeat;
    const elapsedBeats = (elapsedMs / 1000) * (tempo / 60);
    
    return beatAtSessionStart + elapsedBeats;
  }

  function getTimeAtBeat(beat: number): number {
    if (!isPlaying) {
      return timeAtLastBeat;
    }

    const beatDiff = beat - beatAtSessionStart;
    const msPerBeat = 60000 / tempo;
    const msDiff = beatDiff * msPerBeat;
    
    return timeAtLastBeat + msDiff;
  }

  function isPlaying(): boolean {
    return isPlaying;
  }

  function start(time?: number): void {
    if (isPlaying) return;

    const startTime = time ?? performance.now();
    isPlaying = true;
    timeAtLastBeat = startTime;

    // Handle pending start beat for sync
    if (pendingStartBeat !== null) {
      beatAtSessionStart = pendingStartBeat;
      pendingStartBeat = null;
    }
  }

  function stop(time?: number): void {
    if (!isPlaying) return;

    const stopTime = time ?? performance.now();
    
    // Capture current beat position
    beatAtSessionStart = getBeatAtTime(stopTime);
    isPlaying = false;
    timeAtLastBeat = stopTime;
  }

  /**
   * Force the session to a specific beat at a specific time
   * Used for syncing with other Link peers
   */
  function forceBeatAtTime(beat: number, time: number, quantum: number): void {
    const currentBeat = getBeatAtTime(time);
    const phase = ((currentBeat % quantum) + quantum) % quantum;
    const targetPhase = ((beat % quantum) + quantum) % quantum;
    
    // Adjust to match both beat and phase
    const phaseDiff = targetPhase - phase;
    beatAtSessionStart = beat - phaseDiff;
    timeAtLastBeat = time;
  }

  /**
   * Request a specific beat to start at
   * Used for start/stop sync
   */
  function requestBeatAtStartPlayingTime(beat: number, quantum: number): void {
    pendingStartBeat = beat;
    pendingStartQuantum = quantum;
  }

  return {
    getState,
    getTempo,
    setTempo,
    getBeat,
    getBeatAtTime,
    getTimeAtBeat,
    isPlaying,
    start,
    stop,
    forceBeatAtTime,
    requestBeatAtStartPlayingTime,
  };
}

/**
 * Timeline utilities
 */
export function createTimeline(tempo: number, quantum: number = 4): Timeline {
  const now = performance.now();
  
  return {
    timeAtLastBeat: now,
    tempo,
    quantum,
  };
}

/**
 * Calculate beat time information
 */
export function calculateBeatTime(
  beat: number,
  quantum: number
): BeatTime {
  const phase = ((beat % quantum) + quantum) % quantum;
  const progress = phase / quantum;
  
  return {
    beat,
    phase,
    progress,
  };
}

/**
 * Format beat time for display
 */
export function formatBeatTime(beat: number): string {
  const bar = Math.floor(beat / 4) + 1;
  const beatInBar = Math.floor(beat % 4) + 1;
  const ticks = Math.floor((beat % 1) * 100);
  
  return `${bar}.${beatInBar}.${ticks}`;
}

/**
 * Parse beat time from string
 */
export function parseBeatTime(str: string): number {
  const parts = str.split('.');
  const bar = parseInt(parts[0] || '1', 10) - 1;
  const beat = parseInt(parts[1] || '1', 10) - 1;
  const ticks = parseInt(parts[2] || '0', 10);
  
  return bar * 4 + beat + ticks / 100;
}

/**
 * Clock for Link synchronization
 * Uses high-resolution timing
 */
export interface LinkClock {
  now(): number;
  getMicroseconds(): number;
}

export function createLinkClock(): LinkClock {
  // Base time for relative calculations
  const baseTime = performance.now();
  
  function now(): number {
    return performance.now();
  }
  
  function getMicroseconds(): number {
    return performance.now() * 1000;
  }
  
  return {
    now,
    getMicroseconds,
  };
}
