/**
 * Tempo Synchronization
 * Handles tempo consensus and smooth transitions
 */

import type { LinkConfiguration, TempoSyncOptions, SessionState } from './types.js';
import { DEFAULT_TEMPO_SYNC_OPTIONS } from './types.js';

export interface TempoSync {
  start(): void;
  stop(): void;
  suggestTempo(tempo: number): void;
  getSuggestedTempo(): number;
  setTempoCallback(callback: (tempo: number) => void): void;
}

export function createTempoSync(
  config: LinkConfiguration,
  onTempoChange: (tempo: number) => void
): TempoSync {
  const options = { ...DEFAULT_TEMPO_SYNC_OPTIONS };
  let isRunning = false;
  let currentTempo = 120;
  let suggestedTempo = 120;
  let tempoTransitionInterval: ReturnType<typeof setInterval> | null = null;

  // Track tempo suggestions from peers
  const tempoSuggestions: Map<string, { tempo: number; timestamp: number }> = new Map();

  function start(): void {
    if (isRunning) return;
    isRunning = true;
  }

  function stop(): void {
    isRunning = false;
    if (tempoTransitionInterval) {
      clearInterval(tempoTransitionInterval);
      tempoTransitionInterval = null;
    }
  }

  /**
   * Suggest a new tempo (from peer or user)
   */
  function suggestTempo(tempo: number): void {
    const clampedTempo = Math.max(config.tempoMin, Math.min(config.tempoMax, tempo));
    suggestedTempo = clampedTempo;

    // Calculate consensus tempo
    const consensus = calculateConsensusTempo();
    
    if (consensus !== currentTempo) {
      smoothTransitionToTempo(consensus);
    }
  }

  /**
   * Calculate consensus tempo from all suggestions
   */
  function calculateConsensusTempo(): number {
    // Include our own tempo
    const tempos = [currentTempo];

    // Add peer suggestions (only recent ones)
    const now = Date.now();
    const timeout = 10000; // 10 second timeout

    for (const [_, suggestion] of tempoSuggestions) {
      if (now - suggestion.timestamp < timeout) {
        tempos.push(suggestion.tempo);
      }
    }

    // Use median for robustness
    tempos.sort((a, b) => a - b);
    return tempos[Math.floor(tempos.length / 2)];
  }

  /**
   * Smoothly transition to a new tempo
   */
  function smoothTransitionToTempo(targetTempo: number): void {
    const tempoDiff = targetTempo - currentTempo;
    const tempoJump = Math.abs(tempoDiff);

    // If small jump, apply immediately
    if (tempoJump <= options.maxTempoJump) {
      applyTempo(targetTempo);
      return;
    }

    // Otherwise, ramp over time
    if (tempoTransitionInterval) {
      clearInterval(tempoTransitionInterval);
    }

    const steps = 20;
    const stepDuration = options.catchUpDuration / steps;
    const stepSize = tempoDiff / steps;
    let currentStep = 0;

    tempoTransitionInterval = setInterval(() => {
      currentStep++;
      const newTempo = currentTempo + stepSize;
      applyTempo(newTempo);

      if (currentStep >= steps) {
        if (tempoTransitionInterval) {
          clearInterval(tempoTransitionInterval);
          tempoTransitionInterval = null;
        }
        applyTempo(targetTempo);
      }
    }, stepDuration);
  }

  function applyTempo(tempo: number): void {
    currentTempo = tempo;
    onTempoChange(tempo);
  }

  function getSuggestedTempo(): number {
    return suggestedTempo;
  }

  function setTempoCallback(callback: (tempo: number) => void): void {
    onTempoChange = callback;
  }

  return {
    start,
    stop,
    suggestTempo,
    getSuggestedTempo,
    setTempoCallback,
  };
}

/**
 * Calculate the time of the next quantum boundary
 */
export function getNextQuantumTime(
  currentBeat: number,
  quantum: number,
  tempo: number,
  currentTime: number
): number {
  const beatsPerQuantum = quantum;
  const currentQuantum = Math.floor(currentBeat / beatsPerQuantum);
  const nextQuantumBeat = (currentQuantum + 1) * beatsPerQuantum;
  const beatsToNext = nextQuantumBeat - currentBeat;
  
  const secondsPerBeat = 60 / tempo;
  const timeToNext = beatsToNext * secondsPerBeat;
  
  return currentTime + timeToNext * 1000;
}

/**
 * Calculate beat position aligned to quantum
 */
export function alignToQuantum(
  beat: number,
  quantum: number,
  direction: 'floor' | 'ceil' | 'round' = 'round'
): number {
  const quantumSize = quantum;
  
  switch (direction) {
    case 'floor':
      return Math.floor(beat / quantumSize) * quantumSize;
    case 'ceil':
      return Math.ceil(beat / quantumSize) * quantumSize;
    case 'round':
    default:
      return Math.round(beat / quantumSize) * quantumSize;
  }
}

/**
 * Calculate phase within quantum (0 to quantum-1)
 */
export function getPhaseInQuantum(beat: number, quantum: number): number {
  return ((beat % quantum) + quantum) % quantum;
}

/**
 * Check if current beat is at a quantum boundary
 */
export function isAtQuantumBoundary(
  beat: number,
  quantum: number,
  tolerance: number = 0.01
): boolean {
  const phase = getPhaseInQuantum(beat, quantum);
  return phase < tolerance || phase > quantum - tolerance;
}

/**
 * Tempo phase synchronization
 * Aligns beat phase across peers
 */
export interface PhaseSync {
  getPhaseOffset(remoteBeat: number, localBeat: number, quantum: number): number;
  calculateSyncAdjustment(
    remoteBeat: number,
    localBeat: number,
    quantum: number,
    strength: number
  ): number;
}

export function createPhaseSync(): PhaseSync {
  function getPhaseOffset(
    remoteBeat: number,
    localBeat: number,
    quantum: number
  ): number {
    const remotePhase = getPhaseInQuantum(remoteBeat, quantum);
    const localPhase = getPhaseInQuantum(localBeat, quantum);
    
    let offset = remotePhase - localPhase;
    
    // Wrap to -quantum/2 to quantum/2
    if (offset > quantum / 2) {
      offset -= quantum;
    } else if (offset < -quantum / 2) {
      offset += quantum;
    }
    
    return offset;
  }

  function calculateSyncAdjustment(
    remoteBeat: number,
    localBeat: number,
    quantum: number,
    strength: number
  ): number {
    const offset = getPhaseOffset(remoteBeat, localBeat, quantum);
    return offset * strength;
  }

  return {
    getPhaseOffset,
    calculateSyncAdjustment,
  };
}
