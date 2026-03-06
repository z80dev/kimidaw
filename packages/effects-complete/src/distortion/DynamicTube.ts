/**
 * Dynamic Tube - Tube saturation emulation
 * 
 * Tube-style saturation with:
 * - Three tube types (A, B, C) with different characteristics
 * - Drive, Tone, Bias controls
 * - Dynamic response to input level
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

const TUBE_TYPES = ["Tube A", "Tube B", "Tube C"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "tubeType", name: "Tube Type", kind: "enum", min: 0, max: 2, defaultValue: 0, labels: [...TUBE_TYPES] },
  { id: "drive", name: "Drive", kind: "float", min: 0, max: 48, defaultValue: 0.3, unit: "dB" },
  { id: "tone", name: "Tone", kind: "float", min: -12, max: 12, defaultValue: 0.5, unit: "dB" },
  { id: "bias", name: "Bias", kind: "float", min: -50, max: 50, defaultValue: 0.5, unit: "%" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "output", name: "Output", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class DynamicTubeInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Tone control (shelving filter)
  private _toneFilterL = new StateVariableFilter();
  private _toneFilterR = new StateVariableFilter();
  
  // DC blocking
  private _dcL = 0;
  private _dcR = 0;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._toneFilterL.setSampleRate(this._sampleRate);
    this._toneFilterR.setSampleRate(this._sampleRate);
    this._toneFilterL.setType("lowshelf");
    this._toneFilterR.setType("lowshelf");
    this._updateTone();
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
      this._updateTone();
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
      this._updateTone();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    this._toneFilterL.reset();
    this._toneFilterR.reset();
    this._dcL = 0;
    this._dcR = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const tubeType = TUBE_TYPES[Math.round(this._params.get("tubeType")?.value ?? 0)];
    const drive = dbToLinear(this._params.get("drive")?.value ?? 0);
    const bias = (this._params.get("bias")?.value ?? 0) / 100;
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

      // Apply tone control
      let wetL = this._toneFilterL.process(dryL);
      let wetR = this._toneFilterR.process(dryR);

      // Apply drive and bias
      wetL = this._saturate(wetL * drive + bias * 0.1, tubeType) / drive;
      wetR = this._saturate(wetR * drive + bias * 0.1, tubeType) / drive;

      // DC blocking
      wetL = this._dcBlock(wetL, this._dcL);
      wetR = this._dcBlock(wetR, this._dcR);

      // Mix
      outputL[i] = (dryL * (1 - dryWet) + wetL * dryWet) * output;
      outputR[i] = (dryR * (1 - dryWet) + wetR * dryWet) * output;
    }
  }

  private _saturate(input: number, tubeType: typeof TUBE_TYPES[number]): number {
    switch (tubeType) {
      case "Tube A":
        // Triode-like: asymmetric, gentle saturation
        return this._triodeSaturation(input);
      
      case "Tube B":
        // Pentode-like: more aggressive, brighter
        return this._pentodeSaturation(input);
      
      case "Tube C":
        // Special: pronounced even harmonics
        return this._specialSaturation(input);
      
      default:
        return input;
    }
  }

  private _triodeSaturation(x: number): number {
    // Asymmetric triode model
    const gain = 2;
    x *= gain;
    
    if (x >= 0) {
      return tanhApprox(x);
    } else {
      // Less gain on negative side
      return tanhApprox(x * 0.8) * 1.1;
    }
  }

  private _pentodeSaturation(x: number): number {
    // Pentode: sharper knee, more compression
    const gain = 2.5;
    x *= gain;
    
    // Harder clipping
    if (x > 1) {
      x = 1 + (x - 1) * 0.3;
    } else if (x < -1) {
      x = -1 + (x + 1) * 0.3;
    }
    
    return tanhApprox(x * 1.5);
  }

  private _specialSaturation(x: number): number {
    // Emphasize even harmonics
    const x2 = x * x * Math.sign(x);
    const x3 = x * x * x;
    
    // Mix odd and even harmonics
    return x - 0.15 * x2 + 0.05 * x3;
  }

  private _dcBlock(input: number, state: number): number {
    const r = 0.995;
    const output = input - state + r * this._dcL;
    this._dcL = output;
    return output;
  }

  private _updateTone(): void {
    const tone = this._params.get("tone")?.value ?? 0;
    this._toneFilterL.setFrequency(1000);
    this._toneFilterL.setGain(tone);
    this._toneFilterR.setFrequency(1000);
    this._toneFilterR.setGain(tone);
  }

  async dispose(): Promise<void> {}
}

export function createDynamicTubeDefinition(): PluginDefinition {
  return {
    id: "com.daw.dynamic-tube",
    name: "Dynamic Tube",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Tube saturation emulation with three tube types",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const tube = new DynamicTubeInstance();
      tube.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return tube;
    },
  };
}
