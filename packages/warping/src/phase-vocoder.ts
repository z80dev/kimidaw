/**
 * Phase Vocoder for high-quality time-stretching and pitch-shifting
 * Uses STFT (Short-Time Fourier Transform) based processing
 */

import type { PhaseVocoderSettings, AudioBufferData } from './types.js';
import { DEFAULT_PHASE_VOCODER_SETTINGS } from './types.js';

export interface PhaseVocoder {
  readonly settings: PhaseVocoderSettings;
  setTimeStretchRatio(ratio: number): void;
  setPitchShift(semitones: number): void;
  process(input: AudioBufferData, output: Float32Array[]): void;
  reset(): void;
}

interface FFTState {
  real: Float64Array;
  imag: Float64Array;
}

interface AnalysisFrame {
  magnitude: Float64Array;
  phase: Float64Array;
  frequency: Float64Array; // true frequency
}

export function createPhaseVocoder(
  settings: Partial<PhaseVocoderSettings> = {}
): PhaseVocoder {
  const fullSettings = { ...DEFAULT_PHASE_VOCODER_SETTINGS, ...settings };
  const { windowSize, hopSize, fftSize } = fullSettings;

  // Internal state
  let timeStretchRatio = 1.0;
  let pitchShiftRatio = 1.0;
  let accumulatedPhase: Float64Array | null = null;

  // Window function cache
  const windowFunction = createHannWindow(windowSize);

  // FFT lookup tables
  const fft = createFFT(fftSize);

  function setTimeStretchRatio(ratio: number): void {
    timeStretchRatio = Math.max(0.1, Math.min(10, ratio));
  }

  function setPitchShift(semitones: number): void {
    pitchShiftRatio = Math.pow(2, semitones / 12);
  }

  function reset(): void {
    accumulatedPhase = null;
  }

  function process(input: AudioBufferData, output: Float32Array[]): void {
    const numChannels = input.numberOfChannels;
    const inputLength = input.length;
    const outputLength = Math.floor(inputLength / timeStretchRatio);

    // Output synthesis hop size
    const synthesisHop = Math.floor(hopSize / timeStretchRatio);

    for (let ch = 0; ch < numChannels; ch++) {
      if (ch >= output.length) break;

      const inputChannel = input.channelData[ch];
      const outputChannel = output[ch];

      // Initialize output
      outputChannel.fill(0);

      // Analysis frames
      const analysisFrames: AnalysisFrame[] = [];
      let inputPos = 0;

      // Analysis phase
      while (inputPos + windowSize <= inputLength) {
        const frame = analyzeFrame(inputChannel, inputPos);
        analysisFrames.push(frame);
        inputPos += hopSize;
      }

      // Phase propagation for time stretching
      propagatePhase(analysisFrames);

      // Synthesis phase
      let outputPos = 0;
      accumulatedPhase = new Float64Array(fftSize / 2 + 1);

      for (let i = 0; i < analysisFrames.length; i++) {
        const frame = analysisFrames[i];

        // Apply pitch shift if needed
        const processedFrame = pitchShiftRatio !== 1.0
          ? applyPitchShift(frame, pitchShiftRatio, fftSize)
          : frame;

        synthesizeFrame(processedFrame, outputChannel, outputPos, windowSize);

        outputPos += synthesisHop;
        if (outputPos >= outputLength) break;
      }

      // Normalize for overlap-add
      normalizeOutput(outputChannel, windowSize, hopSize);
    }
  }

  function analyzeFrame(
    channelData: Float32Array,
    position: number
  ): AnalysisFrame {
    const frame = new Float64Array(fftSize);

    // Apply window and zero-pad
    for (let i = 0; i < windowSize; i++) {
      if (position + i < channelData.length) {
        frame[i] = channelData[position + i] * windowFunction[i];
      }
    }

    // FFT
    const spectrum = fft.forward(frame);

    // Convert to magnitude/phase
    const binCount = fftSize / 2 + 1;
    const magnitude = new Float64Array(binCount);
    const phase = new Float64Array(binCount);
    const frequency = new Float64Array(binCount);

    for (let i = 0; i < binCount; i++) {
      const real = spectrum.real[i];
      const imag = spectrum.imag[i];
      magnitude[i] = Math.sqrt(real * real + imag * imag);
      phase[i] = Math.atan2(imag, real);

      // Calculate true frequency (phase vocoder principle)
      const expectedPhase = (2 * Math.PI * i * hopSize) / fftSize;
      frequency[i] = (i * sampleRate) / fftSize;
    }

    return { magnitude, phase, frequency };
  }

  function propagatePhase(frames: AnalysisFrame[]): void {
    if (frames.length < 2) return;

    const binCount = frames[0].phase.length;

    for (let i = 1; i < frames.length; i++) {
      const prevFrame = frames[i - 1];
      const currFrame = frames[i];

      for (let bin = 0; bin < binCount; bin++) {
        // Expected phase advance
        const expectedDelta = (2 * Math.PI * bin * hopSize) / fftSize;

        // Actual phase difference
        let phaseDiff = currFrame.phase[bin] - prevFrame.phase[bin] - expectedDelta;

        // Unwrap phase
        while (phaseDiff > Math.PI) phaseDiff -= 2 * Math.PI;
        while (phaseDiff < -Math.PI) phaseDiff += 2 * Math.PI;

        // True frequency deviation
        const trueFreq = (bin * sampleRate) / fftSize +
          (phaseDiff * sampleRate) / (2 * Math.PI * hopSize);

        currFrame.frequency[bin] = trueFreq;
      }
    }
  }

  function applyPitchShift(
    frame: AnalysisFrame,
    ratio: number,
    fftSize: number
  ): AnalysisFrame {
    const binCount = fftSize / 2 + 1;
    const newMagnitude = new Float64Array(binCount);
    const newPhase = new Float64Array(binCount);
    const newFrequency = new Float64Array(binCount);

    for (let bin = 0; bin < binCount; bin++) {
      const targetBin = Math.floor(bin / ratio);

      if (targetBin < binCount) {
        newMagnitude[bin] = frame.magnitude[targetBin];
        newPhase[bin] = frame.phase[targetBin];
        newFrequency[bin] = frame.frequency[targetBin] * ratio;
      }
    }

    return {
      magnitude: newMagnitude,
      phase: newPhase,
      frequency: newFrequency,
    };
  }

  function synthesizeFrame(
    frame: AnalysisFrame,
    output: Float32Array,
    position: number,
    windowSize: number
  ): void {
    const binCount = frame.magnitude.length;
    const real = new Float64Array(fftSize);
    const imag = new Float64Array(fftSize);

    // Reconstruct spectrum
    for (let i = 0; i < binCount; i++) {
      if (!accumulatedPhase) break;

      // Accumulate phase for time stretching
      const phaseIncrement = (2 * Math.PI * i * hopSize) / fftSize;
      accumulatedPhase[i] += phaseIncrement;

      // Use analyzed phase + accumulated
      const finalPhase = frame.phase[i] + accumulatedPhase[i];

      real[i] = frame.magnitude[i] * Math.cos(finalPhase);
      imag[i] = frame.magnitude[i] * Math.sin(finalPhase);

      // Conjugate for negative frequencies
      if (i > 0 && i < binCount - 1) {
        real[fftSize - i] = real[i];
        imag[fftSize - i] = -imag[i];
      }
    }

    // Inverse FFT
    const timeDomain = fft.inverse({ real, imag });

    // Overlap-add with window
    for (let i = 0; i < windowSize; i++) {
      if (position + i < output.length) {
        output[position + i] += timeDomain[i] * windowFunction[i];
      }
    }
  }

  function normalizeOutput(
    output: Float32Array,
    windowSize: number,
    hopSize: number
  ): void {
    const normalizer = windowSize / (2 * hopSize);
    for (let i = 0; i < output.length; i++) {
      output[i] /= normalizer;
    }
  }

  // Sample rate for frequency calculations
  const sampleRate = 44100;

  return {
    settings: fullSettings,
    setTimeStretchRatio,
    setPitchShift,
    process,
    reset,
  };
}

/**
 * Create a Hann window
 */
function createHannWindow(size: number): Float64Array {
  const window = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return window;
}

/**
 * FFT implementation using Cooley-Tukey algorithm
 */
interface FFT {
  forward(timeDomain: Float64Array): FFTState;
  inverse(frequencyDomain: FFTState): Float64Array;
}

function createFFT(size: number): FFT {
  // Bit reversal table
  const bitReversed = new Uint32Array(size);
  const bits = Math.log2(size);

  for (let i = 0; i < size; i++) {
    let reversed = 0;
    for (let j = 0; j < bits; j++) {
      reversed = (reversed << 1) | ((i >> j) & 1);
    }
    bitReversed[i] = reversed;
  }

  // Twiddle factors
  const cosTable = new Float64Array(size / 2);
  const sinTable = new Float64Array(size / 2);

  for (let i = 0; i < size / 2; i++) {
    const angle = (-2 * Math.PI * i) / size;
    cosTable[i] = Math.cos(angle);
    sinTable[i] = Math.sin(angle);
  }

  function forward(timeDomain: Float64Array): FFTState {
    const real = new Float64Array(size);
    const imag = new Float64Array(size);

    // Bit reversal permutation
    for (let i = 0; i < size; i++) {
      real[bitReversed[i]] = timeDomain[i];
    }

    // Cooley-Tukey butterflies
    for (let stage = 1; stage < size; stage *= 2) {
      const step = stage * 2;
      const twiddleStep = size / step;

      for (let group = 0; group < stage; group++) {
        const twiddleIndex = group * twiddleStep;
        const wr = cosTable[twiddleIndex];
        const wi = sinTable[twiddleIndex];

        for (let pair = group; pair < size; pair += step) {
          const even = pair;
          const odd = pair + stage;

          const tr = real[odd] * wr - imag[odd] * wi;
          const ti = real[odd] * wi + imag[odd] * wr;

          real[odd] = real[even] - tr;
          imag[odd] = imag[even] - ti;
          real[even] = real[even] + tr;
          imag[even] = imag[even] + ti;
        }
      }
    }

    return { real, imag };
  }

  function inverse(frequencyDomain: FFTState): Float64Array {
    const { real: realIn, imag: imagIn } = frequencyDomain;
    const real = new Float64Array(size);
    const imag = new Float64Array(size);

    // Bit reversal permutation (conjugate for inverse)
    for (let i = 0; i < size; i++) {
      real[bitReversed[i]] = realIn[i];
      imag[bitReversed[i]] = -imagIn[i]; // Conjugate
    }

    // Cooley-Tukey butterflies
    for (let stage = 1; stage < size; stage *= 2) {
      const step = stage * 2;
      const twiddleStep = size / step;

      for (let group = 0; group < stage; group++) {
        const twiddleIndex = group * twiddleStep;
        const wr = cosTable[twiddleIndex];
        const wi = -sinTable[twiddleIndex]; // Conjugate

        for (let pair = group; pair < size; pair += step) {
          const even = pair;
          const odd = pair + stage;

          const tr = real[odd] * wr - imag[odd] * wi;
          const ti = real[odd] * wi + imag[odd] * wr;

          real[odd] = real[even] - tr;
          imag[odd] = imag[even] - ti;
          real[even] = real[even] + tr;
          imag[even] = imag[even] + ti;
        }
      }
    }

    // Normalize and conjugate back
    const scale = 1 / size;
    const result = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      result[i] = real[i] * scale;
    }

    return result;
  }

  return { forward, inverse };
}
