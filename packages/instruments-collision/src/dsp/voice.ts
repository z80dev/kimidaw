/**
 * Collision Voice
 * 
 * A single polyphonic voice that handles:
 * - Mallet or noise excitation
 * - Dual resonators (A and B)
 * - Link/coupling between resonators
 * - LFO modulation
 * - Filter processing
 */

import {
  NoiseGenerator,
  BiquadFilter,
  LFO,
  PercussiveEnvelope,
  midiToFreq,
  clamp,
  lerp,
} from '../utils/dsp.js';
import { ModalResonator } from './resonator.js';
import type {
  CollisionState,
  NoteEvent,
  ControlEvent,
} from '../types/index.js';

export class CollisionVoice {
  private sampleRate: number;
  private voiceId: number;
  
  // Current note
  private currentNote: number = -1;
  private currentVelocity: number = 0;
  private isActive: boolean = false;
  
  // Excitation
  private noiseGen = new NoiseGenerator();
  private malletEnvelope = new PercussiveEnvelope();
  private noiseEnvelope = new PercussiveEnvelope();
  private malletFilter = new BiquadFilter();
  
  // Resonators
  private resonatorA: ModalResonator;
  private resonatorB: ModalResonator;
  
  // LFOs
  private lfo1: LFO;
  private lfo2: LFO;
  
  // Output filter
  private outputFilter = new BiquadFilter();
  
  // Pitch bend
  private pitchBend: number = 0;
  private pitchBendRange: number = 2;
  
  // Current parameter values (for interpolation)
  private params: CollisionState;
  
  constructor(voiceId: number, sampleRate: number, initialState: CollisionState) {
    this.voiceId = voiceId;
    this.sampleRate = sampleRate;
    this.params = initialState;
    
    this.resonatorA = new ModalResonator(initialState.resonatorA.type, sampleRate);
    this.resonatorB = new ModalResonator(initialState.resonatorB.type, sampleRate);
    
    this.lfo1 = new LFO(sampleRate);
    this.lfo2 = new LFO(sampleRate);
    
    this.updateParameters(initialState);
  }
  
  updateParameters(state: CollisionState): void {
    this.params = state;
    
    // Update mallet envelope
    this.malletEnvelope.setDecay(0.01, this.sampleRate); // Very short mallet strike
    
    // Update noise envelope
    this.noiseEnvelope.setDecay(state.noise.decay, this.sampleRate);
    
    // Update mallet filter (color)
    const malletFreq = 1000 + state.mallet.color * 8000;
    this.malletFilter.setLowpass(malletFreq, 0.5 + state.mallet.stiffness * 0.5, this.sampleRate);
    
    // Update LFOs
    this.lfo1.setFrequency(state.lfo1.rate);
    this.lfo1.setPhase(state.lfo1.phase);
    this.lfo2.setFrequency(state.lfo2.rate);
    this.lfo2.setPhase(state.lfo2.phase);
    
    // Update pitch bend range
    this.pitchBendRange = state.midi.pitchBendRange;
    
    // Update output filter
    if (state.filter.enabled) {
      const freq = clamp(state.filter.frequency, 20, this.sampleRate / 2 - 100);
      const q = 0.5 + state.filter.resonance * 10;
      switch (state.filter.type) {
        case 'lowpass':
          this.outputFilter.setLowpass(freq, q, this.sampleRate);
          break;
        case 'highpass':
          this.outputFilter.setHighpass(freq, q, this.sampleRate);
          break;
        case 'bandpass':
          this.outputFilter.setBandpass(freq, q, this.sampleRate);
          break;
      }
    }
  }
  
  triggerNote(event: NoteEvent): void {
    this.currentNote = event.note;
    this.currentVelocity = event.velocity / 127;
    this.isActive = true;
    this.pitchBend = 0;
    
    // Calculate frequencies with transpose
    const baseNote = event.note + this.params.global.transpose;
    const freqA = midiToFreq(baseNote + this.params.resonatorA.tune + this.params.resonatorA.fineTune / 100);
    const freqB = midiToFreq(baseNote + this.params.resonatorB.tune + this.params.resonatorB.fineTune / 100);
    
    // Apply ratios
    const finalFreqA = freqA * this.params.resonatorA.ratio;
    const finalFreqB = freqB * this.params.resonatorB.ratio;
    
    // Update resonator parameters
    this.resonatorA.setParameters({
      freq: finalFreqA,
      decay: this.params.resonatorA.decay,
      material: this.params.resonatorA.material,
      radius: this.params.resonatorA.radius,
      hitPosition: this.params.resonatorA.hitPosition,
      type: this.params.resonatorA.type,
    });
    
    this.resonatorB.setParameters({
      freq: finalFreqB,
      decay: this.params.resonatorB.decay,
      material: this.params.resonatorB.material,
      radius: this.params.resonatorB.radius,
      hitPosition: this.params.resonatorB.hitPosition,
      type: this.params.resonatorB.type,
    });
    
    // Trigger resonators
    const velToVol = this.params.midi.velocityToVolume;
    const velToBright = this.params.midi.velocityToBrightness;
    
    const velocityFactor = 0.3 + this.currentVelocity * velToVol * 0.7;
    const brightnessFactor = 0.5 + this.currentVelocity * velToBright * 0.5;
    
    if (this.params.resonatorA.enabled) {
      this.resonatorA.trigger(velocityFactor);
    }
    if (this.params.resonatorB.enabled) {
      this.resonatorB.trigger(velocityFactor * brightnessFactor);
    }
    
    // Trigger excitation
    if (this.params.excitatorType === 'mallet') {
      this.malletEnvelope.trigger(1);
    }
    this.noiseEnvelope.trigger(this.currentVelocity);
  }
  
  releaseNote(): void {
    // Modal synthesis naturally decays, but we could shorten here
    this.isActive = false;
  }
  
  handleControl(event: ControlEvent): void {
    switch (event.type) {
      case 'pitch-bend':
        // event.value is -1 to 1
        this.pitchBend = event.value * this.pitchBendRange;
        break;
    }
  }
  
  isPlaying(): boolean {
    return (this.resonatorA.isActive() || this.resonatorB.isActive()) && this.currentNote >= 0;
  }
  
  getCurrentNote(): number {
    return this.currentNote;
  }
  
  getVoiceId(): number {
    return this.voiceId;
  }
  
  steal(note: number, velocity: number): void {
    // Quick fade out and trigger new note
    this.triggerNote({ type: 'note-on', note, velocity, sampleOffset: 0 });
  }
  
  process(outputL: Float32Array, outputR: Float32Array, numSamples: number): void {
    if (!this.isPlaying()) return;
    
    // Calculate LFO values
    const lfo1Value = this.params.lfo1.amount > 0 
      ? this.lfo1.process(this.params.lfo1.waveform) * this.params.lfo1.amount 
      : 0;
    const lfo2Value = this.params.lfo2.amount > 0 
      ? this.lfo2.process(this.params.lfo2.waveform) * this.params.lfo2.amount 
      : 0;
    
    // Get pan positions
    const panA = clamp(this.params.resonatorA.pan + this.params.global.spread * 0.3, -1, 1);
    const panB = clamp(this.params.resonatorB.pan - this.params.global.spread * 0.3, -1, 1);
    
    // Convert pan to gain (-1 = full L, 0 = center, 1 = full R)
    const panL_A = panA <= 0 ? 1 : (1 - panA) * 0.5;
    const panR_A = panA >= 0 ? 1 : (1 + panA) * 0.5;
    const panL_B = panB <= 0 ? 1 : (1 - panB) * 0.5;
    const panR_B = panB >= 0 ? 1 : (1 + panB) * 0.5;
    
    for (let i = 0; i < numSamples; i++) {
      // Generate excitation
      let excitation = 0;
      
      if (this.params.excitatorType === 'mallet') {
        // Mallet impulse (filtered noise burst)
        const malletEnv = this.malletEnvelope.process();
        const malletNoise = this.noiseGen.white() * this.params.mallet.noiseAmount;
        const impulse = (1 - this.params.mallet.noiseAmount) * (malletEnv > 0 ? 1 : 0) + malletNoise;
        excitation = this.malletFilter.process(impulse) * malletEnv * this.params.mallet.volume;
      } else {
        // Noise excitation
        const noiseEnv = this.noiseEnvelope.process();
        const noise = this.noiseGen.white();
        excitation = noise * noiseEnv * this.params.noise.volume;
      }
      
      // Process resonators
      let resAOut = 0;
      let resBOut = 0;
      
      if (this.params.resonatorA.enabled) {
        resAOut = this.resonatorA.process(excitation) * this.params.resonatorA.level;
      }
      
      if (this.params.resonatorB.enabled) {
        // Apply link/coupling if enabled
        let coupledExcitation = excitation;
        if (this.params.link.mode === 'a-to-b') {
          coupledExcitation += resAOut * this.params.link.amount;
        }
        resBOut = this.resonatorB.process(coupledExcitation) * this.params.resonatorB.level;
      }
      
      // Cross-coupling modes
      if (this.params.link.mode === 'cross') {
        const temp = resAOut;
        resAOut = temp + resBOut * this.params.link.amount * 0.5;
        resBOut = resBOut + temp * this.params.link.amount * 0.5;
      }
      
      // Sum outputs with panning
      const voiceOutL = resAOut * panL_A + resBOut * panL_B;
      const voiceOutR = resAOut * panR_A + resBOut * panR_B;
      
      // Apply output filter if enabled
      let finalL = voiceOutL;
      let finalR = voiceOutR;
      
      if (this.params.filter.enabled) {
        finalL = this.outputFilter.process(voiceOutL);
        finalR = this.outputFilter.process(voiceOutR);
      }
      
      // Apply master volume
      finalL *= this.params.global.volume;
      finalR *= this.params.global.volume;
      
      // Add to output buffers
      outputL[i] += finalL;
      outputR[i] += finalR;
    }
  }
  
  reset(): void {
    this.currentNote = -1;
    this.currentVelocity = 0;
    this.isActive = false;
    this.pitchBend = 0;
    
    this.malletEnvelope.reset();
    this.noiseEnvelope.reset();
    this.resonatorA.reset();
    this.resonatorB.reset();
    this.outputFilter.reset();
  }
}
