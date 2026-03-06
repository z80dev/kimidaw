/**
 * Plugin API - Parameter System
 * 
 * Realtime-safe parameter management with smoothing and modulation support.
 * Follows the engineering spec section 11.2 and 25.2 AudioWorklet rules.
 */

import type { PluginParameterSpec, ParameterKind, ModulationRoute } from "./types.js";

// =============================================================================
// Parameter Value Conversions
// =============================================================================

export type NormalizedValue = number;  // 0.0 to 1.0
export type DenormalizedValue = number;  // Actual parameter range

export interface ParameterConverter {
  toNormalized(denormal: DenormalizedValue): NormalizedValue;
  fromNormalized(normal: NormalizedValue): DenormalizedValue;
}

/** Linear conversion (default) */
export function createLinearConverter(min: number, max: number): ParameterConverter {
  const range = max - min;
  return {
    toNormalized: (denormal: number) => (denormal - min) / range,
    fromNormalized: (normal: number) => min + normal * range,
  };
}

/** Logarithmic conversion for frequency values */
export function createLogConverter(min: number, max: number): ParameterConverter {
  const logMin = Math.log(Math.max(min, 0.001));
  const logMax = Math.log(max);
  const range = logMax - logMin;
  return {
    toNormalized: (denormal: number) => (Math.log(denormal) - logMin) / range,
    fromNormalized: (normal: number) => Math.exp(logMin + normal * range),
  };
}

/** Exponential conversion for time values */
export function createExpConverter(min: number, max: number, factor = 3): ParameterConverter {
  return {
    toNormalized: (denormal: number) => {
      const t = (denormal - min) / (max - min);
      return (Math.exp(factor * t) - 1) / (Math.exp(factor) - 1);
    },
    fromNormalized: (normal: number) => {
      const t = Math.log(1 + normal * (Math.exp(factor) - 1)) / factor;
      return min + t * (max - min);
    },
  };
}

/** Frequency converter (20Hz - 20kHz typical) */
export function createFrequencyConverter(min = 20, max = 20000): ParameterConverter {
  return createLogConverter(min, max);
}

/** Decibel converter */
export function createDbConverter(minDb = -96, maxDb = 24): ParameterConverter {
  return {
    toNormalized: (db: number) => (db - minDb) / (maxDb - minDb),
    fromNormalized: (normal: number) => minDb + normal * (maxDb - minDb),
  };
}

// =============================================================================
// Parameter Instance (Runtime)
// =============================================================================

export interface ParameterInstance {
  readonly spec: PluginParameterSpec;
  readonly converter: ParameterConverter;
  /** Current normalized value */
  readonly normalizedValue: number;
  /** Current denormalized value */
  readonly value: number;
  /** Set normalized value (immediate) */
  setNormalized(value: number): void;
  /** Set denormalized value (immediate) */
  setValue(value: number): void;
  /** Set with smoothing */
  setTarget(value: number, timeConstantMs: number, sampleRate: number): void;
  /** Process one sample of smoothing (call in process loop) */
  processSmoothing(): void;
  /** Get string representation for display */
  toString(): string;
  /** Reset to default */
  reset(): void;
}

/** Create a parameter instance from spec */
export function createParameter(spec: PluginParameterSpec): ParameterInstance {
  // Choose appropriate converter based on unit hint
  let converter: ParameterConverter;
  
  switch (spec.unit?.toLowerCase()) {
    case "hz":
      converter = createFrequencyConverter(spec.min, spec.max);
      break;
    case "db":
      converter = createDbConverter(spec.min, spec.max);
      break;
    case "ms":
    case "s":
      converter = createExpConverter(spec.min, spec.max);
      break;
    default:
      converter = createLinearConverter(spec.min, spec.max);
  }
  
  return new ParameterInstanceImpl(spec, converter);
}

class ParameterInstanceImpl implements ParameterInstance {
  private _normalizedValue: number;
  private _targetNormalized: number;
  private _smoothingCoeff: number;
  private _isSmoothing: boolean;

  constructor(
    readonly spec: PluginParameterSpec,
    readonly converter: ParameterConverter
  ) {
    this._normalizedValue = this._clamp(spec.defaultValue);
    this._targetNormalized = this._normalizedValue;
    this._smoothingCoeff = 0;
    this._isSmoothing = false;
  }

  get normalizedValue(): number {
    return this._normalizedValue;
  }

  get value(): number {
    return this.converter.fromNormalized(this._normalizedValue);
  }

  setNormalized(value: number): void {
    this._normalizedValue = this._clamp(value);
    this._targetNormalized = this._normalizedValue;
    this._isSmoothing = false;
  }

  setValue(value: number): void {
    this.setNormalized(this.converter.toNormalized(value));
  }

  setTarget(value: number, timeConstantMs: number, sampleRate: number): void {
    this._targetNormalized = this._clamp(this.converter.toNormalized(value));
    
    // Calculate smoothing coefficient: 1 - exp(-1/(τ * sr))
    // where τ is the time constant in seconds
    const tau = timeConstantMs / 1000;
    this._smoothingCoeff = 1 - Math.exp(-1 / (tau * sampleRate));
    this._isSmoothing = true;
  }

  processSmoothing(): void {
    if (!this._isSmoothing) return;
    
    // One-pole smoothing
    const diff = this._targetNormalized - this._normalizedValue;
    
    if (Math.abs(diff) < 0.00001) {
      this._normalizedValue = this._targetNormalized;
      this._isSmoothing = false;
    } else {
      this._normalizedValue += diff * this._smoothingCoeff;
    }
  }

  toString(): string {
    const val = this.value;
    
    if (this.spec.kind === "bool") {
      return val >= 0.5 ? "On" : "Off";
    }
    
    if (this.spec.kind === "enum" && this.spec.labels) {
      const index = Math.round(val);
      return this.spec.labels[index] ?? String(index);
    }
    
    if (this.spec.kind === "int") {
      return String(Math.round(val)) + (this.spec.unit ?? "");
    }
    
    // Float - format appropriately based on range
    const range = this.spec.max - this.spec.min;
    const decimals = range < 1 ? 3 : range < 10 ? 2 : range < 100 ? 1 : 0;
    return val.toFixed(decimals) + (this.spec.unit ?? "");
  }

  reset(): void {
    this.setNormalized(this.spec.defaultValue);
  }

  private _clamp(normalized: number): number {
    return Math.max(0, Math.min(1, normalized));
  }
}

// =============================================================================
// Parameter Map (Collection)
// =============================================================================

export interface ParameterMap {
  /** Get parameter by ID */
  get(id: string): ParameterInstance | undefined;
  /** Get all parameter IDs */
  keys(): string[];
  /** Get all parameters */
  values(): ParameterInstance[];
  /** Check if parameter exists */
  has(id: string): boolean;
  /** Process smoothing for all parameters */
  processSmoothing(): void;
  /** Set multiple parameters from normalized values */
  setNormalizedValues(values: Record<string, number>): void;
  /** Get all normalized values */
  getNormalizedValues(): Record<string, number>;
  /** Get all denormalized values */
  getValues(): Record<string, number>;
  /** Reset all to defaults */
  resetAll(): void;
}

export function createParameterMap(specs: PluginParameterSpec[]): ParameterMap {
  const params = new Map<string, ParameterInstance>();
  
  for (const spec of specs) {
    params.set(spec.id, createParameter(spec));
  }
  
  return new ParameterMapImpl(params);
}

class ParameterMapImpl implements ParameterMap {
  constructor(private readonly _params: Map<string, ParameterInstance>) {}

  get(id: string): ParameterInstance | undefined {
    return this._params.get(id);
  }

  keys(): string[] {
    return Array.from(this._params.keys());
  }

  values(): ParameterInstance[] {
    return Array.from(this._params.values());
  }

  has(id: string): boolean {
    return this._params.has(id);
  }

  processSmoothing(): void {
    for (const param of this._params.values()) {
      param.processSmoothing();
    }
  }

  setNormalizedValues(values: Record<string, number>): void {
    for (const [id, value] of Object.entries(values)) {
      const param = this._params.get(id);
      if (param) {
        param.setNormalized(value);
      }
    }
  }

  getNormalizedValues(): Record<string, number> {
    const values: Record<string, number> = {};
    for (const [id, param] of this._params) {
      values[id] = param.normalizedValue;
    }
    return values;
  }

  getValues(): Record<string, number> {
    const values: Record<string, number> = {};
    for (const [id, param] of this._params) {
      values[id] = param.value;
    }
    return values;
  }

  resetAll(): void {
    for (const param of this._params.values()) {
      param.reset();
    }
  }
}

// =============================================================================
// Realtime-Safe Parameter Change Queue
// =============================================================================

export interface ParameterChangeQueue {
  /** Enqueue a parameter change (thread-safe, lock-free) */
  enqueue(paramId: string, normalizedValue: number, sampleOffset: number): void;
  /** Process pending changes up to blockSize (call at start of process()) */
  processBlock(blockSize: number, callback: (paramId: string, value: number, sampleOffset: number) => void): void;
  /** Clear all pending changes */
  clear(): void;
}

interface QueuedChange {
  paramId: string;
  normalizedValue: number;
  sampleOffset: number;
}

/** Simple ring buffer implementation for parameter changes */
export class ParameterChangeQueueImpl implements ParameterChangeQueue {
  private readonly _buffer: (QueuedChange | null)[];
  private _writeIndex = 0;
  private _readIndex = 0;
  private _size: number;

  constructor(capacity = 256) {
    // Capacity must be power of 2 for efficient masking
    this._size = 1;
    while (this._size < capacity) {
      this._size <<= 1;
    }
    this._buffer = new Array(this._size).fill(null);
  }

  enqueue(paramId: string, normalizedValue: number, sampleOffset: number): void {
    const nextWrite = (this._writeIndex + 1) & (this._size - 1);
    
    // If queue is full, drop the oldest item
    if (nextWrite === this._readIndex) {
      this._readIndex = (this._readIndex + 1) & (this._size - 1);
    }
    
    this._buffer[this._writeIndex] = { paramId, normalizedValue, sampleOffset };
    this._writeIndex = nextWrite;
  }

  processBlock(blockSize: number, callback: (paramId: string, value: number, sampleOffset: number) => void): void {
    while (this._readIndex !== this._writeIndex) {
      const change = this._buffer[this._readIndex];
      if (!change) break;
      
      // Only process changes within this block
      if (change.sampleOffset >= blockSize) {
        // Adjust offset for next block and stop
        change.sampleOffset -= blockSize;
        break;
      }
      
      callback(change.paramId, change.normalizedValue, change.sampleOffset);
      this._buffer[this._readIndex] = null;
      this._readIndex = (this._readIndex + 1) & (this._size - 1);
    }
  }

  clear(): void {
    this._readIndex = 0;
    this._writeIndex = 0;
    this._buffer.fill(null);
  }
}

// =============================================================================
// Modulation Matrix
// =============================================================================

export interface ModulationMatrix {
  /** Add a modulation route */
  addRoute(route: ModulationRoute): void;
  /** Remove a modulation route */
  removeRoute(sourceId: string, targetParamId: string): void;
  /** Get all routes affecting a parameter */
  getRoutesForParam(paramId: string): ModulationRoute[];
  /** Process modulation for all parameters */
  processModulation(baseValues: Map<string, number>): Map<string, number>;
  /** Clear all routes */
  clear(): void;
}

export class ModulationMatrixImpl implements ModulationMatrix {
  private _routes: ModulationRoute[] = [];

  addRoute(route: ModulationRoute): void {
    // Remove existing route between same source/target
    this.removeRoute(route.sourceId, route.targetParamId);
    this._routes.push(route);
  }

  removeRoute(sourceId: string, targetParamId: string): void {
    this._routes = this._routes.filter(
      r => !(r.sourceId === sourceId && r.targetParamId === targetParamId)
    );
  }

  getRoutesForParam(paramId: string): ModulationRoute[] {
    return this._routes.filter(r => r.targetParamId === paramId);
  }

  processModulation(baseValues: Map<string, number>): Map<string, number> {
    // Group routes by target
    const routesByTarget = new Map<string, ModulationRoute[]>();
    
    for (const route of this._routes) {
      const existing = routesByTarget.get(route.targetParamId) ?? [];
      existing.push(route);
      routesByTarget.set(route.targetParamId, existing);
    }
    
    // Apply modulation
    const result = new Map(baseValues);
    
    for (const [paramId, routes] of routesByTarget) {
      let baseValue = baseValues.get(paramId) ?? 0;
      let modulationSum = 0;
      
      for (const route of routes) {
        // In a real implementation, we'd look up the source value
        // For now, assume modulation amount is applied directly
        const sourceValue = 1; // Would be: modulationSources.get(route.sourceId).getValue()
        const modAmount = route.amount * sourceValue;
        modulationSum += route.bipolar ? modAmount * 2 : modAmount;
      }
      
      // Apply modulation (clamped to reasonable range)
      result.set(paramId, Math.max(0, Math.min(1, baseValue + modulationSum)));
    }
    
    return result;
  }

  clear(): void {
    this._routes = [];
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/** Snap a value to the parameter's step size */
export function snapToStep(value: number, step?: number): number {
  if (!step || step <= 0) return value;
  return Math.round(value / step) * step;
}

/** Format a parameter value for display */
export function formatParameterValue(
  value: number, 
  kind: ParameterKind, 
  unit?: string,
  labels?: string[]
): string {
  if (kind === "bool") {
    return value >= 0.5 ? "On" : "Off";
  }
  
  if (kind === "enum" && labels) {
    const index = Math.max(0, Math.min(labels.length - 1, Math.round(value)));
    return labels[index] ?? String(index);
  }
  
  if (kind === "int") {
    return String(Math.round(value)) + (unit ?? "");
  }
  
  // Float
  return value.toFixed(2) + (unit ?? "");
}

/** Clamp a value to [0, 1] range */
export function clampNormalized(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Map a value from one range to another */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

/** Convert MIDI note number to frequency in Hz */
export function midiToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** Convert frequency in Hz to MIDI note number */
export function frequencyToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

/** Convert decibels to linear gain */
export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/** Convert linear gain to decibels */
export function gainToDb(gain: number): number {
  if (gain <= 0) return -Infinity;
  return 20 * Math.log10(gain);
}
