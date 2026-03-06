/**
 * Chorus
 * 
 * Stereo chorus effect using modulated delay lines.
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
import { DelayLine, lerp } from "../core/DspBase.js";

const PARAMETERS: PluginParameterSpec[] = [
  { id: "rate", name: "Rate", kind: "float", min: 0.01, max: 10, defaultValue: 0.3, unit: "Hz" },
  { id: "depth", name: "Depth", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  { id: "delay", name: "Delay", kind: "float", min: 1, max: 50, defaultValue: 0.2, unit: "ms" },
  { id: "feedback", name: "Feedback", kind: "float", min: 0, max: 80, defaultValue: 0, unit: "%" },
  { id: "mix", name: "Mix", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  { id: "stereoSpread", name: "Spread", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "voices", name: "Voices", kind: "enum", min: 0, max: 2, defaultValue: 0, labels: ["2", "4", "6"] },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class ChorusInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Delay lines for each voice (3 stereo pairs max)
  private _delays: DelayLine[] = [];
  private _lfoPhases = [0, 0, 0]; // Phases for voice pairs

  constructor() {
    // Create 6 delay lines (3 stereo pairs)
    for (let i = 0; i < 6; i++) {
      this._delays.push(new DelayLine(0.1, 48000));
    }
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    for (const d of this._delays) {
      d.setSampleRate(config.sampleRate);
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
    const delayMs = this._params.get("delay")?.value ?? 20;
    const feedback = (this._params.get("feedback")?.value ?? 0) / 100;
    if (feedback < 0.01) return Math.ceil(delayMs / 1000 * this._sampleRate);
    const iterations = Math.log(0.001) / Math.log(feedback);
    return Math.ceil((delayMs * iterations) / 1000 * this._sampleRate);
  }

  reset(): void {
    for (const d of this._delays) d.reset();
    this._lfoPhases = [0, 0, 0];
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const rate = this._params.get("rate")?.value ?? 1;
    const depth = (this._params.get("depth")?.value ?? 30) / 100;
    const baseDelayMs = this._params.get("delay")?.value ?? 20;
    const feedback = (this._params.get("feedback")?.value ?? 0) / 100;
    const mix = (this._params.get("mix")?.value ?? 30) / 100;
    const spread = (this._params.get("stereoSpread")?.value ?? 50) / 100;
    const voiceCount = [2, 4, 6][Math.round(this._params.get("voices")?.value ?? 0)];

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 ? inputs[0].getChannelData(1) : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 ? outputs[0].getChannelData(1) : outputL;

    this._params.processSmoothing();

    const lfoIncrement = rate / this._sampleRate;

    for (let i = 0; i < blockSize; i++) {
      const inL = inputL[i];
      const inR = inputR[i];

      if (bypass) {
        outputL[i] = inL;
        outputR[i] = inR;
        continue;
      }

      // Update LFO phases
      for (let v = 0; v < 3; v++) {
        this._lfoPhases[v] += lfoIncrement;
        while (this._lfoPhases[v] >= 1) this._lfoPhases[v] -= 1;
      }

      // Calculate modulated delay times
      // Voice 0: sine
      const mod0 = Math.sin(this._lfoPhases[0] * 2 * Math.PI);
      // Voice 1: cosine (90 deg offset)
      const mod1 = Math.cos(this._lfoPhases[0] * 2 * Math.PI);
      // Voice 2: sine, slower
      const mod2 = Math.sin(this._lfoPhases[1] * 2 * Math.PI * 0.7);
      // Voice 3: cosine
      const mod3 = Math.cos(this._lfoPhases[1] * 2 * Math.PI * 0.7);
      // Voice 4: sine, even slower
      const mod4 = Math.sin(this._lfoPhases[2] * 2 * Math.PI * 0.5);
      // Voice 5: cosine
      const mod5 = Math.cos(this._lfoPhases[2] * 2 * Math.PI * 0.5);

      const baseDelaySamples = baseDelayMs / 1000 * this._sampleRate;
      const maxModSamples = depth * 10 / 1000 * this._sampleRate; // ±10ms max modulation

      const delays = [
        baseDelaySamples + mod0 * maxModSamples,
        baseDelaySamples + mod1 * maxModSamples * (1 + spread * 0.5),
        baseDelaySamples + mod2 * maxModSamples,
        baseDelaySamples + mod3 * maxModSamples * (1 + spread * 0.5),
        baseDelaySamples + mod4 * maxModSamples,
        baseDelaySamples + mod5 * maxModSamples * (1 + spread * 0.5),
      ];

      // Process voices
      let chorusL = 0;
      let chorusR = 0;

      for (let v = 0; v < voiceCount; v += 2) {
        // Left channel voices
        const delayedL = this._delays[v].read(delays[v]);
        chorusL += delayedL;
        this._delays[v].write(inL + delayedL * feedback);

        // Right channel voices (offset by 1)
        if (v + 1 < voiceCount) {
          const delayedR = this._delays[v + 1].read(delays[v + 1]);
          chorusR += delayedR;
          this._delays[v + 1].write(inR + delayedR * feedback);
        }
      }

      // Average voices
      chorusL /= (voiceCount / 2);
      chorusR /= (voiceCount / 2);

      // Mix dry/wet
      outputL[i] = inL * (1 - mix) + chorusL * mix;
      outputR[i] = inR * (1 - mix) + chorusR * mix;
    }
  }

  async dispose(): Promise<void> {}
}

export function createChorusDefinition(): PluginDefinition {
  return {
    id: "com.daw.chorus",
    name: "Chorus",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Stereo chorus with multiple voices",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const chorus = new ChorusInstance();
      chorus.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return chorus;
    },
  };
}
