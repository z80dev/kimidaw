/**
 * Tension Voice Allocator
 */

import { StringVoice, StringModelParams } from './string-model.js';
import { BodyResonance, BodyParams } from './body-resonance.js';
import { LFO, BiquadFilter, ADSREnvelope, clamp } from '../utils/dsp.js';
import type { TensionState, NoteEvent, ControlEvent } from '../types/index.js';

export class TensionVoiceAllocator {
  private voices: StringVoice[] = [];
  private sampleRate: number;
  private state: TensionState;

  // Effects
  private bodyResonance: BodyResonance;
  private lfo: LFO;
  private outputFilter = new BiquadFilter();
  private filterEnvelope = new ADSREnvelope(0);

  // Voice tracking
  private noteToVoice: Map<number, number> = new Map();
  private voiceOrder: number[] = [];
  private heldNotes: number[] = [];
  private sustainPedal: boolean = false;

  // Glide state
  private currentGlideNote: number = -1;
  private glideProgress: number = 1;

  constructor(numVoices: number, sampleRate: number, initialState: TensionState) {
    this.sampleRate = sampleRate;
    this.state = initialState;
    this.filterEnvelope = new ADSREnvelope(sampleRate);

    const stringParams = this.stateToStringParams(initialState);

    for (let i = 0; i < numVoices; i++) {
      this.voices.push(new StringVoice(i, sampleRate, stringParams));
      this.voiceOrder.push(i);
    }

    this.bodyResonance = new BodyResonance(sampleRate, {
      type: initialState.body.type,
      size: initialState.body.size,
      decay: initialState.body.decay,
      lowCut: initialState.body.lowCut,
      highCut: initialState.body.highCut,
      mix: initialState.body.mix,
    });

    this.lfo = new LFO(sampleRate);
    this.lfo.setFrequency(initialState.lfo.rate);
    this.lfo.setPhase(initialState.lfo.phase);

    this.updateFilter(initialState);
  }

  private stateToStringParams(state: TensionState): StringModelParams {
    return {
      excitationType: state.excitator.type,
      force: state.excitator.force,
      friction: state.excitator.friction,
      velocity: state.excitator.velocity,
      position: state.excitator.position,
      mass: state.excitator.mass,
      stiffness: state.excitator.stiffness,
      damping: state.excitator.damping,
      decay: state.string.decay,
      ratio: state.string.ratio,
      inharmonics: state.string.inharmonics,
      stringDamping: state.string.damping,
      tension: state.string.tension,
      tone: state.string.tone,
      pickupPosition: state.termination.pickupPosition,
      nutReflection: state.termination.nutReflection,
      bridgeReflection: state.termination.bridgeReflection,
      damperEnabled: state.damper.enabled,
      damperMass: state.damper.mass,
      damperStiffness: state.damper.stiffness,
      damperVelocity: state.damper.velocity,
      damperPosition: state.damper.position,
    };
  }

  private updateFilter(state: TensionState): void {
    if (state.filter.type === 'off') return;

    this.filterEnvelope.setAttack(state.filter.attack);
    this.filterEnvelope.setDecay(state.filter.decay);
    this.filterEnvelope.setSustain(state.filter.sustain);
    this.filterEnvelope.setRelease(state.filter.release);
  }

  updateState(state: TensionState): void {
    this.state = state;

    const stringParams = this.stateToStringParams(state);

    for (const voice of this.voices) {
      voice.updateParameters(stringParams);
    }

    this.bodyResonance.updateParameters({
      type: state.body.type,
      size: state.body.size,
      decay: state.body.decay,
      lowCut: state.body.lowCut,
      highCut: state.body.highCut,
      mix: state.body.mix,
    });

    this.lfo.setFrequency(state.lfo.rate);

    this.updateFilter(state);
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
      case 'pitch-bend':
        // Handle pitch bend if needed
        break;
    }
  }

  private triggerNote(note: number, velocity: number): void {
    const transposedNote = note + this.state.global.transpose;

    // Check for existing voice
    const existingVoice = this.noteToVoice.get(transposedNote);
    if (existingVoice !== undefined) {
      const voice = this.voices[existingVoice];
      voice.trigger(transposedNote, velocity);
      this.moveToFront(existingVoice);
      return;
    }

    // Handle unison
    const unisonVoices = this.state.global.unison;
    
    for (let u = 0; u < unisonVoices; u++) {
      let voiceId = this.findFreeVoice();
      if (voiceId === -1) {
        voiceId = this.stealVoice();
      }

      const voice = this.voices[voiceId];
      
      // Apply detune for unison
      if (unisonVoices > 1) {
        const detuneAmount = (u - (unisonVoices - 1) / 2) * this.state.global.unisonDetune;
        // Note: actual detuning would be done in the voice's frequency calculation
        // For now, we just trigger with slight variations
      }
      
      voice.trigger(transposedNote, velocity);
      this.noteToVoice.set(transposedNote, voiceId);
      this.moveToFront(voiceId);
    }

    this.heldNotes.push(transposedNote);
    this.filterEnvelope.trigger();
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

    // Get LFO value for modulation
    const lfoValue = this.lfo.process(this.state.lfo.waveform);

    // Calculate filter frequency with modulation
    let filterFreq = this.state.filter.frequency;
    if (this.state.filter.envelopeAmount !== 0) {
      const envValue = this.filterEnvelope.process();
      filterFreq *= (1 + envValue * this.state.filter.envelopeAmount);
    }
    
    // Update filter if needed
    if (this.state.filter.type !== 'off') {
      const q = 0.5 + this.state.filter.resonance * 10;
      switch (this.state.filter.type) {
        case 'lowpass':
          this.outputFilter.setLowpass(filterFreq, q, this.sampleRate);
          break;
        case 'highpass':
          this.outputFilter.setHighpass(filterFreq, q, this.sampleRate);
          break;
        case 'bandpass':
          this.outputFilter.setBandpass(filterFreq, q, this.sampleRate);
          break;
        case 'notch':
          this.outputFilter.setNotch(filterFreq, q, this.sampleRate);
          break;
      }
    }

    // Process voices
    for (const voice of this.voices) {
      if (voice.isPlaying()) {
        for (let i = 0; i < numSamples; i++) {
          const sample = voice.process();
          
          // Simple stereo spread
          const spread = this.state.global.spread;
          outputL[i] += sample * (1 - spread * 0.5);
          outputR[i] += sample * (1 + spread * 0.5);
        }
      }
    }

    // Apply body resonance and filter
    for (let i = 0; i < numSamples; i++) {
      let sampleL = outputL[i];
      let sampleR = outputR[i];

      // Body resonance
      sampleL = this.bodyResonance.process(sampleL);
      sampleR = this.bodyResonance.process(sampleR);

      // Output filter
      if (this.state.filter.type !== 'off') {
        sampleL = this.outputFilter.process(sampleL);
        sampleR = this.outputFilter.process(sampleR);
      }

      // Master volume
      const volume = this.state.global.volume;
      outputL[i] = sampleL * volume;
      outputR[i] = sampleR * volume;
    }
  }

  getActiveVoiceCount(): number {
    return this.voices.filter(v => v.isPlaying()).length;
  }

  reset(): void {
    for (const voice of this.voices) {
      voice.reset();
    }
    this.bodyResonance.reset();
    this.noteToVoice.clear();
    this.voiceOrder = Array.from({ length: this.voices.length }, (_, i) => i);
    this.heldNotes = [];
    this.sustainPedal = false;
  }
}
