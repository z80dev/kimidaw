/**
 * VST Bridge Client (Browser-side)
 * 
 * WebSocket client that connects to the native VST bridge server.
 * Handles plugin loading, parameter changes, and audio streaming.
 */

import type { 
  VSTBridge, 
  VSTBridgeConfig, 
  PluginDescriptor, 
  PluginInstance 
} from './types.js';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: number;
}

export class VSTBridgeClient implements VSTBridge {
  private config: VSTBridgeConfig;
  private ws: WebSocket | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private requestId = 0;
  private pendingRequests = new Map<string, PendingRequest>();
  private instances = new Map<string, PluginInstanceImpl>();
  
  onDisconnect: (() => void) | null = null;
  onReconnect: (() => void) | null = null;
  onError: ((error: Error) => void) | null = null;
  
  constructor(config: VSTBridgeConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...config
    };
  }
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.serverUrl);
        
        this.ws.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          
          if (this.reconnectAttempts > 0 && this.onReconnect) {
            this.onReconnect();
          }
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onclose = () => {
          this.connected = false;
          
          if (this.onDisconnect) {
            this.onDisconnect();
          }
          
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          reject(new Error('WebSocket connection failed'));
          
          if (this.onError) {
            this.onError(new Error('WebSocket error'));
          }
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  async disconnect(): Promise<void> {
    // Clean up instances
    for (const instance of this.instances.values()) {
      await instance.dispose();
    }
    this.instances.clear();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts ?? 10)) {
      return;
    }
    
    this.reconnectAttempts++;
    
    setTimeout(() => {
      this.connect().catch(() => {
        // Reconnect failed, will try again
      });
    }, this.config.reconnectInterval);
  }
  
  private handleMessage(data: string | ArrayBuffer): void {
    try {
      if (typeof data === 'string') {
        const message = JSON.parse(data);
        
        // Handle response
        if (message.id && this.pendingRequests.has(message.id)) {
          const request = this.pendingRequests.get(message.id)!;
          clearTimeout(request.timeout);
          this.pendingRequests.delete(message.id);
          
          if (message.error) {
            request.reject(new Error(message.error));
          } else {
            request.resolve(message.payload);
          }
        }
        
        // Handle broadcast
        if (message.type === 'parameter-change') {
          const instance = this.instances.get(message.payload.instanceId);
          if (instance) {
            instance.handleParameterChange(
              message.payload.parameterId,
              message.payload.value
            );
          }
        }
      } else {
        // Handle binary audio data
        this.handleAudioData(data);
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }
  
  private handleAudioData(data: ArrayBuffer): void {
    // Parse audio data header
    const view = new DataView(data);
    const instanceIdLen = view.getUint32(0);
    const instanceId = new TextDecoder().decode(data.slice(4, 4 + instanceIdLen));
    
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.handleAudioData(data.slice(4 + instanceIdLen));
    }
  }
  
  private sendRequest(type: string, payload: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.connected) {
        reject(new Error('Not connected to VST bridge'));
        return;
      }
      
      const id = `${++this.requestId}`;
      const message = JSON.stringify({ id, type, payload });
      
      // Set timeout
      const timeout = window.setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, 30000);
      
      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.ws.send(message);
    });
  }
  
  async scanPlugins(paths?: string[]): Promise<PluginDescriptor[]> {
    const response = await this.sendRequest('scan-plugins', { paths }) as {
      plugins: PluginDescriptor[]
    };
    return response.plugins;
  }
  
  async getPlugin(id: string): Promise<PluginDescriptor> {
    const response = await this.sendRequest('get-plugin', { id }) as {
      plugin: PluginDescriptor
    };
    return response.plugin;
  }
  
  async loadPlugin(descriptor: PluginDescriptor): Promise<PluginInstance> {
    const instanceId = `instance-${Date.now()}-${Math.random()}`;
    
    await this.sendRequest('load-plugin', {
      pluginId: descriptor.id,
      instanceId
    });
    
    const instance = new PluginInstanceImpl(
      instanceId,
      descriptor,
      this
    );
    
    this.instances.set(instanceId, instance);
    return instance;
  }
  
  async unloadPlugin(instance: PluginInstance): Promise<void> {
    if (instance instanceof PluginInstanceImpl) {
      await this.sendRequest('unload-plugin', {
        instanceId: instance.id
      });
      
      this.instances.delete(instance.id);
      await instance.dispose();
    }
  }
  
  sendToServer(type: string, payload: unknown): Promise<unknown> {
    return this.sendRequest(type, payload);
  }
  
  sendAudioData(instanceId: string, buffer: ArrayBuffer): void {
    if (!this.ws || !this.connected) return;
    
    // Prepend instance ID
    const idData = new TextEncoder().encode(instanceId);
    const header = new ArrayBuffer(4);
    new DataView(header).setUint32(0, idData.length);
    
    const combined = new Uint8Array(4 + idData.length + buffer.byteLength);
    combined.set(new Uint8Array(header), 0);
    combined.set(idData, 4);
    combined.set(new Uint8Array(buffer), 4 + idData.length);
    
    this.ws.send(combined);
  }
}

import type { PluginParameter } from './types.js';

class PluginInstanceImpl {
  id: string;
  descriptor: PluginDescriptor;
  private bridge: VSTBridgeClient;
  private audioNode: ScriptProcessorNode | null = null;
  private parameters: Map<string, PluginParameter> = new Map();
  private audioContext: AudioContext;
  
  onMidiOutput: ((data: Uint8Array) => void) | null = null;
  
  constructor(
    id: string,
    descriptor: PluginDescriptor,
    bridge: VSTBridgeClient
  ) {
    this.id = id;
    this.descriptor = descriptor;
    this.bridge = bridge;
    this.audioContext = bridge.config.audioContext;
  }
  
  getAudioNode(): AudioNode {
    if (!this.audioNode) {
      // Create ScriptProcessorNode for audio I/O
      this.audioNode = this.audioContext.createScriptProcessor(512, 2, 2);
      
      this.audioNode.onaudioprocess = (e) => {
        const inputData = e.inputBuffer;
        const outputData = e.outputBuffer;
        
        // Send input to server
        const inputBuffer = this.audioBufferToArrayBuffer(inputData);
        this.bridge.sendAudioData(this.id, inputBuffer);
        
        // Output will be filled when we receive data back
        // For now, pass through
        for (let ch = 0; ch < 2; ch++) {
          const input = inputData.getChannelData(ch);
          const output = outputData.getChannelData(ch);
          output.set(input);
        }
      };
    }
    
    return this.audioNode;
  }
  
  connect(destination: AudioNode): void {
    const node = this.getAudioNode();
    node.connect(destination);
  }
  
  disconnect(): void {
    if (this.audioNode) {
      this.audioNode.disconnect();
    }
  }
  
  sendMidi(data: Uint8Array, timestamp?: number): void {
    this.bridge.sendToServer('midi-input', {
      instanceId: this.id,
      data: Array.from(data),
      timestamp
    }).catch(console.error);
  }
  
  getParameters(): PluginParameter[] {
    return Array.from(this.parameters.values());
  }
  
  getParameter(id: string): PluginParameter | null {
    return this.parameters.get(id) || null;
  }
  
  setParameter(id: string, value: number): void {
    const param = this.parameters.get(id);
    if (param) {
      param.value = Math.max(param.minValue, Math.min(param.maxValue, value));
      param.normalizedValue = (param.value - param.minValue) / (param.maxValue - param.minValue);
      
      this.bridge.sendToServer('set-parameter', {
        instanceId: this.id,
        parameterId: id,
        value: param.value
      }).catch(console.error);
    }
  }
  
  setParameterNormalized(id: string, normalizedValue: number): void {
    const param = this.parameters.get(id);
    if (param) {
      const value = param.minValue + normalizedValue * (param.maxValue - param.minValue);
      this.setParameter(id, value);
    }
  }
  
  hasEditor(): boolean {
    return this.descriptor.hasEditor;
  }
  
  async openEditor(container: HTMLElement): Promise<void> {
    if (!this.descriptor.hasEditor) return;
    
    // Create iframe for plugin editor
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.src = `${this.bridge.config.serverUrl}/editor/${this.id}`;
    
    container.appendChild(iframe);
    
    // Listen for editor events
    window.addEventListener('message', (e) => {
      if (e.data.type === 'parameter-change') {
        this.setParameter(e.data.parameterId, e.data.value);
      }
    });
  }
  
  closeEditor(): void {
    // Editor cleanup handled by bridge server
  }
  
  getPresets(): PluginPreset[] {
    return this.descriptor.presets;
  }
  
  loadPreset(preset: PluginPreset): void {
    this.bridge.sendToServer('load-preset', {
      instanceId: this.id,
      presetId: preset.id
    }).catch(console.error);
  }
  
  async savePreset(name: string): Promise<PluginPreset> {
    const response = await this.bridge.sendToServer('save-preset', {
      instanceId: this.id,
      name
    }) as { preset: PluginPreset };
    
    return response.preset;
  }
  
  async getState(): Promise<Uint8Array> {
    const response = await this.bridge.sendToServer('get-state', {
      instanceId: this.id
    }) as { state: number[] };
    
    return new Uint8Array(response.state);
  }
  
  async setState(state: Uint8Array): Promise<void> {
    await this.bridge.sendToServer('set-state', {
      instanceId: this.id,
      state: Array.from(state)
    });
  }
  
  suspend(): void {
    this.bridge.sendToServer('suspend', {
      instanceId: this.id
    }).catch(console.error);
  }
  
  resume(): void {
    this.bridge.sendToServer('resume', {
      instanceId: this.id
    }).catch(console.error);
  }
  
  getLatencySamples(): number {
    // Would query from bridge
    return 0;
  }
  
  handleParameterChange(parameterId: string, value: number): void {
    const param = this.parameters.get(parameterId);
    if (param) {
      param.value = value;
      param.normalizedValue = (value - param.minValue) / (param.maxValue - param.minValue);
    }
  }
  
  handleAudioData(data: ArrayBuffer): void {
    // Convert back to audio buffer and process
    // This would feed into the ScriptProcessorNode output
  }
  
  private audioBufferToArrayBuffer(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const bytesPerSample = 4; // Float32
    
    const headerSize = 16; // sampleRate, numChannels, length, format
    const dataSize = numChannels * length * bytesPerSample;
    const totalSize = headerSize + dataSize;
    
    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);
    
    // Write header
    view.setFloat32(0, buffer.sampleRate, true);
    view.setUint32(4, numChannels, true);
    view.setUint32(8, length, true);
    view.setUint32(12, 0, true); // Format: Float32
    
    // Write channel data
    let offset = headerSize;
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = buffer.getChannelData(ch);
      const channelArray = new Float32Array(arrayBuffer, offset, length);
      channelArray.set(channelData);
      offset += length * bytesPerSample;
    }
    
    return arrayBuffer;
  }
  
  async dispose(): Promise<void> {
    this.disconnect();
    this.audioNode = null;
  }
}

export function createVSTBridge(config: VSTBridgeConfig): VSTBridge {
  return new VSTBridgeClient(config);
}

import type { PluginPreset } from './types.js';
