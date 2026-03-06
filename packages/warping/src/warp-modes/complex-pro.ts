/**
 * Complex Pro warp mode - highest quality, CPU intensive
 * Enhanced phase vocoder with additional processing
 */

import type { ComplexSettings, AudioBufferData } from '../types.js';
import { createPhaseVocoder } from '../phase-vocoder.js';

export interface ComplexProProcessor {
  process(input: AudioBufferData, output: Float32Array[], timeRatio: number): void;
  setSettings(settings: ComplexSettings): void;
  reset(): void;
}

export function createComplexProProcessor(
  settings: ComplexSettings,
  sampleRate: number
): ComplexProProcessor {
  // Complex Pro uses very large windows for maximum quality
  const vocoder = createPhaseVocoder({
    windowSize: 8192,
    hopSize: 256, // High overlap for smoothness
    fftSize: 8192,
  });

  // Second pass vocoder for additional refinement
  const refinementVocoder = createPhaseVocoder({
    windowSize: 4096,
    hopSize: 128,
    fftSize: 4096,
  });

  let currentSettings = { ...settings };

  function process(
    input: AudioBufferData,
    output: Float32Array[],
    timeRatio: number
  ): void {
    // First pass with main vocoder
    vocoder.setTimeStretchRatio(timeRatio);
    vocoder.process(input, output);

    // Second pass for refinement (if high quality requested)
    if (currentSettings.formantPreserve) {
      const tempBuffer: Float32Array[] = output.map(ch => new Float32Array(ch));
      refinementVocoder.setTimeStretchRatio(1.0); // No additional time stretch
      refinementVocoder.process(
        { ...input, channelData: output, length: output[0]?.length || 0 },
        tempBuffer
      );

      // Blend refined output
      for (let ch = 0; ch < output.length; ch++) {
        for (let i = 0; i < output[ch].length; i++) {
          output[ch][i] = output[ch][i] * 0.7 + tempBuffer[ch][i] * 0.3;
        }
      }
    }

    // Transient preservation
    if (currentSettings.envelopePreserve) {
      preserveTransients(input, output, timeRatio);
    }
  }

  function preserveTransients(
    input: AudioBufferData,
    output: Float32Array[],
    timeRatio: number
  ): void {
    // Simple transient detection and preservation
    const threshold = 0.3;
    const transientWidth = Math.floor(0.005 * input.sampleRate); // 5ms

    for (let ch = 0; ch < input.numberOfChannels && ch < output.length; ch++) {
      const inputChannel = input.channelData[ch];
      const outputChannel = output[ch];

      // Find transients in input
      for (let i = 1; i < inputChannel.length - 1; i++) {
        const derivative = Math.abs(inputChannel[i] - inputChannel[i - 1]);
        const nextDerivative = Math.abs(inputChannel[i + 1] - inputChannel[i]);

        if (derivative > threshold && derivative > nextDerivative) {
          // Found transient, copy directly
          const outputPos = Math.floor(i / timeRatio);
          const start = Math.max(0, outputPos - transientWidth / 2);
          const end = Math.min(outputChannel.length, outputPos + transientWidth / 2);

          for (let j = start; j < end && i + j - start < inputChannel.length; j++) {
            outputChannel[j] = inputChannel[i + j - start];
          }
        }
      }
    }
  }

  function setSettings(newSettings: ComplexSettings): void {
    currentSettings = { ...newSettings };
    vocoder.reset();
    refinementVocoder.reset();
  }

  function reset(): void {
    vocoder.reset();
    refinementVocoder.reset();
  }

  return {
    process,
    setSettings,
    reset,
  };
}
