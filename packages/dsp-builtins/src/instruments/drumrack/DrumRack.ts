/**
 * Drum Rack - Main Instrument
 * 
 * 16+ pad drum sampler with:
 * - Per-pad sample/chain
 * - Choke groups
 * - Round-robin selection
 * - Per-pad mute/solo
 * - Individual pad processing
 * 
 * Based on engineering spec section 10.2
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  PluginParameterSpec,
  MidiEvent,
  AudioBuffer,
} from "@daw/plugin-api";
import { createParameterMap, midiToFrequency } from "@daw/plugin-api";
import { DrumPad, DrumPadConfig, DrumPadLayer } from "./DrumPad.js";
import type { SampleData } from "../sampler/SampleVoice.js";
import { dbToLinear } from "../../core/DspBase.js";

// =============================================================================
// Parameter Specifications
// =============================================================================

const DRUM_RACK_PARAMETERS: PluginParameterSpec[] = [
  { id: "gain", name: "Gain", kind: "float", min: -96, max: 24, defaultValue: 0.75, unit: "dB" },
  { id: "pan", name: "Pan", kind: "float", min: -50, max: 50, defaultValue: 0.5 },
  { id: "width", name: "Width", kind: "float", min: 0, max: 200, defaultValue: 1, unit: "%" },
];

// Pad-specific parameters (template)
const PAD_PARAMETER_TEMPLATE: Omit<PluginParameterSpec, "id"> = {
  name: "",
  kind: "float",
  min: 0,
  max: 1,
  defaultValue: 0.5,
};

// =============================================================================
// Drum Rack State
// =============================================================================

export interface PadState {
  note: number;
  name?: string;
  color?: string;
  mute: boolean;
  solo: boolean;
  config: DrumPadConfig;
  layers: Array<{
    sampleId: string;
    gainDb: number;
    pan: number;
    tuneCents: number;
  }>;
}

export interface DrumRackState {
  pads: PadState[];
  globalGain: number;
  globalPan: number;
}

// =============================================================================
// Drum Rack Instance
// =============================================================================

export class DrumRackInstance implements PluginInstanceRuntime {
  private _pads = new Map<number, DrumPad>();
  private _chokeGroups = new Map<number, Set<number>>(); // group -> set of pad notes
  private _anySolo = false;
  
  private _params: ReturnType<typeof createParameterMap>;
  private _sampleLibrary: SampleLibrary | null = null;
  private _loadedSamples = new Map<string, SampleData>();
  
  private _sampleRate = 48000;
  private _blockSize = 128;
  
  // Output buffers
  private _leftBuffer: Float32Array;
  private _rightBuffer: Float32Array;
  
  // Connected state
  private _connected = false;

  constructor(numPads = 16, maxBlockSize = 128) {
    this._blockSize = maxBlockSize;
    this._params = createParameterMap(DRUM_RACK_PARAMETERS);
    
    // Pre-allocate output buffers
    this._leftBuffer = new Float32Array(maxBlockSize);
    this._rightBuffer = new Float32Array(maxBlockSize);
    
    // Initialize default pads (16 pads on standard notes)
    const defaultNotes = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51];
    for (let i = 0; i < numPads && i < defaultNotes.length; i++) {
      this._createPad(defaultNotes[i]);
    }
  }

  // ---------------------------------------------------------------------------
  // PluginInstanceRuntime Implementation
  // ---------------------------------------------------------------------------

  connect(graph: PluginConnectionGraph): void {
    if (graph.midiInput) {
      graph.midiInput.onReceive?.((event: MidiEvent) => {
        this._handleMidiEvent(event);
      });
    }
    this._connected = true;
  }

  disconnect(): void {
    this._stopAll();
    this._connected = false;
  }

  setParam(id: string, value: number, atSample?: number): void {
    const param = this._params.get(id);
    if (param) {
      param.setNormalized(value);
    }
  }

  getParam(id: string): number {
    const param = this._params.get(id);
    return param?.normalizedValue ?? 0;
  }

  async saveState(): Promise<DrumRackState> {
    const pads: PadState[] = [];
    
    for (const [note, pad] of this._pads) {
      pads.push({
        note,
        mute: false, // TODO: Implement mute/solo
        solo: false,
        config: { ...pad.config },
        layers: pad.layers.map(l => ({
          sampleId: l.sample.id,
          gainDb: l.gainDb,
          pan: l.pan,
          tuneCents: l.tuneCents,
        })),
      });
    }
    
    return {
      pads,
      globalGain: this._params.get("gain")?.value ?? 0,
      globalPan: this._params.get("pan")?.value ?? 0,
    };
  }

  async loadState(state: unknown): Promise<void> {
    const s = state as Partial<DrumRackState>;
    
    // Clear existing pads
    this._pads.clear();
    this._chokeGroups.clear();
    
    // Load pads
    if (s.pads) {
      for (const padState of s.pads) {
        const pad = this._createPad(padState.note);
        pad.setConfig(padState.config);
        
        // Load layers
        for (const layer of padState.layers) {
          const sample = this._loadedSamples.get(layer.sampleId);
          if (sample) {
            pad.addLayer({
              sample,
              gainDb: layer.gainDb,
              pan: layer.pan,
              tuneCents: layer.tuneCents,
              startOffset: 0,
              endOffset: 0,
            });
          }
        }
      }
    }
    
    // Set global parameters
    if (s.globalGain !== undefined) {
      this._params.get("gain")?.setValue(s.globalGain);
    }
    if (s.globalPan !== undefined) {
      this._params.get("pan")?.setValue(s.globalPan);
    }
  }

  getLatencySamples(): number {
    return 0;
  }

  getTailSamples(): number {
    // Find longest release time among pads
    let maxRelease = 0;
    for (const pad of this._pads.values()) {
      maxRelease = Math.max(maxRelease, pad.config.release);
    }
    return Math.ceil(maxRelease * this._sampleRate);
  }

  reset(): void {
    this._stopAll();
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._blockSize = config.blockSize;
    
    // Resize buffers if needed
    if (this._leftBuffer.length < config.blockSize) {
      this._leftBuffer = new Float32Array(config.blockSize);
      this._rightBuffer = new Float32Array(config.blockSize);
    }
    
    // Update all pads
    for (const pad of this._pads.values()) {
      pad.setSampleRate(config.sampleRate);
    }
  }

  process(
    inputs: AudioBuffer[],
    outputs: AudioBuffer[],
    midi: MidiEvent[],
    blockSize: number
  ): void {
    if (!this._connected || outputs.length < 1) return;

    // Clear output buffers
    this._leftBuffer.fill(0, 0, blockSize);
    this._rightBuffer.fill(0, 0, blockSize);

    // Process MIDI events
    for (const event of midi) {
      this._handleMidiEvent(event);
    }

    // Process parameter smoothing
    this._params.processSmoothing();

    // Process all pads
    for (const pad of this._pads.values()) {
      if (pad.active) {
        pad.process(this._leftBuffer, this._rightBuffer, 0, blockSize);
      }
    }

    // Apply global gain and pan
    const gain = dbToLinear(this._params.get("gain")?.value ?? 0);
    const pan = (this._params.get("pan")?.value ?? 0) / 50;
    const width = (this._params.get("width")?.value ?? 100) / 100;
    
    const leftGain = gain * Math.cos((pan + 1) * Math.PI / 4);
    const rightGain = gain * Math.sin((pan + 1) * Math.PI / 4);

    // Apply width (mid/side processing)
    // width < 1 reduces side, width > 1 enhances side
    const midGain = gain * (1 + width) / 2;
    const sideGain = gain * width;

    // Write to output
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    for (let i = 0; i < blockSize; i++) {
      const L = this._leftBuffer[i] * leftGain;
      const R = this._rightBuffer[i] * rightGain;
      
      if (width !== 1) {
        // Mid/side processing
        const mid = (L + R) * 0.5 * midGain;
        const side = (R - L) * 0.5 * sideGain;
        outputL[i] = mid - side;
        outputR[i] = mid + side;
      } else {
        outputL[i] = L;
        outputR[i] = R;
      }
    }
  }

  async dispose(): Promise<void> {
    this._stopAll();
    this._pads.clear();
    this._loadedSamples.clear();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  setSampleLibrary(library: SampleLibrary): void {
    this._sampleLibrary = library;
  }

  /**
   * Get a pad by MIDI note number
   */
  getPad(note: number): DrumPad | undefined {
    return this._pads.get(note);
  }

  /**
   * Create or replace a pad at a specific note
   */
  createPad(note: number, config?: Partial<DrumPadConfig>): DrumPad {
    return this._createPad(note, config);
  }

  /**
   * Remove a pad
   */
  removePad(note: number): boolean {
    const pad = this._pads.get(note);
    if (pad) {
      pad.stop();
      this._pads.delete(note);
      this._updateChokeGroups();
      return true;
    }
    return false;
  }

  /**
   * Get all pads
   */
  getPads(): DrumPad[] {
    return Array.from(this._pads.values());
  }

  /**
   * Load a sample onto a pad
   */
  async loadSampleOnPad(
    note: number, 
    sampleId: string,
    options: Partial<Omit<DrumPadLayer, "sample">> = {}
  ): Promise<boolean> {
    const pad = this._pads.get(note);
    if (!pad) return false;

    // Ensure sample is loaded
    let sample = this._loadedSamples.get(sampleId);
    if (!sample && this._sampleLibrary) {
      sample = await this._sampleLibrary.loadSample(sampleId);
      if (sample) {
        this._loadedSamples.set(sampleId, sample);
      }
    }

    if (!sample) return false;

    pad.addLayer({
      sample,
      gainDb: options.gainDb ?? 0,
      pan: options.pan ?? 0,
      tuneCents: options.tuneCents ?? 0,
      startOffset: options.startOffset ?? 0,
      endOffset: options.endOffset ?? 0,
    });

    return true;
  }

  /**
   * Set choke group for a pad
   */
  setPadChokeGroup(note: number, group: number | null): void {
    const pad = this._pads.get(note);
    if (!pad) return;

    const oldConfig = pad.config;
    pad.setConfig({ ...oldConfig, chokeGroup: group });
    
    this._updateChokeGroups();
  }

  /**
   * Trigger a pad (for UI or sequencer)
   */
  triggerPad(note: number, velocity = 100): boolean {
    const pad = this._pads.get(note);
    if (!pad) return false;

    // Handle choke groups
    if (pad.chokeGroup !== null) {
      this._chokeGroup(pad.chokeGroup, note);
    }

    pad.trigger(velocity);
    return true;
  }

  /**
   * Release a pad
   */
  releasePad(note: number): boolean {
    const pad = this._pads.get(note);
    if (!pad) return false;
    
    pad.release();
    return true;
  }

  /**
   * Map a MIDI note to a pad (for remapping)
   */
  mapNote(padNote: number, fromNote: number): void {
    // TODO: Implement note mapping table
    // This would allow pads to be triggered by different incoming notes
  }

  /**
   * Get number of active pads
   */
  get activePadCount(): number {
    let count = 0;
    for (const pad of this._pads.values()) {
      if (pad.active) count++;
    }
    return count;
  }

  /**
   * Export pad configuration for saving
   */
  exportPads(): PadState[] {
    const pads: PadState[] = [];
    
    for (const [note, pad] of this._pads) {
      pads.push({
        note,
        mute: false,
        solo: false,
        config: { ...pad.config },
        layers: pad.layers.map(l => ({
          sampleId: l.sample.id,
          gainDb: l.gainDb,
          pan: l.pan,
          tuneCents: l.tuneCents,
        })),
      });
    }
    
    return pads;
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private _createPad(note: number, config?: Partial<DrumPadConfig>): DrumPad {
    const pad = new DrumPad(note, config);
    pad.setSampleRate(this._sampleRate);
    this._pads.set(note, pad);
    return pad;
  }

  private _updateChokeGroups(): void {
    this._chokeGroups.clear();
    
    for (const [note, pad] of this._pads) {
      if (pad.chokeGroup !== null) {
        const group = this._chokeGroups.get(pad.chokeGroup) ?? new Set();
        group.add(note);
        this._chokeGroups.set(pad.chokeGroup, group);
      }
    }
  }

  private _chokeGroup(group: number, exceptNote: number): void {
    const groupPads = this._chokeGroups.get(group);
    if (!groupPads) return;
    
    for (const note of groupPads) {
      if (note !== exceptNote) {
        this._pads.get(note)?.choke();
      }
    }
  }

  private _handleMidiEvent(event: MidiEvent): void {
    switch (event.type) {
      case "noteOn": {
        const note = event.data.note;
        const velocity = event.data.velocity;
        
        if (velocity === 0) {
          this.releasePad(note);
        } else {
          this.triggerPad(note, velocity);
        }
        break;
      }
      
      case "noteOff": {
        this.releasePad(event.data.note);
        break;
      }
    }
  }

  private _stopAll(): void {
    for (const pad of this._pads.values()) {
      pad.stop();
    }
  }
}

// =============================================================================
// Sample Library Interface
// =============================================================================

export interface SampleLibrary {
  loadSample(sampleId: string): Promise<SampleData | null>;
  hasSample(sampleId: string): boolean;
  getSampleIds(): string[];
}

// =============================================================================
// Plugin Definition Factory
// =============================================================================

export function createDrumRackDefinition(
  sampleLibrary?: SampleLibrary
): PluginDefinition {
  return {
    id: "com.daw.drumrack",
    name: "Drum Rack",
    category: "instrument",
    version: "1.0.0",
    vendor: "DAW",
    description: "16-pad drum sampler with choke groups and per-pad processing",
    parameters: DRUM_RACK_PARAMETERS,
    ui: {
      type: "custom",
      width: 800,
      height: 400,
      resizable: true,
      layout: [
        { title: "Global", parameters: ["gain", "pan", "width"], layout: "horizontal" },
      ],
    },
    audioInputs: 0,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 0,
    supportsMpe: false,
    hasSidechain: false,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const rack = new DrumRackInstance(16, ctx.maxBlockSize);
      if (sampleLibrary) {
        rack.setSampleLibrary(sampleLibrary);
      }
      rack.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return rack;
    },
  };
}
