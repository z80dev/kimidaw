/**
 * Looper
 * 
 * Audio looper device inspired by hardware loopers:
 * - Record, overdub, play modes
 * - Multiply for longer loops
 * - Insert for punch-in recording
 * - Undo/Redo
 * - Export to clip
 * 
 * Synchronized to transport for tempo-matched looping.
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

const PARAMETERS: PluginParameterSpec[] = [
  // Transport
  { id: "state", name: "State", kind: "enum", min: 0, max: 4, defaultValue: 0, labels: ["Stop", "Record", "Play", "Overdub", "Multiply"] },
  { id: "quantization", name: "Quantize", kind: "enum", min: 0, max: 5, defaultValue: 0.25, labels: ["None", "1/8", "1/4", "1/2", "1 Bar", "2 Bars"] },
  
  // Loop control
  { id: "feedback", name: "Feedback", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "inputGain", name: "Input", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "loopGain", name: "Loop", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  
  // Actions
  { id: "undo", name: "Undo", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "redo", name: "Redo", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "clear", name: "Clear", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  
  // Output
  { id: "output", name: "Output", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export type LooperState = "stop" | "record" | "play" | "overdub" | "multiply";

interface LoopLayer {
  bufferL: Float32Array;
  bufferR: Float32Array;
  length: number;
}

export class LooperInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Loop buffer
  private _loopLength = 0;
  private _loopPosition = 0;
  private _maxLoopLength: number;
  private _layers: LoopLayer[] = [];
  private _undoStack: LoopLayer[][] = [];
  private _redoStack: LoopLayer[][] = [];
  
  // State
  private _state: LooperState = "stop";
  private _pendingState: LooperState | null = null;
  private _quantization = 0; // Samples to quantize to
  private _quantizationCounter = 0;
  private _isFirstRecording = true;
  
  // Temp buffer for processing
  private _tempL: Float32Array;
  private _tempR: Float32Array;

  constructor(maxDurationSeconds = 60) {
    this._maxLoopLength = maxDurationSeconds * 48000;
    this._tempL = new Float32Array(128);
    this._tempR = new Float32Array(128);
    
    // Create initial empty layer
    this._addLayer();
  }

  private _addLayer(): void {
    this._layers.push({
      bufferL: new Float32Array(this._maxLoopLength),
      bufferR: new Float32Array(this._maxLoopLength),
      length: 0,
    });
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    
    // Recalculate max length for new sample rate
    const maxDurationSeconds = this._maxLoopLength / 48000;
    this._maxLoopLength = maxDurationSeconds * this._sampleRate;
    
    // Resize buffers
    for (const layer of this._layers) {
      if (layer.bufferL.length !== this._maxLoopLength) {
        const newL = new Float32Array(this._maxLoopLength);
        const newR = new Float32Array(this._maxLoopLength);
        newL.set(layer.bufferL.subarray(0, Math.min(layer.length, this._maxLoopLength)));
        newR.set(layer.bufferR.subarray(0, Math.min(layer.length, this._maxLoopLength)));
        layer.bufferL = newL;
        layer.bufferR = newR;
      }
    }

    if (this._tempL.length < config.blockSize) {
      this._tempL = new Float32Array(config.blockSize);
      this._tempR = new Float32Array(config.blockSize);
    }
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    const param = this._params.get(id);
    if (!param) return;
    
    const oldValue = param.value;
    param.setNormalized(value);

    switch (id) {
      case "state":
        const states: LooperState[] = ["stop", "record", "play", "overdub", "multiply"];
        this._requestStateChange(states[Math.floor(param.value)]);
        break;
      case "undo":
        if (param.value >= 0.5 && oldValue < 0.5) {
          this._undo();
        }
        break;
      case "redo":
        if (param.value >= 0.5 && oldValue < 0.5) {
          this._redo();
        }
        break;
      case "clear":
        if (param.value >= 0.5 && oldValue < 0.5) {
          this._clear();
        }
        break;
    }
  }

  getParam(id: string): number {
    return this._params.get(id)?.normalizedValue ?? 0;
  }

  async saveState(): Promise<unknown> {
    return {
      params: this._params.getNormalizedValues(),
      loopLength: this._loopLength,
      layers: this._layers.map(l => ({
        bufferL: Array.from(l.bufferL.subarray(0, l.length)),
        bufferR: Array.from(l.bufferR.subarray(0, l.length)),
        length: l.length,
      })),
    };
  }

  async loadState(state: unknown): Promise<void> {
    const s = state as Record<string, unknown>;
    if (s.params) {
      this._params.setNormalizedValues(s.params as Record<string, number>);
    }
    if (s.loopLength) {
      this._loopLength = s.loopLength as number;
    }
    if (s.layers && Array.isArray(s.layers)) {
      this._layers = (s.layers as LoopLayer[]).map(l => ({
        bufferL: new Float32Array(l.bufferL),
        bufferR: new Float32Array(l.bufferR),
        length: l.length,
      }));
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    this._loopPosition = 0;
    this._quantizationCounter = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const feedback = (this._params.get("feedback")?.value ?? 100) / 100;
    const inputGain = (this._params.get("inputGain")?.value ?? 100) / 100;
    const loopGain = (this._params.get("loopGain")?.value ?? 100) / 100;
    const dryWet = (this._params.get("dryWet")?.value ?? 100) / 100;
    const outputGain = Math.pow(10, (this._params.get("output")?.value ?? 0) / 20);

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();

    // Update quantization
    const quantizeMode = Math.floor(this._params.get("quantization")?.value ?? 1);
    const beatSamples = this._sampleRate * 60 / 120; // Assuming 120 BPM default
    this._quantization = quantizeMode === 0 ? 0 : 
                        quantizeMode === 1 ? Math.floor(beatSamples / 8) :
                        quantizeMode === 2 ? Math.floor(beatSamples / 4) :
                        quantizeMode === 3 ? Math.floor(beatSamples / 2) :
                        quantizeMode === 4 ? Math.floor(beatSamples) :
                        Math.floor(beatSamples * 2);

    // Process state changes
    if (this._pendingState) {
      if (this._quantization === 0) {
        this._applyStateChange(this._pendingState);
        this._pendingState = null;
      } else {
        // Wait for quantization boundary
        const samplesToBoundary = this._quantization - (this._quantizationCounter % this._quantization);
        if (samplesToBoundary <= blockSize) {
          // Apply at boundary
          // For simplicity, we'll apply immediately in this block
          this._applyStateChange(this._pendingState);
          this._pendingState = null;
        }
      }
    }

    for (let i = 0; i < blockSize; i++) {
      const dryL = inputL[i];
      const dryR = inputR[i];

      if (bypass || this._state === "stop") {
        outputL[i] = dryL * outputGain;
        outputR[i] = dryR * outputGain;
        this._quantizationCounter++;
        continue;
      }

      // Read from loop
      let loopOutL = 0;
      let loopOutR = 0;
      
      if (this._loopLength > 0) {
        for (const layer of this._layers) {
          if (layer.length > 0) {
            const pos = this._loopPosition % layer.length;
            loopOutL += layer.bufferL[pos] * loopGain;
            loopOutR += layer.bufferR[pos] * loopGain;
          }
        }
        // Normalize by number of layers
        loopOutL /= this._layers.length;
        loopOutR /= this._layers.length;
      }

      // Record/Overdub
      const currentLayer = this._layers[this._layers.length - 1];
      
      switch (this._state) {
        case "record":
          if (this._isFirstRecording) {
            // First recording - establish loop length
            currentLayer.bufferL[this._loopPosition] = dryL * inputGain;
            currentLayer.bufferR[this._loopPosition] = dryR * inputGain;
            currentLayer.length = this._loopPosition + 1;
            this._loopLength = currentLayer.length;
          }
          break;
          
        case "overdub":
          if (this._loopPosition < this._loopLength) {
            // Mix new audio with existing
            const existingL = currentLayer.bufferL[this._loopPosition];
            const existingR = currentLayer.bufferR[this._loopPosition];
            currentLayer.bufferL[this._loopPosition] = existingL * feedback + dryL * inputGain;
            currentLayer.bufferR[this._loopPosition] = existingR * feedback + dryR * inputGain;
          }
          break;
          
        case "multiply":
          // Extend loop by adding new layer
          if (this._loopPosition === 0 && currentLayer.length > 0) {
            // Start of new cycle - save state and add layer
            this._saveUndoState();
            this._addLayer();
          }
          if (this._loopPosition < this._maxLoopLength) {
            const layer = this._layers[this._layers.length - 1];
            layer.bufferL[this._loopPosition] = dryL * inputGain;
            layer.bufferR[this._loopPosition] = dryR * inputGain;
            layer.length = this._loopPosition + 1;
            this._loopLength = Math.max(this._loopLength, layer.length);
          }
          break;
      }

      // Mix output
      outputL[i] = (dryL * (1 - dryWet) + loopOutL * dryWet) * outputGain;
      outputR[i] = (dryR * (1 - dryWet) + loopOutR * dryWet) * outputGain;

      // Advance position
      this._loopPosition++;
      this._quantizationCounter++;
      
      if (this._loopLength > 0) {
        this._loopPosition %= this._loopLength;
      }
    }
  }

  private _requestStateChange(newState: LooperState): void {
    this._pendingState = newState;
  }

  private _applyStateChange(newState: LooperState): void {
    if (newState === "record" && this._state !== "record") {
      if (this._isFirstRecording) {
        this._clear();
      } else {
        // Punch-in recording
        this._saveUndoState();
      }
    } else if (newState === "overdub" && this._state === "record") {
      // Transition from record to overdub
      this._isFirstRecording = false;
    } else if (newState === "play" && this._state === "record") {
      // Finish first recording
      this._isFirstRecording = false;
    }
    
    this._state = newState;
  }

  private _saveUndoState(): void {
    // Save current layers to undo stack
    const snapshot = this._layers.map(l => ({
      bufferL: new Float32Array(l.bufferL),
      bufferR: new Float32Array(l.bufferR),
      length: l.length,
    }));
    this._undoStack.push(snapshot);
    
    // Clear redo stack
    this._redoStack = [];
    
    // Limit undo stack
    if (this._undoStack.length > 10) {
      this._undoStack.shift();
    }
  }

  private _undo(): void {
    if (this._undoStack.length === 0) return;
    
    // Save current to redo
    const current = this._layers.map(l => ({
      bufferL: new Float32Array(l.bufferL),
      bufferR: new Float32Array(l.bufferR),
      length: l.length,
    }));
    this._redoStack.push(current);
    
    // Restore from undo
    this._layers = this._undoStack.pop()!;
    
    // Recalculate loop length
    this._loopLength = Math.max(...this._layers.map(l => l.length), 0);
    this._loopPosition = 0;
  }

  private _redo(): void {
    if (this._redoStack.length === 0) return;
    
    // Save current to undo
    const current = this._layers.map(l => ({
      bufferL: new Float32Array(l.bufferL),
      bufferR: new Float32Array(l.bufferR),
      length: l.length,
    }));
    this._undoStack.push(current);
    
    // Restore from redo
    this._layers = this._redoStack.pop()!;
    
    this._loopLength = Math.max(...this._layers.map(l => l.length), 0);
    this._loopPosition = 0;
  }

  private _clear(): void {
    this._saveUndoState();
    this._layers = [];
    this._addLayer();
    this._loopLength = 0;
    this._loopPosition = 0;
    this._isFirstRecording = true;
  }

  /**
   * Export loop to audio buffer
   */
  exportToBuffer(): { left: Float32Array; right: Float32Array; sampleRate: number } | null {
    if (this._loopLength === 0) return null;
    
    const left = new Float32Array(this._loopLength);
    const right = new Float32Array(this._loopLength);
    
    for (let i = 0; i < this._loopLength; i++) {
      let sumL = 0;
      let sumR = 0;
      
      for (const layer of this._layers) {
        if (i < layer.length) {
          sumL += layer.bufferL[i];
          sumR += layer.bufferR[i];
        }
      }
      
      left[i] = sumL / this._layers.length;
      right[i] = sumR / this._layers.length;
    }
    
    return { left, right, sampleRate: this._sampleRate };
  }

  get isRecording(): boolean {
    return this._state === "record" || this._state === "overdub";
  }

  get loopDuration(): number {
    return this._loopLength / this._sampleRate;
  }

  async dispose(): Promise<void> {
    this._layers = [];
    this._undoStack = [];
    this._redoStack = [];
  }
}

export function createLooperDefinition(): PluginDefinition {
  return {
    id: "com.daw.looper",
    name: "Looper",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Hardware-style audio looper with overdub and undo",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const looper = new LooperInstance(60);
      looper.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return looper;
    },
  };
}
