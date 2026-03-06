/**
 * Event Queue Management
 * 
 * Manages scheduled events in a priority queue optimized for:
 * - Fast insertion by time
 * - Fast retrieval of events in time range
 * - Deduplication by event ID
 * - Priority ordering
 */

import type { 
  AnyScheduledEvent, 
  ScheduledEventWithMetadata,
  QueueStats,
  EventPriority,
} from './types.js';

/** Node in the event queue binary heap */
interface QueueNode {
  /** Event tick time (sort key) */
  tick: number;
  /** Event */
  event: ScheduledEventWithMetadata;
}

/** Options for event queue */
export interface EventQueueOptions {
  /** Maximum number of events */
  maxSize?: number;
  /** Enable deduplication */
  deduplicate?: boolean;
}

/**
 * Priority queue for scheduled events
 * Uses a binary heap for O(log n) insertion and extraction
 */
export class EventQueue {
  private heap: QueueNode[] = [];
  private eventMap: Map<string, ScheduledEventWithMetadata> = new Map();
  private maxSize: number;
  private deduplicate: boolean;
  private droppedCount = 0;
  
  constructor(options: EventQueueOptions = {}) {
    this.maxSize = options.maxSize ?? 10000;
    this.deduplicate = options.deduplicate ?? true;
  }
  
  /** Get number of events in queue */
  get size(): number {
    return this.heap.length;
  }
  
  /** Get count of dropped events */
  get dropped(): number {
    return this.droppedCount;
  }
  
  /** Check if queue is empty */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }
  
  /** Clear all events */
  clear(): void {
    this.heap = [];
    this.eventMap.clear();
    this.droppedCount = 0;
  }
  
  /**
   * Add an event to the queue
   * @returns true if added, false if dropped
   */
  enqueue(event: ScheduledEventWithMetadata): boolean {
    // Check for duplicates
    if (this.deduplicate && this.eventMap.has(event.eventId)) {
      return false;
    }
    
    // Check capacity
    if (this.heap.length >= this.maxSize) {
      // Drop lowest priority event if new event has higher priority
      const lowestPriority = this.heap[this.heap.length - 1];
      if (lowestPriority && event.priority < lowestPriority.event.priority) {
        this.removeLowestPriority();
      } else {
        this.droppedCount++;
        return false;
      }
    }
    
    // Add to map for deduplication
    this.eventMap.set(event.eventId, event);
    
    // Add to heap
    const node: QueueNode = { tick: event.tickTime, event };
    this.heap.push(node);
    this.heapifyUp(this.heap.length - 1);
    
    return true;
  }
  
  /**
   * Add multiple events
   */
  enqueueBatch(events: ScheduledEventWithMetadata[]): number {
    let added = 0;
    for (const event of events) {
      if (this.enqueue(event)) {
        added++;
      }
    }
    return added;
  }
  
  /**
   * Get the earliest event without removing
   */
  peek(): ScheduledEventWithMetadata | undefined {
    return this.heap[0]?.event;
  }
  
  /**
   * Remove and return the earliest event
   */
  dequeue(): ScheduledEventWithMetadata | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }
    
    const node = this.heap[0];
    this.removeAt(0);
    
    return node.event;
  }
  
  /**
   * Get all events in a time range without removing
   */
  getRange(startTick: number, endTick: number): ScheduledEventWithMetadata[] {
    const result: ScheduledEventWithMetadata[] = [];
    
    for (const node of this.heap) {
      if (node.tick >= startTick && node.tick < endTick) {
        result.push(node.event);
      }
    }
    
    // Sort by tick time
    return result.sort((a, b) => a.tickTime - b.tickTime);
  }
  
  /**
   * Remove and return all events in a time range
   */
  dequeueRange(startTick: number, endTick: number): ScheduledEventWithMetadata[] {
    const result: ScheduledEventWithMetadata[] = [];
    const remaining: QueueNode[] = [];
    
    for (const node of this.heap) {
      if (node.tick >= startTick && node.tick < endTick) {
        result.push(node.event);
        this.eventMap.delete(node.event.eventId);
      } else {
        remaining.push(node);
      }
    }
    
    // Rebuild heap
    this.heap = remaining;
    this.buildHeap();
    
    return result.sort((a, b) => a.tickTime - b.tickTime);
  }
  
  /**
   * Remove events for a specific source
   */
  removeBySource(sourceId: string): number {
    let removed = 0;
    const remaining: QueueNode[] = [];
    
    for (const node of this.heap) {
      if (node.event.trackId === sourceId) {
        this.eventMap.delete(node.event.eventId);
        removed++;
      } else {
        remaining.push(node);
      }
    }
    
    this.heap = remaining;
    this.buildHeap();
    return removed;
  }
  
  /**
   * Remove events by event ID pattern
   */
  removeById(pattern: string | RegExp): number {
    let removed = 0;
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    const remaining: QueueNode[] = [];
    
    for (const node of this.heap) {
      if (regex.test(node.event.eventId)) {
        this.eventMap.delete(node.event.eventId);
        removed++;
      } else {
        remaining.push(node);
      }
    }
    
    this.heap = remaining;
    this.buildHeap();
    return removed;
  }
  
  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const eventsByType: Record<string, number> = {};
    let minTick = Infinity;
    let maxTick = -Infinity;
    
    for (const node of this.heap) {
      const type = node.event.type;
      eventsByType[type] = (eventsByType[type] ?? 0) + 1;
      
      minTick = Math.min(minTick, node.tick);
      maxTick = Math.max(maxTick, node.tick);
    }
    
    const timeSpanMs = minTick < Infinity && maxTick > -Infinity
      ? ((maxTick - minTick) / 960) * 500 // Approximate ms at 120bpm
      : 0;
    
    return {
      eventCount: this.heap.length,
      eventsByType,
      fillRatio: this.heap.length / this.maxSize,
      timeSpanMs,
      needsRefill: this.heap.length < this.maxSize * 0.3,
    };
  }
  
  /**
   * Find events by type
   */
  findByType<T extends AnyScheduledEvent>(type: T['type']): T[] {
    return this.heap
      .filter(node => node.event.type === type)
      .map(node => node.event as T);
  }
  
  /** Remove event at index */
  private removeAt(index: number): void {
    if (index >= this.heap.length) return;
    
    const node = this.heap[index];
    this.eventMap.delete(node.event.eventId);
    
    // Move last element to position and heapify
    const last = this.heap.pop();
    if (index < this.heap.length && last) {
      this.heap[index] = last;
      this.heapifyDown(index);
    }
  }
  
  /** Remove lowest priority event (last in heap) */
  private removeLowestPriority(): void {
    if (this.heap.length === 0) return;
    this.removeAt(this.heap.length - 1);
  }
  
  /** Move element up to maintain heap property */
  private heapifyUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      
      if (this.heap[parentIndex].tick <= this.heap[index].tick) {
        break;
      }
      
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }
  
  /** Move element down to maintain heap property */
  private heapifyDown(index: number): void {
    while (true) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      
      if (leftChild < this.heap.length && 
          this.heap[leftChild].tick < this.heap[smallest].tick) {
        smallest = leftChild;
      }
      
      if (rightChild < this.heap.length && 
          this.heap[rightChild].tick < this.heap[smallest].tick) {
        smallest = rightChild;
      }
      
      if (smallest === index) break;
      
      this.swap(index, smallest);
      index = smallest;
    }
  }
  
  /** Swap two elements */
  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
  
  /** Build heap from array */
  private buildHeap(): void {
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.heapifyDown(i);
    }
  }
}

/** Create an event ID */
export function createEventId(
  source: string,
  type: string,
  tick: number,
  index: number
): string {
  return `${source}:${type}:${tick}:${index}`;
}

/** Priority for event types */
export const EVENT_PRIORITY: Record<string, number> = {
  'note-on': 0,
  'note-off': 0,
  'clip-start': 1,
  'clip-end': 1,
  'automation': 2,
  'parameter': 2,
};

/** Create a scheduled event with metadata */
export function createScheduledEvent(
  event: AnyScheduledEvent,
  source: string,
  index: number
): ScheduledEventWithMetadata {
  return {
    ...event,
    eventId: createEventId(source, event.type, event.tickTime, index),
    scheduledAt: performance.now(),
    priority: EVENT_PRIORITY[event.type] ?? 5,
  };
}
