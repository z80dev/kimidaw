/**
 * Beat Repeat - Glitch/stutter effect
 * 
 * Creative beat repeat with:
 * - Interval and offset controls
 * - Grid size (1/16, 1/8, etc.)
 * - Variation and chance
 * - Gate length control
 * - Pitch decay and pitch modes
 * - Filter envelope
 * - Infinite repeat mode
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
import { clamp, lerp } from "../core/DspUtils.js";

const GRID_SIZES = ["1/32", "1/16", "1/8", "1/4", "1/2", "1/1"] as const;
const INTERVALS = ["1/32", "1/16", "1/8", "1/4", "1/2", "1/1", "2/1", "4/1"] as const;
const PITCH_MODES = ["Exponential", "Reverse", "Saw", "Random"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  // Timing
  { id: "interval", name: "Interval", kind: "enum", min: 0, max: 7, defaultValue: 3, labels: [...INTERVALS] },
  { id: "offset", name: "Offset", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "grid", name: "Grid", kind: "enum", min: 0, max: 5, defaultValue: 2, labels: [...GRID_SIZES] },
  
  // Variation
  { id: "variation", name: "Variation", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "chance", name: "Chance", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "gate", name: "Gate", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  
  // Pitch
  { id: "pitchDecay", name: "Pitch Decay", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "pitchMode", name: "Pitch Mode", kind: "enum", min: 0, max: 3, defaultValue: 0, labels: [...PITCH_MODES] },
  
  // Filter
  { id: "filterFreq", name: "Filter Freq", kind: "float", min: 100, max: 20000, defaultValue: 0.8, unit: "Hz" },
  { id: "filterWidth", name: "Filter Width", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  
  // Options
  { id: "infinite", name: "Infinite", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "mix", name: "Mix", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class BeatRepeatInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _tempo = 120;
  private _connected = false;
  
  // Audio buffer for capture
  private _bufferL: Float32Array;
  private _bufferR: Float32Array;
  private _bufferSize: number;
  private _writeIndex = 0;
  
  // Playback state
  private _isRepeating = false;
  private _repeatStart = 0;
  private _repeatPosition = 0;
  private _repeatLength = 0;
  private _repeatCounter = 0;
  
  // Timing
  private _samplesToNextTrigger = 0;
  private _gateSamplesRemaining = 0;
  
  // Filter
  private _filterL = new BiquadFilter();
  private _filterR = new BiquadFilter();

  constructor() {
    // 2 seconds buffer at 48kHz
    this._bufferSize = 2 * 48000;
    this._bufferL = new Float32Array(this._bufferSize);
    this._bufferR = new Float32Array(this._bufferSize);
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._bufferSize = 2 * this._sampleRate;
    this._bufferL = new Float32Array(this._bufferSize);
    this._bufferR = new Float32Array(this._bufferSize);
    this._filterL.setSampleRate(this._sampleRate);
    this._filterR.setSampleRate(this._sampleRate);
    this._filterL.setType("lowpass12");
    this._filterR.setType("lowpass12");
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
  getTailSamples(): number { return 0; }

  reset(): void {
    this._bufferL.fill(0);
    this._bufferR.fill(0);
    this._writeIndex = 0;
    this._isRepeating = false;
    this._filterL.reset();
    this._filterR.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const chance = (this._params.get("chance")?.value ?? 100) / 100;
    const gatePercent = (this._params.get("gate")?.value ?? 100) / 100;
    const pitchDecay = (this._params.get("pitchDecay")?.value ?? 0) / 100;
    const filterFreq = this._params.get("filterFreq")?.value ?? 8000;
    const filterWidth = (this._params.get("filterWidth")?.value ?? 50) / 100;
    const infinite = this._params.get("infinite")?.value >= 0.5;
    const mix = (this._params.get("mix")?.value ?? 100) / 100;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();

    // Calculate timing
    const beatDuration = 60 / this._tempo * this._sampleRate;
    const intervalIndex = Math.round(this._params.get("interval")?.value ?? 3);
    const intervalDivisions = [1/8, 1/4, 1/2, 1, 2, 4, 8, 16];
    const intervalSamples = beatDuration * intervalDivisions[intervalIndex];
    
    const gridIndex = Math.round(this._params.get("grid")?.value ?? 2);
    const gridDivisions = [1/8, 1/4, 1/2, 1, 2, 4];
    const gridSamples = beatDuration * gridDivisions[gridIndex];
    
    const offsetPercent = (this._params.get("offset")?.value ?? 0) / 100;
    const offsetSamples = intervalSamples * offsetPercent;

    // Set filter
    this._filterL.setFrequency(filterFreq);
    this._filterR.setFrequency(filterFreq);
    this._filterL.setQ(0.5 + filterWidth);
    this._filterR.setQ(0.5 + filterWidth);

    for (let i = 0; i < blockSize; i++) {
      const dryL = inputL[i];
      const dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL;
        outputR[i] = dryR;
        this._bufferL[this._writeIndex] = dryL;
        this._bufferR[this._writeIndex] = dryR;
        this._writeIndex = (this._writeIndex + 1) % this._bufferSize;
        continue;
      }

      // Always record to buffer
      this._bufferL[this._writeIndex] = dryL;
      this._bufferR[this._writeIndex] = dryR;

      // Check for repeat trigger
      this._samplesToNextTrigger--;
      if (this._samplesToNextTrigger <= 0) {
        this._samplesToNextTrigger = intervalSamples;
        
        // Chance to trigger
        if (Math.random() < chance || infinite) {
          this._startRepeat(gridSamples, offsetSamples, infinite);
        }
      }

      let wetL = 0;
      let wetR = 0;

      if (this._isRepeating) {
        // Calculate read position with pitch effect
        const pitchModeIndex = Math.round(this._params.get("pitchMode")?.value ?? 0);
        let pitchRatio = 1;
        
        if (pitchDecay > 0) {
          const repeatProgress = this._repeatPosition / this._repeatLength;
          
          switch (PITCH_MODES[pitchModeIndex]) {
            case "Exponential":
              pitchRatio = Math.pow(0.5, repeatProgress * pitchDecay * 3);
              break;
            case "Reverse":
              pitchRatio = -1;
              break;
            case "Saw":
              pitchRatio = 1 - repeatProgress * pitchDecay;
              break;
            case "Random":
              pitchRatio = 1 + (Math.random() * 2 - 1) * pitchDecay;
              break;
          }
        }

        // Read from buffer
        const readPos = this._repeatStart + this._repeatPosition;
        const readIndex = Math.floor(readPos) % this._bufferSize;
        
        wetL = this._bufferL[readIndex];
        wetR = this._bufferR[readIndex];

        // Apply filter
        wetL = this._filterL.process(wetL);
        wetR = this._filterR.process(wetR);

        // Advance repeat position
        this._repeatPosition += pitchRatio;
        
        // Check gate
        this._gateSamplesRemaining--;
        const gateProgress = 1 - (this._gateSamplesRemaining / this._repeatLength);
        
        if (this._gateSamplesRemaining <= 0 || gateProgress > gatePercent) {
          if (infinite) {
            // Restart repeat
            this._repeatPosition = 0;
            this._gateSamplesRemaining = this._repeatLength;
          } else {
            this._isRepeating = false;
          }
        }
        
        // Variation: randomly end repeat early
        const variation = (this._params.get("variation")?.value ?? 0) / 100;
        if (!infinite && variation > 0 && Math.random() < variation * 0.1) {
          this._isRepeating = false;
        }
      }

      // Mix
      outputL[i] = dryL * (1 - mix) + wetL * mix;
      outputR[i] = dryR * (1 - mix) + wetR * mix;

      this._writeIndex = (this._writeIndex + 1) % this._bufferSize;
    }
  }

  private _startRepeat(length: number, offset: number, infinite: boolean): void {
    this._isRepeating = true;
    this._repeatLength = length;
    this._gateSamplesRemaining = length;
    this._repeatPosition = 0;
    
    // Start position in buffer (accounting for offset)
    const offsetSamples = Math.floor(offset);
    this._repeatStart = (this._writeIndex - length - offsetSamples + this._bufferSize) % this._bufferSize;
  }

  async dispose(): Promise<void> {}

  setTempo(bpm: number): void {
    this._tempo = bpm;
  }
}

export function createBeatRepeatDefinition(): PluginDefinition {
  return {
    id: "com.daw.beat-repeat",
    name: "Beat Repeat",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Glitch and stutter effect for creative beat manipulation",
    parameters: PARAMETERS,
    ui: { 
      type: "generic",
      layout: [
        { title: "Timing", parameters: ["interval", "offset", "grid"], layout: "vertical" },
        { title: "Variation", parameters: ["variation", "chance", "gate"], layout: "vertical" },
        { title: "Pitch", parameters: ["pitchDecay", "pitchMode"], layout: "vertical" },
        { title: "Filter", parameters: ["filterFreq", "filterWidth"], layout: "vertical" },
        { title: "Output", parameters: ["infinite", "mix", "bypass"], layout: "vertical" }
      ]
    },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const br = new BeatRepeatInstance();
      br.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return br;
    },
  };
}
