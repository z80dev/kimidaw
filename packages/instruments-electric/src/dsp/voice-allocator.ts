/**
 * Electric Piano Voice Allocator
 */

import { TineVoice, TineModelParams } from './tine-model.js';
import { Tremolo, Chorus, SoftClipper, ToneControl } from './effects.js';
import type { ElectricState, NoteEvent, ControlEvent } from '../types/index.js';

export class ElectricVoiceAllocator {
  private voices: TineVoice[] = [];
  private sampleRate: number;
  private state: ElectricState;
  
  // Effects
  private tremolo: Tremolo;
  private chorus: Chorus;
  private clipperL = new SoftClipper();
  private clipperR = new SoftClipper();
  private toneL = new ToneControl(0);
  private toneR = new ToneControl(0);
  
  // Voice tracking
  private noteToVoice: Map<number, number> = new Map();
  private voiceOrder: number[] = [];
  private heldNotes: number[] = [];
  private sustainPedal: boolean = false;

  constructor(numVoices: number, sampleRate: number, initialState: ElectricState) {
    this.sampleRate = sampleRate;
    this.state = initialState;

    const tineParams = this.stateToTineParams(initialState);

    for (let i = 0; i < numVoices; i++) {
      this.voices.push(new TineVoice(i, sampleRate, tineParams));
      this.voiceOrder.push(i);
    }

    this.tremolo = new Tremolo(sampleRate, {
      rate: initialState.tremolo.rate,
      amount: initialState.tremolo.amount,
      waveform: initialState.tremolo.waveform,
      stereoPhase: initialState.tremolo.stereoPhase,
    });

    this.chorus = new Chorus(sampleRate, {
      rate: initialState.chorus.rate,
      amount: initialState.chorus.amount,
      voices: initialState.chorus.voices,
    });

    this.clipperL.setDrive(initialState.amp.drive);
    this.clipperR.setDrive(initialState.amp.drive);
    this.toneL.setTone(initialState.amp.tone);
    this.toneR.setTone(initialState.amp.tone);
  }

  private stateToTineParams(state: ElectricState): TineModelParams {
    return {
      tone: state.tine.tone,
      color: state.tine.color,
      decay: state.tine.decay,
      level: state.tine.level,
      inharmonics: state.tine.inharmonics,
      pickupSymmetry: state.pickup.symmetry,
      pickupDistance: state.pickup.distance,
      pickupType: state.pickup.type,
      hardness: state.hammer.hardness,
      hammerNoise: state.hammer.noise,
      force: state.hammer.force,
      damperAmount: state.damper.amount,
      damperTone: state.damper.tone,
      model: state.model,
    };
  }

  updateState(state: ElectricState): void {
    this.state = state;

    const tineParams = this.stateToTineParams(state);

    for (const voice of this.voices) {
      voice.updateParameters(tineParams);
    }

    // Update effects
    this.tremolo.updateParams({
      rate: state.tremolo.rate,
      amount: state.tremolo.amount,
      waveform: state.tremolo.waveform,
      stereoPhase: state.tremolo.stereoPhase,
    });

    this.chorus.updateParams({
      rate: state.chorus.rate,
      amount: state.chorus.amount,
      voices: state.chorus.voices,
    });

    this.clipperL.setDrive(state.amp.drive);
    this.clipperR.setDrive(state.amp.drive);
    this.toneL.setTone(state.amp.tone);
    this.toneR.setTone(state.amp.tone);
  }

  processNoteEvent(event: NoteEvent): void {
    if (event.type === 'note-on') {
      this.triggerNote(event.note, event.velocity);
    } else {
      this.releaseNote(event.note);
    }
  }

  processControlEvent(event: ControlEvent): void {
    switch (event.type) {
      case 'sustain':
        this.sustainPedal = event.value > 0.5;
        for (const voice of this.voices) {
          voice.setSustain(this.sustainPedal);
        }
        break;
    }
  }

  private triggerNote(note: number, velocity: number): void {
    // Apply transpose
    const transposedNote = note + this.state.global.transpose;

    // Check if note already playing (retrigger)
    const existingVoice = this.noteToVoice.get(transposedNote);
    if (existingVoice !== undefined) {
      const voice = this.voices[existingVoice];
      voice.trigger(transposedNote, velocity);
      this.moveToFront(existingVoice);
      return;
    }

    // Find free voice
    let voiceId = this.findFreeVoice();
    if (voiceId === -1) {
      voiceId = this.stealVoice();
    }

    const voice = this.voices[voiceId];
    voice.trigger(transposedNote, velocity);
    
    this.noteToVoice.set(transposedNote, voiceId);
    this.heldNotes.push(transposedNote);
    this.moveToFront(voiceId);
  }

  private releaseNote(note: number): void {
    const transposedNote = note + this.state.global.transpose;
    
    const voiceId = this.noteToVoice.get(transposedNote);
    if (voiceId !== undefined) {
      this.voices[voiceId].release();
      if (!this.sustainPedal) {
        this.noteToVoice.delete(transposedNote);
      }
    }

    // Remove from held notes
    const idx = this.heldNotes.indexOf(transposedNote);
    if (idx > -1) {
      this.heldNotes.splice(idx, 1);
    }
  }

  private findFreeVoice(): number {
    for (let i = 0; i < this.voices.length; i++) {
      if (!this.voices[i].isPlaying()) {
        return i;
      }
    }
    return -1;
  }

  private stealVoice(): number {
    const stolenVoice = this.voiceOrder[0];
    
    for (const [note, voiceId] of this.noteToVoice.entries()) {
      if (voiceId === stolenVoice) {
        this.noteToVoice.delete(note);
        break;
      }
    }
    
    return stolenVoice;
  }

  private moveToFront(voiceId: number): void {
    const index = this.voiceOrder.indexOf(voiceId);
    if (index > -1) {
      this.voiceOrder.splice(index, 1);
    }
    this.voiceOrder.push(voiceId);
  }

  process(outputL: Float32Array, outputR: Float32Array, numSamples: number): void {
    outputL.fill(0);
    outputR.fill(0);

    // Process voices
    for (const voice of this.voices) {
      if (voice.isPlaying()) {
        for (let i = 0; i < numSamples; i++) {
          const sample = voice.process();
          outputL[i] += sample;
          outputR[i] += sample;
        }
      }
    }

    // Apply effects chain
    for (let i = 0; i < numSamples; i++) {
      let sampleL = outputL[i];
      let sampleR = outputR[i];

      // Tremolo
      if (this.state.tremolo.enabled) {
        [sampleL, sampleR] = this.tremolo.process(sampleL, sampleR);
      }

      // Chorus
      if (this.state.chorus.enabled) {
        [sampleL, sampleR] = this.chorus.process(sampleL, sampleR);
      }

      // Tone control
      sampleL = this.toneL.process(sampleL);
      sampleR = this.toneR.process(sampleR);

      // Soft clip (amp drive)
      sampleL = this.clipperL.process(sampleL);
      sampleR = this.clipperR.process(sampleR);

      // Amp level and master volume
      const ampLevel = this.state.amp.level * this.state.global.volume;
      outputL[i] = sampleL * ampLevel;
      outputR[i] = sampleR * ampLevel;
    }
  }

  getActiveVoiceCount(): number {
    return this.voices.filter(v => v.isPlaying()).length;
  }

  reset(): void {
    for (const voice of this.voices) {
      voice.reset();
    }
    this.tremolo.reset();
    this.chorus.reset();
    this.noteToVoice.clear();
    this.voiceOrder = Array.from({ length: this.voices.length }, (_, i) => i);
    this.heldNotes = [];
    this.sustainPedal = false;
  }
}
