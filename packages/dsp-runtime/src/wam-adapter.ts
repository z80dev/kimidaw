/**
 * WAM (Web Audio Module) Plugin Adapter
 * 
 * Adapts WAM 2.0 plugins to the DAW processor interface.
 * Provides compatibility with the WAM standard.
 * 
 * WAM API: https://github.com/WebAudioModules/wam-examples
 */

import type {
  WAMDescriptor,
  WAMParameterInfo,
  WAMState,
  ProcessorParameter,
} from './types.js';

/** WAM Group ID */
export type WAMGroupId = string;

/** WAM Plugin ID */
export type WAMPluginId = string;

/** WAM constructor options */
export interface WAMConstructorOptions {
  /** WAM group ID */
  groupId: WAMGroupId;
  /** Unique plugin instance ID */
  pluginId: WAMPluginId;
}

/** WAM processor options */
export interface WAMProcessorOptions extends WAMConstructorOptions {
  /** Initial parameter values */
  initialState?: WAMState;
}

/** WAM message types */
export type WAMMessageType = 
  | 'wam-info'
  | 'wam-param'
  | 'wam-state'
  | 'wam-event'
  | 'wam-transport';

/** WAM message */
export interface WAMMessage {
  type: WAMMessageType;
  requestId: string;
  payload: unknown;
}

/** WAM event types */
export type WAMEventType =
  | 'wam-automation'
  | 'wam-transport'
  | 'wam-midi'
  | 'wam-sysex'
  | 'wam-mpe';

/** WAM event */
export interface WAMEvent {
  type: WAMEventType;
  time: number;
  data: unknown;
}

/**
 * WAM Adapter for DAW
 * Wraps WAM plugins to provide DAW-native interface
 */
export class WAMAdapter {
  private descriptor: WAMDescriptor | null = null;
  private paramInfo: Map<string, WAMParameterInfo> = new Map();
  private state: WAMState = {};
  private groupId: WAMGroupId;
  private pluginId: WAMPluginId;
  private messagePort: MessagePort | null = null;
  private pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }> = new Map();
  private requestIdCounter = 0;
  
  constructor(options: WAMConstructorOptions) {
    this.groupId = options.groupId;
    this.pluginId = options.pluginId;
  }
  
  /** Initialize the WAM adapter */
  async initialize(messagePort: MessagePort): Promise<void> {
    this.messagePort = messagePort;
    this.messagePort.onmessage = this.handleMessage.bind(this);
    
    // Request WAM descriptor
    this.descriptor = await this.request('wam-info', {}) as WAMDescriptor;
    
    // Get parameter info
    const params = await this.request('wam-param', { action: 'list' }) as Record<string, WAMParameterInfo>;
    this.paramInfo = new Map(Object.entries(params));
    
    // Initialize state with defaults
    for (const [id, info] of this.paramInfo) {
      this.state[id] = info.defaultValue;
    }
  }
  
  /** Get WAM descriptor */
  getDescriptor(): WAMDescriptor | null {
    return this.descriptor;
  }
  
  /** Get parameter descriptors in DAW format */
  getParameterDescriptors(): ProcessorParameter[] {
    const descriptors: ProcessorParameter[] = [];
    
    for (const [id, info] of this.paramInfo) {
      descriptors.push({
        id,
        name: info.label,
        defaultValue: info.defaultValue,
        min: info.minValue,
        max: info.maxValue,
        automationRate: 'k-rate',
      });
    }
    
    return descriptors;
  }
  
  /** Get parameter value */
  getParam(id: string): number {
    return this.state[id] ?? 0;
  }
  
  /** Set parameter value */
  async setParam(id: string, value: number): Promise<void> {
    const info = this.paramInfo.get(id);
    if (!info) return;
    
    // Clamp to range
    value = Math.max(info.minValue, Math.min(info.maxValue, value));
    
    this.state[id] = value;
    
    await this.request('wam-param', {
      action: 'set',
      id,
      value,
    });
  }
  
  /** Get full state */
  getState(): WAMState {
    return { ...this.state };
  }
  
  /** Set full state */
  async setState(state: WAMState): Promise<void> {
    this.state = { ...state };
    await this.request('wam-state', { state });
  }
  
  /** Send WAM event */
  async sendEvent(event: WAMEvent): Promise<void> {
    await this.request('wam-event', event);
  }
  
  /** Send transport info */
  async sendTransport(
    playing: boolean,
    time: number,
    tempo: number
  ): Promise<void> {
    await this.request('wam-transport', {
      playing,
      time,
      tempo,
    });
  }
  
  /** Handle incoming message */
  private handleMessage(event: MessageEvent<WAMMessage>): void {
    const message = event.data;
    
    // Handle responses to pending requests
    if (message.requestId && this.pendingRequests.has(message.requestId)) {
      const { resolve } = this.pendingRequests.get(message.requestId)!;
      this.pendingRequests.delete(message.requestId);
      resolve(message.payload);
      return;
    }
    
    // Handle unsolicited messages
    this.handleUnsolicitedMessage(message);
  }
  
  /** Handle unsolicited messages from WAM */
  private handleUnsolicitedMessage(message: WAMMessage): void {
    switch (message.type) {
      case 'wam-param':
        // Parameter update from plugin
        const { id, value } = message.payload as { id: string; value: number };
        if (id !== undefined && value !== undefined) {
          this.state[id] = value;
        }
        break;
      case 'wam-state':
        // State update from plugin
        this.state = { ...(message.payload as WAMState) };
        break;
    }
  }
  
  /** Send request and wait for response */
  private request(type: WAMMessageType, payload: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.messagePort) {
        reject(new Error('WAM not initialized'));
        return;
      }
      
      const requestId = `${this.pluginId}-${++this.requestIdCounter}`;
      
      this.pendingRequests.set(requestId, { resolve, reject });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('WAM request timeout'));
        }
      }, 5000);
      
      this.messagePort.postMessage({
        type,
        requestId,
        payload,
      } as WAMMessage);
    });
  }
  
  /** Dispose adapter */
  dispose(): void {
    // Reject all pending requests
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new Error('WAM adapter disposed'));
      this.pendingRequests.delete(id);
    }
    
    this.messagePort?.close();
    this.messagePort = null;
  }
}

/** Create WAM adapter */
export function createWAMAdapter(
  groupId: WAMGroupId,
  pluginId: WAMPluginId
): WAMAdapter {
  return new WAMAdapter({ groupId, pluginId });
}

/** Check if a URL is a valid WAM plugin */
export async function validateWAMUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    
    const content = await response.text();
    
    // Check for WAM-specific signatures
    return (
      content.includes('WebAudioModule') ||
      content.includes('WAM') ||
      content.includes('export default class') && content.includes('process')
    );
  } catch {
    return false;
  }
}

/** Generate WAM group ID */
export function generateWAMGroupId(): WAMGroupId {
  return `wam-group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Generate WAM plugin ID */
export function generateWAMPluginId(): WAMPluginId {
  return `wam-plugin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
