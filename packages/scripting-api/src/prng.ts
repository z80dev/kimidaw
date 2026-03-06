/**
 * Deterministic Pseudo-Random Number Generator
 * 
 * Implements section 15.4 of the engineering spec:
 * Scripts must be reproducible from source + seed
 * 
 * Uses Mulberry32 algorithm - fast, simple, good distribution
 * No Math.random(), no Date.now() - fully deterministic
 */

/** PRNG interface for seed-based generation */
export interface PRNG {
  /** Get next random float in [0, 1) */
  next(): number;
  
  /** Get random float in range [min, max) */
  range(min: number, max: number): number;
  
  /** Get random integer in range [min, max] (inclusive) */
  int(min: number, max: number): number;
  
  /** Get random boolean with given probability */
  bool(probability?: number): boolean;
  
  /** Pick random element from array */
  pick<T>(array: readonly T[]): T;
  
  /** Shuffle array (returns new array) */
  shuffle<T>(array: readonly T[]): T[];
  
  /** Get normally distributed random value (Box-Muller) */
  normal(mean?: number, stdDev?: number): number;
  
  /** Create new PRNG with derived seed */
  fork(seed?: string): PRNG;
  
  /** Get current state for serialization */
  getState(): number;
  
  /** Restore from serialized state */
  setState(state: number): void;
}

/** Hash a string to a 32-bit integer */
function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return h >>> 0;
}

/** Mulberry32 PRNG implementation */
class Mulberry32 implements PRNG {
  private state: number;

  constructor(seed: string | number) {
    if (typeof seed === 'string') {
      this.state = hashString(seed);
    } else {
      this.state = seed >>> 0;
    }
  }

  /** Get next random float in [0, 1) */
  next(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Get random float in range [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Get random integer in range [min, max] (inclusive) */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Get random boolean with given probability */
  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /** Pick random element from array */
  pick<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return array[this.int(0, array.length - 1)];
  }

  /** Shuffle array (Fisher-Yates, returns new array) */
  shuffle<T>(array: readonly T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /** Get normally distributed random value using Box-Muller transform */
  normal(mean = 0, stdDev = 1): number {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /** Create new PRNG with derived seed */
  fork(seed?: string): PRNG {
    const forkSeed = seed 
      ? `${this.state}_${seed}` 
      : `${this.state}_${this.next()}`;
    return new Mulberry32(forkSeed);
  }

  /** Get current state for serialization */
  getState(): number {
    return this.state;
  }

  /** Restore from serialized state */
  setState(state: number): void {
    this.state = state >>> 0;
  }
}

/**
 * Create a new deterministic PRNG
 * @param seed - Seed string for deterministic generation
 */
export function createPRNG(seed: string): PRNG {
  return new Mulberry32(seed);
}

/**
 * Create PRNG from project seed and script ID
 * Ensures each script gets its own deterministic sequence
 */
export function createScriptPRNG(projectSeed: string, scriptId: string): PRNG {
  return new Mulberry32(`${projectSeed}:${scriptId}`);
}

/**
 * Deterministic UUID-like identifier generator
 * Generates consistent IDs for the same seed + namespace
 */
export function deterministicId(seed: string, namespace: string): string {
  const prng = new Mulberry32(`${seed}:${namespace}`);
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    parts.push(Math.floor(prng.next() * 0xFFFFFFFF).toString(16).padStart(8, '0'));
  }
  return `${parts[0]}-${parts[1].slice(0, 4)}-${parts[1].slice(4)}-${parts[2].slice(0, 4)}-${parts[2].slice(4)}${parts[3]}`;
}
