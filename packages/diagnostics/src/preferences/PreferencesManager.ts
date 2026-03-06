/**
 * Preferences Manager
 * 
 * Centralized preferences management for the DAW.
 * Handles loading, saving, and validation of all preferences.
 */

import type { AudioPreferences } from './AudioPreferences.js';
import type { MidiPreferences } from './MidiPreferences.js';
import type { LibraryPreferences } from './LibraryPreferences.js';
import type { UiPreferences } from './UiPreferences.js';
import type { FilePreferences } from './FilePreferences.js';
import type { RecordWarpLaunchPreferences } from './RecordWarpLaunch.js';
import type { CpuPreferences } from './CpuPreferences.js';
import type { MaintenancePreferences } from './MaintenancePreferences.js';

// ============================================================================
// Types
// ============================================================================

export interface Preferences {
  audio: AudioPreferences;
  midi: MidiPreferences;
  library: LibraryPreferences;
  ui: UiPreferences;
  files: FilePreferences;
  recordWarpLaunch: RecordWarpLaunchPreferences;
  cpu: CpuPreferences;
  maintenance: MaintenancePreferences;
  
  // Version for migrations
  schemaVersion: number;
  lastModified: Date;
}

export interface PreferencesStorage {
  load(): Promise<Partial<Preferences>>;
  save(prefs: Preferences): Promise<void>;
  reset(): Promise<void>;
  export(): Promise<string>;
  import(data: string): Promise<void>;
}

export type PreferencesPath = 
  | `audio.${keyof AudioPreferences}`
  | `midi.${keyof MidiPreferences}`
  | `library.${keyof LibraryPreferences}`
  | `ui.${keyof UiPreferences}`
  | `files.${keyof FilePreferences}`
  | `recordWarpLaunch.${keyof RecordWarpLaunchPreferences}`
  | `cpu.${keyof CpuPreferences}`
  | `maintenance.${keyof MaintenancePreferences}`;

export type PreferenceChangeHandler = (path: PreferencesPath, value: unknown) => void;

// ============================================================================
// Preferences Manager
// ============================================================================

export interface PreferencesManager {
  // Get/set preferences
  get<T>(path: PreferencesPath): T;
  set<T>(path: PreferencesPath, value: T): void;
  getAll(): Preferences;
  
  // Category getters
  getAudio(): AudioPreferences;
  getMidi(): MidiPreferences;
  getLibrary(): LibraryPreferences;
  getUi(): UiPreferences;
  getFiles(): FilePreferences;
  getRecordWarpLaunch(): RecordWarpLaunchPreferences;
  getCpu(): CpuPreferences;
  getMaintenance(): MaintenancePreferences;
  
  // Category setters
  setAudio(prefs: Partial<AudioPreferences>): void;
  setMidi(prefs: Partial<MidiPreferences>): void;
  setLibrary(prefs: Partial<LibraryPreferences>): void;
  setUi(prefs: Partial<UiPreferences>): void;
  setFiles(prefs: Partial<FilePreferences>): void;
  setRecordWarpLaunch(prefs: Partial<RecordWarpLaunchPreferences>): void;
  setCpu(prefs: Partial<CpuPreferences>): void;
  setMaintenance(prefs: Partial<MaintenancePreferences>): void;
  
  // Persistence
  load(): Promise<void>;
  save(): Promise<void>;
  reset(): Promise<void>;
  resetCategory(category: keyof Preferences): void;
  
  // Import/Export
  export(): Promise<string>;
  import(data: string): Promise<void>;
  
  // Change notifications
  onChange(handler: PreferenceChangeHandler): () => void;
  
  // Validation
  validate(): Map<PreferencesPath, string>; // returns validation errors
}

// Default preferences
export const DEFAULT_PREFERENCES: Preferences = {
  schemaVersion: 1,
  lastModified: new Date(),
  
  audio: {
    driver: 'default',
    sampleRate: 48000,
    bufferSize: 512,
    bitDepth: 24,
    inputDevice: null,
    outputDevice: null,
    enableExclusiveMode: false,
    testOnStart: true,
    inLatency: 0,
    outLatency: 0,
    enableInputMonitoring: true,
    reduceLatencyWhenMonitoring: true,
    cpuIdle: 50,
  },
  
  midi: {
    inputPorts: [],
    outputPorts: [],
    sync: {
      mode: 'internal',
      inputPort: null,
      outputPort: null,
      delayMs: 0,
    },
    remote: {
      enabled: true,
      inputPort: null,
      takeoverMode: 'none',
    },
    mpe: {
      enabled: false,
      inputPort: null,
      zone: 'lower',
      pitchBendRange: 48,
    },
    computerKeyboard: {
      enabled: true,
      octave: 3,
      velocity: 100,
      inputNoteLength: 'short',
    },
  },
  
  library: {
    packsLocation: './Packs',
    userLibraryLocation: './User Library',
    cacheLocation: './Cache',
    installPacksInUserLibrary: false,
    downloadPacksAutomatically: false,
    showPacksInBrowser: true,
    autoUpdatePacks: false,
  },
  
  ui: {
    theme: 'dark',
    colorScheme: 'default',
    fontSize: 12,
    language: 'en',
    showInfoText: true,
    permanentScrubArea: false,
    autoHidePlugins: false,
    autoShowPlugins: true,
    trackColorSaturation: 100,
    showGrid: true,
    gridLineWidth: 1,
    timelineFormat: 'minutes-seconds',
    followBehavior: 'scroll',
    drawWaveformsOnClipOverview: true,
    showOverviewZoomScrollbars: true,
    autoAdjustMacroMappingRange: true,
    showModulationOverview: true,
    highlightActiveClipBorder: true,
  },
  
  files: {
    defaultProjectFolder: './Projects',
    defaultAudioRecordingFolder: './Recordings',
    defaultExportFolder: './Exports',
    defaultSaveFolder: null,
    autoSaveEnabled: true,
    autoSaveInterval: 300, // seconds
    createAnalysisFiles: true,
    convertWarpedAudioToRAM: false,
    generateTemporaryFiles: true,
    ignoreMissingFilesOnLoad: false,
  },
  
  recordWarpLaunch: {
    record: {
      countIn: '1-bar',
      fileType: 'wav',
      bitDepth: 24,
      sampleRate: 'project',
      createTakeLanes: true,
      startRecordingOnSceneLaunch: false,
      startPlaybackWithRecording: true,
    },
    warp: {
      defaultMode: 'complex-pro',
      autoWarpLongSamples: true,
      autoWarpShortSamples: false,
      defaultBeat: '1/16',
      loop: {
        defaultLoopLength: '1-bar',
        defaultPosition: '1.1.1',
      },
    },
    launch: {
      defaultLaunchMode: 'trigger',
      defaultQuantization: '1-bar',
      selectedSceneQuantization: 'none',
      recordQuantization: '1/16',
      startTransportWithFirstClip: true,
      restartTransportWithNextClip: false,
      allowTempoChanges: true,
    },
  },
  
  cpu: {
    multicoreSupport: true,
    numberOfCores: 'auto',
    schedulerProORITY: 'high',
    enableAdaptiveBufferSize: false,
    minimumBufferSize: 128,
    maximumBufferSize: 2048,
    suspendBackgroundAudio: true,
  },
  
  maintenance: {
    cacheSize: 0,
    maxCacheSize: 1024 * 1024 * 1024, // 1GB
    clearCacheOnExit: false,
    pluginScanPaths: [],
    skipPluginScan: false,
    verboseLogging: false,
    showCpuUsage: false,
    showMemoryUsage: false,
  },
};

export function createPreferencesManager(
  storage: PreferencesStorage
): PreferencesManager {
  let preferences: Preferences = { ...DEFAULT_PREFERENCES };
  const changeHandlers: PreferenceChangeHandler[] = [];
  
  function notifyChange(path: PreferencesPath, value: unknown): void {
    for (const handler of changeHandlers) {
      try {
        handler(path, value);
      } catch (error) {
        console.error('Preference change handler error:', error);
      }
    }
  }
  
  function get<T>(path: PreferencesPath): T {
    const parts = path.split('.') as [keyof Preferences, string];
    const category = parts[0];
    const key = parts[1];
    
    const cat = preferences[category] as Record<string, unknown>;
    return cat[key] as T;
  }
  
  function set<T>(path: PreferencesPath, value: T): void {
    const parts = path.split('.') as [keyof Preferences, string];
    const category = parts[0];
    const key = parts[1];
    
    const cat = preferences[category] as Record<string, unknown>;
    cat[key] = value;
    
    preferences.lastModified = new Date();
    notifyChange(path, value);
  }
  
  function getAll(): Preferences {
    return JSON.parse(JSON.stringify(preferences));
  }
  
  function getAudio(): AudioPreferences {
    return { ...preferences.audio };
  }
  
  function getMidi(): MidiPreferences {
    return { ...preferences.midi };
  }
  
  function getLibrary(): LibraryPreferences {
    return { ...preferences.library };
  }
  
  function getUi(): UiPreferences {
    return { ...preferences.ui };
  }
  
  function getFiles(): FilePreferences {
    return { ...preferences.files };
  }
  
  function getRecordWarpLaunch(): RecordWarpLaunchPreferences {
    return { ...preferences.recordWarpLaunch };
  }
  
  function getCpu(): CpuPreferences {
    return { ...preferences.cpu };
  }
  
  function getMaintenance(): MaintenancePreferences {
    return { ...preferences.maintenance };
  }
  
  function setAudio(prefs: Partial<AudioPreferences>): void {
    preferences.audio = { ...preferences.audio, ...prefs };
    preferences.lastModified = new Date();
    
    for (const key of Object.keys(prefs) as Array<keyof AudioPreferences>) {
      notifyChange(`audio.${key}`, prefs[key]);
    }
  }
  
  function setMidi(prefs: Partial<MidiPreferences>): void {
    preferences.midi = { ...preferences.midi, ...prefs };
    preferences.lastModified = new Date();
    
    for (const key of Object.keys(prefs) as Array<keyof MidiPreferences>) {
      notifyChange(`midi.${key}`, prefs[key]);
    }
  }
  
  function setLibrary(prefs: Partial<LibraryPreferences>): void {
    preferences.library = { ...preferences.library, ...prefs };
    preferences.lastModified = new Date();
    
    for (const key of Object.keys(prefs) as Array<keyof LibraryPreferences>) {
      notifyChange(`library.${key}`, prefs[key]);
    }
  }
  
  function setUi(prefs: Partial<UiPreferences>): void {
    preferences.ui = { ...preferences.ui, ...prefs };
    preferences.lastModified = new Date();
    
    for (const key of Object.keys(prefs) as Array<keyof UiPreferences>) {
      notifyChange(`ui.${key}`, prefs[key]);
    }
  }
  
  function setFiles(prefs: Partial<FilePreferences>): void {
    preferences.files = { ...preferences.files, ...prefs };
    preferences.lastModified = new Date();
    
    for (const key of Object.keys(prefs) as Array<keyof FilePreferences>) {
      notifyChange(`files.${key}`, prefs[key]);
    }
  }
  
  function setRecordWarpLaunch(prefs: Partial<RecordWarpLaunchPreferences>): void {
    preferences.recordWarpLaunch = { ...preferences.recordWarpLaunch, ...prefs };
    preferences.lastModified = new Date();
    
    for (const key of Object.keys(prefs) as Array<keyof RecordWarpLaunchPreferences>) {
      notifyChange(`recordWarpLaunch.${key}`, prefs[key]);
    }
  }
  
  function setCpu(prefs: Partial<CpuPreferences>): void {
    preferences.cpu = { ...preferences.cpu, ...prefs };
    preferences.lastModified = new Date();
    
    for (const key of Object.keys(prefs) as Array<keyof CpuPreferences>) {
      notifyChange(`cpu.${key}`, prefs[key]);
    }
  }
  
  function setMaintenance(prefs: Partial<MaintenancePreferences>): void {
    preferences.maintenance = { ...preferences.maintenance, ...prefs };
    preferences.lastModified = new Date();
    
    for (const key of Object.keys(prefs) as Array<keyof MaintenancePreferences>) {
      notifyChange(`maintenance.${key}`, prefs[key]);
    }
  }
  
  async function load(): Promise<void> {
    const loaded = await storage.load();
    preferences = { ...DEFAULT_PREFERENCES, ...loaded };
    preferences.lastModified = new Date();
  }
  
  async function save(): Promise<void> {
    preferences.lastModified = new Date();
    await storage.save(preferences);
  }
  
  async function reset(): Promise<void> {
    preferences = { ...DEFAULT_PREFERENCES };
    await storage.save(preferences);
  }
  
  function resetCategory(category: keyof Preferences): void {
    if (category === 'schemaVersion' || category === 'lastModified') return;
    
    (preferences as Record<string, unknown>)[category] = 
      JSON.parse(JSON.stringify(DEFAULT_PREFERENCES[category]));
    
    preferences.lastModified = new Date();
  }
  
  async function exportPrefs(): Promise<string> {
    return storage.export();
  }
  
  async function importPrefs(data: string): Promise<void> {
    await storage.import(data);
    await load();
  }
  
  function onChange(handler: PreferenceChangeHandler): () => void {
    changeHandlers.push(handler);
    
    return () => {
      const index = changeHandlers.indexOf(handler);
      if (index !== -1) {
        changeHandlers.splice(index, 1);
      }
    };
  }
  
  function validate(): Map<PreferencesPath, string> {
    const errors = new Map<PreferencesPath, string>();
    
    // Validate audio preferences
    if (![44100, 48000, 88200, 96000].includes(preferences.audio.sampleRate)) {
      errors.set('audio.sampleRate', 'Invalid sample rate');
    }
    
    if (![128, 256, 512, 1024, 2048, 4096].includes(preferences.audio.bufferSize)) {
      errors.set('audio.bufferSize', 'Invalid buffer size');
    }
    
    if (![16, 24, 32].includes(preferences.audio.bitDepth)) {
      errors.set('audio.bitDepth', 'Invalid bit depth');
    }
    
    // Validate MIDI preferences
    if (preferences.midi.sync.delayMs < -100 || preferences.midi.sync.delayMs > 100) {
      errors.set('midi.sync.delayMs', 'Delay must be between -100ms and 100ms');
    }
    
    if (preferences.midi.mpe.pitchBendRange < 0 || preferences.midi.mpe.pitchBendRange > 96) {
      errors.set('midi.mpe.pitchBendRange', 'Pitch bend range must be between 0 and 96');
    }
    
    // Validate file preferences
    if (preferences.files.autoSaveInterval < 30) {
      errors.set('files.autoSaveInterval', 'Auto-save interval must be at least 30 seconds');
    }
    
    // Validate CPU preferences
    if (preferences.cpu.minimumBufferSize >= preferences.cpu.maximumBufferSize) {
      errors.set('cpu.minimumBufferSize', 'Minimum buffer size must be less than maximum');
      errors.set('cpu.maximumBufferSize', 'Maximum buffer size must be greater than minimum');
    }
    
    return errors;
  }
  
  return {
    get,
    set,
    getAll,
    getAudio,
    getMidi,
    getLibrary,
    getUi,
    getFiles,
    getRecordWarpLaunch,
    getCpu,
    getMaintenance,
    setAudio,
    setMidi,
    setLibrary,
    setUi,
    setFiles,
    setRecordWarpLaunch,
    setCpu,
    setMaintenance,
    load,
    save,
    reset,
    resetCategory,
    export: exportPrefs,
    import: importPrefs,
    onChange,
    validate,
  };
}
