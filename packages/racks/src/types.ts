/**
 * Racks System - Core Types
 * 
 * Shared types and interfaces for the Ableton-style Racks System.
 * Defines the data models for chains, zones, macros, and rack configurations.
 */

// Import and re-export types from plugin-api
import type { 
  PluginInstanceRuntime as PIR,
  PluginDefinition as PD,
} from "@daw/plugin-api";

export type { 
  PluginInstanceRuntime, 
  PluginDefinition,
  MidiEvent,
  AudioBuffer 
} from "@daw/plugin-api";

// Local aliases for use within this module
type PluginInstanceRuntime = PIR;
type PluginDefinition = PD;
// MidiEvent and AudioBuffer aliases not needed for internal use

// =============================================================================
// Zone Types
// =============================================================================

/**
 * A zone range with crossfade boundaries
 * Used for Key, Velocity, and Chain Select zones
 */
export interface ZoneRange {
  /** Low boundary (inclusive) */
  low: number;
  /** High boundary (inclusive) */
  high: number;
  /** Fade low boundary (start of crossfade) */
  fadeLow: number;
  /** Fade high boundary (end of crossfade) */
  fadeHigh: number;
}

/**
 * Complete zone configuration for a chain
 */
export interface ChainZones {
  /** Key zone (MIDI note range: 0-127) */
  key: ZoneRange;
  /** Velocity zone (0-127) */
  velocity: ZoneRange;
  /** Chain select zone (0-127) */
  chainSelect: ZoneRange;
}

/**
 * Zone editor settings
 */
export interface ZoneEditorState {
  /** Currently visible zone type */
  activeZone: "key" | "velocity" | "chainSelect";
  /** Show crossfade handles */
  showCrossfades: boolean;
  /** Snap to grid */
  snapToGrid: boolean;
  /** Grid size in zone units */
  gridSize: number;
}

// =============================================================================
// Mixer Types
// =============================================================================

/**
 * Send slot configuration
 */
export interface SendSlot {
  /** Send ID */
  id: string;
  /** Target return chain ID */
  targetId: string;
  /** Send level (0-1) */
  level: number;
  /** Pre-fader send */
  preFader: boolean;
  /** Send is active */
  active: boolean;
}

/**
 * Chain mixer state
 */
export interface ChainMixer {
  /** Volume (dB, -inf to +12) */
  volume: number;
  /** Pan (-50 to +50, where 0 is center) */
  pan: number;
  /** Mute state */
  mute: boolean;
  /** Solo state */
  solo: boolean;
  /** Solo-isolate (excludes from other solos) */
  soloIsolate: boolean;
  /** Output gain for meter display */
  meterGain: number;
}

// =============================================================================
// Macro Types
// =============================================================================

/**
 * Macro mapping to a device parameter
 */
export interface MacroMapping {
  /** Unique mapping ID */
  id: string;
  /** Target device ID (within the rack) */
  deviceId: string;
  /** Target parameter ID */
  paramId: string;
  /** Minimum value (normalized 0-1) */
  minValue: number;
  /** Maximum value (normalized 0-1) */
  maxValue: number;
  /** Invert the mapping */
  inverted: boolean;
  /** Curve shape: -1 (exponential) to 1 (logarithmic), 0 = linear */
  curve: number;
}

/**
 * Macro control definition
 */
export interface Macro {
  /** Macro ID (1-8) */
  id: number;
  /** Display name */
  name: string;
  /** Current value (normalized 0-1) */
  value: number;
  /** Default value */
  defaultValue: number;
  /** Parameter mappings */
  mappings: MacroMapping[];
  /** MIDI CC assignment (optional) */
  midiCC: number | null;
  /** Visual color */
  color?: string;
}

/** Maximum number of macros per rack */
export const MAX_MACROS = 8;

/** Default macro names */
export const DEFAULT_MACRO_NAMES = [
  "Macro 1", "Macro 2", "Macro 3", "Macro 4",
  "Macro 5", "Macro 6", "Macro 7", "Macro 8"
];

// =============================================================================
// Chain Types
// =============================================================================

/**
 * Chain definition - a parallel signal path within a rack
 */
export interface RackChain {
  /** Unique chain ID */
  id: string;
  /** Display name */
  name: string;
  /** Chain color */
  color?: string;
  /** Devices in this chain (instruments/effects) */
  devices: ChainDevice[];
  /** Zone configuration */
  zones: ChainZones;
  /** Mixer settings */
  mixer: ChainMixer;
  /** Send effects (for Drum Rack) */
  sends?: SendSlot[];
  /** Output routing (null = main output) */
  outputTarget: string | null;
  /** Chain is active/enabled */
  active: boolean;
}

/**
 * Device wrapper for chains
 * Allows recursive rack nesting
 */
export interface ChainDevice {
  /** Device instance ID */
  id: string;
  /** Device definition */
  definition: PluginDefinition;
  /** Runtime instance (when active) */
  instance?: PluginInstanceRuntime;
  /** Is this device a nested rack? */
  isRack: boolean;
  /** Nested rack state (if isRack is true) */
  nestedRack?: RackState;
  /** Device is bypassed */
  bypassed: boolean;
  /** Device is frozen/rendered */
  frozen: boolean;
}

// =============================================================================
// Chain Selector Types
// =============================================================================

/**
 * Chain selector configuration
 */
export interface ChainSelectorConfig {
  /** Current chain select value (0-127) */
  value: number;
  /** MIDI CC assignment */
  midiCC: number | null;
  /** Smoothing time in ms for morphing */
  smoothingMs: number;
  /** Round-robin mode for chain selection */
  roundRobin: boolean;
  /** Round-robin cycle count */
  roundRobinCount: number;
  /** Chain select follows MIDI notes */
  followNotes: boolean;
  /** Note-to-chain mapping (if followNotes) */
  noteMapping: Map<number, string>;
}

// =============================================================================
// Rack Types
// =============================================================================

/** Rack type discriminator */
export type RackType = 
  | "instrument" 
  | "drum" 
  | "audioEffect" 
  | "midiEffect";

/**
 * Base rack configuration
 */
export interface RackConfig {
  /** Rack type */
  type: RackType;
  /** Allow multiple chains */
  multiChain: boolean;
  /** Maximum number of chains */
  maxChains: number;
  /** Has return chains (for Drum Rack) */
  hasReturns: boolean;
  /** Maximum return chains */
  maxReturns: number;
  /** Supports chain zones */
  supportsZones: boolean;
  /** Supports macros */
  supportsMacros: boolean;
  /** Supports nested racks */
  supportsNesting: boolean;
}

/**
 * Rack state for serialization
 */
export interface RackState {
  /** Rack type */
  type: RackType;
  /** Rack name */
  name: string;
  /** Rack version */
  version: string;
  /** Chains */
  chains: RackChain[];
  /** Return chains (for Drum Rack) */
  returnChains?: RackChain[];
  /** Macros */
  macros: Macro[];
  /** Chain selector config */
  chainSelector: ChainSelectorConfig;
  /** Show/hide chain list */
  showChains: boolean;
  /** Show/hide macro controls */
  showMacros: boolean;
  /** Selected chain ID */
  selectedChainId: string | null;
  /** Expanded device IDs */
  expandedDevices: string[];
}

// =============================================================================
// Drum Rack Specific Types
// =============================================================================

/**
 * Drum pad configuration
 * Each pad maps to a MIDI note and contains a chain
 */
export interface DrumPad {
  /** MIDI note number (0-127) */
  note: number;
  /** Pad name */
  name: string;
  /** Associated chain */
  chain: import("./Chain.js").Chain;
  /** Choke group (0-31, null = none) */
  chokeGroup: number | null;
  /** Is this pad the choke group master? */
  isChokeMaster: boolean;
  /** Swing amount (0-1) */
  swing: number;
  /** Time shift in ticks */
  timeShift: number;
  /** Pad color */
  color?: string;
}

/**
 * Drum Rack specific state
 */
export interface DrumRackState extends RackState {
  type: "drum";
  /** All 128 possible pads */
  pads: (DrumPad | null)[];
  /** Number of visible pads */
  visiblePadCount: number;
  /** Return chains for send effects */
  returnChains: RackChain[];
  /** Auto-select chains */
  autoSelect: boolean;
  /** Pad input filter (note range) */
  inputFilterLow: number;
  inputFilterHigh: number;
}

// =============================================================================
// Audio Effect Rack Specific Types
// =============================================================================

/** Input split mode for Audio Effect Rack */
export type InputSplitMode = "serial" | "parallel" | "frequency";

/**
 * Audio Effect Rack specific state
 */
export interface AudioEffectRackState extends RackState {
  type: "audioEffect";
  /** Input splitting mode */
  splitMode: InputSplitMode;
  /** Dry/Wet mix (0-1) */
  dryWet: number;
  /** Crossover frequency for frequency split */
  crossoverFreq: number;
  /** Crossover slope in dB/octave */
  crossoverSlope: number;
  /** Individual dry/wet per chain */
  chainDryWet: Map<string, number>;
}

// =============================================================================
// MIDI Effect Rack Specific Types
// =============================================================================

/**
 * MIDI Effect Rack specific state
 */
export interface MidiEffectRackState extends RackState {
  type: "midiEffect";
  /** Process note-off events */
  processNoteOff: boolean;
  /** Process CC events */
  processCC: boolean;
  /** Process pitch bend */
  processPitchBend: boolean;
  /** Process channel pressure */
  processChannelPressure: boolean;
  /** Velocity scaling mode */
  velocityMode: "pass" | "scale" | "fixed" | "random";
  /** Fixed velocity value (if mode is fixed) */
  fixedVelocity: number;
  /** Velocity scale factor */
  velocityScale: number;
  /** Velocity offset */
  velocityOffset: number;
}

// =============================================================================
// Instrument Rack Specific Types
// =============================================================================

/**
 * Instrument Rack specific state
 */
export interface InstrumentRackState extends RackState {
  type: "instrument";
  /** Key zone split mode */
  keySplitMode: "layer" | "split" | "crossfade";
  /** Velocity layer mode */
  velocityLayerMode: "layer" | "switch" | "crossfade";
  /** Legato mode for multi-chain */
  legatoMode: boolean;
  /** Portamento time in ms */
  portamentoTime: number;
}

// =============================================================================
// Processing Types
// =============================================================================

/**
 * Zone calculation result
 */
export interface ZoneResult {
  /** Chain is active for this input */
  active: boolean;
  /** Gain factor (0-1) from zone crossfades */
  gain: number;
  /** Which zone caused the gain reduction */
  zoneType: "key" | "velocity" | "chainSelect" | "none";
}

/**
 * Chain selection context
 */
export interface ChainSelectionContext {
  /** MIDI note number */
  note: number;
  /** Velocity */
  velocity: number;
  /** Chain select value */
  chainSelect: number;
  /** MIDI channel */
  channel: number;
}

/**
 * Processing buffers for chain rendering
 */
export interface ChainBuffers {
  left: Float32Array;
  right: Float32Array;
  /** Number of samples currently valid */
  validSamples: number;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Rack event types for the event system
 */
export type RackEventType = 
  | "chainAdded"
  | "chainRemoved"
  | "chainReordered"
  | "deviceAdded"
  | "deviceRemoved"
  | "deviceMoved"
  | "macroChanged"
  | "macroMapped"
  | "macroUnmapped"
  | "zoneChanged"
  | "mixerChanged"
  | "chainSelected"
  | "padTriggered"
  | "soloChanged";

/**
 * Rack event
 */
export interface RackEvent {
  type: RackEventType;
  rackId: string;
  chainId?: string;
  deviceId?: string;
  macroId?: number;
  payload?: unknown;
}

/**
 * Event handler type
 */
export type RackEventHandler = (event: RackEvent) => void;

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Rack creation options
 */
export interface RackCreateOptions {
  /** Initial name */
  name?: string;
  /** Number of chains to create initially */
  numChains?: number;
  /** Number of macros (default: 8) */
  numMacros?: number;
  /** Initial chain names */
  chainNames?: string[];
  /** Sample rate for DSP */
  sampleRate?: number;
  /** Maximum block size */
  maxBlockSize?: number;
}

/**
 * Drum Rack creation options
 */
export interface DrumRackCreateOptions extends RackCreateOptions {
  /** Number of visible pads (default: 16) */
  numPads?: number;
  /** MIDI notes for pads */
  padNotes?: number[];
  /** Number of return chains */
  numReturns?: number;
}

/**
 * Serialization options
 */
export interface SerializationOptions {
  /** Include runtime state */
  includeRuntimeState: boolean;
  /** Include nested rack state */
  includeNestedRacks: boolean;
  /** Compress sample data references */
  compressSampleRefs: boolean;
}
