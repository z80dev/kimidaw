/**
 * MIDI Package - Core Type Definitions
 * 
 * Type definitions for MIDI I/O, mapping, MPE, and file handling.
 * Follows the engineering spec sections 12.1-12.5
 */

// ============================================================================
// MIDI Message Types
// ============================================================================

export type MidiMessageType =
  | "noteOn"
  | "noteOff"
  | "polyPressure"
  | "controlChange"
  | "programChange"
  | "channelPressure"
  | "pitchBend"
  | "sysex"
  | "timecode"
  | "songPosition"
  | "songSelect"
  | "tuneRequest"
  | "clock"
  | "start"
  | "continue"
  | "stop"
  | "activeSense"
  | "reset"
  // Meta events
  | "meta"
  | "setTempo"
  | "timeSignature"
  | "keySignature"
  | "endOfTrack";

export interface MidiMessage {
  type: MidiMessageType;
  channel: number; // 0-15
  data1: number; // 0-127
  data2: number; // 0-127 (not used for some message types)
  timestamp: number; // DOMHighResTimeStamp or AudioContext time
  deviceId: string;
}

export interface NoteOnMessage extends MidiMessage {
  type: "noteOn";
  note: number; // 0-127, C-1 to G9
  velocity: number; // 0-127
}

export interface NoteOffMessage extends MidiMessage {
  type: "noteOff";
  note: number; // 0-127
  velocity: number; // 0-127 (release velocity)
}

export interface ControlChangeMessage extends MidiMessage {
  type: "controlChange";
  controller: number; // 0-127
  value: number; // 0-127
}

export interface PitchBendMessage extends MidiMessage {
  type: "pitchBend";
  value: number; // -8192 to 8191 (centered at 0)
}

export interface ChannelPressureMessage extends MidiMessage {
  type: "channelPressure";
  pressure: number; // 0-127
}

export interface PolyPressureMessage extends MidiMessage {
  type: "polyPressure";
  note: number; // 0-127
  pressure: number; // 0-127
}

export interface ProgramChangeMessage extends MidiMessage {
  type: "programChange";
  program: number; // 0-127
}

// ============================================================================
// MIDI Device Types
// ============================================================================

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  version: string;
  type: "input" | "output";
  state: "connected" | "disconnected";
  connection: "open" | "closed" | "pending";
}

export interface MidiInputDevice extends MidiDeviceInfo {
  type: "input";
}

export interface MidiOutputDevice extends MidiDeviceInfo {
  type: "output";
}

// ============================================================================
// MIDI Mapping/Learning Types
// ============================================================================

export type MidiBindingTargetKind =
  | "transport.play"
  | "transport.stop"
  | "transport.record"
  | "transport.tapTempo"
  | "transport.metronome"
  | "mixer.fader"
  | "mixer.pan"
  | "mixer.mute"
  | "mixer.solo"
  | "plugin.param"
  | "scene.launch"
  | "track.arm"
  | "track.mute"
  | "track.solo"
  | "clip.launch"
  | "clip.stop";

export type MidiTransformMode =
  | "linear"
  | "toggle"
  | "relative-2s-complement"
  | "relative-binary-offset";

export interface MidiBindingSource {
  deviceId: string | "*"; // "*" = any device
  channel: number | "*"; // "*" = any channel (0-15)
  type: "note" | "cc" | "pb" | "pressure" | "polyPressure" | "program";
  number?: number; // Note number or CC number
}

export interface MidiBindingTarget {
  kind: MidiBindingTargetKind;
  id: string; // Track ID, plugin ID, etc.
  paramId?: string; // For plugin.param targets
  sceneIndex?: number; // For scene.launch targets
  clipIndex?: number; // For clip.launch targets
}

export interface MidiBindingTransform {
  mode: MidiTransformMode;
  min?: number;
  max?: number;
  invert?: boolean;
  curve?: "linear" | "log" | "exp";
}

export interface MidiBinding {
  id: string;
  name?: string;
  source: MidiBindingSource;
  target: MidiBindingTarget;
  transform?: MidiBindingTransform;
  enabled: boolean;
  learnMode?: boolean; // True if currently in learn mode
}

// ============================================================================
// Computer Keyboard to MIDI Types
// ============================================================================

export interface KeyboardMidiState {
  enabled: boolean;
  octaveOffset: number; // -4 to +4 (default: 0 = C4 octave)
  velocity: number; // 1-127 (default: 100)
  sustain: boolean;
  scaleLock?: {
    enabled: boolean;
    root: number; // 0-11 (C to B)
    mode: ScaleMode;
  };
  chordMode?: {
    enabled: boolean;
    chordType: ChordType;
  };
  latchMode: boolean;
  activeNotes: Set<number>; // Currently held notes
}

export type ScaleMode =
  | "major"
  | "minor"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "aeolian"
  | "locrian"
  | "pentatonic-major"
  | "pentatonic-minor"
  | "blues"
  | "chromatic";

export type ChordType =
  | "triad"
  | "7th"
  | "maj7"
  | "min7"
  | "dim"
  | "aug"
  | "sus4";

// Default keyboard piano mapping (from spec section 12.4)
export const KEYBOARD_PIANO_MAP: Record<string, number> = {
  KeyA: 60, KeyW: 61, KeyS: 62, KeyE: 63, KeyD: 64,
  KeyF: 65, KeyT: 66, KeyG: 67, KeyY: 68, KeyH: 69,
  KeyU: 70, KeyJ: 71, KeyK: 72, KeyO: 73, KeyL: 74,
  KeyP: 75, Semicolon: 76,
};

// Scale intervals (semitones from root)
export const SCALE_INTERVALS: Record<ScaleMode, number[]> = {
  "major": [0, 2, 4, 5, 7, 9, 11],
  "minor": [0, 2, 3, 5, 7, 8, 10],
  "dorian": [0, 2, 3, 5, 7, 9, 10],
  "phrygian": [0, 1, 3, 5, 7, 8, 10],
  "lydian": [0, 2, 4, 6, 7, 9, 11],
  "mixolydian": [0, 2, 4, 5, 7, 9, 10],
  "aeolian": [0, 2, 3, 5, 7, 8, 10],
  "locrian": [0, 1, 3, 5, 6, 8, 10],
  "pentatonic-major": [0, 2, 4, 7, 9],
  "pentatonic-minor": [0, 3, 5, 7, 10],
  "blues": [0, 3, 5, 6, 7, 10],
  "chromatic": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// Chord intervals (semitones from root)
export const CHORD_INTERVALS: Record<ChordType, number[]> = {
  "triad": [0, 4, 7],
  "7th": [0, 4, 7, 10],
  "maj7": [0, 4, 7, 11],
  "min7": [0, 3, 7, 10],
  "dim": [0, 3, 6],
  "aug": [0, 4, 8],
  "sus4": [0, 5, 7],
};

// ============================================================================
// MPE Types (MIDI Polyphonic Expression)
// ============================================================================

export interface MpeZone {
  channelRange: [number, number]; // [start, end] channels (e.g., [2, 15] for lower zone)
  masterChannel: number; // 1 or 16 for lower/upper zones
  pitchBendRange: number; // Semitones (typically 48 or 96)
}

export interface MpeNoteState {
  note: number;
  channel: number;
  velocity: number;
  pitchBend: number; // Per-note pitch bend
  pressure: number; // Per-note pressure (poly aftertouch or CC74)
  timbre: number; // CC74 typically used for timbre
}

export interface MpeConfiguration {
  lowerZone?: MpeZone;
  upperZone?: MpeZone;
  enabled: boolean;
}

// ============================================================================
// MIDI File Types
// ============================================================================

export type MidiFileFormat = 0 | 1 | 2;

export interface MidiFileHeader {
  format: MidiFileFormat;
  numTracks: number;
  ticksPerQuarter: number;
  // SMPTE timing (if ticksPerQuarter < 0)
  smpteFramesPerSecond?: number;
  smpteTicksPerFrame?: number;
}

export interface MidiTrackEvent {
  deltaTime: number; // Ticks since last event
  type: MidiMessageType;
  channel?: number;
  data: number[];
  metaType?: number; // For meta events
  metaData?: Uint8Array; // For meta events
}

export interface MidiTrack {
  name: string;
  events: MidiTrackEvent[];
}

export interface MidiFile {
  header: MidiFileHeader;
  tracks: MidiTrack[];
}

// Meta event types
export const META_EVENT_TYPES = {
  SEQUENCE_NUMBER: 0x00,
  TEXT: 0x01,
  COPYRIGHT: 0x02,
  TRACK_NAME: 0x03,
  INSTRUMENT_NAME: 0x04,
  LYRIC: 0x05,
  MARKER: 0x06,
  CUE_POINT: 0x07,
  CHANNEL_PREFIX: 0x20,
  END_OF_TRACK: 0x2F,
  SET_TEMPO: 0x51,
  SMPTE_OFFSET: 0x54,
  TIME_SIGNATURE: 0x58,
  KEY_SIGNATURE: 0x59,
  SEQUENCER_SPECIFIC: 0x7F,
} as const;

// Standard CC numbers
export const CC_NUMBERS = {
  BANK_SELECT: 0,
  MODULATION: 1,
  BREATH: 2,
  FOOT: 4,
  PORTAMENTO_TIME: 5,
  DATA_ENTRY_MSB: 6,
  VOLUME: 7,
  BALANCE: 8,
  PAN: 10,
  EXPRESSION: 11,
  EFFECT_1: 12,
  EFFECT_2: 13,
  SUSTAIN: 64,
  PORTAMENTO: 65,
  SOSTENUTO: 66,
  SOFT_PEDAL: 67,
  LEGATO: 68,
  HOLD_2: 69,
  SOUND_CONTROLLER_1: 70,
  SOUND_CONTROLLER_2: 71,
  SOUND_CONTROLLER_3: 72,
  SOUND_CONTROLLER_4: 73,
  SOUND_CONTROLLER_5: 74, // Often used as MPE timbre
  SOUND_CONTROLLER_6: 75,
  SOUND_CONTROLLER_7: 76,
  SOUND_CONTROLLER_8: 77,
  SOUND_CONTROLLER_9: 78,
  SOUND_CONTROLLER_10: 79,
  GENERAL_PURPOSE_5: 80,
  GENERAL_PURPOSE_6: 81,
  GENERAL_PURPOSE_7: 82,
  GENERAL_PURPOSE_8: 83,
  PORTAMENTO_CONTROL: 84,
  EFFECT_1_DEPTH: 91,
  EFFECT_2_DEPTH: 92,
  EFFECT_3_DEPTH: 93,
  EFFECT_4_DEPTH: 94,
  EFFECT_5_DEPTH: 95,
  DATA_INCREMENT: 96,
  DATA_DECREMENT: 97,
  NRPN_LSB: 98,
  NRPN_MSB: 99,
  RPN_LSB: 100,
  RPN_MSB: 101,
  ALL_SOUND_OFF: 120,
  RESET_ALL_CONTROLLERS: 121,
  LOCAL_CONTROL: 122,
  ALL_NOTES_OFF: 123,
  OMNI_MODE_OFF: 124,
  OMNI_MODE_ON: 125,
  MONO_MODE_ON: 126,
  POLY_MODE_ON: 127,
} as const;

// ============================================================================
// MIDI Clock / Transport Types
// ============================================================================

export interface MidiClockState {
  bpm: number;
  ticks: number;
  isPlaying: boolean;
  songPosition: number; // MIDI beats (16th notes) since start
}

export interface MidiTimecode {
  hours: number;
  minutes: number;
  seconds: number;
  frames: number;
  fps: 24 | 25 | 29.97 | 30;
}

// ============================================================================
// Event Handler Types
// ============================================================================

export type MidiMessageHandler = (message: MidiMessage) => void;
export type MidiDeviceChangeHandler = (devices: MidiDeviceInfo[]) => void;
export type MidiErrorHandler = (error: Error, deviceId?: string) => void;

// Mapping handlers
export type BindingHandler = (binding: MidiBinding, value: number, rawMessage: MidiMessage) => void;
export type LearnHandler = (source: MidiBindingSource) => void;

// Keyboard handlers
export type KeyboardMidiHandler = (message: MidiMessage) => void;

// MPE handlers
export type MpeNoteHandler = (note: MpeNoteState, message: MidiMessage) => void;
export type MpeZoneHandler = (zone: "lower" | "upper", isActive: boolean) => void;
