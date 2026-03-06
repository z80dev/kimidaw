/**
 * Electric AudioWorklet Processor
 */

import { ElectricVoiceAllocator } from '../dsp/voice-allocator.js';
import type { ElectricState, NoteEvent, ControlEvent } from '../types/index.js';

interface WorkletMessage {
  type: 'state' | 'note-on' | 'note-off' | 'control' | 'reset';
  payload: unknown;
}

class ElectricProcessor extends AudioWorkletProcessor {
  private voiceAllocator: ElectricVoiceAllocator | null = null;
  private currentState: ElectricState | null = null;
  private sampleRate: number;
  private outputL: Float32Array = new Float32Array(128);
  private outputR: Float32Array = new Float32Array(128);
  private eventQueue: Array<{ offset: number; event: NoteEvent | ControlEvent }> = [];

  constructor(options?: AudioWorkletNodeOptions) {
    super(options);
    this.sampleRate = sampleRate;
    this.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
      this.handleMessage(event.data);
    };
  }

  private handleMessage(message: WorkletMessage): void {
    switch (message.type) {
      case 'state':
        const { state } = message.payload as { state: ElectricState };
        this.updateState(state);
        break;

      case 'note-on':
        const { note, velocity, sampleOffset } = message.payload as { note: number; velocity: number; sampleOffset: number };
        this.eventQueue.push({
          offset: Math.max(0, Math.min(sampleOffset, 127)),
          event: { type: 'note-on', note, velocity, sampleOffset }
        });
        break;

      case 'note-off':
        const noteOffPayload = message.payload as { note: number; sampleOffset: number };
        this.eventQueue.push({
          offset: Math.max(0, Math.min(noteOffPayload.sampleOffset, 127)),
          event: { type: 'note-off', note: noteOffPayload.note, velocity: 0, sampleOffset: noteOffPayload.sampleOffset }
        });
        break;

      case 'control':
        const controlPayload = message.payload as { type: string; value: number; sampleOffset: number };
        this.eventQueue.push({
          offset: Math.max(0, Math.min(controlPayload.sampleOffset, 127)),
          event: { type: controlPayload.type as 'sustain', value: controlPayload.value, sampleOffset: controlPayload.sampleOffset }
        });
        break;

      case 'reset':
        this.reset();
        break;
    }
  }

  private updateState(state: ElectricState): void {
    const voicesChanged = !this.currentState || this.currentState.global.voices !== state.global.voices;
    this.currentState = state;

    if (voicesChanged || !this.voiceAllocator) {
      this.voiceAllocator = new ElectricVoiceAllocator(
        state.global.voices,
        this.sampleRate,
        state
      );
    } else {
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
    const outputL = outputs[0]?.[0];
    const outputR = outputs[0]?.[1] || outputL;

    if (!outputL || !this.voiceAllocator) {
      return true;
    }

    const numSamples = outputL.length;

    if (this.outputL.length !== numSamples) {
      this.outputL = new Float32Array(numSamples);
      this.outputR = new Float32Array(numSamples);
    }

    this.outputL.fill(0);
    this.outputR.fill(0);

    // Process events
    if (this.eventQueue.length > 0) {
      this.eventQueue.sort((a, b) => a.offset - b.offset);

      for (const { offset, event } of this.eventQueue) {
        if (offset > 0) {
          const tempL = this.outputL.subarray(0, offset);
          const tempR = this.outputR.subarray(0, offset);
          this.voiceAllocator.process(tempL, tempR, offset);
        }

        if (event.type === 'note-on' || event.type === 'note-off') {
          this.voiceAllocator.processNoteEvent(event as NoteEvent);
        } else {
          this.voiceAllocator.processControlEvent(event as ControlEvent);
        }
      }

      this.eventQueue = [];
    }

    this.voiceAllocator.process(this.outputL, this.outputR, numSamples);

    outputL.set(this.outputL);
    if (outputR !== outputL) {
      outputR.set(this.outputR);
    }

    return true;
  }
}

registerProcessor('electric-instrument', ElectricProcessor);
