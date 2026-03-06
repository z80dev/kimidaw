/**
 * @daw/grooves - Groove Pool and Humanization
 * 
 * Timing templates for humanizing MIDI clips.
 * Extract grooves from clips, apply to other clips, commit timing changes.
 * 
 * @example
 * ```typescript
 * import {
 *   createGroovePoolManager,
 *   createGrooveExtractor,
 *   createGrooveApplier,
 *   createSwingGroove,
 * } from "@daw/grooves";
 * 
 * // Create groove pool
 * const pool = createGroovePoolManager();
 * await pool.loadFactoryGrooves();
 * 
 * // Extract groove from a clip
 * const extractor = createGrooveExtractor();
 * const groove = extractor.extractGroove(notes, "My Groove");
 * pool.addGroove(groove);
 * 
 * // Apply groove to another clip
 * const applier = createGrooveApplier();
 * const modifiedNotes = applier.applyGroove(targetNotes, groove, {
 *   timing: 75,
 *   velocity: 50,
 * });
 * 
 * // Create swing groove
 * const swing16 = createSwingGroove("Swing 16th", 57); // 57% swing
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  Groove,
  TimingPoint,
  GroovePool,
  GrooveExtractionSettings,
  GrooveApplicationSettings,
  AGRFile,
  GrooveEvent,
  GrooveEventType,
  GrooveEventHandler,
} from './types.js';

export {
  DEFAULT_EXTRACTION_SETTINGS,
  DEFAULT_APPLICATION_SETTINGS,
} from './types.js';

// ============================================================================
// Groove Pool
// ============================================================================

export {
  createGroovePoolManager,
  type GroovePoolManager,
} from './GroovePool.js';

// ============================================================================
// Groove Extractor
// ============================================================================

export {
  createGrooveExtractor,
  extractFromClip,
  type GrooveExtractor,
  type GrooveAnalysis,
} from './GrooveExtractor.js';

// ============================================================================
// Groove Applier
// ============================================================================

export {
  createGrooveApplier,
  createGrooveTracker,
  calculateSwingAmount,
  createSwingGroove,
  type GrooveApplier,
  type AppliedGroove,
  type GrooveApplication,
} from './GrooveApplier.js';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quantize notes to a grid
 */
export function quantizeNotes(
  notes: Array<{ start: number; [key: string]: unknown }>,
  grid: number,
  strength: number = 1.0
): Array<{ start: number; [key: string]: unknown }> {
  return notes.map(note => {
    const quantized = Math.round(note.start / grid) * grid;
    const newStart = note.start + (quantized - note.start) * strength;

    return {
      ...note,
      start: newStart,
    };
  });
}

/**
 * Humanize notes with random timing variations
 */
export function humanizeNotes(
  notes: Array<{ start: number; velocity: number; [key: string]: unknown }>,
  timingAmount: number,
  velocityAmount: number
): Array<{ start: number; velocity: number; [key: string]: unknown }> {
  return notes.map(note => {
    const timingOffset = (Math.random() - 0.5) * timingAmount;
    const velocityOffset = Math.floor((Math.random() - 0.5) * velocityAmount);

    return {
      ...note,
      start: note.start + timingOffset,
      velocity: Math.max(1, Math.min(127, note.velocity + velocityOffset)),
    };
  });
}

/**
 * Calculate velocity scaling
 */
export function scaleVelocity(velocity: number, amount: number): number {
  // Amount: -100 to 100
  // Negative = compress, Positive = expand
  const center = 64;
  const diff = velocity - center;
  const scaled = center + diff * (1 + amount / 100);
  return Math.max(1, Math.min(127, Math.round(scaled)));
}

/**
 * Shift notes by a fixed amount
 */
export function shiftNotes(
  notes: Array<{ start: number; [key: string]: unknown }>,
  shiftAmount: number
): Array<{ start: number; [key: string]: unknown }> {
  return notes.map(note => ({
    ...note,
    start: note.start + shiftAmount,
  }));
}

/**
 * Snap notes to the nearest timing point
 */
export function snapToGrid(
  notes: Array<{ start: number; [key: string]: unknown }>,
  grid: number
): Array<{ start: number; [key: string]: unknown }> {
  return notes.map(note => ({
    ...note,
    start: Math.round(note.start / grid) * grid,
  }));
}

// ============================================================================
// Common Grooves
// ============================================================================

/**
 * Standard shuffle groove (triplet feel)
 */
export function createShuffleGroove(intensity: number = 50): import('./types.js').Groove {
  const timing = (intensity / 100) * 0.033;

  return {
    id: `shuffle-${Date.now()}`,
    name: `Shuffle ${intensity}%`,
    timingPoints: [
      { position: 0.5, timing, velocity: 0.1, duration: 0 },
      { position: 1.5, timing, velocity: 0.1, duration: 0 },
      { position: 2.5, timing, velocity: 0.1, duration: 0 },
      { position: 3.5, timing, velocity: 0.1, duration: 0 },
    ],
    base: 0.5,
    quantize: 0,
    timing: intensity,
    random: 0,
    velocity: intensity * 0.5,
    duration: 0,
    tags: ['shuffle', 'triplet'],
  };
}

/**
 * MPC-style 16th note swing
 */
export function createMPCGroove(swingAmount: number = 50): import('./types.js').Groove {
  // MPC swing affects only off-beats
  const timing = (swingAmount / 100) * 0.05;

  return {
    id: `mpc-${Date.now()}`,
    name: `MPC Swing ${swingAmount}%`,
    timingPoints: [
      { position: 0.25, timing: timing * 0.3, velocity: 0, duration: 0 },
      { position: 0.5, timing: timing, velocity: 0, duration: 0 },
      { position: 0.75, timing: timing * 0.6, velocity: 0, duration: 0 },
      { position: 1, timing: 0, velocity: 0, duration: 0 },
    ].flatMap(p => [
      p,
      { ...p, position: p.position + 1 },
      { ...p, position: p.position + 2 },
      { ...p, position: p.position + 3 },
    ]),
    base: 0.25,
    quantize: 0,
    timing: swingAmount,
    random: 0,
    velocity: 0,
    duration: 0,
    tags: ['mpc', 'swing', '16th'],
  };
}

/**
 * Create a custom timing map
 */
export function createTimingMap(
  divisions: number,
  timingValues: number[]
): import('./types.js').TimingPoint[] {
  const step = 4 / divisions; // Assuming 4-beat loop

  return timingValues.map((timing, i) => ({
    position: i * step,
    timing,
    velocity: 0,
    duration: 0,
  }));
}

// ============================================================================
// Version
// ============================================================================

export const VERSION = '0.1.0';
