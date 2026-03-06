/**
 * Electric Piano Effects
 * 
 * Tremolo and Chorus effects tailored for electric piano sounds.
 */

import { LFO, DelayLine, BiquadFilter, clamp, TWO_PI } from '../utils/dsp.js';

export interface TremoloParams {
  rate: number;
  amount: number;
  waveform: 'sine' | 'triangle' | 'saw' | 'square';
  stereoPhase: number;
}

export class Tremolo {
  private lfoL: LFO;
  private lfoR: LFO;
  private params: TremoloParams;
  private sampleRate: number;

  constructor(sampleRate: number, params: TremoloParams) {
    this.sampleRate = sampleRate;
    this.params = params;
    this.lfoL = new LFO(sampleRate);
    this.lfoR = new LFO(sampleRate);
    this.updateParams(params);
  }

  updateParams(params: TremoloParams): void {
    this.params = params;
    this.lfoL.setFrequency(params.rate);
    this.lfoR.setFrequency(params.rate);
    this.lfoR.setPhase(params.stereoPhase);
  }

  process(inputL: number, inputR: number): [number, number] {
    const lfoL = this.lfoL.process(this.params.waveform);
    const lfoR = this.lfoR.process(this.params.waveform);

    // Convert to amplitude modulation (0 to 1 range)
    const modL = 1 - this.params.amount * 0.5 * (1 + lfoL);
    const modR = 1 - this.params.amount * 0.5 * (1 + lfoR);

    return [inputL * modL, inputR * modR];
  }

  reset(): void {
    this.lfoL.reset();
    this.lfoR.reset();
  }
}

export interface ChorusParams {
  rate: number;
  amount: number;
  voices: number;
}

export class Chorus {
  private delayL: DelayLine;
  private delayR: DelayLine;
  private lfo: LFO;
  private params: ChorusParams;
  private sampleRate: number;
  private baseDelayMs: number = 15; // 15ms base delay

  constructor(sampleRate: number, params: ChorusParams) {
    this.sampleRate = sampleRate;
    this.params = params;
    this.delayL = new DelayLine(50, sampleRate); // Max 50ms
    this.delayR = new DelayLine(50, sampleRate);
    this.lfo = new LFO(sampleRate);
    this.updateParams(params);
  }

  updateParams(params: ChorusParams): void {
    this.params = params;
    this.lfo.setFrequency(params.rate);
  }

  process(inputL: number, inputR: number): [number, number] {
    // LFO for modulation
    const lfoValue = this.lfo.process('sine');

    // Calculate delay modulation
    const modMs = lfoValue * this.params.amount * 5; // +/- 5ms modulation

    // Left channel (slightly different phase)
    const delayL = this.baseDelayMs + modMs;
    this.delayL.setDelayTime(clamp(delayL, 5, 45));
    const delayedL = this.delayL.process(inputL);

    // Right channel (inverted phase for stereo width)
    const delayR = this.baseDelayMs - modMs;
    this.delayR.setDelayTime(clamp(delayR, 5, 45));
    const delayedR = this.delayR.process(inputR);

    // Mix dry and wet
    const wetAmount = 0.5;
    const outL = inputL + delayedL * wetAmount;
    const outR = inputR + delayedR * wetAmount;

    return [outL, outR];
  }

  reset(): void {
    this.delayL.clear();
    this.delayR.clear();
    this.lfo.reset();
  }
}

/**
 * Soft clipping/saturation for amp drive
 */
export class SoftClipper {
  private drive: number = 0;
  private makeupGain: number = 1;

  setDrive(drive: number): void {
    this.drive = drive;
    // Calculate makeup gain to compensate for level reduction
    this.makeupGain = 1 + drive * 0.3;
  }

  process(input: number): number {
    if (this.drive < 0.01) return input;

    // Apply gain before clip
    const amplified = input * (1 + this.drive * 3);

    // Soft clipping using tanh approximation
    const clipped = this.fastTanh(amplified);

    return clipped * this.makeupGain;
  }

  private fastTanh(x: number): number {
    // Fast tanh approximation
    const x2 = x * x;
    return x * (27 + x2) / (27 + 9 * x2);
  }
}

/**
 * Simple tone control (shelf filter approximation)
 */
export class ToneControl {
  private lowShelf = new BiquadFilter();
  private highShelf = new BiquadFilter();
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setTone(tone: number): void {
    // Tone: 0 = dark, 0.5 = flat, 1 = bright
    if (tone < 0.5) {
      // Cut highs
      const cut = (0.5 - tone) * 2;
      this.highShelf.setLowpass(3000 + cut * 2000, 0.7, this.sampleRate);
    } else {
      // Boost highs (or cut lows)
      const boost = (tone - 0.5) * 2;
      this.highShelf.setLowpass(5000 + boost * 3000, 0.7, this.sampleRate);
    }
  }

  process(input: number): number {
    return this.highShelf.process(input);
  }

  reset(): void {
    this.highShelf.reset();
  }
}
