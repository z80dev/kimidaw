/**
 * Granular synthesis engine for Beats warp mode
 * Provides time-stretching while preserving transients
 */

import type {
  GranularEngineSettings,
  BeatsSettings,
  AudioBufferData,
  Transient,
} from './types.js';
import { DEFAULT_GRANULAR_SETTINGS } from './types.js';

export interface Grain {
  id: string;
  startPosition: number; // source sample position
  currentPosition: number;
  duration: number; // in samples
  amplitude: number;
  pan: number;
}

export interface GranularEngine {
  readonly settings: GranularEngineSettings;
  setTimeStretchRatio(ratio: number): void;
  setTransients(transients: Transient[]): void;
  process(
    input: AudioBufferData,
    output: Float32Array[],
    transients?: Transient[]
  ): void;
  reset(): void;
}

export function createGranularEngine(
  settings: Partial<GranularEngineSettings> = {}
): GranularEngine {
  const fullSettings = { ...DEFAULT_GRANULAR_SETTINGS, ...settings };

  let timeStretchRatio = 1.0;
  let transients: Transient[] = [];
  let grains: Grain[] = [];
  let grainIdCounter = 0;
  let outputPosition = 0;

  function setTimeStretchRatio(ratio: number): void {
    timeStretchRatio = Math.max(0.1, Math.min(10, ratio));
  }

  function setTransients(newTransients: Transient[]): void {
    transients = [...newTransients];
  }

  function reset(): void {
    grains = [];
    grainIdCounter = 0;
    outputPosition = 0;
  }

  function process(
    input: AudioBufferData,
    output: Float32Array[],
    externalTransients?: Transient[]
  ): void {
    const numChannels = input.numberOfChannels;
    const inputLength = input.length;
    const outputLength = Math.floor(inputLength / timeStretchRatio);

    const activeTransients = externalTransients || transients;

    // Initialize output buffers
    for (let ch = 0; ch < output.length; ch++) {
      output[ch].fill(0);
    }

    // Calculate grain parameters based on time-stretch ratio
    const grainSizeSamples = Math.floor(
      (fullSettings.grainSize / 1000) * input.sampleRate
    );
    const hopSize = Math.floor(grainSizeSamples * (1 - fullSettings.overlap));
    const synthesisHop = Math.floor(hopSize / timeStretchRatio);

    // Sort transients for efficient lookup
    const sortedTransients = [...activeTransients].sort(
      (a, b) => a.position - b.position
    );

    // Process each channel
    for (let ch = 0; ch < numChannels; ch++) {
      if (ch >= output.length) break;

      const inputChannel = input.channelData[ch];
      const outputChannel = output[ch];

      // Generate grains
      let inputPos = 0;
      let outputPos = 0;

      while (inputPos < inputLength && outputPos < outputLength) {
        // Check if we're near a transient - preserve it
        const isNearTransient = isPositionNearTransient(
          inputPos,
          sortedTransients,
          grainSizeSamples
        );

        if (isNearTransient) {
          // Use shorter grains around transients
          const transientGrainSize = Math.floor(grainSizeSamples / 4);
          emitGrain(
            inputChannel,
            outputChannel,
            inputPos,
            outputPos,
            transientGrainSize,
            fullSettings.windowType,
            1.0
          );
          inputPos += Math.floor(hopSize / 2);
          outputPos += Math.floor(synthesisHop / 2);
        } else {
          // Normal grain emission
          emitGrain(
            inputChannel,
            outputChannel,
            inputPos,
            outputPos,
            grainSizeSamples,
            fullSettings.windowType,
            1.0
          );
          inputPos += hopSize;
          outputPos += synthesisHop;
        }
      }

      // Normalize output
      normalizeChannel(outputChannel);
    }
  }

  function isPositionNearTransient(
    position: number,
    transients: Transient[],
    threshold: number
  ): boolean {
    // Binary search for nearby transient
    const searchRange = threshold / 2;

    for (const transient of transients) {
      const distance = Math.abs(transient.position - position);
      if (distance < searchRange && transient.strength > 0.3) {
        return true;
      }
    }

    return false;
  }

  function emitGrain(
    input: Float32Array,
    output: Float32Array,
    inputPos: number,
    outputPos: number,
    grainSize: number,
    windowType: string,
    amplitude: number
  ): void {
    const window = createGrainWindow(grainSize, windowType);

    for (let i = 0; i < grainSize; i++) {
      const inputIndex = inputPos + i;
      const outputIndex = outputPos + i;

      if (inputIndex < input.length && outputIndex < output.length) {
        output[outputIndex] += input[inputIndex] * window[i] * amplitude;
      }
    }
  }

  function createGrainWindow(size: number, type: string): Float64Array {
    const window = new Float64Array(size);

    switch (type) {
      case 'hamming':
        for (let i = 0; i < size; i++) {
          window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1));
        }
        break;

      case 'blackman':
        for (let i = 0; i < size; i++) {
          const a0 = 0.42659;
          const a1 = 0.49656;
          const a2 = 0.076849;
          window[i] =
            a0 -
            a1 * Math.cos((2 * Math.PI * i) / (size - 1)) +
            a2 * Math.cos((4 * Math.PI * i) / (size - 1));
        }
        break;

      case 'gaussian': {
        const sigma = 0.4;
        for (let i = 0; i < size; i++) {
          const x = (i - size / 2) / (size / 2);
          window[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
        }
        break;
      }

      case 'hann':
      default:
        for (let i = 0; i < size; i++) {
          window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
        }
        break;
    }

    return window;
  }

  function normalizeChannel(channel: Float32Array): void {
    // Find peak
    let peak = 0;
    for (let i = 0; i < channel.length; i++) {
      const abs = Math.abs(channel[i]);
      if (abs > peak) peak = abs;
    }

    // Normalize if needed
    if (peak > 1.0) {
      const scale = 1.0 / peak;
      for (let i = 0; i < channel.length; i++) {
        channel[i] *= scale;
      }
    }
  }

  return {
    settings: fullSettings,
    setTimeStretchRatio,
    setTransients,
    process,
    reset,
  };
}

/**
 * Create a beats mode processor that preserves transients
 */
export interface BeatsProcessor {
  process(input: AudioBufferData, output: Float32Array[]): void;
  setSettings(settings: BeatsSettings): void;
  reset(): void;
}

export function createBeatsProcessor(
  beatsSettings: BeatsSettings,
  sampleRate: number
): BeatsProcessor {
  const granularEngine = createGranularEngine({
    grainSize: 50, // ms, shorter for beats
    grainDensity: 100,
    windowType: 'hann',
    overlap: beatsSettings.envelope / 100,
  });

  let currentSettings = { ...beatsSettings };

  function process(input: AudioBufferData, output: Float32Array[]): void {
    granularEngine.process(input, output);

    // Apply decay envelope if loop mode is forward-reverse
    if (currentSettings.loop === 'forward-reverse') {
      applyReverseDecay(output, input.sampleRate);
    }
  }

  function applyReverseDecay(
    output: Float32Array[],
    sampleRate: number
  ): void {
    const decayTime = (currentSettings.envelope / 100) * 0.5; // seconds
    const decaySamples = Math.floor(decayTime * sampleRate);

    for (const channel of output) {
      for (let i = channel.length - decaySamples; i < channel.length; i++) {
        if (i >= 0) {
          const position = (i - (channel.length - decaySamples)) / decaySamples;
          channel[i] *= 1 - position; // Linear decay
        }
      }
    }
  }

  function setSettings(settings: BeatsSettings): void {
    currentSettings = { ...settings };
    granularEngine.reset();
  }

  function reset(): void {
    granularEngine.reset();
  }

  return {
    process,
    setSettings,
    reset,
  };
}
