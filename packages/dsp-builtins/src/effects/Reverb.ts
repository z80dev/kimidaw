/**
 * Reverb
 * 
 * Schroeder-style reverb with parallel comb filters and series allpass filters.
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
import { DelayLine, lerp } from "../core/DspBase.js";

const PARAMETERS: PluginParameterSpec[] = [
  { id: "size", name: "Size", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "decay", name: "Decay", kind: "float", min: 0.1, max: 10, defaultValue: 0.3, unit: "s" },
  { id: "damping", name: "Damping", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  { id: "mix", name: "Mix", kind: "float", min: 0, max: 100, defaultValue: 0.2, unit: "%" },
  { id: "preDelay", name: "Pre-delay", kind: "float", min: 0, max: 200, defaultValue: 0.1, unit: "ms" },
  { id: "width", name: "Width", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

// Comb filter class
class CombFilter {
  private _delay: DelayLine;
  private _feedback = 0.5;
  private _damping = 0.5;
  private _filterState = 0;

  constructor(delaySeconds: number, sampleRate: number) {
    this._delay = new DelayLine(delaySeconds + 0.1, sampleRate);
  }

  setSampleRate(sr: number): void {
    this._delay.setSampleRate(sr);
  }

  setFeedback(fb: number): void {
    this._feedback = fb;
  }

  setDamping(d: number): void {
    this._damping = d;
  }

  process(input: number, delaySamples: number): number {
    const delayed = this._delay.read(delaySamples);
    
    // Lowpass filter in feedback loop
    this._filterState = delayed * (1 - this._damping) + this._filterState * this._damping;
    
    const output = input + this._filterState * this._feedback;
    this._delay.write(output);
    
    return delayed;
  }

  reset(): void {
    this._delay.reset();
    this._filterState = 0;
  }
}

// Allpass filter class
class AllpassFilter {
  private _delay: DelayLine;
  private _feedback = 0.5;

  constructor(delaySeconds: number, sampleRate: number) {
    this._delay = new DelayLine(delaySeconds + 0.05, sampleRate);
  }

  setSampleRate(sr: number): void {
    this._delay.setSampleRate(sr);
  }

  setFeedback(fb: number): void {
    this._feedback = fb;
  }

  process(input: number, delaySamples: number): number {
    const delayed = this._delay.read(delaySamples);
    const output = delayed - input;
    this._delay.write(input + delayed * this._feedback);
    return output;
  }

  reset(): void {
    this._delay.reset();
  }
}

export class ReverbInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Schroeder reverb: 4 parallel combs + 2 series allpasses
  private _combsL: CombFilter[] = [];
  private _combsR: CombFilter[] = [];
  private _allpassesL: AllpassFilter[] = [];
  private _allpassesR: AllpassFilter[] = [];
  
  // Pre-delay
  private _preDelayL: DelayLine;
  private _preDelayR: DelayLine;

  // Comb delay times in milliseconds (scaled by room size)
  private static readonly COMB_DELAYS = [29.7, 35.1, 40.5, 46.1];
  private static readonly ALLPASS_DELAYS = [5.0, 1.7];

  constructor() {
    // Initialize filters
    for (let i = 0; i < 4; i++) {
      this._combsL.push(new CombFilter(0.1, 48000));
      this._combsR.push(new CombFilter(0.1, 48000));
    }
    for (let i = 0; i < 2; i++) {
      this._allpassesL.push(new AllpassFilter(0.02, 48000));
      this._allpassesR.push(new AllpassFilter(0.02, 48000));
    }
    this._preDelayL = new DelayLine(0.3, 48000);
    this._preDelayR = new DelayLine(0.3, 48000);
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    
    for (const f of this._combsL) f.setSampleRate(config.sampleRate);
    for (const f of this._combsR) f.setSampleRate(config.sampleRate);
    for (const f of this._allpassesL) f.setSampleRate(config.sampleRate);
    for (const f of this._allpassesR) f.setSampleRate(config.sampleRate);
    this._preDelayL.setSampleRate(config.sampleRate);
    this._preDelayR.setSampleRate(config.sampleRate);
    
    this._updateParams();
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    this._updateParams();
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
      this._updateParams();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number {
    const decay = this._params.get("decay")?.value ?? 2;
    return Math.ceil(decay * this._sampleRate * 2); // Conservative estimate
  }

  reset(): void {
    for (const f of this._combsL) f.reset();
    for (const f of this._combsR) f.reset();
    for (const f of this._allpassesL) f.reset();
    for (const f of this._allpassesR) f.reset();
    this._preDelayL.reset();
    this._preDelayR.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const size = (this._params.get("size")?.value ?? 50) / 100;
    const decay = this._params.get("decay")?.value ?? 2;
    const damping = (this._params.get("damping")?.value ?? 30) / 100;
    const mix = (this._params.get("mix")?.value ?? 20) / 100;
    const preDelay = (this._params.get("preDelay")?.value ?? 20) / 1000;
    const width = (this._params.get("width")?.value ?? 100) / 100;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 ? inputs[0].getChannelData(1) : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 ? outputs[0].getChannelData(1) : outputL;

    this._params.processSmoothing();

    // Update damping
    for (const f of this._combsL) f.setDamping(damping);
    for (const f of this._combsR) f.setDamping(damping);

    for (let i = 0; i < blockSize; i++) {
      const inL = inputL[i];
      const inR = inputR[i];

      if (bypass) {
        outputL[i] = inL;
        outputR[i] = inR;
        continue;
      }

      // Pre-delay
      this._preDelayL.write(inL);
      this._preDelayR.write(inR);
      const preL = this._preDelayL.read(preDelay * this._sampleRate);
      const preR = this._preDelayR.read(preDelay * this._sampleRate);

      // Parallel comb filters
      let combOutL = 0;
      let combOutR = 0;

      for (let j = 0; j < 4; j++) {
        const delayMs = ReverbInstance.COMB_DELAYS[j] * (0.5 + size * 0.5);
        const delaySamples = delayMs / 1000 * this._sampleRate;
        const feedback = Math.pow(0.001, delayMs / 1000 / decay);
        
        this._combsL[j].setFeedback(feedback);
        this._combsR[j].setFeedback(feedback);
        
        combOutL += this._combsL[j].process(preL, delaySamples) * 0.25;
        combOutR += this._combsR[j].process(preR, delaySamples) * 0.25;
      }

      // Series allpass filters
      let outL = combOutL;
      let outR = combOutR;

      for (let j = 0; j < 2; j++) {
        const delayMs = ReverbInstance.ALLPASS_DELAYS[j];
        const delaySamples = delayMs / 1000 * this._sampleRate;
        outL = this._allpassesL[j].process(outL, delaySamples);
        outR = this._allpassesR[j].process(outR, delaySamples);
      }

      // Width/stereo processing
      const mid = (outL + outR) * 0.5;
      const side = (outR - outL) * 0.5 * width;
      outL = mid - side;
      outR = mid + side;

      // Mix
      outputL[i] = inL * (1 - mix) + outL * mix;
      outputR[i] = inR * (1 - mix) + outR * mix;
    }
  }

  async dispose(): Promise<void> {}

  private _updateParams(): void {
    // Parameters updated per-sample for smoothing
  }
}

export function createReverbDefinition(): PluginDefinition {
  return {
    id: "com.daw.reverb",
    name: "Reverb",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Schroeder-style reverb",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const reverb = new ReverbInstance();
      reverb.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return reverb;
    },
  };
}
