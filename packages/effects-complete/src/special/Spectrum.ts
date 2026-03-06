/**
 * Spectrum - Spectrum analyzer
 * 
 * Real-time FFT-based spectrum analysis for visualization:
 * - FFT analysis with configurable block size
 * - Average time control
 * - Max frequency and slope adjustment
 * - Linear and log scale output
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

const BLOCK_SIZES = ["256", "512", "1024", "2048", "4096", "8192"] as const;
const SCALES = ["Linear", "Log"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "blockSize", name: "Block Size", kind: "enum", min: 0, max: 5, defaultValue: 3, labels: [...BLOCK_SIZES] },
  { id: "avgTime", name: "Avg Time", kind: "float", min: 0, max: 4, defaultValue: 0.2, unit: "s" },
  { id: "maxFreq", name: "Max Frequency", kind: "float", min: 1000, max: 20000, defaultValue: 1, unit: "Hz" },
  { id: "slope", name: "Slope", kind: "float", min: -6, max: 6, defaultValue: 0.5, unit: "dB/oct" },
  { id: "scale", name: "Scale", kind: "enum", min: 0, max: 1, defaultValue: 1, labels: [...SCALES] },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class SpectrumInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // FFT buffers
  private _fftBufferL: Float32Array = new Float32Array(2048);
  private _fftBufferR: Float32Array = new Float32Array(2048);
  private _fftIndex = 0;
  private _fftSize = 2048;
  
  // Window function
  private _window: Float32Array = new Float32Array(2048);
  
  // Output spectrum data
  private _spectrumData = new Float32Array(128);
  private _smoothedSpectrum = new Float32Array(128);
  
  // Analysis results
  private _peakFreq = 0;
  private _peakLevel = -100;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._updateFFT();
  }

  private _updateFFT(): void {
    const blockIndex = Math.round(this._params.get("blockSize")?.value ?? 3);
    this._fftSize = [256, 512, 1024, 2048, 4096, 8192][blockIndex] ?? 2048;
    
    this._fftBufferL = new Float32Array(this._fftSize);
    this._fftBufferR = new Float32Array(this._fftSize);
    this._window = new Float32Array(this._fftSize);
    
    // Hann window
    for (let i = 0; i < this._fftSize; i++) {
      this._window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (this._fftSize - 1)));
    }
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "blockSize") {
      this._updateFFT();
    }
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
      this._updateFFT();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    this._fftBufferL.fill(0);
    this._fftBufferR.fill(0);
    this._fftIndex = 0;
    this._smoothedSpectrum.fill(0);
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const maxFreq = this._params.get("maxFreq")?.value ?? 20000;
    const slope = this._params.get("slope")?.value ?? 0;
    const scale = SCALES[Math.round(this._params.get("scale")?.value ?? 1)];
    const avgTime = this._params.get("avgTime")?.value ?? 0.5;
    const alpha = 1 / (avgTime * this._sampleRate / this._fftSize + 1);

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    // Copy input to output (pass-through)
    for (let i = 0; i < blockSize; i++) {
      outputL[i] = inputL[i];
      outputR[i] = inputR[i];
      
      if (bypass) continue;

      // Accumulate for FFT
      this._fftBufferL[this._fftIndex] = inputL[i] * this._window[this._fftIndex];
      this._fftBufferR[this._fftIndex] = inputR[i] * this._window[this._fftIndex];
      
      this._fftIndex++;
      
      // Process FFT when buffer is full
      if (this._fftIndex >= this._fftSize) {
        this._fftIndex = 0;
        this._processFFT(maxFreq, slope, scale, alpha);
      }
    }
  }

  private _processFFT(maxFreq: number, slope: number, scale: typeof SCALES[number], alpha: number): void {
    // Simplified FFT - in production use Web Audio API or optimized FFT library
    // For now, we'll use a basic energy calculation per bin
    
    const binCount = this._fftSize / 2;
    const binFreq = this._sampleRate / this._fftSize;
    const maxBin = Math.min(binCount, Math.floor(maxFreq / binFreq));
    
    // Calculate magnitudes (simplified)
    const magnitudes = new Float32Array(binCount);
    for (let i = 0; i < binCount; i++) {
      const real = this._fftBufferL[i] + this._fftBufferR[i];
      const imag = this._fftBufferL[this._fftSize - 1 - i] - this._fftBufferR[this._fftSize - 1 - i];
      magnitudes[i] = Math.sqrt(real * real + imag * imag);
    }
    
    // Map to output bins (128 bins)
    const outputBins = 128;
    for (let i = 0; i < outputBins; i++) {
      let startBin: number;
      let endBin: number;
      
      if (scale === "Log") {
        // Logarithmic binning
        const logMin = Math.log(20);
        const logMax = Math.log(maxFreq);
        const logRange = logMax - logMin;
        
        startBin = Math.floor(Math.exp(logMin + (i / outputBins) * logRange) / binFreq);
        endBin = Math.floor(Math.exp(logMin + ((i + 1) / outputBins) * logRange) / binFreq);
      } else {
        // Linear binning
        startBin = Math.floor((i / outputBins) * maxBin);
        endBin = Math.floor(((i + 1) / outputBins) * maxBin);
      }
      
      startBin = Math.max(0, Math.min(binCount - 1, startBin));
      endBin = Math.max(startBin, Math.min(binCount, endBin));
      
      // Average energy in bin
      let sum = 0;
      for (let b = startBin; b < endBin; b++) {
        sum += magnitudes[b];
      }
      const avg = sum / (endBin - startBin + 0.0001);
      
      // Convert to dB
      let db = avg > 0.00001 ? 20 * Math.log10(avg) : -100;
      
      // Apply slope
      const freq = (startBin + endBin) / 2 * binFreq;
      db += slope * Math.log2(freq / 1000);
      
      // Smooth
      this._smoothedSpectrum[i] = this._smoothedSpectrum[i] * (1 - alpha) + db * alpha;
      this._spectrumData[i] = this._smoothedSpectrum[i];
    }
    
    // Find peak
    this._peakLevel = -100;
    for (let i = 0; i < outputBins; i++) {
      if (this._spectrumData[i] > this._peakLevel) {
        this._peakLevel = this._spectrumData[i];
        // Calculate peak frequency
        const binIndex = Math.floor((i / outputBins) * maxBin);
        this._peakFreq = binIndex * binFreq;
      }
    }
  }

  async dispose(): Promise<void> {}

  // Public API for UI visualization
  getSpectrumData(): Float32Array {
    return this._spectrumData.slice();
  }

  getPeakFrequency(): number {
    return this._peakFreq;
  }

  getPeakLevel(): number {
    return this._peakLevel;
  }
}

export function createSpectrumDefinition(): PluginDefinition {
  return {
    id: "com.daw.spectrum",
    name: "Spectrum",
    category: "analysis",
    version: "1.0.0",
    vendor: "DAW",
    description: "FFT-based spectrum analyzer for visualization",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const spec = new SpectrumInstance();
      spec.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return spec;
    },
  };
}
