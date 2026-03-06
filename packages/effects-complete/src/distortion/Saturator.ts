/**
 * Saturator - Waveshaping distortion
 * 
 * Multi-mode waveshaper with:
 * - 6 modes: Analog Clip, Soft Sine, Medium Curve, Hard Curve, Sinoid Fold, Digital Clip
 * - Drive, Base, Frequency, Width, Depth parameters
 * - DC filter, Color, Dry/Wet
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
import { DCFilter, dbToLinear, clamp, tanhApprox, TWO_PI } from "../core/DspUtils.js";

const SHAPES = ["Analog Clip", "Soft Sine", "Medium Curve", "Hard Curve", "Sinoid Fold", "Digital Clip"] as const;

type ShapeType = typeof SHAPES[number];

const PARAMETERS: PluginParameterSpec[] = [
  { id: "shape", name: "Shape", kind: "enum", min: 0, max: 5, defaultValue: 0, labels: [...SHAPES] },
  { id: "drive", name: "Drive", kind: "float", min: 0, max: 24, defaultValue: 0.25, unit: "dB" },
  { id: "base", name: "Base", kind: "float", min: -12, max: 12, defaultValue: 0.5, unit: "dB" },
  { id: "frequency", name: "Frequency", kind: "float", min: 20, max: 20000, defaultValue: 0.5, unit: "Hz" },
  { id: "width", name: "Width", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "depth", name: "Depth", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "dcFilter", name: "DC Filter", kind: "bool", min: 0, max: 1, defaultValue: 1 },
  { id: "color", name: "Color", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "output", name: "Output", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class SaturatorInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Filters
  private _colorFilterL = new BiquadFilter();
  private _colorFilterR = new BiquadFilter();
  private _dcFilterL = new DCFilter();
  private _dcFilterR = new DCFilter();

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._colorFilterL.setSampleRate(this._sampleRate);
    this._colorFilterR.setSampleRate(this._sampleRate);
    this._colorFilterL.setType("peak");
    this._colorFilterR.setType("peak");
    this._dcFilterL.setCutoff(20, this._sampleRate);
    this._dcFilterR.setCutoff(20, this._sampleRate);
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "frequency" || id === "color") {
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
    this._colorFilterL.reset();
    this._colorFilterR.reset();
    this._dcFilterL.reset();
    this._dcFilterR.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const shapeIndex = Math.round(this._params.get("shape")?.value ?? 0);
    const shape = SHAPES[shapeIndex] ?? "Analog Clip";
    const drive = dbToLinear(this._params.get("drive")?.value ?? 0);
    const base = dbToLinear(this._params.get("base")?.value ?? 0);
    const width = (this._params.get("width")?.value ?? 50) / 100;
    const depth = (this._params.get("depth")?.value ?? 0) / 100;
    const dcFilter = this._params.get("dcFilter")?.value >= 0.5;
    const dryWet = (this._params.get("dryWet")?.value ?? 100) / 100;
    const output = dbToLinear(this._params.get("output")?.value ?? 0);

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();
    this._updateFilters();

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL * output;
        outputR[i] = dryR * output;
        continue;
      }

      // Apply color filter
      let coloredL = this._colorFilterL.process(dryL);
      let coloredR = this._colorFilterR.process(dryR);

      // Apply base gain
      coloredL *= base;
      coloredR *= base;

      // Apply waveshaping
      let wetL = this._shape(coloredL * drive, shape) / drive;
      let wetR = this._shape(coloredR * drive, shape) / drive;

      // Apply width/depth modulation (simplified)
      if (depth > 0) {
        const freq = this._params.get("frequency")?.value ?? 1000;
        const phase = (i / this._sampleRate) * freq * TWO_PI;
        const mod = 1 + Math.sin(phase) * depth;
        wetL *= mod;
        wetR *= mod;
      }

      // DC filter
      if (dcFilter) {
        wetL = this._dcFilterL.process(wetL);
        wetR = this._dcFilterR.process(wetR);
      }

      // Mix dry/wet
      outputL[i] = (dryL * (1 - dryWet) + wetL * dryWet) * output;
      outputR[i] = (dryR * (1 - dryWet) + wetR * dryWet) * output;
    }
  }

  private _shape(input: number, shape: ShapeType): number {
    switch (shape) {
      case "Analog Clip":
        // Soft clipping using tanh
        return tanhApprox(input);

      case "Soft Sine":
        // Sine-based soft saturation
        if (Math.abs(input) < 1) {
          return Math.sin(input * Math.PI / 2);
        }
        return Math.sign(input);

      case "Medium Curve":
        // Medium saturation: x / (1 + |x|)
        return input / (1 + Math.abs(input));

      case "Hard Curve":
        // Harder saturation: x / sqrt(1 + x^2)
        return input / Math.sqrt(1 + input * input);

      case "Sinoid Fold":
        // Sine wave folding
        return Math.sin(input * Math.PI);

      case "Digital Clip":
        // Hard digital clipping
        return clamp(input, -1, 1);

      default:
        return input;
    }
  }

  private _updateFilters(): void {
    const freq = this._params.get("frequency")?.value ?? 1000;
    const color = (this._params.get("color")?.value ?? 0) * 0.24; // +/- 24dB
    
    this._colorFilterL.setFrequency(freq);
    this._colorFilterL.setGain(color);
    this._colorFilterL.setQ(0.7);
    
    this._colorFilterR.setFrequency(freq);
    this._colorFilterR.setGain(color);
    this._colorFilterR.setQ(0.7);
  }

  async dispose(): Promise<void> {}
}

export function createSaturatorDefinition(): PluginDefinition {
  return {
    id: "com.daw.saturator",
    name: "Saturator",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Multi-mode waveshaping distortion",
    parameters: PARAMETERS,
    ui: { 
      type: "generic",
      layout: [
        { title: "Shape", parameters: ["shape", "drive", "base"], layout: "vertical" },
        { title: "Color", parameters: ["frequency", "width", "depth", "color"], layout: "vertical" },
        { title: "Output", parameters: ["dcFilter", "output", "dryWet", "bypass"], layout: "vertical" }
      ]
    },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const sat = new SaturatorInstance();
      sat.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return sat;
    },
  };
}
