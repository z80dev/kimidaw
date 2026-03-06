/**
 * @fileoverview Browser capability detection for the In-Browser DAW.
 *
 * Detects browser capabilities and computes a capability matrix for feature gating.
 * All detection is feature-based, not browser-sniff-based per spec section 3.3.
 *
 * @module @daw/diagnostics/capabilities
 */

/**
 * Capability matrix interface representing all browser capabilities
 * relevant to the DAW's operation tiers.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API} for API documentation
 */
export interface CapabilityMatrix {
  /** AudioWorklet API availability - required for realtime DSP */
  audioWorklet: boolean;
  /** SharedArrayBuffer availability - required for zero-copy worker communication */
  sharedArrayBuffer: boolean;
  /** Cross-origin isolation status - required for SAB and high-res timers */
  crossOriginIsolated: boolean;
  /** Web MIDI API availability - required for external MIDI I/O */
  webMidi: boolean;
  /** System exclusive MIDI messages - requires explicit permission */
  sysex: boolean;
  /** File System Access API - for native file open/save */
  fileSystemAccess: boolean;
  /** Origin Private File System availability - for internal project storage */
  opfs: boolean;
  /** OPFS synchronous file handles - for worker thread file operations */
  opfsSyncHandle: boolean;
  /** WebCodecs AudioDecoder/Encoder - for advanced audio import/export */
  webCodecsAudio: boolean;
  /** MediaRecorder API - for audio capture/export */
  mediaRecorder: boolean;
  /** Audio output device selection - for routing to specific outputs */
  audioOutputSelection: boolean;
  /** WebGPU availability - for accelerated visualization */
  webGpu: boolean;
  /** OffscreenCanvas availability - for worker thread rendering */
  offscreenCanvas: boolean;
  /** Keyboard Layout Map API - for displaying correct key labels */
  keyboardLayoutMap: boolean;
  /** WebHID API - for advanced MIDI controllers */
  webHid: boolean;
  /** Web Serial API - for hardware device communication */
  webSerial: boolean;
}

/**
 * Permission states relevant to the DAW operation.
 */
export interface PermissionStates {
  midi: PermissionState | "prompt";
  microphone: PermissionState | "prompt";
  camera?: PermissionState | "prompt";
}

/**
 * Complete capability report including matrix and metadata.
 */
export interface CapabilityReport {
  /** The capability matrix */
  matrix: CapabilityMatrix;
  /** Permission states for required APIs */
  permissions: PermissionStates;
  /** User agent string (for diagnostics only, not feature detection) */
  userAgent: string;
  /** Browser language */
  language: string;
  /** Screen dimensions (for layout hints) */
  screen: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  /** Timestamp of detection */
  detectedAt: number;
  /** Experience tier based on capabilities */
  tier: ExperienceTier;
}

/**
 * Experience tiers as defined in spec section 3.2
 */
export type ExperienceTier = "A" | "B" | "C";

/**
 * Detects AudioWorklet support.
 *
 * @returns {boolean} True if AudioWorklet is supported
 */
function detectAudioWorklet(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { AudioWorklet?: unknown }).AudioWorklet !==
      "undefined"
  );
}

/**
 * Detects SharedArrayBuffer support.
 *
 * @returns {boolean} True if SharedArrayBuffer is supported
 */
function detectSharedArrayBuffer(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.SharedArrayBuffer !== "undefined"
  );
}

/**
 * Detects cross-origin isolation status.
 *
 * @returns {boolean} True if crossOriginIsolated is available
 */
function detectCrossOriginIsolated(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.crossOriginIsolated !== "undefined" &&
    window.crossOriginIsolated === true
  );
}

/**
 * Detects Web MIDI API support.
 *
 * @returns {boolean} True if Web MIDI is supported
 */
function detectWebMidi(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator as unknown as { requestMIDIAccess?: unknown })
      .requestMIDIAccess !== "undefined"
  );
}

/**
 * Detects File System Access API support.
 *
 * @returns {boolean} True if File System Access API is supported
 */
function detectFileSystemAccess(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { showOpenFilePicker?: unknown })
      .showOpenFilePicker !== "undefined"
  );
}

/**
 * Detects Origin Private File System support.
 *
 * @returns {boolean} True if OPFS is supported
 */
function detectOpfs(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage !== "undefined" &&
    typeof navigator.storage.getDirectory !== "undefined"
  );
}

/**
 * Detects OPFS synchronous file handles support.
 * This requires checking for FileSystemFileHandle.createSyncAccessHandle
 *
 * @returns {boolean} True if synchronous OPFS handles are supported
 */
function detectOpfsSyncHandle(): boolean {
  // We can only truly detect this when we have a file handle
  // For now, we assume it's available if OPFS is available (they ship together)
  // The actual capability is verified at runtime when creating handles
  return detectOpfs();
}

/**
 * Detects WebCodecs AudioDecoder support.
 *
 * @returns {boolean} True if WebCodecs audio is supported
 */
function detectWebCodecsAudio(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { AudioDecoder?: unknown }).AudioDecoder !==
      "undefined"
  );
}

/**
 * Detects MediaRecorder API support.
 *
 * @returns {boolean} True if MediaRecorder is supported
 */
function detectMediaRecorder(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { MediaRecorder?: unknown }).MediaRecorder !==
      "undefined"
  );
}

/**
 * Detects audio output device selection support.
 *
 * @returns {boolean} True if audio output selection is supported
 */
function detectAudioOutputSelection(): boolean {
  return (
    typeof HTMLAudioElement !== "undefined" &&
    typeof (HTMLAudioElement.prototype as unknown as { setSinkId?: unknown })
      .setSinkId !== "undefined"
  );
}

/**
 * Detects WebGPU support.
 *
 * @returns {boolean} True if WebGPU is supported
 */
function detectWebGpu(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator as unknown as { gpu?: unknown }).gpu !== "undefined"
  );
}

/**
 * Detects OffscreenCanvas support.
 *
 * @returns {boolean} True if OffscreenCanvas is supported
 */
function detectOffscreenCanvas(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { OffscreenCanvas?: unknown }).OffscreenCanvas !==
      "undefined"
  );
}

/**
 * Detects Keyboard Layout Map API support.
 *
 * @returns {boolean} True if getLayoutMap is supported
 */
function detectKeyboardLayoutMap(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator as unknown as { keyboard?: { getLayoutMap?: unknown } })
      .keyboard?.getLayoutMap !== "undefined"
  );
}

/**
 * Detects WebHID API support.
 *
 * @returns {boolean} True if WebHID is supported
 */
function detectWebHid(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator as unknown as { hid?: unknown }).hid !== "undefined"
  );
}

/**
 * Detects Web Serial API support.
 *
 * @returns {boolean} True if Web Serial is supported
 */
function detectWebSerial(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator as unknown as { serial?: unknown }).serial !== "undefined"
  );
}

/**
 * Determines the experience tier based on capability matrix.
 *
 * Tier A (Full): All advanced APIs available
 * Tier B (Core): Basic DAW functionality without advanced features
 * Tier C (Minimal): Fallback mode for limited browsers
 *
 * @param {CapabilityMatrix} matrix - The detected capability matrix
 * @returns {ExperienceTier} The determined experience tier
 */
export function determineTier(matrix: CapabilityMatrix): ExperienceTier {
  // Tier A requires AudioWorklet + at least one of SAB or OPFS
  if (
    matrix.audioWorklet &&
    (matrix.sharedArrayBuffer || matrix.opfs) &&
    matrix.crossOriginIsolated
  ) {
    return "A";
  }

  // Tier B requires at least AudioWorklet for basic operation
  if (matrix.audioWorklet) {
    return "B";
  }

  // Tier C is fallback mode
  return "C";
}

/**
 * Detects all browser capabilities and returns the capability matrix.
 *
 * This is the main entry point for capability detection. It performs
 * all detections synchronously and returns the complete matrix.
 *
 * @returns {CapabilityMatrix} The detected capability matrix
 */
export function detectCapabilities(): CapabilityMatrix {
  return {
    audioWorklet: detectAudioWorklet(),
    sharedArrayBuffer: detectSharedArrayBuffer(),
    crossOriginIsolated: detectCrossOriginIsolated(),
    webMidi: detectWebMidi(),
    sysex: false, // Will be determined after permission request
    fileSystemAccess: detectFileSystemAccess(),
    opfs: detectOpfs(),
    opfsSyncHandle: detectOpfsSyncHandle(),
    webCodecsAudio: detectWebCodecsAudio(),
    mediaRecorder: detectMediaRecorder(),
    audioOutputSelection: detectAudioOutputSelection(),
    webGpu: detectWebGpu(),
    offscreenCanvas: detectOffscreenCanvas(),
    keyboardLayoutMap: detectKeyboardLayoutMap(),
    webHid: detectWebHid(),
    webSerial: detectWebSerial(),
  };
}

/**
 * Checks for known browser limitations that may affect DAW operation.
 *
 * @returns {string[]} Array of known limitation warnings
 */
export function detectKnownLimitations(): string[] {
  const limitations: string[] = [];

  if (typeof navigator === "undefined") {
    return limitations;
  }

  // Check for Safari-specific limitations
  const ua = navigator.userAgent.toLowerCase();
  const isSafari =
    ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium");

  if (isSafari) {
    limitations.push(
      "Safari detected: Some audio features may have different behavior. " +
        "Consider using Chrome or Edge for the best experience."
    );
  }

  // Check for mobile browsers
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    ua
  );

  if (isMobile) {
    limitations.push(
      "Mobile browser detected: Audio latency and performance may be " +
        "suboptimal. Desktop browsers are recommended for production work."
    );
  }

  return limitations;
}

/**
 * Creates a complete capability report including matrix and metadata.
 *
 * @returns {CapabilityReport} The complete capability report
 */
export function createCapabilityReport(): CapabilityReport {
  const matrix = detectCapabilities();

  return {
    matrix,
    permissions: {
      midi: "prompt",
      microphone: "prompt",
    },
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    language: typeof navigator !== "undefined" ? navigator.language : "",
    screen: {
      width: typeof window !== "undefined" ? window.screen.width : 0,
      height: typeof window !== "undefined" ? window.screen.height : 0,
      devicePixelRatio:
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    },
    detectedAt: Date.now(),
    tier: determineTier(matrix),
  };
}

/**
 * Validates that required capabilities for a given tier are present.
 *
 * @param {CapabilityMatrix} matrix - The capability matrix to validate
 * @param {ExperienceTier} requiredTier - The minimum required tier
 * @returns {boolean} True if capabilities meet the requirement
 */
export function validateCapabilities(
  matrix: CapabilityMatrix,
  requiredTier: ExperienceTier
): boolean {
  const actualTier = determineTier(matrix);
  const tierValues: Record<ExperienceTier, number> = { A: 3, B: 2, C: 1 };

  return tierValues[actualTier] >= tierValues[requiredTier];
}
