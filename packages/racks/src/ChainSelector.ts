/**
 * Chain Selector
 * 
 * Chain selection logic with MIDI CC control, smooth morphing, and round-robin support.
 * Determines which chains should be active based on various input sources.
 */

import type { 
  ChainSelectorConfig, 
  ChainSelectionContext,
  ZoneResult,
} from "./types.js";
import type { Chain } from "./Chain.js";

// =============================================================================
// Constants
// =============================================================================

/** Smoothing time constants in milliseconds */
export const SMOOTHING_TIMES = {
  instant: 0,
  fast: 10,
  normal: 50,
  slow: 200,
} as const;

/** Default chain selector config */
export const DEFAULT_CHAIN_SELECTOR_CONFIG: ChainSelectorConfig = {
  value: 0,
  midiCC: null,
  smoothingMs: SMOOTHING_TIMES.normal,
  roundRobin: false,
  roundRobinCount: 0,
  followNotes: false,
  noteMapping: new Map(),
};

// =============================================================================
// Chain Selector Class
// =============================================================================

/**
 * Manages chain selection with smoothing and multiple input modes
 */
export class ChainSelector {
  private _config: ChainSelectorConfig;
  private _currentValue = 0;
  private _targetValue = 0;
  private _smoothingFactor = 0;
  private _sampleRate = 48000;
  private _roundRobinIndex = 0;
  private _lastNoteChain: Map<number, string> = new Map();
  private _valueChangedCallbacks: Array<(value: number) => void> = [];
  private _chainChangedCallbacks: Array<(chainId: string | null) => void> = [];

  constructor(config?: Partial<ChainSelectorConfig>) {
    this._config = {
      ...DEFAULT_CHAIN_SELECTOR_CONFIG,
      ...config,
      noteMapping: config?.noteMapping ? new Map(config.noteMapping) : new Map(),
    };
    this._currentValue = this._config.value;
    this._targetValue = this._config.value;
    this._updateSmoothingFactor();
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get value(): number {
    return this._currentValue;
  }

  set value(value: number) {
    this._targetValue = Math.max(0, Math.min(127, value));
    this._config.value = this._targetValue;
  }

  get targetValue(): number {
    return this._targetValue;
  }

  get smoothingMs(): number {
    return this._config.smoothingMs;
  }

  set smoothingMs(value: number) {
    this._config.smoothingMs = Math.max(0, value);
    this._updateSmoothingFactor();
  }

  get isSmoothing(): boolean {
    return Math.abs(this._currentValue - this._targetValue) > 0.01;
  }

  get roundRobin(): boolean {
    return this._config.roundRobin;
  }

  set roundRobin(value: boolean) {
    this._config.roundRobin = value;
    if (value) {
      this._roundRobinIndex = 0;
    }
  }

  get roundRobinCount(): number {
    return this._config.roundRobinCount;
  }

  get followNotes(): boolean {
    return this._config.followNotes;
  }

  set followNotes(value: boolean) {
    this._config.followNotes = value;
  }

  get midiCC(): number | null {
    return this._config.midiCC;
  }

  set midiCC(value: number | null) {
    if (value === null || (value >= 0 && value <= 127)) {
      this._config.midiCC = value;
    }
  }

  get config(): ChainSelectorConfig {
    return {
      ...this._config,
      noteMapping: new Map(this._config.noteMapping),
    };
  }

  // ---------------------------------------------------------------------------
  // Value Setting
  // ---------------------------------------------------------------------------

  /**
   * Set the chain select value directly (0-127)
   */
  setValue(value: number): void {
    this.value = value;
  }

  /**
   * Set from normalized value (0-1)
   */
  setNormalizedValue(value: number): void {
    this.value = value * 127;
  }

  /**
   * Increment/decrement the value
   */
  nudge(delta: number): void {
    this.value += delta;
  }

  /**
   * Set from MIDI CC value (0-127)
   */
  setFromMidiCC(ccValue: number): boolean {
    if (this._config.midiCC !== null) {
      this.value = ccValue;
      return true;
    }
    return false;
  }

  /**
   * Handle MIDI CC input
   */
  handleMidiCC(cc: number, value: number): boolean {
    if (this._config.midiCC === cc) {
      this.value = value;
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Round Robin
  // ---------------------------------------------------------------------------

  /**
   * Advance to next chain in round-robin
   */
  advanceRoundRobin(numChains: number): number {
    if (numChains <= 0) return 0;
    
    this._roundRobinIndex = (this._roundRobinIndex + 1) % numChains;
    this._config.roundRobinCount++;
    
    // Calculate chain select value for this round-robin index
    const rangeSize = 128 / numChains;
    this.value = this._roundRobinIndex * rangeSize + rangeSize / 2;
    
    return this._roundRobinIndex;
  }

  /**
   * Get current round-robin index
   */
  getRoundRobinIndex(numChains: number): number {
    if (numChains <= 0) return 0;
    return this._roundRobinIndex % numChains;
  }

  /**
   * Reset round-robin counter
   */
  resetRoundRobin(): void {
    this._roundRobinIndex = 0;
    this._config.roundRobinCount = 0;
  }

  // ---------------------------------------------------------------------------
  // Note Following
  // ---------------------------------------------------------------------------

  /**
   * Map a note to a specific chain
   */
  mapNoteToChain(note: number, chainId: string): void {
    this._config.noteMapping.set(note, chainId);
  }

  /**
   * Remove a note mapping
   */
  unmapNote(note: number): void {
    this._config.noteMapping.delete(note);
  }

  /**
   * Clear all note mappings
   */
  clearNoteMappings(): void {
    this._config.noteMapping.clear();
  }

  /**
   * Handle note on for note-following mode
   */
  handleNoteOn(note: number): string | null {
    if (!this._config.followNotes) return null;

    const chainId = this._config.noteMapping.get(note);
    if (chainId) {
      this._lastNoteChain.set(note, chainId);
      return chainId;
    }
    return null;
  }

  /**
   * Handle note off
   */
  handleNoteOff(note: number): void {
    this._lastNoteChain.delete(note);
  }

  /**
   * Get chain ID for currently held note
   */
  getActiveNoteChain(): string | null {
    if (this._lastNoteChain.size === 0) return null;
    // Return most recent note's chain
    const entries = Array.from(this._lastNoteChain.entries());
    return entries[entries.length - 1]?.[1] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Processing
  // ---------------------------------------------------------------------------

  /**
   * Process smoothing and update current value
   * Call this once per audio block
   */
  process(blockSize: number): void {
    if (!this.isSmoothing) {
      this._currentValue = this._targetValue;
      return;
    }

    // Apply smoothing
    const samplesPerBlock = blockSize;
    const blocksPerSecond = this._sampleRate / samplesPerBlock;
    
    // Calculate how many blocks for smoothing
    if (this._config.smoothingMs > 0) {
      const blocksForSmoothing = (this._config.smoothingMs / 1000) * blocksPerSecond;
      const step = (this._targetValue - this._currentValue) / blocksForSmoothing;
      
      if (Math.abs(step) < 0.01) {
        this._currentValue = this._targetValue;
      } else {
        this._currentValue += step;
      }
    } else {
      this._currentValue = this._targetValue;
    }

    // Notify listeners
    if (Math.abs(this._currentValue - this._targetValue) < 0.1) {
      this._currentValue = this._targetValue;
    }

    this._notifyValueChanged();
  }

  /**
   * Process at sample rate for sample-accurate smoothing
   */
  processSample(): void {
    if (this._config.smoothingMs <= 0) {
      this._currentValue = this._targetValue;
      return;
    }

    const diff = this._targetValue - this._currentValue;
    if (Math.abs(diff) < 0.001) {
      this._currentValue = this._targetValue;
      return;
    }

    this._currentValue += diff * this._smoothingFactor;
  }

  /**
   * Prepare for processing
   */
  prepare(sampleRate: number): void {
    this._sampleRate = sampleRate;
    this._updateSmoothingFactor();
  }

  private _updateSmoothingFactor(): void {
    if (this._config.smoothingMs <= 0 || this._sampleRate <= 0) {
      this._smoothingFactor = 1;
      return;
    }
    
    // One-pole smoothing coefficient
    const timeConstant = this._config.smoothingMs / 1000;
    this._smoothingFactor = 1 - Math.exp(-1 / (timeConstant * this._sampleRate));
  }

  // ---------------------------------------------------------------------------
  // Chain Selection
  // ---------------------------------------------------------------------------

  /**
   * Create a selection context for evaluating chains
   */
  createContext(
    note: number,
    velocity: number,
    channel: number = 0
  ): ChainSelectionContext {
    return {
      note,
      velocity,
      chainSelect: this._currentValue,
      channel,
    };
  }

  /**
   * Select chains that should be active for the given context
   */
  selectChains(
    chains: Chain[],
    context: ChainSelectionContext
  ): Array<{ chain: Chain; result: ZoneResult }> {
    const selected: Array<{ chain: Chain; result: ZoneResult }> = [];

    for (const chain of chains) {
      const result = chain.evaluateZones(context);
      if (result.active) {
        selected.push({ chain, result });
      }
    }

    return selected;
  }

  /**
   * Get the primary active chain (highest gain)
   */
  getPrimaryChain(
    chains: Chain[],
    context: ChainSelectionContext
  ): { chain: Chain | null; result: ZoneResult } {
    const selected = this.selectChains(chains, context);
    
    if (selected.length === 0) {
      return { chain: null, result: { active: false, gain: 0, zoneType: "none" } };
    }

    // Sort by gain, highest first
    selected.sort((a, b) => b.result.gain - a.result.gain);
    return selected[0];
  }

  /**
   * Get chain select zone values for all chains (for visualization)
   */
  getChainSelectZones(chains: Chain[]): Array<{
    chainId: string;
    low: number;
    high: number;
    fadeLow: number;
    fadeHigh: number;
  }> {
    return chains.map(chain => {
      const zones = chain.zones.getZones();
      return {
        chainId: chain.id,
        low: zones.chainSelect.low,
        high: zones.chainSelect.high,
        fadeLow: zones.chainSelect.fadeLow,
        fadeHigh: zones.chainSelect.fadeHigh,
      };
    });
  }

  /**
   * Find which chain would be selected at a given chain select value
   */
  findChainAtValue(
    chains: Chain[],
    value: number
  ): Chain | null {
    for (const chain of chains) {
      const zones = chain.zones.getZones();
      if (value >= zones.chainSelect.fadeLow && value <= zones.chainSelect.fadeHigh) {
        return chain;
      }
    }
    return null;
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

  onChainChanged(callback: (chainId: string | null) => void): () => void {
    this._chainChangedCallbacks.push(callback);
    return () => {
      const index = this._chainChangedCallbacks.indexOf(callback);
      if (index >= 0) {
        this._chainChangedCallbacks.splice(index, 1);
      }
    };
  }

  private _notifyValueChanged(): void {
    for (const callback of this._valueChangedCallbacks) {
      callback(this._currentValue);
    }
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  toJSON(): ChainSelectorConfig {
    return this.config;
  }

  static fromJSON(data: ChainSelectorConfig): ChainSelector {
    return new ChainSelector(data);
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /**
   * Reset to default state
   */
  reset(): void {
    this._currentValue = 0;
    this._targetValue = 0;
    this._roundRobinIndex = 0;
    this._lastNoteChain.clear();
  }

  /**
   * Get chain select value as normalized (0-1)
   */
  getNormalizedValue(): number {
    return this._currentValue / 127;
  }
}

// =============================================================================
// Smoothing Presets
// =============================================================================

export const SMOOTHING_PRESETS = {
  /** Instant switching, no smoothing */
  instant: 0,
  /** Fast smoothing for responsive control */
  fast: 10,
  /** Normal smoothing for typical use */
  normal: 50,
  /** Slow smoothing for gradual morphing */
  slow: 200,
  /** Very slow for cinematic transitions */
  cinematic: 1000,
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create evenly distributed chain select zones
 */
export function createEvenChainSelectZones(numChains: number): Array<{
  low: number;
  high: number;
  fadeLow: number;
  fadeHigh: number;
}> {
  const zones = [];
  const zoneSize = 128 / numChains;
  
  for (let i = 0; i < numChains; i++) {
    const low = i * zoneSize;
    const high = (i + 1) * zoneSize;
    const fadeSize = zoneSize * 0.2; // 20% fade on each side
    
    zones.push({
      low,
      high,
      fadeLow: Math.max(0, low - fadeSize),
      fadeHigh: Math.min(127, high + fadeSize),
    });
  }
  
  return zones;
}

/**
 * Create chain select zones with specific sizes
 */
export function createWeightedChainSelectZones(
  weights: number[]
): Array<{
  low: number;
  high: number;
  fadeLow: number;
  fadeHigh: number;
}> {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const zones = [];
  let currentPos = 0;
  
  for (const weight of weights) {
    const size = (weight / totalWeight) * 128;
    const low = currentPos;
    const high = currentPos + size;
    const fadeSize = size * 0.1;
    
    zones.push({
      low,
      high,
      fadeLow: Math.max(0, low - fadeSize),
      fadeHigh: Math.min(127, high + fadeSize),
    });
    
    currentPos += size;
  }
  
  return zones;
}

/**
 * Interpolate between two chain configurations for morphing
 */
export function interpolateChainValues(
  valueA: number,
  valueB: number,
  morphPosition: number
): number {
  // Equal-power crossfade for smooth morphing
  const angle = morphPosition * Math.PI / 2;
  const gainA = Math.cos(angle);
  const gainB = Math.sin(angle);
  
  return valueA * gainA + valueB * gainB;
}
