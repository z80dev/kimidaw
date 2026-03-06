/**
 * Modal Resonator for Collision
 * 
 * Implements various physical models using modal synthesis approximations:
 * - Beam/Marimba: 1D vibrating bar
 * - String: Stiff string with inharmonicity
 * - Membrane: 2D circular drum
 * - Plate: 2D rectangular plate
 * - Pipe/Tube: 1D air column resonances
 */

import { 
  DelayLine, 
  OnePoleFilter, 
  BiquadFilter, 
  PercussiveEnvelope,
  midiToFreq, 
  clamp,
  TWO_PI 
} from '../utils/dsp.js';

// Number of modes per resonator (trade-off between quality and CPU)
const NUM_MODES = 8;

/** Individual modal filter */
class ModalFilter {
  private y1: number = 0;
  private y2: number = 0;
  private a1: number = 0;
  private a2: number = 0;
  private gain: number = 1;
  
  setFrequency(freq: number, decay: number, sampleRate: number): void {
    const omega = TWO_PI * freq / sampleRate;
    const radius = Math.exp(-1 / (decay * freq * sampleRate * 0.001));
    
    this.a1 = -2 * radius * Math.cos(omega);
    this.a2 = radius * radius;
    
    // Normalize gain at DC
    this.gain = (1 + this.a1 + this.a2) / 4;
  }
  
  process(input: number): number {
    const output = this.gain * input - this.a1 * this.y1 - this.a2 * this.y2;
    this.y2 = this.y1;
    this.y1 = output;
    return output;
  }
  
  reset(): void {
    this.y1 = this.y2 = 0;
  }
}

/** Modal resonator with multiple modes */
export class ModalResonator {
  private modes: ModalFilter[] = [];
  private modeFreqs: number[] = [];
  private modeAmps: number[] = [];
  private sampleRate: number;
  private envelope = new PercussiveEnvelope();
  private dampingFilter = new OnePoleFilter();
  private excitationFilter = new BiquadFilter();
  
  // Current parameters
  private currentFreq: number = 440;
  private currentDecay: number = 0.5;
  private currentMaterial: number = 0.5;
  private currentRadius: number = 0.5;
  private currentHitPos: number = 0.5;
  private currentType: string = 'membrane';
  
  constructor(type: string, sampleRate: number) {
    this.sampleRate = sampleRate;
    this.currentType = type;
    
    // Initialize modal filters
    for (let i = 0; i < NUM_MODES; i++) {
      this.modes.push(new ModalFilter());
      this.modeFreqs.push(1);
      this.modeAmps.push(1);
    }
    
    this.dampingFilter.setCoefficient(0.1);
    this.excitationFilter.setLowpass(8000, 0.7, sampleRate);
    this.updateModalParameters();
  }
  
  /** Calculate modal frequencies based on resonator type */
  private updateModalParameters(): void {
    const baseFreq = this.currentFreq;
    const material = this.currentMaterial;
    const hitPos = this.currentHitPos;
    const radius = this.currentRadius;
    
    // Inharmonicity factor (higher = less harmonic)
    const inharmonicity = 0.01 + material * 0.1;
    
    for (let i = 0; i < NUM_MODES; i++) {
      let freqRatio: number;
      let amp: number;
      
      switch (this.currentType) {
        case 'beam':
        case 'marimba':
          // 1D bar: frequencies go as (2n+1)^2 for clamped bar
          // Marimba has tuned higher modes
          freqRatio = Math.pow(2 * i + 1, 2) * (1 + inharmonicity * i * i);
          // Hit position affects odd/even mode amplitudes
          amp = i % 2 === 0 ? hitPos : (1 - hitPos);
          break;
          
        case 'string':
          // Stiff string: nearly harmonic with slight inharmonicity
          freqRatio = (i + 1) * Math.sqrt(1 + inharmonicity * (i + 1) * (i + 1));
          amp = 1 / (i + 1); // Natural roll-off
          break;
          
        case 'membrane':
          // Circular drum: non-harmonic series based on Bessel zeros
          // Approximate with irregular spacing
          freqRatio = this.getDrumModeRatio(i);
          // Center hit emphasizes (0,n) modes, edge hit emphasizes (m,n) modes
          amp = hitPos < 0.5 ? 1 : (1 / (i + 1));
          break;
          
        case 'plate':
          // Rectangular plate: complex modal pattern
          freqRatio = this.getPlateModeRatio(i) * (1 + radius * 0.2);
          amp = 1 / Math.sqrt(i + 1);
          break;
          
        case 'pipe':
        case 'tube':
          // Cylindrical pipe: nearly harmonic
          // Open-open or open-closed depending on settings
          const closed = radius > 0.5;
          if (closed) {
            // Open-closed: odd harmonics only
            freqRatio = 2 * i + 1;
          } else {
            // Open-open: all harmonics
            freqRatio = i + 1;
          }
          amp = 1 / (i + 1);
          break;
          
        default:
          freqRatio = i + 1;
          amp = 1 / (i + 1);
      }
      
      // Apply radius/size scaling
      const sizeScale = 1 / (1 + radius * 0.5);
      this.modeFreqs[i] = baseFreq * freqRatio * sizeScale;
      
      // Hit position creates nodal effects
      const nodalFactor = Math.sin((i + 1) * hitPos * Math.PI);
      this.modeAmps[i] = amp * Math.abs(nodalFactor);
      
      // Decay varies by mode (higher modes decay faster)
      const modeDecay = this.currentDecay * (1 - material * 0.5 * i / NUM_MODES);
      
      // Update modal filter
      this.modes[i].setFrequency(
        clamp(this.modeFreqs[i], 20, this.sampleRate / 2 - 100),
        Math.max(0.01, modeDecay),
        this.sampleRate
      );
    }
  }
  
  /** Get approximate frequency ratio for drum modes (circular membrane) */
  private getDrumModeRatio(modeIndex: number): number {
    // Approximate Bessel function zeros for (m,n) modes
    const drumModes = [
      1.000,   // (0,1) - fundamental
      1.593,   // (1,1) 
      2.136,   // (2,1)
      2.295,   // (0,2)
      2.653,   // (3,1)
      2.917,   // (1,2)
      3.155,   // (4,1)
      3.500,   // (2,2)
    ];
    return drumModes[modeIndex] || (modeIndex + 1) * 1.5;
  }
  
  /** Get approximate frequency ratio for plate modes */
  private getPlateModeRatio(modeIndex: number): number {
    // Approximate modal density for rectangular plate
    const plateModes = [
      1.000,
      1.406,
      1.875,
      2.031,
      2.344,
      2.656,
      2.969,
      3.281,
    ];
    return plateModes[modeIndex] || Math.sqrt(modeIndex + 1) * 1.2;
  }
  
  setParameters(params: {
    freq: number;
    decay: number;
    material: number;
    radius: number;
    hitPosition: number;
    type: string;
  }): void {
    this.currentFreq = params.freq;
    this.currentDecay = params.decay;
    this.currentMaterial = params.material;
    this.currentRadius = params.radius;
    this.currentHitPos = params.hitPosition;
    this.currentType = params.type;
    this.updateModalParameters();
    
    this.envelope.setDecay(params.decay, this.sampleRate);
  }
  
  trigger(velocity: number): void {
    this.envelope.trigger(velocity);
    // Reset filters to avoid clicks
    for (const mode of this.modes) {
      mode.reset();
    }
  }
  
  isActive(): boolean {
    return this.envelope.isActive();
  }
  
  process(excitation: number): number {
    if (!this.isActive()) return 0;
    
    // Get envelope
    const env = this.envelope.process();
    
    // Filter excitation
    const filteredExcitation = this.excitationFilter.process(excitation);
    
    // Sum all modes
    let output = 0;
    for (let i = 0; i < NUM_MODES; i++) {
      const modalOut = this.modes[i].process(filteredExcitation * this.modeAmps[i]);
      output += modalOut;
    }
    
    // Apply damping filter
    output = this.dampingFilter.process(output);
    
    return output * env * 0.1; // Scale down to avoid clipping
  }
  
  reset(): void {
    this.envelope.reset();
    for (const mode of this.modes) {
      mode.reset();
    }
    this.dampingFilter.reset();
    this.excitationFilter.reset();
  }
}
