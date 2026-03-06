/**
 * Engine Core - Core audio engine types and utilities
 * 
 * This package provides:
 * - Transport state management
 * - Musical timing conversions (PPQ = 960)
 * - Audio graph model
 * - Latency compensation
 * - Worklet bridge
 * 
 * @module @daw/engine-core
 */

// Types
export {
  PPQ,
  DEFAULT_SAMPLE_RATE,
  type MusicalTime,
  type TransportState,
  type TempoEvent,
  type TimeSignatureEvent,
  type SchedulerConfig,
  DEFAULT_SCHEDULER_CONFIG,
  type ScheduledEvent,
  type NoteEvent,
  type AutomationEvent,
  type ParameterEvent,
  type ClipEvent,
  type AnyScheduledEvent,
  type ScheduledEventType,
  type RingHeader,
  type CapabilityMatrix,
  EventPriority,
  detectCapabilities,
  type LatencyInfo,
} from './types.js';

// Timing
export {
  type TimingContext,
  createDefaultTimingContext,
  ticksToSamples,
  samplesToTicks,
  ticksToSeconds,
  secondsToTicks,
  samplesToSeconds,
  secondsToSamples,
  beatDurationSamples,
  tickDurationSamples,
  ticksToBeats,
  beatsToTicks,
  musicalTimeToTicks,
  ticksToMusicalTime,
  TempoMap,
  quantizeTicks,
  GridTicks,
} from './timing.js';

// Transport
export {
  type TransportStateChange,
  type TransportListener,
  type TransportOptions,
  Transport,
  createTransport,
} from './transport.js';

// Graph
export {
  type NodeId,
  type GraphConnection,
  type GraphSend,
  type TrackSource,
  type GraphTrack,
  type GraphBus,
  type GraphMaster,
  type GraphMonitor,
  type EngineGraph,
  type GraphPlugin,
  type LatencyCompensationInfo,
  GraphBuilder,
  calculateLatencyCompensation,
  validateGraph,
  createMinimalGraph,
  createDefaultGraph,
} from './graph.js';

// Latency
export {
  type PluginLatencyReport,
  type LatencyModel,
  type DeviceLatency,
  LatencyCompensator,
  createLatencyCompensator,
  estimateDeviceLatency,
  createCompensationDelay,
  validateLatency,
} from './latency.js';

// Worklet Bridge
export {
  type WorkletMessageType,
  type WorkletMessage,
  type EventBatchMessage,
  type ParamChangeMessage,
  type StateUpdateMessage,
  type BufferRegistrationMessage,
  type WorkletStats,
  type WorkletBridgeOptions,
  WorkletBridge,
  createWorkletBridge,
  isWorkletSupported,
  serializeEvent,
} from './worklet-bridge.js';

// Tempo Following (Wave 7)
export {
  createTempoFollower,
  createTapTempo,
  DEFAULT_TEMPO_FOLLOWER_OPTIONS,
  type TempoFollower,
  type TempoFollowerOptions,
} from './tempo-following.js';
