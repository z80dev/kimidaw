/**
 * @daw/project-schema
 * 
 * Project domain model and type definitions for the In-Browser DAW.
 * 
 * This package provides:
 * - TypeScript interfaces for all project entities
 * - Zod schemas for runtime validation
 * - Utility functions for project manipulation
 * - Timing conversion utilities
 * - Command/event sourcing types
 */

// ==================== Core Project ====================
export {
  // Main types
  type Project,
  type AssetRef,
  type PresetRef,
  type ScriptModuleRef,
  type ScriptParameter,
  type ProjectSettings,
  type RecordingSettings,
  type EditingSettings,
  type ExportSettings,
  type UiSettings,
  
  // State domains
  type PersistentDomain,
  type UndoableSessionDomain,
  type SelectionState,
  type TimeSelection,
  type EditorFocus,
  type ZoomState,
  type PanelLayout,
  type PanelConfig,
  type QuantizeSettings,
  type EphemeralEngineDomain,
  type DeviceLatencyInfo,
  type MeterValues,
  type GlitchStats,
  type DerivedCacheDomain,
  type WaveformCache,
  type SpectralData,
  type NoteDensityData,
  type SearchIndices,
  type AssetSearchDoc,
  type PresetSearchDoc,
  type ClipSearchDoc,
  type ScriptBuildCache,
  type ScriptDiagnostic,
  
  // Constants
  CURRENT_SCHEMA_VERSION,
  
  // Functions
  createProject,
  touchProject,
  getTrackById,
  getBusById,
  getClipById,
  getTimeSignatureAtTick,
} from './project.js';

// ==================== Tracks ====================
export {
  // Track types
  type TrackBase,
  type AudioTrack,
  type MidiTrack,
  type InstrumentTrack,
  type GroupTrack,
  type ReturnTrack,
  type AuxTrack,
  type ExternalMidiTrack,
  type HybridTrack,
  type Track,
  type BusTrack,
  type MasterTrack,
  
  // Supporting types
  type InputBinding,
  type OutputBinding,
  type SendSlot,
  type MacroBinding,
  type AutomationTarget,
  type PluginParameterTarget,
  type ExternalMidiTarget,
  type CompLane,
  type ClipSlot,
  type Scene,
  type FollowAction,
  type AudioClipRef,
  type MidiClipRef,
  
  // Enums
  type WarpMode,
  
  // Type guards
  isAudioTrack,
  isMidiTrack,
  isInstrumentTrack,
  isGroupTrack,
  isReturnTrack,
  isAuxTrack,
  isExternalMidiTrack,
  isHybridTrack,
  
  // Utilities
  canContainAudio,
  canContainMidi,
  isContainerTrack,
} from './tracks.js';

// ==================== Clips ====================
export {
  // Clip types
  type AudioClip,
  type MidiClip,
  
  // MIDI events
  type MidiNote,
  type MidiCCEvent,
  type PitchBendEvent,
  type ChannelPressureEvent,
  type PolyAftertouchEvent,
  type ProgramChangeEvent,
  type MpeLaneData,
  
  // Audio features
  type FadeCurve,
  type FadeConfig,
  type WarpMarker,
  type WarpSpec,
  type StretchQuality,
  type BeatGridMarker,
  type GainEnvelopePoint,
  
  // Scale
  type ScaleHint,
  type ScaleMode,
  SCALE_INTERVALS,
  
  // Clip operations
  getClipDuration,
  getLoopedDuration,
  noteOverlapsRange,
  quantizeNote,
  splitNote,
  transposeNote,
  getNotesInRange,
  createMidiClip,
  createAudioClip,
  isNoteInScale,
  snapToScale,
} from './clips.js';

// ==================== Automation ====================
export {
  // Types
  type AutomationTarget as AutomationTargetType,
  type AutomationPoint,
  type AutomationInterpolation,
  type AutomationMode,
  type AutomationLane,
  type AutomationBreakpoint,
  type AutomationSegment,
  type AutomationSnapshot,
  
  // Operations
  interpolateValue,
  getValueAtTick,
  addPoint,
  removePoint,
  removePointsInRange,
  scaleValues,
  shiftInTime,
  automationTargetKey,
  parseAutomationTargetKey,
  createAutomationLane,
  createTrackAutomationLane,
  createPluginAutomationLane,
  
  // Constants
  COMMON_AUTOMATION_TARGETS,
  AUTOMATION_RANGES,
  
  // Value conversion
  normalizeValue,
  denormalizeValue,
} from './automation.js';

// ==================== Timing ====================
export {
  // Constants
  PPQ,
  DEFAULT_SCHEDULER_CONFIG,
  
  // Types
  type MusicalTime,

  type TempoEvent,
  type TimeSignatureEvent,
  type Marker,
  type LoopSpec,
  type SchedulerConfig,
  
  // Conversions
  musicalTimeToTicks,
  ticksToMusicalTime,
  ticksToSamples,
  samplesToTicks,
  ticksToSeconds,
  secondsToTicks,
  
  // Formatting
  formatTickPosition,
  parseTickPosition,
  tickToBeat,
  beatToTick,
  secondsToTicksAtTempo,
  ticksToSecondsAtTempo,
} from './timing.js';

// ==================== Commands ====================
export {
  // Types
  type CommandActor,
  type Command,
  type InverseCommand,
  type CommandEnvelope,
  type CommandJournalEntry,
  type CommandBatch,
  type ProjectSnapshot,
  type CommandValidationResult,
  
  // Command payloads
  type CreateProjectPayload,
  type RenameProjectPayload,
  type CreateTrackPayload,
  type DeleteTrackPayload,
  type RenameTrackPayload,
  type MoveTrackPayload,
  type SetTrackMutePayload,
  type SetTrackSoloPayload,
  type SetTrackArmPayload,
  type CreateClipPayload,
  type DeleteClipPayload,
  type MoveClipPayload,
  type ResizeClipPayload,
  type SplitClipPayload,
  type AddNotePayload,
  type DeleteNotePayload,
  type MoveNotePayload,
  type ResizeNotePayload,
  type SetNoteVelocityPayload,
  type QuantizeNotesPayload,
  type AddAutomationPointPayload,
  type DeleteAutomationPointPayload,
  type MoveAutomationPointPayload,
  type AddPluginPayload,
  type RemovePluginPayload,
  type MovePluginPayload,
  type SetPluginParamPayload,
  type SetPluginBypassPayload,
  type SetTempoPayload,
  type SetTimeSignaturePayload,
  type SetLoopRegionPayload,
  type AddMarkerPayload,
  type DeleteMarkerPayload,
  type ImportAssetPayload,
  type DeleteAssetPayload,
  
  // Functions
  generateCommandId,
  generateBatchId,
  createCommand,
  createCommandBatch,
  createInverseCommand,
  createJournalEntry,
  validateJournalEntry,
  
  // Constants
  COMMAND_TYPES,
} from './commands.js';

// ==================== Plugins ====================
export {
  // Types
  type PluginParameterSpec,
  type PluginUiDescriptor,
  type PluginDefinition,
  type PluginInstance,
  type PluginTarget,
  type DrumPadState,
  type SampleLayer,
  type SendSlot as PluginSendSlot,
  type DrumRackState,
  type SamplerState,
  type LfoSettings,
  type ModMatrixEntry,
  type ModSource,
  type ModTarget,
  type OscillatorSettings,
  type SubtractiveSynthState,
  type AdsrEnvelope,
  type WavetableSynthState,
  type WavetableOscillator,
  type FmOperator,
  type FmAlgorithm,
  type FmConnection,
  type FmSynthState,
  type GranularSynthState,
  
  // Constants
  BUILTIN_INSTRUMENTS,
  BUILTIN_EFFECTS,
} from './plugins.js';

// ==================== Schemas (Zod) ====================
export {
  // Schemas
  HexColorSchema,
  UuidSchema,
  TimestampSchema,
  MusicalTimeSchema,
  TempoEventSchema,
  TimeSignatureEventSchema,
  MarkerSchema,
  LoopSpecSchema,
  SchedulerConfigSchema,
  PluginParameterSpecSchema,
  PluginInstanceSchema,
  AutomationTargetSchema,
  AutomationPointSchema,
  AutomationLaneSchema,
  InputBindingSchema,
  OutputBindingSchema,
  SendSlotSchema,
  MacroBindingSchema,
  CompLaneSchema,
  AudioClipRefSchema,
  MidiClipRefSchema,
  ClipSlotSchema,
  FollowActionSchema,
  SceneSchema,
  TrackBaseSchema,
  AudioTrackSchema,
  MidiTrackSchema,
  InstrumentTrackSchema,
  GroupTrackSchema,
  ReturnTrackSchema,
  AuxTrackSchema,
  ExternalMidiTrackSchema,
  HybridTrackSchema,
  TrackSchema,
  BusTrackSchema,
  MasterTrackSchema,
  FadeCurveSchema,
  FadeConfigSchema,
  WarpMarkerSchema,
  WarpSpecSchema,
  AudioClipSchema,
  MidiNoteSchema,
  MidiCCEventSchema,
  PitchBendEventSchema,
  ChannelPressureEventSchema,
  PolyAftertouchEventSchema,
  ProgramChangeEventSchema,
  MpeLaneDataSchema,
  ScaleModeSchema,
  ScaleHintSchema,
  MidiClipSchema,
  AssetRefSchema,
  PresetRefSchema,
  ScriptParameterSchema,
  ScriptModuleRefSchema,
  RecordingSettingsSchema,
  EditingSettingsSchema,
  ExportSettingsSchema,
  UiSettingsSchema,
  ProjectSettingsSchema,
  ProjectSchema,
  CommandActorSchema,
  CommandSchema,
  
  // Validation functions
  validateProject,
  validateCommand,
  validateAudioClip,
  validateMidiClip,
  validateTrack,
} from './schemas.js';
