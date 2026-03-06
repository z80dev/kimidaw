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
// Constants
CURRENT_SCHEMA_VERSION, 
// Functions
createProject, touchProject, getTrackById, getBusById, getClipById, getTimeSignatureAtTick, } from './project.js';
// ==================== Tracks ====================
export { 
// Type guards
isAudioTrack, isMidiTrack, isInstrumentTrack, isGroupTrack, isReturnTrack, isAuxTrack, isExternalMidiTrack, isHybridTrack, 
// Utilities
canContainAudio, canContainMidi, isContainerTrack, } from './tracks.js';
// ==================== Clips ====================
export { SCALE_INTERVALS, 
// Clip operations
getClipDuration, getLoopedDuration, noteOverlapsRange, quantizeNote, splitNote, transposeNote, getNotesInRange, createMidiClip, createAudioClip, isNoteInScale, snapToScale, } from './clips.js';
// ==================== Automation ====================
export { 
// Operations
interpolateValue, getValueAtTick, addPoint, removePoint, removePointsInRange, scaleValues, shiftInTime, automationTargetKey, parseAutomationTargetKey, createAutomationLane, createTrackAutomationLane, createPluginAutomationLane, 
// Constants
COMMON_AUTOMATION_TARGETS, AUTOMATION_RANGES, 
// Value conversion
normalizeValue, denormalizeValue, } from './automation.js';
// ==================== Timing ====================
export { 
// Constants
PPQ, DEFAULT_SCHEDULER_CONFIG, 
// Conversions
musicalTimeToTicks, ticksToMusicalTime, ticksToSamples, samplesToTicks, ticksToSeconds, secondsToTicks, 
// Formatting
formatTickPosition, parseTickPosition, tickToBeat, beatToTick, secondsToTicksAtTempo, ticksToSecondsAtTempo, } from './timing.js';
// ==================== Commands ====================
export { 
// Functions
generateCommandId, generateBatchId, createCommand, createCommandBatch, createInverseCommand, createJournalEntry, validateJournalEntry, 
// Constants
COMMAND_TYPES, } from './commands.js';
// ==================== Plugins ====================
export { 
// Constants
BUILTIN_INSTRUMENTS, BUILTIN_EFFECTS, } from './plugins.js';
// ==================== Schemas (Zod) ====================
export { 
// Schemas
HexColorSchema, UuidSchema, TimestampSchema, MusicalTimeSchema, TempoEventSchema, TimeSignatureEventSchema, MarkerSchema, LoopSpecSchema, SchedulerConfigSchema, PluginParameterSpecSchema, PluginInstanceSchema, AutomationTargetSchema, AutomationPointSchema, AutomationLaneSchema, InputBindingSchema, OutputBindingSchema, SendSlotSchema, MacroBindingSchema, CompLaneSchema, AudioClipRefSchema, MidiClipRefSchema, ClipSlotSchema, FollowActionSchema, SceneSchema, TrackBaseSchema, AudioTrackSchema, MidiTrackSchema, InstrumentTrackSchema, GroupTrackSchema, ReturnTrackSchema, AuxTrackSchema, ExternalMidiTrackSchema, HybridTrackSchema, TrackSchema, BusTrackSchema, MasterTrackSchema, FadeCurveSchema, FadeConfigSchema, WarpMarkerSchema, WarpSpecSchema, AudioClipSchema, MidiNoteSchema, MidiCCEventSchema, PitchBendEventSchema, ChannelPressureEventSchema, PolyAftertouchEventSchema, ProgramChangeEventSchema, MpeLaneDataSchema, ScaleModeSchema, ScaleHintSchema, MidiClipSchema, AssetRefSchema, PresetRefSchema, ScriptParameterSchema, ScriptModuleRefSchema, RecordingSettingsSchema, EditingSettingsSchema, ExportSettingsSchema, UiSettingsSchema, ProjectSettingsSchema, ProjectSchema, CommandActorSchema, CommandSchema, 
// Validation functions
validateProject, validateCommand, validateAudioClip, validateMidiClip, validateTrack, } from './schemas.js';
