/**
 * Multiband Dynamics - 3-band compressor/expander
 * 
 * Three-band dynamics processor with:
 * - Adjustable crossover frequencies
 * - Per-band: Upward/downward comp/exp, threshold, ratio, attack, release
 * - Peak/RMS detection and lookahead
 * - Master output: Input gain, output gain, dry/wet
 * - Solo bands for monitoring
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
import { LinkwitzRileyCrossover } from "../core/AdvancedFilters.js";
import { dbToLinear, linearToDb, clamp, DelayLine } from "../core/DspUtils.js";

const DYNAMICS_TYPES = ["Comp Down", "Comp Up", "Exp Down", "Exp Up"] as const;
const TIME_MODES = ["Peak", "RMS"] as const;

interface BandDynamics {
  enabled: boolean;
  type: typeof DYNAMICS_TYPES[number];
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  gain: number;
  attackCoeff: number;
  releaseCoeff: number;
  envelope: number;
  rmsSum: number;
  rmsIndex: number;
  rmsWindow: Float32Array;
}

const PARAMETERS: PluginParameterSpec[] = [
  // Crossover frequencies
  { id: "crossoverLow", name: "Low/Mid X-Over", kind: "float", min: 50, max: 1000, defaultValue: 0.2, unit: "Hz" },
  { id: "crossoverHigh", name: "Mid/High X-Over", kind: "float", min: 1000, max: 16000, defaultValue: 0.5, unit: "Hz" },
  
  // Time controls
  { id: "timeMode", name: "Time Mode", kind: "enum", min: 0, max: 1, defaultValue: 0, labels: [...TIME_MODES] },
  { id: "lookahead", name: "Lookahead", kind: "float", min: 0, max: 10, defaultValue: 0, unit: "ms" },
  
  // Low band
  { id: "lowEnabled", name: "Low On", kind: "bool", min: 0, max: 1, defaultValue: 1 },
  { id: "lowType", name: "Low Type", kind: "enum", min: 0, max: 3, defaultValue: 0, labels: [...DYNAMICS_TYPES] },
  { id: "lowThreshold", name: "Low Threshold", kind: "float", min: -60, max: 0, defaultValue: 0.33, unit: "dB" },
  { id: "lowRatio", name: "Low Ratio", kind: "float", min: 1, max: 20, defaultValue: 0.2 },
  { id: "lowAttack", name: "Low Attack", kind: "float", min: 0.01, max: 100, defaultValue: 0.2, unit: "ms" },
  { id: "lowRelease", name: "Low Release", kind: "float", min: 1, max: 1000, defaultValue: 0.3, unit: "ms" },
  { id: "lowGain", name: "Low Gain", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "lowSolo", name: "Low Solo", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  
  // Mid band
  { id: "midEnabled", name: "Mid On", kind: "bool", min: 0, max: 1, defaultValue: 1 },
  { id: "midType", name: "Mid Type", kind: "enum", min: 0, max: 3, defaultValue: 0, labels: [...DYNAMICS_TYPES] },
  { id: "midThreshold", name: "Mid Threshold", kind: "float", min: -60, max: 0, defaultValue: 0.33, unit: "dB" },
  { id: "midRatio", name: "Mid Ratio", kind: "float", min: 1, max: 20, defaultValue: 0.2 },
  { id: "midAttack", name: "Mid Attack", kind: "float", min: 0.01, max: 100, defaultValue: 0.2, unit: "ms" },
  { id: "midRelease", name: "Mid Release", kind: "float", min: 1, max: 1000, defaultValue: 0.3, unit: "ms" },
  { id: "midGain", name: "Mid Gain", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "midSolo", name: "Mid Solo", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  
  // High band
  { id: "highEnabled", name: "High On", kind: "bool", min: 0, max: 1, defaultValue: 1 },
  { id: "highType", name: "High Type", kind: "enum", min: 0, max: 3, defaultValue: 0, labels: [...DYNAMICS_TYPES] },
  { id: "highThreshold", name: "High Threshold", kind: "float", min: -60, max: 0, defaultValue: 0.33, unit: "dB" },
  { id: "highRatio", name: "High Ratio", kind: "float", min: 1, max: 20, defaultValue: 0.2 },
  { id: "highAttack", name: "High Attack", kind: "float", min: 0.01, max: 100, defaultValue: 0.2, unit: "ms" },
  { id: "highRelease", name: "High Release", kind: "float", min: 1, max: 1000, defaultValue: 0.3, unit: "ms" },
  { id: "highGain", name: "High Gain", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "highSolo", name: "High Solo", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  
  // Master
  { id: "inputGain", name: "Input Gain", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "outputGain", name: "Output Gain", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class MultibandDynamicsInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Crossovers
  private _crossoverLow = new LinkwitzRileyCrossover();
  private _crossoverHigh = new LinkwitzRileyCrossover();
  
  // Lookahead delay
  private _lookaheadDelayL: DelayLine | null = null;
  private _lookaheadDelayR: DelayLine | null = null;
  
  // Band dynamics state
  private _lowBand: BandDynamics;
  private _midBand: BandDynamics;
  private _highBand: BandDynamics;
  
  // Metering
  private _grMeters = { low: 0, mid: 0, high: 0 };

  constructor() {
    // Initialize band dynamics
    this._lowBand = this._createBand();
    this._midBand = this._createBand();
    this._highBand = this._createBand();
  }

  private _createBand(): BandDynamics {
    return {
      enabled: true,
      type: "Comp Down",
      threshold: -20,
      ratio: 2,
      attack: 10,
      release: 100,
      gain: 0,
      attackCoeff: 0,
      releaseCoeff: 0,
      envelope: 1,
      rmsSum: 0,
      rmsIndex: 0,
      rmsWindow: new Float32Array(48),
    };
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._crossoverLow.setSampleRate(this._sampleRate);
    this._crossoverHigh.setSampleRate(this._sampleRate);
    
    // Lookahead delay (max 10ms)
    this._lookaheadDelayL = new DelayLine(0.01, this._sampleRate);
    this._lookaheadDelayR = new DelayLine(0.01, this._sampleRate);
    
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
    if (id.includes("Attack") || id.includes("Release") || id.includes("crossover") || id === "lookahead") {
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
    // Lookahead latency
    const lookaheadMs = this._params.get("lookahead")?.value ?? 0;
    return Math.round(lookaheadMs * this._sampleRate / 1000);
  }
  
  getTailSamples(): number { return 0; }

  reset(): void {
    this._crossoverLow.reset();
    this._crossoverHigh.reset();
    this._lookaheadDelayL?.reset();
    this._lookaheadDelayR?.reset();
    
    [this._lowBand, this._midBand, this._highBand].forEach(band => {
      band.envelope = 1;
      band.rmsSum = 0;
      band.rmsIndex = 0;
      band.rmsWindow.fill(0);
    });
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const inputGain = dbToLinear(this._params.get("inputGain")?.value ?? 0);
    const outputGain = dbToLinear(this._params.get("outputGain")?.value ?? 0);
    const dryWet = (this._params.get("dryWet")?.value ?? 100) / 100;
    const rmsMode = this._params.get("timeMode")?.value === 1;
    const lookaheadMs = this._params.get("lookahead")?.value ?? 0;
    const lookaheadSamples = Math.round(lookaheadMs * this._sampleRate / 1000);
    
    // Solo mode
    const lowSolo = this._params.get("lowSolo")?.value >= 0.5;
    const midSolo = this._params.get("midSolo")?.value >= 0.5;
    const highSolo = this._params.get("highSolo")?.value >= 0.5;
    const anySolo = lowSolo || midSolo || highSolo;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();
    this._updateCoeffs();

    // Update crossovers
    const xoverLow = this._params.get("crossoverLow")?.value ?? 250;
    const xoverHigh = this._params.get("crossoverHigh")?.value ?? 4000;
    this._crossoverLow.setFrequency(xoverLow);
    this._crossoverHigh.setFrequency(xoverHigh);

    let grLow = 0, grMid = 0, grHigh = 0;

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i] * inputGain;
      let dryR = inputR[i] * inputGain;

      if (bypass) {
        outputL[i] = dryL * outputGain;
        outputR[i] = dryR * outputGain;
        continue;
      }

      // Lookahead delay
      this._lookaheadDelayL?.write(dryL);
      this._lookaheadDelayR?.write(dryR);
      const delayedL = lookaheadSamples > 0 ? this._lookaheadDelayL?.read(lookaheadSamples) ?? dryL : dryL;
      const delayedR = lookaheadSamples > 0 ? this._lookaheadDelayR?.read(lookaheadSamples) ?? dryR : dryR;

      // Crossover: Split into 3 bands
      const lowL = this._crossoverLow.processLow(dryL);
      const lowR = this._crossoverLow.processLow(dryR);
      const midHighL = this._crossoverLow.processHigh(dryL);
      const midHighR = this._crossoverLow.processHigh(dryR);
      
      const midL = this._crossoverHigh.processLow(midHighL);
      const midR = this._crossoverHigh.processLow(midHighR);
      const highL = this._crossoverHigh.processHigh(midHighL);
      const highR = this._crossoverHigh.processHigh(midHighR);

      // Process each band with dynamics
      const procLowL = this._processBand(lowL, this._lowBand, rmsMode);
      const procLowR = this._processBand(lowR, this._lowBand, rmsMode);
      const procMidL = this._processBand(midL, this._midBand, rmsMode);
      const procMidR = this._processBand(midR, this._midBand, rmsMode);
      const procHighL = this._processBand(highL, this._highBand, rmsMode);
      const procHighR = this._processBand(highR, this._highBand, rmsMode);

      // Track gain reduction
      grLow = Math.min(grLow, this._lowBand.envelope);
      grMid = Math.min(grMid, this._midBand.envelope);
      grHigh = Math.min(grHigh, this._highBand.envelope);

      // Mix bands
      let wetL = 0, wetR = 0;
      
      if (anySolo) {
        if (lowSolo) { wetL += procLowL; wetR += procLowR; }
        if (midSolo) { wetL += procMidL; wetR += procMidR; }
        if (highSolo) { wetL += procHighL; wetR += procHighR; }
      } else {
        wetL = procLowL + procMidL + procHighL;
        wetR = procLowR + procMidR + procHighR;
      }

      // Apply gains and mix
      wetL *= outputGain;
      wetR *= outputGain;
      
      const outL = dryL * (1 - dryWet) + wetL * dryWet;
      const outR = dryR * (1 - dryWet) + wetR * dryWet;
      
      // Compensate for lookahead delay
      if (lookaheadSamples > 0) {
        outputL[i] = outL;
        outputR[i] = outR;
      } else {
        outputL[i] = outL;
        outputR[i] = outR;
      }
    }

    this._grMeters = {
      low: linearToDb(grLow),
      mid: linearToDb(grMid),
      high: linearToDb(grHigh)
    };
  }

  private _processBand(input: number, band: BandDynamics, rmsMode: boolean): number {
    if (!band.enabled) return input;

    // Level detection
    let level: number;
    if (rmsMode) {
      band.rmsSum -= band.rmsWindow[band.rmsIndex];
      band.rmsSum += input * input;
      band.rmsWindow[band.rmsIndex] = input * input;
      band.rmsIndex = (band.rmsIndex + 1) % band.rmsWindow.length;
      level = Math.sqrt(band.rmsSum / band.rmsWindow.length);
    } else {
      level = Math.abs(input);
    }

    const levelDb = level > 0.00001 ? 20 * Math.log10(level) : -100;

    // Calculate gain change based on dynamics type
    let gainChange = 0;
    const overshoot = levelDb - band.threshold;

    switch (band.type) {
      case "Comp Down": // Downward compression
        if (overshoot > 0) {
          gainChange = -overshoot * (1 - 1 / band.ratio);
        }
        break;
      case "Comp Up": // Upward compression
        if (overshoot < 0) {
          gainChange = -overshoot * (1 - 1 / band.ratio);
        }
        break;
      case "Exp Down": // Downward expansion
        if (overshoot < 0) {
          gainChange = -overshoot * (band.ratio - 1);
        }
        break;
      case "Exp Up": // Upward expansion
        if (overshoot > 0) {
          gainChange = -overshoot * (band.ratio - 1);
        }
        break;
    }

    // Convert to linear gain
    const targetGain = dbToLinear(gainChange);
    
    // Envelope following
    const coeff = targetGain < band.envelope ? band.attackCoeff : band.releaseCoeff;
    band.envelope += (targetGain - band.envelope) * coeff;

    // Apply dynamics and makeup gain
    return input * band.envelope * dbToLinear(band.gain);
  }

  async dispose(): Promise<void> {}

  private _updateCoeffs(): void {
    // Update band parameters
    this._updateBand(this._lowBand, "low");
    this._updateBand(this._midBand, "mid");
    this._updateBand(this._highBand, "high");
  }

  private _updateBand(band: BandDynamics, prefix: string): void {
    band.enabled = this._params.get(`${prefix}Enabled`)?.value >= 0.5;
    band.type = DYNAMICS_TYPES[Math.round(this._params.get(`${prefix}Type`)?.value ?? 0)];
    band.threshold = this._params.get(`${prefix}Threshold`)?.value ?? -20;
    band.ratio = this._params.get(`${prefix}Ratio`)?.value ?? 2;
    band.gain = this._params.get(`${prefix}Gain`)?.value ?? 0;
    
    const attackMs = this._params.get(`${prefix}Attack`)?.value ?? 10;
    const releaseMs = this._params.get(`${prefix}Release`)?.value ?? 100;
    
    const attackSamples = Math.max(1, attackMs * this._sampleRate / 1000);
    const releaseSamples = Math.max(1, releaseMs * this._sampleRate / 1000);
    
    band.attackCoeff = 1 - Math.exp(-1 / attackSamples);
    band.releaseCoeff = 1 - Math.exp(-1 / releaseSamples);
  }

  get gainReduction(): { low: number; mid: number; high: number } {
    return this._grMeters;
  }
}

export function createMultibandDynamicsDefinition(): PluginDefinition {
  return {
    id: "com.daw.multiband-dynamics",
    name: "Multiband Dynamics",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "3-band compressor/expander with independent control",
    parameters: PARAMETERS,
    ui: { 
      type: "generic",
      layout: [
        { title: "Crossover", parameters: ["crossoverLow", "crossoverHigh"], layout: "horizontal" },
        { title: "Low Band", parameters: ["lowEnabled", "lowType", "lowThreshold", "lowRatio", "lowAttack", "lowRelease", "lowGain", "lowSolo"], layout: "vertical" },
        { title: "Mid Band", parameters: ["midEnabled", "midType", "midThreshold", "midRatio", "midAttack", "midRelease", "midGain", "midSolo"], layout: "vertical" },
        { title: "High Band", parameters: ["highEnabled", "highType", "highThreshold", "highRatio", "highAttack", "highRelease", "highGain", "highSolo"], layout: "vertical" },
        { title: "Master", parameters: ["inputGain", "outputGain", "timeMode", "lookahead", "dryWet", "bypass"], layout: "vertical" }
      ]
    },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const mb = new MultibandDynamicsInstance();
      mb.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return mb;
    },
  };
}
