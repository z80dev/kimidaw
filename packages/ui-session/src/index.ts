/**
 * @daw/ui-session
 * Ableton-style Session View for the In-Browser DAW
 * 
 * @packageDocumentation
 */

// ============================================================================
// Core Components
// ============================================================================

export { SessionGrid } from './components/SessionGrid';
export type { SessionGridProps } from './components/SessionGrid';

export { TrackHeaders } from './components/TrackHeaders';
export type { TrackHeadersProps } from './components/TrackHeaders';

export { SceneHeaders } from './components/SceneHeaders';
export type { SceneHeadersProps } from './components/SceneHeaders';

export { ClipSlots } from './components/ClipSlots';
export type { ClipSlotsProps } from './components/ClipSlots';

// ============================================================================
// System Classes
// ============================================================================

export { LaunchSystem, createDefaultLaunchSettings, createLegatoLaunchSettings } from './LaunchSystem';
export type { 
  LaunchQueueItem, 
  LaunchSystemState, 
  LaunchSystemOptions,
  TransportState 
} from './LaunchSystem';

export { ClipEnvelopes, getEnvelopeTargetName, getEnvelopeTargetRange } from './ClipEnvelopes';

export { SceneManager, getDefaultSceneColor, generateSceneName } from './SceneManager';
export type { 
  SceneManagerState, 
  CreateSceneOptions, 
  CaptureSceneResult 
} from './SceneManager';

export { SessionRecording, calculatePreRollTicks, formatRecordingTime } from './SessionRecording';
export type { 
  RecordingSession, 
  RecordingOptions, 
  RetrospectiveCapture 
} from './SessionRecording';

export { 
  SessionArrangementIntegration, 
  calculateSessionDuration 
} from './SessionArrangementIntegration';
export type { 
  CaptureOptions, 
  ConsolidateResult, 
  ViewSyncState 
} from './SessionArrangementIntegration';

export { 
  LinkedTracks, 
  canLinkClips, 
  findCommonPositions 
} from './LinkedTracks';
export type { 
  LinkedEditOperation, 
  LinkedEditResult, 
  QuantizeOptions, 
  VelocityOptions, 
  NudgeOptions 
} from './LinkedTracks';

// ============================================================================
// Utilities
// ============================================================================

export {
  getQuantizationTicks,
  quantizeTick,
  quantizeTickUp,
  calculateLaunchTime,
  getLaunchCountdown,
  formatTickTime,
  quantizationToString,
  isOnQuantizationGrid,
} from './utils/quantization';

export {
  selectFollowAction,
  resolveFollowAction,
  calculateFollowTimeTicks,
  shouldTriggerFollowAction,
  createDefaultFollowAction,
  formatFollowTime,
} from './utils/followActions';

// ============================================================================
// Hooks
// ============================================================================

export { useSessionView } from './hooks/useSessionView';
export type { UseSessionViewOptions, UseSessionViewReturn } from './hooks/useSessionView';

// ============================================================================
// Types
// ============================================================================

export type {
  QuantizationValue,
  LaunchMode,
  FollowActionType,
  ClipSlotState,
  ClipType,
  TimeSignature,
  Scene,
  Track,
  Clip,
  LoopSpec,
  ClipSlot,
  ClipLaunchSettings,
  FollowAction,
  EnvelopeTarget,
  EnvelopeBreakpoint,
  ClipEnvelope,
  SessionSelection,
  DragState,
  SessionRecordingState,
  SessionViewState,
  SessionArrangementSync,
  LinkedTrackState,
  SessionMidiMapping,
  ClipLaunchEvent,
  SceneLaunchEvent,
  ClipStopEvent,
  SessionEvent,
} from './types';

export {
  QUANTIZATION_VALUES,
  LAUNCH_MODES,
  FOLLOW_ACTIONS,
} from './types';

// ============================================================================
// Constants
// ============================================================================

export const SESSION_GRID_DEFAULTS = {
  trackWidth: 120,
  sceneHeight: 60,
  headerWidth: 100,
  minTrackWidth: 80,
  maxTrackWidth: 200,
  minSceneHeight: 40,
  maxSceneHeight: 100,
} as const;

export const CLIP_COLORS = [
  '#FF5252', // Red
  '#FF9800', // Orange
  '#FFEB3B', // Yellow
  '#76FF03', // Lime
  '#00E676', // Green
  '#00BFA5', // Teal
  '#00B0FF', // Light Blue
  '#2979FF', // Blue
  '#651FFF', // Deep Purple
  '#D500F9', // Purple
  '#F50057', // Pink
  '#795548', // Brown
] as const;
