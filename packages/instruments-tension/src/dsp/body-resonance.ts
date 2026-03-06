/**
 * Body Resonance Model
 * 
 * Simulates the resonant body of stringed instruments
 * using comb filters and modal resonators.
 */

import { DelayLine, BiquadFilter, OnePoleFilter, midiToFreq, clamp, TWO_PI } from '../utils/dsp.js';

export type BodyType = 'off' | 'guitar' | 'violin' | 'cello' | 'piano' | 'custom';

export interface BodyParams {
  type: BodyType;
  size: number;
  decay: number;
  lowCut: number;
  highCut: number;
  mix: number;
}

/**
 * Modal resonator for body modes
 */
class BodyMode {
  private y1: number = 0;
  private y2: number = 0;
  private a1: number = 0;
  private a2: number = 0;
  private gain: number = 1;

  setFrequency(freq: number, decay: number, sampleRate: number): void {
    const omega = TWO_PI * freq / sampleRate;
    const radius = Math.exp(-1 / (decay * freq * sampleRate * 0.001));
    
    this.a1 = -2 * radius * Math.cos(omega);
    this.a2 = radius * radius;
    this.gain = (1 - radius) * 0.5;
  }

  process(input: number): number {
    const output = this.gain * input - this.a1 * this.y1 - this.a2 * this.y2;
    this.y2 = this.y1;
    this.y1 = output;
    return output;
  }

  reset(): void {
    this.y1 = this.y2 = 0;
  }
}

/**
 * Body resonance processor
 * 
 * Combines modal filters and a comb filter to simulate
 * instrument body resonances.
 */
export class BodyResonance {
  private modes: BodyMode[] = [];
  private modeFreqs: number[] = [];
  private sampleRate: number;
  private params: BodyParams;
  
  // Comb filter for body resonance
  private combDelay: DelayLine;
  private combFilter = new OnePoleFilter();
  
  // Output filters
  private lowCut = new BiquadFilter();
  private highCut = new BiquadFilter();

  constructor(sampleRate: number, params: BodyParams) {
    this.sampleRate = sampleRate;
    this.params = params;
    
    // Create 5 body modes
    for (let i = 0; i < 5; i++) {
      this.modes.push(new BodyMode());
      this.modeFreqs.push(100);
    }
    
    this.combDelay = new DelayLine(50, sampleRate);
    this.updateParameters(params);
  }

  updateParameters(params: BodyParams): void {
    this.params = params;
    
    // Calculate body mode frequencies based on type and size
    const baseFreq = this.getBaseFreqForType(params.type);
    const sizeScale = 1 + (1 - params.size) * 2; // Smaller = higher pitch
    
    const modeRatios = this.getModeRatiosForType(params.type);
    
    for (let i = 0; i < this.modes.length; i++) {
      const freq = baseFreq * modeRatios[i] * sizeScale;
      this.modeFreqs[i] = clamp(freq, 50, this.sampleRate / 2 - 100);
      this.modes[i].setFrequency(this.modeFreqs[i], params.decay, this.sampleRate);
    }
    
    // Update comb filter
    const combDelayMs = 2 + params.size * 10;
    this.combDelay.setDelayTime(combDelayMs);
    this.combFilter.setCoefficient(0.5 + params.decay * 0.4);
    
    // Update output filters
    this.lowCut.setHighpass(params.lowCut, 0.7, this.sampleRate);
    this.highCut.setLowpass(params.highCut, 0.7, this.sampleRate);
  }

  private getBaseFreqForType(type: BodyType): number {
    switch (type) {
      case 'guitar': return 100;
      case 'violin': return 280;
      case 'cello': return 70;
      case 'piano': return 80;
      case 'custom': return 120;
      default: return 100;
    }
  }

  private getModeRatiosForType(type: BodyType): number[] {
    // Approximate modal spacing for different instruments
    switch (type) {
      case 'guitar':
        return [1, 1.5, 2.1, 2.8, 3.5];
      case 'violin':
        return [1, 1.8, 2.7, 3.5, 4.2];
      case 'cello':
        return [1, 1.6, 2.3, 3.0, 3.8];
      case 'piano':
        return [1, 1.3, 1.9, 2.5, 3.2];
      case 'custom':
      default:
        return [1, 1.5, 2.2, 2.9, 3.6];
    }
  }

  process(input: number): number {
    if (this.params.type === 'off' || this.params.mix <= 0) {
      return input;
    }

    // Process through modal filters
    let modalOut = 0;
    for (let i = 0; i < this.modes.length; i++) {
      modalOut += this.modes[i].process(input);
    }
    modalOut *= 0.2; // Scale down

    // Process through comb filter
    const combFeedback = this.combDelay.read() * (0.3 + this.params.decay * 0.3);
    this.combDelay.write(input + this.combFilter.process(combFeedback));
    const combOut = this.combDelay.read();

    // Mix modal and comb resonances
    const bodySignal = modalOut * 0.7 + combOut * 0.3;

    // Apply output filters
    let output = this.lowCut.process(bodySignal);
    output = this.highCut.process(output);

    // Mix with dry signal
    return input + output * this.params.mix;
  }

  reset(): void {
    for (const mode of this.modes) {
      mode.reset();
    }
    this.combDelay.clear();
    this.combFilter.reset();
    this.lowCut.reset();
    this.highCut.reset();
  }
}
