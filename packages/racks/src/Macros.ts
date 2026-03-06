/**
 * Macro System
 * 
 * 8 Macro knobs per rack with mapping to device parameters.
 * Supports min/max range mapping, curve shaping, and bidirectional updates.
 */

import type { Macro, MacroMapping } from "./types.js";
import { MAX_MACROS, DEFAULT_MACRO_NAMES } from "./types.js";

// =============================================================================
// Constants
// =============================================================================

/** Default macro colors (Ableton Live style) */
export const DEFAULT_MACRO_COLORS = [
  "#FF6B35", // Orange
  "#F7931E", // Yellow-Orange
  "#FFD23F", // Yellow
  "#06FFA5", // Green
  "#118AB2", // Blue
  "#073B4C", // Dark Blue
  "#9B5DE5", // Purple
  "#F15BB5", // Pink
];

/** Curve types for macro mapping */
export type MacroCurveType = "linear" | "exponential" | "logarithmic" | "sCurve";

// =============================================================================
// Macro Mapping Manager
// =============================================================================

/**
 * Manages a single macro mapping with curve and range support
 */
export class MacroMappingManager {
  private _mapping: MacroMapping;
  private _lastSentValue: number | null = null;
  private _threshold = 0.001; // Minimum change to trigger update

  constructor(mapping: MacroMapping) {
    this._mapping = { ...mapping };
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get id(): string {
    return this._mapping.id;
  }

  get deviceId(): string {
    return this._mapping.deviceId;
  }

  get paramId(): string {
    return this._mapping.paramId;
  }

  get minValue(): number {
    return this._mapping.minValue;
  }

  set minValue(value: number) {
    this._mapping.minValue = this._clamp01(value);
  }

  get maxValue(): number {
    return this._mapping.maxValue;
  }

  set maxValue(value: number) {
    this._mapping.maxValue = this._clamp01(value);
  }

  get inverted(): boolean {
    return this._mapping.inverted;
  }

  set inverted(value: boolean) {
    this._mapping.inverted = value;
  }

  get curve(): number {
    return this._mapping.curve;
  }

  set curve(value: number) {
    this._mapping.curve = this._clamp(value, -1, 1);
  }

  get mapping(): MacroMapping {
    return { ...this._mapping };
  }

  // ---------------------------------------------------------------------------
  // Value Mapping
  // ---------------------------------------------------------------------------

  /**
   * Map a macro value (0-1) to the target parameter range
   */
  mapValue(macroValue: number): number {
    // Clamp input
    const input = this._clamp01(macroValue);
    
    // Apply inversion
    const normalized = this._mapping.inverted ? 1 - input : input;
    
    // Apply curve
    const curved = this._applyCurve(normalized, this._mapping.curve);
    
    // Map to target range
    const range = this._mapping.maxValue - this._mapping.minValue;
    return this._mapping.minValue + curved * range;
  }

  /**
   * Reverse map a parameter value to macro value (for bi-directional control)
   */
  reverseMapValue(paramValue: number): number {
    const range = this._mapping.maxValue - this._mapping.minValue;
    if (range === 0) return this._mapping.inverted ? 1 : 0;
    
    // Normalize to 0-1
    let normalized = (paramValue - this._mapping.minValue) / range;
    normalized = this._clamp01(normalized);
    
    // Reverse curve (approximate)
    const reversedCurve = this._mapping.curve * -0.8; // Approximation
    const uncurved = this._applyCurve(normalized, reversedCurve);
    
    // Apply inversion
    return this._mapping.inverted ? 1 - uncurved : uncurved;
  }

  /**
   * Check if value change should trigger an update
   */
  shouldUpdate(newValue: number): boolean {
    if (this._lastSentValue === null) return true;
    return Math.abs(newValue - this._lastSentValue) >= this._threshold;
  }

  /**
   * Mark a value as sent
   */
  markSent(value: number): void {
    this._lastSentValue = value;
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private _clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private _clamp01(value: number): number {
    return this._clamp(value, 0, 1);
  }

  private _applyCurve(value: number, curve: number): number {
    if (curve === 0) return value;
    
    // S-curve approximation
    if (Math.abs(curve) > 0.8) {
      const sign = curve > 0 ? 1 : -1;
      const t = value * 2 - 1; // -1 to 1
      const shaped = sign * t * t * t / 2 + 0.5;
      return this._clamp01(shaped);
    }
    
    // Exponential/logarithmic
    const power = Math.pow(3, Math.abs(curve));
    if (curve > 0) {
      // Logarithmic-like
      return this._clamp01(Math.pow(value, 1 / power));
    } else {
      // Exponential-like
      return this._clamp01(Math.pow(value, power));
    }
  }
}

// =============================================================================
// Macro Controller
// =============================================================================

/**
 * Manages a single macro control with all its mappings
 */
export class MacroController {
  private _macro: Macro;
  private _mappings: Map<string, MacroMappingManager> = new Map();
  private _valueChangedCallbacks: Array<(value: number) => void> = [];

  constructor(macro: Macro) {
    this._macro = { ...macro };
    
    // Initialize mappings
    for (const mapping of macro.mappings) {
      this._mappings.set(mapping.id, new MacroMappingManager(mapping));
    }
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get id(): number {
    return this._macro.id;
  }

  get name(): string {
    return this._macro.name;
  }

  set name(value: string) {
    this._macro.name = value;
  }

  get value(): number {
    return this._macro.value;
  }

  set value(value: number) {
    const newValue = this._clamp01(value);
    if (newValue !== this._macro.value) {
      this._macro.value = newValue;
      this._notifyValueChanged();
    }
  }

  get defaultValue(): number {
    return this._macro.defaultValue;
  }

  set defaultValue(value: number) {
    this._macro.defaultValue = this._clamp01(value);
  }

  get midiCC(): number | null {
    return this._macro.midiCC;
  }

  set midiCC(value: number | null) {
    if (value === null || (value >= 0 && value <= 127)) {
      this._macro.midiCC = value;
    }
  }

  get color(): string | undefined {
    return this._macro.color;
  }

  set color(value: string | undefined) {
    this._macro.color = value;
  }

  get mappingCount(): number {
    return this._mappings.size;
  }

  // ---------------------------------------------------------------------------
  // Value Operations
  // ---------------------------------------------------------------------------

  /**
   * Reset to default value
   */
  resetToDefault(): void {
    this.value = this._macro.defaultValue;
  }

  /**
   * Set value from MIDI (0-127)
   */
  setMidiValue(midiValue: number): void {
    this.value = midiValue / 127;
  }

  /**
   * Get value as MIDI (0-127)
   */
  getMidiValue(): number {
    return Math.round(this._macro.value * 127);
  }

  /**
   * Increment/decrement value
   */
  nudge(delta: number): void {
    this.value = this._macro.value + delta;
  }

  // ---------------------------------------------------------------------------
  // Mapping Management
  // ---------------------------------------------------------------------------

  /**
   * Add a new parameter mapping
   */
  addMapping(mapping: Omit<MacroMapping, "id">): MacroMapping {
    const fullMapping: MacroMapping = {
      ...mapping,
      id: this._generateMappingId(),
    };
    
    const manager = new MacroMappingManager(fullMapping);
    this._mappings.set(fullMapping.id, manager);
    this._macro.mappings.push(fullMapping);
    
    return fullMapping;
  }

  /**
   * Remove a mapping
   */
  removeMapping(mappingId: string): boolean {
    const removed = this._mappings.delete(mappingId);
    if (removed) {
      this._macro.mappings = this._macro.mappings.filter(m => m.id !== mappingId);
    }
    return removed;
  }

  /**
   * Get all mappings
   */
  getMappings(): MacroMappingManager[] {
    return Array.from(this._mappings.values());
  }

  /**
   * Get mappings for a specific device
   */
  getMappingsForDevice(deviceId: string): MacroMappingManager[] {
    return this.getMappings().filter(m => m.deviceId === deviceId);
  }

  /**
   * Update a mapping
   */
  updateMapping(mappingId: string, updates: Partial<Omit<MacroMapping, "id">>): boolean {
    const manager = this._mappings.get(mappingId);
    if (!manager) return false;

    if (updates.minValue !== undefined) manager.minValue = updates.minValue;
    if (updates.maxValue !== undefined) manager.maxValue = updates.maxValue;
    if (updates.inverted !== undefined) manager.inverted = updates.inverted;
    if (updates.curve !== undefined) manager.curve = updates.curve;

    // Update stored mapping
    const index = this._macro.mappings.findIndex(m => m.id === mappingId);
    if (index >= 0) {
      this._macro.mappings[index] = manager.mapping;
    }

    return true;
  }

  /**
   * Remove all mappings for a device
   */
  removeMappingsForDevice(deviceId: string): number {
    const toRemove: string[] = [];
    for (const [id, mapping] of this._mappings) {
      if (mapping.deviceId === deviceId) {
        toRemove.push(id);
      }
    }
    
    for (const id of toRemove) {
      this.removeMapping(id);
    }
    
    return toRemove.length;
  }

  // ---------------------------------------------------------------------------
  // Value Distribution
  // ---------------------------------------------------------------------------

  /**
   * Get all mapped parameter values for the current macro value
   * Returns: Map<deviceId, Map<paramId, value>>
   */
  getMappedValues(): Map<string, Map<string, number>> {
    const result = new Map<string, Map<string, number>>();

    for (const mapping of this._mappings.values()) {
      const deviceMap = result.get(mapping.deviceId) ?? new Map<string, number>();
      const mappedValue = mapping.mapValue(this._macro.value);
      
      if (mapping.shouldUpdate(mappedValue)) {
        deviceMap.set(mapping.paramId, mappedValue);
        mapping.markSent(mappedValue);
      }
      
      result.set(mapping.deviceId, deviceMap);
    }

    return result;
  }

  /**
   * Process all mappings and return device parameter updates
   */
  processMappings(): Array<{ deviceId: string; paramId: string; value: number }> {
    const updates: Array<{ deviceId: string; paramId: string; value: number }> = [];

    for (const mapping of this._mappings.values()) {
      const mappedValue = mapping.mapValue(this._macro.value);
      
      if (mapping.shouldUpdate(mappedValue)) {
        updates.push({
          deviceId: mapping.deviceId,
          paramId: mapping.paramId,
          value: mappedValue,
        });
        mapping.markSent(mappedValue);
      }
    }

    return updates;
  }

  // ---------------------------------------------------------------------------
  // Event Handling
  // ---------------------------------------------------------------------------

  onValueChanged(callback: (value: number) => void): () => void {
    this._valueChangedCallbacks.push(callback);
    return () => {
      const index = this._valueChangedCallbacks.indexOf(callback);
      if (index >= 0) {
        this._valueChangedCallbacks.splice(index, 1);
      }
    };
  }

  private _notifyValueChanged(): void {
    for (const callback of this._valueChangedCallbacks) {
      callback(this._macro.value);
    }
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  toJSON(): Macro {
    return {
      ...this._macro,
      mappings: this.getMappings().map(m => m.mapping),
    };
  }

  static fromJSON(data: Macro): MacroController {
    return new MacroController(data);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private _clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private _generateMappingId(): string {
    return `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =============================================================================
// Macro Bank
// =============================================================================

/**
 * Manages all 8 macros for a rack
 */
export class MacroBank {
  private _macros: Map<number, MacroController> = new Map();
  private _anyMacroChangedCallbacks: Array<(macroId: number, value: number) => void> = [];

  constructor(macros?: Macro[]) {
    if (macros && macros.length > 0) {
      for (const macro of macros) {
        this._macros.set(macro.id, new MacroController(macro));
      }
    } else {
      this._initializeDefaultMacros();
    }

    // Subscribe to value changes
    for (const [id, macro] of this._macros) {
      macro.onValueChanged((value) => {
        this._notifyAnyMacroChanged(id, value);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  private _initializeDefaultMacros(): void {
    for (let i = 1; i <= MAX_MACROS; i++) {
      const macro: Macro = {
        id: i,
        name: DEFAULT_MACRO_NAMES[i - 1],
        value: 0,
        defaultValue: 0,
        mappings: [],
        midiCC: null,
        color: DEFAULT_MACRO_COLORS[i - 1],
      };
      this._macros.set(i, new MacroController(macro));
    }
  }

  // ---------------------------------------------------------------------------
  // Access
  // ---------------------------------------------------------------------------

  getMacro(id: number): MacroController | undefined {
    return this._macros.get(id);
  }

  getAllMacros(): MacroController[] {
    return Array.from(this._macros.values()).sort((a, b) => a.id - b.id);
  }

  /**
   * Set macro value by ID
   */
  setMacroValue(id: number, value: number): boolean {
    const macro = this._macros.get(id);
    if (macro) {
      macro.value = value;
      return true;
    }
    return false;
  }

  /**
   * Get macro value by ID
   */
  getMacroValue(id: number): number | undefined {
    return this._macros.get(id)?.value;
  }

  /**
   * Reset all macros to default
   */
  resetAllToDefault(): void {
    for (const macro of this._macros.values()) {
      macro.resetToDefault();
    }
  }

  /**
   * Randomize all unmapped macros
   */
  randomizeUnmapped(): void {
    for (const macro of this._macros.values()) {
      if (macro.mappingCount === 0) {
        macro.value = Math.random();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // MIDI Learn
  // ---------------------------------------------------------------------------

  /**
   * Assign a MIDI CC to a macro
   */
  assignMidiCC(macroId: number, cc: number | null): boolean {
    // Remove existing assignment if any
    if (cc !== null) {
      for (const macro of this._macros.values()) {
        if (macro.midiCC === cc && macro.id !== macroId) {
          macro.midiCC = null;
        }
      }
    }

    const macro = this._macros.get(macroId);
    if (macro) {
      macro.midiCC = cc;
      return true;
    }
    return false;
  }

  /**
   * Handle incoming MIDI CC
   */
  handleMidiCC(cc: number, value: number): boolean {
    for (const macro of this._macros.values()) {
      if (macro.midiCC === cc) {
        macro.setMidiValue(value);
        return true;
      }
    }
    return false;
  }

  /**
   * Clear all MIDI assignments
   */
  clearAllMidiAssignments(): void {
    for (const macro of this._macros.values()) {
      macro.midiCC = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Bulk Operations
  // ---------------------------------------------------------------------------

  /**
   * Process all macros and get all parameter updates
   */
  processAllMappings(): Array<{ macroId: number; deviceId: string; paramId: string; value: number }> {
    const allUpdates: Array<{ macroId: number; deviceId: string; paramId: string; value: number }> = [];

    for (const macro of this._macros.values()) {
      const updates = macro.processMappings();
      for (const update of updates) {
        allUpdates.push({
          macroId: macro.id,
          ...update,
        });
      }
    }

    return allUpdates;
  }

  /**
   * Remove all mappings for a device
   */
  removeDeviceMappings(deviceId: string): number {
    let totalRemoved = 0;
    for (const macro of this._macros.values()) {
      totalRemoved += macro.removeMappingsForDevice(deviceId);
    }
    return totalRemoved;
  }

  /**
   * Get total mapping count across all macros
   */
  getTotalMappingCount(): number {
    let count = 0;
    for (const macro of this._macros.values()) {
      count += macro.mappingCount;
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Event Handling
  // ---------------------------------------------------------------------------

  onAnyMacroChanged(callback: (macroId: number, value: number) => void): () => void {
    this._anyMacroChangedCallbacks.push(callback);
    return () => {
      const index = this._anyMacroChangedCallbacks.indexOf(callback);
      if (index >= 0) {
        this._anyMacroChangedCallbacks.splice(index, 1);
      }
    };
  }

  private _notifyAnyMacroChanged(macroId: number, value: number): void {
    for (const callback of this._anyMacroChangedCallbacks) {
      callback(macroId, value);
    }
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  toJSON(): Macro[] {
    return this.getAllMacros().map(m => m.toJSON());
  }

  static fromJSON(data: Macro[]): MacroBank {
    return new MacroBank(data);
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /**
   * Rename a macro
   */
  renameMacro(id: number, name: string): boolean {
    const macro = this._macros.get(id);
    if (macro) {
      macro.name = name;
      return true;
    }
    return false;
  }

  /**
   * Swap two macros (exchange IDs)
   */
  swapMacros(id1: number, id2: number): boolean {
    const macro1 = this._macros.get(id1);
    const macro2 = this._macros.get(id2);
    
    if (!macro1 || !macro2) return false;

    // Swap IDs
    const tempId = -1;
    (macro1 as unknown as { _macro: Macro })._macro.id = tempId;
    (macro2 as unknown as { _macro: Macro })._macro.id = id1;
    (macro1 as unknown as { _macro: Macro })._macro.id = id2;

    // Rebuild map
    this._macros.clear();
    this._macros.set(id1, macro2);
    this._macros.set(id2, macro1);

    return true;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a new macro mapping with sensible defaults
 */
export function createMacroMapping(
  deviceId: string,
  paramId: string,
  options?: Partial<Omit<MacroMapping, "id" | "deviceId" | "paramId">>
): Omit<MacroMapping, "id"> {
  return {
    deviceId,
    paramId,
    minValue: options?.minValue ?? 0,
    maxValue: options?.maxValue ?? 1,
    inverted: options?.inverted ?? false,
    curve: options?.curve ?? 0,
  };
}

/**
 * Validate a macro value
 */
export function isValidMacroValue(value: number): boolean {
  return typeof value === "number" && value >= 0 && value <= 1;
}

/**
 * Validate a MIDI CC number
 */
export function isValidMidiCC(cc: number): boolean {
  return Number.isInteger(cc) && cc >= 0 && cc <= 127;
}
