/**
 * Auto Filter - Envelope follower + LFO filter
 * 
 * Classic auto-wah effect with:
 * - Multiple filter types (LP, BP, HP, Notch, Morph)
 * - LFO with 6 waveforms
 * - Envelope follower with attack/release
 * - Sidechain input for envelope
 * - MIDI modulation target
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  PluginParameterSpec,
  AudioBuffer,
  MidiEvent,
} from "@daw/plugin-api";
import { createParameterMap } from "@daw/plugin-api";
import { StateVariableFilter, MorphingFilter } from "../core/AdvancedFilters.js";
import { EnvelopeFollower, LFO, clamp, lerp } from "../core/DspUtils.js";

const FILTER_TYPES = ["Lowpass", "Bandpass", "Highpass", "Notch", "Morph"] as const;
const LFO_WAVEFORMS = ["Sine", "Triangle", "Saw Up", "Saw Down", "Square", "S&H"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  // Filter section
  { id: "filterType", name: "Filter Type", kind: "enum", min: 0, max: 4, defaultValue: 0, labels: [...FILTER_TYPES] },
  { id: "frequency", name: "Frequency", kind: "float", min: 20, max: 20000, defaultValue: 0.5, unit: "Hz" },
  { id: "resonance", name: "Resonance", kind: "float", min: 0.1, max: 10, defaultValue: 0.3 },
  
  // LFO section
  { id: "lfoRate", name: "LFO Rate", kind: "float", min: 0.01, max: 40, defaultValue: 0.3, unit: "Hz" },
  { id: "lfoAmount", name: "LFO Amount", kind: "float", min: 0, max: 24, defaultValue: 0.25, unit: "dB" },
  { id: "lfoWaveform", name: "LFO Waveform", kind: "enum", min: 0, max: 5, defaultValue: 0, labels: [...LFO_WAVEFORMS] },
  { id: "lfoPhase", name: "LFO Phase", kind: "float", min: 0, max: 360, defaultValue: 0, unit: "°" },
  { id: "lfoSpin", name: "LFO Spin", kind: "float", min: 0, max: 1, defaultValue: 0 },
  { id: "lfoSync", name: "LFO Sync", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  
  // Envelope section
  { id: "envAmount", name: "Env Amount", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "envAttack", name: "Attack", kind: "float", min: 0.01, max: 100, defaultValue: 0.1, unit: "ms" },
  { id: "envRelease", name: "Release", kind: "float", min: 1, max: 1000, defaultValue: 0.2, unit: "ms" },
  
  // Output
  { id: "drive", name: "Drive", kind: "float", min: 0, max: 24, defaultValue: 0, unit: "dB" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class AutoFilterInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Filter
  private _filterL = new StateVariableFilter();
  private _filterR = new StateVariableFilter();
  private _morphFilterL = new MorphingFilter();
  private _morphFilterR = new MorphingFilter();
  
  // LFO
  private _lfoL = new LFO();
  private _lfoR = new LFO();
  
  // Envelope followers
  private _envFollowerL = new EnvelopeFollower();
  private _envFollowerR = new EnvelopeFollower();
  private _sidechainEnv = new EnvelopeFollower();
  
  // State
  private _currentFreq = 1000;
  private _midiModulation = 0;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._filterL.setSampleRate(this._sampleRate);
    this._filterR.setSampleRate(this._sampleRate);
    this._morphFilterL.setSampleRate(this._sampleRate);
    this._morphFilterR.setSampleRate(this._sampleRate);
    this._lfoL.setSampleRate(this._sampleRate);
    this._lfoR.setSampleRate(this._sampleRate);
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
    if (id === "envAttack" || id === "envRelease") {
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
    this._filterL.reset();
    this._filterR.reset();
    this._morphFilterL.reset();
    this._morphFilterR.reset();
    this._lfoL.reset();
    this._lfoR.reset();
    this._envFollowerL.reset();
    this._envFollowerR.reset();
    this._sidechainEnv.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: MidiEvent[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const dryWet = (this._params.get("dryWet")?.value ?? 100) / 100;
    const drive = Math.pow(10, (this._params.get("drive")?.value ?? 0) / 20);
    
    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    // Sidechain input (if available, use input 1)
    const sidechainL = inputs[1]?.getChannelData(0) ?? inputL;
    const sidechainR = inputs[1]?.numberOfChannels > 1 
      ? inputs[1].getChannelData(1) 
      : sidechainL;

    this._params.processSmoothing();
    this._updateFilterType();

    // Process MIDI modulation
    for (const event of midi) {
      if (event.type === "cc") {
        // CC #1 = Mod Wheel
        if (event.data.controller === 1) {
          this._midiModulation = event.data.value / 127;
        }
      }
    }

    const filterType = FILTER_TYPES[Math.round(this._params.get("filterType")?.value ?? 0)];
    const baseFreq = this._params.get("frequency")?.value ?? 1000;
    const lfoAmount = this._params.get("lfoAmount")?.value ?? 6;
    const envAmount = this._params.get("envAmount")?.value ?? 0;
    const useMorph = filterType === "Morph";

    for (let i = 0; i < blockSize; i++) {
      // Calculate modulation
      const lfoL = this._lfoL.process();
      const lfoR = this._lfoR.process();
      
      // Envelope following
      const envL = this._envFollowerL.process(inputL[i]);
      const envR = this._envFollowerR.process(inputR[i]);
      const sidechainEnv = Math.max(
        this._sidechainEnv.process(sidechainL[i]),
        this._sidechainEnv.process(sidechainR[i])
      );

      // Calculate filter frequency
      // Base + LFO + Envelope + MIDI
      const envValue = envAmount > 0 ? envL : -envL; // Can be positive or negative amount
      const sidechainValue = sidechainEnv * Math.abs(envAmount);
      
      const lfoModL = lfoL * lfoAmount;
      const lfoModR = lfoR * lfoAmount;
      const envMod = envValue * Math.abs(envAmount) * 0.1;
      const midiMod = this._midiModulation * 12; // Up to 1 octave
      
      const freqL = clamp(baseFreq * Math.pow(2, (lfoModL + envMod + midiMod) / 12), 20, 20000);
      const freqR = clamp(baseFreq * Math.pow(2, (lfoModR + envMod + midiMod) / 12), 20, 20000);

      // Process audio
      let dryL = inputL[i];
      let dryR = inputR[i];
      
      // Apply drive
      let wetL = dryL * drive;
      let wetR = dryR * drive;

      // Apply filter
      if (useMorph) {
        this._morphFilterL.setFrequency(freqL);
        this._morphFilterR.setFrequency(freqR);
        wetL = this._morphFilterL.process(wetL);
        wetR = this._morphFilterR.process(wetR);
      } else {
        this._filterL.setFrequency(freqL);
        this._filterR.setFrequency(freqR);
        wetL = this._filterL.process(wetL);
        wetR = this._filterR.process(wetR);
      }

      // Soft clip if driven
      if (drive > 1) {
        wetL = Math.tanh(wetL);
        wetR = Math.tanh(wetR);
      }

      // Mix dry/wet
      outputL[i] = dryL * (1 - dryWet) + wetL * dryWet;
      outputR[i] = dryR * (1 - dryWet) + wetR * dryWet;
    }
  }

  async dispose(): Promise<void> {}

  private _updateCoeffs(): void {
    const attackMs = this._params.get("envAttack")?.value ?? 10;
    const releaseMs = this._params.get("envRelease")?.value ?? 100;
    
    this._envFollowerL.setAttack(attackMs, this._sampleRate);
    this._envFollowerL.setRelease(releaseMs, this._sampleRate);
    this._envFollowerR.setAttack(attackMs, this._sampleRate);
    this._envFollowerR.setRelease(releaseMs, this._sampleRate);
    this._sidechainEnv.setAttack(attackMs, this._sampleRate);
    this._sidechainEnv.setRelease(releaseMs, this._sampleRate);
  }

  private _updateFilterType(): void {
    const typeIndex = Math.round(this._params.get("filterType")?.value ?? 0);
    const filterType = FILTER_TYPES[typeIndex];
    const resonance = this._params.get("resonance")?.value ?? 0.707;

    switch (filterType) {
      case "Lowpass":
        this._filterL.setType("lowpass12");
        this._filterR.setType("lowpass12");
        break;
      case "Bandpass":
        this._filterL.setType("bandpass");
        this._filterR.setType("bandpass");
        break;
      case "Highpass":
        this._filterL.setType("highpass12");
        this._filterR.setType("highpass12");
        break;
      case "Notch":
        this._filterL.setType("notch");
        this._filterR.setType("notch");
        break;
    }

    this._filterL.setQ(resonance);
    this._filterR.setQ(resonance);
    this._morphFilterL.setQ(resonance);
    this._morphFilterR.setQ(resonance);

    // Update LFO waveform
    const waveformIndex = Math.round(this._params.get("lfoWaveform")?.value ?? 0);
    const waveforms: Array<"sine" | "triangle" | "saw" | "square" | "s&h"> = [
      "sine", "triangle", "saw", "saw", "square", "s&h"
    ];
    this._lfoL.setWaveform(waveforms[waveformIndex] ?? "sine");
    this._lfoR.setWaveform(waveforms[waveformIndex] ?? "sine");

    // Update LFO rate
    const lfoRate = this._params.get("lfoRate")?.value ?? 1;
    this._lfoL.setRate(lfoRate);
    
    // Spin creates different rates for L/R
    const spin = this._params.get("lfoSpin")?.value ?? 0;
    this._lfoR.setRate(lfoRate * (1 + spin * 0.1));

    // Phase offset
    const phase = (this._params.get("lfoPhase")?.value ?? 0) / 360;
    this._lfoR.setPhase(phase);
  }
}

export function createAutoFilterDefinition(): PluginDefinition {
  return {
    id: "com.daw.auto-filter",
    name: "Auto Filter",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Envelope follower and LFO controlled filter",
    parameters: PARAMETERS,
    ui: { 
      type: "generic",
      layout: [
        { title: "Filter", parameters: ["filterType", "frequency", "resonance"], layout: "vertical" },
        { title: "LFO", parameters: ["lfoRate", "lfoAmount", "lfoWaveform", "lfoPhase", "lfoSpin", "lfoSync"], layout: "vertical" },
        { title: "Envelope", parameters: ["envAmount", "envAttack", "envRelease"], layout: "vertical" },
        { title: "Output", parameters: ["drive", "dryWet", "bypass"], layout: "vertical" }
      ]
    },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 0,
    hasSidechain: true,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const filter = new AutoFilterInstance();
      filter.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return filter;
    },
  };
}
