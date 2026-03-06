/**
 * Flanger - Classic flanging effect
 * 
 * Tape-style flanging with:
 * - Variable delay time with feedback
 * - LFO modulation
 * - Phase invert option
 * - Envelope amount for dynamic flanging
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
import { DelayLine, LFO, EnvelopeFollower } from "../core/DspUtils.js";
import { clamp } from "../core/DspUtils.js";

const PARAMETERS: PluginParameterSpec[] = [
  { id: "delay", name: "Delay Time", kind: "float", min: 0.1, max: 10, defaultValue: 0.1, unit: "ms" },
  { id: "rate", name: "Rate", kind: "float", min: 0.01, max: 10, defaultValue: 0.1, unit: "Hz" },
  { id: "amount", name: "Amount", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "feedback", name: "Feedback", kind: "float", min: -90, max: 90, defaultValue: 0.4, unit: "%" },
  { id: "invert", name: "Invert Phase", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "envAmount", name: "Env Amount", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "attack", name: "Attack", kind: "float", min: 0.1, max: 100, defaultValue: 0.1, unit: "ms" },
  { id: "release", name: "Release", kind: "float", min: 1, max: 1000, defaultValue: 0.3, unit: "ms" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class FlangerInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Short delay line for flanging (max 15ms)
  private _delayL: DelayLine;
  private _delayR: DelayLine;
  
  // LFO
  private _lfo = new LFO();
  
  // Envelope follower for dynamic flanging
  private _envFollower = new EnvelopeFollower();

  constructor() {
    this._delayL = new DelayLine(0.015, this._sampleRate);
    this._delayR = new DelayLine(0.015, this._sampleRate);
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._delayL = new DelayLine(0.015, this._sampleRate);
    this._delayR = new DelayLine(0.015, this._sampleRate);
    this._lfo.setSampleRate(this._sampleRate);
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
    if (id === "attack" || id === "release") {
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
  getTailSamples(): number { 
    const fb = Math.abs(this._params.get("feedback")?.value ?? 50) / 100;
    return Math.round(this._sampleRate * fb);
  }

  reset(): void {
    this._delayL.reset();
    this._delayR.reset();
    this._lfo.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const delayMs = this._params.get("delay")?.value ?? 1;
    const rate = this._params.get("rate")?.value ?? 0.5;
    const amount = (this._params.get("amount")?.value ?? 50) / 100;
    const feedback = (this._params.get("feedback")?.value ?? 50) / 100;
    const invert = this._params.get("invert")?.value >= 0.5;
    const envAmount = (this._params.get("envAmount")?.value ?? 0) / 100;
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

    // Update LFO
    this._lfo.setRate(rate);

    const baseDelaySamples = delayMs * this._sampleRate / 1000;
    const modDepth = amount * 5 * this._sampleRate / 1000; // +/- 5ms modulation

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL;
        outputR[i] = dryR;
        continue;
      }

      // Get envelope for dynamic flanging
      const env = this._envFollower.process(dryL + dryR) * envAmount;

      // Calculate modulation
      const lfo = this._lfo.process();
      const mod = lfo * (1 - envAmount) + env * envAmount;
      const delayL = clamp(baseDelaySamples + mod * modDepth, 0.1, 14.9 * this._sampleRate / 1000);
      const delayR = clamp(baseDelaySamples + mod * modDepth, 0.1, 14.9 * this._sampleRate / 1000);

      // Read from delay line
      let wetL = this._delayL.read(delayL);
      let wetR = this._delayR.read(delayR);

      // Invert phase if enabled
      if (invert) {
        wetL = -wetL;
        wetR = -wetR;
      }

      // Write to delay line with feedback
      this._delayL.write(dryL + wetL * feedback);
      this._delayR.write(dryR + wetR * feedback);

      // Mix
      outputL[i] = dryL * (1 - dryWet) + wetL * dryWet;
      outputR[i] = dryR * (1 - dryWet) + wetR * dryWet;
    }
  }

  private _updateCoeffs(): void {
    const attackMs = this._params.get("attack")?.value ?? 0.1;
    const releaseMs = this._params.get("release")?.value ?? 100;
    this._envFollower.setAttack(attackMs, this._sampleRate);
    this._envFollower.setRelease(releaseMs, this._sampleRate);
  }

  async dispose(): Promise<void> {}
}

export function createFlangerDefinition(): PluginDefinition {
  return {
    id: "com.daw.flanger",
    name: "Flanger",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Classic tape-style flanging effect",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const flanger = new FlangerInstance();
      flanger.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return flanger;
    },
  };
}
