/**
 * VST3 Host Types
 */

export type PluginFormat = 'vst3' | 'audiounit' | 'clap' | 'wam';
export type PluginCategory = 
  | 'instrument' 
  | 'audio-effect' 
  | 'midi-effect'
  | 'analyzer'
  | 'synth'
  | 'sampler';

export interface PluginDescriptor {
  id: string;
  name: string;
  vendor: string;
  version: string;
  category: PluginCategory;
  format: PluginFormat;
  path: string;
  
  // Capabilities
  hasEditor: boolean;
  isInstrument: boolean;
  numInputs: number;
  numOutputs: number;
  numParameters: number;
  numPrograms: number;
  
  // Features
  supportsMPE: boolean;
  supportsMIDI: boolean;
  supportsSidechain: boolean;
  supportsLatencyReporting: boolean;
  
  // Metadata
  tags: string[];
  presets: PluginPreset[];
}

export interface PluginPreset {
  id: string;
  name: string;
  factory: boolean;
  data?: Uint8Array;
}

export interface PluginParameter {
  id: string;
  index: number;
  name: string;
  shortName: string;
  unit: string;
  
  // Value range
  minValue: number;
  maxValue: number;
  defaultValue: number;
  
  // Current value
  value: number;
  normalizedValue: number;
  
  // Display
  displayText: string;
  
  // Flags
  isAutomatable: boolean;
  isDiscrete: boolean;
  isBoolean: boolean;
  isInteger: boolean;
  
  // Stepped values
  stepCount?: number;
  values?: string[];
}

export interface VSTBridgeConfig {
  serverUrl: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  audioContext: AudioContext;
}

export interface VSTBridge {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Plugin scanning
  scanPlugins(paths?: string[]): Promise<PluginDescriptor[]>;
  getPlugin(id: string): Promise<PluginDescriptor>;
  
  // Plugin instance management
  loadPlugin(descriptor: PluginDescriptor): Promise<PluginInstance>;
  unloadPlugin(instance: PluginInstance): Promise<void>;
  
  // Events
  onDisconnect: (() => void) | null;
  onReconnect: (() => void) | null;
  onError: ((error: Error) => void) | null;
}

export interface PluginInstance {
  id: string;
  descriptor: PluginDescriptor;
  
  // Audio I/O
  getAudioNode(): AudioNode;
  connect(destination: AudioNode): void;
  disconnect(): void;
  
  // MIDI I/O
  sendMidi(data: Uint8Array, timestamp?: number): void;
  onMidiOutput: ((data: Uint8Array) => void) | null;
  
  // Parameters
  getParameters(): PluginParameter[];
  getParameter(id: string): PluginParameter | null;
  setParameter(id: string, value: number): void;
  setParameterNormalized(id: string, normalizedValue: number): void;
  
  // Automation
  startAutomationRecording(): void;
  stopAutomationRecording(): void;
  
  // Editor
  hasEditor(): boolean;
  getEditorSize(): { width: number; height: number } | null;
  openEditor(container: HTMLElement): Promise<void>;
  closeEditor(): void;
  
  // Presets
  getPresets(): PluginPreset[];
  loadPreset(preset: PluginPreset): void;
  savePreset(name: string): Promise<PluginPreset>;
  
  // State
  getState(): Promise<Uint8Array>;
  setState(state: Uint8Array): Promise<void>;
  
  // Processing
  suspend(): void;
  resume(): void;
  getLatencySamples(): number;
  
  // Cleanup
  dispose(): Promise<void>;
}

// Protocol messages
export interface BridgeMessage {
  id: string;
  type: string;
  payload: unknown;
}

export interface PluginListMessage extends BridgeMessage {
  type: 'plugin-list';
  payload: {
    plugins: PluginDescriptor[];
  };
}

export interface LoadPluginMessage extends BridgeMessage {
  type: 'load-plugin';
  payload: {
    pluginId: string;
    instanceId: string;
  };
}

export interface ParameterChangeMessage extends BridgeMessage {
  type: 'parameter-change';
  payload: {
    instanceId: string;
    parameterId: string;
    value: number;
  };
}

export interface AudioStreamMessage extends BridgeMessage {
  type: 'audio-stream';
  payload: {
    instanceId: string;
    channelData: Float32Array[];
    sampleRate: number;
  };
}

// Audio streaming
export interface AudioStreamConfig {
  sampleRate: number;
  bufferSize: number;
  numInputChannels: number;
  numOutputChannels: number;
}
