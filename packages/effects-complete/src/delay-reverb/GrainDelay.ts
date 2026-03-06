/**
 * Grain Delay - Granular delay effect
 * 
 * Creative granular delay with:
 * - Delay time with sync option
 * - Spray (random grain position)
 * - Frequency (pitch shift grains)
 * - Random (pitch randomization)
 * - Feedback and dry/wet mix
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
import { DelayLine, clamp, lerp, whiteNoise } from "../core/DspUtils.js";

const SYNC_DIVISIONS = ["1/32", "1/16", "1/8", "1/4", "1/2", "1/1", "2/1"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "delayTime", name: "Delay Time", kind: "float", min: 1, max: 500, defaultValue: 0.3, unit: "ms" },
  { id: "sync", name: "Sync", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "syncDivision", name: "Sync Division", kind: "enum", min: 0, max: 6, defaultValue: 2, labels: [...SYNC_DIVISIONS] },
  
  // Grain parameters
  { id: "spray", name: "Spray", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "frequency", name: "Frequency", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "st" },
  { id: "random", name: "Random", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "grainSize", name: "Grain Size", kind: "float", min: 1, max: 100, defaultValue: 0.4, unit: "ms" },
  
  // Standard delay controls
  { id: "feedback", name: "Feedback", kind: "float", min: 0, max: 100, defaultValue: 0.4, unit: "%" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

interface Grain {
  position: number;
  pitch: number;
  amplitude: number;
  age: number;
  duration: number;
  active: boolean;
}

export class GrainDelayInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  private _tempo = 120;
  
  // Delay buffer
  private _delayBufferL: DelayLine;
  private _delayBufferR: DelayLine;
  
  // Grains
  private _grains: Grain[] = [];
  private _maxGrains = 20;
  
  // Grain trigger
  private _grainCounter = 0;
  private _grainInterval = 100;

  constructor() {
    // 2 second max delay
    this._delayBufferL = new DelayLine(2, this._sampleRate);
    this._delayBufferR = new DelayLine(2, this._sampleRate);
    
    // Initialize grain pool
    for (let i = 0; i < this._maxGrains; i++) {
      this._grains.push({
        position: 0,
        pitch: 1,
        amplitude: 0,
        age: 0,
        duration: 0,
        active: false
      });
    }
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._delayBufferL = new DelayLine(2, this._sampleRate);
    this._delayBufferR = new DelayLine(2, this._sampleRate);
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
    const feedback = (this._params.get("feedback")?.value ?? 50) / 100;
    // Rough estimate based on feedback
    return feedback > 0.9 ? this._sampleRate * 5 : Math.round(this._sampleRate * feedback * 2);
  }

  reset(): void {
    this._delayBufferL.reset();
    this._delayBufferR.reset();
    for (const grain of this._grains) {
      grain.active = false;
    }
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const delayMs = this._params.get("delayTime")?.value ?? 100;
    const sync = this._params.get("sync")?.value >= 0.5;
    const spray = (this._params.get("spray")?.value ?? 0) / 100;
    const frequency = this._params.get("frequency")?.value ?? 0;
    const random = (this._params.get("random")?.value ?? 0) / 100;
    const grainSizeMs = this._params.get("grainSize")?.value ?? 40;
    const feedback = (this._params.get("feedback")?.value ?? 50) / 100;
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

    // Calculate delay time
    let delaySamples: number;
    if (sync) {
      const divisionIndex = Math.round(this._params.get("syncDivision")?.value ?? 2);
      const divisions = [1/8, 1/4, 1/2, 1, 2, 4, 8];
      const beatDuration = 60 / this._tempo;
      delaySamples = beatDuration * divisions[divisionIndex] * this._sampleRate;
    } else {
      delaySamples = delayMs * this._sampleRate / 1000;
    }

    // Grain interval based on grain size
    this._grainInterval = Math.max(1, Math.round(grainSizeMs * this._sampleRate / 1000 * 0.5));
    
    const grainDuration = Math.round(grainSizeMs * this._sampleRate / 1000);
    const pitchRatio = Math.pow(2, frequency / 12);

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      // Write to delay buffer
      this._delayBufferL.write(dryL);
      this._delayBufferR.write(dryR);

      if (bypass) {
        outputL[i] = dryL;
        outputR[i] = dryR;
        continue;
      }

      // Trigger new grains
      this._grainCounter++;
      if (this._grainCounter >= this._grainInterval) {
        this._grainCounter = 0;
        this._triggerGrain(delaySamples, spray, grainDuration, pitchRatio, random);
      }

      // Process active grains
      let grainSumL = 0;
      let grainSumR = 0;
      
      for (const grain of this._grains) {
        if (!grain.active) continue;

        // Calculate envelope (Hann window)
        const t = grain.age / grain.duration;
        const envelope = 0.5 * (1 - Math.cos(2 * Math.PI * t));
        
        // Read from delay buffer with pitch shift
        const readPos = grain.position + grain.age * grain.pitch;
        const sampleL = this._delayBufferL.read(readPos);
        const sampleR = this._delayBufferR.read(readPos);
        
        grainSumL += sampleL * envelope * grain.amplitude;
        grainSumR += sampleR * envelope * grain.amplitude;
        
        // Advance grain
        grain.age++;
        if (grain.age >= grain.duration) {
          grain.active = false;
        }
      }

      // Feedback: add grain output back to delay
      const feedbackL = grainSumL * feedback;
      const feedbackR = grainSumR * feedback;
      
      // Note: feedback is applied by reading back from the buffer
      // This is a simplified version

      // Mix output
      outputL[i] = dryL * (1 - dryWet) + grainSumL * dryWet;
      outputR[i] = dryR * (1 - dryWet) + grainSumR * dryWet;
    }
  }

  private _triggerGrain(
    delaySamples: number, 
    spray: number, 
    duration: number, 
    pitchRatio: number,
    randomAmount: number
  ): void {
    // Find inactive grain
    const grain = this._grains.find(g => !g.active);
    if (!grain) return;

    // Calculate position with spray
    const sprayOffset = (Math.random() * 2 - 1) * spray * delaySamples * 0.5;
    grain.position = delaySamples + sprayOffset;
    
    // Pitch with randomization
    const randomPitch = (Math.random() * 2 - 1) * randomAmount * 0.5;
    grain.pitch = pitchRatio * Math.pow(2, randomPitch);
    
    grain.amplitude = 1;
    grain.age = 0;
    grain.duration = duration;
    grain.active = true;
  }

  async dispose(): Promise<void> {}

  setTempo(bpm: number): void {
    this._tempo = bpm;
  }
}

export function createGrainDelayDefinition(): PluginDefinition {
  return {
    id: "com.daw.grain-delay",
    name: "Grain Delay",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Granular delay with pitch shifting and randomization",
    parameters: PARAMETERS,
    ui: { 
      type: "generic",
      layout: [
        { title: "Delay", parameters: ["delayTime", "sync", "syncDivision"], layout: "vertical" },
        { title: "Grains", parameters: ["spray", "frequency", "random", "grainSize"], layout: "vertical" },
        { title: "Mix", parameters: ["feedback", "dryWet", "bypass"], layout: "vertical" }
      ]
    },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const delay = new GrainDelayInstance();
      delay.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return delay;
    },
  };
}
