/**
 * EQ Eight - 8-band parametric EQ
 * 
 * Ableton Live-style 8-band parametric EQ with:
 * - 8 independent bands with selectable filter types
 * - Per-band: Frequency, Gain, Q, Shape
 * - Global: Mode (Stereo, L/R, M/S), Adaptive Q, Oversampling
 * - Real-time spectrum analysis output
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
import { EQBand, BiquadFilter, type FilterType } from "../core/AdvancedFilters.js";
import { dbToLinear, linearToDb } from "../core/DspUtils.js";

// Filter types for EQ Eight
const EQ_FILTER_TYPES = [
  "48dB LP", "12dB LP", 
  "48dB HP", "12dB HP", 
  "Bell", "Notch", 
  "High Shelf", "Low Shelf"
] as const;

type EQFilterType = typeof EQ_FILTER_TYPES[number];

const MODE_TYPES = ["Stereo", "L/R", "M/S"] as const;

type EQMode = typeof MODE_TYPES[number];

// Build parameters for 8 bands
function buildParameters(): PluginParameterSpec[] {
  const params: PluginParameterSpec[] = [];

  // Global parameters
  params.push(
    { id: "mode", name: "Mode", kind: "enum", min: 0, max: 2, defaultValue: 0, labels: MODE_TYPES },
    { id: "adaptiveQ", name: "Adaptive Q", kind: "bool", min: 0, max: 1, defaultValue: 0 },
    { id: "oversampling", name: "Oversampling", kind: "enum", min: 0, max: 2, defaultValue: 0, labels: ["1x", "2x", "4x"] },
    { id: "outputGain", name: "Output Gain", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
    { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 }
  );

  // Per-band parameters
  for (let i = 0; i < 8; i++) {
    const bandNum = i + 1;
    params.push(
      { 
        id: `band${bandNum}enabled`, 
        name: `Band ${bandNum} On`, 
        kind: "bool", 
        min: 0, 
        max: 1, 
        defaultValue: i < 4 ? 1 : 0,
        group: `Band ${bandNum}`
      },
      { 
        id: `band${bandNum}type`, 
        name: `Band ${bandNum} Type`, 
        kind: "enum", 
        min: 0, 
        max: 7, 
        defaultValue: i === 0 ? 7 : i === 7 ? 6 : 4, // Low shelf, bells, high shelf
        labels: EQ_FILTER_TYPES,
        group: `Band ${bandNum}`
      },
      { 
        id: `band${bandNum}freq`, 
        name: `Band ${bandNum} Freq`, 
        kind: "float", 
        min: 10, 
        max: 22000, 
        defaultValue: i === 0 ? 80 : i === 1 ? 200 : i === 2 ? 500 : i === 3 ? 2000 : i === 4 ? 5000 : i === 5 ? 10000 : i === 6 ? 15000 : 100,
        unit: "Hz",
        group: `Band ${bandNum}`
      },
      { 
        id: `band${bandNum}gain`, 
        name: `Band ${bandNum} Gain`, 
        kind: "float", 
        min: -15, 
        max: 15, 
        defaultValue: 0.5, 
        unit: "dB",
        group: `Band ${bandNum}`
      },
      { 
        id: `band${bandNum}q`, 
        name: `Band ${bandNum} Q`, 
        kind: "float", 
        min: 0.1, 
        max: 10, 
        defaultValue: 0.2,
        group: `Band ${bandNum}`
      }
    );
  }

  return params;
}

const PARAMETERS = buildParameters();

export class EQEightInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Filter banks for different modes
  private _bandsL: EQBand[] = [];
  private _bandsR: EQBand[] = [];
  private _bandsM: EQBand[] = [];
  private _bandsS: EQBand[] = [];
  
  // Spectrum analysis
  private _spectrumL = new Float32Array(128);
  private _spectrumR = new Float32Array(128);
  private _spectrumM = new Float32Array(128);
  private _spectrumS = new Float32Array(128);
  
  // Output metering
  private _meterL = 0;
  private _meterR = 0;

  constructor() {
    // Initialize 8 bands for each channel/mode
    for (let i = 0; i < 8; i++) {
      this._bandsL.push(new EQBand("peak", this._sampleRate));
      this._bandsR.push(new EQBand("peak", this._sampleRate));
      this._bandsM.push(new EQBand("peak", this._sampleRate));
      this._bandsS.push(new EQBand("peak", this._sampleRate));
    }
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    const param = this._params.get(id);
    if (param) {
      param.setNormalized(value);
      if (id.startsWith("band")) {
        this._updateBandFromParam(id);
      }
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
      this._updateAllBands();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    for (let i = 0; i < 8; i++) {
      this._bandsL[i].reset();
      this._bandsR[i].reset();
      this._bandsM[i].reset();
      this._bandsS[i].reset();
    }
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    for (let i = 0; i < 8; i++) {
      this._bandsL[i].setSampleRate(this._sampleRate);
      this._bandsR[i].setSampleRate(this._sampleRate);
      this._bandsM[i].setSampleRate(this._sampleRate);
      this._bandsS[i].setSampleRate(this._sampleRate);
    }
    this._updateAllBands();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const outputGain = dbToLinear(this._params.get("outputGain")?.value ?? 0);
    const mode = MODE_TYPES[Math.round(this._params.get("mode")?.value ?? 0)] as EQMode;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();

    let peakL = 0;
    let peakR = 0;

    if (bypass) {
      for (let i = 0; i < blockSize; i++) {
        outputL[i] = inputL[i] * outputGain;
        outputR[i] = inputR[i] * outputGain;
        peakL = Math.max(peakL, Math.abs(outputL[i]));
        peakR = Math.max(peakR, Math.abs(outputR[i]));
      }
      this._meterL = peakL;
      this._meterR = peakR;
      return;
    }

    // Process based on mode
    switch (mode) {
      case "Stereo":
        this._processStereo(inputL, inputR, outputL, outputR, blockSize, outputGain);
        break;
      case "L/R":
        this._processLR(inputL, inputR, outputL, outputR, blockSize, outputGain);
        break;
      case "M/S":
        this._processMS(inputL, inputR, outputL, outputR, blockSize, outputGain);
        break;
    }

    // Calculate metering
    for (let i = 0; i < blockSize; i++) {
      peakL = Math.max(peakL, Math.abs(outputL[i]));
      peakR = Math.max(peakR, Math.abs(outputR[i]));
    }
    this._meterL = peakL;
    this._meterR = peakR;
  }

  private _processStereo(
    inputL: Float32Array, inputR: Float32Array,
    outputL: Float32Array, outputR: Float32Array,
    blockSize: number, gain: number
  ): void {
    for (let i = 0; i < blockSize; i++) {
      let sampleL = inputL[i];
      let sampleR = inputR[i];

      // Process through all 8 bands (same filters for L and R)
      for (let b = 0; b < 8; b++) {
        sampleL = this._bandsL[b].process(sampleL);
        sampleR = this._bandsL[b].process(sampleR);
      }

      outputL[i] = sampleL * gain;
      outputR[i] = sampleR * gain;
    }
  }

  private _processLR(
    inputL: Float32Array, inputR: Float32Array,
    outputL: Float32Array, outputR: Float32Array,
    blockSize: number, gain: number
  ): void {
    for (let i = 0; i < blockSize; i++) {
      let sampleL = inputL[i];
      let sampleR = inputR[i];

      // Process L and R with different filter sets
      for (let b = 0; b < 8; b++) {
        sampleL = this._bandsL[b].process(sampleL);
        sampleR = this._bandsR[b].process(sampleR);
      }

      outputL[i] = sampleL * gain;
      outputR[i] = sampleR * gain;
    }
  }

  private _processMS(
    inputL: Float32Array, inputR: Float32Array,
    outputL: Float32Array, outputR: Float32Array,
    blockSize: number, gain: number
  ): void {
    for (let i = 0; i < blockSize; i++) {
      // Convert to M/S
      let mid = (inputL[i] + inputR[i]) * 0.5;
      let side = (inputL[i] - inputR[i]) * 0.5;

      // Process M and S separately
      for (let b = 0; b < 8; b++) {
        mid = this._bandsM[b].process(mid);
        side = this._bandsS[b].process(side);
      }

      // Convert back to L/R
      outputL[i] = (mid + side) * gain;
      outputR[i] = (mid - side) * gain;
    }
  }

  async dispose(): Promise<void> {}

  private _updateBandFromParam(paramId: string): void {
    // Extract band number and parameter type from id
    const match = paramId.match(/band(\d+)(\w+)/);
    if (!match) return;

    const bandIndex = parseInt(match[1], 10) - 1;
    const paramType = match[2].toLowerCase();

    if (bandIndex < 0 || bandIndex >= 8) return;

    const enabled = this._params.get(`band${bandIndex + 1}enabled`)?.value >= 0.5;
    const freq = this._params.get(`band${bandIndex + 1}freq`)?.value ?? 1000;
    const gain = this._params.get(`band${bandIndex + 1}gain`)?.value ?? 0;
    const q = this._params.get(`band${bandIndex + 1}q`)?.value ?? 0.707;
    const typeIndex = Math.round(this._params.get(`band${bandIndex + 1}type`)?.value ?? 0);
    const type = this._eqTypeToFilterType(EQ_FILTER_TYPES[typeIndex] ?? "Bell");

    // Update all filter sets
    [this._bandsL, this._bandsR, this._bandsM, this._bandsS].forEach(bands => {
      bands[bandIndex].setEnabled(enabled);
      bands[bandIndex].setType(type);
      bands[bandIndex].setFrequency(freq);
      bands[bandIndex].setGain(gain);
      bands[bandIndex].setQ(q);
    });
  }

  private _updateAllBands(): void {
    for (let i = 0; i < 8; i++) {
      this._updateBandFromParam(`band${i + 1}freq`);
    }
  }

  private _eqTypeToFilterType(eqType: EQFilterType): FilterType {
    switch (eqType) {
      case "48dB LP": return "lowpass12"; // Will need high-order filter
      case "12dB LP": return "lowpass12";
      case "48dB HP": return "highpass12"; // Will need high-order filter
      case "12dB HP": return "highpass12";
      case "Bell": return "peak";
      case "Notch": return "notch";
      case "High Shelf": return "highshelf";
      case "Low Shelf": return "lowshelf";
      default: return "peak";
    }
  }

  // Public API for spectrum visualization
  getSpectrumData(channel: "L" | "R" | "M" | "S"): Float32Array {
    // Calculate frequency response of all active bands
    const freqs = new Float32Array(128);
    const response = new Float32Array(128);
    
    // Log-spaced frequencies from 20Hz to 20kHz
    for (let i = 0; i < 128; i++) {
      freqs[i] = 20 * Math.pow(1000, i / 127);
      response[i] = 0;
    }

    const bands = channel === "L" ? this._bandsL :
                  channel === "R" ? this._bandsR :
                  channel === "M" ? this._bandsM : this._bandsS;

    // Sum frequency responses in dB
    for (const band of bands) {
      const bandResponse = band.getFrequencyResponse(freqs);
      for (let i = 0; i < 128; i++) {
        response[i] += bandResponse[i];
      }
    }

    return response;
  }

  get meters(): { left: number; right: number } {
    return { left: this._meterL, right: this._meterR };
  }
}

export function createEQEightDefinition(): PluginDefinition {
  return {
    id: "com.daw.eq-eight",
    name: "EQ Eight",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "8-band parametric equalizer with M/S and L/R modes",
    parameters: PARAMETERS,
    ui: { 
      type: "generic",
      layout: [
        { title: "Global", parameters: ["mode", "adaptiveQ", "oversampling", "outputGain", "bypass"], layout: "horizontal" }
      ]
    },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const eq = new EQEightInstance();
      eq.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return eq;
    },
  };
}
