/**
 * @fileoverview Main entry point for the In-Browser DAW web application.
 *
 * Handles:
 * - Capability detection at boot
 * - AudioContext initialization with explicit user gesture
 * - Service worker registration
 * - React root mounting
 *
 * @module main
 */

import React, { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  detectCapabilities,
  determineTier,
  createCapabilityReport,
  detectKnownLimitations,
  type CapabilityMatrix,
  type ExperienceTier,
  type CapabilityReport,
} from "@daw/diagnostics";

/**
 * Props for the AudioEnableButton component.
 */
interface AudioEnableButtonProps {
  /** Callback when audio is enabled */
  onEnabled: () => void;
  /** Whether audio is currently being initialized */
  isInitializing: boolean;
}

/**
 * Button component for explicit audio context initialization.
 *
 * Per spec section 21.3: Because autoplay rules exist, the app must use
 * an explicit user gesture to arm/start audio.
 *
 * @param {AudioEnableButtonProps} props - Component props
 * @returns {React.ReactElement} The rendered button
 */
function AudioEnableButton({
  onEnabled,
  isInitializing,
}: AudioEnableButtonProps): React.ReactElement {
  const handleClick = useCallback(async () => {
    try {
      // Resume audio context (may be suspended due to autoplay policy)
      if (audioContext && audioContext.state === "suspended") {
        await audioContext.resume();
      }
      onEnabled();
    } catch (error) {
      console.error("Failed to initialize audio:", error);
    }
  }, [onEnabled]);

  return (
    <button
      onClick={handleClick}
      disabled={isInitializing}
      style={{
        padding: "16px 32px",
        fontSize: "18px",
        fontWeight: "bold",
        backgroundColor: isInitializing ? "#666" : "#007bff",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: isInitializing ? "not-allowed" : "pointer",
        transition: "background-color 0.2s",
      }}
    >
      {isInitializing ? "Initializing..." : "Enable Audio"}
    </button>
  );
}

/**
 * Props for the CapabilityDisplay component.
 */
interface CapabilityDisplayProps {
  /** Capability report */
  report: CapabilityReport;
  /** Known limitations */
  limitations: string[];
}

/**
 * Displays capability detection results.
 *
 * @param {CapabilityDisplayProps} props - Component props
 * @returns {React.ReactElement} The rendered display
 */
function CapabilityDisplay({
  report,
  limitations,
}: CapabilityDisplayProps): React.ReactElement {
  const { matrix, tier } = report;

  const getTierColor = (t: ExperienceTier): string => {
    switch (t) {
      case "A":
        return "#28a745"; // Green
      case "B":
        return "#ffc107"; // Yellow
      case "C":
        return "#dc3545"; // Red
      default:
        return "#666";
    }
  };

  const capabilityItems: { key: keyof CapabilityMatrix; label: string }[] = [
    { key: "audioWorklet", label: "AudioWorklet" },
    { key: "sharedArrayBuffer", label: "SharedArrayBuffer" },
    { key: "crossOriginIsolated", label: "Cross-Origin Isolated" },
    { key: "webMidi", label: "Web MIDI" },
    { key: "sysex", label: "MIDI SysEx" },
    { key: "fileSystemAccess", label: "File System Access" },
    { key: "opfs", label: "Origin Private FS" },
    { key: "opfsSyncHandle", label: "OPFS Sync Handles" },
    { key: "webCodecsAudio", label: "WebCodecs Audio" },
    { key: "mediaRecorder", label: "MediaRecorder" },
    { key: "audioOutputSelection", label: "Audio Output Selection" },
    { key: "webGpu", label: "WebGPU" },
    { key: "offscreenCanvas", label: "OffscreenCanvas" },
    { key: "keyboardLayoutMap", label: "Keyboard Layout Map" },
    { key: "webHid", label: "WebHID" },
    { key: "webSerial", label: "Web Serial" },
  ];

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
        color: "#fff",
        maxWidth: "600px",
        margin: "20px auto",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Browser Capabilities</h2>

      <div
        style={{
          padding: "12px",
          backgroundColor: getTierColor(tier),
          borderRadius: "4px",
          marginBottom: "16px",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        Experience Tier {tier}
        {tier === "A" && " - Full Experience"}
        {tier === "B" && " - Core DAW"}
        {tier === "C" && " - Limited Compatibility"}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        {capabilityItems.map(({ key, label }) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: matrix[key] ? "#28a745" : "#dc3545",
              }}
            />
            <span style={{ fontSize: "14px" }}>{label}</span>
          </div>
        ))}
      </div>

      {limitations.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>Notices:</h3>
          {limitations.map((limitation, index) => (
            <div
              key={index}
              style={{
                padding: "8px",
                backgroundColor: "#333",
                borderRadius: "4px",
                marginBottom: "8px",
                fontSize: "12px",
              }}
            >
              {limitation}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Props for the App component.
 */
interface AppProps {
  /** Initial capability report */
  initialReport: CapabilityReport;
  /** Known browser limitations */
  limitations: string[];
}

/**
 * Main application component.
 *
 * @param {AppProps} props - Component props
 * @returns {React.ReactElement} The rendered app
 */
function App({ initialReport, limitations }: AppProps): React.ReactElement {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const handleAudioEnabled = useCallback(() => {
    setIsInitializing(false);
    setAudioEnabled(true);
  }, []);

  // Log capability detection results
  useEffect(() => {
    console.log("[DAW] Capability report:", initialReport);
    console.log("[DAW] Known limitations:", limitations);
  }, [initialReport, limitations]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <h1
        style={{
          color: "#fff",
          marginBottom: "32px",
          fontSize: "32px",
        }}
      >
        In-Browser DAW
      </h1>

      {!audioEnabled ? (
        <>
          <p
            style={{
              color: "#aaa",
              marginBottom: "24px",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            Click below to enable audio. This is required for the DAW to
            function.
          </p>
          <AudioEnableButton
            onEnabled={handleAudioEnabled}
            isInitializing={isInitializing}
          />
        </>
      ) : (
        <div style={{ color: "#28a745", fontSize: "18px" }}>
          ✓ Audio Enabled
        </div>
      )}

      <CapabilityDisplay report={initialReport} limitations={limitations} />

      <footer
        style={{
          marginTop: "auto",
          padding: "20px",
          color: "#666",
          fontSize: "12px",
          textAlign: "center",
        }}
      >
        <div>Version {initialReport.appVersion}</div>
        <div style={{ marginTop: "4px" }}>
          {initialReport.userAgent.substring(0, 100)}
          {initialReport.userAgent.length > 100 ? "..." : ""}
        </div>
      </footer>
    </div>
  );
}

/**
 * Global AudioContext instance.
 * Initialized lazily on user gesture.
 */
let audioContext: AudioContext | null = null;

/**
 * Gets or creates the global AudioContext.
 *
 * @returns {AudioContext | null} The audio context or null if not supported
 */
export function getAudioContext(): AudioContext | null {
  if (!audioContext && typeof window !== "undefined") {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }
  return audioContext;
}

/**
 * Registers the service worker for PWA support.
 *
 * Per spec section 22.1: Use service worker for shell asset caching,
 * worklet/worker/wasm caching, and offline functionality.
 *
 * @returns {Promise<ServiceWorkerRegistration | null>} The registration or null
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("[DAW] Service worker registered:", registration.scope);
      return registration;
    } catch (error) {
      console.error("[DAW] Service worker registration failed:", error);
      return null;
    }
  }
  console.log("[DAW] Service workers not supported");
  return null;
}

/**
 * Boot sequence for the DAW application.
 *
 * 1. Detect browser capabilities
 * 2. Register service worker
 * 3. Render initial UI
 * 4. Wait for user gesture to initialize audio
 *
 * @returns {Promise<void>}
 */
async function boot(): Promise<void> {
  console.log("[DAW] Starting boot sequence...");

  // Step 1: Detect capabilities at boot (spec section 3.3)
  const capabilities = detectCapabilities();
  const tier = determineTier(capabilities);
  const limitations = detectKnownLimitations();

  console.log("[DAW] Detected tier:", tier);
  console.log("[DAW] Capabilities:", capabilities);

  // Create capability report
  const report = createCapabilityReport();
  report.appVersion = import.meta.env.VITE_APP_VERSION || "0.1.0";

  // Step 2: Register service worker (spec section 22.1)
  await registerServiceWorker();

  // Step 3: Initialize AudioContext (but don't resume yet - needs user gesture)
  getAudioContext();

  // Step 4: Render React app
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App initialReport={report} limitations={limitations} />
    </StrictMode>
  );

  console.log("[DAW] Boot sequence complete");
}

// Start boot sequence
boot().catch((error) => {
  console.error("[DAW] Boot failed:", error);
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0a0a0a;
      color: #dc3545;
      font-family: sans-serif;
      padding: 20px;
      text-align: center;
    ">
      <h1>Failed to Start</h1>
      <p>${error instanceof Error ? error.message : "Unknown error"}</p>
      <p style="color: #666; margin-top: 16px;">
        Please try refreshing the page or use a different browser.
      </p>
    </div>
  `;
});

// Export for testing
export { boot, registerServiceWorker };
