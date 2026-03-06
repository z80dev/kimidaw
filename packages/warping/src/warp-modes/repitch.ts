/**
 * Re-Pitch warp mode - speed change = pitch change (like vinyl)
 * Classic varispeed playback
 */

import type { AudioBufferData } from '../types.js';

export interface RePitchProcessor {
  process(input: AudioBufferData, output: Float32Array[], speedRatio: number): void;
  reset(): void;
}

export function createRePitchProcessor(): RePitchProcessor {
  function process(
    input: AudioBufferData,
    output: Float32Array[],
    speedRatio: number
  ): void {
    const numChannels = input.numberOfChannels;
    const inputLength = input.length;
    const outputLength = Math.floor(inputLength / speedRatio);

    for (let ch = 0; ch < numChannels; ch++) {
      if (ch >= output.length) break;

      const inputChannel = input.channelData[ch];
      const outputChannel = output[ch];

      // Linear interpolation for pitch shifting
      for (let i = 0; i < outputLength && i < outputChannel.length; i++) {
        const readPos = i * speedRatio;
        const index = Math.floor(readPos);
        const frac = readPos - index;

        if (index + 1 < inputLength) {
          const s0 = inputChannel[index];
          const s1 = inputChannel[index + 1];
          outputChannel[i] = s0 + (s1 - s0) * frac;
        } else if (index < inputLength) {
          outputChannel[i] = inputChannel[index];
        }
      }
    }
  }

  function reset(): void {
    // No state to reset
  }

  return {
    process,
    reset,
  };
}
