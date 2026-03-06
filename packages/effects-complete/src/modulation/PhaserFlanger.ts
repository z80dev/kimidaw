/**
 * Phaser-Flanger - Combined phaser/flanger effect
 * 
 * Versatile modulation effect with:
 * - Multiple stages (4, 8, 12 allpass filters)
 * - Frequency, feedback, color controls
 * - LFO with amount
 * - Spin (different LFO rates per channel)
 * - ENV amount for envelope following
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
import { AllpassFilter, LFO, EnvelopeFollower } from "../core/DspUtils.js";
import { clamp } from "../core/DspUtils.js";

const STAGE_OPTIONS = ["4", "8", "12"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "stages", name: "Stages", kind: "enum", min: 0, max: 2, defaultValue: 1, labels: [...STAGE_OPTIONS] },
  { id: "frequency", name: "Frequency", kind: "float", min: 100, max: 8000, defaultValue: 0.5, unit: "Hz" },
  { id: "feedback", name: "Feedback", kind: "float", min: 0, max: 95, defaultValue: 0.4, unit: "%" },
  { id: "color", name: "Color", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "%" },
  
  { id: "rate", name: "Rate", kind: "float", min: 0.01, max: 10, defaultValue: 0.2, unit: "Hz" },
  { id: "amount", name: "Amount", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "spin", name: "Spin", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "envAmount", name: "Env Amount", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class PhaserFlangerInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Allpass filters for phasing
  private _allpassL: AllpassFilter[] = [];
  private _allpassR: AllpassFilter[] = [];
  
  // LFOs
  private _lfoL = new LFO();
  private _lfoR = new LFO();
  
  // Envelope follower
  private _envFollowerL = new EnvelopeFollower();
  private _envFollowerR = new EnvelopeFollower();

  constructor() {
    // Create 12 allpass filters (max)
    for (let i = 0; i < 12; i++) {
      this._allpassL.push(new AllpassFilter(50 + i * 10));
      this._allpassR.push(new AllpassFilter(50 + i * 10 + 5));
    }
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._lfoL.setSampleRate(this._sampleRate);
    this._lfoR.setSampleRate(this._sampleRate);
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
  getTailSamples(): number { 
    const fb = (this._params.get("feedback")?.value ?? 50) / 100;
    return Math.round(this._sampleRate * fb * 0.5);
  }

  reset(): void {
    for (let i = 0; i < 12; i++) {
      this._allpassL[i].reset();
      this._allpassR[i].reset();
    }
    this._lfoL.reset();
    this._lfoR.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const stages = [4, 8, 12][Math.round(this._params.get("stages")?.value ?? 1)] ?? 8;
    const baseFreq = this._params.get("frequency")?.value ?? 1000;
    const feedback = (this._params.get("feedback")?.value ?? 50) / 100;
    const color = (this._params.get("color")?.value ?? 0) / 100;
    const rate = this._params.get("rate")?.value ?? 1;
    const amount = (this._params.get("amount")?.value ?? 50) / 100;
    const spin = (this._params.get("spin")?.value ?? 0) / 100;
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

    // Update LFOs
    this._lfoL.setRate(rate);
    this._lfoR.setRate(rate * (1 + spin));

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL;
        outputR[i] = dryR;
        continue;
      }

      // Get envelope
      const envL = this._envFollowerL.process(dryL) * envAmount;
      const envR = this._envFollowerR.process(dryR) * envAmount;

      // Calculate modulation
      const lfoL = this._lfoL.process();
      const lfoR = this._lfoR.process();
      const modL = lfoL * (1 - envAmount) + envL;
      const modR = lfoR * (1 - envAmount) + envR;

      // Apply color (shifts center frequency)
      const freqL = baseFreq * Math.pow(2, (color + modL * amount) * 2);
      const freqR = baseFreq * Math.pow(2, (color + modR * amount) * 2);

      // Calculate allpass coefficient from frequency
      const coeffL = this._freqToCoeff(freqL);
      const coeffR = this._freqToCoeff(freqR);

      // Process through allpass chain
      let wetL = dryL;
      let wetR = dryR;
      
      for (let s = 0; s < stages; s++) {
        wetL = this._allpassL[s].process(wetL, coeffL);
        wetR = this._allpassR[s].process(wetR, coeffR);
      }

      // Apply feedback (negative for classic phaser sound)
      wetL = dryL + wetL * -feedback;
      wetR = dryR + wetR * -feedback;

      // Mix
      outputL[i] = dryL * (1 - dryWet) + wetL * dryWet;
      outputR[i] = dryR * (1 - dryWet) + wetR * dryWet;
    }
  }

  private _freqToCoeff(freq: number): number {
    // Convert frequency to allpass coefficient
    // coefficient = (tan(pi*fc/fs) - 1) / (tan(pi*fc/fs) + 1)
    const w = 2 * Math.PI * freq / this._sampleRate;
    const tanw = Math.tan(w / 2);
    return (tanw - 1) / (tanw + 1);
  }

  async dispose(): Promise<void> {}

  private _updateCoeffs(): void {
    this._envFollowerL.setAttack(1, this._sampleRate);
    this._envFollowerL.setRelease(100, this._sampleRate);
    this._envFollowerR.setAttack(1, this._sampleRate);
    this._envFollowerR.setRelease(100, this._sampleRate);
  }
}

export function createPhaserFlangerDefinition(): PluginDefinition {
  return {
    id: "com.daw.phaser-flanger",
    name: "Phaser-Flanger",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Combined phaser and flanger effect",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const phaser = new PhaserFlangerInstance();
      phaser.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return phaser;
    },
  };
}
