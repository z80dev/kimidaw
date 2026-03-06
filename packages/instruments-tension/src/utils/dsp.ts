/**
 * Shared DSP utilities for Tension instrument
 */

export const TWO_PI = 2 * Math.PI;

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

  setDelayTime(ms: number): void {
    const delaySamples = (ms / 1000) * this.sampleRate;
    this.readIndex = this.writeIndex - delaySamples;
    while (this.readIndex < 0) {
      this.readIndex += this.buffer.length;
    }
  }

  setDelaySamples(samples: number): void {
    this.readIndex = this.writeIndex - samples;
    while (this.readIndex < 0) {
      this.readIndex += this.buffer.length;
    }
  }

  getDelaySamples(): number {
    let diff = this.writeIndex - this.readIndex;
    if (diff < 0) diff += this.buffer.length;
    return diff;
  }

  process(input: number): number {
    const output = this.read();
    this.write(input);
    return output;
  }

  write(input: number): void {
    this.buffer[this.writeIndex] = input;
    this.writeIndex++;
    if (this.writeIndex >= this.buffer.length) {
      this.writeIndex = 0;
    }
  }

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

  tap(samplesAgo: number): number {
    let idx = this.writeIndex - samplesAgo;
    while (idx < 0) idx += this.buffer.length;
    return this.buffer[idx % this.buffer.length];
  }

  clear(): void {
    this.buffer.fill(0);
  }
}

export class AllpassFilter {
  private x1: number = 0;
  private x2: number = 0;
  private y1: number = 0;
  private y2: number = 0;
  private a1: number = 0;
  private a2: number = 0;

  setParams(freq: number, q: number, sampleRate: number): void {
    const omega = TWO_PI * freq / sampleRate;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);
    const alpha = sinOmega / (2 * q);

    const a0 = 1 + alpha;
    const b0 = (1 - alpha) / a0;
    const b1 = -2 * cosOmega / a0;
    const b2 = (1 + alpha) / a0;
    this.a1 = -2 * cosOmega / a0;
    this.a2 = (1 - alpha) / a0;

    // For allpass: b0 = a2, b1 = a1, b2 = 1
    // We're using the setters for the general biquad, then swapping
  }

  process(input: number): number {
    const output = this.a2 * input + this.a1 * this.x1 + this.x2
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

export class OnePoleFilter {
  private y1: number = 0;
  private a0: number = 1;
  private b1: number = 0;

  setCoefficient(coeff: number): void {
    this.b1 = -coeff;
    this.a0 = 1 + this.b1;
  }

  setCutoff(freq: number, sampleRate: number): void {
    const omega = TWO_PI * freq / sampleRate;
    this.b1 = -Math.exp(-omega);
    this.a0 = 1 + this.b1;
  }

  process(input: number): number {
    this.y1 = this.a0 * input - this.b1 * this.y1;
    return this.y1;
  }

  reset(): void {
    this.y1 = 0;
  }
}

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

  setNotch(freq: number, q: number, sampleRate: number): void {
    const omega = TWO_PI * freq / sampleRate;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);
    const alpha = sinOmega / (2 * q);

    const a0Inv = 1 / (1 + alpha);
    this.a0 = a0Inv;
    this.a1 = -2 * cosOmega * a0Inv;
    this.a2 = (1 - alpha) * a0Inv;
    this.b0 = a0Inv;
    this.b1 = -2 * cosOmega * a0Inv;
    this.b2 = a0Inv;
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
    }
    
    return this.level;
  }

  reset(): void {
    this.state = 'idle';
    this.level = 0;
  }
}

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

  process(waveform: 'sine' | 'triangle' | 'saw' | 'square' | 'sample-hold'): number {
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

      case 'sample-hold':
        output = Math.random() * 2 - 1;
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

export class NoiseGenerator {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  private next(): number {
    this.seed = (1103515245 * this.seed + 12345) % 2147483648;
    return this.seed / 2147483648;
  }

  white(): number {
    return this.next() * 2 - 1;
  }
}

export function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
