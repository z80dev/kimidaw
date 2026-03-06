/**
 * Scheduler types
 * Musical scheduler for the DAW - implements two-stage scheduling per spec section 8.2
 */

import type { 
  AnyScheduledEvent, 
  SchedulerConfig,
  TransportState,
  NoteEvent,
  AutomationEvent,
} from '@daw/engine-core';

/** Event with scheduling metadata */
export interface ScheduledEventWithMetadata extends AnyScheduledEvent {
  /** Event ID for deduplication */
  eventId: string;
  /** When this event was scheduled */
  scheduledAt: number;
  /** Priority for conflict resolution */
  priority: number;
}

/** Chunk of events for a time range */
export interface EventChunk {
  /** Start time in ticks */
  startTick: number;
  /** End time in ticks */
  endTick: number;
  /** Start time in samples */
  startSample: number;
  /** End time in samples */
  endSample: number;
  /** Events in this chunk */
  events: AnyScheduledEvent[];
  /** Whether this chunk wraps a loop boundary */
  isLoopWrap: boolean;
}

/** Source of musical events */
export interface EventSource {
  /** Unique source ID */
  id: string;
  /** Source type */
  type: 'clip' | 'scene' | 'live' | 'script';
  /** Get events for a time range */
  getEvents(startTick: number, endTick: number): AnyScheduledEvent[];
  /** Check if source is active */
  isActive(): boolean;
}

/** MIDI clip as event source */
export interface MidiClipSource extends EventSource {
  type: 'clip';
  clipId: string;
  /** Clip start position in arrangement */
  positionTick: number;
  /** Clip length */
  durationTicks: number;
  /** Loop settings */
  loop: {
    enabled: boolean;
    startTick: number;
    endTick: number;
  } | null;
  /** Notes in the clip */
  notes: NoteEvent[];
}

/** Scene/clip launcher source */
export interface SceneSource extends EventSource {
  type: 'scene';
  sceneId: string;
  /** Launch quantization */
  quantizeGrid: number;
  /** Follow action */
  followAction: 'none' | 'next' | 'previous' | 'random' | 'first' | 'last';
}

/** Live input source (MIDI keyboard, etc.) */
export interface LiveSource extends EventSource {
  type: 'live';
  inputId: string;
  /** Current armed state */
  armed: boolean;
}

/** Resolution result from scheduler */
export interface ScheduleResolution {
  /** Chunks of events to be played */
  chunks: EventChunk[];
  /** Time range covered */
  startTick: number;
  endTick: number;
  /** Events that should be cancelled (e.g., note-offs for loop wraps) */
  cancelledEvents: AnyScheduledEvent[];
}

/** Queue statistics */
export interface QueueStats {
  /** Total events in queue */
  eventCount: number;
  /** Events by type */
  eventsByType: Record<string, number>;
  /** Queue fill ratio (0-1) */
  fillRatio: number;
  /** Time range covered */
  timeSpanMs: number;
  /** Whether queue needs refill */
  needsRefill: boolean;
}

/** Lookahead window for scheduling */
export interface LookaheadWindow {
  /** Start time in ticks */
  startTick: number;
  /** End time in ticks */
  endTick: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether this crosses a loop boundary */
  crossesLoopBoundary: boolean;
}

/** Scheduler state */
export interface SchedulerState {
  /** Whether scheduler is running */
  running: boolean;
  /** Last scheduled position */
  lastScheduledTick: number;
  /** Lookahead window end */
  lookaheadEndTick: number;
  /** Active event sources */
  activeSources: Set<string>;
  /** Events in the queue */
  queuedEvents: Map<string, ScheduledEventWithMetadata>;
}

/** Metronome click configuration */
export interface MetronomeConfig {
  /** Whether metronome is enabled */
  enabled: boolean;
  /** Volume in dB */
  volumeDb: number;
  /** Accent first beat */
  accentFirstBeat: boolean;
  /** Accent amount in dB */
  accentDb: number;
  /** Click frequency (Hz) */
  clickFrequency: number;
  /** Accent frequency (Hz) */
  accentFrequency: number;
  /** Click duration (ms) */
  clickDurationMs: number;
}

/** Default metronome configuration */
export const DEFAULT_METRONOME_CONFIG: MetronomeConfig = {
  enabled: false,
  volumeDb: -6,
  accentFirstBeat: true,
  accentDb: 6,
  clickFrequency: 1000,
  accentFrequency: 1500,
  clickDurationMs: 50,
};

/** Automation point for interpolation */
export interface AutomationPoint {
  tick: number;
  value: number;
  /** For bezier curves */
  curve?: number;
}

/** Automation lane for scheduling */
export interface AutomationLane {
  id: string;
  target: {
    scope: 'track' | 'plugin' | 'send' | 'instrument' | 'macro';
    ownerId: string;
    paramId: string;
  };
  mode: 'read' | 'touch' | 'latch' | 'write' | 'trim';
  points: AutomationPoint[];
  interpolation: 'step' | 'linear' | 'bezier';
}

/** Scheduler event types for callbacks */
export type SchedulerEventType = 
  | 'chunk-prepared'
  | 'queue-refill'
  | 'event-dropped'
  | 'lookahead-crossed';

export interface SchedulerEvent {
  type: SchedulerEventType;
  timestamp: number;
  data: unknown;
}

export type SchedulerListener = (event: SchedulerEvent) => void;
