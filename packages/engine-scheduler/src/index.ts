/**
 * Engine Scheduler - Musical scheduling for the DAW
 * 
 * Two-stage scheduler implementing section 8.2 of the engineering spec:
 * 1. Musical scheduler worker - resolves clips/scenes into event chunks
 * 2. AudioWorklet render scheduler - consumes events at block boundaries
 * 
 * @module @daw/engine-scheduler
 */

// Main scheduler
export {
  Scheduler,
  createScheduler,
  type SchedulerOptions,
} from './scheduler.js';

// Event Queue
export {
  EventQueue,
  createScheduledEvent,
  createEventId,
  EVENT_PRIORITY,
  type EventQueueOptions,
} from './event-queue.js';

// Lookahead
export {
  LookaheadManager,
  RenderScheduler,
  createLookaheadManager,
  createRenderScheduler,
  type LookaheadManagerOptions,
} from './lookahead.js';

// Metronome
export {
  MetronomeEngine,
  createMetronomeEngine,
  generateClickSample,
  type MetronomeEngineOptions,
  type MetronomeClick,
} from './metronome.js';

// Types
export type {
  ScheduledEventWithMetadata,
  EventChunk,
  EventSource,
  MidiClipSource,
  SceneSource,
  LiveSource,
  ScheduleResolution,
  QueueStats,
  LookaheadWindow,
  SchedulerState,
  MetronomeConfig,
  AutomationPoint,
  AutomationLane,
  SchedulerEvent,
  SchedulerListener,
  SchedulerEventType,
} from './types.js';

export {
  DEFAULT_METRONOME_CONFIG,
} from './types.js';
