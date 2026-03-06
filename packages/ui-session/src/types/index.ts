/**
 * Session View Types
 * Core type definitions for Ableton-style Session View
 */

// ============================================================================
// Quantization Types
// ============================================================================

export type QuantizationValue =
  | 'none'
  | '1/32'
  | '1/16'
  | '1/8'
  | '1/4'
  | '1/2'
  | '1 bar'
  | '2 bars'
  | '4 bars'
  | '8 bars'
  | 'global';

export const QUANTIZATION_VALUES: QuantizationValue[] = [
  'none',
  '1/32',
  '1/16',
  '1/8',
  '1/4',
  '1/2',
  '1 bar',
  '2 bars',
  '4 bars',
  '8 bars',
  'global',
];

// ============================================================================
// Launch Mode Types
// ============================================================================

export type LaunchMode = 'trigger' | 'gate' | 'toggle' | 'repeat';

export const LAUNCH_MODES: LaunchMode[] = ['trigger', 'gate', 'toggle', 'repeat'];

// ============================================================================
// Follow Action Types
// ============================================================================

export type FollowActionType =
  | 'noAction'
  | 'stop'
  | 'playAgain'
  | 'playPrevious'
  | 'playNext'
  | 'playFirst'
  | 'playLast'
  | 'playAny'
  | 'playOther'
  | 'playRandom'
  | 'playRandomOther';

export const FOLLOW_ACTIONS: FollowActionType[] = [
  'noAction',
  'stop',
  'playAgain',
  'playPrevious',
  'playNext',
  'playFirst',
  'playLast',
  'playAny',
  'playOther',
  'playRandom',
  'playRandomOther',
];

// ============================================================================
// Clip State Types
// ============================================================================

export type ClipSlotState = 'empty' | 'stopped' | 'playing' | 'queued' | 'recording';

export type ClipType = 'audio' | 'midi' | 'hybrid';

// ============================================================================
// Core Data Models
// ============================================================================

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface Scene {
  id: string;
  index: number;
  name: string;
  color?: string;
  tempo?: number;
  timeSignature?: TimeSignature;
  isPlaying?: boolean;
  isQueued?: boolean;
}

export interface Track {
  id: string;
  name: string;
  color: string;
  type: 'audio' | 'midi' | 'instrument' | 'group' | 'return';
  index: number;
  mute: boolean;
  solo: boolean;
  arm: boolean;
  cue: boolean;
  volumeDb: number;
  pan: number; // -1 (left) to 1 (right), 0 = center
  input?: string;
  output: string;
  parentGroupId?: string;
  isFolded?: boolean;
  children?: string[]; // Track IDs if this is a group track
}

export interface Clip {
  id: string;
  name: string;
  color: string;
  type: ClipType;
  trackId: string;
  startTick: number;
  endTick: number;
  loop?: LoopSpec;
  isWarped?: boolean;
  launchSettings: ClipLaunchSettings;
  followActions: FollowAction[];
}

export interface LoopSpec {
  startTick: number;
  endTick: number;
  enabled: boolean;
}

export interface ClipSlot {
  id: string;
  trackId: string;
  sceneId: string;
  clipId?: string; // null if empty
  state: ClipSlotState;
  progress?: number; // 0-1 for playing clips
  queueTime?: number; // Time until launch when queued
}

export interface ClipLaunchSettings {
  launchMode: LaunchMode;
  quantization: QuantizationValue;
  velocity: boolean;
  legato: boolean;
}

export interface FollowAction {
  id: string;
  actionA: FollowActionType;
  chanceA: number; // 0-100
  actionB: FollowActionType;
  chanceB: number; // 0-100
  linked: boolean;
  followTimeBars: number;
  followTimeBeats: number;
  followTimeSixteenths: number;
}

// ============================================================================
// Envelope Types
// ============================================================================

export type EnvelopeTarget =
  | { type: 'volume' }
  | { type: 'pan' }
  | { type: 'transpose' }
  | { type: 'detune' }
  | { type: 'cc'; number: number }
  | { type: 'pitchBend' }
  | { type: 'aftertouch' }
  | { type: 'pluginParam'; pluginId: string; paramId: string };

export interface EnvelopeBreakpoint {
  id: string;
  time: number; // In ticks or beats
  value: number;
  curve: 'step' | 'linear' | 'bezier';
  curveControl?: { x: number; y: number }; // For bezier curves
}

export interface ClipEnvelope {
  id: string;
  clipId: string;
  target: EnvelopeTarget;
  breakpoints: EnvelopeBreakpoint[];
  loopStart?: number;
  loopEnd?: number;
  loopEnabled: boolean;
  unlinkFromClip: boolean;
}

// ============================================================================
// Selection Types
// ============================================================================

export interface SessionSelection {
  clipIds: Set<string>;
  slotIds: Set<string>;
  sceneIds: Set<string>;
  trackIds: Set<string>;
}

export interface DragState {
  isDragging: boolean;
  sourceType: 'clip' | 'slot' | 'scene' | 'track' | null;
  sourceId: string | null;
  targetId: string | null;
}

// ============================================================================
// Recording Types
// ============================================================================

export interface SessionRecordingState {
  isRecording: boolean;
  recordingSlotId?: string;
  punchIn?: number;
  punchOut?: number;
  loopRecord: boolean;
  countInBars: number;
}

// ============================================================================
// View State Types
// ============================================================================

export interface SessionViewState {
  // Grid dimensions
  trackWidth: number;
  sceneHeight: number;
  headerWidth: number;
  
  // Scroll positions
  scrollX: number;
  scrollY: number;
  
  // Zoom
  zoomX: number;
  zoomY: number;
  
  // Selection
  selection: SessionSelection;
  
  // Drag state
  dragState: DragState;
  
  // Focus
  focusedTrackId?: string;
  focusedSceneId?: string;
  focusedSlotId?: string;
  
  // Display options
  showSceneTempo: boolean;
  showSceneTimeSignature: boolean;
  clipNameDisplay: 'full' | 'truncated' | 'none';
}

// ============================================================================
// Integration Types
// ============================================================================

export interface SessionArrangementSync {
  arrangementFollowsSession: boolean;
  captureOnStop: boolean;
  returnToSessionOnStop: boolean;
}

export interface LinkedTrackState {
  trackIds: Set<string>;
  editMode: 'individual' | 'grouped';
}

// ============================================================================
// MIDI Mapping Types
// ============================================================================

export interface SessionMidiMapping {
  id: string;
  type: 'sceneLaunch' | 'clipLaunch' | 'stopClip' | 'stopAll' | 'trackArm' | 'trackMute' | 'trackSolo';
  targetId: string;
  midiNote?: number;
  midiCC?: number;
  channel: number;
}

// ============================================================================
// Event Types
// ============================================================================

export interface ClipLaunchEvent {
  type: 'clipLaunch';
  clipId: string;
  slotId: string;
  timestamp: number;
  velocity?: number;
}

export interface SceneLaunchEvent {
  type: 'sceneLaunch';
  sceneId: string;
  timestamp: number;
}

export interface ClipStopEvent {
  type: 'clipStop';
  clipId: string;
  slotId: string;
  timestamp: number;
}

export type SessionEvent = ClipLaunchEvent | SceneLaunchEvent | ClipStopEvent;
