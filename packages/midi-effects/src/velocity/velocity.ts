/**
 * Velocity MIDI Effect
 * Processes and modifies note velocities
 */

import {
  BaseMidiEffect,
  createNoteOn,
  type MidiEvent,
} from "../types.js";
import {
  type VelocityParams,
  type VelocityMode,
  DEFAULT_VELOCITY_PARAMS,
} from "./types.js";

export class Velocity extends BaseMidiEffect {
  readonly name = "Velocity";
  readonly version = "1.0.0";

  private params: VelocityParams = { ...DEFAULT_VELOCITY_PARAMS };
  private randomSeed = Math.floor(Math.random() * 0x7fffffff);
  private randomState = this.randomSeed;

  protected onParameterChange(id: string, value: number | string | boolean): void {
    switch (id) {
      case "mode":
        if (typeof value === "string") this.params.mode = value as VelocityMode;
        break;
      case "drive":
        if (typeof value === "number") this.params.drive = Math.max(-128, Math.min(127, Math.floor(value)));
        break;
      case "compand":
        if (typeof value === "number") this.params.compand = Math.max(-100, Math.min(100, value));
        break;
      case "random":
        if (typeof value === "number") this.params.random = Math.max(0, Math.min(127, Math.floor(value)));
        break;
      case "outLow":
        if (typeof value === "number") this.params.outLow = Math.max(0, Math.min(127, Math.floor(value)));
        break;
      case "outHigh":
        if (typeof value === "number") this.params.outHigh = Math.max(0, Math.min(127, Math.floor(value)));
        break;
      case "rangeLow":
        if (typeof value === "number") this.params.rangeLow = Math.max(0, Math.min(127, Math.floor(value)));
        break;
      case "rangeHigh":
        if (typeof value === "number") this.params.rangeHigh = Math.max(0, Math.min(127, Math.floor(value)));
        break;
    }
  }

  process(events: MidiEvent[], _sampleTime: number): MidiEvent[] {
    const output: MidiEvent[] = [];

    for (const event of events) {
      if (event.type === "note-on") {
        const noteEvent = event as unknown as { type: "note-on"; note: number; velocity: number; channel: number; sampleTime: number };
        
        // Check if note is in range
        const inRange = noteEvent.note >= this.params.rangeLow && noteEvent.note <= this.params.rangeHigh;
        
        let newVelocity = noteEvent.velocity;
        
        if (inRange) {
          newVelocity = this.processVelocity(noteEvent.velocity);
        }

        output.push(createNoteOn(
          noteEvent.note,
          newVelocity,
          noteEvent.channel,
          noteEvent.sampleTime
        ));

      } else {
        // Pass through non-note-on events (including note-off)
        output.push(event);
      }
    }

    return output;
  }

  private processVelocity(velocity: number): number {
    let result = velocity;

    switch (this.params.mode) {
      case "clip":
        // Clip to output range
        result = Math.max(this.params.outLow, Math.min(this.params.outHigh, velocity));
        break;

      case "gate":
        // Gate: notes below outLow are set to 0, others pass through
        if (velocity < this.params.outLow) {
          result = 0;
        } else if (velocity > this.params.outHigh) {
          result = this.params.outHigh;
        }
        break;

      case "fixed":
        // Fixed output velocity
        result = this.params.outHigh;
        break;

      case "relative":
        // Relative: apply drive
        result = velocity + this.params.drive;
        break;

      case "compand":
        // Compress/expand curve
        result = this.applyCompand(velocity);
        break;
    }

    // Apply randomization
    if (this.params.random > 0) {
      const randomOffset = Math.floor(this.random() * (this.params.random * 2 + 1)) - this.params.random;
      result += randomOffset;
    }

    // Final output range mapping
    if (this.params.mode !== "fixed" && this.params.mode !== "gate") {
      result = this.mapToOutputRange(result);
    }

    // Clamp to valid MIDI range
    return Math.max(0, Math.min(127, Math.round(result)));
  }

  private applyCompand(velocity: number): number {
    // Normalize to 0-1
    const normalized = velocity / 127;
    
    // Apply compand curve
    // Negative = compress (reduce dynamic range)
    // Positive = expand (increase dynamic range)
    const compandFactor = this.params.compand / 100;
    
    let curved: number;
    if (compandFactor > 0) {
      // Expand: power curve
      curved = Math.pow(normalized, 1 / (1 + compandFactor));
    } else if (compandFactor < 0) {
      // Compress: power curve
      curved = Math.pow(normalized, 1 + Math.abs(compandFactor));
    } else {
      curved = normalized;
    }

    return curved * 127;
  }

  private mapToOutputRange(velocity: number): number {
    // Normalize input to 0-1
    const inputLow = 0;
    const inputHigh = 127;
    const normalized = (velocity - inputLow) / (inputHigh - inputLow);
    
    // Map to output range
    return this.params.outLow + normalized * (this.params.outHigh - this.params.outLow);
  }

  private random(): number {
    this.randomState = (this.randomState * 1103515245 + 12345) & 0x7fffffff;
    return this.randomState / 0x7fffffff;
  }

  saveState(): Record<string, unknown> {
    return {
      params: { ...this.params },
      randomSeed: this.randomSeed,
      randomState: this.randomState,
    };
  }

  loadState(state: Record<string, unknown>): void {
    if (state.params && typeof state.params === "object") {
      this.params = { ...this.params, ...(state.params as Partial<VelocityParams>) };
    }
    if (typeof state.randomSeed === "number") {
      this.randomSeed = state.randomSeed;
    }
    if (typeof state.randomState === "number") {
      this.randomState = state.randomState;
    }
  }

  reset(): void {
    super.reset();
    this.params = { ...DEFAULT_VELOCITY_PARAMS };
    this.randomSeed = Math.floor(Math.random() * 0x7fffffff);
    this.randomState = this.randomSeed;
  }
}
