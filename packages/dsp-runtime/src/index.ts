/**
 * DSP Runtime - AudioWorklet processors and DSP utilities
 * 
 * This package provides:
 * - Base AudioWorklet processor class
 * - Voice allocation for polyphonic instruments
 * - SharedArrayBuffer ring buffers
 * - WAM plugin adapter
 * - Pre-built AudioWorklet processors
 * 
 * @module @daw/dsp-runtime
 */

// Base processor
export {
  DAWWorkletProcessor,
  defineParameterDescriptors,
  type ProcessorOptions,
} from './worklet-base.js';

// Voice Allocator
export {
  VoiceAllocator,
  createVoiceAllocator,
  createSynthVoice,
  createSamplerVoice,
  DEFAULT_ALLOCATOR_OPTIONS,
  type VoiceStealStrategy,
  type VoiceAllocatorOptions,
} from './voice-allocator.js';

// SAB Ring Buffers
export {
  SABRingBuffer,
  AudioRingBuffer,
  EventRingBuffer,
  createRingBuffer,
  createAudioRingBuffer,
  createEventRingBuffer,
  type RingBufferConfig,
} from './sab-ring-buffer.js';

// WAM Adapter
export {
  WAMAdapter,
  createWAMAdapter,
  validateWAMUrl,
  generateWAMGroupId,
  generateWAMPluginId,
  type WAMGroupId,
  type WAMPluginId,
  type WAMConstructorOptions,
  type WAMProcessorOptions,
  type WAMMessage,
  type WAMMessageType,
  type WAMEvent,
  type WAMEventType,
} from './wam-adapter.js';

// Types
export type {
  ProcessorParameter,
  ProcessorMessage,
  ProcessorMessageType,
  ProcessorParamMessage,
  ProcessorEventMessage,
  ProcessorStateMessage,
  ProcessorBufferMessage,
  ProcessorStats,
  VoiceState,
  SamplerVoiceState,
  SynthVoiceState,
  WAMDescriptor,
  WAMParameterInfo,
  WAMState,
  MeterData,
  MeterAccumulator,
} from './types.js';

// Worklet URLs (for AudioWorklet.addModule)
export const WORKLET_URLS = {
  scheduler: new URL('../worklets/scheduler.worklet.ts', import.meta.url).href,
  meter: new URL('../worklets/meter.worklet.ts', import.meta.url).href,
  metronome: new URL('../worklets/metronome.worklet.ts', import.meta.url).href,
};

/** Register all DAW worklets with an AudioContext */
export async function registerWorklets(audioContext: AudioContext): Promise<void> {
  const worklets = [
    { name: 'daw-scheduler', url: WORKLET_URLS.scheduler },
    { name: 'daw-meter', url: WORKLET_URLS.meter },
    { name: 'daw-metronome', url: WORKLET_URLS.metronome },
  ];
  
  for (const worklet of worklets) {
    try {
      await audioContext.audioWorklet.addModule(worklet.url);
    } catch (e) {
      console.error(`Failed to register worklet ${worklet.name}:`, e);
      throw e;
    }
  }
}

/** Check if AudioWorklet is supported */
export function isAudioWorkletSupported(): boolean {
  return typeof AudioWorkletNode !== 'undefined';
}

/** Check if SharedArrayBuffer is supported */
export function isSharedArrayBufferSupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined' && self.crossOriginIsolated;
}

/** Get DSP capability matrix */
export function getDSPCapabilities(): {
  audioWorklet: boolean;
  sharedArrayBuffer: boolean;
  offlineAudioContext: boolean;
  audioContext: boolean;
} {
  return {
    audioWorklet: isAudioWorkletSupported(),
    sharedArrayBuffer: isSharedArrayBufferSupported(),
    offlineAudioContext: typeof OfflineAudioContext !== 'undefined',
    audioContext: typeof AudioContext !== 'undefined',
  };
}
