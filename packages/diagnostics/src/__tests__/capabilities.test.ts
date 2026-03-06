/**
 * @fileoverview Tests for capability detection module.
 *
 * @module @daw/diagnostics/capabilities.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  detectCapabilities,
  determineTier,
  createCapabilityReport,
  validateCapabilities,
  detectKnownLimitations,
} from "../capabilities.js";
import type { CapabilityMatrix, ExperienceTier } from "../capabilities.js";

describe("capabilities", () => {
  let originalWindow: typeof window | undefined;
  let originalNavigator: typeof navigator | undefined;

  beforeEach(() => {
    // Store original globals
    originalWindow = globalThis.window as typeof window | undefined;
    originalNavigator = globalThis.navigator as typeof navigator | undefined;
  });

  afterEach(() => {
    // Restore original globals
    if (originalWindow !== undefined) {
      (globalThis as { window?: typeof window }).window = originalWindow;
    } else {
      delete (globalThis as { window?: typeof window }).window;
    }

    if (originalNavigator !== undefined) {
      (globalThis as { navigator?: typeof navigator }).navigator =
        originalNavigator;
    } else {
      delete (globalThis as { navigator?: typeof navigator }).navigator;
    }

    vi.restoreAllMocks();
  });

  describe("detectCapabilities", () => {
    it("should detect AudioWorklet support", () => {
      (globalThis as { window?: { AudioWorklet?: object } }).window = {
        AudioWorklet: class AudioWorklet {},
      };

      const caps = detectCapabilities();
      expect(caps.audioWorklet).toBe(true);
    });

    it("should detect AudioWorklet absence", () => {
      (globalThis as { window?: { AudioWorklet?: object } }).window = {};

      const caps = detectCapabilities();
      expect(caps.audioWorklet).toBe(false);
    });

    it("should detect SharedArrayBuffer support", () => {
      (globalThis as { window?: { SharedArrayBuffer?: object } }).window = {
        SharedArrayBuffer: class SharedArrayBuffer {
          constructor() {}
        },
      };

      const caps = detectCapabilities();
      expect(caps.sharedArrayBuffer).toBe(true);
    });

    it("should detect SharedArrayBuffer absence", () => {
      (globalThis as { window?: { SharedArrayBuffer?: object } }).window = {};

      const caps = detectCapabilities();
      expect(caps.sharedArrayBuffer).toBe(false);
    });

    it("should detect cross-origin isolation", () => {
      (globalThis as { window?: { crossOriginIsolated?: boolean } }).window = {
        crossOriginIsolated: true,
      };

      const caps = detectCapabilities();
      expect(caps.crossOriginIsolated).toBe(true);
    });

    it("should detect cross-origin isolation absence", () => {
      (globalThis as { window?: { crossOriginIsolated?: boolean } }).window = {
        crossOriginIsolated: false,
      };

      const caps = detectCapabilities();
      expect(caps.crossOriginIsolated).toBe(false);
    });

    it("should detect Web MIDI support", () => {
      (globalThis as { navigator?: { requestMIDIAccess?: () => void } }).navigator = {
        requestMIDIAccess: vi.fn(),
      };

      const caps = detectCapabilities();
      expect(caps.webMidi).toBe(true);
    });

    it("should detect Web MIDI absence", () => {
      (globalThis as { navigator?: { requestMIDIAccess?: () => void } }).navigator = {};

      const caps = detectCapabilities();
      expect(caps.webMidi).toBe(false);
    });

    it("should detect File System Access API support", () => {
      (globalThis as { window?: { showOpenFilePicker?: () => void } }).window = {
        showOpenFilePicker: vi.fn(),
      };

      const caps = detectCapabilities();
      expect(caps.fileSystemAccess).toBe(true);
    });

    it("should detect File System Access API absence", () => {
      (globalThis as { window?: { showOpenFilePicker?: () => void } }).window = {};

      const caps = detectCapabilities();
      expect(caps.fileSystemAccess).toBe(false);
    });

    it("should detect OPFS support", () => {
      (globalThis as {
        navigator?: { storage?: { getDirectory: () => void } };
      }).navigator = {
        storage: {
          getDirectory: vi.fn(),
        },
      };

      const caps = detectCapabilities();
      expect(caps.opfs).toBe(true);
    });

    it("should detect OPFS absence", () => {
      (globalThis as { navigator?: { storage?: object } }).navigator = {};

      const caps = detectCapabilities();
      expect(caps.opfs).toBe(false);
    });

    it("should detect WebCodecs Audio support", () => {
      (globalThis as { window?: { AudioDecoder?: object } }).window = {
        AudioDecoder: class AudioDecoder {},
      };

      const caps = detectCapabilities();
      expect(caps.webCodecsAudio).toBe(true);
    });

    it("should detect WebCodecs Audio absence", () => {
      (globalThis as { window?: { AudioDecoder?: object } }).window = {};

      const caps = detectCapabilities();
      expect(caps.webCodecsAudio).toBe(false);
    });

    it("should detect MediaRecorder support", () => {
      (globalThis as { window?: { MediaRecorder?: object } }).window = {
        MediaRecorder: class MediaRecorder {},
      };

      const caps = detectCapabilities();
      expect(caps.mediaRecorder).toBe(true);
    });

    it("should detect MediaRecorder absence", () => {
      (globalThis as { window?: { MediaRecorder?: object } }).window = {};

      const caps = detectCapabilities();
      expect(caps.mediaRecorder).toBe(false);
    });

    it("should detect audio output selection support", () => {
      (globalThis as {
        HTMLAudioElement?: { prototype: { setSinkId?: () => void } };
      }).HTMLAudioElement = class HTMLAudioElement {
        static prototype = {
          setSinkId: vi.fn(),
        };
      } as unknown as typeof globalThis.HTMLAudioElement;

      const caps = detectCapabilities();
      expect(caps.audioOutputSelection).toBe(true);
    });

    it("should detect WebGPU support", () => {
      (globalThis as { navigator?: { gpu?: object } }).navigator = {
        gpu: {},
      };

      const caps = detectCapabilities();
      expect(caps.webGpu).toBe(true);
    });

    it("should detect OffscreenCanvas support", () => {
      (globalThis as { window?: { OffscreenCanvas?: object } }).window = {
        OffscreenCanvas: class OffscreenCanvas {},
      };

      const caps = detectCapabilities();
      expect(caps.offscreenCanvas).toBe(true);
    });

    it("should detect Keyboard Layout Map API support", () => {
      (globalThis as {
        navigator?: { keyboard?: { getLayoutMap: () => void } };
      }).navigator = {
        keyboard: {
          getLayoutMap: vi.fn(),
        },
      };

      const caps = detectCapabilities();
      expect(caps.keyboardLayoutMap).toBe(true);
    });

    it("should detect WebHID support", () => {
      (globalThis as { navigator?: { hid?: object } }).navigator = {
        hid: {},
      };

      const caps = detectCapabilities();
      expect(caps.webHid).toBe(true);
    });

    it("should detect Web Serial API support", () => {
      (globalThis as { navigator?: { serial?: object } }).navigator = {
        serial: {},
      };

      const caps = detectCapabilities();
      expect(caps.webSerial).toBe(true);
    });

    it("should return complete capability matrix with all properties", () => {
      (globalThis as { window?: object }).window = {};
      (globalThis as { navigator?: object }).navigator = {};

      const caps = detectCapabilities();

      // Verify all required properties exist
      expect(caps).toHaveProperty("audioWorklet");
      expect(caps).toHaveProperty("sharedArrayBuffer");
      expect(caps).toHaveProperty("crossOriginIsolated");
      expect(caps).toHaveProperty("webMidi");
      expect(caps).toHaveProperty("sysex");
      expect(caps).toHaveProperty("fileSystemAccess");
      expect(caps).toHaveProperty("opfs");
      expect(caps).toHaveProperty("opfsSyncHandle");
      expect(caps).toHaveProperty("webCodecsAudio");
      expect(caps).toHaveProperty("mediaRecorder");
      expect(caps).toHaveProperty("audioOutputSelection");
      expect(caps).toHaveProperty("webGpu");
      expect(caps).toHaveProperty("offscreenCanvas");
      expect(caps).toHaveProperty("keyboardLayoutMap");
      expect(caps).toHaveProperty("webHid");
      expect(caps).toHaveProperty("webSerial");
    });

    it("should handle undefined window gracefully", () => {
      delete (globalThis as { window?: typeof window }).window;

      const caps = detectCapabilities();
      expect(caps.audioWorklet).toBe(false);
      expect(caps.sharedArrayBuffer).toBe(false);
    });

    it("should handle undefined navigator gracefully", () => {
      delete (globalThis as { navigator?: typeof navigator }).navigator;

      const caps = detectCapabilities();
      expect(caps.webMidi).toBe(false);
      expect(caps.opfs).toBe(false);
    });
  });

  describe("determineTier", () => {
    const baseCaps: CapabilityMatrix = {
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
    };

    it("should return Tier A when all requirements met", () => {
      const caps: CapabilityMatrix = {
        ...baseCaps,
        audioWorklet: true,
        sharedArrayBuffer: true,
        crossOriginIsolated: true,
      };

      expect(determineTier(caps)).toBe("A");
    });

    it("should return Tier A when SAB missing but OPFS available", () => {
      const caps: CapabilityMatrix = {
        ...baseCaps,
        audioWorklet: true,
        sharedArrayBuffer: false,
        opfs: true,
        crossOriginIsolated: true,
      };

      expect(determineTier(caps)).toBe("A");
    });

    it("should return Tier B when AudioWorklet available but SAB/OPFS missing", () => {
      const caps: CapabilityMatrix = {
        ...baseCaps,
        audioWorklet: true,
        sharedArrayBuffer: false,
        crossOriginIsolated: false,
        opfs: false,
      };

      expect(determineTier(caps)).toBe("B");
    });

    it("should return Tier B when AudioWorklet available but not cross-origin isolated", () => {
      const caps: CapabilityMatrix = {
        ...baseCaps,
        audioWorklet: true,
        sharedArrayBuffer: true,
        crossOriginIsolated: false,
      };

      expect(determineTier(caps)).toBe("B");
    });

    it("should return Tier C when AudioWorklet not available", () => {
      const caps: CapabilityMatrix = {
        ...baseCaps,
        audioWorklet: false,
        sharedArrayBuffer: true,
        crossOriginIsolated: true,
      };

      expect(determineTier(caps)).toBe("C");
    });

    it("should return Tier C for minimal capabilities", () => {
      expect(determineTier(baseCaps)).toBe("C");
    });
  });

  describe("createCapabilityReport", () => {
    it("should create complete capability report", () => {
      (globalThis as { window?: { screen?: object } }).window = {
        screen: {
          width: 1920,
          height: 1080,
        },
        devicePixelRatio: 2,
      };

      (globalThis as { navigator?: { userAgent?: string; language?: string } }).navigator = {
        userAgent: "Test Browser",
        language: "en-US",
      };

      const report = createCapabilityReport();

      expect(report.matrix).toBeDefined();
      expect(report.permissions).toEqual({
        midi: "prompt",
        microphone: "prompt",
      });
      expect(report.userAgent).toBe("Test Browser");
      expect(report.language).toBe("en-US");
      expect(report.screen).toEqual({
        width: 1920,
        height: 1080,
        devicePixelRatio: 2,
      });
      expect(report.detectedAt).toBeGreaterThan(0);
      expect(report.tier).toBeDefined();
    });

    it("should use empty string for userAgent when navigator undefined", () => {
      delete (globalThis as { navigator?: typeof navigator }).navigator;

      const report = createCapabilityReport();
      expect(report.userAgent).toBe("");
      expect(report.language).toBe("");
    });
  });

  describe("validateCapabilities", () => {
    const createCaps = (
      audioWorklet: boolean,
      sharedArrayBuffer: boolean,
      crossOriginIsolated: boolean
    ): CapabilityMatrix => ({
      audioWorklet,
      sharedArrayBuffer,
      crossOriginIsolated,
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
    });

    it("should return true when capabilities exceed requirement", () => {
      const caps = createCaps(true, true, true); // Tier A
      expect(validateCapabilities(caps, "B")).toBe(true);
      expect(validateCapabilities(caps, "C")).toBe(true);
    });

    it("should return true when capabilities meet requirement exactly", () => {
      const caps = createCaps(true, false, false); // Tier B
      expect(validateCapabilities(caps, "B")).toBe(true);
    });

    it("should return false when capabilities below requirement", () => {
      const caps = createCaps(true, false, false); // Tier B
      expect(validateCapabilities(caps, "A")).toBe(false);
    });

    it("should return true for Tier C requirement with Tier C capabilities", () => {
      const caps = createCaps(false, false, false); // Tier C
      expect(validateCapabilities(caps, "C")).toBe(true);
    });
  });

  describe("detectKnownLimitations", () => {
    it("should detect Safari browser", () => {
      (globalThis as { navigator?: { userAgent: string } }).navigator = {
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
      };

      const limitations = detectKnownLimitations();
      expect(limitations.some((l) => l.includes("Safari"))).toBe(true);
    });

    it("should not detect Chrome as Safari", () => {
      (globalThis as { navigator?: { userAgent: string } }).navigator = {
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };

      const limitations = detectKnownLimitations();
      expect(limitations.some((l) => l.includes("Safari"))).toBe(false);
    });

    it("should detect mobile browsers", () => {
      (globalThis as { navigator?: { userAgent: string } }).navigator = {
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      };

      const limitations = detectKnownLimitations();
      expect(limitations.some((l) => l.includes("Mobile"))).toBe(true);
    });

    it("should detect Android mobile browsers", () => {
      (globalThis as { navigator?: { userAgent: string } }).navigator = {
        userAgent:
          "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
      };

      const limitations = detectKnownLimitations();
      expect(limitations.some((l) => l.includes("Mobile"))).toBe(true);
    });

    it("should return empty array when navigator undefined", () => {
      delete (globalThis as { navigator?: typeof navigator }).navigator;

      const limitations = detectKnownLimitations();
      expect(limitations).toEqual([]);
    });
  });
});
