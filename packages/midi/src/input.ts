/**
 * MIDI Input Handler
 * 
 * Manages Web MIDI API access, device enumeration, and message handling.
 * Implements section 12.1 of the engineering spec.
 * 
 * Features:
 * - Web MIDI API integration with graceful fallback
 * - Device connection/disconnection handling
 * - MIDI message parsing and normalization
 * - Multiple handler support (note on/off, CC, pitch bend, etc.)
 * - SysEx support (with permission)
 * - MPE input support
 * - Timestamp synchronization with AudioContext
 */

import {
  type MidiMessage,
  type MidiInputDevice,
  type MidiMessageHandler,
  type MidiDeviceChangeHandler,
  type MidiErrorHandler,
  type NoteOnMessage,
  type NoteOffMessage,
  type ControlChangeMessage,
  type PitchBendMessage,
  type ChannelPressureMessage,
  type PolyPressureMessage,
  type ProgramChangeMessage,
} from "./types.js";

export interface MidiInputOptions {
  sysex?: boolean;
  software?: boolean;
  audioContext?: AudioContext;
}

export interface MidiInputState {
  isSupported: boolean;
  isInitialized: boolean;
  isAccessGranted: boolean;
  error: Error | null;
  devices: MidiInputDevice[];
}

// MIDI message status bytes
const STATUS = {
  NOTE_OFF: 0x80,
  NOTE_ON: 0x90,
  POLY_PRESSURE: 0xA0,
  CONTROL_CHANGE: 0xB0,
  PROGRAM_CHANGE: 0xC0,
  CHANNEL_PRESSURE: 0xD0,
  PITCH_BEND: 0xE0,
  SYSEX: 0xF0,
  TIME_CODE: 0xF1,
  SONG_POSITION: 0xF2,
  SONG_SELECT: 0xF3,
  TUNE_REQUEST: 0xF6,
  SYSEX_END: 0xF7,
  CLOCK: 0xF8,
  START: 0xFA,
  CONTINUE: 0xFB,
  STOP: 0xFC,
  ACTIVE_SENSE: 0xFE,
  RESET: 0xFF,
} as const;

class MidiInputManager {
  private access: MIDIAccess | null = null;
  private audioContext: AudioContext | null = null;
  private options: MidiInputOptions = {};
  
  // Event handlers
  private messageHandlers: Set<MidiMessageHandler> = new Set();
  private deviceChangeHandlers: Set<MidiDeviceChangeHandler> = new Set();
  private errorHandlers: Set<MidiErrorHandler> = new Set();
  
  // State
  private state: MidiInputState = {
    isSupported: false,
    isInitialized: false,
    isAccessGranted: false,
    error: null,
    devices: [],
  };
  
  // Device map for tracking connections
  private deviceMap: Map<string, MIDIInput> = new Map();
  
  // Active note tracking for note-off safety
  private activeNotes: Map<string, Set<number>> = new Map(); // deviceId -> Set of active notes

  constructor() {
    this.checkSupport();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private checkSupport(): void {
    if (typeof window === "undefined") return;
    this.state.isSupported = "requestMIDIAccess" in navigator;
  }

  /**
   * Initialize MIDI access
   */
  async initialize(options: MidiInputOptions = {}): Promise<MidiInputState> {
    this.options = options;
    this.audioContext = options.audioContext ?? null;

    if (!this.state.isSupported) {
      this.state.error = new Error("Web MIDI API not supported in this browser");
      return this.state;
    }

    try {
      this.access = await navigator.requestMIDIAccess({
        sysex: options.sysex ?? false,
        software: options.software ?? false,
      });

      this.state.isInitialized = true;
      this.state.isAccessGranted = true;
      this.state.error = null;

      // Set up device change listener
      this.access.onstatechange = this.handleStateChange.bind(this);

      // Enumerate initial devices
      this.enumerateDevices();
    } catch (err) {
      this.state.error = err instanceof Error ? err : new Error(String(err));
      this.state.isAccessGranted = false;
      
      // Notify error handlers
      this.errorHandlers.forEach(handler => handler(this.state.error!));
    }

    return this.state;
  }

  /**
   * Request MIDI access with user permission prompt
   */
  async requestAccess(): Promise<boolean> {
    if (!this.state.isSupported) return false;
    
    const state = await this.initialize(this.options);
    return state.isAccessGranted;
  }

  // ============================================================================
  // Device Management
  // ============================================================================

  private enumerateDevices(): void {
    if (!this.access) return;

    const devices: MidiInputDevice[] = [];
    this.deviceMap.clear();

    this.access.inputs.forEach((input) => {
      const deviceInfo = this.createDeviceInfo(input);
      devices.push(deviceInfo);
      this.deviceMap.set(input.id, input);

      // Set up message handler
      input.onmidimessage = this.handleMidiMessage.bind(this);
      
      // Initialize active note tracking
      this.activeNotes.set(input.id, new Set());
    });

    this.state.devices = devices;
    this.notifyDeviceChange();
  }

  private createDeviceInfo(input: MIDIInput): MidiInputDevice {
    return {
      id: input.id,
      name: input.name ?? "Unknown MIDI Input",
      manufacturer: input.manufacturer ?? "Unknown",
      version: "1.0", // Web MIDI doesn't expose version
      type: "input",
      state: input.state === "connected" ? "connected" : "disconnected",
      connection: input.connection === "open" ? "open" : "closed",
    };
  }

  private handleStateChange(event: MIDIConnectionEvent): void {
    const port = event.port;
    
    if (!port) return;
    
    if (port.type === "input") {
      this.enumerateDevices();
      
      if (port.state === "connected" && port.connection === "open") {
        const input = port as MIDIInput;
        input.onmidimessage = this.handleMidiMessage.bind(this);
        this.activeNotes.set(port.id, new Set());
      } else if (port.state === "disconnected") {
        // Clean up active notes for disconnected device
        this.sendAllNotesOff(port.id);
        this.activeNotes.delete(port.id);
      }
    }
  }

  /**
   * Get current list of input devices
   */
  getDevices(): MidiInputDevice[] {
    return [...this.state.devices];
  }

  /**
   * Get a specific device by ID
   */
  getDevice(deviceId: string): MidiInputDevice | undefined {
    return this.state.devices.find(d => d.id === deviceId);
  }

  /**
   * Check if a specific device is connected
   */
  isDeviceConnected(deviceId: string): boolean {
    const device = this.getDevice(deviceId);
    return device?.state === "connected" && device?.connection === "open";
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  private handleMidiMessage(event: MIDIMessageEvent): void {
    const input = event.target as MIDIInput;
    const data = event.data;
    
    if (!data || data.length === 0) return;

    const status = data[0];
    const timestamp = this.getTimestamp(event.timeStamp);
    
    try {
      const message = this.parseMessage(status, data, timestamp, input.id);
      if (message) {
        this.trackActiveNotes(message, input.id);
        this.notifyMessageHandlers(message);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.errorHandlers.forEach(handler => handler(error, input.id));
    }
  }

  private getTimestamp(eventTimeStamp: number): number {
    // Prefer AudioContext time for sync with audio engine
    if (this.audioContext) {
      return this.audioContext.currentTime;
    }
    // Fall back to performance.now() in milliseconds, convert to seconds
    return eventTimeStamp / 1000;
  }

  private parseMessage(
    status: number,
    data: Uint8Array,
    timestamp: number,
    deviceId: string
  ): MidiMessage | null {
    const messageType = status & 0xF0;
    const channel = status & 0x0F;
    const data1 = data[1] ?? 0;
    const data2 = data[2] ?? 0;

    // System messages (status >= 0xF0)
    if (status >= 0xF0) {
      return this.parseSystemMessage(status, data, timestamp, deviceId);
    }

    // Channel messages
    switch (messageType) {
      case STATUS.NOTE_OFF:
        return {
          type: "noteOff",
          channel,
          data1,
          data2,
          timestamp,
          deviceId,
          note: data1,
          velocity: data2,
        } as NoteOffMessage;

      case STATUS.NOTE_ON:
        // Note on with velocity 0 is treated as note off
        if (data2 === 0) {
          return {
            type: "noteOff",
            channel,
            data1,
            data2,
            timestamp,
            deviceId,
            note: data1,
            velocity: data2,
          } as NoteOffMessage;
        }
        return {
          type: "noteOn",
          channel,
          data1,
          data2,
          timestamp,
          deviceId,
          note: data1,
          velocity: data2,
        } as NoteOnMessage;

      case STATUS.POLY_PRESSURE:
        return {
          type: "polyPressure",
          channel,
          data1,
          data2,
          timestamp,
          deviceId,
          note: data1,
          pressure: data2,
        } as PolyPressureMessage;

      case STATUS.CONTROL_CHANGE:
        return {
          type: "controlChange",
          channel,
          data1,
          data2,
          timestamp,
          deviceId,
          controller: data1,
          value: data2,
        } as ControlChangeMessage;

      case STATUS.PROGRAM_CHANGE:
        return {
          type: "programChange",
          channel,
          data1,
          data2,
          timestamp,
          deviceId,
          program: data1,
        } as ProgramChangeMessage;

      case STATUS.CHANNEL_PRESSURE:
        return {
          type: "channelPressure",
          channel,
          data1,
          data2,
          timestamp,
          deviceId,
          pressure: data1,
        } as ChannelPressureMessage;

      case STATUS.PITCH_BEND:
        // Pitch bend is 14-bit value (LSB + MSB)
        const value = (data2 << 7) | data1;
        const centered = value - 8192; // Center at 0 (-8192 to +8191)
        return {
          type: "pitchBend",
          channel,
          data1,
          data2,
          timestamp,
          deviceId,
          value: centered,
        } as PitchBendMessage;

      default:
        return null;
    }
  }

  private parseSystemMessage(
    status: number,
    data: Uint8Array,
    timestamp: number,
    deviceId: string
  ): MidiMessage | null {
    switch (status) {
      case STATUS.SYSEX:
        return {
          type: "sysex",
          channel: 0,
          data1: 0,
          data2: 0,
          timestamp,
          deviceId,
        };

      case STATUS.TIME_CODE:
        return {
          type: "timecode",
          channel: 0,
          data1: data[1] ?? 0,
          data2: 0,
          timestamp,
          deviceId,
        };

      case STATUS.SONG_POSITION:
        const position = ((data[2] ?? 0) << 7) | (data[1] ?? 0);
        return {
          type: "songPosition",
          channel: 0,
          data1: position & 0x7F,
          data2: (position >> 7) & 0x7F,
          timestamp,
          deviceId,
        };

      case STATUS.SONG_SELECT:
        return {
          type: "songSelect",
          channel: 0,
          data1: data[1] ?? 0,
          data2: 0,
          timestamp,
          deviceId,
        };

      case STATUS.TUNE_REQUEST:
        return {
          type: "tuneRequest",
          channel: 0,
          data1: 0,
          data2: 0,
          timestamp,
          deviceId,
        };

      case STATUS.CLOCK:
        return {
          type: "clock",
          channel: 0,
          data1: 0,
          data2: 0,
          timestamp,
          deviceId,
        };

      case STATUS.START:
        return {
          type: "start",
          channel: 0,
          data1: 0,
          data2: 0,
          timestamp,
          deviceId,
        };

      case STATUS.CONTINUE:
        return {
          type: "continue",
          channel: 0,
          data1: 0,
          data2: 0,
          timestamp,
          deviceId,
        };

      case STATUS.STOP:
        return {
          type: "stop",
          channel: 0,
          data1: 0,
          data2: 0,
          timestamp,
          deviceId,
        };

      case STATUS.ACTIVE_SENSE:
        return {
          type: "activeSense",
          channel: 0,
          data1: 0,
          data2: 0,
          timestamp,
          deviceId,
        };

      case STATUS.RESET:
        return {
          type: "reset",
          channel: 0,
          data1: 0,
          data2: 0,
          timestamp,
          deviceId,
        };

      default:
        return null;
    }
  }

  private trackActiveNotes(message: MidiMessage, deviceId: string): void {
    const active = this.activeNotes.get(deviceId);
    if (!active) return;

    if (message.type === "noteOn") {
      active.add((message as NoteOnMessage).note);
    } else if (message.type === "noteOff") {
      active.delete((message as NoteOffMessage).note);
    }
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  /**
   * Subscribe to all MIDI messages
   */
  onMessage(handler: MidiMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to device connection changes
   */
  onDeviceChange(handler: MidiDeviceChangeHandler): () => void {
    this.deviceChangeHandlers.add(handler);
    return () => this.deviceChangeHandlers.delete(handler);
  }

  /**
   * Subscribe to errors
   */
  onError(handler: MidiErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  private notifyMessageHandlers(message: MidiMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (err) {
        console.error("MIDI message handler error:", err);
      }
    });
  }

  private notifyDeviceChange(): void {
    this.deviceChangeHandlers.forEach(handler => {
      try {
        handler(this.state.devices);
      } catch (err) {
        console.error("MIDI device change handler error:", err);
      }
    });
  }

  // ============================================================================
  // Safety / Cleanup
  // ============================================================================

  /**
   * Send all notes off for a specific device or all devices
   */
  sendAllNotesOff(deviceId?: string): void {
    const deviceIds = deviceId ? [deviceId] : Array.from(this.activeNotes.keys());
    
    for (const id of deviceIds) {
      const active = this.activeNotes.get(id);
      if (active) {
        // Notify handlers with synthetic note-off messages
        active.forEach(note => {
          const message: NoteOffMessage = {
            type: "noteOff",
            channel: 0,
            data1: note,
            data2: 0,
            timestamp: this.getTimestamp(performance.now()),
            deviceId: id,
            note,
            velocity: 0,
          };
          this.notifyMessageHandlers(message);
        });
        active.clear();
      }
    }
  }

  /**
   * Send all sound off (CC 120) for emergency mute
   */
  sendAllSoundOff(deviceId?: string): void {
    // This would be sent to outputs, inputs don't receive commands
    // But we can clear active notes state
    this.sendAllNotesOff(deviceId);
  }

  /**
   * Reset all controllers (CC 121)
   */
  resetAllControllers(deviceId?: string): void {
    // Clear active notes state
    this.sendAllNotesOff(deviceId);
  }

  /**
   * Get currently active notes for a device
   */
  getActiveNotes(deviceId: string): number[] {
    const active = this.activeNotes.get(deviceId);
    return active ? Array.from(active) : [];
  }

  // ============================================================================
  // State Access
  // ============================================================================

  getState(): MidiInputState {
    return { ...this.state };
  }

  isSupported(): boolean {
    return this.state.isSupported;
  }

  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up all resources
   */
  dispose(): void {
    // Send all notes off before disposing
    this.sendAllNotesOff();

    // Clear handlers
    this.messageHandlers.clear();
    this.deviceChangeHandlers.clear();
    this.errorHandlers.clear();

    // Clear device tracking
    this.activeNotes.clear();
    this.deviceMap.clear();

    // Remove access listener
    if (this.access) {
      this.access.onstatechange = null;
      this.access = null;
    }

    // Reset state
    this.state = {
      isSupported: this.state.isSupported,
      isInitialized: false,
      isAccessGranted: false,
      error: null,
      devices: [],
    };
  }
}

// Singleton instance
let instance: MidiInputManager | null = null;

/**
 * Get the singleton MIDI input manager instance
 */
export function getMidiInputManager(): MidiInputManager {
  if (!instance) {
    instance = new MidiInputManager();
  }
  return instance;
}

/**
 * Reset the singleton (mainly for testing)
 */
export function resetMidiInputManager(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}

// Re-export types
export type { MidiInputManager };
