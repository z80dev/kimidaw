/**
 * Pedal - Guitar Pedal Emulation
 * 
 * Classic guitar effects in one unit:
 * - Overdrive, fuzz, distortion types
 * - Cabinet simulation
 * - Tone control (bass, mid, treble)
 * - Noise gate
 * - True bypass simulation
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
import { StateVariableFilter, BiquadFilter } from "../core/AdvancedFilters.js";
import { EnvelopeFollower, dbToLinear, clamp, tanhApprox } from "../core/DspUtils.js";

const PARAMETERS: PluginParameterSpec[] = [
  // Type
  { 
    id: "type", 
    name: "Type", 
    kind: "enum", 
    min: 0, 
    max: 5, 
    defaultValue: 0, 
    labels: ["Overdrive", "Distortion", "Fuzz", "Metal", "Bass OD", "Treble Boost"] 
  },
  
  // Drive section
  { id: "drive", name: "Drive", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  { id: "tone", name: "Tone", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "level", name: "Level", kind: "float", min: 0, max: 100, defaultValue: 0.75, unit: "%" },
  
  // EQ
  { id: "bass", name: "Bass", kind: "float", min: -12, max: 12, defaultValue: 0.5, unit: "dB" },
  { id: "mid", name: "Mid", kind: "float", min: -12, max: 12, defaultValue: 0.5, unit: "dB" },
  { id: "treble", name: "Treble", kind: "float", min: -12, max: 12, defaultValue: 0.5, unit: "dB" },
  { id: "presence", name: "Presence", kind: "float", min: 0, max: 10, defaultValue: 0, unit: "dB" },
  
  // Cabinet
  { 
    id: "cabinet", 
    name: "Cabinet", 
    kind: "enum", 
    min: 0, 
    max: 6, 
    defaultValue: 0.3, 
    labels: ["None", "1x12", "2x12", "4x12", "1x15", "4x10", "Acoustic"] 
  },
  { id: "micDistance", name: "Mic Distance", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  
  // Gate
  { id: "gate", name: "Gate", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  
  // Output
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class PedalInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Tone stack filters
  private _bassFilter = new BiquadFilter();
  private _midFilter = new BiquadFilter();
  private _trebleFilter = new BiquadFilter();
  private _presenceFilter = new BiquadFilter();
  
  // Cabinet simulation
  private _cabFilter1 = new StateVariableFilter();
  private _cabFilter2 = new StateVariableFilter();
  
  // Noise gate
  private _gateFollower = new EnvelopeFollower();
  private _gateState = 0;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    
    this._bassFilter.setSampleRate(this._sampleRate);
    this._midFilter.setSampleRate(this._sampleRate);
    this._trebleFilter.setSampleRate(this._sampleRate);
    this._presenceFilter.setSampleRate(this._sampleRate);
    
    this._cabFilter1.setSampleRate(this._sampleRate);
    this._cabFilter2.setSampleRate(this._sampleRate);
    
    this._updateToneStack();
    this._updateCabinet();
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "bass" || id === "mid" || id === "treble" || id === "presence" || id === "tone") {
      this._updateToneStack();
    }
    if (id === "cabinet" || id === "micDistance") {
      this._updateCabinet();
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
      this._updateToneStack();
      this._updateCabinet();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    this._bassFilter.reset();
    this._midFilter.reset();
    this._trebleFilter.reset();
    this._presenceFilter.reset();
    this._cabFilter1.reset();
    this._cabFilter2.reset();
    this._gateState = 0;
  }

  private _updateToneStack(): void {
    const bass = (this._params.get("bass")?.value ?? 0);
    const mid = (this._params.get("mid")?.value ?? 0);
    const treble = (this._params.get("treble")?.value ?? 0);
    const presence = (this._params.get("presence")?.value ?? 0);
    const tone = (this._params.get("tone")?.value ?? 50) / 100;

    // Bass shelving
    this._bassFilter.setType("lowshelf");
    this._bassFilter.setFrequency(150);
    this._bassFilter.setGain(bass * (0.5 + tone * 0.5));

    // Mid peaking
    this._midFilter.setType("peak");
    this._midFilter.setFrequency(750);
    this._midFilter.setGain(mid);
    this._midFilter.setQ(0.7);

    // Treble shelving
    this._trebleFilter.setType("highshelf");
    this._trebleFilter.setFrequency(3000);
    this._trebleFilter.setGain(treble * (0.5 + (1 - tone) * 0.5));

    // Presence
    this._presenceFilter.setType("peak");
    this._presenceFilter.setFrequency(5000);
    this._presenceFilter.setGain(presence);
    this._presenceFilter.setQ(1.0);
  }

  private _updateCabinet(): void {
    const cabinet = Math.floor(this._params.get("cabinet")?.value ?? 0);
    
    if (cabinet === 0) {
      // No cabinet
      return;
    }
    
    // Cabinet configurations
    const cabConfigs = [
      { low: 80, high: 5000, res: 2 },   // 1x12
      { low: 70, high: 5500, res: 2.5 }, // 2x12
      { low: 60, high: 6000, res: 3 },   // 4x12
      { low: 40, high: 4000, res: 1.5 }, // 1x15 bass
      { low: 50, high: 5000, res: 2 },   // 4x10 bass
      { low: 60, high: 12000, res: 1 },  // Acoustic
    ];
    
    const config = cabConfigs[cabinet - 1] ?? cabConfigs[0];
    
    this._cabFilter1.setType("bandpass");
    this._cabFilter1.setFrequency(config.low);
    this._cabFilter1.setQ(config.res);
    
    this._cabFilter2.setType("lowpass12");
    this._cabFilter2.setFrequency(config.high);
    this._cabFilter2.setQ(0.7);
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const type = Math.floor(this._params.get("type")?.value ?? 0);
    const drive = (this._params.get("drive")?.value ?? 30) / 100;
    const tone = (this._params.get("tone")?.value ?? 50) / 100;
    const level = (this._params.get("level")?.value ?? 75) / 100;
    const cabinet = Math.floor(this._params.get("cabinet")?.value ?? 0);
    const micDistance = (this._params.get("micDistance")?.value ?? 30) / 100;
    const gate = (this._params.get("gate")?.value ?? 0) / 100;
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

    // Pre-compute drive parameters
    const inputGain = this._getInputGain(type, drive);
    const outputGain = level * this._getOutputGain(type);

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL;
        outputR[i] = dryR;
        continue;
      }

      // Noise gate
      const env = this._gateFollower.process((Math.abs(dryL) + Math.abs(dryR)) * 0.5);
      const gateThresh = gate * 0.1;
      let gateGain = 1;
      if (gate > 0) {
        gateGain = env > gateThresh ? 1 : 0;
        // Smooth gate
        this._gateState += (gateGain - this._gateState) * 0.1;
        gateGain = this._gateState;
      }

      // Apply pre-EQ
      let wetL = this._bassFilter.process(dryL);
      wetL = this._midFilter.process(wetL);
      wetL = this._trebleFilter.process(wetL);
      
      let wetR = this._bassFilter.process(dryR);
      wetR = this._midFilter.process(wetR);
      wetR = this._trebleFilter.process(wetR);

      // Apply drive
      wetL *= inputGain;
      wetR *= inputGain;

      // Apply distortion based on type
      wetL = this._distort(wetL, type, drive);
      wetR = this._distort(wetR, type, drive);

      // Apply post-EQ
      wetL = this._presenceFilter.process(wetL);
      wetR = this._presenceFilter.process(wetR);

      // Apply cabinet simulation
      if (cabinet > 0) {
        wetL = this._cabFilter1.process(wetL);
        wetL = this._cabFilter2.process(wetL);
        wetR = this._cabFilter1.process(wetR);
        wetR = this._cabFilter2.process(wetR);
        
        // Mic distance (simple lowpass)
        if (micDistance > 0) {
          const distFactor = 1 - micDistance * 0.5;
          wetL *= distFactor;
          wetR *= distFactor;
        }
      }

      // Apply output level and gate
      wetL *= outputGain * gateGain;
      wetR *= outputGain * gateGain;

      // Mix
      outputL[i] = dryL * (1 - dryWet) + wetL * dryWet;
      outputR[i] = dryR * (1 - dryWet) + wetR * dryWet;
    }
  }

  private _getInputGain(type: number, drive: number): number {
    const baseGains = [2, 5, 10, 15, 3, 1.5];
    return 1 + baseGains[type] * drive;
  }

  private _getOutputGain(type: number): number {
    const outputGains = [0.7, 0.5, 0.3, 0.25, 0.6, 0.8];
    return outputGains[type] ?? 0.5;
  }

  private _distort(input: number, type: number, drive: number): number {
    switch (type) {
      case 0: // Overdrive - soft clipping
        return this._softClip(input);
        
      case 1: // Distortion - harder clipping
        return this._hardClip(input, 0.7);
        
      case 2: // Fuzz - extreme clipping with octaves
        return this._fuzz(input, drive);
        
      case 3: // Metal - aggressive high-gain
        return this._metalDist(input);
        
      case 4: // Bass OD - preserve low end
        return this._bassOverdrive(input);
        
      case 5: // Treble Boost - emphasize highs
        return this._trebleBoost(input);
        
      default:
        return this._softClip(input);
    }
  }

  private _softClip(x: number): number {
    // Asymmetric soft clipping
    if (x >= 0) {
      return tanhApprox(x);
    } else {
      return tanhApprox(x * 0.8) * 1.1;
    }
  }

  private _hardClip(x: number, threshold: number): number {
    return clamp(x, -threshold, threshold) / threshold;
  }

  private _fuzz(x: number, drive: number): number {
    // Fuzz with octave up
    const octave = x * x * Math.sign(x);
    const mixed = x + octave * drive * 0.3;
    return tanhApprox(mixed * 2);
  }

  private _metalDist(x: number): number {
    // Multi-stage clipping
    let out = tanhApprox(x * 3);
    out = tanhApprox(out * 2);
    return out;
  }

  private _bassOverdrive(x: number): number {
    // Blend of clean low and distorted
    const low = x * 0.5;
    const high = tanhApprox(x) * 0.5;
    return low + high;
  }

  private _trebleBoost(x: number): number {
    // Accentuate high frequencies (already done in EQ)
    return tanhApprox(x * 1.5);
  }

  async dispose(): Promise<void> {}
}

export function createPedalDefinition(): PluginDefinition {
  return {
    id: "com.daw.pedal",
    name: "Pedal",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Guitar pedal emulation with overdrive, fuzz, and distortion",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const pedal = new PedalInstance();
      pedal.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return pedal;
    },
  };
}
