/**
 * Main Project schema definitions for the DAW
 * 
 * Implements section 7.2 of the engineering spec
 */

import type { 
  Track, 
  BusTrack, 
  MasterTrack,
  Scene,
} from './tracks.js';
import type { 
  TempoEvent, 
  TimeSignatureEvent, 
  Marker,
  SchedulerConfig 
} from './timing.js';
import type { AudioClip, MidiClip } from './clips.js';
// Note: Command type is available from commands.js export

// ==================== Project ====================

/** Main project interface */
export interface Project {
  schemaVersion: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  
  // Audio settings
  sampleRatePreference: 44100 | 48000 | 96000;
  
  // Timing
  tempoMap: TempoEvent[];
  timeSignatureMap: TimeSignatureEvent[];
  markers: Marker[];
  
  // Structure
  tracks: Track[];
  buses: BusTrack[];
  master: MasterTrack;
  scenes: Scene[];
  
  // Assets
  assets: AssetRef[];
  presets: PresetRef[];
  scripting: ScriptModuleRef[];
  
  // Settings
  settings: ProjectSettings;
  
  // Clips (clip definitions referenced by tracks)
  clips: {
    audio: AudioClip[];
    midi: MidiClip[];
  };
}

/** Current schema version */
export const CURRENT_SCHEMA_VERSION = 1;

/** Asset reference (content-addressed) */
export interface AssetRef {
  id: string;
  hash: string; // SHA-256 content hash
  type: 'audio' | 'sample' | 'preset' | 'waveform' | 'analysis';
  
  // Metadata
  name: string;
  size: number;
  createdAt: string;
  
  // Audio-specific metadata
  sampleRate?: number;
  channels?: number;
  duration?: number; // seconds
  bitDepth?: number;
  
  // Optional user metadata
  tags?: string[];
  description?: string;
  
  // Source tracking
  source?: {
    type: 'recorded' | 'imported' | 'generated' | 'factory';
    originalPath?: string;
    deviceName?: string; // For recorded audio
  };
}

/** Preset reference */
export interface PresetRef {
  id: string;
  name: string;
  pluginDefinitionId: string;
  category?: string;
  tags?: string[];
  author?: string;
  createdAt: string;
  modifiedAt: string;
  
  // Content is stored separately or embedded
  hash?: string;
  embedded?: unknown;
}

/** Script module reference */
export interface ScriptModuleRef {
  id: string;
  name: string;
  sourceCode: string;
  language: 'typescript' | 'javascript';
  
  // Execution metadata
  autoExecute: boolean;
  executeOnLoad: boolean;
  
  // Parameters exposed by the script
  parameters?: ScriptParameter[];
  
  // Dependencies
  dependencies?: string[];
  
  // Versioning
  version: number;
  createdAt: string;
  modifiedAt: string;
}

/** Script parameter definition */
export interface ScriptParameter {
  id: string;
  name: string;
  kind: 'number' | 'boolean' | 'enum' | 'string';
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

/** Project settings */
export interface ProjectSettings {
  // Audio
  defaultSampleRate: 44100 | 48000 | 96000;
  defaultBitDepth: 16 | 24 | 32;
  
  // MIDI
  defaultMidiInput?: string;
  defaultMidiOutput?: string;
  
  // Recording
  recordingSettings: RecordingSettings;
  
  // Editing
  editingSettings: EditingSettings;
  
  // Export
  exportSettings: ExportSettings;
  
  // Scheduler
  schedulerConfig: SchedulerConfig;
  
  // UI preferences
  uiSettings: UiSettings;
}

/** Recording settings */
export interface RecordingSettings {
  defaultCountInBars: number;
  defaultPreRollMs: number;
  metronomeDuringRecording: boolean;
  metronomeDuringCountIn: boolean;
  createTakes: boolean;
  autoPunchIn: boolean;
  autoPunchOut: boolean;
  inputMonitoring: 'auto' | 'on' | 'off';
  fileFormat: 'wav' | 'aiff' | 'flac';
  bitDepth: 16 | 24 | 32;
}

/** Editing settings */
export interface EditingSettings {
  defaultSnapGrid: number; // ticks
  snapEnabled: boolean;
  defaultQuantizeGrid: number; // ticks
  quantizeStrength: number;
  quantizeSwing: number;
  fadeDefaultLength: number; // samples
  crossfadeDefaultLength: number; // samples
  autoCrossfade: boolean;
  defaultWarpMode: 'repitch' | 'beats' | 'texture' | 'tones' | 'complex';
  stretchQuality: 'draft' | 'good' | 'best';
}

/** Export settings */
export interface ExportSettings {
  defaultFormat: 'wav' | 'aiff' | 'flac' | 'mp3' | 'ogg';
  defaultSampleRate: 44100 | 48000 | 96000;
  defaultBitDepth: 16 | 24 | 32;
  normalize: boolean;
  dither: 'none' | 'triangular' | 'noise-shaped';
  includeTailMs: number;
  defaultLocation: 'downloads' | 'project' | 'ask';
}

/** UI settings */
export interface UiSettings {
  theme: 'dark' | 'light' | 'system';
  highContrast: boolean;
  reducedMotion: boolean;
  defaultTrackHeight: number;
  zoomLevel: number;
  showWaveformOverview: boolean;
  showMeterBridge: boolean;
  followPlayback: boolean;
  smoothScrolling: boolean;
  showGrid: boolean;
  gridLineSpacing: 'bar' | 'beat' | 'quarter' | 'eighth' | 'sixteenth';
  
  // Keyboard MIDI
  keyboardMidiEnabled: boolean;
  keyboardMidiOctave: number;
  keyboardMidiVelocity: number;
}

// ==================== Project State Domains ====================

/** Persistent domain - saved with project */
export interface PersistentDomain {
  project: Project;
  clipDefinitions: Map<string, AudioClip | MidiClip>;
}

/** Undoable session domain - per-session state that can be undone */
export interface UndoableSessionDomain {
  selection: SelectionState;
  editorFocus: EditorFocus;
  zoom: ZoomState;
  panelLayout: PanelLayout;
  armedTracks: Set<string>;
  keyboardMidiMode: boolean;
  quantizeSettings: QuantizeSettings;
}

/** Selection state */
export interface SelectionState {
  selectedTrackIds: Set<string>;
  selectedClipIds: Set<string>;
  selectedNoteIds: Map<string, Set<string>>; // clipId -> noteIds
  selectedAutomationPointIds: Map<string, Set<string>>; // laneId -> pointIds
  timeSelection: TimeSelection | null;
}

/** Time selection range */
export interface TimeSelection {
  startTick: number;
  endTick: number;
  trackIds?: string[]; // Optional - if null, applies to all tracks
}

/** Editor focus state */
export interface EditorFocus {
  activeEditor: 'arrange' | 'piano-roll' | 'mixer' | 'browser' | 'code';
  activeTrackId?: string;
  activeClipId?: string;
  activeSceneIndex?: number;
}

/** Zoom state */
export interface ZoomState {
  arrangeZoomX: number; // ticks per pixel
  arrangeZoomY: number; // track height multiplier
  pianoRollZoomX: number;
  pianoRollZoomY: number;
  followTransport: boolean;
}

/** Panel layout state */
export interface PanelLayout {
  layout: 'single' | 'split' | 'custom';
  panels: PanelConfig[];
  sidebarVisible: boolean;
  sidebarWidth: number;
  bottomPanelVisible: boolean;
  bottomPanelHeight: number;
}

/** Panel configuration */
export interface PanelConfig {
  id: string;
  type: 'arrange' | 'session' | 'piano-roll' | 'mixer' | 'browser' | 'editor';
  position: { x: number; y: number; width: number; height: number };
  floating: boolean;
  visible: boolean;
}

/** Quantize settings */
export interface QuantizeSettings {
  grid: number; // ticks
  strength: number; // 0-1
  swing: number; // 0-1
  quantizeStart: boolean;
  quantizeEnd: boolean;
  quantizeVelocity: boolean;
}

/** Ephemeral engine domain - realtime state */
export interface EphemeralEngineDomain {
  transport: TransportState;
  deviceLatencies: DeviceLatencyInfo;
  meterValues: Map<string, MeterValues>;
  voiceCounts: Map<string, number>;
  xrunCount: number;
  glitchStats: GlitchStats;
}

/** Transport state */
export interface TransportState {
  playing: boolean;
  recording: boolean;
  looping: boolean;
  punchIn: number | null;
  punchOut: number | null;
  loopStartTick: number;
  loopEndTick: number;
  currentTick: number;
  currentSample: number;
  tempo: number;
  timeSigNum: number;
  timeSigDen: number;
}

/** Device latency information */
export interface DeviceLatencyInfo {
  inputLatencySamples: number;
  outputLatencySamples: number;
  totalLatencySamples: number;
}

/** Meter values for a track/bus */
export interface MeterValues {
  peakLeft: number;
  peakRight: number;
  rmsLeft: number;
  rmsRight: number;
  lufsMomentary: number;
  lufsShortTerm: number;
  lufsIntegrated: number;
  truePeak: number;
  clipping: boolean;
}

/** Glitch statistics */
export interface GlitchStats {
  totalXruns: number;
  recentXruns: number[]; // timestamps
  averageRenderTime: number;
  maxRenderTime: number;
}

/** Derived cache domain - computed/cached data */
export interface DerivedCacheDomain {
  waveformPeaks: Map<string, WaveformCache>;
  spectralData: Map<string, SpectralData>;
  noteDensity: Map<string, NoteDensityData>;
  searchIndices: SearchIndices;
  scriptBuildCache: Map<string, ScriptBuildCache>;
}

/** Waveform cache data */
export interface WaveformCache {
  assetId: string;
  levels: number; // Number of zoom levels
  peaks: Float32Array[]; // Per-level peak data
  generatedAt: number;
}

/** Spectral analysis data */
export interface SpectralData {
  assetId: string;
  fftSize: number;
  hopSize: number;
  magnitudes: Float32Array[]; // Per-frame FFT magnitudes
  frequencies: Float32Array;
  times: Float32Array;
}

/** Note density thumbnail data */
export interface NoteDensityData {
  clipId: string;
  resolution: number; // ticks per bin
  counts: number[]; // Note counts per bin
  velocities: number[]; // Average velocities per bin
}

/** Search indices */
export interface SearchIndices {
  assetIndex: Map<string, AssetSearchDoc>;
  presetIndex: Map<string, PresetSearchDoc>;
  clipIndex: Map<string, ClipSearchDoc>;
}

/** Asset search document */
export interface AssetSearchDoc {
  id: string;
  name: string;
  type: string;
  tags: string[];
  description?: string;
}

/** Preset search document */
export interface PresetSearchDoc {
  id: string;
  name: string;
  pluginName: string;
  category?: string;
  tags: string[];
  author?: string;
}

/** Clip search document */
export interface ClipSearchDoc {
  id: string;
  name?: string;
  type: 'audio' | 'midi';
  trackName?: string;
  tags?: string[];
}

/** Script build cache */
export interface ScriptBuildCache {
  scriptId: string;
  sourceHash: string;
  compiledAt: number;
  diagnostics: ScriptDiagnostic[];
  cachedResult?: unknown;
}

/** Script diagnostic */
export interface ScriptDiagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

// ==================== Project Factory Functions ====================

/** Create a new empty project */
export function createProject(
  id: string,
  name: string,
  options?: {
    sampleRate?: 44100 | 48000 | 96000;
    tempo?: number;
    timeSignature?: { numerator: number; denominator: number };
  }
): Project {
  const now = new Date().toISOString();
  const tempo = options?.tempo ?? 120;
  const timeSignature = options?.timeSignature ?? { numerator: 4, denominator: 4 };
  const sampleRate = options?.sampleRate ?? 48000;
  
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name,
    createdAt: now,
    updatedAt: now,
    sampleRatePreference: options?.sampleRate ?? 48000,
    
    tempoMap: [
      { tick: 0, bpm: tempo, curve: 'jump' },
    ],
    timeSignatureMap: [
      { tick: 0, numerator: timeSignature.numerator, denominator: timeSignature.denominator },
    ],
    markers: [],
    
    tracks: [],
    buses: [],
    master: createMasterTrack(),
    scenes: [],
    
    assets: [],
    presets: [],
    scripting: [],
    
    settings: createDefaultSettings(sampleRate),
    
    clips: {
      audio: [],
      midi: [],
    },
  };
}

/** Create default master track */
function createMasterTrack(): MasterTrack {
  return {
    id: 'master',
    name: 'Master',
    color: '#808080',
    mute: false,
    inserts: [],
    automationLanes: [],
    macros: [],
    collapsed: false,
    dither: 'noise-shaped',
    truePeak: true,
  };
}

/** Create default project settings */
function createDefaultSettings(sampleRate: 44100 | 48000 | 96000): ProjectSettings {
  return {
    defaultSampleRate: sampleRate,
    defaultBitDepth: 24,
    
    recordingSettings: {
      defaultCountInBars: 1,
      defaultPreRollMs: 0,
      metronomeDuringRecording: true,
      metronomeDuringCountIn: true,
      createTakes: true,
      autoPunchIn: false,
      autoPunchOut: false,
      inputMonitoring: 'auto',
      fileFormat: 'wav',
      bitDepth: 24,
    },
    
    editingSettings: {
      defaultSnapGrid: 240, // 1/16th at PPQ=960
      snapEnabled: true,
      defaultQuantizeGrid: 240,
      quantizeStrength: 1.0,
      quantizeSwing: 0,
      fadeDefaultLength: 441, // 10ms at 44.1k
      crossfadeDefaultLength: 882,
      autoCrossfade: true,
      defaultWarpMode: 'beats',
      stretchQuality: 'good',
    },
    
    exportSettings: {
      defaultFormat: 'wav',
      defaultSampleRate: sampleRate,
      defaultBitDepth: 24,
      normalize: false,
      dither: 'noise-shaped',
      includeTailMs: 1000,
      defaultLocation: 'ask',
    },
    
    schedulerConfig: {
      prepareHorizonMs: 120,
      refillThresholdMs: 60,
      maxChunkMs: 20,
    },
    
    uiSettings: {
      theme: 'dark',
      highContrast: false,
      reducedMotion: false,
      defaultTrackHeight: 80,
      zoomLevel: 1,
      showWaveformOverview: true,
      showMeterBridge: true,
      followPlayback: false,
      smoothScrolling: true,
      showGrid: true,
      gridLineSpacing: 'beat',
      keyboardMidiEnabled: false,
      keyboardMidiOctave: 4,
      keyboardMidiVelocity: 100,
    },
  };
}

/** Update project timestamp */
export function touchProject(project: Project): Project {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
  };
}

/** Get track by ID */
export function getTrackById(project: Project, trackId: string): Track | undefined {
  return project.tracks.find((t) => t.id === trackId);
}

/** Get bus by ID */
export function getBusById(project: Project, busId: string): BusTrack | undefined {
  return project.buses.find((b) => b.id === busId);
}

/** Get clip by ID */
export function getClipById(
  project: Project,
  clipId: string
): AudioClip | MidiClip | undefined {
  return (
    project.clips.audio.find((c) => c.id === clipId) ??
    project.clips.midi.find((c) => c.id === clipId)
  );

}

/** Get tempo at a specific tick */
export function getTempoAtTick(project: Project, tick: number): number {
  let tempo = 120;
  for (const event of project.tempoMap) {
    if (event.tick <= tick) {
      tempo = event.bpm;
    } else {
      break;
    }
  }
  return tempo;
}

/** Get time signature at a specific tick */
export function getTimeSignatureAtTick(
  project: Project,
  tick: number
): { numerator: number; denominator: number } {
  let ts = { numerator: 4, denominator: 4 };
  for (const event of project.timeSignatureMap) {
    if (event.tick <= tick) {
      ts = { numerator: event.numerator, denominator: event.denominator };
    } else {
      break;
    }
  }
  return ts;
}
