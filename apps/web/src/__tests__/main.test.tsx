/**
 * @fileoverview Tests for main.tsx
 *
 * @module main.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("main.tsx", () => {
  let mockRegister: ReturnType<typeof vi.fn>;
  let MockAudioContext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock navigator.serviceWorker
    mockRegister = vi.fn();
    Object.defineProperty(globalThis, "navigator", {
      value: {
        serviceWorker: {
          register: mockRegister,
        },
      },
      writable: true,
    });

    // Mock AudioContext
    MockAudioContext = vi.fn(() => ({
      state: "suspended",
      resume: vi.fn().mockResolvedValue(undefined),
    }));

    Object.defineProperty(globalThis, "AudioContext", {
      value: MockAudioContext,
      writable: true,
    });

    Object.defineProperty(globalThis, "window", {
      value: {
        AudioContext: MockAudioContext,
        webkitAudioContext: MockAudioContext,
        screen: { width: 1920, height: 1080 },
        devicePixelRatio: 1,
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("service worker registration", () => {
    it("should register service worker when supported", async () => {
      const mockRegistration = { scope: "/" };
      mockRegister.mockResolvedValue(mockRegistration);

      // Import dynamically to get fresh module
      const { registerServiceWorker } = await import("../main.tsx");
      const result = await registerServiceWorker();

      expect(mockRegister).toHaveBeenCalledWith("/sw.js");
      expect(result).toBe(mockRegistration);
    });

    it("should return null when service worker registration fails", async () => {
      mockRegister.mockRejectedValue(new Error("Registration failed"));

      const { registerServiceWorker } = await import("../main.tsx");
      const result = await registerServiceWorker();

      expect(result).toBeNull();
    });

    it("should return null when service workers not supported", async () => {
      Object.defineProperty(globalThis, "navigator", {
        value: {},
        writable: true,
      });

      const { registerServiceWorker } = await import("../main.tsx");
      const result = await registerServiceWorker();

      expect(result).toBeNull();
    });
  });

  describe("audio context", () => {
    it("should create AudioContext when supported", async () => {
      const { getAudioContext } = await import("../main.tsx");
      const ctx = getAudioContext();

      expect(ctx).toBeTruthy();
    });

    it("should return existing AudioContext on subsequent calls", async () => {
      const { getAudioContext } = await import("../main.tsx");
      const ctx1 = getAudioContext();
      const ctx2 = getAudioContext();

      expect(ctx1).toBe(ctx2);
    });
  });
});
