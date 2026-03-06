/**
 * Groove Extractor - Extract timing from MIDI clips
 */

import type { 
  Groove, 
  TimingPoint, 
  GrooveExtractionSettings 
} from './types.js';
import { DEFAULT_EXTRACTION_SETTINGS } from './types.js';

// Simple MIDI note interface
interface MidiNote {
  start: number; // Beat position
  velocity: number; // 0-127
  duration: number; // In beats
}

export interface GrooveExtractor {
  extractGroove(
    notes: MidiNote[],
    name: string,
    settings?: Partial<GrooveExtractionSettings>
  ): Groove;
  analyzeGroove(notes: MidiNote[]): GrooveAnalysis;
}

export interface GrooveAnalysis {
  noteDensity: number; // Notes per beat
  averageVelocity: number;
  velocityRange: number;
  timingDeviation: number; // Average timing deviation
  suggestedBase: number;
}

export function createGrooveExtractor(): GrooveExtractor {
  function extractGroove(
    notes: MidiNote[],
    name: string,
    settings: Partial<GrooveExtractionSettings> = {}
  ): Groove {
    const opts = { ...DEFAULT_EXTRACTION_SETTINGS, ...settings };

    if (notes.length === 0) {
      return createEmptyGroove(name);
    }

    // Sort notes by position
    const sortedNotes = [...notes].sort((a, b) => a.start - b.start);

    // Analyze timing
    const analysis = analyzeGroove(sortedNotes);

    // Quantize to base grid
    const quantizedNotes = sortedNotes.map(note => ({
      ...note,
      quantizedStart: Math.round(note.start / opts.base) * opts.base,
    }));

    // Extract timing points
    const timingPoints: TimingPoint[] = [];

    for (const note of quantizedNotes) {
      const timing = note.quantizedStart - note.start;
      const velocityDev = (note.velocity - analysis.averageVelocity) / 127;

      timingPoints.push({
        position: note.quantizedStart,
        timing: timing * opts.timingAmount,
        velocity: velocityDev * opts.velocityAmount,
        duration: 0, // Simplified - could extract duration deviations
      });
    }

    // Remove duplicates (keep the first occurrence at each position)
    const uniquePoints = new Map<number, TimingPoint>();
    for (const point of timingPoints) {
      if (!uniquePoints.has(point.position)) {
        uniquePoints.set(point.position, point);
      }
    }

    return {
      id: `extracted-${Date.now()}`,
      name,
      timingPoints: Array.from(uniquePoints.values()).sort(
        (a, b) => a.position - b.position
      ),
      base: analysis.suggestedBase,
      quantize: 0,
      timing: 100,
      random: 0,
      velocity: 100,
      duration: 100,
      tags: ['extracted'],
    };
  }

  function analyzeGroove(notes: MidiNote[]): GrooveAnalysis {
    if (notes.length === 0) {
      return {
        noteDensity: 0,
        averageVelocity: 64,
        velocityRange: 0,
        timingDeviation: 0,
        suggestedBase: 0.25,
      };
    }

    // Calculate note density
    const maxBeat = Math.max(...notes.map(n => n.start));
    const noteDensity = maxBeat > 0 ? notes.length / maxBeat : 0;

    // Calculate velocity statistics
    const velocities = notes.map(n => n.velocity);
    const averageVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const minVel = Math.min(...velocities);
    const maxVel = Math.max(...velocities);
    const velocityRange = maxVel - minVel;

    // Calculate timing deviation
    const baseGrid = suggestBaseGrid(notes);
    let totalDeviation = 0;
    for (const note of notes) {
      const quantized = Math.round(note.start / baseGrid) * baseGrid;
      totalDeviation += Math.abs(note.start - quantized);
    }
    const timingDeviation = totalDeviation / notes.length;

    return {
      noteDensity,
      averageVelocity,
      velocityRange,
      timingDeviation,
      suggestedBase: baseGrid,
    };
  }

  function suggestBaseGrid(notes: MidiNote[]): number {
    if (notes.length < 2) return 0.25;

    // Calculate intervals between notes
    const sorted = [...notes].sort((a, b) => a.start - b.start);
    const intervals: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      intervals.push(sorted[i].start - sorted[i - 1].start);
    }

    if (intervals.length === 0) return 0.25;

    // Find most common interval
    const intervalCounts = new Map<number, number>();
    for (const interval of intervals) {
      // Round to nearest common grid value
      const rounded = roundToGrid(interval);
      intervalCounts.set(rounded, (intervalCounts.get(rounded) || 0) + 1);
    }

    // Find the most common
    let mostCommon = 0.25;
    let maxCount = 0;

    for (const [interval, count] of intervalCounts) {
      if (count > maxCount && interval > 0) {
        maxCount = count;
        mostCommon = interval;
      }
    }

    return mostCommon;
  }

  function roundToGrid(interval: number): number {
    const commonGrids = [1, 0.5, 0.25, 0.125, 0.0625, 0.333, 0.166];
    let closest = commonGrids[0];
    let minDiff = Math.abs(interval - closest);

    for (const grid of commonGrids) {
      const diff = Math.abs(interval - grid);
      if (diff < minDiff) {
        minDiff = diff;
        closest = grid;
      }
    }

    return closest;
  }

  function createEmptyGroove(name: string): Groove {
    return {
      id: `empty-${Date.now()}`,
      name,
      timingPoints: [],
      base: 0.25,
      quantize: 0,
      timing: 100,
      random: 0,
      velocity: 100,
      duration: 100,
      tags: ['empty'],
    };
  }

  return {
    extractGroove,
    analyzeGroove,
  };
}

/**
 * Extract groove from a clip
 */
export function extractFromClip(
  clipId: string,
  notes: MidiNote[],
  tempo: number
): Groove {
  const extractor = createGrooveExtractor();
  const groove = extractor.extractGroove(notes, `Groove from ${clipId}`);
  
  groove.sourceClipId = clipId;
  groove.sourceTempo = tempo;
  
  return groove;
}
