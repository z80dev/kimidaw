/**
 * Operator FM Synthesizer
 * 
 * Ableton-style 8-operator FM synthesizer with:
 * - 8 operators with independent envelopes and waveforms
 * - 11 FM algorithms (DX7-style + extensions)
 * - Filter section with envelope
 * - LFO modulation
 * - Pitch envelope
 * - Glide/portamento
 * - Unison/spread
 * 
 * Based on Ableton Live's Operator instrument design.
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
  type OperatorStateSnapshot,
  type OperatorState,
  type OperatorEnvelope,
  generateOperatorParameters,
  getAlgorithmConnections,
  getCarriers,
  createDefaultOperatorStateSnapshot,
} from "./types.js";

// =============================================================================
// FM Operator Voice
// =============================================================================

/** Single FM operator with envelope and waveform generator */
class FMOperator {
  private _phase = 0;
  private _envelopeLevel = 0;
  private _envelopePhase: "idle" | "attack" | "decay" | "sustain" | "release" = "idle";
  
  // Configuration
  private _config: OperatorState;
  private _baseFrequency = 440;
  private _currentFrequency = 440;
  private _sampleRate = 48000;
  private _velocity = 127;
  private _keyScaling = 60; // MIDI note for key scaling reference
  
  // Pre-calculated values
  private _attackInc = 0;
  private _decayCoeff = 0;
  private _releaseCoeff = 0;
  private _sustainLevel = 0.8;
  
  constructor(config: OperatorState, sampleRate = 48000) {
    this._config = config;
    this._sampleRate = sampleRate;
    this._recalculateEnvelope();
  }
  
  setConfig(config: OperatorState): void {
    this._config = config;
    this._recalculateEnvelope();
  }
  
  setFrequency(baseFreq: number, note: number): void {
    this._baseFrequency = baseFreq;
    this._keyScaling = note;
    this._updateFrequency();
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._recalculateEnvelope();
  }
  
  trigger(velocity: number): void {
    this._velocity = velocity;
    this._envelopePhase = "attack";
    this._envelopeLevel = 0;
    this._phase = 0;
    this._recalculateEnvelope();
  }
  
  release(): void {
    if (this._envelopePhase !== "idle") {
      this._envelopePhase = "release";
    }
  }
  
  stop(): void {
    this._envelopePhase = "idle";
    this._envelopeLevel = 0;
    this._phase = 0;
  }
  
  /** Process one sample, returns output level (before applying envelope) */
  process(modulation: number): number {
    // Update envelope
    this._processEnvelope();
    
    // Calculate frequency with modulation
    const freq = this._currentFrequency * (1 + modulation);
    const phaseInc = freq / this._sampleRate;
    
    this._phase += phaseInc;
    while (this._phase >= 1) this._phase -= 1;
    
    // Generate waveform
    const rawOutput = this._generateWaveform();
    
    // Apply envelope and velocity
    const velScale = 0.3 + (this._velocity / 127) * 0.7 * this._config.velocitySens;
    return rawOutput * this._envelopeLevel * velScale;
  }
  
  get level(): number {
    return this._envelopeLevel;
  }
  
  get isActive(): boolean {
    return this._envelopePhase !== "idle";
  }
  
  get phase(): number {
    return this._phase;
  }
  
  private _updateFrequency(): void {
    if (this._config.fixedMode === "fixed") {
      // Fixed frequency mode
      this._currentFrequency = this._config.coarse;
    } else {
      // Ratio mode with key scaling
      const ratio = this._config.coarse;
      const fineRatio = Math.pow(2, this._config.fine / 1200);
      
      // Apply key scaling
      const keyTrack = 1 - this._config.keyScaling * ((this._keyScaling - 60) / 60);
      
      this._currentFrequency = this._baseFrequency * ratio * fineRatio * Math.max(0.1, keyTrack);
    }
  }
  
  private _recalculateEnvelope(): void {
    const env = this._config.envelope;
    
    // Attack increment (linear)
    const attackSamples = Math.max(1, (env.attack * this._config.timeScale) * this._sampleRate / 1000);
    this._attackInc = 1 / attackSamples;
    
    // Decay coefficient (exponential)
    const decaySamples = Math.max(1, (env.decay * this._config.timeScale) * this._sampleRate / 1000);
    this._decayCoeff = Math.exp(-5 / decaySamples); // 5 time constants for full decay
    
    // Release coefficient (exponential)
    const releaseSamples = Math.max(1, (env.release * this._config.timeScale) * this._sampleRate / 1000);
    this._releaseCoeff = Math.exp(-5 / releaseSamples);
    
    this._sustainLevel = env.sustain;
  }
  
  private _processEnvelope(): void {
    switch (this._envelopePhase) {
      case "attack": {
        const curve = this._config.envelope.attackCurve;
        if (curve > 0.5) {
          // Exponential attack
          this._envelopeLevel += (1 - this._envelopeLevel) * this._attackInc * 2;
        } else {
          // Linear attack
          this._envelopeLevel += this._attackInc;
        }
        
        if (this._envelopeLevel >= 1) {
          this._envelopeLevel = 1;
          this._envelopePhase = "decay";
        }
        break;
      }
      
      case "decay":
        this._envelopeLevel = this._sustainLevel + (this._envelopeLevel - this._sustainLevel) * this._decayCoeff;
        if (Math.abs(this._envelopeLevel - this._sustainLevel) < 0.001) {
          this._envelopeLevel = this._sustainLevel;
          this._envelopePhase = "sustain";
        }
        break;
      
      case "sustain":
        this._envelopeLevel = this._sustainLevel;
        break;
      
      case "release":
        this._envelopeLevel *= this._releaseCoeff;
        if (this._envelopeLevel < 0.0001) {
          this._envelopeLevel = 0;
          this._envelopePhase = "idle";
        }
        break;
      
      case "idle":
        this._envelopeLevel = 0;
        break;
    }
  }
  
  private _generateWaveform(): number {
    const phase = this._phase;
    
    switch (this._config.waveform) {
      case "sine":
        return Math.sin(phase * 2 * Math.PI);
      
      case "saw":
        return 2 * phase - 1;
      
      case "square":
        return phase < 0.5 ? 1 : -1;
      
      case "triangle":
        return phase < 0.5 
          ? 4 * phase - 1 
          : 3 - 4 * phase;
      
      case "pulse":
        return phase < 0.25 ? 1 : -1;
      
      case "noise":
        return Math.random() * 2 - 1;
      
      default:
        return Math.sin(phase * 2 * Math.PI);
    }
  }
}

// =============================================================================
// Filter
// =============================================================================

class ResonantFilter {
  private _type: "lowpass" | "highpass" | "bandpass" | "notch" | "morph" = "lowpass";
  private _freq = 20000;
  private _resonance = 0;
  private _morph = 0; // For morph filter
  private _sampleRate = 48000;
  
  // Coefficients
  private _a0 = 1;
  private _a1 = 0;
  private _a2 = 0;
  private _b0 = 1;
  private _b1 = 0;
  private _b2 = 0;
  
  // State
  private _z1 = 0;
  private _z2 = 0;
  
  setParameters(
    type: "lowpass" | "highpass" | "bandpass" | "notch" | "morph",
    freq: number,
    resonance: number,
    morph = 0
  ): void {
    if (this._type !== type || this._freq !== freq || this._resonance !== resonance || this._morph !== morph) {
      this._type = type;
      this._freq = Math.max(20, Math.min(this._sampleRate / 2, freq));
      this._resonance = resonance;
      this._morph = morph;
      this._updateCoefficients();
    }
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._updateCoefficients();
  }
  
  reset(): void {
    this._z1 = 0;
    this._z2 = 0;
  }
  
  process(input: number): number {
    const output = this._b0 * input + this._b1 * this._z1 + this._b2 * this._z2
                 - this._a1 * this._z1 - this._a2 * this._z2;
    
    this._z2 = this._z1;
    this._z1 = output;
    
    return output;
  }
  
  private _updateCoefficients(): void {
    const w0 = 2 * Math.PI * this._freq / this._sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const q = 0.5 + (1 - this._resonance / 100) * 9.5; // Q from 0.5 to 10
    const alpha = sinw0 / (2 * q);
    
    switch (this._type) {
      case "lowpass":
        this._b0 = (1 - cosw0) / 2;
        this._b1 = 1 - cosw0;
        this._b2 = (1 - cosw0) / 2;
        this._a0 = 1 + alpha;
        this._a1 = -2 * cosw0;
        this._a2 = 1 - alpha;
        break;
      
      case "highpass":
        this._b0 = (1 + cosw0) / 2;
        this._b1 = -(1 + cosw0);
        this._b2 = (1 + cosw0) / 2;
        this._a0 = 1 + alpha;
        this._a1 = -2 * cosw0;
        this._a2 = 1 - alpha;
        break;
      
      case "bandpass":
        this._b0 = alpha;
        this._b1 = 0;
        this._b2 = -alpha;
        this._a0 = 1 + alpha;
        this._a1 = -2 * cosw0;
        this._a2 = 1 - alpha;
        break;
      
      case "notch":
        this._b0 = 1;
        this._b1 = -2 * cosw0;
        this._b2 = 1;
        this._a0 = 1 + alpha;
        this._a1 = -2 * cosw0;
        this._a2 = 1 - alpha;
        break;
      
      case "morph":
        // Blend between LP and HP
        const lpB0 = (1 - cosw0) / 2;
        const lpB1 = 1 - cosw0;
        const lpB2 = (1 - cosw0) / 2;
        const hpB0 = (1 + cosw0) / 2;
        const hpB1 = -(1 + cosw0);
        const hpB2 = (1 + cosw0) / 2;
        
        this._b0 = lpB0 * (1 - this._morph) + hpB0 * this._morph;
        this._b1 = lpB1 * (1 - this._morph) + hpB1 * this._morph;
        this._b2 = lpB2 * (1 - this._morph) + hpB2 * this._morph;
        this._a0 = 1 + alpha;
        this._a1 = -2 * cosw0;
        this._a2 = 1 - alpha;
        break;
    }
    
    // Normalize
    this._b0 /= this._a0;
    this._b1 /= this._a0;
    this._b2 /= this._a0;
    this._a1 /= this._a0;
    this._a2 /= this._a0;
  }
}

// =============================================================================
// Filter Envelope
// =============================================================================

class FilterEnvelope {
  private _phase: "idle" | "attack" | "decay" | "sustain" | "release" = "idle";
  private _level = 0;
  private _config: { attack: number; decay: number; sustain: number; release: number };
  private _sampleRate = 48000;
  
  constructor(config: { attack: number; decay: number; sustain: number; release: number }, sampleRate = 48000) {
    this._config = config;
    this._sampleRate = sampleRate;
  }
  
  setConfig(config: { attack: number; decay: number; sustain: number; release: number }): void {
    this._config = config;
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
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
        const attackSamples = Math.max(1, this._config.attack * this._sampleRate / 1000);
        this._level += 1 / attackSamples;
        if (this._level >= 1) {
          this._level = 1;
          this._phase = "decay";
        }
        break;
      }
      
      case "decay": {
        const decaySamples = Math.max(1, this._config.decay * this._sampleRate / 1000);
        const decayCoeff = Math.exp(-5 / decaySamples);
        this._level = this._config.sustain + (this._level - this._config.sustain) * decayCoeff;
        if (Math.abs(this._level - this._config.sustain) < 0.001) {
          this._level = this._config.sustain;
          this._phase = "sustain";
        }
        break;
      }
      
      case "sustain":
        this._level = this._config.sustain;
        break;
      
      case "release": {
        const releaseSamples = Math.max(1, this._config.release * this._sampleRate / 1000);
        const releaseCoeff = Math.exp(-5 / releaseSamples);
        this._level *= releaseCoeff;
        if (this._level < 0.0001) {
          this._level = 0;
          this._phase = "idle";
        }
        break;
      }
    }
    
    return this._level;
  }
  
  get isActive(): boolean {
    return this._phase !== "idle";
  }
}

// =============================================================================
// LFO
// =============================================================================

class OperatorLFO {
  private _phase = 0;
  private _waveform: "sine" | "triangle" | "square" | "saw" | "s&h" | "noise" = "sine";
  private _rate = 1;
  private _sampleRate = 48000;
  private _lastRandom = 0;
  
  setWaveform(waveform: "sine" | "triangle" | "square" | "saw" | "s&h" | "noise"): void {
    this._waveform = waveform;
  }
  
  setRate(rate: number): void {
    this._rate = rate;
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
  }
  
  reset(): void {
    this._phase = 0;
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
// FM Voice
// =============================================================================

class FMVoice {
  // Operators
  private _operators: FMOperator[] = [];
  private _operatorConfigs: OperatorState[] = [];
  
  // Filter
  private _filter: ResonantFilter;
  private _filterEnv: FilterEnvelope;
  
  // LFO
  private _lfo: OperatorLFO;
  
  // State
  public note = 0;
  public velocity = 0;
  public active = false;
  public age = 0;
  
  private _baseFreq = 440;
  private _sampleRate = 48000;
  private _algorithm = 7;
  private _feedback = 0;
  private _feedbackState = 0;
  
  // Glide
  private _currentFreq = 440;
  private _targetFreq = 440;
  private _glideIncrement = 0;
  private _glideTime = 0;
  
  // Pitch envelope
  private _pitchEnvPhase: "idle" | "attack" | "decay" = "idle";
  private _pitchEnvLevel = 0;
  private _pitchEnvAttackInc = 0;
  private _pitchEnvDecayCoeff = 0;
  
  // Filter state
  private _filterBaseFreq = 20000;
  private _filterEnvAmount = 0;
  private _filterLFOAmount = 0;
  private _filterKeyTrack = 0;
  
  // Output
  private _pan = 0;
  private _level = 1;
  
  constructor(operatorConfigs: OperatorState[], sampleRate = 48000) {
    this._sampleRate = sampleRate;
    this._operatorConfigs = operatorConfigs;
    
    // Create operators
    for (const config of operatorConfigs) {
      this._operators.push(new FMOperator(config, sampleRate));
    }
    
    // Create filter
    this._filter = new ResonantFilter();
    this._filter.setSampleRate(sampleRate);
    
    // Create filter envelope
    this._filterEnv = new FilterEnvelope(
      { attack: 10, decay: 200, sustain: 0.5, release: 300 },
      sampleRate
    );
    
    // Create LFO
    this._lfo = new OperatorLFO();
    this._lfo.setSampleRate(sampleRate);
  }
  
  configure(
    operatorConfigs: OperatorState[],
    algorithm: number,
    feedback: number,
    filterConfig: {
      type: "lowpass" | "highpass" | "bandpass" | "notch" | "morph";
      frequency: number;
      resonance: number;
      envAmount: number;
      lfoAmount: number;
      keyTrack: number;
      envelope: { attack: number; decay: number; sustain: number; release: number };
    },
    lfoConfig: {
      waveform: "sine" | "triangle" | "square" | "saw" | "s&h" | "noise";
      rate: number;
    },
    pitchEnvConfig: {
      initial: number;
      attack: number;
      peak: number;
      decay: number;
    },
    glide: { enabled: boolean; time: number; legato: boolean }
  ): void {
    this._algorithm = algorithm;
    this._feedback = feedback;
    this._operatorConfigs = operatorConfigs;
    
    // Update operators
    for (let i = 0; i < 8; i++) {
      if (this._operators[i]) {
        this._operators[i].setConfig(operatorConfigs[i]);
      }
    }
    
    // Update filter
    this._filterBaseFreq = filterConfig.frequency;
    this._filterEnvAmount = filterConfig.envAmount;
    this._filterLFOAmount = filterConfig.lfoAmount;
    this._filterKeyTrack = filterConfig.keyTrack;
    this._filterEnv.setConfig(filterConfig.envelope);
    
    // Update LFO
    this._lfo.setWaveform(lfoConfig.waveform);
    this._lfo.setRate(lfoConfig.rate);
    
    // Update pitch envelope
    const pitchAttackSamples = Math.max(1, pitchEnvConfig.attack * this._sampleRate / 1000);
    this._pitchEnvAttackInc = pitchEnvConfig.peak / pitchAttackSamples;
    const pitchDecaySamples = Math.max(1, pitchEnvConfig.decay * this._sampleRate / 1000);
    this._pitchEnvDecayCoeff = Math.exp(-5 / pitchDecaySamples);
    
    // Update glide
    this._glideTime = glide.enabled ? glide.time : 0;
    if (this._glideTime > 0) {
      this._glideIncrement = 1 / (this._glideTime * this._sampleRate / 1000);
    }
  }
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    for (const op of this._operators) {
      op.setSampleRate(sr);
    }
    this._filter.setSampleRate(sr);
    this._filterEnv.setSampleRate(sr);
    this._lfo.setSampleRate(sr);
  }
  
  trigger(note: number, velocity: number): void {
    this.note = note;
    this.velocity = velocity;
    this.active = true;
    this.age = 0;
    this._feedbackState = 0;
    
    // Calculate base frequency
    this._targetFreq = 440 * Math.pow(2, (note - 69) / 12);
    
    // Handle glide
    if (this._currentFreq === 0 || this._glideTime === 0) {
      this._currentFreq = this._targetFreq;
    }
    
    // Update operator frequencies
    this._updateOperatorFrequencies();
    
    // Trigger operators
    for (const op of this._operators) {
      op.trigger(velocity);
    }
    
    // Trigger envelopes
    this._filterEnv.trigger();
    
    // Reset pitch envelope
    this._pitchEnvPhase = "attack";
    this._pitchEnvLevel = 0;
    
    // Reset LFO
    this._lfo.reset();
    
    // Reset filter
    this._filter.reset();
  }
  
  release(): void {
    for (const op of this._operators) {
      op.release();
    }
    this._filterEnv.release();
  }
  
  stop(): void {
    for (const op of this._operators) {
      op.stop();
    }
    this._filterEnv.stop();
    this.active = false;
    this._currentFreq = 0;
    this._pitchEnvPhase = "idle";
  }
  
  isFinished(): boolean {
    // Voice is finished when all operators are inactive
    return this.active && !this._operators.some(op => op.isActive);
  }
  
  process(left: Float32Array, right: Float32Array, offset: number, count: number): void {
    if (!this.active) return;
    
    // Check if voice should be deactivated
    if (this.isFinished()) {
      this.active = false;
      return;
    }
    
    // Get algorithm connections
    const connections = getAlgorithmConnections(this._algorithm);
    const carriers = getCarriers(this._algorithm);
    
    for (let i = 0; i < count; i++) {
      // Handle glide
      if (this._glideTime > 0 && Math.abs(this._currentFreq - this._targetFreq) > 0.1) {
        if (this._currentFreq < this._targetFreq) {
          this._currentFreq = Math.min(this._targetFreq, this._currentFreq + this._glideIncrement * this._targetFreq);
        } else {
          this._currentFreq = Math.max(this._targetFreq, this._currentFreq - this._glideIncrement * this._targetFreq);
        }
        this._updateOperatorFrequencies();
      }
      
      // Process pitch envelope
      this._processPitchEnvelope();
      
      // Calculate frequency with pitch envelope
      const pitchMultiplier = Math.pow(2, this._pitchEnvLevel / 12);
      
      // Process LFO
      const lfoValue = this._lfo.process();
      
      // Calculate filter frequency
      const filterEnv = this._filterEnv.process();
      let filterFreq = this._filterBaseFreq;
      filterFreq *= Math.pow(2, filterEnv * this._filterEnvAmount / 100 * 4); // ±4 octaves
      filterFreq *= Math.pow(2, (this.note - 60) / 12 * this._filterKeyTrack / 100);
      filterFreq *= 1 + lfoValue * this._filterLFOAmount / 100;
      filterFreq = Math.max(20, Math.min(this._sampleRate / 2, filterFreq));
      
      // Update filter
      this._filter.setParameters("lowpass", filterFreq, 0);
      
      // Process FM algorithm
      const opOutputs: number[] = new Array(8).fill(0);
      
      // Process each operator
      for (let opIdx = 0; opIdx < 8; opIdx++) {
        if (!this._operatorConfigs[opIdx].enabled) continue;
        
        // Calculate modulation from connected operators
        let modulation = 0;
        for (const [from, to] of connections) {
          if (to === opIdx) {
            modulation += opOutputs[from] * 2; // Scale modulation
          }
        }
        
        // Add feedback if this operator feeds back to itself
        if (connections.some(([from, to]) => from === opIdx && to === opIdx)) {
          modulation += this._feedbackState * this._feedback / 100;
        }
        
        // Update frequency for this sample (pitch envelope)
        const originalFreq = this._operators[opIdx]["_baseFrequency"];
        this._operators[opIdx]["_currentFrequency"] = originalFreq * pitchMultiplier;
        
        // Process operator
        opOutputs[opIdx] = this._operators[opIdx].process(modulation);
      }
      
      // Update feedback state (from first carrier)
      if (carriers.length > 0) {
        this._feedbackState = opOutputs[carriers[0]];
      }
      
      // Sum carrier outputs
      let output = 0;
      for (const carrierIdx of carriers) {
        if (this._operatorConfigs[carrierIdx].enabled) {
          output += opOutputs[carrierIdx] * this._operatorConfigs[carrierIdx].level;
        }
      }
      
      // Apply filter
      output = this._filter.process(output);
      
      // Output to buffers with pan
      const panL = Math.cos((this._pan + 1) * Math.PI / 4);
      const panR = Math.sin((this._pan + 1) * Math.PI / 4);
      
      const idx = offset + i;
      left[idx] += output * panL * this._level;
      right[idx] += output * panR * this._level;
    }
    
    this.age += count;
  }
  
  private _updateOperatorFrequencies(): void {
    for (let i = 0; i < 8; i++) {
      this._operators[i].setFrequency(this._currentFreq, this.note);
    }
  }
  
  private _processPitchEnvelope(): void {
    switch (this._pitchEnvPhase) {
      case "attack":
        this._pitchEnvLevel += this._pitchEnvAttackInc;
        if (this._pitchEnvLevel >= 1) {
          this._pitchEnvLevel = 1;
          this._pitchEnvPhase = "decay";
        }
        break;
      case "decay":
        this._pitchEnvLevel *= this._pitchEnvDecayCoeff;
        if (this._pitchEnvLevel < 0.001) {
          this._pitchEnvLevel = 0;
          this._pitchEnvPhase = "idle";
        }
        break;
    }
  }
}

// =============================================================================
// Voice Allocator
// =============================================================================

class VoiceAllocator<T extends { note: number; active: boolean; age: number }> {
  private _voices: T[];
  private _stealMode: "oldest" | "quietest" | "none" = "oldest";
  
  constructor(voices: T[]) {
    this._voices = voices;
  }
  
  allocate(note: number, velocity: number): T | null {
    // Find inactive voice
    for (const voice of this._voices) {
      if (!voice.active) {
        return voice;
      }
    }
    
    // Voice stealing
    if (this._stealMode === "none") return null;
    
    let voiceToSteal: T | null = null;
    
    if (this._stealMode === "oldest") {
      let maxAge = -1;
      for (const voice of this._voices) {
        if (voice.age > maxAge) {
          maxAge = voice.age;
          voiceToSteal = voice;
        }
      }
    }
    
    if (voiceToSteal) {
      if ("stop" in voiceToSteal && typeof voiceToSteal.stop === "function") {
        (voiceToSteal as any).stop();
      }
    }
    
    return voiceToSteal;
  }
  
  release(note: number): void {
    for (const voice of this._voices) {
      if (voice.active && voice.note === note && "release" in voice) {
        (voice as any).release();
      }
    }
  }
  
  stopAll(): void {
    for (const voice of this._voices) {
      if ("stop" in voice && typeof voice.stop === "function") {
        voice.stop();
      }
    }
  }
  
  process(left: Float32Array, right: Float32Array, offset: number, count: number): void {
    for (const voice of this._voices) {
      if (voice.active && "process" in voice) {
        (voice as any).process(left, right, offset, count);
        voice.age++;
      }
    }
  }
  
  get activeVoiceCount(): number {
    return this._voices.filter(v => v.active).length;
  }
}

// =============================================================================
// Operator Instance
// =============================================================================

export class OperatorInstance implements PluginInstanceRuntime {
  private _params: ReturnType<typeof createParameterMap>;
  private _voices: FMVoice[] = [];
  private _voiceAllocator: VoiceAllocator<FMVoice>;
  
  private _sampleRate = 48000;
  private _blockSize = 128;
  private _maxVoices: number;
  
  // State
  private _operatorStates: OperatorState[] = [];
  private _connected = false;
  
  // Buffers
  private _leftBuffer: Float32Array;
  private _rightBuffer: Float32Array;
  
  constructor(maxVoices = 8, maxBlockSize = 128) {
    this._maxVoices = maxVoices;
    this._blockSize = maxBlockSize;
    
    // Create parameters
    this._params = createParameterMap(generateOperatorParameters());
    
    // Initialize operator states
    this._operatorStates = Array.from({ length: 8 }, (_, i) => this._createOperatorStateFromParams(i));
    
    // Create voices
    for (let i = 0; i < maxVoices; i++) {
      this._voices.push(new FMVoice(this._operatorStates, this._sampleRate));
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
      this._updateFromParams();
    }
  }
  
  getParam(id: string): number {
    return this._params.get(id)?.normalizedValue ?? 0;
  }
  
  async saveState(): Promise<OperatorStateSnapshot> {
    return this._createStateSnapshot();
  }
  
  async loadState(state: unknown): Promise<void> {
    const snapshot = state as Partial<OperatorStateSnapshot>;
    
    if (snapshot.operators) {
      this._operatorStates = snapshot.operators.map((op, i) => ({
        ...createDefaultOperatorStateSnapshot().operators[i],
        ...op,
      }));
    }
    
    // Update parameters from state
    // (Implementation depends on mapping state back to parameters)
    this._updateFromParams();
  }
  
  getLatencySamples(): number {
    return 0;
  }
  
  getTailSamples(): number {
    // Find longest release time
    let maxRelease = 0;
    for (let i = 0; i < 8; i++) {
      const release = this._params.get(`op${i + 1}Release`)?.value ?? 300;
      maxRelease = Math.max(maxRelease, release);
    }
    return Math.ceil((maxRelease / 1000) * this._sampleRate);
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
    
    this._updateFromParams();
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
    this._voiceAllocator.process(this._leftBuffer, this._rightBuffer, 0, blockSize);
    
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
    this._voiceAllocator.stopAll();
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
          const voice = this._voiceAllocator.allocate(note, velocity);
          if (voice) {
            this._configureVoice(voice);
            voice.trigger(note, velocity);
          }
        }
        break;
      }
      
      case "noteOff":
        this._voiceAllocator.release(event.data.note);
        break;
    }
  }
  
  private _configureVoice(voice: FMVoice): void {
    // Update operator configs
    for (let i = 0; i < 8; i++) {
      this._operatorStates[i] = this._createOperatorStateFromParams(i);
    }
    
    voice.configure(
      this._operatorStates,
      Math.round(this._params.get("algorithm")?.value ?? 7),
      this._params.get("feedback")?.value ?? 0,
      {
        type: ["lowpass", "highpass", "bandpass", "notch", "morph"][Math.round(this._params.get("filterType")?.value ?? 0)] as any,
        frequency: this._params.get("filterFreq")?.value ?? 20000,
        resonance: this._params.get("filterRes")?.value ?? 0,
        envAmount: this._params.get("filterEnv")?.value ?? 0,
        lfoAmount: this._params.get("lfoFilter")?.value ?? 0,
        keyTrack: 0,
        envelope: {
          attack: this._params.get("filterAttack")?.value ?? 10,
          decay: this._params.get("filterDecay")?.value ?? 200,
          sustain: (this._params.get("filterSustain")?.value ?? 50) / 100,
          release: this._params.get("filterRelease")?.value ?? 300,
        },
      },
      {
        waveform: ["sine", "triangle", "square", "saw", "s&h", "noise"][Math.round(this._params.get("lfoWave")?.value ?? 0)] as any,
        rate: this._params.get("lfoRate")?.value ?? 1,
      },
      {
        initial: this._params.get("pitchInitial")?.value ?? 0,
        attack: this._params.get("pitchAttack")?.value ?? 0,
        peak: this._params.get("pitchPeak")?.value ?? 0,
        decay: this._params.get("pitchDecay")?.value ?? 50,
      },
      {
        enabled: (this._params.get("glideEnabled")?.value ?? 0) > 0.5,
        time: this._params.get("glideTime")?.value ?? 50,
        legato: false,
      }
    );
  }
  
  private _createOperatorStateFromParams(index: number): OperatorState {
    const opNum = index + 1;
    const prefix = `op${opNum}`;
    
    return {
      enabled: (this._params.get(`${prefix}Enabled`)?.value ?? 0) > 0.5,
      fixedMode: (this._params.get(`${prefix}Fixed`)?.value ?? 0) > 0.5 ? "fixed" : "ratio",
      coarse: this._params.get(`${prefix}Coarse`)?.value ?? 1,
      fine: this._params.get(`${prefix}Fine`)?.value ?? 0,
      waveform: ["sine", "saw", "square", "triangle", "noise", "pulse"][Math.round(this._params.get(`${prefix}Waveform`)?.value ?? 0)] as OperatorWaveform,
      level: (this._params.get(`${prefix}Level`)?.value ?? 50) / 100,
      pan: 0,
      envelope: {
        attack: this._params.get(`${prefix}Attack`)?.value ?? 10,
        decay: this._params.get(`${prefix}Decay`)?.value ?? 200,
        sustain: (this._params.get(`${prefix}Sustain`)?.value ?? 80) / 100,
        release: this._params.get(`${prefix}Release`)?.value ?? 300,
        attackCurve: 0.5,
        decayCurve: 0.5,
      },
      timeScale: 1,
      velocitySens: (this._params.get(`${prefix}VelSens`)?.value ?? 50) / 100,
      keyScaling: 0,
    };
  }
  
  private _createStateSnapshot(): OperatorStateSnapshot {
    const operators: OperatorState[] = [];
    for (let i = 0; i < 8; i++) {
      operators.push(this._createOperatorStateFromParams(i));
    }
    
    return {
      operators,
      filter: {
        type: ["lowpass", "highpass", "bandpass", "notch", "morph"][Math.round(this._params.get("filterType")?.value ?? 0)] as FilterType,
        frequency: this._params.get("filterFreq")?.value ?? 20000,
        resonance: this._params.get("filterRes")?.value ?? 0,
        envAmount: this._params.get("filterEnv")?.value ?? 0,
        lfoAmount: this._params.get("lfoFilter")?.value ?? 0,
        keyTrack: 0,
        envelope: {
          attack: this._params.get("filterAttack")?.value ?? 10,
          decay: this._params.get("filterDecay")?.value ?? 200,
          sustain: (this._params.get("filterSustain")?.value ?? 50) / 100,
          release: this._params.get("filterRelease")?.value ?? 300,
        },
      },
      lfo: {
        waveform: ["sine", "triangle", "square", "saw", "s&h", "noise"][Math.round(this._params.get("lfoWave")?.value ?? 0)] as any,
        rate: this._params.get("lfoRate")?.value ?? 1,
        sync: false,
        filterAmount: this._params.get("lfoFilter")?.value ?? 0,
        pitchAmount: this._params.get("lfoPitch")?.value ?? 0,
        levelAmount: 0,
        phase: 0,
        retrigger: true,
      },
      pitchEnv: {
        initial: this._params.get("pitchInitial")?.value ?? 0,
        attack: this._params.get("pitchAttack")?.value ?? 0,
        peak: this._params.get("pitchPeak")?.value ?? 0,
        decay: this._params.get("pitchDecay")?.value ?? 50,
        sustain: 0,
        timeScale: 1,
      },
      oscillator: {
        algorithm: Math.round(this._params.get("algorithm")?.value ?? 7),
        feedback: this._params.get("feedback")?.value ?? 0,
        transpose: this._params.get("transpose")?.value ?? 0,
        detune: 0,
        spread: this._params.get("spread")?.value ?? 0,
        unisonVoices: [1, 2, 4][Math.round(this._params.get("unisonVoices")?.value ?? 0)],
      },
      timeVelocity: {
        timeKeyScale: 0,
        timeVelScale: 0,
        pitchVelScale: 0,
      },
      glide: {
        enabled: (this._params.get("glideEnabled")?.value ?? 0) > 0.5,
        time: this._params.get("glideTime")?.value ?? 50,
        legato: false,
        mode: "time",
      },
      masterLevel: this._params.get("masterLevel")?.value ?? 0,
      masterPan: this._params.get("masterPan")?.value ?? 0,
      voiceMode: "poly",
      polyphony: this._maxVoices,
    };
  }
  
  private _updateFromParams(): void {
    // Update all voice configurations when parameters change
    for (const voice of this._voices) {
      if (voice.active) {
        this._configureVoice(voice);
      }
    }
  }
}

// =============================================================================
// Plugin Definition
// =============================================================================

export function createOperatorDefinition(): PluginDefinition {
  return {
    id: "com.daw.operator",
    name: "Operator",
    category: "instrument",
    version: "1.0.0",
    vendor: "DAW",
    description: "8-operator FM synthesizer inspired by Ableton Operator",
    parameters: generateOperatorParameters(),
    ui: {
      type: "custom",
      width: 1000,
      height: 700,
      resizable: true,
      layout: [
        { title: "Algorithm", parameters: ["algorithm", "feedback", "spread", "unisonVoices"], layout: "horizontal" },
        { title: "Master", parameters: ["masterLevel", "masterPan", "transpose"], layout: "horizontal" },
        { title: "Filter", parameters: ["filterType", "filterFreq", "filterRes", "filterEnv"], layout: "horizontal" },
        { title: "LFO", parameters: ["lfoWave", "lfoRate", "lfoFilter", "lfoPitch"], layout: "horizontal" },
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
        id: "operator-default",
        name: "Default",
        category: "Init",
        state: createDefaultOperatorStateSnapshot(),
      },
    ],
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const instance = new OperatorInstance(8, ctx.maxBlockSize);
      instance.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return instance;
    },
  };
}
