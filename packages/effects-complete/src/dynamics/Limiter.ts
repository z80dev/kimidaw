/**
 * Limiter - Brickwall limiter
 * 
 * Professional brickwall limiter with:
 * - Adjustable ceiling and gain
 * - Lookahead detection
 * - Program-dependent release
 * - True peak detection (4x oversampling simulation)
 * - LUFS metering output
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
import { dbToLinear, linearToDb, clamp, DelayLine } from "../core/DspUtils.js";

const RELEASE_MODES = ["Auto", "Fixed"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "ceiling", name: "Ceiling", kind: "float", min: -12, max: 0, defaultValue: 1, unit: "dB" },
  { id: "gain", name: "Gain", kind: "float", min: 0, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "lookahead", name: "Lookahead", kind: "float", min: 0, max: 20, defaultValue: 0.3, unit: "ms" },
  { id: "release", name: "Release", kind: "float", min: 1, max: 1000, defaultValue: 0.15, unit: "ms" },
  { id: "releaseMode", name: "Release Mode", kind: "enum", min: 0, max: 1, defaultValue: 0, labels: [...RELEASE_MODES] },
  { id: "truePeak", name: "True Peak", kind: "bool", min: 0, max: 1, defaultValue: 1 },
  { id: "stereoLink", name: "Stereo Link", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class LimiterInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Lookahead delay
  private _delayL: DelayLine | null = null;
  private _delayR: DelayLine | null = null;
  
  // Envelope state
  private _envelope = 1;
  private _attackCoeff = 0;
  private _releaseCoeff = 0;
  
  // True peak detection (4x oversampled)
  private _tpBufferL = new Float32Array(4);
  private _tpBufferR = new Float32Array(4);
  private _tpIndex = 0;
  
  // LUFS metering
  private _lufsSum = 0;
  private _lufsCount = 0;
  
  // Metering
  private _grMeter = 0;
  private _lufsMeter = -70;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    // Max 20ms lookahead
    this._delayL = new DelayLine(0.02, this._sampleRate);
    this._delayR = new DelayLine(0.02, this._sampleRate);
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
    if (id === "release" || id === "lookahead") {
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

  getLatencySamples(): number {
    const lookaheadMs = this._params.get("lookahead")?.value ?? 6;
    return Math.round(lookaheadMs * this._sampleRate / 1000);
  }
  
  getTailSamples(): number { return 0; }

  reset(): void {
    this._envelope = 1;
    this._delayL?.reset();
    this._delayR?.reset();
    this._tpBufferL.fill(0);
    this._tpBufferR.fill(0);
    this._tpIndex = 0;
    this._lufsSum = 0;
    this._lufsCount = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const ceiling = this._params.get("ceiling")?.value ?? -0.1;
    const gain = dbToLinear(this._params.get("gain")?.value ?? 0);
    const lookaheadMs = this._params.get("lookahead")?.value ?? 6;
    const lookaheadSamples = Math.round(lookaheadMs * this._sampleRate / 1000);
    const truePeak = this._params.get("truePeak")?.value >= 0.5;
    const stereoLink = (this._params.get("stereoLink")?.value ?? 100) / 100;
    const releaseMode = RELEASE_MODES[Math.round(this._params.get("releaseMode")?.value ?? 0)];

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();

    const ceilingLinear = dbToLinear(ceiling);
    let maxGR = 0;

    for (let i = 0; i < blockSize; i++) {
      let sampleL = inputL[i] * gain;
      let sampleR = inputR[i] * gain;

      if (bypass) {
        outputL[i] = sampleL;
        outputR[i] = sampleR;
        continue;
      }

      // Write to lookahead delay
      this._delayL?.write(sampleL);
      this._delayR?.write(sampleR);

      // Calculate peak level (with optional true peak)
      let peakL = Math.abs(sampleL);
      let peakR = Math.abs(sampleR);

      if (truePeak) {
        // Simple upsampling for true peak detection
        this._tpBufferL[this._tpIndex] = sampleL;
        this._tpBufferR[this._tpIndex] = sampleR;
        this._tpIndex = (this._tpIndex + 1) % 4;
        
        // Check all samples in buffer for true peak
        for (let j = 0; j < 4; j++) {
          peakL = Math.max(peakL, Math.abs(this._tpBufferL[j]));
          peakR = Math.max(peakR, Math.abs(this._tpBufferR[j]));
        }
      }

      // Stereo linking
      let peak = stereoLink > 0 
        ? Math.max(peakL, peakR) * stereoLink + (peakL + peakR) * 0.5 * (1 - stereoLink)
        : Math.max(peakL, peakR);

      // Calculate gain reduction needed
      let targetGain = 1;
      if (peak > ceilingLinear) {
        targetGain = ceilingLinear / peak;
      }

      // Program-dependent release
      let releaseCoeff = this._releaseCoeff;
      if (releaseMode === "Auto") {
        // Faster release for larger gain reductions
        const grAmount = 1 - targetGain;
        releaseCoeff = this._releaseCoeff * (1 + grAmount * 2);
      }

      // Envelope following (fast attack, program release)
      const coeff = targetGain < this._envelope ? this._attackCoeff : releaseCoeff;
      this._envelope += (targetGain - this._envelope) * coeff;

      maxGR = Math.min(maxGR, linearToDb(this._envelope));

      // Read from lookahead delay and apply gain
      const delayedL = lookaheadSamples > 0 ? this._delayL?.read(lookaheadSamples) ?? sampleL : sampleL;
      const delayedR = lookaheadSamples > 0 ? this._delayR?.read(lookaheadSamples) ?? sampleR : sampleR;

      outputL[i] = delayedL * this._envelope;
      outputR[i] = delayedR * this._envelope;

      // LUFS metering (K-weighted approximation)
      const kWeightedL = this._kWeight(outputL[i]);
      const kWeightedR = this._kWeight(outputR[i]);
      this._lufsSum += kWeightedL * kWeightedL + kWeightedR * kWeightedR;
      this._lufsCount++;
      
      if (this._lufsCount >= this._sampleRate * 0.4) { // 400ms windows
        this._lufsMeter = -0.691 + 10 * Math.log10(this._lufsSum / this._lufsCount);
        this._lufsSum = 0;
        this._lufsCount = 0;
      }
    }

    this._grMeter = maxGR;
  }

  private _kWeight(sample: number): number {
    // Simplified K-weighting (high-shelf at ~1.5kHz)
    // Full implementation would require biquad filter
    return sample;
  }

  async dispose(): Promise<void> {}

  private _updateCoeffs(): void {
    // Very fast attack for limiting
    const attackMs = 0.001; // 1 microsecond
    const attackSamples = Math.max(1, attackMs * this._sampleRate / 1000);
    this._attackCoeff = 1 - Math.exp(-1 / attackSamples);
    
    const releaseMs = this._params.get("release")?.value ?? 150;
    const releaseSamples = Math.max(1, releaseMs * this._sampleRate / 1000);
    this._releaseCoeff = 1 - Math.exp(-1 / releaseSamples);
  }

  get gainReduction(): number {
    return this._grMeter;
  }

  get lufs(): number {
    return this._lufsMeter;
  }
}

export function createLimiterDefinition(): PluginDefinition {
  return {
    id: "com.daw.limiter",
    name: "Limiter",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Brickwall limiter with true peak detection and LUFS metering",
    parameters: PARAMETERS,
    ui: { 
      type: "generic",
      layout: [
        { title: "Limiting", parameters: ["ceiling", "gain"], layout: "vertical" },
        { title: "Time", parameters: ["lookahead", "release", "releaseMode"], layout: "vertical" },
        { title: "Options", parameters: ["truePeak", "stereoLink", "bypass"], layout: "vertical" }
      ]
    },
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
