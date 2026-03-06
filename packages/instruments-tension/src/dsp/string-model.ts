/**
 * Tension String Model
 * 
 * Physical modeling string instrument using waveguide synthesis.
 * Supports bow, hammer, and plectrum excitation.
 */

import {
  DelayLine,
  AllpassFilter,
  OnePoleFilter,
  BiquadFilter,
  ADSREnvelope,
  LFO,
  NoiseGenerator,
  midiToFreq,
  clamp,
  lerp,
  TWO_PI,
} from '../utils/dsp.js';

export type ExcitationType = 'bow' | 'hammer' | 'hammer-bounce' | 'plectrum';

export interface StringModelParams {
  // Excitation
  excitationType: ExcitationType;
  force: number;
  friction: number;
  velocity: number;
  position: number;
  mass: number;
  stiffness: number;
  damping: number;
  
  // String
  decay: number;
  ratio: number;
  inharmonics: number;
  stringDamping: number;
  tension: number;
  tone: number;
  
  // Termination
  pickupPosition: number;
  nutReflection: number;
  bridgeReflection: number;
  
  // Damper
  damperEnabled: boolean;
  damperMass: number;
  damperStiffness: number;
  damperVelocity: number;
  damperPosition: number;
}

/**
 * Waveguide string implementation
 * 
 * Uses bidirectional delay lines with damping filters to simulate
 * a vibrating string with variable properties.
 */
class WaveguideString {
  // Forward and backward delay lines
  private forwardDelay: DelayLine;
  private backwardDelay: DelayLine;
  
  // Dispersion filters for inharmonicity
  private dispersion1 = new AllpassFilter();
  private dispersion2 = new AllpassFilter();
  
  // Damping filters
  private damping1 = new OnePoleFilter();
  private damping2 = new OnePoleFilter();
  
  private sampleRate: number;
  private currentFreq: number = 440;
  
  // Bridge and nut reflection filters
  private bridgeFilter = new OnePoleFilter();
  private nutFilter = new OnePoleFilter();

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    // Max string length: 100ms (lowest note ~10Hz)
    this.forwardDelay = new DelayLine(100, sampleRate);
    this.backwardDelay = new DelayLine(100, sampleRate);
  }

  setFrequency(freq: number, inharmonics: number, damping: number): void {
    this.currentFreq = freq;
    
    // Calculate delay length for half the string (wave goes there and back)
    const wavelengthSamples = this.sampleRate / freq;
    const halfString = wavelengthSamples / 2;
    
    // Account for filter delays
    const filterDelay = 2; // Approximate samples of filter delay
    const delaySamples = Math.max(2, halfString - filterDelay);
    
    this.forwardDelay.setDelaySamples(delaySamples);
    this.backwardDelay.setDelaySamples(delaySamples);
    
    // Set up dispersion for inharmonicity
    // Higher inharmonicity = more dispersion
    const dispFreq = freq * (1 + inharmonics * 0.5);
    this.dispersion1.setParams(dispFreq, 0.5, this.sampleRate);
    this.dispersion2.setParams(dispFreq * 0.7, 0.5, this.sampleRate);
    
    // Set damping
    const dampingCoeff = Math.exp(-1 / (damping * freq * 0.1));
    this.damping1.setCoefficient(dampingCoeff);
    this.damping2.setCoefficient(dampingCoeff);
  }

  setReflections(nutReflect: number, bridgeReflect: number): void {
    this.nutFilter.setCoefficient(nutReflect);
    this.bridgeFilter.setCoefficient(bridgeReflect);
  }

  /**
   * Process one sample of string vibration
   * 
   * @param excitation Excitation force at bow/hammer/plectrum position
   * @param pickupPos Position to read output from (0-1)
   * @returns Output at pickup position
   */
  process(excitation: number, pickupPos: number): number {
    // Read from delay line ends
    let forwardOut = this.forwardDelay.read();
    let backwardOut = this.backwardDelay.read();
    
    // Apply dispersion (for inharmonicity)
    forwardOut = this.dispersion1.process(forwardOut);
    forwardOut = this.dispersion2.process(forwardOut);
    backwardOut = this.dispersion1.process(backwardOut);
    backwardOut = this.dispersion2.process(backwardOut);
    
    // Apply damping
    forwardOut = this.damping1.process(forwardOut);
    backwardOut = this.damping2.process(backwardOut);
    
    // Bridge and nut reflections
    const bridgeReflect = this.bridgeFilter.process(forwardOut);
    const nutReflect = this.nutFilter.process(backwardOut);
    
    // Add excitation
    const intoForward = -bridgeReflect + excitation;
    const intoBackward = -nutReflect + excitation;
    
    // Write to delay lines
    this.forwardDelay.write(intoForward);
    this.backwardDelay.write(intoBackward);
    
    // Output is sum of traveling waves at pickup position
    // Simplified: return sum of both directions
    return forwardOut + backwardOut;
  }

  reset(): void {
    this.forwardDelay.clear();
    this.backwardDelay.clear();
    this.dispersion1.reset();
    this.dispersion2.reset();
    this.damping1.reset();
    this.damping2.reset();
    this.bridgeFilter.reset();
    this.nutFilter.reset();
  }
}

/**
 * Bow excitation model
 * 
 * Uses a friction model where the string sticks and slips
 * against the bow hair.
 */
class BowModel {
  private noise = new NoiseGenerator();
  private sampleRate: number;
  
  // Stick-slip state
  private stringVel: number = 0;
  private bowVel: number = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  process(force: number, friction: number, bowVelocity: number): number {
    this.bowVel = bowVelocity;
    
    // Relative velocity between bow and string
    const relVel = this.bowVel - this.stringVel;
    
    // Friction curve (stiction/slip behavior)
    // Simplified hyperbolic friction model
    const frictionForce = friction * force * Math.tanh(relVel * 10);
    
    // Add some noise for bow hair texture
    const noise = this.noise.white() * 0.1;
    
    return frictionForce + noise * force;
  }

  setStringVelocity(vel: number): void {
    this.stringVel = vel;
  }

  reset(): void {
    this.stringVel = 0;
    this.bowVel = 0;
  }
}

/**
 * Hammer model for hammer and plectrum excitation
 */
class HammerModel {
  private envelope = new ADSREnvelope(0);
  private noise = new NoiseGenerator();
  private sampleRate: number;
  private isActive: boolean = false;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.envelope = new ADSREnvelope(sampleRate);
  }

  trigger(velocity: number, mass: number, stiffness: number): void {
    // Heavier mass = longer contact time
    const contactTime = 0.001 + mass * 0.01;
    
    this.envelope.setAttack(contactTime * 0.1);
    this.envelope.setDecay(contactTime);
    this.envelope.setSustain(0);
    this.envelope.setRelease(0.001);
    this.envelope.trigger();
    this.isActive = true;
  }

  process(stiffness: number): number {
    if (!this.isActive) return 0;
    
    const env = this.envelope.process();
    if (!this.envelope.isActive()) {
      this.isActive = false;
    }
    
    // Stiffness affects brightness
    const noise = this.noise.white() * (1 - stiffness) * 0.2;
    
    return (env + noise) * env;
  }

  reset(): void {
    this.envelope.reset();
    this.isActive = false;
  }
}

/**
 * Tension string voice
 */
export class StringVoice {
  private sampleRate: number;
  private voiceId: number;
  
  // Components
  private string: WaveguideString;
  private bowModel: BowModel;
  private hammerModel: HammerModel;
  private damperEnvelope = new ADSREnvelope(0);
  private damperFilter = new OnePoleFilter();
  private noise = new NoiseGenerator();
  private outputFilter = new BiquadFilter();
  
  // State
  private currentNote: number = -1;
  private currentVelocity: number = 0;
  private params: StringModelParams;
  private isActive: boolean = false;
  private sustainActive: boolean = false;
  private bowActive: boolean = false;

  constructor(voiceId: number, sampleRate: number, params: StringModelParams) {
    this.voiceId = voiceId;
    this.sampleRate = sampleRate;
    this.params = params;
    
    this.string = new WaveguideString(sampleRate);
    this.bowModel = new BowModel(sampleRate);
    this.hammerModel = new HammerModel(sampleRate);
    this.damperEnvelope = new ADSREnvelope(sampleRate);
    
    this.updateParameters(params);
  }

  updateParameters(params: StringModelParams): void {
    this.params = params;
    
    // Update damper
    this.damperEnvelope.setAttack(0.01 * params.damperVelocity);
    this.damperEnvelope.setDecay(0.1);
    this.damperEnvelope.setSustain(params.damperEnabled ? 1 : 0);
    this.damperEnvelope.setRelease(0.05);
    
    // Update output filter
    const toneFreq = 200 + params.tone * 8000;
    this.outputFilter.setLowpass(toneFreq, 0.7, this.sampleRate);
  }

  trigger(note: number, velocity: number): void {
    this.currentNote = note;
    this.currentVelocity = velocity / 127;
    this.isActive = true;
    
    const freq = midiToFreq(note) * this.params.ratio;
    
    // Update string
    this.string.setFrequency(freq, this.params.inharmonics, this.params.stringDamping);
    this.string.setReflections(this.params.nutReflection, this.params.bridgeReflection);
    
    // Trigger excitation
    switch (this.params.excitationType) {
      case 'bow':
        this.bowActive = true;
        this.bowModel.reset();
        break;
        
      case 'hammer':
      case 'hammer-bounce':
      case 'plectrum':
        this.bowActive = false;
        this.hammerModel.trigger(this.currentVelocity, this.params.mass, this.params.stiffness);
        break;
    }
    
    // Release damper
    if (this.params.damperEnabled) {
      this.damperEnvelope.release();
    }
  }

  release(): void {
    if (this.sustainActive) return;
    
    this.isActive = false;
    this.bowActive = false;
    
    // Engage damper
    if (this.params.damperEnabled) {
      this.damperEnvelope.trigger();
    }
  }

  setSustain(active: boolean): void {
    this.sustainActive = active;
    if (!active && !this.isActive && this.params.damperEnabled) {
      this.damperEnvelope.trigger();
    }
  }

  isPlaying(): boolean {
    if (this.bowActive) return true;
    if (this.hammerModel.trigger || this.isActive) return true;
    return false;
  }

  getCurrentNote(): number {
    return this.currentNote;
  }

  process(): number {
    if (!this.isPlaying()) return 0;
    
    // Generate excitation
    let excitation = 0;
    
    switch (this.params.excitationType) {
      case 'bow':
        if (this.bowActive) {
          const bowVel = this.params.velocity * 0.1;
          excitation = this.bowModel.process(
            this.params.force * this.currentVelocity,
            this.params.friction,
            bowVel
          );
        }
        break;
        
      case 'hammer':
      case 'hammer-bounce':
      case 'plectrum':
        excitation = this.hammerModel.process(this.params.stiffness);
        excitation *= this.params.force * this.currentVelocity;
        break;
    }
    
    // Process through string
    let output = this.string.process(excitation, this.params.pickupPosition);
    
    // Apply damper
    if (this.params.damperEnabled) {
      const damperEnv = this.damperEnvelope.process();
      const damperFactor = 1 - (damperEnv * 0.9);
      output *= damperFactor;
    }
    
    // Output filter
    output = this.outputFilter.process(output);
    
    return output * 0.5;
  }

  reset(): void {
    this.currentNote = -1;
    this.currentVelocity = 0;
    this.isActive = false;
    this.bowActive = false;
    this.sustainActive = false;
    this.string.reset();
    this.bowModel.reset();
    this.hammerModel.reset();
    this.damperEnvelope.reset();
  }
}
