/**
 * Drum Rack
 * 
 * Enhanced drum rack:
 * - 128 pads (0-127 MIDI notes)
 * - Each pad: Chain with instruments + effects OR sample
 * - Choke groups (32 groups)
 * - Output routing (main or individual)
 * - Send levels to return chains
 * - Up to 6 return effect chains
 */

import type { 
  DrumRackState,
  DrumPad,
  DrumRackCreateOptions,
  SendSlot,
  RackChain,
} from "./types.js";
import { Rack, DEFAULT_RACK_CONFIG } from "./Rack.js";
import { Chain } from "./Chain.js";
import { MacroBank } from "./Macros.js";
import { ChainSelector } from "./ChainSelector.js";
import type { AudioBuffer, MidiEvent } from "@daw/plugin-api";

// =============================================================================
// Constants
// =============================================================================

/** Number of possible drum pads (MIDI note range) */
export const DRUM_PAD_COUNT = 128;

/** Maximum number of choke groups */
export const MAX_CHOKE_GROUPS = 32;

/** Maximum number of return chains */
export const MAX_RETURN_CHAINS = 6;

/** Default visible pads */
export const DEFAULT_VISIBLE_PADS = 16;

/** Default MIDI notes for visible pads */
export const DEFAULT_PAD_NOTES = [
  36, 37, 38, 39, // Kick, Rim, Snare, Clap
  40, 41, 42, 43, // Snare2, LowTom, ClosedHH, MidTom
  44, 45, 46, 47, // OpenHH, HiTom, OpenHH2, LowConga
  48, 49, 50, 51, // HiConga, Crash, Ride, HiTom2
];

/** Drum rack specific config */
const DRUM_RACK_CONFIG = {
  ...DEFAULT_RACK_CONFIG,
  type: "drum" as const,
  multiChain: true,
  maxChains: 128,
  hasReturns: true,
  maxReturns: MAX_RETURN_CHAINS,
  supportsZones: true,
  supportsMacros: true,
  supportsNesting: true,
};

// =============================================================================
// Drum Rack Class
// =============================================================================

/**
 * Drum Rack with 128 pads, choke groups, and return chains
 */
export class DrumRack extends Rack {
  private _pads: (DrumPad | null)[] = new Array(DRUM_PAD_COUNT).fill(null);
  private _returnChains: Chain[] = [];
  private _visiblePadCount = DEFAULT_VISIBLE_PADS;
  private _autoSelect = true;
  private _inputFilterLow = 0;
  private _inputFilterHigh = 127;
  
  // Choke group tracking
  private _chokeGroups: Map<number, Set<number>> = new Map(); // group -> set of notes
  
  // Processing buffers
  private _mainOutputL: Float32Array;
  private _mainOutputR: Float32Array;
  private _returnOutputs: Map<string, { left: Float32Array; right: Float32Array }> = new Map();

  constructor(id: string, name: string, options?: DrumRackCreateOptions) {
    super(id, name, DRUM_RACK_CONFIG, options);
    
    const maxBlockSize = options?.maxBlockSize ?? 128;
    this._mainOutputL = new Float32Array(maxBlockSize);
    this._mainOutputR = new Float32Array(maxBlockSize);
    
    // Initialize pads
    const numPads = options?.numPads ?? DEFAULT_VISIBLE_PADS;
    const padNotes = options?.padNotes ?? DEFAULT_PAD_NOTES.slice(0, numPads);
    
    for (const note of padNotes) {
      this._createPad(note);
    }
    
    // Initialize return chains
    const numReturns = options?.numReturns ?? 2;
    for (let i = 0; i < numReturns && i < MAX_RETURN_CHAINS; i++) {
      this.addReturnChain(`Return ${i + 1}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get visiblePadCount(): number {
    return this._visiblePadCount;
  }

  set visiblePadCount(value: number) {
    this._visiblePadCount = Math.max(1, Math.min(DRUM_PAD_COUNT, value));
  }

  get autoSelect(): boolean {
    return this._autoSelect;
  }

  set autoSelect(value: boolean) {
    this._autoSelect = value;
  }

  get returnChains(): Chain[] {
    return [...this._returnChains];
  }

  get pads(): (DrumPad | null)[] {
    return [...this._pads];
  }

  get activePadCount(): number {
    return this._pads.filter(p => p !== null).length;
  }

  // ---------------------------------------------------------------------------
  // Pad Management
  // ---------------------------------------------------------------------------

  /**
   * Get a pad by MIDI note
   */
  getPad(note: number): DrumPad | null {
    if (note < 0 || note >= DRUM_PAD_COUNT) return null;
    return this._pads[note];
  }

  /**
   * Create a new pad at a MIDI note
   */
  createPad(note: number, name?: string): DrumPad | null {
    if (note < 0 || note >= DRUM_PAD_COUNT) return null;
    
    return this._createPad(note, name);
  }

  /**
   * Remove a pad
   */
  removePad(note: number): boolean {
    if (note < 0 || note >= DRUM_PAD_COUNT) return false;
    
    const pad = this._pads[note];
    if (!pad) return false;

    // Remove from choke group
    if (pad.chokeGroup !== null) {
      const group = this._chokeGroups.get(pad.chokeGroup);
      group?.delete(note);
    }

    // Remove chain
    this.removeChain(pad.chain.id);
    
    this._pads[note] = null;
    return true;
  }

  /**
   * Rename a pad
   */
  renamePad(note: number, name: string): boolean {
    const pad = this._pads[note];
    if (!pad) return false;
    
    pad.name = name;
    pad.chain.name = name;
    return true;
  }

  /**
   * Set pad color
   */
  setPadColor(note: number, color: string): boolean {
    const pad = this._pads[note];
    if (!pad) return false;
    
    pad.color = color;
    return true;
  }

  private _createPad(note: number, name?: string): DrumPad {
    // Remove existing pad if any
    if (this._pads[note]) {
      this.removePad(note);
    }

    // Create chain for this pad
    const chainName = name ?? `Pad ${note}`;
    const chain = this.addChain(chainName);

    const pad: DrumPad = {
      note,
      name: chainName,
      chain,
      chokeGroup: null,
      isChokeMaster: false,
      swing: 0,
      timeShift: 0,
    };

    this._pads[note] = pad;

    // Add sends to return chains
    for (const returnChain of this._returnChains) {
      this._addSendToPad(pad, returnChain.id);
    }

    return pad;
  }

  private _addSendToPad(pad: DrumPad, returnChainId: string): void {
    const send: SendSlot = {
      id: `send_${pad.note}_${returnChainId}`,
      targetId: returnChainId,
      level: 0,
      preFader: false,
      active: true,
    };
    
    pad.chain.addSend(send);
  }

  // ---------------------------------------------------------------------------
  // Choke Groups
  // ---------------------------------------------------------------------------

  /**
   * Set choke group for a pad
   */
  setPadChokeGroup(note: number, group: number | null, isMaster = false): boolean {
    const pad = this._pads[note];
    if (!pad) return false;

    // Remove from old group
    if (pad.chokeGroup !== null) {
      const oldGroup = this._chokeGroups.get(pad.chokeGroup);
      oldGroup?.delete(note);
    }

    // Set new group
    pad.chokeGroup = group;
    pad.isChokeMaster = isMaster;

    // Add to new group
    if (group !== null) {
      const newGroup = this._chokeGroups.get(group) ?? new Set();
      newGroup.add(note);
      this._chokeGroups.set(group, newGroup);
    }

    return true;
  }

  /**
   * Trigger choke for a group
   */
  private _chokeGroup(group: number, exceptNote: number): void {
    const groupPads = this._chokeGroups.get(group);
    if (!groupPads) return;

    for (const note of groupPads) {
      if (note !== exceptNote) {
        const pad = this._pads[note];
        if (pad) {
          // Mute/choke the pad's chain
          pad.chain.toggleMute();
        }
      }
    }
  }

  /**
   * Clear all choke group assignments
   */
  clearAllChokeGroups(): void {
    for (const pad of this._pads) {
      if (pad) {
        pad.chokeGroup = null;
        pad.isChokeMaster = false;
      }
    }
    this._chokeGroups.clear();
  }

  // ---------------------------------------------------------------------------
  // Return Chains
  // ---------------------------------------------------------------------------

  /**
   * Add a return chain
   */
  addReturnChain(name: string): Chain {
    if (this._returnChains.length >= MAX_RETURN_CHAINS) {
      throw new Error(`Maximum number of return chains (${MAX_RETURN_CHAINS}) reached`);
    }

    const id = `return_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const chain = new Chain(id, name, { maxBlockSize: this._blockSize });
    
    this._returnChains.push(chain);
    
    // Add sends to all pads
    for (const pad of this._pads) {
      if (pad) {
        this._addSendToPad(pad, id);
      }
    }

    return chain;
  }

  /**
   * Remove a return chain
   */
  removeReturnChain(chainId: string): boolean {
    const index = this._returnChains.findIndex(c => c.id === chainId);
    if (index < 0) return false;

    const chain = this._returnChains[index];
    
    // Remove sends from all pads
    for (const pad of this._pads) {
      if (pad) {
        const sendId = `send_${pad.note}_${chainId}`;
        pad.chain.removeSend(sendId);
      }
    }

    void chain.dispose();
    this._returnChains.splice(index, 1);
    
    return true;
  }

  /**
   * Get a return chain by ID
   */
  getReturnChain(chainId: string): Chain | undefined {
    return this._returnChains.find(c => c.id === chainId);
  }

  /**
   * Set send level for a pad
   */
  setPadSendLevel(note: number, returnChainId: string, level: number): boolean {
    const pad = this._pads[note];
    if (!pad) return false;

    const sendId = `send_${note}_${returnChainId}`;
    return pad.chain.setSendLevel(sendId, level);
  }

  // ---------------------------------------------------------------------------
  // Pad Triggering
  // ---------------------------------------------------------------------------

  /**
   * Trigger a pad (for UI or sequencer)
   */
  triggerPad(note: number, velocity = 100): boolean {
    const pad = this._pads[note];
    if (!pad) return false;

    // Handle choke groups
    if (pad.chokeGroup !== null) {
      this._chokeGroup(pad.chokeGroup, note);
    }

    // Select the pad's chain if auto-select is on
    if (this._autoSelect) {
      this.selectedChainId = pad.chain.id;
    }

    this._emitEvent({ 
      type: "padTriggered", 
      rackId: this._id, 
      chainId: pad.chain.id,
      payload: { note, velocity }
    });

    return true;
  }

  /**
   * Trigger a pad with a specific output routing
   */
  triggerPadToOutput(
    note: number, 
    velocity: number,
    outputTarget: "main" | "individual" | string
  ): boolean {
    const pad = this._pads[note];
    if (!pad) return false;

    // Set output target temporarily
    const oldTarget = pad.chain.outputTarget;
    
    if (outputTarget === "individual") {
      // Individual output - each pad to separate output
      pad.chain.outputTarget = `pad_${note}`;
    } else {
      pad.chain.outputTarget = outputTarget === "main" ? null : outputTarget;
    }

    const result = this.triggerPad(note, velocity);
    
    // Restore target (in real implementation, this might be persistent)
    pad.chain.outputTarget = oldTarget;
    
    return result;
  }

  // ---------------------------------------------------------------------------
  // Processing
  // ---------------------------------------------------------------------------

  /**
   * Process audio through the drum rack
   */
  process(
    _inputs: AudioBuffer[],
    outputs: AudioBuffer[],
    midi: MidiEvent[],
    blockSize: number
  ): void {
    // Ensure buffers are sized correctly
    if (this._mainOutputL.length < blockSize) {
      this._mainOutputL = new Float32Array(blockSize);
      this._mainOutputR = new Float32Array(blockSize);
    }

    // Clear outputs
    this._mainOutputL.fill(0, 0, blockSize);
    this._mainOutputR.fill(0, blockSize);
    
    for (const [_, buf] of this._returnOutputs) {
      buf.left.fill(0, 0, blockSize);
      buf.right.fill(0, blockSize);
    }

    // Process MIDI events
    for (const event of midi) {
      this._handleMidiEvent(event);
    }

    // Process all pads
    for (let note = 0; note < DRUM_PAD_COUNT; note++) {
      const pad = this._pads[note];
      if (!pad || !pad.chain.isActive) continue;

      this._processPad(pad, blockSize);
    }

    // Process return chains
    for (const returnChain of this._returnChains) {
      this._processReturnChain(returnChain, blockSize);
    }

    // Write to outputs
    this._writeToOutputs(outputs, blockSize);

    // Apply macros
    this._processMacros();
  }

  private _handleMidiEvent(event: MidiEvent): void {
    switch (event.type) {
      case "noteOn": {
        const data = event.data as import("@daw/plugin-api").NoteOnData;
        const note = data.note;
        const velocity = data.velocity;
        
        // Check input filter
        if (note < this._inputFilterLow || note > this._inputFilterHigh) {
          return;
        }

        if (velocity === 0) {
          // Note-off
          this._releasePad(note);
        } else {
          this._triggerPadMidi(note, velocity);
        }
        break;
      }
      
      case "noteOff": {
        const data = event.data as import("@daw/plugin-api").NoteOffData;
        this._releasePad(data.note);
        break;
      }
    }
  }

  private _triggerPadMidi(note: number, _velocity: number): void {
    const pad = this._pads[note];
    if (!pad) return;

    // Handle choke groups
    if (pad.chokeGroup !== null) {
      this._chokeGroup(pad.chokeGroup, note);
    }

    // Trigger the pad's chain
    // In a real implementation, this would trigger note-on in the chain's devices

    if (this._autoSelect) {
      this.selectedChainId = pad.chain.id;
    }
  }

  private _releasePad(note: number): void {
    const pad = this._pads[note];
    if (!pad) return;
    
    // Release the pad's chain
    // In a real implementation, this would trigger note-off in the chain's devices
  }

  private _processPad(pad: DrumPad, blockSize: number): void {
    // Get chain volume before processing sends
    const chainVolume = pad.chain.getVolumeLinear();
    
    // Temporary output buffer for this pad
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

    // Process pad's chain
    pad.chain.process([], [tempBuffer], [], blockSize);

    // Add to main output
    for (let i = 0; i < blockSize; i++) {
      this._mainOutputL[i] += tempL[i];
      this._mainOutputR[i] += tempR[i];
    }

    // Process sends
    for (const send of pad.chain.sends ?? []) {
      if (!send.active || send.level <= 0) continue;

      const returnChain = this._returnChains.find(r => r.id === send.targetId);
      if (!returnChain) continue;

      // Get or create return buffer
      let returnBuf = this._returnOutputs.get(returnChain.id);
      if (!returnBuf) {
        returnBuf = {
          left: new Float32Array(blockSize),
          right: new Float32Array(blockSize),
        };
        this._returnOutputs.set(returnChain.id, returnBuf);
      }

      // Apply send level
      const sendGain = send.level * (send.preFader ? 1 : chainVolume);
      
      for (let i = 0; i < blockSize; i++) {
        returnBuf.left[i] += tempL[i] * sendGain;
        returnBuf.right[i] += tempR[i] * sendGain;
      }
    }
  }

  private _processReturnChain(returnChain: Chain, blockSize: number): void {
    const returnBuf = this._returnOutputs.get(returnChain.id);
    if (!returnBuf) return;

    // Create buffer wrapper
    const inputBuffer: AudioBuffer = {
      numberOfChannels: 2,
      length: blockSize,
      sampleRate: this._sampleRate,
      duration: blockSize / this._sampleRate,
      getChannelData: (ch: number) => ch === 0 ? returnBuf.left : returnBuf.right,
      copyFrom: () => {},
      clear: () => { returnBuf.left.fill(0); returnBuf.right.fill(0); },
    };

    const outputL = new Float32Array(blockSize);
    const outputR = new Float32Array(blockSize);
    
    const outputBuffer: AudioBuffer = {
      numberOfChannels: 2,
      length: blockSize,
      sampleRate: this._sampleRate,
      duration: blockSize / this._sampleRate,
      getChannelData: (ch: number) => ch === 0 ? outputL : outputR,
      copyFrom: () => {},
      clear: () => { outputL.fill(0); outputR.fill(0); },
    };

    // Process through return chain
    returnChain.process([inputBuffer], [outputBuffer], [], blockSize);

    // Add to main output
    for (let i = 0; i < blockSize; i++) {
      this._mainOutputL[i] += outputL[i];
      this._mainOutputR[i] += outputR[i];
    }
  }

  private _writeToOutputs(outputs: AudioBuffer[], blockSize: number): void {
    if (outputs.length === 0) return;

    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    for (let i = 0; i < blockSize; i++) {
      outputL[i] = this._mainOutputL[i];
      outputR[i] = this._mainOutputR[i];
    }
  }

  private _processMacros(): void {
    const updates = this._macroBank.processAllMappings();
    for (const update of updates) {
      // Check pad chains
      for (const pad of this._pads) {
        if (!pad) continue;
        const device = pad.chain.getDevice(update.deviceId);
        if (device?.instance) {
          device.instance.setParam(update.paramId, update.value);
        }
      }
      
      // Check return chains
      for (const returnChain of this._returnChains) {
        const device = returnChain.getDevice(update.deviceId);
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
   * Serialize drum rack state
   */
  toJSON(): DrumRackState {
    const base = super.toJSON();
    return {
      ...base,
      type: "drum",
      pads: [...this._pads],
      visiblePadCount: this._visiblePadCount,
      returnChains: this._returnChains.map(c => c.toJSON()),
      autoSelect: this._autoSelect,
      inputFilterLow: this._inputFilterLow,
      inputFilterHigh: this._inputFilterHigh,
    };
  }

  /**
   * Load drum rack state
   */
  loadJSON(state: DrumRackState): void {
    this._name = state.name;
    this._visiblePadCount = state.visiblePadCount ?? DEFAULT_VISIBLE_PADS;
    this._autoSelect = state.autoSelect ?? true;
    this._inputFilterLow = state.inputFilterLow ?? 0;
    this._inputFilterHigh = state.inputFilterHigh ?? 127;
    this._showChains = state.showChains;
    this._showMacros = state.showMacros;
    this._selectedChainId = state.selectedChainId;
    this._expandedDevices = new Set(state.expandedDevices);

    // Load return chains
    this._returnChains = [];
    for (const chainData of state.returnChains ?? []) {
      this._returnChains.push(Chain.fromJSON(chainData, this._blockSize));
    }

    // Load pads and chains
    this._chains.clear();
    this._pads = new Array(DRUM_PAD_COUNT).fill(null);
    
    for (let i = 0; i < state.pads.length; i++) {
      const padData = state.pads[i];
      if (padData) {
        this._pads[i] = padData;
        this._chains.set(padData.chain.id, Chain.fromJSON(padData.chain as unknown as RackChain, this._blockSize));
      }
    }

    // Rebuild choke groups
    this._chokeGroups.clear();
    for (const pad of this._pads) {
      if (pad && pad.chokeGroup !== null) {
        const group = this._chokeGroups.get(pad.chokeGroup) ?? new Set();
        group.add(pad.note);
        this._chokeGroups.set(pad.chokeGroup, group);
      }
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
   * Create a drum rack with default settings
   */
  static create(name: string, options?: DrumRackCreateOptions): DrumRack {
    const id = `drum_rack_${Date.now()}`;
    return new DrumRack(id, name, options);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a standard 16-pad drum rack
 */
export function createStandardDrumRack(name: string = "Drum Rack"): DrumRack {
  return DrumRack.create(name, {
    numPads: 16,
    numReturns: 2,
  });
}

/**
 * Create an expanded 64-pad drum rack
 */
export function createExpandedDrumRack(name: string = "Big Drum Rack"): DrumRack {
  return DrumRack.create(name, {
    numPads: 64,
    numReturns: 4,
  });
}

/**
 * Create an 808-style drum rack
 */
export function create808Rack(name: string = "808 Kit"): DrumRack {
  const rack = DrumRack.create(name, {
    numPads: 11,
    padNotes: [36, 38, 40, 37, 42, 44, 46, 50, 49, 48, 45],
  });

  // Name the pads
  const names = [
    "Kick", "Snare", "Snare Rim", "Rimshot",
    "Closed HH", "Open HH", "Open HH Long",
    "Tom Hi", "Crash", "Ride", "Tom Low"
  ];
  
  for (let i = 0; i < names.length; i++) {
    rack.renamePad(rack.pads.findIndex(p => p?.note === [36, 38, 40, 37, 42, 44, 46, 50, 49, 48, 45][i]) ?? 36, names[i]!);
  }

  return rack;
}

/**
 * Note number to drum name mapping (General MIDI)
 */
export const GM_DRUM_NAMES: Record<number, string> = {
  35: "Acoustic Bass Drum",
  36: "Bass Drum 1",
  37: "Side Stick",
  38: "Acoustic Snare",
  39: "Hand Clap",
  40: "Electric Snare",
  41: "Low Floor Tom",
  42: "Closed Hi-Hat",
  43: "High Floor Tom",
  44: "Pedal Hi-Hat",
  45: "Low Tom",
  46: "Open Hi-Hat",
  47: "Low-Mid Tom",
  48: "Hi-Mid Tom",
  49: "Crash Cymbal 1",
  50: "High Tom",
  51: "Ride Cymbal 1",
  52: "Chinese Cymbal",
  53: "Ride Bell",
  54: "Tambourine",
  55: "Splash Cymbal",
  56: "Cowbell",
  57: "Crash Cymbal 2",
  58: "Vibraslap",
  59: "Ride Cymbal 2",
  60: "Hi Bongo",
  61: "Low Bongo",
  62: "Mute Hi Conga",
  63: "Open Hi Conga",
  64: "Low Conga",
  65: "High Timbale",
  66: "Low Timbale",
  67: "High Agogo",
  68: "Low Agogo",
  69: "Cabasa",
  70: "Maracas",
  71: "Short Whistle",
  72: "Long Whistle",
  73: "Short Guiro",
  74: "Long Guiro",
  75: "Claves",
  76: "Hi Wood Block",
  77: "Low Wood Block",
  78: "Mute Cuica",
  79: "Open Cuica",
  80: "Mute Triangle",
  81: "Open Triangle",
};
