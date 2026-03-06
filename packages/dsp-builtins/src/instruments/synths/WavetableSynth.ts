/**
 * Wavetable Synthesizer (MVP)
 * 
 * Basic wavetable synthesis with:
 * - 2 wavetable oscillators
 * - Position morphing between waveforms
 * - Unison and filter
 * 
 * Based on engineering spec section 10.5 (MVP implementation)
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
  BiquadFilter,
  dbToLinear,
  lerp,
} from "../../core/DspBase.js";

// Wavetable data
interface Wavetable {
  name: string;
  waveforms: Float32Array[]; // Array of 256-sample waveforms
}

// Basic wavetables
const SINE_TABLE: Float32Array = new Float32Array(256);
const SAW_TABLE: Float32Array = new Float32Array(256);
const SQUARE_TABLE: Float32Array = new Float32Array(256);

// Initialize basic wavetables
for (let i = 0; i < 256; i++) {
  const phase = i / 256;
  SINE_TABLE[i] = Math.sin(phase * 2 * Math.PI);
  SAW_TABLE[i] = 2 * phase - 1;
  SQUARE_TABLE[i] = phase < 0.5 ? 1 : -1;
}

// Parameter specifications
const PARAMETERS: PluginParameterSpec[] = [
  { id: "wtPosition", name: "Position", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "osc1Level", name: "Osc 1 Level", kind: "float", min: 0, max: 100, defaultValue: 0.8, unit: "%" },
  { id: "osc2Level", name: "Osc 2 Level", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "osc2Pitch", name: "Osc 2 Pitch", kind: "int", min: -24, max: 24, defaultValue: 0.5, unit: "st" },
  { id: "filterFreq", name: "Filter Freq", kind: "float", min: 20, max: 20000, defaultValue: 0.75, unit: "Hz" },
  { id: "filterRes", name: "Resonance", kind: "float", min: 0, max: 100, defaultValue: 0.2, unit: "%" },
  { id: "attack", name: "Attack", kind: "float", min: 0, max: 5000, defaultValue: 0.01, unit: "ms" },
  { id: "decay", name: "Decay", kind: "float", min: 0, max: 5000, defaultValue: 0.1, unit: "ms" },
  { id: "sustain", name: "Sustain", kind: "float", min: 0, max: 100, defaultValue: 0.8, unit: "%" },
  { id: "release", name: "Release", kind: "float", min: 0, max: 10000, defaultValue: 0.3, unit: "ms" },
  { id: "masterGain", name: "Gain", kind: "float", min: -96, max: 12, defaultValue: 0.75, unit: "dB" },
];

class WavetableVoice extends VoiceBase {
  private _phase = 0;
  private _frequency = 440;
  private _sampleRate = 48000;
  
  private _ampEnv: ADSREnvelope;
  private _filter: BiquadFilter;
  
  private _wtPosition = 0.5;
  private _params: Map<string, number> = new Map();

  constructor(sampleRate = 48000) {
    super();
    this._sampleRate = sampleRate;
    this._ampEnv = new ADSREnvelope({}, sampleRate);
    this._filter = new BiquadFilter(sampleRate);
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._ampEnv.setSampleRate(sr);
    this._filter.setSampleRate(sr);
  }

  setParams(params: Map<string, number>): void {
    this._params = params;
    this._wtPosition = (params.get("wtPosition") ?? 50) / 100;
    
    this._filter.setFrequency(params.get("filterFreq") ?? 20000);
    this._filter.setQ(0.1 + (params.get("filterRes") ?? 20) / 10);
    
    this._ampEnv.setConfig({
      attack: (params.get("attack") ?? 10) / 1000,
      decay: (params.get("decay") ?? 100) / 1000,
      sustain: (params.get("sustain") ?? 80) / 100,
      release: (params.get("release") ?? 300) / 1000,
    });
  }

  trigger(note: number, velocity: number): void {
    this.note = note;
    this.velocity = velocity;
    this.active = true;
    this.age = 0;
    this._frequency = 440 * Math.pow(2, (note - 69) / 12);
    this._phase = 0;
    this._ampEnv.trigger();
    this._filter.reset();
  }

  release(): void {
    this._ampEnv.release();
  }

  stop(): void {
    this._ampEnv.stop();
    this.active = false;
  }

  isFinished(): boolean {
    return !this.active || (!this._ampEnv.isActive && this._ampEnv.level < 0.0001);
  }

  process(left: Float32Array, right: Float32Array, offset: number, count: number): void {
    if (!this.active) return;

    const phaseIncrement = this._frequency / this._sampleRate;
    const osc1Level = (this._params.get("osc1Level") ?? 80) / 100;
    const osc2Level = (this._params.get("osc2Level") ?? 0) / 100;
    const osc2Pitch = this._params.get("osc2Pitch") ?? 0;
    const osc2Freq = this._frequency * Math.pow(2, osc2Pitch / 12);
    const osc2Increment = osc2Freq / this._sampleRate;
    
    let osc2Phase = this._phase * (osc2Freq / this._frequency);

    for (let i = 0; i < count; i++) {
      // Get wavetable samples
      const wtIndex = this._phase * 256;
      const wtIndex2 = osc2Phase * 256;
      
      const sample1 = this._readWavetable(wtIndex, this._wtPosition) * osc1Level;
      const sample2 = this._readWavetable(wtIndex2, this._wtPosition) * osc2Level;
      
      let sample = sample1 + sample2;
      
      // Apply filter
      sample = this._filter.process(sample);
      
      // Apply envelope
      const env = this._ampEnv.process();
      sample *= env;

      // Output
      const idx = offset + i;
      left[idx] += sample;
      right[idx] += sample;

      // Advance phase
      this._phase += phaseIncrement;
      while (this._phase >= 1) this._phase -= 1;
      
      osc2Phase += osc2Increment;
      while (osc2Phase >= 1) osc2Phase -= 1;
    }
  }

  private _readWavetable(index: number, position: number): number {
    // Simple morph between sine and saw based on position
    const idx = Math.floor(index) % 256;
    const nextIdx = (idx + 1) % 256;
    const frac = index - Math.floor(index);
    
    const sine = lerp(SINE_TABLE[idx], SINE_TABLE[nextIdx], frac);
    const saw = lerp(SAW_TABLE[idx], SAW_TABLE[nextIdx], frac);
    
    return lerp(sine, saw, position);
  }
}

export class WavetableSynthInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _voices: WavetableVoice[];
  private _voiceAllocator: VoiceAllocator<WavetableVoice>;
  
  private _sampleRate = 48000;
  private _blockSize = 128;
  private _leftBuffer: Float32Array;
  private _rightBuffer: Float32Array;
  private _connected = false;

  constructor(maxVoices = 16, maxBlockSize = 128) {
    this._voices = [];
    for (let i = 0; i < maxVoices; i++) {
      this._voices.push(new WavetableVoice(48000));
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
    return Math.ceil(((this._params.get("release")?.value ?? 300) / 1000) * this._sampleRate);
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

export function createWavetableSynthDefinition(): PluginDefinition {
  return {
    id: "com.daw.wavetable",
    name: "Wavetable Synth",
    category: "instrument",
    version: "1.0.0",
    vendor: "DAW",
    description: "Wavetable synthesizer with position morphing",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 0,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const synth = new WavetableSynthInstance(16, ctx.maxBlockSize);
      synth.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return synth;
    },
  };
}
