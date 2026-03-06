/**
 * Frequency Shifter
 * 
 * Bode-style frequency shifting (not pitch shifting):
 * - Shifts spectrum up or down by fixed frequency amount
 * - Fine/coarse controls for precise tuning
 * - LFO modulation for phaser-like effects
 * - Wide mode for enhanced stereo
 * 
 * Unlike pitch shifters which preserve harmonic relationships,
 * frequency shifters translate the entire spectrum linearly.
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
import { BiquadFilter, HilbertTransform } from "../core/AdvancedFilters.js";
import { LFO, clamp } from "../core/DspUtils.js";

const PARAMETERS: PluginParameterSpec[] = [
  // Frequency controls
  { id: "coarse", name: "Coarse", kind: "float", min: -5000, max: 5000, defaultValue: 0.5, unit: "Hz" },
  { id: "fine", name: "Fine", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "Hz" },
  
  // LFO Modulation
  { id: "lfoAmount", name: "LFO Amount", kind: "float", min: 0, max: 500, defaultValue: 0, unit: "Hz" },
  { id: "lfoRate", name: "LFO Rate", kind: "float", min: 0.01, max: 100, defaultValue: 0.1, unit: "Hz" },
  { 
    id: "lfoWaveform", 
    name: "LFO Wave", 
    kind: "enum", 
    min: 0, 
    max: 5, 
    defaultValue: 0, 
    labels: ["Sine", "Triangle", "Saw", "Square", "S&H", "Noise"] 
  },
  
  // Mode
  { id: "wide", name: "Wide", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "ringMode", name: "Ring Mode", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  
  // Mix
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "output", name: "Output", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class FrequencyShifterInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Hilbert transformers for 90° phase shift
  private _hilbertL: HilbertTransform;
  private _hilbertR: HilbertTransform;
  
  // LFO
  private _lfo = new LFO();
  
  // Phase accumulators for sine/cosine oscillators
  private _phaseL = 0;
  private _phaseR = 0;
  
  // Wide mode offset
  private _wideOffset = 0.5; // Radians

  constructor() {
    this._hilbertL = new HilbertTransform();
    this._hilbertR = new HilbertTransform();
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._lfo.setSampleRate(this._sampleRate);
    this._hilbertL.setSampleRate(this._sampleRate);
    this._hilbertR.setSampleRate(this._sampleRate);
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "lfoWaveform") {
      const waveforms = ["sine", "triangle", "saw", "square", "s&h", "noise"] as const;
      this._lfo.setWaveform(waveforms[Math.floor(value * 5.99)]);
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
    }
  }

  getLatencySamples(): number { 
    // Hilbert transform adds latency
    return this._hilbertL.getLatency();
  }
  
  getTailSamples(): number { return 0; }

  reset(): void {
    this._hilbertL.reset();
    this._hilbertR.reset();
    this._phaseL = 0;
    this._phaseR = 0;
    this._lfo.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const coarse = (this._params.get("coarse")?.value ?? 0);
    const fine = (this._params.get("fine")?.value ?? 0);
    const lfoAmount = (this._params.get("lfoAmount")?.value ?? 0);
    const lfoRate = (this._params.get("lfoRate")?.value ?? 1);
    const wide = (this._params.get("wide")?.value ?? 0) >= 0.5;
    const ringMode = (this._params.get("ringMode")?.value ?? 0) >= 0.5;
    const dryWet = (this._params.get("dryWet")?.value ?? 100) / 100;
    const outputGain = Math.pow(10, (this._params.get("output")?.value ?? 0) / 20);

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();
    this._lfo.setRate(lfoRate);

    // Calculate base frequency
    const baseFreq = coarse + fine;

    for (let i = 0; i < blockSize; i++) {
      const dryL = inputL[i];
      const dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL * outputGain;
        outputR[i] = dryR * outputGain;
        continue;
      }

      // Get LFO modulation
      const lfoValue = this._lfo.process() * lfoAmount;
      
      // Calculate instantaneous shift frequencies
      const shiftFreqL = baseFreq + lfoValue;
      const shiftFreqR = wide ? baseFreq - lfoValue : shiftFreqL;

      // Get analytic signal (90° phase shifted version)
      const analyticL = this._hilbertL.process(dryL);
      const analyticR = this._hilbertR.process(dryR);

      // Calculate oscillator phases
      this._phaseL += (shiftFreqL * 2 * Math.PI) / this._sampleRate;
      this._phaseR += (shiftFreqR * 2 * Math.PI) / this._sampleRate;
      
      // Wrap phases
      while (this._phaseL > Math.PI * 2) this._phaseL -= Math.PI * 2;
      while (this._phaseL < -Math.PI * 2) this._phaseL += Math.PI * 2;
      while (this._phaseR > Math.PI * 2) this._phaseR -= Math.PI * 2;
      while (this._phaseR < -Math.PI * 2) this._phaseR += Math.PI * 2;

      // Sine and cosine of phase
      const cosL = Math.cos(this._phaseL);
      const sinL = Math.sin(this._phaseL);
      const cosR = Math.cos(this._phaseR);
      const sinR = Math.sin(this._phaseR);

      // Frequency shift using SSB (Single Sideband) modulation
      // shifted = real * cos(ωt) - imag * sin(ωt)
      let wetL: number;
      let wetR: number;

      if (ringMode) {
        // Ring modulation (keeps both sidebands)
        wetL = dryL * cosL;
        wetR = dryR * cosR;
      } else {
        // Frequency shift (SSB)
        wetL = analyticL.real * cosL - analyticL.imag * sinL;
        wetR = analyticR.real * cosR - analyticR.imag * sinR;
      }

      // Mix dry/wet
      outputL[i] = (dryL * (1 - dryWet) + wetL * dryWet) * outputGain;
      outputR[i] = (dryR * (1 - dryWet) + wetR * dryWet) * outputGain;
    }
  }

  async dispose(): Promise<void> {}
}

export function createFrequencyShifterDefinition(): PluginDefinition {
  return {
    id: "com.daw.frequency-shifter",
    name: "Frequency Shifter",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Bode-style frequency shifting with LFO modulation",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const fs = new FrequencyShifterInstance();
      fs.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return fs;
    },
  };
}
