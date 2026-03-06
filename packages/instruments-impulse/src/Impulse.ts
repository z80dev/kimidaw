/**
 * Impulse Drum Sampler
 * 
 * Ableton-style 8-slot drum sampler with per-slot controls:
 * - Sample start, length, fade
 * - Filter, saturation
 * - Pan, volume
 * - Time expansion/decay
 * - Individual tuning
 * 
 * Based on Ableton Live's Impulse instrument.
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  MidiEvent,
  AudioBuffer,
} from "@daw/plugin-api";
import { createParameterMap, dbToGain } from "@daw/plugin-api";
import {
  type ImpulseStateSnapshot,
  type SampleSlot,
  generateImpulseParameters,
  createDefaultImpulseState,
} from "./types.js";

// =============================================================================
// Simple Filter for Drum Slots
// =============================================================================

class SimpleFilter {
  private _z1 = 0;
  private _z2 = 0;
  private _b0 = 1;
  private _b1 = 0;
  private _b2 = 0;
  private _a1 = 0;
  private _a2 = 0;
  private _sampleRate = 48000;
  
  setFrequency(freq: number): void {
    const w0 = 2 * Math.PI * freq / this._sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / 2;
    
    this._b0 = (1 - cosw0) / 2;
    this._b1 = 1 - cosw0;
    this._b2 = (1 - cosw0) / 2;
    const a0 = 1 + alpha;
    this._a1 = -2 * cosw0 / a0;
    this._a2 = (1 - alpha) / a0;
    this._b0 /= a0;
    this._b1 /= a0;
    this._b2 /= a0;
  }
  
  process(input: number): number {
    const output = this._b0 * input + this._b1 * this._z1 + this._b2 * this._z2
                 - this._a1 * this._z1 - this._a2 * this._z2;
    this._z2 = this._z1;
    this._z1 = output;
    return output;
  }
  
  reset(): void {
    this._z1 = this._z2 = 0;
  }
}

// =============================================================================
// Active Voice for Sample Playback
// =============================================================================

class ImpulseVoice {
  private _sample: Float32Array[];
  private _sampleRate: number;
  private _slotConfig: SampleSlot;
  private _filter: SimpleFilter;
  private _position = 0;
  private _velocity = 127;
  private _decayLevel = 1;
  private _decayRate = 0;
  private _active = false;
  private _note = 0;
  private _outputSampleRate = 48000;
  private _pitchRatio = 1;
  
  constructor(sampleRate = 48000) {
    this._outputSampleRate = sampleRate;
    this._sample = [new Float32Array(0)];
    this._sampleRate = 48000;
    this._slotConfig = createDefaultImpulseState().slots[0];
    this._filter = new SimpleFilter();
  }
  
  trigger(
    sample: Float32Array[],
    sampleRate: number,
    slotConfig: SampleSlot,
    note: number,
    velocity: number,
    pitchRatio = 1
  ): void {
    this._sample = sample;
    this._sampleRate = sampleRate;
    this._slotConfig = slotConfig;
    this._note = note;
    this._velocity = velocity;
    this._pitchRatio = pitchRatio;
    this._position = (slotConfig.start / 100) * sample[0].length;
    this._active = true;
    this._decayLevel = 1;
    
    // Calculate decay rate
    const decaySamples = slotConfig.decay * this._outputSampleRate / 1000;
    this._decayRate = 1 / decaySamples;
    
    // Setup filter
    this._filter.setFrequency(slotConfig.filterFreq);
    this._filter.reset();
  }
  
  process(): { left: number; right: number } {
    if (!this._active) return { left: 0, right: 0 };
    
    const numChannels = this._sample.length;
    const sampleLength = this._sample[0].length;
    const effectiveLength = (this._slotConfig.length / 100) * sampleLength;
    
    // Check if playback complete
    if (this._position >= effectiveLength || this._decayLevel < 0.001) {
      this._active = false;
      return { left: 0, right: 0 };
    }
    
    // Read sample with interpolation
    const pos = this._position;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, sampleLength - 1);
    const frac = pos - i0;
    
    let leftSample = 0;
    let rightSample = 0;
    
    if (numChannels === 1) {
      const mono = this._sample[0];
      const s = mono[i0] * (1 - frac) + mono[i1] * frac;
      leftSample = rightSample = s;
    } else {
      leftSample = this._sample[0][i0] * (1 - frac) + this._sample[0][i1] * frac;
      rightSample = this._sample[1][i0] * (1 - frac) + this._sample[1][i1] * frac;
    }
    
    // Apply fade
    const fadeSamples = (this._slotConfig.fade / 100) * effectiveLength;
    if (this._position < fadeSamples) {
      const fadeIn = this._position / fadeSamples;
      leftSample *= fadeIn;
      rightSample *= fadeIn;
    }
    const remaining = effectiveLength - this._position;
    if (remaining < fadeSamples) {
      const fadeOut = remaining / fadeSamples;
      leftSample *= fadeOut;
      rightSample *= fadeOut;
    }
    
    // Apply filter
    const filtered = this._filter.process((leftSample + rightSample) * 0.5);
    leftSample = filtered;
    rightSample = filtered;
    
    // Apply saturation
    if (this._slotConfig.saturation > 0) {
      const sat = this._slotConfig.saturation / 100;
      leftSample = Math.tanh(leftSample * (1 + sat * 4));
      rightSample = Math.tanh(rightSample * (1 + sat * 4));
    }
    
    // Apply decay envelope
    this._decayLevel -= this._decayRate;
    if (this._decayLevel < 0) this._decayLevel = 0;
    
    // Apply volume and pan
    const volume = (this._slotConfig.volume / 100) * (this._velocity / 127);
    const pan = this._slotConfig.pan;
    const leftGain = volume * Math.cos((pan + 1) * Math.PI / 4) * this._decayLevel;
    const rightGain = volume * Math.sin((pan + 1) * Math.PI / 4) * this._decayLevel;
    
    // Advance position with pitch/time
    const timeRatio = Math.pow(2, this._slotConfig.time / 100);
    const sampleRateRatio = this._sampleRate / this._outputSampleRate;
    this._position += this._pitchRatio * timeRatio * sampleRateRatio;
    
    return {
      left: leftSample * leftGain,
      right: rightSample * rightGain,
    };
  }
  
  get isActive(): boolean {
    return this._active;
  }
  
  get note(): number {
    return this._note;
  }
  
  stop(): void {
    this._active = false;
  }
}

// =============================================================================
// Impulse Instance
// =============================================================================

export class ImpulseInstance implements PluginInstanceRuntime {
  private _params: ReturnType<typeof createParameterMap>;
  private _voices: ImpulseVoice[] = [];
  private _maxVoices = 32;
  
  private _samples: (Float32Array[] | null)[] = [];
  private _sampleRates: number[] = [];
  
  private _sampleRate = 48000;
  private _blockSize = 128;
  private _connected = false;
  
  private _noteMappings: number[] = [36, 37, 38, 39, 40, 41, 42, 43];
  
  // Buffers
  private _leftBuffer: Float32Array;
  private _rightBuffer: Float32Array;
  
  constructor(maxBlockSize = 128) {
    this._params = createParameterMap(generateImpulseParameters());
    
    // Initialize sample slots
    for (let i = 0; i < 8; i++) {
      this._samples.push(null);
      this._sampleRates.push(48000);
    }
    
    // Create voices
    for (let i = 0; i < this._maxVoices; i++) {
      this._voices.push(new ImpulseVoice(48000));
    }
    
    // Pre-allocate buffers
    this._leftBuffer = new Float32Array(maxBlockSize);
    this._rightBuffer = new Float32Array(maxBlockSize);
  }
  
  // ---------------------------------------------------------------------------
  // PluginInstanceRuntime Implementation
  // ---------------------------------------------------------------------------
  
  connect(graph: PluginConnectionGraph): void {
    if (graph.midiInput) {
      graph.midiInput.onReceive?.((event: MidiEvent) => this._handleMidi(event));
    }
    this._connected = true;
  }
  
  disconnect(): void {
    this._stopAll();
    this._connected = false;
  }
  
  setParam(id: string, value: number, atSample?: number): void {
    const param = this._params.get(id);
    if (param) {
      param.setNormalized(value);
    }
  }
  
  getParam(id: string): number {
    return this._params.get(id)?.normalizedValue ?? 0;
  }
  
  async saveState(): Promise<ImpulseStateSnapshot> {
    return this._createStateSnapshot();
  }
  
  async loadState(state: unknown): Promise<void> {
    // Load state implementation
  }
  
  getLatencySamples(): number {
    return 0;
  }
  
  getTailSamples(): number {
    // Find longest decay
    let maxDecay = 0;
    for (let i = 0; i < 8; i++) {
      const decay = this._params.get(`slot${i + 1}Decay`)?.value ?? 500;
      maxDecay = Math.max(maxDecay, decay);
    }
    return Math.ceil((maxDecay / 1000) * this._sampleRate);
  }
  
  reset(): void {
    this._stopAll();
  }
  
  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._blockSize = config.blockSize;
    
    if (this._leftBuffer.length < config.blockSize) {
      this._leftBuffer = new Float32Array(config.blockSize);
      this._rightBuffer = new Float32Array(config.blockSize);
    }
    
    for (const voice of this._voices) {
      // Update voice sample rate
    }
  }
  
  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: MidiEvent[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;
    
    // Clear buffers
    this._leftBuffer.fill(0, 0, blockSize);
    this._rightBuffer.fill(0, 0, blockSize);
    
    // Process MIDI
    for (const event of midi) {
      this._handleMidi(event);
    }
    
    // Process parameter smoothing
    this._params.processSmoothing();
    
    // Process each sample
    for (let i = 0; i < blockSize; i++) {
      let leftSum = 0;
      let rightSum = 0;
      
      for (const voice of this._voices) {
        if (voice.isActive) {
          const output = voice.process();
          leftSum += output.left;
          rightSum += output.right;
        }
      }
      
      this._leftBuffer[i] = leftSum;
      this._rightBuffer[i] = rightSum;
    }
    
    // Apply global gain and spread
    const gain = dbToGain(this._params.get("globalGain")?.value ?? 0);
    const spread = this._params.get("globalSpread")?.value ?? 0;
    const transpose = this._params.get("globalTranspose")?.value ?? 0;
    
    // Write output
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;
    
    for (let i = 0; i < blockSize; i++) {
      outputL[i] = this._leftBuffer[i] * gain;
      outputR[i] = this._rightBuffer[i] * gain;
    }
  }
  
  async dispose(): Promise<void> {
    this._stopAll();
  }
  
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  
  loadSample(slotIndex: number, sampleData: Float32Array[], sampleRate: number): void {
    if (slotIndex >= 0 && slotIndex < 8) {
      this._samples[slotIndex] = sampleData;
      this._sampleRates[slotIndex] = sampleRate;
    }
  }
  
  clearSample(slotIndex: number): void {
    if (slotIndex >= 0 && slotIndex < 8) {
      this._samples[slotIndex] = null;
    }
  }
  
  setNoteMapping(slotIndex: number, note: number): void {
    if (slotIndex >= 0 && slotIndex < 8) {
      this._noteMappings[slotIndex] = note;
    }
  }
  
  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------
  
  private _handleMidi(event: MidiEvent): void {
    switch (event.type) {
      case "noteOn": {
        const note = event.data.note;
        const velocity = event.data.velocity;
        
        if (velocity > 0) {
          this._triggerSample(note, velocity);
        }
        break;
      }
      
      case "noteOff":
        // Decay handles note off in drum sampler
        break;
    }
  }
  
  private _triggerSample(note: number, velocity: number): void {
    // Find which slot this note maps to
    let slotIndex = this._noteMappings.indexOf(note);
    if (slotIndex === -1) return; // Note not mapped
    
    const sample = this._samples[slotIndex];
    if (!sample) return; // No sample loaded
    
    // Find free voice
    let voice = this._voices.find(v => !v.isActive);
    if (!voice) {
      // Steal oldest
      voice = this._voices[0];
    }
    
    // Get slot config
    const slotConfig = this._getSlotConfig(slotIndex);
    
    // Calculate pitch based on note difference from root
    const rootNote = this._noteMappings[slotIndex];
    const semitoneDiff = note - rootNote;
    const pitchRatio = Math.pow(2, semitoneDiff / 12);
    
    voice.trigger(sample, this._sampleRates[slotIndex], slotConfig, note, velocity, pitchRatio);
  }
  
  private _getSlotConfig(slotIndex: number): SampleSlot {
    const slotNum = slotIndex + 1;
    const getValue = (id: string) => this._params.get(id)?.value ?? 0;
    
    return {
      sample: this._samples[slotIndex],
      sampleRate: this._sampleRates[slotIndex],
      start: getValue(`slot${slotNum}Start`),
      length: getValue(`slot${slotNum}Length`),
      fade: getValue(`slot${slotNum}Fade`),
      filterFreq: getValue(`slot${slotNum}Filter`),
      saturation: getValue(`slot${slotNum}Saturation`),
      pan: (getValue(`slot${slotNum}Pan`) - 50) / 50,
      volume: getValue(`slot${slotNum}Volume`),
      time: getValue(`slot${slotNum}Time`),
      decay: getValue(`slot${slotNum}Decay`),
      loaded: this._samples[slotIndex] !== null,
    };
  }
  
  private _stopAll(): void {
    for (const voice of this._voices) {
      voice.stop();
    }
  }
  
  private _createStateSnapshot(): ImpulseStateSnapshot {
    const slots: SampleSlot[] = [];
    
    for (let i = 0; i < 8; i++) {
      slots.push(this._getSlotConfig(i));
    }
    
    return {
      slots,
      global: {
        transpose: this._params.get("globalTranspose")?.value ?? 0,
        spread: this._params.get("globalSpread")?.value ?? 0,
        gain: this._params.get("globalGain")?.value ?? 0,
      },
      noteMappings: [...this._noteMappings],
    };
  }
}

// =============================================================================
// Plugin Definition
// =============================================================================

export function createImpulseDefinition(): PluginDefinition {
  return {
    id: "com.daw.impulse",
    name: "Impulse",
    category: "instrument",
    version: "1.0.0",
    vendor: "DAW",
    description: "8-slot drum sampler with per-slot processing",
    parameters: generateImpulseParameters(),
    ui: {
      type: "custom",
      width: 900,
      height: 400,
      resizable: true,
    },
    audioInputs: 0,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 0,
    supportsMpe: false,
    hasSidechain: false,
    factoryPresets: [
      {
        id: "impulse-default",
        name: "Default",
        category: "Init",
        state: createDefaultImpulseState(),
      },
    ],
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const instance = new ImpulseInstance(ctx.maxBlockSize);
      instance.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return instance;
    },
  };
}
