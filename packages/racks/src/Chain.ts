/**
 * Chain System
 * 
 * A signal chain within a rack. Contains devices, zone settings, mixer controls,
 * and handles audio/MIDI routing between devices.
 */

import type { 
  RackChain, 
  ChainDevice, 
  ChainMixer, 
  ChainZones,
  SendSlot,
  ZoneResult,
  ChainSelectionContext,
  ChainBuffers,
  RackEventHandler,
  RackEvent,
} from "./types.js";
import { ChainZoneManager } from "./Zones.js";
import type { MidiEvent, AudioBuffer } from "@daw/plugin-api";

// =============================================================================
// Constants
// =============================================================================

/** Default mixer settings */
export const DEFAULT_MIXER: ChainMixer = {
  volume: 0,
  pan: 0,
  mute: false,
  solo: false,
  soloIsolate: false,
  meterGain: 0,
};

/** dB to linear conversion */
const DB_TO_LINEAR_FACTOR = Math.log(10) / 20;

// =============================================================================
// Chain Class
// =============================================================================

/**
 * Manages a single chain within a rack
 */
export class Chain {
  private _id: string;
  private _name: string;
  private _color?: string;
  private _devices: ChainDevice[] = [];
  private _zones: ChainZoneManager;
  private _mixer: ChainMixer;
  private _sends: SendSlot[] = [];
  private _outputTarget: string | null = null;
  private _active = true;
  
  // Runtime state
  private _connected = false;
  private _soloListeners: Array<(solo: boolean) => void> = [];
  private _muteListeners: Array<(mute: boolean) => void> = [];
  private _volumeListeners: Array<(volume: number) => void> = [];
  private _eventHandler?: RackEventHandler;

  // Processing buffers
  private _buffers: ChainBuffers;
  private _maxBlockSize: number;

  constructor(
    id: string,
    name: string,
    options?: {
      color?: string;
      zones?: ChainZones;
      mixer?: Partial<ChainMixer>;
      maxBlockSize?: number;
    }
  ) {
    this._id = id;
    this._name = name;
    this._color = options?.color;
    this._zones = new ChainZoneManager(options?.zones);
    this._mixer = { ...DEFAULT_MIXER, ...options?.mixer };
    this._maxBlockSize = options?.maxBlockSize ?? 128;
    
    this._buffers = {
      left: new Float32Array(this._maxBlockSize),
      right: new Float32Array(this._maxBlockSize),
      validSamples: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
    this._emitEvent({ type: "chainAdded", rackId: "", chainId: this._id });
  }

  get color(): string | undefined {
    return this._color;
  }

  set color(value: string | undefined) {
    this._color = value;
  }

  get zones(): ChainZoneManager {
    return this._zones;
  }

  get mixer(): ChainMixer {
    return { ...this._mixer };
  }

  get isActive(): boolean {
    return this._active && !this._mixer.mute;
  }

  get isMuted(): boolean {
    return this._mixer.mute;
  }

  get isSolo(): boolean {
    return this._mixer.solo;
  }

  get volume(): number {
    return this._mixer.volume;
  }

  set volume(value: number) {
    const oldValue = this._mixer.volume;
    this._mixer.volume = value;
    if (oldValue !== value) {
      this._notifyVolumeChanged(value);
    }
  }

  get pan(): number {
    return this._mixer.pan;
  }

  set pan(value: number) {
    this._mixer.pan = Math.max(-50, Math.min(50, value));
  }

  get sends(): SendSlot[] {
    return [...this._sends];
  }

  get outputTarget(): string | null {
    return this._outputTarget;
  }

  set outputTarget(target: string | null) {
    this._outputTarget = target;
  }

  get deviceCount(): number {
    return this._devices.length;
  }

  get devices(): ChainDevice[] {
    return [...this._devices];
  }

  // ---------------------------------------------------------------------------
  // Device Management
  // ---------------------------------------------------------------------------

  /**
   * Add a device to the chain
   */
  addDevice(device: ChainDevice, index?: number): void {
    const insertIndex = index ?? this._devices.length;
    this._devices.splice(insertIndex, 0, device);
    
    this._emitEvent({ 
      type: "deviceAdded", 
      rackId: "", 
      chainId: this._id, 
      deviceId: device.id 
    });
  }

  /**
   * Remove a device from the chain
   */
  removeDevice(deviceId: string): ChainDevice | undefined {
    const index = this._devices.findIndex(d => d.id === deviceId);
    if (index >= 0) {
      const [removed] = this._devices.splice(index, 1);
      
      // Dispose if connected
      if (this._connected && removed.instance) {
        void removed.instance.dispose();
      }
      
      this._emitEvent({ 
        type: "deviceRemoved", 
        rackId: "", 
        chainId: this._id, 
        deviceId 
      });
      
      return removed;
    }
    return undefined;
  }

  /**
   * Move a device within the chain
   */
  moveDevice(deviceId: string, newIndex: number): boolean {
    const oldIndex = this._devices.findIndex(d => d.id === deviceId);
    if (oldIndex < 0) return false;

    const [device] = this._devices.splice(oldIndex, 1);
    const clampedIndex = Math.max(0, Math.min(newIndex, this._devices.length));
    this._devices.splice(clampedIndex, 0, device);

    this._emitEvent({ 
      type: "deviceMoved", 
      rackId: "", 
      chainId: this._id, 
      deviceId 
    });

    return true;
  }

  /**
   * Get a device by ID
   */
  getDevice(deviceId: string): ChainDevice | undefined {
    return this._devices.find(d => d.id === deviceId);
  }

  /**
   * Replace a device
   */
  replaceDevice(deviceId: string, newDevice: ChainDevice): boolean {
    const index = this._devices.findIndex(d => d.id === deviceId);
    if (index < 0) return false;

    const oldDevice = this._devices[index];
    this._devices[index] = newDevice;

    if (this._connected && oldDevice.instance) {
      void oldDevice.instance.dispose();
    }

    this._emitEvent({ 
      type: "deviceAdded", 
      rackId: "", 
      chainId: this._id, 
      deviceId: newDevice.id 
    });

    return true;
  }

  /**
   * Toggle device bypass
   */
  toggleDeviceBypass(deviceId: string): boolean {
    const device = this._devices.find(d => d.id === deviceId);
    if (device) {
      device.bypassed = !device.bypassed;
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Zone Operations
  // ---------------------------------------------------------------------------

  /**
   * Evaluate zones for a given input context
   */
  evaluateZones(context: ChainSelectionContext): ZoneResult {
    return this._zones.evaluate(context);
  }

  /**
   * Check if this chain can be triggered
   */
  canTrigger(context: ChainSelectionContext): boolean {
    return this._zones.canTrigger(context);
  }

  /**
   * Reset zones to full range
   */
  resetZones(): void {
    this._zones.resetToFull();
    this._emitEvent({ 
      type: "zoneChanged", 
      rackId: "", 
      chainId: this._id 
    });
  }

  // ---------------------------------------------------------------------------
  // Mixer Operations
  // ---------------------------------------------------------------------------

  /**
   * Toggle mute
   */
  toggleMute(): boolean {
    this._mixer.mute = !this._mixer.mute;
    this._notifyMuteChanged(this._mixer.mute);
    this._emitEvent({ 
      type: "mixerChanged", 
      rackId: "", 
      chainId: this._id 
    });
    return this._mixer.mute;
  }

  /**
   * Toggle solo
   */
  toggleSolo(): boolean {
    this._mixer.solo = !this._mixer.solo;
    this._notifySoloChanged(this._mixer.solo);
    this._emitEvent({ 
      type: "soloChanged", 
      rackId: "", 
      chainId: this._id 
    });
    return this._mixer.solo;
  }

  /**
   * Set volume in dB
   */
  setVolumeDb(db: number): void {
    this.volume = db;
  }

  /**
   * Get volume as linear gain
   */
  getVolumeLinear(): number {
    if (this._mixer.volume <= -96) return 0;
    return Math.exp(this._mixer.volume * DB_TO_LINEAR_FACTOR);
  }

  /**
   * Calculate pan gains
   */
  getPanGains(): { left: number; right: number } {
    const panNorm = this._mixer.pan / 50; // -1 to 1
    const leftGain = panNorm <= 0 ? 1 : Math.cos((panNorm + 1) * Math.PI / 4);
    const rightGain = panNorm >= 0 ? 1 : Math.sin((panNorm + 1) * Math.PI / 4);
    return { left: leftGain, right: rightGain };
  }

  // ---------------------------------------------------------------------------
  // Send Management
  // ---------------------------------------------------------------------------

  /**
   * Add a send
   */
  addSend(send: SendSlot): void {
    this._sends.push(send);
  }

  /**
   * Remove a send
   */
  removeSend(sendId: string): boolean {
    const index = this._sends.findIndex(s => s.id === sendId);
    if (index >= 0) {
      this._sends.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Update send level
   */
  setSendLevel(sendId: string, level: number): boolean {
    const send = this._sends.find(s => s.id === sendId);
    if (send) {
      send.level = Math.max(0, Math.min(1, level));
      return true;
    }
    return false;
  }

  /**
   * Toggle send pre/post
   */
  toggleSendPrePost(sendId: string): boolean {
    const send = this._sends.find(s => s.id === sendId);
    if (send) {
      send.preFader = !send.preFader;
      return send.preFader;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Processing
  // ---------------------------------------------------------------------------

  /**
   * Process audio through the chain
   */
  process(
    inputs: AudioBuffer[],
    outputs: AudioBuffer[],
    midi: MidiEvent[],
    blockSize: number,
    zoneGain: number = 1
  ): void {
    if (!this.isActive || zoneGain <= 0) {
      // Output silence
      if (outputs.length > 0) {
        outputs[0].clear();
      }
      return;
    }

    // Get volume and pan gains
    const volumeGain = this.getVolumeLinear() * zoneGain;
    const { left: panLeft, right: panRight } = this.getPanGains();

    // Process through devices
    if (this._devices.length === 0) {
      // Pass-through
      this._passThrough(inputs, outputs, blockSize);
    } else {
      // Process through device chain
      this._processDevices(inputs, outputs, midi, blockSize);
    }

    // Apply mixer
    if (outputs.length > 0) {
      const leftOut = outputs[0].getChannelData(0);
      const rightOut = outputs[0].numberOfChannels > 1 
        ? outputs[0].getChannelData(1) 
        : leftOut;

      const finalLeftGain = volumeGain * panLeft;
      const finalRightGain = volumeGain * panRight;

      for (let i = 0; i < blockSize; i++) {
        leftOut[i] *= finalLeftGain;
        rightOut[i] *= finalRightGain;
      }

      // Update meter
      this._updateMeter(leftOut, rightOut, blockSize);
    }
  }

  private _passThrough(
    inputs: AudioBuffer[],
    outputs: AudioBuffer[],
    blockSize: number
  ): void {
    if (inputs.length === 0 || outputs.length === 0) return;

    const inL = inputs[0].getChannelData(0);
    const outL = outputs[0].getChannelData(0);
    
    outL.set(inL.subarray(0, blockSize));

    if (inputs[0].numberOfChannels > 1 && outputs[0].numberOfChannels > 1) {
      const inR = inputs[0].getChannelData(1);
      const outR = outputs[0].getChannelData(1);
      outR.set(inR.subarray(0, blockSize));
    }
  }

  private _processDevices(
    inputs: AudioBuffer[],
    outputs: AudioBuffer[],
    midi: MidiEvent[],
    blockSize: number
  ): void {
    // Simple serial processing
    // In a real implementation, this would manage intermediate buffers
    let currentInput = inputs;
    let currentOutput = outputs;

    for (const device of this._devices) {
      if (device.bypassed || !device.instance) continue;

      try {
        device.instance.process(currentInput, currentOutput, midi, blockSize);
        // Next device takes output of this one
        currentInput = currentOutput;
      } catch (error) {
        console.error(`Error processing device ${device.id}:`, error);
      }
    }
  }

  private _updateMeter(left: Float32Array, right: Float32Array, blockSize: number): void {
    let maxGain = 0;
    for (let i = 0; i < blockSize; i++) {
      const gain = Math.max(Math.abs(left[i]), Math.abs(right[i]));
      if (gain > maxGain) maxGain = gain;
    }
    this._mixer.meterGain = maxGain;
  }

  // ---------------------------------------------------------------------------
  // Event Handling
  // ---------------------------------------------------------------------------

  setEventHandler(handler: RackEventHandler): void {
    this._eventHandler = handler;
  }

  private _emitEvent(event: RackEvent): void {
    this._eventHandler?.(event);
  }

  onSoloChanged(callback: (solo: boolean) => void): () => void {
    this._soloListeners.push(callback);
    return () => {
      const index = this._soloListeners.indexOf(callback);
      if (index >= 0) this._soloListeners.splice(index, 1);
    };
  }

  onMuteChanged(callback: (mute: boolean) => void): () => void {
    this._muteListeners.push(callback);
    return () => {
      const index = this._muteListeners.indexOf(callback);
      if (index >= 0) this._muteListeners.splice(index, 1);
    };
  }

  onVolumeChanged(callback: (volume: number) => void): () => void {
    this._volumeListeners.push(callback);
    return () => {
      const index = this._volumeListeners.indexOf(callback);
      if (index >= 0) this._volumeListeners.splice(index, 1);
    };
  }

  private _notifySoloChanged(solo: boolean): void {
    for (const callback of this._soloListeners) {
      callback(solo);
    }
  }

  private _notifyMuteChanged(mute: boolean): void {
    for (const callback of this._muteListeners) {
      callback(mute);
    }
  }

  private _notifyVolumeChanged(volume: number): void {
    for (const callback of this._volumeListeners) {
      callback(volume);
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Prepare chain for processing
   */
  prepare(sampleRate: number, blockSize: number): void {
    this._maxBlockSize = Math.max(this._maxBlockSize, blockSize);
    
    // Resize buffers if needed
    if (this._buffers.left.length < blockSize) {
      this._buffers.left = new Float32Array(blockSize);
      this._buffers.right = new Float32Array(blockSize);
    }

    // Prepare all devices
    for (const device of this._devices) {
      if (device.instance) {
        device.instance.prepare({ sampleRate, blockSize, totalInputs: 2, totalOutputs: 2 });
      }
    }
  }

  /**
   * Connect chain
   */
  connect(): void {
    this._connected = true;
    // Connect devices
    for (const _device of this._devices) {
      // Device connection logic would go here
    }
  }

  /**
   * Disconnect chain
   */
  disconnect(): void {
    this._connected = false;
    for (const device of this._devices) {
      device.instance?.disconnect();
    }
  }

  /**
   * Reset chain state
   */
  reset(): void {
    for (const device of this._devices) {
      device.instance?.reset();
    }
    this._buffers.left.fill(0);
    this._buffers.right.fill(0);
    this._buffers.validSamples = 0;
  }

  /**
   * Dispose of chain resources
   */
  async dispose(): Promise<void> {
    this._connected = false;
    for (const device of this._devices) {
      if (device.instance) {
        await device.instance.dispose();
      }
    }
    this._devices = [];
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  toJSON(): RackChain {
    return {
      id: this._id,
      name: this._name,
      color: this._color,
      devices: this._devices.map(d => ({
        id: d.id,
        definition: d.definition,
        isRack: d.isRack,
        nestedRack: d.nestedRack,
        bypassed: d.bypassed,
        frozen: d.frozen,
      })),
      zones: this._zones.getZones(),
      mixer: this.mixer,
      sends: this._sends.length > 0 ? [...this._sends] : undefined,
      outputTarget: this._outputTarget,
      active: this._active,
    };
  }

  static fromJSON(data: RackChain, maxBlockSize?: number): Chain {
    const chain = new Chain(data.id, data.name, {
      color: data.color,
      zones: data.zones,
      mixer: data.mixer,
      maxBlockSize,
    });
    
    chain._devices = data.devices.map(d => ({ ...d }));
    chain._sends = data.sends ?? [];
    chain._outputTarget = data.outputTarget;
    chain._active = data.active;
    
    return chain;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate the effective chain gain considering solo states
 */
export function calculateSoloGain(
  chain: Chain,
  anySoloActive: boolean,
  isInSoloGroup: boolean
): number {
  if (chain.isMuted) return 0;
  
  if (anySoloActive) {
    // If this chain is soloed, or part of a soloed group, it passes
    if (chain.isSolo || isInSoloGroup) return 1;
    // Otherwise muted by solo
    return 0;
  }
  
  // No solo active, normal operation
  return 1;
}

/**
 * Find the effective output chains when solo is active
 */
export function findSoloedChains(chains: Chain[]): Set<string> {
  const soloed = new Set<string>();
  
  for (const chain of chains) {
    if (chain.isSolo) {
      soloed.add(chain.id);
    }
  }
  
  return soloed;
}
