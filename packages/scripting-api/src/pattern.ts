/**
 * PatternBuilder - Fluent API for constructing rhythmic patterns
 * 
 * Chainable builder for creating drum patterns, melodic sequences,
 * and other rhythmic structures.
 */

import type { NoteEvent, PatternStep, Pattern } from './types';
import type { PRNG } from './prng';
import { euclidean, patternToOnsets, RHYTHM_PRESETS } from './euclidean';

/** Step transformation function */
type StepTransform = (step: PatternStep, index: number, total: number) => PatternStep;

/** Pattern builder options */
interface PatternBuilderOptions {
  steps?: number;
  division?: number; // Steps per beat (4 = 16th notes)
  seed?: PRNG;
}

/**
 * PatternBuilder - Fluent API for creating rhythmic patterns
 * 
 * @example
 * ```typescript
 * const pattern = ctx.pattern()
 *   .steps(16)
 *   .euclidean(5)
 *   .velocity(100, 40)
 *   .humanize(0.1)
 *   .build();
 * ```
 */
export class PatternBuilder {
  private steps: number;
  private division: number;
  private prng?: PRNG;
  private transforms: StepTransform[] = [];
  private basePattern: number[] | null = null;

  constructor(options: PatternBuilderOptions = {}) {
    this.steps = options.steps ?? 16;
    this.division = options.division ?? 4;
    this.prng = options.seed;
  }

  /** Set number of steps */
  length(steps: number): this {
    this.steps = steps;
    return this;
  }

  /** Alias for length */
  steps(count: number): this {
    return this.length(count);
  }

  /** Set subdivision (steps per beat) */
  subdiv(division: number): this {
    this.division = division;
    return this;
  }

  /** Set the PRNG for randomization */
  seed(prng: PRNG): this {
    this.prng = prng;
    return this;
  }

  // ============================================================================
  // Pattern Sources
  // ============================================================================

  /** Use Euclidean rhythm as base pattern */
  euclidean(pulses: number, rotation = 0): this {
    this.basePattern = euclidean(this.steps, pulses, rotation);
    return this;
  }

  /** Set pattern from array (1 = pulse, 0 = rest) */
  fromArray(pattern: number[]): this {
    this.basePattern = [...pattern];
    this.steps = pattern.length;
    return this;
  }

  /** Use a preset rhythm */
  preset(name: keyof typeof RHYTHM_PRESETS): this {
    this.basePattern = RHYTHM_PRESETS[name]();
    this.steps = this.basePattern.length;
    return this;
  }

  /** Fill all steps */
  fill(): this {
    this.basePattern = new Array(this.steps).fill(1);
    return this;
  }

  /** Clear all steps */
  clear(): this {
    this.basePattern = new Array(this.steps).fill(0);
    return this;
  }

  /** Every Nth step */
  every(n: number, offset = 0): this {
    this.basePattern = new Array(this.steps).fill(0).map((_, i) => 
      ((i - offset) % n === 0) ? 1 : 0
    );
    return this;
  }

  // ============================================================================
  // Transformations
  // ============================================================================

  /** Apply velocity variation */
  velocity(base: number, variance = 0): this {
    this.transforms.push((step) => {
      if (!step.active) return step;
      
      let vel = base;
      if (variance > 0 && this.prng) {
        vel += this.prng.range(-variance, variance);
      }
      return {
        ...step,
        velocity: Math.max(1, Math.min(127, Math.round(vel))),
      };
    });
    return this;
  }

  /** Apply velocity accent on certain steps */
  accent(stepIndices: number[], accentVelocity: number, normalVelocity = 80): this {
    this.transforms.push((step, index) => {
      if (!step.active) return step;
      
      const isAccent = stepIndices.includes(index % this.steps);
      return {
        ...step,
        velocity: isAccent ? accentVelocity : normalVelocity,
      };
    });
    return this;
  }

  /** Apply probability gate (randomly deactivate steps) */
  probability(prob: number): this {
    this.transforms.push((step) => {
      if (!step.active || !this.prng) return step;
      
      return {
        ...step,
        active: this.prng.bool(prob),
      };
    });
    return this;
  }

  /** Randomly vary timing (humanization) */
  humanize(amount: number): this {
    this.transforms.push((step) => {
      if (!step.active || !this.prng) return step;
      
      return {
        ...step,
        timingOffset: this.prng.range(-amount, amount),
      };
    });
    return this;
  }

  /** Apply a groove/swing */
  swing(amount: number, every = 2): this {
    this.transforms.push((step, index) => {
      if (!step.active) return step;
      
      const isOffbeat = (index % every) === (every - 1);
      const offset = isOffbeat ? amount : 0;
      
      return {
        ...step,
        timingOffset: step.timingOffset + offset,
      };
    });
    return this;
  }

  /** Rotate pattern */
  rotate(amount: number): this {
    this.transforms.push((step, index) => step); // Rotation applied in build
    
    // Apply rotation to base pattern
    if (this.basePattern) {
      const normalized = ((amount % this.steps) + this.steps) % this.steps;
      this.basePattern = [
        ...this.basePattern.slice(-normalized),
        ...this.basePattern.slice(0, -normalized),
      ];
    }
    return this;
  }

  /** Reverse pattern */
  reverse(): this {
    if (this.basePattern) {
      this.basePattern.reverse();
    }
    return this;
  }

  /** Invert pattern (pulses become rests) */
  invert(): this {
    if (this.basePattern) {
      this.basePattern = this.basePattern.map(p => (p === 1 ? 0 : 1));
    }
    return this;
  }

  /** Combine with another pattern using AND logic */
  and(other: PatternBuilder | number[]): this {
    const otherPattern = other instanceof PatternBuilder 
      ? other.buildPattern() 
      : other;
    
    if (this.basePattern) {
      this.basePattern = this.basePattern.map((p, i) => 
        p && otherPattern[i % otherPattern.length] ? 1 : 0
      );
    }
    return this;
  }

  /** Combine with another pattern using OR logic */
  or(other: PatternBuilder | number[]): this {
    const otherPattern = other instanceof PatternBuilder 
      ? other.buildPattern() 
      : other;
    
    if (this.basePattern) {
      this.basePattern = this.basePattern.map((p, i) => 
        p || otherPattern[i % otherPattern.length] ? 1 : 0
      );
    }
    return this;
  }

  // ============================================================================
  // Building
  // ============================================================================

  /** Build the pattern object */
  build(): Pattern {
    // Ensure we have a base pattern
    if (!this.basePattern) {
      this.basePattern = new Array(this.steps).fill(0);
    }

    // Create initial steps from base pattern
    let steps: PatternStep[] = this.basePattern.map(active => ({
      active: active === 1,
      velocity: 100,
      probability: 1,
      timingOffset: 0,
    }));

    // Apply transforms
    for (const transform of this.transforms) {
      steps = steps.map((step, index) => transform(step, index, this.steps));
    }

    return {
      length: this.steps,
      steps,
      division: this.division,
    };
  }

  /** Get raw pattern array */
  buildPattern(): number[] {
    return this.build().steps.map(s => s.active ? 1 : 0);
  }

  /** Convert to note events */
  toNotes(
    noteNumber: number,
    startTick: number,
    stepDuration: number,
    durationTicks = stepDuration - 1
  ): NoteEvent[] {
    const pattern = this.build();
    const notes: NoteEvent[] = [];

    for (let i = 0; i < pattern.steps.length; i++) {
      const step = pattern.steps[i];
      if (!step.active) continue;

      const tickOffset = Math.floor(step.timingOffset * stepDuration);
      notes.push({
        note: noteNumber,
        velocity: step.velocity,
        startTick: startTick + i * stepDuration + tickOffset,
        duration: durationTicks,
      });
    }

    return notes;
  }

  /** Get tick positions for active steps */
  getOnsets(startTick: number, stepDuration: number): number[] {
    const pattern = this.build();
    return patternToOnsets(
      pattern.steps.map(s => s.active ? 1 : 0),
      startTick,
      stepDuration
    );
  }
}

/**
 * Create a new PatternBuilder
 */
export function pattern(options?: PatternBuilderOptions): PatternBuilder {
  return new PatternBuilder(options);
}

// ============================================================================
// Preset Pattern Functions
// ============================================================================

/** Create a standard 4/4 drum pattern */
export function drumPattern(
  type: 'basic' | 'rock' | 'funk' | 'techno' = 'basic',
  seed?: PRNG
): Record<string, Pattern> {
  const builder = new PatternBuilder({ steps: 16, seed });
  
  switch (type) {
    case 'rock':
      return {
        kick: builder.preset('rockKick').build(),
        snare: builder.preset('rockSnare').build(),
        hihat: builder.every(2, 1).build(),
      };
    
    case 'funk':
      return {
        kick: builder.euclidean(16, 6, 0).build(),
        snare: builder.fromArray([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]).build(),
        hihat: builder.every(2, 1).velocity(80, 20).build(),
      };
    
    case 'techno':
      return {
        kick: builder.preset('fourOnFloor').build(),
        snare: builder.every(8, 4).build(),
        hihat: builder.every(4, 2).build(),
        openHat: builder.fromArray([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]).build(),
      };
    
    case 'basic':
    default:
      return {
        kick: builder.euclidean(8, 4).build(),
        snare: builder.fromArray([0, 0, 1, 0, 0, 0, 1, 0]).build(),
        hihat: builder.every(2, 1).build(),
      };
  }
}

/** Create a melodic sequence pattern */
export function sequence(
  notes: number[],
  patternLength: number,
  seed?: PRNG
): PatternBuilder {
  // Create a pattern that steps through the notes
  const builder = new PatternBuilder({ steps: patternLength, seed });
  return builder.fill();
}
