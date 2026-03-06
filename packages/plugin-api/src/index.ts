/**
 * Plugin API
 * 
 * Core plugin system for the In-Browser DAW.
 * Provides the contract between the host DAW and all instruments/effects.
 * 
 * @example
 * ```typescript
 * import { 
 *   PluginDefinition, 
 *   createParameterMap,
 *   StateSerializerImpl 
 * } from "@daw/plugin-api";
 * 
 * const myPlugin: PluginDefinition = {
 *   id: "com.example.synth",
 *   name: "My Synth",
 *   category: "instrument",
 *   version: "1.0.0",
 *   parameters: [...],
 *   ui: { type: "generic" },
 *   // ...
 * };
 * ```
 */

// =============================================================================
// Core Types
// =============================================================================

export type {
  // Plugin definitions
  PluginCategory,
  PluginDefinition,
  FactoryPreset,
  
  // Parameters
  ParameterKind,
  AutomationRate,
  PluginParameterSpec,
  
  // UI
  PluginUiDescriptor,
  UiLayoutSection,
  
  // Host context
  PluginHostContext,
  PluginLogger,
  PluginFileSystem,
  ParameterChangeQueue,
  ParameterChange,
  
  // Runtime instance
  PluginInstanceRuntime,
  PluginConnectionGraph,
  ProcessConfig,
  MidiPort,
  
  // MIDI
  MidiEvent,
  MidiEventType,
  MidiEventData,
  NoteOnData,
  NoteOffData,
  CCData,
  PitchBendData,
  ChannelPressureData,
  PolyPressureData,
  ProgramChangeData,
  SysexData,
  
  // Audio
  AudioBuffer,
  
  // Registry
  PluginRegistry,
  
  // WAM
  WamDescriptor,
  WamPlugin,
  WamInstance,
  
  // Utilities
  SmoothedParameter,
  ModulationSource,
  ModulationRoute,
  VoiceInfo,
  SampleZone,
} from "./types.js";

// =============================================================================
// Parameter System
// =============================================================================

export {
  // Converters
  createLinearConverter,
  createLogConverter,
  createExpConverter,
  createFrequencyConverter,
  createDbConverter,
} from "./params.js";

export type {
  ParameterConverter,
  NormalizedValue,
  DenormalizedValue,
  ParameterInstance,
  ParameterMap,
} from "./params.js";

export {
  // Parameter creation
  createParameter,
  createParameterMap,
  
  // Parameter queue
  ParameterChangeQueueImpl,
  
  // Modulation
  ModulationMatrixImpl,
  
  // Utilities
  snapToStep,
  formatParameterValue,
  clampNormalized,
  mapRange,
  midiToFrequency,
  frequencyToMidi,
  dbToGain,
  gainToDb,
} from "./params.js";

// =============================================================================
// State Serialization
// =============================================================================

export {
  CURRENT_STATE_VERSION,
  StateSerializerImpl,
  MigrationRegistryImpl,
  JsonStateCompressor,
  StateDifferImpl,
  globalMigrationRegistry,
  globalStateSerializer,
  createSerializedState,
  normalizeStateForComparison,
  statesAreEqual,
} from "./state.js";

export type {
  SerializedState,
  StateMigration,
  MigrationRegistry,
  StateSerializer,
  PluginState,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  StateCompressor,
  StatePatch,
  StateDiffer,
  Preset,
  PresetBank,
  PresetManager,
} from "./state.js";

// =============================================================================
// Version
// =============================================================================

export const PLUGIN_API_VERSION = "1.0.0";
