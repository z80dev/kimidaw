/**
 * External Instrument
 * 
 * Routes MIDI to external hardware synths and returns audio:
 * - MIDI output to device
 * - Audio input from device
 * - Latency compensation
 * - Program change support
 * 
 * This acts as a bridge between the DAW and external hardware synthesizers,
 * drum machines, and other MIDI-controlled audio devices.
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  PluginParameterSpec,
  MidiEvent,
  AudioBuffer,
} from "@daw/plugin-api";
import { createParameterMap, midiToFrequency } from "@daw/plugin-api";

// =============================================================================
// Types
// =============================================================================

export interface MidiOutputDevice {
  id: string;
  name: string;
  manufacturer?: string;
}

export interface AudioInputDevice {
  id: string;
  name: string;
  channelCount: number;
}

export type LatencyMode = "auto" | "manual" | "off";

export interface ExternalInstrumentState {
  midiDeviceId: string | null;
  midiChannel: number;
  audioInputId: string | null;
  audioInputChannel: number;
  latencyMode: LatencyMode;
  manualLatencyMs: number;
  programNumber: number;
  bankMsb: number;
  bankLsb: number;
  parameters: Record<string, number>;
}

// =============================================================================
// External Instrument Instance
// =============================================================================

export class ExternalInstrumentInstance implements PluginInstanceRuntime {
  private _params: ReturnType<typeof createParameterMap>;
  private _sampleRate = 48000;
  private _blockSize = 128;
  private _connected = false;
  
  // MIDI state
  private _midiDeviceId: string | null = null;
  private _midiChannel = 0;
  private _programNumber = 0;
  private _bankMsb = 0;
  private _bankLsb = 0;
  private _pendingProgramChange = false;
  
  // Audio state
  private _audioInputId: string | null = null;
  private _audioInputChannel = 0;
  private _audioNode: AudioNode | null = null;
  
  // Latency compensation
  private _latencyMode: LatencyMode = "auto";
  private _manualLatencyMs = 0;
  private _measuredLatencyMs = 0;
  private _latencyDelayLine: Float32Array[] = [];
  private _latencyWriteIndex = 0;
  private _latencySamples = 0;
  
  // Monitoring
  private _inputLevel = 0;
  private _isActive = false;
  private _lastMidiTime = 0;

  constructor(maxBlockSize = 128) {
    this._params = createParameterMap(EXTERNAL_INSTRUMENT_PARAMETERS);
    this._initLatencyBuffer(maxBlockSize);
  }

  private _initLatencyBuffer(blockSize: number): void {
    // Maximum 100ms latency buffer at 96kHz
    const maxLatencySamples = Math.ceil(0.1 * 96000);
    this._latencyDelayLine = [
      new Float32Array(maxLatencySamples),
      new Float32Array(maxLatencySamples),
    ];
    this._latencyWriteIndex = 0;
  }

  // ---------------------------------------------------------------------------
  // PluginInstanceRuntime Implementation
  // ---------------------------------------------------------------------------

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
    
    // Set up MIDI input handler
    if (graph.midiInput) {
      graph.midiInput.onReceive?.((event: MidiEvent) => this._handleMidi(event));
    }
    
    // Store audio node reference for external routing
    if (graph.audioInputs.length > 0) {
      this._audioNode = graph.audioInputs[0];
    }
  }

  disconnect(): void {
    this._connected = false;
    this._audioNode = null;
    this._sendAllNotesOff();
  }

  setParam(id: string, value: number, atSample?: number): void {
    const param = this._params.get(id);
    if (param) {
      const oldValue = param.value;
      param.setNormalized(value);
      
      // Handle special parameter changes
      if (id === "midiChannel") {
        this._sendAllNotesOff(); // Clear old channel
        this._midiChannel = Math.floor(param.value);
      } else if (id === "program") {
        this._programNumber = Math.floor(param.value);
        this._sendProgramChange();
      } else if (id === "bankMsb") {
        this._bankMsb = Math.floor(param.value);
        this._sendBankSelect();
      } else if (id === "bankLsb") {
        this._bankLsb = Math.floor(param.value);
        this._sendBankSelect();
      } else if (id === "latencyMode") {
        this._latencyMode = ["auto", "manual", "off"][Math.floor(param.value)] as LatencyMode;
        this._updateLatency();
      } else if (id === "latencyMs") {
        this._manualLatencyMs = param.value;
        if (this._latencyMode === "manual") {
          this._updateLatency();
        }
      }
    }
  }

  getParam(id: string): number {
    return this._params.get(id)?.normalizedValue ?? 0;
  }

  async saveState(): Promise<ExternalInstrumentState> {
    return {
      midiDeviceId: this._midiDeviceId,
      midiChannel: this._midiChannel,
      audioInputId: this._audioInputId,
      audioInputChannel: this._audioInputChannel,
      latencyMode: this._latencyMode,
      manualLatencyMs: this._manualLatencyMs,
      programNumber: this._programNumber,
      bankMsb: this._bankMsb,
      bankLsb: this._bankLsb,
      parameters: this._params.getNormalizedValues(),
    };
  }

  async loadState(state: unknown): Promise<void> {
    const s = state as Partial<ExternalInstrumentState>;
    
    if (s.midiDeviceId !== undefined) this._midiDeviceId = s.midiDeviceId;
    if (s.midiChannel !== undefined) this._midiChannel = s.midiChannel;
    if (s.audioInputId !== undefined) this._audioInputId = s.audioInputId;
    if (s.audioInputChannel !== undefined) this._audioInputChannel = s.audioInputChannel;
    if (s.latencyMode !== undefined) this._latencyMode = s.latencyMode;
    if (s.manualLatencyMs !== undefined) this._manualLatencyMs = s.manualLatencyMs;
    if (s.programNumber !== undefined) this._programNumber = s.programNumber;
    if (s.bankMsb !== undefined) this._bankMsb = s.bankMsb;
    if (s.bankLsb !== undefined) this._bankLsb = s.bankLsb;
    
    if (s.parameters) {
      this._params.setNormalizedValues(s.parameters);
    }
    
    this._updateLatency();
    
    // Send bank/program after loading
    if (this._connected) {
      this._sendBankSelect();
      this._sendProgramChange();
    }
  }

  getLatencySamples(): number {
    // Report the latency we're adding for compensation
    return this._latencyMode === "off" ? 0 : this._latencySamples;
  }

  getTailSamples(): number {
    return 0;
  }

  reset(): void {
    this._sendAllNotesOff();
    this._latencyWriteIndex = 0;
    this._latencyDelayLine[0]?.fill(0);
    this._latencyDelayLine[1]?.fill(0);
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    this._blockSize = config.blockSize;
    this._updateLatency();
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], midi: MidiEvent[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    // Process incoming MIDI
    for (const event of midi) {
      this._handleMidi(event);
    }

    this._params.processSmoothing();

    // Get input audio (from external hardware)
    const inputBuffer = inputs[0];
    const outputBuffer = outputs[0];

    if (!inputBuffer || inputBuffer.numberOfChannels === 0) {
      // No input - output silence
      for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
        outputBuffer.getChannelData(ch).fill(0);
      }
      return;
    }

    // Apply latency compensation and copy input to output
    const gain = this._params.get("gain")?.value ?? 0;
    const linearGain = Math.pow(10, gain / 20);
    const monitor = (this._params.get("monitor")?.value ?? 1) > 0.5;

    const inputL = inputBuffer.getChannelData(0);
    const inputR = inputBuffer.numberOfChannels > 1 
      ? inputBuffer.getChannelData(1) 
      : inputBuffer.getChannelData(0);

    const outputL = outputBuffer.getChannelData(0);
    const outputR = outputBuffer.numberOfChannels > 1 
      ? outputBuffer.getChannelData(1) 
      : outputBuffer.getChannelData(0);

    // Calculate input level for metering
    let peakLevel = 0;

    if (this._latencyMode === "off" || this._latencySamples === 0) {
      // No latency compensation - direct pass-through
      for (let i = 0; i < blockSize; i++) {
        const inL = inputL[i];
        const inR = inputR[i];
        
        const absLevel = Math.max(Math.abs(inL), Math.abs(inR));
        if (absLevel > peakLevel) peakLevel = absLevel;
        
        outputL[i] = inL * linearGain * (monitor ? 1 : 0);
        outputR[i] = inR * linearGain * (monitor ? 1 : 0);
      }
    } else {
      // Apply latency compensation using delay line
      const delayL = this._latencyDelayLine[0];
      const delayR = this._latencyDelayLine[1];
      const delaySize = delayL.length;

      for (let i = 0; i < blockSize; i++) {
        // Write to delay line
        delayL[this._latencyWriteIndex] = inputL[i];
        delayR[this._latencyWriteIndex] = inputR[i];

        // Read from delay line (compensated position)
        const readIndex = (this._latencyWriteIndex - this._latencySamples + delaySize) % delaySize;
        const outL = delayL[readIndex];
        const outR = delayR[readIndex];

        const absLevel = Math.max(Math.abs(outL), Math.abs(outR));
        if (absLevel > peakLevel) peakLevel = absLevel;

        outputL[i] = outL * linearGain * (monitor ? 1 : 0);
        outputR[i] = outR * linearGain * (monitor ? 1 : 0);

        this._latencyWriteIndex = (this._latencyWriteIndex + 1) % delaySize;
      }
    }

    this._inputLevel = peakLevel;
    this._isActive = peakLevel > 0.001;
  }

  async dispose(): Promise<void> {
    this._sendAllNotesOff();
    this._latencyDelayLine = [];
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  setMidiDevice(deviceId: string | null): void {
    if (this._midiDeviceId !== deviceId) {
      this._sendAllNotesOff();
      this._midiDeviceId = deviceId;
    }
  }

  setAudioInput(deviceId: string | null): void {
    this._audioInputId = deviceId;
  }

  setProgram(program: number, bankMsb = 0, bankLsb = 0): void {
    this._programNumber = Math.max(0, Math.min(127, program));
    this._bankMsb = Math.max(0, Math.min(127, bankMsb));
    this._bankLsb = Math.max(0, Math.min(127, bankLsb));
    
    this._params.get("program")?.setImmediate(this._programNumber / 127);
    this._params.get("bankMsb")?.setImmediate(this._bankMsb / 127);
    this._params.get("bankLsb")?.setImmediate(this._bankLsb / 127);
    
    if (this._connected) {
      this._sendBankSelect();
      this._sendProgramChange();
    }
  }

  get midiDeviceId(): string | null {
    return this._midiDeviceId;
  }

  get audioInputId(): string | null {
    return this._audioInputId;
  }

  get inputLevel(): number {
    return this._inputLevel;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get currentLatencyMs(): number {
    if (this._latencyMode === "manual") {
      return this._manualLatencyMs;
    } else if (this._latencyMode === "auto") {
      return this._measuredLatencyMs;
    }
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private _handleMidi(event: MidiEvent): void {
    // Forward MIDI events to external device
    this._forwardMidiEvent(event);
    this._lastMidiTime = performance.now();
  }

  private _forwardMidiEvent(event: MidiEvent): void {
    // This would send the MIDI event to the selected output device
    // In a real implementation, this would use the Web MIDI API
    // or the host's MIDI output system
    
    // For now, we just track the activity
    if (event.type === "noteOn" || event.type === "noteOff") {
      this._isActive = true;
    }
  }

  private _sendProgramChange(): void {
    const event: MidiEvent = {
      type: "programChange",
      channel: this._midiChannel,
      sampleOffset: 0,
      data: { program: this._programNumber },
    };
    this._forwardMidiEvent(event);
  }

  private _sendBankSelect(): void {
    // Bank select uses CC0 (MSB) and CC32 (LSB)
    const msbEvent: MidiEvent = {
      type: "cc",
      channel: this._midiChannel,
      sampleOffset: 0,
      data: { controller: 0, value: this._bankMsb },
    };
    const lsbEvent: MidiEvent = {
      type: "cc",
      channel: this._midiChannel,
      sampleOffset: 0,
      data: { controller: 32, value: this._bankLsb },
    };
    this._forwardMidiEvent(msbEvent);
    this._forwardMidiEvent(lsbEvent);
  }

  private _sendAllNotesOff(): void {
    // Send all notes off (CC 123)
    const event: MidiEvent = {
      type: "cc",
      channel: this._midiChannel,
      sampleOffset: 0,
      data: { controller: 123, value: 0 },
    };
    this._forwardMidiEvent(event);
  }

  private _updateLatency(): void {
    let latencyMs = 0;
    
    switch (this._latencyMode) {
      case "manual":
        latencyMs = this._manualLatencyMs;
        break;
      case "auto":
        latencyMs = this._measuredLatencyMs;
        break;
      case "off":
      default:
        latencyMs = 0;
        break;
    }
    
    this._latencySamples = Math.round(latencyMs * this._sampleRate / 1000);
  }

  measureLatency(): void {
    // This would trigger a latency measurement process
    // Typically involves sending a click/signal and measuring return time
    // For now, just set a reasonable default
    this._measuredLatencyMs = 10; // 10ms default round-trip
    if (this._latencyMode === "auto") {
      this._updateLatency();
    }
  }
}

// =============================================================================
// Parameters
// =============================================================================

const EXTERNAL_INSTRUMENT_PARAMETERS: PluginParameterSpec[] = [
  // MIDI Configuration
  { 
    id: "midiChannel", 
    name: "MIDI Channel", 
    kind: "enum", 
    min: 0, 
    max: 15, 
    defaultValue: 0, 
    labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"] 
  },
  
  // Program/Bank
  { id: "program", name: "Program", kind: "int", min: 0, max: 127, defaultValue: 0 },
  { id: "bankMsb", name: "Bank MSB", kind: "int", min: 0, max: 127, defaultValue: 0 },
  { id: "bankLsb", name: "Bank LSB", kind: "int", min: 0, max: 127, defaultValue: 0 },
  
  // Audio Input
  { 
    id: "audioChannel", 
    name: "Audio Channel", 
    kind: "enum", 
    min: 0, 
    max: 3, 
    defaultValue: 0, 
    labels: ["1-2", "3-4", "5-6", "7-8"] 
  },
  
  // Latency Compensation
  { 
    id: "latencyMode", 
    name: "Latency Mode", 
    kind: "enum", 
    min: 0, 
    max: 2, 
    defaultValue: 0, 
    labels: ["Auto", "Manual", "Off"] 
  },
  { id: "latencyMs", name: "Latency", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "ms" },
  
  // Input
  { id: "gain", name: "Gain", kind: "float", min: -24, max: 24, defaultValue: 0.75, unit: "dB" },
  { id: "monitor", name: "Monitor", kind: "bool", min: 0, max: 1, defaultValue: 1 },
];

// =============================================================================
// Plugin Definition
// =============================================================================

export function createExternalInstrumentDefinition(): PluginDefinition {
  return {
    id: "com.daw.external-instrument",
    name: "External Instrument",
    category: "instrument",
    version: "1.0.0",
    vendor: "DAW",
    description: "Route MIDI to external hardware synths and return audio",
    parameters: EXTERNAL_INSTRUMENT_PARAMETERS,
    ui: {
      type: "custom",
      width: 600,
      height: 300,
      resizable: false,
      layout: [
        { title: "MIDI", parameters: ["midiChannel", "program", "bankMsb", "bankLsb"], layout: "horizontal" },
        { title: "Audio", parameters: ["audioChannel", "gain", "monitor"], layout: "horizontal" },
        { title: "Latency", parameters: ["latencyMode", "latencyMs"], layout: "horizontal" },
      ],
    },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 1,
    midiOutputs: 1,
    supportsMpe: false,
    hasSidechain: false,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const inst = new ExternalInstrumentInstance(ctx.maxBlockSize);
      inst.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return inst;
    },
  };
}
