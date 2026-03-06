/**
 * Cabinet - Guitar cabinet emulation
 * 
 * Speaker cabinet simulation with:
 * - Mic types: Dynamic, Condenser, Ribbon
 * - Cabinet models (1x12, 2x12, 4x12, etc.)
 * - Microphone position control
 * - Dry/Wet mix
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
import { BiquadFilter, StateVariableFilter } from "../core/AdvancedFilters.js";
import { DelayLine, dbToLinear, clamp, lerp } from "../core/DspUtils.js";

const MIC_TYPES = ["Dynamic 57", "Dynamic 421", "Condenser 414", "Ribbon 121"] as const;
const CABINET_TYPES = [
  "1x12 Vintage", 
  "2x12 Modern", 
  "4x12 Classic", 
  "4x12 Metal",
  "1x15 Bass",
  "2x10 Bass",
  "4x10 Bass",
  "Acoustic"
] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "micType", name: "Mic Type", kind: "enum", min: 0, max: 3, defaultValue: 0, labels: [...MIC_TYPES] },
  { id: "cabinet", name: "Cabinet", kind: "enum", min: 0, max: 7, defaultValue: 2, labels: [...CABINET_TYPES] },
  { id: "distance", name: "Distance", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  { id: "angle", name: "Angle", kind: "float", min: -45, max: 45, defaultValue: 0.5, unit: "°" },
  { id: "position", name: "Position", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "lowCut", name: "Low Cut", kind: "float", min: 20, max: 500, defaultValue: 0, unit: "Hz" },
  { id: "highCut", name: "High Cut", kind: "float", min: 1000, max: 20000, defaultValue: 1, unit: "Hz" },
  { id: "output", name: "Output", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

interface CabinetIR {
  size: number;
  lowFreq: number;
  highFreq: number;
  resonance: number;
  dispersion: number;
}

interface MicResponse {
  presence: number;
  airBoost: number;
  proximity: number;
  pattern: "cardioid" | "figure8" | "omni";
}

export class CabinetInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Cabinet simulation filters
  private _lowCut = new BiquadFilter();
  private _highCut = new BiquadFilter();
  private _presenceFilter = new BiquadFilter();
  private _coneFilterL = new StateVariableFilter();
  private _coneFilterR = new StateVariableFilter();
  
  // Room simulation (very short delays)
  private _roomDelayL = new DelayLine(0.05, 48000);
  private _roomDelayR = new DelayLine(0.05, 48000);

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    
    this._lowCut.setSampleRate(this._sampleRate);
    this._highCut.setSampleRate(this._sampleRate);
    this._presenceFilter.setSampleRate(this._sampleRate);
    this._coneFilterL.setSampleRate(this._sampleRate);
    this._coneFilterR.setSampleRate(this._sampleRate);
    
    this._roomDelayL = new DelayLine(0.05, this._sampleRate);
    this._roomDelayR = new DelayLine(0.05, this._sampleRate);
    
    this._updateFilters();
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "micType" || id === "cabinet" || id === "lowCut" || id === "highCut") {
      this._updateFilters();
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
      this._updateFilters();
    }
  }

  getLatencySamples(): number { 
    // Room delay adds small latency
    return Math.round(0.001 * this._sampleRate);
  }
  getTailSamples(): number { return 0; }

  reset(): void {
    this._lowCut.reset();
    this._highCut.reset();
    this._presenceFilter.reset();
    this._coneFilterL.reset();
    this._coneFilterR.reset();
    this._roomDelayL.reset();
    this._roomDelayR.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const distance = (this._params.get("distance")?.value ?? 30) / 100;
    const angle = (this._params.get("angle")?.value ?? 0) / 45; // -1 to 1
    const position = (this._params.get("position")?.value ?? 50) / 100;
    const output = dbToLinear(this._params.get("output")?.value ?? 0);
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

    // Calculate room delay based on distance
    const roomDelayMs = 1 + distance * 20;
    const roomDelaySamples = roomDelayMs * this._sampleRate / 1000;
    
    // Calculate position offset
    const posOffset = (position - 0.5) * 2; // -1 to 1

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL * output;
        outputR[i] = dryR * output;
        continue;
      }

      // Process cabinet/mic simulation
      let wetL = dryL;
      let wetR = dryR;

      // Low cut (bass rolloff at distance)
      if (distance > 0) {
        const bassCut = 20 + distance * 100;
        wetL = this._applyLowCut(wetL, bassCut);
        wetR = this._applyLowCut(wetR, bassCut);
      }

      // Cabinet/speaker modeling
      wetL = this._coneFilterL.process(wetL);
      wetR = this._coneFilterR.process(wetR);

      // Presence filter (mic characteristic)
      wetL = this._presenceFilter.process(wetL);
      wetR = this._presenceFilter.process(wetR);

      // High cut (air absorption at distance)
      wetL = this._highCut.process(wetL);
      wetR = this._highCut.process(wetR);

      // Room reflections (delay based on distance and angle)
      const delayL = roomDelaySamples * (1 + angle * 0.1 + posOffset * 0.05);
      const delayR = roomDelaySamples * (1 - angle * 0.1 - posOffset * 0.05);
      
      this._roomDelayL.write(wetL * 0.3);
      this._roomDelayR.write(wetR * 0.3);
      
      const roomL = this._roomDelayL.read(delayL);
      const roomR = this._roomDelayR.read(delayR);
      
      // Distance attenuation
      const distAtten = 1 / (1 + distance * 0.5);
      wetL = (wetL + roomL) * distAtten;
      wetR = (wetR + roomR) * distAtten;

      // Angle/position effect (level difference)
      const angleAttenL = 1 - angle * 0.2;
      const angleAttenR = 1 + angle * 0.2;
      wetL *= angleAttenL;
      wetR *= angleAttenR;

      outputL[i] = (dryL * (1 - dryWet) + wetL * dryWet) * output;
      outputR[i] = (dryR * (1 - dryWet) + wetR * dryWet) * output;
    }
  }

  private _applyLowCut(input: number, freq: number): number {
    // Simple highpass approximation
    const w = 2 * Math.PI * freq / this._sampleRate;
    const rc = 1 / w;
    const dt = 1 / this._sampleRate;
    const alpha = rc / (rc + dt);
    // This is a simplified version; using the biquad would be better
    return input * alpha;
  }

  private _updateFilters(): void {
    const micType = MIC_TYPES[Math.round(this._params.get("micType")?.value ?? 0)];
    const cabinet = CABINET_TYPES[Math.round(this._params.get("cabinet")?.value ?? 2)];
    const lowCutFreq = this._params.get("lowCut")?.value ?? 20;
    const highCutFreq = this._params.get("highCut")?.value ?? 20000;

    // Configure mic response
    const micResponses: Record<string, MicResponse> = {
      "Dynamic 57": { presence: 5, airBoost: 0, proximity: 0.3, pattern: "cardioid" },
      "Dynamic 421": { presence: 3, airBoost: 2, proximity: 0.4, pattern: "cardioid" },
      "Condenser 414": { presence: 2, airBoost: 4, proximity: 0.2, pattern: "cardioid" },
      "Ribbon 121": { presence: -2, airBoost: -1, proximity: 0.5, pattern: "figure8" },
    };
    
    const mic = micResponses[micType];

    // Configure cabinet
    const cabinetConfigs: Record<string, CabinetIR> = {
      "1x12 Vintage": { size: 1, lowFreq: 80, highFreq: 5000, resonance: 3, dispersion: 0.5 },
      "2x12 Modern": { size: 2, lowFreq: 70, highFreq: 6000, resonance: 2.5, dispersion: 0.4 },
      "4x12 Classic": { size: 4, lowFreq: 60, highFreq: 5500, resonance: 4, dispersion: 0.3 },
      "4x12 Metal": { size: 4, lowFreq: 50, highFreq: 7000, resonance: 5, dispersion: 0.2 },
      "1x15 Bass": { size: 1, lowFreq: 40, highFreq: 3000, resonance: 2, dispersion: 0.6 },
      "2x10 Bass": { size: 2, lowFreq: 45, highFreq: 4000, resonance: 2.5, dispersion: 0.5 },
      "4x10 Bass": { size: 4, lowFreq: 40, highFreq: 5000, resonance: 3, dispersion: 0.4 },
      "Acoustic": { size: 1, lowFreq: 60, highFreq: 12000, resonance: 1.5, dispersion: 0.7 },
    };
    
    const cab = cabinetConfigs[cabinet];

    // Set filters
    this._lowCut.setType("highpass12");
    this._lowCut.setFrequency(lowCutFreq);
    this._lowCut.setQ(0.707);

    this._highCut.setType("lowpass12");
    this._highCut.setFrequency(highCutFreq);
    this._highCut.setQ(0.707);

    // Presence filter (peaking at 2-5kHz)
    this._presenceFilter.setType("peak");
    this._presenceFilter.setFrequency(3000 + mic.presence * 200);
    this._presenceFilter.setGain(mic.presence);
    this._presenceFilter.setQ(1);

    // Cone breakup filter (simulates speaker cone resonance)
    const coneFreq = cab.highFreq * (0.5 + mic.proximity * 0.3);
    this._coneFilterL.setType("bandpass");
    this._coneFilterL.setFrequency(coneFreq);
    this._coneFilterL.setQ(cab.resonance);
    this._coneFilterR.setType("bandpass");
    this._coneFilterR.setFrequency(coneFreq);
    this._coneFilterR.setQ(cab.resonance);
  }

  async dispose(): Promise<void> {}
}

export function createCabinetDefinition(): PluginDefinition {
  return {
    id: "com.daw.cabinet",
    name: "Cabinet",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Guitar cabinet and microphone emulation",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const cab = new CabinetInstance();
      cab.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return cab;
    },
  };
}
