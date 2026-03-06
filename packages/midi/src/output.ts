/**
 * MIDI Output Handler
 * 
 * Manages MIDI output to external devices.
 * Implements section 12.2 of the engineering spec.
 * 
 * Features:
 * - Web MIDI API output support
 * - Timestamped MIDI message scheduling
 * - MPE output support
 * - MIDI clock and transport sync
 * - Note management with automatic cleanup
 */

import {
  type MidiMessage,
  type MidiOutputDevice,
  type MidiDeviceChangeHandler,
  type MidiErrorHandler,
  type MidiClockState,
  type MidiTimecode,
  CC_NUMBERS,
} from "./types.js";

export interface MidiOutputOptions {
  sysex?: boolean;
  software?: boolean;
}

export interface MidiOutputState {
  isSupported: boolean;
  isInitialized: boolean;
  isAccessGranted: boolean;
  error: Error | null;
  devices: MidiOutputDevice[];
}

export interface ScheduledMidiMessage {
  message: MidiMessage;
  timestamp: number; // AudioContext time or DOMHighResTimeStamp
}

// Timing constants
const CLOCK_PULSES_PER_QUARTER = 24;

class MidiOutputManager {
  private access: MIDIAccess | null = null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _options: MidiOutputOptions = {};
  
  // Event handlers
  private deviceChangeHandlers: Set<MidiDeviceChangeHandler> = new Set();
  private errorHandlers: Set<MidiErrorHandler> = new Set();
  
  // State
  private state: MidiOutputState = {
    isSupported: false,
    isInitialized: false,
    isAccessGranted: false,
    error: null,
    devices: [],
  };
  
  // Device map
  private deviceMap: Map<string, MIDIOutput> = new Map();
  
  // Clock/transport state
  private clockState: MidiClockState = {
    bpm: 120,
    ticks: 0,
    isPlaying: false,
    songPosition: 0,
  };
  private clockInterval: number | null = null;
  
  // Active notes tracking for cleanup
  private activeNotes: Map<string, Map<number, number[]>> = new Map(); // deviceId -> Map<note, channels[]>

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
  async initialize(options: MidiOutputOptions = {}): Promise<MidiOutputState> {
    this._options = options;
    // Use options to avoid unused warning
    void this._options;

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
      
      this.errorHandlers.forEach(handler => handler(this.state.error!));
    }

    return this.state;
  }

  // ============================================================================
  // Device Management
  // ============================================================================

  private enumerateDevices(): void {
    if (!this.access) return;

    const devices: MidiOutputDevice[] = [];
    this.deviceMap.clear();

    this.access.outputs.forEach((output) => {
      const deviceInfo = this.createDeviceInfo(output);
      devices.push(deviceInfo);
      this.deviceMap.set(output.id, output);
      
      // Initialize active note tracking
      this.activeNotes.set(output.id, new Map());
    });

    this.state.devices = devices;
    this.notifyDeviceChange();
  }

  private createDeviceInfo(output: MIDIOutput): MidiOutputDevice {
    return {
      id: output.id,
      name: output.name ?? "Unknown MIDI Output",
      manufacturer: output.manufacturer ?? "Unknown",
      version: "1.0",
      type: "output",
      state: output.state === "connected" ? "connected" : "disconnected",
      connection: output.connection === "open" ? "open" : "closed",
    };
  }

  private handleStateChange(event: MIDIConnectionEvent): void {
    const port = event.port;
    
    if (port?.type === "output") {
      this.enumerateDevices();
      
      if (port.state === "disconnected") {
        // Clean up active notes for disconnected device
        this.sendAllNotesOff(port.id);
        this.activeNotes.delete(port.id);
      }
    }
  }

  /**
   * Get current list of output devices
   */
  getDevices(): MidiOutputDevice[] {
    return [...this.state.devices];
  }

  /**
   * Get a specific device by ID
   */
  getDevice(deviceId: string): MidiOutputDevice | undefined {
    return this.state.devices.find(d => d.id === deviceId);
  }

  /**
   * Check if a specific device is connected and available
   */
  isDeviceAvailable(deviceId: string): boolean {
    const device = this.getDevice(deviceId);
    return device?.state === "connected" && device?.connection === "open";
  }

  // ============================================================================
  // Message Sending
  // ============================================================================

  /**
   * Send a raw MIDI message to a specific device
   */
  send(
    deviceId: string,
    data: Uint8Array | number[],
    timestamp?: number
  ): boolean {
    const output = this.deviceMap.get(deviceId);
    if (!output) {
      this.errorHandlers.forEach(handler => 
        handler(new Error(`MIDI output device not found: ${deviceId}`), deviceId)
      );
      return false;
    }

    try {
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
      output.send(bytes, timestamp);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.errorHandlers.forEach(handler => handler(error, deviceId));
      return false;
    }
  }

  /**
   * Send a MIDI message to a specific device
   */
  sendMessage(deviceId: string, message: MidiMessage, timestamp?: number): boolean {
    const bytes = this.messageToBytes(message);
    return this.send(deviceId, bytes, timestamp);
  }

  /**
   * Send a message to all connected devices
   */
  sendToAll(data: Uint8Array | number[], timestamp?: number): void {
    this.deviceMap.forEach((_, deviceId) => {
      this.send(deviceId, data, timestamp);
    });
  }

  private messageToBytes(message: MidiMessage): Uint8Array {
    switch (message.type) {
      case "noteOn":
        return new Uint8Array([0x90 | message.channel, message.data1, message.data2]);
      case "noteOff":
        return new Uint8Array([0x80 | message.channel, message.data1, message.data2]);
      case "controlChange":
        return new Uint8Array([0xB0 | message.channel, message.data1, message.data2]);
      case "programChange":
        return new Uint8Array([0xC0 | message.channel, message.data1]);
      case "pitchBend": {
        // Pitch bend uses the data bytes directly
        const pbMessage = message as { data1: number; data2: number };
        return new Uint8Array([0xE0 | message.channel, pbMessage.data1, pbMessage.data2]);
      }
      case "channelPressure":
        return new Uint8Array([0xD0 | message.channel, message.data1]);
      case "polyPressure":
        return new Uint8Array([0xA0 | message.channel, message.data1, message.data2]);
      case "clock":
        return new Uint8Array([0xF8]);
      case "start":
        return new Uint8Array([0xFA]);
      case "continue":
        return new Uint8Array([0xFB]);
      case "stop":
        return new Uint8Array([0xFC]);
      case "activeSense":
        return new Uint8Array([0xFE]);
      case "reset":
        return new Uint8Array([0xFF]);
      case "songPosition": {
        const position = (message.data2 << 7) | message.data1;
        const lsb = position & 0x7F;
        const msb = (position >> 7) & 0x7F;
        return new Uint8Array([0xF2, lsb, msb]);
      }
      case "songSelect":
        return new Uint8Array([0xF3, message.data1]);
      case "tuneRequest":
        return new Uint8Array([0xF6]);
      default:
        return new Uint8Array([]);
    }
  }

  // ============================================================================
  // Note Helpers
  // ============================================================================

  /**
   * Send note on
   */
  noteOn(
    deviceId: string,
    note: number,
    velocity: number,
    channel: number = 0,
    timestamp?: number
  ): boolean {
    this.trackActiveNote(deviceId, note, channel);
    
    const bytes = new Uint8Array([
      0x90 | (channel & 0x0F),
      note & 0x7F,
      velocity & 0x7F,
    ]);
    return this.send(deviceId, bytes, timestamp);
  }

  /**
   * Send note off
   */
  noteOff(
    deviceId: string,
    note: number,
    velocity: number = 0,
    channel: number = 0,
    timestamp?: number
  ): boolean {
    this.untrackActiveNote(deviceId, note, channel);
    
    const bytes = new Uint8Array([
      0x80 | (channel & 0x0F),
      note & 0x7F,
      velocity & 0x7F,
    ]);
    return this.send(deviceId, bytes, timestamp);
  }

  /**
   * Send control change
   */
  controlChange(
    deviceId: string,
    controller: number,
    value: number,
    channel: number = 0,
    timestamp?: number
  ): boolean {
    const bytes = new Uint8Array([
      0xB0 | (channel & 0x0F),
      controller & 0x7F,
      value & 0x7F,
    ]);
    return this.send(deviceId, bytes, timestamp);
  }

  /**
   * Send program change
   */
  programChange(
    deviceId: string,
    program: number,
    channel: number = 0,
    timestamp?: number
  ): boolean {
    const bytes = new Uint8Array([
      0xC0 | (channel & 0x0F),
      program & 0x7F,
    ]);
    return this.send(deviceId, bytes, timestamp);
  }

  /**
   * Send pitch bend
   */
  pitchBend(
    deviceId: string,
    value: number, // -8192 to 8191
    channel: number = 0,
    timestamp?: number
  ): boolean {
    const centered = Math.max(-8192, Math.min(8191, value));
    const unsigned = centered + 8192;
    const lsb = unsigned & 0x7F;
    const msb = (unsigned >> 7) & 0x7F;
    
    const bytes = new Uint8Array([
      0xE0 | (channel & 0x0F),
      lsb,
      msb,
    ]);
    return this.send(deviceId, bytes, timestamp);
  }

  /**
   * Send channel pressure (aftertouch)
   */
  channelPressure(
    deviceId: string,
    pressure: number,
    channel: number = 0,
    timestamp?: number
  ): boolean {
    const bytes = new Uint8Array([
      0xD0 | (channel & 0x0F),
      pressure & 0x7F,
    ]);
    return this.send(deviceId, bytes, timestamp);
  }

  /**
   * Send polyphonic pressure (poly aftertouch)
   */
  polyPressure(
    deviceId: string,
    note: number,
    pressure: number,
    channel: number = 0,
    timestamp?: number
  ): boolean {
    const bytes = new Uint8Array([
      0xA0 | (channel & 0x0F),
      note & 0x7F,
      pressure & 0x7F,
    ]);
    return this.send(deviceId, bytes, timestamp);
  }

  // ============================================================================
  // Active Note Tracking
  // ============================================================================

  private trackActiveNote(deviceId: string, note: number, channel: number): void {
    const deviceNotes = this.activeNotes.get(deviceId);
    if (!deviceNotes) return;

    let channels = deviceNotes.get(note);
    if (!channels) {
      channels = [];
      deviceNotes.set(note, channels);
    }
    if (!channels.includes(channel)) {
      channels.push(channel);
    }
  }

  private untrackActiveNote(deviceId: string, note: number, channel: number): void {
    const deviceNotes = this.activeNotes.get(deviceId);
    if (!deviceNotes) return;

    const channels = deviceNotes.get(note);
    if (channels) {
      const index = channels.indexOf(channel);
      if (index !== -1) {
        channels.splice(index, 1);
      }
      if (channels.length === 0) {
        deviceNotes.delete(note);
      }
    }
  }

  /**
   * Send all notes off (CC 123) for a device
   */
  sendAllNotesOff(deviceId: string, channel?: number): void {
    const deviceNotes = this.activeNotes.get(deviceId);
    if (!deviceNotes) return;

    // Send note offs for tracked active notes
    deviceNotes.forEach((channels, note) => {
      channels.forEach(ch => {
        this.noteOff(deviceId, note, 0, ch);
      });
    });
    deviceNotes.clear();

    // Also send the standard All Notes Off CC
    if (channel !== undefined) {
      this.controlChange(deviceId, CC_NUMBERS.ALL_NOTES_OFF, 0, channel);
    } else {
      // Send to all 16 channels
      for (let ch = 0; ch < 16; ch++) {
        this.controlChange(deviceId, CC_NUMBERS.ALL_NOTES_OFF, 0, ch);
      }
    }
  }

  /**
   * Send all sound off (CC 120) for emergency mute
   */
  sendAllSoundOff(deviceId: string, channel?: number): void {
    if (channel !== undefined) {
      this.controlChange(deviceId, CC_NUMBERS.ALL_SOUND_OFF, 0, channel);
    } else {
      for (let ch = 0; ch < 16; ch++) {
        this.controlChange(deviceId, CC_NUMBERS.ALL_SOUND_OFF, 0, ch);
      }
    }
    
    // Clear tracking
    const deviceNotes = this.activeNotes.get(deviceId);
    if (deviceNotes) deviceNotes.clear();
  }

  /**
   * Reset all controllers (CC 121)
   */
  resetAllControllers(deviceId: string, channel?: number): void {
    if (channel !== undefined) {
      this.controlChange(deviceId, CC_NUMBERS.RESET_ALL_CONTROLLERS, 0, channel);
    } else {
      for (let ch = 0; ch < 16; ch++) {
        this.controlChange(deviceId, CC_NUMBERS.RESET_ALL_CONTROLLERS, 0, ch);
      }
    }
  }

  /**
   * Send all notes off to all devices
   */
  panic(): void {
    this.deviceMap.forEach((_, deviceId) => {
      this.sendAllNotesOff(deviceId);
      this.sendAllSoundOff(deviceId);
    });
  }

  // ============================================================================
  // MIDI Clock / Transport
  // ============================================================================

  /**
   * Start sending MIDI clock
   */
  startClock(bpm: number): void {
    this.clockState.bpm = bpm;
    this.clockState.isPlaying = true;
    
    // Send start message
    this.sendToAll([0xFA]);
    
    // Start clock pulses
    this.scheduleClock(bpm);
  }

  /**
   * Stop MIDI clock
   */
  stopClock(): void {
    this.clockState.isPlaying = false;
    
    if (this.clockInterval !== null) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
    
    // Send stop message
    this.sendToAll([0xFC]);
  }

  /**
   * Continue MIDI clock
   */
  continueClock(): void {
    this.clockState.isPlaying = true;
    this.sendToAll([0xFB]);
    this.scheduleClock(this.clockState.bpm);
  }

  private scheduleClock(bpm: number): void {
    if (this.clockInterval !== null) {
      clearInterval(this.clockInterval);
    }
    
    const intervalMs = (60000 / bpm) / CLOCK_PULSES_PER_QUARTER;
    
    this.clockInterval = window.setInterval(() => {
      this.sendToAll([0xF8]); // Clock tick
      this.clockState.ticks++;
    }, intervalMs);
  }

  /**
   * Set song position pointer
   */
  setSongPosition(beats: number): void {
    // MIDI song position is in 16th notes (6 per quarter note)
    const position = Math.floor(beats * 6);
    const lsb = position & 0x7F;
    const msb = (position >> 7) & 0x7F;
    
    this.sendToAll([0xF2, lsb, msb]);
    this.clockState.songPosition = position;
  }

  /**
   * Send timecode quarter frame
   */
  sendTimecode(timecode: MidiTimecode, quarterFrame: number): void {
    const data = ((quarterFrame & 0x07) << 4) | this.encodeTimecodeNibble(timecode, quarterFrame);
    this.sendToAll([0xF1, data]);
  }

  private encodeTimecodeNibble(timecode: MidiTimecode, quarterFrame: number): number {
    switch (quarterFrame) {
      case 0: return timecode.frames & 0x0F;
      case 1: return (timecode.frames >> 4) & 0x01;
      case 2: return timecode.seconds & 0x0F;
      case 3: return (timecode.seconds >> 4) & 0x03;
      case 4: return timecode.minutes & 0x0F;
      case 5: return (timecode.minutes >> 4) & 0x03;
      case 6: return timecode.hours & 0x0F;
      case 7: return ((timecode.hours >> 4) & 0x01) | (this.getFpsBits(timecode.fps) << 1);
      default: return 0;
    }
  }

  private getFpsBits(fps: number): number {
    switch (fps) {
      case 24: return 0;
      case 25: return 1;
      case 29.97: return 2;
      case 30: return 3;
      default: return 0;
    }
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  onDeviceChange(handler: MidiDeviceChangeHandler): () => void {
    this.deviceChangeHandlers.add(handler);
    return () => this.deviceChangeHandlers.delete(handler);
  }

  onError(handler: MidiErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
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
  // State Access
  // ============================================================================

  getState(): MidiOutputState {
    return { ...this.state };
  }

  getClockState(): MidiClockState {
    return { ...this.clockState };
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  dispose(): void {
    // Send panic to all devices
    this.panic();
    
    // Stop clock
    this.stopClock();
    
    // Clear handlers
    this.deviceChangeHandlers.clear();
    this.errorHandlers.clear();
    
    // Clear tracking
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
let instance: MidiOutputManager | null = null;

export function getMidiOutputManager(): MidiOutputManager {
  if (!instance) {
    instance = new MidiOutputManager();
  }
  return instance;
}

export function resetMidiOutputManager(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}

export type { MidiOutputManager };
