/**
 * Polyphonic Voice Allocator
 * 
 * Manages polyphonic voices for instruments:
 * - Voice stealing strategies
 * - Legato mode support
 * - Voice count limiting
 * - Per-voice parameter storage
 */

import type { VoiceState, SynthVoiceState, SamplerVoiceState } from './types.js';

/** Voice allocation strategy */
export type VoiceStealStrategy = 
  | 'oldest'      // Steal oldest playing voice
  | 'newest'      // Steal newest playing voice  
  | 'quietest'    // Steal voice with lowest velocity
  | 'lowest'      // Steal lowest note
  | 'highest';    // Steal highest note

/** Voice allocator options */
export interface VoiceAllocatorOptions {
  /** Maximum number of voices */
  maxVoices: number;
  /** Voice stealing strategy */
  stealStrategy: VoiceStealStrategy;
  /** Enable legato mode */
  legato: boolean;
  /** Retrigger on legato (false = portamento) */
  retrigger: boolean;
  /** Unison voices per note */
  unison: number;
  /** Unison detune in cents */
  unisonDetune: number;
}

/** Default allocator options */
export const DEFAULT_ALLOCATOR_OPTIONS: VoiceAllocatorOptions = {
  maxVoices: 8,
  stealStrategy: 'oldest',
  legato: false,
  retrigger: true,
  unison: 1,
  unisonDetune: 10,
};

/**
 * Polyphonic voice allocator
 * Realtime-safe: no allocations in trigger/release methods
 */
export class VoiceAllocator<T extends VoiceState = VoiceState> {
  private voices: T[] = [];
  private options: VoiceAllocatorOptions;
  private voiceAgeCounter = 0;
  private freeVoices: number[] = [];
  private activeVoices: number[] = [];
  
  constructor(
    options: Partial<VoiceAllocatorOptions> = {},
    voiceFactory: (id: number) => T
  ) {
    this.options = { ...DEFAULT_ALLOCATOR_OPTIONS, ...options };
    
    // Pre-allocate voices
    for (let i = 0; i < this.options.maxVoices; i++) {
      const voice = voiceFactory(i);
      this.voices.push(voice);
      this.freeVoices.push(i);
    }
  }
  
  /** Get all voices */
  getVoices(): readonly T[] {
    return this.voices;
  }
  
  /** Get active voice count */
  getActiveVoiceCount(): number {
    return this.activeVoices.length;
  }
  
  /** Get free voice count */
  getFreeVoiceCount(): number {
    return this.freeVoices.length;
  }
  
  /**
   * Trigger a note
   * @returns Array of voice IDs assigned (may be multiple for unison)
   */
  triggerNote(
    note: number,
    velocity: number,
    channel: number,
    voiceSetup?: (voice: T) => void
  ): number[] {
    const assignedVoices: number[] = [];
    const unison = this.options.unison;
    
    // Check if note already playing (for legato)
    const existingVoice = this.findVoiceByNote(note);
    if (existingVoice !== -1 && this.options.legato) {
      if (this.options.retrigger) {
        // Retrigger envelope
        this.retriggerVoice(existingVoice, velocity);
      }
      return [existingVoice];
    }
    
    // Allocate voices for unison
    for (let u = 0; u < unison; u++) {
      const voiceId = this.allocateVoice();
      if (voiceId === -1) break;
      
      const voice = this.voices[voiceId];
      voice.note = note;
      voice.velocity = velocity;
      voice.channel = channel;
      voice.stage = 'attack';
      voice.amplitude = 0;
      voice.age = ++this.voiceAgeCounter;
      
      // Apply unison detune
      if (unison > 1 && 'frequency' in voice) {
        const detune = ((u / (unison - 1)) - 0.5) * this.options.unisonDetune;
        (voice as unknown as { detune: number }).detune = detune;
      }
      
      // Custom setup
      if (voiceSetup) {
        voiceSetup(voice);
      }
      
      assignedVoices.push(voiceId);
    }
    
    return assignedVoices;
  }
  
  /**
   * Release a note
   * @returns Number of voices released
   */
  releaseNote(note: number): number {
    let released = 0;
    
    for (let i = 0; i < this.activeVoices.length; i++) {
      const voiceId = this.activeVoices[i];
      const voice = this.voices[voiceId];
      
      if (voice.note === note && voice.stage !== 'release' && voice.stage !== 'idle') {
        voice.stage = 'release';
        released++;
      }
    }
    
    return released;
  }
  
  /**
   * Release all notes
   */
  releaseAll(): void {
    for (const voiceId of this.activeVoices) {
      const voice = this.voices[voiceId];
      if (voice.stage !== 'idle') {
        voice.stage = 'release';
      }
    }
  }
  
  /**
   * Kill a voice immediately (no release)
   */
  killVoice(voiceId: number): void {
    const voice = this.voices[voiceId];
    voice.stage = 'idle';
    voice.note = -1;
    voice.amplitude = 0;
    
    // Move to free list
    const activeIdx = this.activeVoices.indexOf(voiceId);
    if (activeIdx !== -1) {
      this.activeVoices.splice(activeIdx, 1);
    }
    if (!this.freeVoices.includes(voiceId)) {
      this.freeVoices.push(voiceId);
    }
  }
  
  /**
   * Kill all voices
   */
  killAll(): void {
    for (let i = 0; i < this.voices.length; i++) {
      this.killVoice(i);
    }
  }
  
  /**
   * Find voice playing a specific note
   */
  findVoiceByNote(note: number): number {
    for (const voiceId of this.activeVoices) {
      if (this.voices[voiceId].note === note) {
        return voiceId;
      }
    }
    return -1;
  }
  
  /**
   * Allocate a voice (internal)
   */
  private allocateVoice(): number {
    // Try to get a free voice
    if (this.freeVoices.length > 0) {
      const voiceId = this.freeVoices.pop()!;
      this.activeVoices.push(voiceId);
      return voiceId;
    }
    
    // Need to steal a voice
    return this.stealVoice();
  }
  
  /**
   * Steal a voice based on strategy
   */
  private stealVoice(): number {
    if (this.activeVoices.length === 0) return -1;
    
    let voiceToSteal = this.activeVoices[0];
    let bestValue: number;
    
    switch (this.options.stealStrategy) {
      case 'oldest':
        bestValue = Infinity;
        for (const voiceId of this.activeVoices) {
          const age = this.voices[voiceId].age;
          if (age < bestValue) {
            bestValue = age;
            voiceToSteal = voiceId;
          }
        }
        break;
        
      case 'newest':
        bestValue = -Infinity;
        for (const voiceId of this.activeVoices) {
          const age = this.voices[voiceId].age;
          if (age > bestValue) {
            bestValue = age;
            voiceToSteal = voiceId;
          }
        }
        break;
        
      case 'quietest':
        bestValue = Infinity;
        for (const voiceId of this.activeVoices) {
          const velocity = this.voices[voiceId].velocity;
          if (velocity < bestValue) {
            bestValue = velocity;
            voiceToSteal = voiceId;
          }
        }
        break;
        
      case 'lowest':
        bestValue = Infinity;
        for (const voiceId of this.activeVoices) {
          const note = this.voices[voiceId].note;
          if (note < bestValue) {
            bestValue = note;
            voiceToSteal = voiceId;
          }
        }
        break;
        
      case 'highest':
        bestValue = -Infinity;
        for (const voiceId of this.activeVoices) {
          const note = this.voices[voiceId].note;
          if (note > bestValue) {
            bestValue = note;
            voiceToSteal = voiceId;
          }
        }
        break;
    }
    
    // Kill the stolen voice
    this.killVoice(voiceToSteal);
    
    // Re-allocate (should now be in free list)
    return this.allocateVoice();
  }
  
  /**
   * Retrigger a voice
   */
  private retriggerVoice(voiceId: number, velocity: number): void {
    const voice = this.voices[voiceId];
    voice.velocity = velocity;
    voice.stage = 'attack';
    voice.amplitude = 0;
    voice.age = ++this.voiceAgeCounter;
  }
  
  /**
   * Update options
   */
  setOptions(options: Partial<VoiceAllocatorOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Validate unison doesn't exceed max voices
    if (this.options.unison > this.options.maxVoices) {
      this.options.unison = this.options.maxVoices;
    }
  }
  
  /**
   * Reset all voices
   */
  reset(): void {
    this.killAll();
    this.voiceAgeCounter = 0;
  }
}

/** Create a voice allocator */
export function createVoiceAllocator<T extends VoiceState>(
  options: Partial<VoiceAllocatorOptions>,
  voiceFactory: (id: number) => T
): VoiceAllocator<T> {
  return new VoiceAllocator(options, voiceFactory);
}

/** Default synth voice factory */
export function createSynthVoice(id: number): SynthVoiceState {
  return {
    id,
    note: -1,
    stage: 'idle',
    amplitude: 0,
    age: 0,
    velocity: 0,
    channel: 0,
    phase: 0,
    frequency: 0,
    pitchBend: 0,
    filterCutoff: 20000,
    filterResonance: 0.7,
    filterState: { x1: 0, x2: 0, y1: 0, y2: 0 },
  };
}

/** Default sampler voice factory */
export function createSamplerVoice(id: number): SamplerVoiceState {
  return {
    id,
    note: -1,
    stage: 'idle',
    amplitude: 0,
    age: 0,
    velocity: 0,
    channel: 0,
    samplePosition: 0,
    rate: 1,
    loopStart: 0,
    loopEnd: 0,
    bufferId: '',
  };
}
