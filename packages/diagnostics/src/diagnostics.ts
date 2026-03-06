/**
 * @fileoverview Diagnostics panel data model for the In-Browser DAW.
 *
 * Provides data structures and utilities for the diagnostics panel
 * as specified in section 23.1 of the engineering spec.
 *
 * @module @daw/diagnostics/diagnostics
 */

import type { CapabilityMatrix, ExperienceTier } from "./capabilities.js";

/**
 * Audio engine performance metrics.
 */
export interface AudioEngineMetrics {
  /** Current sample rate in Hz */
  sampleRate: number;
  /** Base latency in seconds (input + output) */
  baseLatency: number;
  /** Output latency in seconds */
  outputLatency: number;
  /** Inferred buffer size if available */
  bufferSize: number | null;
  /** Current render quantum size */
  quantumSize: number;
  /** Worklet health status */
  workletHealth: "healthy" | "degraded" | "failed";
  /** XRuns (buffer underruns) count */
  xrunCount: number;
  /** Maximum render time in ms per quantum */
  maxRenderTimeMs: number;
  /** Average render time in ms per quantum */
  avgRenderTimeMs: number;
}

/**
 * Scheduler performance metrics.
 */
export interface SchedulerMetrics {
  /** Scheduler queue fill percentage (0-100) */
  queueFillPercent: number;
  /** Number of events scheduled ahead */
  eventsScheduled: number;
  /** Lookahead window in ms */
  lookaheadMs: number;
  /** Average processing time per batch in ms */
  avgProcessingTimeMs: number;
  /** Number of dropped events due to buffer overflow */
  droppedEvents: number;
}

/**
 * UI performance metrics.
 */
export interface UiMetrics {
  /** Frames per second */
  fps: number;
  /** Dropped animation frames count */
  droppedFrames: number;
  /** Long tasks (>50ms) count */
  longTaskCount: number;
  /** Memory usage in MB if available */
  memoryMb: number | null;
  /** Largest contentful paint time in ms */
  lcpTimeMs: number | null;
}

/**
 * Recording metrics.
 */
export interface RecordingMetrics {
  /** Active recording status */
  isRecording: boolean;
  /** Record buffer underruns */
  bufferUnderruns: number;
  /** Total recorded samples */
  totalRecordedSamples: number;
  /** Current take count */
  takeCount: number;
}

/**
 * Storage usage metrics.
 */
export interface StorageMetrics {
  /** Total storage used in bytes */
  totalUsedBytes: number;
  /** Storage quota in bytes if available */
  quotaBytes: number | null;
  /** Percentage of quota used (0-100) */
  percentUsed: number | null;
  /** Number of projects stored */
  projectCount: number;
  /** Number of cached assets */
  assetCount: number;
  /** Persistent storage status */
  isPersistent: boolean;
}

/**
 * Permission state with display info.
 */
export interface PermissionInfo {
  /** Permission name */
  name: string;
  /** Current state */
  state: PermissionState | "prompt" | "unknown";
  /** Whether this permission is required for core functionality */
  required: boolean;
  /** Description of what this permission enables */
  description: string;
}

/**
 * Complete diagnostics data for the diagnostics panel.
 */
export interface DiagnosticsPanelData {
  /** App version */
  appVersion: string;
  /** Engine version */
  engineVersion: string;
  /** Schema version */
  schemaVersion: number;
  /** Capability matrix */
  capabilities: CapabilityMatrix;
  /** Experience tier */
  tier: ExperienceTier;
  /** Audio engine metrics */
  audioEngine: AudioEngineMetrics | null;
  /** Scheduler metrics */
  scheduler: SchedulerMetrics | null;
  /** UI metrics */
  ui: UiMetrics | null;
  /** Recording metrics */
  recording: RecordingMetrics | null;
  /** Storage metrics */
  storage: StorageMetrics | null;
  /** Permission states */
  permissions: PermissionInfo[];
  /** Recent errors */
  recentErrors: DiagnosticsError[];
  /** Worker statuses */
  workers: WorkerStatus[];
  /** Plugin inventory */
  plugins: PluginInfo[];
  /** Timestamp of data collection */
  collectedAt: number;
}

/**
 * Error entry for diagnostics.
 */
export interface DiagnosticsError {
  /** Unique error ID */
  id: string;
  /** Error timestamp */
  timestamp: number;
  /** Error message */
  message: string;
  /** Error stack trace if available */
  stack?: string;
  /** Component/source where error occurred */
  source: string;
  /** Severity level */
  severity: "error" | "warning" | "info";
  /** Whether error has been acknowledged */
  acknowledged: boolean;
}

/**
 * Worker status information.
 */
export interface WorkerStatus {
  /** Worker name/identifier */
  name: string;
  /** Current status */
  status: "running" | "stopped" | "crashed" | "starting";
  /** Last heartbeat timestamp */
  lastHeartbeat: number;
  /** Number of messages processed */
  messagesProcessed: number;
  /** Error count */
  errorCount: number;
}

/**
 * Plugin information for diagnostics.
 */
export interface PluginInfo {
  /** Plugin ID */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Whether plugin is built-in */
  builtIn: boolean;
  /** Plugin category */
  category: "instrument" | "audioFx" | "midiFx" | "utility" | "analysis";
  /** Current state */
  state: "active" | "bypassed" | "disabled" | "error";
  /** Reported latency in samples */
  latencySamples: number;
}

/**
 * Support bundle content as specified in spec section 23.2.
 */
export interface SupportBundle {
  /** Bundle version */
  version: string;
  /** App version */
  appVersion: string;
  /** Capability matrix */
  capabilities: CapabilityMatrix;
  /** Anonymized performance counters */
  performanceCounters: Record<string, number>;
  /** Recent errors (limited set) */
  recentErrors: DiagnosticsError[];
  /** Project schema version */
  schemaVersion: number;
  /** Plugin inventory */
  plugins: PluginInfo[];
  /** Worker crash traces */
  workerCrashes: WorkerCrashTrace[];
  /** Optional minimal project snapshot */
  projectSnapshot?: unknown;
  /** Timestamp of bundle creation */
  createdAt: number;
}

/**
 * Worker crash trace information.
 */
export interface WorkerCrashTrace {
  /** Worker name */
  workerName: string;
  /** Crash timestamp */
  timestamp: number;
  /** Error message */
  error: string;
  /** Stack trace if available */
  stack?: string;
  /** Recovery attempts */
  recoveryAttempts: number;
}

/**
 * Creates default/empty diagnostics panel data.
 *
 * @param {string} appVersion - The application version
 * @param {string} engineVersion - The engine version
 * @param {number} schemaVersion - The project schema version
 * @returns {DiagnosticsPanelData} Empty diagnostics data structure
 */
export function createEmptyDiagnosticsData(
  appVersion: string,
  engineVersion: string,
  schemaVersion: number
): DiagnosticsPanelData {
  return {
    appVersion,
    engineVersion,
    schemaVersion,
    capabilities: {
      audioWorklet: false,
      sharedArrayBuffer: false,
      crossOriginIsolated: false,
      webMidi: false,
      sysex: false,
      fileSystemAccess: false,
      opfs: false,
      opfsSyncHandle: false,
      webCodecsAudio: false,
      mediaRecorder: false,
      audioOutputSelection: false,
      webGpu: false,
      offscreenCanvas: false,
      keyboardLayoutMap: false,
      webHid: false,
      webSerial: false,
    },
    tier: "C",
    audioEngine: null,
    scheduler: null,
    ui: null,
    recording: null,
    storage: null,
    permissions: [],
    recentErrors: [],
    workers: [],
    plugins: [],
    collectedAt: Date.now(),
  };
}

/**
 * Creates a support bundle from diagnostics data.
 *
 * @param {DiagnosticsPanelData} data - Current diagnostics data
 * @param {object} options - Bundle options
 * @param {boolean} options.includeProjectSnapshot - Whether to include project snapshot
 * @param {unknown} options.projectSnapshot - Optional project snapshot data
 * @returns {SupportBundle} The generated support bundle
 */
export function createSupportBundle(
  data: DiagnosticsPanelData,
  options: {
    includeProjectSnapshot?: boolean;
    projectSnapshot?: unknown;
  } = {}
): SupportBundle {
  const { includeProjectSnapshot = false, projectSnapshot } = options;

  // Extract performance counters from metrics
  const performanceCounters: Record<string, number> = {};

  if (data.audioEngine) {
    performanceCounters.audioXruns = data.audioEngine.xrunCount;
    performanceCounters.avgRenderTimeMs = data.audioEngine.avgRenderTimeMs;
  }

  if (data.scheduler) {
    performanceCounters.schedulerDroppedEvents = data.scheduler.droppedEvents;
    performanceCounters.queueFillPercent = data.scheduler.queueFillPercent;
  }

  if (data.ui) {
    performanceCounters.droppedFrames = data.ui.droppedFrames;
    performanceCounters.longTaskCount = data.ui.longTaskCount;
  }

  return {
    version: "1.0",
    appVersion: data.appVersion,
    capabilities: data.capabilities,
    performanceCounters,
    recentErrors: data.recentErrors.slice(0, 10), // Limit to 10 most recent
    schemaVersion: data.schemaVersion,
    plugins: data.plugins,
    workerCrashes: [], // Would be populated from crash history
    ...(includeProjectSnapshot && projectSnapshot ? { projectSnapshot } : {}),
    createdAt: Date.now(),
  };
}

/**
 * Formats a support bundle as a JSON string for download.
 *
 * @param {SupportBundle} bundle - The support bundle
 * @returns {string} JSON string
 */
export function formatSupportBundle(bundle: SupportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/**
 * Creates a download blob for the support bundle.
 *
 * @param {SupportBundle} bundle - The support bundle
 * @returns {Blob} Blob for download
 */
export function createSupportBundleBlob(bundle: SupportBundle): Blob {
  const json = formatSupportBundle(bundle);
  return new Blob([json], { type: "application/json" });
}

/**
 * Generates a filename for the support bundle download.
 *
 * @param {SupportBundle} bundle - The support bundle
 * @returns {string} Suggested filename
 */
export function generateSupportBundleFilename(bundle: SupportBundle): string {
  const date = new Date(bundle.createdAt).toISOString().split("T")[0];
  return `daw-support-bundle-${bundle.appVersion}-${date}.json`;
}

/**
 * Error collector for tracking diagnostics errors.
 */
export class DiagnosticsErrorCollector {
  private errors: DiagnosticsError[] = [];
  private maxErrors: number;

  /**
   * Creates a new error collector.
   *
   * @param {number} maxErrors - Maximum number of errors to retain
   */
  constructor(maxErrors: number = 100) {
    this.maxErrors = maxErrors;
  }

  /**
   * Records an error.
   *
   * @param {string} message - Error message
   * @param {string} source - Component/source
   * @param {string} severity - Error severity
   * @param {string} [stack] - Stack trace
   * @returns {DiagnosticsError} The recorded error
   */
  record(
    message: string,
    source: string,
    severity: "error" | "warning" | "info" = "error",
    stack?: string
  ): DiagnosticsError {
    const error: DiagnosticsError = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      message,
      source,
      severity,
      acknowledged: false,
      ...(stack ? { stack } : {}),
    };

    this.errors.push(error);

    // Trim to max size
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    return error;
  }

  /**
   * Gets all unacknowledged errors.
   *
   * @returns {DiagnosticsError[]} Array of unacknowledged errors
   */
  getUnacknowledged(): DiagnosticsError[] {
    return this.errors.filter((e) => !e.acknowledged);
  }

  /**
   * Gets all errors.
   *
   * @returns {DiagnosticsError[]} Array of all errors
   */
  getAll(): DiagnosticsError[] {
    return [...this.errors];
  }

  /**
   * Acknowledges an error.
   *
   * @param {string} errorId - Error ID to acknowledge
   * @returns {boolean} True if error was found and acknowledged
   */
  acknowledge(errorId: string): boolean {
    const error = this.errors.find((e) => e.id === errorId);
    if (error) {
      error.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Clears all errors.
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Gets error counts by severity.
   *
   * @returns {Record<string, number>} Counts by severity
   */
  getCounts(): Record<string, number> {
    return this.errors.reduce(
      (acc, e) => {
        acc[e.severity] = (acc[e.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }
}

/**
 * Metrics aggregator for collecting and averaging metrics over time.
 */
export class MetricsAggregator {
  private samples: Map<string, number[]> = new Map();
  private maxSamples: number;

  /**
   * Creates a new metrics aggregator.
   *
   * @param {number} maxSamples - Maximum samples to retain per metric
   */
  constructor(maxSamples: number = 60) {
    this.maxSamples = maxSamples;
  }

  /**
   * Records a metric sample.
   *
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   */
  record(name: string, value: number): void {
    const samples = this.samples.get(name) || [];
    samples.push(value);

    if (samples.length > this.maxSamples) {
      samples.shift();
    }

    this.samples.set(name, samples);
  }

  /**
   * Gets the average value for a metric.
   *
   * @param {string} name - Metric name
   * @returns {number | null} Average value or null if no samples
   */
  getAverage(name: string): number | null {
    const samples = this.samples.get(name);
    if (!samples || samples.length === 0) {
      return null;
    }
    return samples.reduce((a, b) => a + b, 0) / samples.length;
  }

  /**
   * Gets the maximum value for a metric.
   *
   * @param {string} name - Metric name
   * @returns {number | null} Maximum value or null if no samples
   */
  getMaximum(name: string): number | null {
    const samples = this.samples.get(name);
    if (!samples || samples.length === 0) {
      return null;
    }
    return Math.max(...samples);
  }

  /**
   * Clears all samples for a metric.
   *
   * @param {string} [name] - Metric name, or omit to clear all
   */
  clear(name?: string): void {
    if (name) {
      this.samples.delete(name);
    } else {
      this.samples.clear();
    }
  }
}
