/**
 * Table Object - Max/MSP table and coll equivalent
 * 
 * Data storage and lookup tables:
 * - Numeric lookup tables
 * - Key-value collections (coll)
 * - Interpolation methods
 * - File import/export
 */

// =============================================================================
// Table Object (Numeric Lookup Table)
// =============================================================================

export class TableObject {
  private _name: string;
  private _data: Float32Array;
  private _size: number;
  private _minValue: number;
  private _maxValue: number;
  private _dirty = false;

  constructor(name: string, size = 128) {
    this._name = name;
    this._size = size;
    this._data = new Float32Array(size);
    this._minValue = 0;
    this._maxValue = size - 1;
  }

  get name(): string {
    return this._name;
  }

  get size(): number {
    return this._size;
  }

  get minValue(): number {
    return this._minValue;
  }

  get maxValue(): number {
    return this._maxValue;
  }

  /**
   * Set the range for input values (for lookup)
   */
  setRange(min: number, max: number): void {
    this._minValue = min;
    this._maxValue = max;
  }

  /**
   * Get value at index
   */
  get(index: number): number {
    const idx = Math.floor(index);
    if (idx < 0 || idx >= this._size) return 0;
    return this._data[idx];
  }

  /**
   * Set value at index
   */
  set(index: number, value: number): void {
    const idx = Math.floor(index);
    if (idx < 0 || idx >= this._size) return;
    this._data[idx] = value;
    this._dirty = true;
  }

  /**
   * Lookup value with interpolation
   */
  lookup(input: number, interpolate: "none" | "linear" | "cosine" = "linear"): number {
    // Map input range to table indices
    const normalized = (input - this._minValue) / (this._maxValue - this._minValue);
    const position = normalized * (this._size - 1);
    
    switch (interpolate) {
      case "none":
        return this.get(Math.round(position));
        
      case "linear": {
        const index = Math.floor(position);
        const frac = position - index;
        const v1 = this.get(index);
        const v2 = this.get(index + 1);
        return v1 + (v2 - v1) * frac;
      }
      
      case "cosine": {
        const index = Math.floor(position);
        const frac = position - index;
        const cosineFrac = (1 - Math.cos(frac * Math.PI)) / 2;
        const v1 = this.get(index);
        const v2 = this.get(index + 1);
        return v1 + (v2 - v1) * cosineFrac;
      }
        
      default:
        return this.get(Math.round(position));
    }
  }

  /**
   * Inverse lookup: find input that produces given output
   */
  invLookup(targetValue: number): number | null {
    // Find closest match
    let closestIndex = 0;
    let closestDiff = Math.abs(this._data[0] - targetValue);
    
    for (let i = 1; i < this._size; i++) {
      const diff = Math.abs(this._data[i] - targetValue);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }
    
    if (closestDiff > 0.001) return null;
    
    // Map index back to input range
    return this._minValue + (closestIndex / (this._size - 1)) * (this._maxValue - this._minValue);
  }

  /**
   * Fill with constant value
   */
  constant(value: number): void {
    this._data.fill(value);
    this._dirty = true;
  }

  /**
   * Generate ramp from start to end
   */
  ramp(start = 0, end = this._size - 1, min = 0, max = 1): void {
    for (let i = 0; i < this._size; i++) {
      const t = i / (this._size - 1);
      this._data[i] = min + (max - min) * t;
    }
    this._dirty = true;
  }

  /**
   * Generate sine wave
   */
  sine(periods = 1, min = -1, max = 1): void {
    for (let i = 0; i < this._size; i++) {
      const phase = (i / this._size) * periods * 2 * Math.PI;
      this._data[i] = min + (max - min) * (0.5 + 0.5 * Math.sin(phase));
    }
    this._dirty = true;
  }

  /**
   * Generate cosine window
   */
  cosWindow(): void {
    for (let i = 0; i < this._size; i++) {
      this._data[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (this._size - 1));
    }
    this._dirty = true;
  }

  /**
   * Generate hanning window
   */
  hanning(): void {
    for (let i = 0; i < this._size; i++) {
      this._data[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (this._size - 1)));
    }
    this._dirty = true;
  }

  /**
   * Generate hamming window
   */
  hamming(): void {
    for (let i = 0; i < this._size; i++) {
      this._data[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (this._size - 1));
    }
    this._dirty = true;
  }

  /**
   * Invert values
   */
  invert(): void {
    const max = Math.max(...this._data);
    for (let i = 0; i < this._size; i++) {
      this._data[i] = max - this._data[i];
    }
    this._dirty = true;
  }

  /**
   * Normalize to range
   */
  normalize(min = 0, max = 1): void {
    const currentMin = Math.min(...this._data);
    const currentMax = Math.max(...this._data);
    const range = currentMax - currentMin;
    
    if (range > 0) {
      for (let i = 0; i < this._size; i++) {
        const normalized = (this._data[i] - currentMin) / range;
        this._data[i] = min + normalized * (max - min);
      }
    }
    this._dirty = true;
  }

  /**
   * Dump table contents
   */
  dump(): number[] {
    return Array.from(this._data);
  }

  /**
   * Load from array
   */
  load(data: number[]): void {
    const length = Math.min(data.length, this._size);
    for (let i = 0; i < length; i++) {
      this._data[i] = data[i] ?? 0;
    }
    this._dirty = true;
  }

  /**
   * Get the raw data buffer
   */
  getData(): Float32Array {
    return this._data;
  }

  /**
   * Copy data to another table
   */
  copyTo(destination: TableObject): void {
    const length = Math.min(this._size, destination.size);
    for (let i = 0; i < length; i++) {
      destination.set(i, this._data[i]);
    }
  }

  /**
   * Add values from another table
   */
  add(other: TableObject): void {
    const length = Math.min(this._size, other.size);
    for (let i = 0; i < length; i++) {
      this._data[i] += other.get(i);
    }
    this._dirty = true;
  }

  /**
   * Multiply by values from another table
   */
  multiply(other: TableObject): void {
    const length = Math.min(this._size, other.size);
    for (let i = 0; i < length; i++) {
      this._data[i] *= other.get(i);
    }
    this._dirty = true;
  }

  markClean(): void {
    this._dirty = false;
  }

  get isDirty(): boolean {
    return this._dirty;
  }
}

// =============================================================================
// Coll Object (Key-Value Collection)
// =============================================================================

export type CollValue = number | string | number[] | string[];

export interface CollEntry {
  key: string | number;
  value: CollValue;
  index: number;
}

export class CollObject {
  private _name: string;
  private _data: Map<string | number, CollValue> = new Map();
  private _keys: (string | number)[] = [];
  private _dirty = false;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  get length(): number {
    return this._keys.length;
  }

  /**
   * Store value at key
   */
  store(key: string | number, value: CollValue): void {
    if (!this._data.has(key)) {
      this._keys.push(key);
    }
    this._data.set(key, value);
    this._dirty = true;
  }

  /**
   * Retrieve value at key
   */
  retrieve(key: string | number): CollValue | undefined {
    return this._data.get(key);
  }

  /**
   * Delete entry at key
   */
  delete(key: string | number): boolean {
    if (this._data.has(key)) {
      this._data.delete(key);
      this._keys = this._keys.filter(k => k !== key);
      this._dirty = true;
      return true;
    }
    return false;
  }

  /**
   * Get entry at index
   */
  atIndex(index: number): CollEntry | undefined {
    if (index < 0 || index >= this._keys.length) return undefined;
    const key = this._keys[index];
    return {
      key,
      value: this._data.get(key)!,
      index,
    };
  }

  /**
   * Find key by value
   */
  find(value: CollValue): string | number | undefined {
    for (const [key, val] of this._data) {
      if (this._valuesEqual(val, value)) {
        return key;
      }
    }
    return undefined;
  }

  /**
   * Get all keys
   */
  keys(): (string | number)[] {
    return [...this._keys];
  }

  /**
   * Get all values
   */
  values(): CollValue[] {
    return this._keys.map(key => this._data.get(key)!);
  }

  /**
   * Get all entries
   */
  entries(): CollEntry[] {
    return this._keys.map((key, index) => ({
      key,
      value: this._data.get(key)!,
      index,
    }));
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this._data.clear();
    this._keys = [];
    this._dirty = true;
  }

  /**
   * Insert value at numeric key, shifting existing entries
   */
  insert(key: number, value: CollValue): void {
    // Remove existing if present
    if (this._data.has(key)) {
      this.delete(key);
    }

    // Shift numeric keys >= key
    const newKeys: (string | number)[] = [];
    for (const k of this._keys) {
      if (typeof k === "number" && k >= key) {
        newKeys.push(k + 1);
      } else {
        newKeys.push(k);
      }
    }

    // Rebuild data map
    const newData = new Map<string | number, CollValue>();
    for (let i = 0; i < this._keys.length; i++) {
      const oldKey = this._keys[i];
      const newKey = newKeys[i];
      newData.set(newKey, this._data.get(oldKey)!);
    }

    // Insert new value
    newData.set(key, value);
    newKeys.splice(key, 0, key);

    this._data = newData;
    this._keys = newKeys;
    this._dirty = true;
  }

  /**
   * Merge another coll into this one
   */
  merge(other: CollObject, overwrite = true): void {
    for (const { key, value } of other.entries()) {
      if (overwrite || !this._data.has(key)) {
        this.store(key, value);
      }
    }
  }

  /**
   * Sort by keys
   */
  sort(ascending = true): void {
    this._keys.sort((a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return ascending ? a - b : b - a;
      }
      const aStr = String(a);
      const bStr = String(b);
      return ascending ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    this._dirty = true;
  }

  /**
   * Export to object
   */
  toObject(): Record<string, CollValue> {
    const obj: Record<string, CollValue> = {};
    for (const [key, value] of this._data) {
      obj[String(key)] = value;
    }
    return obj;
  }

  /**
   * Import from object
   */
  fromObject(obj: Record<string, CollValue>): void {
    this.clear();
    for (const [key, value] of Object.entries(obj)) {
      const numKey = Number(key);
      this.store(isNaN(numKey) ? key : numKey, value);
    }
  }

  /**
   * Export to text format (for file)
   */
  toText(): string {
    const lines: string[] = [];
    for (const { key, value } of this.entries()) {
      const valueStr = Array.isArray(value) ? value.join(" ") : String(value);
      lines.push(`${key}, ${valueStr};`);
    }
    return lines.join("\n");
  }

  /**
   * Import from text format
   */
  fromText(text: string): void {
    this.clear();
    const lines = text.split("\n");
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      
      // Remove trailing semicolon
      const content = trimmed.replace(/;$/, "");
      const parts = content.split(",").map(s => s.trim());
      
      if (parts.length >= 2) {
        const key = isNaN(Number(parts[0])) ? parts[0] : Number(parts[0]);
        const values = parts.slice(1).map(v => {
          const num = Number(v);
          return isNaN(num) ? v : num;
        });
        
        this.store(key, values.length === 1 ? values[0] : values);
      }
    }
  }

  private _valuesEqual(a: CollValue, b: CollValue): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => v === b[i]);
    }
    return a === b;
  }

  markClean(): void {
    this._dirty = false;
  }

  get isDirty(): boolean {
    return this._dirty;
  }
}

// =============================================================================
// Managers
// =============================================================================

export class TableManager {
  private tables: Map<string, TableObject> = new Map();

  create(name: string, size = 128): TableObject {
    const table = new TableObject(name, size);
    this.tables.set(name, table);
    return table;
  }

  get(name: string): TableObject | undefined {
    return this.tables.get(name);
  }

  remove(name: string): boolean {
    return this.tables.delete(name);
  }

  getAll(): TableObject[] {
    return Array.from(this.tables.values());
  }

  clear(): void {
    this.tables.clear();
  }
}

export class CollManager {
  private colls: Map<string, CollObject> = new Map();

  create(name: string): CollObject {
    const coll = new CollObject(name);
    this.colls.set(name, coll);
    return coll;
  }

  get(name: string): CollObject | undefined {
    return this.colls.get(name);
  }

  remove(name: string): boolean {
    return this.colls.delete(name);
  }

  getAll(): CollObject[] {
    return Array.from(this.colls.values());
  }

  clear(): void {
    this.colls.clear();
  }
}

// =============================================================================
// Factories
// =============================================================================

export function createTableManager(): TableManager {
  return new TableManager();
}

export function createTable(name: string, size = 128): TableObject {
  return new TableObject(name, size);
}

export function createCollManager(): CollManager {
  return new CollManager();
}

export function createColl(name: string): CollObject {
  return new CollObject(name);
}
