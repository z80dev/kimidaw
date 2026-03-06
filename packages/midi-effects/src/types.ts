/**
 * Core MIDI types and interfaces for the MIDI effects package
 */

/** MIDI message types */
export type MidiMessageType =
  | "note-on"
  | "note-off"
  | "poly-aftertouch"
  | "control-change"
  | "program-change"
  | "channel-aftertouch"
  | "pitch-bend"
  | "system-exclusive"
  | "time-code"
  | "song-position"
  | "song-select"
  | "tune-request"
  | "timing-clock"
  | "start"
  | "continue"
  | "stop"
  | "active-sensing"
  | "reset";

/** Base MIDI event structure */
export interface MidiEvent {
  /** Event type */
  type: MidiMessageType;
  /** MIDI channel (0-15) */
  channel: number;
  /** Sample time for scheduling */
  sampleTime: number;
  /** Event data bytes */
  data: number[];
}

/** Note-on event */
export interface NoteOnEvent extends MidiEvent {
  type: "note-on";
  /** Note number (0-127) */
  note: number;
  /** Velocity (0-127) */
  velocity: number;
}

/** Note-off event */
export interface NoteOffEvent extends MidiEvent {
  type: "note-off";
  /** Note number (0-127) */
  note: number;
  /** Release velocity (0-127) */
  velocity: number;
}

/** Control change event */
export interface ControlChangeEvent extends MidiEvent {
  type: "control-change";
  /** CC number (0-127) */
  controller: number;
  /** CC value (0-127) */
  value: number;
}

/** Pitch bend event */
export interface PitchBendEvent extends MidiEvent {
  type: "pitch-bend";
  /** Bend value (-8192 to 8191) */
  value: number;
}

/** Channel aftertouch event */
export interface ChannelAftertouchEvent extends MidiEvent {
  type: "channel-aftertouch";
  /** Pressure value (0-127) */
  pressure: number;
}

/** Polyphonic aftertouch event */
export interface PolyAftertouchEvent extends MidiEvent {
  type: "poly-aftertouch";
  /** Note number (0-127) */
  note: number;
  /** Pressure value (0-127) */
  pressure: number;
}

/** MPE (MIDI Polyphonic Expression) data */
export interface MPEData {
  /** Per-note pitch bend (-8192 to 8191) */
  perNotePitchBend?: Map<number, number>;
  /** Per-note CC74 (slide) values (0-127) */
  perNoteSlide?: Map<number, number>;
  /** Per-note pressure (0-127) */
  perNotePressure?: Map<number, number>;
}

/** Note state for tracking held notes */
export interface NoteState {
  /** Note number */
  note: number;
  /** Original velocity */
  velocity: number;
  /** Time when note was triggered */
  startTime: number;
  /** Channel */
  channel: number;
  /** Additional MPE data */
  mpe?: MPEData;
}

/** Timing information for synced effects */
export interface TimingInfo {
  /** Current tempo in BPM */
  tempo: number;
  /** Current sample rate */
  sampleRate: number;
  /** Transport position in beats */
  beatPosition: number;
  /** Transport playing state */
  isPlaying: boolean;
  /** Time signature numerator */
  timeSigNumerator: number;
  /** Time signature denominator */
  timeSigDenominator: number;
}

/** Rate divisions for synced effects */
export type RateDivision =
  | "1/1"
  | "1/2"
  | "1/4"
  | "1/4t"
  | "1/8"
  | "1/8t"
  | "1/16"
  | "1/16t"
  | "1/32"
  | "1/32t"
  | "1/64"
  | "1/64t";

/** Scale definitions */
export type ScaleType =
  | "chromatic"
  | "major"
  | "minor"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "aeolian"
  | "locrian"
  | "melodic-minor"
  | "harmonic-minor"
  | "pentatonic-major"
  | "pentatonic-minor"
  | "blues"
  | "whole-tone"
  | "diminished"
  | "augmented"
  | "arabic"
  | "hungarian-minor"
  | "enigmatic"
  | "neapolitan-major"
  | "neapolitan-minor"
  | "prometheus"
  | "gypsy"
  | "japanese"
  | "chinese"
  | "egyptian"
  | "hirajoshi"
  | "kumoi"
  | "pelog"
  | "altered"
  | "half-diminished"
  | "lydian-dominant"
  | "phrygian-dominant"
  | "double-harmonic"
  | "lydian-augmented";

/** Note name for scale roots */
export type NoteName =
  | "C"
  | "C#"
  | "Db"
  | "D"
  | "D#"
  | "Eb"
  | "E"
  | "F"
  | "F#"
  | "Gb"
  | "G"
  | "G#"
  | "Ab"
  | "A"
  | "A#"
  | "Bb"
  | "B";

/** Scale interval patterns (semitones from root) */
export const SCALE_PATTERNS: Record<ScaleType, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  "melodic-minor": [0, 2, 3, 5, 7, 9, 11],
  "harmonic-minor": [0, 2, 3, 5, 7, 8, 11],
  "pentatonic-major": [0, 2, 4, 7, 9],
  "pentatonic-minor": [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  "whole-tone": [0, 2, 4, 6, 8, 10],
  diminished: [0, 2, 3, 5, 6, 8, 9, 11],
  augmented: [0, 3, 4, 7, 8, 11],
  arabic: [0, 1, 4, 5, 7, 8, 11],
  "hungarian-minor": [0, 2, 3, 6, 7, 8, 11],
  enigmatic: [0, 1, 4, 6, 8, 10, 11],
  "neapolitan-major": [0, 1, 3, 5, 7, 9, 11],
  "neapolitan-minor": [0, 1, 3, 5, 7, 8, 11],
  prometheus: [0, 2, 4, 6, 9, 10],
  gypsy: [0, 2, 3, 6, 7, 8, 11],
  japanese: [0, 1, 5, 7, 10],
  chinese: [0, 4, 6, 7, 11],
  egyptian: [0, 2, 5, 7, 10],
  hirajoshi: [0, 2, 3, 7, 8],
  kumoi: [0, 2, 3, 7, 9],
  pelog: [0, 1, 3, 7, 8],
  altered: [0, 1, 3, 4, 6, 8, 10],
  "half-diminished": [0, 2, 3, 5, 6, 8, 10],
  "lydian-dominant": [0, 2, 4, 6, 7, 9, 10],
  "phrygian-dominant": [0, 1, 4, 5, 7, 8, 10],
  "double-harmonic": [0, 1, 4, 5, 7, 8, 11],
  "lydian-augmented": [0, 2, 4, 6, 8, 9, 11],
};

/** Convert note name to MIDI note number */
export function noteNameToNumber(note: NoteName): number {
  const noteMap: Record<NoteName, number> = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    F: 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11,
  };
  return noteMap[note] ?? 0;
}

/** Convert rate division to beat multiplier */
export function rateToBeatMultiplier(rate: RateDivision): number {
  const multipliers: Record<RateDivision, number> = {
    "1/1": 4,
    "1/2": 2,
    "1/4": 1,
    "1/4t": 2 / 3,
    "1/8": 0.5,
    "1/8t": 1 / 3,
    "1/16": 0.25,
    "1/16t": 1 / 6,
    "1/32": 0.125,
    "1/32t": 1 / 12,
    "1/64": 0.0625,
    "1/64t": 1 / 24,
  };
  return multipliers[rate] ?? 0.25;
}

/** Base interface for all MIDI effects */
export interface MidiEffect {
  /** Process MIDI events and return transformed events */
  process(events: MidiEvent[], sampleTime: number): MidiEvent[];
  /** Set a parameter value */
  setParameter(id: string, value: number | string | boolean): void;
  /** Get current parameter value */
  getParameter(id: string): number | string | boolean | undefined;
  /** Save state for serialization */
  saveState(): Record<string, unknown>;
  /** Load state from serialization */
  loadState(state: Record<string, unknown>): void;
  /** Reset effect to initial state */
  reset(): void;
  /** Get effect name */
  readonly name: string;
  /** Get effect version */
  readonly version: string;
}

/** Base class for MIDI effects with common functionality */
export abstract class BaseMidiEffect implements MidiEffect {
  abstract readonly name: string;
  abstract readonly version: string;

  protected parameters: Map<string, number | string | boolean> = new Map();

  abstract process(events: MidiEvent[], sampleTime: number): MidiEvent[];

  setParameter(id: string, value: number | string | boolean): void {
    this.parameters.set(id, value);
    this.onParameterChange(id, value);
  }

  getParameter(id: string): number | string | boolean | undefined {
    return this.parameters.get(id);
  }

  protected onParameterChange(_id: string, _value: number | string | boolean): void {
    // Override in subclasses
  }

  abstract saveState(): Record<string, unknown>;
  abstract loadState(state: Record<string, unknown>): void;

  reset(): void {
    this.parameters.clear();
  }
}

/** Helper to create a note-on event */
export function createNoteOn(
  note: number,
  velocity: number,
  channel: number,
  sampleTime: number
): NoteOnEvent {
  return {
    type: "note-on",
    channel: channel & 0x0f,
    note: Math.max(0, Math.min(127, note)),
    velocity: Math.max(0, Math.min(127, velocity)),
    sampleTime,
    data: [0x90 | (channel & 0x0f), note & 0x7f, velocity & 0x7f],
  };
}

/** Helper to create a note-off event */
export function createNoteOff(
  note: number,
  velocity: number,
  channel: number,
  sampleTime: number
): NoteOffEvent {
  return {
    type: "note-off",
    channel: channel & 0x0f,
    note: Math.max(0, Math.min(127, note)),
    velocity: Math.max(0, Math.min(127, velocity)),
    sampleTime,
    data: [0x80 | (channel & 0x0f), note & 0x7f, velocity & 0x7f],
  };
}

/** Helper to create a control change event */
export function createCC(
  controller: number,
  value: number,
  channel: number,
  sampleTime: number
): ControlChangeEvent {
  return {
    type: "control-change",
    channel: channel & 0x0f,
    controller: Math.max(0, Math.min(127, controller)),
    value: Math.max(0, Math.min(127, value)),
    sampleTime,
    data: [0xb0 | (channel & 0x0f), controller & 0x7f, value & 0x7f],
  };
}

/** Helper to create a pitch bend event */
export function createPitchBend(
  value: number,
  channel: number,
  sampleTime: number
): PitchBendEvent {
  const clamped = Math.max(-8192, Math.min(8191, value));
  const lsb = (clamped + 8192) & 0x7f;
  const msb = ((clamped + 8192) >> 7) & 0x7f;
  return {
    type: "pitch-bend",
    channel: channel & 0x0f,
    value: clamped,
    sampleTime,
    data: [0xe0 | (channel & 0x0f), lsb, msb],
  };
}
