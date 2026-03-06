/**
 * MIDI Controller types
 * Based on Ableton's MIDI controller mapping system
 */

import type { PluginParameterSpec } from '@daw/project-schema';

export type ControllerType = 'keyboard' | 'pad' | 'encoder' | 'fader' | 'button';

export interface ControllerDevice {
  id: string;
  name: string;
  manufacturer: string;
  type: 'midi' | 'hid' | 'osc';
  inputs: ControllerInput[];
  outputs: ControllerOutput[];
  userScript?: string; // Path to user script
}

export interface ControllerInput {
  id: string;
  type: ControllerType;
  midiChannel: number;
  midiNumber: number;
  midiType: 'note' | 'cc' | 'pitchbend' | 'pressure' | 'program';
  minValue: number;
  maxValue: number;
  isRelative: boolean;
}

export interface ControllerOutput {
  id: string;
  type: 'led' | 'motor-fader' | 'lcd' | 'rgb';
  midiChannel: number;
  midiNumber: number;
  supportsColor: boolean;
}

export interface ControllerMapping {
  id: string;
  controllerId: string;
  target: MappingTarget;
  input: ControllerInput;
  transform: ValueTransform;
  feedback: boolean;
}

export type MappingTarget =
  | { type: 'transport'; action: TransportAction }
  | { type: 'mixer'; trackId: string; parameter: MixerParameter }
  | { type: 'device'; trackId: string; deviceId: string; parameterId: string }
  | { type: 'macro'; trackId: string; macroIndex: number }
  | { type: 'scene'; sceneIndex: number }
  | { type: 'clip'; trackId: string; clipSlot: number; action: ClipAction }
  | { type: 'browser'; action: BrowserAction }
  | { type: 'view'; action: ViewAction };

export type TransportAction = 
  | 'play' | 'stop' | 'record' | 'overdub' | 'metronome' 
  | 'tap-tempo' | 'undo' | 'redo' | 'loop' | 'punch-in' | 'punch-out';

export type MixerParameter = 
  | 'volume' | 'pan' | 'mute' | 'solo' | 'arm' 
  | 'send-a' | 'send-b' | 'send-c' | 'send-d' | 'select';

export type ClipAction = 'launch' | 'stop' | 'record' | 'duplicate' | 'delete';

export type BrowserAction = 'up' | 'down' | 'left' | 'right' | 'open' | 'close';

export type ViewAction = 
  | 'session' | 'arrangement' | 'detail' | 'mixer' 
  | 'browser' | 'clip' | 'device';

export interface ValueTransform {
  inputMin: number;
  inputMax: number;
  outputMin: number;
  outputMax: number;
  curve: 'linear' | 'log' | 'exp';
  invert: boolean;
}

export interface InstantMapping {
  trackId: string;
  deviceId: string;
  macroBindings: MacroBinding[];
  parameterBindings: ParameterBinding[];
}

export interface MacroBinding {
  macroIndex: number;
  inputId: string;
  name: string;
}

export interface ParameterBinding {
  parameterId: string;
  inputId: string;
  parameterSpec: PluginParameterSpec;
}

export interface RemoteScriptAPI {
  log: (...args: unknown[]) => void;
  showMessage: (message: string) => void;
  getSong: () => SongAPI;
  getRoot: () => RootAPI;
}

export interface SongAPI {
  play: () => void;
  stop: () => void;
  record: () => void;
  isPlaying: () => boolean;
  currentTime: () => number;
  getTracks: () => TrackAPI[];
  getMasterTrack: () => TrackAPI;
  getReturnTracks: () => TrackAPI[];
  getScenes: () => SceneAPI[];
  view: ViewAPI;
}

export interface TrackAPI {
  id: string;
  name: string;
  volume: ParameterAPI;
  pan: ParameterAPI;
  mute: ParameterAPI;
  solo: ParameterAPI;
  arm: ParameterAPI;
  getDevices: () => DeviceAPI[];
  getClipSlots: () => ClipSlotAPI[];
  getMacros: () => ParameterAPI[];
}

export interface DeviceAPI {
  id: string;
  name: string;
  isActive: boolean;
  getParameters: () => ParameterAPI[];
  getMacro: (index: number) => ParameterAPI | null;
}

export interface ParameterAPI {
  name: string;
  value: number;
  min: number;
  max: number;
  setValue: (value: number) => void;
  addValueListener: (callback: (value: number) => void) => void;
}

export interface ClipSlotAPI {
  hasClip: boolean;
  isPlaying: boolean;
  isRecording: boolean;
  fire: () => void;
  stop: () => void;
  deleteClip: () => void;
  duplicateClipTo: (targetSlot: ClipSlotAPI) => void;
}

export interface SceneAPI {
  name: string;
  fire: () => void;
  isPlaying: boolean;
}

export interface ViewAPI {
  selectedTrack: TrackAPI | null;
  selectedDevice: DeviceAPI | null;
  selectedScene: SceneAPI | null;
}

export interface RootAPI {
  beginUndoStep: () => void;
  endUndoStep: () => void;
}
