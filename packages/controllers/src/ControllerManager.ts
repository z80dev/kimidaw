/**
 * Controller Manager
 * Manages MIDI controller connections and mappings
 */

import type {
  ControllerDevice,
  ControllerMapping,
  ControllerInput,
  MappingTarget,
  ValueTransform
} from './types.js';

export interface ControllerConnection {
  device: ControllerDevice;
  midiInput: WebMidi.MIDIInput;
  midiOutput?: WebMidi.MIDIOutput;
  isConnected: boolean;
  lastActivity: number;
}

export class ControllerManager {
  private controllers: Map<string, ControllerConnection> = new Map();
  private mappings: Map<string, ControllerMapping> = new Map();
  private onMessageCallbacks: Array<(deviceId: string, data: Uint8Array) => void> = [];

  /**
   * Initialize MIDI access
   */
  async initialize(): Promise<boolean> {
    try {
      const midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      
      // Listen for device connections
      midiAccess.onstatechange = (e) => {
        this.handleStateChange(e.port);
      };

      // Scan existing devices
      for (const input of midiAccess.inputs.values()) {
        this.scanDevice(input);
      }

      return true;
    } catch (err) {
      console.error('MIDI access denied:', err);
      return false;
    }
  }

  /**
   * Scan a MIDI device and create controller profile
   */
  private scanDevice(input: WebMidi.MIDIInput): void {
    const controller: ControllerDevice = {
      id: input.id,
      name: input.name || 'Unknown Controller',
      manufacturer: input.manufacturer || 'Unknown',
      type: 'midi',
      inputs: this.inferInputs(input),
      outputs: []
    };

    // Try to find matching output
    navigator.requestMIDIAccess().then(midiAccess => {
      for (const output of midiAccess.outputs.values()) {
        if (output.manufacturer === input.manufacturer) {
          controller.outputs.push({
            id: output.id,
            type: 'led',
            midiChannel: 1,
            midiNumber: 0,
            supportsColor: false
          });
        }
      }
    });

    const connection: ControllerConnection = {
      device: controller,
      midiInput: input,
      isConnected: input.state === 'connected',
      lastActivity: Date.now()
    };

    this.controllers.set(controller.id, connection);

    // Listen for messages
    input.onmidimessage = (event) => {
      this.handleMidiMessage(controller.id, event.data);
    };
  }

  /**
   * Infer controller inputs from device name
   */
  private inferInputs(input: WebMidi.MIDIInput): ControllerInput[] {
    const inputs: ControllerInput[] = [];
    const name = input.name.toLowerCase();

    // Detect common controller types
    if (name.includes('keyboard') || name.includes('key')) {
      // Piano keyboard - notes 0-127
      for (let i = 0; i < 128; i++) {
        inputs.push({
          id: `key_${i}`,
          type: 'keyboard',
          midiChannel: 1,
          midiNumber: i,
          midiType: 'note',
          minValue: 0,
          maxValue: 127,
          isRelative: false
        });
      }
    }

    if (name.includes('pad') || name.includes('drum')) {
      // Drum pads
      for (let i = 36; i < 52; i++) {
        inputs.push({
          id: `pad_${i}`,
          type: 'pad',
          midiChannel: 1,
          midiNumber: i,
          midiType: 'note',
          minValue: 0,
          maxValue: 127,
          isRelative: false
        });
      }
    }

    // Common encoders (CC 1-127)
    for (let i = 1; i < 128; i++) {
      inputs.push({
        id: `cc_${i}`,
        type: 'encoder',
        midiChannel: 1,
        midiNumber: i,
        midiType: 'cc',
        minValue: 0,
        maxValue: 127,
        isRelative: false
      });
    }

    return inputs;
  }

  /**
   * Handle MIDI state changes
   */
  private handleStateChange(port: WebMidi.MIDIPort): void {
    const connection = this.controllers.get(port.id);
    if (connection) {
      connection.isConnected = port.state === 'connected';
      if (connection.isConnected) {
        connection.lastActivity = Date.now();
      }
    }
  }

  /**
   * Handle incoming MIDI message
   */
  private handleMidiMessage(deviceId: string, data: Uint8Array): void {
    const connection = this.controllers.get(deviceId);
    if (connection) {
      connection.lastActivity = Date.now();
    }

    // Notify listeners
    for (const callback of this.onMessageCallbacks) {
      callback(deviceId, data);
    }

    // Process mappings
    this.processMappings(deviceId, data);
  }

  /**
   * Process controller mappings for incoming message
   */
  private processMappings(deviceId: string, data: Uint8Array): void {
    const status = data[0] & 0xF0;
    const channel = (data[0] & 0x0F) + 1;
    const number = data[1];
    const value = data[2];

    for (const mapping of this.mappings.values()) {
      if (mapping.controllerId !== deviceId) continue;

      const input = mapping.input;
      let matches = false;

      // Check if message matches input
      if (status === 0x90 || status === 0x80) { // Note on/off
        matches = input.midiType === 'note' && 
                  input.midiNumber === number &&
                  input.midiChannel === channel;
      } else if (status === 0xB0) { // CC
        matches = input.midiType === 'cc' && 
                  input.midiNumber === number &&
                  input.midiChannel === channel;
      } else if (status === 0xE0) { // Pitch bend
        matches = input.midiType === 'pitchbend';
      }

      if (matches) {
        this.executeMapping(mapping, value);
      }
    }
  }

  /**
   * Execute a controller mapping
   */
  private executeMapping(mapping: ControllerMapping, value: number): void {
    const transformedValue = this.transformValue(value, mapping.transform);
    
    // Dispatch to target
    this.dispatchToTarget(mapping.target, transformedValue);

    // Send feedback if enabled
    if (mapping.feedback) {
      this.sendFeedback(mapping, transformedValue);
    }
  }

  /**
   * Transform controller value
   */
  private transformValue(value: number, transform: ValueTransform): number {
    // Normalize to 0-1
    let normalized = (value - transform.inputMin) / (transform.inputMax - transform.inputMin);
    
    // Apply curve
    switch (transform.curve) {
      case 'log':
        normalized = Math.log10(normalized * 9 + 1);
        break;
      case 'exp':
        normalized = normalized * normalized;
        break;
    }
    
    // Invert if needed
    if (transform.invert) {
      normalized = 1 - normalized;
    }
    
    // Scale to output range
    return normalized * (transform.outputMax - transform.outputMin) + transform.outputMin;
  }

  /**
   * Dispatch to mapping target
   */
  private dispatchToTarget(target: MappingTarget, value: number): void {
    // In real implementation, dispatch to appropriate handler
    // based on target type
  }

  /**
   * Send feedback to controller
   */
  private sendFeedback(mapping: ControllerMapping, value: number): void {
    const connection = this.controllers.get(mapping.controllerId);
    if (!connection || !connection.midiOutput) return;

    // In real implementation, send LED update or motor fader position
  }

  /**
   * Register a controller
   */
  registerController(controller: ControllerDevice): void {
    // Check if already connected
    const existing = this.controllers.get(controller.id);
    if (existing) {
      existing.device = controller;
    }
  }

  /**
   * Unregister a controller
   */
  unregisterController(controllerId: string): void {
    this.controllers.delete(controllerId);
    
    // Remove associated mappings
    for (const [id, mapping] of this.mappings.entries()) {
      if (mapping.controllerId === controllerId) {
        this.mappings.delete(id);
      }
    }
  }

  /**
   * Add a controller mapping
   */
  addMapping(mapping: ControllerMapping): void {
    this.mappings.set(mapping.id, mapping);
  }

  /**
   * Remove a controller mapping
   */
  removeMapping(mappingId: string): boolean {
    return this.mappings.delete(mappingId);
  }

  /**
   * Get all connected controllers
   */
  getConnectedControllers(): ControllerConnection[] {
    return Array.from(this.controllers.values())
      .filter(c => c.isConnected);
  }

  /**
   * Get all controllers
   */
  getAllControllers(): ControllerConnection[] {
    return Array.from(this.controllers.values());
  }

  /**
   * Get controller by ID
   */
  getController(id: string): ControllerConnection | undefined {
    return this.controllers.get(id);
  }

  /**
   * Get mappings for a controller
   */
  getMappings(controllerId: string): ControllerMapping[] {
    return Array.from(this.mappings.values())
      .filter(m => m.controllerId === controllerId);
  }

  /**
   * Subscribe to MIDI messages
   */
  onMidiMessage(callback: (deviceId: string, data: Uint8Array) => void): () => void {
    this.onMessageCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.onMessageCallbacks.indexOf(callback);
      if (index > -1) {
        this.onMessageCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Send MIDI message to controller
   */
  sendMidi(controllerId: string, data: Uint8Array): boolean {
    const connection = this.controllers.get(controllerId);
    if (!connection || !connection.midiOutput) return false;

    connection.midiOutput.send(data);
    return true;
  }
}
