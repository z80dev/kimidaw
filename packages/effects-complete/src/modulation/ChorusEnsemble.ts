/**
 * Chorus-Ensemble - Advanced chorus effect
 * 
 * Multi-mode chorus with:
 * - Classic, Ensemble, and Vibrato modes
 * - Adjustable delay, rate, amount, feedback
 * - Spread for stereo width
 * - High pass filter
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
import { DelayLine, LFO, BiquadFilter } from "../core/AdvancedFilters.js";
import { dbToLinear, clamp, lerp } from "../core/DspUtils.js";

const MODES = ["Classic", "Ensemble", "Vibrato"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "mode", name: "Mode", kind: "enum", min: 0, max: 2, defaultValue: 0, labels: [...MODES] },
  { id: "amount", name: "Amount", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  { id: "rate", name: "Rate", kind: "float", min: 0.01, max: 10, defaultValue: 0.2, unit: "Hz" },
  { id: "delay", name: "Delay", kind: "float", min: 0.1, max: 20, defaultValue: 0.3, unit: "ms" },
  { id: "feedback", name: "Feedback", kind: "float", min: 0, max: 90, defaultValue: 0.2, unit: "%" },
  { id: "spread", name: "Spread", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "hpf", name: "High Pass", kind: "float", min: 20, max: 1000, defaultValue: 0, unit: "Hz" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class ChorusEnsembleInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Delay lines (multiple for ensemble mode)
  private _delaysL: DelayLine[] = [];
  private _delaysR: DelayLine[] = [];
  
  // LFOs
  private _lfos: LFO[] = [];
  
  // High pass filter
  private _hpfL = new BiquadFilter();
  private _hpfR = new BiquadFilter();
  
  // Feedback
  private _feedbackL = 0;
  private _feedbackR = 0;

  constructor() {
    // Create 3 delay lines for ensemble mode
    for (let i = 0; i < 3; i++) {
      this._delaysL.push(new DelayLine(0.05, this._sampleRate));
      this._delaysR.push(new DelayLine(0.05, this._sampleRate));
      this._lfos.push(new LFO(this._sampleRate));
    }
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    
    for (let i = 0; i < 3; i++) {
      this._delaysL[i] = new DelayLine(0.05, this._sampleRate);
      this._delaysR[i] = new DelayLine(0.05, this._sampleRate);
      this._lfos[i].setSampleRate(this._sampleRate);
    }
    
    this._hpfL.setSampleRate(this._sampleRate);
    this._hpfR.setSampleRate(this._sampleRate);
    this._hpfL.setType("highpass12");
    this._hpfR.setType("highpass12");
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "hpf") {
      this._updateHPF();
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
      this._updateHPF();
    }
  }

  getLatencySamples(): number { 
    // Delay compensation for minimum delay
    const delayMs = this._params.get("delay")?.value ?? 5;
    return Math.round(delayMs * this._sampleRate / 2000);
  }
  
  getTailSamples(): number { 
    const feedback = (this._params.get("feedback")?.value ?? 20) / 100;
    return Math.round(this._sampleRate * feedback * 2);
  }

  reset(): void {
    for (let i = 0; i < 3; i++) {
      this._delaysL[i].reset();
      this._delaysR[i].reset();
      this._lfos[i].reset();
    }
    this._hpfL.reset();
    this._hpfR.reset();
    this._feedbackL = 0;
    this._feedbackR = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const mode = MODES[Math.round(this._params.get("mode")?.value ?? 0)];
    const amount = (this._params.get("amount")?.value ?? 30) / 100;
    const rate = this._params.get("rate")?.value ?? 1;
    const delayMs = this._params.get("delay")?.value ?? 5;
    const feedback = (this._params.get("feedback")?.value ?? 20) / 100;
    const spread = (this._params.get("spread")?.value ?? 50) / 100;
    const hpf = this._params.get("hpf")?.value ?? 20;
    const dryWet = (this._params.get("dryWet")?.value ?? 50) / 100;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();
    this._updateHPF();

    // Update LFOs
    const numVoices = mode === "Ensemble" ? 3 : 1;
    for (let i = 0; i < numVoices; i++) {
      this._lfos[i].setRate(rate * (1 + i * 0.1 * spread));
      this._lfos[i].setWaveform("triangle");
    }

    const baseDelaySamples = delayMs * this._sampleRate / 1000;
    const modDepth = amount * baseDelaySamples * 0.5;

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL;
        outputR[i] = dryR;
        continue;
      }

      // High pass filter
      if (hpf > 20) {
        dryL = this._hpfL.process(dryL);
        dryR = this._hpfR.process(dryR);
      }

      let wetL = 0;
      let wetR = 0;

      // Process based on mode
      if (mode === "Ensemble") {
        // 3 voice ensemble
        for (let v = 0; v < 3; v++) {
          const lfo = this._lfos[v].process();
          const delayL = baseDelaySamples + lfo * modDepth * (1 + v * 0.5);
          const delayR = baseDelaySamples + lfo * modDepth * (1 + v * 0.5);
          
          wetL += this._delaysL[v].read(delayL);
          wetR += this._delaysR[v].read(delayR);
          
          this._delaysL[v].write(dryL + this._feedbackL * feedback);
          this._delaysR[v].write(dryR + this._feedbackR * feedback);
        }
        wetL /= 3;
        wetR /= 3;
      } else {
        // Classic or Vibrato (single voice)
        const lfo = this._lfos[0].process();
        const delayL = baseDelaySamples + lfo * modDepth;
        const delayR = baseDelaySamples + lfo * modDepth;
        
        wetL = this._delaysL[0].read(delayL);
        wetR = this._delaysR[0].read(delayR);
        
        this._delaysL[0].write(dryL + this._feedbackL * feedback);
        this._delaysR[0].write(dryR + this._feedbackR * feedback);
      }

      // Update feedback
      this._feedbackL = wetL;
      this._feedbackR = wetR;

      // Vibrato mode: no dry signal
      if (mode === "Vibrato") {
        dryL = 0;
        dryR = 0;
      }

      outputL[i] = dryL * (1 - dryWet) + wetL * dryWet;
      outputR[i] = dryR * (1 - dryWet) + wetR * dryWet;
    }
  }

  private _updateHPF(): void {
    const freq = this._params.get("hpf")?.value ?? 20;
    this._hpfL.setFrequency(freq);
    this._hpfR.setFrequency(freq);
    this._hpfL.setQ(0.707);
    this._hpfR.setQ(0.707);
  }

  async dispose(): Promise<void> {}
}

export function createChorusEnsembleDefinition(): PluginDefinition {
  return {
    id: "com.daw.chorus-ensemble",
    name: "Chorus-Ensemble",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Advanced chorus with ensemble and vibrato modes",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const chorus = new ChorusEnsembleInstance();
      chorus.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return chorus;
    },
  };
}
