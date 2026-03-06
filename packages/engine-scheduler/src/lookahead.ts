/**
 * Lookahead Scheduling Logic
 * 
 * Implements the two-stage scheduling model per spec section 8.2:
 * 1. Musical scheduler worker resolves clips/scenes into event chunks
 * 2. Looks ahead 50-200ms or N blocks
 */

import type { 
  TransportState, 
  SchedulerConfig,
  PPQ,
} from '@daw/engine-core';
import type { 
  LookaheadWindow,
  EventChunk,
  ScheduledEventWithMetadata,
  AnyScheduledEvent,
} from './types.js';
import { ticksToSamples, samplesToTicks, TempoMap } from '@daw/engine-core';

/** Lookahead manager configuration */
export interface LookaheadManagerOptions {
  config: SchedulerConfig;
  sampleRate: number;
  tempoMap: TempoMap;
}

/**
 * Manages lookahead windows for scheduling
 * Converts between time units and determines when to schedule
 */
export class LookaheadManager {
  private config: SchedulerConfig;
  private sampleRate: number;
  private tempoMap: TempoMap;
  
  // Current lookahead state
  private lastLookaheadEndTick = 0;
  private currentTempo = 120;
  
  constructor(options: LookaheadManagerOptions) {
    this.config = options.config;
    this.sampleRate = options.sampleRate;
    this.tempoMap = options.tempoMap;
  }
  
  /** Update tempo map */
  setTempoMap(tempoMap: TempoMap): void {
    this.tempoMap = tempoMap;
  }
  
  /** Update current tempo for quick calculations */
  setCurrentTempo(bpm: number): void {
    this.currentTempo = bpm;
  }
  
  /**
   * Calculate lookahead window from current position
   * @param currentTick - Current transport position
   * @param currentSample - Current transport position in samples
   * @returns Lookahead window
   */
  calculateWindow(currentTick: number, currentSample: number): LookaheadWindow {
    // Convert prepare horizon to ticks at current tempo
    const horizonSeconds = this.config.prepareHorizonMs / 1000;
    const horizonTicks = (this.currentTempo * horizonSeconds * 960) / 60;
    
    const startTick = Math.max(currentTick, this.lastLookaheadEndTick);
    const endTick = startTick + horizonTicks;
    
    // Check for loop boundary
    // Note: Loop handling is done at a higher level
    
    return {
      startTick,
      endTick,
      durationMs: this.config.prepareHorizonMs,
      crossesLoopBoundary: false,
    };
  }
  
  /**
   * Calculate lookahead window accounting for loop
   * @param currentTick - Current transport position
   * @param loopStart - Loop start tick (or null if no loop)
   * @param loopEnd - Loop end tick (or null if no loop)
   * @returns Array of windows (may be 2 if crossing loop boundary)
   */
  calculateWindowsWithLoop(
    currentTick: number,
    loopStart: number | null,
    loopEnd: number | null
  ): LookaheadWindow[] {
    const window = this.calculateWindow(currentTick, 0);
    
    // No loop or window doesn't cross boundary
    if (loopStart === null || loopEnd === null || window.endTick <= loopEnd) {
      return [window];
    }
    
    // Window crosses loop boundary - split into two windows
    const firstWindow: LookaheadWindow = {
      ...window,
      endTick: loopEnd,
      crossesLoopBoundary: true,
    };
    
    const secondWindow: LookaheadWindow = {
      startTick: loopStart,
      endTick: loopStart + (window.endTick - loopEnd),
      durationMs: 0, // Will calculate
      crossesLoopBoundary: true,
    };
    
    return [firstWindow, secondWindow];
  }
  
  /**
   * Check if we need to refill the schedule queue
   * @param lastScheduledTick - Last tick that has been scheduled
   * @param currentTick - Current transport position
   * @returns True if refill is needed
   */
  needsRefill(lastScheduledTick: number, currentTick: number): boolean {
    const ticksToEnd = lastScheduledTick - currentTick;
    const ticksPerMs = (this.currentTempo * 960) / (60 * 1000);
    const msToEnd = ticksToEnd / ticksPerMs;
    
    return msToEnd < this.config.refillThresholdMs;
  }
  
  /**
   * Update last lookahead end position
   */
  updateLastLookaheadEnd(tick: number): void {
    this.lastLookaheadEndTick = tick;
  }
  
  /**
   * Reset lookahead state
   */
  reset(): void {
    this.lastLookaheadEndTick = 0;
  }
  
  /**
   * Calculate maximum chunk size in ticks
   */
  getMaxChunkTicks(): number {
    const chunkSeconds = this.config.maxChunkMs / 1000;
    return (this.currentTempo * chunkSeconds * 960) / 60;
  }
  
  /**
   * Split a time range into chunks
   */
  chunkRange(startTick: number, endTick: number): Array<{ start: number; end: number }> {
    const maxChunkTicks = this.getMaxChunkTicks();
    const chunks: Array<{ start: number; end: number }> = [];
    
    let current = startTick;
    while (current < endTick) {
      const chunkEnd = Math.min(current + maxChunkTicks, endTick);
      chunks.push({ start: current, end: chunkEnd });
      current = chunkEnd;
    }
    
    return chunks;
  }
  
  /**
   * Convert chunk boundaries to samples
   */
  chunkToSamples(
    chunk: { start: number; end: number },
    startSample: number
  ): { startSample: number; endSample: number } {
    // Convert tick delta to sample delta at current tempo
    const tickDelta = chunk.end - chunk.start;
    const sampleDelta = ticksToSamples(tickDelta, this.currentTempo, this.sampleRate);
    
    return {
      startSample,
      endSample: startSample + sampleDelta,
    };
  }
}

/** 
 * Render scheduler for AudioWorklet
 * Consumes event chunks at block boundaries with sample-accurate offsets
 */
export class RenderScheduler {
  private sampleRate: number;
  private bufferSize: number;
  private eventQueue: AnyScheduledEvent[] = [];
  private currentSample = 0;
  
  constructor(sampleRate: number, bufferSize: number = 128) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
  }
  
  /**
   * Add events for the next render quantum
   */
  scheduleEvents(events: AnyScheduledEvent[]): void {
    this.eventQueue.push(...events);
    // Keep sorted by sample time
    this.eventQueue.sort((a, b) => a.sampleTime - b.sampleTime);
  }
  
  /**
   * Process events for current render quantum
   * @returns Events with sample offsets within the block
   */
  processBlock(currentSample: number): Array<{ event: AnyScheduledEvent; offset: number }> {
    this.currentSample = currentSample;
    const blockEnd = currentSample + this.bufferSize;
    
    const result: Array<{ event: AnyScheduledEvent; offset: number }> = [];
    const remaining: AnyScheduledEvent[] = [];
    
    for (const event of this.eventQueue) {
      if (event.sampleTime >= currentSample && event.sampleTime < blockEnd) {
        // Event falls within this block
        result.push({
          event,
          offset: event.sampleTime - currentSample,
        });
      } else if (event.sampleTime >= blockEnd) {
        // Event is in the future
        remaining.push(event);
      }
      // Events in the past are dropped
    }
    
    this.eventQueue = remaining;
    return result;
  }
  
  /**
   * Clear all pending events
   */
  clear(): void {
    this.eventQueue = [];
  }
  
  /**
   * Get count of pending events
   */
  getPendingCount(): number {
    return this.eventQueue.length;
  }
}

/** Factory for lookahead manager */
export function createLookaheadManager(
  config: SchedulerConfig,
  sampleRate: number,
  tempoMap: TempoMap
): LookaheadManager {
  return new LookaheadManager({ config, sampleRate, tempoMap });
}

/** Factory for render scheduler */
export function createRenderScheduler(
  sampleRate: number,
  bufferSize?: number
): RenderScheduler {
  return new RenderScheduler(sampleRate, bufferSize);
}
