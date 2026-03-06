/**
 * Shared DSP utilities for physical modeling instruments
 * 
 * Realtime-safe implementations with no allocations during processing
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const TWO_PI = 2 * Math.PI;
export const PI = Math.PI;

// ============================================================================
// DELAY LINE (for waveguide synthesis)
// ============================================================================

export class DelayLine {
  private buffer: Float32Array;
  private writeIndex: number = 0;
  private readIndex: number = 0;
  private sampleRate: number;

  constructor(maxDelayMs: number, sampleRate: number) {
    this.sampleRate = sampleRate;
    const maxSamples = Math.ceil((maxDelayMs / 1000) * sampleRate);
    this.buffer = new Float32Array(maxSamples);
  }

  /** Set delay time in milliseconds */
  setDelayTime(ms: number): void {
    const delaySamples = (ms / 1000) * this.sampleRate;
    this.readIndex = this.writeIndex - delaySamples;
    while (this.readIndex < 0) {
      this.readIndex += this.buffer.length;
    }
  }

  /** Set delay time in samples */
  setDelaySamples(samples: number): void {
    this.readIndex = this.writeIndex - samples;
    while (this.readIndex < 0) {
      this.readIndex += this.buffer.length;
    }
  }

  /** Process single sample with fractional delay interpolation */
  process(input: number): number {
    const output = this.read();
    this.write(input);
    return output;
  }

  /** Write to delay line */
  write(input: number): void {
    this.buffer[this.writeIndex] = input;
    this.writeIndex++;
    if (this.writeIndex >= this.buffer.length) {
      this.writeIndex = 0;
    }
  }

  /** Read from delay line with linear interpolation for fractional delays */
  read(): number {
    const i = Math.floor(this.readIndex);
    const frac = this.readIndex - i;
    const i2 = (i + 1) % this.buffer.length;
    const idx = i % this.buffer.length;
    
    const output = this.buffer[idx] * (1 - frac) + this.buffer[i2] * frac;
    
    this.readIndex++;
    if (this.readIndex >= this.buffer.length) {
      this.readIndex -= this.buffer.length;
    }
    
    return output;
  }

  /** Clear the delay line */
  clear(): void {
    this.buffer.fill(0);
  }
}

// ============================================================================
// ONE-POLE FILTER (for damping)
// ============================================================================

export class OnePoleFilter {
  private y1: number = 0;
  private a0: number = 1;
  private b1: number = 0;

  /** Set coefficient directly (0-1, higher = more damping) */
  setCoefficient(coeff: number): void {
    this.b1 = -coeff;
    this.a0 = 1 + this.b1;
  }

  /** Set cutoff frequency in Hz */
  setCutoff(freq: number, sampleRate: number): void {
    const omega = TWO_PI * freq / sampleRate;
    this.b1 = -Math.exp(-omega);
    this.a0 = 1 + this.b1;
  }

  /** Process single sample */
  process(input: number): number {
    this.y1 = this.a0 * input - this.b1 * this.y1;
    return this.y1;
  }

  /** Process in place (avoids extra allocation) */
  processBlock(block: Float32Array): void {
    for (let i = 0; i < block.length; i++) {
      this.y1 = this.a0 * block[i] - this.b1 * this.y1;
      block[i] = this.y1;
    }
  }

  reset(): void {
    this.y1 = 0;
  }
}

// ============================================================================
// BIQUAD FILTER (resonant lowpass/highpass/bandpass)
// ============================================================================

export class BiquadFilter {
  private x1: number = 0;
  private x2: number = 0;
  private y1: number = 0;
  private y2: number = 0;
  private a0: number = 1;
  private a1: number = 0;
  private a2: number = 0;
  private b0: number = 1;
  private b1: number = 0;
  private b2: number = 0;

  setLowpass(freq: number, q: number, sampleRate: number): void {
    const omega = TWO_PI * freq / sampleRate;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);
    const alpha = sinOmega / (2 * q);

    const a0Inv = 1 / (1 + alpha);
    this.a0 = a0Inv;
    this.a1 = -2 * cosOmega * a0Inv;
    this.a2 = (1 - alpha) * a0Inv;
    this.b0 = (1 - cosOmega) / 2 * a0Inv;
    this.b1 = (1 - cosOmega) * a0Inv;
    this.b2 = (1 - cosOmega) / 2 * a0Inv;
  }

  setHighpass(freq: number, q: number, sampleRate: number): void {
    const omega = TWO_PI * freq / sampleRate;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);
    const alpha = sinOmega / (2 * q);

    const a0Inv = 1 / (1 + alpha);
    this.a0 = a0Inv;
    this.a1 = -2 * cosOmega * a0Inv;
    this.a2 = (1 - alpha) * a0Inv;
    this.b0 = (1 + cosOmega) / 2 * a0Inv;
    this.b1 = -(1 + cosOmega) * a0Inv;
    this.b2 = (1 + cosOmega) / 2 * a0Inv;
  }

  setBandpass(freq: number, q: number, sampleRate: number): void {
    const omega = TWO_PI * freq / sampleRate;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);
    const alpha = sinOmega / (2 * q);

    const a0Inv = 1 / (1 + alpha);
    this.a0 = a0Inv;
    this.a1 = -2 * cosOmega * a0Inv;
    this.a2 = (1 - alpha) * a0Inv;
    this.b0 = alpha * a0Inv;
    this.b1 = 0;
    this.b2 = -alpha * a0Inv;
  }

  process(input: number): number {
    const output = this.b0 * input + this.b1 * this.x1 + this.b2 * this.x2
                 - this.a1 * this.y1 - this.a2 * this.y2;
    
    this.x2 = this.x1;
    this.x1 = input;
    this.y2 = this.y1;
    this.y1 = output;
    
    return output;
  }

  reset(): void {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
}

// ============================================================================
// ADSR ENVELOPE (exponential, realtime-safe)
// ============================================================================

export class ADSREnvelope {
  private state: 'idle' | 'attack' | 'decay' | 'sustain' | 'release' = 'idle';
  private level: number = 0;
  private attackRate: number = 0;
  private decayRate: number = 0;
  private sustainLevel: number = 0;
  private releaseRate: number = 0;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setAttack(seconds: number): void {
    // Exponential attack: coefficient = exp(-1/(rate * sr))
    this.attackRate = seconds > 0.001 ? Math.exp(-1 / (seconds * this.sampleRate)) : 0;
  }

  setDecay(seconds: number): void {
    this.decayRate = seconds > 0.001 ? Math.exp(-1 / (seconds * this.sampleRate)) : 0;
  }

  setSustain(level: number): void {
    this.sustainLevel = Math.max(0, Math.min(1, level));
  }

  setRelease(seconds: number): void {
    this.releaseRate = seconds > 0.001 ? Math.exp(-1 / (seconds * this.sampleRate)) : 0;
  }

  trigger(): void {
    this.state = 'attack';
  }

  release(): void {
    if (this.state !== 'idle') {
      this.state = 'release';
    }
  }

  isActive(): boolean {
    return this.state !== 'idle';
  }

  getState(): string {
    return this.state;
  }

  process(): number {
    switch (this.state) {
      case 'attack':
        this.level = 1 + (this.level - 1) * this.attackRate;
        if (this.level > 0.999) {
          this.level = 1;
          this.state = 'decay';
        }
        break;
      
      case 'decay':
        this.level = this.sustainLevel + (this.level - this.sustainLevel) * this.decayRate;
        if (Math.abs(this.level - this.sustainLevel) < 0.001) {
          this.level = this.sustainLevel;
          this.state = 'sustain';
        }
        break;
      
      case 'sustain':
        this.level = this.sustainLevel;
        break;
      
      case 'release':
        this.level = this.level * this.releaseRate;
        if (this.level < 0.0001) {
          this.level = 0;
          this.state = 'idle';
        }
        break;
      
      case 'idle':
        this.level = 0;
        break;
    }
    
    return this.level;
  }

  reset(): void {
    this.state = 'idle';
    this.level = 0;
  }
}

// ============================================================================
// PERCUSSIVE ENVELOPE (one-shot exponential decay)
// ============================================================================

export class PercussiveEnvelope {
  private level: number = 0;
  private decayRate: number = 0;
  private active: boolean = false;

  setDecay(seconds: number, sampleRate: number): void {
    this.decayRate = Math.exp(-1 / (seconds * sampleRate));
  }

  trigger(velocity: number = 1): void {
    this.level = velocity;
    this.active = true;
  }

  isActive(): boolean {
    return this.active;
  }

  process(): number {
    if (!this.active) return 0;
    
    this.level *= this.decayRate;
    if (this.level < 0.0001) {
      this.level = 0;
      this.active = false;
    }
    
    return this.level;
  }

  reset(): void {
    this.level = 0;
    this.active = false;
  }
}

// ============================================================================
// LFO (Low Frequency Oscillator)
// ============================================================================

export class LFO {
  private phase: number = 0;
  private phaseIncrement: number = 0;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setFrequency(hz: number): void {
    this.phaseIncrement = hz / this.sampleRate;
  }

  setPhase(degrees: number): void {
    this.phase = (degrees / 360) % 1;
  }

  process(waveform: 'sine' | 'triangle' | 'saw' | 'square'): number {
    let output: number;
    
    switch (waveform) {
      case 'sine':
        output = Math.sin(this.phase * TWO_PI);
        break;
      
      case 'triangle':
        if (this.phase < 0.5) {
          output = 4 * this.phase - 1;
        } else {
          output = 3 - 4 * this.phase;
        }
        break;
      
      case 'saw':
        output = 2 * this.phase - 1;
        break;
      
      case 'square':
        output = this.phase < 0.5 ? 1 : -1;
        break;
      
      default:
        output = 0;
    }

    this.phase += this.phaseIncrement;
    while (this.phase >= 1) this.phase -= 1;
    
    return output;
  }

  reset(): void {
    this.phase = 0;
  }
}

// ============================================================================
// WHITE NOISE GENERATOR
// ============================================================================

export class NoiseGenerator {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  /** Linear congruential generator for pseudo-random numbers */
  private next(): number {
    this.seed = (1103515245 * this.seed + 12345) % 2147483648;
    return this.seed / 2147483648;
  }

  white(): number {
    return this.next() * 2 - 1;
  }

  /** Pink noise approximation (simple 3-pole filter) */
  private pinkB0: number = 0;
  private pinkB1: number = 0;
  private pinkB2: number = 0;
  
  pink(): number {
    const white = this.white();
    this.pinkB0 = 0.99886 * this.pinkB0 + white * 0.0555179;
    this.pinkB1 = 0.99332 * this.pinkB1 + white * 0.0750759;
    this.pinkB2 = 0.96900 * this.pinkB2 + white * 0.1538520;
    return (this.pinkB0 + this.pinkB1 + this.pinkB2 + white * 0.5362) * 0.11;
  }
}

// ============================================================================
// PARAMETER SMOOTHER (for realtime parameter interpolation)
// ============================================================================

export class ParameterSmoother {
  private current: number = 0;
  private target: number = 0;
  private coefficient: number = 0;

  setTimeConstant(seconds: number, sampleRate: number): void {
    this.coefficient = Math.exp(-1 / (seconds * sampleRate));
  }

  setTarget(value: number): void {
    this.target = value;
  }

  setImmediate(value: number): void {
    this.current = this.target = value;
  }

  process(): number {
    this.current = this.target + (this.current - this.target) * this.coefficient;
    return this.current;
  }

  getCurrent(): number {
    return this.current;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Convert MIDI note to frequency */
export function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** Convert dB to linear gain */
export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/** Convert linear gain to dB */
export function gainToDb(gain: number): number {
  return 20 * Math.log10(gain);
}

/** Clamp value to range */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Exponential interpolation for frequency */
export function expLerp(a: number, b: number, t: number): number {
  return a * Math.pow(b / a, t);
}
