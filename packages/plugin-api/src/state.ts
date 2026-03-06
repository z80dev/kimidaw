/**
 * Plugin API - State Serialization
 * 
 * Provides deterministic, versioned state serialization for plugins.
 * Ensures project portability and backwards compatibility.
 */

import type { PluginDefinition, PluginParameterSpec } from "./types.js";

// =============================================================================
// State Schema Versioning
// =============================================================================

export const CURRENT_STATE_VERSION = 1;

export interface SerializedState {
  /** Schema version for migration support */
  version: number;
  /** Plugin identifier */
  pluginId: string;
  /** Plugin version that created this state */
  pluginVersion: string;
  /** Serialized parameter values (normalized) */
  parameters: Record<string, number>;
  /** Plugin-specific custom state */
  customState?: unknown;
  /** Creation timestamp */
  timestamp?: number;
  /** Optional state name/preset */
  name?: string;
}

// =============================================================================
// State Migration
// =============================================================================

export interface StateMigration {
  /** Target version this migration produces */
  toVersion: number;
  /** Migration function */
  migrate: (state: unknown, fromVersion: number) => unknown;
}

export interface MigrationRegistry {
  /** Register a migration */
  register(pluginId: string, migration: StateMigration): void;
  /** Get migrations for a plugin, sorted by version */
  getMigrations(pluginId: string): StateMigration[];
  /** Apply all necessary migrations to reach target version */
  migrate(state: unknown, pluginId: string, targetVersion: number): unknown;
}

export class MigrationRegistryImpl implements MigrationRegistry {
  private _migrations = new Map<string, StateMigration[]>();

  register(pluginId: string, migration: StateMigration): void {
    const existing = this._migrations.get(pluginId) ?? [];
    existing.push(migration);
    // Sort by target version
    existing.sort((a, b) => a.toVersion - b.toVersion);
    this._migrations.set(pluginId, existing);
  }

  getMigrations(pluginId: string): StateMigration[] {
    return [...(this._migrations.get(pluginId) ?? [])];
  }

  migrate(state: unknown, pluginId: string, targetVersion: number): unknown {
    const migrations = this.getMigrations(pluginId);
    let currentState = state;
    let currentVersion = this._getVersion(state);

    for (const migration of migrations) {
      if (currentVersion < migration.toVersion && migration.toVersion <= targetVersion) {
        currentState = migration.migrate(currentState, currentVersion);
        currentVersion = migration.toVersion;
      }
    }

    return currentState;
  }

  private _getVersion(state: unknown): number {
    if (state && typeof state === "object" && "version" in state) {
      return (state as { version: number }).version;
    }
    return 0; // Pre-versioned states are version 0
  }
}

// =============================================================================
// State Serializer
// =============================================================================

export interface StateSerializer {
  /** Serialize plugin state to a JSON-serializable object */
  serialize(state: PluginState): SerializedState;
  /** Deserialize and migrate state to current format */
  deserialize(serialized: unknown, definition: PluginDefinition): PluginState;
  /** Create default state for a plugin */
  createDefault(definition: PluginDefinition): PluginState;
  /** Validate state against plugin definition */
  validate(state: unknown, definition: PluginDefinition): ValidationResult;
}

export interface PluginState {
  /** Parameter values (normalized 0-1) */
  parameters: Record<string, number>;
  /** Custom plugin state (opaque to host) */
  custom?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

export class StateSerializerImpl implements StateSerializer {
  private _migrationRegistry: MigrationRegistry;

  constructor(migrationRegistry?: MigrationRegistry) {
    this._migrationRegistry = migrationRegistry ?? new MigrationRegistryImpl();
  }

  serialize(state: PluginState): SerializedState {
    return {
      version: CURRENT_STATE_VERSION,
      pluginId: "", // Set by caller
      pluginVersion: "",
      parameters: { ...state.parameters },
      customState: state.custom,
      timestamp: Date.now(),
    };
  }

  deserialize(serialized: unknown, definition: PluginDefinition): PluginState {
    // First, ensure we have a valid object
    if (!serialized || typeof serialized !== "object") {
      return this.createDefault(definition);
    }

    const state = serialized as Partial<SerializedState>;

    // Migrate if necessary
    const version = state.version ?? 0;
    let migrated: unknown = state;
    
    if (version < CURRENT_STATE_VERSION) {
      migrated = this._migrationRegistry.migrate(
        state,
        definition.id,
        CURRENT_STATE_VERSION
      );
    }

    const migratedState = migrated as SerializedState;

    // Extract parameters, validating against current spec
    const parameters: Record<string, number> = {};
    
    for (const spec of definition.parameters) {
      const value = migratedState.parameters?.[spec.id];
      if (value !== undefined && typeof value === "number") {
        parameters[spec.id] = clampParameter(value, spec);
      } else {
        parameters[spec.id] = spec.defaultValue;
      }
    }

    return {
      parameters,
      custom: migratedState.customState,
    };
  }

  createDefault(definition: PluginDefinition): PluginState {
    const parameters: Record<string, number> = {};
    
    for (const spec of definition.parameters) {
      parameters[spec.id] = spec.defaultValue;
    }

    return {
      parameters,
      custom: undefined,
    };
  }

  validate(state: unknown, definition: PluginDefinition): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!state || typeof state !== "object") {
      errors.push({
        path: "",
        message: "State must be an object",
        code: "INVALID_TYPE",
      });
      return { valid: false, errors, warnings };
    }

    const s = state as Partial<SerializedState>;

    // Check version
    if (s.version === undefined) {
      warnings.push({
        path: "version",
        message: "Missing version, assuming legacy state",
        code: "MISSING_VERSION",
      });
    } else if (typeof s.version !== "number") {
      errors.push({
        path: "version",
        message: "Version must be a number",
        code: "INVALID_VERSION_TYPE",
      });
    }

    // Validate parameters
    const paramSpecs = new Map(definition.parameters.map(p => [p.id, p]));
    
    if (!s.parameters || typeof s.parameters !== "object") {
      errors.push({
        path: "parameters",
        message: "Parameters must be an object",
        code: "INVALID_PARAMETERS",
      });
    } else {
      for (const [paramId, value] of Object.entries(s.parameters)) {
        const spec = paramSpecs.get(paramId);
        
        if (!spec) {
          warnings.push({
            path: `parameters.${paramId}`,
            message: `Unknown parameter "${paramId}"`,
            code: "UNKNOWN_PARAMETER",
          });
          continue;
        }

        if (typeof value !== "number") {
          errors.push({
            path: `parameters.${paramId}`,
            message: `Parameter "${paramId}" must be a number`,
            code: "INVALID_PARAMETER_TYPE",
          });
          continue;
        }

        if (value < 0 || value > 1) {
          warnings.push({
            path: `parameters.${paramId}`,
            message: `Parameter "${paramId}" value ${value} is outside normalized range [0, 1]`,
            code: "VALUE_OUT_OF_RANGE",
          });
        }
      }

      // Check for missing parameters
      for (const spec of definition.parameters) {
        if (!(spec.id in s.parameters)) {
          warnings.push({
            path: `parameters.${spec.id}`,
            message: `Missing parameter "${spec.id}", will use default`,
            code: "MISSING_PARAMETER",
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// =============================================================================
// State Compression (for large states)
// =============================================================================

export interface StateCompressor {
  /** Compress state for storage */
  compress(state: SerializedState): Uint8Array;
  /** Decompress state from storage */
  decompress(data: Uint8Array): SerializedState;
}

/** Simple compression using TextEncoder/TextDecoder with optional base64 */
export class JsonStateCompressor implements StateCompressor {
  compress(state: SerializedState): Uint8Array {
    const json = JSON.stringify(state);
    return new TextEncoder().encode(json);
  }

  decompress(data: Uint8Array): SerializedState {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json) as SerializedState;
  }
}

// =============================================================================
// State Diff/Patch (for efficient updates)
// =============================================================================

export interface StatePatch {
  /** Parameters that changed */
  parameters?: Record<string, number>;
  /** Custom state patch (opaque) */
  custom?: unknown;
  /** Timestamp of the patch */
  timestamp: number;
}

export interface StateDiffer {
  /** Calculate the difference between two states */
  diff(oldState: PluginState, newState: PluginState): StatePatch | null;
  /** Apply a patch to a state */
  patch(state: PluginState, patch: StatePatch): PluginState;
}

export class StateDifferImpl implements StateDiffer {
  diff(oldState: PluginState, newState: PluginState): StatePatch | null {
    const parameters: Record<string, number> = {};
    let hasChanges = false;

    // Diff parameters
    for (const [key, value] of Object.entries(newState.parameters)) {
      if (oldState.parameters[key] !== value) {
        parameters[key] = value;
        hasChanges = true;
      }
    }

    // Check for removed parameters
    for (const key of Object.keys(oldState.parameters)) {
      if (!(key in newState.parameters)) {
        hasChanges = true;
      }
    }

    // Diff custom state (simple reference check)
    const customChanged = oldState.custom !== newState.custom;

    if (!hasChanges && !customChanged) {
      return null;
    }

    return {
      ...(hasChanges ? { parameters } : {}),
      ...(customChanged ? { custom: newState.custom } : {}),
      timestamp: Date.now(),
    };
  }

  patch(state: PluginState, patch: StatePatch): PluginState {
    return {
      parameters: {
        ...state.parameters,
        ...patch.parameters,
      },
      custom: patch.custom !== undefined ? patch.custom : state.custom,
    };
  }
}

// =============================================================================
// Preset Management
// =============================================================================

export interface Preset {
  id: string;
  name: string;
  category?: string;
  author?: string;
  tags?: string[];
  description?: string;
  state: SerializedState;
  createdAt: number;
  modifiedAt: number;
}

export interface PresetBank {
  id: string;
  name: string;
  pluginId: string;
  presets: Preset[];
}

export interface PresetManager {
  /** Save a preset */
  savePreset(preset: Preset): Promise<void>;
  /** Load a preset by ID */
  loadPreset(presetId: string): Promise<Preset | null>;
  /** Get all presets for a plugin */
  getPresetsForPlugin(pluginId: string): Promise<Preset[]>;
  /** Search presets */
  search(query: string, pluginId?: string): Promise<Preset[]>;
  /** Delete a preset */
  deletePreset(presetId: string): Promise<boolean>;
  /** Export preset to portable format */
  exportPreset(presetId: string): Promise<string>;
  /** Import preset from portable format */
  importPreset(data: string): Promise<Preset>;
}

// =============================================================================
// Utility Functions
// =============================================================================

function clampParameter(value: number, spec: PluginParameterSpec): number {
  let clamped = Math.max(0, Math.min(1, value));
  
  // Snap to step if specified
  if (spec.step && spec.step > 0) {
    const range = spec.max - spec.min;
    const denormal = spec.min + clamped * range;
    const snapped = Math.round(denormal / spec.step) * spec.step;
    clamped = (snapped - spec.min) / range;
  }
  
  return clamped;
}

/** Create a full serialized state with metadata */
export function createSerializedState(
  pluginId: string,
  pluginVersion: string,
  parameters: Record<string, number>,
  customState?: unknown,
  name?: string
): SerializedState {
  return {
    version: CURRENT_STATE_VERSION,
    pluginId,
    pluginVersion,
    parameters: { ...parameters },
    ...(customState !== undefined && { customState }),
    timestamp: Date.now(),
    ...(name && { name }),
  };
}

/** Strip runtime-specific fields for comparison */
export function normalizeStateForComparison(state: SerializedState): SerializedState {
  return {
    ...state,
    timestamp: undefined,
    name: undefined,
  };
}

/** Check if two states are equivalent */
export function statesAreEqual(a: SerializedState, b: SerializedState): boolean {
  if (a.pluginId !== b.pluginId) return false;
  if (a.pluginVersion !== b.pluginVersion) return false;
  
  // Compare parameters
  const aParams = Object.entries(a.parameters).sort();
  const bParams = Object.entries(b.parameters).sort();
  
  if (aParams.length !== bParams.length) return false;
  
  for (let i = 0; i < aParams.length; i++) {
    if (aParams[i][0] !== bParams[i][0]) return false;
    if (Math.abs(aParams[i][1] - bParams[i][1]) > 0.0001) return false;
  }
  
  // Compare custom state (simple JSON comparison)
  if (JSON.stringify(a.customState) !== JSON.stringify(b.customState)) {
    return false;
  }
  
  return true;
}

// Global migration registry singleton
export const globalMigrationRegistry: MigrationRegistry = new MigrationRegistryImpl();

// Global serializer singleton
export const globalStateSerializer: StateSerializer = new StateSerializerImpl(globalMigrationRegistry);
