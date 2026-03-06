import { describe, it, expect, beforeEach } from "vitest";
import { getArchiveManager, resetArchiveManager, ARCHIVE_VERSION, ARCHIVE_EXTENSION } from "../archive.js";

describe("ArchiveManager", () => {
  beforeEach(() => {
    resetArchiveManager();
  });

  describe("createArchive", () => {
    it("should create a basic archive", async () => {
      const manager = getArchiveManager();
      
      const result = await manager.createArchive({
        projectId: "proj-123",
        projectName: "Test Project",
        projectData: { tracks: [], tempo: 120 },
        assets: [],
      });

      expect(result.success).toBe(true);
      expect(result.blob).toBeDefined();
      expect(result.filename).toBe("Test_Project.webdawproj");
      expect(result.size).toBeGreaterThan(0);
    });

    it("should sanitize filenames", async () => {
      const manager = getArchiveManager();
      
      const result = await manager.createArchive({
        projectId: "proj-123",
        projectName: "My Project! @#$%",
        projectData: {},
        assets: [],
      });

      expect(result.filename).toBe("My_Project.webdawproj");
    });

    it("should truncate long project names", async () => {
      const manager = getArchiveManager();
      
      const longName = "A".repeat(100);
      const result = await manager.createArchive({
        projectId: "proj-123",
        projectName: longName,
        projectData: {},
        assets: [],
      });

      // Should be truncated to 50 chars
      expect(result.filename!.length).toBeLessThanOrEqual(50 + ARCHIVE_EXTENSION.length);
    });

    it("should include assets when specified", async () => {
      const manager = getArchiveManager();
      
      const testData = new ArrayBuffer(100);
      const view = new Uint8Array(testData);
      for (let i = 0; i < 100; i++) view[i] = i;

      const result = await manager.createArchive({
        projectId: "proj-123",
        projectName: "Test",
        projectData: {},
        assets: [
          {
            id: "asset-1",
            hash: "a".repeat(64),
            data: testData,
            mimeType: "audio/wav",
            metadata: { duration: 120 },
          },
        ],
        includeAssets: true,
      });

      expect(result.success).toBe(true);
      expect(result.size).toBeGreaterThan(100); // Should include asset data
    });

    it("should skip assets when includeAssets is false", async () => {
      const manager = getArchiveManager();
      
      const result = await manager.createArchive({
        projectId: "proj-123",
        projectName: "Test",
        projectData: {},
        assets: [
          {
            id: "asset-1",
            hash: "a".repeat(64),
            data: new ArrayBuffer(1000),
            mimeType: "audio/wav",
          },
        ],
        includeAssets: false,
      });

      expect(result.success).toBe(true);
      expect(result.size!).toBeLessThan(1000); // Should not include large asset
    });

    it("should include presets when specified", async () => {
      const manager = getArchiveManager();
      
      const result = await manager.createArchive({
        projectId: "proj-123",
        projectName: "Test",
        projectData: {},
        assets: [],
        presets: [
          {
            id: "preset-1",
            name: "My Preset",
            pluginType: "synth",
            data: { cutoff: 1000, resonance: 50 },
          },
        ],
        includePresets: true,
      });

      expect(result.success).toBe(true);
    });

    it("should include scripts when specified", async () => {
      const manager = getArchiveManager();
      
      const result = await manager.createArchive({
        projectId: "proj-123",
        projectName: "Test",
        projectData: {},
        assets: [],
        scripts: [
          {
            id: "script-1",
            name: "Generator",
            source: "export function generate() { return []; }",
          },
        ],
        includeScripts: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("version and constants", () => {
    it("should return archive version", () => {
      const manager = getArchiveManager();
      expect(manager.getVersion()).toBe(ARCHIVE_VERSION);
    });

    it("should return archive extension", () => {
      const manager = getArchiveManager();
      expect(manager.getExtension()).toBe(".webdawproj");
    });
  });

  describe("getArchiveInfo", () => {
    it("should extract info from valid archive", async () => {
      const manager = getArchiveManager();
      
      const createResult = await manager.createArchive({
        projectId: "proj-123",
        projectName: "Test Project",
        projectData: { test: true },
        assets: [],
      });

      expect(createResult.success).toBe(true);
      
      if (createResult.blob) {
        const file = new File([createResult.blob], "test.webdawproj", {
          type: "application/x-webdawproj",
        });
        
        const info = await manager.getArchiveInfo(file);
        
        expect(info.valid).toBe(true);
        expect(info.projectName).toBe("Test Project");
        expect(info.schemaVersion).toBe(1);
      }
    });

    it("should handle invalid archive", async () => {
      const manager = getArchiveManager();
      
      const invalidData = new Blob(["not a valid archive"]);
      const file = new File([invalidData], "invalid.webdawproj");
      
      const info = await manager.getArchiveInfo(file);
      
      expect(info.valid).toBe(false);
      expect(info.error).toBeDefined();
    });
  });

  describe("compression", () => {
    it("should support gzip compression", async () => {
      const manager = getArchiveManager();
      
      const result = await manager.createArchive({
        projectId: "proj-123",
        projectName: "Test",
        projectData: {},
        assets: [],
        compression: "gzip",
      });

      expect(result.success).toBe(true);
    });
  });
});
