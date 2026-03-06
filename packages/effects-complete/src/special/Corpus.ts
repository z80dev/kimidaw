/**
 * Corpus - Physical modeling resonator
 * 
 * Resonator effect similar to Collision's resonators:
 * - Multiple resonator types (Beam, Marimba, String, Membrane, Plate, Pipe, Tube)
 * - MIDI pitch tracking
 * - Decay and Listen controls
 * - Material and radius parameters
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  PluginParameterSpec,
  AudioBuffer,
  MidiEvent,
} from "@daw/plugin-api";
import { createParameterMap } from "@daw/plugin-api";
import { midiToFreq, clamp, dbToLinear, lerp } from "../core/DspUtils.js";

const RESONATOR_TYPES = ["Beam", "Marimba", "String", "Membrane", "Plate", "Pipe", "Tube"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "resonatorType", name: "Resonator Type", kind: "enum", min: 0, max: 6, defaultValue: 0, labels: [...RESONATOR_TYPES] },
  { id: "note", name: "Note", kind: "int", min: 0, max: 127, defaultValue: 60 },
  { id: "fine", name: "Fine", kind: "float", min: -50, max: 50, defaultValue: 0.5, unit: "ct" },
  { id: "decay", name: "Decay", kind: "float", min: 0.1, max: 60, defaultValue: 0.3, unit: "s" },
  { id: "material", name: "Material", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "radius", name: "Radius", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "ratio", name: "Ratio", kind: "float", min: 0.25, max: 4, defaultValue: 0.5 },
  { id: "listen", name: "Listen", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "brightness", name: "Brightness", kind: "float", min: -12, max: 12, defaultValue: 0.5, unit: "dB" },
  { id: "inharmonics", name: "Inharmonics", kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "opening", name: "Opening", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "quality", name: "Quality", kind: "enum", min: 0, max: 2, defaultValue: 1, labels: ["Basic", "Medium", "High"] },
  
  { id: "inputGain", name: "Input", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "outputGain", name: "Output", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

interface Mode {
  freq: number;
  amp: number;
  decay: number;
  y1: number;
  y2: number;
}

export class CorpusInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Modal resonators (up to 64 partials depending on quality)
  private _modes: Mode[] = [];
  private _numModes = 32;
  
  // Current frequency
  private _currentFreq = 440;

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._updateModes();
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "resonatorType" || id === "note" || id === "fine" || id === "quality" || 
        id === "inharmonics" || id === "ratio" || id === "opening") {
      this._updateModes();
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
      this._updateModes();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { 
    const decay = this._params.get("decay")?.value ?? 10;
    return Math.round(decay * this._sampleRate * 2);
  }

  reset(): void {
    for (const mode of this._modes) {
      mode.y1 = 0;
      mode.y2 = 0;
    }
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: MidiEvent[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const resonatorType = RESONATOR_TYPES[Math.round(this._params.get("resonatorType")?.value ?? 0)];
    const decay = this._params.get("decay")?.value ?? 5;
    const material = (this._params.get("material")?.value ?? 50) / 100;
    const radius = (this._params.get("radius")?.value ?? 50) / 100;
    const brightness = dbToLinear(this._params.get("brightness")?.value ?? 0);
    const listen = this._params.get("listen")?.value >= 0.5;
    const inputGain = dbToLinear(this._params.get("inputGain")?.value ?? 0);
    const outputGain = dbToLinear(this._params.get("outputGain")?.value ?? 0);
    const dryWet = (this._params.get("dryWet")?.value ?? 50) / 100;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();

    // Process MIDI
    for (const event of midi) {
      if (event.type === "noteOn") {
        const note = event.data.note;
        this._params.get("note")?.setValue(note);
        this._updateModes();
      }
    }

    // Calculate global decay coefficient
    const decayCoeff = Math.exp(-1 / (decay * this._sampleRate));

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i] * inputGain;
      let dryR = inputR[i] * inputGain;

      if (bypass) {
        outputL[i] = dryL * outputGain;
        outputR[i] = dryR * outputGain;
        continue;
      }

      let wetL = 0;
      let wetR = 0;

      // Process through all modal filters
      for (const mode of this._modes) {
        // Adjust decay per mode (higher frequencies decay faster)
        const freqRatio = mode.freq / this._currentFreq;
        const modeDecay = decayCoeff * Math.pow(0.99, freqRatio - 1);
        
        // Modal filter (2-pole resonant)
        const w = 2 * Math.PI * mode.freq / this._sampleRate;
        const cosw = Math.cos(w);
        const bandwidth = 1 - modeDecay;
        const r = 1 - bandwidth * (0.5 + radius * 0.5);
        
        // Excitation signal
        const excite = (dryL + dryR) * 0.5 * mode.amp * brightness;
        
        // Filter
        const y = 2 * r * cosw * mode.y1 - r * r * mode.y2 + excite;
        mode.y2 = mode.y1;
        mode.y1 = y;
        
        // Accumulate output
        const out = y * (1 - material * (freqRatio - 1) * 0.1);
        wetL += out * mode.amp;
        wetR += out * mode.amp;
      }

      // Listen mode: hear resonator without input excitation
      if (listen) {
        // Just output the resonator ring
        outputL[i] = wetL * outputGain;
        outputR[i] = wetR * outputGain;
      } else {
        // Normal mode: mix dry/wet
        outputL[i] = (dryL * (1 - dryWet) + wetL * dryWet) * outputGain;
        outputR[i] = (dryR * (1 - dryWet) + wetR * dryWet) * outputGain;
      }
    }
  }

  private _updateModes(): void {
    const resonatorType = RESONATOR_TYPES[Math.round(this._params.get("resonatorType")?.value ?? 0)];
    const quality = [16, 32, 64][Math.round(this._params.get("quality")?.value ?? 1)];
    const note = this._params.get("note")?.value ?? 60;
    const fine = (this._params.get("fine")?.value ?? 0) / 100;
    const inharmonics = (this._params.get("inharmonics")?.value ?? 0) / 100;
    const ratio = this._params.get("ratio")?.value ?? 1;
    const opening = (this._params.get("opening")?.value ?? 100) / 100;
    
    this._numModes = quality;
    this._currentFreq = midiToFreq(note) * Math.pow(2, fine / 1200) * ratio;
    
    // Generate mode frequencies and amplitudes based on resonator type
    this._modes = [];
    
    for (let i = 0; i < this._numModes; i++) {
      const n = i + 1;
      let freqRatio: number;
      let amp: number;
      
      switch (resonatorType) {
        case "Beam":
          // Beam: frequencies ~ (n + 0.5)^2
          freqRatio = Math.pow(n + 0.5, 2) / Math.pow(1.5, 2);
          amp = 1 / n;
          break;
          
        case "Marimba":
          // Marimba: harmonic with characteristic cutoff
          freqRatio = n * (1 + inharmonics * 0.1 * (n - 1));
          amp = n === 1 ? 1 : (n < 4 ? 0.5 / n : 0.1 / n);
          break;
          
        case "String":
          // String: nearly harmonic with slight inharmonicity
          freqRatio = n * Math.sqrt(1 + inharmonics * 0.01 * n * n);
          amp = 1 / n;
          break;
          
        case "Membrane":
          // Drum membrane: Bessel function zeros
          freqRatio = this._besselZero(n) / this._besselZero(1);
          amp = 1 / (n * n);
          break;
          
        case "Plate":
          // Plate: mode density increases with frequency
          freqRatio = Math.pow(n, 1.2);
          amp = 1 / Math.pow(n, 0.8);
          break;
          
        case "Pipe":
          // Open/closed pipe
          freqRatio = n * (1 + inharmonics * 0.05);
          // Closed pipe: only odd harmonics
          if (opening < 0.5 && n % 2 === 0) {
            amp = 0;
          } else {
            amp = 1 / n;
          }
          break;
          
        case "Tube":
          // Tube: similar to pipe but different harmonic content
          freqRatio = n * (1 + inharmonics * 0.1 * Math.log2(n + 1));
          amp = Math.pow(opening, n - 1) / n;
          break;
          
        default:
          freqRatio = n;
          amp = 1 / n;
      }
      
      this._modes.push({
        freq: this._currentFreq * freqRatio,
        amp: amp * (1 + inharmonics * 0.1 * Math.random()),
        decay: 1,
        y1: 0,
        y2: 0,
      });
    }
  }

  private _besselZero(n: number): number {
    // Approximation of Bessel function zeros for drum modes
    // j0,n ≈ π(n - 0.25) for large n
    const zeros = [2.4048, 5.5201, 8.6537, 11.7915, 14.9309, 18.0711, 21.2116, 24.3525];
    if (n <= zeros.length) {
      return zeros[n - 1];
    }
    return Math.PI * (n - 0.25);
  }

  async dispose(): Promise<void> {}
}

export function createCorpusDefinition(): PluginDefinition {
  return {
    id: "com.daw.corpus",
    name: "Corpus",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Physical modeling resonator effect",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const corpus = new CorpusInstance();
      corpus.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return corpus;
    },
  };
}
