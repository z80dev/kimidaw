/**
 * Core types for the DAW engine
 * Following the engineering spec sections 8, 9, and 25.4
 */

/** Pulses Per Quarter note - musical resolution */
export const PPQ = 960;

/** Default sample rate */
export const DEFAULT_SAMPLE_RATE = 48000;

/** Musical time representation (bars, beats, ticks) */
export interface MusicalTime {
  bars: number;
  beats: number;
  ticks: number;
}

/** Transport state - mirrors the authoritative state in the engine */
export interface TransportState {
  /** Whether playback is active */
  playing: boolean;
  /** Whether recording is active */
  recording: boolean;
  /** Whether looping is enabled */
  looping: boolean;
  /** Punch in position in ticks (null if disabled) */
  punchIn: number | null;
  /** Punch out position in ticks (null if disabled) */
  punchOut: number | null;
  /** Loop start position in ticks */
  loopStartTick: number;
  /** Loop end position in ticks */
  loopEndTick: number;
  /** Current playback position in ticks */
  currentTick: number;
  /** Current playback position in samples */
  currentSample: number;
  /** Current tempo in BPM */
  tempo: number;
  /** Time signature numerator */
  timeSigNum: number;
  /** Time signature denominator */
  timeSigDen: number;
}

/** Tempo event for tempo maps */
export interface TempoEvent {
  tick: number;
  bpm: number;
}

/** Time signature event */
export interface TimeSignatureEvent {
  tick: number;
  numerator: number;
  denominator: number;
}

/** Scheduler configuration per spec section 8.2 */
export interface SchedulerConfig {
  /** Lookahead horizon for event preparation (e.g. 120ms) */
  prepareHorizonMs: number;
  /** Threshold to trigger a refill (e.g. 60ms) */
  refillThresholdMs: number;
  /** Maximum chunk size for event batches (e.g. 20ms) */
  maxChunkMs: number;
}

/** Default scheduler configuration */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  prepareHorizonMs: 120,
  refillThresholdMs: 60,
  maxChunkMs: 20,
};

/** Event types that can be scheduled */
export type ScheduledEventType = 
  | 'note-on'
  | 'note-off'
  | 'automation'
  | 'parameter'
  | 'clip-start'
  | 'clip-end';

/** Base interface for scheduled events */
export interface ScheduledEvent {
  /** Event type */
  type: ScheduledEventType;
  /** Event timestamp in samples (absolute) */
  sampleTime: number;
  /** Event timestamp in ticks (musical time) */
  tickTime: number;
  /** Track ID this event belongs to */
  trackId: string;
  /** Clip ID if applicable */
  clipId?: string;
}

/** MIDI note event */
export interface NoteEvent extends ScheduledEvent {
  type: 'note-on' | 'note-off';
  /** MIDI note number (0-127) */
  note: number;
  /** MIDI velocity (0-127) */
  velocity: number;
  /** MIDI channel (0-15) */
  channel: number;
}

/** Automation event */
export interface AutomationEvent extends ScheduledEvent {
  type: 'automation';
  /** Parameter ID */
  paramId: string;
  /** Parameter value */
  value: number;
  /** Interpolation type to next event */
  interpolation: 'step' | 'linear' | 'bezier';
}

/** Parameter change event */
export interface ParameterEvent extends ScheduledEvent {
  type: 'parameter';
  /** Plugin instance ID */
  pluginId: string;
  /** Parameter ID */
  paramId: string;
  /** New value */
  value: number;
  /** Sample-accurate offset within the event chunk */
  sampleOffset: number;
}

/** Clip lifecycle event */
export interface ClipEvent extends ScheduledEvent {
  type: 'clip-start' | 'clip-end';
  clipId: string;
}

/** Union of all scheduled event types */
export type AnyScheduledEvent = NoteEvent | AutomationEvent | ParameterEvent | ClipEvent;

/** Ring buffer header structure for SAB-based communication (spec 25.4) */
export interface RingHeader {
  /** Write index (atomic) */
  writeIndex: Int32Array;
  /** Read index (atomic) */
  readIndex: Int32Array;
  /** Buffer capacity in elements */
  capacity: Int32Array;
  /** Dropped event counter */
  dropped: Int32Array;
}

/** Capabilities matrix for feature detection (spec 3.3) */
export interface CapabilityMatrix {
  audioWorklet: boolean;
  sharedArrayBuffer: boolean;
  crossOriginIsolated: boolean;
  webMidi: boolean;
  sysex: boolean;
  fileSystemAccess: boolean;
  opfs: boolean;
  opfsSyncHandle: boolean;
  webCodecsAudio: boolean;
  mediaRecorder: boolean;
  audioOutputSelection: boolean;
  webGpu: boolean;
  offscreenCanvas: boolean;
  keyboardLayoutMap: boolean;
  webHid: boolean;
  webSerial: boolean;
}

/** Detect current browser capabilities */
export function detectCapabilities(): CapabilityMatrix {
  return {
    audioWorklet: typeof AudioWorkletNode !== 'undefined',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    crossOriginIsolated: self.crossOriginIsolated ?? false,
    webMidi: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
    sysex: false, // Requires explicit permission
    fileSystemAccess: typeof showOpenFilePicker !== 'undefined',
    opfs: typeof navigator !== 'undefined' && 'storage' in navigator,
    opfsSyncHandle: typeof navigator !== 'undefined' && 'storage' in navigator,
    webCodecsAudio: typeof AudioDecoder !== 'undefined',
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    audioOutputSelection: typeof HTMLAudioElement !== 'undefined' && 
                          'setSinkId' in HTMLAudioElement.prototype,
    webGpu: typeof navigator !== 'undefined' && 'gpu' in navigator,
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    keyboardLayoutMap: typeof navigator !== 'undefined' && 
                       'keyboard' in navigator &&
                       'getLayoutMap' in (navigator as unknown as Record<string, unknown>).keyboard,
    webHid: typeof navigator !== 'undefined' && 'hid' in navigator,
    webSerial: typeof navigator !== 'undefined' && 'serial' in navigator,
  };
}

/** Event priority for scheduling */
export enum EventPriority {
  /** Critical events that must not be dropped (transport, record) */
  Critical = 0,
  /** Musical events (notes, automation) */
  Musical = 1,
  /** Visual/UI events (meters, position updates) */
  Visual = 2,
}

/** Latency information for a signal path */
export interface LatencyInfo {
  /** Input latency in samples */
  inputLatency: number;
  /** Output latency in samples */
  outputLatency: number;
  /** Plugin delay compensation in samples */
  pluginDelayCompensation: number;
  /** Total round-trip latency in samples */
  totalLatency: number;
}
