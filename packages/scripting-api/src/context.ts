/**
 * MusicScriptContext - Main API context for music generation scripts
 * 
 * Implements section 15.3 of the engineering spec:
 * The primary interface exposed to user-authored music scripts
 */

import type { 
  TempoEvent, 
  AutomationTarget, 
  PPQ 
} from '@daw/project-schema';
import type { 
  NoteEvent, 
  GeneratedScene, 
  GeneratedSection,
  ScriptModuleResult,
  HumanizeOptions,
  VelocityFn,
  InstrumentRef,
  SampleRef,
  Scale,
} from './types';
import { createPRNG, createScriptPRNG, type PRNG } from './prng';
import { PatternBuilder, pattern } from './pattern';
import { ClipBuilder, clip } from './clip-builder';
import { scale as createScale, chord as createChord } from './scales';
import { euclidean } from './euclidean';

/** Automation builder */
export class AutomationBuilder {
  private target: AutomationTarget;
  private points: { tick: number; value: number; curve: 'step' | 'linear' | 'bezier' }[] = [];
  private prng?: PRNG;

  constructor(target: AutomationTarget, prng?: PRNG) {
    this.target = target;
    this.prng = prng;
  }

  /** Add a point */
  point(tick: number, value: number, curve: 'step' | 'linear' | 'bezier' = 'linear'): this {
    this.points.push({ tick, value, curve });
    return this;
  }

  /** Add a linear ramp */
  ramp(fromTick: number, fromValue: number, toTick: number, toValue: number): this {
    this.points.push({ tick: fromTick, value: fromValue, curve: 'linear' });
    this.points.push({ tick: toTick, value: toValue, curve: 'linear' });
    return this;
  }

  /** Add a step (immediate change) */
  step(tick: number, value: number): this {
    this.points.push({ tick, value, curve: 'step' });
    return this;
  }

  /** Generate LFO-like automation */
  lfo(
    startTick: number,
    duration: number,
    minValue: number,
    maxValue: number,
    cycles: number,
    shape: 'sine' | 'triangle' | 'saw' | 'square' = 'sine',
    pointsPerCycle = 16
  ): this {
    const totalPoints = Math.floor(cycles * pointsPerCycle);
    const tickStep = (duration * cycles) / totalPoints;
    
    for (let i = 0; i <= totalPoints; i++) {
      const tick = startTick + i * tickStep;
      const phase = (i % pointsPerCycle) / pointsPerCycle;
      let normalizedValue: number;
      
      switch (shape) {
        case 'sine':
          normalizedValue = (Math.sin(phase * Math.PI * 2) + 1) / 2;
          break;
        case 'triangle':
          normalizedValue = phase < 0.5 ? phase * 2 : 2 - phase * 2;
          break;
        case 'saw':
          normalizedValue = phase;
          break;
        case 'square':
          normalizedValue = phase < 0.5 ? 0 : 1;
          break;
      }
      
      const value = minValue + normalizedValue * (maxValue - minValue);
      this.points.push({ tick, value, curve: 'linear' });
    }
    
    return this;
  }

  /** Generate random walk automation */
  randomWalk(
    startTick: number,
    duration: number,
    minValue: number,
    maxValue: number,
    steps: number,
    smooth = true
  ): this {
    if (!this.prng) return this;
    
    const tickStep = duration / steps;
    let currentValue = (minValue + maxValue) / 2;
    
    for (let i = 0; i <= steps; i++) {
      const tick = startTick + i * tickStep;
      this.points.push({ tick, value: currentValue, curve: smooth ? 'linear' : 'step' });
      
      // Random step
      const range = maxValue - minValue;
      const step = this.prng!.range(-range * 0.2, range * 0.2);
      currentValue = Math.max(minValue, Math.min(maxValue, currentValue + step));
    }
    
    return this;
  }

  /** Build the automation points */
  build() {
    // Sort points by tick
    this.points.sort((a, b) => a.tick - b.tick);
    return {
      target: this.target,
      points: this.points,
    };
  }
}

/** Scene builder */
export class SceneBuilder {
  private name: string;
  private clips: { trackId: string; clipId: string; launchQuantization?: number }[] = [];
  private tempo?: number;
  private timeSignature?: [number, number];

  constructor(name: string) {
    this.name = name;
  }

  /** Add a clip to the scene */
  addClip(trackId: string, clipId: string, launchQuantization?: number): this {
    this.clips.push({ trackId, clipId, launchQuantization });
    return this;
  }

  /** Set scene tempo */
  setTempo(tempo: number): this {
    this.tempo = tempo;
    return this;
  }

  /** Set time signature */
  setTimeSignature(numerator: number, denominator: number): this {
    this.timeSignature = [numerator, denominator];
    return this;
  }

  /** Build the scene */
  build(row: number): GeneratedScene {
    return {
      name: this.name,
      row,
      clips: this.clips,
      tempo: this.tempo,
      timeSignature: this.timeSignature,
    };
  }
}

/** Section builder */
export class SectionBuilder {
  private name: string;
  private bars: number;
  private ppq: number;
  private clips: ClipBuilder[] = [];
  private automation: AutomationBuilder[] = [];
  private startTick: number = 0;

  constructor(name: string, bars: number, ppq: number) {
    this.name = name;
    this.bars = bars;
    this.ppq = ppq;
  }

  /** Set start position */
  at(tick: number): this {
    this.startTick = tick;
    return this;
  }

  /** Add a clip to the section */
  addClip(clipBuilder: ClipBuilder): this {
    this.clips.push(clipBuilder);
    return this;
  }

  /** Add automation to the section */
  addAutomation(automationBuilder: AutomationBuilder): this {
    this.automation.push(automationBuilder);
    return this;
  }

  /** Build the section */
  build(): GeneratedSection {
    const ticksPerBar = 4 * this.ppq;
    
    return {
      name: this.name,
      startTick: this.startTick,
      durationTicks: this.bars * ticksPerBar,
      clips: this.clips.map(cb => ({
        trackId: '', // To be filled by the script
        clip: cb.build(),
        provenance: {
          scriptId: '',
          hash: '',
          seed: '',
          generatedAt: Date.now(),
        },
      })),
      automation: this.automation.map(ab => ({
        ...ab.build(),
        provenance: {
          scriptId: '',
          hash: '',
          seed: '',
          generatedAt: Date.now(),
        },
      })),
    };
  }
}

/** MusicScriptContext implementation */
export class MusicScriptContext {
  readonly projectId: string;
  readonly seed: string;
  readonly ppq: number;
  readonly sampleRate: number;
  
  private _tempoMap: TempoEvent[];
  private prng: PRNG;
  private _clips: Map<string, ClipBuilder> = new Map();
  private _automation: AutomationBuilder[] = [];
  private _scenes: SceneBuilder[] = [];
  private _sections: SectionBuilder[] = [];

  constructor(options: {
    projectId: string;
    seed: string;
    ppq?: number;
    sampleRate?: number;
    tempoMap?: TempoEvent[];
  }) {
    this.projectId = options.projectId;
    this.seed = options.seed;
    this.ppq = options.ppq ?? 960;
    this.sampleRate = options.sampleRate ?? 48000;
    this._tempoMap = options.tempoMap ?? [{ tick: 0, bpm: 120, curve: 'jump' }];
    this.prng = createScriptPRNG(this.seed, 'context');
  }

  // ============================================================================
  // Core Properties
  // ============================================================================

  /** Get the tempo map */
  tempoMap(): TempoEvent[] {
    return [...this._tempoMap];
  }

  /** Get current tempo at tick position */
  tempoAt(tick: number): number {
    let tempo = 120;
    for (const event of this._tempoMap) {
      if (event.tick <= tick) {
        tempo = event.bpm;
      } else {
        break;
      }
    }
    return tempo;
  }

  // ============================================================================
  // Scale and Chord Functions
  // ============================================================================

  /** Create a scale */
  scale(root: string, mode: string): Scale {
    return createScale(root, mode);
  }

  /** Get chord notes from symbol */
  chord(symbol: string): number[] {
    return createChord(symbol);
  }

  // ============================================================================
  // Builders
  // ============================================================================

  /** Create a new PatternBuilder */
  pattern(): PatternBuilder {
    return new PatternBuilder({ seed: this.prng.fork('pattern') });
  }

  /** Create a new ClipBuilder */
  clip(name: string): ClipBuilder {
    const builder = new ClipBuilder(name, { seed: this.prng.fork(`clip_${name}`) });
    this._clips.set(name, builder);
    return builder;
  }

  /** Create an AutomationBuilder */
  automation(target: AutomationTarget): AutomationBuilder {
    const builder = new AutomationBuilder(target, this.prng.fork('automation'));
    this._automation.push(builder);
    return builder;
  }

  /** Create a SceneBuilder */
  scene(name: string): SceneBuilder {
    const builder = new SceneBuilder(name);
    this._scenes.push(builder);
    return builder;
  }

  /** Create a SectionBuilder */
  section(name: string, bars: number): SectionBuilder {
    const builder = new SectionBuilder(name, bars, this.ppq);
    this._sections.push(builder);
    return builder;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /** Get a new PRNG (optionally with custom seed) */
  rand(forkSeed?: string): PRNG {
    return this.prng.fork(forkSeed ?? 'rand');
  }

  /** Generate Euclidean rhythm */
  euclidean(steps: number, pulses: number, rotation = 0): number[] {
    return euclidean(steps, pulses, rotation);
  }

  /** Humanize note events */
  humanize<T extends NoteEvent>(events: T[], opts: HumanizeOptions): T[] {
    const forked = this.prng.fork('humanize');
    
    return events.map((event, index) => {
      const result = { ...event };
      
      if (opts.timing && opts.timing > 0) {
        const offset = Math.round(forked.range(-opts.timing, opts.timing));
        result.startTick = Math.max(0, event.startTick + offset);
      }
      
      if (opts.velocity && opts.velocity > 0) {
        const offset = Math.round(forked.range(-opts.velocity * 127, opts.velocity * 127));
        result.velocity = Math.max(1, Math.min(127, event.velocity + offset));
      }
      
      if (opts.duration && opts.duration > 0) {
        const offset = Math.round(forked.range(-opts.duration, opts.duration));
        result.duration = Math.max(1, event.duration + offset);
      }
      
      // Preserve accents on strong beats
      if (opts.preserveAccents) {
        const isStrongBeat = (event.startTick % (this.ppq * 4)) < this.ppq;
        if (isStrongBeat && opts.timing && opts.timing > 0) {
          // Reduce timing offset for strong beats
          result.startTick = event.startTick + Math.round((result.startTick - event.startTick) * 0.5);
        }
      }
      
      return result as T;
    });
  }

  /** Create a velocity curve function */
  velCurve(kind: 'linear' | 'exp' | 'log', amount: number): VelocityFn {
    switch (kind) {
      case 'linear':
        return (input: number, position: number) => {
          const delta = (position - 0.5) * 2 * amount * 127;
          return Math.max(1, Math.min(127, input + delta));
        };
      
      case 'exp':
        return (input: number, position: number) => {
          const factor = 1 + (position - 0.5) * amount;
          return Math.max(1, Math.min(127, input * factor));
        };
      
      case 'log':
        return (input: number, position: number) => {
          const normalized = input / 127;
          const adjusted = normalized * (1 + (0.5 - position) * amount);
          return Math.max(1, Math.min(127, adjusted * 127));
        };
    }
  }

  // ============================================================================
  // References
  // ============================================================================

  /** Get instrument reference */
  instrument(ref: string): InstrumentRef {
    return {
      id: ref,
      type: 'builtin',
      name: ref,
    };
  }

  /** Get sample reference */
  sample(ref: string): SampleRef {
    return {
      id: ref,
      path: ref,
      name: ref.split('/').pop() ?? ref,
    };
  }

  // ============================================================================
  // Conversion Helpers
  // ============================================================================

  /** Convert bars to ticks */
  barsToTicks(bars: number): number {
    return bars * 4 * this.ppq;
  }

  /** Convert beats to ticks */
  beatsToTicks(beats: number): number {
    return beats * this.ppq;
  }

  /** Convert ticks to seconds at current tempo */
  ticksToSeconds(ticks: number, tempo?: number): number {
    const t = tempo ?? this.tempoAt(0);
    const beats = ticks / this.ppq;
    return (beats * 60) / t;
  }

  /** Convert seconds to ticks at current tempo */
  secondsToTicks(seconds: number, tempo?: number): number {
    const t = tempo ?? this.tempoAt(0);
    const beats = (seconds * t) / 60;
    return Math.floor(beats * this.ppq);
  }
}

/** Create a new MusicScriptContext */
export function createContext(options: {
  projectId: string;
  seed: string;
  ppq?: number;
  sampleRate?: number;
  tempoMap?: TempoEvent[];
}): MusicScriptContext {
  return new MusicScriptContext(options);
}

// Re-export types
export type { MusicScriptContext };
