/**
 * @fileoverview Public exports for the @daw/diagnostics package.
 *
 * This package provides capability detection, diagnostics collection,
 * and telemetry for the In-Browser DAW.
 *
 * @packageDocumentation
 * @module @daw/diagnostics
 */

// Capabilities module
export {
  detectCapabilities,
  determineTier,
  createCapabilityReport,
  validateCapabilities,
  detectKnownLimitations,
} from "./capabilities.js";

export type {
  CapabilityMatrix,
  CapabilityReport,
  ExperienceTier,
  PermissionStates,
} from "./capabilities.js";

// Diagnostics module
export {
  createEmptyDiagnosticsData,
  createSupportBundle,
  formatSupportBundle,
  createSupportBundleBlob,
  generateSupportBundleFilename,
  DiagnosticsErrorCollector,
  MetricsAggregator,
} from "./diagnostics.js";

export type {
  AudioEngineMetrics,
  SchedulerMetrics,
  UiMetrics,
  RecordingMetrics,
  StorageMetrics,
  PermissionInfo,
  DiagnosticsPanelData,
  DiagnosticsError,
  WorkerStatus,
  PluginInfo,
  SupportBundle,
  WorkerCrashTrace,
} from "./diagnostics.js";

// Telemetry module
export {
  TelemetryCollector,
  generateSessionId,
  generateAnonymousUserId,
  createNoOpTelemetry,
  DEFAULT_TELEMETRY_CONFIG,
} from "./telemetry.js";

// Preferences System
export {
  createPreferencesManager,
  DEFAULT_PREFERENCES,
  
  // Audio
  getAvailableDrivers,
  calculateLatency,
  getRecommendedBufferSize,
  validateAudioPreferences,
  
  // MIDI
  createDefaultMidiPort,
  getKeyboardNoteMap,
  midiNoteToName,
  validateMidiPreferences,
  
  // Library
  getDefaultLibraryPaths,
  getUserLibraryContentTypes,
  validateLibraryPreferences,
  
  // UI
  getColorTheme,
  getAvailableLanguages,
  validateUiPreferences,
  
  // File
  getProjectFolderStructure,
  getSupportedImportFormats,
  getSupportedExportFormats,
  validateFilePreferences,
  
  // Record/Warp/Launch
  getWarpModeDescription,
  getLaunchModeDescription,
  getQuantizationBeats,
  validateRecordWarpLaunchPreferences,
  
  // CPU
  getAvailableCores,
  getRecommendedCoreCount,
  getCoreCountOptions,
  estimateCpuLoad,
  suggestBufferSize,
  validateCpuPreferences,
  
  // Maintenance
  formatCacheSize,
  getCacheBreakdown,
  getDefaultCacheLocation,
  getDiagnosticInfo,
  validateMaintenancePreferences,
} from "./preferences/index.js";

export type {
  Preferences,
  PreferencesStorage,
  PreferencesPath,
  PreferenceChangeHandler,
  PreferencesManager,
  
  // Audio
  AudioDriver,
  SampleRate,
  BufferSize,
  BitDepth,
  AudioDevice,
  AudioPreferences,
  
  // MIDI
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
  
  // Library
  LibraryPreferences,
  PackInfo,
  LibraryBrowserConfig,
  
  // UI
  Theme,
  ColorScheme,
  TimelineFormat,
  FollowBehavior,
  UiPreferences,
  ColorTheme,
  
  // File
  RecordingFileType,
  FilePreferences,
  ProjectFolderStructure,
  
  // Record/Warp/Launch
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
  
  // CPU
  SchedulerPriority,
  CpuPreferences,
  
  // Maintenance
  MaintenancePreferences,
  CacheInfo,
  DiagnosticInfo,
} from "./preferences/index.js";

export type {
  TelemetryConfig,
  TelemetryEvent,
  TelemetryEventType,
  TelemetrySession,
  TelemetryBatch,
  FeatureUsageData,
  PerformanceSampleData,
  ErrorEventData,
  ExportEventData,
  ImportEventData,
  PermissionEventData,
} from "./telemetry.js";
