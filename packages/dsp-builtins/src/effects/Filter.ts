/**
 * Filter Effect
 * 
 * Multimode filter with envelope follower and LFO modulation.
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
import { BiquadFilter, LFO, dbToLinear, linearToDb } from "../core/DspBase.js";

const PARAMETERS: PluginParameterSpec[] = [
  { id: "type", name: "Type", kind: "enum", min: 0, max: 5, defaultValue: 0, 
    labels: ["Lowpass", "Highpass", "Bandpass", "Notch", "Peak", "Lowshelf"] },
  { id: "cutoff", name: "Cutoff", kind: "float", min: 20, max: 20000, defaultValue: 0.5, unit: "Hz" },
  { id: "resonance", name: "Resonance", kind: "float", min: 0, max: 100, defaultValue: 0.2, unit: "%" },
  { id: "drive", name: "Drive", kind: "float", min: 0, max: 24, defaultValue: 0, unit: "dB" },
  { id: "lfoRate", name: "LFO Rate", kind: "float", min: 0.01, max: 20, defaultValue: 0.1, unit: "Hz" },
  { id: "lfoDepth", name: "LFO Depth", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "envAmount", name: "Env Amount", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "envAttack", name: "Env Attack", kind: "float", min: 0.1, max: 100, defaultValue: 0.1, unit: "ms" },
  { id: "envRelease", name: "Env Release", kind: "float", min: 1, max: 500, defaultValue: 0.2, unit: "ms" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class FilterEffectInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  private _filterL: BiquadFilter;
  private _filterR: BiquadFilter;
  private _lfo: LFO;
  
  // Envelope follower
  private _envValue = 0;
  private _envAttackCoeff = 0;
  private _envReleaseCoeff = 0;

  constructor() {
    this._filterL = new BiquadFilter();
    this._filterR = new BiquadFilter();
    this._lfo = new LFO();
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._filterL.setSampleRate(config.sampleRate);
    this._filterR.setSampleRate(config.sampleRate);
    this._lfo.setSampleRate(config.sampleRate);
    this._updateCoeffs();
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "envAttack" || id === "envRelease") {
      this._updateCoeffs();
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
      this._updateCoeffs();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    this._filterL.reset();
    this._filterR.reset();
    this._lfo.reset();
    this._envValue = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const type = ["lowpass", "highpass", "bandpass", "notch", "peak", "lowshelf"][Math.round(this._params.get("type")?.value ?? 0)];
    const cutoff = this._params.get("cutoff")?.value ?? 1000;
    const resonance = (this._params.get("resonance")?.value ?? 20) / 100;
    const drive = dbToLinear(this._params.get("drive")?.value ?? 0);
    const lfoRate = this._params.get("lfoRate")?.value ?? 1;
    const lfoDepth = (this._params.get("lfoDepth")?.value ?? 0) / 100;
    const envAmount = (this._params.get("envAmount")?.value ?? 0) / 100;

    this._filterL.setType(type as any);
    this._filterL.setQ(0.1 + resonance * 10);
    this._filterR.setType(type as any);
    this._filterR.setQ(0.1 + resonance * 10);

    this._lfo.setRate(lfoRate);

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 ? inputs[0].getChannelData(1) : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 ? outputs[0].getChannelData(1) : outputL;

    this._params.processSmoothing();

    for (let i = 0; i < blockSize; i++) {
      let inL = inputL[i];
      let inR = inputR[i];

      // Apply drive (soft clipping)
      inL = Math.tanh(inL * drive);
      inR = Math.tanh(inR * drive);

      // Envelope follower
      const inputLevel = Math.max(Math.abs(inL), Math.abs(inR));
      const targetEnv = inputLevel;
      if (targetEnv > this._envValue) {
        this._envValue += (targetEnv - this._envValue) * this._envAttackCoeff;
      } else {
        this._envValue += (targetEnv - this._envValue) * this._envReleaseCoeff;
      }

      // Calculate modulated cutoff
      const lfoVal = this._lfo.process() * lfoDepth;
      const envMod = this._envValue * envAmount;
      const modulatedCutoff = Math.max(20, Math.min(20000, cutoff * Math.pow(2, lfoVal + envMod)));

      this._filterL.setFrequency(modulatedCutoff);
      this._filterR.setFrequency(modulatedCutoff);

      if (bypass) {
        outputL[i] = inputL[i];
        outputR[i] = inputR[i];
      } else {
        outputL[i] = this._filterL.process(inL);
        outputR[i] = this._filterR.process(inR);
      }
    }
  }

  async dispose(): Promise<void> {}

  private _updateCoeffs(): void {
    const attackMs = this._params.get("envAttack")?.value ?? 10;
    const releaseMs = this._params.get("envRelease")?.value ?? 100;
    this._envAttackCoeff = 1 - Math.exp(-1 / (attackMs / 1000 * this._sampleRate));
    this._envReleaseCoeff = 1 - Math.exp(-1 / (releaseMs / 1000 * this._sampleRate));
  }
}

export function createFilterDefinition(): PluginDefinition {
  return {
    id: "com.daw.filter",
    name: "Filter",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Multimode filter with LFO and envelope modulation",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const filter = new FilterEffectInstance();
      filter.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return filter;
    },
  };
}
