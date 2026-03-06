/**
 * Timing model for the DAW
 * 
 * Implements section 8.1 of the engineering spec:
 * - ticks (PPQ) for musical editing
 * - samples for DSP
 * - seconds for Web Audio clock interop
 */

// Pulses Per Quarter note - internal tick resolution
export const PPQ = 960;

/** Musical time representation in bars, beats, and ticks */
export interface MusicalTime {
  bars: number;
  beats: number;
  ticks: number;
}

/** Transport state for playback control */
export interface TransportState {
  playing: boolean;
  recording: boolean;
  looping: boolean;
  punchIn: number | null;
  punchOut: number | null;
  loopStartTick: number;
  loopEndTick: number;
  currentTick: number;
  currentSample: number;
  tempo: number;
  timeSigNum: number;
  timeSigDen: number;
}

/** Tempo event for tempo map */
export interface TempoEvent {
  tick: number;
  bpm: number;
  curve: 'jump' | 'ramp';
}

/** Time signature event */
export interface TimeSignatureEvent {
  tick: number;
  numerator: number;
  denominator: number;
}

/** Marker in the arrangement */
export interface Marker {
  id: string;
  tick: number;
  name: string;
  color?: string;
  type: 'locator' | 'cue' | 'loop' | 'section';
}

/** Loop specification for clips */
export interface LoopSpec {
  startTick: number;
  endTick: number;
  enabled: boolean;
}

/** Scheduler configuration for lookahead */
export interface SchedulerConfig {
  prepareHorizonMs: number;    // e.g. 120
  refillThresholdMs: number;   // e.g. 60
  maxChunkMs: number;          // e.g. 20
}

/** Default scheduler configuration */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  prepareHorizonMs: 120,
  refillThresholdMs: 60,
  maxChunkMs: 20,
};

/**
 * Convert musical time to ticks
 */
export function musicalTimeToTicks(time: MusicalTime, timeSigNum: number = 4): number {
  const ticksPerBeat = PPQ;
  const ticksPerBar = ticksPerBeat * timeSigNum;
  return time.bars * ticksPerBar + time.beats * ticksPerBeat + time.ticks;
}

/**
 * Convert ticks to musical time
 */
export function ticksToMusicalTime(ticks: number, timeSigNum: number = 4): MusicalTime {
  const ticksPerBeat = PPQ;
  const ticksPerBar = ticksPerBeat * timeSigNum;
  
  const bars = Math.floor(ticks / ticksPerBar);
  const remainingAfterBars = ticks % ticksPerBar;
  
  const beats = Math.floor(remainingAfterBars / ticksPerBeat);
  const remainingTicks = remainingAfterBars % ticksPerBeat;
  
  return {
    bars,
    beats,
    ticks: remainingTicks,
  };
}

/**
 * Convert ticks to samples
 */
export function ticksToSamples(
  ticks: number,
  tempo: number,
  sampleRate: number
): number {
  const seconds = ticksToSeconds(ticks, tempo);
  return Math.floor(seconds * sampleRate);
}

/**
 * Convert samples to ticks
 */
export function samplesToTicks(
  samples: number,
  tempo: number,
  sampleRate: number
): number {
  const seconds = samples / sampleRate;
  return secondsToTicks(seconds, tempo);
}

/**
 * Convert ticks to seconds
 */
export function ticksToSeconds(ticks: number, tempo: number): number {
  const beats = ticks / PPQ;
  return (beats * 60) / tempo;
}

/**
 * Convert seconds to ticks
 */
export function secondsToTicks(seconds: number, tempo: number): number {
  const beats = (seconds * tempo) / 60;
  return Math.floor(beats * PPQ);
}

/**
 * Get the tempo at a specific tick position
 */
export function getTempoAtTick(tick: number, tempoMap: TempoEvent[]): number {
  if (tempoMap.length === 0) {
    return 120; // Default tempo
  }
  
  // Find the last tempo event at or before this tick
  let currentTempo = tempoMap[0].bpm;
  for (const event of tempoMap) {
    if (event.tick <= tick) {
      currentTempo = event.bpm;
    } else {
      break;
    }
  }
  return currentTempo;
}

/**
 * Format tick position as a human-readable string (bars:beats.ticks)
 */
export function formatTickPosition(tick: number, timeSigNum: number = 4): string {
  const mt = ticksToMusicalTime(tick, timeSigNum);
  return `${mt.bars + 1}:${mt.beats + 1}.${mt.ticks}`;
}

/**
 * Parse a tick position from a string like "4:2.120"
 */
export function parseTickPosition(input: string): number {
  const match = input.match(/^(\d+):(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid tick position format: ${input}. Expected "bars:beats.ticks"`);
  }
  
  const bars = parseInt(match[1], 10) - 1; // 1-based to 0-based
  const beats = parseInt(match[2], 10) - 1;
  const ticks = parseInt(match[3], 10);
  
  return musicalTimeToTicks({ bars, beats, ticks });
}

/**
 * Calculate beat position from tick (floating point)
 */
export function tickToBeat(tick: number): number {
  return tick / PPQ;
}

/**
 * Calculate tick from beat position
 */
export function beatToTick(beat: number): number {
  return Math.floor(beat * PPQ);
}

/**
 * Calculate duration in ticks from tempo and duration in seconds
 */
export function secondsToTicksAtTempo(seconds: number, tempo: number): number {
  const beats = (seconds * tempo) / 60;
  return Math.floor(beats * PPQ);
}

/**
 * Calculate duration in seconds from ticks and tempo
 */
export function ticksToSecondsAtTempo(ticks: number, tempo: number): number {
  const beats = ticks / PPQ;
  return (beats * 60) / tempo;
}
