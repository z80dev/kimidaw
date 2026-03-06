/**
 * Track type definitions for the DAW
 * 
 * Implements section 7.2 of the engineering spec
 */

import type { AutomationLane } from './automation.js';
import type { PluginInstance, PluginTarget } from './plugins.js';

/** Input binding for track recording */
export interface InputBinding {
  type: 'audio' | 'midi' | 'none';
  deviceId?: string;
  channel?: number | 'all';
}

/** Output binding for track routing */
export interface OutputBinding {
  type: 'master' | 'bus' | 'track';
  targetId: string;
}

/** Send slot configuration */
export interface SendSlot {
  id: string;
  targetBusId: string;
  levelDb: number;
  preFader: boolean;
  active: boolean;
}

/** Macro binding for MIDI control */
export interface MacroBinding {
  id: string;
  name: string;
  target: AutomationTarget | PluginParameterTarget;
  value: number;
  min: number;
  max: number;
}

/** Target for automation */
export interface AutomationTarget {
  scope: 'track' | 'plugin' | 'send' | 'instrument' | 'macro';
  ownerId: string;
  paramId: string;
}

/** Target for plugin parameter */
export interface PluginParameterTarget {
  type: 'plugin-param';
  pluginId: string;
  paramId: string;
}

/** External MIDI output target */
export interface ExternalMidiTarget {
  type: 'external-midi';
  deviceId: string;
  channel: number;
}

/** Comp lane for take recording */
export interface CompLane {
  id: string;
  name: string;
  active: boolean;
  muted: boolean;
  color?: string;
}

/** Warp mode for audio time stretching */
export type WarpMode = 
  | 'repitch'
  | 'beats'
  | 'texture'
  | 'tones'
  | 'complex'
  | 'complex-pro';

/** Base interface shared by all track types */
export interface TrackBase {
  id: string;
  name: string;
  color: string;
  mute: boolean;
  solo: boolean;
  arm: boolean;
  monitorMode: 'off' | 'auto' | 'in';
  input?: InputBinding;
  output: OutputBinding;
  inserts: PluginInstance[];
  sends: SendSlot[];
  automationLanes: AutomationLane[];
  macros: MacroBinding[];
  comments?: string;
  
  // Track ordering
  order: number;
  
  // Folder/group parent
  parentId?: string;
  
  // Track height in pixels (UI state)
  height?: number;
  
  // Collapsed state
  collapsed: boolean;
}

/** Audio track for recording and playing back audio clips */
export interface AudioTrack extends TrackBase {
  type: 'audio';
  clips: AudioClipRef[];
  compLanes: CompLane[];
  currentCompLaneId?: string;
  warpMode?: WarpMode;
  
  // Audio-specific settings
  inputMonitoring: boolean;
  latencyCompensation: number; // samples
}

/** MIDI track for external MIDI output */
export interface MidiTrack extends TrackBase {
  type: 'midi';
  clips: MidiClipRef[];
  destination: PluginTarget | ExternalMidiTarget;
}

/** Instrument track with built-in instrument */
export interface InstrumentTrack extends TrackBase {
  type: 'instrument';
  clips: MidiClipRef[];
  instrument: PluginInstance;
  noteFx: PluginInstance[]; // MIDI effects before instrument
}

/** Group track for folder/bus organization */
export interface GroupTrack extends TrackBase {
  type: 'group';
  children: string[]; // Child track IDs
  clips: []; // Groups don't have clips directly
}

/** Return track for effect sends */
export interface ReturnTrack extends TrackBase {
  type: 'return';
  clips: []; // Returns don't have clips
}

/** Aux track for sidechain/routing */
export interface AuxTrack extends TrackBase {
  type: 'aux';
  source: 'input' | 'bus' | 'track';
  sourceId?: string;
  clips: []; // Aux tracks don't have clips
}

/** External MIDI track for hardware instruments */
export interface ExternalMidiTrack extends TrackBase {
  type: 'external-midi';
  clips: MidiClipRef[];
  deviceId: string;
  channel: number;
  programChange?: number;
  bankMsb?: number;
  bankLsb?: number;
}

/** Hybrid track supporting both audio and MIDI clips */
export interface HybridTrack extends TrackBase {
  type: 'hybrid';
  audioClips: AudioClipRef[];
  midiClips: MidiClipRef[];
  instrument?: PluginInstance;
  noteFx: PluginInstance[];
}

/** Discriminated union of all track types */
export type Track =
  | AudioTrack
  | MidiTrack
  | InstrumentTrack
  | GroupTrack
  | ReturnTrack
  | AuxTrack
  | ExternalMidiTrack
  | HybridTrack;

/** Bus track for subgroup mixing */
export interface BusTrack {
  id: string;
  name: string;
  color: string;
  mute: boolean;
  solo: boolean;
  inserts: PluginInstance[];
  sends: SendSlot[];
  automationLanes: AutomationLane[];
  output: OutputBinding;
  macros: MacroBinding[];
  order: number;
  collapsed: boolean;
  
  // Bus type
  busType: 'aux' | 'subgroup' | 'sidechain';
  
  // Input sources
  sourceTrackIds: string[];
}

/** Master track for final output */
export interface MasterTrack {
  id: 'master';
  name: 'Master';
  color: string;
  mute: boolean;
  inserts: PluginInstance[];
  automationLanes: AutomationLane[];
  macros: MacroBinding[];
  collapsed: boolean;
  
  // Master-specific processing
  limiter?: PluginInstance;
  dither: 'none' | 'triangular' | 'noise-shaped';
  truePeak: boolean;
}

/** Reference to an audio clip on a track */
export interface AudioClipRef {
  id: string;
  clipId: string; // Reference to clip definition
  lane: number; // Comp lane index or 0 for main
  startTick: number;
  endTick: number;
}

/** Reference to a MIDI clip on a track */
export interface MidiClipRef {
  id: string;
  clipId: string; // Reference to clip definition
  startTick: number;
  endTick: number;
}

/** Scene/clip launcher slot */
export interface ClipSlot {
  trackId: string;
  sceneIndex: number;
  clipId?: string;
  state: 'empty' | 'stopped' | 'playing' | 'recording' | 'queued';
  color?: string;
}

/** Scene row in the clip launcher */
export interface Scene {
  id: string;
  name: string;
  index: number;
  color?: string;
  tempo?: number; // Override tempo
  timeSignature?: { numerator: number; denominator: number };
  slots: ClipSlot[];
  
  // Launch quantization
  launchQuantization?: number; // ticks
  launchFollowAction?: FollowAction;
}

/** Follow action for clip/scene launching */
export interface FollowAction {
  type: 'none' | 'next' | 'previous' | 'first' | 'last' | 'any' | 'other';
  targetId?: string;
  delayBars: number;
}

/** Type guard functions */
export function isAudioTrack(track: Track): track is AudioTrack {
  return track.type === 'audio';
}

export function isMidiTrack(track: Track): track is MidiTrack {
  return track.type === 'midi';
}

export function isInstrumentTrack(track: Track): track is InstrumentTrack {
  return track.type === 'instrument';
}

export function isGroupTrack(track: Track): track is GroupTrack {
  return track.type === 'group';
}

export function isReturnTrack(track: Track): track is ReturnTrack {
  return track.type === 'return';
}

export function isAuxTrack(track: Track): track is AuxTrack {
  return track.type === 'aux';
}

export function isExternalMidiTrack(track: Track): track is ExternalMidiTrack {
  return track.type === 'external-midi';
}

export function isHybridTrack(track: Track): track is HybridTrack {
  return track.type === 'hybrid';
}

/** Check if track can contain audio clips */
export function canContainAudio(track: Track): boolean {
  return track.type === 'audio' || track.type === 'hybrid';
}

/** Check if track can contain MIDI clips */
export function canContainMidi(track: Track): boolean {
  return track.type === 'midi' || 
         track.type === 'instrument' || 
         track.type === 'hybrid' ||
         track.type === 'external-midi';
}

/** Check if track is a container (has children) */
export function isContainerTrack(track: Track): track is GroupTrack {
  return track.type === 'group';
}
