/**
 * MPE Control MIDI Effect
 * Manages MPE (MIDI Polyphonic Expression) voice allocation and per-note control
 */

import {
  BaseMidiEffect,
  createNoteOn,
  createNoteOff,
  createCC,
  createPitchBend,
  type MidiEvent,
} from "../types.js";
import {
  type MPEControlParams,
  type MPENoteState,
  type MPERouting,
  DEFAULT_MPE_CONTROL_PARAMS,
} from "./types.js";

export class MPEControl extends BaseMidiEffect {
  readonly name = "MPE Control";
  readonly version = "1.0.0";

  private params: MPEControlParams = { ...DEFAULT_MPE_CONTROL_PARAMS };
  
  /** Active notes with their assigned channels */
  private activeNotes: Map<number, MPENoteState> = new Map(); // note number -> state
  /** Channel availability: true = free, false = occupied */
  private channelPool: boolean[] = Array(16).fill(true);
  /** Round-robin index */
  private roundRobinIndex = 1;
  /** Routings for modulation */
  private routings: MPERouting[] = [];


  protected onParameterChange(id: string, value: number | string | boolean): void {
    switch (id) {
      case "mpeEnabled":
        if (typeof value === "boolean") this.params.mpeEnabled = value;
        break;
      case "pitchBendRange":
        if (typeof value === "number") this.params.pitchBend.range = Math.max(-24, Math.min(24, Math.floor(value)));
        break;
      case "pitchBendEnabled":
        if (typeof value === "boolean") this.params.pitchBend.enabled = value;
        break;
      case "pitchBendSmoothing":
        if (typeof value === "number") this.params.pitchBend.smoothing = Math.max(0, Math.min(100, value));
        break;
      case "slideEnabled":
        if (typeof value === "boolean") this.params.slide.enabled = value;
        break;
      case "slideInMin":
        if (typeof value === "number") this.params.slide.inMin = Math.max(0, Math.min(127, Math.floor(value)));
        break;
      case "slideInMax":
        if (typeof value === "number") this.params.slide.inMax = Math.max(0, Math.min(127, Math.floor(value)));
        break;
      case "slideOutMin":
        if (typeof value === "number") this.params.slide.outMin = Math.max(0, Math.min(127, Math.floor(value)));
        break;
      case "slideOutMax":
        if (typeof value === "number") this.params.slide.outMax = Math.max(0, Math.min(127, Math.floor(value)));
        break;
      case "slideCurve":
        if (typeof value === "string") this.params.slide.curve = value as "linear" | "exp" | "log";
        break;
      case "pressureEnabled":
        if (typeof value === "boolean") this.params.pressure.enabled = value;
        break;
      case "pressureInMin":
        if (typeof value === "number") this.params.pressure.inMin = Math.max(0, Math.min(127, Math.floor(value)));
        break;
      case "pressureInMax":
        if (typeof value === "number") this.params.pressure.inMax = Math.max(0, Math.min(127, Math.floor(value)));
        break;
      case "pressureOutMin":
        if (typeof value === "number") this.params.pressure.outMin = Math.max(0, Math.min(127, Math.floor(value)));
        break;
      case "pressureOutMax":
        if (typeof value === "number") this.params.pressure.outMax = Math.max(0, Math.min(127, Math.floor(value)));
        break;
      case "pressureCurve":
        if (typeof value === "string") this.params.pressure.curve = value as "linear" | "exp" | "log";
        break;
      case "voiceAllocation":
        if (typeof value === "string") this.params.voiceAllocation = value as MPEControlParams["voiceAllocation"];
        break;
      case "upperZoneMaster":
        if (typeof value === "number") this.params.upperZone.masterChannel = Math.max(0, Math.min(15, Math.floor(value)));
        break;
      case "upperZoneMembers":
        if (typeof value === "number") this.params.upperZone.memberChannels = Math.max(0, Math.min(15, Math.floor(value)));
        break;
      case "lowerZoneMaster":
        if (typeof value === "number") this.params.lowerZone.masterChannel = Math.max(0, Math.min(15, Math.floor(value)));
        break;
      case "lowerZoneMembers":
        if (typeof value === "number") this.params.lowerZone.memberChannels = Math.max(0, Math.min(15, Math.floor(value)));
        break;
    }
  }

  process(events: MidiEvent[], sampleTime: number): MidiEvent[] {
    const output: MidiEvent[] = [];

    // If MPE is disabled, just pass through
    if (!this.params.mpeEnabled) {
      return events;
    }

    for (const event of events) {
      switch (event.type) {
        case "note-on": {
          const noteEvent = event as unknown as { type: "note-on"; note: number; velocity: number; channel: number; sampleTime: number };
          const channel = this.allocateChannel(noteEvent.note);
          
          if (channel >= 0) {
            const noteState: MPENoteState = {
              note: noteEvent.note,
              channel,
              pitchBend: 0,
              slide: 0,
              pressure: 0,
              velocity: noteEvent.velocity,
              startTime: sampleTime,
            };
            
            this.activeNotes.set(noteEvent.note, noteState);
            this.channelPool[channel] = false;

            // Send initial MPE configuration on the channel
            // Pitch bend range RPN
            output.push(createCC(101, 0, channel, sampleTime)); // RPN MSB
            output.push(createCC(100, 0, channel, sampleTime)); // RPN LSB (pitch bend range)
            output.push(createCC(6, Math.abs(this.params.pitchBend.range), channel, sampleTime)); // Data entry

            // Send note-on on assigned channel
            output.push(createNoteOn(noteEvent.note, noteEvent.velocity, channel, noteEvent.sampleTime));
          }
          break;
        }

        case "note-off": {
          const noteEvent = event as unknown as { type: "note-off"; note: number; velocity: number; channel: number; sampleTime: number };
          const noteState = this.activeNotes.get(noteEvent.note);
          
          if (noteState) {
            output.push(createNoteOff(
              noteEvent.note,
              noteEvent.velocity,
              noteState.channel,
              noteEvent.sampleTime
            ));
            
            this.channelPool[noteState.channel] = true;
            this.activeNotes.delete(noteEvent.note);
          }
          break;
        }

        case "pitch-bend": {
          const pbEvent = event as unknown as { type: "pitch-bend"; value: number; channel: number; sampleTime: number };
          
          if (this.params.pitchBend.enabled) {
            // Apply per-note pitch bend to all active notes
            for (const [, state] of this.activeNotes) {
              state.pitchBend = pbEvent.value;
              output.push(createPitchBend(pbEvent.value, state.channel, pbEvent.sampleTime));
            }
          }
          break;
        }

        case "control-change": {
          const ccEvent = event as unknown as { type: "control-change"; controller: number; value: number; channel: number; sampleTime: number };
          
          // CC74 = Slide/Timbre in MPE
          if (ccEvent.controller === 74 && this.params.slide.enabled) {
            const processedValue = this.processSlide(ccEvent.value);
            
            // Send to all active notes' channels
            for (const [, state] of this.activeNotes) {
              state.slide = processedValue;
              output.push(createCC(74, processedValue, state.channel, ccEvent.sampleTime));
            }
          } else {
            // Other CCs - broadcast to all channels or pass through
            output.push(event);
          }
          break;
        }

        case "channel-aftertouch": {
          const atEvent = event as unknown as { type: "channel-aftertouch"; pressure: number; channel: number; sampleTime: number };
          
          if (this.params.pressure.enabled) {
            const processedValue = this.processPressure(atEvent.pressure);
            
            // Send to all active notes' channels
            for (const [, state] of this.activeNotes) {
              state.pressure = processedValue;
              output.push({
                type: "channel-aftertouch",
                channel: state.channel,
                sampleTime: atEvent.sampleTime,
                data: [0xd0 | state.channel, processedValue],
              } as MidiEvent);
            }
          }
          break;
        }

        default:
          output.push(event);
      }
    }

    return output;
  }

  private allocateChannel(note: number): number {
    switch (this.params.voiceAllocation) {
      case "round-robin":
        return this.allocateRoundRobin();
      case "lowest":
        return this.allocateLowest(note);
      case "highest":
        return this.allocateHighest(note);
      case "last":
        return this.allocateLast();
      default:
        return this.allocateRoundRobin();
    }
  }

  private allocateRoundRobin(): number {
    const startIndex = this.roundRobinIndex;
    
    do {
      const channel = this.roundRobinIndex;
      this.roundRobinIndex = (this.roundRobinIndex % 15) + 1; // Skip channel 0 for MPE
      
      if (this.channelPool[channel]) {
        return channel;
      }
    } while (this.roundRobinIndex !== startIndex);
    
    return -1; // No free channels
  }

  private allocateLowest(newNote: number): number {
    // Find the channel playing the lowest note and steal it
    let lowestNote = 128;
    let lowestChannel = -1;
    
    for (const [note, state] of this.activeNotes) {
      if (note < lowestNote) {
        lowestNote = note;
        lowestChannel = state.channel;
      }
    }
    
    // If new note is higher, use a free channel or steal
    if (newNote > lowestNote) {
      for (let i = 1; i < 16; i++) {
        if (this.channelPool[i]) return i;
      }
      return lowestChannel;
    }
    
    // Otherwise use a free channel
    for (let i = 1; i < 16; i++) {
      if (this.channelPool[i]) return i;
    }
    
    return -1;
  }

  private allocateHighest(newNote: number): number {
    // Find the channel playing the highest note and steal it
    let highestNote = -1;
    let highestChannel = -1;
    
    for (const [note, state] of this.activeNotes) {
      if (note > highestNote) {
        highestNote = note;
        highestChannel = state.channel;
      }
    }
    
    // If new note is lower, use a free channel or steal
    if (newNote < highestNote) {
      for (let i = 1; i < 16; i++) {
        if (this.channelPool[i]) return i;
      }
      return highestChannel;
    }
    
    // Otherwise use a free channel
    for (let i = 1; i < 16; i++) {
      if (this.channelPool[i]) return i;
    }
    
    return -1;
  }

  private allocateLast(): number {
    // Use the most recently freed channel, or round-robin
    for (let i = 1; i < 16; i++) {
      if (this.channelPool[i]) return i;
    }
    return -1;
  }

  private processSlide(value: number): number {
    return this.processWithCurve(
      value,
      this.params.slide.inMin,
      this.params.slide.inMax,
      this.params.slide.outMin,
      this.params.slide.outMax,
      this.params.slide.curve
    );
  }

  private processPressure(value: number): number {
    return this.processWithCurve(
      value,
      this.params.pressure.inMin,
      this.params.pressure.inMax,
      this.params.pressure.outMin,
      this.params.pressure.outMax,
      this.params.pressure.curve
    );
  }

  private processWithCurve(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
    curve: "linear" | "exp" | "log"
  ): number {
    // Normalize input
    const normalized = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
    
    // Apply curve
    let curved: number;
    switch (curve) {
      case "exp":
        curved = normalized * normalized;
        break;
      case "log":
        curved = Math.sqrt(normalized);
        break;
      case "linear":
      default:
        curved = normalized;
    }
    
    // Map to output range
    return Math.round(outMin + curved * (outMax - outMin));
  }

  /** Add a modulation routing */
  addRouting(routing: MPERouting): void {
    this.routings.push(routing);
  }

  /** Remove a modulation routing */
  removeRouting(index: number): void {
    if (index >= 0 && index < this.routings.length) {
      this.routings.splice(index, 1);
    }
  }

  /** Get all active notes */
  getActiveNotes(): Map<number, MPENoteState> {
    return new Map(this.activeNotes);
  }

  saveState(): Record<string, unknown> {
    return {
      params: { ...this.params },
      routings: this.routings.map(r => ({ ...r })),
    };
  }

  loadState(state: Record<string, unknown>): void {
    if (state.params && typeof state.params === "object") {
      this.params = { ...this.params, ...(state.params as Partial<MPEControlParams>) };
    }
    if (Array.isArray(state.routings)) {
      this.routings = state.routings.map((r: MPERouting) => ({ ...r }));
    }
  }

  reset(): void {
    super.reset();
    this.params = { ...DEFAULT_MPE_CONTROL_PARAMS };
    this.activeNotes.clear();
    this.channelPool.fill(true);
    this.roundRobinIndex = 1;
    this.routings = [];
  }
}
