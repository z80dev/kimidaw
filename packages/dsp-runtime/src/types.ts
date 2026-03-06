/**
 * DSP Runtime types
 * AudioWorklet processors and DSP utilities
 */

import type { AnyScheduledEvent, RingHeader } from '@daw/engine-core';

/** Processor parameter specification */
export interface ProcessorParameter {
  id: string;
  name: string;
  defaultValue: number;
  min: number;
  max: number;
  automationRate: 'a-rate' | 'k-rate';
}

/** Processor port message types */
export type ProcessorMessageType =
  | 'param'
  | 'event'
  | 'state'
  | 'buffer'
  | 'ping'
  | 'pong'
  | 'stats'
  | 'error';

/** Base processor message */
export interface ProcessorMessage {
  type: ProcessorMessageType;
  timestamp: number;
  payload: unknown;
}

/** Parameter change message */
export interface ProcessorParamMessage extends ProcessorMessage {
  type: 'param';
  payload: {
    paramId: string;
    value: number;
    sampleOffset: number;
  };
}

/** Event message (notes, automation) */
export interface ProcessorEventMessage extends ProcessorMessage {
  type: 'event';
  payload: {
    events: AnyScheduledEvent[];
  };
}

/** Transport state message */
export interface ProcessorStateMessage extends ProcessorMessage {
  type: 'state';
  payload: {
    playing: boolean;
    currentTick: number;
    currentSample: number;
    tempo: number;
  };
}

/** SAB buffer registration */
export interface ProcessorBufferMessage extends ProcessorMessage {
  type: 'buffer';
  payload: {
    bufferId: string;
    sab: SharedArrayBuffer;
    type: 'events' | 'meters' | 'record';
  };
}

/** Processor statistics */
export interface ProcessorStats {
  processCount: number;
  eventsProcessed: number;
  eventsDropped: number;
  averageLoad: number;
  peakLoad: number;
  underruns: number;
}

/** Voice state for polyphonic instruments */
export interface VoiceState {
  /** Voice ID */
  id: number;
  /** Currently playing note (-1 = free) */
  note: number;
  /** Current envelope stage */
  stage: 'idle' | 'attack' | 'decay' | 'sustain' | 'release';
  /** Current amplitude */
  amplitude: number;
  /** Voice age (for steal decision) */
  age: number;
  /** Velocity of current note */
  velocity: number;
  /** Channel */
  channel: number;
}

/** Sampler voice state */
export interface SamplerVoiceState extends VoiceState {
  /** Sample position */
  samplePosition: number;
  /** Playback rate */
  rate: number;
  /** Loop points */
  loopStart: number;
  loopEnd: number;
  /** Sample buffer reference */
  bufferId: string;
}

/** Synth voice state */
export interface SynthVoiceState extends VoiceState {
  /** Oscillator phase */
  phase: number;
  /** Current frequency */
  frequency: number;
  /** Pitch bend offset */
  pitchBend: number;
  /** Filter state */
  filterCutoff: number;
  filterResonance: number;
  filterState: { x1: number; x2: number; y1: number; y2: number };
}

/** WAM plugin descriptor */
export interface WAMDescriptor {
  identifier: string;
  name: string;
  vendor: string;
  version: string;
  apiVersion: string;
}

/** WAM parameter info */
export interface WAMParameterInfo {
  id: string;
  label: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
  type: 'float' | 'int' | 'boolean' | 'choice';
}

/** WAM state */
export interface WAMState {
  [key: string]: number;
}

/** Ring buffer configuration */
export interface RingBufferConfig {
  capacity: number;
  elementSize: number;
  channelCount?: number;
}

/** Meter data structure */
export interface MeterData {
  /** Peak level (linear) */
  peak: number;
  /** RMS level (linear) */
  rms: number;
  /** True peak estimate */
  truePeak: number;
  /** LUFS momentary */
  lufsMomentary: number;
  /** Clip indicator */
  clipped: boolean;
}

/** Meter accumulator state */
export interface MeterAccumulator {
  /** Running sum for RMS */
  sumSquares: number;
  /** Current peak */
  currentPeak: number;
  /** Sample count for current window */
  sampleCount: number;
  /** Clip detected */
  clipDetected: boolean;
}
