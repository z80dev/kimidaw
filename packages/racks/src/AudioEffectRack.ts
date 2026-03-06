/**
 * Audio Effect Rack
 * 
 * Parallel effect processing:
 * - Multiple parallel audio effect chains
 * - Input splitting: Serial or Parallel
 * - Chain select for morphing
 * - Dry/Wet per chain
 */

import type { 
  AudioEffectRackState,
  RackCreateOptions,
  InputSplitMode,
} from "./types.js";
import { Rack, DEFAULT_RACK_CONFIG } from "./Rack.js";
import { Chain } from "./Chain.js";
import { MacroBank } from "./Macros.js";
import { ChainSelector } from "./ChainSelector.js";
import type { AudioBuffer, MidiEvent } from "@daw/plugin-api";

// =============================================================================
// Constants
// =============================================================================

/** Audio effect rack specific config */
const AUDIO_EFFECT_RACK_CONFIG = {
  ...DEFAULT_RACK_CONFIG,
  type: "audioEffect" as const,
  multiChain: true,
  maxChains: 128,
  hasReturns: false,
  maxReturns: 0,
  supportsZones: true,
  supportsMacros: true,
  supportsNesting: true,
};

/** Default crossover frequencies */
export const DEFAULT_CROSSOVER_FREQ = 1000; // Hz
export const DEFAULT_CROSSOVER_SLOPE = 24; // dB/octave

// =============================================================================
// Audio Effect Rack Class
// =============================================================================

/**
 * Audio Effect Rack for parallel effect processing
 */
export class AudioEffectRack extends Rack {
  private _splitMode: InputSplitMode = "parallel";
  private _dryWet = 1; // 0 = dry only, 1 = wet only
  private _crossoverFreq = DEFAULT_CROSSOVER_FREQ;
  private _crossoverSlope = DEFAULT_CROSSOVER_SLOPE;
  private _chainDryWet: Map<string, number> = new Map();
  
  // Processing state
  private _inputBufferL: Float32Array;
  private _inputBufferR: Float32Array;
  private _chainOutputs: Map<string, { left: Float32Array; right: Float32Array }> = new Map();
  
  // Filter state for frequency split
  private _lowpassState = { x1: 0, x2: 0, y1: 0, y2: 0 };
  // Highpass state for frequency split (not currently used)
  // private _highpassState = { x1: 0, x2: 0, y1: 0, y2: 0 };

  constructor(id: string, name: string, options?: RackCreateOptions) {
    super(id, name, AUDIO_EFFECT_RACK_CONFIG, options);
    
    const maxBlockSize = options?.maxBlockSize ?? 128;
    this._inputBufferL = new Float32Array(maxBlockSize);
    this._inputBufferR = new Float32Array(maxBlockSize);
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get splitMode(): InputSplitMode {
    return this._splitMode;
  }

  set splitMode(value: InputSplitMode) {
    this._splitMode = value;
  }

  get dryWet(): number {
    return this._dryWet;
  }

  set dryWet(value: number) {
    this._dryWet = Math.max(0, Math.min(1, value));
  }

  get crossoverFreq(): number {
    return this._crossoverFreq;
  }

  set crossoverFreq(value: number) {
    this._crossoverFreq = Math.max(20, Math.min(20000, value));
    this._updateFilterCoefficients();
  }

  get crossoverSlope(): number {
    return this._crossoverSlope;
  }

  set crossoverSlope(value: number) {
    this._crossoverSlope = Math.max(6, Math.min(48, value));
  }

  // ---------------------------------------------------------------------------
  // Chain Configuration
  // ---------------------------------------------------------------------------

  /**
   * Set dry/wet mix for a specific chain
   */
  setChainDryWet(chainId: string, wetAmount: number): boolean {
    if (!this._chains.has(chainId)) return false;
    
    this._chainDryWet.set(chainId, Math.max(0, Math.min(1, wetAmount)));
    return true;
  }

  /**
   * Get dry/wet mix for a chain
   */
  getChainDryWet(chainId: string): number {
    return this._chainDryWet.get(chainId) ?? 1;
  }

  /**
   * Set up parallel chains (default behavior)
   */
  setupParallelChains(): void {
    this._splitMode = "parallel";
    
    // All chains get full input
    for (const chain of this._chains.values()) {
      const zones = chain.zones.getZones();
      zones.chainSelect = { low: 0, high: 127, fadeLow: 0, fadeHigh: 127 };
      chain.zones.setZones(zones);
    }
  }

  /**
   * Set up serial chains (chain the output of each to the next)
   */
  setupSerialChains(): void {
    this._splitMode = "serial";
    
    // In serial mode, we process chains in order
    // Each chain gets full chain select zone
    for (const chain of this._chains.values()) {
      const zones = chain.zones.getZones();
      zones.chainSelect = { low: 0, high: 127, fadeLow: 0, fadeHigh: 127 };
      chain.zones.setZones(zones);
    }
  }

  /**
   * Set up frequency split chains
   */
  setupFrequencySplit(chains: Array<{ low?: number; high?: number }>): void {
    this._splitMode = "frequency";
    
    const chainArray = this.chains;
    for (let i = 0; i < chainArray.length && i < chains.length; i++) {
      // Configure zones for frequency-based selection
      // (in real implementation, this would use actual frequency filtering)
      const chain = chainArray[i];
      const split = chains[i];
      
      if (split.low !== undefined && split.high !== undefined) {
        // Map frequency range to chain select zone
        const lowCS = Math.floor((split.low / 20000) * 127);
        const highCS = Math.floor((split.high / 20000) * 127);
        
        const zones = chain.zones.getZones();
        zones.chainSelect = {
          low: lowCS,
          high: highCS,
          fadeLow: Math.max(0, lowCS - 5),
          fadeHigh: Math.min(127, highCS + 5),
        };
        chain.zones.setZones(zones);
      }
    }
  }

  /**
   * Configure chains for morphing
   */
  setupMorphingChains(): void {
    const chains = this.chains;
    const numChains = chains.length;
    
    if (numChains < 2) return;
    
    const zoneSize = 128 / (numChains - 1);
    
    for (let i = 0; i < numChains; i++) {
      const chain = chains[i];
      const center = i * zoneSize;
      const halfZone = zoneSize / 2;
      
      const zones = chain.zones.getZones();
      zones.chainSelect = {
        low: Math.max(0, center - halfZone),
        high: Math.min(127, center + halfZone),
        fadeLow: Math.max(0, center - halfZone * 1.5),
        fadeHigh: Math.min(127, center + halfZone * 1.5),
      };
      chain.zones.setZones(zones);
    }
  }

  // ---------------------------------------------------------------------------
  // Processing
  // ---------------------------------------------------------------------------

  /**
   * Process audio through the effect rack
   */
  process(
    inputs: AudioBuffer[],
    outputs: AudioBuffer[],
    midi: MidiEvent[],
    blockSize: number
  ): void {
    // Ensure buffers are sized
    if (this._inputBufferL.length < blockSize) {
      this._inputBufferL = new Float32Array(blockSize);
      this._inputBufferR = new Float32Array(blockSize);
    }

    // Update chain selector
    this._chainSelector.process(blockSize);

    // Store input for dry signal
    // Track if we have valid input (for future use)
    // const hasInput = false;
    if (inputs.length > 0) {
      const inputL = inputs[0].getChannelData(0);
      const inputR = inputs[0].numberOfChannels > 1 
        ? inputs[0].getChannelData(1) 
        : inputL;
      
      this._inputBufferL.set(inputL.subarray(0, blockSize));
      this._inputBufferR.set(inputR.subarray(0, blockSize));
      // hasInput = true;
    } else {
      this._inputBufferL.fill(0, 0, blockSize);
      this._inputBufferR.fill(0, blockSize);
    }

    // Clear output
    if (outputs.length > 0) {
      outputs[0].clear();
    }

    // Process based on split mode
    switch (this._splitMode) {
      case "serial":
        this._processSerial(inputs, outputs, midi, blockSize);
        break;
      case "parallel":
        this._processParallel(inputs, outputs, midi, blockSize);
        break;
      case "frequency":
        this._processFrequencySplit(inputs, outputs, midi, blockSize);
        break;
    }

    // Apply macros
    this._processMacros();
  }

  private _processSerial(
    inputs: AudioBuffer[],
    outputs: AudioBuffer[],
    midi: MidiEvent[],
    blockSize: number
  ): void {
    if (outputs.length === 0) return;

    // Create temp buffers for serial processing
    let currentInput = inputs.length > 0 ? inputs : [this._createEmptyBuffer(blockSize)];
    const tempOutput = this._createEmptyBuffer(blockSize);

    // Process chains in series
    for (const chain of this.chains) {
      if (!chain.isActive) continue;

      tempOutput.clear();
      chain.process(currentInput, [tempOutput], midi, blockSize);
      
      // Output becomes next input
      currentInput = [tempOutput];
    }

    // Mix with dry signal
    this._mixDryWet(outputs[0], tempOutput, blockSize);
  }

  private _processParallel(
    inputs: AudioBuffer[],
    outputs: AudioBuffer[],
    midi: MidiEvent[],
    blockSize: number
  ): void {
    if (outputs.length === 0) return;

    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    // Create selection context for chain selector
    const context = this._chainSelector.createContext(60, 100);

    // Process each chain and sum
    for (const chain of this.chains) {
      if (!chain.isActive) continue;

      // Evaluate zones
      const zoneResult = chain.evaluateZones(context);
      if (!zoneResult.active) continue;

      // Get or create output buffer
      let chainOut = this._chainOutputs.get(chain.id);
      if (!chainOut || chainOut.left.length < blockSize) {
        chainOut = {
          left: new Float32Array(blockSize),
          right: new Float32Array(blockSize),
        };
        this._chainOutputs.set(chain.id, chainOut);
      }

      const tempBuffer = this._createBufferFromArrays(chainOut.left, chainOut.right, blockSize);
      tempBuffer.clear();

      // Process chain
      chain.process(inputs, [tempBuffer], midi, blockSize, zoneResult.gain);

      // Get chain dry/wet
      const chainWet = this._chainDryWet.get(chain.id) ?? 1;
      const chainDry = 1 - chainWet;

      // Add to output with chain's mix
      for (let i = 0; i < blockSize; i++) {
        const wetL = chainOut.left[i] * zoneResult.gain;
        const wetR = chainOut.right[i] * zoneResult.gain;
        
        const dryL = this._inputBufferL[i] * chainDry;
        const dryR = this._inputBufferR[i] * chainDry;
        
        outputL[i] += wetL * chainWet + dryL * chainWet;
        outputR[i] += wetR * chainWet + dryR * chainWet;
      }
    }

    // Apply global dry/wet
    this._applyGlobalDryWet(outputs[0], blockSize);
  }

  private _processFrequencySplit(
    inputs: AudioBuffer[],
    outputs: AudioBuffer[],
    midi: MidiEvent[],
    blockSize: number
  ): void {
    if (inputs.length === 0 || outputs.length === 0) return;

    const inputL = inputs[0].getChannelData(0);
    const inputR = inputs[0].numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;

    // Simple crossover (for full implementation, use Linkwitz-Riley filters)
    const lowL = new Float32Array(blockSize);
    const lowR = new Float32Array(blockSize);
    const highL = new Float32Array(blockSize);
    const highR = new Float32Array(blockSize);

    // Very basic 1-pole crossover (placeholder for proper implementation)
    const omega = 2 * Math.PI * this._crossoverFreq / this._sampleRate;
    const g = Math.tan(omega / 2);
    const a1 = (g - 1) / (g + 1);

    for (let i = 0; i < blockSize; i++) {
      // Lowpass
      const inL = inputL[i];
      const inR = inputR[i];
      
      // Simple 1-pole lowpass
      lowL[i] = inL - a1 * (inL - this._lowpassState.y1);
      lowR[i] = inR - a1 * (inR - this._lowpassState.y1);
      
      // Highpass = input - lowpass
      highL[i] = inL - lowL[i];
      highR[i] = inR - lowR[i];
      
      this._lowpassState.y1 = lowL[i];
    }

    // Process chains with split signals
    // This is a simplified implementation
    this._processParallel(inputs, outputs, midi, blockSize);
  }

  private _mixDryWet(output: AudioBuffer, wetBuffer: AudioBuffer, blockSize: number): void {
    const outL = output.getChannelData(0);
    const outR = output.numberOfChannels > 1 ? output.getChannelData(1) : outL;
    const wetL = wetBuffer.getChannelData(0);
    const wetR = wetBuffer.numberOfChannels > 1 ? wetBuffer.getChannelData(1) : wetL;

    const wetGain = this._dryWet;
    const dryGain = 1 - this._dryWet;

    for (let i = 0; i < blockSize; i++) {
      outL[i] = wetL[i] * wetGain + this._inputBufferL[i] * dryGain;
      outR[i] = wetR[i] * wetGain + this._inputBufferR[i] * dryGain;
    }
  }

  private _applyGlobalDryWet(output: AudioBuffer, blockSize: number): void {
    if (this._dryWet >= 1) return; // All wet

    const outL = output.getChannelData(0);
    const outR = output.numberOfChannels > 1 ? output.getChannelData(1) : outL;
    
    const dryGain = 1 - this._dryWet;
    const wetGain = this._dryWet;

    for (let i = 0; i < blockSize; i++) {
      outL[i] = outL[i] * wetGain + this._inputBufferL[i] * dryGain;
      outR[i] = outR[i] * wetGain + this._inputBufferR[i] * dryGain;
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
  // Buffer Helpers
  // ---------------------------------------------------------------------------

  private _createEmptyBuffer(blockSize: number): AudioBuffer {
    const left = new Float32Array(blockSize);
    const right = new Float32Array(blockSize);
    return this._createBufferFromArrays(left, right, blockSize);
  }

  private _createBufferFromArrays(left: Float32Array, right: Float32Array, blockSize: number): AudioBuffer {
    return {
      numberOfChannels: 2,
      length: blockSize,
      sampleRate: this._sampleRate,
      duration: blockSize / this._sampleRate,
      getChannelData: (ch: number) => ch === 0 ? left : right,
      copyFrom: () => {},
      clear: () => { left.fill(0); right.fill(0); },
    };
  }

  private _updateFilterCoefficients(): void {
    // Update filter coefficients when crossover freq changes
    // This would be used for proper Linkwitz-Riley crossover
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Serialize audio effect rack state
   */
  toJSON(): AudioEffectRackState {
    const base = super.toJSON();
    return {
      ...base,
      type: "audioEffect",
      splitMode: this._splitMode,
      dryWet: this._dryWet,
      crossoverFreq: this._crossoverFreq,
      crossoverSlope: this._crossoverSlope,
      chainDryWet: new Map(this._chainDryWet),
    };
  }

  /**
   * Load audio effect rack state
   */
  loadJSON(state: AudioEffectRackState): void {
    this._name = state.name;
    this._splitMode = state.splitMode ?? "parallel";
    this._dryWet = state.dryWet ?? 1;
    this._crossoverFreq = state.crossoverFreq ?? DEFAULT_CROSSOVER_FREQ;
    this._crossoverSlope = state.crossoverSlope ?? DEFAULT_CROSSOVER_SLOPE;
    this._chainDryWet = new Map(state.chainDryWet ?? []);
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
   * Create an audio effect rack
   */
  static create(name: string, options?: RackCreateOptions & {
    splitMode?: InputSplitMode;
  }): AudioEffectRack {
    const id = `fx_rack_${Date.now()}`;
    const rack = new AudioEffectRack(id, name, options);
    
    if (options?.splitMode) {
      rack.splitMode = options.splitMode;
    }

    return rack;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a parallel effects rack
 */
export function createParallelEffectRack(name: string, numChains: number = 4): AudioEffectRack {
  const rack = AudioEffectRack.create(name, {
    numChains,
    splitMode: "parallel",
  });

  rack.setupParallelChains();
  return rack;
}

/**
 * Create a frequency-split effects rack
 */
export function createMultibandEffectRack(
  name: string,
  bands: Array<{ low: number; high: number }>
): AudioEffectRack {
  const rack = AudioEffectRack.create(name, {
    numChains: bands.length,
    splitMode: "frequency",
  });

  rack.setupFrequencySplit(bands);
  return rack;
}

/**
 * Create a morphing effects rack
 */
export function createMorphEffectRack(name: string, numChains: number = 4): AudioEffectRack {
  const rack = AudioEffectRack.create(name, {
    numChains,
    splitMode: "parallel",
  });

  rack.setupMorphingChains();
  return rack;
}
