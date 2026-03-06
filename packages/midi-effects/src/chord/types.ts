/**
 * Chord MIDI effect types
 */

/** Single additional note in chord */
export interface ChordNote {
  /** Shift in semitones from input note (-64 to +63) */
  shift: number;
  /** Velocity as percentage of original (0-200%) */
  velocity: number;
  /** Whether this note is enabled */
  enabled: boolean;
}

/** Chord memory preset */
export interface ChordMemory {
  /** Preset name */
  name: string;
  /** Notes in the chord (relative semitones) */
  notes: number[];
  /** Velocity scaling for each note */
  velocities: number[];
}

/** Chord effect parameters */
export interface ChordParams {
  /** Up to 6 additional notes */
  notes: ChordNote[];
  /** Current chord memory preset index (-1 = none) */
  memoryIndex: number;
  /** Stored chord memories */
  memories: ChordMemory[];
  /** Input monitoring - pass through original note */
  monitorInput: boolean;
  /** Global velocity scale (0-200%) */
  globalVelocity: number;
}

/** Default chord parameters */
export const DEFAULT_CHORD_PARAMS: ChordParams = {
  notes: Array(6).fill(null).map(() => ({
    shift: 0,
    velocity: 100,
    enabled: false,
  })),
  memoryIndex: -1,
  memories: [
    { name: "Major", notes: [0, 4, 7], velocities: [100, 100, 100] },
    { name: "Minor", notes: [0, 3, 7], velocities: [100, 100, 100] },
    { name: "Diminished", notes: [0, 3, 6], velocities: [100, 100, 100] },
    { name: "Augmented", notes: [0, 4, 8], velocities: [100, 100, 100] },
    { name: "Sus4", notes: [0, 5, 7], velocities: [100, 100, 100] },
    { name: "Sus2", notes: [0, 2, 7], velocities: [100, 100, 100] },
    { name: "Major 7", notes: [0, 4, 7, 11], velocities: [100, 100, 100, 100] },
    { name: "Dominant 7", notes: [0, 4, 7, 10], velocities: [100, 100, 100, 100] },
    { name: "Minor 7", notes: [0, 3, 7, 10], velocities: [100, 100, 100, 100] },
    { name: "Power", notes: [0, 7], velocities: [100, 100] },
  ],
  monitorInput: true,
  globalVelocity: 100,
};
