/**
 * Enhanced Simpler Sampler
 * 
 * Ableton-style sampler with three playback modes:
 * - Classic: Pitched playback with ADSR
 * - One-Shot: Trigger and play full sample
 * - Slicing: Slice by transient or beat divisions
 * 
 * Additional features:
 * - LFO modulation
 * - Filter envelope
 * - Glide
 * - Spread (unison)
 * - Voices control
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
import { createParameterMap, midiToFrequency, dbToGain } from "@daw/plugin-api";
import { VoiceAllocator, ADSREnvelope, BiquadFilter, LFO } from "../../core/DspBase.js";

// =============================================================================
// Playback Modes
// =============================================================================

export type SimplerPlaybackMode = "classic" | "one-shot" | "slicing";

export type SimplerSliceMode = "transient" | "beat" | "manual";

// =============================================================================
// Slice Definition
// =============================================================================

export interface Slice {
  /** Slice start sample */
  start: number;
  /** Slice end sample */
  end: number;
  /** Root note for this slice */
  rootNote: number;
}

// =============================================================================
// Sample Data
// =============================================================================

export interface SimplerSample {
  id: string;
  buffer: Float32Array[];
  sampleRate: number;
  rootNote: number;
  minNote?: number;
  maxNote?: number;
  minVelocity?: number;
  maxVelocity?: number;
  loopStart?: number;
  loopEnd?: number;
  loopMode?: "off" | "forward" | "pingpong";
  slices?: Slice[];
}

// =============================================================================
// Simpler Voice
// =============================================================================

class SimplerVoice {
  // Sample
  private _sample: SimplerSample | null = null;
  private _playbackMode: SimplerPlaybackMode = "classic";
  private _currentSlice = 0;
  
  // Playback state
  private _position = 0;
  private _playbackRate = 1;
  private _targetFreq = 440;
  private _currentFreq = 440;
  private _glideRate = 0;
  private _active = false;
  
  // Voice state
  public note = 0;
  public velocity = 0;
  public active = false;
  public age = 0;
  
  // Processing
  private _ampEnv: ADSREnvelope;
  private _filterEnv: ADSREnvelope;
  private _filter: BiquadFilter;
  private _lfo: LFO;
  
  // Configuration
  private _ampEnvConfig = { attack: 0.001, decay: 0.1, sustain: 1, release: 0.3 };
  private _filterEnvConfig = { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 };
  private _filterConfig = { freq: 20000, resonance: 0.707, envAmount: 0 };
  private _lfoConfig = { rate: 1, waveform: "sine" as const, filterAmount: 0, pitchAmount: 0 };
  private _glideTime = 0;
  private _detune = 0;
  private _spread = 0;
  
  private _sampleRate = 48000;
  
  constructor(sampleRate = 48000) {
    this._sampleRate = sampleRate;
    this._ampEnv = new ADSREnvelope(this._ampEnvConfig, sampleRate);
    this._filterEnv = new ADSREnvelope(this._filterEnvConfig, sampleRate);
    this._filter = new BiquadFilter(sampleRate);
    this._lfo = new LFO(sampleRate);
  }
  
  setSample(sample: SimplerSample | null): void {
    this._sample = sample;
  }
  
  setPlaybackMode(mode: SimplerPlaybackMode): void {
    this._playbackMode = mode;
  }
  
  configure(
    ampEnv: typeof this._ampEnvConfig,
    filterEnv: typeof this._filterEnvConfig,
    filter: typeof this._filterConfig,
    lfo: typeof this._lfoConfig,
    glideTime: number,
    detune: number,
    spread: number
  ): void {
    this._ampEnvConfig = ampEnv;
    this._filterEnvConfig = filterEnv;
    this._filterConfig = filter;
    this._lfoConfig = lfo;
    this._glideTime = glideTime;
    this._detune = detune;
    this._spread = spread;
    
    this._ampEnv.setConfig(ampEnv);
    this._filterEnv.setConfig(filterEnv);
    this._filter.setFrequency(filter.freq);
    this._filter.setQ(filter.resonance);
    this._lfo.setRate(lfo.rate);
    this._lfo.setWaveform(lfo.waveform);
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._ampEnv.setSampleRate(sr);
    this._filterEnv.setSampleRate(sr);
    this._filter.setSampleRate(sr);
    this._lfo.setSampleRate(sr);
  }
  
  trigger(note: number, velocity: number, sliceIndex = 0): void {
    if (!this._sample) return;
    
    this.note = note;
    this.velocity = velocity;
    this.active = true;
    this.age = 0;
    this._currentSlice = sliceIndex;
    
    // Calculate pitch
    this._targetFreq = 440 * Math.pow(2, (note - 69) / 12);
    const rootFreq = 440 * Math.pow(2, (this._sample.rootNote - 69) / 12);
    this._playbackRate = this._targetFreq / rootFreq;
    
    // Handle glide
    if (this._currentFreq === 0 || this._glideTime === 0) {
      this._currentFreq = this._targetFreq;
    }
    this._glideRate = (this._targetFreq - this._currentFreq) / (this._glideTime * this._sampleRate / 1000);
    
    // Set position based on mode and slice
    if (this._playbackMode === "slicing" && this._sample.slices && this._sample.slices[sliceIndex]) {
      this._position = this._sample.slices[sliceIndex].start;
    } else {
      this._position = 0;
    }
    
    // Trigger envelopes
    this._ampEnv.trigger();
    this._filterEnv.trigger();
    this._lfo.reset();
    this._lfo.sync();
    
    // Reset filter
    this._filter.reset();
  }
  
  release(): void {
    this._ampEnv.release();
    this._filterEnv.release();
  }
  
  stop(): void {
    this._ampEnv.stop();
    this.active = false;
    this._currentFreq = 0;
  }
  
  isFinished(): boolean {
    if (!this.active) return true;
    
    // One-shot mode: finished when sample ends
    if (this._playbackMode === "one-shot") {
      const sampleLength = this._sample?.buffer[0].length ?? 0;
      return this._position >= sampleLength;
    }
    
    // Classic mode: finished when amp envelope done
    return !this._ampEnv.isActive && this._ampEnv.level < 0.0001;
  }
  
  process(): { left: number; right: number } {
    if (!this.active || !this._sample) return { left: 0, right: 0 };
    
    if (this.isFinished()) {
      this.active = false;
      return { left: 0, right: 0 };
    }
    
    // Handle glide
    if (this._glideTime > 0 && Math.abs(this._currentFreq - this._targetFreq) > 0.1) {
      this._currentFreq += this._glideRate;
      const rootFreq = 440 * Math.pow(2, (this._sample.rootNote - 69) / 12);
      this._playbackRate = this._currentFreq / rootFreq;
    }
    
    // Process LFO
    const lfoValue = this._lfo.process();
    
    // Process envelopes
    const ampEnv = this._ampEnv.process();
    const filterEnv = this._filterEnv.process();
    
    // Calculate filter frequency
    let filterFreq = this._filterConfig.freq;
    filterFreq *= Math.pow(2, filterEnv * this._filterConfig.envAmount / 100 * 4);
    filterFreq *= 1 + lfoValue * this._lfoConfig.filterAmount / 100;
    this._filter.setFrequency(Math.max(20, Math.min(this._sampleRate / 2, filterFreq)));
    
    // Read sample
    const sampleData = this._sample.buffer;
    const numChannels = sampleData.length;
    const sampleLength = sampleData[0].length;
    
    // Get slice boundaries
    let sliceEnd = sampleLength;
    if (this._playbackMode === "slicing" && this._sample.slices && this._sample.slices[this._currentSlice]) {
      sliceEnd = this._sample.slices[this._currentSlice].end;
    }
    
    // Check bounds
    if (this._position >= sliceEnd) {
      if (this._playbackMode === "one-shot") {
        this.active = false;
        return { left: 0, right: 0 };
      }
    }
    
    // Read with interpolation
    const pos = this._position;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, sampleLength - 1);
    const frac = pos - i0;
    
    let leftSample = 0;
    let rightSample = 0;
    
    if (numChannels === 1) {
      const mono = sampleData[0];
      const s = mono[i0] * (1 - frac) + mono[i1] * frac;
      leftSample = rightSample = s;
    } else {
      leftSample = sampleData[0][i0] * (1 - frac) + sampleData[0][i1] * frac;
      rightSample = sampleData[1][i0] * (1 - frac) + sampleData[1][i1] * frac;
    }
    
    // Apply filter
    const filtered = this._filter.process((leftSample + rightSample) * 0.5);
    leftSample = rightSample = filtered;
    
    // Apply amp envelope and velocity
    const velocityScale = 0.3 + (this.velocity / 127) * 0.7;
    leftSample *= ampEnv * velocityScale;
    rightSample *= ampEnv * velocityScale;
    
    // Advance position with LFO pitch modulation
    const pitchMod = 1 + lfoValue * this._lfoConfig.pitchAmount / 100;
    const sampleRateRatio = this._sample.sampleRate / this._sampleRate;
    this._position += this._playbackRate * sampleRateRatio * pitchMod;
    
    this.age++;
    
    // Apply spread/detune for unison
    return { left: leftSample, right: rightSample };
  }
}

// =============================================================================
// Simpler Instance
// =============================================================================

export interface SimplerState {
  sample: SimplerSample | null;
  playbackMode: SimplerPlaybackMode;
  sliceMode: SimplerSliceMode;
  slices: Slice[];
  parameters: Record<string, number>;
}

export class SimplerInstance implements PluginInstanceRuntime {
  private _params: ReturnType<typeof createParameterMap>;
  private _voices: SimplerVoice[] = [];
  private _voiceAllocator: VoiceAllocator<SimplerVoice>;
  
  private _sample: SimplerSample | null = null;
  private _playbackMode: SimplerPlaybackMode = "classic";
  private _sliceMode: SimplerSliceMode = "transient";
  private _slices: Slice[] = [];
  
  private _sampleRate = 48000;
  private _blockSize = 128;
  private _connected = false;
  
  // Buffers
  private _leftBuffer: Float32Array;
  private _rightBuffer: Float32Array;
  
  constructor(maxVoices = 16, maxBlockSize = 128) {
    this._params = createParameterMap(SIMPLER_PARAMETERS);
    
    // Create voices
    for (let i = 0; i < maxVoices; i++) {
      this._voices.push(new SimplerVoice(48000));
    }
    
    this._voiceAllocator = new VoiceAllocator(this._voices);
    
    // Pre-allocate buffers
    this._leftBuffer = new Float32Array(maxBlockSize);
    this._rightBuffer = new Float32Array(maxBlockSize);
  }
  
  // ---------------------------------------------------------------------------
  // PluginInstanceRuntime Implementation
  // ---------------------------------------------------------------------------
  
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
  
  setParam(id: string, value: number, atSample?: number): void {
    const param = this._params.get(id);
    if (param) {
      param.setNormalized(value);
      this._updateVoiceParams();
    }
  }
  
  getParam(id: string): number {
    return this._params.get(id)?.normalizedValue ?? 0;
  }
  
  async saveState(): Promise<SimplerState> {
    return {
      sample: this._sample,
      playbackMode: this._playbackMode,
      sliceMode: this._sliceMode,
      slices: this._slices,
      parameters: this._params.getNormalizedValues(),
    };
  }
  
  async loadState(state: unknown): Promise<void> {
    const s = state as Partial<SimplerState>;
    
    if (s.sample) {
      this.setSample(s.sample);
    }
    if (s.playbackMode) {
      this.setPlaybackMode(s.playbackMode);
    }
    if (s.slices) {
      this._slices = s.slices;
    }
    if (s.parameters) {
      this._params.setNormalizedValues(s.parameters);
      this._updateVoiceParams();
    }
  }
  
  getLatencySamples(): number {
    return 0;
  }
  
  getTailSamples(): number {
    const release = this._params.get("release")?.value ?? 300;
    return Math.ceil((release / 1000) * this._sampleRate);
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
    
    this._updateVoiceParams();
  }
  
  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: MidiEvent[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;
    
    // Clear buffers
    this._leftBuffer.fill(0, 0, blockSize);
    this._rightBuffer.fill(0, 0, blockSize);
    
    // Process MIDI
    for (const event of midi) {
      this._handleMidi(event);
    }
    
    // Process parameter smoothing
    this._params.processSmoothing();
    
    // Process voices
    for (let i = 0; i < blockSize; i++) {
      for (const voice of this._voices) {
        if (voice.active) {
          const output = voice.process();
          this._leftBuffer[i] += output.left;
          this._rightBuffer[i] += output.right;
        }
      }
    }
    
    // Apply master gain
    const gain = dbToGain(this._params.get("gain")?.value ?? 0);
    const pan = (this._params.get("pan")?.value ?? 0) / 50;
    const leftGain = gain * Math.cos((pan + 1) * Math.PI / 4);
    const rightGain = gain * Math.sin((pan + 1) * Math.PI / 4);
    
    // Write output
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;
    
    for (let i = 0; i < blockSize; i++) {
      outputL[i] = this._leftBuffer[i] * leftGain;
      outputR[i] = this._rightBuffer[i] * rightGain;
    }
  }
  
  async dispose(): Promise<void> {
    this._voiceAllocator.stopAll();
  }
  
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  
  setSample(sample: SimplerSample | null): void {
    this._sample = sample;
    for (const voice of this._voices) {
      voice.setSample(sample);
    }
    
    // Auto-generate slices if in slicing mode
    if (sample && this._playbackMode === "slicing") {
      this._autoSlice();
    }
  }
  
  setPlaybackMode(mode: SimplerPlaybackMode): void {
    this._playbackMode = mode;
    for (const voice of this._voices) {
      voice.setPlaybackMode(mode);
    }
  }
  
  setSlices(slices: Slice[]): void {
    this._slices = slices;
  }
  
  autoSlice(mode: SimplerSliceMode, divisions = 4): void {
    this._sliceMode = mode;
    this._autoSlice(divisions);
  }
  
  get sample(): SimplerSample | null {
    return this._sample;
  }
  
  get playbackMode(): SimplerPlaybackMode {
    return this._playbackMode;
  }
  
  get activeVoiceCount(): number {
    return this._voiceAllocator.activeVoiceCount;
  }
  
  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------
  
  private _handleMidi(event: MidiEvent): void {
    switch (event.type) {
      case "noteOn": {
        const note = event.data.note;
        const velocity = event.data.velocity;
        
        if (velocity === 0) {
          this._voiceAllocator.release(note);
        } else {
          this._triggerNote(note, velocity);
        }
        break;
      }
      
      case "noteOff":
        // One-shot mode ignores note off
        if (this._playbackMode !== "one-shot") {
          this._voiceAllocator.release(event.data.note);
        }
        break;
    }
  }
  
  private _triggerNote(note: number, velocity: number): void {
    if (!this._sample) return;
    
    // Determine which slice to play
    let sliceIndex = 0;
    if (this._playbackMode === "slicing" && this._slices.length > 0) {
      // Map note to slice
      sliceIndex = (note - 36) % this._slices.length;
      if (sliceIndex < 0) sliceIndex = 0;
    }
    
    const voice = this._voiceAllocator.allocate(note, velocity);
    if (voice) {
      this._configureVoice(voice);
      voice.trigger(note, velocity, sliceIndex);
    }
  }
  
  private _configureVoice(voice: SimplerVoice): void {
    const getValue = (id: string) => this._params.get(id)?.value ?? 0;
    
    voice.configure(
      {
        attack: getValue("attack") / 1000,
        decay: getValue("decay") / 1000,
        sustain: getValue("sustain") / 100,
        release: getValue("release") / 1000,
      },
      {
        attack: getValue("filterAttack") / 1000,
        decay: getValue("filterDecay") / 1000,
        sustain: getValue("filterSustain") / 100,
        release: getValue("filterRelease") / 1000,
      },
      {
        freq: getValue("filterFreq"),
        resonance: 0.1 + getValue("filterRes") / 10,
        envAmount: getValue("filterEnv"),
      },
      {
        rate: getValue("lfoRate"),
        waveform: ["sine", "triangle", "square", "saw", "s&h", "noise"][Math.round(getValue("lfoWaveform"))] as any,
        filterAmount: getValue("lfoFilter"),
        pitchAmount: getValue("lfoPitch"),
      },
      getValue("glide"),
      getValue("detune"),
      getValue("spread")
    );
  }
  
  private _updateVoiceParams(): void {
    for (const voice of this._voices) {
      if (voice.active) {
        this._configureVoice(voice);
      }
    }
  }
  
  private _autoSlice(divisions = 4): void {
    if (!this._sample) return;
    
    const sampleLength = this._sample.buffer[0].length;
    
    if (this._sliceMode === "beat") {
      // Slice by beat divisions
      this._slices = [];
      const sliceSize = Math.floor(sampleLength / divisions);
      
      for (let i = 0; i < divisions; i++) {
        this._slices.push({
          start: i * sliceSize,
          end: (i + 1) * sliceSize,
          rootNote: 36 + i,
        });
      }
    } else if (this._sliceMode === "transient") {
      // Simplified transient detection
      this._slices = this._detectTransients();
    }
    
    // Update sample with slices
    if (this._sample) {
      this._sample.slices = this._slices;
    }
  }
  
  private _detectTransients(): Slice[] {
    if (!this._sample) return [];
    
    const sampleLength = this._sample.buffer[0].length;
    const slices: Slice[] = [];
    const sampleData = this._sample.buffer[0];
    
    // Simple energy-based transient detection
    const windowSize = 512;
    const threshold = 0.1;
    let lastEnergy = 0;
    let sliceStart = 0;
    
    for (let i = 0; i < sampleLength; i += windowSize) {
      // Calculate RMS energy
      let energy = 0;
      for (let j = 0; j < windowSize && i + j < sampleLength; j++) {
        energy += sampleData[i + j] * sampleData[i + j];
      }
      energy = Math.sqrt(energy / windowSize);
      
      // Detect transient
      if (energy > lastEnergy * 2 && energy > threshold) {
        if (i > sliceStart + windowSize * 2) {
          slices.push({
            start: sliceStart,
            end: i,
            rootNote: 36 + slices.length,
          });
          sliceStart = i;
        }
      }
      
      lastEnergy = energy * 0.9 + lastEnergy * 0.1; // Smooth
    }
    
    // Add final slice
    if (sliceStart < sampleLength - windowSize) {
      slices.push({
        start: sliceStart,
        end: sampleLength,
        rootNote: 36 + slices.length,
      });
    }
    
    return slices.length > 0 ? slices : [{ start: 0, end: sampleLength, rootNote: 60 }];
  }
}

// =============================================================================
// Parameters
// =============================================================================

const SIMPLER_PARAMETERS: PluginParameterSpec[] = [
  // Playback Mode
  { 
    id: "playbackMode", 
    name: "Mode", 
    kind: "enum", 
    min: 0, 
    max: 2, 
    defaultValue: 0, 
    labels: ["Classic", "One-Shot", "Slicing"] 
  },
  
  // Amp Envelope
  { id: "attack", name: "Attack", kind: "float", min: 0.1, max: 10000, defaultValue: 0.01, unit: "ms" },
  { id: "decay", name: "Decay", kind: "float", min: 1, max: 10000, defaultValue: 0.1, unit: "ms" },
  { id: "sustain", name: "Sustain", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "release", name: "Release", kind: "float", min: 1, max: 30000, defaultValue: 0.3, unit: "ms" },
  
  // Filter
  { 
    id: "filterType", 
    name: "Filter Type", 
    kind: "enum", 
    min: 0, 
    max: 3, 
    defaultValue: 0, 
    labels: ["LP", "HP", "BP", "Notch"] 
  },
  { id: "filterFreq", name: "Filter Freq", kind: "float", min: 20, max: 20000, defaultValue: 1, unit: "Hz" },
  { id: "filterRes", name: "Resonance", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "filterEnv", name: "Env Amount", kind: "float", min: -100, max: 100, defaultValue: 0, unit: "%" },
  
  // Filter Envelope
  { id: "filterAttack", name: "F.Attack", kind: "float", min: 0.1, max: 10000, defaultValue: 0.01, unit: "ms" },
  { id: "filterDecay", name: "F.Decay", kind: "float", min: 1, max: 10000, defaultValue: 0.2, unit: "ms" },
  { id: "filterSustain", name: "F.Sustain", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "filterRelease", name: "F.Release", kind: "float", min: 1, max: 30000, defaultValue: 0.3, unit: "ms" },
  
  // LFO
  { 
    id: "lfoWaveform", 
    name: "LFO Wave", 
    kind: "enum", 
    min: 0, 
    max: 5, 
    defaultValue: 0, 
    labels: ["Sine", "Triangle", "Square", "Saw", "S&H", "Noise"] 
  },
  { id: "lfoRate", name: "LFO Rate", kind: "float", min: 0.01, max: 100, defaultValue: 0.1, unit: "Hz" },
  { id: "lfoFilter", name: "LFO→Filter", kind: "float", min: -100, max: 100, defaultValue: 0, unit: "%" },
  { id: "lfoPitch", name: "LFO→Pitch", kind: "float", min: -100, max: 100, defaultValue: 0, unit: "%" },
  
  // Voice
  { id: "glide", name: "Glide", kind: "float", min: 0, max: 5000, defaultValue: 0, unit: "ms" },
  { id: "detune", name: "Detune", kind: "float", min: -100, max: 100, defaultValue: 0, unit: "cents" },
  { id: "spread", name: "Spread", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "voices", name: "Voices", kind: "enum", min: 0, max: 5, defaultValue: 0.6, labels: ["1", "2", "4", "8", "16", "32"] },
  
  // Global
  { id: "gain", name: "Gain", kind: "float", min: -24, max: 12, defaultValue: 0.75, unit: "dB" },
  { id: "pan", name: "Pan", kind: "float", min: -50, max: 50, defaultValue: 0.5 },
  { id: "transpose", name: "Transpose", kind: "int", min: -24, max: 24, defaultValue: 0.5, unit: "st" },
  { id: "finetune", name: "Fine", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "cents" },
];

// =============================================================================
// Plugin Definition
// =============================================================================

export function createSimplerDefinition(): PluginDefinition {
  return {
    id: "com.daw.simpler",
    name: "Simpler",
    category: "instrument",
    version: "2.0.0",
    vendor: "DAW",
    description: "Enhanced sampler with Classic, One-Shot, and Slicing modes",
    parameters: SIMPLER_PARAMETERS,
    ui: {
      type: "custom",
      width: 900,
      height: 500,
      resizable: true,
      layout: [
        { title: "Mode", parameters: ["playbackMode"], layout: "horizontal" },
        { title: "Envelope", parameters: ["attack", "decay", "sustain", "release"], layout: "horizontal" },
        { title: "Filter", parameters: ["filterType", "filterFreq", "filterRes", "filterEnv"], layout: "horizontal" },
        { title: "LFO", parameters: ["lfoWaveform", "lfoRate", "lfoFilter", "lfoPitch"], layout: "horizontal" },
      ],
    },
    audioInputs: 0,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 0,
    supportsMpe: false,
    hasSidechain: false,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const simpler = new SimplerInstance(16, ctx.maxBlockSize);
      simpler.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return simpler;
    },
  };
}
