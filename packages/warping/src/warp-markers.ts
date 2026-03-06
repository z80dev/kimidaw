/**
 * Warp marker management
 * Handles creation, editing, and alignment of warp markers
 */

import type { WarpMarker, WarpState, AudioBufferData } from './types.js';
import { DEFAULT_WARP_STATE } from './types.js';

export interface WarpMarkerManager {
  // Marker operations
  addMarker(samplePosition: number, beatPosition: number): WarpMarker;
  removeMarker(id: string): boolean;
  moveMarker(id: string, samplePosition: number, beatPosition: number): boolean;
  getMarker(id: string): WarpMarker | undefined;
  getAllMarkers(): WarpMarker[];

  // Auto-warp
  autoWarp(audio: AudioBufferData, tempo: number): WarpMarker[];
  clearMarkers(): void;

  // Time conversion
  sampleToBeat(samplePosition: number): number;
  beatToSample(beatPosition: number): number;

  // State
  getState(): WarpState;
  setState(state: Partial<WarpState>): void;
}

export function createWarpMarkerManager(
  initialState: Partial<WarpState> = {}
): WarpMarkerManager {
  const state: WarpState = {
    ...DEFAULT_WARP_STATE,
    ...initialState,
    markers: [...(initialState.markers || [])],
  };

  let audioLength = 0;
  let sampleRate = 44100;

  /**
   * Add a new warp marker
   */
  function addMarker(samplePosition: number, beatPosition: number): WarpMarker {
    const marker: WarpMarker = {
      id: generateMarkerId(),
      samplePosition: Math.max(0, samplePosition),
      beatPosition: Math.max(0, beatPosition),
    };

    state.markers.push(marker);
    sortMarkers();

    return marker;
  }

  /**
   * Remove a warp marker
   */
  function removeMarker(id: string): boolean {
    const index = state.markers.findIndex(m => m.id === id);
    if (index >= 0) {
      state.markers.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Move an existing marker
   */
  function moveMarker(
    id: string,
    samplePosition: number,
    beatPosition: number
  ): boolean {
    const marker = state.markers.find(m => m.id === id);
    if (marker) {
      marker.samplePosition = Math.max(0, samplePosition);
      marker.beatPosition = Math.max(0, beatPosition);
      sortMarkers();
      return true;
    }
    return false;
  }

  /**
   * Get a specific marker
   */
  function getMarker(id: string): WarpMarker | undefined {
    return state.markers.find(m => m.id === id);
  }

  /**
   * Get all markers sorted by sample position
   */
  function getAllMarkers(): WarpMarker[] {
    return [...state.markers];
  }

  /**
   * Clear all markers
   */
  function clearMarkers(): void {
    state.markers = [];
  }

  /**
   * Auto-warp based on detected tempo
   */
  function autoWarp(audio: AudioBufferData, tempo: number): WarpMarker[] {
    audioLength = audio.channelData[0]?.length || 0;
    sampleRate = audio.sampleRate;

    state.originalTempo = tempo;
    state.targetTempo = tempo;

    // Create markers at regular intervals (every 4 beats)
    clearMarkers();

    const beatDuration = 60 / tempo;
    const beatDurationSamples = beatDuration * sampleRate;
    const totalBeats = Math.floor(audioLength / beatDurationSamples);

    // Add first marker at beginning
    addMarker(0, 0);

    // Add markers every 4 beats
    for (let beat = 4; beat < totalBeats; beat += 4) {
      const samplePos = beat * beatDurationSamples;
      addMarker(samplePos, beat);
    }

    // Add end marker
    const endBeat = audioLength / beatDurationSamples;
    addMarker(audioLength, endBeat);

    return getAllMarkers();
  }

  /**
   * Convert sample position to beat position
   */
  function sampleToBeat(samplePosition: number): number {
    // Find surrounding markers
    const prevMarker = findPreviousMarker(samplePosition);
    const nextMarker = findNextMarker(samplePosition);

    if (!prevMarker) {
      // Before first marker - extrapolate
      if (state.markers.length > 0) {
        const ratio = samplePosition / state.markers[0].samplePosition;
        return state.markers[0].beatPosition * ratio;
      }
      return samplePositionToBeatLinear(samplePosition);
    }

    if (!nextMarker || prevMarker.id === nextMarker.id) {
      // After last marker - extrapolate
      const tempo = calculateMarkerTempo(prevMarker, state.markers.find(m => m.id !== prevMarker.id));
      const samplesAfter = samplePosition - prevMarker.samplePosition;
      const beatsAfter = samplesAfter / (sampleRate * (60 / tempo));
      return prevMarker.beatPosition + beatsAfter;
    }

    // Interpolate between markers
    const sampleDelta = nextMarker.samplePosition - prevMarker.samplePosition;
    const beatDelta = nextMarker.beatPosition - prevMarker.beatPosition;
    const ratio = (samplePosition - prevMarker.samplePosition) / sampleDelta;

    return prevMarker.beatPosition + beatDelta * ratio;
  }

  /**
   * Convert beat position to sample position
   */
  function beatToSample(beatPosition: number): number {
    // Find surrounding markers
    const prevMarker = findPreviousMarkerByBeat(beatPosition);
    const nextMarker = findNextMarkerByBeat(beatPosition);

    if (!prevMarker) {
      // Before first marker
      if (state.markers.length > 0) {
        const ratio = beatPosition / state.markers[0].beatPosition;
        return Math.floor(state.markers[0].samplePosition * ratio);
      }
      return beatToSampleLinear(beatPosition);
    }

    if (!nextMarker || prevMarker.id === nextMarker.id) {
      // After last marker
      const tempo = calculateMarkerTempo(prevMarker, state.markers.find(m => m.id !== prevMarker.id));
      const beatsAfter = beatPosition - prevMarker.beatPosition;
      const samplesAfter = beatsAfter * (sampleRate * (60 / tempo));
      return Math.floor(prevMarker.samplePosition + samplesAfter);
    }

    // Interpolate between markers
    const beatDelta = nextMarker.beatPosition - prevMarker.beatPosition;
    const sampleDelta = nextMarker.samplePosition - prevMarker.samplePosition;
    const ratio = (beatPosition - prevMarker.beatPosition) / beatDelta;

    return Math.floor(prevMarker.samplePosition + sampleDelta * ratio);
  }

  /**
   * Get current state
   */
  function getState(): WarpState {
    return {
      ...state,
      markers: [...state.markers],
      transients: [...state.transients],
    };
  }

  /**
   * Update state
   */
  function setState(newState: Partial<WarpState>): void {
    Object.assign(state, newState);
    if (newState.markers) {
      state.markers = [...newState.markers];
      sortMarkers();
    }
    if (newState.transients) {
      state.transients = [...newState.transients];
    }
  }

  // Helper functions

  function generateMarkerId(): string {
    return `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function sortMarkers(): void {
    state.markers.sort((a, b) => a.samplePosition - b.samplePosition);
  }

  function findPreviousMarker(samplePosition: number): WarpMarker | null {
    let prev: WarpMarker | null = null;
    for (const marker of state.markers) {
      if (marker.samplePosition <= samplePosition) {
        prev = marker;
      } else {
        break;
      }
    }
    return prev;
  }

  function findNextMarker(samplePosition: number): WarpMarker | null {
    for (const marker of state.markers) {
      if (marker.samplePosition > samplePosition) {
        return marker;
      }
    }
    return null;
  }

  function findPreviousMarkerByBeat(beatPosition: number): WarpMarker | null {
    let prev: WarpMarker | null = null;
    for (const marker of state.markers) {
      if (marker.beatPosition <= beatPosition) {
        prev = marker;
      } else {
        break;
      }
    }
    return prev;
  }

  function findNextMarkerByBeat(beatPosition: number): WarpMarker | null {
    for (const marker of state.markers) {
      if (marker.beatPosition > beatPosition) {
        return marker;
      }
    }
    return null;
  }

  function calculateMarkerTempo(
    marker1: WarpMarker,
    marker2?: WarpMarker
  ): number {
    if (!marker2) {
      return state.originalTempo;
    }

    const sampleDelta = marker2.samplePosition - marker1.samplePosition;
    const beatDelta = marker2.beatPosition - marker1.beatPosition;

    if (beatDelta === 0) return state.originalTempo;

    const durationSeconds = sampleDelta / sampleRate;
    const durationBeats = beatDelta;

    return (60 / durationSeconds) * durationBeats;
  }

  function samplePositionToBeatLinear(samplePosition: number): number {
    const beatDurationSamples = (60 / state.originalTempo) * sampleRate;
    return samplePosition / beatDurationSamples;
  }

  function beatToSampleLinear(beatPosition: number): number {
    const beatDurationSamples = (60 / state.originalTempo) * sampleRate;
    return Math.floor(beatPosition * beatDurationSamples);
  }

  return {
    addMarker,
    removeMarker,
    moveMarker,
    getMarker,
    getAllMarkers,
    autoWarp,
    clearMarkers,
    sampleToBeat,
    beatToSample,
    getState,
    setState,
  };
}

/**
 * Warp grid for visual display
 */
export interface WarpGrid {
  getGridLines(startBeat: number, endBeat: number, pixelsPerBeat: number): GridLine[];
  getSnapPoints(beatPosition: number, snapDivisions: number): number[];
}

export interface GridLine {
  beat: number;
  x: number;
  type: 'bar' | 'beat' | 'subdivision';
}

export function createWarpGrid(tempo: number, timeSignature: [number, number] = [4, 4]): WarpGrid {
  function getGridLines(
    startBeat: number,
    endBeat: number,
    pixelsPerBeat: number
  ): GridLine[] {
    const lines: GridLine[] = [];
    const [beatsPerBar] = timeSignature;

    // Round to nearest bar
    const startBar = Math.floor(startBeat / beatsPerBar);
    const endBar = Math.ceil(endBeat / beatsPerBar);

    for (let bar = startBar; bar <= endBar; bar++) {
      const barBeat = bar * beatsPerBar;

      // Bar line
      if (barBeat >= startBeat && barBeat <= endBeat) {
        lines.push({
          beat: barBeat,
          x: (barBeat - startBeat) * pixelsPerBeat,
          type: 'bar',
        });
      }

      // Beat lines
      for (let beat = 1; beat < beatsPerBar; beat++) {
        const beatPosition = barBeat + beat;
        if (beatPosition >= startBeat && beatPosition <= endBeat) {
          lines.push({
            beat: beatPosition,
            x: (beatPosition - startBeat) * pixelsPerBeat,
            type: 'beat',
          });
        }
      }
    }

    return lines;
  }

  function getSnapPoints(beatPosition: number, snapDivisions: number): number[] {
    const points: number[] = [];
    const step = 1 / snapDivisions;

    const start = Math.floor(beatPosition * snapDivisions) / snapDivisions;
    const end = start + 1;

    for (let p = start; p <= end; p += step) {
      points.push(p);
    }

    return points;
  }

  return {
    getGridLines,
    getSnapPoints,
  };
}
