/**
 * Instrument Rack
 * 
 * For layering instruments:
 * - Multiple parallel instrument chains
 * - Chain select for key switching
 * - Velocity layering
 * - Crossfade between chains
 */

import type { 
  InstrumentRackState, 
  RackCreateOptions,
  ChainSelectionContext,
  ZoneResult,
} from "./types.js";
import { Rack, DEFAULT_RACK_CONFIG } from "./Rack.js";
import { Chain } from "./Chain.js";
import { MacroBank } from "./Macros.js";
import { ChainSelector } from "./ChainSelector.js";
import type { AudioBuffer, MidiEvent } from "@daw/plugin-api";

// =============================================================================
// Constants
// =============================================================================

/** Instrument rack specific config */
const INSTRUMENT_RACK_CONFIG = {
  ...DEFAULT_RACK_CONFIG,
  type: "instrument" as const,
  multiChain: true,
  maxChains: 128,
  supportsZones: true,
  supportsMacros: true,
  supportsNesting: true,
};

/** Default velocity layer split points */
export const DEFAULT_VELOCITY_LAYERS = [
  { low: 0, high: 60 },    // Soft
  { low: 41, high: 100 },  // Medium  
  { low: 81, high: 127 },  // Hard
];

/** Default key split points (C3, C4, C5) */
export const DEFAULT_KEY_SPLITS = [48, 60, 72];

// =============================================================================
// Instrument Rack Class
// =============================================================================

/**
 * Instrument Rack for layering and splitting instruments
 */
export class InstrumentRack extends Rack {
  private _keySplitMode: "layer" | "split" | "crossfade" = "layer";
  private _velocityLayerMode: "layer" | "switch" | "crossfade" = "layer";
  private _legatoMode = false;
  private _portamentoTime = 0;
  
  // Voice tracking for legato
  private _activeVoices: Map<number, string> = new Map(); // note -> chainId
  // Voice buffers for legato processing (not currently used)
  // private _voiceBuffers?: Map<string, { left: Float32Array; right: Float32Array }>;

  constructor(id: string, name: string, options?: RackCreateOptions) {
    super(id, name, INSTRUMENT_RACK_CONFIG, options);
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get keySplitMode(): "layer" | "split" | "crossfade" {
    return this._keySplitMode;
  }

  set keySplitMode(value: "layer" | "split" | "crossfade") {
    this._keySplitMode = value;
  }

  get velocityLayerMode(): "layer" | "switch" | "crossfade" {
    return this._velocityLayerMode;
  }

  set velocityLayerMode(value: "layer" | "switch" | "crossfade") {
    this._velocityLayerMode = value;
  }

  get legatoMode(): boolean {
    return this._legatoMode;
  }

  set legatoMode(value: boolean) {
    this._legatoMode = value;
  }

  get portamentoTime(): number {
    return this._portamentoTime;
  }

  set portamentoTime(value: number) {
    this._portamentoTime = Math.max(0, value);
  }

  // ---------------------------------------------------------------------------
  // Chain Configuration Helpers
  // ---------------------------------------------------------------------------

  /**
   * Configure chains as velocity layers
   */
  setupVelocityLayers(layers: Array<{ min: number; max: number }>): void {
    const chains = this.chains;
    
    for (let i = 0; i < chains.length && i < layers.length; i++) {
      const chain = chains[i];
      const layer = layers[i];
      const zones = chain.zones.getZones();
      
      zones.velocity.low = layer.min;
      zones.velocity.high = layer.max;
      zones.velocity.fadeLow = Math.max(0, layer.min - 10);
      zones.velocity.fadeHigh = Math.min(127, layer.max + 10);
      
      chain.zones.setZones(zones);
    }

    this._velocityLayerMode = "layer";
  }

  /**
   * Configure chains as keyboard splits
   */
  setupKeySplits(splitPoints: number[]): void {
    const chains = this.chains;
    const sortedSplits = [0, ...splitPoints, 127].sort((a, b) => a - b);
    
    for (let i = 0; i < chains.length && i < sortedSplits.length - 1; i++) {
      const chain = chains[i];
      const low = sortedSplits[i];
      const high = sortedSplits[i + 1];
      const zones = chain.zones.getZones();
      
      zones.key.low = low;
      zones.key.high = high;
      zones.key.fadeLow = Math.max(0, low - 3);
      zones.key.fadeHigh = Math.min(127, high + 3);
      
      chain.zones.setZones(zones);
    }

    this._keySplitMode = "split";
  }

  /**
   * Configure chains for crossfade morphing
   */
  setupCrossfadeChains(): void {
    const chains = this.chains;
    const rangeSize = 128 / chains.length;
    
    for (let i = 0; i < chains.length; i++) {
      const chain = chains[i];
      const zones = chain.zones.getZones();
      
      // Overlapping zones for crossfade
      const center = i * rangeSize + rangeSize / 2;
      zones.chainSelect.low = Math.max(0, center - rangeSize);
      zones.chainSelect.high = Math.min(127, center + rangeSize);
      zones.chainSelect.fadeLow = Math.max(0, zones.chainSelect.low - rangeSize * 0.3);
      zones.chainSelect.fadeHigh = Math.min(127, zones.chainSelect.high + rangeSize * 0.3);
      
      chain.zones.setZones(zones);
    }

    this._keySplitMode = "crossfade";
  }

  // ---------------------------------------------------------------------------
  // Processing
  // ---------------------------------------------------------------------------

  /**
   * Process audio through the instrument rack
   */
  process(
    _inputs: AudioBuffer[],
    outputs: AudioBuffer[],
    midi: MidiEvent[],
    blockSize: number
  ): void {
    // Update chain selector smoothing
    this._chainSelector.process(blockSize);

    // Clear output
    if (outputs.length > 0) {
      outputs[0].clear();
    }

    // Process MIDI events
    for (const event of midi) {
      this._handleMidiEvent(event);
    }

    // Create selection context
    const context = this._chainSelector.createContext(
      60, // Default note for selection
      100, // Default velocity
    );

    // Select active chains
    const selectedChains = this._selectChainsForProcessing(context);

    // Mix chains
    if (outputs.length > 0) {
      this._mixChains(selectedChains, outputs, blockSize);
    }

    // Apply macros
    this._processMacros();
  }

  private _handleMidiEvent(event: MidiEvent): void {
    switch (event.type) {
      case "noteOn": {
        const data = event.data as import("@daw/plugin-api").NoteOnData;
        const note = data.note;
        const velocity = data.velocity;
        
        // Find chains that should play this note
        const context = this._chainSelector.createContext(note, velocity, event.channel);
        const selected = this._selectChainsForProcessing(context);
        
        // Track active voices
        if (selected.length > 0) {
          this._activeVoices.set(note, selected[0].chain.id);
        }
        break;
      }
      
      case "noteOff": {
        const data = event.data as import("@daw/plugin-api").NoteOffData;
        const note = data.note;
        this._activeVoices.delete(note);
        break;
      }
    }
  }

  private _selectChainsForProcessing(
    context: ChainSelectionContext
  ): Array<{ chain: Chain; result: ZoneResult; gain: number }> {
    const selected: Array<{ chain: Chain; result: ZoneResult; gain: number }> = [];

    for (const chain of this._chains.values()) {
      const result = chain.evaluateZones(context);
      
      if (!result.active) continue;

      // Calculate effective gain considering solo
      let gain = result.gain;
      if (this._anySoloActive && !chain.isSolo) {
        gain = 0;
      }

      if (gain > 0) {
        selected.push({ chain, result, gain });
      }
    }

    return selected;
  }

  private _mixChains(
    selected: Array<{ chain: Chain; result: ZoneResult; gain: number }>,
    outputs: AudioBuffer[],
    blockSize: number
  ): void {
    if (outputs.length === 0) return;

    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    // Temporary buffer for chain output
    const tempL = new Float32Array(blockSize);
    const tempR = new Float32Array(blockSize);
    const tempBuffer: AudioBuffer = {
      numberOfChannels: 2,
      length: blockSize,
      sampleRate: this._sampleRate,
      duration: blockSize / this._sampleRate,
      getChannelData: (ch: number) => ch === 0 ? tempL : tempR,
      copyFrom: () => {},
      clear: () => { tempL.fill(0); tempR.fill(0); },
    };

    // Mix each chain
    for (const { chain, gain } of selected) {
      tempL.fill(0);
      tempR.fill(0);

      // Process chain
      chain.process([], [tempBuffer], [], blockSize, gain);

      // Add to output
      for (let i = 0; i < blockSize; i++) {
        outputL[i] += tempL[i];
        outputR[i] += tempR[i];
      }
    }
  }

  private _processMacros(): void {
    const updates = this._macroBank.processAllMappings();
    for (const update of updates) {
      for (const chain of this._chains.values()) {
        const device = chain.getDevice(update.deviceId);
        if (device?.instance) {
          device.instance.setParam(update.paramId, update.value);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Serialize instrument rack state
   */
  toJSON(): InstrumentRackState {
    const base = super.toJSON();
    return {
      ...base,
      type: "instrument",
      keySplitMode: this._keySplitMode,
      velocityLayerMode: this._velocityLayerMode,
      legatoMode: this._legatoMode,
      portamentoTime: this._portamentoTime,
    };
  }

  /**
   * Load instrument rack state
   */
  loadJSON(state: InstrumentRackState): void {
    this._name = state.name;
    this._keySplitMode = state.keySplitMode ?? "layer";
    this._velocityLayerMode = state.velocityLayerMode ?? "layer";
    this._legatoMode = state.legatoMode ?? false;
    this._portamentoTime = state.portamentoTime ?? 0;
    this._showChains = state.showChains;
    this._showMacros = state.showMacros;
    this._selectedChainId = state.selectedChainId;
    this._expandedDevices = new Set(state.expandedDevices);

    // Load chains
    this._chains.clear();
    for (const chainData of state.chains) {
      const chain = Chain.fromJSON(chainData, this._blockSize);
      chain.setEventHandler((event) => this._emitEvent(event));
      this._chains.set(chain.id, chain);
    }

    // Load macros
    this._macroBank = this._createMacroBankFromState(state.macros);

    // Load chain selector
    this._chainSelector = ChainSelector.fromJSON(state.chainSelector);
  }

  private _createMacroBankFromState(macros: import("./types.js").Macro[]): MacroBank {
    return MacroBank.fromJSON(macros);
  }

  // ---------------------------------------------------------------------------
  // Factory
  // ---------------------------------------------------------------------------

  /**
   * Create an instrument rack with default settings
   */
  static create(
    name: string,
    options?: RackCreateOptions & {
      numLayers?: number;
      splitMode?: "layer" | "split" | "crossfade";
    }
  ): InstrumentRack {
    const id = `inst_rack_${Date.now()}`;
    const numLayers = options?.numLayers ?? 2;
    
    const rack = new InstrumentRack(id, name, {
      ...options,
      numChains: numLayers,
    });

    rack._keySplitMode = options?.splitMode ?? "layer";

    // Configure based on mode
    switch (rack._keySplitMode) {
      case "split":
        rack.setupKeySplits(DEFAULT_KEY_SPLITS.slice(0, numLayers - 1));
        break;
      case "crossfade":
        rack.setupCrossfadeChains();
        break;
      default:
        // Layer mode - full range for all
        break;
    }

    return rack;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a velocity-layered instrument rack preset
 */
export function createVelocityLayerRack(
  name: string,
  numLayers: number = 3
): InstrumentRack {
  const rack = InstrumentRack.create(name, {
    numLayers,
    splitMode: "layer",
  });

  // Setup velocity zones
  const layerSize = Math.floor(128 / numLayers);
  const layers = [];
  
  for (let i = 0; i < numLayers; i++) {
    layers.push({
      min: i * layerSize,
      max: (i + 1) * layerSize - 1,
    });
  }
  
  rack.setupVelocityLayers(layers);
  return rack;
}

/**
 * Create a key-split instrument rack preset
 */
export function createKeySplitRack(
  name: string,
  splitPoints: number[]
): InstrumentRack {
  const rack = InstrumentRack.create(name, {
    numLayers: splitPoints.length + 1,
    splitMode: "split",
  });

  rack.setupKeySplits(splitPoints);
  return rack;
}

/**
 * Create a morphing instrument rack preset
 */
export function createMorphRack(name: string, numChains: number = 4): InstrumentRack {
  const rack = InstrumentRack.create(name, {
    numLayers: numChains,
    splitMode: "crossfade",
  });

  rack.setupCrossfadeChains();
  return rack;
}

// Simple dB to linear conversion for mixing (available for future use)
// function dbToLinear(db: number): number {
//   if (db <= -96) return 0;
//   return Math.pow(10, db / 20);
// }
