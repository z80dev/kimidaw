/**
 * Echo - Stereo delay with reverb
 * 
 * Ableton Echo-style delay with:
 * - 2 independent delay lines
 * - Feedback paths with simple reverb
 * - Modulation
 * - Ducking
 * - Gate
 * - Stereo width and linking
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
  import { DelayLine, LFO, EnvelopeFollower, dbToLinear, clamp, lerp } from "../core/DspUtils.js";
  import { AllpassFilter } from "../core/DspUtils.js";

const SYNC_DIVISIONS = ["1/32", "1/16", "1/8", "1/8.", "1/4", "1/4.", "1/2", "1/2.", "1/1"] as const;
const MOD_SHAPES = ["Sine", "Triangle", "Saw", "Square", "Noise"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  // Delay times
  { id: "delayL", name: "Delay L", kind: "float", min: 1, max: 4000, defaultValue: 0.3, unit: "ms" },
  { id: "delayR", name: "Delay R", kind: "float", min: 1, max: 4000, defaultValue: 0.35, unit: "ms" },
  { id: "sync", name: "Sync", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "syncL", name: "Sync L", kind: "enum", min: 0, max: 8, defaultValue: 4, labels: [...SYNC_DIVISIONS] },
  { id: "syncR", name: "Sync R", kind: "enum", min: 0, max: 8, defaultValue: 4, labels: [...SYNC_DIVISIONS] },
  
  // Feedback
  { id: "feedback", name: "Feedback", kind: "float", min: 0, max: 100, defaultValue: 0.4, unit: "%" },
  { id: "feedbackL", name: "Feedback L", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "feedbackR", name: "Feedback R", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  
  // Reverb in feedback path
  { id: "reverb", name: "Reverb", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "reverbTime", name: "Reverb Time", kind: "float", min: 0.1, max: 10, defaultValue: 0.3, unit: "s" },
  
  // Modulation
  { id: "modRate", name: "Mod Rate", kind: "float", min: 0.01, max: 10, defaultValue: 0.2, unit: "Hz" },
  { id: "modAmount", name: "Mod Amount", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "modShape", name: "Mod Shape", kind: "enum", min: 0, max: 4, defaultValue: 0, labels: [...MOD_SHAPES] },
  
  // Ducking
  { id: "ducking", name: "Ducking", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "duckAttack", name: "Duck Attack", kind: "float", min: 0.1, max: 100, defaultValue: 0.1, unit: "ms" },
  { id: "duckRelease", name: "Duck Release", kind: "float", min: 1, max: 1000, defaultValue: 0.3, unit: "ms" },
  
  // Gate
  { id: "gateEnabled", name: "Gate", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "gateThreshold", name: "Gate Threshold", kind: "float", min: -60, max: 0, defaultValue: 0.5, unit: "dB" },
  
  // Stereo
  { id: "stereoWidth", name: "Stereo Width", kind: "float", min: 0, max: 200, defaultValue: 1, unit: "%" },
  { id: "link", name: "Link", kind: "bool", min: 0, max: 1, defaultValue: 1 },
  
  // Output
  { id: "inputGain", name: "Input", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "outputGain", name: "Output", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class EchoInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _tempo = 120;
  private _connected = false;
  
  // Delay lines
  private _delayL: DelayLine;
  private _delayR: DelayLine;
  
  // LFOs for modulation
  private _lfoL = new LFO();
  private _lfoR = new LFO();
  
  // Ducking envelope
  private _duckingEnv = new EnvelopeFollower();
  
  // Reverb (simple allpass chain)
  private _reverbFiltersL: AllpassFilter[] = [];
  private _reverbFiltersR: AllpassFilter[] = [];
  
  // Gate state
  private _gateEnvelope = 1;

  constructor() {
    // 5 second max delay
    this._delayL = new DelayLine(5, this._sampleRate);
    this._delayR = new DelayLine(5, this._sampleRate);
    
    // Initialize reverb filters
    for (let i = 0; i < 4; i++) {
      this._reverbFiltersL.push(new AllpassFilter(347 + i * 113));
      this._reverbFiltersR.push(new AllpassFilter(353 + i * 107));
    }
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._delayL = new DelayLine(5, this._sampleRate);
    this._delayR = new DelayLine(5, this._sampleRate);
    this._lfoL.setSampleRate(this._sampleRate);
    this._lfoR.setSampleRate(this._sampleRate);
    this._duckingEnv.setAttack(1, this._sampleRate);
    this._duckingEnv.setRelease(100, this._sampleRate);
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "modRate" || id === "modShape") {
      this._updateLFO();
    }
    if (id === "duckAttack" || id === "duckRelease") {
      this._updateDucking();
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
      this._updateLFO();
      this._updateDucking();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { 
    const fb = (this._params.get("feedback")?.value ?? 50) / 100;
    const rev = (this._params.get("reverb")?.value ?? 0) / 100;
    const tailSeconds = (1 + rev * 4) / (1 - fb * 0.99);
    return Math.min(this._sampleRate * 10, Math.round(tailSeconds * this._sampleRate));
  }

  reset(): void {
    this._delayL.reset();
    this._delayR.reset();
    this._lfoL.reset();
    this._lfoR.reset();
    for (let i = 0; i < 4; i++) {
      this._reverbFiltersL[i]?.reset();
      this._reverbFiltersR[i]?.reset();
    }
    this._gateEnvelope = 1;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const sync = this._params.get("sync")?.value >= 0.5;
    const link = this._params.get("link")?.value >= 0.5;
    const feedback = (this._params.get("feedback")?.value ?? 50) / 100;
    const fbL = (this._params.get("feedbackL")?.value ?? 50) / 100;
    const fbR = (this._params.get("feedbackR")?.value ?? 50) / 100;
    const reverbAmount = (this._params.get("reverb")?.value ?? 0) / 100;
    const modAmount = (this._params.get("modAmount")?.value ?? 0) / 100;
    const ducking = (this._params.get("ducking")?.value ?? 0) / 100;
    const gateEnabled = this._params.get("gateEnabled")?.value >= 0.5;
    const gateThreshold = this._params.get("gateThreshold")?.value ?? -40;
    const stereoWidth = (this._params.get("stereoWidth")?.value ?? 100) / 100;
    const inputGain = dbToLinear(this._params.get("inputGain")?.value ?? 0);
    const outputGain = dbToLinear(this._params.get("outputGain")?.value ?? 0);
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
    this._updateLFO();

    // Calculate delay times
    let delayTimeL: number;
    let delayTimeR: number;
    
    if (sync) {
      const beatDuration = 60 / this._tempo;
      const divisions = [1/8, 1/4, 3/8, 3/8, 1/2, 3/4, 1, 3/2, 2];
      const syncL = Math.round(this._params.get("syncL")?.value ?? 4);
      const syncR = Math.round(this._params.get("syncR")?.value ?? 4);
      delayTimeL = beatDuration * divisions[syncL] * this._sampleRate;
      delayTimeR = link ? delayTimeL : beatDuration * divisions[syncR] * this._sampleRate;
    } else {
      delayTimeL = (this._params.get("delayL")?.value ?? 400) * this._sampleRate / 1000;
      delayTimeR = link ? delayTimeL : (this._params.get("delayR")?.value ?? 467) * this._sampleRate / 1000;
    }

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i] * inputGain;
      let dryR = inputR[i] * inputGain;

      if (bypass) {
        outputL[i] = dryL * outputGain;
        outputR[i] = dryR * outputGain;
        continue;
      }

      // Calculate modulation
      const modL = 1 + this._lfoL.process() * modAmount * 0.1;
      const modR = 1 + this._lfoR.process() * modAmount * 0.1;

      // Read from delay lines
      const delayedL = this._delayL.read(delayTimeL * modL);
      const delayedR = this._delayR.read(delayTimeR * modR);

      // Apply reverb to feedback path
      let verbL = delayedL;
      let verbR = delayedR;
      for (let j = 0; j < 4; j++) {
        verbL = this._reverbFiltersL[j]?.process(verbL, 0.7) ?? verbL;
        verbR = this._reverbFiltersR[j]?.process(verbR, 0.7) ?? verbR;
      }

      // Mix reverb into delay
      const wetL = delayedL + (verbL - delayedL) * reverbAmount;
      const wetR = delayedR + (verbR - delayedR) * reverbAmount;

      // Calculate ducking
      let duckGain = 1;
      if (ducking > 0) {
        const inputLevel = Math.max(Math.abs(dryL), Math.abs(dryR));
        const env = this._duckingEnv.process(inputLevel);
        duckGain = 1 - Math.min(1, env * ducking * 10);
      }

      // Apply gate if enabled
      if (gateEnabled) {
        const level = Math.max(Math.abs(wetL), Math.abs(wetR));
        const levelDb = level > 0.00001 ? 20 * Math.log10(level) : -100;
        const targetGate = levelDb > gateThreshold ? 1 : 0;
        this._gateEnvelope += (targetGate - this._gateEnvelope) * 0.1;
      } else {
        this._gateEnvelope = 1;
      }

      // Feedback
      const feedbackL = wetL * (link ? feedback : fbL) * duckGain * this._gateEnvelope;
      const feedbackR = wetR * (link ? feedback : fbR) * duckGain * this._gateEnvelope;

      // Write to delay lines
      this._delayL.write(dryL + feedbackL);
      this._delayR.write(dryR + feedbackR);

      // Apply stereo width
      let outL = wetL;
      let outR = wetR;
      
      if (stereoWidth !== 1) {
        const mid = (wetL + wetR) * 0.5;
        const side = (wetL - wetR) * 0.5 * stereoWidth;
        outL = mid + side;
        outR = mid - side;
      }

      // Mix dry/wet
      outputL[i] = (dryL * (1 - dryWet) + outL * dryWet) * outputGain;
      outputR[i] = (dryR * (1 - dryWet) + outR * dryWet) * outputGain;
    }
  }

  private _updateLFO(): void {
    const rate = this._params.get("modRate")?.value ?? 1;
    const shapeIndex = Math.round(this._params.get("modShape")?.value ?? 0);
    const shapes: Array<"sine" | "triangle" | "saw" | "square" | "noise"> = 
      ["sine", "triangle", "saw", "square", "noise"];
    
    this._lfoL.setRate(rate);
    this._lfoR.setRate(rate);
    this._lfoL.setWaveform(shapes[shapeIndex] ?? "sine");
    this._lfoR.setWaveform(shapes[shapeIndex] ?? "sine");
    
    // Phase offset for stereo
    this._lfoR.setPhase(0.25);
  }

  private _updateDucking(): void {
    const attackMs = this._params.get("duckAttack")?.value ?? 0.1;
    const releaseMs = this._params.get("duckRelease")?.value ?? 100;
    this._duckingEnv.setAttack(attackMs, this._sampleRate);
    this._duckingEnv.setRelease(releaseMs, this._sampleRate);
  }

  async dispose(): Promise<void> {}

  setTempo(bpm: number): void {
    this._tempo = bpm;
  }
}

export function createEchoDefinition(): PluginDefinition {
  return {
    id: "com.daw.echo",
    name: "Echo",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Stereo delay with modulation, reverb, and ducking",
    parameters: PARAMETERS,
    ui: { 
      type: "generic",
      layout: [
        { title: "Delay", parameters: ["delayL", "delayR", "sync", "syncL", "syncR", "link"], layout: "vertical" },
        { title: "Feedback", parameters: ["feedback", "feedbackL", "feedbackR", "reverb", "reverbTime"], layout: "vertical" },
        { title: "Modulation", parameters: ["modRate", "modAmount", "modShape"], layout: "vertical" },
        { title: "Dynamics", parameters: ["ducking", "duckAttack", "duckRelease", "gateEnabled", "gateThreshold"], layout: "vertical" },
        { title: "Output", parameters: ["stereoWidth", "inputGain", "outputGain", "dryWet", "bypass"], layout: "vertical" }
      ]
    },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const echo = new EchoInstance();
      echo.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return echo;
    },
  };
}
