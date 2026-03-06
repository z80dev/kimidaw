/**
 * Groove Applier - Apply grooves to MIDI clips
 */

import type { 
  Groove, 
  TimingPoint, 
  GrooveApplicationSettings 
} from './types.js';
import { DEFAULT_APPLICATION_SETTINGS } from './types.js';

// MIDI note interface
interface MidiNote {
  id: string;
  start: number; // Beat position
  velocity: number; // 0-127
  duration: number; // In beats
}

export interface GrooveApplier {
  applyGroove(
    notes: MidiNote[],
    groove: Groove,
    settings?: Partial<GrooveApplicationSettings>
  ): MidiNote[];
  commitGroove(notes: MidiNote[]): MidiNote[];
  previewGroove(notes: MidiNote[], groove: Groove): MidiNote[];
}

export interface AppliedGroove {
  originalNotes: MidiNote[];
  modifiedNotes: MidiNote[];
  grooveId: string;
  settings: GrooveApplicationSettings;
}

export function createGrooveApplier(): GrooveApplier {
  function applyGroove(
    notes: MidiNote[],
    groove: Groove,
    settings: Partial<GrooveApplicationSettings> = {}
  ): MidiNote[] {
    const opts = { ...DEFAULT_APPLICATION_SETTINGS, ...settings };

    if (notes.length === 0 || groove.timingPoints.length === 0) {
      return [...notes];
    }

    // Apply quantization first if enabled
    let processedNotes = opts.quantize > 0
      ? applyQuantization(notes, groove.base, opts.quantize / 100)
      : [...notes];

    // Apply groove
    processedNotes = processedNotes.map(note => {
      // Find matching timing point
      const timingPoint = findTimingPoint(note.start, groove.timingPoints, groove.base);

      if (!timingPoint) {
        return note;
      }

      // Calculate timing offset
      const timingScale = opts.timing / 100;
      const timingOffset = timingPoint.timing * timingScale;

      // Calculate velocity change
      const velocityScale = opts.velocity / 100;
      const velocityChange = timingPoint.velocity * velocityScale * 127;

      // Apply random timing if enabled
      const randomOffset = opts.random > 0
        ? (Math.random() - 0.5) * (opts.random / 100) * groove.base * 0.5
        : 0;

      // Apply changes
      return {
        ...note,
        start: note.start + timingOffset + randomOffset,
        velocity: clamp(note.velocity + velocityChange, 1, 127),
      };
    });

    return processedNotes;
  }

  function commitGroove(notes: MidiNote[]): MidiNote[] {
    // "Commit" just returns the notes as-is
    // The idea is that the groove has been applied and is now "baked in"
    return [...notes];
  }

  function previewGroove(
    notes: MidiNote[],
    groove: Groove
  ): MidiNote[] {
    // Preview applies the groove at full strength for demonstration
    return applyGroove(notes, groove, {
      timing: 100,
      velocity: 100,
      duration: 100,
      random: 0,
      quantize: 0,
    });
  }

  function applyQuantization(
    notes: MidiNote[],
    grid: number,
    strength: number
  ): MidiNote[] {
    return notes.map(note => {
      const quantized = Math.round(note.start / grid) * grid;
      const newStart = note.start + (quantized - note.start) * strength;

      return {
        ...note,
        start: newStart,
      };
    });
  }

  function findTimingPoint(
    position: number,
    timingPoints: TimingPoint[],
    base: number
  ): TimingPoint | null {
    // Find the closest timing point
    let closest: TimingPoint | null = null;
    let minDistance = Infinity;

    for (const point of timingPoints) {
      // Check if this note aligns with this timing point (within base/2 tolerance)
      const distance = Math.abs(position - point.position);
      const wrappedDistance = Math.min(
        distance,
        Math.abs(distance - 4) // Handle loop wrap-around (4 beats)
      );

      if (wrappedDistance < base / 2 && wrappedDistance < minDistance) {
        minDistance = wrappedDistance;
        closest = point;
      }
    }

    return closest;
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  return {
    applyGroove,
    commitGroove,
    previewGroove,
  };
}

/**
 * Apply groove to a clip and track the application
 */
export interface GrooveApplication {
  clipId: string;
  grooveId: string;
  settings: GrooveApplicationSettings;
  isCommitted: boolean;
}

export function createGrooveTracker() {
  const applications = new Map<string, GrooveApplication>();

  function apply(
    clipId: string,
    grooveId: string,
    settings: GrooveApplicationSettings
  ): void {
    applications.set(clipId, {
      clipId,
      grooveId,
      settings,
      isCommitted: false,
    });
  }

  function commit(clipId: string): void {
    const app = applications.get(clipId);
    if (app) {
      app.isCommitted = true;
    }
  }

  function remove(clipId: string): void {
    applications.delete(clipId);
  }

  function get(clipId: string): GrooveApplication | undefined {
    return applications.get(clipId);
  }

  function getAll(): GrooveApplication[] {
    return Array.from(applications.values());
  }

  return {
    apply,
    commit,
    remove,
    get,
    getAll,
  };
}

/**
 * Calculate how much "swing" a groove has
 */
export function calculateSwingAmount(groove: Groove): number {
  if (groove.timingPoints.length === 0) return 0;

  // Look for timing points that are on off-beats with positive timing
  let swingPoints = 0;
  let totalSwing = 0;

  for (const point of groove.timingPoints) {
    // Check if this is an off-beat (e.g., 8th note position)
    const isOffBeat = Math.abs(point.position % 0.5 - 0.25) < 0.01 ||
                      Math.abs(point.position % 1 - 0.5) < 0.01;

    if (isOffBeat && point.timing > 0) {
      swingPoints++;
      totalSwing += point.timing;
    }
  }

  if (swingPoints === 0) return 0;

  // Return average swing as percentage
  return (totalSwing / swingPoints) * 100;
}

/**
 * Create a swing groove with specified amount
 */
export function createSwingGroove(
  name: string,
  swingPercent: number,
  base: number = 0.5
): Groove {
  const timingAmount = (swingPercent / 100) * base * 0.5;

  return {
    id: `swing-${Date.now()}`,
    name,
    timingPoints: [
      { position: base, timing: timingAmount, velocity: 0, duration: 0 },
      { position: 1 + base, timing: timingAmount, velocity: 0, duration: 0 },
      { position: 2 + base, timing: timingAmount, velocity: 0, duration: 0 },
      { position: 3 + base, timing: timingAmount, velocity: 0, duration: 0 },
    ],
    base,
    quantize: 0,
    timing: 100,
    random: 0,
    velocity: 0,
    duration: 0,
    tags: ['swing', 'generated'],
  };
}
