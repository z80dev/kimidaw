/**
 * Advanced Filters for Effects Complete
 * 
 * High-quality filters including:
 * - 12dB/24dB state-variable filters
 * - Parametric EQ bands with adjustable Q
 * - High-order shelving filters
 * - Morphing filters
 * - Hilbert transform for SSB modulation
 */

import { PI, TWO_PI, clamp, lerp } from "./DspUtils.js";

// =============================================================================
// Filter Types
// =============================================================================

export type FilterType = 
  | "lowpass12" | "lowpass24" 
  | "highpass12" | "highpass24"
  | "bandpass" | "notch" | "peak"
  | "lowshelf" | "highshelf"
  | "allpass";

export type FilterSlope = "12dB" | "24dB" | "48dB";

// =============================================================================
// State Variable Filter (12dB/octave, stable at high freqs)
// =============================================================================

/**
 * State Variable Filter - 12dB/octave
 * 
 * Simultaneously outputs lowpass, bandpass, highpass, and notch.
 * Good for modulated filters.
 */
export class StateVariableFilter {
  private _sampleRate = 48000;
  private _freq = 1000;
  private _q = 0.707;
  private _type: FilterType = "lowpass12";
  
  // State variables
  private _z1 = 0; // Integrator 1 state
  private _z2 = 0; // Integrator 2 state
  
  // Coefficients
  private _g = 0; // tan(PI * fc / fs)
  private _k = 0; // 1 / Q
  private _a1 = 0;
  private _a2 = 0;
  private _a3 = 0;

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._updateCoeffs();
  }

  setFrequency(freq: number): void {
    this._freq = clamp(freq, 10, this._sampleRate / 2 - 10);
    this._updateCoeffs();
  }

  setQ(q: number): void {
    this._q = clamp(q, 0.1, 20);
    this._k = 1 / this._q;
    this._updateCoeffs();
  }

  setType(type: FilterType): void {
    this._type = type;
  }

  private _updateCoeffs(): void {
    // Tuning frequency (avoid instability at nyquist)
    const fc = clamp(this._freq, 10, this._sampleRate * 0.49);
    this._g = Math.tan(PI * fc / this._sampleRate);
    this._k = 1 / this._q;
    
    // Denominator coefficients
    const denom = 1 / (1 + this._g * (this._g + this._k));
    this._a1 = this._g * denom;
    this._a2 = this._a1 * this._g;
    this._a3 = this._a1 * this._k;
  }

  process(input: number): number {
    // Solve state variable filter
    const v3 = input - this._z2;
    const v1 = this._a1 * this._z1 + this._a2 * v3;
    const v2 = this._z2 + this._a2 * this._z1 + this._a3 * v3;
    
    // Update state
    this._z1 = 2 * v1 - this._z1;
    this._z2 = 2 * v2 - this._z2;
    
    // Return appropriate output
    switch (this._type) {
      case "lowpass12": return v2;
      case "bandpass": return v1;
      case "highpass12": return input - this._k * v1 - v2;
      case "notch": return input - this._k * v1;
      case "allpass": return input - 2 * this._k * v1;
      case "peak": return input - this._k * v1 - v2 + v2; // Simplified
      default: return v2;
    }
  }

  reset(): void {
    this._z1 = 0;
    this._z2 = 0;
  }

  processBlock(input: Float32Array, output: Float32Array): void {
    for (let i = 0; i < input.length; i++) {
      output[i] = this.process(input[i]);
    }
  }
}

// =============================================================================
// Cascaded SVF (24dB/octave)
// =============================================================================

/**
 * 24dB/octave filter using cascaded SVFs
 */
export class CascadedSVF {
  private _svf1 = new StateVariableFilter();
  private _svf2 = new StateVariableFilter();
  private _type: FilterType = "lowpass24";

  setSampleRate(sr: number): void {
    this._svf1.setSampleRate(sr);
    this._svf2.setSampleRate(sr);
  }

  setFrequency(freq: number): void {
    this._svf1.setFrequency(freq);
    this._svf2.setFrequency(freq);
  }

  setQ(q: number): void {
    // Adjust Q for cascaded filters to maintain similar resonance
    this._svf1.setQ(q * 0.7);
    this._svf2.setQ(q * 0.7);
  }

  setType(type: Extract<FilterType, "lowpass24" | "highpass24">): void {
    this._type = type;
    this._svf1.setType(type === "lowpass24" ? "lowpass12" : "highpass12");
    this._svf2.setType(type === "lowpass24" ? "lowpass12" : "highpass12");
  }

  process(input: number): number {
    return this._svf2.process(this._svf1.process(input));
  }

  reset(): void {
    this._svf1.reset();
    this._svf2.reset();
  }
}

// =============================================================================
// Biquad Filter (for shelving and parametric EQ)
// =============================================================================

export class BiquadFilter {
  private _type: FilterType = "peak";
  private _freq = 1000;
  private _q = 0.707;
  private _gain = 0;
  private _sampleRate = 48000;

  // Coefficients
  private _b0 = 1;
  private _b1 = 0;
  private _b2 = 0;
  private _a1 = 0;
  private _a2 = 0;

  // State
  private _z1 = 0;
  private _z2 = 0;

  setType(type: FilterType): void {
    if (this._type !== type) {
      this._type = type;
      this._updateCoeffs();
    }
  }

  setFrequency(freq: number): void {
    this._freq = clamp(freq, 10, this._sampleRate / 2);
    this._updateCoeffs();
  }

  setQ(q: number): void {
    this._q = clamp(q, 0.1, 20);
    this._updateCoeffs();
  }

  setGain(gainDb: number): void {
    this._gain = gainDb;
    this._updateCoeffs();
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._updateCoeffs();
  }

  private _updateCoeffs(): void {
    const w0 = TWO_PI * this._freq / this._sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * this._q);
    const A = Math.pow(10, this._gain / 40);

    switch (this._type) {
      case "lowpass12":
        this._b0 = (1 - cosw0) / 2;
        this._b1 = 1 - cosw0;
        this._b2 = (1 - cosw0) / 2;
        this._a1 = -2 * cosw0;
        this._a2 = 1 - alpha;
        break;

      case "highpass12":
        this._b0 = (1 + cosw0) / 2;
        this._b1 = -(1 + cosw0);
        this._b2 = (1 + cosw0) / 2;
        this._a1 = -2 * cosw0;
        this._a2 = 1 - alpha;
        break;

      case "bandpass":
        this._b0 = alpha;
        this._b1 = 0;
        this._b2 = -alpha;
        this._a1 = -2 * cosw0;
        this._a2 = 1 - alpha;
        break;

      case "notch":
        this._b0 = 1;
        this._b1 = -2 * cosw0;
        this._b2 = 1;
        this._a1 = -2 * cosw0;
        this._a2 = 1 - alpha;
        break;

      case "peak":
        this._b0 = 1 + alpha * A;
        this._b1 = -2 * cosw0;
        this._b2 = 1 - alpha * A;
        this._a1 = -2 * cosw0;
        this._a2 = 1 - alpha / A;
        break;

      case "lowshelf":
        this._b0 = A * ((A + 1) - (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha);
        this._b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
        this._b2 = A * ((A + 1) - (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha);
        this._a1 = 2 * ((A - 1) - (A + 1) * cosw0);
        this._a2 = (A + 1) - (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha;
        break;

      case "highshelf":
        this._b0 = A * ((A + 1) + (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha);
        this._b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
        this._b2 = A * ((A + 1) + (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha);
        this._a1 = -2 * ((A - 1) + (A + 1) * cosw0);
        this._a2 = (A + 1) + (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha;
        break;

      case "allpass":
        this._b0 = 1 - alpha;
        this._b1 = -2 * cosw0;
        this._b2 = 1 + alpha;
        this._a1 = -2 * cosw0;
        this._a2 = 1 - alpha;
        break;

      default:
        this._b0 = 1;
        this._b1 = 0;
        this._b2 = 0;
        this._a1 = 0;
        this._a2 = 0;
    }

    // Normalize
    const a0 = 1 + alpha;
    this._b0 /= a0;
    this._b1 /= a0;
    this._b2 /= a0;
    this._a1 /= a0;
    this._a2 /= a0;
  }

  process(input: number): number {
    const output = this._b0 * input + this._b1 * this._z1 + this._b2 * this._z2
                 - this._a1 * this._z1 - this._a2 * this._z2;

    this._z2 = this._z1;
    this._z1 = output;

    return output;
  }

  reset(): void {
    this._z1 = 0;
    this._z2 = 0;
  }

  getFrequencyResponse(frequencies: Float32Array): Float32Array {
    const response = new Float32Array(frequencies.length);
    
    for (let i = 0; i < frequencies.length; i++) {
      const w = TWO_PI * frequencies[i] / this._sampleRate;
      const cosw = Math.cos(w);
      const sinw = Math.sin(w);
      const cos2w = Math.cos(2 * w);
      const sin2w = Math.sin(2 * w);

      // Numerator: b0 + b1*e^(-jw) + b2*e^(-j2w)
      const numReal = this._b0 + this._b1 * cosw + this._b2 * cos2w;
      const numImag = -this._b1 * sinw - this._b2 * sin2w;
      const numMag = Math.sqrt(numReal * numReal + numImag * numImag);

      // Denominator: 1 + a1*e^(-jw) + a2*e^(-j2w)
      const denReal = 1 + this._a1 * cosw + this._a2 * cos2w;
      const denImag = -this._a1 * sinw - this._a2 * sin2w;
      const denMag = Math.sqrt(denReal * denReal + denImag * denImag);

      response[i] = 20 * Math.log10(numMag / denMag + 0.00001);
    }

    return response;
  }
}

// =============================================================================
// Crossover Filter (Linkwitz-Riley)
// =============================================================================

/**
 * Linkwitz-Riley crossover - sum of low and high = flat response
 * Used for multiband dynamics
 */
export class LinkwitzRileyCrossover {
  private _lpf1 = new BiquadFilter();
  private _lpf2 = new BiquadFilter();
  private _hpf1 = new BiquadFilter();
  private _hpf2 = new BiquadFilter();
  private _freq = 1000;
  private _sampleRate = 48000;

  constructor(sampleRate = 48000) {
    this._sampleRate = sampleRate;
    this._setupFilters();
  }

  private _setupFilters(): void {
    // LR24 = cascaded Butterworth 12dB
    this._lpf1.setSampleRate(this._sampleRate);
    this._lpf2.setSampleRate(this._sampleRate);
    this._hpf1.setSampleRate(this._sampleRate);
    this._hpf2.setSampleRate(this._sampleRate);

    this._lpf1.setType("lowpass12");
    this._lpf2.setType("lowpass12");
    this._hpf1.setType("highpass12");
    this._hpf2.setType("highpass12");

    // Butterworth Q = 0.707
    this._lpf1.setQ(0.707);
    this._lpf2.setQ(0.707);
    this._hpf1.setQ(0.707);
    this._hpf2.setQ(0.707);

    this._lpf1.setFrequency(this._freq);
    this._lpf2.setFrequency(this._freq);
    this._hpf1.setFrequency(this._freq);
    this._hpf2.setFrequency(this._freq);
  }

  setFrequency(freq: number): void {
    this._freq = clamp(freq, 20, this._sampleRate / 2);
    this._lpf1.setFrequency(this._freq);
    this._lpf2.setFrequency(this._freq);
    this._hpf1.setFrequency(this._freq);
    this._hpf2.setFrequency(this._freq);
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._setupFilters();
  }

  processLow(input: number): number {
    return this._lpf2.process(this._lpf1.process(input));
  }

  processHigh(input: number): number {
    return this._hpf2.process(this._hpf1.process(input));
  }

  processBoth(input: number): { low: number; high: number } {
    return {
      low: this.processLow(input),
      high: this.processHigh(input)
    };
  }

  reset(): void {
    this._lpf1.reset();
    this._lpf2.reset();
    this._hpf1.reset();
    this._hpf2.reset();
  }
}

// =============================================================================
// Morphing Filter (for Auto Filter)
// =============================================================================

/**
 * Filter that morphs between LP, BP, HP, Notch
 */
export class MorphingFilter {
  private _lpf = new StateVariableFilter();
  private _bpf = new StateVariableFilter();
  private _hpf = new StateVariableFilter();
  private _notch = new StateVariableFilter();
  
  private _freq = 1000;
  private _q = 0.707;
  private _morph = 0; // 0=LP, 0.33=BP, 0.66=HP, 1=Notch
  private _sampleRate = 48000;

  constructor(sampleRate = 48000) {
    this._sampleRate = sampleRate;
    this._lpf.setType("lowpass12");
    this._bpf.setType("bandpass");
    this._hpf.setType("highpass12");
    this._notch.setType("notch");
    this._updateAll();
  }

  private _updateAll(): void {
    this._lpf.setSampleRate(this._sampleRate);
    this._bpf.setSampleRate(this._sampleRate);
    this._hpf.setSampleRate(this._sampleRate);
    this._notch.setSampleRate(this._sampleRate);

    this._lpf.setFrequency(this._freq);
    this._bpf.setFrequency(this._freq);
    this._hpf.setFrequency(this._freq);
    this._notch.setFrequency(this._freq);

    this._lpf.setQ(this._q);
    this._bpf.setQ(this._q);
    this._hpf.setQ(this._q);
    this._notch.setQ(this._q);
  }

  setFrequency(freq: number): void {
    this._freq = clamp(freq, 10, this._sampleRate / 2);
    this._updateAll();
  }

  setQ(q: number): void {
    this._q = clamp(q, 0.1, 20);
    this._updateAll();
  }

  setMorph(amount: number): void {
    // 0=LP, 0.33=BP, 0.66=HP, 1=Notch
    this._morph = clamp(amount, 0, 1);
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._updateAll();
  }

  process(input: number): number {
    // Process through all filters
    const lp = this._lpf.process(input);
    const bp = this._bpf.process(input);
    const hp = this._hpf.process(input);
    const notch = this._notch.process(input);

    // Crossfade between them
    if (this._morph < 0.33) {
      const t = this._morph / 0.33;
      return lerp(lp, bp, t);
    } else if (this._morph < 0.66) {
      const t = (this._morph - 0.33) / 0.33;
      return lerp(bp, hp, t);
    } else {
      const t = (this._morph - 0.66) / 0.34;
      return lerp(hp, notch, t);
    }
  }

  reset(): void {
    this._lpf.reset();
    this._bpf.reset();
    this._hpf.reset();
    this._notch.reset();
  }
}

// =============================================================================
// EQ Band (Parametric)
// =============================================================================

/**
 * Single parametric EQ band with adjustable frequency, gain, and Q
 */
export class EQBand {
  private _filter = new BiquadFilter();
  private _type: FilterType = "peak";
  private _enabled = true;

  constructor(type: FilterType = "peak", sampleRate = 48000) {
    this._type = type;
    this._filter.setType(type);
    this._filter.setSampleRate(sampleRate);
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  setType(type: FilterType): void {
    this._type = type;
    this._filter.setType(type);
  }

  setFrequency(freq: number): void {
    this._filter.setFrequency(freq);
  }

  setGain(gainDb: number): void {
    this._filter.setGain(gainDb);
  }

  setQ(q: number): void {
    this._filter.setQ(q);
  }

  setSampleRate(sr: number): void {
    this._filter.setSampleRate(sr);
  }

  process(input: number): number {
    if (!this._enabled) return input;
    return this._filter.process(input);
  }

  reset(): void {
    this._filter.reset();
  }

  getFrequencyResponse(frequencies: Float32Array): Float32Array {
    return this._filter.getFrequencyResponse(frequencies);
  }
}

// =============================================================================
// 48dB/octave filters (cascaded biquads)
// =============================================================================

export class HighOrderFilter {
  private _filters: BiquadFilter[] = [];
  private _type: FilterSlope = "48dB";
  private _filterType: "lowpass" | "highpass" = "lowpass";

  constructor(type: FilterSlope, filterType: "lowpass" | "highpass", sampleRate = 48000) {
    this._type = type;
    this._filterType = filterType;
    
    const numFilters = type === "48dB" ? 4 : type === "24dB" ? 2 : 1;
    for (let i = 0; i < numFilters; i++) {
      this._filters.push(new BiquadFilter());
      this._filters[i].setSampleRate(sampleRate);
      this._filters[i].setType(filterType === "lowpass" ? "lowpass12" : "highpass12");
    }
  }

  setFrequency(freq: number): void {
    for (const f of this._filters) {
      f.setFrequency(freq);
    }
  }

  setQ(q: number): void {
    // Butterworth coefficients
    const n = this._filters.length;
    for (let i = 0; i < n; i++) {
      // Q for Butterworth filter sections
      const theta = PI * (2 * i + 1) / (2 * n);
      const sectionQ = 1 / (2 * Math.cos(theta));
      this._filters[i].setQ(q * sectionQ);
    }
  }

  setSampleRate(sr: number): void {
    for (const f of this._filters) {
      f.setSampleRate(sr);
    }
  }

  process(input: number): number {
    let output = input;
    for (const f of this._filters) {
      output = f.process(output);
    }
    return output;
  }

  reset(): void {
    for (const f of this._filters) {
      f.reset();
    }
  }
}

// =============================================================================
// Hilbert Transform (for SSB modulation)
// =============================================================================

/**
 * Hilbert Transform using a chain of allpass filters
 * Creates a 90° phase shift for SSB modulation (frequency shifting)
 * 
 * Based on a chain of 2nd-order allpass sections that approximate
 * the ideal 90° phase shift over the audio band.
 */
export class HilbertTransform {
  private _sampleRate = 48000;
  
  // Two chains of allpass filters
  // Chain 1: even number of sections (no phase shift at DC)
  // Chain 2: odd number of sections (90° phase shift)
  private _allpass1: BiquadFilter[] = [];
  private _allpass2: BiquadFilter[] = [];
  
  // Coefficients for 90° phase difference
  // These are pre-calculated for good approximation over 20Hz-20kHz
  private static readonly ALLPASS_COEFFS = [
    0.161758,  // Section 1
    0.733029,  // Section 2
    0.94535,   // Section 3
    0.990598,  // Section 4
    0.479401,  // Section 5
    0.876218,  // Section 6
    0.976597,  // Section 7
    0.9975,    // Section 8
  ];

  constructor(sampleRate = 48000) {
    this._sampleRate = sampleRate;
    this._initFilters();
  }

  private _initFilters(): void {
    // Chain 1: sections 0, 2, 4, 6 (4 sections)
    for (let i = 0; i < 8; i += 2) {
      const filter = new BiquadFilter();
      filter.setSampleRate(this._sampleRate);
      filter.setType("allpass");
      const coeff = HilbertTransform.ALLPASS_COEFFS[i];
      // Set Q based on coefficient to get desired phase response
      filter.setQ(1 / (2 * coeff));
      this._allpass1.push(filter);
    }

    // Chain 2: sections 1, 3, 5, 7 (4 sections)
    for (let i = 1; i < 8; i += 2) {
      const filter = new BiquadFilter();
      filter.setSampleRate(this._sampleRate);
      filter.setType("allpass");
      const coeff = HilbertTransform.ALLPASS_COEFFS[i];
      filter.setQ(1 / (2 * coeff));
      this._allpass2.push(filter);
    }
  }

  setSampleRate(sr: number): void {
    if (this._sampleRate !== sr) {
      this._sampleRate = sr;
      // Reinitialize with new sample rate
      this._allpass1 = [];
      this._allpass2 = [];
      this._initFilters();
    }
  }

  /**
   * Process a sample and return both real and imaginary components
   * real: original signal with chain 1 phase shift
   * imag: 90° phase shifted signal from chain 2
   */
  process(input: number): { real: number; imag: number } {
    // Process through chain 1
    let real = input;
    for (const filter of this._allpass1) {
      real = filter.process(real);
    }

    // Process through chain 2
    let imag = input;
    for (const filter of this._allpass2) {
      imag = filter.process(imag);
    }

    return { real, imag };
  }

  reset(): void {
    for (const filter of this._allpass1) {
      filter.reset();
    }
    for (const filter of this._allpass2) {
      filter.reset();
    }
  }

  /**
   * Get the latency introduced by the Hilbert transform
   */
  getLatency(): number {
    // Approximate group delay at center frequency
    return 4; // Samples (approximate)
  }
}
