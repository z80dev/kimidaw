/**
 * DSP Utilities for Effects Complete
 * 
 * Shared DSP primitives for all Ableton-style effects.
 * All functions are realtime-safe (no allocations, no locks).
 */

// =============================================================================
// Math Constants & Utilities
// =============================================================================

export const PI = Math.PI;
export const TWO_PI = 2 * Math.PI;
export const HALF_PI = Math.PI / 2;

/** Linear interpolation */
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

/** Hermite interpolation (smoother than cubic) */
export function hermiteInterp(y0: number, y1: number, y2: number, y3: number, t: number): number {
  const c0 = y1;
  const c1 = 0.5 * (y2 - y0);
  const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
  const c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
  return ((c3 * t + c2) * t + c1) * t + c0;
}

/** Clamp value to range */
export function clamp(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x;
}

/** Sign function */
export function sign(x: number): number {
  return x > 0 ? 1 : x < 0 ? -1 : 0;
}

/** Hyperbolic tangent (soft clipper) */
export function tanh(x: number): number {
  return Math.tanh(x);
}

/** Fast approximation of tanh */
export function tanhApprox(x: number): number {
  const x2 = x * x;
  return x * (27 + x2) / (27 + 9 * x2);
}

/** Sinc function for resampling */
export function sinc(x: number): number {
  if (Math.abs(x) < 0.0001) return 1;
  const pix = PI * x;
  return Math.sin(pix) / pix;
}

// =============================================================================
// dB / Linear Conversions
// =============================================================================

/** Convert dB to linear gain */
export function dbToLinear(db: number): number {
  return db <= -100 ? 0 : Math.pow(10, db / 20);
}

/** Convert linear gain to dB */
export function linearToDb(linear: number): number {
  return linear <= 0 ? -Infinity : 20 * Math.log10(linear);
}

/** Convert dB to power ratio */
export function dbToPower(db: number): number {
  return db <= -100 ? 0 : Math.pow(10, db / 10);
}

/** Convert power ratio to dB */
export function powerToDb(power: number): number {
  return power <= 0 ? -Infinity : 10 * Math.log10(power);
}

// =============================================================================
// Frequency / Pitch Conversions
// =============================================================================

/** Convert MIDI note to frequency */
export function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** Convert frequency to MIDI note */
export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

/** Convert cents to ratio */
export function centsToRatio(cents: number): number {
  return Math.pow(2, cents / 1200);
}

/** Convert ratio to cents */
export function ratioToCents(ratio: number): number {
  return 1200 * Math.log2(ratio);
}

/** Convert normalized value (0-1) to frequency (20Hz-20kHz) logarithmically */
export function normToFreq(norm: number, min = 20, max = 20000): number {
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  return Math.exp(logMin + norm * (logMax - logMin));
}

/** Convert frequency to normalized value */
export function freqToNorm(freq: number, min = 20, max = 20000): number {
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  return (Math.log(freq) - logMin) / (logMax - logMin);
}

// =============================================================================
// Parameter Smoothing
// =============================================================================

/**
 * One-pole lowpass filter for parameter smoothing.
 * y[n] = a * x[n] + (1-a) * y[n-1]
 */
export class SmoothedParameter {
  private _current: number;
  private _target: number;
  private _coeff: number;

  constructor(initial = 0, smoothingTimeMs = 5, sampleRate = 48000) {
    this._current = initial;
    this._target = initial;
    this._coeff = this._calcCoeff(smoothingTimeMs, sampleRate);
  }

  private _calcCoeff(timeMs: number, sr: number): number {
    if (timeMs <= 0) return 1;
    const tau = timeMs / 1000;
    return 1 - Math.exp(-1 / (tau * sr));
  }

  setTarget(value: number, timeConstantMs?: number, sampleRate?: number): void {
    this._target = value;
    if (timeConstantMs !== undefined && sampleRate !== undefined) {
      this._coeff = this._calcCoeff(timeConstantMs, sampleRate);
    }
  }

  setImmediate(value: number): void {
    this._current = value;
    this._target = value;
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

// =============================================================================
// RMS/Level Detection
// =============================================================================

/**
 * RMS calculator with configurable window size
 */
export class RMSDetector {
  private _buffer: Float32Array;
  private _index = 0;
  private _sum = 0;

  constructor(windowSize: number) {
    this._buffer = new Float32Array(windowSize);
  }

  process(sample: number): number {
    this._sum -= this._buffer[this._index];
    this._sum += sample * sample;
    this._buffer[this._index] = sample * sample;
    this._index = (this._index + 1) % this._buffer.length;
    return Math.sqrt(this._sum / this._buffer.length);
  }

  reset(): void {
    this._buffer.fill(0);
    this._index = 0;
    this._sum = 0;
  }
}

/**
 * Envelope follower with separate attack/release
 */
export class EnvelopeFollower {
  private _envelope = 0;
  private _attackCoeff = 0.1;
  private _releaseCoeff = 0.001;

  setAttack(attackMs: number, sampleRate: number): void {
    const attackSamples = Math.max(1, attackMs * sampleRate / 1000);
    this._attackCoeff = 1 - Math.exp(-1 / attackSamples);
  }

  setRelease(releaseMs: number, sampleRate: number): void {
    const releaseSamples = Math.max(1, releaseMs * sampleRate / 1000);
    this._releaseCoeff = 1 - Math.exp(-1 / releaseSamples);
  }

  process(input: number): number {
    const absInput = Math.abs(input);
    const coeff = absInput > this._envelope ? this._attackCoeff : this._releaseCoeff;
    this._envelope += (absInput - this._envelope) * coeff;
    return this._envelope;
  }

  processDb(input: number): number {
    const absInput = Math.abs(input);
    const levelDb = absInput > 0.00001 ? 20 * Math.log10(absInput) : -100;
    const coeff = levelDb > this._envelope ? this._attackCoeff : this._releaseCoeff;
    this._envelope += (levelDb - this._envelope) * coeff;
    return this._envelope;
  }

  reset(): void {
    this._envelope = 0;
  }

  get envelope(): number {
    return this._envelope;
  }
}

// =============================================================================
// Delay Lines
// =============================================================================

/**
 * Fractional delay line with linear interpolation
 */
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

  tap(delaySamples: number): number {
    const index = (this._writeIndex - Math.floor(delaySamples) - 1 + this._maxDelay) % this._maxDelay;
    return this._buffer[index];
  }

  reset(): void {
    this._buffer.fill(0);
    this._writeIndex = 0;
  }

  setSampleRate(sr: number): void {
    const ratio = sr / this._sampleRate;
    this._sampleRate = sr;
    const newMaxDelay = Math.ceil(this._maxDelay * ratio);
    this._maxDelay = newMaxDelay;
    this._buffer = new Float32Array(this._maxDelay);
    this._writeIndex = 0;
  }

  get maxDelaySamples(): number {
    return this._maxDelay;
  }
}

/**
 * Allpass delay for diffusion networks
 */
export class AllpassFilter {
  private _buffer: Float32Array;
  private _writeIndex = 0;
  private _delaySamples: number;

  constructor(delaySamples: number) {
    this._delaySamples = Math.max(1, Math.floor(delaySamples));
    this._buffer = new Float32Array(this._delaySamples);
  }

  process(input: number, coeff = 0.7): number {
    const readIndex = (this._writeIndex + 1) % this._delaySamples;
    const delayed = this._buffer[readIndex];
    
    const feedforward = input - coeff * delayed;
    this._buffer[this._writeIndex] = feedforward;
    this._writeIndex = readIndex;
    
    return delayed + coeff * feedforward;
  }

  reset(): void {
    this._buffer.fill(0);
    this._writeIndex = 0;
  }
}

// =============================================================================
// LFO
// =============================================================================

export type LFOWaveform = "sine" | "triangle" | "saw" | "square" | "s&h" | "noise" | "sine-tri";

export class LFO {
  private _phase = 0;
  private _rate = 1;
  private _waveform: LFOWaveform = "sine";
  private _sampleRate = 48000;
  private _lastRandom = 0;

  constructor(sampleRate = 48000) {
    this._sampleRate = sampleRate;
    this._updatePhaseIncrement();
  }

  setRate(rateHz: number): void {
    this._rate = rateHz;
    this._updatePhaseIncrement();
  }

  setRateSynced(beatFraction: number, bpm: number): void {
    this._rate = (bpm / 60) * beatFraction;
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

  setPhase(phase: number): void {
    this._phase = phase % 1;
  }

  private _updatePhaseIncrement(): void {
    this._phase += this._rate / this._sampleRate;
    while (this._phase >= 1) this._phase -= 1;
  }

  process(): number {
    this._phase += this._rate / this._sampleRate;
    while (this._phase >= 1) {
      this._phase -= 1;
      if (this._waveform === "s&h") {
        this._lastRandom = Math.random() * 2 - 1;
      }
    }

    switch (this._waveform) {
      case "sine":
        return Math.sin(this._phase * TWO_PI);

      case "triangle": {
        const p = this._phase * 4;
        return p < 2 ? p - 1 : 3 - p;
      }

      case "saw":
        return 2 * this._phase - 1;

      case "square":
        return this._phase < 0.5 ? 1 : -1;

      case "s&h":
        return this._lastRandom;

      case "noise":
        return Math.random() * 2 - 1;

      case "sine-tri": {
        // Blend between sine and triangle
        const sine = Math.sin(this._phase * TWO_PI);
        const p = this._phase * 4;
        const tri = p < 2 ? p - 1 : 3 - p;
        return 0.5 * (sine + tri);
      }

      default:
        return 0;
    }
  }

  /** Process with bipolar output (-1 to 1) scaled by amount (0 to 1) */
  processModulation(amount: number): number {
    return this.process() * amount;
  }

  get phase(): number {
    return this._phase;
  }
}

// =============================================================================
// DC Filter
// =============================================================================

/**
 * DC blocking filter (highpass at ~5-20Hz)
 */
export class DCFilter {
  private _x1 = 0;
  private _y1 = 0;
  private _r = 0.995; // Pole position (closer to 1 = lower cutoff)

  setCutoff(freq: number, sampleRate: number): void {
    // R = 1 - 2 * (fc / fs) * PI for small fc/fs
    this._r = 1 - (2 * PI * freq) / sampleRate;
    this._r = clamp(this._r, 0.9, 0.99999);
  }

  process(input: number): number {
    const output = input - this._x1 + this._r * this._y1;
    this._x1 = input;
    this._y1 = output;
    return output;
  }

  reset(): void {
    this._x1 = 0;
    this._y1 = 0;
  }
}

// =============================================================================
// Window Functions for FFT
// =============================================================================

export function hannWindow(n: number, size: number): number {
  return 0.5 * (1 - Math.cos(TWO_PI * n / (size - 1)));
}

export function hammingWindow(n: number, size: number): number {
  return 0.54 - 0.46 * Math.cos(TWO_PI * n / (size - 1));
}

export function blackmanWindow(n: number, size: number): number {
  return 0.42 - 0.5 * Math.cos(TWO_PI * n / (size - 1)) + 0.08 * Math.cos(4 * PI * n / (size - 1));
}

// =============================================================================
// Noise Generators
// =============================================================================

/** White noise (-1 to 1) */
export function whiteNoise(): number {
  return Math.random() * 2 - 1;
}

/** Pink noise approximation */
export class PinkNoise {
  private _b0 = 0;
  private _b1 = 0;
  private _b2 = 0;
  private _b3 = 0;
  private _b4 = 0;
  private _b5 = 0;
  private _b6 = 0;

  process(): number {
    const white = whiteNoise();
    this._b0 = 0.99886 * this._b0 + white * 0.0555179;
    this._b1 = 0.99332 * this._b1 + white * 0.0750759;
    this._b2 = 0.96900 * this._b2 + white * 0.1538520;
    this._b3 = 0.86650 * this._b3 + white * 0.3104856;
    this._b4 = 0.55000 * this._b4 + white * 0.5329522;
    this._b5 = -0.7616 * this._b5 - white * 0.0168980;
    const output = this._b0 + this._b1 + this._b2 + this._b3 + this._b4 + this._b5 + this._b6 + white * 0.5362;
    this._b6 = white * 0.115926;
    return output * 0.11; // Normalize roughly to -1..1
  }

  reset(): void {
    this._b0 = this._b1 = this._b2 = this._b3 = this._b4 = this._b5 = this._b6 = 0;
  }
}

/** Brown noise */
export class BrownNoise {
  private _lastOut = 0;

  process(): number {
    const white = whiteNoise();
    this._lastOut = (this._lastOut + (0.02 * white)) / 1.02;
    return this._lastOut * 3.5; // Normalize
  }

  reset(): void {
    this._lastOut = 0;
  }
}
