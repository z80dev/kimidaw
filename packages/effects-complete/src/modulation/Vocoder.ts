/**
 * Vocoder
 * 
 * 20+ band channel vocoder:
 * - Modulator/carrier inputs
 * - Formant shift
 * - Unvoiced detection
 * - Attack/release envelope followers per band
 * 
 * Classic "talking synth" effect using spectral envelope following.
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
import { EnvelopeFollower, dbToLinear, clamp } from "../core/DspUtils.js";

const PARAMETERS: PluginParameterSpec[] = [
  // Bands
  { id: "numBands", name: "Bands", kind: "enum", min: 0, max: 4, defaultValue: 0.6, labels: ["4", "8", "16", "20", "32"] },
  
  // Formant
  { id: "formant", name: "Formant", kind: "float", min: 0.5, max: 2, defaultValue: 0.5 },
  { id: "depth", name: "Depth", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  
  // Unvoiced detection
  { id: "unvoiced", name: "Unvoiced", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "sensitivity", name: "Sensitivity", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  
  // Envelope
  { id: "attack", name: "Attack", kind: "float", min: 1, max: 100, defaultValue: 0.15, unit: "ms" },
  { id: "release", name: "Release", kind: "float", min: 1, max: 500, defaultValue: 0.25, unit: "ms" },
  
  // Carrier
  { id: "carrierGain", name: "Carrier Gain", kind: "float", min: -24, max: 24, defaultValue: 0.75, unit: "dB" },
  { id: "modulatorGain", name: "Mod Gain", kind: "float", min: -24, max: 24, defaultValue: 0.75, unit: "dB" },
  
  // Output
  { id: "output", name: "Output", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

// Band frequencies for different band counts
const BAND_CONFIGS = {
  4: [200, 500, 2000, 7000],
  8: [150, 300, 600, 1200, 2400, 4800, 7200, 10000],
  16: [100, 200, 300, 500, 700, 1000, 1500, 2000, 3000, 4000, 5500, 7000, 8500, 10000, 12000, 15000],
  20: [80, 150, 250, 350, 500, 700, 1000, 1400, 2000, 2800, 4000, 5500, 7000, 8500, 10000, 12000, 14000, 16000, 18000, 20000],
  32: [75, 110, 150, 200, 260, 330, 410, 500, 600, 720, 860, 1020, 1200, 1420, 1680, 2000, 2400, 2900, 3500, 4200, 5000, 6000, 7200, 8600, 10000, 12000, 14000, 16000, 18000, 20000, 22000, 24000],
};

export class VocoderInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Filter banks
  private _modFilters: BiquadFilter[] = [];
  private _carFilters: BiquadFilter[] = [];
  
  // Envelope followers for modulator
  private _envFollowers: EnvelopeFollower[] = [];
  
  // Current number of bands
  private _numBands = 20;
  private _bandFreqs: number[] = BAND_CONFIGS[20];

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._setupFilters();
  }

  private _setupFilters(): void {
    this._numBands = Math.round(this._params.get("numBands")?.value ?? 20);
    const bandConfig = [4, 8, 16, 20, 32];
    const bandCount = bandConfig[Math.min(Math.max(0, Math.floor((this._params.get("numBands")?.value ?? 20) / 6)), 4)] || 20;
    this._bandFreqs = BAND_CONFIGS[bandCount as keyof typeof BAND_CONFIGS];
    this._numBands = this._bandFreqs.length;

    // Create filter banks
    this._modFilters = [];
    this._carFilters = [];
    this._envFollowers = [];

    for (let i = 0; i < this._numBands; i++) {
      // Modulator bandpass filters
      const modFilt = new BiquadFilter();
      modFilt.setSampleRate(this._sampleRate);
      modFilt.setType("bandpass");
      modFilt.setFrequency(this._bandFreqs[i]);
      modFilt.setQ(2.0); // Bandwidth
      this._modFilters.push(modFilt);

      // Carrier bandpass filters
      const carFilt = new BiquadFilter();
      carFilt.setSampleRate(this._sampleRate);
      carFilt.setType("bandpass");
      carFilt.setFrequency(this._bandFreqs[i]);
      carFilt.setQ(2.0);
      this._carFilters.push(carFilt);

      // Envelope follower for this band
      const env = new EnvelopeFollower();
      env.setAttack(5, this._sampleRate);
      env.setRelease(50, this._sampleRate);
      this._envFollowers.push(env);
    }
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "numBands" || id === "formant") {
      this._setupFilters();
    }
    if (id === "attack" || id === "release") {
      this._updateEnvelopes();
    }
  }

  private _updateEnvelopes(): void {
    const attack = this._params.get("attack")?.value ?? 5;
    const release = this._params.get("release")?.value ?? 50;
    
    for (const env of this._envFollowers) {
      env.setAttack(attack, this._sampleRate);
      env.setRelease(release, this._sampleRate);
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
      this._setupFilters();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    for (const f of this._modFilters) f.reset();
    for (const f of this._carFilters) f.reset();
    for (const env of this._envFollowers) env.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const formant = this._params.get("formant")?.value ?? 1;
    const depth = (this._params.get("depth")?.value ?? 100) / 100;
    const unvoicedAmount = (this._params.get("unvoiced")?.value ?? 50) / 100;
    const sensitivity = (this._params.get("sensitivity")?.value ?? 30) / 100;
    const carGainDb = this._params.get("carrierGain")?.value ?? 0;
    const modGainDb = this._params.get("modulatorGain")?.value ?? 0;
    const outputGainDb = this._params.get("output")?.value ?? 0;
    const dryWet = (this._params.get("dryWet")?.value ?? 100) / 100;

    // Inputs: 0 = modulator (voice), 1 = carrier (synth)
    const modInputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const modInputR = inputs[0]?.numberOfChannels > 1 ? inputs[0].getChannelData(1) : modInputL;
    
    const carInputL = inputs[1]?.getChannelData(0) ?? modInputL; // Use modulator as carrier if no sidechain
    const carInputR = inputs[1]?.numberOfChannels > 1 ? inputs[1].getChannelData(1) : carInputL;

    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();

    const carGain = dbToLinear(carGainDb);
    const modGain = dbToLinear(modGainDb);
    const outputGain = dbToLinear(outputGainDb);

    for (let i = 0; i < blockSize; i++) {
      const modDryL = modInputL[i] * modGain;
      const modDryR = modInputR[i] * modGain;
      const carDryL = carInputL[i] * carGain;
      const carDryR = carInputR[i] * carGain;

      if (bypass) {
        outputL[i] = modDryL * outputGain;
        outputR[i] = modDryR * outputGain;
        continue;
      }

      // Detect unvoiced (high frequency energy with low correlation)
      const unvoiced = this._detectUnvoiced(modDryL, modDryR, sensitivity);

      // Process through vocoder bands
      let vocodedL = 0;
      let vocodedR = 0;

      for (let b = 0; b < this._numBands; b++) {
        // Apply formant shift to band index
        const shiftedBand = this._getShiftedBand(b, formant);
        if (shiftedBand < 0 || shiftedBand >= this._numBands) continue;

        // Filter modulator to get band envelope
        const modBandL = this._modFilters[b].process(modDryL);
        const modBandR = this._modFilters[b].process(modDryR);

        // Get envelope from modulator band
        const envL = this._envFollowers[b].process(Math.abs(modBandL));
        const envR = this._envFollowers[b].process(Math.abs(modBandR));
        const env = (envL + envR) * 0.5;

        // Filter carrier
        const carBandL = this._carFilters[shiftedBand].process(carDryL);
        const carBandR = this._carFilters[shiftedBand].process(carDryR);

        // Apply envelope to carrier
        // Mix in unvoiced noise for consonants
        const noiseL = (Math.random() * 2 - 1) * unvoiced * unvoicedAmount;
        const noiseR = (Math.random() * 2 - 1) * unvoiced * unvoicedAmount;

        const bandGain = env * depth + (1 - depth);
        vocodedL += (carBandL * bandGain + noiseL * env) * 0.5;
        vocodedR += (carBandR * bandGain + noiseR * env) * 0.5;
      }

      // Normalize by number of bands
      vocodedL /= this._numBands;
      vocodedR /= this._numBands;

      // Mix dry/wet
      outputL[i] = (modDryL * (1 - dryWet) + vocodedL * dryWet) * outputGain;
      outputR[i] = (modDryR * (1 - dryWet) + vocodedR * dryWet) * outputGain;
    }
  }

  private _detectUnvoiced(inputL: number, inputR: number, sensitivity: number): number {
    // Simple unvoiced detection: high frequency content with low periodicity
    // Use zero-crossing rate as a proxy for unvoiced detection
    // Higher zero-crossing rate = more likely unvoiced
    
    const energy = Math.abs(inputL) + Math.abs(inputR);
    
    // Simplified detection - in practice would use spectral analysis
    // Return 0-1 value representing likelihood of unvoiced
    const threshold = 0.01 + sensitivity * 0.1;
    return energy > threshold ? Math.min(1, energy * 10) : 0;
  }

  private _getShiftedBand(band: number, formant: number): number {
    // Shift band indices for formant shifting
    // formant < 1 shifts down, > 1 shifts up
    const center = this._numBands / 2;
    const shifted = center + (band - center) * formant;
    return Math.round(clamp(shifted, 0, this._numBands - 1));
  }

  async dispose(): Promise<void> {}
}

export function createVocoderDefinition(): PluginDefinition {
  return {
    id: "com.daw.vocoder",
    name: "Vocoder",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "20+ band channel vocoder with formant shift",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2, // Modulator + Carrier
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    hasSidechain: true,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const vocoder = new VocoderInstance();
      vocoder.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return vocoder;
    },
  };
}
