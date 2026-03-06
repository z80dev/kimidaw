/**
 * Gate - Noise gate
 * 
 * Professional noise gate with:
 * - Threshold and return (hysteresis)
 * - Attack, hold, and release controls
 * - Floor amount (attenuation when closed)
 * - Sidechain input support
 * - Key filtering
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
import { BiquadFilter } from "../core/AdvancedFilters.js";
import { dbToLinear, linearToDb, clamp } from "../core/DspUtils.js";

const DETECTOR_MODES = ["Peak", "RMS"] as const;

const PARAMETERS: PluginParameterSpec[] = [
  { id: "threshold", name: "Threshold", kind: "float", min: -70, max: 0, defaultValue: 0.5, unit: "dB" },
  { id: "return", name: "Return", kind: "float", min: 0, max: 24, defaultValue: 0.2, unit: "dB" },
  { id: "attack", name: "Attack", kind: "float", min: 0.01, max: 100, defaultValue: 0.1, unit: "ms" },
  { id: "hold", name: "Hold", kind: "float", min: 0, max: 500, defaultValue: 0.2, unit: "ms" },
  { id: "release", name: "Release", kind: "float", min: 1, max: 1000, defaultValue: 0.3, unit: "ms" },
  { id: "floor", name: "Floor", kind: "float", min: -inf, max: 0, defaultValue: 0, unit: "dB" },
  { id: "detector", name: "Detector", kind: "enum", min: 0, max: 1, defaultValue: 0, labels: [...DETECTOR_MODES] },
  
  // Sidechain/Key filter
  { id: "keyEnabled", name: "Key Filter", kind: "bool", min: 0, max: 1, defaultValue: 0 },
  { id: "keyFreq", name: "Key Freq", kind: "float", min: 20, max: 20000, defaultValue: 0.5, unit: "Hz" },
  { id: "keyQ", name: "Key Q", kind: "float", min: 0.1, max: 10, defaultValue: 0.3 },
  
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

const inf = -1000; // Use a very low number instead of actual Infinity

interface GateState {
  isOpen: boolean;
  envelope: number;
  holdSamples: number;
  holdCount: number;
  attackCoeff: number;
  releaseCoeff: number;
  rmsSum: number;
  rmsIndex: number;
  rmsWindow: Float32Array;
}

export class GateInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // State per channel
  private _gateL: GateState;
  private _gateR: GateState;
  
  // Key filter
  private _keyFilterL = new BiquadFilter();
  private _keyFilterR = new BiquadFilter();
  
  // Metering
  private _stateMeter = false;

  constructor() {
    this._gateL = this._createGateState();
    this._gateR = this._createGateState();
  }

  private _createGateState(): GateState {
    return {
      isOpen: false,
      envelope: 0,
      holdSamples: 0,
      holdCount: 0,
      attackCoeff: 0,
      releaseCoeff: 0,
      rmsSum: 0,
      rmsIndex: 0,
      rmsWindow: new Float32Array(48),
    };
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._keyFilterL.setSampleRate(this._sampleRate);
    this._keyFilterR.setSampleRate(this._sampleRate);
    this._keyFilterL.setType("bandpass");
    this._keyFilterR.setType("bandpass");
    this._updateCoeffs();
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
    if (id === "attack" || id === "release" || id === "hold" || id === "keyFreq" || id === "keyQ") {
      this._updateCoeffs();
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
      this._updateCoeffs();
    }
  }

  getLatencySamples(): number { return 0; }
  getTailSamples(): number { return 0; }

  reset(): void {
    this._gateL = this._createGateState();
    this._gateR = this._createGateState();
    this._keyFilterL.reset();
    this._keyFilterR.reset();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const threshold = this._params.get("threshold")?.value ?? -40;
    const returnDb = this._params.get("return")?.value ?? 6;
    const floor = dbToLinear(this._params.get("floor")?.value ?? -80);
    const rmsMode = this._params.get("detector")?.value === 1;
    const keyEnabled = this._params.get("keyEnabled")?.value >= 0.5;

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    // Sidechain input
    const scInputL = inputs[1]?.getChannelData(0) ?? inputL;
    const scInputR = inputs[1]?.numberOfChannels > 1 
      ? inputs[1].getChannelData(1) 
      : scInputL;

    this._params.processSmoothing();

    const openThreshold = threshold;
    const closeThreshold = threshold - returnDb;

    let anyOpen = false;

    for (let i = 0; i < blockSize; i++) {
      let dryL = inputL[i];
      let dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL;
        outputR[i] = dryR;
        continue;
      }

      // Get key input
      let keyL = scInputL[i];
      let keyR = scInputR[i];
      
      if (keyEnabled) {
        keyL = this._keyFilterL.process(keyL);
        keyR = this._keyFilterR.process(keyR);
      }

      // Process gate for each channel
      const gainL = this._processGate(keyL, this._gateL, openThreshold, closeThreshold, rmsMode);
      const gainR = this._processGate(keyR, this._gateR, openThreshold, closeThreshold, rmsMode);

      // Apply floor (minimum attenuation when closed)
      const finalGainL = floor + gainL * (1 - floor);
      const finalGainR = floor + gainR * (1 - floor);

      outputL[i] = dryL * finalGainL;
      outputR[i] = dryR * finalGainR;
      
      anyOpen = anyOpen || this._gateL.isOpen || this._gateR.isOpen;
    }

    this._stateMeter = anyOpen;
  }

  private _processGate(
    input: number, 
    gate: GateState, 
    openThreshold: number, 
    closeThreshold: number,
    rmsMode: boolean
  ): number {
    // Level detection
    let level: number;
    if (rmsMode) {
      gate.rmsSum -= gate.rmsWindow[gate.rmsIndex];
      gate.rmsSum += input * input;
      gate.rmsWindow[gate.rmsIndex] = input * input;
      gate.rmsIndex = (gate.rmsIndex + 1) % gate.rmsWindow.length;
      level = Math.sqrt(gate.rmsSum / gate.rmsWindow.length);
    } else {
      level = Math.abs(input);
    }

    const levelDb = level > 0.00001 ? 20 * Math.log10(level) : -100;

    // State machine with hysteresis
    if (!gate.isOpen && levelDb > openThreshold) {
      // Open the gate
      gate.isOpen = true;
    } else if (gate.isOpen && levelDb < closeThreshold) {
      // Start hold timer
      gate.holdCount = gate.holdSamples;
      gate.isOpen = false;
    }

    // Calculate target gain
    let targetGain = gate.isOpen ? 1 : 0;

    // Handle hold time
    if (!gate.isOpen && gate.holdCount > 0) {
      targetGain = 1;
      gate.holdCount--;
    }

    // Envelope following (attack/release)
    const coeff = targetGain > gate.envelope ? gate.attackCoeff : gate.releaseCoeff;
    gate.envelope += (targetGain - gate.envelope) * coeff;

    return gate.envelope;
  }

  async dispose(): Promise<void> {}

  private _updateCoeffs(): void {
    const attackMs = this._params.get("attack")?.value ?? 1;
    const releaseMs = this._params.get("release")?.value ?? 100;
    const holdMs = this._params.get("hold")?.value ?? 50;
    
    const attackSamples = Math.max(1, attackMs * this._sampleRate / 1000);
    const releaseSamples = Math.max(1, releaseMs * this._sampleRate / 1000);
    
    const attackCoeff = 1 - Math.exp(-1 / attackSamples);
    const releaseCoeff = 1 - Math.exp(-1 / releaseSamples);
    
    this._gateL.attackCoeff = attackCoeff;
    this._gateL.releaseCoeff = releaseCoeff;
    this._gateL.holdSamples = Math.round(holdMs * this._sampleRate / 1000);
    
    this._gateR.attackCoeff = attackCoeff;
    this._gateR.releaseCoeff = releaseCoeff;
    this._gateR.holdSamples = Math.round(holdMs * this._sampleRate / 1000);

    // Update key filter
    const keyFreq = this._params.get("keyFreq")?.value ?? 1000;
    const keyQ = this._params.get("keyQ")?.value ?? 1;
    this._keyFilterL.setFrequency(keyFreq);
    this._keyFilterL.setQ(keyQ);
    this._keyFilterR.setFrequency(keyFreq);
    this._keyFilterR.setQ(keyQ);
  }

  get isOpen(): boolean {
    return this._stateMeter;
  }
}

export function createGateDefinition(): PluginDefinition {
  return {
    id: "com.daw.gate",
    name: "Gate",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Noise gate with hysteresis and key filtering",
    parameters: PARAMETERS,
    ui: { 
      type: "generic",
      layout: [
        { title: "Threshold", parameters: ["threshold", "return"], layout: "vertical" },
        { title: "Time", parameters: ["attack", "hold", "release"], layout: "vertical" },
        { title: "Character", parameters: ["floor", "detector"], layout: "vertical" },
        { title: "Key Filter", parameters: ["keyEnabled", "keyFreq", "keyQ"], layout: "vertical" },
        { title: "Output", parameters: ["bypass"], layout: "vertical" }
      ]
    },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    hasSidechain: true,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const gate = new GateInstance();
      gate.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return gate;
    },
  };
}
