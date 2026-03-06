/**
 * Zones System
 * 
 * Zone editing with crossfade support for Key, Velocity, and Chain Select zones.
 * Implements the Ableton-style zone editor data model with overlap detection
 * and crossfade calculations.
 */

import type { 
  ZoneRange, 
  ChainZones, 
  ZoneResult, 
  ChainSelectionContext,
  ZoneEditorState 
} from "./types.js";

// =============================================================================
// Constants
// =============================================================================

/** Full MIDI note range */
export const MIDI_NOTE_MIN = 0;
export const MIDI_NOTE_MAX = 127;

/** Full MIDI velocity range */
export const MIDI_VELOCITY_MIN = 0;
export const MIDI_VELOCITY_MAX = 127;

/** Full Chain Select range */
export const CHAIN_SELECT_MIN = 0;
export const CHAIN_SELECT_MAX = 127;

/** Default zone ranges */
export const DEFAULT_KEY_ZONE: ZoneRange = {
  low: MIDI_NOTE_MIN,
  high: MIDI_NOTE_MAX,
  fadeLow: MIDI_NOTE_MIN,
  fadeHigh: MIDI_NOTE_MAX,
};

export const DEFAULT_VELOCITY_ZONE: ZoneRange = {
  low: MIDI_VELOCITY_MIN,
  high: MIDI_VELOCITY_MAX,
  fadeLow: MIDI_VELOCITY_MIN,
  fadeHigh: MIDI_VELOCITY_MAX,
};

export const DEFAULT_CHAIN_SELECT_ZONE: ZoneRange = {
  low: CHAIN_SELECT_MIN,
  high: CHAIN_SELECT_MAX,
  fadeLow: CHAIN_SELECT_MIN,
  fadeHigh: CHAIN_SELECT_MAX,
};

/** Default zones for a new chain */
export const DEFAULT_CHAIN_ZONES: ChainZones = {
  key: { ...DEFAULT_KEY_ZONE },
  velocity: { ...DEFAULT_VELOCITY_ZONE },
  chainSelect: { ...DEFAULT_CHAIN_SELECT_ZONE },
};

// =============================================================================
// Zone Class
// =============================================================================

/**
 * Manages a single zone range with crossfade support
 */
export class Zone {
  private _range: ZoneRange;
  private _minValue: number;
  private _maxValue: number;

  constructor(
    range: ZoneRange = { low: 0, high: 127, fadeLow: 0, fadeHigh: 127 },
    minValue: number = 0,
    maxValue: number = 127
  ) {
    this._minValue = minValue;
    this._maxValue = maxValue;
    this._range = this._clampRange(range);
  }

  // ---------------------------------------------------------------------------
  // Getters/Setters
  // ---------------------------------------------------------------------------

  get range(): ZoneRange {
    return { ...this._range };
  }

  set range(value: ZoneRange) {
    this._range = this._clampRange(value);
  }

  get low(): number {
    return this._range.low;
  }

  set low(value: number) {
    this._range.low = this._clamp(value, this._minValue, this._range.high);
    this._range.fadeLow = Math.max(this._range.fadeLow, this._range.low);
  }

  get high(): number {
    return this._range.high;
  }

  set high(value: number) {
    this._range.high = this._clamp(value, this._range.low, this._maxValue);
    this._range.fadeHigh = Math.min(this._range.fadeHigh, this._range.high);
  }

  get fadeLow(): number {
    return this._range.fadeLow;
  }

  set fadeLow(value: number) {
    this._range.fadeLow = this._clamp(value, this._minValue, this._range.low);
  }

  get fadeHigh(): number {
    return this._range.fadeHigh;
  }

  set fadeHigh(value: number) {
    this._range.fadeHigh = this._clamp(value, this._range.high, this._maxValue);
  }

  get width(): number {
    return this._range.high - this._range.low;
  }

  get fadeWidthLow(): number {
    return this._range.low - this._range.fadeLow;
  }

  get fadeWidthHigh(): number {
    return this._range.fadeHigh - this._range.high;
  }

  // ---------------------------------------------------------------------------
  // Value Testing
  // ---------------------------------------------------------------------------

  /**
   * Check if a value is within the zone (including fade boundaries)
   */
  contains(value: number): boolean {
    return value >= this._range.fadeLow && value <= this._range.fadeHigh;
  }

  /**
   * Check if a value is within the hard zone boundaries (excluding fades)
   */
  containsHard(value: number): boolean {
    return value >= this._range.low && value <= this._range.high;
  }

  /**
   * Calculate the gain for a value within this zone
   * Returns 0 if outside, 0-1 if in fade zone, 1 if in hard zone
   */
  calculateGain(value: number): number {
    if (value < this._range.fadeLow || value > this._range.fadeHigh) {
      return 0;
    }

    if (value >= this._range.low && value <= this._range.high) {
      return 1;
    }

    // In fade zone
    if (value < this._range.low) {
      // Fade in from fadeLow to low
      const fadeRange = this._range.low - this._range.fadeLow;
      if (fadeRange <= 0) return 1;
      return (value - this._range.fadeLow) / fadeRange;
    } else {
      // Fade out from high to fadeHigh
      const fadeRange = this._range.fadeHigh - this._range.high;
      if (fadeRange <= 0) return 1;
      return 1 - (value - this._range.high) / fadeRange;
    }
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  toJSON(): ZoneRange {
    return this.range;
  }

  static fromJSON(data: ZoneRange, minValue?: number, maxValue?: number): Zone {
    return new Zone(data, minValue, maxValue);
  }

  clone(): Zone {
    return new Zone(this.range, this._minValue, this._maxValue);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private _clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private _clampRange(range: ZoneRange): ZoneRange {
    return {
      low: this._clamp(range.low, this._minValue, this._maxValue),
      high: this._clamp(range.high, this._minValue, this._maxValue),
      fadeLow: this._clamp(range.fadeLow, this._minValue, this._maxValue),
      fadeHigh: this._clamp(range.fadeHigh, this._minValue, this._maxValue),
    };
  }
}

// =============================================================================
// Chain Zones Manager
// =============================================================================

/**
 * Manages all three zone types (Key, Velocity, Chain Select) for a chain
 */
export class ChainZoneManager {
  keyZone: Zone;
  velocityZone: Zone;
  chainSelectZone: Zone;

  constructor(zones?: Partial<ChainZones>) {
    this.keyZone = new Zone(
      zones?.key ?? DEFAULT_KEY_ZONE,
      MIDI_NOTE_MIN,
      MIDI_NOTE_MAX
    );
    this.velocityZone = new Zone(
      zones?.velocity ?? DEFAULT_VELOCITY_ZONE,
      MIDI_VELOCITY_MIN,
      MIDI_VELOCITY_MAX
    );
    this.chainSelectZone = new Zone(
      zones?.chainSelect ?? DEFAULT_CHAIN_SELECT_ZONE,
      CHAIN_SELECT_MIN,
      CHAIN_SELECT_MAX
    );
  }

  /**
   * Evaluate all zones for a given input context
   */
  evaluate(context: ChainSelectionContext): ZoneResult {
    const keyGain = this.keyZone.calculateGain(context.note);
    if (keyGain === 0) {
      return { active: false, gain: 0, zoneType: "key" };
    }

    const velocityGain = this.velocityZone.calculateGain(context.velocity);
    if (velocityGain === 0) {
      return { active: false, gain: 0, zoneType: "velocity" };
    }

    const chainSelectGain = this.chainSelectZone.calculateGain(context.chainSelect);
    if (chainSelectGain === 0) {
      return { active: false, gain: 0, zoneType: "chainSelect" };
    }

    // Combine gains (multiply for simultaneous zones)
    const totalGain = keyGain * velocityGain * chainSelectGain;

    return {
      active: totalGain > 0,
      gain: totalGain,
      zoneType: "none",
    };
  }

  /**
   * Check if this chain can be triggered by the given context
   */
  canTrigger(context: ChainSelectionContext): boolean {
    return this.evaluate(context).active;
  }

  /**
   * Get all zones as a ChainZones object
   */
  getZones(): ChainZones {
    return {
      key: this.keyZone.range,
      velocity: this.velocityZone.range,
      chainSelect: this.chainSelectZone.range,
    };
  }

  /**
   * Set all zones from a ChainZones object
   */
  setZones(zones: ChainZones): void {
    this.keyZone.range = zones.key;
    this.velocityZone.range = zones.velocity;
    this.chainSelectZone.range = zones.chainSelect;
  }

  /**
   * Reset all zones to full range
   */
  resetToFull(): void {
    this.keyZone.range = { ...DEFAULT_KEY_ZONE };
    this.velocityZone.range = { ...DEFAULT_VELOCITY_ZONE };
    this.chainSelectZone.range = { ...DEFAULT_CHAIN_SELECT_ZONE };
  }

  toJSON(): ChainZones {
    return this.getZones();
  }

  static fromJSON(data: ChainZones): ChainZoneManager {
    return new ChainZoneManager(data);
  }

  clone(): ChainZoneManager {
    return new ChainZoneManager(this.getZones());
  }
}

// =============================================================================
// Zone Overlap Detection
// =============================================================================

/**
 * Detects overlaps between zones for visual feedback
 */
export interface ZoneOverlap {
  chainA: string;
  chainB: string;
  zoneType: "key" | "velocity" | "chainSelect";
  overlapStart: number;
  overlapEnd: number;
}

/**
 * Find overlapping zones between chains
 */
export function findZoneOverlaps(
  chains: Array<{ id: string; zones: ChainZones }>,
  zoneType: "key" | "velocity" | "chainSelect"
): ZoneOverlap[] {
  const overlaps: ZoneOverlap[] = [];

  for (let i = 0; i < chains.length; i++) {
    for (let j = i + 1; j < chains.length; j++) {
      const chainA = chains[i];
      const chainB = chains[j];
      
      const zoneA = chainA.zones[zoneType];
      const zoneB = chainB.zones[zoneType];

      const overlapStart = Math.max(zoneA.fadeLow, zoneB.fadeLow);
      const overlapEnd = Math.min(zoneA.fadeHigh, zoneB.fadeHigh);

      if (overlapStart < overlapEnd) {
        overlaps.push({
          chainA: chainA.id,
          chainB: chainB.id,
          zoneType,
          overlapStart,
          overlapEnd,
        });
      }
    }
  }

  return overlaps;
}

/**
 * Check if a proposed zone range would cause an invalid overlap
 * (where chains have no crossfade buffer)
 */
export function checkInvalidOverlap(
  zone: ZoneRange,
  otherZones: ZoneRange[],
  minGap: number = 0
): boolean {
  for (const other of otherZones) {
    // Check for hard overlap without fade buffer
    if (zone.high > other.low && zone.low < other.high) {
      // There is some overlap, check if it's just in fade zones
      const hardOverlapStart = Math.max(zone.low, other.low);
      const hardOverlapEnd = Math.min(zone.high, other.high);
      
      if (hardOverlapStart < hardOverlapEnd - minGap) {
        return true; // Invalid overlap
      }
    }
  }
  return false;
}

// =============================================================================
// Zone Editor Helper
// =============================================================================

/**
 * Helper class for zone editor operations
 */
export class ZoneEditor {
  private _state: ZoneEditorState;

  constructor(state?: Partial<ZoneEditorState>) {
    this._state = {
      activeZone: state?.activeZone ?? "key",
      showCrossfades: state?.showCrossfades ?? true,
      snapToGrid: state?.snapToGrid ?? false,
      gridSize: state?.gridSize ?? 1,
    };
  }

  get state(): ZoneEditorState {
    return { ...this._state };
  }

  setActiveZone(zone: "key" | "velocity" | "chainSelect"): void {
    this._state.activeZone = zone;
  }

  toggleCrossfades(): void {
    this._state.showCrossfades = !this._state.showCrossfades;
  }

  toggleSnapToGrid(): void {
    this._state.snapToGrid = !this._state.snapToGrid;
  }

  setGridSize(size: number): void {
    this._state.gridSize = Math.max(1, Math.floor(size));
  }

  /**
   * Snap a value to the grid
   */
  snap(value: number): number {
    if (!this._state.snapToGrid || this._state.gridSize <= 1) {
      return value;
    }
    return Math.round(value / this._state.gridSize) * this._state.gridSize;
  }

  /**
   * Get the valid range for the active zone type
   */
  getActiveRange(): { min: number; max: number } {
    switch (this._state.activeZone) {
      case "key":
        return { min: MIDI_NOTE_MIN, max: MIDI_NOTE_MAX };
      case "velocity":
        return { min: MIDI_VELOCITY_MIN, max: MIDI_VELOCITY_MAX };
      case "chainSelect":
        return { min: CHAIN_SELECT_MIN, max: CHAIN_SELECT_MAX };
    }
  }
}

// =============================================================================
// Crossfade Calculation Utilities
// =============================================================================

/**
 * Calculate crossfade gain between two overlapping zones
 * Uses equal-power crossfade for smooth transitions
 */
export function calculateCrossfadeGain(
  value: number,
  zone1: ZoneRange,
  zone2: ZoneRange,
  _fadeZone: "low" | "high"
): { gain1: number; gain2: number } {
  // Find overlap region
  const overlapStart = Math.max(zone1.fadeLow, zone2.fadeLow);
  const overlapEnd = Math.min(zone1.fadeHigh, zone2.fadeHigh);
  
  if (value < overlapStart || value > overlapEnd) {
    // Outside overlap - one zone is at full gain
    const inZone1 = value >= zone1.fadeLow && value <= zone1.fadeHigh;
    const inZone2 = value >= zone2.fadeLow && value <= zone2.fadeHigh;
    return { gain1: inZone1 ? 1 : 0, gain2: inZone2 ? 1 : 0 };
  }

  // Inside overlap region - calculate crossfade position (0-1)
  const position = (value - overlapStart) / (overlapEnd - overlapStart);
  
  // Equal-power crossfade
  const gain1 = Math.cos(position * Math.PI / 2);
  const gain2 = Math.sin(position * Math.PI / 2);
  
  return { gain1, gain2 };
}

/**
 * Apply crossfade curve to a gain value
 * curve: -1 (exponential) to 1 (logarithmic), 0 = linear
 */
export function applyCrossfadeCurve(gain: number, curve: number): number {
  if (curve === 0) return gain;
  
  // Exponential curve (curve < 0)
  if (curve < 0) {
    return Math.pow(gain, 1 + Math.abs(curve));
  }
  
  // Logarithmic curve (curve > 0)
  return 1 - Math.pow(1 - gain, 1 + curve);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a zone with specific fade widths
 */
export function createZoneWithFades(
  low: number,
  high: number,
  fadeLowWidth: number,
  fadeHighWidth: number,
  minValue: number = 0,
  maxValue: number = 127
): ZoneRange {
  return {
    low: Math.max(minValue, low),
    high: Math.min(maxValue, high),
    fadeLow: Math.max(minValue, low - fadeLowWidth),
    fadeHigh: Math.min(maxValue, high + fadeHighWidth),
  };
}

/**
 * Create a velocity layer split
 * Creates N zones that divide the velocity range
 */
export function createVelocityLayers(
  numLayers: number,
  crossfadeWidth: number = 0
): ZoneRange[] {
  const zones: ZoneRange[] = [];
  const rangeSize = MIDI_VELOCITY_MAX / numLayers;

  for (let i = 0; i < numLayers; i++) {
    const low = Math.round(i * rangeSize);
    const high = Math.round((i + 1) * rangeSize);
    
    zones.push(createZoneWithFades(
      low,
      high,
      i === 0 ? 0 : crossfadeWidth,
      i === numLayers - 1 ? 0 : crossfadeWidth,
      MIDI_VELOCITY_MIN,
      MIDI_VELOCITY_MAX
    ));
  }

  return zones;
}

/**
 * Create a key split
 * Creates zones for keyboard splits
 */
export function createKeySplit(
  splitPoints: number[],
  crossfadeWidth: number = 0
): ZoneRange[] {
  const zones: ZoneRange[] = [];
  const points = [MIDI_NOTE_MIN, ...splitPoints, MIDI_NOTE_MAX];

  for (let i = 0; i < points.length - 1; i++) {
    const low = points[i];
    const high = points[i + 1];
    
    zones.push(createZoneWithFades(
      low,
      high,
      i === 0 ? 0 : crossfadeWidth,
      i === points.length - 2 ? 0 : crossfadeWidth,
      MIDI_NOTE_MIN,
      MIDI_NOTE_MAX
    ));
  }

  return zones;
}
