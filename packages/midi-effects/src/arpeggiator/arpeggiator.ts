/**
 * Arpeggiator MIDI Effect
 * Implements Ableton-style arpeggiator with all pattern styles and features
 */

import {
  BaseMidiEffect,
  createNoteOn,
  createNoteOff,
  type MidiEvent,
  type NoteState,
  rateToBeatMultiplier,
} from "../types.js";
import {
  type ArpeggiatorParams,
  type ArpeggiatorState,
  type ArpStep,
  type ArpStyle,
  DEFAULT_ARPEGGIATOR_PARAMS,
} from "./types.js";

export class Arpeggiator extends BaseMidiEffect {
  readonly name = "Arpeggiator";
  readonly version = "1.0.0";

  private params: ArpeggiatorParams = { ...DEFAULT_ARPEGGIATOR_PARAMS };
  private state: ArpeggiatorState;
  private sampleRate = 48000;
  private tempo = 120;

  constructor() {
    super();
    this.state = this.createInitialState();
  }

  private createInitialState(): ArpeggiatorState {
    return {
      heldNotes: new Map(),
      playingNotes: new Map(),
      currentStep: 0,
      direction: 1,
      lastStepTime: 0,
      orderCounter: 0,
      randomSeed: Math.floor(Math.random() * 0x7fffffff),
      randomState: 0,
      isRunning: false,
      nextStepTime: 0,
    };
  }

  /** Set the sample rate for timing calculations */
  setSampleRate(sr: number): void {
    this.sampleRate = sr;
  }

  /** Set the current tempo in BPM */
  setTempo(bpm: number): void {
    this.tempo = bpm;
  }

  protected onParameterChange(id: string, value: number | string | boolean): void {
    switch (id) {
      case "style":
        if (typeof value === "string") this.params.style = value as ArpStyle;
        break;
      case "rate":
        if (typeof value === "string") this.params.rate = value as ArpeggiatorParams["rate"];
        break;
      case "gate":
        if (typeof value === "number") this.params.gate = Math.max(0, Math.min(200, value));
        break;
      case "shuffle":
        if (typeof value === "number") this.params.shuffle = Math.max(0, Math.min(100, value));
        break;
      case "offset":
        if (typeof value === "number") this.params.offset = Math.max(0, Math.min(31, Math.floor(value)));
        break;
      case "hold":
        if (typeof value === "boolean") this.params.hold = value;
        break;
      case "retrigger":
        if (typeof value === "string") this.params.retrigger = value as ArpeggiatorParams["retrigger"];
        break;
      case "velocityMode":
        if (typeof value === "string") this.params.velocityMode = value as ArpeggiatorParams["velocityMode"];
        break;
      case "targetVelocity":
        if (typeof value === "number") this.params.targetVelocity = Math.max(0, Math.min(127, value));
        break;
      case "steps":
        if (typeof value === "number") this.params.steps = Math.max(1, Math.min(32, Math.floor(value)));
        break;
      case "distance":
        if (typeof value === "number") this.params.distance = Math.max(1, Math.min(4, Math.floor(value)));
        break;
      case "distanceStyle":
        if (typeof value === "string") this.params.distanceStyle = value as ArpeggiatorParams["distanceStyle"];
        break;
      case "repeat":
        if (typeof value === "number") this.params.repeat = Math.max(1, Math.min(8, Math.floor(value)));
        break;
      case "transpose":
        if (typeof value === "number") this.params.transpose = Math.max(-48, Math.min(48, Math.floor(value)));
        break;
      case "velocityDecay":
        if (typeof value === "number") this.params.velocityDecay = Math.max(0, Math.min(100, value));
        break;
      case "stepSequencerEnabled":
        if (typeof value === "boolean") this.params.stepSequencerEnabled = value;
        break;
      case "swing":
        if (typeof value === "number") this.params.swing = Math.max(0, Math.min(100, value));
        break;
    }
  }

  process(events: MidiEvent[], sampleTime: number): MidiEvent[] {
    const output: MidiEvent[] = [];
    const newHeldNotes = new Map(this.state.heldNotes);

    // Process incoming events
    for (const event of events) {
      if (event.type === "note-on") {
        const noteEvent = event as unknown as { type: "note-on"; note: number; velocity: number; channel: number };
        
        // Check retrigger
        if (this.params.retrigger === "note" && newHeldNotes.size === 0) {
          this.resetPattern();
        }

        newHeldNotes.set(noteEvent.note, {
          velocity: noteEvent.velocity,
          time: sampleTime,
          order: this.state.orderCounter++,
        });
        
        if (!this.state.isRunning && newHeldNotes.size > 0) {
          this.state.isRunning = true;
          this.state.nextStepTime = sampleTime;
        }
      } else if (event.type === "note-off") {
        const noteEvent = event as unknown as { type: "note-off"; note: number; channel: number };
        
        if (!this.params.hold) {
          newHeldNotes.delete(noteEvent.note);
        }
      }
    }

    this.state.heldNotes = newHeldNotes;

    // Check retrigger on beat
    if (this.params.retrigger === "beat") {
      const beatDuration = (60 / this.tempo) * this.sampleRate;
      const currentBeatInt = Math.floor(sampleTime / beatDuration);
      const lastBeatInt = Math.floor(this.state.lastStepTime / beatDuration);
      if (currentBeatInt > lastBeatInt) {
        this.resetPattern();
      }
    }

    // Generate arpeggiator steps
    if (this.state.isRunning && this.state.heldNotes.size > 0) {
      output.push(...this.generateSteps(sampleTime));
    } else if (this.state.heldNotes.size === 0) {
      // Release any playing notes
      for (const [note, data] of this.state.playingNotes) {
        if (sampleTime >= data.startTime + data.duration) {
          output.push(createNoteOff(note, 0, 0, sampleTime));
          this.state.playingNotes.delete(note);
        }
      }
      this.state.isRunning = false;
    }

    // Update playing notes - release expired
    for (const [note, data] of this.state.playingNotes) {
      if (sampleTime >= data.startTime + data.duration) {
        output.push(createNoteOff(note, 0, 0, sampleTime));
        this.state.playingNotes.delete(note);
      }
    }

    this.state.lastStepTime = sampleTime;

    return output;
  }

  private resetPattern(): void {
    this.state.currentStep = 0;
    this.state.direction = 1;
    this.state.randomState = this.state.randomSeed;
  }

  private generateSteps(sampleTime: number): MidiEvent[] {
    const events: MidiEvent[] = [];
    const stepDuration = this.getStepDuration();
    
    // Generate steps until we reach sampleTime
    while (this.state.nextStepTime < sampleTime + stepDuration * 2) {
      const step = this.calculateCurrentStep();
      
      if (step && step.enabled) {
        // Release previous note if any
        for (const [note, data] of this.state.playingNotes) {
          if (this.state.nextStepTime >= data.startTime + data.duration) {
            events.push(createNoteOff(note, 0, 0, Math.floor(this.state.nextStepTime)));
            this.state.playingNotes.delete(note);
          }
        }

        // Play new note
        const finalNote = Math.max(0, Math.min(127, step.note + step.transpose));
        const startTime = Math.floor(this.state.nextStepTime);
        
        events.push(createNoteOn(finalNote, step.velocity, 0, startTime));
        this.state.playingNotes.set(finalNote, {
          startTime,
          duration: step.gateSamples,
        });
      }

      // Advance to next step
      this.advanceStep();
      this.state.nextStepTime += stepDuration;
    }

    return events;
  }

  private getStepDuration(): number {
    const beatDuration = (60 / this.tempo) * this.sampleRate;
    const multiplier = rateToBeatMultiplier(this.params.rate);
    let duration = beatDuration * multiplier;
    
    // Apply swing
    if (this.params.swing > 0) {
      const isOffbeat = this.state.currentStep % 2 === 1;
      if (isOffbeat) {
        duration *= 1 + (this.params.swing / 100) * 0.5;
      } else {
        duration *= 1 - (this.params.swing / 100) * 0.33;
      }
    }
    
    return duration;
  }

  private calculateCurrentStep(): ArpStep | null {
    const notes = this.getSortedNotes();
    if (notes.length === 0) return null;

    const stepIndex = (this.state.currentStep + this.params.offset) % this.params.steps;
    const octaveRange = this.params.distance;
    
    // Calculate which note to play based on style
    const { noteIndex, octaveOffset } = this.calculateNotePosition(notes.length, octaveRange);
    
    if (noteIndex < 0 || noteIndex >= notes.length) return null;
    
    const sourceNote = notes[noteIndex]!;
    const finalNote = sourceNote.note + octaveOffset * 12;
    
    // Calculate velocity
    let velocity = this.calculateVelocity(sourceNote.velocity, stepIndex);
    
    // Apply velocity decay
    const totalStep = this.state.currentStep;
    const decayFactor = 1 - (this.params.velocityDecay / 100) * (totalStep / this.params.steps);
    velocity = Math.floor(velocity * Math.max(0, decayFactor));
    
    // Calculate gate
    let gate = this.params.gate;
    if (this.params.stepSequencerEnabled) {
      const stepGate = this.params.stepGates[stepIndex];
      if (stepGate !== undefined && stepGate >= 0) {
        gate = stepGate;
      }
    }
    
    const stepDuration = this.getStepDuration();
    const gateSamples = Math.floor(stepDuration * (gate / 100));
    
    // Calculate transpose
    let transpose = this.params.stepSequencerEnabled ? this.params.stepTransposes[stepIndex] ?? 0 : 0;
    transpose += this.params.transpose * Math.floor(stepIndex / notes.length);
    
    // Check if step is enabled
    let enabled = true;
    if (this.params.stepSequencerEnabled) {
      enabled = this.params.stepEnabled[stepIndex] ?? true;
    }

    return {
      index: stepIndex,
      note: finalNote,
      velocity,
      gateSamples,
      transpose,
      enabled,
      sourceNoteIndex: noteIndex,
      octaveOffset,
    };
  }

  private getSortedNotes(): NoteState[] {
    const notes: NoteState[] = [];
    for (const [note, data] of this.state.heldNotes) {
      notes.push({
        note,
        velocity: data.velocity,
        startTime: data.time,
        channel: 0,
      });
    }

    // Sort based on style requirements
    switch (this.params.style) {
      case "order-played":
        notes.sort((a, b) => {
          const orderA = this.state.heldNotes.get(a.note)?.order ?? 0;
          const orderB = this.state.heldNotes.get(b.note)?.order ?? 0;
          return orderA - orderB;
        });
        break;
      case "pinky-up":
      case "pinky-up-down":
        // Highest note first
        notes.sort((a, b) => b.note - a.note);
        break;
      case "thumb-up":
      case "thumb-up-down":
        // Lowest note first
        notes.sort((a, b) => a.note - b.note);
        break;
      default:
        notes.sort((a, b) => a.note - b.note);
    }

    return notes;
  }

  private calculateNotePosition(numNotes: number, octaveRange: number): { noteIndex: number; octaveOffset: number } {
    const totalPositions = numNotes * octaveRange;
    const currentPos = this.state.currentStep % totalPositions;
    
    let noteIndex = 0;
    let octaveOffset = 0;

    switch (this.params.style) {
      case "up":
      case "pinky-up":
      case "thumb-up":
        noteIndex = currentPos % numNotes;
        octaveOffset = Math.floor(currentPos / numNotes);
        break;

      case "down":
        noteIndex = numNotes - 1 - (currentPos % numNotes);
        octaveOffset = Math.floor(currentPos / numNotes);
        break;

      case "up-down":
      case "pinky-up-down":
      case "thumb-up-down": {
        const cycleLen = numNotes * 2 - 2 || 1;
        const posInCycle = currentPos % cycleLen;
        if (posInCycle < numNotes) {
          noteIndex = posInCycle;
        } else {
          noteIndex = cycleLen - posInCycle;
        }
        octaveOffset = Math.floor(currentPos / cycleLen);
        break;
      }

      case "down-up": {
        const cycleLen = numNotes * 2 - 2 || 1;
        const posInCycle = currentPos % cycleLen;
        if (posInCycle < numNotes) {
          noteIndex = numNotes - 1 - posInCycle;
        } else {
          noteIndex = posInCycle - numNotes + 1;
        }
        octaveOffset = Math.floor(currentPos / cycleLen);
        break;
      }

      case "up-and-down": {
        const cycleLen = numNotes * 2;
        const posInCycle = currentPos % cycleLen;
        if (posInCycle < numNotes) {
          noteIndex = posInCycle;
        } else {
          noteIndex = cycleLen - 1 - posInCycle;
        }
        octaveOffset = Math.floor(currentPos / cycleLen);
        break;
      }

      case "down-and-up": {
        const cycleLen = numNotes * 2;
        const posInCycle = currentPos % cycleLen;
        if (posInCycle < numNotes) {
          noteIndex = numNotes - 1 - posInCycle;
        } else {
          noteIndex = posInCycle - numNotes;
        }
        octaveOffset = Math.floor(currentPos / cycleLen);
        break;
      }

      case "converge": {
        const mid = Math.floor((numNotes - 1) / 2);
        const isEven = numNotes % 2 === 0;
        const cycleLen = mid + 1;
        const posInCycle = currentPos % cycleLen;
        noteIndex = mid - posInCycle;
        if (isEven && posInCycle === 0) {
          noteIndex = mid + 1;
        }
        octaveOffset = Math.floor(currentPos / cycleLen);
        break;
      }

      case "diverge": {
        const mid = Math.floor(numNotes / 2);
        const cycleLen = Math.ceil(numNotes / 2);
        const posInCycle = currentPos % cycleLen;
        noteIndex = mid + (posInCycle * (numNotes % 2 === 0 ? 1 : 0));
        if (posInCycle > 0) {
          noteIndex = (mid + posInCycle) % numNotes;
        }
        octaveOffset = Math.floor(currentPos / cycleLen);
        break;
      }

      case "converge-and-diverge": {
        const cycleLen = numNotes;
        const posInCycle = currentPos % cycleLen;
        const mid = Math.floor(numNotes / 2);
        if (posInCycle <= mid) {
          noteIndex = posInCycle;
        } else {
          noteIndex = numNotes - 1 - (posInCycle - mid);
        }
        octaveOffset = Math.floor(currentPos / cycleLen);
        break;
      }

      case "random":
        noteIndex = Math.floor(this.random() * numNotes);
        octaveOffset = Math.floor(this.random() * octaveRange);
        break;

      case "random-other": {
        const lastIndex = this.state.currentStep > 0 ? 
          (this.state.currentStep - 1) % numNotes : -1;
        do {
          noteIndex = Math.floor(this.random() * numNotes);
        } while (numNotes > 1 && noteIndex === lastIndex);
        octaveOffset = Math.floor(this.random() * octaveRange);
        break;
      }

      case "random-once":
        if (this.state.currentStep < numNotes) {
          noteIndex = this.state.currentStep % numNotes;
        } else {
          noteIndex = Math.floor(this.random() * numNotes);
        }
        octaveOffset = Math.floor(currentPos / numNotes);
        break;

      case "order-played":
      default:
        noteIndex = currentPos % numNotes;
        octaveOffset = Math.floor(currentPos / numNotes);
    }

    // Apply distance style
    switch (this.params.distanceStyle) {
      case "plus1":
        octaveOffset += 1;
        break;
      case "plus2":
        octaveOffset += 2;
        break;
      case "plus3":
        octaveOffset += 3;
        break;
    }

    return { noteIndex: Math.max(0, Math.min(numNotes - 1, noteIndex)), octaveOffset };
  }

  private calculateVelocity(sourceVelocity: number, stepIndex: number): number {
    if (this.params.stepSequencerEnabled) {
      const stepVel = this.params.stepVelocities[stepIndex];
      if (stepVel !== undefined && stepVel >= 0) {
        return stepVel;
      }
    }

    switch (this.params.velocityMode) {
      case "original":
        return sourceVelocity;
      case "target":
        return this.params.targetVelocity;
      case "target-plus-original":
        return Math.min(127, Math.floor((this.params.targetVelocity + sourceVelocity) / 2));
      case "target-plus-original-up":
        return Math.min(127, this.params.targetVelocity + sourceVelocity);
      case "target-plus-original-down":
        return Math.max(0, this.params.targetVelocity - (127 - sourceVelocity));
      case "random":
        return Math.floor(this.random() * 128);
      default:
        return sourceVelocity;
    }
  }

  private advanceStep(): void {
    this.state.currentStep++;
    
    // Reset if we've gone through the pattern
    const totalSteps = this.params.steps * this.params.repeat;
    if (this.state.currentStep >= totalSteps) {
      this.state.currentStep = 0;
    }
  }

  private random(): number {
    // Simple LCG for deterministic random
    this.state.randomState = (this.state.randomState * 1103515245 + 12345) & 0x7fffffff;
    return (this.state.randomState / 0x7fffffff);
  }

  saveState(): Record<string, unknown> {
    return {
      params: { ...this.params },
      state: {
        currentStep: this.state.currentStep,
        direction: this.state.direction,
        randomSeed: this.state.randomSeed,
        isRunning: this.state.isRunning,
      },
    };
  }

  loadState(state: Record<string, unknown>): void {
    if (state.params && typeof state.params === "object") {
      this.params = { ...this.params, ...(state.params as Partial<ArpeggiatorParams>) };
    }
    if (state.state && typeof state.state === "object") {
      const s = state.state as Partial<ArpeggiatorState>;
      this.state.currentStep = s.currentStep ?? 0;
      this.state.direction = s.direction ?? 1;
      this.state.randomSeed = s.randomSeed ?? Math.floor(Math.random() * 0x7fffffff);
      this.state.isRunning = s.isRunning ?? false;
    }
  }

  reset(): void {
    super.reset();
    this.params = { ...DEFAULT_ARPEGGIATOR_PARAMS };
    this.state = this.createInitialState();
  }
}
