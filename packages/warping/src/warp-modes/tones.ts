/**
 * Tones warp mode - for monophonic pitched material
 * Uses phase vocoder with larger grain size
 */

import type { TonesSettings, AudioBufferData } from '../types.js';
import { createPhaseVocoder } from '../phase-vocoder.js';

export interface TonesProcessor {
  process(input: AudioBufferData, output: Float32Array[], timeRatio: number): void;
  setSettings(settings: TonesSettings): void;
  reset(): void;
}

export function createTonesProcessor(
  settings: TonesSettings,
  sampleRate: number
): TonesProcessor {
  // Tones uses phase vocoder with grain size affecting window size
  const grainSizeMs = settings.grainSize;
  const windowSize = Math.pow(2, Math.ceil(Math.log2(grainSizeMs * sampleRate / 1000)));

  const vocoder = createPhaseVocoder({
    windowSize,
    hopSize: windowSize / 4,
    fftSize: windowSize,
  });

  let currentSettings = { ...settings };

  function process(
    input: AudioBufferData,
    output: Float32Array[],
    timeRatio: number
  ): void {
    vocoder.setTimeStretchRatio(timeRatio);
    vocoder.process(input, output);
  }

  function setSettings(newSettings: TonesSettings): void {
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
