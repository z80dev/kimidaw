/**
 * Tension - String Physical Modeling Instrument
 * 
 * String physical modeling with bow, hammer, and plectrum excitation.
 * Supports various instrument body resonances.
 * 
 * @example
 * ```typescript
 * import { TensionInstrument, bowPreset, hammerPreset, plectrumPreset } from '@daw/instruments-tension';
 * 
 * const tension = new TensionInstrument({ audioContext });
 * await tension.load();
 * tension.setPreset('bow'); // String instrument bowed style
 * tension.noteOn(60, 100);
 * ```
 */

export {
  // Types
  type TensionState,
  type ExcitationType,
  type BodyType,
  type FilterType,
  type LfoWaveform,
  type LfoTarget,
  type NoteEvent,
  type ControlEvent,
  type TensionEvent,
  type ParameterSpec,
  
  // Constants
  defaultTensionState,
  bowPreset,
  hammerPreset,
  plectrumPreset,
  tensionParameterSpecs,
} from './types/index.js';

import type { TensionState, NoteEvent, ControlEvent } from './types/index.js';
import { defaultTensionState, bowPreset, hammerPreset, plectrumPreset } from './types/index.js';

const WORKLET_URL = new URL('./tension-worklet.js', import.meta.url);

export interface TensionInstrumentOptions {
  audioContext: AudioContext;
  initialState?: TensionState;
  outputChannels?: number;
}

/**
 * Tension Instrument Host
 */
export class TensionInstrument {
  private audioContext: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private state: TensionState;
  private isLoaded: boolean = false;
  private outputChannels: number;

  constructor(options: TensionInstrumentOptions) {
    this.audioContext = options.audioContext;
    this.state = options.initialState || { ...defaultTensionState };
    this.outputChannels = options.outputChannels || 2;
  }

  async load(): Promise<void> {
    if (this.isLoaded) return;

    try {
      await this.audioContext.audioWorklet.addModule(WORKLET_URL);

      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        'tension-instrument',
        {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [this.outputChannels],
          processorOptions: {
            sampleRate: this.audioContext.sampleRate,
          }
        }
      );

      this.sendState();
      this.isLoaded = true;
    } catch (error) {
      console.error('[Tension] Failed to load worklet:', error);
      throw error;
    }
  }

  getOutputNode(): AudioWorkletNode {
    if (!this.workletNode) {
      throw new Error('[Tension] Instrument not loaded. Call load() first.');
    }
    return this.workletNode;
  }

  noteOn(note: number, velocity: number = 100, sampleOffset: number = 0): void {
    if (!this.workletNode) return;

    this.workletNode.port.postMessage({
      type: 'note-on',
      payload: { note, velocity, sampleOffset }
    });
  }

  noteOff(note: number, sampleOffset: number = 0): void {
    if (!this.workletNode) return;

    this.workletNode.port.postMessage({
      type: 'note-off',
      payload: { note, sampleOffset }
    });
  }

  sendSustain(value: number, sampleOffset: number = 0): void {
    if (!this.workletNode) return;

    this.workletNode.port.postMessage({
      type: 'control',
      payload: { type: 'sustain', value, sampleOffset }
    });
  }

  setState(state: TensionState): void {
    this.state = state;
    this.sendState();
  }

  getState(): TensionState {
    return { ...this.state };
  }

  setPreset(preset: 'bow' | 'hammer' | 'plectrum'): void {
    let presetState;
    switch (preset) {
      case 'bow':
        presetState = bowPreset;
        break;
      case 'hammer':
        presetState = hammerPreset;
        break;
      case 'plectrum':
        presetState = plectrumPreset;
        break;
    }

    this.state = {
      ...this.state,
      ...presetState,
      excitator: presetState.excitator!,
      string: presetState.string!,
      termination: presetState.termination!,
      damper: presetState.damper!,
      body: presetState.body!,
      lfo: presetState.lfo!,
      global: { ...this.state.global, ...presetState.global },
    };
    this.sendState();
  }

  reset(): void {
    if (!this.workletNode) return;

    this.workletNode.port.postMessage({
      type: 'reset',
      payload: null
    });
  }

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

export function createTension(options: TensionInstrumentOptions): TensionInstrument {
  return new TensionInstrument(options);
}

export const tensionPlugin = {
  id: 'tension',
  name: 'Tension',
  category: 'instrument' as const,
  version: '0.1.0',
  description: 'String physical modeling with bow, hammer, and plectrum excitation',
  manufacturer: 'DAW',

  async createInstance(context: AudioContext): Promise<TensionInstrument> {
    const instrument = new TensionInstrument({ audioContext: context });
    await instrument.load();
    return instrument;
  },

  getState(): TensionState {
    return { ...defaultTensionState };
  },

  validateState(state: unknown): state is TensionState {
    return typeof state === 'object' && state !== null;
  }
};

export default TensionInstrument;
