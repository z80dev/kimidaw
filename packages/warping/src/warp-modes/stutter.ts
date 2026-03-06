/**
 * Stutter warp mode - repeating micro-slices
 * Creates stutter/glitch effects
 */

import type { StutterSettings, AudioBufferData } from '../types.js';
import { DEFAULT_STUTTER_SETTINGS } from '../types.js';

export interface StutterProcessor {
  process(input: AudioBufferData, output: Float32Array[]): void;
  setSettings(settings: StutterSettings): void;
  triggerStutter(position: number): void;
  reset(): void;
}

export function createStutterProcessor(
  settings: StutterSettings,
  sampleRate: number
): StutterProcessor {
  let currentSettings = { ...DEFAULT_STUTTER_SETTINGS, ...settings };
  let audioBuffer: AudioBufferData | null = null;
  let isStuttering = false;
  let stutterStart = 0;
  let stutterCount = 0;
  let outputPosition = 0;

  function setSettings(newSettings: StutterSettings): void {
    currentSettings = { ...newSettings };
  }

  function triggerStutter(position: number): void {
    isStuttering = true;
    stutterStart = position;
    stutterCount = 0;
  }

  function process(input: AudioBufferData, output: Float32Array[]): void {
    audioBuffer = input;
    const numChannels = input.numberOfChannels;
    const inputLength = input.length;

    // Calculate stutter slice size
    const sliceSize = Math.floor((currentSettings.sliceSize / 1000) * sampleRate);

    // Initialize output
    for (const channel of output) {
      channel.fill(0);
    }

    if (!isStuttering) {
      // Normal playback
      for (let ch = 0; ch < numChannels; ch++) {
        if (ch >= output.length) break;
        output[ch].set(input.channelData[ch].subarray(0, output[ch].length));
      }
      return;
    }

    // Stutter playback
    let outPos = 0;
    const totalOutputLength = output[0]?.length || 0;

    while (outPos < totalOutputLength) {
      const repeats = currentSettings.randomize > 0
        ? currentSettings.repeats + Math.floor(Math.random() * (currentSettings.randomize / 10))
        : currentSettings.repeats;

      for (let repeat = 0; repeat < repeats && outPos < totalOutputLength; repeat++) {
        // Calculate source position with randomization
        let sourcePos = stutterStart + (repeat * sliceSize);

        if (currentSettings.randomize > 0) {
          const jitter = Math.floor((Math.random() - 0.5) * (currentSettings.randomize / 100) * sliceSize);
          sourcePos += jitter;
        }

        sourcePos = Math.max(0, Math.min(sourcePos, inputLength - sliceSize));

        // Copy slice
        const copyLength = Math.min(sliceSize, totalOutputLength - outPos);

        for (let ch = 0; ch < numChannels; ch++) {
          if (ch >= output.length) break;

          const inputChannel = input.channelData[ch];
          const outputChannel = output[ch];

          for (let i = 0; i < copyLength; i++) {
            if (sourcePos + i < inputChannel.length) {
              outputChannel[outPos + i] = inputChannel[sourcePos + i];
            }
          }
        }

        outPos += copyLength;
      }

      // Move to next stutter segment
      stutterStart += sliceSize * repeats;
      if (stutterStart >= inputLength) {
        isStuttering = false;
        break;
      }
    }

    outputPosition = outPos;
  }

  function reset(): void {
    isStuttering = false;
    stutterStart = 0;
    stutterCount = 0;
    outputPosition = 0;
  }

  return {
    process,
    setSettings,
    triggerStutter,
    reset,
  };
}

/**
 * Create a stutter effect trigger
 */
export interface StutterTrigger {
  trigger(division: '1/4' | '1/8' | '1/16' | '1/32', repeats: number): void;
  update(output: Float32Array[], numFrames: number): void;
  setProbability(probability: number): void;
}

export function createStutterTrigger(
  audioBuffer: AudioBufferData,
  sampleRate: number
): StutterTrigger {
  const divisions: Record<string, number> = {
    '1/4': 0.25,
    '1/8': 0.125,
    '1/16': 0.0625,
    '1/32': 0.03125,
  };

  let currentDivision = '1/16';
  let currentRepeats = 4;
  let probability = 1.0;

  let isStuttering = false;
  let stutterPosition = 0;
  let stutterEnd = 0;
  let repeatCount = 0;
  let readPosition = 0;

  function trigger(division: '1/4' | '1/8' | '1/16' | '1/32', repeats: number): void {
    if (Math.random() > probability) return;

    currentDivision = division;
    currentRepeats = repeats;

    // Calculate stutter size based on division
    const beatDuration = 60 / 120; // Assume 120 BPM, should be parameterized
    const stutterDuration = beatDuration * divisions[division];
    const stutterSamples = Math.floor(stutterDuration * sampleRate);

    stutterPosition = readPosition;
    stutterEnd = stutterPosition + stutterSamples;
    repeatCount = 0;
    isStuttering = true;
  }

  function update(output: Float32Array[], numFrames: number): void {
    // Clear output
    for (const channel of output) {
      channel.fill(0);
    }

    if (!isStuttering) {
      // Normal playback
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        if (ch >= output.length) break;

        const inputChannel = audioBuffer.channelData[ch];
        for (let i = 0; i < numFrames; i++) {
          if (readPosition + i < inputChannel.length) {
            output[ch][i] = inputChannel[readPosition + i];
          }
        }
      }
      readPosition += numFrames;
      return;
    }

    // Stutter playback
    const stutterLength = stutterEnd - stutterPosition;
    let outPos = 0;

    while (outPos < numFrames && isStuttering) {
      const remainingInStutter = stutterLength - ((readPosition - stutterPosition) % stutterLength);
      const copyLength = Math.min(remainingInStutter, numFrames - outPos);

      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        if (ch >= output.length) break;

        const inputChannel = audioBuffer.channelData[ch];
        for (let i = 0; i < copyLength; i++) {
          const sourcePos = stutterPosition + ((readPosition - stutterPosition + i) % stutterLength);
          if (sourcePos < inputChannel.length) {
            output[ch][outPos + i] = inputChannel[sourcePos];
          }
        }
      }

      readPosition += copyLength;
      outPos += copyLength;

      // Check if repeat completed
      if ((readPosition - stutterPosition) % stutterLength === 0) {
        repeatCount++;
        if (repeatCount >= currentRepeats) {
          isStuttering = false;
          readPosition = stutterEnd;
        }
      }
    }
  }

  function setProbability(prob: number): void {
    probability = Math.max(0, Math.min(1, prob));
  }

  return {
    trigger,
    update,
    setProbability,
  };
}
