/**
 * Collision AudioWorklet Processor
 * 
 * Realtime-safe implementation of the Collision physical modeling instrument.
 * Runs in the AudioWorklet thread with hard realtime constraints.
 */

import { VoiceAllocator } from '../dsp/voice-allocator.js';
import type { CollisionState, NoteEvent, ControlEvent } from '../types/index.js';

// Worklet message types
interface WorkletMessage {
  type: 'state' | 'note-on' | 'note-off' | 'control' | 'reset';
  payload: unknown;
}

interface StateMessage {
  state: CollisionState;
}

interface NoteMessage {
  note: number;
  velocity: number;
  sampleOffset: number;
}

class CollisionProcessor extends AudioWorkletProcessor {
  private voiceAllocator: VoiceAllocator | null = null;
  private currentState: CollisionState | null = null;
  private sampleRate: number;
  
  // Output buffers (pre-allocated for realtime safety)
  private outputL: Float32Array = new Float32Array(128);
  private outputR: Float32Array = new Float32Array(128);
  
  // Event queue for sample-accurate triggering
  private eventQueue: Array<{ offset: number; event: NoteEvent | ControlEvent }> = [];
  
  // Parameter smoothing
  private paramSmoothing = 0.01; // 10ms smoothing
  
  constructor(options?: AudioWorkletNodeOptions) {
    super(options);
    
    this.sampleRate = sampleRate;
    
    // Listen for messages from the main thread
    this.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
      this.handleMessage(event.data);
    };
    
    console.log('[CollisionWorklet] Processor initialized');
  }
  
  private handleMessage(message: WorkletMessage): void {
    switch (message.type) {
      case 'state': {
        const { state } = message.payload as StateMessage;
        this.updateState(state);
        break;
      }
      
      case 'note-on': {
        const { note, velocity, sampleOffset } = message.payload as NoteMessage;
        this.eventQueue.push({
          offset: Math.max(0, Math.min(sampleOffset, 127)),
          event: { type: 'note-on', note, velocity, sampleOffset }
        });
        break;
      }
      
      case 'note-off': {
        const { note, sampleOffset } = message.payload as NoteMessage;
        this.eventQueue.push({
          offset: Math.max(0, Math.min(sampleOffset, 127)),
          event: { type: 'note-off', note, velocity: 0, sampleOffset }
        });
        break;
      }
      
      case 'control': {
        const { type, value, sampleOffset } = message.payload as { type: string; value: number; sampleOffset: number };
        this.eventQueue.push({
          offset: Math.max(0, Math.min(sampleOffset, 127)),
          event: { type: type as 'pitch-bend' | 'mod-wheel', value, sampleOffset }
        });
        break;
      }
      
      case 'reset':
        this.reset();
        break;
    }
  }
  
  private updateState(state: CollisionState): void {
    // Check if number of voices changed
    const voicesChanged = !this.currentState || 
                          this.currentState.global.voices !== state.global.voices;
    
    this.currentState = state;
    
    if (voicesChanged || !this.voiceAllocator) {
      // Recreate voice allocator with new voice count
      this.voiceAllocator = new VoiceAllocator(
        state.global.voices,
        this.sampleRate,
        state
      );
    } else {
      // Just update parameters
      this.voiceAllocator.updateState(state);
    }
  }
  
  private reset(): void {
    if (this.voiceAllocator) {
      this.voiceAllocator.reset();
    }
    this.eventQueue = [];
  }
  
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    // Get output buffers
    const outputL = outputs[0]?.[0];
    const outputR = outputs[0]?.[1] || outputL;
    
    if (!outputL || !this.voiceAllocator) {
      return true; // Keep alive
    }
    
    const numSamples = outputL.length;
    
    // Ensure our internal buffers are the right size
    if (this.outputL.length !== numSamples) {
      this.outputL = new Float32Array(numSamples);
      this.outputR = new Float32Array(numSamples);
    }
    
    // Clear internal buffers
    this.outputL.fill(0);
    this.outputR.fill(0);
    
    // Process events in sample-accurate order
    if (this.eventQueue.length > 0) {
      // Sort by offset
      this.eventQueue.sort((a, b) => a.offset - b.offset);
      
      // Process events at their sample offsets
      for (const { offset, event } of this.eventQueue) {
        // Process audio up to this event
        if (offset > 0) {
          const tempL = this.outputL.subarray(0, offset);
          const tempR = this.outputR.subarray(0, offset);
          this.voiceAllocator.process(tempL, tempR, offset);
        }
        
        // Process the event
        if (event.type === 'note-on' || event.type === 'note-off') {
          this.voiceAllocator.processNoteEvent(event as NoteEvent);
        } else {
          this.voiceAllocator.processControlEvent(event as ControlEvent);
        }
      }
      
      // Clear event queue
      this.eventQueue = [];
    }
    
    // Process remaining samples
    this.voiceAllocator.process(this.outputL, this.outputR, numSamples);
    
    // Copy to output
    outputL.set(this.outputL);
    if (outputR !== outputL) {
      outputR.set(this.outputR);
    }
    
    // Keep alive - return false only when we want to stop processing
    return true;
  }
}

// Register the processor
registerProcessor('collision-instrument', CollisionProcessor);
