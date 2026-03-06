/**
 * Groove Pool types
 */

// ============================================================================
// Groove Definition
// ============================================================================

export interface Groove {
  id: string;
  name: string;
  path?: string;
  
  // Timing information extracted from source
  timingPoints: TimingPoint[];
  
  // Groove parameters
  base: number; // Base quantization (1 = quarter note, 0.5 = 8th, etc.)
  quantize: number; // 0-100, how much quantization to apply
  timing: number; // -100 to 100, timing intensity
  random: number; // 0-100, random timing amount
  velocity: number; // -100 to 100, velocity intensity
  duration: number; // -100 to 100, duration intensity
  
  // Source info
  sourceClipId?: string;
  sourceTempo?: number;
  
  // Metadata
  author?: string;
  description?: string;
  tags: string[];
}

export interface TimingPoint {
  position: number; // Beat position
  velocity: number; // 0-1, relative velocity deviation
  duration: number; // Duration deviation in beats
  timing: number; // Timing deviation in beats
}

// ============================================================================
// Groove Pool
// ============================================================================

export interface GroovePool {
  grooves: Groove[];
  currentGrooveId: string | null;
}

// ============================================================================
// Extraction Settings
// ============================================================================

export interface GrooveExtractionSettings {
  base: number; // Base note value to extract
  velocityAmount: number; // 0-1, how much velocity to extract
  durationAmount: number; // 0-1, how much duration to extract
  timingAmount: number; // 0-1, how much timing to extract
}

export const DEFAULT_EXTRACTION_SETTINGS: GrooveExtractionSettings = {
  base: 0.25, // 16th notes
  velocityAmount: 1.0,
  durationAmount: 0.5,
  timingAmount: 1.0,
};

// ============================================================================
// Application Settings
// ============================================================================

export interface GrooveApplicationSettings {
  timing: number; // -100 to 100
  random: number; // 0 to 100
  velocity: number; // -100 to 100
  duration: number; // -100 to 100
  quantize: number; // 0 to 100
}

export const DEFAULT_APPLICATION_SETTINGS: GrooveApplicationSettings = {
  timing: 100,
  random: 0,
  velocity: 100,
  duration: 100,
  quantize: 0,
};

// ============================================================================
// AGR File Format
// ============================================================================

export interface AGRFile {
  version: string;
  groove: Groove;
}

// ============================================================================
// Events
// ============================================================================

export type GrooveEventType =
  | 'groove-added'
  | 'groove-removed'
  | 'groove-applied'
  | 'groove-committed';

export interface GrooveEvent {
  type: GrooveEventType;
  timestamp: number;
  grooveId: string;
  data?: unknown;
}

export type GrooveEventHandler = (event: GrooveEvent) => void;
