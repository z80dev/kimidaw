/**
 * ClipBuilder - Fluent API for constructing MIDI and audio clips
 * 
 * Chainable builder for creating clips with notes, automation, and metadata.
 */

import type { 
  NoteEvent, 
  MidiClip, 
  AudioClip, 
  HybridGeneratedClip,
  VelocityFn,
  InstrumentRef,
  SampleRef,
  CCEvent,
  PitchBendEvent,
  ChannelPressureEvent,
} from './types';
import type { PRNG } from './prng';
import type { PatternBuilder } from './pattern';
import { noteToMidi, quantizeToScale, type Scale } from './scales';

/** Clip type */
type ClipType = 'midi' | 'audio' | 'hybrid';

/** Clip builder options */
interface ClipBuilderOptions {
  name?: string;
  type?: ClipType;
  seed?: PRNG;
}

/**
 * ClipBuilder - Fluent API for creating clips
 * 
 * @example
 * ```typescript
 * const clip = ctx.clip('bassline')
 *   .midi()
 *   .notes([...])
 *   .duration(4)
 *   .loop(true)
 *   .build();
 * ```
 */
export class ClipBuilder {
  private name: string;
  private type: ClipType = 'midi';
  private prng?: PRNG;
  private id: string;
  
  // MIDI data
  private notes: NoteEvent[] = [];
  private ccEvents: CCEvent[] = [];
  private pitchBendEvents: PitchBendEvent[] = [];
  private channelPressureEvents: ChannelPressureEvent[] = [];
  
  // Audio data
  private sampleRef?: SampleRef;
  private audioParams: Partial<AudioClip> = {};
  
  // Common
  private durationTicks: number = 0;
  private loopEnabled: boolean = false;
  private loopStart: number = 0;
  private loopEnd: number = 0;
  private instrumentRef?: InstrumentRef;

  constructor(name: string, options: ClipBuilderOptions = {}) {
    this.name = name;
    this.type = options.type ?? 'midi';
    this.prng = options.seed;
    this.id = `clip_${name}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  // ============================================================================
  // Type Selection
  // ============================================================================

  /** Create a MIDI clip */
  midi(): this {
    this.type = 'midi';
    return this;
  }

  /** Create an audio clip */
  audio(sample: SampleRef): this {
    this.type = 'audio';
    this.sampleRef = sample;
    return this;
  }

  /** Create a hybrid clip */
  hybrid(instrument: InstrumentRef): this {
    this.type = 'hybrid';
    this.instrumentRef = instrument;
    return this;
  }

  // ============================================================================
  // Note Operations
  // ============================================================================

  /** Add a single note */
  note(
    note: string | number,
    startTick: number,
    duration: number,
    velocity = 100
  ): this {
    const noteNumber = typeof note === 'string' ? noteToMidi(note) : note;
    this.notes.push({
      note: noteNumber,
      velocity,
      startTick,
      duration,
    });
    this.updateDuration(startTick + duration);
    return this;
  }

  /** Add multiple notes */
  notes(noteEvents: NoteEvent[]): this {
    for (const n of noteEvents) {
      this.notes.push(n);
      this.updateDuration(n.startTick + n.duration);
    }
    return this;
  }

  /** Add notes from a PatternBuilder */
  fromPattern(
    pattern: PatternBuilder,
    noteOrNotes: string | number | (string | number)[],
    startTick: number,
    stepDuration: number,
    noteDuration = stepDuration - 1
  ): this {
    const patternData = pattern.build();
    
    for (let i = 0; i < patternData.steps.length; i++) {
      const step = patternData.steps[i];
      if (!step.active) continue;

      const tickOffset = Math.floor(step.timingOffset * stepDuration);
      const tick = startTick + i * stepDuration + tickOffset;
      
      // Determine note number(s) for this step
      const notesForStep: (string | number)[] = Array.isArray(noteOrNotes) 
        ? [noteOrNotes[i % noteOrNotes.length]]
        : [noteOrNotes];

      for (const note of notesForStep) {
        const noteNumber = typeof note === 'string' ? noteToMidi(note) : note;
        this.notes.push({
          note: noteNumber,
          velocity: step.velocity,
          startTick: tick,
          duration: noteDuration,
        });
      }
    }
    
    this.updateDuration(startTick + patternData.length * stepDuration);
    return this;
  }

  /** Add a chord */
  chord(
    root: string | number,
    intervals: number[],
    startTick: number,
    duration: number,
    velocity = 100
  ): this {
    const rootNote = typeof root === 'string' ? noteToMidi(root) : root;
    
    for (const interval of intervals) {
      this.notes.push({
        note: rootNote + interval,
        velocity,
        startTick,
        duration,
      });
    }
    
    this.updateDuration(startTick + duration);
    return this;
  }

  /** Add an arpeggio */
  arpeggio(
    notes: number[],
    startTick: number,
    stepDuration: number,
    pattern: 'up' | 'down' | 'updown' | 'random' = 'up',
    velocity = 100
  ): this {
    let sequence: number[];
    
    switch (pattern) {
      case 'up':
        sequence = [...notes].sort((a, b) => a - b);
        break;
      case 'down':
        sequence = [...notes].sort((a, b) => b - a);
        break;
      case 'updown':
        const up = [...notes].sort((a, b) => a - b);
        sequence = [...up, ...up.slice(1, -1).reverse()];
        break;
      case 'random':
        sequence = this.prng ? this.prng.shuffle(notes) : [...notes];
        break;
    }
    
    for (let i = 0; i < sequence.length; i++) {
      this.notes.push({
        note: sequence[i],
        velocity,
        startTick: startTick + i * stepDuration,
        duration: stepDuration - 1,
      });
    }
    
    this.updateDuration(startTick + sequence.length * stepDuration);
    return this;
  }

  // ============================================================================
  // Transformations
  // ============================================================================

  /** Quantize all notes to a scale */
  quantize(scale: Scale): this {
    this.notes = this.notes.map(note => ({
      ...note,
      note: quantizeToScale(note.note, scale),
    }));
    return this;
  }

  /** Transpose all notes by semitones */
  transpose(semitones: number): this {
    this.notes = this.notes.map(note => ({
      ...note,
      note: note.note + semitones,
    }));
    return this;
  }

  /** Apply velocity curve */
  velocityCurve(curve: VelocityFn): this {
    const totalNotes = this.notes.length;
    this.notes = this.notes.map((note, index) => ({
      ...note,
      velocity: Math.round(curve(note.velocity, index / totalNotes)),
    }));
    return this;
  }

  /** Set all velocities to a fixed value */
  setVelocity(velocity: number): this {
    this.notes = this.notes.map(note => ({
      ...note,
      velocity,
    }));
    return this;
  }

  /** Apply humanization */
  humanize(timing = 0, velocity = 0, duration = 0): this {
    if (!this.prng) return this;
    
    this.notes = this.notes.map(note => {
      const timingOffset = timing > 0 
        ? Math.round(this.prng!.range(-timing, timing)) 
        : 0;
      const velocityOffset = velocity > 0 
        ? Math.round(this.prng!.range(-velocity, velocity)) 
        : 0;
      const durationOffset = duration > 0 
        ? Math.round(this.prng!.range(-duration, duration)) 
        : 0;
      
      return {
        ...note,
        startTick: Math.max(0, note.startTick + timingOffset),
        velocity: Math.max(1, Math.min(127, note.velocity + velocityOffset)),
        duration: Math.max(1, note.duration + durationOffset),
      };
    });
    
    return this;
  }

  /** Reverse the clip (notes play backwards) */
  reverse(): this {
    if (this.notes.length === 0) return this;
    
    const maxTick = Math.max(...this.notes.map(n => n.startTick + n.duration));
    
    this.notes = this.notes.map(note => {
      const endTick = note.startTick + note.duration;
      const newStart = maxTick - endTick;
      return {
        ...note,
        startTick: newStart,
      };
    });
    
    return this;
  }

  /** Invert note pitches around a center note */
  invert(centerNote: number): this {
    this.notes = this.notes.map(note => ({
      ...note,
      note: centerNote * 2 - note.note,
    }));
    return this;
  }

  // ============================================================================
  // Loop and Duration
  // ============================================================================

  /** Set clip duration in ticks */
  duration(ticks: number): this {
    this.durationTicks = ticks;
    return this;
  }

  /** Set clip duration in bars (at 4/4) */
  bars(count: number, ppq = 960): this {
    this.durationTicks = count * 4 * ppq;
    return this;
  }

  /** Set loop region */
  loop(enabled: boolean, startTick = 0, endTick?: number): this {
    this.loopEnabled = enabled;
    this.loopStart = startTick;
    this.loopEnd = endTick ?? this.durationTicks;
    return this;
  }

  // ============================================================================
  // CC and Automation
  // ============================================================================

  /** Add CC event */
  cc(controller: number, value: number, tick: number, channel = 1): this {
    this.ccEvents.push({ controller, value, tick, channel });
    return this;
  }

  /** Add CC ramp */
  ccRamp(
    controller: number,
    fromValue: number,
    toValue: number,
    startTick: number,
    endTick: number,
    steps = 16
  ): this {
    const tickStep = (endTick - startTick) / steps;
    const valueStep = (toValue - fromValue) / steps;
    
    for (let i = 0; i <= steps; i++) {
      this.ccEvents.push({
        controller,
        value: Math.round(fromValue + valueStep * i),
        tick: Math.round(startTick + tickStep * i),
      });
    }
    
    return this;
  }

  /** Add pitch bend event */
  pitchBend(value: number, tick: number, channel = 1): this {
    this.pitchBendEvents.push({ value, tick, channel });
    return this;
  }

  /** Add channel pressure (aftertouch) event */
  pressure(pressure: number, tick: number, channel = 1): this {
    this.channelPressureEvents.push({ pressure, tick, channel });
    return this;
  }

  // ============================================================================
  // Building
  // ============================================================================

  /** Calculate clip duration from notes if not explicitly set */
  private updateDuration(tick: number): void {
    if (tick > this.durationTicks) {
      this.durationTicks = tick;
    }
  }

  /** Build the clip */
  build(): MidiClip | AudioClip | HybridGeneratedClip {
    // Sort notes by start time
    this.notes.sort((a, b) => a.startTick - b.startTick);
    
    switch (this.type) {
      case 'midi':
        return this.buildMidiClip();
      case 'audio':
        return this.buildAudioClip();
      case 'hybrid':
        return this.buildHybridClip();
      default:
        throw new Error(`Unknown clip type: ${this.type}`);
    }
  }

  private buildMidiClip(): MidiClip {
    const clip: MidiClip = {
      type: 'midi',
      id: this.id,
      name: this.name,
      startTick: 0,
      endTick: this.durationTicks,
      notes: this.notes,
      cc: this.ccEvents,
      pitchBend: this.pitchBendEvents,
      channelPressure: this.channelPressureEvents,
    };

    if (this.loopEnabled) {
      clip.loop = {
        startTick: this.loopStart,
        endTick: this.loopEnd,
      };
    }

    return clip;
  }

  private buildAudioClip(): AudioClip {
    if (!this.sampleRef) {
      throw new Error('Audio clip requires a sample reference');
    }

    return {
      type: 'audio',
      id: this.id,
      name: this.name,
      startTick: 0,
      endTick: this.durationTicks,
      assetId: this.sampleRef.id,
      sourceStartSample: this.audioParams.sourceStartSample ?? 0,
      sourceEndSample: this.audioParams.sourceEndSample ?? 0,
      gainDb: this.audioParams.gainDb ?? 0,
      transposeSemitones: this.audioParams.transposeSemitones ?? 0,
    };
  }

  private buildHybridClip(): HybridGeneratedClip {
    return {
      type: 'hybrid',
      id: this.id,
      name: this.name,
      startTick: 0,
      endTick: this.durationTicks,
      midiData: {
        id: `${this.id}_midi`,
        name: `${this.name} (MIDI)`,
        startTick: 0,
        endTick: this.durationTicks,
        notes: this.notes,
        cc: this.ccEvents,
        pitchBend: this.pitchBendEvents,
        channelPressure: this.channelPressureEvents,
      },
    };
  }

  /** Build as MIDI clip specifically */
  buildMidi(): MidiClip {
    this.type = 'midi';
    return this.buildMidiClip();
  }
}

/**
 * Create a new ClipBuilder
 */
export function clip(name: string, options?: ClipBuilderOptions): ClipBuilder {
  return new ClipBuilder(name, options);
}
