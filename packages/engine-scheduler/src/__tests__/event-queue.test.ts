import { describe, it, expect, beforeEach } from 'vitest';
import { EventQueue, createScheduledEvent, createEventId } from '../event-queue.js';
import type { ScheduledEventWithMetadata, NoteEvent } from '../types.js';

describe('EventQueue', () => {
  let queue: EventQueue;
  
  beforeEach(() => {
    queue = new EventQueue();
  });
  
  describe('basic operations', () => {
    it('starts empty', () => {
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size).toBe(0);
    });
    
    it('enqueues and dequeues events', () => {
      const event = createTestEvent(100);
      queue.enqueue(event);
      
      expect(queue.size).toBe(1);
      
      const dequeued = queue.dequeue();
      expect(dequeued?.eventId).toBe(event.eventId);
      expect(queue.isEmpty()).toBe(true);
    });
    
    it('maintains priority order (by tick time)', () => {
      const event1 = createTestEvent(200);
      const event2 = createTestEvent(100);
      const event3 = createTestEvent(300);
      
      queue.enqueue(event1);
      queue.enqueue(event2);
      queue.enqueue(event3);
      
      // Should come out in tick order
      expect(queue.dequeue()?.tickTime).toBe(100);
      expect(queue.dequeue()?.tickTime).toBe(200);
      expect(queue.dequeue()?.tickTime).toBe(300);
    });
    
    it('peeks at earliest event without removing', () => {
      const event = createTestEvent(100);
      queue.enqueue(event);
      
      const peeked = queue.peek();
      expect(peeked?.eventId).toBe(event.eventId);
      expect(queue.size).toBe(1); // Still in queue
    });
  });
  
  describe('range operations', () => {
    it('gets events in range without removing', () => {
      queue.enqueue(createTestEvent(100));
      queue.enqueue(createTestEvent(200));
      queue.enqueue(createTestEvent(300));
      
      const range = queue.getRange(150, 350);
      expect(range).toHaveLength(2);
      expect(range[0].tickTime).toBe(200);
      expect(range[1].tickTime).toBe(300);
      expect(queue.size).toBe(3); // Still in queue
    });
    
    it('dequeues events in range', () => {
      queue.enqueue(createTestEvent(100));
      queue.enqueue(createTestEvent(200));
      queue.enqueue(createTestEvent(300));
      
      const range = queue.dequeueRange(150, 350);
      expect(range).toHaveLength(2);
      expect(queue.size).toBe(1);
      expect(queue.peek()?.tickTime).toBe(100);
    });
  });
  
  describe('batch operations', () => {
    it('enqueues multiple events', () => {
      const events = [
        createTestEvent(100),
        createTestEvent(200),
        createTestEvent(300),
      ];
      
      const added = queue.enqueueBatch(events);
      expect(added).toBe(3);
      expect(queue.size).toBe(3);
    });
  });
  
  describe('deduplication', () => {
    it('rejects duplicate event IDs', () => {
      const event = createTestEvent(100, 'duplicate-id');
      queue.enqueue(event);
      
      const duplicate = createTestEvent(200, 'duplicate-id');
      const result = queue.enqueue(duplicate);
      
      expect(result).toBe(false);
      expect(queue.size).toBe(1);
    });
  });
  
  describe('capacity limits', () => {
    it('drops events when at capacity', () => {
      const smallQueue = new EventQueue({ maxSize: 2 });
      
      smallQueue.enqueue(createTestEvent(100, 'a', 5));
      smallQueue.enqueue(createTestEvent(200, 'b', 5));
      
      // Third event should be dropped (same priority)
      const result = smallQueue.enqueue(createTestEvent(300, 'c', 5));
      expect(result).toBe(false);
      expect(smallQueue.size).toBe(2);
    });
    
    it('replaces lower priority events when at capacity', () => {
      const smallQueue = new EventQueue({ maxSize: 2 });
      
      // Low priority events
      smallQueue.enqueue(createTestEvent(100, 'a', 10));
      smallQueue.enqueue(createTestEvent(200, 'b', 10));
      
      // High priority event should replace lowest
      const result = smallQueue.enqueue(createTestEvent(300, 'c', 1));
      expect(result).toBe(true);
      expect(smallQueue.size).toBe(2);
    });
  });
  
  describe('removal', () => {
    it('removes by source', () => {
      queue.enqueue(createTestEvent(100, 'a', 5, 'track-1'));
      queue.enqueue(createTestEvent(200, 'b', 5, 'track-1'));
      queue.enqueue(createTestEvent(300, 'c', 5, 'track-2'));
      
      const removed = queue.removeBySource('track-1');
      expect(removed).toBe(2);
      expect(queue.size).toBe(1);
    });
    
    it('removes by ID pattern', () => {
      queue.enqueue(createTestEvent(100, 'note:track1:1'));
      queue.enqueue(createTestEvent(200, 'note:track1:2'));
      queue.enqueue(createTestEvent(300, 'note:track2:1'));
      
      const removed = queue.removeById(/track1/);
      expect(removed).toBe(2);
    });
  });
  
  describe('stats', () => {
    it('returns queue statistics', () => {
      queue.enqueue(createTestEvent(100));
      queue.enqueue(createTestEvent(200));
      
      const stats = queue.getStats();
      expect(stats.eventCount).toBe(2);
      expect(stats.fillRatio).toBe(2 / 10000);
    });
  });
  
  describe('clear', () => {
    it('clears all events', () => {
      queue.enqueue(createTestEvent(100));
      queue.enqueue(createTestEvent(200));
      
      queue.clear();
      
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size).toBe(0);
    });
  });
});

describe('createEventId', () => {
  it('creates unique IDs', () => {
    const id1 = createEventId('track1', 'note-on', 100, 0);
    const id2 = createEventId('track1', 'note-on', 100, 1);
    
    expect(id1).not.toBe(id2);
    expect(id1).toContain('track1');
    expect(id1).toContain('note-on');
  });
});

// Helper function
function createTestEvent(
  tick: number,
  id?: string,
  priority = 5,
  trackId = 'track-1'
): ScheduledEventWithMetadata {
  const baseEvent: NoteEvent = {
    type: 'note-on',
    sampleTime: tick * 10,
    tickTime: tick,
    trackId,
    note: 60,
    velocity: 100,
    channel: 0,
  };
  
  return {
    ...baseEvent,
    eventId: id ?? `event-${tick}`,
    scheduledAt: performance.now(),
    priority,
  };
}
