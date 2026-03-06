/**
 * MIDI Effect Rack
 * 
 * MIDI processing chains:
 * - Multiple parallel MIDI effect chains
 * - Chain select routing
 * - Velocity/Key zone processing
 */

import type { 
  MidiEffectRackState,
  RackCreateOptions,
  ChainSelectionContext,
} from "./types.js";
import { Rack, DEFAULT_RACK_CONFIG } from "./Rack.js";
import { Chain } from "./Chain.js";
import { MacroBank } from "./Macros.js";
import { ChainSelector } from "./ChainSelector.js";
import type { AudioBuffer, MidiEvent } from "@daw/plugin-api";

// =============================================================================
// Constants
// =============================================================================

/** MIDI effect rack specific config */
const MIDI_EFFECT_RACK_CONFIG = {
  ...DEFAULT_RACK_CONFIG,
  type: "midiEffect" as const,
  multiChain: true,
  maxChains: 128,
  hasReturns: false,
  maxReturns: 0,
  supportsZones: true,
  supportsMacros: true,
  supportsNesting: true,
};

/** Default MIDI processing options */
export const DEFAULT_MIDI_PROCESSING = {
  processNoteOff: true,
  processCC: true,
  processPitchBend: true,
  processChannelPressure: true,
};

// =============================================================================
// MIDI Effect Rack Class
// =============================================================================

/**
 * MIDI Effect Rack for parallel MIDI processing
 */
export class MidiEffectRack extends Rack {
  private _processNoteOff = true;
  private _processCC = true;
  private _processPitchBend = true;
  private _processChannelPressure = true;
  
  // Velocity processing
  private _velocityMode: "pass" | "scale" | "fixed" | "random" = "pass";
  private _fixedVelocity = 100;
  private _velocityScale = 1;
  private _velocityOffset = 0;
  
  // Event processing
  private _pendingOutputEvents: MidiEvent[] = [];
  private _eventListeners: Array<(event: MidiEvent) => void> = [];

  constructor(id: string, name: string, options?: RackCreateOptions) {
    super(id, name, MIDI_EFFECT_RACK_CONFIG, options);
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get processNoteOff(): boolean {
    return this._processNoteOff;
  }

  set processNoteOff(value: boolean) {
    this._processNoteOff = value;
  }

  get processCC(): boolean {
    return this._processCC;
  }

  set processCC(value: boolean) {
    this._processCC = value;
  }

  get processPitchBend(): boolean {
    return this._processPitchBend;
  }

  set processPitchBend(value: boolean) {
    this._processPitchBend = value;
  }

  get processChannelPressure(): boolean {
    return this._processChannelPressure;
  }

  set processChannelPressure(value: boolean) {
    this._processChannelPressure = value;
  }

  get velocityMode(): "pass" | "scale" | "fixed" | "random" {
    return this._velocityMode;
  }

  set velocityMode(value: "pass" | "scale" | "fixed" | "random") {
    this._velocityMode = value;
  }

  get fixedVelocity(): number {
    return this._fixedVelocity;
  }

  set fixedVelocity(value: number) {
    this._fixedVelocity = Math.max(1, Math.min(127, value));
  }

  get velocityScale(): number {
    return this._velocityScale;
  }

  set velocityScale(value: number) {
    this._velocityScale = Math.max(0, Math.min(2, value));
  }

  get velocityOffset(): number {
    return this._velocityOffset;
  }

  set velocityOffset(value: number) {
    this._velocityOffset = Math.max(-127, Math.min(127, value));
  }

  // ---------------------------------------------------------------------------
  // Chain Configuration
  // ---------------------------------------------------------------------------

  /**
   * Set up chains for velocity-based routing
   */
  setupVelocityRouting(layers: Array<{ min: number; max: number }>): void {
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
  }

  /**
   * Set up chains for key-based routing
   */
  setupKeyRouting(ranges: Array<{ min: number; max: number }>): void {
    const chains = this.chains;
    
    for (let i = 0; i < chains.length && i < ranges.length; i++) {
      const chain = chains[i];
      const range = ranges[i];
      const zones = chain.zones.getZones();
      
      zones.key.low = range.min;
      zones.key.high = range.max;
      zones.key.fadeLow = Math.max(0, range.min - 3);
      zones.key.fadeHigh = Math.min(127, range.max + 3);
      
      chain.zones.setZones(zones);
    }
  }

  /**
   * Set up chains for chain-select-based routing
   */
  setupChainSelectRouting(): void {
    const chains = this.chains;
    const rangeSize = 128 / chains.length;
    
    for (let i = 0; i < chains.length; i++) {
      const chain = chains[i];
      const zones = chain.zones.getZones();
      
      const low = i * rangeSize;
      const high = (i + 1) * rangeSize;
      
      zones.chainSelect.low = low;
      zones.chainSelect.high = high;
      zones.chainSelect.fadeLow = Math.max(0, low - rangeSize * 0.2);
      zones.chainSelect.fadeHigh = Math.min(127, high + rangeSize * 0.2);
      
      chain.zones.setZones(zones);
    }
  }

  // ---------------------------------------------------------------------------
  // Processing
  // ---------------------------------------------------------------------------

  /**
   * Process MIDI through the rack
   * Note: This is called with audio buffers but only processes MIDI
   */
  process(
    _inputs: AudioBuffer[],
    _outputs: AudioBuffer[],
    midi: MidiEvent[],
    blockSize: number
  ): void {
    // Clear pending events
    this._pendingOutputEvents = [];

    // Update chain selector
    this._chainSelector.process(blockSize);

    // Process each MIDI event
    for (const event of midi) {
      if (this._shouldProcessEvent(event)) {
        const processed = this._processMidiEvent(event);
        this._pendingOutputEvents.push(...processed);
      } else {
        this._pendingOutputEvents.push(event);
      }
    }

    // Apply macros
    this._processMacros();

    // Notify listeners of processed events
    for (const event of this._pendingOutputEvents) {
      for (const listener of this._eventListeners) {
        listener(event);
      }
    }
  }

  /**
   * Get the processed output events from the last process call
   */
  getOutputEvents(): MidiEvent[] {
    return [...this._pendingOutputEvents];
  }

  private _shouldProcessEvent(event: MidiEvent): boolean {
    switch (event.type) {
      case "noteOn":
      case "noteOff":
        return this._processNoteOff || event.type === "noteOn";
      case "cc":
        return this._processCC;
      case "pitchBend":
        return this._processPitchBend;
      case "channelPressure":
        return this._processChannelPressure;
      default:
        return true;
    }
  }

  private _processMidiEvent(event: MidiEvent): MidiEvent[] {
    const processed: MidiEvent[] = [];

    switch (event.type) {
      case "noteOn": {
        const data = event.data as import("@daw/plugin-api").NoteOnData;
        const note = data.note;
        const velocity = this._processVelocity(data.velocity);
        
        // Find chains that should process this note
        const context = this._chainSelector.createContext(note, velocity, event.channel);
        const selectedChains = this._selectChainsForMidi(context);
        
        // Create output events for each selected chain
        for (const { chain: _chain, result } of selectedChains) {
          if (result.active) {
            processed.push({
              ...event,
              data: {
                ...data,
                velocity: Math.round(velocity * result.gain),
              },
            });
          }
        }
        
        // If no chains selected, pass through
        if (processed.length === 0) {
          processed.push({
            ...event,
            data: { ...data, velocity },
          });
        }
        break;
      }
      
      case "noteOff": {
        if (this._processNoteOff) {
          const data = event.data as import("@daw/plugin-api").NoteOffData;
          const note = data.note;
          const context = this._chainSelector.createContext(note, 0, event.channel);
          const selectedChains = this._selectChainsForMidi(context);
          
          for (const { chain: _chain, result } of selectedChains) {
            if (result.active) {
              processed.push(event);
            }
          }
          
          if (processed.length === 0) {
            processed.push(event);
          }
        } else {
          processed.push(event);
        }
        break;
      }
      
      case "cc":
      case "pitchBend":
      case "channelPressure":
        // Pass through but apply chain selection
        processed.push(event);
        break;
        
      default:
        processed.push(event);
    }

    return processed;
  }

  private _processVelocity(velocity: number): number {
    switch (this._velocityMode) {
      case "pass":
        return velocity;
        
      case "scale": {
        const scaled = velocity * this._velocityScale + this._velocityOffset;
        return Math.max(1, Math.min(127, Math.round(scaled)));
      }
        
      case "fixed":
        return this._fixedVelocity;
        
      case "random": {
        const randomVel = Math.floor(Math.random() * 127) + 1;
        const scaled = randomVel * this._velocityScale + this._velocityOffset;
        return Math.max(1, Math.min(127, Math.round(scaled)));
      }
        
      default:
        return velocity;
    }
  }

  private _selectChainsForMidi(
    context: ChainSelectionContext
  ): Array<{ chain: Chain; result: import("./types.js").ZoneResult }> {
    const selected: Array<{ chain: Chain; result: import("./types.js").ZoneResult }> = [];

    for (const chain of this._chains.values()) {
      const result = chain.evaluateZones(context);
      if (result.active) {
        selected.push({ chain, result });
      }
    }

    return selected;
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
  // Event Handling
  // ---------------------------------------------------------------------------

  /**
   * Add a listener for processed MIDI events
   */
  onMidiEvent(listener: (event: MidiEvent) => void): () => void {
    this._eventListeners.push(listener);
    return () => {
      const index = this._eventListeners.indexOf(listener);
      if (index >= 0) {
        this._eventListeners.splice(index, 1);
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Utility Functions
  // ---------------------------------------------------------------------------

  /**
   * Generate a random velocity within current constraints
   */
  generateRandomVelocity(): number {
    const base = Math.floor(Math.random() * 127) + 1;
    return Math.max(1, Math.min(127, Math.round(base * this._velocityScale + this._velocityOffset)));
  }

  /**
   * Quantize velocity to steps
   */
  quantizeVelocity(velocity: number, steps: number = 4): number {
    const stepSize = 127 / steps;
    const quantized = Math.round(velocity / stepSize) * stepSize;
    return Math.max(1, Math.min(127, quantized));
  }

  /**
   * Create a velocity curve lookup table
   */
  createVelocityCurve(curve: number): number[] {
    const table: number[] = [];
    for (let i = 0; i <= 127; i++) {
      const normalized = i / 127;
      let curved: number;
      
      if (curve === 0) {
        curved = normalized;
      } else if (curve > 0) {
        // Logarithmic-like
        curved = Math.pow(normalized, 1 + curve);
      } else {
        // Exponential-like
        curved = 1 - Math.pow(1 - normalized, 1 - curve);
      }
      
      table.push(Math.round(curved * 127));
    }
    return table;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Serialize MIDI effect rack state
   */
  toJSON(): MidiEffectRackState {
    const base = super.toJSON();
    return {
      ...base,
      type: "midiEffect",
      processNoteOff: this._processNoteOff,
      processCC: this._processCC,
      processPitchBend: this._processPitchBend,
      processChannelPressure: this._processChannelPressure,
      velocityMode: this._velocityMode,
      fixedVelocity: this._fixedVelocity,
      velocityScale: this._velocityScale,
      velocityOffset: this._velocityOffset,
    };
  }

  /**
   * Load MIDI effect rack state
   */
  loadJSON(state: MidiEffectRackState): void {
    this._name = state.name;
    this._processNoteOff = state.processNoteOff ?? true;
    this._processCC = state.processCC ?? true;
    this._processPitchBend = state.processPitchBend ?? true;
    this._processChannelPressure = state.processChannelPressure ?? true;
    this._velocityMode = state.velocityMode ?? "pass";
    this._fixedVelocity = state.fixedVelocity ?? 100;
    this._velocityScale = state.velocityScale ?? 1;
    this._velocityOffset = state.velocityOffset ?? 0;
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
   * Create a MIDI effect rack
   */
  static create(name: string, options?: RackCreateOptions): MidiEffectRack {
    const id = `midi_fx_rack_${Date.now()}`;
    return new MidiEffectRack(id, name, options);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a velocity processor rack
 */
export function createVelocityProcessorRack(name: string = "Velocity Processor"): MidiEffectRack {
  const rack = MidiEffectRack.create(name);
  rack.velocityMode = "scale";
  rack.velocityScale = 1.2; // Boost velocity
  return rack;
}

/**
 * Create a note router rack
 */
export function createNoteRouterRack(
  name: string = "Note Router",
  ranges: Array<{ min: number; max: number }>
): MidiEffectRack {
  const rack = MidiEffectRack.create(name, {
    numChains: ranges.length,
  });

  rack.setupKeyRouting(ranges);
  return rack;
}

/**
 * Create a humanize rack (random velocity)
 */
export function createHumanizeRack(
  name: string = "Humanize",
  amount: number = 0.3
): MidiEffectRack {
  const rack = MidiEffectRack.create(name);
  rack.velocityMode = "random";
  rack.velocityScale = 1 - amount;
  rack.velocityOffset = amount * 64;
  return rack;
}

/**
 * Create a chain selector MIDI rack
 */
export function createChainSelectorRack(
  name: string = "Chain Selector",
  numChains: number = 4
): MidiEffectRack {
  const rack = MidiEffectRack.create(name, { numChains });
  rack.setupChainSelectRouting();
  return rack;
}

// =============================================================================
// MIDI Event Helpers
// =============================================================================

/**
 * Create a note-on event
 */
export function createNoteOn(
  note: number,
  velocity: number,
  channel: number = 0,
  sampleOffset: number = 0
): MidiEvent {
  return {
    type: "noteOn",
    sampleOffset,
    channel,
    data: { note, velocity },
  };
}

/**
 * Create a note-off event
 */
export function createNoteOff(
  note: number,
  velocity: number = 0,
  channel: number = 0,
  sampleOffset: number = 0
): MidiEvent {
  return {
    type: "noteOff",
    sampleOffset,
    channel,
    data: { note, velocity },
  };
}

/**
 * Create a CC event
 */
export function createCC(
  controller: number,
  value: number,
  channel: number = 0,
  sampleOffset: number = 0
): MidiEvent {
  return {
    type: "cc",
    sampleOffset,
    channel,
    data: { controller, value },
  };
}

/**
 * Transpose a note event
 */
export function transposeNote(event: MidiEvent, semitones: number): MidiEvent {
  if (event.type !== "noteOn" && event.type !== "noteOff") {
    return event;
  }

  const data = event.data as import("@daw/plugin-api").NoteOnData | import("@daw/plugin-api").NoteOffData;
  const newNote = Math.max(0, Math.min(127, data.note + semitones));
  return {
    ...event,
    data: { ...data, note: newNote },
  };
}

/**
 * Scale velocity of a note event
 */
export function scaleVelocity(event: MidiEvent, scale: number): MidiEvent {
  if (event.type !== "noteOn") {
    return event;
  }

  const data = event.data as import("@daw/plugin-api").NoteOnData;
  const newVelocity = Math.max(1, Math.min(127, Math.round(data.velocity * scale)));
  return {
    ...event,
    data: { ...data, velocity: newVelocity },
  };
}
