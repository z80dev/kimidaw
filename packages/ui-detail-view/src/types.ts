/**
 * Detail View types
 * Based on Ableton's clip detail view
 */

import type { AudioClip, MidiClip, AutomationLane, WarpMarker } from '@daw/project-schema';

export type DetailViewTab = 'clip' | 'envelopes' | 'launch' | 'sample' | 'midi';

export interface DetailViewState {
  activeTab: DetailViewTab;
  selectedClipId: string | null;
  zoom: {
    horizontal: number; // 0.1 to 10
    vertical: number;
  };
  scrollPosition: {
    x: number;
    y: number;
  };
  showGrid: boolean;
  snapToGrid: boolean;
  gridDivision: number;
}

export interface ClipEditorState {
  isEditing: boolean;
  tool: ClipEditTool;
  selection: ClipSelection | null;
  loop: LoopState;
  timeSelection: TimeSelection | null;
}

export type ClipEditTool = 
  | 'selector' 
  | 'pencil' 
  | 'eraser' 
  | 'scissors' 
  | 'draw';

export interface ClipSelection {
  startTime: number;
  endTime: number;
  startPitch?: number;
  endPitch?: number;
}

export interface TimeSelection {
  startTick: number;
  endTick: number;
}

export interface LoopState {
  enabled: boolean;
  startTick: number;
  endTick: number;
}

export interface SampleEditorState {
  warpMode: WarpMode;
  transposeSemitones: number;
  detuneCents: number;
  gainDb: number;
  reverse: boolean;
  showTransientMarkers: boolean;
  showWarpMarkers: boolean;
  showGrid: boolean;
  selectedWarpMarker: string | null;
}

export type WarpMode =
  | 'repitch'
  | 'beats' 
  | 'tones'
  | 'texture'
  | 're-pitch'
  | 'complex'
  | 'complex-pro'
  | 'rays'
  | 'crystals'
  | 'spectral'
  | 'granular'
  | 'formants';

export interface MidiEditorState {
  showVelocity: boolean;
  showModulation: boolean;
  showPitchBend: boolean;
  showAftertouch: boolean;
  showNoteNames: boolean;
  foldMode: FoldMode;
  scaleHighlight: ScaleHighlight | null;
}

export type FoldMode = 'none' | 'to-scale' | 'to-used';

export interface ScaleHighlight {
  rootNote: number;
  mode: ScaleMode;
}

export type ScaleMode =
  | 'major'
  | 'minor'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'
  | 'pentatonic-major'
  | 'pentatonic-minor'
  | 'blues';

export interface EnvelopeLane {
  id: string;
  name: string;
  target: EnvelopeTarget;
  color: string;
  isVisible: boolean;
  isEditing: boolean;
}

export interface EnvelopeTarget {
  type: 'volume' | 'pan' | 'send' | 'device-param';
  trackId?: string;
  deviceId?: string;
  paramId?: string;
  sendIndex?: number;
}

export interface LaunchSettingsState {
  quantization: LaunchQuantization;
  followAction: FollowAction | null;
  launchMode: LaunchMode;
  velocitySensitivity: boolean;
  legato: boolean;
}

export type LaunchQuantization =
  | 'none'
  | '8th'
  | '8th-triplet'
  | '16th'
  | '16th-triplet'
  | '32nd'
  | '32nd-triplet'
  | '64th'
  | 'global';

export type LaunchMode = 
  | 'trigger' 
  | 'gate' 
  | 'toggle' 
  | 'repeat';

export interface FollowAction {
  type: 'next' | 'previous' | 'first' | 'last' | 'any' | 'other' | 'self';
  chance: number; // 0-100
  afterBars: number;
}

export interface MidiEffectChain {
  preEffects: MidiEffect[];
  postEffects: MidiEffect[];
}

export interface MidiEffect {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  params: Record<string, number>;
}
