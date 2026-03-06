/**
 * Smart Quantize
 * 
 * Intelligent timing correction that preserves musical feel.
 */

// ============================================================================
// Types
// ============================================================================

export type QuantizeStrength = 'light' | 'medium' | 'heavy' | 'custom';
export type QuantizeGrid = '1/1' | '1/2' | '1/4' | '1/8' | '1/8t' | '1/16' | '1/16t' | '1/32' | '1/64';

export interface QuantizeSettings {
  grid: QuantizeGrid;
  strength: number; // 0-1
  swing: number; // 0-1
  randomize: number; // 0-1, preserves human feel
  excludeStart: boolean;
  excludeEnd: boolean;
  applyTo: 'notes' | 'start' | 'end' | 'both';
}

export interface NoteEvent {
  id: string;
  pitch: number;
  start: number; // in beats
  duration: number; // in beats
  velocity: number;
}

export interface QuantizedNote extends NoteEvent {
  originalStart: number;
  shift: number; // amount shifted in beats
}

export interface GrooveTemplate {
  name: string;
  timings: number[]; // offsets from grid in beats
  velocities: number[]; // velocity scaling
  basedOn: QuantizeGrid;
}

export interface QuantizeResult {
  notes: QuantizedNote[];
  stats: {
    notesMoved: number;
    averageShift: number;
    maxShift: number;
  };
}

// ============================================================================
// Smart Quantize Engine
// ============================================================================

export interface SmartQuantizeEngine {
  quantize(notes: NoteEvent[], settings: QuantizeSettings): QuantizeResult;
  quantizeWithGroove(notes: NoteEvent[], groove: GrooveTemplate, strength: number): QuantizeResult;
  extractGroove(notes: NoteEvent[], grid: QuantizeGrid): GrooveTemplate;
  analyzeTiming(notes: NoteEvent[], grid: QuantizeGrid): TimingAnalysis;
  suggestSettings(analysis: TimingAnalysis): Partial<QuantizeSettings>;
}

export interface TimingAnalysis {
  averageDeviation: number;
  maxDeviation: number;
  swingAmount: number;
  consistency: number;
  suggestedGrid: QuantizeGrid;
  suggestedStrength: number;
}

export function createSmartQuantizeEngine(): SmartQuantizeEngine {
  function quantize(notes: NoteEvent[], settings: QuantizeSettings): QuantizeResult {
    const gridValue = getGridValue(settings.grid);
    const quantizedNotes: QuantizedNote[] = [];
    
    let totalShift = 0;
    let maxShift = 0;
    let notesMoved = 0;
    
    for (const note of notes) {
      const originalStart = note.start;
      
      // Calculate nearest grid point
      let gridPoint = Math.round(originalStart / gridValue) * gridValue;
      
      // Apply swing
      if (settings.swing > 0) {
        const isOffbeat = Math.abs(gridPoint % (gridValue * 2) - gridValue) < 0.001;
        if (isOffbeat) {
          gridPoint += settings.swing * gridValue * 0.5;
        }
      }
      
      // Calculate shift
      let shift = gridPoint - originalStart;
      
      // Apply strength
      shift *= settings.strength;
      
      // Apply randomization to preserve feel
      if (settings.randomize > 0) {
        const randomOffset = (Math.random() - 0.5) * settings.randomize * gridValue;
        shift += randomOffset;
      }
      
      // Apply to start or end
      let newStart = originalStart;
      let newDuration = note.duration;
      
      switch (settings.applyTo) {
        case 'start':
          newStart += shift;
          break;
        case 'end':
          newDuration += shift;
          break;
        case 'both':
          newStart += shift;
          newDuration += shift * 0.5;
          break;
        case 'notes':
        default:
          newStart += shift;
          break;
      }
      
      // Ensure non-negative duration
      newDuration = Math.max(0.01, newDuration);
      
      quantizedNotes.push({
        ...note,
        start: Math.max(0, newStart),
        duration: newDuration,
        originalStart,
        shift: newStart - originalStart,
      });
      
      const absShift = Math.abs(shift);
      if (absShift > 0.001) {
        notesMoved++;
        totalShift += absShift;
        maxShift = Math.max(maxShift, absShift);
      }
    }
    
    return {
      notes: quantizedNotes,
      stats: {
        notesMoved,
        averageShift: notesMoved > 0 ? totalShift / notesMoved : 0,
        maxShift,
      },
    };
  }
  
  function quantizeWithGroove(
    notes: NoteEvent[],
    groove: GrooveTemplate,
    strength: number
  ): QuantizeResult {
    const gridValue = getGridValue(groove.basedOn);
    const quantizedNotes: QuantizedNote[] = [];
    
    let totalShift = 0;
    let maxShift = 0;
    let notesMoved = 0;
    
    for (const note of notes) {
      const originalStart = note.start;
      
      // Find nearest grid step
      const stepIndex = Math.round(originalStart / gridValue);
      const gridPoint = stepIndex * gridValue;
      
      // Get groove offset
      const grooveIndex = stepIndex % groove.timings.length;
      const grooveOffset = groove.timings[grooveIndex] || 0;
      
      // Calculate target position with groove
      let targetPoint = gridPoint + grooveOffset;
      
      // Apply strength
      let shift = (targetPoint - originalStart) * strength;
      
      quantizedNotes.push({
        ...note,
        start: Math.max(0, originalStart + shift),
        originalStart,
        shift,
      });
      
      const absShift = Math.abs(shift);
      if (absShift > 0.001) {
        notesMoved++;
        totalShift += absShift;
        maxShift = Math.max(maxShift, absShift);
      }
    }
    
    return {
      notes: quantizedNotes,
      stats: {
        notesMoved,
        averageShift: notesMoved > 0 ? totalShift / notesMoved : 0,
        maxShift,
      },
    };
  }
  
  function extractGroove(notes: NoteEvent[], grid: QuantizeGrid): GrooveTemplate {
    const gridValue = getGridValue(grid);
    const timings: number[] = [];
    const velocities: number[] = [];
    
    // Group notes by grid position
    const groups = new Map<number, NoteEvent[]>();
    
    for (const note of notes) {
      const stepIndex = Math.round(note.start / gridValue);
      if (!groups.has(stepIndex)) {
        groups.set(stepIndex, []);
      }
      groups.get(stepIndex)!.push(note);
    }
    
    // Calculate average offset and velocity for each step
    const maxStep = Math.max(...groups.keys());
    const patternLength = Math.ceil(maxStep / 4) * 4; // Round up to 4 bars
    
    for (let i = 0; i < patternLength; i++) {
      const group = groups.get(i);
      if (group && group.length > 0) {
        const avgOffset = group.reduce((sum, n) => 
          sum + (n.start - i * gridValue), 0) / group.length;
        const avgVelocity = group.reduce((sum, n) => sum + n.velocity, 0) / group.length;
        
        timings.push(avgOffset);
        velocities.push(avgVelocity / 127);
      } else {
        timings.push(0);
        velocities.push(0);
      }
    }
    
    return {
      name: 'Extracted Groove',
      timings,
      velocities,
      basedOn: grid,
    };
  }
  
  function analyzeTiming(notes: NoteEvent[], grid: QuantizeGrid): TimingAnalysis {
    const gridValue = getGridValue(grid);
    const deviations: number[] = [];
    let offbeatCount = 0;
    let offbeatShift = 0;
    
    for (const note of notes) {
      const gridPoint = Math.round(note.start / gridValue) * gridValue;
      const deviation = note.start - gridPoint;
      deviations.push(Math.abs(deviation));
      
      // Check if offbeat (between grid points)
      const normalizedPos = (note.start % (gridValue * 2)) / gridValue;
      if (normalizedPos > 0.4 && normalizedPos < 0.6) {
        offbeatCount++;
        offbeatShift += deviation;
      }
    }
    
    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length || 0;
    const maxDeviation = Math.max(...deviations, 0);
    
    // Estimate swing
    const swingAmount = offbeatCount > 0 ? offbeatShift / offbeatCount / gridValue : 0;
    
    // Calculate consistency
    const variance = deviations.reduce((sum, d) => 
      sum + Math.pow(d - avgDeviation, 2), 0) / deviations.length || 0;
    const consistency = Math.max(0, 1 - variance / (gridValue * gridValue));
    
    return {
      averageDeviation: avgDeviation,
      maxDeviation,
      swingAmount: Math.max(0, Math.min(1, swingAmount + 0.5)),
      consistency,
      suggestedGrid: grid,
      suggestedStrength: avgDeviation > gridValue * 0.3 ? 0.8 : 0.5,
    };
  }
  
  function suggestSettings(analysis: TimingAnalysis): Partial<QuantizeSettings> {
    return {
      grid: analysis.suggestedGrid,
      strength: analysis.suggestedStrength,
      swing: analysis.swingAmount,
      randomize: analysis.consistency > 0.8 ? 0.1 : 0.05,
      applyTo: 'notes',
    };
  }
  
  function getGridValue(grid: QuantizeGrid): number {
    const values: Record<QuantizeGrid, number> = {
      '1/1': 4,
      '1/2': 2,
      '1/4': 1,
      '1/8': 0.5,
      '1/8t': 1/3,
      '1/16': 0.25,
      '1/16t': 1/6,
      '1/32': 0.125,
      '1/64': 0.0625,
    };
    return values[grid];
  }
  
  return {
    quantize,
    quantizeWithGroove,
    extractGroove,
    analyzeTiming,
    suggestSettings,
  };
}

// ============================================================================
// Built-in Groove Templates
// ============================================================================

export const BUILT_IN_GROOVES: GrooveTemplate[] = [
  {
    name: 'Straight',
    timings: [0, 0, 0, 0],
    velocities: [1, 1, 1, 1],
    basedOn: '1/16',
  },
  {
    name: 'Shuffle',
    timings: [0, 0, 0.08, 0, 0, 0, 0.08, 0],
    velocities: [1, 0.9, 1, 0.9, 1, 0.9, 1, 0.9],
    basedOn: '1/16',
  },
  {
    name: 'Triplet Feel',
    timings: [0, 0, 0, 0, 0, 0],
    velocities: [1, 0.85, 0.7, 1, 0.85, 0.7],
    basedOn: '1/16t',
  },
  {
    name: ' MPC 60% Swing',
    timings: [0, 0, 0.06, 0, 0, 0, 0.06, 0],
    velocities: [1, 0.95, 1, 0.95, 1, 0.95, 1, 0.95],
    basedOn: '1/16',
  },
  {
    name: ' MPC 75% Swing',
    timings: [0, 0, 0.1, 0, 0, 0, 0.1, 0],
    velocities: [1, 0.9, 1, 0.9, 1, 0.9, 1, 0.9],
    basedOn: '1/16',
  },
  {
    name: 'Drunk Drummer',
    timings: [0.02, -0.01, 0.03, -0.02, 0.01, -0.03, 0.02, -0.01],
    velocities: [0.95, 0.9, 1, 0.85, 0.95, 0.9, 1, 0.85],
    basedOn: '1/16',
  },
];
