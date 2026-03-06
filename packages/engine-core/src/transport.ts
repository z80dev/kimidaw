/**
 * Transport state management
 * Implements section 8 of the engineering spec
 * 
 * The transport manages:
 * - Play/stop/record state
 * - Musical position (ticks, samples)
 * - Loop boundaries
 * - Punch in/out
 * - Tempo and time signature
 */

import {
  type TransportState,
  type TempoEvent,
  type TimeSignatureEvent,
  type SchedulerConfig,
  DEFAULT_SCHEDULER_CONFIG,
  PPQ,
} from './types.js';
import { TempoMap, ticksToSamples, type TimingContext } from './timing.js';

/** Transport state change event */
export interface TransportStateChange {
  property: keyof TransportState;
  previousValue: unknown;
  newValue: unknown;
  timestamp: number;
}

/** Transport event listener */
export type TransportListener = (change: TransportStateChange) => void;

/** Options for creating a transport */
export interface TransportOptions {
  initialTempo?: number;
  initialTimeSigNum?: number;
  initialTimeSigDen?: number;
  sampleRate?: number;
  schedulerConfig?: SchedulerConfig;
}

/**
 * Transport controller for the DAW
 * Manages playback state, position, and musical timing
 */
export class Transport {
  private state: TransportState;
  private sampleRate: number;
  private schedulerConfig: SchedulerConfig;
  private tempoMap: TempoMap;
  private tempoEvents: TempoEvent[];
  private timeSigEvents: TimeSignatureEvent[];
  private listeners: Set<TransportListener> = new Set();
  private lastProcessTime: number = 0;
  
  constructor(options: TransportOptions = {}) {
    this.sampleRate = options.sampleRate ?? 48000;
    this.schedulerConfig = options.schedulerConfig ?? DEFAULT_SCHEDULER_CONFIG;
    
    const initialTempo = options.initialTempo ?? 120;
    const initialTimeSigNum = options.initialTimeSigNum ?? 4;
    const initialTimeSigDen = options.initialTimeSigDen ?? 4;
    
    this.tempoEvents = [{ tick: 0, bpm: initialTempo }];
    this.timeSigEvents = [{ tick: 0, numerator: initialTimeSigNum, denominator: initialTimeSigDen }];
    this.tempoMap = new TempoMap(this.tempoEvents, this.sampleRate);
    
    this.state = {
      playing: false,
      recording: false,
      looping: false,
      punchIn: null,
      punchOut: null,
      loopStartTick: 0,
      loopEndTick: PPQ * 4 * 4, // 4 bars at 4/4
      currentTick: 0,
      currentSample: 0,
      tempo: initialTempo,
      timeSigNum: initialTimeSigNum,
      timeSigDen: initialTimeSigDen,
    };
  }
  
  /** Get current transport state (immutable copy) */
  getState(): Readonly<TransportState> {
    return Object.freeze({ ...this.state });
  }
  
  /** Get sample rate */
  getSampleRate(): number {
    return this.sampleRate;
  }
  
  /** Get scheduler configuration */
  getSchedulerConfig(): Readonly<SchedulerConfig> {
    return Object.freeze({ ...this.schedulerConfig });
  }
  
  /** Get current tempo map */
  getTempoMap(): TempoMap {
    return this.tempoMap;
  }
  
  /** Subscribe to transport changes */
  subscribe(listener: TransportListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /** Notify listeners of a state change */
  private notifyChange<K extends keyof TransportState>(
    property: K,
    previousValue: TransportState[K],
    newValue: TransportState[K]
  ): void {
    const change: TransportStateChange = {
      property,
      previousValue,
      newValue,
      timestamp: performance.now(),
    };
    
    for (const listener of this.listeners) {
      try {
        listener(change);
      } catch (e) {
        console.error('Transport listener error:', e);
      }
    }
  }
  
  /**
   * Start playback
   * @param fromTick - Optional position to start from (defaults to current)
   */
  play(fromTick?: number): void {
    if (this.state.playing) return;
    
    const previousValue = this.state.playing;
    
    if (fromTick !== undefined) {
      this.setPosition(fromTick);
    }
    
    this.state.playing = true;
    this.lastProcessTime = performance.now();
    
    this.notifyChange('playing', previousValue, true);
  }
  
  /** Stop playback */
  stop(): void {
    if (!this.state.playing) return;
    
    const previousValue = this.state.playing;
    this.state.playing = false;
    this.notifyChange('playing', previousValue, false);
  }
  
  /** Toggle play/stop */
  togglePlay(): void {
    if (this.state.playing) {
      this.stop();
    } else {
      this.play();
    }
  }
  
  /** Start recording */
  record(): void {
    if (this.state.recording) return;
    
    const previousValue = this.state.recording;
    this.state.recording = true;
    
    // Auto-start playback if not already playing
    if (!this.state.playing) {
      this.play();
    }
    
    this.notifyChange('recording', previousValue, true);
  }
  
  /** Stop recording */
  stopRecording(): void {
    if (!this.state.recording) return;
    
    const previousValue = this.state.recording;
    this.state.recording = false;
    this.notifyChange('recording', previousValue, false);
  }
  
  /** Toggle recording */
  toggleRecord(): void {
    if (this.state.recording) {
      this.stopRecording();
    } else {
      this.record();
    }
  }
  
  /** Enable/disable looping */
  setLooping(enabled: boolean): void {
    if (this.state.looping === enabled) return;
    
    const previousValue = this.state.looping;
    this.state.looping = enabled;
    this.notifyChange('looping', previousValue, enabled);
  }
  
  /** Set loop boundaries */
  setLoopRange(startTick: number, endTick: number): void {
    if (startTick >= endTick) {
      throw new Error('Loop start must be before loop end');
    }
    
    const prevStart = this.state.loopStartTick;
    const prevEnd = this.state.loopEndTick;
    
    this.state.loopStartTick = Math.max(0, startTick);
    this.state.loopEndTick = endTick;
    
    if (prevStart !== this.state.loopStartTick) {
      this.notifyChange('loopStartTick', prevStart, this.state.loopStartTick);
    }
    if (prevEnd !== this.state.loopEndTick) {
      this.notifyChange('loopEndTick', prevEnd, this.state.loopEndTick);
    }
  }
  
  /** Set punch in/out boundaries */
  setPunchRange(startTick: number | null, endTick: number | null): void {
    if (startTick !== null && endTick !== null && startTick >= endTick) {
      throw new Error('Punch in must be before punch out');
    }
    
    const prevIn = this.state.punchIn;
    const prevOut = this.state.punchOut;
    
    this.state.punchIn = startTick;
    this.state.punchOut = endTick;
    
    if (prevIn !== this.state.punchIn) {
      this.notifyChange('punchIn', prevIn, this.state.punchIn);
    }
    if (prevOut !== this.state.punchOut) {
      this.notifyChange('punchOut', prevOut, this.state.punchOut);
    }
  }
  
  /** Set current playback position in ticks */
  setPosition(tick: number): void {
    const previousTick = this.state.currentTick;
    const previousSample = this.state.currentSample;
    
    this.state.currentTick = Math.max(0, tick);
    this.state.currentSample = Math.round(
      this.tempoMap.ticksToSamples(this.state.currentTick)
    );
    
    // Update tempo and time signature at new position
    this.updateTempoAndTimeSigAtPosition();
    
    if (previousTick !== this.state.currentTick) {
      this.notifyChange('currentTick', previousTick, this.state.currentTick);
    }
    if (previousSample !== this.state.currentSample) {
      this.notifyChange('currentSample', previousSample, this.state.currentSample);
    }
  }
  
  /** Set current playback position in samples */
  setPositionFromSample(sample: number): void {
    const previousTick = this.state.currentTick;
    const previousSample = this.state.currentSample;
    
    this.state.currentSample = Math.max(0, Math.round(sample));
    this.state.currentTick = this.tempoMap.samplesToTicks(this.state.currentSample);
    
    // Update tempo and time signature at new position
    this.updateTempoAndTimeSigAtPosition();
    
    if (previousTick !== this.state.currentTick) {
      this.notifyChange('currentTick', previousTick, this.state.currentTick);
    }
    if (previousSample !== this.state.currentSample) {
      this.notifyChange('currentSample', previousSample, this.state.currentSample);
    }
  }
  
  /** Update tempo and time signature based on current position */
  private updateTempoAndTimeSigAtPosition(): void {
    const tick = this.state.currentTick;
    
    // Find current tempo
    let tempo = this.tempoEvents[0].bpm;
    for (const event of this.tempoEvents) {
      if (event.tick <= tick) {
        tempo = event.bpm;
      }
    }
    
    if (tempo !== this.state.tempo) {
      const prevTempo = this.state.tempo;
      this.state.tempo = tempo;
      this.notifyChange('tempo', prevTempo, tempo);
    }
    
    // Find current time signature
    let num = this.timeSigEvents[0].numerator;
    let den = this.timeSigEvents[0].denominator;
    for (const event of this.timeSigEvents) {
      if (event.tick <= tick) {
        num = event.numerator;
        den = event.denominator;
      }
    }
    
    if (num !== this.state.timeSigNum || den !== this.state.timeSigDen) {
      const prevNum = this.state.timeSigNum;
      const prevDen = this.state.timeSigDen;
      this.state.timeSigNum = num;
      this.state.timeSigDen = den;
      this.notifyChange('timeSigNum', prevNum, num);
      this.notifyChange('timeSigDen', prevDen, den);
    }
  }
  
  /**
   * Process a block of samples, updating transport position
   * Called by the audio engine during each render quantum
   * @param sampleFrames - Number of samples to advance
   * @returns Whether a loop wrap occurred
   */
  process(sampleFrames: number): boolean {
    if (!this.state.playing) {
      return false;
    }
    
    let loopWrap = false;
    
    // Calculate new position
    const newSample = this.state.currentSample + sampleFrames;
    let newTick = this.tempoMap.samplesToTicks(newSample);
    
    // Handle looping
    if (this.state.looping && this.state.loopEndTick > this.state.loopStartTick) {
      if (newTick >= this.state.loopEndTick) {
        // Wrap to loop start
        const loopLength = this.state.loopEndTick - this.state.loopStartTick;
        const overshoot = newTick - this.state.loopEndTick;
        newTick = this.state.loopStartTick + (overshoot % loopLength);
        newTick = Math.round(newTick);
        loopWrap = true;
      }
    }
    
    // Update state
    const prevTick = this.state.currentTick;
    const prevSample = this.state.currentSample;
    
    this.state.currentTick = newTick;
    this.state.currentSample = Math.round(this.tempoMap.ticksToSamples(newTick));
    
    // Update tempo if changed
    this.updateTempoAndTimeSigAtPosition();
    
    if (prevTick !== this.state.currentTick) {
      this.notifyChange('currentTick', prevTick, this.state.currentTick);
    }
    if (prevSample !== this.state.currentSample) {
      this.notifyChange('currentSample', prevSample, this.state.currentSample);
    }
    
    return loopWrap;
  }
  
  /** Check if current position is within punch range */
  isInPunchRange(): boolean {
    if (this.state.punchIn === null && this.state.punchOut === null) {
      return true; // No punch range set
    }
    
    const tick = this.state.currentTick;
    
    if (this.state.punchIn !== null && tick < this.state.punchIn) {
      return false;
    }
    
    if (this.state.punchOut !== null && tick >= this.state.punchOut) {
      return false;
    }
    
    return true;
  }
  
  /** Get the timing context for converters */
  getTimingContext(): TimingContext {
    return {
      sampleRate: this.sampleRate,
      tempo: this.state.tempo,
      timeSigNum: this.state.timeSigNum,
      timeSigDen: this.state.timeSigDen,
    };
  }
  
  /** Add a tempo event */
  addTempoEvent(event: TempoEvent): void {
    // Remove any existing event at this exact tick
    this.tempoEvents = this.tempoEvents.filter(e => e.tick !== event.tick);
    this.tempoEvents.push(event);
    this.tempoEvents.sort((a, b) => a.tick - b.tick);
    this.tempoMap = new TempoMap(this.tempoEvents, this.sampleRate);
    
    // Update current tempo if needed
    this.updateTempoAndTimeSigAtPosition();
  }
  
  /** Add a time signature event */
  addTimeSignatureEvent(event: TimeSignatureEvent): void {
    // Remove any existing event at this exact tick
    this.timeSigEvents = this.timeSigEvents.filter(e => e.tick !== event.tick);
    this.timeSigEvents.push(event);
    this.timeSigEvents.sort((a, b) => a.tick - b.tick);
    
    // Update current time signature if needed
    this.updateTempoAndTimeSigAtPosition();
  }
  
  /** Reset transport to initial state */
  reset(): void {
    this.stop();
    this.stopRecording();
    this.setPosition(0);
  }
  
  /** Dispose transport resources */
  dispose(): void {
    this.listeners.clear();
    this.stop();
    this.stopRecording();
  }
}

/** Factory function to create a transport */
export function createTransport(options?: TransportOptions): Transport {
  return new Transport(options);
}
