/**
 * Amp - Guitar Amp Simulation
 * 
 * Multiple guitar amplifier models:
 * - Clean, Crunch, Lead, Metal, Bass
 * - Gain, tone controls (bass, mid, treble, presence)
 * - Multiple cabinet options
 * - Power amp saturation
 * - Room simulation
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
import { DelayLine, EnvelopeFollower, dbToLinear, clamp, tanhApprox } from "../core/DspUtils.js";

const PARAMETERS: PluginParameterSpec[] = [
  // Model
  { 
    id: "model", 
    name: "Model", 
    kind: "enum", 
    min: 0, 
    max: 7, 
    defaultValue: 0.25, 
    labels: ["Clean", "Crunch", "Blues", "Rock", "Lead", "Metal", "Bass", "Acoustic"] 
  },
  
  // Pre-amp
  { id: "gain", name: "Gain", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  { id: "volume", name: "Volume", kind: "float", min: 0, max: 100, defaultValue: 0.7, unit: "%" },
  { id: "master", name: "Master", kind: "float", min: 0, max: 100, defaultValue: 0.75, unit: "%" },
  
  // Tone stack
  { id: "bass", name: "Bass", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "mid", name: "Mid", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "treble", name: "Treble", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "presence", name: "Presence", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  
  // Cabinet
  { 
    id: "cabinet", 
    name: "Cabinet", 
    kind: "enum", 
    min: 0, 
    max: 8, 
    defaultValue: 0.25, 
    labels: ["1x12", "2x12", "4x12", "4x12 Metal", "1x15 Bass", "2x10 Bass", "4x10 Bass", "Acoustic", "Direct"] 
  },
  
  // Room
  { id: "room", name: "Room", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "roomSize", name: "Room Size", kind: "enum", min: 0, max: 2, defaultValue: 0, labels: ["Small", "Medium", "Large"] },
  
  // Output
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

interface AmpModel {
  name: string;
  preGain: number;
  powerGain: number;
  tonestack: "fender" | "marshall" | "vox" | "bass" | "acoustic";
  distortion: number;
  brightness: number;
}

const AMP_MODELS: AmpModel[] = [
  { name: "Clean", preGain: 1, powerGain: 0.5, tonestack: "fender", distortion: 0.1, brightness: 0.3 },
  { name: "Crunch", preGain: 3, powerGain: 0.6, tonestack: "marshall", distortion: 0.4, brightness: 0.5 },
  { name: "Blues", preGain: 2, powerGain: 0.5, tonestack: "fender", distortion: 0.3, brightness: 0.4 },
  { name: "Rock", preGain: 5, powerGain: 0.7, tonestack: "marshall", distortion: 0.5, brightness: 0.5 },
  { name: "Lead", preGain: 8, powerGain: 0.8, tonestack: "marshall", distortion: 0.6, brightness: 0.6 },
  { name: "Metal", preGain: 10, powerGain: 0.9, tonestack: "marshall", distortion: 0.8, brightness: 0.7 },
  { name: "Bass", preGain: 2, powerGain: 0.6, tonestack: "bass", distortion: 0.2, brightness: 0.2 },
  { name: "Acoustic", preGain: 1, powerGain: 0.4, tonestack: "acoustic", distortion: 0.05, brightness: 0.4 },
];

export class AmpInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Tone stack
  private _bassFilter = new BiquadFilter();
  private _midFilter = new BiquadFilter();
  private _trebleFilter = new BiquadFilter();
  private _presenceFilter = new BiquadFilter();
  
  // Cabinet filters
  private _cabLow = new StateVariableFilter();
  private _cabHigh = new StateVariableFilter();
  private _cabResonance = new StateVariableFilter();
  
  // Room simulation
  private _roomDelayL: DelayLine;
  private _roomDelayR: DelayLine;
  
  // Saturation state
  private _saturationL = 0;
  private _saturationR = 0;

  constructor() {
    this._roomDelayL = new DelayLine(0.1, 48000);
    this._roomDelayR = new DelayLine(0.1, 48000);
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    
    this._bassFilter.setSampleRate(this._sampleRate);
    this._midFilter.setSampleRate(this._sampleRate);
    this._trebleFilter.setSampleRate(this._sampleRate);
    this._presenceFilter.setSampleRate(this._sampleRate);
    
    this._cabLow.setSampleRate(this._sampleRate);
    this._cabHigh.setSampleRate(this._sampleRate);
    this._cabResonance.setSampleRate(this._sampleRate);
    
    this._roomDelayL = new DelayLine(0.1, this._sampleRate);
    this._roomDelayR = new DelayLine(0.1, this._sampleRate);
    
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
    if (id === "bass" || id === "mid" || id === "treble" || id === "presence" || id === "model") {
      this._updateToneStack();
    }
    if (id === "cabinet") {
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
    this._cabLow.reset();
    this._cabHigh.reset();
    this._cabResonance.reset();
    this._roomDelayL.reset();
    this._roomDelayR.reset();
    this._saturationL = 0;
    this._saturationR = 0;
  }

  private _updateToneStack(): void {
    const modelIdx = Math.floor(this._params.get("model")?.value ?? 0);
    const model = AMP_MODELS[modelIdx] ?? AMP_MODELS[0];
    
    const bass = (this._params.get("bass")?.value ?? 50) / 100;
    const mid = (this._params.get("mid")?.value ?? 50) / 100;
    const treble = (this._params.get("treble")?.value ?? 50) / 100;
    const presence = (this._params.get("presence")?.value ?? 30) / 100;

    // Different tonestack characteristics
    switch (model.tonestack) {
      case "fender":
        this._bassFilter.setType("lowshelf");
        this._bassFilter.setFrequency(150);
        this._bassFilter.setGain((bass - 0.5) * 20);
        
        this._midFilter.setType("peak");
        this._midFilter.setFrequency(500);
        this._midFilter.setGain((mid - 0.5) * 10);
        this._midFilter.setQ(0.7);
        
        this._trebleFilter.setType("highshelf");
        this._trebleFilter.setFrequency(2500);
        this._trebleFilter.setGain((treble - 0.5) * 15 + model.brightness * 5);
        break;
        
      case "marshall":
        this._bassFilter.setType("lowshelf");
        this._bassFilter.setFrequency(120);
        this._bassFilter.setGain((bass - 0.5) * 18);
        
        this._midFilter.setType("peak");
        this._midFilter.setFrequency(700);
        this._midFilter.setGain((mid - 0.5) * 15);
        this._midFilter.setQ(0.8);
        
        this._trebleFilter.setType("highshelf");
        this._trebleFilter.setFrequency(3000);
        this._trebleFilter.setGain((treble - 0.5) * 20 + model.brightness * 8);
        break;
        
      case "vox":
        this._bassFilter.setType("lowshelf");
        this._bassFilter.setFrequency(200);
        this._bassFilter.setGain((bass - 0.5) * 12);
        
        this._midFilter.setType("peak");
        this._midFilter.setFrequency(1000);
        this._midFilter.setGain((mid - 0.5) * 12);
        this._midFilter.setQ(0.6);
        
        this._trebleFilter.setType("highshelf");
        this._trebleFilter.setFrequency(4000);
        this._trebleFilter.setGain((treble - 0.5) * 18 + model.brightness * 10);
        break;
        
      case "bass":
        this._bassFilter.setType("lowshelf");
        this._bassFilter.setFrequency(100);
        this._bassFilter.setGain((bass - 0.5) * 24);
        
        this._midFilter.setType("peak");
        this._midFilter.setFrequency(600);
        this._midFilter.setGain((mid - 0.5) * 15);
        this._midFilter.setQ(0.7);
        
        this._trebleFilter.setType("highshelf");
        this._trebleFilter.setFrequency(2500);
        this._trebleFilter.setGain((treble - 0.5) * 12);
        break;
        
      case "acoustic":
        this._bassFilter.setType("lowshelf");
        this._bassFilter.setFrequency(180);
        this._bassFilter.setGain((bass - 0.5) * 10);
        
        this._midFilter.setType("peak");
        this._midFilter.setFrequency(800);
        this._midFilter.setGain((mid - 0.5) * 8);
        this._midFilter.setQ(0.5);
        
        this._trebleFilter.setType("highshelf");
        this._trebleFilter.setFrequency(3500);
        this._trebleFilter.setGain((treble - 0.5) * 12 + model.brightness * 5);
        break;
    }

    // Presence
    this._presenceFilter.setType("peak");
    this._presenceFilter.setFrequency(5000);
    this._presenceFilter.setGain(presence * 12);
    this._presenceFilter.setQ(1.0);
  }

  private _updateCabinet(): void {
    const cabinet = Math.floor(this._params.get("cabinet")?.value ?? 0);
    
    // Cabinet configurations
    const cabConfigs = [
      { low: 80, high: 5500, resonance: 200, q: 3 },    // 1x12
      { low: 70, high: 6000, resonance: 180, q: 2.5 },  // 2x12
      { low: 60, high: 6500, resonance: 150, q: 3 },    // 4x12
      { low: 50, high: 7500, resonance: 120, q: 4 },    // 4x12 Metal
      { low: 40, high: 4000, resonance: 80, q: 2 },     // 1x15 Bass
      { low: 45, high: 5000, resonance: 100, q: 2.5 },  // 2x10 Bass
      { low: 40, high: 6000, resonance: 90, q: 3 },     // 4x10 Bass
      { low: 60, high: 15000, resonance: 200, q: 1.5 }, // Acoustic
    ];
    
    const config = cabConfigs[cabinet] ?? cabConfigs[0];
    
    this._cabLow.setType("highpass12");
    this._cabLow.setFrequency(config.low);
    this._cabLow.setQ(0.7);
    
    this._cabHigh.setType("lowpass12");
    this._cabHigh.setFrequency(config.high);
    this._cabHigh.setQ(0.7);
    
    this._cabResonance.setType("bandpass");
    this._cabResonance.setFrequency(config.resonance);
    this._cabResonance.setQ(config.q);
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const modelIdx = Math.floor(this._params.get("model")?.value ?? 0);
    const model = AMP_MODELS[modelIdx] ?? AMP_MODELS[0];
    const gain = (this._params.get("gain")?.value ?? 30) / 100;
    const volume = (this._params.get("volume")?.value ?? 70) / 100;
    const master = (this._params.get("master")?.value ?? 75) / 100;
    const room = (this._params.get("room")?.value ?? 0) / 100;
    const roomSize = Math.floor(this._params.get("roomSize")?.value ?? 0);
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

    // Calculate gains
    const preGain = model.preGain * gain * 10;
    const powerGain = model.powerGain * master * 2;

    // Room delay time based on size
    const roomDelays = [0.02, 0.04, 0.08];
    const roomDelayTime = roomDelays[roomSize] * this._sampleRate;

    for (let i = 0; i < blockSize; i++) {
      const dryL = inputL[i];
      const dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL;
        outputR[i] = dryR;
        continue;
      }

      // ===== PRE-AMP STAGE =====
      
      // Apply tone stack
      let preL = this._bassFilter.process(dryL);
      preL = this._midFilter.process(preL);
      preL = this._trebleFilter.process(preL);
      
      let preR = this._bassFilter.process(dryR);
      preR = this._midFilter.process(preR);
      preR = this._trebleFilter.process(preR);

      // Pre-amp gain
      preL *= preGain;
      preR *= preGain;

      // Pre-amp saturation (tube emulation)
      preL = this._tubeDistort(preL, model.distortion);
      preR = this._tubeDistort(preR, model.distortion);

      // Volume control
      preL *= volume;
      preR *= volume;

      // ===== POWER AMP STAGE =====
      
      // Power amp saturation
      let powerL = this._powerAmpDistort(preL * powerGain);
      let powerR = this._powerAmpDistort(preR * powerGain);

      // Presence
      powerL = this._presenceFilter.process(powerL);
      powerR = this._presenceFilter.process(powerR);

      // ===== CABINET STAGE =====
      
      // Cabinet filtering
      powerL = this._cabLow.process(powerL);
      powerL = this._cabHigh.process(powerL);
      powerL += this._cabResonance.process(powerL) * 0.3;
      
      powerR = this._cabLow.process(powerR);
      powerR = this._cabHigh.process(powerR);
      powerR += this._cabResonance.process(powerR) * 0.3;

      // ===== ROOM SIMULATION =====
      
      if (room > 0) {
        this._roomDelayL.write(powerL * 0.5);
        this._roomDelayR.write(powerR * 0.5);
        
        const roomL = this._roomDelayL.read(roomDelayTime) * room;
        const roomR = this._roomDelayR.read(roomDelayTime * 0.95) * room;
        
        powerL += roomL;
        powerR += roomR;
      }

      // Soft clip output
      powerL = tanhApprox(powerL);
      powerR = tanhApprox(powerR);

      // Mix
      outputL[i] = dryL * (1 - dryWet) + powerL * dryWet;
      outputR[i] = dryR * (1 - dryWet) + powerR * dryWet;
    }
  }

  private _tubeDistort(x: number, amount: number): number {
    // Asymmetric tube distortion
    const bias = 0.1 * amount;
    x += bias;
    
    if (x >= 0) {
      // Positive side: softer
      return tanhApprox(x) - tanhApprox(bias);
    } else {
      // Negative side: harder
      return tanhApprox(x * 1.2) * 0.9 - tanhApprox(bias);
    }
  }

  private _powerAmpDistort(x: number): number {
    // Transformer saturation simulation
    // Even harmonics from push-pull topology
    const evenHarmonic = x * x * Math.sign(x) * 0.1;
    return tanhApprox(x + evenHarmonic);
  }

  async dispose(): Promise<void> {}
}

export function createAmpDefinition(): PluginDefinition {
  return {
    id: "com.daw.amp",
    name: "Amp",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Guitar amp simulation with multiple models",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const amp = new AmpInstance();
      amp.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return amp;
    },
  };
}
