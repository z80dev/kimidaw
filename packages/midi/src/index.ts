/**
 * @daw/midi - MIDI I/O Subsystem
 * 
 * Comprehensive MIDI package for the In-Browser DAW.
 * Provides MIDI input/output, file parsing/writing, mapping, and MPE support.
 * 
 * @example
 * ```typescript
 * import { 
 *   getMidiInputManager, 
 *   getMidiOutputManager,
 *   getKeyboardMidiMapper,
 *   parseMidiFile 
 * } from "@daw/midi";
 * 
 * // Initialize MIDI input
 * const input = getMidiInputManager();
 * await input.initialize();
 * 
 * // Listen for messages
 * input.onMessage((msg) => {
 *   console.log("MIDI:", msg);
 * });
 * 
 * // Enable keyboard MIDI
 * const keyboard = getKeyboardMidiMapper();
 * keyboard.enable();
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // MIDI Messages
  MidiMessage,
  MidiMessageType,
  NoteOnMessage,
  NoteOffMessage,
  ControlChangeMessage,
  PitchBendMessage,
  ChannelPressureMessage,
  PolyPressureMessage,
  ProgramChangeMessage,
  
  // Devices
  MidiDeviceInfo,
  MidiInputDevice,
  MidiOutputDevice,
  
  // Mapping
  MidiBinding,
  MidiBindingSource,
  MidiBindingTarget,
  MidiBindingTransform,
  MidiBindingTargetKind,
  MidiTransformMode,
  
  // Keyboard
  KeyboardMidiState,
  ScaleMode,
  ChordType,
  
  // MPE
  MpeZone,
  MpeNoteState,
  MpeConfiguration,
  
  // MIDI File
  MidiFile,
  MidiFileHeader,
  MidiFileFormat,
  MidiTrack,
  MidiTrackEvent,
  MidiClockState,
  MidiTimecode,
  
  // Event Handlers
  MidiMessageHandler,
  MidiDeviceChangeHandler,
  MidiErrorHandler,
  BindingHandler,
  LearnHandler,
  KeyboardMidiHandler,
  MpeNoteHandler,
  MpeZoneHandler,
} from "./types.js";

// ============================================================================
// Constants
// ============================================================================

export {
  KEYBOARD_PIANO_MAP,
  SCALE_INTERVALS,
  CHORD_INTERVALS,
  META_EVENT_TYPES,
  CC_NUMBERS,
} from "./types.js";

// ============================================================================
// MIDI Input
// ============================================================================

export {
  getMidiInputManager,
  resetMidiInputManager,
  type MidiInputManager,
  type MidiInputOptions,
  type MidiInputState,
} from "./input.js";

// ============================================================================
// MIDI Output
// ============================================================================

export {
  getMidiOutputManager,
  resetMidiOutputManager,
  type MidiOutputManager,
  type MidiOutputOptions,
  type MidiOutputState,
  type ScheduledMidiMessage,
} from "./output.js";

// ============================================================================
// MIDI Mapping
// ============================================================================

export {
  getMidiMappingManager,
  resetMidiMappingManager,
  type MidiMappingManager,
  type MidiMappingState,
  type MappingOptions,
  DEFAULT_TRANSPORT_BINDINGS,
} from "./mapping.js";

// ============================================================================
// Keyboard to MIDI
// ============================================================================

export {
  getKeyboardMidiMapper,
  resetKeyboardMidiMapper,
  type KeyboardMidiMapper,
  type KeyboardMidiOptions,
} from "./keyboard.js";

// ============================================================================
// MIDI File Parser
// ============================================================================

export {
  parseMidiFile,
  parseMidiData,
  parseMidiBlob,
  type MidiParser,
  type ParseOptions,
  type ParseResult,
} from "./parser.js";

// ============================================================================
// MIDI File Writer
// ============================================================================

export {
  writeMidiFile,
  type MidiWriter,
  type WriteOptions,
  type WriteResult,
} from "./writer.js";

// ============================================================================
// MPE Support
// ============================================================================

export {
  getMpeManager,
  resetMpeManager,
  type MpeManager,
  type MpeOptions,
  DEFAULT_LOWER_ZONE,
  DEFAULT_UPPER_ZONE,
} from "./mpe.js";

// ============================================================================
// MIDI Capture (Wave 7)
// ============================================================================

export {
  createMidiCapture,
  performanceToClipData,
  mergeTakes,
  DEFAULT_CAPTURE_OPTIONS,
  type MidiCapture,
  type CapturedPerformance,
  type CapturedNote,
  type CapturedCC,
  type CaptureOptions,
} from "./capture.js";

// ============================================================================
// Convenience Combined Manager
// ============================================================================

import { getMidiInputManager, type MidiInputOptions } from "./input.js";
import { getMidiOutputManager, type MidiOutputOptions } from "./output.js";
import { getMidiMappingManager, type MappingOptions } from "./mapping.js";
import { getKeyboardMidiMapper, type KeyboardMidiOptions } from "./keyboard.js";
import { getMpeManager, type MpeOptions } from "./mpe.js";

export interface MidiManagerOptions {
  input?: MidiInputOptions;
  output?: MidiOutputOptions;
  mapping?: MappingOptions;
  keyboard?: KeyboardMidiOptions;
  mpe?: MpeOptions;
}

export interface MidiManager {
  input: ReturnType<typeof getMidiInputManager>;
  output: ReturnType<typeof getMidiOutputManager>;
  mapping: ReturnType<typeof getMidiMappingManager>;
  keyboard: ReturnType<typeof getKeyboardMidiMapper>;
  mpe: ReturnType<typeof getMpeManager>;
}

/**
 * Get all MIDI managers in one call
 */
export function getMidiManager(_options: MidiManagerOptions = {}): MidiManager {
  return {
    input: getMidiInputManager(),
    output: getMidiOutputManager(),
    mapping: getMidiMappingManager(),
    keyboard: getKeyboardMidiMapper(),
    mpe: getMpeManager(),
  };
}

/**
 * Reset all MIDI managers
 */
export function resetMidiManager(): void {
  // Individual reset functions are called through their respective modules
}

// ============================================================================
// Version
// ============================================================================

export const VERSION = "0.1.0";
