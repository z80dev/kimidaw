/**
 * @fileoverview Optional telemetry system for the In-Browser DAW.
 *
 * Collects anonymized usage data and performance metrics as specified
 * in section 23.3 of the engineering spec.
 *
 * Telemetry is opt-in where legally required and respects user privacy.
 *
 * @module @daw/diagnostics/telemetry
 */

import type { CapabilityMatrix } from "./capabilities.js";

/**
 * Telemetry configuration options.
 */
export interface TelemetryConfig {
  /** Whether telemetry is enabled */
  enabled: boolean;
  /** Endpoint URL for telemetry uploads */
  endpointUrl: string | null;
  /** Upload interval in milliseconds */
  uploadIntervalMs: number;
  /** Maximum events to buffer before upload */
  maxBufferSize: number;
  /** Whether to include performance data */
  includePerformance: boolean;
  /** Whether to include feature usage */
  includeFeatureUsage: boolean;
  /** Whether to include error data */
  includeErrors: boolean;
  /** User consent status */
  consentStatus: "granted" | "denied" | "pending";
  /** Session ID for grouping events */
  sessionId: string;
  /** Anonymized user ID (hash of installation) */
  anonymousUserId: string | null;
}

/**
 * Telemetry event types.
 */
export type TelemetryEventType =
  | "session_start"
  | "session_end"
  | "feature_used"
  | "feature_completed"
  | "performance_sample"
  | "error_occurred"
  | "export_started"
  | "export_completed"
  | "export_failed"
  | "import_started"
  | "import_completed"
  | "import_failed"
  | "render_started"
  | "render_completed"
  | "render_failed"
  | "permission_requested"
  | "permission_granted"
  | "permission_denied"
  | "project_created"
  | "project_opened"
  | "project_saved"
  | "project_exported"
  | "project_imported"
  | "plugin_loaded"
  | "plugin_error"
  | "worker_crashed"
  | "worker_recovered";

/**
 * Base telemetry event interface.
 */
export interface TelemetryEvent {
  /** Event type */
  type: TelemetryEventType;
  /** Event timestamp */
  timestamp: number;
  /** Session ID */
  sessionId: string;
  /** Event sequence number */
  sequence: number;
  /** App version */
  appVersion: string;
  /** Additional event data */
  data?: Record<string, unknown>;
}

/**
 * Feature usage event data.
 */
export interface FeatureUsageData {
  /** Feature name */
  featureName: string;
  /** Feature category */
  category: string;
  /** Duration of feature use in ms (if applicable) */
  durationMs?: number;
  /** Success status */
  success?: boolean;
}

/**
 * Performance sample event data.
 */
export interface PerformanceSampleData {
  /** Metric name */
  metricName: string;
  /** Metric value */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** Component/source */
  source: string;
}

/**
 * Error event data.
 */
export interface ErrorEventData {
  /** Error type/category */
  errorType: string;
  /** Error message (sanitized) */
  message: string;
  /** Component where error occurred */
  component: string;
  /** Whether error was recoverable */
  recoverable: boolean;
}

/**
 * Export/render event data.
 */
export interface ExportEventData {
  /** Export format */
  format: string;
  /** Export scope */
  scope: string;
  /** Duration in ms */
  durationMs: number;
  /** Success status */
  success: boolean;
  /** Error code if failed */
  errorCode?: string;
  /** File size in bytes if successful */
  fileSizeBytes?: number;
}

/**
 * Import event data.
 */
export interface ImportEventData {
  /** Import format/type */
  format: string;
  /** Duration in ms */
  durationMs: number;
  /** Success status */
  success: boolean;
  /** Error code if failed */
  errorCode?: string;
  /** File size in bytes */
  fileSizeBytes?: number;
}

/**
 * Permission event data.
 */
export interface PermissionEventData {
  /** Permission name */
  permission: string;
  /** Result status */
  result: "granted" | "denied" | "dismissed";
}

/**
 * Telemetry session metadata.
 */
export interface TelemetrySession {
  /** Session ID */
  id: string;
  /** Session start timestamp */
  startedAt: number;
  /** Session end timestamp (null if active) */
  endedAt: number | null;
  /** Capabilities at session start */
  capabilities: CapabilityMatrix;
  /** Experience tier */
  tier: string;
  /** App version */
  appVersion: string;
}

/**
 * Aggregated telemetry data for upload.
 */
export interface TelemetryBatch {
  /** Batch version */
  version: string;
  /** Upload timestamp */
  uploadedAt: number;
  /** Session metadata */
  session: TelemetrySession;
  /** Events in this batch */
  events: TelemetryEvent[];
  /** Summary statistics */
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    sessionDurationMs: number;
  };
}

/**
 * Default telemetry configuration.
 */
export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  enabled: false,
  endpointUrl: null,
  uploadIntervalMs: 5 * 60 * 1000, // 5 minutes
  maxBufferSize: 1000,
  includePerformance: true,
  includeFeatureUsage: true,
  includeErrors: true,
  consentStatus: "pending",
  sessionId: "",
  anonymousUserId: null,
};

/**
 * Generates a unique session ID.
 *
 * @returns {string} A unique session ID
 */
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generates an anonymous user ID from a seed value.
 * This creates a stable but anonymous identifier.
 *
 * @param {string} seed - Seed value (e.g., installation timestamp)
 * @returns {string} Anonymous user ID hash
 */
export function generateAnonymousUserId(seed: string): string {
  // Simple hash function for demonstration
  // In production, use a proper hashing algorithm
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `anon-${Math.abs(hash).toString(16)}`;
}

/**
 * Telemetry collector for gathering usage and performance data.
 */
export class TelemetryCollector {
  private config: TelemetryConfig;
  private events: TelemetryEvent[] = [];
  private session: TelemetrySession;
  private sequence = 0;
  private uploadTimer: ReturnType<typeof setInterval> | null = null;
  private appVersion: string;

  /**
   * Creates a new telemetry collector.
   *
   * @param {string} appVersion - The application version
   * @param {Partial<TelemetryConfig>} config - Telemetry configuration
   * @param {CapabilityMatrix} capabilities - Browser capabilities
   * @param {string} tier - Experience tier
   */
  constructor(
    appVersion: string,
    config: Partial<TelemetryConfig> = {},
    capabilities: CapabilityMatrix,
    tier: string
  ) {
    this.appVersion = appVersion;
    this.config = { ...DEFAULT_TELEMETRY_CONFIG, ...config };

    const sessionId = this.config.sessionId || generateSessionId();
    this.config.sessionId = sessionId;

    this.session = {
      id: sessionId,
      startedAt: Date.now(),
      endedAt: null,
      capabilities,
      tier,
      appVersion,
    };

    if (this.config.enabled && this.config.consentStatus === "granted") {
      this.startUploadTimer();
    }
  }

  /**
   * Starts the upload timer.
   */
  private startUploadTimer(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
    }

    this.uploadTimer = setInterval(() => {
      void this.flush();
    }, this.config.uploadIntervalMs);
  }

  /**
   * Stops the upload timer.
   */
  private stopUploadTimer(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }
  }

  /**
   * Records a telemetry event.
   *
   * @param {TelemetryEventType} type - Event type
   * @param {Record<string, unknown>} [data] - Additional event data
   */
  record(type: TelemetryEventType, data?: Record<string, unknown>): void {
    if (!this.config.enabled) {
      return;
    }

    const event: TelemetryEvent = {
      type,
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
      sequence: ++this.sequence,
      appVersion: this.appVersion,
      ...(data ? { data } : {}),
    };

    this.events.push(event);

    // Flush if buffer is full
    if (this.events.length >= this.config.maxBufferSize) {
      void this.flush();
    }
  }

  /**
   * Records feature usage.
   *
   * @param {FeatureUsageData} data - Feature usage data
   */
  recordFeatureUsage(data: FeatureUsageData): void {
    if (!this.config.includeFeatureUsage) {
      return;
    }

    this.record("feature_used", data);
  }

  /**
   * Records a feature completion.
   *
   * @param {FeatureUsageData} data - Feature usage data
   */
  recordFeatureCompleted(data: FeatureUsageData): void {
    if (!this.config.includeFeatureUsage) {
      return;
    }

    this.record("feature_completed", data);
  }

  /**
   * Records a performance sample.
   *
   * @param {PerformanceSampleData} data - Performance data
   */
  recordPerformance(data: PerformanceSampleData): void {
    if (!this.config.includePerformance) {
      return;
    }

    this.record("performance_sample", data);
  }

  /**
   * Records an error.
   *
   * @param {ErrorEventData} data - Error data
   */
  recordError(data: ErrorEventData): void {
    if (!this.config.includeErrors) {
      return;
    }

    this.record("error_occurred", data);
  }

  /**
   * Records an export/render event.
   *
   * @param {"export_started" | "export_completed" | "export_failed" | "render_started" | "render_completed" | "render_failed"} type - Event type
   * @param {ExportEventData} data - Export data
   */
  recordExport(
    type:
      | "export_started"
      | "export_completed"
      | "export_failed"
      | "render_started"
      | "render_completed"
      | "render_failed",
    data: ExportEventData
  ): void {
    this.record(type, data);
  }

  /**
   * Records an import event.
   *
   * @param {"import_started" | "import_completed" | "import_failed"} type - Event type
   * @param {ImportEventData} data - Import data
   */
  recordImport(
    type: "import_started" | "import_completed" | "import_failed",
    data: ImportEventData
  ): void {
    this.record(type, data);
  }

  /**
   * Records a permission event.
   *
   * @param {"permission_requested" | "permission_granted" | "permission_denied"} type - Event type
   * @param {PermissionEventData} data - Permission data
   */
  recordPermission(
    type: "permission_requested" | "permission_granted" | "permission_denied",
    data: PermissionEventData
  ): void {
    this.record(type, data);
  }

  /**
   * Updates user consent status.
   *
   * @param {"granted" | "denied"} status - New consent status
   */
  setConsentStatus(status: "granted" | "denied"): void {
    this.config.consentStatus = status;

    if (status === "granted" && this.config.enabled) {
      this.startUploadTimer();
    } else {
      this.stopUploadTimer();
      // Clear any pending events if consent denied
      if (status === "denied") {
        this.events = [];
      }
    }
  }

  /**
   * Enables or disables telemetry.
   *
   * @param {boolean} enabled - Whether to enable telemetry
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;

    if (enabled && this.config.consentStatus === "granted") {
      this.startUploadTimer();
    } else {
      this.stopUploadTimer();
    }
  }

  /**
   * Ends the session and flushes remaining events.
   */
  async endSession(): Promise<void> {
    this.session.endedAt = Date.now();
    this.record("session_end", {
      durationMs: this.session.endedAt - this.session.startedAt,
    });

    this.stopUploadTimer();
    await this.flush();
  }

  /**
   * Flushes buffered events to the telemetry endpoint.
   *
   * @returns {Promise<boolean>} True if flush was successful
   */
  async flush(): Promise<boolean> {
    if (!this.config.enabled || !this.config.endpointUrl) {
      return false;
    }

    if (this.events.length === 0) {
      return true;
    }

    const eventsToUpload = [...this.events];
    this.events = [];

    const batch = this.createBatch(eventsToUpload);

    try {
      const response = await fetch(this.config.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
        keepalive: true,
      });

      if (!response.ok) {
        // Re-queue events on failure
        this.events.unshift(...eventsToUpload);
        return false;
      }

      return true;
    } catch {
      // Re-queue events on failure
      this.events.unshift(...eventsToUpload);
      return false;
    }
  }

  /**
   * Creates a telemetry batch from events.
   *
   * @param {TelemetryEvent[]} events - Events to include
   * @returns {TelemetryBatch} The telemetry batch
   */
  private createBatch(events: TelemetryEvent[]): TelemetryBatch {
    const eventsByType = events.reduce(
      (acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const now = Date.now();

    return {
      version: "1.0",
      uploadedAt: now,
      session: this.session,
      events,
      summary: {
        totalEvents: events.length,
        eventsByType,
        sessionDurationMs:
          (this.session.endedAt || now) - this.session.startedAt,
      },
    };
  }

  /**
   * Gets current configuration.
   *
   * @returns {TelemetryConfig} Current configuration
   */
  getConfig(): TelemetryConfig {
    return { ...this.config };
  }

  /**
   * Gets buffered event count.
   *
   * @returns {number} Number of buffered events
   */
  getBufferedEventCount(): number {
    return this.events.length;
  }

  /**
   * Gets session metadata.
   *
   * @returns {TelemetrySession} Session metadata
   */
  getSession(): TelemetrySession {
    return { ...this.session };
  }
}

/**
 * Creates a no-op telemetry collector for when telemetry is disabled.
 *
 * @returns {Pick<TelemetryCollector, "record" | "recordFeatureUsage" | "recordPerformance" | "recordError" | "recordExport" | "recordImport" | "recordPermission" | "endSession" | "flush">} No-op collector
 */
export function createNoOpTelemetry(): Pick<
  TelemetryCollector,
  | "record"
  | "recordFeatureUsage"
  | "recordPerformance"
  | "recordError"
  | "recordExport"
  | "recordImport"
  | "recordPermission"
  | "endSession"
  | "flush"
> {
  return {
    record: () => {},
    recordFeatureUsage: () => {},
    recordPerformance: () => {},
    recordError: () => {},
    recordExport: () => {},
    recordImport: () => {},
    recordPermission: () => {},
    endSession: async () => {},
    flush: async () => true,
  };
}
