/**
 * Note Echo - MIDI Delay Effect
 * 
 * Echo/delay MIDI notes with:
 * - Feedback for repeating echoes
 * - Velocity decay
 * - Sync to song tempo
 * - Multiple delay taps
 * - Pitch offset per echo
 */

import {
  BaseMidiEffect,
  createNoteOn,
  createNoteOff,
  type MidiEvent,
  type RateDivision,
  rateToBeatMultiplier,
} from "../types.js";

export interface NoteEchoParams {
  /** Enable echo effect */
  enabled: boolean;
  /** Delay time as rate division */
  rate: RateDivision;
  /** Number of echoes (1-8) */
  repeats: number;
  /** Velocity decay per repeat (0-100%) */
  velocityDecay: number;
  /** Feedback amount (0-100%) */
  feedback: number;
  /** Pitch offset per repeat (semitones) */
  pitchOffset: number;
  /** Whether to sync to transport */
  sync: boolean;
  /** Manual delay time in ms when not synced */
  delayMs: number;
  /** Gate length as percentage of delay time */
  gate: number;
  /** Stereo spread (0-100%) */
  stereo: number;
}

export interface EchoNote {
  /** Original note number */
  note: number;
  /** Current velocity */
  velocity: number;
  /** Time when this echo should trigger */
  triggerTime: number;
  /** Time when this echo should release */
  releaseTime: number;
  /** Echo iteration (0 = first echo) */
  iteration: number;
  /** MIDI channel */
  channel: number;
  /** Pitch offset applied */
  pitchOffset: number;
}

export const DEFAULT_NOTE_ECHO_PARAMS: NoteEchoParams = {
  enabled: true,
  rate: "1/8",
  repeats: 3,
  velocityDecay: 25,
  feedback: 70,
  pitchOffset: 0,
  sync: true,
  delayMs: 250,
  gate: 80,
  stereo: 0,
};

export class NoteEcho extends BaseMidiEffect {
  readonly name = "Note Echo";
  readonly version = "1.0.0";

  private params: NoteEchoParams = { ...DEFAULT_NOTE_ECHO_PARAMS };
  private sampleRate = 48000;
  private tempo = 120;
  
  // Active echoes
  private pendingEchoes: EchoNote[] = [];
  
  // Track held notes to generate proper note-offs
  private heldNotes: Map<number, EchoNote[]> = new Map();
  
  // Current sample time
  private currentTime = 0;

  setSampleRate(sr: number): void {
    this.sampleRate = sr;
  }

  setTempo(bpm: number): void {
    this.tempo = bpm;
  }

  protected onParameterChange(id: string, value: number | string | boolean): void {
    switch (id) {
      case "enabled":
        if (typeof value === "boolean") this.params.enabled = value;
        break;
      case "rate":
        if (typeof value === "string") this.params.rate = value as RateDivision;
        break;
      case "repeats":
        if (typeof value === "number") this.params.repeats = Math.max(1, Math.min(8, Math.floor(value)));
        break;
      case "velocityDecay":
        if (typeof value === "number") this.params.velocityDecay = Math.max(0, Math.min(100, value));
        break;
      case "feedback":
        if (typeof value === "number") this.params.feedback = Math.max(0, Math.min(100, value));
        break;
      case "pitchOffset":
        if (typeof value === "number") this.params.pitchOffset = Math.max(-24, Math.min(24, Math.floor(value)));
        break;
      case "sync":
        if (typeof value === "boolean") this.params.sync = value;
        break;
      case "delayMs":
        if (typeof value === "number") this.params.delayMs = Math.max(10, Math.min(5000, value));
        break;
      case "gate":
        if (typeof value === "number") this.params.gate = Math.max(1, Math.min(200, value));
        break;
      case "stereo":
        if (typeof value === "number") this.params.stereo = Math.max(0, Math.min(100, value));
        break;
    }
  }

  process(events: MidiEvent[], sampleTime: number): MidiEvent[] {
    this.currentTime = sampleTime;
    const output: MidiEvent[] = [];

    if (!this.params.enabled) {
      return events;
    }

    // Calculate delay time in samples
    const delaySamples = this.getDelaySamples();
    const gateSamples = Math.floor(delaySamples * (this.params.gate / 100));

    // Process incoming events
    for (const event of events) {
      // Pass through original event
      output.push(event);

      if (event.type === "note-on") {
        const noteEvent = event as { type: "note-on"; note: number; velocity: number; channel: number; sampleTime: number };
        
        // Create echoes
        const echoes = this.createEchoes(
          noteEvent.note,
          noteEvent.velocity,
          noteEvent.channel,
          sampleTime,
          delaySamples,
          gateSamples
        );
        
        // Store echoes for this note
        this.heldNotes.set(noteEvent.note, echoes);
        this.pendingEchoes.push(...echoes);
      } else if (event.type === "note-off") {
        const noteEvent = event as { type: "note-off"; note: number; channel: number; sampleTime: number };
        
        // Remove pending echoes for this note
        this.pendingEchoes = this.pendingEchoes.filter(echo => echo.note !== noteEvent.note);
        
        // Clear held note tracking
        this.heldNotes.delete(noteEvent.note);
      }
    }

    // Process pending echoes
    const remainingEchoes: EchoNote[] = [];
    
    for (const echo of this.pendingEchoes) {
      // Check if it's time to trigger this echo
      if (sampleTime >= echo.triggerTime) {
        // Check if original note is still held (for feedback calculation)
        const isOriginalHeld = this.heldNotes.has(echo.note);
        
        // Generate note-on
        output.push(createNoteOn(
          echo.note + echo.pitchOffset,
          echo.velocity,
          echo.channel,
          Math.floor(echo.triggerTime)
        ));
        
        // Schedule note-off
        output.push(createNoteOff(
          echo.note + echo.pitchOffset,
          0,
          echo.channel,
          Math.floor(echo.releaseTime)
        ));
        
        // Check if we should create another echo (feedback)
        if (isOriginalHeld && echo.iteration < this.params.repeats - 1) {
          const feedbackVelocity = Math.floor(
            echo.velocity * (this.params.feedback / 100)
          );
          
          if (feedbackVelocity > 0) {
            const nextEcho: EchoNote = {
              note: echo.note,
              velocity: feedbackVelocity,
              triggerTime: echo.triggerTime + delaySamples,
              releaseTime: echo.triggerTime + delaySamples + gateSamples,
              iteration: echo.iteration + 1,
              channel: echo.channel,
              pitchOffset: echo.pitchOffset + this.params.pitchOffset,
            };
            remainingEchoes.push(nextEcho);
          }
        }
      } else {
        // Echo hasn't triggered yet, keep it
        remainingEchoes.push(echo);
      }
    }

    this.pendingEchoes = remainingEchoes;
    this.currentTime += events.length; // Approximate

    return output;
  }

  private createEchoes(
    note: number,
    velocity: number,
    channel: number,
    startTime: number,
    delaySamples: number,
    gateSamples: number
  ): EchoNote[] {
    const echoes: EchoNote[] = [];
    
    for (let i = 0; i < this.params.repeats; i++) {
      const decayFactor = Math.pow(1 - this.params.velocityDecay / 100, i + 1);
      const echoVelocity = Math.floor(velocity * decayFactor);
      
      if (echoVelocity < 1) break;
      
      echoes.push({
        note,
        velocity: echoVelocity,
        triggerTime: startTime + delaySamples * (i + 1),
        releaseTime: startTime + delaySamples * (i + 1) + gateSamples,
        iteration: i,
        channel: this.params.stereo > 0 && i % 2 === 1 ? (channel + 1) % 16 : channel,
        pitchOffset: this.params.pitchOffset * (i + 1),
      });
    }
    
    return echoes;
  }

  private getDelaySamples(): number {
    if (this.params.sync) {
      const beatDuration = (60 / this.tempo) * this.sampleRate;
      const multiplier = rateToBeatMultiplier(this.params.rate);
      return Math.floor(beatDuration * multiplier);
    } else {
      return Math.floor(this.params.delayMs * this.sampleRate / 1000);
    }
  }

  saveState(): Record<string, unknown> {
    return {
      params: { ...this.params },
      pendingEchoes: this.pendingEchoes,
    };
  }

  loadState(state: Record<string, unknown>): void {
    if (state.params && typeof state.params === "object") {
      this.params = { ...this.params, ...(state.params as Partial<NoteEchoParams>) };
    }
    if (state.pendingEchoes && Array.isArray(state.pendingEchoes)) {
      this.pendingEchoes = state.pendingEchoes as EchoNote[];
    }
  }

  reset(): void {
    super.reset();
    this.params = { ...DEFAULT_NOTE_ECHO_PARAMS };
    this.pendingEchoes = [];
    this.heldNotes.clear();
    this.currentTime = 0;
  }
}
