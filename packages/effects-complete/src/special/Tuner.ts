/**
 * Tuner - Pitch detection
 * 
 * Real-time pitch detection with:
 * - Auto/manual reference frequency
 * - Note display with cents deviation
 * - Visual needle/LED display data
 * - YIN or autocorrelation algorithm
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  PluginParameterSpec,
  AudioBuffer,
} from "@daw/plugin-api";
import { createParameterMap } from "@daw/plugin-api";

const ALGORITHMS = ["YIN", "Autocorrelation"] as const;
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "reference", name: "Reference", kind: "float", min: 420, max: 460, defaultValue: 0.5, unit: "Hz" },
  { id: "algorithm", name: "Algorithm", kind: "enum", min: 0, max: 1, defaultValue: 0, labels: [...ALGORITHMS] },
  { id: "sensitivity", name: "Sensitivity", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

interface TunerResult {
  note: string;
  octave: number;
  cents: number;
  frequency: number;
  confidence: number;
}

export class TunerInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Analysis buffer
  private _buffer: Float32Array = new Float32Array(2048);
  private _bufferIndex = 0;
  
  // Detection results
  private _currentResult: TunerResult = {
    note: "-",
    octave: 0,
    cents: 0,
    frequency: 0,
    confidence: 0,
  };
  
  // Display data for UI
  private _displayCents = 0;
  private _displayConfidence = 0;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    const bufferSize = Math.pow(2, Math.ceil(Math.log2(this._sampleRate / 20)));
    this._buffer = new Float32Array(bufferSize);
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
  }

  getParam(id: string): number {
    return this._params.get(id)?.normalizedValue ?? 0;
  }

  async saveState(): Promise<unknown> {
    return this._params.getNormalizedValues();
  }

  async loadState(state: unknown): Promise<void> {
    if (state && typeof state === "object") {
      this._params.setNormalizedValues(state as Record<string, number>);
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    this._buffer.fill(0);
    this._bufferIndex = 0;
    this._currentResult = {
      note: "-",
      octave: 0,
      cents: 0,
      frequency: 0,
      confidence: 0,
    };
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const algorithm = ALGORITHMS[Math.round(this._params.get("algorithm")?.value ?? 0)];
    const sensitivity = (this._params.get("sensitivity")?.value ?? 50) / 100;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    // Pass-through
    for (let i = 0; i < blockSize; i++) {
      outputL[i] = inputL[i];
      outputR[i] = inputR[i];
      
      if (bypass) continue;

      // Average channels
      const sample = (inputL[i] + inputR[i]) * 0.5;
      
      // Accumulate in buffer
      this._buffer[this._bufferIndex] = sample;
      this._bufferIndex++;
      
      // Process when buffer is full
      if (this._bufferIndex >= this._buffer.length / 2) {
        this._bufferIndex = 0;
        
        // Detect pitch
        if (algorithm === "YIN") {
          this._detectYIN(sensitivity);
        } else {
          this._detectAutocorrelation(sensitivity);
        }
        
        // Smooth display values
        this._displayCents = this._displayCents * 0.8 + this._currentResult.cents * 0.2;
        this._displayConfidence = this._displayConfidence * 0.9 + this._currentResult.confidence * 0.1;
      }
    }
  }

  private _detectYIN(threshold: number): void {
    const N = this._buffer.length / 2;
    const yin = new Float32Array(N);
    
    // Difference function
    for (let tau = 1; tau < N; tau++) {
      let sum = 0;
      for (let j = 0; j < N; j++) {
        const delta = this._buffer[j] - this._buffer[j + tau];
        sum += delta * delta;
      }
      yin[tau] = sum;
    }
    
    // Cumulative mean normalized difference
    yin[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < N; tau++) {
      runningSum += yin[tau];
      yin[tau] = yin[tau] * tau / runningSum;
    }
    
    // Find minimum below threshold
    let minTau = 0;
    let minVal = Infinity;
    const adjustedThreshold = 0.1 + threshold * 0.4; // 0.1 to 0.5
    
    for (let tau = 2; tau < N; tau++) {
      if (yin[tau] < adjustedThreshold) {
        // Parabolic interpolation for better precision
        if (tau > 1 && tau < N - 1) {
          const a = yin[tau - 1];
          const b = yin[tau];
          const c = yin[tau + 1];
          const p = 0.5 * (a - c) / (a - 2 * b + c);
          minTau = tau + p;
        } else {
          minTau = tau;
        }
        minVal = yin[tau];
        break;
      }
    }
    
    if (minTau > 0 && minTau < N) {
      const freq = this._sampleRate / minTau;
      this._updateResult(freq, 1 - minVal);
    } else {
      this._currentResult.confidence = 0;
    }
  }

  private _detectAutocorrelation(threshold: number): void {
    const N = this._buffer.length / 2;
    let bestCorrelation = 0;
    let bestLag = 0;
    
    // Find autocorrelation peak
    for (let lag = 20; lag < N / 2; lag++) {
      let correlation = 0;
      let sumSq = 0;
      
      for (let i = 0; i < N; i++) {
        correlation += this._buffer[i] * this._buffer[i + lag];
        sumSq += this._buffer[i] * this._buffer[i];
      }
      
      const normalizedCorr = correlation / (sumSq + 0.0001);
      
      if (normalizedCorr > bestCorrelation) {
        bestCorrelation = normalizedCorr;
        bestLag = lag;
      }
    }
    
    if (bestLag > 0 && bestCorrelation > 0.5 + threshold * 0.3) {
      const freq = this._sampleRate / bestLag;
      this._updateResult(freq, bestCorrelation);
    } else {
      this._currentResult.confidence = 0;
    }
  }

  private _updateResult(frequency: number, confidence: number): void {
    const reference = this._params.get("reference")?.value ?? 440;
    
    // Calculate note number
    const noteNum = 69 + 12 * Math.log2(frequency / reference);
    const noteIndex = Math.round(noteNum) % 12;
    const octave = Math.floor(Math.round(noteNum) / 12) - 1;
    
    this._currentResult = {
      note: NOTE_NAMES[noteIndex] ?? "C",
      octave: Math.max(-1, Math.min(9, octave)),
      cents: (noteNum - Math.round(noteNum)) * 100,
      frequency,
      confidence: Math.max(0, Math.min(1, confidence)),
    };
  }

  async dispose(): Promise<void> {}

  // Public API for UI
  getDisplayData(): { note: string; octave: number; cents: number; confidence: number } {
    return {
      note: this._currentResult.note,
      octave: this._currentResult.octave,
      cents: this._displayCents,
      confidence: this._displayConfidence,
    };
  }
}

export function createTunerDefinition(): PluginDefinition {
  return {
    id: "com.daw.tuner",
    name: "Tuner",
    category: "analysis",
    version: "1.0.0",
    vendor: "DAW",
    description: "Real-time pitch detection and tuning display",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const tuner = new TunerInstance();
      tuner.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return tuner;
    },
  };
}
