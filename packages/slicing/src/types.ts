/**
 * Audio slicing types
 * Based on Ableton's "Slice to New MIDI Track" feature
 */

export type SliceMode = 'transient' | 'beat' | 'region' | 'manual';

export interface SlicePoint {
  id: string;
  time: number; // seconds
  samplePosition: number;
  type: 'transient' | 'beat' | 'manual';
  strength: number; // 0-1, for transient detection
}

export interface SliceSettings {
  mode: SliceMode;
  sensitivity: number; // 0-100, for transient detection
  sliceBy: SliceBy;
  preserveWarpMarkers: boolean;
}

export type SliceBy = 
  | { type: 'transient'; minTimeMs: number }
  | { type: 'beat'; division: BeatDivision }
  | { type: 'region'; numSlices: number }
  | { type: 'manual'; points: number[] };

export type BeatDivision = 
  | '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32'
  | '1/2t' | '1/4t' | '1/8t' | '1/16t' | '1/32t' // triplets
  | '1/2d' | '1/4d' | '1/8d' | '1/16d' | '1/32d'; // dotted

export interface SliceResult {
  slices: AudioSlice[];
  mode: SliceMode;
  originalDuration: number;
  sampleRate: number;
}

export interface AudioSlice {
  index: number;
  startTime: number;
  endTime: number;
  startSample: number;
  endSample: number;
  duration: number;
  midiNote: number; // Assigned note for drum rack
}

export interface DrumRackPad {
  note: number;
  name: string;
  slice: AudioSlice;
  chain: {
    sampleStart: number;
    sampleEnd: number;
    gainDb: number;
    pan: number;
    tuning: number;
  };
}

export interface SlicedMidiClip {
  name: string;
  notes: SlicedNote[];
  drumRackMapping: Map<number, DrumRackPad>;
}

export interface SlicedNote {
  startTicks: number;
  durationTicks: number;
  midiNote: number;
  velocity: number;
}

export interface TransientOptions {
  sensitivity: number; // 0-100
  minTimeMs: number; // minimum time between transients
  threshold: number; // amplitude threshold
}

export interface BeatSliceOptions {
  bpm: number;
  division: BeatDivision;
  swing: number; // 0-100
}

export interface RegionSliceOptions {
  numSlices: number;
  equalDuration: boolean;
}
