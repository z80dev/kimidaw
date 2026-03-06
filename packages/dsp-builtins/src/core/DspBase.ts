/**
 * DSP Builtins - Base Classes and Utilities
 * 
 * Core infrastructure for all DSP processors.
 * Provides realtime-safe utilities, parameter smoothing, and common algorithms.
 */

import type { 
  AudioBuffer, 
  MidiEvent, 
  PluginParameterSpec,
  ParameterInstance,
  ParameterMap,
  SampleZone,
} from "@daw/plugin-api";
import { createParameterMap, midiToFrequency } from "@daw/plugin-api";

// =============================================================================
// Realtime-Safe Utilities
// =============================================================================

/** 
 * One-pole lowpass filter for parameter smoothing.
 * y[n] = a * x[n] + (1-a) * y[n-1]
 */
export class SmoothedValue {
  private _current: number;
  private _target: number;
  private _coeff: number;

  constructor(initial = 0) {
    this._current = initial;
    this._target = initial;
    this._coeff = 1; // Immediate by default
  }

  setTarget(value: number, timeConstantMs: number, sampleRate: number): void {
    this._target = value;
    const tau = timeConstantMs / 1000;
    this._coeff = 1 - Math.exp(-1 / (tau * sampleRate));
  }

  setImmediate(value: number): void {
    this._current = value;
    this._target = value;
    this._coeff = 1;
  }

  process(): number {
    if (this._coeff >= 1) {
      this._current = this._target;
    } else {
      this._current += (this._target - this._current) * this._coeff;
    }
    return this._current;
  }

  get current(): number {
    return this._current;
  }

  get target(): number {
    return this._target;
  }

  get isAtTarget(): boolean {
    return Math.abs(this._target - this._current) < 1e-10;
  }
}

/** Linear interpolation between two values */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Cubic interpolation for smoother results */
export function cubicInterp(y0: number, y1: number, y2: number, y3: number, t: number): number {
  const a = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
  const b = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
  const c = -0.5 * y0 + 0.5 * y2;
  const d = y1;
  return ((a * t + b) * t + c) * t + d;
}

/** Clamp value to range */
export function clamp(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x;
}

/** Convert dB to linear with -inf handling */
export function dbToLinear(db: number): number {
  return db <= -100 ? 0 : Math.pow(10, db / 20);
}

/** Convert linear to dB */
export function linearToDb(linear: number): number {
  return linear <= 0 ? -Infinity : 20 * Math.log10(linear);
}

// =============================================================================
// ADSR Envelope
// =============================================================================

export interface ADSRConfig {
  attack: number;      // Attack time in seconds
  decay: number;       // Decay time in seconds
  sustain: number;     // Sustain level (0-1)
  release: number;     // Release time in seconds
  attackCurve?: number; // Attack curve shape (0=linear, 1=exponential)
}

export enum ADSRPhase {
  Idle = 0,
  Attack = 1,
  Decay = 2,
  Sustain = 3,
  Release = 4,
}

export class ADSREnvelope {
  private _phase: ADSRPhase = ADSRPhase.Idle;
  private _level: number = 0;
  private _config: ADSRConfig;
  private _sampleRate: number;

  constructor(config: Partial<ADSRConfig> = {}, sampleRate = 48000) {
    this._sampleRate = sampleRate;
    this._config = {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.5,
      release: 0.3,
      attackCurve: 0,
      ...config,
    };
  }

  setConfig(config: Partial<ADSRConfig>): void {
    this._config = { ...this._config, ...config };
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
  }

  trigger(): void {
    this._phase = ADSRPhase.Attack;
    this._level = 0;
  }

  release(): void {
    if (this._phase !== ADSRPhase.Idle) {
      this._phase = ADSRPhase.Release;
    }
  }

  stop(): void {
    this._phase = ADSRPhase.Idle;
    this._level = 0;
  }

  process(): number {
    switch (this._phase) {
      case ADSRPhase.Idle:
        this._level = 0;
        break;

      case ADSRPhase.Attack: {
        const attackSamples = Math.max(1, this._config.attack * this._sampleRate);
        const attackStep = 1 / attackSamples;
        
        if (this._config.attackCurve && this._config.attackCurve > 0) {
          // Exponential attack
          this._level += attackStep * (1.5 - this._level);
        } else {
          // Linear attack
          this._level += attackStep;
        }
        
        if (this._level >= 1) {
          this._level = 1;
          this._phase = ADSRPhase.Decay;
        }
        break;
      }

      case ADSRPhase.Decay: {
        const decaySamples = Math.max(1, this._config.decay * this._sampleRate);
        const decayCoeff = Math.exp(-1 / decaySamples);
        this._level = this._config.sustain + (this._level - this._config.sustain) * decayCoeff;
        
        if (Math.abs(this._level - this._config.sustain) < 0.001) {
          this._level = this._config.sustain;
          this._phase = ADSRPhase.Sustain;
        }
        break;
      }

      case ADSRPhase.Sustain:
        this._level = this._config.sustain;
        break;

      case ADSRPhase.Release: {
        const releaseSamples = Math.max(1, this._config.release * this._sampleRate);
        const releaseCoeff = Math.exp(-1 / releaseSamples);
        this._level *= releaseCoeff;
        
        if (this._level < 0.0001) {
          this._level = 0;
          this._phase = ADSRPhase.Idle;
        }
        break;
      }
    }

    return this._level;
  }

  get phase(): ADSRPhase {
    return this._phase;
  }

  get level(): number {
    return this._level;
  }

  get isActive(): boolean {
    return this._phase !== ADSRPhase.Idle;
  }

  get isReleasing(): boolean {
    return this._phase === ADSRPhase.Release;
  }
}

// =============================================================================
// Biquad Filter
// =============================================================================

export type FilterType = "lowpass" | "highpass" | "bandpass" | "notch" | "peak" | "lowshelf" | "highshelf";

export class BiquadFilter {
  private _type: FilterType = "lowpass";
  private _freq: number = 1000;
  private _q: number = 0.707;
  private _gain: number = 0;
  private _sampleRate: number = 48000;

  // Filter coefficients
  private _a0 = 1;
  private _a1 = 0;
  private _a2 = 0;
  private _b0 = 1;
  private _b1 = 0;
  private _b2 = 0;

  // State
  private _z1 = 0;
  private _z2 = 0;

  // Smoothed parameters
  private _freqSmooth = new SmoothedValue(1000);
  private _qSmooth = new SmoothedValue(0.707);

  constructor(sampleRate = 48000) {
    this._sampleRate = sampleRate;
    this._updateCoefficients();
  }

  setType(type: FilterType): void {
    if (this._type !== type) {
      this._type = type;
      this._updateCoefficients();
    }
  }

  setFrequency(freq: number): void {
    this._freq = clamp(freq, 10, this._sampleRate / 2);
    this._freqSmooth.setImmediate(this._freq);
    this._updateCoefficients();
  }

  setFrequencySmooth(freq: number, timeMs: number): void {
    this._freq = clamp(freq, 10, this._sampleRate / 2);
    this._freqSmooth.setTarget(freq, timeMs, this._sampleRate);
  }

  setQ(q: number): void {
    this._q = clamp(q, 0.1, 20);
    this._qSmooth.setImmediate(this._q);
    this._updateCoefficients();
  }

  setGain(gainDb: number): void {
    this._gain = gainDb;
    this._updateCoefficients();
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._updateCoefficients();
  }

  private _updateCoefficients(): void {
    const w0 = 2 * Math.PI * this._freq / this._sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * this._q);
    const A = Math.pow(10, this._gain / 40);

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

      case "peak":
        this._b0 = 1 + alpha * A;
        this._b1 = -2 * cosw0;
        this._b2 = 1 - alpha * A;
        this._a0 = 1 + alpha / A;
        this._a1 = -2 * cosw0;
        this._a2 = 1 - alpha / A;
        break;

      case "lowshelf":
        this._b0 = A * ((A + 1) - (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha);
        this._b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
        this._b2 = A * ((A + 1) - (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha);
        this._a0 = (A + 1) + (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha;
        this._a1 = -2 * ((A - 1) + (A + 1) * cosw0);
        this._a2 = (A + 1) + (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha;
        break;

      case "highshelf":
        this._b0 = A * ((A + 1) + (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha);
        this._b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
        this._b2 = A * ((A + 1) + (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha);
        this._a0 = (A + 1) - (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha;
        this._a1 = 2 * ((A - 1) - (A + 1) * cosw0);
        this._a2 = (A + 1) - (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha;
        break;
    }

    // Normalize
    this._b0 /= this._a0;
    this._b1 /= this._a0;
    this._b2 /= this._a0;
    this._a1 /= this._a0;
    this._a2 /= this._a0;
  }

  process(input: number): number {
    // Check if frequency needs smoothing
    if (!this._freqSmooth.isAtTarget) {
      this._freq = this._freqSmooth.process();
      this._updateCoefficients();
    }

    const output = this._b0 * input + this._b1 * this._z1 + this._b2 * this._z2
                 - this._a1 * this._z1 - this._a2 * this._z2;

    this._z2 = this._z1;
    this._z1 = output;

    return output;
  }

  processBlock(input: Float32Array, output: Float32Array): void {
    for (let i = 0; i < input.length; i++) {
      output[i] = this.process(input[i]);
    }
  }

  reset(): void {
    this._z1 = 0;
    this._z2 = 0;
  }
}

// =============================================================================
// Delay Line
// =============================================================================

export class DelayLine {
  private _buffer: Float32Array;
  private _writeIndex = 0;
  private _maxDelay: number;
  private _sampleRate: number;

  constructor(maxDelaySeconds: number, sampleRate = 48000) {
    this._sampleRate = sampleRate;
    this._maxDelay = Math.ceil(maxDelaySeconds * sampleRate);
    this._buffer = new Float32Array(this._maxDelay);
  }

  write(sample: number): void {
    this._buffer[this._writeIndex] = sample;
    this._writeIndex = (this._writeIndex + 1) % this._maxDelay;
  }

  read(delaySamples: number): number {
    const delayInt = Math.floor(delaySamples);
    const frac = delaySamples - delayInt;
    
    const index = (this._writeIndex - delayInt - 1 + this._maxDelay) % this._maxDelay;
    const indexNext = (index + 1) % this._maxDelay;
    
    // Linear interpolation
    return lerp(this._buffer[index], this._buffer[indexNext], frac);
  }

  readCubic(delaySamples: number): number {
    const delayInt = Math.floor(delaySamples);
    const frac = delaySamples - delayInt;
    
    const i0 = (this._writeIndex - delayInt - 2 + this._maxDelay) % this._maxDelay;
    const i1 = (this._writeIndex - delayInt - 1 + this._maxDelay) % this._maxDelay;
    const i2 = (this._writeIndex - delayInt + this._maxDelay) % this._maxDelay;
    const i3 = (this._writeIndex - delayInt + 1 + this._maxDelay) % this._maxDelay;
    
    return cubicInterp(this._buffer[i0], this._buffer[i1], this._buffer[i2], this._buffer[i3], frac);
  }

  reset(): void {
    this._buffer.fill(0);
    this._writeIndex = 0;
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._maxDelay = Math.ceil((this._maxDelay / this._sampleRate) * sr);
    this._buffer = new Float32Array(this._maxDelay);
    this._writeIndex = 0;
  }
}

// =============================================================================
// Oscillator
// =============================================================================

export type Waveform = "sine" | "triangle" | "sawtooth" | "square" | "pulse";

export class Oscillator {
  private _phase = 0;
  private _frequency = 440;
  private _waveform: Waveform = "sine";
  private _pulseWidth = 0.5;
  private _sampleRate = 48000;
  private _phaseIncrement = 0;

  constructor(sampleRate = 48000) {
    this._sampleRate = sampleRate;
    this._updatePhaseIncrement();
  }

  setFrequency(freq: number): void {
    this._frequency = freq;
    this._updatePhaseIncrement();
  }

  setWaveform(waveform: Waveform): void {
    this._waveform = waveform;
  }

  setPulseWidth(pw: number): void {
    this._pulseWidth = clamp(pw, 0.01, 0.99);
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._updatePhaseIncrement();
  }

  private _updatePhaseIncrement(): void {
    this._phaseIncrement = this._frequency / this._sampleRate;
  }

  reset(): void {
    this._phase = 0;
  }

  setPhase(phase: number): void {
    this._phase = phase % 1;
  }

  process(): number {
    this._phase += this._phaseIncrement;
    while (this._phase >= 1) this._phase -= 1;

    switch (this._waveform) {
      case "sine":
        return Math.sin(this._phase * 2 * Math.PI);

      case "triangle":
        return 4 * Math.abs(this._phase - 0.5) - 1;

      case "sawtooth":
        return 2 * this._phase - 1;

      case "square":
        return this._phase < 0.5 ? 1 : -1;

      case "pulse":
        return this._phase < this._pulseWidth ? 1 : -1;

      default:
        return 0;
    }
  }

  processBlock(output: Float32Array): void {
    for (let i = 0; i < output.length; i++) {
      output[i] = this.process();
    }
  }
}

// =============================================================================
// LFO
// =============================================================================

export type LFOWaveform = "sine" | "triangle" | "square" | "saw" | "s&h" | "noise";

export class LFO {
  private _phase = 0;
  private _rate = 1; // Hz
  private _waveform: LFOWaveform = "sine";
  private _sampleRate = 48000;
  private _phaseIncrement = 0;
  private _lastRandom = 0;

  constructor(sampleRate = 48000) {
    this._sampleRate = sampleRate;
    this._updatePhaseIncrement();
  }

  setRate(rateHz: number): void {
    this._rate = rateHz;
    this._updatePhaseIncrement();
  }

  setWaveform(waveform: LFOWaveform): void {
    this._waveform = waveform;
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._updatePhaseIncrement();
  }

  reset(): void {
    this._phase = 0;
    this._lastRandom = 0;
  }

  sync(): void {
    this._phase = 0;
  }

  private _updatePhaseIncrement(): void {
    this._phaseIncrement = this._rate / this._sampleRate;
  }

  process(): number {
    this._phase += this._phaseIncrement;
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
        return this._phase < 0.5 
          ? 4 * this._phase - 1 
          : 3 - 4 * this._phase;

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

  /** Process with bipolar output (-1 to 1) scaled by amount */
  processModulation(amount: number): number {
    return this.process() * amount;
  }
}

// =============================================================================
// Voice Base Class (for polyphonic instruments)
// =============================================================================

export interface Voice {
  note: number;
  velocity: number;
  active: boolean;
  age: number;
  
  trigger(note: number, velocity: number): void;
  release(): void;
  stop(): void;
  process(left: Float32Array, right: Float32Array, offset: number, count: number): void;
  isFinished(): boolean;
  setSampleRate(sr: number): void;
}

export abstract class VoiceBase implements Voice {
  note = 0;
  velocity = 0;
  active = false;
  age = 0;

  abstract trigger(note: number, velocity: number): void;
  abstract release(): void;
  abstract stop(): void;
  abstract process(left: Float32Array, right: Float32Array, offset: number, count: number): void;
  abstract isFinished(): boolean;
  abstract setSampleRate(sr: number): void;
}

export class VoiceAllocator<T extends Voice> {
  private _voices: T[];
  private _stealMode: "oldest" | "quietest" | "none" = "oldest";

  constructor(voices: T[]) {
    this._voices = voices;
  }

  setStealMode(mode: "oldest" | "quietest" | "none"): void {
    this._stealMode = mode;
  }

  allocate(note: number, velocity: number): T | null {
    // First, try to find an inactive voice
    for (const voice of this._voices) {
      if (!voice.active) {
        voice.trigger(note, velocity);
        return voice;
      }
    }

    // If all voices active and stealing is disabled, return null
    if (this._stealMode === "none") {
      return null;
    }

    // Find voice to steal
    let voiceToSteal: T | null = null;

    if (this._stealMode === "oldest") {
      let maxAge = -1;
      for (const voice of this._voices) {
        if (voice.age > maxAge) {
          maxAge = voice.age;
          voiceToSteal = voice;
        }
      }
    } else if (this._stealMode === "quietest") {
      let minVelocity = Infinity;
      for (const voice of this._voices) {
        if (voice.velocity < minVelocity) {
          minVelocity = voice.velocity;
          voiceToSteal = voice;
        }
      }
    }

    if (voiceToSteal) {
      voiceToSteal.stop();
      voiceToSteal.trigger(note, velocity);
    }

    return voiceToSteal;
  }

  release(note: number): void {
    for (const voice of this._voices) {
      if (voice.active && voice.note === note) {
        voice.release();
      }
    }
  }

  releaseAll(): void {
    for (const voice of this._voices) {
      if (voice.active) {
        voice.release();
      }
    }
  }

  stopAll(): void {
    for (const voice of this._voices) {
      voice.stop();
    }
  }

  process(left: Float32Array, right: Float32Array, offset: number, count: number): void {
    for (const voice of this._voices) {
      if (voice.active) {
        voice.process(left, right, offset, count);
        voice.age++;
      }
    }
  }

  get activeVoiceCount(): number {
    return this._voices.filter(v => v.active).length;
  }

  get voices(): readonly T[] {
    return this._voices;
  }
}
