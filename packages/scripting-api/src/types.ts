/**
 * Core types for the Music Scripting API
 * 
 * Implements section 15.3 of the engineering spec:
 * User-facing scripting API for deterministic, programmable music generation
 */

import type { TempoEvent, AutomationTarget } from '@daw/project-schema';

// ============================================================================
// Note and Event Types
// ============================================================================

/** MIDI note number (0-127) */
export type MidiNote = number;

/** Velocity value (0-127) */
export type Velocity = number;

/** Tick position in the timeline */
export type Tick = number;

/** Duration in ticks */
export type Duration = number;

/** A single MIDI note event */
export interface NoteEvent {
  note: MidiNote;
  velocity: Velocity;
  startTick: Tick;
  duration: Duration;
  channel?: number;
}

/** CC (Continuous Controller) event */
export interface CCEvent {
  controller: number;
  value: number;
  tick: Tick;
  channel?: number;
}

/** Pitch bend event */
export interface PitchBendEvent {
  value: number; // -8192 to 8191
  tick: Tick;
  channel?: number;
}

/** Channel pressure (aftertouch) event */
export interface ChannelPressureEvent {
  pressure: number;
  tick: Tick;
  channel?: number;
}

// ============================================================================
// Scale and Chord Types
// ============================================================================

/** Musical scale definition */
export interface Scale {
  root: string;
  mode: string;
  notes: number[]; // MIDI note numbers for one octave
  intervals: number[]; // Semitone intervals from root
}

/** Chord definition */
export interface Chord {
  symbol: string;
  root: string;
  quality: string;
  notes: number[]; // MIDI note numbers (root position)
  intervals: number[]; // Semitone intervals from root
}

/** Scale mode definitions */
export type ScaleMode = 
  | 'major' | 'minor' | 'natural minor' | 'harmonic minor' | 'melodic minor'
  | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian'
  | 'pentatonic major' | 'pentatonic minor' | 'blues'
  | 'chromatic' | 'whole tone' | 'diminished';

// ============================================================================
// Builder Types
// ============================================================================

/** Pattern step (for step sequencing) */
export interface PatternStep {
  active: boolean;
  velocity: number;
  probability: number;
  timingOffset: number; // -0.5 to 0.5 (in step units)
}

/** Pattern definition */
export interface Pattern {
  length: number; // Number of steps
  steps: PatternStep[];
  division: number; // Steps per beat (4 = 16th notes)
}

/** Clip type discriminator */
export type ClipType = 'midi' | 'audio' | 'hybrid';

/** Generated clip interface */
export interface GeneratedClip {
  trackId: string;
  clip: MidiClip | AudioClip | HybridGeneratedClip;
  provenance: {
    scriptId: string;
    hash: string;
    seed: string;
    generatedAt: number;
  };
}

/** MIDI clip content */
export interface MidiClip {
  type: 'midi';
  id: string;
  name: string;
  startTick: number;
  endTick: number;
  notes: NoteEvent[];
  cc: CCEvent[];
  pitchBend: PitchBendEvent[];
  channelPressure: ChannelPressureEvent[];
  loop?: {
    startTick: number;
    endTick: number;
  };
}

/** Audio clip content */
export interface AudioClip {
  type: 'audio';
  id: string;
  name: string;
  startTick: number;
  endTick: number;
  assetId: string;
  sourceStartSample: number;
  sourceEndSample: number;
  gainDb: number;
  transposeSemitones: number;
}

/** Hybrid clip (MIDI + audio) */
export interface HybridGeneratedClip {
  type: 'hybrid';
  id: string;
  name: string;
  startTick: number;
  endTick: number;
  midiData: Omit<MidiClip, 'type'>;
  audioData?: Partial<AudioClip>;
}

/** Automation point */
export interface AutomationPoint {
  tick: number;
  value: number;
  curve: 'step' | 'linear' | 'bezier';
  controlPoints?: [number, number][]; // For bezier curves
}

/** Generated automation lane */
export interface GeneratedAutomation {
  target: AutomationTarget;
  points: AutomationPoint[];
  provenance: {
    scriptId: string;
    hash: string;
    seed: string;
    generatedAt: number;
  };
}

/** Scene definition for session view */
export interface GeneratedScene {
  name: string;
  row: number;
  clips: {
    trackId: string;
    clipId: string;
    launchQuantization?: number;
  }[];
  tempo?: number;
  timeSignature?: [number, number];
}

/** Section definition for arrangement */
export interface GeneratedSection {
  name: string;
  startTick: number;
  durationTicks: number;
  clips: GeneratedClip[];
  automation: GeneratedAutomation[];
}

// ============================================================================
// Humanization and Curves
// ============================================================================

/** Humanization options */
export interface HumanizeOptions {
  timing?: number; // 0-1, amount of timing variation in ticks
  velocity?: number; // 0-1, amount of velocity variation
  duration?: number; // 0-1, amount of duration variation
  preserveAccents?: boolean; // Keep strong beats closer to grid
}

/** Velocity curve function type */
export type VelocityFn = (input: number, position: number) => number;

// ============================================================================
// Reference Types
// ============================================================================

/** Instrument reference */
export interface InstrumentRef {
  id: string;
  type: 'builtin' | 'plugin' | 'sample';
  name: string;
}

/** Sample reference */
export interface SampleRef {
  id: string;
  path: string;
  name: string;
}

// ============================================================================
// Script Result Types
// ============================================================================

/** Script diagnostic level */
export type DiagnosticLevel = 'error' | 'warning' | 'info' | 'hint';

/** Script diagnostic message */
export interface ScriptDiagnostic {
  level: DiagnosticLevel;
  message: string;
  line?: number;
  column?: number;
  code?: string;
  source?: string;
}

/** Script module execution result */
export interface ScriptModuleResult {
  clips: GeneratedClip[];
  automation: GeneratedAutomation[];
  scenes?: GeneratedScene[];
  diagnostics?: ScriptDiagnostic[];
}

/** Script parameter specification */
export interface ScriptParameterSpec {
  id: string;
  name: string;
  kind: 'number' | 'boolean' | 'enum' | 'string';
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

/** Script module metadata */
export interface ScriptModule {
  id: string;
  name: string;
  description?: string;
  parameters: ScriptParameterSpec[];
  execute: (context: unknown) => ScriptModuleResult | Promise<ScriptModuleResult>;
}
