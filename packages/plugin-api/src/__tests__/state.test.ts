import { describe, it, expect, beforeEach } from "vitest";
import {
  StateSerializerImpl,
  MigrationRegistryImpl,
  JsonStateCompressor,
  StateDifferImpl,
  CURRENT_STATE_VERSION,
  createSerializedState,
  normalizeStateForComparison,
  statesAreEqual,
} from "../state.js";
import type { PluginDefinition, SerializedState, PluginState } from "../types.js";

describe("State Serialization", () => {
  const mockPlugin: PluginDefinition = {
    id: "com.test.plugin",
    name: "Test Plugin",
    category: "instrument",
    version: "1.0.0",
    parameters: [
      { id: "param1", name: "Param 1", kind: "float", min: 0, max: 100, defaultValue: 0.5 },
      { id: "param2", name: "Param 2", kind: "float", min: 0, max: 1, defaultValue: 0 },
    ],
    ui: { type: "generic" },
    audioInputs: 0,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 0,
    async createInstance() {
      return null as any;
    },
  };

  describe("StateSerializerImpl", () => {
    let serializer: StateSerializerImpl;

    beforeEach(() => {
      serializer = new StateSerializerImpl();
    });

    describe("serialize", () => {
      it("should serialize plugin state", () => {
        const state: PluginState = {
          parameters: { param1: 0.75, param2: 0.25 },
          custom: { presetName: "Test" },
        };

        const serialized = serializer.serialize(state);

        expect(serialized.version).toBe(CURRENT_STATE_VERSION);
        expect(serialized.parameters.param1).toBe(0.75);
        expect(serialized.parameters.param2).toBe(0.25);
        expect(serialized.customState).toEqual({ presetName: "Test" });
        expect(serialized.timestamp).toBeDefined();
      });
    });

    describe("deserialize", () => {
      it("should deserialize valid state", () => {
        const serialized: SerializedState = {
          version: CURRENT_STATE_VERSION,
          pluginId: "com.test.plugin",
          pluginVersion: "1.0.0",
          parameters: { param1: 0.75, param2: 0.5 },
          customState: { data: "test" },
          timestamp: Date.now(),
        };

        const state = serializer.deserialize(serialized, mockPlugin);

        expect(state.parameters.param1).toBe(0.75);
        expect(state.parameters.param2).toBe(0.5);
        expect(state.custom).toEqual({ data: "test" });
      });

      it("should use defaults for missing parameters", () => {
        const serialized: SerializedState = {
          version: CURRENT_STATE_VERSION,
          pluginId: "com.test.plugin",
          pluginVersion: "1.0.0",
          parameters: { param1: 0.75 }, // param2 missing
          timestamp: Date.now(),
        };

        const state = serializer.deserialize(serialized, mockPlugin);

        expect(state.parameters.param1).toBe(0.75);
        expect(state.parameters.param2).toBe(0); // default
      });

      it("should handle null/undefined input", () => {
        const state = serializer.deserialize(null, mockPlugin);

        expect(state.parameters.param1).toBe(0.5); // default
        expect(state.parameters.param2).toBe(0); // default
      });

      it("should handle non-object input", () => {
        const state = serializer.deserialize("invalid", mockPlugin);

        expect(state.parameters.param1).toBe(0.5); // default
      });

      it("should clamp out-of-range values", () => {
        const serialized: SerializedState = {
          version: CURRENT_STATE_VERSION,
          pluginId: "com.test.plugin",
          pluginVersion: "1.0.0",
          parameters: { param1: 1.5, param2: -0.5 },
          timestamp: Date.now(),
        };

        const state = serializer.deserialize(serialized, mockPlugin);

        expect(state.parameters.param1).toBe(1);
        expect(state.parameters.param2).toBe(0);
      });
    });

    describe("createDefault", () => {
      it("should create state with all defaults", () => {
        const state = serializer.createDefault(mockPlugin);

        expect(state.parameters.param1).toBe(0.5);
        expect(state.parameters.param2).toBe(0);
        expect(state.custom).toBeUndefined();
      });
    });

    describe("validate", () => {
      it("should validate correct state", () => {
        const serialized: SerializedState = {
          version: CURRENT_STATE_VERSION,
          pluginId: "com.test.plugin",
          pluginVersion: "1.0.0",
          parameters: { param1: 0.5, param2: 0.5 },
          timestamp: Date.now(),
        };

        const result = serializer.validate(serialized, mockPlugin);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should error on non-object state", () => {
        const result = serializer.validate("invalid", mockPlugin);

        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe("INVALID_TYPE");
      });

      it("should warn on missing parameters", () => {
        const serialized: SerializedState = {
          version: CURRENT_STATE_VERSION,
          pluginId: "com.test.plugin",
          pluginVersion: "1.0.0",
          parameters: { param1: 0.5 }, // param2 missing
          timestamp: Date.now(),
        };

        const result = serializer.validate(serialized, mockPlugin);

        expect(result.valid).toBe(true);
        expect(result.warnings.some(w => w.code === "MISSING_PARAMETER")).toBe(true);
      });

      it("should warn on unknown parameters", () => {
        const serialized: SerializedState = {
          version: CURRENT_STATE_VERSION,
          pluginId: "com.test.plugin",
          pluginVersion: "1.0.0",
          parameters: { param1: 0.5, param2: 0.5, unknown: 0.5 },
          timestamp: Date.now(),
        };

        const result = serializer.validate(serialized, mockPlugin);

        expect(result.valid).toBe(true);
        expect(result.warnings.some(w => w.code === "UNKNOWN_PARAMETER")).toBe(true);
      });

      it("should error on invalid parameter type", () => {
        const serialized = {
          version: CURRENT_STATE_VERSION,
          pluginId: "com.test.plugin",
          pluginVersion: "1.0.0",
          parameters: { param1: "invalid", param2: 0.5 },
          timestamp: Date.now(),
        };

        const result = serializer.validate(serialized, mockPlugin);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === "INVALID_PARAMETER_TYPE")).toBe(true);
      });

      it("should warn on out-of-range values", () => {
        const serialized: SerializedState = {
          version: CURRENT_STATE_VERSION,
          pluginId: "com.test.plugin",
          pluginVersion: "1.0.0",
          parameters: { param1: 1.5, param2: 0.5 },
          timestamp: Date.now(),
        };

        const result = serializer.validate(serialized, mockPlugin);

        expect(result.warnings.some(w => w.code === "VALUE_OUT_OF_RANGE")).toBe(true);
      });

      it("should error on invalid version type", () => {
        const serialized = {
          version: "invalid",
          pluginId: "com.test.plugin",
          pluginVersion: "1.0.0",
          parameters: {},
        };

        const result = serializer.validate(serialized, mockPlugin);

        expect(result.errors.some(e => e.code === "INVALID_VERSION_TYPE")).toBe(true);
      });

      it("should warn on missing version", () => {
        const serialized = {
          pluginId: "com.test.plugin",
          pluginVersion: "1.0.0",
          parameters: { param1: 0.5, param2: 0.5 },
        };

        const result = serializer.validate(serialized, mockPlugin);

        expect(result.warnings.some(w => w.code === "MISSING_VERSION")).toBe(true);
      });
    });
  });

  describe("MigrationRegistryImpl", () => {
    let registry: MigrationRegistryImpl;

    beforeEach(() => {
      registry = new MigrationRegistryImpl();
    });

    it("should register and retrieve migrations", () => {
      registry.register("com.test.plugin", {
        toVersion: 1,
        migrate: (state) => ({ ...state as object, version: 1 }),
      });

      const migrations = registry.getMigrations("com.test.plugin");
      expect(migrations).toHaveLength(1);
      expect(migrations[0].toVersion).toBe(1);
    });

    it("should sort migrations by version", () => {
      registry.register("com.test.plugin", {
        toVersion: 2,
        migrate: (state) => state,
      });
      registry.register("com.test.plugin", {
        toVersion: 1,
        migrate: (state) => state,
      });

      const migrations = registry.getMigrations("com.test.plugin");
      expect(migrations[0].toVersion).toBe(1);
      expect(migrations[1].toVersion).toBe(2);
    });

    it("should apply migrations in sequence", () => {
      const migrationLog: number[] = [];

      registry.register("com.test.plugin", {
        toVersion: 1,
        migrate: (state) => {
          migrationLog.push(1);
          return { ...(state as object), v1: true };
        },
      });
      registry.register("com.test.plugin", {
        toVersion: 2,
        migrate: (state) => {
          migrationLog.push(2);
          return { ...(state as object), v2: true };
        },
      });

      const initialState = { version: 0 };
      const migrated = registry.migrate(initialState, "com.test.plugin", 2);

      expect(migrationLog).toEqual([1, 2]);
      expect(migrated).toEqual({ version: 0, v1: true, v2: true });
    });

    it("should only apply needed migrations", () => {
      const migrationLog: number[] = [];

      registry.register("com.test.plugin", {
        toVersion: 1,
        migrate: (state) => {
          migrationLog.push(1);
          return state;
        },
      });
      registry.register("com.test.plugin", {
        toVersion: 2,
        migrate: (state) => {
          migrationLog.push(2);
          return state;
        },
      });

      const initialState = { version: 1 }; // Already at v1
      registry.migrate(initialState, "com.test.plugin", 2);

      expect(migrationLog).toEqual([2]); // Only v2 migration applied
    });

    it("should handle plugins with no migrations", () => {
      const state = { version: 0 };
      const migrated = registry.migrate(state, "unknown.plugin", 1);

      expect(migrated).toEqual(state);
    });
  });

  describe("JsonStateCompressor", () => {
    let compressor: JsonStateCompressor;

    beforeEach(() => {
      compressor = new JsonStateCompressor();
    });

    it("should compress and decompress state", () => {
      const state: SerializedState = {
        version: 1,
        pluginId: "com.test.plugin",
        pluginVersion: "1.0.0",
        parameters: { p1: 0.5, p2: 0.75 },
        timestamp: Date.now(),
      };

      const compressed = compressor.compress(state);
      expect(compressed).toBeInstanceOf(Uint8Array);

      const decompressed = compressor.decompress(compressed);
      expect(decompressed).toEqual(state);
    });
  });

  describe("StateDifferImpl", () => {
    let differ: StateDifferImpl;

    beforeEach(() => {
      differ = new StateDifferImpl();
    });

    it("should return null for identical states", () => {
      const state: PluginState = {
        parameters: { p1: 0.5 },
      };

      const patch = differ.diff(state, state);
      expect(patch).toBeNull();
    });

    it("should diff parameter changes", () => {
      const oldState: PluginState = {
        parameters: { p1: 0.5, p2: 0.5 },
      };
      const newState: PluginState = {
        parameters: { p1: 0.75, p2: 0.5 },
      };

      const patch = differ.diff(oldState, newState);

      expect(patch).not.toBeNull();
      expect(patch!.parameters).toEqual({ p1: 0.75 });
      expect(patch!.timestamp).toBeDefined();
    });

    it("should detect removed parameters", () => {
      const oldState: PluginState = {
        parameters: { p1: 0.5, p2: 0.5 },
      };
      const newState: PluginState = {
        parameters: { p1: 0.5 },
      };

      const patch = differ.diff(oldState, newState);

      expect(patch).not.toBeNull();
    });

    it("should detect custom state changes", () => {
      const oldState: PluginState = {
        parameters: {},
        custom: { name: "Old" },
      };
      const newState: PluginState = {
        parameters: {},
        custom: { name: "New" },
      };

      const patch = differ.diff(oldState, newState);

      expect(patch).not.toBeNull();
      expect(patch!.custom).toEqual({ name: "New" });
    });

    it("should apply patches correctly", () => {
      const state: PluginState = {
        parameters: { p1: 0.5, p2: 0.5 },
        custom: { name: "Original" },
      };

      const patch = {
        parameters: { p1: 0.75 },
        custom: { name: "Patched" },
        timestamp: Date.now(),
      };

      const patched = differ.patch(state, patch);

      expect(patched.parameters.p1).toBe(0.75);
      expect(patched.parameters.p2).toBe(0.5);
      expect(patched.custom).toEqual({ name: "Patched" });
    });
  });

  describe("createSerializedState", () => {
    it("should create a complete serialized state", () => {
      const state = createSerializedState(
        "com.test.plugin",
        "1.0.0",
        { p1: 0.5 },
        { custom: "data" },
        "My Preset"
      );

      expect(state.version).toBe(CURRENT_STATE_VERSION);
      expect(state.pluginId).toBe("com.test.plugin");
      expect(state.pluginVersion).toBe("1.0.0");
      expect(state.parameters).toEqual({ p1: 0.5 });
      expect(state.customState).toEqual({ custom: "data" });
      expect(state.name).toBe("My Preset");
      expect(state.timestamp).toBeDefined();
    });

    it("should create state without optional fields", () => {
      const state = createSerializedState(
        "com.test.plugin",
        "1.0.0",
        { p1: 0.5 }
      );

      expect(state.customState).toBeUndefined();
      expect(state.name).toBeUndefined();
    });
  });

  describe("normalizeStateForComparison", () => {
    it("should strip runtime-specific fields", () => {
      const state: SerializedState = {
        version: 1,
        pluginId: "com.test.plugin",
        pluginVersion: "1.0.0",
        parameters: {},
        timestamp: 12345,
        name: "Test",
      };

      const normalized = normalizeStateForComparison(state);

      expect(normalized.timestamp).toBeUndefined();
      expect(normalized.name).toBeUndefined();
      expect(normalized.version).toBe(1);
    });
  });

  describe("statesAreEqual", () => {
    it("should return true for identical states", () => {
      const a: SerializedState = {
        version: 1,
        pluginId: "com.test.plugin",
        pluginVersion: "1.0.0",
        parameters: { p1: 0.5 },
        customState: { data: "test" },
      };
      const b: SerializedState = {
        version: 1,
        pluginId: "com.test.plugin",
        pluginVersion: "1.0.0",
        parameters: { p1: 0.5 },
        customState: { data: "test" },
      };

      expect(statesAreEqual(a, b)).toBe(true);
    });

    it("should return false for different plugin IDs", () => {
      const a: SerializedState = {
        version: 1,
        pluginId: "com.test.a",
        pluginVersion: "1.0.0",
        parameters: {},
      };
      const b: SerializedState = {
        version: 1,
        pluginId: "com.test.b",
        pluginVersion: "1.0.0",
        parameters: {},
      };

      expect(statesAreEqual(a, b)).toBe(false);
    });

    it("should return false for different parameters", () => {
      const a: SerializedState = {
        version: 1,
        pluginId: "com.test.plugin",
        pluginVersion: "1.0.0",
        parameters: { p1: 0.5 },
      };
      const b: SerializedState = {
        version: 1,
        pluginId: "com.test.plugin",
        pluginVersion: "1.0.0",
        parameters: { p1: 0.6 },
      };

      expect(statesAreEqual(a, b)).toBe(false);
    });

    it("should use tolerance for float comparison", () => {
      const a: SerializedState = {
        version: 1,
        pluginId: "com.test.plugin",
        pluginVersion: "1.0.0",
        parameters: { p1: 0.50000 },
      };
      const b: SerializedState = {
        version: 1,
        pluginId: "com.test.plugin",
        pluginVersion: "1.0.0",
        parameters: { p1: 0.50001 },
      };

      expect(statesAreEqual(a, b)).toBe(true);
    });

    it("should return false for different custom state", () => {
      const a: SerializedState = {
        version: 1,
        pluginId: "com.test.plugin",
        pluginVersion: "1.0.0",
        parameters: {},
        customState: { a: 1 },
      };
      const b: SerializedState = {
        version: 1,
        pluginId: "com.test.plugin",
        pluginVersion: "1.0.0",
        parameters: {},
        customState: { a: 2 },
      };

      expect(statesAreEqual(a, b)).toBe(false);
    });
  });
});
