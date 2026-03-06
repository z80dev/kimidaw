/**
 * Clip type definitions for the DAW
 *
 * Implements sections 7.3 and 7.4 of the engineering spec
 */
import type { LoopSpec } from './timing.js';
/** Fade curve types */
export type FadeCurve = 'linear' | 'equal-power' | 'exponential' | 'logarithmic' | 's-curve';
/** Fade configuration for clips */
export interface FadeConfig {
    inCurve: FadeCurve;
    outCurve: FadeCurve;
    inSamples: number;
    outSamples: number;
}
/** Warp marker for time-stretching */
export interface WarpMarker {
    sourceSample: number;
    targetTick: number;
}
/** Warp specification for audio clips */
export interface WarpSpec {
    enabled: boolean;
    markers: WarpMarker[];
    originBpm?: number;
    originalSampleRate: number;
}
/** Stretch quality settings */
export type StretchQuality = 'draft' | 'good' | 'best';
/** Audio clip model */
export interface AudioClip {
    id: string;
    name?: string;
    color?: string;
    assetId: string;
    lane: number;
    startTick: number;
    endTick: number;
    sourceStartSample: number;
    sourceEndSample: number;
    gainDb: number;
    transposeSemitones: number;
    fineTuneCents: number;
    reverse: boolean;
    fades: FadeConfig;
    warp?: WarpSpec;
    stretchQuality: StretchQuality;
    transientMarkers?: number[];
    beatGrid?: BeatGridMarker[];
    takeIndex?: number;
    isComped: boolean;
    gainEnvelope?: GainEnvelopePoint[];
}
/** Beat grid marker for warping */
export interface BeatGridMarker {
    samplePosition: number;
    beatPosition: number;
}
/** Gain envelope point */
export interface GainEnvelopePoint {
    tick: number;
    gainDb: number;
    curve: 'linear' | 'bezier';
}
/** MIDI note event */
export interface MidiNote {
    id: string;
    note: number;
    velocity: number;
    startTick: number;
    durationTicks: number;
    pitchOffset?: number;
    timbre?: number;
    pressure?: number;
}
/** MIDI CC event */
export interface MidiCCEvent {
    id: string;
    controller: number;
    value: number;
    tick: number;
    curve?: 'step' | 'linear' | 'bezier';
}
/** Pitch bend event */
export interface PitchBendEvent {
    id: string;
    value: number;
    tick: number;
}
/** Channel pressure (aftertouch) event */
export interface ChannelPressureEvent {
    id: string;
    pressure: number;
    tick: number;
}
/** Polyphonic aftertouch event */
export interface PolyAftertouchEvent {
    id: string;
    note: number;
    pressure: number;
    tick: number;
}
/** Program change event */
export interface ProgramChangeEvent {
    id: string;
    program: number;
    tick: number;
}
/** MPE per-note data (for MPE-enabled tracks) */
export interface MpeLaneData {
    noteId: string;
    pitchBend: PitchBendEvent[];
    timbre: MidiCCEvent[];
    pressure: PolyAftertouchEvent[];
}
/** Scale hint for clip display/editing */
export interface ScaleHint {
    root: number;
    mode: ScaleMode;
    enabled: boolean;
}
/** Scale modes */
export type ScaleMode = 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian' | 'harmonic-minor' | 'melodic-minor' | 'pentatonic-major' | 'pentatonic-minor' | 'blues' | 'chromatic';
/** Scale definitions (intervals in semitones) */
export declare const SCALE_INTERVALS: Record<ScaleMode, number[]>;
/** MIDI clip model */
export interface MidiClip {
    id: string;
    name?: string;
    color?: string;
    startTick: number;
    endTick: number;
    loop: LoopSpec | null;
    notes: MidiNote[];
    cc: MidiCCEvent[];
    pitchBend: PitchBendEvent[];
    channelPressure: ChannelPressureEvent[];
    polyAftertouch: PolyAftertouchEvent[];
    programChanges: ProgramChangeEvent[];
    mpe?: MpeLaneData[];
    scaleHint?: ScaleHint;
    generated?: {
        scriptId: string;
        hash: string;
        seed: string;
        generatedAt: number;
    };
}
/** Calculate clip duration in ticks */
export declare function getClipDuration(clip: AudioClip | MidiClip): number;
/** Get the looped duration accounting for loop settings */
export declare function getLoopedDuration(clip: MidiClip): number;
/** Check if a MIDI note is within a given time range */
export declare function noteOverlapsRange(note: MidiNote, startTick: number, endTick: number): boolean;
/** Quantize a note to a grid */
export declare function quantizeNote(note: MidiNote, gridTicks: number, strength?: number, swing?: number): MidiNote;
/** Split a MIDI note at a given tick position */
export declare function splitNote(note: MidiNote, splitTick: number): [MidiNote, MidiNote] | null;
/** Transpose a MIDI note */
export declare function transposeNote(note: MidiNote, semitones: number): MidiNote;
/** Get notes within a time range */
export declare function getNotesInRange(clip: MidiClip, startTick: number, endTick: number): MidiNote[];
/** Create a new empty MIDI clip */
export declare function createMidiClip(id: string, startTick: number, durationTicks: number, options?: {
    name?: string;
    color?: string;
    loop?: LoopSpec;
}): MidiClip;
/** Create a new empty audio clip */
export declare function createAudioClip(id: string, assetId: string, startTick: number, durationTicks: number, options?: {
    name?: string;
    color?: string;
    lane?: number;
    gainDb?: number;
}): AudioClip;
/** Check if note is in scale */
export declare function isNoteInScale(note: number, scale: ScaleHint): boolean;
/** Snap note to nearest scale note */
export declare function snapToScale(note: number, scale: ScaleHint): number;
//# sourceMappingURL=clips.d.ts.map