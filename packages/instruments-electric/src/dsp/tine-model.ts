/**
 * Electric Piano Tine/Bar Model
 * 
 * Simulates the vibrating metal tine (or reed) and pickup system
 * found in Rhodes, Wurlitzer, and Pianet electric pianos.
 */

import {
  DelayLine,
  OnePoleFilter,
  BiquadFilter,
  ADSREnvelope,
  LFO,
  NoiseGenerator,
  midiToFreq,
  clamp,
  TWO_PI,
} from '../utils/dsp.js';

export interface TineModelParams {
  // Tine parameters
  tone: number;
  color: number;
  decay: number;
  level: number;
  inharmonics: number;
  
  // Pickup parameters
  pickupSymmetry: number;
  pickupDistance: number;
  pickupType: 'fm' | 'em';
  
  // Hammer parameters
  hardness: number;
  hammerNoise: number;
  force: number;
  
  // Damper parameters
  damperAmount: number;
  damperTone: number;
  
  // Model type
  model: 'rhodes' | 'wurlitzer' | 'pianet';
}

/**
 * Tine resonator using waveguide synthesis
 * 
 * Models a stiff vibrating bar using a delay line with
 * allpass filters for dispersion (inharmonicity).
 */
class TineResonator {
  private delayLine: DelayLine;
  private dispersionFilter = new BiquadFilter();
  private dampingFilter = new OnePoleFilter();
  private sampleRate: number;
  
  // Inharmonicity compensation
  private allpass1 = new BiquadFilter();
  private allpass2 = new BiquadFilter();
  
  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.delayLine = new DelayLine(100, sampleRate); // Max 100ms delay
  }
  
  setFrequency(freq: number, inharmonics: number): void {
    // Calculate delay time for fundamental
    const delaySamples = this.sampleRate / freq - 2; // Account for filter delay
    this.delayLine.setDelaySamples(Math.max(2, delaySamples));
    
    // Set up dispersion filters for stiffness/inharmonicity
    // Higher inharmonicity = more allpass filtering
    const apFreq = freq * (1 + inharmonics * 0.1);
    this.allpass1.setBandpass(apFreq, 0.5, this.sampleRate);
    this.allpass2.setBandpass(apFreq * 1.5, 0.5, this.sampleRate);
  }
  
  setDamping(damping: number): void {
    this.dampingFilter.setCoefficient(0.9 + damping * 0.09);
  }
  
  process(input: number): number {
    // Read from delay line
    let output = this.delayLine.read();
    
    // Apply dispersion (allpass filters for inharmonicity)
    output = this.allpass1.process(output);
    output = this.allpass2.process(output);
    
    // Apply damping
    output = this.dampingFilter.process(output);
    
    // Add input and feedback
    const feedback = output * 0.999;
    this.delayLine.write(input + feedback);
    
    return output;
  }
  
  reset(): void {
    this.delayLine.clear();
    this.dampingFilter.reset();
    this.allpass1.reset();
    this.allpass2.reset();
  }
}

/**
 * Electric piano tine voice
 * 
 * Combines tine resonator, hammer model, pickup model, and damper
 */
export class TineVoice {
  private sampleRate: number;
  private voiceId: number;
  
  // Components
  private tineResonator: TineResonator;
  private hammerEnvelope = new ADSREnvelope(0); // Will be set
  private damperEnvelope = new ADSREnvelope(0);
  private hammerNoise = new NoiseGenerator();
  private hammerFilter = new BiquadFilter();
  private pickupFilter = new BiquadFilter();
  private toneFilter = new BiquadFilter();
  
  // State
  private currentNote: number = -1;
  private currentVelocity: number = 0;
  private params: TineModelParams;
  private isActive: boolean = false;
  private sustainActive: boolean = false;
  
  constructor(voiceId: number, sampleRate: number, params: TineModelParams) {
    this.voiceId = voiceId;
    this.sampleRate = sampleRate;
    this.params = params;
    
    this.hammerEnvelope = new ADSREnvelope(sampleRate);
    this.damperEnvelope = new ADSREnvelope(sampleRate);
    this.tineResonator = new TineResonator(sampleRate);
    
    this.updateParameters(params);
  }
  
  updateParameters(params: TineModelParams): void {
    this.params = params;
    
    // Update hammer envelope
    const attackTime = 0.001 + (1 - params.hardness) * 0.005;
    this.hammerEnvelope.setAttack(attackTime);
    this.hammerEnvelope.setDecay(0.01);
    this.hammerEnvelope.setSustain(0);
    this.hammerEnvelope.setRelease(0.05);
    
    // Update damper envelope
    this.damperEnvelope.setAttack(0.01);
    this.damperEnvelope.setDecay(0.1);
    this.damperEnvelope.setSustain(params.damperAmount);
    this.damperEnvelope.setRelease(0.05);
    
    // Update hammer filter (hardness affects brightness)
    const hammerFreq = 500 + params.hardness * 4000;
    this.hammerFilter.setLowpass(hammerFreq, 0.7, this.sampleRate);
    
    // Update pickup filter
    const pickupFreq = params.pickupType === 'fm' ? 3000 : 5000;
    this.pickupFilter.setBandpass(pickupFreq, 1.0, this.sampleRate);
    
    // Update tone filter
    const toneFreq = 500 + params.tone * 4000;
    this.toneFilter.setLowpass(toneFreq, 0.5, this.sampleRate);
  }
  
  trigger(note: number, velocity: number): void {
    this.currentNote = note;
    this.currentVelocity = velocity / 127;
    this.isActive = true;
    
    const freq = midiToFreq(note);
    
    // Update tine resonator
    this.tineResonator.setFrequency(freq, this.params.inharmonics);
    this.tineResonator.setDamping(1 / (this.params.decay * freq * 0.1));
    
    // Trigger hammer
    this.hammerEnvelope.trigger();
    
    // Release damper
    this.damperEnvelope.release();
  }
  
  release(): void {
    if (this.sustainActive) return; // Don't release if sustain pedal is held
    
    this.hammerEnvelope.release();
    this.damperEnvelope.trigger(); // Engage damper
    this.isActive = false;
  }
  
  setSustain(active: boolean): void {
    this.sustainActive = active;
    if (!active && !this.isActive) {
      this.damperEnvelope.trigger();
    }
  }
  
  isPlaying(): boolean {
    return this.hammerEnvelope.isActive() || this.tineResonatorIsActive();
  }
  
  private tineResonatorIsActive(): boolean {
    // Approximate based on envelope states
    return this.hammerEnvelope.isActive() || this.damperEnvelope.isActive();
  }
  
  getCurrentNote(): number {
    return this.currentNote;
  }
  
  process(): number {
    if (!this.isPlaying()) return 0;
    
    // Generate hammer excitation
    const hammerEnv = this.hammerEnvelope.process();
    const hammerNoise = this.hammerNoise.white() * this.params.hammerNoise;
    const hammerImpulse = hammerEnv * (1 + hammerNoise);
    const filteredHammer = this.hammerFilter.process(hammerImpulse);
    
    // Scale by velocity and force
    const velocityFactor = 0.3 + this.currentVelocity * this.params.force * 0.7;
    const excitation = filteredHammer * velocityFactor * 0.5;
    
    // Process through tine resonator
    let tineOutput = this.tineResonator.process(excitation);
    
    // Apply damper (reduces amplitude)
    const damperEnv = this.damperEnvelope.process();
    const damperFactor = 1 - (damperEnv * this.params.damperAmount * 0.8);
    tineOutput *= damperFactor;
    
    // Pickup simulation (filters based on distance and symmetry)
    const distanceAtten = 1 - this.params.pickupDistance * 0.5;
    const symmetryEffect = 1 + this.params.pickupSymmetry * 0.2 * Math.sin(TWO_PI * 2);
    
    let pickupOutput = this.pickupFilter.process(tineOutput);
    pickupOutput *= distanceAtten * symmetryEffect;
    
    // Final tone shaping
    pickupOutput = this.toneFilter.process(pickupOutput);
    
    return pickupOutput * this.params.level;
  }
  
  reset(): void {
    this.currentNote = -1;
    this.currentVelocity = 0;
    this.isActive = false;
    this.sustainActive = false;
    this.hammerEnvelope.reset();
    this.damperEnvelope.reset();
    this.tineResonator.reset();
  }
}
