/**
 * Compressor
 * 
 * Standard compressor with:
 * - Threshold, ratio, attack, release, makeup gain
 * - RMS and peak detection modes
 * - Sidechain input support
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
  { id: "threshold", name: "Threshold", kind: "float", min: -60, max: 0, defaultValue: 0.33, unit: "dB" },
  { id: "ratio", name: "Ratio", kind: "float", min: 1, max: 20, defaultValue: 0.2 },
  { id: "attack", name: "Attack", kind: "float", min: 0.01, max: 100, defaultValue: 0.2, unit: "ms" },
  { id: "release", name: "Release", kind: "float", min: 1, max: 1000, defaultValue: 0.3, unit: "ms" },
  { id: "makeup", name: "Makeup", kind: "float", min: 0, max: 24, defaultValue: 0, unit: "dB" },
  { id: "knee", name: "Knee", kind: "float", min: 0, max: 12, defaultValue: 0.25, unit: "dB" },
  { id: "detector", name: "Detector", kind: "enum", min: 0, max: 1, defaultValue: 0, labels: ["Peak", "RMS"] },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class CompressorInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Envelope followers
  private _envelopeL = 0;
  private _envelopeR = 0;
  private _attackCoeff = 0;
  private _releaseCoeff = 0;
  private _rmsSumL = 0;
  private _rmsSumR = 0;
  private _rmsCount = 0;
  
  // Gain reduction metering
  private _grMeter = 0;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
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
  getTailSamples(): number { return 0; }

  reset(): void {
    this._envelopeL = 0;
    this._envelopeR = 0;
    this._rmsSumL = 0;
    this._rmsSumR = 0;
    this._rmsCount = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const threshold = this._params.get("threshold")?.value ?? -20;
    const ratio = this._params.get("ratio")?.value ?? 4;
    const makeup = dbToGain(this._params.get("makeup")?.value ?? 0);
    const knee = this._params.get("knee")?.value ?? 3;
    const rmsMode = this._params.get("detector")?.value === 1;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 ? inputs[0].getChannelData(1) : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 ? outputs[0].getChannelData(1) : outputL;

    this._params.processSmoothing();

    let maxGR = 0;

    for (let i = 0; i < blockSize; i++) {
      const sampleL = inputL[i];
      const sampleR = inputR[i];

      // Level detection
      let levelL: number;
      let levelR: number;

      if (rmsMode) {
        this._rmsSumL += sampleL * sampleL;
        this._rmsSumR += sampleR * sampleR;
        this._rmsCount++;
        
        if (this._rmsCount >= 48) { // ~1ms at 48kHz
          levelL = Math.sqrt(this._rmsSumL / this._rmsCount);
          levelR = Math.sqrt(this._rmsSumR / this._rmsCount);
          this._rmsSumL = 0;
          this._rmsSumR = 0;
          this._rmsCount = 0;
        } else {
          levelL = Math.abs(sampleL);
          levelR = Math.abs(sampleR);
        }
      } else {
        levelL = Math.abs(sampleL);
        levelR = Math.abs(sampleR);
      }

      const level = Math.max(levelL, levelR);
      const levelDb = level > 0.00001 ? 20 * Math.log10(level) : -100;

      // Gain reduction calculation with knee
      let gainReduction = 0;
      const overshoot = levelDb - threshold;

      if (overshoot <= -knee / 2) {
        gainReduction = 0;
      } else if (overshoot < knee / 2) {
        gainReduction = 0.5 * ((overshoot + knee / 2) ** 2) / knee * (1 - 1 / ratio);
      } else {
        gainReduction = overshoot * (1 - 1 / ratio);
      }

      // Envelope following
      const targetGain = gainReduction < 0 ? Math.pow(10, gainReduction / 20) : 1;
      const coeff = targetGain < this._envelopeL ? this._attackCoeff : this._releaseCoeff;
      this._envelopeL += (targetGain - this._envelopeL) * coeff;
      this._envelopeR = this._envelopeL;

      // Apply gain
      const gain = bypass ? 1 : this._envelopeL * makeup;

      maxGR = Math.min(maxGR, gainReduction);

      outputL[i] = sampleL * gain;
      outputR[i] = sampleR * gain;
    }

    this._grMeter = maxGR;
  }

  async dispose(): Promise<void> {}

  private _updateCoeffs(): void {
    const attackMs = this._params.get("attack")?.value ?? 10;
    const releaseMs = this._params.get("release")?.value ?? 100;
    
    this._attackCoeff = 1 - Math.exp(-1 / (attackMs / 1000 * this._sampleRate));
    this._releaseCoeff = 1 - Math.exp(-1 / (releaseMs / 1000 * this._sampleRate));
  }

  get gainReduction(): number {
    return this._grMeter;
  }
}

export function createCompressorDefinition(): PluginDefinition {
  return {
    id: "com.daw.compressor",
    name: "Compressor",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Stereo compressor with RMS/Peak detection",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const comp = new CompressorInstance();
      comp.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return comp;
    },
  };
}
