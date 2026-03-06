/**
 * Erosion - Degradation effect
 * 
 * Adds digital artifacts and noise:
 * - Mode: Noise, Sine, Wide
 * - Frequency control for noise/sine
 * - Amount for intensity
 * - Width and Wide controls
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
import { whiteNoise, clamp } from "../core/DspUtils.js";

const MODES = ["Noise", "Sine", "Wide"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "mode", name: "Mode", kind: "enum", min: 0, max: 2, defaultValue: 0, labels: [...MODES] },
  { id: "frequency", name: "Frequency", kind: "float", min: 100, max: 20000, defaultValue: 0.5, unit: "Hz" },
  { id: "amount", name: "Amount", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "width", name: "Width", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class ErosionInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  private _filterL = new BiquadFilter();
  private _filterR = new BiquadFilter();
  
  // Sine oscillator state
  private _phaseL = 0;
  private _phaseR = 0;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._filterL.setSampleRate(this._sampleRate);
    this._filterR.setSampleRate(this._sampleRate);
    this._filterL.setType("bandpass");
    this._filterR.setType("bandpass");
    this._updateFilters();
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "frequency" || id === "width") {
      this._updateFilters();
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
      this._updateFilters();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    this._filterL.reset();
    this._filterR.reset();
    this._phaseL = 0;
    this._phaseR = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const mode = MODES[Math.round(this._params.get("mode")?.value ?? 0)];
    const amount = (this._params.get("amount")?.value ?? 0) / 100;
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

    const freq = this._params.get("frequency")?.value ?? 5000;
    const phaseInc = (2 * Math.PI * freq) / this._sampleRate;

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL;
        outputR[i] = dryR;
        continue;
      }

      let degradationL = 0;
      let degradationR = 0;

      switch (mode) {
        case "Noise": {
          // Bandpass filtered noise
          const noiseL = this._filterL.process(whiteNoise());
          const noiseR = this._filterR.process(whiteNoise());
          degradationL = noiseL * amount;
          degradationR = noiseR * amount;
          break;
        }
        
        case "Sine": {
          // Sine wave modulation
          this._phaseL += phaseInc;
          this._phaseR += phaseInc;
          if (this._phaseL > 2 * Math.PI) this._phaseL -= 2 * Math.PI;
          if (this._phaseR > 2 * Math.PI) this._phaseR -= 2 * Math.PI;
          
          degradationL = Math.sin(this._phaseL) * amount;
          degradationR = Math.sin(this._phaseR) * amount;
          break;
        }
        
        case "Wide": {
          // Stereo noise with width control
          const noise = whiteNoise();
          const width = (this._params.get("width")?.value ?? 50) / 100;
          const mid = noise;
          const side = whiteNoise() * width;
          
          degradationL = (mid + side) * amount * 0.5;
          degradationR = (mid - side) * amount * 0.5;
          break;
        }
      }

      // Apply degradation (ring mod or addition)
      let wetL = dryL * (1 + degradationL);
      let wetR = dryR * (1 + degradationR);
      
      // Clip to prevent extreme values
      wetL = clamp(wetL, -2, 2);
      wetR = clamp(wetR, -2, 2);

      outputL[i] = dryL * (1 - dryWet) + wetL * dryWet;
      outputR[i] = dryR * (1 - dryWet) + wetR * dryWet;
    }
  }

  private _updateFilters(): void {
    const freq = this._params.get("frequency")?.value ?? 5000;
    const width = (this._params.get("width")?.value ?? 50) / 100;
    const q = 0.5 + width * 9.5; // Q from 0.5 to 10
    
    this._filterL.setFrequency(freq);
    this._filterL.setQ(q);
    this._filterR.setFrequency(freq);
    this._filterR.setQ(q);
  }

  async dispose(): Promise<void> {}
}

export function createErosionDefinition(): PluginDefinition {
  return {
    id: "com.daw.erosion",
    name: "Erosion",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Degradation and digital artifact generator",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const erode = new ErosionInstance();
      erode.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return erode;
    },
  };
}
