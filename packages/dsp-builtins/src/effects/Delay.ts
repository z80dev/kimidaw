/**
 * Delay
 * 
 * Stereo delay with feedback, filter, and modulation.
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  PluginParameterSpec,
  AudioBuffer,
} from "@daw/plugin-api";
import { createParameterMap, dbToGain } from "@daw/plugin-api";
import { DelayLine, BiquadFilter, lerp } from "../core/DspBase.js";

const PARAMETERS: PluginParameterSpec[] = [
  { id: "timeL", name: "Time L", kind: "float", min: 1, max: 4000, defaultValue: 0.25, unit: "ms" },
  { id: "timeR", name: "Time R", kind: "float", min: 1, max: 4000, defaultValue: 0.25, unit: "ms" },
  { id: "feedback", name: "Feedback", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  { id: "mix", name: "Mix", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  { id: "filterType", name: "Filter", kind: "enum", min: 0, max: 2, defaultValue: 0, labels: ["Off", "Lowpass", "Highpass"] },
  { id: "filterFreq", name: "Filter Freq", kind: "float", min: 100, max: 10000, defaultValue: 0.5, unit: "Hz" },
  { id: "modRate", name: "Mod Rate", kind: "float", min: 0, max: 10, defaultValue: 0, unit: "Hz" },
  { id: "modDepth", name: "Mod Depth", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "sync", name: "Sync", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class DelayInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  private _delayL: DelayLine;
  private _delayR: DelayLine;
  private _filterL?: BiquadFilter;
  private _filterR?: BiquadFilter;
  
  private _modPhase = 0;

  constructor() {
    this._delayL = new DelayLine(5);
    this._delayR = new DelayLine(5);
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._delayL.setSampleRate(config.sampleRate);
    this._delayR.setSampleRate(config.sampleRate);
    this._updateFilter();
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "filterType" || id === "filterFreq") {
      this._updateFilter();
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
      this._updateFilter();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { 
    const timeMs = Math.max(
      this._params.get("timeL")?.value ?? 500,
      this._params.get("timeR")?.value ?? 500
    );
    const feedback = (this._params.get("feedback")?.value ?? 30) / 100;
    // Estimate tail based on time and feedback
    const iterations = Math.log(0.001) / Math.log(feedback);
    return Math.ceil((timeMs * iterations) / 1000 * this._sampleRate);
  }

  reset(): void {
    this._delayL.reset();
    this._delayR.reset();
    this._filterL?.reset();
    this._filterR?.reset();
    this._modPhase = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const timeL = (this._params.get("timeL")?.value ?? 500) / 1000;
    const timeR = (this._params.get("timeR")?.value ?? 500) / 1000;
    const feedback = (this._params.get("feedback")?.value ?? 30) / 100;
    const mix = (this._params.get("mix")?.value ?? 30) / 100;
    const modRate = this._params.get("modRate")?.value ?? 0;
    const modDepth = (this._params.get("modDepth")?.value ?? 0) / 100;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 ? inputs[0].getChannelData(1) : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 ? outputs[0].getChannelData(1) : outputL;

    this._params.processSmoothing();

    const modIncrement = modRate / this._sampleRate;

    for (let i = 0; i < blockSize; i++) {
      const inL = inputL[i];
      const inR = inputR[i];

      // Modulation
      this._modPhase += modIncrement;
      while (this._modPhase >= 1) this._modPhase -= 1;
      const mod = Math.sin(this._modPhase * 2 * Math.PI) * modDepth * 10; // ±10ms modulation

      // Read from delay line with modulation
      const delaySamplesL = timeL * this._sampleRate + mod * this._sampleRate / 1000;
      const delaySamplesR = timeR * this._sampleRate + mod * this._sampleRate / 1000;
      
      let delayedL = this._delayL.read(Math.max(1, delaySamplesL));
      let delayedR = this._delayR.read(Math.max(1, delaySamplesR));

      // Apply filter in feedback loop
      if (this._filterL) delayedL = this._filterL.process(delayedL);
      if (this._filterR) delayedR = this._filterR.process(delayedR);

      // Write to delay line (input + feedback)
      this._delayL.write(inL + delayedL * feedback);
      this._delayR.write(inR + delayedR * feedback);

      // Mix dry/wet
      if (bypass) {
        outputL[i] = inL;
        outputR[i] = inR;
      } else {
        outputL[i] = inL * (1 - mix) + delayedL * mix;
        outputR[i] = inR * (1 - mix) + delayedR * mix;
      }
    }
  }

  async dispose(): Promise<void> {}

  private _updateFilter(): void {
    const type = Math.round(this._params.get("filterType")?.value ?? 0);
    const freq = this._params.get("filterFreq")?.value ?? 2000;

    if (type === 0) {
      this._filterL = undefined;
      this._filterR = undefined;
    } else {
      this._filterL = new BiquadFilter(this._sampleRate);
      this._filterR = new BiquadFilter(this._sampleRate);
      const filterType = type === 1 ? "lowpass" : "highpass";
      this._filterL.setType(filterType);
      this._filterR.setType(filterType);
      this._filterL.setFrequency(freq);
      this._filterR.setFrequency(freq);
    }
  }
}

export function createDelayDefinition(): PluginDefinition {
  return {
    id: "com.daw.delay",
    name: "Delay",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Stereo delay with modulation",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const delay = new DelayInstance();
      delay.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return delay;
    },
  };
}
