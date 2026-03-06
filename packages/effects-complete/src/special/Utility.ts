/**
 * Utility - Swiss army knife audio tool
 * 
 * Essential audio utilities:
 * - Gain, Balance (pan law)
 * - Mute, Phase invert L/R
 * - Stereo width (M/S processing)
 * - Bass Mono frequency
 * - DC filter
 * - Panorama (L/R swap)
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
import { DCFilter, dbToLinear, clamp } from "../core/DspUtils.js";
import { StateVariableFilter } from "../core/AdvancedFilters.js";

const PAN_LAWS = ["-3dB", "-4.5dB", "-6dB", "0dB", "Equal Power"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "gain", name: "Gain", kind: "float", min: -inf, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "balance", name: "Balance", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "panLaw", name: "Pan Law", kind: "enum", min: 0, max: 4, defaultValue: 0, labels: [...PAN_LAWS] },
  
  { id: "mute", name: "Mute", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "invertL", name: "Invert L", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "invertR", name: "Invert R", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  
  { id: "width", name: "Width", kind: "float", min: 0, max: 200, defaultValue: 1, unit: "%" },
  { id: "mono", name: "Mono", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  
  { id: "bassMono", name: "Bass Mono", kind: "float", min: 20, max: 500, defaultValue: 0, unit: "Hz" },
  { id: "dcFilter", name: "DC Filter", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "swap", name: "L/R Swap", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

const inf = -1000;

export class UtilityInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Filters
  private _dcFilterL = new DCFilter();
  private _dcFilterR = new DCFilter();
  private _bassMonoFilterL = new StateVariableFilter();
  private _bassMonoFilterR = new StateVariableFilter();

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._dcFilterL.setCutoff(10, this._sampleRate);
    this._dcFilterR.setCutoff(10, this._sampleRate);
    this._bassMonoFilterL.setSampleRate(this._sampleRate);
    this._bassMonoFilterR.setSampleRate(this._sampleRate);
    this._bassMonoFilterL.setType("lowpass12");
    this._bassMonoFilterR.setType("lowpass12");
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "bassMono") {
      this._updateBassMono();
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
      this._updateBassMono();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    this._dcFilterL.reset();
    this._dcFilterR.reset();
    this._bassMonoFilterL.reset();
    this._bassMonoFilterR.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const gain = dbToLinear(this._params.get("gain")?.value ?? 0);
    const balance = (this._params.get("balance")?.value ?? 0) / 100;
    const panLawIndex = Math.round(this._params.get("panLaw")?.value ?? 0);
    const mute = this._params.get("mute")?.value >= 0.5;
    const invertL = this._params.get("invertL")?.value >= 0.5;
    const invertR = this._params.get("invertR")?.value >= 0.5;
    const width = (this._params.get("width")?.value ?? 100) / 100;
    const mono = this._params.get("mono")?.value >= 0.5;
    const bassMonoFreq = this._params.get("bassMono")?.value ?? 0;
    const dcFilter = this._params.get("dcFilter")?.value >= 0.5;
    const swap = this._params.get("swap")?.value >= 0.5;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();

    // Calculate pan gains based on pan law
    const { gainL, gainR } = this._calculatePanGains(balance, panLawIndex);

    for (let i = 0; i < blockSize; i++) {
      let sampleL = inputL[i];
      let sampleR = inputR[i];

      if (bypass) {
        outputL[i] = sampleL;
        outputR[i] = sampleR;
        continue;
      }

      // Invert phase
      if (invertL) sampleL = -sampleL;
      if (invertR) sampleR = -sampleR;

      // Swap L/R
      if (swap) {
        const temp = sampleL;
        sampleL = sampleR;
        sampleR = temp;
      }

      // Stereo width / Mono
      if (mono) {
        const mid = (sampleL + sampleR) * 0.5;
        sampleL = sampleR = mid;
      } else if (width !== 1) {
        const mid = (sampleL + sampleR) * 0.5;
        const side = (sampleL - sampleR) * 0.5 * width;
        sampleL = mid + side;
        sampleR = mid - side;
      }

      // Bass mono
      if (bassMonoFreq > 20) {
        const bassL = this._bassMonoFilterL.process(sampleL);
        const bassR = this._bassMonoFilterR.process(sampleR);
        const monoBass = (bassL + bassR) * 0.5;
        sampleL = sampleL - bassL + monoBass;
        sampleR = sampleR - bassR + monoBass;
      }

      // Apply gain and pan
      sampleL *= gain * gainL;
      sampleR *= gain * gainR;

      // DC filter
      if (dcFilter) {
        sampleL = this._dcFilterL.process(sampleL);
        sampleR = this._dcFilterR.process(sampleR);
      }

      // Mute
      if (mute) {
        sampleL = 0;
        sampleR = 0;
      }

      outputL[i] = sampleL;
      outputR[i] = sampleR;
    }
  }

  private _calculatePanGains(balance: number, lawIndex: number): { gainL: number; gainR: number } {
    // balance: -1 (full left) to 1 (full right), 0 = center
    const panLaws = [
      { center: -3, type: "constant" },
      { center: -4.5, type: "constant" },
      { center: -6, type: "constant" },
      { center: 0, type: "constant" },
      { center: -3, type: "equalpower" },
    ];
    
    const law = panLaws[lawIndex] ?? panLaws[0];
    
    let gainL: number;
    let gainR: number;
    
    if (law.type === "equalpower") {
      // Equal power panning (constant power)
      const angle = (balance + 1) * Math.PI / 4;
      gainL = Math.cos(angle);
      gainR = Math.sin(angle);
    } else {
      // Linear panning
      const centerGain = Math.pow(10, law.center / 20);
      
      if (balance <= 0) {
        // Pan left
        gainL = 1;
        gainR = centerGain + (1 - centerGain) * (1 + balance);
      } else {
        // Pan right
        gainL = centerGain + (1 - centerGain) * (1 - balance);
        gainR = 1;
      }
    }
    
    return { gainL, gainR };
  }

  private _updateBassMono(): void {
    const freq = this._params.get("bassMono")?.value ?? 0;
    this._bassMonoFilterL.setFrequency(freq);
    this._bassMonoFilterR.setFrequency(freq);
    this._bassMonoFilterL.setQ(0.707);
    this._bassMonoFilterR.setQ(0.707);
  }

  async dispose(): Promise<void> {}
}

export function createUtilityDefinition(): PluginDefinition {
  return {
    id: "com.daw.utility",
    name: "Utility",
    category: "utility",
    version: "1.0.0",
    vendor: "DAW",
    description: "Essential audio utility tools",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const util = new UtilityInstance();
      util.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return util;
    },
  };
}
