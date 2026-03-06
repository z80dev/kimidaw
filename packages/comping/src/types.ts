/**
 * Comping and take lane types
 * Based on Ableton's take lane and comping features
 */

import type { AudioClip, MidiClip } from '@daw/project-schema';

export type TakeLaneType = 'audio' | 'midi';

export interface TakeLane {
  id: string;
  trackId: string;
  name: string;
  type: TakeLaneType;
  clips: (AudioClip | MidiClip)[];
  isActive: boolean;
  isMuted: boolean;
  color: string;
  order: number; // Vertical position
  metadata: {
    recordDate: number;
    takeNumber: number;
    notes?: string;
  };
}

export interface CompRegion {
  id: string;
  takeLaneId: string;
  clipId: string;
  startTick: number;
  endTick: number;
  fadeInSamples: number;
  fadeOutSamples: number;
  crossfadeIn: CrossfadeConfig | null;
  crossfadeOut: CrossfadeConfig | null;
}

export interface CrossfadeConfig {
  durationSamples: number;
  curve: FadeCurve;
}

export type FadeCurve = 
  | 'linear'
  | 'equal-power'
  | 's-curve'
  | 'exponential'
  | 'logarithmic';

export interface CompTake {
  id: string;
  regions: CompRegion[];
  isFlattened: boolean;
  flattenedClipId?: string;
}

export interface TakeLaneGroup {
  id: string;
  trackId: string;
  lanes: TakeLane[];
  activeComp: CompTake;
  history: CompTake[]; // Previous comp versions
}

export interface CompingOptions {
  autoCrossfade: boolean;
  defaultCrossfadeMs: number;
  defaultFadeCurve: FadeCurve;
  snapToZeroCrossings: boolean;
  quantizeCompEdits: boolean;
  compGridDivision: number;
}

export interface CompEditCommand {
  type: 'select' | 'deselect' | 'move' | 'resize' | 'delete' | 'duplicate';
  regionId?: string;
  takeLaneId?: string;
  startTick?: number;
  endTick?: number;
}

export interface CompingState {
  isComping: boolean;
  currentTool: CompTool;
  selectedRegions: string[];
  auditionOnSelect: boolean;
  showAllTakes: boolean;
  groupTakes: boolean;
}

export type CompTool = 
  | 'selector'    // Select regions
  | 'eraser'      // Remove regions from comp
  | 'draw'        // Draw selection on specific take
  | 'swipe';      // Swipe to select (like Ableton's comp tool)

export interface CompingPreferences {
  autoCreateTakeLanes: boolean;
  cycleRecordMode: CycleRecordMode;
  maxTakesPerLane: number;
  autoColorTakes: boolean;
  showTakeNumbers: boolean;
}

export type CycleRecordMode = 
  | 'create-new-lane'      // Each cycle creates new lane
  | ' overdub-current'     // Overdub on current lane
  | 'stack-takes';         // Stack takes in single lane
