/**
 * Timing model for the DAW
 *
 * Implements section 8.1 of the engineering spec:
 * - ticks (PPQ) for musical editing
 * - samples for DSP
 * - seconds for Web Audio clock interop
 */
export declare const PPQ = 960;
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
    prepareHorizonMs: number;
    refillThresholdMs: number;
    maxChunkMs: number;
}
/** Default scheduler configuration */
export declare const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig;
/**
 * Convert musical time to ticks
 */
export declare function musicalTimeToTicks(time: MusicalTime, timeSigNum?: number): number;
/**
 * Convert ticks to musical time
 */
export declare function ticksToMusicalTime(ticks: number, timeSigNum?: number): MusicalTime;
/**
 * Convert ticks to samples
 */
export declare function ticksToSamples(ticks: number, tempo: number, sampleRate: number): number;
/**
 * Convert samples to ticks
 */
export declare function samplesToTicks(samples: number, tempo: number, sampleRate: number): number;
/**
 * Convert ticks to seconds
 */
export declare function ticksToSeconds(ticks: number, tempo: number): number;
/**
 * Convert seconds to ticks
 */
export declare function secondsToTicks(seconds: number, tempo: number): number;
/**
 * Get the tempo at a specific tick position
 */
export declare function getTempoAtTick(tick: number, tempoMap: TempoEvent[]): number;
/**
 * Format tick position as a human-readable string (bars:beats.ticks)
 */
export declare function formatTickPosition(tick: number, timeSigNum?: number): string;
/**
 * Parse a tick position from a string like "4:2.120"
 */
export declare function parseTickPosition(input: string): number;
/**
 * Calculate beat position from tick (floating point)
 */
export declare function tickToBeat(tick: number): number;
/**
 * Calculate tick from beat position
 */
export declare function beatToTick(beat: number): number;
/**
 * Calculate duration in ticks from tempo and duration in seconds
 */
export declare function secondsToTicksAtTempo(seconds: number, tempo: number): number;
/**
 * Calculate duration in seconds from ticks and tempo
 */
export declare function ticksToSecondsAtTempo(ticks: number, tempo: number): number;
//# sourceMappingURL=timing.d.ts.map