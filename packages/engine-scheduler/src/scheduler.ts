/**
 * Two-Stage Musical Scheduler
 * 
 * Implements section 8.2 of the engineering spec:
 * 1. Musical scheduler worker - resolves clips/scenes into event chunks
 * 2. AudioWorklet render scheduler - consumes events at block boundaries
 * 
 * Key features:
 * - Lookahead scheduling (default: 120ms horizon, 60ms refill threshold, 20ms max chunks)
 * - Loop boundary handling without dropped/duplicated notes
 * - Tempo change coherence
 * - Automation interpolation
 */

import {
  type TransportState,
  type SchedulerConfig,
  type AnyScheduledEvent,
  type TempoEvent,
  type PPQ,
  DEFAULT_SCHEDULER_CONFIG,
  TempoMap,
  ticksToSamples,
} from '@daw/engine-core';

import {
  type EventSource,
  type EventChunk,
  type ScheduleResolution,
  type SchedulerState,
  type SchedulerEvent,
  type SchedulerListener,
  type LookaheadWindow,
  type MidiClipSource,
  type MetronomeConfig,
} from './types.js';

import { EventQueue, createScheduledEvent } from './event-queue.js';
import { LookaheadManager, RenderScheduler } from './lookahead.js';
import { MetronomeEngine } from './metronome.js';

/** Scheduler options */
export interface SchedulerOptions {
  /** Sample rate */
  sampleRate: number;
  /** Scheduler configuration */
  config?: SchedulerConfig;
  /** Tempo map events */
  tempoEvents?: TempoEvent[];
}

/**
 * Two-stage musical scheduler
 * 
 * Stage 1 (Main Thread): Lookahead, resolve clips, prepare event chunks
 * Stage 2 (AudioWorklet): Render-quantum event consumption
 */
export class Scheduler {
  private options: Required<SchedulerOptions>;
  private state: SchedulerState;
  private eventQueue: EventQueue;
  private lookaheadManager: LookaheadManager;
  private tempoMap: TempoMap;
  private eventSources: Map<string, EventSource> = new Map();
  private listeners: Set<SchedulerListener> = new Set();
  private metronome: MetronomeEngine;
  private transportState: TransportState | null = null;
  private currentSample = 0;
  
  // Track active notes for loop wrap handling
  private activeNotes: Map<string, AnyScheduledEvent> = new Map();
  
  constructor(options: SchedulerOptions) {
    this.options = {
      config: DEFAULT_SCHEDULER_CONFIG,
      tempoEvents: [],
      ...options,
    };
    
    this.tempoMap = new TempoMap(this.options.tempoEvents, this.options.sampleRate);
    
    this.state = {
      running: false,
      lastScheduledTick: 0,
      lookaheadEndTick: 0,
      activeSources: new Set(),
      queuedEvents: new Map(),
    };
    
    this.eventQueue = new EventQueue({ maxSize: 5000, deduplicate: true });
    
    this.lookaheadManager = new LookaheadManager({
      config: this.options.config,
      sampleRate: this.options.sampleRate,
      tempoMap: this.tempoMap,
    });
    
    this.metronome = new MetronomeEngine({
      sampleRate: this.options.sampleRate,
    });
  }
  
  /** Start the scheduler */
  start(): void {
    this.state.running = true;
    this.notifyListeners({
      type: 'lookahead-crossed',
      timestamp: performance.now(),
      data: { action: 'start' },
    });
  }
  
  /** Stop the scheduler */
  stop(): void {
    this.state.running = false;
    this.clear();
  }
  
  /** Pause scheduling (keep queued events) */
  pause(): void {
    this.state.running = false;
  }
  
  /** Check if running */
  isRunning(): boolean {
    return this.state.running;
  }
  
  /** Register an event source */
  registerSource(source: EventSource): void {
    this.eventSources.set(source.id, source);
    this.state.activeSources.add(source.id);
  }
  
  /** Unregister an event source */
  unregisterSource(sourceId: string): void {
    this.eventSources.delete(sourceId);
    this.state.activeSources.delete(sourceId);
    // Remove queued events from this source
    this.eventQueue.removeBySource(sourceId);
  } 
  
  /** Update transport state */
  setTransportState(state: TransportState): void {
    const wasPlaying = this.transportState?.playing ?? false;
    this.transportState = state;
    
    // Update lookahead tempo
    this.lookaheadManager.setCurrentTempo(state.tempo);
    this.metronome.setEnabled(state.playing);
    
    // Handle transport start/stop
    if (state.playing && !wasPlaying) {
      this.onTransportStart();
    } else if (!state.playing && wasPlaying) {
      this.onTransportStop();
    }
    
    // Handle loop changes
    if (state.looping) {
      this.lookaheadManager.updateLastLookaheadEnd(state.loopStartTick);
    }
  }
  
  /** Update tempo map */
  setTempoMap(events: TempoEvent[]): void {
    this.tempoMap = new TempoMap(events, this.options.sampleRate);
    this.lookaheadManager.setTempoMap(this.tempoMap);
  }
  
  /** Update current sample position */
  setCurrentSample(sample: number): void {
    this.currentSample = sample;
  }
  
  /** Configure metronome */
  setMetronomeConfig(config: Partial<MetronomeConfig>): void {
    this.metronome.setConfig(config);
  }
  
  /** Main scheduling tick - call frequently (e.g., every 10-20ms) */
  tick(): ScheduleResolution | null {
    if (!this.state.running || !this.transportState?.playing) {
      return null;
    }
    
    const currentTick = this.transportState.currentTick;
    
    // Check if we need to refill
    if (!this.lookaheadManager.needsRefill(this.state.lastScheduledTick, currentTick)) {
      return null;
    }
    
    // Calculate lookahead windows
    const windows = this.lookaheadManager.calculateWindowsWithLoop(
      currentTick,
      this.transportState.looping ? this.transportState.loopStartTick : null,
      this.transportState.looping ? this.transportState.loopEndTick : null
    );
    
    const chunks: EventChunk[] = [];
    const cancelledEvents: AnyScheduledEvent[] = [];
    
    for (const window of windows) {
      // Split window into chunks
      const subChunks = this.lookaheadManager.chunkRange(window.startTick, window.endTick);
      
      for (const subChunk of subChunks) {
        const chunk = this.resolveChunk(
          subChunk.start,
          subChunk.end,
          window.crossesLoopBoundary
        );
        
        if (chunk.events.length > 0 || chunk.isLoopWrap) {
          chunks.push(chunk);
        }
      }
      
      // Handle loop wrap - send note-offs for active notes
      if (window.crossesLoopBoundary) {
        const noteOffs = this.generateLoopWrapNoteOffs(window.startTick);
        cancelledEvents.push(...noteOffs);
      }
      
      // Update last scheduled position
      this.state.lastScheduledTick = window.endTick;
      this.lookaheadManager.updateLastLookaheadEnd(window.endTick);
    }
    
    // Notify listeners
    this.notifyListeners({
      type: 'queue-refill',
      timestamp: performance.now(),
      data: { chunks: chunks.length, events: chunks.reduce((sum, c) => sum + c.events.length, 0) },
    });
    
    return {
      chunks,
      startTick: windows[0]?.startTick ?? currentTick,
      endTick: windows[windows.length - 1]?.endTick ?? currentTick,
      cancelledEvents,
    };
  }
  
  /**
   * Resolve events for a time chunk
   */
  private resolveChunk(
    startTick: number,
    endTick: number,
    isLoopWrap: boolean
  ): EventChunk {
    const events: AnyScheduledEvent[] = [];
    
    // Resolve events from all active sources
    for (const sourceId of this.state.activeSources) {
      const source = this.eventSources.get(sourceId);
      if (!source || !source.isActive()) continue;
      
      const sourceEvents = source.getEvents(startTick, endTick);
      
      // Add to queue with metadata
      for (let i = 0; i < sourceEvents.length; i++) {
        const event = sourceEvents[i];
        const scheduledEvent = createScheduledEvent(event, sourceId, i);
        
        if (this.eventQueue.enqueue(scheduledEvent)) {
          events.push(event);
          
          // Track active notes for loop wrap handling
          if (event.type === 'note-on') {
            this.activeNotes.set(`${event.trackId}:${event.note}`, event);
          } else if (event.type === 'note-off') {
            this.activeNotes.delete(`${event.trackId}:${event.note}`);
          }
        }
      }
    }
    
    // Add metronome clicks
    if (this.transportState) {
      const clicks = this.metronome.generateClicks(
        startTick,
        endTick,
        this.transportState.tempo,
        this.transportState.timeSigNum,
        this.transportState.timeSigDen
      );
      
      for (const click of clicks) {
        events.push(this.metronome.clickToNoteEvent(click, 'metronome'));
      }
    }
    
    // Convert to samples
    const tempo = this.transportState?.tempo ?? 120;
    const startSample = Math.ceil(ticksToSamples(startTick, tempo, this.options.sampleRate));
    const endSample = Math.ceil(ticksToSamples(endTick, tempo, this.options.sampleRate));
    
    // Update sample times for all events
    for (const event of events) {
      event.sampleTime = Math.ceil(
        ticksToSamples(event.tickTime, tempo, this.options.sampleRate)
      );
    }
    
    // Sort by sample time
    events.sort((a, b) => a.sampleTime - b.sampleTime);
    
    return {
      startTick,
      endTick,
      startSample,
      endSample,
      events,
      isLoopWrap,
    };
  }
  
  /**
   * Generate note-offs for active notes at loop wrap
   */
  private generateLoopWrapNoteOffs(atTick: number): AnyScheduledEvent[] {
    const noteOffs: AnyScheduledEvent[] = [];
    const tempo = this.transportState?.tempo ?? 120;
    
    for (const [key, noteOn] of this.activeNotes) {
      if (noteOn.type === 'note-on') {
        noteOffs.push({
          type: 'note-off',
          sampleTime: Math.ceil(ticksToSamples(atTick, tempo, this.options.sampleRate)),
          tickTime: atTick,
          trackId: noteOn.trackId,
          clipId: noteOn.clipId,
          note: noteOn.note,
          velocity: 0,
          channel: noteOn.channel,
        });
      }
    }
    
    // Clear active notes after loop wrap
    this.activeNotes.clear();
    
    return noteOffs;
  }
  
  /** Clear all scheduled events */
  clear(): void {
    this.eventQueue.clear();
    this.activeNotes.clear();
    this.state.lastScheduledTick = 0;
    this.lookaheadManager.reset();
  }
  
  /** Get queue statistics */
  getStats() {
    return this.eventQueue.getStats();
  }
  
  /** Subscribe to scheduler events */
  subscribe(listener: SchedulerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /** Notify listeners */
  private notifyListeners(event: SchedulerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Scheduler listener error:', e);
      }
    }
  }
  
  /** Handle transport start */
  private onTransportStart(): void {
    this.lookaheadManager.reset();
    this.state.lastScheduledTick = this.transportState?.currentTick ?? 0;
    
    // Pre-fill queue
    this.tick();
  }
  
  /** Handle transport stop */
  private onTransportStop(): void {
    // Send all note-offs for active notes
    const allNoteOffs: AnyScheduledEvent[] = [];
    const tempo = this.transportState?.tempo ?? 120;
    const currentTick = this.transportState?.currentTick ?? 0;
    const currentSample = this.currentSample;
    
    for (const [key, noteOn] of this.activeNotes) {
      if (noteOn.type === 'note-on') {
        allNoteOffs.push({
          type: 'note-off',
          sampleTime: currentSample,
          tickTime: currentTick,
          trackId: noteOn.trackId,
          clipId: noteOn.clipId,
          note: noteOn.note,
          velocity: 0,
          channel: noteOn.channel,
        });
      }
    }
    
    this.activeNotes.clear();
    
    // Note: These note-offs should be sent to the audio engine
    // through the normal event delivery path
  }
  
  /** Dispose scheduler resources */
  dispose(): void {
    this.stop();
    this.listeners.clear();
    this.eventSources.clear();
  }
}

/** Create a scheduler */
export function createScheduler(options: SchedulerOptions): Scheduler {
  return new Scheduler(options);
}

// Re-export types and utilities
export { EventQueue, createScheduledEvent, createEventId } from './event-queue.js';
export { LookaheadManager, RenderScheduler } from './lookahead.js';
export { MetronomeEngine, createMetronomeEngine, generateClickSample } from './metronome.js';
export * from './types.js';
