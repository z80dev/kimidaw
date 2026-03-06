/**
 * Vinyl Distortion - Turntable emulation
 * 
 * Simulates vinyl record artifacts:
 * - Tracing model (bass distortion from stylus geometry)
 * - Pinch effect (stereo 2nd harmonic)
 * - Crackle generator
 * - Drive and Wow/Flutter
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
import { LFO, whiteNoise, clamp, tanhApprox } from "../core/DspUtils.js";

const PARAMETERS: PluginParameterSpec[] = [
  // Tracing model
  { id: "tracing", name: "Tracing", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "tracingFreq", name: "Tracing Freq", kind: "float", min: 50, max: 500, defaultValue: 0.3, unit: "Hz" },
  
  // Pinch effect
  { id: "pinch", name: "Pinch", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "pinchPhase", name: "Pinch Phase", kind: "float", min: 0, max: 360, defaultValue: 0, unit: "°" },
  
  // Crackle
  { id: "crackle", name: "Crackle", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "crackleDensity", name: "Crackle Density", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  
  // Mechanical
  { id: "drive", name: "Drive", kind: "float", min: 0, max: 24, defaultValue: 0, unit: "dB" },
  { id: "wow", name: "Wow", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "flutter", name: "Flutter", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class VinylDistortionInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Filters for tracing model
  private _bassFilterL = new StateVariableFilter();
  private _bassFilterR = new StateVariableFilter();
  
  // Crackle filter
  private _crackleFilter = new BiquadFilter();
  
  // LFOs for wow/flutter
  private _wowLFO = new LFO();
  private _flutterLFO = new LFO();
  
  // Crackle state
  private _crackleEnvelope = 0;
  private _crackleTrigger = 0;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    
    this._bassFilterL.setSampleRate(this._sampleRate);
    this._bassFilterR.setSampleRate(this._sampleRate);
    this._bassFilterL.setType("lowpass12");
    this._bassFilterR.setType("lowpass12");
    
    this._crackleFilter.setSampleRate(this._sampleRate);
    this._crackleFilter.setType("highpass12");
    this._crackleFilter.setFrequency(1000);
    
    this._wowLFO.setSampleRate(this._sampleRate);
    this._flutterLFO.setSampleRate(this._sampleRate);
    this._wowLFO.setWaveform("sine");
    this._flutterLFO.setWaveform("triangle");
    
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
    if (id === "tracingFreq") {
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
    this._bassFilterL.reset();
    this._bassFilterR.reset();
    this._crackleFilter.reset();
    this._wowLFO.reset();
    this._flutterLFO.reset();
    this._crackleEnvelope = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const tracing = (this._params.get("tracing")?.value ?? 0) / 100;
    const pinch = (this._params.get("pinch")?.value ?? 0) / 100;
    const crackle = (this._params.get("crackle")?.value ?? 0) / 100;
    const crackleDensity = (this._params.get("crackleDensity")?.value ?? 30) / 100;
    const drive = Math.pow(10, (this._params.get("drive")?.value ?? 0) / 20);
    const wow = (this._params.get("wow")?.value ?? 0) / 100;
    const flutter = (this._params.get("flutter")?.value ?? 0) / 100;
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
    this._updateCoeffs();

    const pinchPhase = (this._params.get("pinchPhase")?.value ?? 0) * Math.PI / 180;

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL;
        outputR[i] = dryR;
        continue;
      }

      let wetL = dryL;
      let wetR = dryR;

      // Apply drive
      wetL *= drive;
      wetR *= drive;

      // Tracing model (bass distortion)
      if (tracing > 0) {
        const bassL = this._bassFilterL.process(wetL);
        const bassR = this._bassFilterR.process(wetR);
        
        // Add 2nd harmonic distortion to bass
        const harmonicL = bassL * bassL * Math.sign(bassL) * 0.5 * tracing;
        const harmonicR = bassR * bassR * Math.sign(bassR) * 0.5 * tracing;
        
        wetL += harmonicL;
        wetR += harmonicR;
      }

      // Pinch effect (stereo 2nd harmonic with phase)
      if (pinch > 0) {
        const sum = wetL + wetR;
        const diff = wetL - wetR;
        
        const pinchL = sum * sum * Math.sign(sum) * Math.cos(pinchPhase) * pinch * 0.3;
        const pinchR = sum * sum * Math.sign(sum) * Math.sin(pinchPhase) * pinch * 0.3;
        
        wetL += pinchL;
        wetR += pinchR;
      }

      // Crackle
      if (crackle > 0) {
        this._crackleTrigger--;
        if (this._crackleTrigger <= 0) {
          // Trigger new crackle
          if (Math.random() < crackleDensity) {
            this._crackleEnvelope = 1;
          }
          this._crackleTrigger = Math.random() * 100 + 10;
        }
        
        // Decay crackle
        this._crackleEnvelope *= 0.95;
        
        const crackleSample = this._crackleFilter.process(whiteNoise()) * this._crackleEnvelope * crackle;
        wetL += crackleSample;
        wetR += crackleSample;
      }

      // Wow and Flutter (pitch modulation simulation via amplitude)
      // Note: Real implementation would use delay lines
      const wowMod = 1 + this._wowLFO.process() * wow * 0.02;
      const flutterMod = 1 + this._flutterLFO.process() * flutter * 0.005;
      
      wetL *= wowMod * flutterMod;
      wetR *= wowMod * flutterMod;

      // Soft clip
      wetL = tanhApprox(wetL);
      wetR = tanhApprox(wetR);

      outputL[i] = dryL * (1 - dryWet) + wetL * dryWet;
      outputR[i] = dryR * (1 - dryWet) + wetR * dryWet;
    }
  }

  private _updateCoeffs(): void {
    const tracingFreq = this._params.get("tracingFreq")?.value ?? 200;
    this._bassFilterL.setFrequency(tracingFreq);
    this._bassFilterR.setFrequency(tracingFreq);
    this._bassFilterL.setQ(0.5);
    this._bassFilterR.setQ(0.5);
    
    // Wow: 0.5-3 Hz
    this._wowLFO.setRate(0.5 + Math.random() * 2.5);
    
    // Flutter: 4-8 Hz  
    this._flutterLFO.setRate(4 + Math.random() * 4);
  }

  async dispose(): Promise<void> {}
}

export function createVinylDistortionDefinition(): PluginDefinition {
  return {
    id: "com.daw.vinyl-distortion",
    name: "Vinyl Distortion",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Turntable and vinyl record emulation",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const vinyl = new VinylDistortionInstance();
      vinyl.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return vinyl;
    },
  };
}
