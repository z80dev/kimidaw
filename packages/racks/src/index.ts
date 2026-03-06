/**
 * Racks System - Ableton-style Racks for the In-Browser DAW
 * 
 * This package provides a comprehensive Ableton-style Racks System including:
 * - Instrument Racks (for layering instruments)
 * - Drum Racks (128 pads with choke groups and sends)
 * - Audio Effect Racks (parallel effect processing)
 * - MIDI Effect Racks (MIDI processing chains)
 * 
 * @example
 * ```typescript
 * import { 
 *   InstrumentRack, 
 *   DrumRack, 
 *   createVelocityLayerRack 
 * } from "@daw/racks";
 * 
 * // Create an instrument rack with velocity layers
 * const rack = createVelocityLayerRack("Layered Piano", 3);
 * 
 * // Create a drum rack
 * const drums = DrumRack.create("My Kit", { numPads: 16 });
 * ```
 */

// =============================================================================
// Core Types
// =============================================================================

export type {
  // Zone types
  ZoneRange,
  ChainZones,
  ZoneResult,
  ZoneEditorState,
  
  // Mixer types
  ChainMixer,
  SendSlot,
  
  // Macro types
  Macro,
  MacroMapping,
  
  // Chain types
  RackChain,
  ChainDevice,
  
  // Chain selector types
  ChainSelectorConfig,
  ChainSelectionContext,
  
  // Rack types
  RackType,
  RackConfig,
  RackState,
  
  // Drum rack types
  DrumPad,
  DrumRackState,
  
  // Audio effect rack types
  AudioEffectRackState,
  InputSplitMode,
  
  // MIDI effect rack types
  MidiEffectRackState,
  
  // Event types
  RackEvent,
  RackEventType,
  RackEventHandler,
  
  // Options types
  RackCreateOptions,
  DrumRackCreateOptions,
  SerializationOptions,
  
  // Processing types
  ChainBuffers,
} from "./types.js";

export {
  MAX_MACROS,
  DEFAULT_MACRO_NAMES,
} from "./types.js";

// =============================================================================
// Zones
// =============================================================================

export {
  // Classes
  Zone,
  ChainZoneManager,
  ZoneEditor,
  
  // Constants
  MIDI_NOTE_MIN,
  MIDI_NOTE_MAX,
  MIDI_VELOCITY_MIN,
  MIDI_VELOCITY_MAX,
  CHAIN_SELECT_MIN,
  CHAIN_SELECT_MAX,
  DEFAULT_KEY_ZONE,
  DEFAULT_VELOCITY_ZONE,
  DEFAULT_CHAIN_SELECT_ZONE,
  DEFAULT_CHAIN_ZONES,
  
  // Functions
  findZoneOverlaps,
  checkInvalidOverlap,
  calculateCrossfadeGain,
  applyCrossfadeCurve,
  createZoneWithFades,
  createVelocityLayers,
  createKeySplit,
} from "./Zones.js";

export type { ZoneOverlap } from "./Zones.js";

// =============================================================================
// Macros
// =============================================================================

export {
  // Classes
  MacroMappingManager,
  MacroController,
  MacroBank,
  
  // Constants
  DEFAULT_MACRO_COLORS,
  
  // Functions
  createMacroMapping,
  isValidMacroValue,
  isValidMidiCC,
} from "./Macros.js";

export type { MacroCurveType } from "./Macros.js";

// =============================================================================
// Chain
// =============================================================================

export {
  Chain,
  DEFAULT_MIXER,
  calculateSoloGain,
  findSoloedChains,
} from "./Chain.js";

// =============================================================================
// Chain Selector
// =============================================================================

export {
  ChainSelector,
  DEFAULT_CHAIN_SELECTOR_CONFIG,
  SMOOTHING_TIMES,
  SMOOTHING_PRESETS,
  createEvenChainSelectZones,
  createWeightedChainSelectZones,
  interpolateChainValues,
} from "./ChainSelector.js";

// =============================================================================
// Base Rack
// =============================================================================

export {
  Rack,
  DEFAULT_RACK_CONFIG,
  validateRackConfig,
  mergeMixerSettings,
  mergeZoneSettings,
} from "./Rack.js";

// =============================================================================
// Instrument Rack
// =============================================================================

export {
  InstrumentRack,
  DEFAULT_VELOCITY_LAYERS,
  DEFAULT_KEY_SPLITS,
  createVelocityLayerRack,
  createKeySplitRack,
  createMorphRack,
} from "./InstrumentRack.js";

// =============================================================================
// Drum Rack
// =============================================================================

export {
  DrumRack,
  DRUM_PAD_COUNT,
  MAX_CHOKE_GROUPS,
  MAX_RETURN_CHAINS,
  DEFAULT_VISIBLE_PADS,
  DEFAULT_PAD_NOTES,
  createStandardDrumRack,
  createExpandedDrumRack,
  create808Rack,
  GM_DRUM_NAMES,
} from "./DrumRack.js";

// =============================================================================
// Audio Effect Rack
// =============================================================================

export {
  AudioEffectRack,
  DEFAULT_CROSSOVER_FREQ,
  DEFAULT_CROSSOVER_SLOPE,
  createParallelEffectRack,
  createMultibandEffectRack,
  createMorphEffectRack,
} from "./AudioEffectRack.js";

// =============================================================================
// MIDI Effect Rack
// =============================================================================

export {
  MidiEffectRack,
  DEFAULT_MIDI_PROCESSING,
  createVelocityProcessorRack,
  createNoteRouterRack,
  createHumanizeRack,
  createChainSelectorRack,
  createNoteOn,
  createNoteOff,
  createCC,
  transposeNote,
  scaleVelocity,
} from "./MidiEffectRack.js";

// =============================================================================
// Utilities
// =============================================================================

export {
  // Audio/Math
  dbToLinear,
  linearToDb,
  clamp,
  clamp01,
  lerp,
  cubicInterp,
  equalPowerCrossfade,
  applyCurve,
  
  // MIDI
  midiToFrequency,
  frequencyToMidi,
  midiToNoteName,
  noteNameToMidi,
  velocityToDb,
  curvedVelocity,
  
  // Pan
  calculatePanGains,
  calculateLinearPanGains,
  
  // ID Generation
  generateId as generateRackId,
  generateUUID,
  
  // Arrays
  removeFromArray,
  moveInArray,
  shuffleArray,
  
  // Strings
  truncate,
  capitalize,
  camelToTitle,
  
  // Timing
  debounce,
  throttle,
  
  // Colors
  hexToRgb,
  rgbToHex,
  randomColor,
  generatePalette,
} from "./utils.js";

// =============================================================================
// Version
// =============================================================================

export const RACKS_VERSION = "1.0.0";

// =============================================================================
// Factory Functions
// =============================================================================

import type { RackState, RackType } from "./types.js";
import { InstrumentRack } from "./InstrumentRack.js";
import { DrumRack } from "./DrumRack.js";
import { AudioEffectRack } from "./AudioEffectRack.js";
import { MidiEffectRack } from "./MidiEffectRack.js";
import { generateId } from "./utils.js";

/**
 * Create a rack from a serialized state
 */
export function createRackFromState(state: RackState): InstrumentRack | DrumRack | AudioEffectRack | MidiEffectRack | null {
  switch (state.type) {
    case "instrument": {
      const rack = new InstrumentRack(generateId(), state.name);
      rack.loadJSON(state as import("./types.js").InstrumentRackState);
      return rack;
    }
    case "drum": {
      const rack = new DrumRack(generateId(), state.name);
      rack.loadJSON(state as import("./types.js").DrumRackState);
      return rack;
    }
    case "audioEffect": {
      const rack = new AudioEffectRack(generateId(), state.name);
      rack.loadJSON(state as import("./types.js").AudioEffectRackState);
      return rack;
    }
    case "midiEffect": {
      const rack = new MidiEffectRack(generateId(), state.name);
      rack.loadJSON(state as import("./types.js").MidiEffectRackState);
      return rack;
    }
    default:
      return null;
  }
}

/**
 * Create a new rack of the specified type
 */
export function createRack(
  type: RackType,
  name: string,
  options?: { numChains?: number; numMacros?: number }
): InstrumentRack | DrumRack | AudioEffectRack | MidiEffectRack {
  switch (type) {
    case "instrument":
      return InstrumentRack.create(name, options);
    case "drum":
      return DrumRack.create(name, options);
    case "audioEffect":
      return AudioEffectRack.create(name, options);
    case "midiEffect":
      return MidiEffectRack.create(name, options);
    default:
      throw new Error(`Unknown rack type: ${type}`);
  }
}

// =============================================================================
// Plugin Integration Helpers
// =============================================================================

import type { PluginDefinition, PluginInstanceRuntime, PluginHostContext, MidiEvent, AudioBuffer } from "@daw/plugin-api";

/**
 * Wrap a rack as a plugin definition
 */
export function rackAsPluginDefinition(
  rack: InstrumentRack | DrumRack | AudioEffectRack | MidiEffectRack,
  options?: {
    id?: string;
    name?: string;
    category?: "instrument" | "audioFx" | "midiFx";
  }
): PluginDefinition {
  const definition: PluginDefinition = {
    id: options?.id ?? `com.daw.rack.${rack.id}`,
    name: options?.name ?? rack.name,
    category: options?.category ?? (rack.type === "instrument" ? "instrument" : rack.type === "audioEffect" ? "audioFx" : "midiFx"),
    version: "1.0.0",
    vendor: "DAW",
    description: `Rack: ${rack.name}`,
    parameters: [], // Racks expose macro parameters
    ui: {
      type: "custom",
      resizable: true,
    },
    audioInputs: rack.type === "audioEffect" ? 2 : 0,
    audioOutputs: 2,
    midiInputs: rack.type === "midiEffect" ? 1 : (rack.type === "instrument" || rack.type === "drum" ? 1 : 0),
    midiOutputs: rack.type === "midiEffect" ? 1 : 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      // Create a runtime wrapper for the rack
      return new RackRuntimeWrapper(rack, ctx);
    },
  };

  return definition;
}

/**
 * Runtime wrapper to adapt a rack to the PluginInstanceRuntime interface
 */
class RackRuntimeWrapper implements PluginInstanceRuntime {
  private _rack: InstrumentRack | DrumRack | AudioEffectRack | MidiEffectRack;

  constructor(
    rack: InstrumentRack | DrumRack | AudioEffectRack | MidiEffectRack,
    context: PluginHostContext
  ) {
    this._rack = rack;
    // Store context reference for potential future use
    void context;
    this._rack.prepare(context.sampleRate, context.maxBlockSize);
  }

  connect(): void {
    this._rack.connect();
  }

  disconnect(): void {
    this._rack.disconnect();
  }

  setParam(id: string, value: number): void {
    // Map to macro
    const macroId = parseInt(id, 10);
    if (!isNaN(macroId)) {
      this._rack.macros.setMacroValue(macroId, value);
    }
  }

  getParam(id: string): number {
    const macroId = parseInt(id, 10);
    if (!isNaN(macroId)) {
      return this._rack.macros.getMacroValue(macroId) ?? 0;
    }
    return 0;
  }

  async saveState(): Promise<unknown> {
    return this._rack.toJSON();
  }

  async loadState(state: unknown): Promise<void> {
    // Type assertion for loading - the actual loadJSON implementations handle type checking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._rack.loadJSON(state as any);
  }

  getLatencySamples(): number {
    return 0;
  }

  getTailSamples(): number {
    return 0;
  }

  reset(): void {
    this._rack.reset();
  }

  prepare(): void {
    // Already prepared in constructor
  }

  process(
    inputs: AudioBuffer[],
    outputs: AudioBuffer[],
    midi: MidiEvent[],
    blockSize: number
  ): void {
    this._rack.process(inputs, outputs, midi, blockSize);
  }

  async dispose(): Promise<void> {
    await this._rack.dispose?.();
  }
}

// =============================================================================
// Re-export AudioBuffer and MidiEvent types for convenience
// =============================================================================

export type { AudioBuffer, MidiEvent } from "@daw/plugin-api";
