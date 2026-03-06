/**
 * @daw/midi-effects
 * 
 * Ableton-style MIDI effects for in-browser DAW.
 * All effects process MIDI messages (not audio) and run in the MIDI processing chain.
 * 
 * ## Installation
 * 
 * ```bash
 * npm install @daw/midi-effects
 * ```
 * 
 * ## Usage
 * 
 * ```typescript
 * import { Arpeggiator, Chord, Scale, Velocity } from "@daw/midi-effects";
 * 
 * // Create effects
 * const arp = new Arpeggiator();
 * const scale = new Scale();
 * 
 * // Configure
 * arp.setParameter("style", "up-down");
 * arp.setParameter("rate", "1/16");
 * scale.setParameter("scale", "minor");
 * 
 * // Process MIDI events
 * const output = arp.process(inputEvents, currentSampleTime);
 * ```
 * 
 * ## Available Effects
 * 
 * - **Arpeggiator**: Transforms held notes into rhythmic patterns
 * - **Chord**: Adds additional notes to create chords
 * - **NoteLength**: Adjusts note durations
 * - **Pitch**: Transposes and quantizes note pitches
 * - **Random**: Randomizes note pitches
 * - **Scale**: Quantizes notes to a selected scale
 * - **Velocity**: Processes note velocities
 * - **MPEControl**: Manages MPE voice allocation and expression
 * 
 * @module
 */

// Core types
export {
  // Types
  type MidiMessageType,
  type MidiEvent,
  type NoteOnEvent,
  type NoteOffEvent,
  type ControlChangeEvent,
  type PitchBendEvent,
  type ChannelAftertouchEvent,
  type PolyAftertouchEvent,
  type MPEData,
  type NoteState,
  type TimingInfo,
  type RateDivision,
  type ScaleType,
  type NoteName,
  type MidiEffect,
  // Constants
  SCALE_PATTERNS,
  // Functions
  noteNameToNumber,
  rateToBeatMultiplier,
  createNoteOn,
  createNoteOff,
  createCC,
  createPitchBend,
  // Base class
  BaseMidiEffect,
} from "./types.js";

// Effect exports
export { Arpeggiator } from "./arpeggiator/index.js";
export type {
  ArpeggiatorParams,
  ArpeggiatorState,
  ArpStep,
  ArpStyle,
  VelocityMode as ArpVelocityMode,
  RetriggerMode,
  DistanceStyle,
} from "./arpeggiator/index.js";
export { DEFAULT_ARPEGGIATOR_PARAMS } from "./arpeggiator/index.js";

export { Chord } from "./chord/index.js";
export type { ChordParams, ChordNote, ChordMemory } from "./chord/index.js";
export { DEFAULT_CHORD_PARAMS } from "./chord/index.js";

export { NoteLength } from "./note-length/index.js";
export type { NoteLengthParams, TriggerMode, ActiveNote } from "./note-length/index.js";
export { DEFAULT_NOTE_LENGTH_PARAMS } from "./note-length/index.js";

export { Pitch } from "./pitch/index.js";
export type { PitchParams, RangeMode, PitchedNote } from "./pitch/index.js";
export { DEFAULT_PITCH_PARAMS } from "./pitch/index.js";

export { Random } from "./random/index.js";
export type { RandomParams, SignMode, RandomizedNote } from "./random/index.js";
export { DEFAULT_RANDOM_PARAMS } from "./random/index.js";

export { Scale } from "./scale/index.js";
export type { ScaleParams, ScaleNoteInfo } from "./scale/index.js";
export { DEFAULT_SCALE_PARAMS } from "./scale/index.js";

export { Velocity } from "./velocity/index.js";
export type { VelocityParams, VelocityMode as VelVelocityMode, VelocityInfo } from "./velocity/index.js";
export { DEFAULT_VELOCITY_PARAMS } from "./velocity/index.js";

export { MPEControl } from "./mpe-control/index.js";
export type {
  MPEControlParams,
  MPEZone,
  PitchBendConfig,
  SlideConfig,
  PressureConfig,
  MPENoteState,
  MPERouting,
} from "./mpe-control/index.js";
export { DEFAULT_MPE_CONTROL_PARAMS } from "./mpe-control/index.js";

export { NoteEcho } from "./note-echo/index.js";
export type { NoteEchoParams, EchoNote } from "./note-echo/index.js";
export { DEFAULT_NOTE_ECHO_PARAMS } from "./note-echo/index.js";

export { ExpressionControl } from "./expression-control/index.js";
export type {
  ExpressionMapping,
  MPEZone as ExpressionMPEZone,
  ExpressionControlParams,
  SmoothedValue,
} from "./expression-control/index.js";
export {
  DEFAULT_EXPRESSION_CONTROL_PARAMS,
  DEFAULT_EXPRESSION_MAPPING,
} from "./expression-control/index.js";

/**
 * Factory function to create MIDI effects by name
 * Use dynamic imports for tree-shaking compatibility
 */
export async function createMidiEffect(name: string): Promise<import("./types.js").MidiEffect | null> {
  switch (name.toLowerCase()) {
    case "arpeggiator": {
      const { Arpeggiator } = await import("./arpeggiator/index.js");
      return new Arpeggiator();
    }
    case "chord": {
      const { Chord } = await import("./chord/index.js");
      return new Chord();
    }
    case "notelength":
    case "note-length": {
      const { NoteLength } = await import("./note-length/index.js");
      return new NoteLength();
    }
    case "pitch": {
      const { Pitch } = await import("./pitch/index.js");
      return new Pitch();
    }
    case "random": {
      const { Random } = await import("./random/index.js");
      return new Random();
    }
    case "scale": {
      const { Scale } = await import("./scale/index.js");
      return new Scale();
    }
    case "velocity": {
      const { Velocity } = await import("./velocity/index.js");
      return new Velocity();
    }
    case "mpecontrol":
    case "mpe-control": {
      const { MPEControl } = await import("./mpe-control/index.js");
      return new MPEControl();
    }
    case "noteecho":
    case "note-echo": {
      const { NoteEcho } = await import("./note-echo/index.js");
      return new NoteEcho();
    }
    case "expressioncontrol":
    case "expression-control": {
      const { ExpressionControl } = await import("./expression-control/index.js");
      return new ExpressionControl();
    }
    default:
      return null;
  }
}

/**
 * List of all available MIDI effect names
 */
export const MIDI_EFFECT_NAMES = [
  "arpeggiator",
  "chord",
  "note-length",
  "pitch",
  "random",
  "scale",
  "velocity",
  "mpe-control",
  "note-echo",
  "expression-control",
] as const;

export type MidiEffectName = (typeof MIDI_EFFECT_NAMES)[number];
