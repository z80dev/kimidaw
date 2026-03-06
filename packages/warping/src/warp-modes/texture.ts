/**
 * Texture warp mode - for polyphonic/polytextural material
 * Uses granular synthesis with flux parameter for randomization
 */

import type { TextureSettings, AudioBufferData } from '../types.js';
import { createPhaseVocoder } from '../phase-vocoder.js';

export interface TextureProcessor {
  process(input: AudioBufferData, output: Float32Array[], timeRatio: number): void;
  setSettings(settings: TextureSettings): void;
  reset(): void;
}

export function createTextureProcessor(
  settings: TextureSettings,
  sampleRate: number
): TextureProcessor {
  // Texture uses phase vocoder with smaller, randomized grains
  const grainSizeMs = settings.grainSize;
  const windowSize = Math.pow(2, Math.ceil(Math.log2(grainSizeMs * sampleRate / 1000)));

  const vocoder = createPhaseVocoder({
    windowSize,
    hopSize: windowSize / 8, // Smaller hop for more overlap
    fftSize: windowSize,
  });

  let currentSettings = { ...settings };

  function process(
    input: AudioBufferData,
    output: Float32Array[],
    timeRatio: number
  ): void {
    // Apply flux-based randomization to output
    vocoder.setTimeStretchRatio(timeRatio);
    vocoder.process(input, output);

    // Apply flux randomization
    if (currentSettings.flux > 0) {
      applyFluxRandomization(output, currentSettings.flux / 100);
    }
  }

  function applyFluxRandomization(
    output: Float32Array[],
    fluxAmount: number
  ): void {
    for (const channel of output) {
      // Add slight random delays and amplitude variations
      const delayRange = Math.floor(fluxAmount * 100); // samples

      for (let i = delayRange; i < channel.length; i++) {
        if (Math.random() < fluxAmount * 0.1) {
          const delay = Math.floor(Math.random() * delayRange);
          const variation = 1 + (Math.random() - 0.5) * fluxAmount;
          channel[i - delay] = channel[i] * variation;
        }
      }
    }
  }

  function setSettings(newSettings: TextureSettings): void {
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
