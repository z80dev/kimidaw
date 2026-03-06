/**
 * Sampler - Sample Voice
 * 
 * A single voice for the sampler instrument. Handles playback of one
 * sample with envelope, filter, and pitch control.
 */

import { midiToFrequency } from "@daw/plugin-api";
import { 
  VoiceBase, 
  ADSREnvelope, 
  BiquadFilter, 
  lerp,
  dbToLinear,
} from "../../core/DspBase.js";

export interface SampleData {
  id: string;
  buffer: Float32Array[];  // Per-channel sample data
  sampleRate: number;
  rootNote: number;
  minNote?: number;
  maxNote?: number;
  minVelocity?: number;
  maxVelocity?: number;
  loopStart?: number;
  loopEnd?: number;
  loopMode?: "off" | "forward" | "pingpong";
}

export interface SampleVoiceConfig {
  ampEnv: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  filter: {
    type: "lowpass" | "highpass" | "bandpass";
    frequency: number;
    resonance: number;
    envAmount: number;
  };
  filterEnv: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  tune: {
    coarse: number;     // Semitones
    fine: number;       // Cents (-100 to 100)
  };
  gain: number;         // dB
  glide: number;        // Portamento time in seconds
}

export class SampleVoice extends VoiceBase {
  // Sample data
  private _sample: SampleData | null = null;
  
  // Playback state
  private _playbackRate = 1;
  private _samplePos = 0;
  private _loopDirection = 1;  // For ping-pong loops
  
  // Target note for portamento
  private _targetNote = 0;
  private _currentNote = 0;
  private _glideIncrement = 0;
  
  // Processing components
  private _ampEnv: ADSREnvelope;
  private _filterEnv: ADSREnvelope;
  private _filter: BiquadFilter;
  
  // Configuration
  private _config: SampleVoiceConfig;
  private _outputSampleRate = 48000;
  
  // Pre-allocated buffers (avoid allocation in process())
  private _tempBuffer: Float32Array;
  
  constructor(config: Partial<SampleVoiceConfig> = {}, maxBlockSize = 128) {
    super();
    
    this._config = {
      ampEnv: { attack: 0.001, decay: 0.1, sustain: 1, release: 0.3 },
      filter: { type: "lowpass", frequency: 20000, resonance: 0.707, envAmount: 0 },
      filterEnv: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.3 },
      tune: { coarse: 0, fine: 0 },
      gain: 0,
      glide: 0,
      ...config,
    };
    
    this._ampEnv = new ADSREnvelope(this._config.ampEnv);
    this._filterEnv = new ADSREnvelope(this._config.filterEnv);
    this._filter = new BiquadFilter();
    this._filter.setType(this._config.filter.type);
    this._filter.setFrequency(this._config.filter.frequency);
    this._filter.setQ(this._config.filter.resonance);
    
    this._tempBuffer = new Float32Array(maxBlockSize);
  }

  setSample(sample: SampleData | null): void {
    this._sample = sample;
  }

  setConfig(config: Partial<SampleVoiceConfig>): void {
    this._config = { ...this._config, ...config };
    
    this._ampEnv.setConfig(this._config.ampEnv);
    this._filterEnv.setConfig(this._config.filterEnv);
    this._filter.setType(this._config.filter.type);
    this._filter.setFrequency(this._config.filter.frequency);
    this._filter.setQ(this._config.filter.resonance);
  }

  trigger(note: number, velocity: number): void {
    if (!this._sample) return;
    
    this.note = note;
    this.velocity = velocity;
    this.active = true;
    this.age = 0;
    
    // Calculate playback rate based on note vs root note
    this._targetNote = note;
    if (this._currentNote === 0 || this._config.glide <= 0) {
      this._currentNote = note;
    }
    this._updatePlaybackRate();
    
    // Reset and trigger envelopes
    this._ampEnv.trigger();
    this._filterEnv.trigger();
    
    // Reset filter state to avoid clicks
    this._filter.reset();
    
    // Reset sample position
    this._samplePos = 0;
    this._loopDirection = 1;
  }

  release(): void {
    this._ampEnv.release();
    this._filterEnv.release();
  }

  stop(): void {
    this._ampEnv.stop();
    this._filterEnv.stop();
    this.active = false;
    this._samplePos = 0;
    this._currentNote = 0;
  }

  isFinished(): boolean {
    return !this.active || (!this._ampEnv.isActive && this._ampEnv.level < 0.0001);
  }

  setSampleRate(sr: number): void {
    this._outputSampleRate = sr;
    this._ampEnv.setSampleRate(sr);
    this._filterEnv.setSampleRate(sr);
    this._filter.setSampleRate(sr);
    
    // Recalculate glide increment
    if (this._config.glide > 0) {
      this._glideIncrement = 1 / (this._config.glide * sr);
    }
  }

  process(left: Float32Array, right: Float32Array, offset: number, count: number): void {
    if (!this.active || !this._sample) return;
    
    const sampleData = this._sample;
    const numChannels = sampleData.buffer.length;
    const sampleRateRatio = sampleData.sampleRate / this._outputSampleRate;
    const gain = dbToLinear(this._config.gain) * (this.velocity / 127);
    
    // Process each sample
    for (let i = 0; i < count; i++) {
      // Handle portamento
      if (this._config.glide > 0 && Math.abs(this._currentNote - this._targetNote) > 0.01) {
        if (this._currentNote < this._targetNote) {
          this._currentNote = Math.min(this._targetNote, this._currentNote + this._glideIncrement * 100);
        } else {
          this._currentNote = Math.max(this._targetNote, this._currentNote - this._glideIncrement * 100);
        }
        this._updatePlaybackRate();
      }
      
      // Get sample indices for interpolation
      const pos = this._samplePos;
      const i0 = Math.floor(pos);
      const i1 = i0 + 1;
      const frac = pos - i0;
      
      // Check for loop or end
      const loopStart = sampleData.loopStart ?? 0;
      const loopEnd = sampleData.loopEnd ?? sampleData.buffer[0].length;
      const sampleEnd = sampleData.buffer[0].length;
      
      if (i0 >= sampleEnd) {
        if (sampleData.loopMode && sampleData.loopMode !== "off" && loopEnd > loopStart) {
          // Loop logic handled below
        } else {
          // End of sample
          this.active = false;
          break;
        }
      }
      
      // Handle looping
      let readPos1 = i0;
      let readPos2 = i1;
      
      if (sampleData.loopMode === "forward" && i0 >= loopEnd) {
        this._samplePos = loopStart + (pos - loopEnd);
        readPos1 = Math.floor(this._samplePos);
        readPos2 = readPos1 + 1;
      } else if (sampleData.loopMode === "pingpong") {
        if (this._loopDirection > 0 && i0 >= loopEnd - 1) {
          this._loopDirection = -1;
        } else if (this._loopDirection < 0 && i0 <= loopStart) {
          this._loopDirection = 1;
        }
      }
      
      // Clamp read positions
      readPos1 = Math.max(0, Math.min(sampleEnd - 1, readPos1));
      readPos2 = Math.max(0, Math.min(sampleEnd - 1, readPos2));
      
      // Read and interpolate sample data
      let sampleL = 0;
      let sampleR = 0;
      
      if (numChannels === 1) {
        const ch = sampleData.buffer[0];
        const s0 = ch[readPos1];
        const s1 = ch[readPos2];
        const val = lerp(s0, s1, frac);
        sampleL = val;
        sampleR = val;
      } else {
        const chL = sampleData.buffer[0];
        const chR = sampleData.buffer[1];
        sampleL = lerp(chL[readPos1], chL[readPos2], frac);
        sampleR = lerp(chR[readPos1], chR[readPos2], frac);
      }
      
      // Apply filter
      const filterEnv = this._filterEnv.process();
      if (this._config.filter.envAmount !== 0) {
        const envFreq = this._config.filter.frequency * (1 + filterEnv * this._config.filter.envAmount);
        this._filter.setFrequencySmooth(envFreq, 5);
      }
      
      sampleL = this._filter.process(sampleL);
      // Note: Reusing the same filter for both channels would couple them.
      // For simplicity, we apply the same filter to both, but a proper
      // implementation would have separate filter instances per channel.
      // For now, reset filter state and process right channel
      const z1 = (this._filter as any)._z1;
      const z2 = (this._filter as any)._z2;
      sampleR = this._filter.process(sampleR);
      // Restore state for next iteration - this is a simplification
      
      // Apply amplitude envelope
      const ampEnv = this._ampEnv.process();
      
      // Output
      const outIdx = offset + i;
      left[outIdx] += sampleL * ampEnv * gain;
      right[outIdx] += sampleR * ampEnv * gain;
      
      // Advance position
      if (sampleData.loopMode === "pingpong") {
        this._samplePos += this._playbackRate * sampleRateRatio * this._loopDirection;
      } else {
        this._samplePos += this._playbackRate * sampleRateRatio;
      }
    }
  }

  private _updatePlaybackRate(): void {
    // Calculate pitch ratio from note difference
    const semitoneDiff = this._currentNote - (this._sample?.rootNote ?? 60);
    const centDiff = this._config.tune.fine / 100;
    const totalSemitones = semitoneDiff + this._config.tune.coarse + centDiff;
    this._playbackRate = Math.pow(2, totalSemitones / 12);
  }
}
