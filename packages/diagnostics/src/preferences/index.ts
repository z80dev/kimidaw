/**
 * Preferences System
 * 
 * Complete preferences management for the DAW, including:
 * - Audio preferences (driver, sample rate, buffer size)
 * - MIDI preferences (ports, sync, remote)
 * - Library preferences (pack management)
 * - UI preferences (colors, fonts, behavior)
 * - File/Folder preferences (default locations)
 * - Record/Warp/Launch preferences (default settings)
 * - CPU preferences (multicore, buffer settings)
 * - Maintenance preferences (cache management)
 */

// Main manager
export {
  createPreferencesManager,
  DEFAULT_PREFERENCES,
} from './PreferencesManager.js';

export type {
  Preferences,
  PreferencesStorage,
  PreferencesPath,
  PreferenceChangeHandler,
  PreferencesManager,
} from './PreferencesManager.js';

// Audio
export type {
  AudioDriver,
  SampleRate,
  BufferSize,
  BitDepth,
  AudioDevice,
  AudioPreferences,
} from './AudioPreferences.js';

export {
  getAvailableDrivers,
  calculateLatency,
  getRecommendedBufferSize,
  validateAudioPreferences,
} from './AudioPreferences.js';

// MIDI
export type {
  SyncMode,
  MpeZone,
  TakeoverMode,
  InputNoteLength,
  MidiPort,
  MidiSyncConfig,
  MidiRemoteConfig,
  MpeConfig,
  ComputerKeyboardConfig,
  MidiPreferences,
} from './MidiPreferences.js';

export {
  createDefaultMidiPort,
  getKeyboardNoteMap,
  midiNoteToName,
  validateMidiPreferences,
} from './MidiPreferences.js';

// Library
export type {
  LibraryPreferences,
  PackInfo,
  LibraryBrowserConfig,
} from './LibraryPreferences.js';

export {
  getDefaultLibraryPaths,
  getUserLibraryContentTypes,
  validateLibraryPreferences,
} from './LibraryPreferences.js';

// UI
export type {
  Theme,
  ColorScheme,
  TimelineFormat,
  FollowBehavior,
  UiPreferences,
  ColorTheme,
} from './UiPreferences.js';

export {
  getColorTheme,
  getAvailableLanguages,
  validateUiPreferences,
} from './UiPreferences.js';

// File
export type {
  RecordingFileType,
  FilePreferences,
  ProjectFolderStructure,
} from './FilePreferences.js';

export {
  getProjectFolderStructure,
  getSupportedImportFormats,
  getSupportedExportFormats,
  validateFilePreferences,
} from './FilePreferences.js';

// Record/Warp/Launch
export type {
  CountInDuration,
  WarpMode,
  LaunchMode,
  Quantization,
  NoteQuantization,
  RecordPreferences,
  LoopPreferences,
  WarpPreferences,
  LaunchPreferences,
  RecordWarpLaunchPreferences,
} from './RecordWarpLaunch.js';

export {
  getWarpModeDescription,
  getLaunchModeDescription,
  getQuantizationBeats,
  validateRecordWarpLaunchPreferences,
} from './RecordWarpLaunch.js';

// CPU
export type {
  SchedulerPriority,
  CpuPreferences,
} from './CpuPreferences.js';

export {
  getAvailableCores,
  getRecommendedCoreCount,
  getCoreCountOptions,
  estimateCpuLoad,
  suggestBufferSize,
  validateCpuPreferences,
} from './CpuPreferences.js';

// Maintenance
export type {
  MaintenancePreferences,
  CacheInfo,
  DiagnosticInfo,
} from './MaintenancePreferences.js';

export {
  formatCacheSize,
  getCacheBreakdown,
  getDefaultCacheLocation,
  getDiagnosticInfo,
  validateMaintenancePreferences,
} from './MaintenancePreferences.js';
