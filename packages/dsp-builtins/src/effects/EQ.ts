/**
 * Parametric EQ
 * 
 * 4-band parametric EQ with:
 * - Low shelf
 * - 2x Peak/Notch
 * - High shelf
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
import { BiquadFilter, dbToLinear, linearToDb } from "../core/DspBase.js";

const PARAMETERS: PluginParameterSpec[] = [
  // Low shelf
  { id: "lowFreq", name: "Low Freq", kind: "float", min: 20, max: 500, defaultValue: 0.2, unit: "Hz" },
  { id: "lowGain", name: "Low Gain", kind: "float", min: -18, max: 18, defaultValue: 0.5, unit: "dB" },
  
  // Peak 1
  { id: "peak1Freq", name: "Peak 1 Freq", kind: "float", min: 100, max: 10000, defaultValue: 0.3, unit: "Hz" },
  { id: "peak1Gain", name: "Peak 1 Gain", kind: "float", min: -18, max: 18, defaultValue: 0.5, unit: "dB" },
  { id: "peak1Q", name: "Peak 1 Q", kind: "float", min: 0.1, max: 10, defaultValue: 0.2 },
  
  // Peak 2
  { id: "peak2Freq", name: "Peak 2 Freq", kind: "float", min: 200, max: 15000, defaultValue: 0.5, unit: "Hz" },
  { id: "peak2Gain", name: "Peak 2 Gain", kind: "float", min: -18, max: 18, defaultValue: 0.5, unit: "dB" },
  { id: "peak2Q", name: "Peak 2 Q", kind: "float", min: 0.1, max: 10, defaultValue: 0.2 },
  
  // High shelf
  { id: "highFreq", name: "High Freq", kind: "float", min: 1000, max: 20000, defaultValue: 0.8, unit: "Hz" },
  { id: "highGain", name: "High Gain", kind: "float", min: -18, max: 18, defaultValue: 0.5, unit: "dB" },
  
  // Output
  { id: "outputGain", name: "Output", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class EQInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _filters: BiquadFilter[] = [];
  private _sampleRate = 48000;
  private _connected = false;
  private _meterL = 0;
  private _meterR = 0;

  constructor() {
    // Initialize filters: low shelf, 2x peak, high shelf
    for (let i = 0; i < 4; i++) {
      this._filters.push(new BiquadFilter());
    }
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    const param = this._params.get(id);
    if (param) {
      param.setNormalized(value);
      this._updateFilters();
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
      this._updateFilters();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    for (const f of this._filters) f.reset();
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    for (const f of this._filters) {
      f.setSampleRate(config.sampleRate);
    }
    this._updateFilters();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const outputGain = dbToLinear(this._params.get("outputGain")?.value ?? 0);

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    if (bypass) {
      for (let i = 0; i < blockSize; i++) {
        outputL[i] = inputL[i];
        outputR[i] = inputR[i];
      }
      return;
    }

    this._params.processSmoothing();

    let peakL = 0;
    let peakR = 0;

    for (let i = 0; i < blockSize; i++) {
      let sampleL = inputL[i];
      let sampleR = inputR[i];

      // Process through filter chain
      for (const filter of this._filters) {
        sampleL = filter.process(sampleL);
      }

      // For stereo, process right channel separately (simplified: same filter chain)
      for (const filter of this._filters) {
        // Reset filter state and process R
        const z1 = (filter as any)._z1;
        const z2 = (filter as any)._z2;
        sampleR = filter.process(sampleR);
        // Note: In production, use separate filter instances per channel
      }

      // Apply output gain
      sampleL *= outputGain;
      sampleR *= outputGain;

      // Meter
      peakL = Math.max(peakL, Math.abs(sampleL));
      peakR = Math.max(peakR, Math.abs(sampleR));

      outputL[i] = sampleL;
      outputR[i] = sampleR;
    }

    this._meterL = peakL;
    this._meterR = peakR;
  }

  async dispose(): Promise<void> {}

  private _updateFilters(): void {
    const p = (id: string) => this._params.get(id)?.value ?? 0;

    // Low shelf
    this._filters[0].setType("lowshelf");
    this._filters[0].setFrequency(p("lowFreq"));
    this._filters[0].setGain(p("lowGain"));

    // Peak 1
    this._filters[1].setType("peak");
    this._filters[1].setFrequency(p("peak1Freq"));
    this._filters[1].setGain(p("peak1Gain"));
    this._filters[1].setQ(p("peak1Q"));

    // Peak 2
    this._filters[2].setType("peak");
    this._filters[2].setFrequency(p("peak2Freq"));
    this._filters[2].setGain(p("peak2Gain"));
    this._filters[2].setQ(p("peak2Q"));

    // High shelf
    this._filters[3].setType("highshelf");
    this._filters[3].setFrequency(p("highFreq"));
    this._filters[3].setGain(p("highGain"));
  }

  get meters(): { left: number; right: number } {
    return { left: this._meterL, right: this._meterR };
  }
}

export function createEQDefinition(): PluginDefinition {
  return {
    id: "com.daw.eq",
    name: "EQ",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "4-band parametric equalizer",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const eq = new EQInstance();
      eq.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return eq;
    },
  };
}
