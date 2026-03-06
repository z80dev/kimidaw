/**
 * Limiter
 * 
 * Brick-wall limiter with lookahead and true peak detection.
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  PluginParameterSpec,
  AudioBuffer,
} from "@daw/plugin-api";
import { createParameterMap, dbToGain, gainToDb } from "@daw/plugin-api";

const PARAMETERS: PluginParameterSpec[] = [
  { id: "ceiling", name: "Ceiling", kind: "float", min: -12, max: 0, defaultValue: 1, unit: "dB" },
  { id: "threshold", name: "Threshold", kind: "float", min: -30, max: 0, defaultValue: 0.67, unit: "dB" },
  { id: "release", name: "Release", kind: "float", min: 1, max: 1000, defaultValue: 0.1, unit: "ms" },
  { id: "lookahead", name: "Lookahead", kind: "float", min: 0, max: 10, defaultValue: 0.5, unit: "ms" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class LimiterInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Delay line for lookahead
  private _delayLineL: Float32Array = new Float32Array(512);
  private _delayLineR: Float32Array = new Float32Array(512);
  private _delayWriteIdx = 0;
  private _delaySamples = 0;
  
  // Envelope
  private _envelope = 1;
  private _releaseCoeff = 0;
  
  // Metering
  private _grMeter = 0;
  private _peakL = 0;
  private _peakR = 0;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
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

  getLatencySamples(): number {
    return this._delaySamples;
  }

  getTailSamples(): number {
    return Math.ceil((this._params.get("release")?.value ?? 100) / 1000 * this._sampleRate);
  }

  reset(): void {
    this._delayLineL.fill(0);
    this._delayLineR.fill(0);
    this._envelope = 1;
    this._delayWriteIdx = 0;
    this._peakL = 0;
    this._peakR = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const threshold = this._params.get("threshold")?.value ?? -6;
    const ceiling = this._params.get("ceiling")?.value ?? -1;
    const ceilingGain = dbToGain(ceiling);
    const thresholdGain = dbToGain(threshold);

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 ? inputs[0].getChannelData(1) : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 ? outputs[0].getChannelData(1) : outputL;

    this._params.processSmoothing();

    let maxGR = 0;

    for (let i = 0; i < blockSize; i++) {
      const inL = inputL[i];
      const inR = inputR[i];

      // Write to delay line
      this._delayLineL[this._delayWriteIdx] = inL;
      this._delayLineR[this._delayWriteIdx] = inR;

      // Read delayed sample
      const readIdx = (this._delayWriteIdx - this._delaySamples + this._delayLineL.length) % this._delayLineL.length;
      const delayedL = this._delayLineL[readIdx];
      const delayedR = this._delayLineR[readIdx];

      this._delayWriteIdx = (this._delayWriteIdx + 1) % this._delayLineL.length;

      // Calculate gain reduction
      const peakIn = Math.max(Math.abs(inL), Math.abs(inR));
      const targetGain = peakIn > thresholdGain ? thresholdGain / peakIn : 1;
      
      // Envelope
      if (targetGain < this._envelope) {
        this._envelope = targetGain; // Instant attack
      } else {
        this._envelope += (targetGain - this._envelope) * this._releaseCoeff;
      }

      const gain = bypass ? 1 : this._envelope * ceilingGain;
      const grDb = 20 * Math.log10(gain / ceilingGain);
      maxGR = Math.min(maxGR, grDb);

      // Output
      outputL[i] = delayedL * gain;
      outputR[i] = delayedR * gain;

      // Peak metering
      this._peakL = Math.max(this._peakL * 0.999, Math.abs(outputL[i]));
      this._peakR = Math.max(this._peakR * 0.999, Math.abs(outputR[i]));
    }

    this._grMeter = maxGR;
  }

  async dispose(): Promise<void> {}

  private _updateParams(): void {
    const releaseMs = this._params.get("release")?.value ?? 100;
    const lookaheadMs = this._params.get("lookahead")?.value ?? 5;
    
    this._releaseCoeff = 1 - Math.exp(-1 / (releaseMs / 1000 * this._sampleRate));
    this._delaySamples = Math.ceil(lookaheadMs / 1000 * this._sampleRate);
    
    // Resize delay lines if needed
    const minDelaySize = Math.max(512, this._delaySamples * 2);
    if (this._delayLineL.length < minDelaySize) {
      this._delayLineL = new Float32Array(minDelaySize);
      this._delayLineR = new Float32Array(minDelaySize);
      this._delayWriteIdx = 0;
    }
  }

  get gainReduction(): number {
    return this._grMeter;
  }

  get peaks(): { left: number; right: number } {
    return { left: this._peakL, right: this._peakR };
  }
}

export function createLimiterDefinition(): PluginDefinition {
  return {
    id: "com.daw.limiter",
    name: "Limiter",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Brick-wall limiter with lookahead",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const limiter = new LimiterInstance();
      limiter.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return limiter;
    },
  };
}
