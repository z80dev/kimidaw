/**
 * Overdrive - Guitar-style overdrive
 * 
 * Classic overdrive effect with:
 * - Drive control for saturation amount
 * - Tone control (lowpass filter)
 * - Dynamics (input sensitivity)
 * - Dry/wet mix
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
import { StateVariableFilter } from "../core/AdvancedFilters.js";
import { dbToLinear, clamp, tanhApprox } from "../core/DspUtils.js";

const PARAMETERS: PluginParameterSpec[] = [
  { id: "drive", name: "Drive", kind: "float", min: 0, max: 48, defaultValue: 0.3, unit: "dB" },
  { id: "tone", name: "Tone", kind: "float", min: 200, max: 12000, defaultValue: 0.6, unit: "Hz" },
  { id: "dynamics", name: "Dynamics", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "output", name: "Output", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class OverdriveInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  private _toneFilterL = new StateVariableFilter();
  private _toneFilterR = new StateVariableFilter();

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._toneFilterL.setSampleRate(this._sampleRate);
    this._toneFilterR.setSampleRate(this._sampleRate);
    this._toneFilterL.setType("lowpass12");
    this._toneFilterR.setType("lowpass12");
    this._updateFilters();
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "tone") {
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
    this._toneFilterL.reset();
    this._toneFilterR.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const drive = dbToLinear(this._params.get("drive")?.value ?? 0);
    const dynamics = (this._params.get("dynamics")?.value ?? 50) / 100;
    const dryWet = (this._params.get("dryWet")?.value ?? 100) / 100;
    const output = dbToLinear(this._params.get("output")?.value ?? 0);

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL * output;
        outputR[i] = dryR * output;
        continue;
      }

      // Apply dynamics (input gain staging)
      const inputGain = 1 + (drive - 1) * dynamics;
      let wetL = dryL * inputGain;
      let wetR = dryR * inputGain;

      // Apply overdrive (asymmetric distortion)
      wetL = this._distort(wetL, drive);
      wetR = this._distort(wetR, drive);

      // Apply tone filter
      wetL = this._toneFilterL.process(wetL);
      wetR = this._toneFilterR.process(wetR);

      // Mix
      outputL[i] = (dryL * (1 - dryWet) + wetL * dryWet) * output;
      outputR[i] = (dryR * (1 - dryWet) + wetR * dryWet) * output;
    }
  }

  private _distort(input: number, drive: number): number {
    // Asymmetric overdrive characteristic
    if (input >= 0) {
      return tanhApprox(input * drive);
    } else {
      // Slightly less distortion on negative side
      return tanhApprox(input * drive * 0.8) * 1.1;
    }
  }

  private _updateFilters(): void {
    const tone = this._params.get("tone")?.value ?? 5000;
    this._toneFilterL.setFrequency(tone);
    this._toneFilterR.setFrequency(tone);
    this._toneFilterL.setQ(0.707);
    this._toneFilterR.setQ(0.707);
  }

  async dispose(): Promise<void> {}
}

export function createOverdriveDefinition(): PluginDefinition {
  return {
    id: "com.daw.overdrive",
    name: "Overdrive",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Guitar-style overdrive distortion",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const od = new OverdriveInstance();
      od.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return od;
    },
  };
}
