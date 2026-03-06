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
/** Default scheduler configuration */
export const DEFAULT_SCHEDULER_CONFIG = {
    prepareHorizonMs: 120,
    refillThresholdMs: 60,
    maxChunkMs: 20,
};
/**
 * Convert musical time to ticks
 */
export function musicalTimeToTicks(time, timeSigNum = 4) {
    const ticksPerBeat = PPQ;
    const ticksPerBar = ticksPerBeat * timeSigNum;
    return time.bars * ticksPerBar + time.beats * ticksPerBeat + time.ticks;
}
/**
 * Convert ticks to musical time
 */
export function ticksToMusicalTime(ticks, timeSigNum = 4) {
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
export function ticksToSamples(ticks, tempo, sampleRate) {
    const seconds = ticksToSeconds(ticks, tempo);
    return Math.floor(seconds * sampleRate);
}
/**
 * Convert samples to ticks
 */
export function samplesToTicks(samples, tempo, sampleRate) {
    const seconds = samples / sampleRate;
    return secondsToTicks(seconds, tempo);
}
/**
 * Convert ticks to seconds
 */
export function ticksToSeconds(ticks, tempo) {
    const beats = ticks / PPQ;
    return (beats * 60) / tempo;
}
/**
 * Convert seconds to ticks
 */
export function secondsToTicks(seconds, tempo) {
    const beats = (seconds * tempo) / 60;
    return Math.floor(beats * PPQ);
}
/**
 * Get the tempo at a specific tick position
 */
export function getTempoAtTick(tick, tempoMap) {
    if (tempoMap.length === 0) {
        return 120; // Default tempo
    }
    // Find the last tempo event at or before this tick
    let currentTempo = tempoMap[0].bpm;
    for (const event of tempoMap) {
        if (event.tick <= tick) {
            currentTempo = event.bpm;
        }
        else {
            break;
        }
    }
    return currentTempo;
}
/**
 * Format tick position as a human-readable string (bars:beats.ticks)
 */
export function formatTickPosition(tick, timeSigNum = 4) {
    const mt = ticksToMusicalTime(tick, timeSigNum);
    return `${mt.bars + 1}:${mt.beats + 1}.${mt.ticks}`;
}
/**
 * Parse a tick position from a string like "4:2.120"
 */
export function parseTickPosition(input) {
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
export function tickToBeat(tick) {
    return tick / PPQ;
}
/**
 * Calculate tick from beat position
 */
export function beatToTick(beat) {
    return Math.floor(beat * PPQ);
}
/**
 * Calculate duration in ticks from tempo and duration in seconds
 */
export function secondsToTicksAtTempo(seconds, tempo) {
    const beats = (seconds * tempo) / 60;
    return Math.floor(beats * PPQ);
}
/**
 * Calculate duration in seconds from ticks and tempo
 */
export function ticksToSecondsAtTempo(ticks, tempo) {
    const beats = ticks / PPQ;
    return (beats * 60) / tempo;
}
