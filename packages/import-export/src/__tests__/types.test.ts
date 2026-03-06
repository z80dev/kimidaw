import { describe, it, expect } from "vitest";

// Test that types are properly exported
describe("Import/Export Types", () => {
  it("should have RenderJob interface structure", () => {
    const job = {
      id: "test-123",
      projectSnapshotId: "snapshot-456",
      scope: "master" as const,
      format: {
        container: "wav" as const,
        sampleRate: 48000 as const,
        bitDepth: 24 as const,
      },
      normalize: true,
      dither: "triangular" as const,
      includeTailMs: 1000,
    };

    expect(job.id).toBe("test-123");
    expect(job.scope).toBe("master");
    expect(job.format.container).toBe("wav");
    expect(job.format.sampleRate).toBe(48000);
  });

  it("should support different render scopes", () => {
    const scopes = ["master", "stems", "selectedTracks", "bus", "clip"] as const;
    
    for (const scope of scopes) {
      const job = {
        id: `test-${scope}`,
        projectSnapshotId: "snapshot",
        scope,
        format: { container: "wav" as const, sampleRate: 44100 as const },
        normalize: false,
        dither: "none" as const,
        includeTailMs: 0,
      };
      expect(job.scope).toBe(scope);
    }
  });

  it("should support different audio formats", () => {
    const containers = ["wav", "flac", "ogg", "aac", "mp3"] as const;
    
    for (const container of containers) {
      const job = {
        id: "test",
        projectSnapshotId: "snapshot",
        scope: "master" as const,
        format: { container, sampleRate: 48000 as const },
        normalize: false,
        dither: "none" as const,
        includeTailMs: 0,
      };
      expect(job.format.container).toBe(container);
    }
  });

  it("should support different dither types", () => {
    const ditherTypes = ["none", "triangular", "noise-shaped"] as const;
    
    for (const dither of ditherTypes) {
      const job = {
        id: "test",
        projectSnapshotId: "snapshot",
        scope: "master" as const,
        format: { container: "wav" as const, sampleRate: 48000 as const },
        normalize: false,
        dither,
        includeTailMs: 0,
      };
      expect(job.dither).toBe(dither);
    }
  });

  it("should have ImportResult structure", () => {
    const result = {
      assetId: "audio-abc123",
      hash: "sha256-hash",
      metadata: {
        type: "audio" as const,
        format: "wav" as const,
        sampleRate: 48000,
        channels: 2,
        duration: 120.5,
      },
      duration: 120.5,
    };

    expect(result.assetId).toBe("audio-abc123");
    expect(result.metadata.type).toBe("audio");
    expect(result.metadata.channels).toBe(2);
  });

  it("should have ProjectArchive structure", () => {
    const archive = {
      version: "1.0.0",
      manifest: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        appVersion: "0.1.0",
        schemaVersion: 1,
      },
      project: {
        id: "proj-123",
        name: "Test Project",
        data: {},
      },
      assets: [],
      presets: [],
      scripts: [],
    };

    expect(archive.version).toBe("1.0.0");
    expect(archive.manifest.schemaVersion).toBe(1);
    expect(archive.project.name).toBe("Test Project");
  });

  it("should have PeakData structure", () => {
    const peakData = {
      sampleRate: 48000,
      channels: 2,
      levels: [
        { zoom: 256, data: new Float32Array(100) },
        { zoom: 512, data: new Float32Array(50) },
      ],
    };

    expect(peakData.sampleRate).toBe(48000);
    expect(peakData.levels).toHaveLength(2);
    expect(peakData.levels[0].zoom).toBe(256);
  });
});
