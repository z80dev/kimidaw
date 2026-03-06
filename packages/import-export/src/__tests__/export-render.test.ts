import { describe, it, expect, beforeEach } from "vitest";
import { getExportRenderManager, resetExportRenderManager } from "../export-render.js";
import type { RenderJob } from "../types.js";

describe("ExportRenderManager", () => {
  beforeEach(() => {
    resetExportRenderManager();
  });

  describe("createJob", () => {
    it("should create a render job with unique ID", () => {
      const manager = getExportRenderManager();
      
      const job = manager.createJob({
        projectSnapshotId: "snapshot-123",
        scope: "master",
        format: {
          container: "wav",
          sampleRate: 48000,
        },
        normalize: false,
        dither: "none",
        includeTailMs: 1000,
      });

      expect(job.id).toBeDefined();
      expect(job.id.startsWith("render-")).toBe(true);
      expect(job.scope).toBe("master");
      expect(job.format.container).toBe("wav");
    });

    it("should create jobs with different IDs", () => {
      const manager = getExportRenderManager();
      
      const job1 = manager.createJob({
        projectSnapshotId: "snapshot-1",
        scope: "master",
        format: { container: "wav", sampleRate: 44100 },
        normalize: false,
        dither: "none",
        includeTailMs: 0,
      });

      const job2 = manager.createJob({
        projectSnapshotId: "snapshot-2",
        scope: "stems",
        format: { container: "flac", sampleRate: 48000 },
        normalize: true,
        dither: "triangular",
        includeTailMs: 500,
      });

      expect(job1.id).not.toBe(job2.id);
      expect(job1.scope).toBe("master");
      expect(job2.scope).toBe("stems");
    });
  });

  describe("format support", () => {
    it("should report WAV as supported", () => {
      const manager = getExportRenderManager();
      
      const supported = manager.isFormatSupported({
        container: "wav",
        sampleRate: 48000,
      });

      expect(supported).toBe(true);
    });

    it("should report FLAC as supported", () => {
      const manager = getExportRenderManager();
      
      const supported = manager.isFormatSupported({
        container: "flac",
        sampleRate: 48000,
      });

      expect(supported).toBe(true);
    });

    it("should return list of supported formats", () => {
      const manager = getExportRenderManager();
      const formats = manager.getSupportedFormats();
      
      expect(formats).toContain("wav");
      expect(formats).toContain("flac");
      expect(Array.isArray(formats)).toBe(true);
    });
  });

  describe("job configuration", () => {
    it("should support all render scopes", () => {
      const manager = getExportRenderManager();
      const scopes: RenderJob["scope"][] = ["master", "stems", "selectedTracks", "bus", "clip"];

      for (const scope of scopes) {
        const job = manager.createJob({
          projectSnapshotId: "snapshot",
          scope,
          format: { container: "wav", sampleRate: 48000 },
          normalize: false,
          dither: "none",
          includeTailMs: 0,
        });

        expect(job.scope).toBe(scope);
      }
    });

    it("should support track IDs for selected tracks scope", () => {
      const manager = getExportRenderManager();
      
      const job = manager.createJob({
        projectSnapshotId: "snapshot",
        scope: "selectedTracks",
        trackIds: ["track-1", "track-2", "track-3"],
        format: { container: "wav", sampleRate: 48000 },
        normalize: false,
        dither: "none",
        includeTailMs: 0,
      });

      expect(job.trackIds).toEqual(["track-1", "track-2", "track-3"]);
    });

    it("should support bus ID for bus scope", () => {
      const manager = getExportRenderManager();
      
      const job = manager.createJob({
        projectSnapshotId: "snapshot",
        scope: "bus",
        busId: "bus-main",
        format: { container: "wav", sampleRate: 48000 },
        normalize: false,
        dither: "none",
        includeTailMs: 0,
      });

      expect(job.busId).toBe("bus-main");
    });

    it("should support clip ID for clip scope", () => {
      const manager = getExportRenderManager();
      
      const job = manager.createJob({
        projectSnapshotId: "snapshot",
        scope: "clip",
        clipId: "clip-123",
        format: { container: "wav", sampleRate: 48000 },
        normalize: false,
        dither: "none",
        includeTailMs: 0,
      });

      expect(job.clipId).toBe("clip-123");
    });

    it("should support time range", () => {
      const manager = getExportRenderManager();
      
      const job = manager.createJob({
        projectSnapshotId: "snapshot",
        scope: "master",
        timeRange: { start: 10, end: 60 },
        format: { container: "wav", sampleRate: 48000 },
        normalize: false,
        dither: "none",
        includeTailMs: 0,
      });

      expect(job.timeRange).toEqual({ start: 10, end: 60 });
    });
  });

  describe("format configuration", () => {
    it("should support 16-bit WAV", () => {
      const manager = getExportRenderManager();
      
      const job = manager.createJob({
        projectSnapshotId: "snapshot",
        scope: "master",
        format: {
          container: "wav",
          sampleRate: 44100,
          bitDepth: 16,
        },
        normalize: false,
        dither: "none",
        includeTailMs: 0,
      });

      expect(job.format.bitDepth).toBe(16);
    });

    it("should support 24-bit WAV", () => {
      const manager = getExportRenderManager();
      
      const job = manager.createJob({
        projectSnapshotId: "snapshot",
        scope: "master",
        format: {
          container: "wav",
          sampleRate: 48000,
          bitDepth: 24,
        },
        normalize: false,
        dither: "none",
        includeTailMs: 0,
      });

      expect(job.format.bitDepth).toBe(24);
    });

    it("should support 32-bit float WAV", () => {
      const manager = getExportRenderManager();
      
      const job = manager.createJob({
        projectSnapshotId: "snapshot",
        scope: "master",
        format: {
          container: "wav",
          sampleRate: 48000,
          bitDepth: 32,
          float: true,
        },
        normalize: false,
        dither: "none",
        includeTailMs: 0,
      });

      expect(job.format.bitDepth).toBe(32);
      expect(job.format.float).toBe(true);
    });

    it("should support all sample rates", () => {
      const manager = getExportRenderManager();
      const rates = [44100, 48000, 96000] as const;

      for (const sampleRate of rates) {
        const job = manager.createJob({
          projectSnapshotId: "snapshot",
          scope: "master",
          format: { container: "wav", sampleRate },
          normalize: false,
          dither: "none",
          includeTailMs: 0,
        });

        expect(job.format.sampleRate).toBe(sampleRate);
      }
    });
  });

  describe("processing options", () => {
    it("should support normalization", () => {
      const manager = getExportRenderManager();
      
      const job = manager.createJob({
        projectSnapshotId: "snapshot",
        scope: "master",
        format: { container: "wav", sampleRate: 48000 },
        normalize: true,
        dither: "none",
        includeTailMs: 0,
      });

      expect(job.normalize).toBe(true);
    });

    it("should support different dither types", () => {
      const manager = getExportRenderManager();
      const ditherTypes = ["none", "triangular", "noise-shaped"] as const;

      for (const dither of ditherTypes) {
        const job = manager.createJob({
          projectSnapshotId: "snapshot",
          scope: "master",
          format: { container: "wav", sampleRate: 48000 },
          normalize: false,
          dither,
          includeTailMs: 0,
        });

        expect(job.dither).toBe(dither);
      }
    });

    it("should support tail inclusion", () => {
      const manager = getExportRenderManager();
      
      const job = manager.createJob({
        projectSnapshotId: "snapshot",
        scope: "master",
        format: { container: "wav", sampleRate: 48000 },
        normalize: false,
        dither: "triangular",
        includeTailMs: 5000, // 5 seconds tail
      });

      expect(job.includeTailMs).toBe(5000);
    });
  });

  describe("progress tracking", () => {
    it("should allow progress subscription", () => {
      const manager = getExportRenderManager();
      const job = manager.createJob({
        projectSnapshotId: "snapshot",
        scope: "master",
        format: { container: "wav", sampleRate: 48000 },
        normalize: false,
        dither: "none",
        includeTailMs: 0,
      });

      const handler = (progress: { jobId: string; progress: number }) => {
        console.log(progress);
      };

      const unsubscribe = manager.onProgress(job.id, handler);
      expect(typeof unsubscribe).toBe("function");
      
      unsubscribe();
    });
  });

  describe("cancellation", () => {
    it("should support job cancellation", () => {
      const manager = getExportRenderManager();
      const job = manager.createJob({
        projectSnapshotId: "snapshot",
        scope: "master",
        format: { container: "wav", sampleRate: 48000 },
        normalize: false,
        dither: "none",
        includeTailMs: 0,
      });

      // Cancel before render starts
      const cancelled = manager.cancel(job.id);
      expect(cancelled).toBe(false); // Not running yet
    });
  });
});
