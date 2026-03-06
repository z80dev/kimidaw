/**
 * Complex warp mode - high-quality for complex mixes
 * Phase vocoder with formant and envelope preservation
 */

import type { ComplexSettings, AudioBufferData } from '../types.js';
import { createPhaseVocoder } from '../phase-vocoder.js';

export interface ComplexProcessor {
  process(input: AudioBufferData, output: Float32Array[], timeRatio: number): void;
  setSettings(settings: ComplexSettings): void;
  reset(): void;
}

export function createComplexProcessor(
  settings: ComplexSettings,
  sampleRate: number
): ComplexProcessor {
  // Complex uses large window size for quality
  const vocoder = createPhaseVocoder({
    windowSize: 4096,
    hopSize: 512,
    fftSize: 4096,
  });

  let currentSettings = { ...settings };

  function process(
    input: AudioBufferData,
    output: Float32Array[],
    timeRatio: number
  ): void {
    vocoder.setTimeStretchRatio(timeRatio);

    if (currentSettings.formantPreserve) {
      // Process with formant preservation
      processWithFormants(input, output, timeRatio);
    } else {
      vocoder.process(input, output);
    }

    if (currentSettings.envelopePreserve) {
      // Preserve original envelope
      preserveEnvelope(input, output);
    }
  }

  function processWithFormants(
    input: AudioBufferData,
    output: Float32Array[],
    timeRatio: number
  ): void {
    // Extract formants (spectral envelope)
    const formants = extractFormants(input);

    // Process through vocoder
    vocoder.process(input, output);

    // Re-apply original formants
    if (currentSettings.formantPreserve) {
      applyFormants(output, formants, timeRatio);
    }
  }

  function extractFormants(audio: AudioBufferData): Float32Array[] {
    const formants: Float32Array[] = [];
    const fftSize = 4096;
    const hopSize = 512;

    for (let ch = 0; ch < audio.numberOfChannels; ch++) {
      const channel = audio.channelData[ch];
      const numFrames = Math.floor((channel.length - fftSize) / hopSize) + 1;
      const channelFormants = new Float32Array(numFrames * (fftSize / 2 + 1));

      for (let frame = 0; frame < numFrames; frame++) {
        const spectrum = computeMagnitudeSpectrum(
          channel.subarray(frame * hopSize, frame * hopSize + fftSize),
          fftSize
        );

        // Smooth spectrum to get envelope (formants)
        const envelope = smoothSpectrum(spectrum, 20);

        // Store
        channelFormants.set(envelope, frame * (fftSize / 2 + 1));
      }

      formants.push(channelFormants);
    }

    return formants;
  }

  function applyFormants(
    output: Float32Array[],
    formants: Float32Array[],
    timeRatio: number
  ): void {
    const fftSize = 4096;
    const hopSize = Math.floor(512 / timeRatio);

    for (let ch = 0; ch < output.length && ch < formants.length; ch++) {
      const channel = output[ch];
      const numFrames = Math.floor((channel.length - fftSize) / hopSize) + 1;

      for (let frame = 0; frame < numFrames; frame++) {
        // Get original formant for this frame
        const formantIndex = Math.min(
          frame,
          Math.floor(formants[ch].length / (fftSize / 2 + 1)) - 1
        );
        const formant = formants[ch].subarray(
          formantIndex * (fftSize / 2 + 1),
          (formantIndex + 1) * (fftSize / 2 + 1)
        );

        // Apply formant shaping to time domain (simplified)
        // In practice, this would involve filtering
        const start = frame * hopSize;
        const end = Math.min(start + fftSize, channel.length);

        // Simple amplitude modulation based on formant energy
        let formantEnergy = 0;
        for (let i = 0; i < formant.length; i++) {
          formantEnergy += formant[i];
        }
        formantEnergy /= formant.length;

        for (let i = start; i < end; i++) {
          channel[i] *= Math.sqrt(formantEnergy);
        }
      }
    }
  }

  function preserveEnvelope(input: AudioBufferData, output: Float32Array[]): void {
    // Extract and apply original envelope
    for (let ch = 0; ch < input.numberOfChannels && ch < output.length; ch++) {
      const inputChannel = input.channelData[ch];
      const outputChannel = output[ch];

      // Calculate time scaling
      const timeScale = inputChannel.length / outputChannel.length;

      const windowSize = Math.floor(0.01 * input.sampleRate); // 10ms

      for (let i = 0; i < outputChannel.length; i++) {
        const inputPos = Math.floor(i * timeScale);
        const inputEnd = Math.min(inputPos + windowSize, inputChannel.length);

        // Calculate local envelope
        let inputEnv = 0;
        for (let j = inputPos; j < inputEnd; j++) {
          inputEnv += Math.abs(inputChannel[j]);
        }
        inputEnv /= (inputEnd - inputPos);

        // Apply envelope
        if (inputEnv > 0.001) {
          outputChannel[i] = Math.sign(outputChannel[i]) * inputEnv;
        }
      }
    }
  }

  function setSettings(newSettings: ComplexSettings): void {
    currentSettings = { ...newSettings };
    vocoder.reset();
  }

  function reset(): void {
    vocoder.reset();
  }

  return {
    process,
    setSettings,
    reset,
  };
}

/**
 * Compute magnitude spectrum
 */
function computeMagnitudeSpectrum(frame: Float32Array, fftSize: number): Float32Array {
  const numBins = fftSize / 2 + 1;
  const magnitude = new Float32Array(numBins);

  for (let k = 0; k < numBins; k++) {
    let real = 0;
    let imag = 0;

    for (let t = 0; t < frame.length; t++) {
      const angle = (-2 * Math.PI * k * t) / fftSize;
      real += frame[t] * Math.cos(angle);
      imag += frame[t] * Math.sin(angle);
    }

    magnitude[k] = Math.sqrt(real * real + imag * imag) / fftSize;
  }

  return magnitude;
}

/**
 * Smooth spectrum for formant extraction
 */
function smoothSpectrum(spectrum: Float32Array, windowSize: number): Float32Array {
  const smoothed = new Float32Array(spectrum.length);

  for (let i = 0; i < spectrum.length; i++) {
    let sum = 0;
    let count = 0;

    for (let j = -windowSize; j <= windowSize; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < spectrum.length) {
        sum += spectrum[idx];
        count++;
      }
    }

    smoothed[i] = sum / count;
  }

  return smoothed;
}
