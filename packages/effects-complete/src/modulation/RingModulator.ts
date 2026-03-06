/**
 * Ring Modulator
 * 
 * Classic ring modulation effect:
 * - Multiplies input by modulator waveform
 * - Creates sum and difference frequencies
 * - Sin/square/triangle modulator waveforms
 * - Frequency and amount controls
 * 
 * Used for metallic, bell-like sounds and sci-fi effects.
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  PluginParameterSpec,
  AudioBuffer,
} from "@daw/plugin-api";
import { createParameterMap } from "@daw/plugin-api";
import { LFO, clamp } from "../core/DspUtils.js";

const PARAMETERS: PluginParameterSpec[] = [
  // Modulator
  { id: "frequency", name: "Frequency", kind: "float", min: 1, max: 8000, defaultValue: 0.3, unit: "Hz" },
  { id: "fine", name: "Fine", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "cents" },
  { 
    id: "waveform", 
    name: "Waveform", 
    kind: "enum", 
    min: 0, 
    max: 3, 
    defaultValue: 0, 
    labels: ["Sine", "Square", "Triangle", "Saw"] 
  },
  { id: "amount", name: "Amount", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  
  // Depth/CV
  { id: "depth", name: "Depth", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "source", name: "Source", kind: "enum", min: 0, max: 2, defaultValue: 0, labels: ["Internal", "Ext In", "MIDI"] },
  
  // Output
  { id: "gain", name: "Gain", kind: "float", min: -24, max: 24, defaultValue: 0.75, unit: "dB" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class RingModulatorInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Oscillator state
  private _phase = 0;
  
  // DC blocking
  private _dcBlockX = 0;
  private _dcBlockY = 0;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
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
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    this._phase = 0;
    this._dcBlockX = 0;
    this._dcBlockY = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const frequency = this._params.get("frequency")?.value ?? 100;
    const fine = (this._params.get("fine")?.value ?? 0) / 100; // -1 to 1
    const waveformIdx = Math.round(this._params.get("waveform")?.value ?? 0);
    const amount = (this._params.get("amount")?.value ?? 100) / 100;
    const depth = (this._params.get("depth")?.value ?? 100) / 100;
    const dryWet = (this._params.get("dryWet")?.value ?? 100) / 100;
    const gainDb = this._params.get("gain")?.value ?? 0;
    const gain = Math.pow(10, gainDb / 20);

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();

    // Calculate final frequency with fine tuning
    const freqMultiplier = Math.pow(2, fine / 12);
    const finalFreq = frequency * freqMultiplier;
    const phaseIncrement = (finalFreq * 2 * Math.PI) / this._sampleRate;

    for (let i = 0; i < blockSize; i++) {
      const dryL = inputL[i];
      const dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL * gain;
        outputR[i] = dryR * gain;
        continue;
      }

      // Generate modulator waveform
      const modulator = this._generateModulator(waveformIdx, amount, depth);

      // Ring modulation: multiply input by modulator
      // For stereo, we can use same modulator or slight offset for width
      let wetL = dryL * modulator;
      let wetR = dryR * modulator;

      // DC blocking (ring modulation adds DC offset)
      wetL = this._dcBlock(wetL);
      wetR = this._dcBlock(wetR);

      // Mix
      outputL[i] = (dryL * (1 - dryWet) + wetL * dryWet) * gain;
      outputR[i] = (dryR * (1 - dryWet) + wetR * dryWet) * gain;

      // Advance phase
      this._phase += phaseIncrement;
      while (this._phase >= 2 * Math.PI) {
        this._phase -= 2 * Math.PI;
      }
    }
  }

  private _generateModulator(waveformIdx: number, amount: number, depth: number): number {
    // Base modulator value (-1 to 1)
    let mod = 0;

    switch (waveformIdx) {
      case 0: // Sine
        mod = Math.sin(this._phase);
        break;
      case 1: // Square
        mod = this._phase < Math.PI ? 1 : -1;
        break;
      case 2: // Triangle
        if (this._phase < Math.PI / 2) {
          mod = this._phase / (Math.PI / 2);
        } else if (this._phase < 3 * Math.PI / 2) {
          mod = 1 - 2 * (this._phase - Math.PI / 2) / Math.PI;
        } else {
          mod = -1 + (this._phase - 3 * Math.PI / 2) / (Math.PI / 2);
        }
        break;
      case 3: // Saw
        mod = 1 - 2 * this._phase / (2 * Math.PI);
        break;
      default:
        mod = Math.sin(this._phase);
    }

    // Scale by amount and depth
    // mod goes from -amount to +amount, scaled by depth
    return 1 - depth + mod * amount * depth;
  }

  private _dcBlock(input: number): number {
    // Simple DC blocking filter: y[n] = x[n] - x[n-1] + R * y[n-1]
    const R = 0.995;
    const output = input - this._dcBlockX + R * this._dcBlockY;
    this._dcBlockX = input;
    this._dcBlockY = output;
    return output;
  }

  async dispose(): Promise<void> {}
}

export function createRingModulatorDefinition(): PluginDefinition {
  return {
    id: "com.daw.ring-modulator",
    name: "Ring Modulator",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Classic ring modulation with multiple waveforms",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const rm = new RingModulatorInstance();
      rm.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return rm;
    },
  };
}
