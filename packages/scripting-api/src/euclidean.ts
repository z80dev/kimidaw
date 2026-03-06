/**
 * Euclidean Rhythm Generation
 * 
 * Implements the Bjorklund algorithm for generating evenly distributed rhythmic patterns.
 * Based on the paper "The Euclidean Algorithm Generates Traditional Musical Rhythms"
 * by Godfried Toussaint.
 * 
 * Euclidean rhythms are found in many musical traditions worldwide:
 * - Cuban tresillo (3 on 8)
 * - Cuban cinquillo (5 on 16)  
 * - Middle Eastern rhythms
 * - Sub-Saharan African rhythms
 * - Electronic dance music patterns
 */

/** A rhythm pattern as array of 1s (pulse) and 0s (rest) */
export type RhythmPattern = number[];

/**
 * Generate a Euclidean rhythm pattern using the Bjorklund algorithm
 * 
 * @param steps - Total number of steps in the pattern
 * @param pulses - Number of active pulses (must be <= steps)
 * @param rotation - Rotation offset (shifts the pattern)
 * @returns Array of 1s (pulse) and 0s (rest)
 * 
 * @example
 * euclidean(8, 3) // [1, 0, 0, 1, 0, 0, 1, 0] - tresillo
 * euclidean(16, 5) // [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0] - cinquillo
 */
export function euclidean(steps: number, pulses: number, rotation = 0): RhythmPattern {
  if (steps <= 0) {
    throw new Error('Steps must be greater than 0');
  }
  
  if (pulses < 0 || pulses > steps) {
    throw new Error('Pulses must be between 0 and steps');
  }
  
  if (pulses === 0) {
    return new Array(steps).fill(0);
  }
  
  if (pulses === steps) {
    return new Array(steps).fill(1);
  }
  
  // Bjorklund algorithm
  const pattern = bjorklund(steps, pulses);
  
  // Apply rotation
  if (rotation !== 0) {
    const normalizedRotation = ((rotation % steps) + steps) % steps;
    return rotatePattern(pattern, normalizedRotation);
  }
  
  return pattern;
}

/**
 * Internal Bjorklund algorithm implementation
 */
function bjorklund(steps: number, pulses: number): RhythmPattern {
  // Handle edge cases
  if (pulses === 0) return new Array(steps).fill(0);
  if (pulses === steps) return new Array(steps).fill(1);
  
  // Build pattern using the Euclidean algorithm
  const groups: number[][] = [];
  let remainingSteps = steps;
  let remainingPulses = pulses;
  
  // Create initial groups
  while (remainingPulses > 0) {
    const count = Math.floor(remainingSteps / remainingPulses);
    for (let i = 0; i < remainingPulses; i++) {
      groups.push([1]);
    }
    remainingSteps -= count * remainingPulses;
    const temp = remainingPulses;
    remainingPulses = remainingSteps;
    remainingSteps = temp;
  }
  
  // Distribute remaining steps
  let currentIndex = 0;
  while (remainingSteps > 0 && currentIndex < groups.length) {
    for (let i = 0; i < remainingSteps && currentIndex < groups.length; i++) {
      groups[currentIndex].push(0);
      currentIndex++;
    }
    remainingSteps = 0;
  }
  
  // Fill remaining groups with zeros
  for (let i = currentIndex; i < groups.length; i++) {
    groups[i].push(0);
  }
  
  // Flatten the groups
  return groups.flat();
}

/**
 * Rotate a pattern by a given number of positions
 */
function rotatePattern(pattern: RhythmPattern, rotation: number): RhythmPattern {
  const len = pattern.length;
  const normalizedRotation = ((rotation % len) + len) % len;
  
  return [
    ...pattern.slice(-normalizedRotation),
    ...pattern.slice(0, -normalizedRotation)
  ];
}

/**
 * Generate a polyrhythm by combining multiple Euclidean rhythms
 * 
 * @param rhythms - Array of [steps, pulses, rotation?] tuples
 * @returns Object with individual patterns and combined pattern
 * 
 * @example
 * polyrhythm([[4, 3], [3, 2]]) // 3:2 polyrhythm
 */
export function polyrhythm(
  rhythms: Array<[number, number, number?]>
): { patterns: RhythmPattern[]; combined: RhythmPattern; length: number } {
  const patterns = rhythms.map(([steps, pulses, rotation = 0]) => 
    euclidean(steps, pulses, rotation)
  );
  
  // Find LCM of all pattern lengths for combined pattern
  const lengths = patterns.map(p => p.length);
  const combinedLength = lcm(...lengths);
  
  // Create combined pattern
  const combined = new Array(combinedLength).fill(0);
  for (let i = 0; i < combinedLength; i++) {
    for (const pattern of patterns) {
      if (pattern[i % pattern.length] === 1) {
        combined[i] = 1;
        break;
      }
    }
  }
  
  return { patterns, combined, length: combinedLength };
}

/**
 * Generate a nested Euclidean rhythm (Euclidean rhythm with Euclidean subdivisions)
 * 
 * @param steps - Top-level steps
 * @param pulses - Top-level pulses  
 * @param subdivision - Number of subdivisions per step
 * @param subPulses - Pulses per subdivision (can be a number or array for each step)
 */
export function nestedEuclidean(
  steps: number,
  pulses: number,
  subdivision: number,
  subPulses: number | number[]
): RhythmPattern {
  const topLevel = euclidean(steps, pulses);
  const result: number[] = [];
  
  for (let i = 0; i < topLevel.length; i++) {
    if (topLevel[i] === 1) {
      // This step has a pulse - add subdivision
      const pulsesForStep = Array.isArray(subPulses) ? subPulses[i % subPulses.length] : subPulses;
      const subPattern = euclidean(subdivision, pulsesForStep);
      result.push(...subPattern);
    } else {
      // Rest - fill with zeros
      result.push(...new Array(subdivision).fill(0));
    }
  }
  
  return result;
}

/**
 * Convert a rhythm pattern to note onsets (tick positions)
 * 
 * @param pattern - Rhythm pattern
 * @param startTick - Starting tick position
 * @param stepDuration - Duration of each step in ticks
 * @returns Array of tick positions where notes should occur
 */
export function patternToOnsets(
  pattern: RhythmPattern,
  startTick: number,
  stepDuration: number
): number[] {
  const onsets: number[] = [];
  
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === 1) {
      onsets.push(startTick + i * stepDuration);
    }
  }
  
  return onsets;
}

/**
 * Calculate rhythmic density (ratio of pulses to steps)
 */
export function density(pattern: RhythmPattern): number {
  if (pattern.length === 0) return 0;
  const pulseCount = pattern.filter(p => p === 1).length;
  return pulseCount / pattern.length;
}

/**
 * Calculate rhythmic evenness (how evenly distributed the pulses are)
 * Returns a value between 0 (clustered) and 1 (perfectly even)
 */
export function evenness(pattern: RhythmPattern): number {
  if (pattern.length === 0) return 0;
  
  const pulseIndices = pattern
    .map((p, i) => (p === 1 ? i : -1))
    .filter(i => i !== -1);
  
  if (pulseIndices.length <= 1) return 1;
  
  const gaps: number[] = [];
  for (let i = 0; i < pulseIndices.length; i++) {
    const current = pulseIndices[i];
    const next = pulseIndices[(i + 1) % pulseIndices.length];
    const gap = i === pulseIndices.length - 1 
      ? next + pattern.length - current 
      : next - current;
    gaps.push(gap);
  }
  
  // Calculate variance of gaps (lower variance = more even)
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - mean, 2), 0) / gaps.length;
  const maxVariance = Math.pow(pattern.length / 2, 2);
  
  return 1 - (variance / maxVariance);
}

/**
 * Invert a rhythm pattern (swaps pulses and rests)
 */
export function invertPattern(pattern: RhythmPattern): RhythmPattern {
  return pattern.map(p => (p === 1 ? 0 : 1));
}

/**
 * Reverse a rhythm pattern
 */
export function reversePattern(pattern: RhythmPattern): RhythmPattern {
  return [...pattern].reverse();
}

/**
 * Combine two patterns with Boolean AND
 */
export function patternAnd(a: RhythmPattern, b: RhythmPattern): RhythmPattern {
  const maxLen = Math.max(a.length, b.length);
  return new Array(maxLen).fill(0).map((_, i) => 
    (a[i % a.length] && b[i % b.length]) ? 1 : 0
  );
}

/**
 * Combine two patterns with Boolean OR
 */
export function patternOr(a: RhythmPattern, b: RhythmPattern): RhythmPattern {
  const maxLen = Math.max(a.length, b.length);
  return new Array(maxLen).fill(0).map((_, i) => 
    (a[i % a.length] || b[i % b.length]) ? 1 : 0
  );
}

/**
 * Combine two patterns with Boolean XOR
 */
export function patternXor(a: RhythmPattern, b: RhythmPattern): RhythmPattern {
  const maxLen = Math.max(a.length, b.length);
  return new Array(maxLen).fill(0).map((_, i) => 
    (a[i % a.length] !== b[i % b.length]) ? 1 : 0
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/** Calculate greatest common divisor */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Calculate least common multiple */
function lcm(...numbers: number[]): number {
  if (numbers.length === 0) return 1;
  if (numbers.length === 1) return numbers[0];
  
  return numbers.reduce((a, b) => (a * b) / gcd(a, b));
}

// ============================================================================
// Preset Rhythms
// ============================================================================

/** Common Euclidean rhythm presets */
export const RHYTHM_PRESETS = {
  /** Cuban tresillo: 3 pulses in 8 steps */
  tresillo: () => euclidean(8, 3),
  
  /** Cuban cinquillo: 5 pulses in 16 steps */
  cinquillo: () => euclidean(16, 5),
  
  /** Bossa nova: 5 pulses in 16 steps, rotation 0 */
  bossaNova: () => euclidean(16, 5, 0),
  
  /** Gahu bell pattern: 5 pulses in 12 steps */
  gahu: () => euclidean(12, 5),
  
  /** Son clave: composite pattern */
  sonClave: () => [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
  
  /** Rumba clave: composite pattern */
  rumbaClave: () => [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
  
  /** Standard rock beat kick pattern */
  rockKick: () => euclidean(8, 4),
  
  /** Standard rock beat snare pattern */
  rockSnare: () => [0, 0, 1, 0, 0, 0, 1, 0],
  
  /** Four-on-the-floor kick */
  fourOnFloor: () => [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  
  /** Off-beat hi-hat */
  offbeatHihat: () => [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
} as const;
