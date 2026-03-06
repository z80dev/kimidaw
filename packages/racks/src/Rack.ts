/**
 * Base Rack
 * 
 * Core functionality shared by all rack types:
 * - Chains: Multiple parallel signal chains
 * - Zones: Key, Velocity, Chain Select zones per chain
 * - Macros: 8 macro controls that map to any parameter
 * - Routing: Audio/MIDI routing between chains
 * - Mixing: Volume, pan, solo, mute per chain
 */

import type { 
  RackType,
  RackConfig,
  RackState,
  RackCreateOptions,
  RackEvent,
  RackEventHandler,
  SerializationOptions,
  ChainMixer,
  ChainZones,
  Macro,
} from "./types.js";
import { 
  MAX_MACROS,
  DEFAULT_MACRO_NAMES,
} from "./types.js";
import { DEFAULT_CHAIN_ZONES } from "./Zones.js";
import { DEFAULT_MIXER } from "./Chain.js";
import { DEFAULT_MACRO_COLORS } from "./Macros.js";
import { Chain } from "./Chain.js";
import { MacroBank } from "./Macros.js";
import { ChainSelector } from "./ChainSelector.js";
import type { PluginDefinition, MidiEvent, AudioBuffer } from "@daw/plugin-api";

// =============================================================================
// Constants
// =============================================================================

/** Base rack configuration defaults */
export const DEFAULT_RACK_CONFIG: RackConfig = {
  type: "instrument",
  multiChain: true,
  maxChains: 128,
  hasReturns: false,
  maxReturns: 0,
  supportsZones: true,
  supportsMacros: true,
  supportsNesting: true,
};

// =============================================================================
// Base Rack Class
// =============================================================================

/**
 * Abstract base class for all rack types
 */
export abstract class Rack {
  protected _id: string;
  protected _name: string;
  protected _config: RackConfig;
  protected _chains: Map<string, Chain> = new Map();
  protected _macroBank: MacroBank;
  protected _chainSelector: ChainSelector;
  protected _selectedChainId: string | null = null;
  protected _showChains = true;
  protected _showMacros = true;
  protected _expandedDevices: Set<string> = new Set();
  
  // Runtime state
  protected _sampleRate = 48000;
  protected _blockSize = 128;
  protected _connected = false;
  protected _eventHandlers: RackEventHandler[] = [];
  
  // Solo state tracking
  protected _anySoloActive = false;

  constructor(
    id: string,
    name: string,
    config: Partial<RackConfig> = {},
    options?: RackCreateOptions
  ) {
    this._id = id;
    this._name = name;
    this._config = { ...DEFAULT_RACK_CONFIG, ...config };
    
    // Initialize macros
    const numMacros = options?.numMacros ?? MAX_MACROS;
    this._macroBank = this._createMacroBank(numMacros);
    
    // Initialize chain selector
    this._chainSelector = new ChainSelector();
    
    // Create initial chains
    const numChains = options?.numChains ?? 1;
    for (let i = 0; i < numChains; i++) {
      const chainName = options?.chainNames?.[i] ?? `Chain ${i + 1}`;
      this.addChain(chainName);
    }

    // Set up event forwarding
    this._setupEventForwarding();
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get type(): RackType {
    return this._config.type;
  }

  get config(): RackConfig {
    return { ...this._config };
  }

  get chainCount(): number {
    return this._chains.size;
  }

  get chains(): Chain[] {
    return Array.from(this._chains.values());
  }

  get macros(): MacroBank {
    return this._macroBank;
  }

  get chainSelector(): ChainSelector {
    return this._chainSelector;
  }

  get selectedChainId(): string | null {
    return this._selectedChainId;
  }

  set selectedChainId(value: string | null) {
    if (value === null || this._chains.has(value)) {
      this._selectedChainId = value;
      this._emitEvent({ 
        type: "chainSelected", 
        rackId: this._id, 
        chainId: value ?? undefined 
      });
    }
  }

  get selectedChain(): Chain | null {
    return this._selectedChainId ? this._chains.get(this._selectedChainId) ?? null : null;
  }

  get showChains(): boolean {
    return this._showChains;
  }

  set showChains(value: boolean) {
    this._showChains = value;
  }

  get showMacros(): boolean {
    return this._showMacros;
  }

  set showMacros(value: boolean) {
    this._showMacros = value;
  }

  get isConnected(): boolean {
    return this._connected;
  }

  // ---------------------------------------------------------------------------
  // Chain Management
  // ---------------------------------------------------------------------------

  /**
   * Add a new chain to the rack
   */
  addChain(name: string, options?: {
    index?: number;
    zones?: ChainZones;
    mixer?: Partial<ChainMixer>;
  }): Chain {
    if (this._chains.size >= this._config.maxChains) {
      throw new Error(`Maximum number of chains (${this._config.maxChains}) reached`);
    }

    const id = `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const chain = new Chain(id, name, {
      zones: options?.zones,
      mixer: options?.mixer,
      maxBlockSize: this._blockSize,
    });

    // Set up event handling
    chain.setEventHandler((event) => this._emitEvent(event));
    
    // Track solo changes
    chain.onSoloChanged(() => this._updateSoloState());

    this._chains.set(id, chain);
    
    if (!this._selectedChainId) {
      this._selectedChainId = id;
    }

    this._emitEvent({ type: "chainAdded", rackId: this._id, chainId: id });
    
    return chain;
  }

  /**
   * Remove a chain from the rack
   */
  removeChain(chainId: string): boolean {
    const chain = this._chains.get(chainId);
    if (!chain) return false;

    // Clean up macro mappings
    this._macroBank.removeDeviceMappings(chainId);

    // Dispose chain
    void chain.dispose();
    this._chains.delete(chainId);

    // Update selection
    if (this._selectedChainId === chainId) {
      const firstChain = this.chains[0];
      this._selectedChainId = firstChain?.id ?? null;
    }

    this._updateSoloState();
    this._emitEvent({ type: "chainRemoved", rackId: this._id, chainId });
    
    return true;
  }

  /**
   * Get a chain by ID
   */
  getChain(chainId: string): Chain | undefined {
    return this._chains.get(chainId);
  }

  /**
   * Reorder chains
   */
  moveChain(chainId: string, newIndex: number): boolean {
    const chainArray = this.chains;
    const oldIndex = chainArray.findIndex(c => c.id === chainId);
    if (oldIndex < 0) return false;

    // Rebuild map with new order
    const [moved] = chainArray.splice(oldIndex, 1);
    chainArray.splice(newIndex, 0, moved);

    this._chains.clear();
    for (const chain of chainArray) {
      this._chains.set(chain.id, chain);
    }

    this._emitEvent({ type: "chainReordered", rackId: this._id, chainId });
    return true;
  }

  /**
   * Duplicate a chain
   */
  duplicateChain(chainId: string): Chain | null {
    const source = this._chains.get(chainId);
    if (!source) return null;

    const newChain = this.addChain(`${source.name} Copy`);
    
    // Copy zones and mixer settings
    newChain.zones.setZones(source.zones.getZones());
    
    // Copy devices (shallow copy of definitions)
    for (const device of source.devices) {
      newChain.addDevice({
        ...device,
        id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
    }

    return newChain;
  }

  // ---------------------------------------------------------------------------
  // Solo/Mute Management
  // ---------------------------------------------------------------------------

  /**
   * Check if any chain is soloed
   */
  get anySoloActive(): boolean {
    return this._anySoloActive;
  }

  /**
   * Clear all solo states
   */
  clearAllSolos(): void {
    for (const chain of this._chains.values()) {
      if (chain.isSolo) {
        chain.toggleSolo();
      }
    }
  }

  /**
   * Solo a specific chain (exclusive)
   */
  soloExclusive(chainId: string): void {
    for (const [id, chain] of this._chains) {
      const shouldSolo = id === chainId;
      if (chain.isSolo !== shouldSolo) {
        chain.toggleSolo();
      }
    }
  }

  protected _updateSoloState(): void {
    this._anySoloActive = false;
    for (const chain of this._chains.values()) {
      if (chain.isSolo) {
        this._anySoloActive = true;
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Device Management
  // ---------------------------------------------------------------------------

  /**
   * Add a device to a chain
   */
  addDeviceToChain(
    chainId: string,
    definition: PluginDefinition,
    options?: {
      index?: number;
      isRack?: boolean;
      nestedRack?: RackState;
    }
  ): ChainDevice | null {
    const chain = this._chains.get(chainId);
    if (!chain) return null;

    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const device: ChainDevice = {
      id: deviceId,
      definition,
      isRack: options?.isRack ?? false,
      nestedRack: options?.nestedRack,
      bypassed: false,
      frozen: false,
    };

    chain.addDevice(device, options?.index);
    return device;
  }

  /**
   * Remove a device from a chain
   */
  removeDeviceFromChain(chainId: string, deviceId: string): boolean {
    const chain = this._chains.get(chainId);
    if (!chain) return false;

    const removed = chain.removeDevice(deviceId);
    if (removed) {
      // Clean up macro mappings
      for (const macro of this._macroBank.getAllMacros()) {
        macro.removeMappingsForDevice(deviceId);
      }
    }
    
    return !!removed;
  }

  /**
   * Toggle device expanded state
   */
  toggleDeviceExpanded(deviceId: string): boolean {
    if (this._expandedDevices.has(deviceId)) {
      this._expandedDevices.delete(deviceId);
      return false;
    } else {
      this._expandedDevices.add(deviceId);
      return true;
    }
  }

  // ---------------------------------------------------------------------------
  // Macro Operations
  // ---------------------------------------------------------------------------

  /**
   * Create a parameter mapping for a macro
   */
  mapMacro(
    macroId: number,
    deviceId: string,
    paramId: string,
    options?: Partial<Omit<import("./types.js").MacroMapping, "id" | "deviceId" | "paramId">>
  ): boolean {
    const macro = this._macroBank.getMacro(macroId);
    if (!macro) return false;

    macro.addMapping({
      deviceId,
      paramId,
      minValue: options?.minValue ?? 0,
      maxValue: options?.maxValue ?? 1,
      inverted: options?.inverted ?? false,
      curve: options?.curve ?? 0,
    });

    this._emitEvent({ 
      type: "macroMapped", 
      rackId: this._id, 
      macroId 
    });

    return true;
  }

  /**
   * Remove a macro mapping
   */
  unmapMacro(macroId: number, mappingId: string): boolean {
    const macro = this._macroBank.getMacro(macroId);
    if (!macro) return false;

    const removed = macro.removeMapping(mappingId);
    if (removed) {
      this._emitEvent({ 
        type: "macroUnmapped", 
        rackId: this._id, 
        macroId 
      });
    }
    
    return removed;
  }

  // ---------------------------------------------------------------------------
  // Event System
  // ---------------------------------------------------------------------------

  addEventHandler(handler: RackEventHandler): () => void {
    this._eventHandlers.push(handler);
    return () => {
      const index = this._eventHandlers.indexOf(handler);
      if (index >= 0) {
        this._eventHandlers.splice(index, 1);
      }
    };
  }

  protected _emitEvent(event: RackEvent): void {
    for (const handler of this._eventHandlers) {
      handler(event);
    }
  }

  protected _setupEventForwarding(): void {
    // Forward macro changes
    this._macroBank.onAnyMacroChanged((macroId, value) => {
      this._emitEvent({ 
        type: "macroChanged", 
        rackId: this._id, 
        macroId,
        payload: { value } 
      });
      
      // Apply mapped values to devices
      this._applyMacroToDevices(macroId);
    });
  }

  protected _applyMacroToDevices(macroId: number): void {
    const macro = this._macroBank.getMacro(macroId);
    if (!macro) return;

    const updates = macro.processMappings();
    for (const update of updates) {
      // Find the device and set parameter
      for (const chain of this._chains.values()) {
        const device = chain.getDevice(update.deviceId);
        if (device?.instance) {
          device.instance.setParam(update.paramId, update.value);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Processing
  // ---------------------------------------------------------------------------

  /**
   * Prepare rack for processing
   */
  prepare(sampleRate: number, blockSize: number): void {
    this._sampleRate = sampleRate;
    this._blockSize = blockSize;

    // Prepare chain selector
    this._chainSelector.prepare(sampleRate);

    // Prepare all chains
    for (const chain of this._chains.values()) {
      chain.prepare(sampleRate, blockSize);
    }
  }

  /**
   * Process rack (to be implemented by subclasses)
   */
  abstract process(
    inputs: AudioBuffer[],
    outputs: AudioBuffer[],
    midi: MidiEvent[],
    blockSize: number
  ): void;

  /**
   * Reset rack state
   */
  reset(): void {
    for (const chain of this._chains.values()) {
      chain.reset();
    }
    this._chainSelector.reset();
  }

  // ---------------------------------------------------------------------------
  // Connection
  // ---------------------------------------------------------------------------

  /**
   * Connect rack to audio graph
   */
  connect(): void {
    this._connected = true;
    for (const chain of this._chains.values()) {
      chain.connect();
    }
  }

  /**
   * Disconnect rack from audio graph
   */
  disconnect(): void {
    this._connected = false;
    for (const chain of this._chains.values()) {
      chain.disconnect();
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Dispose of rack resources
   */
  async dispose(): Promise<void> {
    this.disconnect();
    for (const chain of this._chains.values()) {
      await chain.dispose();
    }
    this._chains.clear();
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Serialize rack state
   */
  toJSON(_options?: SerializationOptions): RackState {
    return {
      type: this._config.type,
      name: this._name,
      version: "1.0.0",
      chains: this.chains.map(c => c.toJSON()),
      macros: this._macroBank.toJSON(),
      chainSelector: this._chainSelector.toJSON(),
      showChains: this._showChains,
      showMacros: this._showMacros,
      selectedChainId: this._selectedChainId,
      expandedDevices: Array.from(this._expandedDevices),
    };
  }

  /**
   * Load rack state from JSON
   */
  abstract loadJSON(state: RackState): void;

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  protected _createMacroBank(numMacros: number): MacroBank {
    const macros: Macro[] = [];
    for (let i = 1; i <= numMacros && i <= MAX_MACROS; i++) {
      macros.push({
        id: i,
        name: DEFAULT_MACRO_NAMES[i - 1],
        value: 0,
        defaultValue: 0,
        mappings: [],
        midiCC: null,
        color: DEFAULT_MACRO_COLORS[i - 1],
      });
    }
    return MacroBank.fromJSON(macros);
  }
}

// =============================================================================
// Type Imports for internal use
// =============================================================================

import type { ChainDevice } from "./types.js";

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique rack ID
 */
export function generateRackId(): string {
  return `rack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate rack configuration
 */
export function validateRackConfig(config: RackConfig): string[] {
  const errors: string[] = [];

  if (config.maxChains <= 0) {
    errors.push("maxChains must be positive");
  }

  if (config.maxReturns < 0) {
    errors.push("maxReturns must be non-negative");
  }

  if (config.hasReturns && config.maxReturns === 0) {
    errors.push("maxReturns must be > 0 when hasReturns is true");
  }

  return errors;
}

/**
 * Merge mixer settings with defaults
 */
export function mergeMixerSettings(
  mixer: Partial<ChainMixer>,
  defaults: ChainMixer = DEFAULT_MIXER
): ChainMixer {
  return {
    volume: mixer.volume ?? defaults.volume,
    pan: mixer.pan ?? defaults.pan,
    mute: mixer.mute ?? defaults.mute,
    solo: mixer.solo ?? defaults.solo,
    soloIsolate: mixer.soloIsolate ?? defaults.soloIsolate,
    meterGain: mixer.meterGain ?? defaults.meterGain,
  };
}

/**
 * Merge zone settings with defaults
 */
export function mergeZoneSettings(
  zones: Partial<ChainZones>,
  defaults: ChainZones = DEFAULT_CHAIN_ZONES
): ChainZones {
  return {
    key: { ...defaults.key, ...zones.key },
    velocity: { ...defaults.velocity, ...zones.velocity },
    chainSelect: { ...defaults.chainSelect, ...zones.chainSelect },
  };
}
