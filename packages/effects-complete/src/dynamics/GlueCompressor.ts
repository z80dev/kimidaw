/**
 * Glue Compressor - SSL-style bus compressor
 * 
 * Based on the classic SSL G-Series bus compressor:
 * - Soft knee compression curve
 * - Peak/RMS detection modes
 * - Adjustable attack (0.01-30ms) and release (0.1-1.5s auto)
 * - Makeup gain and dry/wet mix
 * - Soft clip toggle
 * - Range limiting
 * - Sidechain with EQ filter
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
import { BiquadFilter } from "../core/AdvancedFilters.js";
import { dbToLinear, linearToDb, clamp } from "../core/DspUtils.js";

const RATIO_VALUES = ["2:1", "4:1", "10:1"] as const;
const DETECTOR_TYPES = ["Peak", "RMS"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "threshold", name: "Threshold", kind: "float", min: -40, max: 0, defaultValue: 0.5, unit: "dB" },
  { id: "ratio", name: "Ratio", kind: "enum", min: 0, max: 2, defaultValue: 1, labels: [...RATIO_VALUES] },
  { id: "attack", name: "Attack", kind: "float", min: 0.01, max: 30, defaultValue: 0.2, unit: "ms" },
  { id: "release", name: "Release", kind: "float", min: 0.1, max: 1.5, defaultValue: 0.3, unit: "s" },
  { id: "makeup", name: "Makeup", kind: "float", min: 0, max: 40, defaultValue: 0.25, unit: "dB" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "softClip", name: "Soft Clip", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "range", name: "Range", kind: "float", min: -60, max: -5, defaultValue: 0.9, unit: "dB" },
  { id: "detector", name: "Detector", kind: "enum", min: 0, max: 1, defaultValue: 1, labels: [...DETECTOR_TYPES] },
  
  // Sidechain EQ
  { id: "scEnabled", name: "SC EQ", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "scFreq", name: "SC Freq", kind: "float", min: 100, max: 10000, defaultValue: 0.3, unit: "Hz" },
  { id: "scGain", name: "SC Gain", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class GlueCompressorInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Envelope state
  private _envelopeL = 0;
  private _envelopeR = 0;
  private _attackCoeff = 0;
  private _releaseCoeff = 0;
  
  // RMS detection
  private _rmsWindow: Float32Array = new Float32Array(48);
  private _rmsIndex = 0;
  private _rmsSumL = 0;
  private _rmsSumR = 0;
  
  // Sidechain filter
  private _sidechainFilterL = new BiquadFilter();
  private _sidechainFilterR = new BiquadFilter();
  
  // Metering
  private _grMeter = 0;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._sidechainFilterL.setSampleRate(this._sampleRate);
    this._sidechainFilterR.setSampleRate(this._sampleRate);
    this._sidechainFilterL.setType("peak");
    this._sidechainFilterR.setType("peak");
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
    if (id === "attack" || id === "release" || id === "scFreq" || id === "scGain") {
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
    this._rmsIndex = 0;
    this._rmsWindow.fill(0);
    this._sidechainFilterL.reset();
    this._sidechainFilterR.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const threshold = this._params.get("threshold")?.value ?? -20;
    const ratioIndex = Math.round(this._params.get("ratio")?.value ?? 0);
    const ratio = [2, 4, 10][ratioIndex] ?? 4;
    const makeup = dbToLinear(this._params.get("makeup")?.value ?? 0);
    const dryWet = (this._params.get("dryWet")?.value ?? 100) / 100;
    const softClip = this._params.get("softClip")?.value >= 0.5;
    const range = this._params.get("range")?.value ?? -60;
    const rmsMode = this._params.get("detector")?.value === 1;
    const scEnabled = this._params.get("scEnabled")?.value >= 0.5;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    // Sidechain input (use main input if no sidechain)
    const scInputL = inputs[1]?.getChannelData(0) ?? inputL;
    const scInputR = inputs[1]?.numberOfChannels > 1 
      ? inputs[1].getChannelData(1) 
      : scInputL;

    this._params.processSmoothing();

    let maxGR = 0;

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      // Get sidechain input (possibly filtered)
      let scL = scInputL[i];
      let scR = scInputR[i];
      
      if (scEnabled) {
        scL = this._sidechainFilterL.process(scL);
        scR = this._sidechainFilterR.process(scR);
      }

      // Level detection
      let levelL: number;
      let levelR: number;

      if (rmsMode) {
        this._rmsSumL -= this._rmsWindow[this._rmsIndex];
        this._rmsSumR -= this._rmsWindow[this._rmsIndex];
        this._rmsSumL += scL * scL;
        this._rmsSumR += scR * scR;
        this._rmsWindow[this._rmsIndex] = (scL * scL + scR * scR) * 0.5;
        this._rmsIndex = (this._rmsIndex + 1) % this._rmsWindow.length;
        
        levelL = Math.sqrt(this._rmsSumL / this._rmsWindow.length);
        levelR = Math.sqrt(this._rmsSumR / this._rmsWindow.length);
      } else {
        levelL = Math.abs(scL);
        levelR = Math.abs(scR);
      }

      const level = Math.max(levelL, levelR);
      const levelDb = level > 0.00001 ? 20 * Math.log10(level) : -100;

      // SSL-style soft knee compression
      let gainReduction = 0;
      const overshoot = levelDb - threshold;

      if (overshoot <= -3) {
        gainReduction = 0;
      } else if (overshoot < 3) {
        // Soft knee region (6dB wide)
        const t = (overshoot + 3) / 6;
        gainReduction = overshoot * (1 - 1 / ratio) * t * t * (3 - 2 * t);
      } else {
        gainReduction = overshoot * (1 - 1 / ratio);
      }

      // Apply range limit
      gainReduction = Math.max(gainReduction, range);

      // Envelope following (smooth transitions)
      const targetGain = dbToLinear(-gainReduction);
      const coeff = targetGain < this._envelopeL ? this._attackCoeff : this._releaseCoeff;
      this._envelopeL += (targetGain - this._envelopeL) * coeff;
      this._envelopeR = this._envelopeL;

      maxGR = Math.min(maxGR, gainReduction);

      if (bypass) {
        outputL[i] = dryL;
        outputR[i] = dryR;
      } else {
        // Apply compression
        let wetL = dryL * this._envelopeL * makeup;
        let wetR = dryR * this._envelopeL * makeup;

        // Soft clip if enabled
        if (softClip) {
          wetL = Math.tanh(wetL);
          wetR = Math.tanh(wetR);
        }

        // Dry/wet mix
        outputL[i] = dryL * (1 - dryWet) + wetL * dryWet;
        outputR[i] = dryR * (1 - dryWet) + wetR * dryWet;
      }
    }

    this._grMeter = maxGR;
  }

  async dispose(): Promise<void> {}

  private _updateCoeffs(): void {
    const attackMs = this._params.get("attack")?.value ?? 10;
    const releaseS = this._params.get("release")?.value ?? 0.3;
    
    // Attack coefficient (exponential)
    const attackSamples = Math.max(1, attackMs * this._sampleRate / 1000);
    this._attackCoeff = 1 - Math.exp(-1 / attackSamples);
    
    // Release coefficient
    const releaseSamples = releaseS * this._sampleRate;
    this._releaseCoeff = 1 - Math.exp(-1 / releaseSamples);

    // Update sidechain filter
    const scFreq = this._params.get("scFreq")?.value ?? 1000;
    const scGain = this._params.get("scGain")?.value ?? 0;
    this._sidechainFilterL.setFrequency(scFreq);
    this._sidechainFilterL.setGain(scGain);
    this._sidechainFilterL.setQ(0.707);
    this._sidechainFilterR.setFrequency(scFreq);
    this._sidechainFilterR.setGain(scGain);
    this._sidechainFilterR.setQ(0.707);
  }

  get gainReduction(): number {
    return this._grMeter;
  }
}

export function createGlueCompressorDefinition(): PluginDefinition {
  return {
    id: "com.daw.glue-compressor",
    name: "Glue Compressor",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "SSL-style bus compressor for gluing mixes together",
    parameters: PARAMETERS,
    ui: { 
      type: "generic",
      layout: [
        { title: "Compression", parameters: ["threshold", "ratio", "attack", "release"], layout: "vertical" },
        { title: "Character", parameters: ["detector", "range", "softClip"], layout: "vertical" },
        { title: "Sidechain", parameters: ["scEnabled", "scFreq", "scGain"], layout: "vertical" },
        { title: "Output", parameters: ["makeup", "dryWet", "bypass"], layout: "vertical" }
      ]
    },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    hasSidechain: true,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const comp = new GlueCompressorInstance();
      comp.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return comp;
    },
  };
}
