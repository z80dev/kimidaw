/**
 * Drum Rack - Drum Pad
 * 
 * A single pad in the drum rack. Can hold a sample with its own
 * processing chain (gain, pan, filter, envelope).
 */

import type { SampleData } from "../sampler/SampleVoice.js";
import { ADSREnvelope, BiquadFilter, dbToLinear, lerp } from "../../core/DspBase.js";

export interface DrumPadLayer {
  sample: SampleData;
  gainDb: number;
  pan: number;
  tuneCents: number;
  startOffset: number;
  endOffset: number;
}

export interface DrumPadConfig {
  gainDb: number;
  pan: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterType: "off" | "lowpass" | "highpass" | "bandpass";
  filterFreq: number;
  filterRes: number;
  chokeGroup: number | null;
}

export class DrumPad {
  // Configuration
  private _config: DrumPadConfig;
  private _note: number;
  
  // Sample layers (for velocity layers or round-robin)
  private _layers: DrumPadLayer[] = [];
  private _roundRobinIndex = 0;
  
  // Playback state
  private _active = false;
  private _velocity = 0;
  private _samplePos = 0;
  private _currentLayer = 0;
  
  // Processing
  private _ampEnv: ADSREnvelope;
  private _filter: BiquadFilter | null = null;
  
  // Sample rate
  private _sampleRate = 48000;

  constructor(note: number, config: Partial<DrumPadConfig> = {}) {
    this._note = note;
    this._config = {
      gainDb: 0,
      pan: 0,
      attack: 0.001,
      decay: 0,
      sustain: 1,
      release: 0.2,
      filterType: "off",
      filterFreq: 20000,
      filterRes: 0.707,
      chokeGroup: null,
      ...config,
    };
    
    this._ampEnv = new ADSREnvelope({
      attack: this._config.attack,
      decay: this._config.decay,
      sustain: this._config.sustain,
      release: this._config.release,
    });
    
    this._updateFilter();
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get note(): number {
    return this._note;
  }

  set note(value: number) {
    this._note = value;
  }

  get active(): boolean {
    return this._active;
  }

  get chokeGroup(): number | null {
    return this._config.chokeGroup;
  }

  get config(): Readonly<DrumPadConfig> {
    return this._config;
  }

  get layers(): readonly DrumPadLayer[] {
    return this._layers;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  setConfig(config: Partial<DrumPadConfig>): void {
    this._config = { ...this._config, ...config };
    
    this._ampEnv.setConfig({
      attack: this._config.attack,
      decay: this._config.decay,
      sustain: this._config.sustain,
      release: this._config.release,
    });
    
    this._updateFilter();
  }

  addLayer(layer: DrumPadLayer): void {
    this._layers.push(layer);
  }

  removeLayer(index: number): void {
    if (index >= 0 && index < this._layers.length) {
      this._layers.splice(index, 1);
    }
  }

  clearLayers(): void {
    this._layers = [];
  }

  // ---------------------------------------------------------------------------
  // Triggering
  // ---------------------------------------------------------------------------

  trigger(velocity: number): void {
    if (this._layers.length === 0) return;
    
    // Select layer based on velocity
    this._currentLayer = this._selectLayer(velocity);
    
    this._active = true;
    this._velocity = velocity;
    this._samplePos = this._layers[this._currentLayer]?.startOffset ?? 0;
    
    // Advance round-robin
    this._roundRobinIndex = (this._roundRobinIndex + 1) % this._layers.length;
    
    // Reset and trigger envelope
    this._ampEnv.trigger();
    
    // Reset filter
    if (this._filter) {
      this._filter.reset();
    }
  }

  release(): void {
    if (this._active) {
      this._ampEnv.release();
    }
  }

  stop(): void {
    this._active = false;
    this._ampEnv.stop();
    this._samplePos = 0;
  }

  choke(): void {
    // Fast release for choke
    if (this._active) {
      this._ampEnv.setConfig({ ...this._ampEnv as any, release: 0.05 });
      this._ampEnv.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Processing
  // ---------------------------------------------------------------------------

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
    this._ampEnv.setSampleRate(sr);
    if (this._filter) {
      this._filter.setSampleRate(sr);
    }
  }

  process(left: Float32Array, right: Float32Array, offset: number, count: number): void {
    if (!this._active) return;
    
    const layer = this._layers[this._currentLayer];
    if (!layer) return;
    
    const sample = layer.sample;
    const numChannels = sample.buffer.length;
    const sampleRateRatio = sample.sampleRate / this._sampleRate;
    
    // Calculate pitch ratio from tuning
    const tuneRatio = Math.pow(2, (layer.tuneCents + this._config.gainDb) / 1200);
    const playbackRate = tuneRatio * sampleRateRatio;
    
    // Calculate gains
    const velocityGain = this._velocity / 127;
    const layerGain = dbToLinear(layer.gainDb);
    const padGain = dbToLinear(this._config.gainDb);
    const totalGain = velocityGain * layerGain * padGain;
    
    // Calculate pan
    const pan = (this._config.pan + layer.pan) / 100; // -1 to 1
    const leftPan = Math.cos((pan + 1) * Math.PI / 4);
    const rightPan = Math.sin((pan + 1) * Math.PI / 4);
    
    const endPos = sample.buffer[0].length - (layer.endOffset ?? 0);
    
    for (let i = 0; i < count; i++) {
      // Check if sample playback has ended
      if (this._samplePos >= endPos) {
        this._active = false;
        break;
      }
      
      // Get sample indices for interpolation
      const pos = this._samplePos;
      const i0 = Math.floor(pos);
      const i1 = i0 + 1;
      const frac = pos - i0;
      
      // Clamp indices
      const len = sample.buffer[0].length;
      const idx0 = Math.min(i0, len - 1);
      const idx1 = Math.min(i1, len - 1);
      
      // Read sample
      let sampleL = 0;
      let sampleR = 0;
      
      if (numChannels === 1) {
        const ch = sample.buffer[0];
        const val = lerp(ch[idx0], ch[idx1], frac);
        sampleL = val;
        sampleR = val;
      } else {
        sampleL = lerp(sample.buffer[0][idx0], sample.buffer[0][idx1], frac);
        sampleR = lerp(sample.buffer[1][idx0], sample.buffer[1][idx1], frac);
      }
      
      // Apply filter
      if (this._filter) {
        sampleL = this._filter.process(sampleL);
        // Would need separate filter for R channel in production
        sampleR = sampleR; 
      }
      
      // Apply envelope
      const env = this._ampEnv.process();
      
      // Output
      const idx = offset + i;
      left[idx] += sampleL * env * totalGain * leftPan;
      right[idx] += sampleR * env * totalGain * rightPan;
      
      // Advance position
      this._samplePos += playbackRate;
      
      // Check if envelope has finished
      if (!this._ampEnv.isActive && env < 0.0001) {
        this._active = false;
        break;
      }
    }
  }

  isFinished(): boolean {
    return !this._active;
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private _updateFilter(): void {
    if (this._config.filterType === "off") {
      this._filter = null;
    } else {
      this._filter = new BiquadFilter(this._sampleRate);
      this._filter.setType(this._config.filterType);
      this._filter.setFrequency(this._config.filterFreq);
      this._filter.setQ(this._config.filterRes);
    }
  }

  private _selectLayer(velocity: number): number {
    if (this._layers.length === 1) {
      return 0;
    }
    
    // For now, simple velocity layer selection
    // Could also do round-robin here
    const velNorm = velocity / 127;
    const layerIdx = Math.floor(velNorm * this._layers.length);
    return Math.min(layerIdx, this._layers.length - 1);
  }
}
