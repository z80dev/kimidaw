/**
 * Sampler - Main Instrument
 * 
 * Multi-zone sampler instrument with:
 * - Key/velocity/range mapping
 * - ADSR envelope
 * - Filter with envelope
 * - Loop modes
 * - Polyphonic voice allocation
 * 
 * Based on engineering spec section 10.3
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
import { VoiceAllocator, dbToLinear } from "../../core/DspBase.js";
import { SampleVoice, SampleData, SampleVoiceConfig } from "./SampleVoice.js";
import { ZoneMap, ZoneEntry } from "./ZoneMap.js";

// =============================================================================
// Parameter Specifications
// =============================================================================

const SAMPLER_PARAMETERS: PluginParameterSpec[] = [
  // Global
  { id: "gain", name: "Gain", kind: "float", min: -96, max: 24, defaultValue: 0.75, unit: "dB" },
  { id: "pan", name: "Pan", kind: "float", min: -50, max: 50, defaultValue: 0.5 },
  
  // Pitch
  { id: "tune", name: "Tune", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "cents" },
  { id: "coarse", name: "Coarse", kind: "int", min: -24, max: 24, defaultValue: 0.5, unit: "st" },
  { id: "glide", name: "Glide", kind: "float", min: 0, max: 5000, defaultValue: 0, unit: "ms" },
  
  // Amp Envelope
  { id: "ampAttack", name: "Attack", kind: "float", min: 0, max: 10000, defaultValue: 0.001, unit: "ms" },
  { id: "ampDecay", name: "Decay", kind: "float", min: 0, max: 10000, defaultValue: 0.1, unit: "ms" },
  { id: "ampSustain", name: "Sustain", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "ampRelease", name: "Release", kind: "float", min: 0, max: 30000, defaultValue: 0.3, unit: "ms" },
  
  // Filter
  { id: "filterType", name: "Filter Type", kind: "enum", min: 0, max: 2, defaultValue: 0, labels: ["LP", "HP", "BP"] },
  { id: "filterFreq", name: "Frequency", kind: "float", min: 20, max: 20000, defaultValue: 0.75, unit: "Hz" },
  { id: "filterRes", name: "Resonance", kind: "float", min: 0.1, max: 20, defaultValue: 0.35 },
  { id: "filterEnv", name: "Env Amount", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  
  // Filter Envelope
  { id: "filterAttack", name: "Filter Attack", kind: "float", min: 0, max: 10000, defaultValue: 0.001, unit: "ms" },
  { id: "filterDecay", name: "Filter Decay", kind: "float", min: 0, max: 10000, defaultValue: 0.1, unit: "ms" },
  { id: "filterSustain", name: "Filter Sustain", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "filterRelease", name: "Filter Release", kind: "float", min: 0, max: 30000, defaultValue: 0.3, unit: "ms" },
  
  // Loop
  { id: "loopMode", name: "Loop Mode", kind: "enum", min: 0, max: 2, defaultValue: 0, labels: ["Off", "Forward", "Ping-Pong"] },
];

// =============================================================================
// Sample Library
// =============================================================================

export interface SampleLibrary {
  /** Load a sample by ID */
  loadSample(sampleId: string): Promise<SampleData | null>;
  /** Check if sample is available */
  hasSample(sampleId: string): boolean;
  /** Get list of available samples */
  getSampleIds(): string[];
}

// =============================================================================
// Sampler Instance
// =============================================================================

export interface SamplerState {
  zones: ZoneEntry[];
  parameters: Record<string, number>;
}

export class SamplerInstance implements PluginInstanceRuntime {
  private _params: ReturnType<typeof createParameterMap>;
  private _zoneMap: ZoneMap;
  private _voiceAllocator: VoiceAllocator<SampleVoice>;
  private _voices: SampleVoice[];
  private _sampleLibrary: SampleLibrary | null = null;
  private _loadedSamples = new Map<string, SampleData>();
  
  private _sampleRate = 48000;
  private _blockSize = 128;
  private _maxVoices: number;
  
  // Output buffers (pre-allocated)
  private _leftBuffer: Float32Array;
  private _rightBuffer: Float32Array;
  
  // Connected state
  private _connected = false;
  private _midiInput: { onMessage?: (event: MidiEvent) => void } | null = null;

  constructor(maxVoices = 32, maxBlockSize = 128) {
    this._maxVoices = maxVoices;
    this._blockSize = maxBlockSize;
    
    // Create parameter map
    this._params = createParameterMap(SAMPLER_PARAMETERS);
    
    // Create zone map
    this._zoneMap = new ZoneMap();
    
    // Create voices
    this._voices = [];
    for (let i = 0; i < maxVoices; i++) {
      this._voices.push(new SampleVoice({}, maxBlockSize));
    }
    
    this._voiceAllocator = new VoiceAllocator(this._voices);
    
    // Pre-allocate output buffers
    this._leftBuffer = new Float32Array(maxBlockSize);
    this._rightBuffer = new Float32Array(maxBlockSize);
  }

  // ---------------------------------------------------------------------------
  // PluginInstanceRuntime Implementation
  // ---------------------------------------------------------------------------

  connect(graph: PluginConnectionGraph): void {
    // Store MIDI input for receiving events
    if (graph.midiInput) {
      this._midiInput = graph.midiInput;
      graph.midiInput.onReceive?.((event: MidiEvent) => {
        this._handleMidiEvent(event);
      });
    }
    this._connected = true;
  }

  disconnect(): void {
    this._stopAll();
    this._midiInput = null;
    this._connected = false;
  }

  setParam(id: string, value: number, atSample?: number): void {
    const param = this._params.get(id);
    if (param) {
      param.setNormalized(value);
      this._updateParameter(id);
    }
  }

  getParam(id: string): number {
    const param = this._params.get(id);
    return param?.normalizedValue ?? 0;
  }

  async saveState(): Promise<SamplerState> {
    return {
      zones: this._zoneMap.export() as ZoneEntry[],
      parameters: this._params.getNormalizedValues(),
    };
  }

  async loadState(state: unknown): Promise<void> {
    const s = state as Partial<SamplerState>;
    
    if (s.zones) {
      this._zoneMap.import(s.zones);
    }
    
    if (s.parameters) {
      this._params.setNormalizedValues(s.parameters);
      this._updateAllParameters();
    }
  }

  getLatencySamples(): number {
    return 0;
  }

  getTailSamples(): number {
    // Return the longest release time in samples
    const releaseMs = this._params.get("ampRelease")?.value ?? 300;
    return Math.ceil((releaseMs / 1000) * this._sampleRate);
  }

  reset(): void {
    this._stopAll();
    this._params.resetAll();
    this._updateAllParameters();
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._blockSize = config.blockSize;
    
    // Resize buffers if needed
    if (this._leftBuffer.length < config.blockSize) {
      this._leftBuffer = new Float32Array(config.blockSize);
      this._rightBuffer = new Float32Array(config.blockSize);
    }
    
    // Update all voices
    for (const voice of this._voices) {
      voice.setSampleRate(config.sampleRate);
    }
    
    this._updateAllParameters();
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

    // Process all voices
    this._voiceAllocator.process(this._leftBuffer, this._rightBuffer, 0, blockSize);

    // Apply global gain and pan
    const gain = dbToLinear(this._params.get("gain")?.value ?? 0);
    const pan = (this._params.get("pan")?.value ?? 0) / 50; // -1 to 1
    const leftGain = gain * Math.cos((pan + 1) * Math.PI / 4);
    const rightGain = gain * Math.sin((pan + 1) * Math.PI / 4);

    // Write to output
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    for (let i = 0; i < blockSize; i++) {
      outputL[i] = this._leftBuffer[i] * leftGain;
      outputR[i] = this._rightBuffer[i] * rightGain;
    }
  }

  async dispose(): Promise<void> {
    this._stopAll();
    this._loadedSamples.clear();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  setSampleLibrary(library: SampleLibrary): void {
    this._sampleLibrary = library;
  }

  get zoneMap(): ZoneMap {
    return this._zoneMap;
  }

  async loadZoneSamples(): Promise<void> {
    if (!this._sampleLibrary) return;

    const sampleIds = new Set<string>();
    for (const zone of this._zoneMap.zones) {
      sampleIds.add(zone.sampleId);
    }

    for (const id of sampleIds) {
      if (!this._loadedSamples.has(id)) {
        const sample = await this._sampleLibrary.loadSample(id);
        if (sample) {
          this._loadedSamples.set(id, sample);
        }
      }
    }
  }

  get activeVoiceCount(): number {
    return this._voiceAllocator.activeVoiceCount;
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private _handleMidiEvent(event: MidiEvent): void {
    switch (event.type) {
      case "noteOn": {
        const note = event.data.note;
        const velocity = event.data.velocity;
        
        if (velocity === 0) {
          // Note on with velocity 0 is note off
          this._voiceAllocator.release(note);
        } else {
          this._triggerNote(note, velocity);
        }
        break;
      }
      
      case "noteOff": {
        this._voiceAllocator.release(event.data.note);
        break;
      }
      
      case "cc": {
        // Handle sustain pedal (CC 64)
        if (event.data.controller === 64) {
          if (event.data.value < 64) {
            // Sustain released
            // TODO: Release sustained notes
          }
        }
        break;
      }
    }
  }

  private _triggerNote(note: number, velocity: number): void {
    // Find zone for this note
    const zone = this._zoneMap.findZone(note, velocity);
    if (!zone) return;

    // Get sample data
    const sample = this._loadedSamples.get(zone.sampleId);
    if (!sample) return;

    // Allocate voice
    const voice = this._voiceAllocator.allocate(note, velocity);
    if (!voice) return;

    // Configure voice
    voice.setSample(sample);
    voice.setConfig(this._getVoiceConfig());

    // Trigger
    voice.trigger(note, velocity);
  }

  private _getVoiceConfig(): SampleVoiceConfig {
    const getValue = (id: string) => this._params.get(id)?.value ?? 0;
    
    return {
      ampEnv: {
        attack: getValue("ampAttack") / 1000,
        decay: getValue("ampDecay") / 1000,
        sustain: getValue("ampSustain") / 100,
        release: getValue("ampRelease") / 1000,
      },
      filter: {
        type: ["lowpass", "highpass", "bandpass"][Math.round(getValue("filterType"))] as any,
        frequency: getValue("filterFreq"),
        resonance: getValue("filterRes"),
        envAmount: getValue("filterEnv") / 100,
      },
      filterEnv: {
        attack: getValue("filterAttack") / 1000,
        decay: getValue("filterDecay") / 1000,
        sustain: getValue("filterSustain") / 100,
        release: getValue("filterRelease") / 1000,
      },
      tune: {
        coarse: getValue("coarse"),
        fine: getValue("tune"),
      },
      gain: 0,
      glide: getValue("glide") / 1000,
    };
  }

  private _updateParameter(id: string): void {
    // Update voices with new parameter values
    for (const voice of this._voices) {
      voice.setConfig(this._getVoiceConfig());
    }
  }

  private _updateAllParameters(): void {
    this._updateParameter("");
  }

  private _stopAll(): void {
    this._voiceAllocator.stopAll();
  }
}

// =============================================================================
// Plugin Definition Factory
// =============================================================================

export function createSamplerDefinition(
  sampleLibrary?: SampleLibrary
): PluginDefinition {
  return {
    id: "com.daw.sampler",
    name: "Sampler",
    category: "instrument",
    version: "1.0.0",
    vendor: "DAW",
    description: "Multi-zone sample player with envelope and filter",
    parameters: SAMPLER_PARAMETERS,
    ui: {
      type: "generic",
      layout: [
        { title: "Global", parameters: ["gain", "pan", "tune", "coarse", "glide"], layout: "horizontal" },
        { title: "Amp Envelope", parameters: ["ampAttack", "ampDecay", "ampSustain", "ampRelease"], layout: "horizontal" },
        { title: "Filter", parameters: ["filterType", "filterFreq", "filterRes", "filterEnv"], layout: "horizontal" },
        { title: "Filter Envelope", parameters: ["filterAttack", "filterDecay", "filterSustain", "filterRelease"], layout: "horizontal" },
        { title: "Playback", parameters: ["loopMode"], layout: "horizontal" },
      ],
    },
    audioInputs: 0,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 0,
    supportsMpe: false,
    hasSidechain: false,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const sampler = new SamplerInstance(32, ctx.maxBlockSize);
      if (sampleLibrary) {
        sampler.setSampleLibrary(sampleLibrary);
      }
      sampler.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return sampler;
    },
  };
}
