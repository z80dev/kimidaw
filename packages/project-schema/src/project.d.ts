/**
 * Main Project schema definitions for the DAW
 *
 * Implements section 7.2 of the engineering spec
 */
import type { Track, BusTrack, MasterTrack, Scene } from './tracks.js';
import type { TempoEvent, TimeSignatureEvent, Marker, SchedulerConfig } from './timing.js';
import type { AudioClip, MidiClip } from './clips.js';
/** Main project interface */
export interface Project {
    schemaVersion: number;
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    sampleRatePreference: 44100 | 48000 | 96000;
    tempoMap: TempoEvent[];
    timeSignatureMap: TimeSignatureEvent[];
    markers: Marker[];
    tracks: Track[];
    buses: BusTrack[];
    master: MasterTrack;
    scenes: Scene[];
    assets: AssetRef[];
    presets: PresetRef[];
    scripting: ScriptModuleRef[];
    settings: ProjectSettings;
    clips: {
        audio: AudioClip[];
        midi: MidiClip[];
    };
}
/** Current schema version */
export declare const CURRENT_SCHEMA_VERSION = 1;
/** Asset reference (content-addressed) */
export interface AssetRef {
    id: string;
    hash: string;
    type: 'audio' | 'sample' | 'preset' | 'waveform' | 'analysis';
    name: string;
    size: number;
    createdAt: string;
    sampleRate?: number;
    channels?: number;
    duration?: number;
    bitDepth?: number;
    tags?: string[];
    description?: string;
    source?: {
        type: 'recorded' | 'imported' | 'generated' | 'factory';
        originalPath?: string;
        deviceName?: string;
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
    hash?: string;
    embedded?: unknown;
}
/** Script module reference */
export interface ScriptModuleRef {
    id: string;
    name: string;
    sourceCode: string;
    language: 'typescript' | 'javascript';
    autoExecute: boolean;
    executeOnLoad: boolean;
    parameters?: ScriptParameter[];
    dependencies?: string[];
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
    defaultSampleRate: 44100 | 48000 | 96000;
    defaultBitDepth: 16 | 24 | 32;
    defaultMidiInput?: string;
    defaultMidiOutput?: string;
    recordingSettings: RecordingSettings;
    editingSettings: EditingSettings;
    exportSettings: ExportSettings;
    schedulerConfig: SchedulerConfig;
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
    defaultSnapGrid: number;
    snapEnabled: boolean;
    defaultQuantizeGrid: number;
    quantizeStrength: number;
    quantizeSwing: number;
    fadeDefaultLength: number;
    crossfadeDefaultLength: number;
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
    keyboardMidiEnabled: boolean;
    keyboardMidiOctave: number;
    keyboardMidiVelocity: number;
}
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
    selectedNoteIds: Map<string, Set<string>>;
    selectedAutomationPointIds: Map<string, Set<string>>;
    timeSelection: TimeSelection | null;
}
/** Time selection range */
export interface TimeSelection {
    startTick: number;
    endTick: number;
    trackIds?: string[];
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
    arrangeZoomX: number;
    arrangeZoomY: number;
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
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    floating: boolean;
    visible: boolean;
}
/** Quantize settings */
export interface QuantizeSettings {
    grid: number;
    strength: number;
    swing: number;
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
    recentXruns: number[];
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
    levels: number;
    peaks: Float32Array[];
    generatedAt: number;
}
/** Spectral analysis data */
export interface SpectralData {
    assetId: string;
    fftSize: number;
    hopSize: number;
    magnitudes: Float32Array[];
    frequencies: Float32Array;
    times: Float32Array;
}
/** Note density thumbnail data */
export interface NoteDensityData {
    clipId: string;
    resolution: number;
    counts: number[];
    velocities: number[];
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
/** Create a new empty project */
export declare function createProject(id: string, name: string, options?: {
    sampleRate?: 44100 | 48000 | 96000;
    tempo?: number;
    timeSignature?: {
        numerator: number;
        denominator: number;
    };
}): Project;
/** Update project timestamp */
export declare function touchProject(project: Project): Project;
/** Get track by ID */
export declare function getTrackById(project: Project, trackId: string): Track | undefined;
/** Get bus by ID */
export declare function getBusById(project: Project, busId: string): BusTrack | undefined;
/** Get clip by ID */
export declare function getClipById(project: Project, clipId: string): AudioClip | MidiClip | undefined;
/** Get tempo at a specific tick */
export declare function getTempoAtTick(project: Project, tick: number): number;
/** Get time signature at a specific tick */
export declare function getTimeSignatureAtTick(project: Project, tick: number): {
    numerator: number;
    denominator: number;
};
//# sourceMappingURL=project.d.ts.map