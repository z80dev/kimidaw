/**
 * FM Synthesizer (MVP)
 * 
 * 4-operator FM synthesis with algorithm selection.
 * Based on engineering spec section 10.6 (MVP implementation)
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  PluginParameterSpec,
  MidiEvent,
  AudioBuffer,
} from "@daw/plugin-api";
import { createParameterMap } from "@daw/plugin-api";
import { 
  VoiceBase, 
  VoiceAllocator,
  ADSREnvelope,
  dbToLinear,
} from "../../core/DspBase.js";

// FM Algorithms (4-operator)
// 0: 1->2->3->4 (serial)
// 1: (1+2)->3->4
// 2: 1->(2+3)->4
// 3: (1+2+3)->4
// 4: (1->2) + (3->4)
// 5: 1->2 + 3 + 4
// 6: 1 + 2 + 3 + 4 (parallel)

const PARAMETERS: PluginParameterSpec[] = [
  { id: "algorithm", name: "Algorithm", kind: "enum", min: 0, max: 6, defaultValue: 0, 
    labels: ["Serial", "2->3", "1->(2+3)", "3->4", "2x2", "2+2", "Parallel"] },
  
  // Operator 1 (Carrier or modulator)
  { id: "op1Ratio", name: "Op1 Ratio", kind: "float", min: 0.25, max: 16, defaultValue: 0.15 },
  { id: "op1Level", name: "Op1 Level", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "op1Attack", name: "Op1 Attack", kind: "float", min: 0, max: 5000, defaultValue: 0.01, unit: "ms" },
  { id: "op1Decay", name: "Op1 Decay", kind: "float", min: 0, max: 5000, defaultValue: 0.2, unit: "ms" },
  { id: "op1Sustain", name: "Op1 Sustain", kind: "float", min: 0, max: 100, defaultValue: 0.8, unit: "%" },
  { id: "op1Release", name: "Op1 Release", kind: "float", min: 0, max: 10000, defaultValue: 0.3, unit: "ms" },
  
  // Operator 2
  { id: "op2Ratio", name: "Op2 Ratio", kind: "float", min: 0.25, max: 16, defaultValue: 0.5 },
  { id: "op2Level", name: "Op2 Level", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "op2Attack", name: "Op2 Attack", kind: "float", min: 0, max: 5000, defaultValue: 0.01, unit: "ms" },
  { id: "op2Decay", name: "Op2 Decay", kind: "float", min: 0, max: 5000, defaultValue: 0.2, unit: "ms" },
  { id: "op2Sustain", name: "Op2 Sustain", kind: "float", min: 0, max: 100, defaultValue: 0.8, unit: "%" },
  { id: "op2Release", name: "Op2 Release", kind: "float", min: 0, max: 10000, defaultValue: 0.3, unit: "ms" },
  
  // Operator 3
  { id: "op3Ratio", name: "Op3 Ratio", kind: "float", min: 0.25, max: 16, defaultValue: 0.25 },
  { id: "op3Level", name: "Op3 Level", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  { id: "op3Attack", name: "Op3 Attack", kind: "float", min: 0, max: 5000, defaultValue: 0.01, unit: "ms" },
  { id: "op3Decay", name: "Op3 Decay", kind: "float", min: 0, max: 5000, defaultValue: 0.2, unit: "ms" },
  { id: "op3Sustain", name: "Op3 Sustain", kind: "float", min: 0, max: 100, defaultValue: 0.8, unit: "%" },
  { id: "op3Release", name: "Op3 Release", kind: "float", min: 0, max: 10000, defaultValue: 0.3, unit: "ms" },
  
  // Operator 4
  { id: "op4Ratio", name: "Op4 Ratio", kind: "float", min: 0.25, max: 16, defaultValue: 0.4 },
  { id: "op4Level", name: "Op4 Level", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "op4Attack", name: "Op4 Attack", kind: "float", min: 0, max: 5000, defaultValue: 0.01, unit: "ms" },
  { id: "op4Decay", name: "Op4 Decay", kind: "float", min: 0, max: 5000, defaultValue: 0.2, unit: "ms" },
  { id: "op4Sustain", name: "Op4 Sustain", kind: "float", min: 0, max: 100, defaultValue: 0.8, unit: "%" },
  { id: "op4Release", name: "Op4 Release", kind: "float", min: 0, max: 10000, defaultValue: 0.3, unit: "ms" },
  
  // Global
  { id: "feedback", name: "Feedback", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "masterGain", name: "Gain", kind: "float", min: -96, max: 12, defaultValue: 0.75, unit: "dB" },
];

// FM Operator
class FMOperator {
  phase = 0;
  private _env: ADSREnvelope;
  private _freq = 440;
  private _ratio = 1;
  private _sampleRate = 48000;

  constructor(sampleRate = 48000) {
    this._env = new ADSREnvelope({}, sampleRate);
    this._sampleRate = sampleRate;
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._env.setSampleRate(sr);
  }

  setFrequency(baseFreq: number): void {
    this._freq = baseFreq * this._ratio;
  }

  setRatio(ratio: number): void {
    this._ratio = ratio;
  }

  setEnvelopeConfig(config: { attack: number; decay: number; sustain: number; release: number }): void {
    this._env.setConfig(config);
  }

  trigger(): void {
    this._env.trigger();
  }

  release(): void {
    this._env.release();
  }

  stop(): void {
    this._env.stop();
    this.phase = 0;
  }

  isActive(): boolean {
    return this._env.isActive || this._env.level > 0.0001;
  }

  process(modulation = 0): number {
    const phaseIncrement = this._freq / this._sampleRate;
    this.phase += phaseIncrement + modulation;
    while (this.phase >= 1) this.phase -= 1;
    while (this.phase < 0) this.phase += 1;
    
    const env = this._env.process();
    return Math.sin(this.phase * 2 * Math.PI) * env;
  }

  get level(): number {
    return this._env.level;
  }
}

class FMVoice extends VoiceBase {
  private _ops: FMOperator[];
  private _baseFreq = 440;
  private _sampleRate = 48000;
  private _params: Map<string, number> = new Map();
  private _algorithm = 0;
  private _feedback = 0;
  private _lastOp1 = 0;

  constructor(sampleRate = 48000) {
    super();
    this._sampleRate = sampleRate;
    this._ops = [
      new FMOperator(sampleRate),
      new FMOperator(sampleRate),
      new FMOperator(sampleRate),
      new FMOperator(sampleRate),
    ];
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    for (const op of this._ops) op.setSampleRate(sr);
  }

  setParams(params: Map<string, number>): void {
    this._params = params;
    this._algorithm = Math.round(params.get("algorithm") ?? 0);
    this._feedback = (params.get("feedback") ?? 0) / 100;
    
    // Update operator ratios and envelopes
    for (let i = 0; i < 4; i++) {
      const opNum = i + 1;
      this._ops[i].setRatio(params.get(`op${opNum}Ratio`) ?? 1);
      this._ops[i].setFrequency(this._baseFreq);
      this._ops[i].setEnvelopeConfig({
        attack: (params.get(`op${opNum}Attack`) ?? 10) / 1000,
        decay: (params.get(`op${opNum}Decay`) ?? 200) / 1000,
        sustain: (params.get(`op${opNum}Sustain`) ?? 80) / 100,
        release: (params.get(`op${opNum}Release`) ?? 300) / 1000,
      });
    }
  }

  trigger(note: number, velocity: number): void {
    this.note = note;
    this.velocity = velocity;
    this.active = true;
    this.age = 0;
    this._baseFreq = 440 * Math.pow(2, (note - 69) / 12);
    
    for (const op of this._ops) {
      op.setFrequency(this._baseFreq);
      op.trigger();
    }
  }

  release(): void {
    for (const op of this._ops) op.release();
  }

  stop(): void {
    for (const op of this._ops) op.stop();
    this.active = false;
  }

  isFinished(): boolean {
    return !this.active || !this._ops.some(op => op.isActive());
  }

  process(left: Float32Array, right: Float32Array, offset: number, count: number): void {
    if (!this.active) return;

    const levels = [
      (this._params.get("op1Level") ?? 100) / 100,
      (this._params.get("op2Level") ?? 50) / 100,
      (this._params.get("op3Level") ?? 30) / 100,
      (this._params.get("op4Level") ?? 0) / 100,
    ];

    for (let i = 0; i < count; i++) {
      let sample = 0;

      switch (this._algorithm) {
        case 0: // Serial: 1->2->3->4
          { const m1 = this._ops[0].process(this._lastOp1 * this._feedback) * levels[0] * 2;
            const m2 = this._ops[1].process(m1) * levels[1] * 2;
            const m3 = this._ops[2].process(m2) * levels[2] * 2;
            sample = this._ops[3].process(m3) * levels[3];
            this._lastOp1 = this._ops[0].level; }
          break;

        case 1: // (1+2)->3->4
          { const m1 = this._ops[0].process() * levels[0];
            const m2 = this._ops[1].process() * levels[1];
            const m3 = this._ops[2].process(m1 + m2) * levels[2] * 2;
            sample = this._ops[3].process(m3) * levels[3];
            this._lastOp1 = this._ops[0].level; }
          break;

        case 2: // 1->(2+3)->4
          { const m1 = this._ops[0].process(this._lastOp1 * this._feedback) * levels[0] * 2;
            const m2 = this._ops[1].process(m1) * levels[1];
            const m3 = this._ops[2].process(m1) * levels[2];
            sample = this._ops[3].process(m2 + m3) * levels[3];
            this._lastOp1 = this._ops[0].level; }
          break;

        case 3: // (1+2+3)->4
          { const m1 = this._ops[0].process() * levels[0];
            const m2 = this._ops[1].process() * levels[1];
            const m3 = this._ops[2].process() * levels[2];
            sample = this._ops[3].process((m1 + m2 + m3) * 2) * levels[3];
            this._lastOp1 = this._ops[0].level; }
          break;

        case 4: // (1->2) + (3->4)
          { const m1 = this._ops[0].process(this._lastOp1 * this._feedback) * levels[0] * 2;
            const c1 = this._ops[1].process(m1) * levels[1];
            const m2 = this._ops[2].process() * levels[2] * 2;
            const c2 = this._ops[3].process(m2) * levels[3];
            sample = c1 + c2;
            this._lastOp1 = this._ops[0].level; }
          break;

        case 5: // 1->2 + 3 + 4
          { const m1 = this._ops[0].process(this._lastOp1 * this._feedback) * levels[0] * 2;
            const c1 = this._ops[1].process(m1) * levels[1];
            const c2 = this._ops[2].process() * levels[2];
            const c3 = this._ops[3].process() * levels[3];
            sample = c1 + c2 + c3;
            this._lastOp1 = this._ops[0].level; }
          break;

        case 6: // Parallel: 1 + 2 + 3 + 4
        default:
          sample = this._ops[0].process() * levels[0] +
                   this._ops[1].process() * levels[1] +
                   this._ops[2].process() * levels[2] +
                   this._ops[3].process() * levels[3];
          break;
      }

      // Scale down to prevent clipping
      sample *= 0.5;

      const idx = offset + i;
      left[idx] += sample;
      right[idx] += sample;
    }
  }
}

export class FMSynthInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _voices: FMVoice[];
  private _voiceAllocator: VoiceAllocator<FMVoice>;
  
  private _sampleRate = 48000;
  private _blockSize = 128;
  private _leftBuffer: Float32Array;
  private _rightBuffer: Float32Array;
  private _connected = false;

  constructor(maxVoices = 16, maxBlockSize = 128) {
    this._voices = [];
    for (let i = 0; i < maxVoices; i++) {
      this._voices.push(new FMVoice(48000));
    }
    this._voiceAllocator = new VoiceAllocator(this._voices);
    this._leftBuffer = new Float32Array(maxBlockSize);
    this._rightBuffer = new Float32Array(maxBlockSize);
  }

  connect(graph: PluginConnectionGraph): void {
    if (graph.midiInput) {
      graph.midiInput.onReceive?.((event: MidiEvent) => this._handleMidi(event));
    }
    this._connected = true;
  }

  disconnect(): void {
    this._voiceAllocator.stopAll();
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
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
    }
  }

  getLatencySamples(): number { return 0; }
  
  getTailSamples(): number {
    const maxRelease = Math.max(
      this._params.get("op1Release")?.value ?? 300,
      this._params.get("op2Release")?.value ?? 300,
      this._params.get("op3Release")?.value ?? 300,
      this._params.get("op4Release")?.value ?? 300
    );
    return Math.ceil((maxRelease / 1000) * this._sampleRate);
  }

  reset(): void {
    this._voiceAllocator.stopAll();
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._blockSize = config.blockSize;
    
    if (this._leftBuffer.length < config.blockSize) {
      this._leftBuffer = new Float32Array(config.blockSize);
      this._rightBuffer = new Float32Array(config.blockSize);
    }
    
    for (const voice of this._voices) {
      voice.setSampleRate(config.sampleRate);
    }
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: MidiEvent[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    this._leftBuffer.fill(0, 0, blockSize);
    this._rightBuffer.fill(0, 0, blockSize);

    for (const event of midi) this._handleMidi(event);
    this._params.processSmoothing();

    const paramsMap = new Map(Object.entries(this._params.getValues()));
    for (const voice of this._voices) {
      if (voice.active) voice.setParams(paramsMap);
    }

    this._voiceAllocator.process(this._leftBuffer, this._rightBuffer, 0, blockSize);

    const gain = dbToLinear(this._params.get("masterGain")?.value ?? 0);
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].getChannelData(1) ?? outputL;

    for (let i = 0; i < blockSize; i++) {
      outputL[i] = this._leftBuffer[i] * gain;
      outputR[i] = this._rightBuffer[i] * gain;
    }
  }

  async dispose(): Promise<void> {
    this._voiceAllocator.stopAll();
  }

  private _handleMidi(event: MidiEvent): void {
    if (event.type === "noteOn") {
      if (event.data.velocity === 0) {
        this._voiceAllocator.release(event.data.note);
      } else {
        const voice = this._voiceAllocator.allocate(event.data.note, event.data.velocity);
        if (voice) voice.setParams(new Map(Object.entries(this._params.getValues())));
      }
    } else if (event.type === "noteOff") {
      this._voiceAllocator.release(event.data.note);
    }
  }
}

export function createFMSynthDefinition(): PluginDefinition {
  return {
    id: "com.daw.fmsynth",
    name: "FM Synth",
    category: "instrument",
    version: "1.0.0",
    vendor: "DAW",
    description: "4-operator FM synthesizer with multiple algorithms",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 0,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const synth = new FMSynthInstance(16, ctx.maxBlockSize);
      synth.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return synth;
    },
  };
}
