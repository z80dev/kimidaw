/**
 * Subtractive Synthesizer
 * 
 * Classic subtractive synthesis with:
 * - 2 oscillators + sub + noise
 * - Multimode resonant filter
 * - 3 envelopes (amp, filter, pitch)
 * - 2 LFOs
 * - 8-slot modulation matrix
 * - Unison / detune / stereo spread
 * 
 * Based on engineering spec section 10.4
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
  LFO,
  Oscillator,
  Waveform,
  dbToLinear,
  clamp,
} from "../../core/DspBase.js";

// =============================================================================
// Parameter Specifications
// =============================================================================

const SUBTRACTIVE_PARAMETERS: PluginParameterSpec[] = [
  // Oscillator 1
  { id: "osc1Wave", name: "Waveform", kind: "enum", min: 0, max: 4, defaultValue: 0, labels: ["Sine", "Triangle", "Saw", "Square", "Pulse"] },
  { id: "osc1Pitch", name: "Pitch", kind: "int", min: -24, max: 24, defaultValue: 0.5, unit: "st" },
  { id: "osc1Detune", name: "Detune", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "cents" },
  { id: "osc1Level", name: "Level", kind: "float", min: 0, max: 100, defaultValue: 0.8, unit: "%" },
  { id: "osc1PulseWidth", name: "Pulse Width", kind: "float", min: 1, max: 99, defaultValue: 0.5, unit: "%" },
  
  // Oscillator 2
  { id: "osc2Wave", name: "Waveform", kind: "enum", min: 0, max: 4, defaultValue: 0.4, labels: ["Sine", "Triangle", "Saw", "Square", "Pulse"] },
  { id: "osc2Pitch", name: "Pitch", kind: "int", min: -24, max: 24, defaultValue: 0.5, unit: "st" },
  { id: "osc2Detune", name: "Detune", kind: "float", min: -100, max: 100, defaultValue: 0.52, unit: "cents" },
  { id: "osc2Level", name: "Level", kind: "float", min: 0, max: 100, defaultValue: 0.6, unit: "%" },
  { id: "osc2PulseWidth", name: "Pulse Width", kind: "float", min: 1, max: 99, defaultValue: 0.5, unit: "%" },
  { id: "osc2Sync", name: "Hard Sync", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  
  // Sub Oscillator
  { id: "subLevel", name: "Sub Level", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "subOctave", name: "Sub Octave", kind: "enum", min: 0, max: 1, defaultValue: 0, labels: ["-1 Oct", "-2 Oct"] },
  
  // Noise
  { id: "noiseLevel", name: "Noise Level", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "noiseType", name: "Noise Type", kind: "enum", min: 0, max: 1, defaultValue: 0, labels: ["White", "Pink"] },
  
  // Filter
  { id: "filterType", name: "Type", kind: "enum", min: 0, max: 3, defaultValue: 0, labels: ["LP", "HP", "BP", "Notch"] },
  { id: "filterFreq", name: "Frequency", kind: "float", min: 20, max: 20000, defaultValue: 0.6, unit: "Hz" },
  { id: "filterRes", name: "Resonance", kind: "float", min: 0, max: 100, defaultValue: 0.2, unit: "%" },
  { id: "filterEnv", name: "Env Amount", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "filterKeyTrack", name: "Key Track", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  
  // Amp Envelope
  { id: "ampAttack", name: "Attack", kind: "float", min: 0, max: 10000, defaultValue: 0.01, unit: "ms" },
  { id: "ampDecay", name: "Decay", kind: "float", min: 0, max: 10000, defaultValue: 0.1, unit: "ms" },
  { id: "ampSustain", name: "Sustain", kind: "float", min: 0, max: 100, defaultValue: 0.8, unit: "%" },
  { id: "ampRelease", name: "Release", kind: "float", min: 0, max: 30000, defaultValue: 0.3, unit: "ms" },
  
  // Filter Envelope
  { id: "filterAttack", name: "Attack", kind: "float", min: 0, max: 10000, defaultValue: 0.01, unit: "ms" },
  { id: "filterDecay", name: "Decay", kind: "float", min: 0, max: 10000, defaultValue: 0.2, unit: "ms" },
  { id: "filterSustain", name: "Sustain", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  { id: "filterRelease", name: "Release", kind: "float", min: 0, max: 30000, defaultValue: 0.3, unit: "ms" },
  
  // Pitch Envelope
  { id: "pitchAttack", name: "Attack", kind: "float", min: 0, max: 10000, defaultValue: 0, unit: "ms" },
  { id: "pitchDecay", name: "Decay", kind: "float", min: 0, max: 10000, defaultValue: 0.1, unit: "ms" },
  { id: "pitchAmount", name: "Amount", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "st" },
  
  // LFO 1
  { id: "lfo1Wave", name: "Waveform", kind: "enum", min: 0, max: 5, defaultValue: 0, labels: ["Sine", "Triangle", "Square", "Saw", "S&H", "Noise"] },
  { id: "lfo1Rate", name: "Rate", kind: "float", min: 0.01, max: 100, defaultValue: 0.2, unit: "Hz" },
  { id: "lfo1Amount", name: "Amount", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "lfo1Target", name: "Target", kind: "enum", min: 0, max: 4, defaultValue: 0, labels: ["Pitch", "Filter", "Amp", "PWM", "Osc2"] },
  
  // LFO 2
  { id: "lfo2Wave", name: "Waveform", kind: "enum", min: 0, max: 5, defaultValue: 0, labels: ["Sine", "Triangle", "Square", "Saw", "S&H", "Noise"] },
  { id: "lfo2Rate", name: "Rate", kind: "float", min: 0.01, max: 100, defaultValue: 0.3, unit: "Hz" },
  { id: "lfo2Amount", name: "Amount", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "lfo2Target", name: "Target", kind: "enum", min: 0, max: 4, defaultValue: 0, labels: ["Pitch", "Filter", "Amp", "PWM", "Osc2"] },
  
  // Unison
  { id: "unisonVoices", name: "Voices", kind: "enum", min: 0, max: 3, defaultValue: 0, labels: ["Off", "2", "4", "8"] },
  { id: "unisonDetune", name: "Detune", kind: "float", min: 0, max: 100, defaultValue: 0.2, unit: "%" },
  { id: "unisonSpread", name: "Spread", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  
  // Master
  { id: "masterGain", name: "Gain", kind: "float", min: -96, max: 12, defaultValue: 0.75, unit: "dB" },
  { id: "masterPan", name: "Pan", kind: "float", min: -50, max: 50, defaultValue: 0.5 },
  { id: "glide", name: "Glide", kind: "float", min: 0, max: 5000, defaultValue: 0, unit: "ms" },
  { id: "polyphony", name: "Polyphony", kind: "enum", min: 0, max: 3, defaultValue: 0.75, labels: ["Mono", "2", "4", "8", "16", "32"] },
  { id: "legato", name: "Legato", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "velToFilter", name: "Vel -> Filter", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "velToAmp", name: "Vel -> Amp", kind: "bool", min: 0, max: 1, defaultValue: 1 },
];

// =============================================================================
// Synth Voice
// =============================================================================

class SubtractiveVoice extends VoiceBase {
  // Parameters
  private _params: Map<string, number> = new Map();
  
  // Oscillators
  private _osc1: Oscillator;
  private _osc2: Oscillator;
  private _subOsc: Oscillator;
  
  // Filter
  private _filter: BiquadFilter;
  private _filterBaseFreq: number;
  
  // Envelopes
  private _ampEnv: ADSREnvelope;
  private _filterEnv: ADSREnvelope;
  private _pitchEnv: ADSREnvelope;
  
  // LFOs
  private _lfo1: LFO;
  private _lfo2: LFO;
  
  // Unison
  private _unisonDetunes: number[] = [];
  private _unisonPans: number[] = [];
  
  // Glide
  private _currentFreq: number = 0;
  private _targetFreq: number = 0;
  private _glideRate: number = 0;
  
  // State
  private _sampleRate: number;
  private _osc2Phase: number = 0;
  private _noiseBuffer: Float32Array;
  private _noiseIndex = 0;

  constructor(sampleRate = 48000, maxBlockSize = 128) {
    super();
    this._sampleRate = sampleRate;
    
    // Create oscillators
    this._osc1 = new Oscillator(sampleRate);
    this._osc2 = new Oscillator(sampleRate);
    this._subOsc = new Oscillator(sampleRate);
    this._subOsc.setWaveform("square");
    
    // Create filter
    this._filter = new BiquadFilter(sampleRate);
    this._filterBaseFreq = 20000;
    
    // Create envelopes
    this._ampEnv = new ADSREnvelope({}, sampleRate);
    this._filterEnv = new ADSREnvelope({}, sampleRate);
    this._pitchEnv = new ADSREnvelope({}, sampleRate);
    
    // Create LFOs
    this._lfo1 = new LFO(sampleRate);
    this._lfo2 = new LFO(sampleRate);
    
    // Noise buffer (pink noise approximation)
    this._noiseBuffer = new Float32Array(4096);
    this._generateNoise();
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._osc1.setSampleRate(sr);
    this._osc2.setSampleRate(sr);
    this._subOsc.setSampleRate(sr);
    this._filter.setSampleRate(sr);
    this._ampEnv.setSampleRate(sr);
    this._filterEnv.setSampleRate(sr);
    this._pitchEnv.setSampleRate(sr);
  }

  setParams(params: Map<string, number>): void {
    this._params = params;
    this._updateFromParams();
  }

  trigger(note: number, velocity: number): void {
    this.note = note;
    this.velocity = velocity;
    this.active = true;
    this.age = 0;
    
    // Calculate frequencies
    const baseFreq = 440 * Math.pow(2, (note - 69) / 12);
    this._targetFreq = baseFreq;
    
    if (this._currentFreq === 0 || this._params.get("glide") === 0) {
      this._currentFreq = baseFreq;
    }
    
    // Set oscillator frequencies
    this._updateOscFrequencies();
    
    // Reset envelopes
    this._ampEnv.trigger();
    this._filterEnv.trigger();
    this._pitchEnv.trigger();
    
    // Reset filter
    this._filter.reset();
    
    // Reset oscillators
    this._osc1.reset();
    this._osc2.reset();
    this._subOsc.reset();
    
    // Setup unison
    this._setupUnison();
  }

  release(): void {
    this._ampEnv.release();
    this._filterEnv.release();
    this._pitchEnv.release();
  }

  stop(): void {
    this._ampEnv.stop();
    this.active = false;
    this._currentFreq = 0;
  }

  isFinished(): boolean {
    return !this.active || (!this._ampEnv.isActive && this._ampEnv.level < 0.0001);
  }

  process(left: Float32Array, right: Float32Array, offset: number, count: number): void {
    if (!this.active) return;
    
    // Get parameters
    const osc1Level = (this._params.get("osc1Level") ?? 80) / 100;
    const osc2Level = (this._params.get("osc2Level") ?? 60) / 100;
    const subLevel = (this._params.get("subLevel") ?? 0) / 100;
    const noiseLevel = (this._params.get("noiseLevel") ?? 0) / 100;
    
    const lfo1Amount = (this._params.get("lfo1Amount") ?? 0) / 100;
    const lfo2Amount = (this._params.get("lfo2Amount") ?? 0) / 100;
    
    const unisonVoices = [1, 2, 4, 8][Math.round(this._params.get("unisonVoices") ?? 0)];
    const unisonSpread = (this._params.get("unisonSpread") ?? 50) / 100;
    
    const velocityGain = this._params.get("velToAmp") ? this.velocity / 127 : 1;
    
    // Handle glide
    const glideTime = this._params.get("glide") ?? 0;
    if (glideTime > 0 && Math.abs(this._currentFreq - this._targetFreq) > 0.1) {
      this._glideRate = (this._targetFreq - this._currentFreq) / (glideTime * this._sampleRate / 1000);
    }
    
    for (let i = 0; i < count; i++) {
      // Update glide
      if (glideTime > 0 && Math.abs(this._currentFreq - this._targetFreq) > 0.1) {
        this._currentFreq += this._glideRate;
        this._updateOscFrequencies();
      }
      
      // Process LFOs
      const lfo1Val = this._lfo1.process() * lfo1Amount;
      const lfo2Val = this._lfo2.process() * lfo2Amount;
      
      // Apply LFO modulation
      if (this._params.get("lfo1Target") === 0) { // Pitch
        const mod = 1 + lfo1Val * 0.1; // ±10%
        this._osc1.setFrequency(this._currentFreq * mod);
        this._osc2.setFrequency(this._currentFreq * (this._params.get("osc2Pitch") ?? 0) * mod);
      }
      
      // Process envelopes
      const ampEnv = this._ampEnv.process();
      const filterEnv = this._filterEnv.process();
      const pitchEnv = this._pitchEnv.process();
      
      // Apply pitch envelope
      if (pitchEnv > 0) {
        const pitchAmount = this._params.get("pitchAmount") ?? 0;
        const pitchMod = Math.pow(2, pitchEnv * pitchAmount / 12);
        this._osc1.setFrequency(this._currentFreq * pitchMod);
        this._osc2.setFrequency(this._currentFreq * pitchMod);
      }
      
      // Calculate filter frequency
      const filterBase = this._filterBaseFreq;
      const filterEnvAmount = (this._params.get("filterEnv") ?? 0) / 100;
      const keyTrack = (this._params.get("filterKeyTrack") ?? 0) / 100;
      const velFilter = (this._params.get("velToFilter") ?? 0) / 100 * (this.velocity / 127);
      
      let filterFreq = filterBase;
      filterFreq *= Math.pow(2, filterEnv * filterEnvAmount * 4); // ±4 octaves
      filterFreq *= Math.pow(2, (this.note - 60) / 12 * keyTrack);
      filterFreq *= 1 + velFilter;
      
      if (this._params.get("lfo1Target") === 1) { // Filter
        filterFreq *= 1 + lfo1Val;
      }
      
      this._filter.setFrequency(clamp(filterFreq, 20, 20000));
      
      // Generate audio
      let sample = 0;
      
      // Unison processing
      for (let u = 0; u < unisonVoices; u++) {
        // Detune oscillators
        const detune = this._unisonDetunes[u] ?? 0;
        const detuneRatio = Math.pow(2, detune / 1200);
        
        this._osc1.setFrequency(this._currentFreq * detuneRatio);
        this._osc2.setFrequency(this._currentFreq * detuneRatio * Math.pow(2, (this._params.get("osc2Pitch") ?? 0) / 12));
        
        // Generate oscillator samples
        const s1 = this._osc1.process() * osc1Level;
        const s2 = this._osc2.process() * osc2Level;
        const sub = this._subOsc.process() * subLevel;
        
        // Noise
        const noise = this._getNoise() * noiseLevel;
        
        // Mix
        sample += (s1 + s2 + sub + noise) / unisonVoices;
      }
      
      // Apply filter
      sample = this._filter.process(sample);
      
      // Apply amplitude envelope and velocity
      sample *= ampEnv * velocityGain;
      
      // Output
      const idx = offset + i;
      left[idx] += sample;
      right[idx] += sample; // Will apply spread later
    }
  }

  private _updateFromParams(): void {
    // Oscillator waveforms
    const waves: Waveform[] = ["sine", "triangle", "sawtooth", "square", "pulse"];
    this._osc1.setWaveform(waves[Math.round(this._params.get("osc1Wave") ?? 0)]);
    this._osc2.setWaveform(waves[Math.round(this._params.get("osc2Wave") ?? 2)]);
    
    // Pulse widths
    this._osc1.setPulseWidth((this._params.get("osc1PulseWidth") ?? 50) / 100);
    this._osc2.setPulseWidth((this._params.get("osc2PulseWidth") ?? 50) / 100);
    
    // Oscillator detunes
    this._osc1.setFrequency(this._currentFreq);
    this._osc2.setFrequency(this._currentFreq * Math.pow(2, (this._params.get("osc2Pitch") ?? 0) / 12));
    
    // Sub octave
    const subOctave = Math.round(this._params.get("subOctave") ?? 0) === 0 ? 0.5 : 0.25;
    this._subOsc.setFrequency(this._currentFreq * subOctave);
    
    // Filter
    const filterTypes = ["lowpass", "highpass", "bandpass", "notch"];
    this._filter.setType(filterTypes[Math.round(this._params.get("filterType") ?? 0)] as any);
    this._filterBaseFreq = this._params.get("filterFreq") ?? 20000;
    this._filter.setFrequency(this._filterBaseFreq);
    this._filter.setQ(0.1 + (this._params.get("filterRes") ?? 20) / 10);
    
    // Envelopes
    this._ampEnv.setConfig({
      attack: (this._params.get("ampAttack") ?? 10) / 1000,
      decay: (this._params.get("ampDecay") ?? 100) / 1000,
      sustain: (this._params.get("ampSustain") ?? 80) / 100,
      release: (this._params.get("ampRelease") ?? 300) / 1000,
    });
    
    this._filterEnv.setConfig({
      attack: (this._params.get("filterAttack") ?? 10) / 1000,
      decay: (this._params.get("filterDecay") ?? 200) / 1000,
      sustain: (this._params.get("filterSustain") ?? 30) / 100,
      release: (this._params.get("filterRelease") ?? 300) / 1000,
    });
    
    this._pitchEnv.setConfig({
      attack: (this._params.get("pitchAttack") ?? 0) / 1000,
      decay: (this._params.get("pitchDecay") ?? 100) / 1000,
      sustain: 0,
      release: 0.1,
    });
    
    // LFOs
    const lfoWaves = ["sine", "triangle", "square", "saw", "s&h", "noise"];
    this._lfo1.setWaveform(lfoWaves[Math.round(this._params.get("lfo1Wave") ?? 0)] as any);
    this._lfo1.setRate(this._params.get("lfo1Rate") ?? 1);
    this._lfo2.setWaveform(lfoWaves[Math.round(this._params.get("lfo2Wave") ?? 0)] as any);
    this._lfo2.setRate(this._params.get("lfo2Rate") ?? 1);
  }

  private _updateOscFrequencies(): void {
    const osc1Detune = (this._params.get("osc1Detune") ?? 0) / 100;
    const osc2Detune = (this._params.get("osc2Detune") ?? 0) / 100;
    
    this._osc1.setFrequency(this._currentFreq * Math.pow(2, osc1Detune / 12));
    this._osc2.setFrequency(this._currentFreq * Math.pow(2, ((this._params.get("osc2Pitch") ?? 0) + osc2Detune) / 12));
    
    const subOctave = Math.round(this._params.get("subOctave") ?? 0) === 0 ? 0.5 : 0.25;
    this._subOsc.setFrequency(this._currentFreq * subOctave);
  }

  private _setupUnison(): void {
    const voices = [1, 2, 4, 8][Math.round(this._params.get("unisonVoices") ?? 0)];
    const spread = (this._params.get("unisonDetune") ?? 20) / 100 * 50; // cents
    
    this._unisonDetunes = [];
    this._unisonPans = [];
    
    if (voices <= 1) {
      this._unisonDetunes.push(0);
      this._unisonPans.push(0);
      return;
    }
    
    for (let i = 0; i < voices; i++) {
      const t = i / (voices - 1);
      this._unisonDetunes.push((t - 0.5) * 2 * spread);
      this._unisonPans.push((t - 0.5) * 2);
    }
  }

  private _getNoise(): number {
    const val = this._noiseBuffer[this._noiseIndex];
    this._noiseIndex = (this._noiseIndex + 1) % this._noiseBuffer.length;
    return val;
  }

  private _generateNoise(): void {
    // Pink noise approximation (Voss-McCartney algorithm)
    let white = 0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < this._noiseBuffer.length; i++) {
      white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      this._noiseBuffer[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
}

// =============================================================================
// Main Synth Instance
// =============================================================================

export class SubtractiveSynthInstance implements PluginInstanceRuntime {
  private _params: ReturnType<typeof createParameterMap>;
  private _voices: SubtractiveVoice[];
  private _voiceAllocator: VoiceAllocator<SubtractiveVoice>;
  
  private _sampleRate = 48000;
  private _blockSize = 128;
  
  private _leftBuffer: Float32Array;
  private _rightBuffer: Float32Array;
  
  private _connected = false;

  constructor(maxVoices = 16, maxBlockSize = 128) {
    this._params = createParameterMap(SUBTRACTIVE_PARAMETERS);
    
    // Create voices
    this._voices = [];
    for (let i = 0; i < maxVoices; i++) {
      this._voices.push(new SubtractiveVoice(48000, maxBlockSize));
    }
    
    this._voiceAllocator = new VoiceAllocator(this._voices);
    
    // Pre-allocate buffers
    this._leftBuffer = new Float32Array(maxBlockSize);
    this._rightBuffer = new Float32Array(maxBlockSize);
  }

  connect(graph: PluginConnectionGraph): void {
    if (graph.midiInput) {
      graph.midiInput.onReceive?.((event: MidiEvent) => {
        this._handleMidiEvent(event);
      });
    }
    this._connected = true;
  }

  disconnect(): void {
    this._voiceAllocator.stopAll();
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    const param = this._params.get(id);
    if (param) {
      param.setNormalized(value);
      this._updateVoiceParams();
    }
  }

  getParam(id: string): number {
    return this._params.get(id)?.normalizedValue ?? 0;
  }

  async saveState(): Promise<Record<string, number>> {
    return this._params.getNormalizedValues();
  }

  async loadState(state: unknown): Promise<void> {
    if (state && typeof state === "object") {
      this._params.setNormalizedValues(state as Record<string, number>);
      this._updateVoiceParams();
    }
  }

  getLatencySamples(): number { return 0; }
  
  getTailSamples(): number {
    const release = this._params.get("ampRelease")?.value ?? 300;
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

    this._leftBuffer.fill(0, 0, blockSize);
    this._rightBuffer.fill(0, 0, blockSize);

    for (const event of midi) {
      this._handleMidiEvent(event);
    }

    this._params.processSmoothing();

    // Update voice params
    const paramsMap = new Map<string, number>();
    for (const [id, value] of Object.entries(this._params.getValues())) {
      paramsMap.set(id, value);
    }
    
    for (const voice of this._voices) {
      if (voice.active) {
        voice.setParams(paramsMap);
      }
    }

    this._voiceAllocator.process(this._leftBuffer, this._rightBuffer, 0, blockSize);

    // Apply master gain and pan
    const gain = dbToLinear(this._params.get("masterGain")?.value ?? 0);
    const pan = (this._params.get("masterPan")?.value ?? 0) / 50;
    const leftGain = gain * Math.cos((pan + 1) * Math.PI / 4);
    const rightGain = gain * Math.sin((pan + 1) * Math.PI / 4);

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

  private _handleMidiEvent(event: MidiEvent): void {
    switch (event.type) {
      case "noteOn": {
        if (event.data.velocity === 0) {
          this._voiceAllocator.release(event.data.note);
        } else {
          const voice = this._voiceAllocator.allocate(event.data.note, event.data.velocity);
          if (voice) {
            voice.setParams(new Map(Object.entries(this._params.getValues())));
          }
        }
        break;
      }
      case "noteOff":
        this._voiceAllocator.release(event.data.note);
        break;
    }
  }

  private _updateVoiceParams(): void {
    const paramsMap = new Map<string, number>();
    for (const [id, value] of Object.entries(this._params.getValues())) {
      paramsMap.set(id, value);
    }
    for (const voice of this._voices) {
      voice.setParams(paramsMap);
    }
  }
}

// =============================================================================
// Plugin Definition
// =============================================================================

export function createSubtractiveSynthDefinition(): PluginDefinition {
  return {
    id: "com.daw.subtractive",
    name: "Subtractive Synth",
    category: "instrument",
    version: "1.0.0",
    vendor: "DAW",
    description: "Classic subtractive synthesizer with dual oscillators and multimode filter",
    parameters: SUBTRACTIVE_PARAMETERS,
    ui: {
      type: "custom",
      width: 900,
      height: 600,
      resizable: true,
    },
    audioInputs: 0,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const synth = new SubtractiveSynthInstance(16, ctx.maxBlockSize);
      synth.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return synth;
    },
  };
}
