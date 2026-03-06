/**
 * Electric - Electric Piano Physical Modeling Instrument
 * 
 * Emulates Rhodes, Wurlitzer, and Pianet electric pianos using
 * physical modeling techniques.
 * 
 * @example
 * ```typescript
 * import { ElectricInstrument, rhodesPreset } from '@daw/instruments-electric';
 * 
 * const electric = new ElectricInstrument({ audioContext });
 * await electric.load();
 * electric.setState(rhodesPreset);
 * electric.noteOn(60, 100);
 * ```
 */

export {
  // Types
  type ElectricState,
  type PianoModel,
  type PickupType,
  type TremoloWaveform,
  type NoteEvent,
  type ControlEvent,
  type ElectricEvent,
  type ParameterSpec,
  
  // Constants
  defaultElectricState,
  rhodesPreset,
  wurlitzerPreset,
  pianetPreset,
  electricParameterSpecs,
} from './types/index.js';

import type { ElectricState, NoteEvent, ControlEvent } from './types/index.js';
import { defaultElectricState, rhodesPreset, wurlitzerPreset, pianetPreset } from './types/index.js';

const WORKLET_URL = new URL('./electric-worklet.js', import.meta.url);

export interface ElectricInstrumentOptions {
  audioContext: AudioContext;
  initialState?: ElectricState;
  outputChannels?: number;
}

/**
 * Electric Instrument Host
 */
export class ElectricInstrument {
  private audioContext: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private state: ElectricState;
  private isLoaded: boolean = false;
  private outputChannels: number;

  constructor(options: ElectricInstrumentOptions) {
    this.audioContext = options.audioContext;
    this.state = options.initialState || { ...defaultElectricState };
    this.outputChannels = options.outputChannels || 2;
  }

  async load(): Promise<void> {
    if (this.isLoaded) return;

    try {
      await this.audioContext.audioWorklet.addModule(WORKLET_URL);

      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        'electric-instrument',
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
      console.error('[Electric] Failed to load worklet:', error);
      throw error;
    }
  }

  getOutputNode(): AudioWorkletNode {
    if (!this.workletNode) {
      throw new Error('[Electric] Instrument not loaded. Call load() first.');
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

  setState(state: ElectricState): void {
    this.state = state;
    this.sendState();
  }

  getState(): ElectricState {
    return { ...this.state };
  }

  setModel(model: 'rhodes' | 'wurlitzer' | 'pianet'): void {
    let preset;
    switch (model) {
      case 'rhodes':
        preset = rhodesPreset;
        break;
      case 'wurlitzer':
        preset = wurlitzerPreset;
        break;
      case 'pianet':
        preset = pianetPreset;
        break;
    }
    
    this.state = {
      ...this.state,
      model,
      ...preset,
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

export function createElectric(options: ElectricInstrumentOptions): ElectricInstrument {
  return new ElectricInstrument(options);
}

export const electricPlugin = {
  id: 'electric',
  name: 'Electric',
  category: 'instrument' as const,
  version: '0.1.0',
  description: 'Electric piano physical modeling (Rhodes, Wurlitzer, Pianet)',
  manufacturer: 'DAW',

  async createInstance(context: AudioContext): Promise<ElectricInstrument> {
    const instrument = new ElectricInstrument({ audioContext: context });
    await instrument.load();
    return instrument;
  },

  getState(): ElectricState {
    return { ...defaultElectricState };
  },

  validateState(state: unknown): state is ElectricState {
    return typeof state === 'object' && state !== null;
  }
};

export default ElectricInstrument;
