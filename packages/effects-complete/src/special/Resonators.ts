/**
 * Resonators - 5 parallel resonators
 * 
 * Modal resonator effect with:
 * - 5 independent resonators
 * - Note/Course/Fine tuning per resonator
 * - Decay, Color, Width, Blend controls
 * - Mode selection: HP/LP/BP
 * - MIDI pitch tracking
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  PluginParameterSpec,
  AudioBuffer,
  MidiEvent,
} from "@daw/plugin-api";
import { createParameterMap } from "@daw/plugin-api";
import { midiToFreq, clamp, dbToLinear } from "../core/DspUtils.js";

const RESONATOR_MODES = ["LP", "BP", "HP"] as const;

// Predefined resonator tunings (in semitones from base)
const PRESET_TUNINGS = {
  default: [0, 12, 19, 24, 28], // Octave-based
  pentatonic: [0, 2, 4, 7, 9],
  chord: [0, 4, 7, 12, 16],
  cluster: [0, 0.5, 1, 1.5, 2],
};

const PARAMETERS: PluginParameterSpec[] = [
  // Global
  { id: "baseNote", name: "Base Note", kind: "int", min: 0, max: 127, defaultValue: 60 },
  { id: "decay", name: "Decay", kind: "float", min: 0.1, max: 60, defaultValue: 0.3, unit: "s" },
  { id: "color", name: "Color", kind: "float", min: -12, max: 12, defaultValue: 0.5, unit: "dB" },
  { id: "width", name: "Width", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "blend", name: "Blend", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "mode", name: "Mode", kind: "enum", min: 0, max: 2, defaultValue: 1, labels: [...RESONATOR_MODES] },
  
  // Per-resonator controls (simplified - using offsets)
  { id: "res1Note", name: "Res 1 Note", kind: "int", min: 0, max: 48, defaultValue: 0, unit: "st" },
  { id: "res1Fine", name: "Res 1 Fine", kind: "float", min: -50, max: 50, defaultValue: 0.5, unit: "ct" },
  { id: "res1Gain", name: "Res 1 Gain", kind: "float", min: -24, max: 0, defaultValue: 0, unit: "dB" },
  
  { id: "res2Note", name: "Res 2 Note", kind: "int", min: 0, max: 48, defaultValue: 0.25, unit: "st" },
  { id: "res2Fine", name: "Res 2 Fine", kind: "float", min: -50, max: 50, defaultValue: 0.5, unit: "ct" },
  { id: "res2Gain", name: "Res 2 Gain", kind: "float", min: -24, max: 0, defaultValue: 0, unit: "dB" },
  
  { id: "res3Note", name: "Res 3 Note", kind: "int", min: 0, max: 48, defaultValue: 0.4, unit: "st" },
  { id: "res3Fine", name: "Res 3 Fine", kind: "float", min: -50, max: 50, defaultValue: 0.5, unit: "ct" },
  { id: "res3Gain", name: "Res 3 Gain", kind: "float", min: -24, max: 0, defaultValue: 0, unit: "dB" },
  
  { id: "res4Note", name: "Res 4 Note", kind: "int", min: 0, max: 48, defaultValue: 0.5, unit: "st" },
  { id: "res4Fine", name: "Res 4 Fine", kind: "float", min: -50, max: 50, defaultValue: 0.5, unit: "ct" },
  { id: "res4Gain", name: "Res 4 Gain", kind: "float", min: -24, max: 0, defaultValue: 0, unit: "dB" },
  
  { id: "res5Note", name: "Res 5 Note", kind: "int", min: 0, max: 48, defaultValue: 0.58, unit: "st" },
  { id: "res5Fine", name: "Res 5 Fine", kind: "float", min: -50, max: 50, defaultValue: 0.5, unit: "ct" },
  { id: "res5Gain", name: "Res 5 Gain", kind: "float", min: -24, max: 0, defaultValue: 0, unit: "dB" },
  
  // Output
  { id: "inputGain", name: "Input", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "outputGain", name: "Output", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

interface Resonator {
  y1: number;
  y2: number;
  freq: number;
  gain: number;
}

export class ResonatorsInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // 5 resonators
  private _resonators: Resonator[] = [];
  
  // MIDI tracking
  private _currentNote = 60;
  private _noteVelocity = 0;

  constructor() {
    for (let i = 0; i < 5; i++) {
      this._resonators.push({
        y1: 0,
        y2: 0,
        freq: 440,
        gain: 1,
      });
    }
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._updateResonatorFreqs();
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id.startsWith("res") || id === "baseNote" || id === "decay") {
      this._updateResonatorFreqs();
    }
  }

  getParam(id: string): number {
    return this._params.get(id)?.normalizedValue ?? 0;
  }

  async saveState(): Promise<unknown> {
    return this._params.getNormalizedValues();
  }

  async loadState(state: unknown): Promise<void> {
    if (state && typeof state === "object") {
      this._params.setNormalizedValues(state as Record<string, number>);
      this._updateResonatorFreqs();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { 
    const decay = this._params.get("decay")?.value ?? 10;
    return Math.round(decay * this._sampleRate);
  }

  reset(): void {
    for (const res of this._resonators) {
      res.y1 = 0;
      res.y2 = 0;
    }
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: MidiEvent[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const mode = RESONATOR_MODES[Math.round(this._params.get("mode")?.value ?? 1)];
    const decay = this._params.get("decay")?.value ?? 10;
    const color = dbToLinear(this._params.get("color")?.value ?? 0);
    const width = (this._params.get("width")?.value ?? 50) / 100;
    const blend = (this._params.get("blend")?.value ?? 50) / 100;
    const inputGain = dbToLinear(this._params.get("inputGain")?.value ?? 0);
    const outputGain = dbToLinear(this._params.get("outputGain")?.value ?? 0);
    const dryWet = (this._params.get("dryWet")?.value ?? 50) / 100;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();

    // Process MIDI
    for (const event of midi) {
      if (event.type === "noteOn") {
        this._currentNote = event.data.note;
        this._noteVelocity = event.data.velocity;
        this._updateResonatorFreqs();
      }
    }

    // Calculate filter coefficients
    const decayCoeff = Math.exp(-1 / (decay * this._sampleRate));

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i] * inputGain;
      let dryR = inputR[i] * inputGain;

      if (bypass) {
        outputL[i] = dryL * outputGain;
        outputR[i] = dryR * outputGain;
        continue;
      }

      let wetL = 0;
      let wetR = 0;

      // Process through each resonator
      for (let r = 0; r < 5; r++) {
        const res = this._resonators[r];
        
        // 2-pole resonant filter (simplified modal filter)
        const w = 2 * Math.PI * res.freq / this._sampleRate;
        const cosw = Math.cos(w);
        const sinw = Math.sin(w);
        
        // Calculate bandwidth from decay
        const bandwidth = 1 - decayCoeff;
        const r_coeff = 1 - bandwidth;
        
        // Process filter
        const x = (dryL + dryR) * 0.5 * res.gain * color;
        const y = 2 * r_coeff * cosw * res.y1 - r_coeff * r_coeff * res.y2 + x * (1 - r_coeff * r_coeff) * 0.5;
        
        res.y2 = res.y1;
        res.y1 = y;
        
        // Apply mode
        let out = y;
        if (mode === "HP") {
          out = x - y;
        } else if (mode === "BP") {
          out = x - r_coeff * res.y2;
        }
        
        // Pan resonators for stereo width
        const pan = (r / 4 - 0.5) * width;
        wetL += out * (1 - pan);
        wetR += out * (1 + pan);
      }

      // Blend between input and resonators
      const mixedL = dryL * (1 - blend) + wetL * blend;
      const mixedR = dryR * (1 - blend) + wetR * blend;

      outputL[i] = (dryL * (1 - dryWet) + mixedL * dryWet) * outputGain;
      outputR[i] = (dryR * (1 - dryWet) + mixedR * dryWet) * outputGain;
    }
  }

  private _updateResonatorFreqs(): void {
    const baseNote = this._params.get("baseNote")?.value ?? 60;
    
    for (let i = 0; i < 5; i++) {
      const noteOffset = this._params.get(`res${i + 1}Note`)?.value ?? 0;
      const fine = (this._params.get(`res${i + 1}Fine`)?.value ?? 0) / 100;
      const gain = dbToLinear(this._params.get(`res${i + 1}Gain`)?.value ?? 0);
      
      const totalCents = noteOffset * 100 + fine;
      const freq = midiToFreq(baseNote) * Math.pow(2, totalCents / 1200);
      
      this._resonators[i].freq = clamp(freq, 20, 20000);
      this._resonators[i].gain = gain;
    }
  }

  async dispose(): Promise<void> {}
}

export function createResonatorsDefinition(): PluginDefinition {
  return {
    id: "com.daw.resonators",
    name: "Resonators",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "5 parallel modal resonators",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const res = new ResonatorsInstance();
      res.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return res;
    },
  };
}
