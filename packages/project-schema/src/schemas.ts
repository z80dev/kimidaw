/**
 * Zod schemas for runtime validation
 * 
 * These schemas mirror the TypeScript interfaces and provide
 * runtime validation for data coming from storage or network.
 */

import { z } from 'zod';
import { CURRENT_SCHEMA_VERSION, PPQ } from './index.js';

// ==================== Primitive Schemas ====================

export const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/i);

export const UuidSchema = z.string().uuid();

export const TimestampSchema = z.string().datetime();

// ==================== Timing Schemas ====================

export const MusicalTimeSchema = z.object({
  bars: z.number().int().min(0),
  beats: z.number().int().min(0),
  ticks: z.number().int().min(0).max(PPQ - 1),
});

export const TempoEventSchema = z.object({
  tick: z.number().int().min(0),
  bpm: z.number().min(1).max(999),
  curve: z.enum(['jump', 'ramp']),
});

export const TimeSignatureEventSchema = z.object({
  tick: z.number().int().min(0),
  numerator: z.number().int().min(1).max(32),
  denominator: z.number().int().refine((v) => [2, 4, 8, 16].includes(v)),
});

export const MarkerSchema = z.object({
  id: z.string(),
  tick: z.number().int().min(0),
  name: z.string(),
  color: HexColorSchema.optional(),
  type: z.enum(['locator', 'cue', 'loop', 'section']),
});

export const LoopSpecSchema = z.object({
  startTick: z.number().int(),
  endTick: z.number().int(),
  enabled: z.boolean(),
});

export const SchedulerConfigSchema = z.object({
  prepareHorizonMs: z.number().positive(),
  refillThresholdMs: z.number().positive(),
  maxChunkMs: z.number().positive(),
});

// ==================== Plugin Schemas ====================

export const PluginParameterSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['float', 'int', 'bool', 'enum']),
  min: z.number(),
  max: z.number(),
  defaultValue: z.number(),
  step: z.number().optional(),
  automationRate: z.enum(['a-rate', 'k-rate']).optional(),
  unit: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

export const PluginUiDescriptorSchema = z.object({
  type: z.enum(['native', 'custom', 'wam']),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  resizeable: z.boolean().optional(),
});

export const PluginInstanceSchema = z.object({
  id: z.string(),
  definitionId: z.string(),
  name: z.string().optional(),
  parameterValues: z.record(z.number()),
  state: z.unknown().optional(),
  bypass: z.boolean(),
  presetId: z.string().optional(),
  enabled: z.boolean(),
  sidechainSource: z.string().optional(),
});

// ==================== Automation Schemas ====================

export const AutomationTargetSchema = z.object({
  scope: z.enum(['track', 'plugin', 'send', 'instrument', 'macro']),
  ownerId: z.string(),
  paramId: z.string(),
});

export const AutomationPointSchema = z.object({
  tick: z.number().int(),
  value: z.number(),
  curveIn: z.number().min(-1).max(1).optional(),
  curveOut: z.number().min(-1).max(1).optional(),
  stepHold: z.boolean().optional(),
});

export const AutomationLaneSchema = z.object({
  id: z.string(),
  target: AutomationTargetSchema,
  mode: z.enum(['read', 'touch', 'latch', 'write', 'trim']),
  points: z.array(AutomationPointSchema),
  interpolation: z.enum(['step', 'linear', 'bezier']),
  laneDisplayRange: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
  visible: z.boolean(),
  height: z.number().int().positive(),
  color: HexColorSchema.optional(),
  overrideValue: z.number().optional(),
  overrideActive: z.boolean(),
});

// ==================== Track Schemas ====================

export const InputBindingSchema = z.object({
  type: z.enum(['audio', 'midi', 'none']),
  deviceId: z.string().optional(),
  channel: z.union([z.number().int(), z.enum(['all'])]).optional(),
});

export const OutputBindingSchema = z.object({
  type: z.enum(['master', 'bus', 'track']),
  targetId: z.string(),
});

export const SendSlotSchema = z.object({
  id: z.string(),
  targetBusId: z.string(),
  levelDb: z.number(),
  preFader: z.boolean(),
  active: z.boolean(),
});

export const MacroBindingSchema = z.object({
  id: z.string(),
  name: z.string(),
  target: z.union([
    AutomationTargetSchema,
    z.object({
      type: z.literal('plugin-param'),
      pluginId: z.string(),
      paramId: z.string(),
    }),
  ]),
  value: z.number(),
  min: z.number(),
  max: z.number(),
});

export const CompLaneSchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  muted: z.boolean(),
  color: HexColorSchema.optional(),
});

export const AudioClipRefSchema = z.object({
  id: z.string(),
  clipId: z.string(),
  lane: z.number().int().min(0),
  startTick: z.number().int(),
  endTick: z.number().int(),
});

export const MidiClipRefSchema = z.object({
  id: z.string(),
  clipId: z.string(),
  startTick: z.number().int(),
  endTick: z.number().int(),
});

export const ClipSlotSchema = z.object({
  trackId: z.string(),
  sceneIndex: z.number().int().min(0),
  clipId: z.string().optional(),
  state: z.enum(['empty', 'stopped', 'playing', 'recording', 'queued']),
  color: HexColorSchema.optional(),
});

export const FollowActionSchema = z.object({
  type: z.enum(['none', 'next', 'previous', 'first', 'last', 'any', 'other']),
  targetId: z.string().optional(),
  delayBars: z.number().int().min(0),
});

export const SceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  index: z.number().int().min(0),
  color: HexColorSchema.optional(),
  tempo: z.number().positive().optional(),
  timeSignature: z.object({
    numerator: z.number().int(),
    denominator: z.number().int(),
  }).optional(),
  slots: z.array(ClipSlotSchema),
  launchQuantization: z.number().int().optional(),
  launchFollowAction: FollowActionSchema.optional(),
});

// ==================== Track Base ====================

export const TrackBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: HexColorSchema,
  mute: z.boolean(),
  solo: z.boolean(),
  arm: z.boolean(),
  monitorMode: z.enum(['off', 'auto', 'in']),
  input: InputBindingSchema.optional(),
  output: OutputBindingSchema,
  inserts: z.array(PluginInstanceSchema),
  sends: z.array(SendSlotSchema),
  automationLanes: z.array(AutomationLaneSchema),
  macros: z.array(MacroBindingSchema),
  comments: z.string().optional(),
  order: z.number().int(),
  parentId: z.string().optional(),
  height: z.number().int().positive().optional(),
  collapsed: z.boolean(),
});

export const AudioTrackSchema = TrackBaseSchema.extend({
  type: z.literal('audio'),
  clips: z.array(AudioClipRefSchema),
  compLanes: z.array(CompLaneSchema),
  currentCompLaneId: z.string().optional(),
  warpMode: z.enum(['repitch', 'beats', 'texture', 'tones', 'complex', 'complex-pro']).optional(),
  inputMonitoring: z.boolean(),
  latencyCompensation: z.number().int(),
});

export const MidiTrackSchema = TrackBaseSchema.extend({
  type: z.literal('midi'),
  clips: z.array(MidiClipRefSchema),
  destination: z.union([
    z.object({ type: z.literal('plugin'), pluginId: z.string() }),
    z.object({ type: z.literal('external-midi'), deviceId: z.string(), channel: z.number().int() }),
  ]),
});

export const InstrumentTrackSchema = TrackBaseSchema.extend({
  type: z.literal('instrument'),
  clips: z.array(MidiClipRefSchema),
  instrument: PluginInstanceSchema,
  noteFx: z.array(PluginInstanceSchema),
});

export const GroupTrackSchema = TrackBaseSchema.extend({
  type: z.literal('group'),
  children: z.array(z.string()),
  clips: z.array(z.never()),
});

export const ReturnTrackSchema = TrackBaseSchema.extend({
  type: z.literal('return'),
  clips: z.array(z.never()),
});

export const AuxTrackSchema = TrackBaseSchema.extend({
  type: z.literal('aux'),
  source: z.enum(['input', 'bus', 'track']),
  sourceId: z.string().optional(),
  clips: z.array(z.never()),
});

export const ExternalMidiTrackSchema = TrackBaseSchema.extend({
  type: z.literal('external-midi'),
  clips: z.array(MidiClipRefSchema),
  deviceId: z.string(),
  channel: z.number().int().min(1).max(16),
  programChange: z.number().int().min(0).max(127).optional(),
  bankMsb: z.number().int().min(0).max(127).optional(),
  bankLsb: z.number().int().min(0).max(127).optional(),
});

export const HybridTrackSchema = TrackBaseSchema.extend({
  type: z.literal('hybrid'),
  audioClips: z.array(AudioClipRefSchema),
  midiClips: z.array(MidiClipRefSchema),
  instrument: PluginInstanceSchema.optional(),
  noteFx: z.array(PluginInstanceSchema),
});

export const TrackSchema = z.union([
  AudioTrackSchema,
  MidiTrackSchema,
  InstrumentTrackSchema,
  GroupTrackSchema,
  ReturnTrackSchema,
  AuxTrackSchema,
  ExternalMidiTrackSchema,
  HybridTrackSchema,
]);

export const BusTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: HexColorSchema,
  mute: z.boolean(),
  solo: z.boolean(),
  inserts: z.array(PluginInstanceSchema),
  sends: z.array(SendSlotSchema),
  automationLanes: z.array(AutomationLaneSchema),
  output: OutputBindingSchema,
  macros: z.array(MacroBindingSchema),
  order: z.number().int(),
  collapsed: z.boolean(),
  busType: z.enum(['aux', 'subgroup', 'sidechain']),
  sourceTrackIds: z.array(z.string()),
});

export const MasterTrackSchema = z.object({
  id: z.literal('master'),
  name: z.literal('Master'),
  color: HexColorSchema,
  mute: z.boolean(),
  inserts: z.array(PluginInstanceSchema),
  automationLanes: z.array(AutomationLaneSchema),
  macros: z.array(MacroBindingSchema),
  collapsed: z.boolean(),
  limiter: PluginInstanceSchema.optional(),
  dither: z.enum(['none', 'triangular', 'noise-shaped']),
  truePeak: z.boolean(),
});

// ==================== Clip Schemas ====================

export const FadeCurveSchema = z.enum([
  'linear',
  'equal-power',
  'exponential',
  'logarithmic',
  's-curve',
]);

export const FadeConfigSchema = z.object({
  inCurve: FadeCurveSchema,
  outCurve: FadeCurveSchema,
  inSamples: z.number().int().min(0),
  outSamples: z.number().int().min(0),
});

export const WarpMarkerSchema = z.object({
  sourceSample: z.number().int().min(0),
  targetTick: z.number().int(),
});

export const WarpSpecSchema = z.object({
  enabled: z.boolean(),
  markers: z.array(WarpMarkerSchema),
  originBpm: z.number().positive().optional(),
  originalSampleRate: z.number().positive(),
});

export const BeatGridMarkerSchema = z.object({
  samplePosition: z.number().int().min(0),
  beatPosition: z.number(),
});

export const GainEnvelopePointSchema = z.object({
  tick: z.number().int(),
  gainDb: z.number(),
  curve: z.enum(['linear', 'bezier']),
});

export const AudioClipSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  color: HexColorSchema.optional(),
  assetId: z.string(),
  lane: z.number().int().min(0),
  startTick: z.number().int(),
  endTick: z.number().int(),
  sourceStartSample: z.number().int().min(0),
  sourceEndSample: z.number().int().min(0),
  gainDb: z.number(),
  transposeSemitones: z.number().int(),
  fineTuneCents: z.number(),
  reverse: z.boolean(),
  fades: FadeConfigSchema,
  warp: WarpSpecSchema.optional(),
  stretchQuality: z.enum(['draft', 'good', 'best']),
  transientMarkers: z.array(z.number().int()).optional(),
  beatGrid: z.array(BeatGridMarkerSchema).optional(),
  takeIndex: z.number().int().optional(),
  isComped: z.boolean(),
  gainEnvelope: z.array(GainEnvelopePointSchema).optional(),
});

export const MidiNoteSchema = z.object({
  id: z.string(),
  note: z.number().int().min(0).max(127),
  velocity: z.number().int().min(0).max(127),
  startTick: z.number().int(),
  durationTicks: z.number().int().positive(),
  pitchOffset: z.number().int().min(-8192).max(8191).optional(),
  timbre: z.number().int().min(0).max(127).optional(),
  pressure: z.number().int().min(0).max(127).optional(),
});

export const MidiCCEventSchema = z.object({
  id: z.string(),
  controller: z.number().int().min(0).max(127),
  value: z.number().int().min(0).max(127),
  tick: z.number().int(),
  curve: z.enum(['step', 'linear', 'bezier']).optional(),
});

export const PitchBendEventSchema = z.object({
  id: z.string(),
  value: z.number().int().min(-8192).max(8191),
  tick: z.number().int(),
});

export const ChannelPressureEventSchema = z.object({
  id: z.string(),
  pressure: z.number().int().min(0).max(127),
  tick: z.number().int(),
});

export const PolyAftertouchEventSchema = z.object({
  id: z.string(),
  note: z.number().int().min(0).max(127),
  pressure: z.number().int().min(0).max(127),
  tick: z.number().int(),
});

export const ProgramChangeEventSchema = z.object({
  id: z.string(),
  program: z.number().int().min(0).max(127),
  tick: z.number().int(),
});

export const MpeLaneDataSchema = z.object({
  noteId: z.string(),
  pitchBend: z.array(PitchBendEventSchema),
  timbre: z.array(MidiCCEventSchema),
  pressure: z.array(PolyAftertouchEventSchema),
});

export const ScaleModeSchema = z.enum([
  'major', 'minor', 'dorian', 'phrygian', 'lydian',
  'mixolydian', 'locrian', 'harmonic-minor', 'melodic-minor',
  'pentatonic-major', 'pentatonic-minor', 'blues', 'chromatic',
]);

export const ScaleHintSchema = z.object({
  root: z.number().int().min(0).max(11),
  mode: ScaleModeSchema,
  enabled: z.boolean(),
});

export const MidiClipSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  color: HexColorSchema.optional(),
  startTick: z.number().int(),
  endTick: z.number().int(),
  loop: LoopSpecSchema.nullable(),
  notes: z.array(MidiNoteSchema),
  cc: z.array(MidiCCEventSchema),
  pitchBend: z.array(PitchBendEventSchema),
  channelPressure: z.array(ChannelPressureEventSchema),
  polyAftertouch: z.array(PolyAftertouchEventSchema),
  programChanges: z.array(ProgramChangeEventSchema),
  mpe: z.array(MpeLaneDataSchema).optional(),
  scaleHint: ScaleHintSchema.optional(),
  generated: z.object({
    scriptId: z.string(),
    hash: z.string(),
    seed: z.string(),
    generatedAt: z.number(),
  }).optional(),
});

// ==================== Project Schemas ====================

export const AssetRefSchema = z.object({
  id: z.string(),
  hash: z.string().regex(/^[a-f0-9]{64}$/i), // SHA-256 hex (case insensitive)
  type: z.enum(['audio', 'sample', 'preset', 'waveform', 'analysis']),
  name: z.string(),
  size: z.number().int().min(0),
  createdAt: TimestampSchema,
  sampleRate: z.union([z.literal(44100), z.literal(48000), z.literal(96000)]).optional(),
  channels: z.number().int().min(1).optional(),
  duration: z.number().positive().optional(),
  bitDepth: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  source: z.object({
    type: z.enum(['recorded', 'imported', 'generated', 'factory']),
    originalPath: z.string().optional(),
    deviceName: z.string().optional(),
  }).optional(),
});

export const PresetRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  pluginDefinitionId: z.string(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  createdAt: TimestampSchema,
  modifiedAt: TimestampSchema,
  hash: z.string().optional(),
  embedded: z.unknown().optional(),
});

export const ScriptParameterSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['number', 'boolean', 'enum', 'string']),
  defaultValue: z.unknown(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  options: z.array(z.string()).optional(),
});

export const ScriptModuleRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceCode: z.string(),
  language: z.enum(['typescript', 'javascript']),
  autoExecute: z.boolean(),
  executeOnLoad: z.boolean(),
  parameters: z.array(ScriptParameterSchema).optional(),
  dependencies: z.array(z.string()).optional(),
  version: z.number().int().min(1),
  createdAt: TimestampSchema,
  modifiedAt: TimestampSchema,
});

export const RecordingSettingsSchema = z.object({
  defaultCountInBars: z.number().int().min(0),
  defaultPreRollMs: z.number().int().min(0),
  metronomeDuringRecording: z.boolean(),
  metronomeDuringCountIn: z.boolean(),
  createTakes: z.boolean(),
  autoPunchIn: z.boolean(),
  autoPunchOut: z.boolean(),
  inputMonitoring: z.enum(['auto', 'on', 'off']),
  fileFormat: z.enum(['wav', 'aiff', 'flac']),
  bitDepth: z.union([z.literal(16), z.literal(24), z.literal(32)]),
});

export const EditingSettingsSchema = z.object({
  defaultSnapGrid: z.number().int().positive(),
  snapEnabled: z.boolean(),
  defaultQuantizeGrid: z.number().int().positive(),
  quantizeStrength: z.number().min(0).max(1),
  quantizeSwing: z.number().min(0).max(1),
  fadeDefaultLength: z.number().int().min(0),
  crossfadeDefaultLength: z.number().int().min(0),
  autoCrossfade: z.boolean(),
  defaultWarpMode: z.enum(['repitch', 'beats', 'texture', 'tones', 'complex']),
  stretchQuality: z.enum(['draft', 'good', 'best']),
});

export const ExportSettingsSchema = z.object({
  defaultFormat: z.enum(['wav', 'aiff', 'flac', 'mp3', 'ogg']),
  defaultSampleRate: z.union([z.literal(44100), z.literal(48000), z.literal(96000)]),
  defaultBitDepth: z.union([z.literal(16), z.literal(24), z.literal(32)]),
  normalize: z.boolean(),
  dither: z.enum(['none', 'triangular', 'noise-shaped']),
  includeTailMs: z.number().int().min(0),
  defaultLocation: z.enum(['downloads', 'project', 'ask']),
});

export const UiSettingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  highContrast: z.boolean(),
  reducedMotion: z.boolean(),
  defaultTrackHeight: z.number().int().positive(),
  zoomLevel: z.number().positive(),
  showWaveformOverview: z.boolean(),
  showMeterBridge: z.boolean(),
  followPlayback: z.boolean(),
  smoothScrolling: z.boolean(),
  showGrid: z.boolean(),
  gridLineSpacing: z.enum(['bar', 'beat', 'quarter', 'eighth', 'sixteenth']),
  keyboardMidiEnabled: z.boolean(),
  keyboardMidiOctave: z.number().int(),
  keyboardMidiVelocity: z.number().int().min(1).max(127),
});

export const ProjectSettingsSchema = z.object({
  defaultSampleRate: z.union([z.literal(44100), z.literal(48000), z.literal(96000)]),
  defaultBitDepth: z.union([z.literal(16), z.literal(24), z.literal(32)]),
  defaultMidiInput: z.string().optional(),
  defaultMidiOutput: z.string().optional(),
  recordingSettings: RecordingSettingsSchema,
  editingSettings: EditingSettingsSchema,
  exportSettings: ExportSettingsSchema,
  schedulerConfig: SchedulerConfigSchema,
  uiSettings: UiSettingsSchema,
});

export const ProjectSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  id: z.string(),
  name: z.string(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  sampleRatePreference: z.union([z.literal(44100), z.literal(48000), z.literal(96000)]),
  tempoMap: z.array(TempoEventSchema),
  timeSignatureMap: z.array(TimeSignatureEventSchema),
  markers: z.array(MarkerSchema),
  tracks: z.array(TrackSchema),
  buses: z.array(BusTrackSchema),
  master: MasterTrackSchema,
  scenes: z.array(SceneSchema),
  assets: z.array(AssetRefSchema),
  presets: z.array(PresetRefSchema),
  scripting: z.array(ScriptModuleRefSchema),
  settings: ProjectSettingsSchema,
  clips: z.object({
    audio: z.array(AudioClipSchema),
    midi: z.array(MidiClipSchema),
  }),
});

// ==================== Command Schemas ====================

export const CommandActorSchema = z.enum(['user', 'script', 'migration', 'import', 'system']);

export const CommandSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.number().int().positive(),
  payload: z.unknown(),
  actor: CommandActorSchema,
  actorId: z.string().optional(),
  batchId: z.string().optional(),
  batchIndex: z.number().int().optional(),
  optimistic: z.boolean().optional(),
  confirmed: z.boolean().optional(),
});

// ==================== Validation Functions ====================

/**
 * Validate a project object against the schema
 */
export function validateProject(data: unknown): { success: true; data: z.infer<typeof ProjectSchema> } | { success: false; errors: z.ZodError } {
  const result = ProjectSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate a command object
 */
export function validateCommand(data: unknown): { success: true; data: z.infer<typeof CommandSchema> } | { success: false; errors: z.ZodError } {
  const result = CommandSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate an audio clip
 */
export function validateAudioClip(data: unknown): { success: true; data: z.infer<typeof AudioClipSchema> } | { success: false; errors: z.ZodError } {
  const result = AudioClipSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate a MIDI clip
 */
export function validateMidiClip(data: unknown): { success: true; data: z.infer<typeof MidiClipSchema> } | { success: false; errors: z.ZodError } {
  const result = MidiClipSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate a track
 */
export function validateTrack(data: unknown): { success: true; data: z.infer<typeof TrackSchema> } | { success: false; errors: z.ZodError } {
  const result = TrackSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
