/**
 * Redux - Bitcrusher and sample rate reducer
 * 
 * Classic digital degradation with:
 * - Downsample control (reduces effective sample rate)
 * - Bit depth reduction
 * - Linear interpolation toggle
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
import { lerp, clamp } from "../core/DspUtils.js";

const PARAMETERS: PluginParameterSpec[] = [
  { id: "downsample", name: "Downsample", kind: "int", min: 1, max: 100, defaultValue: 0, unit: "x" },
  { id: "bitDepth", name: "Bit Depth", kind: "float", min: 1, max: 16, defaultValue: 1, unit: "bit" },
  { id: "linear", name: "Linear", kind: "bool", min: 0, max: 1, defaultValue: 1 },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class ReduxInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Downsampling state
  private _downsampleCounter = 0;
  private _holdValueL = 0;
  private _holdValueR = 0;
  private _prevValueL = 0;
  private _prevValueR = 0;

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
    this._downsampleCounter = 0;
    this._holdValueL = 0;
    this._holdValueR = 0;
    this._prevValueL = 0;
    this._prevValueR = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const downsample = Math.max(1, Math.round(this._params.get("downsample")?.value ?? 1));
    const bitDepth = this._params.get("bitDepth")?.value ?? 16;
    const linear = this._params.get("linear")?.value >= 0.5;
    const dryWet = (this._params.get("dryWet")?.value ?? 100) / 100;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();

    // Calculate quantization steps
    const steps = Math.pow(2, bitDepth - 1);

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL;
        outputR[i] = dryR;
        continue;
      }

      // Downsampling
      if (this._downsampleCounter === 0) {
        // Sample and hold
        this._prevValueL = this._holdValueL;
        this._prevValueR = this._holdValueR;
        this._holdValueL = dryL;
        this._holdValueR = dryR;
      }

      let wetL: number;
      let wetR: number;

      if (linear && this._downsampleCounter > 0) {
        // Linear interpolation between samples
        const frac = this._downsampleCounter / downsample;
        wetL = lerp(this._prevValueL, this._holdValueL, frac);
        wetR = lerp(this._prevValueR, this._holdValueR, frac);
      } else {
        // Sample and hold (no interpolation)
        wetL = this._holdValueL;
        wetR = this._holdValueR;
      }

      // Bit depth reduction (quantization)
      wetL = Math.round(wetL * steps) / steps;
      wetR = Math.round(wetR * steps) / steps;

      // Advance counter
      this._downsampleCounter++;
      if (this._downsampleCounter >= downsample) {
        this._downsampleCounter = 0;
      }

      outputL[i] = dryL * (1 - dryWet) + wetL * dryWet;
      outputR[i] = dryR * (1 - dryWet) + wetR * dryWet;
    }
  }

  async dispose(): Promise<void> {}
}

export function createReduxDefinition(): PluginDefinition {
  return {
    id: "com.daw.redux",
    name: "Redux",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Bitcrusher and sample rate reducer",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const redux = new ReduxInstance();
      redux.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return redux;
    },
  };
}
