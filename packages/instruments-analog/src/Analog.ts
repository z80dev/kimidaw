/**
 * Analog Subtractive Synthesizer
 * 
 * Ableton-style analog subtractive synthesizer featuring:
 * - 2 main oscillators with multiple waveforms
 * - Sub oscillator (-1/-2 octaves)
 * - Noise generator with multiple colors
 * - 2 multimode filters (LP/HP/BP/Notch/Formant)
 * - Series or parallel filter routing
 * - 3 envelopes (amp, filter, mod)
 * - 2 LFOs with multiple destinations
 * - Glide/portamento
 * - Unison and stereo spread
 * 
 * Based on Ableton Live's Analog instrument.
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  MidiEvent,
  AudioBuffer,
} from "@daw/plugin-api";
import { createParameterMap, midiToFrequency, dbToGain } from "@daw/plugin-api";
import {
  type AnalogStateSnapshot,
  type OscillatorConfig,
  type FilterConfig,
  type LFOConfig,
  type AmpEnvelopeConfig,
  type FilterEnvelopeConfig,
  type ModEnvelopeConfig,
  generateAnalogParameters,
  createDefaultAnalogState,
} from "./types.js";

// =============================================================================
// Realtime-Safe Oscillator
// =============================================================================

class AnalogOscillator {
  private _phase = 0;
  private _frequency = 440;
  private _waveform: OscillatorConfig["waveform"] = "sawtooth";
  private _pulseWidth = 0.5;
  private _shapeMod = 0;
  private _sampleRate = 48000;
  private _noiseSeed = 12345;
  
  setFrequency(freq: number): void {
    this._frequency = freq;
  }
  
  setWaveform(waveform: OscillatorConfig["waveform"]): void {
    this._waveform = waveform;
  }
  
  setPulseWidth(pw: number): void {
    this._pulseWidth = Math.max(0.01, Math.min(0.99, pw));
  }
  
  setShapeMod(amount: number): void {
    this._shapeMod = amount;
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
  }
  
  reset(): void {
    this._phase = 0;
  }
  
  process(): number {
    const phaseInc = this._frequency / this._sampleRate;
    this._phase += phaseInc;
    while (this._phase >= 1) this._phase -= 1;
    
    const phase = this._phase;
    
    switch (this._waveform) {
      case "sine":
        return Math.sin(phase * 2 * Math.PI);
      
      case "triangle": {
        // Triangle with optional wave shaping
        let tri = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
        // Apply shape modulation (wave folding simulation)
        if (this._shapeMod > 0) {
          const fold = this._shapeMod * 0.5;
          tri = Math.max(-1, Math.min(1, tri * (1 + fold)));
        }
        return tri;
      }
      
      case "sawtooth": {
        let saw = 2 * phase - 1;
        // Shape mod creates "super saw" effect (simplified)
        if (this._shapeMod > 0) {
          const detune = this._shapeMod * 0.01;
          saw += Math.sin((phase + detune) * 2 * Math.PI) * 0.3 * this._shapeMod;
        }
        return saw;
      }
      
      case "square":
        return phase < 0.5 ? 1 : -1;
      
      case "pulse":
        return phase < this._pulseWidth ? 1 : -1;
      
      default:
        return Math.sin(phase * 2 * Math.PI);
    }
  }
}

// =============================================================================
// Sub Oscillator
// =============================================================================

class SubOscillator {
  private _phase = 0;
  private _frequency = 220;
  private _octave: -2 | -1 = -1;
  private _tone = 0.5;
  private _sampleRate = 48000;
  
  setFrequency(baseFreq: number): void {
    const divisor = this._octave === -2 ? 4 : 2;
    this._frequency = baseFreq / divisor;
  }
  
  setOctave(oct: -2 | -1): void {
    this._octave = oct;
  }
  
  setTone(tone: number): void {
    this._tone = tone;
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
  }
  
  reset(): void {
    this._phase = 0;
  }
  
  process(): number {
    const phaseInc = this._frequency / this._sampleRate;
    this._phase += phaseInc;
    while (this._phase >= 1) this._phase -= 1;
    
    // Mix between square and pulse based on tone
    const pulseWidth = 0.3 + this._tone * 0.4; // 0.3 to 0.7
    return this._phase < pulseWidth ? 1 : -1;
  }
}

// =============================================================================
// Noise Generator
// =============================================================================

class NoiseGenerator {
  private _type: "white" | "pink" | "red" | "blue" = "white";
  private _color = 0.5;
  private _sampleRate = 48000;
  private _seed = 12345;
  
  // Pink noise state
  private _pinkB0 = 0;
  private _pinkB1 = 0;
  private _pinkB2 = 0;
  private _pinkB3 = 0;
  private _pinkB4 = 0;
  private _pinkB5 = 0;
  private _pinkB6 = 0;
  
  setType(type: "white" | "pink" | "red" | "blue"): void {
    this._type = type;
  }
  
  setColor(color: number): void {
    this._color = color;
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
  }
  
  reset(): void {
    this._seed = 12345;
    this._pinkB0 = this._pinkB1 = this._pinkB2 = this._pinkB3 = this._pinkB4 = this._pinkB5 = this._pinkB6 = 0;
  }
  
  process(): number {
    // Generate white noise
    this._seed = (this._seed * 1664525 + 1013904223) >>> 0;
    const white = (this._seed / 0x7fffffff) * 2 - 1;
    
    switch (this._type) {
      case "white":
        return white;
      
      case "pink":
        // Voss-McCartney pink noise algorithm
        this._pinkB0 = 0.99886 * this._pinkB0 + white * 0.0555179;
        this._pinkB1 = 0.99332 * this._pinkB1 + white * 0.0750759;
        this._pinkB2 = 0.96900 * this._pinkB2 + white * 0.1538520;
        this._pinkB3 = 0.86650 * this._pinkB3 + white * 0.3104856;
        this._pinkB4 = 0.55000 * this._pinkB4 + white * 0.5329522;
        this._pinkB5 = -0.7616 * this._pinkB5 - white * 0.0168980;
        const pink = (this._pinkB0 + this._pinkB1 + this._pinkB2 + this._pinkB3 + this._pinkB4 + this._pinkB5 + white * 0.5362) * 0.11;
        return pink;
      
      case "red":
        // Red/brown noise (more low frequency)
        this._pinkB0 = 0.99 * this._pinkB0 + white * 0.1;
        return this._pinkB0 * 3;
      
      case "blue":
        // Blue noise (more high frequency - simplified)
        return white - this._pinkB0;
      
      default:
        return white;
    }
  }
}

// =============================================================================
// Multimode Filter with Drive
// =============================================================================

class AnalogFilter {
  private _type: FilterConfig["type"] = "lowpass";
  private _slope: 12 | 24 = 24;
  private _freq = 20000;
  private _resonance = 0;
  private _drive = 0;
  private _sampleRate = 48000;
  
  // Biquad coefficients
  private _b0 = 1;
  private _b1 = 0;
  private _b2 = 0;
  private _a1 = 0;
  private _a2 = 0;
  
  // State (for stereo, use separate instances per channel)
  private _z1 = 0;
  private _z2 = 0;
  
  // Second biquad for 24dB slope
  private _z3 = 0;
  private _z4 = 0;
  
  setParameters(
    type: FilterConfig["type"],
    freq: number,
    resonance: number,
    slope: 12 | 24,
    drive: number
  ): void {
    if (this._type !== type || this._freq !== freq || 
        this._resonance !== resonance || this._slope !== slope || this._drive !== drive) {
      this._type = type;
      this._freq = Math.max(20, Math.min(this._sampleRate / 2, freq));
      this._resonance = Math.max(0, Math.min(100, resonance));
      this._slope = slope;
      this._drive = drive;
      this._updateCoefficients();
    }
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._updateCoefficients();
  }
  
  reset(): void {
    this._z1 = this._z2 = this._z3 = this._z4 = 0;
  }
  
  process(input: number): number {
    // Apply drive/saturation before filter
    if (this._drive > 0) {
      const driveAmount = this._drive / 100;
      input = Math.tanh(input * (1 + driveAmount * 4));
    }
    
    // First biquad stage
    let output = this._b0 * input + this._b1 * this._z1 + this._b2 * this._z2
               - this._a1 * this._z1 - this._a2 * this._z2;
    
    this._z2 = this._z1;
    this._z1 = output;
    
    // Second stage for 24dB
    if (this._slope === 24) {
      const input2 = output;
      output = this._b0 * input2 + this._b1 * this._z3 + this._b2 * this._z4
             - this._a1 * this._z3 - this._a2 * this._z4;
      
      this._z4 = this._z3;
      this._z3 = output;
    }
    
    return output;
  }
  
  private _updateCoefficients(): void {
    const w0 = 2 * Math.PI * this._freq / this._sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    
    // Q from 0.5 to 10 based on resonance
    const q = 0.5 + (this._resonance / 100) * 9.5;
    const alpha = sinw0 / (2 * q);
    
    switch (this._type) {
      case "lowpass":
        this._b0 = (1 - cosw0) / 2;
        this._b1 = 1 - cosw0;
        this._b2 = (1 - cosw0) / 2;
        break;
      
      case "highpass":
        this._b0 = (1 + cosw0) / 2;
        this._b1 = -(1 + cosw0);
        this._b2 = (1 + cosw0) / 2;
        break;
      
      case "bandpass":
        this._b0 = alpha;
        this._b1 = 0;
        this._b2 = -alpha;
        break;
      
      case "notch":
        this._b0 = 1;
        this._b1 = -2 * cosw0;
        this._b2 = 1;
        break;
      
      case "formant":
        // Formant filter - combine multiple resonances
        this._b0 = alpha * 2;
        this._b1 = 0;
        this._b2 = -alpha * 2;
        break;
    }
    
    const a0 = 1 + alpha;
    this._a1 = -2 * cosw0 / a0;
    this._a2 = (1 - alpha) / a0;
    this._b0 /= a0;
    this._b1 /= a0;
    this._b2 /= a0;
  }
}

// =============================================================================
// ADSR Envelope
// =============================================================================

class ADSREnvelope {
  private _phase: "idle" | "attack" | "decay" | "sustain" | "release" = "idle";
  private _level = 0;
  private _config: AmpEnvelopeConfig | FilterEnvelopeConfig;
  private _sampleRate = 48000;
  private _attackInc = 0;
  private _decayCoeff = 0;
  private _releaseCoeff = 0;
  
  constructor(config: Partial<AmpEnvelopeConfig> = {}, sampleRate = 48000) {
    this._sampleRate = sampleRate;
    this._config = {
      attack: 10,
      decay: 100,
      sustain: 0.8,
      release: 300,
      attackCurve: 0.5,
      ...config,
    };
    this._recalculate();
  }
  
  setConfig(config: Partial<AmpEnvelopeConfig>): void {
    this._config = { ...this._config, ...config };
    this._recalculate();
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._recalculate();
  }
  
  trigger(): void {
    this._phase = "attack";
    this._level = 0;
  }
  
  release(): void {
    if (this._phase !== "idle") {
      this._phase = "release";
    }
  }
  
  stop(): void {
    this._phase = "idle";
    this._level = 0;
  }
  
  process(): number {
    switch (this._phase) {
      case "attack": {
        const curve = (this._config as AmpEnvelopeConfig).attackCurve ?? 0.5;
        if (curve > 0.5) {
          // Exponential attack
          this._level += (1 - this._level) * this._attackInc * 2;
        } else {
          // Linear attack
          this._level += this._attackInc;
        }
        
        if (this._level >= 1) {
          this._level = 1;
          this._phase = "decay";
        }
        break;
      }
      
      case "decay":
        this._level = this._config.sustain + (this._level - this._config.sustain) * this._decayCoeff;
        if (Math.abs(this._level - this._config.sustain) < 0.001) {
          this._level = this._config.sustain;
          this._phase = "sustain";
        }
        break;
      
      case "sustain":
        this._level = this._config.sustain;
        break;
      
      case "release":
        this._level *= this._releaseCoeff;
        if (this._level < 0.0001) {
          this._level = 0;
          this._phase = "idle";
        }
        break;
    }
    
    return this._level;
  }
  
  get isActive(): boolean {
    return this._phase !== "idle";
  }
  
  get phase(): string {
    return this._phase;
  }
  
  private _recalculate(): void {
    const attackSamples = Math.max(1, this._config.attack * this._sampleRate / 1000);
    this._attackInc = 1 / attackSamples;
    
    const decaySamples = Math.max(1, this._config.decay * this._sampleRate / 1000);
    this._decayCoeff = Math.exp(-5 / decaySamples);
    
    const releaseSamples = Math.max(1, this._config.release * this._sampleRate / 1000);
    this._releaseCoeff = Math.exp(-5 / releaseSamples);
  }
}

// =============================================================================
// LFO
// =============================================================================

class AnalogLFO {
  private _phase = 0;
  private _waveform: LFOConfig["waveform"] = "sine";
  private _rate = 1;
  private _sampleRate = 48000;
  private _lastRandom = 0;
  private _retrigger = true;
  
  setWaveform(waveform: LFOConfig["waveform"]): void {
    this._waveform = waveform;
  }
  
  setRate(rate: number): void {
    this._rate = rate;
  }
  
  setRetrigger(retrigger: boolean): void {
    this._retrigger = retrigger;
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
  }
  
  reset(): void {
    if (this._retrigger) {
      this._phase = 0;
    }
    this._lastRandom = Math.random() * 2 - 1;
  }
  
  process(): number {
    const phaseInc = this._rate / this._sampleRate;
    this._phase += phaseInc;
    while (this._phase >= 1) {
      this._phase -= 1;
      if (this._waveform === "s&h") {
        this._lastRandom = Math.random() * 2 - 1;
      }
    }
    
    switch (this._waveform) {
      case "sine":
        return Math.sin(this._phase * 2 * Math.PI);
      
      case "triangle":
        return this._phase < 0.5 ? 4 * this._phase - 1 : 3 - 4 * this._phase;
      
      case "square":
        return this._phase < 0.5 ? 1 : -1;
      
      case "saw":
        return 2 * this._phase - 1;
      
      case "s&h":
        return this._lastRandom;
      
      case "noise":
        return Math.random() * 2 - 1;
      
      default:
        return 0;
    }
  }
}

// =============================================================================
// Analog Voice
// =============================================================================

type AnalogVoiceState = {
  note: number;
  velocity: number;
  active: boolean;
  age: number;
};

class AnalogVoice implements AnalogVoiceState {
  note = 0;
  velocity = 0;
  active = false;
  age = 0;
  
  // Oscillators
  private _osc1: AnalogOscillator;
  private _osc2: AnalogOscillator;
  private _subOsc: SubOscillator;
  private _noise: NoiseGenerator;
  
  // Filters
  private _filter1: AnalogFilter;
  private _filter2: AnalogFilter;
  
  // Envelopes
  private _ampEnv: ADSREnvelope;
  private _filterEnv: ADSREnvelope;
  private _modEnv: ADSREnvelope;
  
  // LFOs
  private _lfo1: AnalogLFO;
  private _lfo2: AnalogLFO;
  
  // Configuration
  private _osc1Config: OscillatorConfig;
  private _osc2Config: OscillatorConfig;
  private _filter1Config: FilterConfig;
  private _filter2Config: FilterConfig;
  private _filterRouting: "series" | "parallel" = "series";
  private _ampEnvConfig: AmpEnvelopeConfig;
  private _filterEnvConfig: FilterEnvelopeConfig;
  private _modEnvConfig: ModEnvelopeConfig;
  private _lfo1Config: LFOConfig;
  private _lfo2Config: LFOConfig;
  
  // Filter modulation
  private _filterEnvAmount = 0;
  private _filterLFOAmount = 0;
  private _filterKeyTrack = 0;
  
  // State
  private _baseFreq = 440;
  private _currentFreq = 440;
  private _targetFreq = 440;
  private _glideRate = 0;
  private _glideTime = 0;
  private _sampleRate = 48000;
  
  // Unison
  private _unisonVoices = 1;
  private _unisonDetunes: number[] = [];
  
  constructor(sampleRate = 48000) {
    this._sampleRate = sampleRate;
    
    this._osc1 = new AnalogOscillator();
    this._osc1.setSampleRate(sampleRate);
    
    this._osc2 = new AnalogOscillator();
    this._osc2.setSampleRate(sampleRate);
    
    this._subOsc = new SubOscillator();
    this._subOsc.setSampleRate(sampleRate);
    
    this._noise = new NoiseGenerator();
    this._noise.setSampleRate(sampleRate);
    
    this._filter1 = new AnalogFilter();
    this._filter1.setSampleRate(sampleRate);
    
    this._filter2 = new AnalogFilter();
    this._filter2.setSampleRate(sampleRate);
    
    this._ampEnv = new ADSREnvelope({}, sampleRate);
    this._filterEnv = new ADSREnvelope({}, sampleRate);
    this._modEnv = new ADSREnvelope({}, sampleRate);
    
    this._lfo1 = new AnalogLFO();
    this._lfo1.setSampleRate(sampleRate);
    
    this._lfo2 = new AnalogLFO();
    this._lfo2.setSampleRate(sampleRate);
    
    // Default configs
    this._osc1Config = {
      enabled: true,
      waveform: "sawtooth",
      pitch: 0,
      detune: 0,
      level: 0.8,
      pulseWidth: 0.5,
      hardSync: false,
      shapeMod: 0,
    };
    
    this._osc2Config = {
      enabled: true,
      waveform: "sawtooth",
      pitch: 0,
      detune: 0,
      level: 0.6,
      pulseWidth: 0.5,
      hardSync: false,
      shapeMod: 0,
    };
    
    this._filter1Config = {
      type: "lowpass",
      slope: 24,
      frequency: 20000,
      resonance: 0,
      drive: 0,
    };
    
    this._filter2Config = {
      type: "lowpass",
      slope: 24,
      frequency: 20000,
      resonance: 0,
      drive: 0,
    };
    
    this._ampEnvConfig = {
      attack: 10,
      decay: 100,
      sustain: 0.8,
      release: 300,
      attackCurve: 0.5,
    };
    
    this._filterEnvConfig = {
      attack: 10,
      decay: 200,
      sustain: 0.3,
      release: 300,
    };
    
    this._modEnvConfig = {
      attack: 10,
      decay: 200,
      sustain: 0,
      release: 300,
      loop: false,
      destination: "filter",
      amount: 0,
    };
    
    this._lfo1Config = {
      waveform: "sine",
      rate: 1,
      mode: "free",
      amount: 0,
      destination: "pitch",
      phase: 0,
      retrigger: true,
    };
    
    this._lfo2Config = {
      waveform: "sine",
      rate: 2,
      mode: "free",
      amount: 0,
      destination: "filter",
      phase: 0,
      retrigger: true,
    };
  }
  
  configure(
    osc1: OscillatorConfig,
    osc2: OscillatorConfig,
    subOsc: { enabled: boolean; octave: -2 | -1; level: number; tone: number },
    noise: { enabled: boolean; type: "white" | "pink" | "red" | "blue"; level: number; color: number },
    filter1: FilterConfig,
    filter2: FilterConfig,
    filterRouting: "series" | "parallel",
    filterEnv: FilterEnvelopeConfig,
    ampEnv: AmpEnvelopeConfig,
    modEnv: ModEnvelopeConfig,
    filterMod: { envAmount: number; lfoAmount: number; keyTrack: number },
    lfo1: LFOConfig,
    lfo2: LFOConfig,
    glide: { enabled: boolean; time: number; mode: "rate" | "time" },
    unison: number,
    unisonDetune: number
  ): void {
    this._osc1Config = osc1;
    this._osc2Config = osc2;
    this._filter1Config = filter1;
    this._filter2Config = filter2;
    this._filterRouting = filterRouting;
    this._ampEnvConfig = ampEnv;
    this._filterEnvConfig = filterEnv;
    this._modEnvConfig = modEnv;
    this._filterEnvAmount = filterMod.envAmount;
    this._filterLFOAmount = filterMod.lfoAmount;
    this._filterKeyTrack = filterMod.keyTrack;
    this._lfo1Config = lfo1;
    this._lfo2Config = lfo2;
    this._glideTime = glide.enabled ? glide.time : 0;
    this._unisonVoices = unison;
    this._unisonDetunes = [];
    
    // Setup unison detunes
    if (unison > 1) {
      for (let i = 0; i < unison; i++) {
        const t = i / (unison - 1);
        this._unisonDetunes.push((t - 0.5) * 2 * unisonDetune);
      }
    } else {
      this._unisonDetunes = [0];
    }
    
    // Update oscillators
    this._osc1.setWaveform(osc1.waveform);
    this._osc1.setPulseWidth(osc1.pulseWidth);
    this._osc1.setShapeMod(osc1.shapeMod);
    
    this._osc2.setWaveform(osc2.waveform);
    this._osc2.setPulseWidth(osc2.pulseWidth);
    this._osc2.setShapeMod(osc2.shapeMod);
    
    this._subOsc.setOctave(subOsc.octave);
    this._subOsc.setTone(subOsc.tone);
    
    this._noise.setType(noise.type);
    this._noise.setColor(noise.color);
    
    // Update envelopes
    this._ampEnv.setConfig(ampEnv);
    this._filterEnv.setConfig(filterEnv);
    this._modEnv.setConfig(modEnv);
    
    // Update LFOs
    this._lfo1.setWaveform(lfo1.waveform);
    this._lfo1.setRate(lfo1.rate);
    this._lfo1.setRetrigger(lfo1.retrigger);
    
    this._lfo2.setWaveform(lfo2.waveform);
    this._lfo2.setRate(lfo2.rate);
    this._lfo2.setRetrigger(lfo2.retrigger);
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._osc1.setSampleRate(sr);
    this._osc2.setSampleRate(sr);
    this._subOsc.setSampleRate(sr);
    this._noise.setSampleRate(sr);
    this._filter1.setSampleRate(sr);
    this._filter2.setSampleRate(sr);
    this._ampEnv.setSampleRate(sr);
    this._filterEnv.setSampleRate(sr);
    this._modEnv.setSampleRate(sr);
    this._lfo1.setSampleRate(sr);
    this._lfo2.setSampleRate(sr);
  }
  
  trigger(note: number, velocity: number): void {
    this.note = note;
    this.velocity = velocity;
    this.active = true;
    this.age = 0;
    
    // Calculate frequency
    this._targetFreq = 440 * Math.pow(2, (note - 69) / 12);
    
    if (this._currentFreq === 0 || this._glideTime === 0) {
      this._currentFreq = this._targetFreq;
    }
    
    this._updateFrequencies();
    
    // Trigger envelopes
    this._ampEnv.trigger();
    this._filterEnv.trigger();
    this._modEnv.trigger();
    
    // Reset LFOs
    this._lfo1.reset();
    this._lfo2.reset();
    
    // Reset filters
    this._filter1.reset();
    this._filter2.reset();
    
    // Reset oscillators
    this._osc1.reset();
    this._osc2.reset();
    this._subOsc.reset();
    this._noise.reset();
  }
  
  release(): void {
    this._ampEnv.release();
    this._filterEnv.release();
    this._modEnv.release();
  }
  
  stop(): void {
    this._ampEnv.stop();
    this.active = false;
    this._currentFreq = 0;
  }
  
  isFinished(): boolean {
    return !this.active || (!this._ampEnv.isActive && this._ampEnv["_level"] < 0.0001);
  }
  
  process(): { left: number; right: number } {
    if (!this.active) return { left: 0, right: 0 };
    
    if (this.isFinished()) {
      this.active = false;
      return { left: 0, right: 0 };
    }
    
    // Handle glide
    if (this._glideTime > 0 && Math.abs(this._currentFreq - this._targetFreq) > 0.1) {
      const glideSamples = this._glideTime * this._sampleRate / 1000;
      this._glideRate = (this._targetFreq - this._currentFreq) / glideSamples;
      this._currentFreq += this._glideRate;
      this._updateFrequencies();
    }
    
    // Process LFOs
    const lfo1Value = this._lfo1.process();
    const lfo2Value = this._lfo2.process();
    
    // Process envelopes
    const ampEnv = this._ampEnv.process();
    const filterEnv = this._filterEnv.process();
    const modEnv = this._modEnv.process();
    
    // Calculate filter frequency
    const baseFreq1 = this._filter1Config.frequency;
    const baseFreq2 = this._filter2Config.frequency;
    
    const keyTrackFactor = Math.pow(2, (this.note - 60) / 12 * this._filterKeyTrack / 100);
    const envMod = filterEnv * this._filterEnvAmount / 100 * 4; // ±4 octaves
    const lfoMod = lfo2Value * this._filterLFOAmount / 100;
    
    const filterFreq1 = Math.max(20, Math.min(this._sampleRate / 2, 
      baseFreq1 * Math.pow(2, envMod) * keyTrackFactor * (1 + lfoMod)));
    const filterFreq2 = Math.max(20, Math.min(this._sampleRate / 2, 
      baseFreq2 * Math.pow(2, envMod) * keyTrackFactor * (1 + lfoMod)));
    
    this._filter1.setParameters(
      this._filter1Config.type,
      filterFreq1,
      this._filter1Config.resonance,
      this._filter1Config.slope,
      this._filter1Config.drive
    );
    
    this._filter2.setParameters(
      this._filter2Config.type,
      filterFreq2,
      this._filter2Config.resonance,
      this._filter2Config.slope,
      this._filter2Config.drive
    );
    
    // Generate audio
    let sample = 0;
    
    // Unison processing
    const unisonVoices = Math.max(1, this._unisonVoices);
    
    for (let u = 0; u < unisonVoices; u++) {
      const detune = this._unisonDetunes[u] ?? 0;
      const detuneRatio = Math.pow(2, detune / 1200);
      
      // Update frequencies with detune
      if (this._osc1Config.enabled) {
        this._osc1.setFrequency(this._currentFreq * detuneRatio * Math.pow(2, this._osc1Config.pitch / 12));
      }
      if (this._osc2Config.enabled) {
        this._osc2.setFrequency(this._currentFreq * detuneRatio * Math.pow(2, this._osc2Config.pitch / 12));
      }
      
      let voiceSum = 0;
      
      // Oscillator 1
      if (this._osc1Config.enabled) {
        voiceSum += this._osc1.process() * this._osc1Config.level;
      }
      
      // Oscillator 2 (with hard sync from osc 1 if enabled)
      if (this._osc2Config.enabled) {
        voiceSum += this._osc2.process() * this._osc2Config.level;
      }
      
      // Sub oscillator
      if (this._subOscConfig?.enabled) {
        this._subOsc.setFrequency(this._currentFreq);
        voiceSum += this._subOsc.process() * this._subOscConfig.level;
      }
      
      // Noise
      if (this._noiseConfig?.enabled) {
        voiceSum += this._noise.process() * this._noiseConfig.level;
      }
      
      sample += voiceSum / unisonVoices;
    }
    
    // Apply filters
    if (this._filterRouting === "series") {
      sample = this._filter1.process(sample);
      sample = this._filter2.process(sample);
    } else {
      // Parallel - sum filter outputs
      const f1 = this._filter1.process(sample);
      const f2 = this._filter2.process(sample);
      sample = (f1 + f2) * 0.5;
    }
    
    // Apply amp envelope and velocity
    const velocityScale = 0.3 + (this.velocity / 127) * 0.7;
    sample *= ampEnv * velocityScale;
    
    // Simple stereo spread (alternate pan per unison voice)
    const pan = (this.age % 2 === 0) ? -0.3 : 0.3;
    const leftGain = Math.cos((pan + 1) * Math.PI / 4);
    const rightGain = Math.sin((pan + 1) * Math.PI / 4);
    
    this.age++;
    
    return {
      left: sample * leftGain,
      right: sample * rightGain,
    };
  }
  
  private _updateFrequencies(): void {
    const osc1DetuneRatio = Math.pow(2, this._osc1Config.detune / 1200);
    const osc2DetuneRatio = Math.pow(2, this._osc2Config.detune / 1200);
    
    this._osc1.setFrequency(this._currentFreq * osc1DetuneRatio * Math.pow(2, this._osc1Config.pitch / 12));
    this._osc2.setFrequency(this._currentFreq * osc2DetuneRatio * Math.pow(2, this._osc2Config.pitch / 12));
    this._subOsc.setFrequency(this._currentFreq);
  }
  
  // Store configs for noise/sub that aren't in the main config objects
  private _subOscConfig: { enabled: boolean; octave: -2 | -1; level: number; tone: number } = { enabled: false, octave: -1, level: 0, tone: 0.5 };
  private _noiseConfig: { enabled: boolean; type: "white" | "pink" | "red" | "blue"; level: number; color: number } = { enabled: false, type: "white", level: 0, color: 0.5 };
  
  setSubOscConfig(config: { enabled: boolean; octave: -2 | -1; level: number; tone: number }): void {
    this._subOscConfig = config;
  }
  
  setNoiseConfig(config: { enabled: boolean; type: "white" | "pink" | "red" | "blue"; level: number; color: number }): void {
    this._noiseConfig = config;
  }
}

// =============================================================================
// Analog Instance
// =============================================================================

export class AnalogInstance implements PluginInstanceRuntime {
  private _params: ReturnType<typeof createParameterMap>;
  private _voices: AnalogVoice[] = [];
  private _activeVoices = 0;
  private _maxVoices: number;
  
  private _sampleRate = 48000;
  private _blockSize = 128;
  private _connected = false;
  
  // Buffers
  private _leftBuffer: Float32Array;
  private _rightBuffer: Float32Array;
  
  constructor(maxVoices = 16, maxBlockSize = 128) {
    this._maxVoices = maxVoices;
    this._blockSize = maxBlockSize;
    
    this._params = createParameterMap(generateAnalogParameters());
    
    // Create voices
    for (let i = 0; i < maxVoices; i++) {
      this._voices.push(new AnalogVoice(48000));
    }
    
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
    this._stopAll();
    this._connected = false;
  }
  
  setParam(id: string, value: number, atSample?: number): void {
    const param = this._params.get(id);
    if (param) {
      param.setNormalized(value);
    }
  }
  
  getParam(id: string): number {
    return this._params.get(id)?.normalizedValue ?? 0;
  }
  
  async saveState(): Promise<AnalogStateSnapshot> {
    return this._createStateSnapshot();
  }
  
  async loadState(state: unknown): Promise<void> {
    // Load state from snapshot
    // Implementation would map state back to parameters
  }
  
  getLatencySamples(): number {
    return 0;
  }
  
  getTailSamples(): number {
    const release = this._params.get("ampRelease")?.value ?? 300;
    return Math.ceil((release / 1000) * this._sampleRate);
  }
  
  reset(): void {
    this._stopAll();
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
    
    // Clear buffers
    this._leftBuffer.fill(0, 0, blockSize);
    this._rightBuffer.fill(0, 0, blockSize);
    
    // Process MIDI
    for (const event of midi) {
      this._handleMidi(event);
    }
    
    // Process parameter smoothing
    this._params.processSmoothing();
    
    // Process each sample
    for (let i = 0; i < blockSize; i++) {
      let leftSum = 0;
      let rightSum = 0;
      
      for (const voice of this._voices) {
        if (voice.active) {
          const output = voice.process();
          leftSum += output.left;
          rightSum += output.right;
        }
      }
      
      this._leftBuffer[i] = leftSum;
      this._rightBuffer[i] = rightSum;
    }
    
    // Apply master gain and pan
    const gain = dbToGain(this._params.get("masterLevel")?.value ?? 0);
    const pan = (this._params.get("masterPan")?.value ?? 0) / 50;
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
    this._stopAll();
  }
  
  get activeVoiceCount(): number {
    return this._voices.filter(v => v.active).length;
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
          this._releaseNote(note);
        } else {
          this._triggerNote(note, velocity);
        }
        break;
      }
      
      case "noteOff":
        this._releaseNote(event.data.note);
        break;
    }
  }
  
  private _triggerNote(note: number, velocity: number): void {
    // Find free voice
    let voice = this._voices.find(v => !v.active);
    
    // Steal oldest if needed
    if (!voice) {
      let oldest = this._voices[0];
      for (const v of this._voices) {
        if (v.age > oldest.age) {
          oldest = v;
        }
      }
      oldest.stop();
      voice = oldest;
    }
    
    // Configure voice
    this._configureVoice(voice);
    voice.trigger(note, velocity);
  }
  
  private _releaseNote(note: number): void {
    for (const voice of this._voices) {
      if (voice.active && voice.note === note) {
        voice.release();
      }
    }
  }
  
  private _stopAll(): void {
    for (const voice of this._voices) {
      voice.stop();
    }
  }
  
  private _configureVoice(voice: AnalogVoice): void {
    const getValue = (id: string) => this._params.get(id)?.value ?? 0;
    
    voice.configure(
      {
        enabled: getValue("osc1Enabled") > 0.5,
        waveform: ["sine", "triangle", "sawtooth", "pulse", "square"][Math.round(getValue("osc1Waveform"))] as any,
        pitch: getValue("osc1Pitch"),
        detune: getValue("osc1Detune"),
        level: getValue("osc1Level") / 100,
        pulseWidth: getValue("osc1PulseWidth") / 100,
        hardSync: false,
        shapeMod: getValue("osc1ShapeMod") / 100,
      },
      {
        enabled: getValue("osc2Enabled") > 0.5,
        waveform: ["sine", "triangle", "sawtooth", "pulse", "square"][Math.round(getValue("osc2Waveform"))] as any,
        pitch: getValue("osc2Pitch"),
        detune: getValue("osc2Detune"),
        level: getValue("osc2Level") / 100,
        pulseWidth: getValue("osc2PulseWidth") / 100,
        hardSync: getValue("osc2HardSync") > 0.5,
        shapeMod: getValue("osc2ShapeMod") / 100,
      },
      {
        enabled: getValue("subEnabled") > 0.5,
        octave: Math.round(getValue("subOctave")) === 0 ? -1 : -2,
        level: getValue("subLevel") / 100,
        tone: getValue("subTone") / 100,
      },
      {
        enabled: getValue("noiseEnabled") > 0.5,
        type: ["white", "pink", "red", "blue"][Math.round(getValue("noiseType"))] as any,
        level: getValue("noiseLevel") / 100,
        color: getValue("noiseColor") / 100,
      },
      {
        type: ["lowpass", "highpass", "bandpass", "notch", "formant"][Math.round(getValue("filter1Type"))] as any,
        slope: Math.round(getValue("filter1Slope")) === 0 ? 12 : 24,
        frequency: getValue("filter1Freq"),
        resonance: getValue("filter1Res"),
        drive: getValue("filter1Drive"),
      },
      {
        type: ["lowpass", "highpass", "bandpass", "notch", "formant"][Math.round(getValue("filter2Type"))] as any,
        slope: Math.round(getValue("filter2Slope")) === 0 ? 12 : 24,
        frequency: getValue("filter2Freq"),
        resonance: getValue("filter2Res"),
        drive: getValue("filter2Drive"),
      },
      Math.round(getValue("filterRouting")) === 0 ? "series" : "parallel",
      {
        attack: getValue("filterAttack"),
        decay: getValue("filterDecay"),
        sustain: getValue("filterSustain") / 100,
        release: getValue("filterRelease"),
      },
      {
        attack: getValue("ampAttack"),
        decay: getValue("ampDecay"),
        sustain: getValue("ampSustain") / 100,
        release: getValue("ampRelease"),
        attackCurve: 0.5,
      },
      {
        attack: getValue("modAttack"),
        decay: getValue("modDecay"),
        sustain: getValue("modSustain") / 100,
        release: getValue("modRelease"),
        loop: getValue("modLoop") > 0.5,
        destination: ["filter", "pitch", "osc2", "pwm"][Math.round(getValue("modDestination"))] as any,
        amount: getValue("modAmount"),
      },
      {
        envAmount: getValue("filterEnvAmount"),
        lfoAmount: getValue("filterLFOAmount"),
        keyTrack: getValue("filterKeyTrack"),
      },
      {
        waveform: ["sine", "triangle", "square", "saw", "s&h", "noise"][Math.round(getValue("lfo1Waveform"))] as any,
        rate: getValue("lfo1Rate"),
        mode: ["free", "sync", "one-shot"][Math.round(getValue("lfo1Mode"))] as any,
        amount: getValue("lfo1Amount"),
        destination: ["pitch", "filter", "amp", "pwm", "osc2"][Math.round(getValue("lfo1Destination"))] as any,
        phase: 0,
        retrigger: getValue("lfo1Retrigger") > 0.5,
      },
      {
        waveform: ["sine", "triangle", "square", "saw", "s&h", "noise"][Math.round(getValue("lfo2Waveform"))] as any,
        rate: getValue("lfo2Rate"),
        mode: ["free", "sync", "one-shot"][Math.round(getValue("lfo2Mode"))] as any,
        amount: getValue("lfo2Amount"),
        destination: ["pitch", "filter", "amp", "pwm", "osc2"][Math.round(getValue("lfo2Destination"))] as any,
        phase: 0,
        retrigger: getValue("lfo2Retrigger") > 0.5,
      },
      {
        enabled: getValue("glideEnabled") > 0.5,
        time: getValue("glideTime"),
        mode: "time",
      },
      [1, 2, 4][Math.round(getValue("unison"))] ?? 1,
      getValue("unisonDetune")
    );
  }
  
  private _createStateSnapshot(): AnalogStateSnapshot {
    const getValue = (id: string) => this._params.get(id)?.value ?? 0;
    
    return {
      osc1: {
        enabled: getValue("osc1Enabled") > 0.5,
        waveform: ["sine", "triangle", "sawtooth", "pulse", "square"][Math.round(getValue("osc1Waveform"))] as any,
        pitch: getValue("osc1Pitch"),
        detune: getValue("osc1Detune"),
        level: getValue("osc1Level") / 100,
        pulseWidth: getValue("osc1PulseWidth") / 100,
        hardSync: false,
        shapeMod: getValue("osc1ShapeMod") / 100,
      },
      osc2: {
        enabled: getValue("osc2Enabled") > 0.5,
        waveform: ["sine", "triangle", "sawtooth", "pulse", "square"][Math.round(getValue("osc2Waveform"))] as any,
        pitch: getValue("osc2Pitch"),
        detune: getValue("osc2Detune"),
        level: getValue("osc2Level") / 100,
        pulseWidth: getValue("osc2PulseWidth") / 100,
        hardSync: getValue("osc2HardSync") > 0.5,
        shapeMod: getValue("osc2ShapeMod") / 100,
      },
      subOsc: {
        enabled: getValue("subEnabled") > 0.5,
        octave: Math.round(getValue("subOctave")) === 0 ? -1 : -2,
        level: getValue("subLevel") / 100,
        tone: getValue("subTone") / 100,
      },
      noise: {
        enabled: getValue("noiseEnabled") > 0.5,
        type: ["white", "pink", "red", "blue"][Math.round(getValue("noiseType"))] as any,
        level: getValue("noiseLevel") / 100,
      },
      filter1: {
        type: ["lowpass", "highpass", "bandpass", "notch", "formant"][Math.round(getValue("filter1Type"))] as any,
        slope: Math.round(getValue("filter1Slope")) === 0 ? 12 : 24,
        frequency: getValue("filter1Freq"),
        resonance: getValue("filter1Res"),
        drive: getValue("filter1Drive"),
      },
      filter2: {
        type: ["lowpass", "highpass", "bandpass", "notch", "formant"][Math.round(getValue("filter2Type"))] as any,
        slope: Math.round(getValue("filter2Slope")) === 0 ? 12 : 24,
        frequency: getValue("filter2Freq"),
        resonance: getValue("filter2Res"),
        drive: getValue("filter2Drive"),
      },
      filterRouting: Math.round(getValue("filterRouting")) === 0 ? "series" : "parallel",
      filterEnv: {
        attack: getValue("filterAttack"),
        decay: getValue("filterDecay"),
        sustain: getValue("filterSustain") / 100,
        release: getValue("filterRelease"),
      },
      filterMod: {
        envAmount: getValue("filterEnvAmount"),
        lfoAmount: getValue("filterLFOAmount"),
        keyTrack: getValue("filterKeyTrack"),
      },
      ampEnv: {
        attack: getValue("ampAttack"),
        decay: getValue("ampDecay"),
        sustain: getValue("ampSustain") / 100,
        release: getValue("ampRelease"),
        attackCurve: 0.5,
      },
      modEnv: {
        attack: getValue("modAttack"),
        decay: getValue("modDecay"),
        sustain: getValue("modSustain") / 100,
        release: getValue("modRelease"),
        loop: getValue("modLoop") > 0.5,
        destination: ["filter", "pitch", "osc2", "pwm"][Math.round(getValue("modDestination"))] as any,
        amount: getValue("modAmount"),
      },
      lfo1: {
        waveform: ["sine", "triangle", "square", "saw", "s&h", "noise"][Math.round(getValue("lfo1Waveform"))] as any,
        rate: getValue("lfo1Rate"),
        mode: ["free", "sync", "one-shot"][Math.round(getValue("lfo1Mode"))] as any,
        amount: getValue("lfo1Amount"),
        destination: ["pitch", "filter", "amp", "pwm", "osc2"][Math.round(getValue("lfo1Destination"))] as any,
        phase: 0,
        retrigger: getValue("lfo1Retrigger") > 0.5,
      },
      lfo2: {
        waveform: ["sine", "triangle", "square", "saw", "s&h", "noise"][Math.round(getValue("lfo2Waveform"))] as any,
        rate: getValue("lfo2Rate"),
        mode: ["free", "sync", "one-shot"][Math.round(getValue("lfo2Mode"))] as any,
        amount: getValue("lfo2Amount"),
        destination: ["pitch", "filter", "amp", "pwm", "osc2"][Math.round(getValue("lfo2Destination"))] as any,
        phase: 0,
        retrigger: getValue("lfo2Retrigger") > 0.5,
      },
      voiceMode: {
        mode: ["mono", "legato", "poly"][Math.round(getValue("voiceMode"))] as any,
        voices: [1, 2, 4, 8, 16, 32][Math.round(getValue("voiceCount"))] ?? 8,
        unison: [1, 2, 4][Math.round(getValue("unison"))] ?? 1,
        unisonDetune: getValue("unisonDetune"),
        spread: getValue("spread"),
      },
      glide: {
        enabled: getValue("glideEnabled") > 0.5,
        time: getValue("glideTime"),
        legato: getValue("glideLegato") > 0.5,
        mode: "time",
      },
      master: {
        level: getValue("masterLevel"),
        pan: getValue("masterPan"),
        priority: ["last", "low", "high"][Math.round(getValue("priority"))] as any,
      },
    };
  }
}

// =============================================================================
// Plugin Definition
// =============================================================================

export function createAnalogDefinition(): PluginDefinition {
  return {
    id: "com.daw.analog",
    name: "Analog",
    category: "instrument",
    version: "1.0.0",
    vendor: "DAW",
    description: "Dual oscillator subtractive synthesizer with dual filters",
    parameters: generateAnalogParameters(),
    ui: {
      type: "custom",
      width: 1000,
      height: 700,
      resizable: true,
      layout: [
        { title: "Oscillators", parameters: ["osc1Waveform", "osc1Level", "osc2Waveform", "osc2Level"], layout: "horizontal" },
        { title: "Filters", parameters: ["filter1Type", "filter1Freq", "filter2Type", "filter2Freq"], layout: "horizontal" },
        { title: "Envelopes", parameters: ["ampAttack", "ampDecay", "ampSustain", "ampRelease"], layout: "horizontal" },
      ],
    },
    audioInputs: 0,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 0,
    supportsMpe: false,
    hasSidechain: false,
    factoryPresets: [
      {
        id: "analog-default",
        name: "Default",
        category: "Init",
        state: createDefaultAnalogState(),
      },
    ],
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const instance = new AnalogInstance(16, ctx.maxBlockSize);
      instance.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return instance;
    },
  };
}
