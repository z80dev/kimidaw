/**
 * Collision - Physical Modeling Percussion Instrument
 * 
 * A mallet and membrane physics simulator implementing modal synthesis
 * approximations for realtime browser performance.
 * 
 * Based on Ableton Collision device.
 * 
 * @example
 * ```typescript
 * import { CollisionInstrument, defaultCollisionState } from '@daw/instruments-collision';
 * 
 * const collision = new CollisionInstrument(audioContext);
 * await collision.load();
 * collision.setState({
 *   ...defaultCollisionState,
 *   resonatorA: { ...defaultCollisionState.resonatorA, type: 'membrane' }
 * });
 * collision.noteOn(60, 100); // Middle C
 * ```
 */

export {
  // Types
  type CollisionState,
  type ExcitatorType,
  type ResonatorType,
  type ResonatorParams,
  type LinkMode,
  type LfoTarget,
  type LfoWaveform,
  type FilterType,
  type NoteEvent,
  type ControlEvent,
  type CollisionEvent,
  type ParameterSpec,
  
  // Constants
  defaultCollisionState,
  collisionParameterSpecs,
} from './types/index.js';

import type { CollisionState, NoteEvent, ControlEvent } from './types/index.js';
import { defaultCollisionState } from './types/index.js';

// Worklet URL (will be resolved by bundler)
const WORKLET_URL = new URL('./collision-worklet.js', import.meta.url);

export interface CollisionInstrumentOptions {
  /** AudioContext to use */
  audioContext: AudioContext;
  /** Initial state (optional) */
  initialState?: CollisionState;
  /** Number of output channels (1 or 2) */
  outputChannels?: number;
}

/**
 * Collision Instrument Host
 * 
 * Manages the AudioWorklet and provides a high-level API for the Collision
 * physical modeling instrument.
 */
export class CollisionInstrument {
  private audioContext: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private state: CollisionState;
  private isLoaded: boolean = false;
  private outputChannels: number;
  
  constructor(options: CollisionInstrumentOptions) {
    this.audioContext = options.audioContext;
    this.state = options.initialState || { ...defaultCollisionState };
    this.outputChannels = options.outputChannels || 2;
  }
  
  /**
   * Load and initialize the AudioWorklet
   */
  async load(): Promise<void> {
    if (this.isLoaded) return;
    
    try {
      // Add the worklet module
      await this.audioContext.audioWorklet.addModule(WORKLET_URL);
      
      // Create the worklet node
      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        'collision-instrument',
        {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [this.outputChannels],
          processorOptions: {
            sampleRate: this.audioContext.sampleRate,
          }
        }
      );
      
      // Send initial state
      this.sendState();
      
      this.isLoaded = true;
    } catch (error) {
      console.error('[Collision] Failed to load worklet:', error);
      throw error;
    }
  }
  
  /**
   * Get the audio output node
   */
  getOutputNode(): AudioWorkletNode {
    if (!this.workletNode) {
      throw new Error('[Collision] Instrument not loaded. Call load() first.');
    }
    return this.workletNode;
  }
  
  /**
   * Trigger a note on
   */
  noteOn(note: number, velocity: number = 100, sampleOffset: number = 0): void {
    if (!this.workletNode) return;
    
    this.workletNode.port.postMessage({
      type: 'note-on',
      payload: { note, velocity, sampleOffset }
    });
  }
  
  /**
   * Trigger a note off
   */
  noteOff(note: number, sampleOffset: number = 0): void {
    if (!this.workletNode) return;
    
    this.workletNode.port.postMessage({
      type: 'note-off',
      payload: { note, velocity: 0, sampleOffset }
    });
  }
  
  /**
   * Send a control event (pitch bend, mod wheel, etc.)
   */
  sendControl(type: 'pitch-bend' | 'mod-wheel', value: number, sampleOffset: number = 0): void {
    if (!this.workletNode) return;
    
    this.workletNode.port.postMessage({
      type: 'control',
      payload: { type, value, sampleOffset }
    });
  }
  
  /**
   * Set the complete instrument state
   */
  setState(state: CollisionState): void {
    this.state = state;
    this.sendState();
  }
  
  /**
   * Get the current instrument state
   */
  getState(): CollisionState {
    return { ...this.state };
  }
  
  /**
   * Update a specific parameter
   */
  setParameter<T extends keyof CollisionState>(
    section: T,
    value: CollisionState[T]
  ): void {
    (this.state as Record<string, unknown>)[section as string] = value;
    this.sendState();
  }
  
  /**
   * Update a nested parameter
   */
  setNestedParameter<T extends keyof CollisionState, K extends keyof CollisionState[T]>(
    section: T,
    param: K,
    value: CollisionState[T][K]
  ): void {
    (this.state[section] as Record<string, unknown>)[param as string] = value;
    this.sendState();
  }
  
  /**
   * Reset all voices
   */
  reset(): void {
    if (!this.workletNode) return;
    
    this.workletNode.port.postMessage({
      type: 'reset',
      payload: null
    });
  }
  
  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    this.isLoaded = false;
  }
  
  private sendState(): void {
    if (!this.workletNode) return;
    
    this.workletNode.port.postMessage({
      type: 'state',
      payload: { state: this.state }
    });
  }
}

/**
 * Create a new Collision instrument instance
 */
export function createCollision(options: CollisionInstrumentOptions): CollisionInstrument {
  return new CollisionInstrument(options);
}

/**
 * Plugin definition for the DAW plugin system
 */
export const collisionPlugin = {
  id: 'collision',
  name: 'Collision',
  category: 'instrument' as const,
  version: '0.1.0',
  description: 'Physical modeling percussion instrument with mallet and membrane physics',
  manufacturer: 'DAW',
  
  async createInstance(context: AudioContext): Promise<CollisionInstrument> {
    const instrument = new CollisionInstrument({ audioContext: context });
    await instrument.load();
    return instrument;
  },
  
  getState(): CollisionState {
    return { ...defaultCollisionState };
  },
  
  validateState(state: unknown): state is CollisionState {
    // Basic validation - could be expanded with Zod
    return typeof state === 'object' && state !== null;
  }
};

// Extended DSP features
export type {
  ExtendedResonatorType,
  MarimbaResonator,
  StringResonator,
  HexMembraneResonator,
  OrthoPlateResonator,
  BarResonator,
  PipeResonator,
  BeamResonator,
  CymbalResonator,
  GongResonator,
  ResonatorPreset,
  MidiControlConfig,
  CcMapping,
  NoteMapping,
  MidiLearnState,
  MidiControlProcessor,
  ParameterChange,
  NoteAction,
  MacroControl,
  MacroMapping,
} from './dsp/index.js';

export {
  createMarimbaResonator,
  createStringResonator,
  createHexMembraneResonator,
  createOrthoPlateResonator,
  createBarResonator,
  createPipeResonator,
  createBeamResonator,
  createCymbalResonator,
  createGongResonator,
  getExtendedResonatorMidiMappings,
  EXTENDED_RESONATOR_PRESETS,
  DEFAULT_CC_MAPPINGS,
  createMidiControlProcessor,
  createMacroControlSystem,
} from './dsp/index.js';

export default CollisionInstrument;
