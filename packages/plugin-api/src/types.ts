/**
 * Plugin API - Core Types and Interfaces
 * 
 * Defines the contract between the host DAW and all plugins (instruments/effects).
 * Based on the engineering spec section 16: Plugin and Extension Architecture.
 */

// =============================================================================
// Plugin Categories
// =============================================================================

export type PluginCategory = 
  | "instrument" 
  | "audioFx" 
  | "midiFx" 
  | "utility" 
  | "analysis";

export type ParameterKind = "float" | "int" | "bool" | "enum";
export type AutomationRate = "a-rate" | "k-rate";

// =============================================================================
// Plugin Parameter Specification
// =============================================================================

export interface PluginParameterSpec {
  /** Unique identifier for the parameter */
  id: string;
  /** Human-readable name */
  name: string;
  /** Parameter data type */
  kind: ParameterKind;
  /** Minimum value (normalized 0-1 for float, actual values for int/enum) */
  min: number;
  /** Maximum value */
  max: number;
  /** Default value */
  defaultValue: number;
  /** Step size for discrete values (optional) */
  step?: number;
  /** Automation rate - audio-rate or control-rate */
  automationRate?: AutomationRate;
  /** Unit label (e.g., "dB", "Hz", "ms") */
  unit?: string;
  /** Labels for enum values */
  labels?: string[];
  /** Parameter grouping for UI organization */
  group?: string;
  /** Whether the parameter can be automated */
  automatable?: boolean;
  /** Whether the parameter is exposed to the user */
  visible?: boolean;
  /** Tooltip/help text */
  description?: string;
}

// =============================================================================
// Plugin UI Descriptor
// =============================================================================

export interface PluginUiDescriptor {
  /** UI component type */
  type: "custom" | "generic" | "native";
  /** Width in pixels (if fixed) */
  width?: number;
  /** Height in pixels (if fixed) */
  height?: number;
  /** Minimum width */
  minWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Whether the UI can be resized */
  resizable?: boolean;
  /** CSS class name for styling */
  cssClass?: string;
  /** Custom UI entry point (for iframe/native integration) */
  entryPoint?: string;
  /** Parameter layout definition */
  layout?: UiLayoutSection[];
}

export interface UiLayoutSection {
  /** Section title */
  title: string;
  /** Parameter IDs in this section */
  parameters: string[];
  /** Layout style */
  layout: "vertical" | "horizontal" | "grid" | "tabs";
  /** Number of columns for grid layout */
  columns?: number;
}

// =============================================================================
// Plugin Definition (Factory)
// =============================================================================

export interface PluginDefinition {
  /** Unique plugin identifier (e.g., "com.company.plugin-name") */
  id: string;
  /** Display name */
  name: string;
  /** Plugin category */
  category: PluginCategory;
  /** Semantic version */
  version: string;
  /** Vendor/author name */
  vendor?: string;
  /** Plugin description */
  description?: string;
  /** Parameter specifications */
  parameters: PluginParameterSpec[];
  /** UI descriptor */
  ui: PluginUiDescriptor;
  /** Number of audio input channels */
  audioInputs: number;
  /** Number of audio output channels */
  audioOutputs: number;
  /** Number of MIDI input ports */
  midiInputs: number;
  /** Number of MIDI output ports */
  midiOutputs: number;
  /** Whether the plugin supports MPE */
  supportsMpe?: boolean;
  /** Whether the plugin has a sidechain input */
  hasSidechain?: boolean;
  /** Presets included with the plugin */
  factoryPresets?: FactoryPreset[];
  /** Create a runtime instance */
  createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime>;
}

export interface FactoryPreset {
  id: string;
  name: string;
  category?: string;
  author?: string;
  state: unknown;
}

// =============================================================================
// Plugin Host Context
// =============================================================================

export interface PluginHostContext {
  /** Sample rate (e.g., 44100, 48000) */
  sampleRate: number;
  /** Maximum block size the host will request */
  maxBlockSize: number;
  /** Current tempo in BPM */
  tempo: number;
  /** Time signature numerator */
  timeSigNumerator: number;
  /** Time signature denominator */
  timeSigDenominator: number;
  /** Current playhead position in samples */
  positionSamples: number;
  /** Whether transport is playing */
  isPlaying: boolean;
  /** Whether transport is recording */
  isRecording: boolean;
  /** Path for plugin to store temporary data */
  tempPath?: string;
  /** Host-provided logger (for non-realtime use only) */
  logger?: PluginLogger;
  /** Host-provided file system access */
  fileSystem?: PluginFileSystem;
  /** Access to host's parameter change queue */
  parameterQueue?: ParameterChangeQueue;
  /** Callback to report latency changes */
  reportLatency?: (samples: number) => void;
  /** Callback to report tail time changes */
  reportTail?: (samples: number) => void;
}

export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface PluginFileSystem {
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  readDir(path: string): Promise<string[]>;
}

export interface ParameterChangeQueue {
  /** Enqueue a parameter change for sample-accurate application */
  enqueue(paramId: string, value: number, sampleOffset: number): void;
  /** Get pending changes for the current block */
  getChanges(): ParameterChange[];
}

export interface ParameterChange {
  paramId: string;
  value: number;
  sampleOffset: number;
}

// =============================================================================
// Plugin Runtime Instance
// =============================================================================

export interface PluginInstanceRuntime {
  /** Connect this plugin into the audio graph */
  connect(graph: PluginConnectionGraph): void;
  /** Disconnect from the audio graph */
  disconnect(): void;
  /** Set a parameter value (may be smoothed) */
  setParam(id: string, value: number, atSample?: number): void;
  /** Get current parameter value */
  getParam(id: string): number;
  /** Save plugin state for serialization */
  saveState(): Promise<unknown>;
  /** Load plugin state from serialization */
  loadState(state: unknown): Promise<void>;
  /** Get reported latency in samples */
  getLatencySamples(): number;
  /** Get tail time (samples to continue processing after input ends) */
  getTailSamples(): number;
  /** Reset internal state (e.g., on playback start) */
  reset(): void;
  /** Prepare for processing (allocate resources) */
  prepare(config: ProcessConfig): void;
  /** Process audio/MIDI block - must be realtime-safe */
  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: MidiEvent[], blockSize: number): void;
  /** Clean up resources */
  dispose(): Promise<void>;
}

export interface PluginConnectionGraph {
  /** Input audio nodes to connect */
  audioInputs: AudioNode[];
  /** Output audio nodes to connect */
  audioOutputs: AudioNode[];
  /** Sidechain input (if applicable) */
  sidechainInput?: AudioNode;
  /** MIDI input port */
  midiInput?: MidiPort;
  /** MIDI output port */
  midiOutput?: MidiPort;
}

export interface MidiPort {
  send(event: MidiEvent): void;
  onReceive(callback: (event: MidiEvent) => void): void;
}

export interface ProcessConfig {
  sampleRate: number;
  blockSize: number;
  totalInputs: number;
  totalOutputs: number;
}

// =============================================================================
// MIDI Events
// =============================================================================

export type MidiEventType = 
  | "noteOn" 
  | "noteOff" 
  | "cc" 
  | "pitchBend" 
  | "channelPressure"
  | "polyPressure"
  | "programChange"
  | "sysex";

export interface MidiEvent {
  type: MidiEventType;
  /** Sample offset within the current block */
  sampleOffset: number;
  /** MIDI channel (0-15) */
  channel: number;
  /** Event-specific data */
  data: MidiEventData;
}

export type MidiEventData =
  | NoteOnData
  | NoteOffData
  | CCData
  | PitchBendData
  | ChannelPressureData
  | PolyPressureData
  | ProgramChangeData
  | SysexData;

export interface NoteOnData {
  note: number;      // 0-127
  velocity: number;  // 0-127
}

export interface NoteOffData {
  note: number;      // 0-127
  velocity: number;  // 0-127 (release velocity)
}

export interface CCData {
  controller: number;  // 0-127
  value: number;       // 0-127
}

export interface PitchBendData {
  value: number;  // -8192 to 8191 (0 = center)
}

export interface ChannelPressureData {
  pressure: number;  // 0-127
}

export interface PolyPressureData {
  note: number;      // 0-127
  pressure: number;  // 0-127
}

export interface ProgramChangeData {
  program: number;  // 0-127
}

export interface SysexData {
  data: Uint8Array;
}

// =============================================================================
// Audio Buffer Abstraction
// =============================================================================

export interface AudioBuffer {
  /** Number of channels */
  numberOfChannels: number;
  /** Length in samples */
  length: number;
  /** Sample rate */
  sampleRate: number;
  /** Duration in seconds */
  duration: number;
  /** Get channel data (Float32Array view) */
  getChannelData(channel: number): Float32Array;
  /** Copy data from source to this buffer */
  copyFrom(source: AudioBuffer, channel: number): void;
  /** Zero all channels */
  clear(): void;
}

// =============================================================================
// Plugin Registry
// =============================================================================

export interface PluginRegistry {
  /** Register a plugin definition */
  register(definition: PluginDefinition): void;
  /** Unregister a plugin */
  unregister(pluginId: string): void;
  /** Get a plugin definition by ID */
  get(pluginId: string): PluginDefinition | undefined;
  /** Get all registered plugins */
  getAll(): PluginDefinition[];
  /** Get plugins by category */
  getByCategory(category: PluginCategory): PluginDefinition[];
  /** Search plugins by name or vendor */
  search(query: string): PluginDefinition[];
  /** Check if a plugin is registered */
  has(pluginId: string): boolean;
}

// =============================================================================
// WAM Compatibility Types
// =============================================================================

export interface WamDescriptor {
  identifier: string;
  name: string;
  vendor: string;
  version: string;
  description?: string;
  keywords?: string[];
  isInstrument?: boolean;
}

export interface WamPlugin {
  readonly descriptor: WamDescriptor;
  createInstance(audioContext: AudioContext, initialState?: unknown): Promise<WamInstance>;
}

export interface WamInstance {
  audioNode: AudioWorkletNode;
  destroy(): Promise<void>;
}

// =============================================================================
// Utility Types
// =============================================================================

/** Realtime-safe parameter value with smoothing */
export interface SmoothedParameter {
  current: number;
  target: number;
  smoothingFactor: number;
  setTarget(value: number, timeConstantMs: number, sampleRate: number): void;
  process(blockSize: number): number;
}

/** Modulation source interface */
export interface ModulationSource {
  id: string;
  name: string;
  getValue(): number;
  getValueAtSample(sample: number): number;
}

/** Modulation routing */
export interface ModulationRoute {
  sourceId: string;
  targetParamId: string;
  amount: number;  // -1 to 1
  bipolar: boolean;
}

/** Voice allocation info for polyphonic instruments */
export interface VoiceInfo {
  voiceId: number;
  note: number;
  velocity: number;
  active: boolean;
  age: number;  // For voice stealing
}

/** Sample zone for multi-sampler instruments */
export interface SampleZone {
  rootNote: number;
  minNote: number;
  maxNote: number;
  minVelocity: number;
  maxVelocity: number;
  sampleId: string;
  sampleStart: number;
  sampleEnd: number;
  loopStart?: number;
  loopEnd?: number;
  loopMode?: "off" | "forward" | "pingpong";
  tuneCents: number;
  gainDb: number;
  roundRobinGroup?: number;
}
