/**
 * MPE (MIDI Polyphonic Expression) Support
 * 
 * Implements MPE specification for per-note pitch bend, pressure, and timbre.
 * 
 * Features:
 * - MPE zone configuration (lower/upper zones)
 * - Per-note pitch bend, pressure, and timbre
 * - Channel rotation for note allocation
 * - Legacy mode compatibility
 * - Bidirectional MPE message handling
 * 
 * MPE uses:
 * - Master channel (1 or 16) for global messages
 * - Member channels (2-15) for per-note expression
 * - Per-note pitch bend range (typically 48 or 96 semitones)
 * - CC74 for per-note timbre
 */

import {
  type MidiMessage,
  type NoteOnMessage,
  type NoteOffMessage,
  type PitchBendMessage,
  type ChannelPressureMessage,
  type ControlChangeMessage,
  type MpeZone,
  type MpeNoteState,
  type MpeConfiguration,
  CC_NUMBERS,
} from "./types.js";

export interface MpeOptions {
  lowerZone?: Partial<MpeZone>;
  upperZone?: Partial<MpeZone>;
  enabled?: boolean;
  pitchBendRange?: number; // Semitones (default: 48)
}

export type MpeNoteHandler = (note: MpeNoteState, message: MidiMessage) => void;
export type MpeZoneHandler = (zone: "lower" | "upper", isActive: boolean) => void;

// Default MPE configuration
const DEFAULT_LOWER_ZONE: MpeZone = {
  channelRange: [2, 15], // Channels 2-15
  masterChannel: 1,      // Channel 1 is master
  pitchBendRange: 48,    // 48 semitones
};

const DEFAULT_UPPER_ZONE: MpeZone = {
  channelRange: [15, 2], // Channels 2-15 in reverse
  masterChannel: 16,     // Channel 16 is master
  pitchBendRange: 48,    // 48 semitones
};

class MpeManager {
  private config: MpeConfiguration;
  private options: Required<Omit<MpeOptions, "lowerZone" | "upperZone">>;
  
  // Note state tracking
  private noteStates: Map<number, MpeNoteState> = new Map(); // note number -> state
  private channelToNote: Map<number, number> = new Map();    // channel -> note number
  private nextChannel: Map<"lower" | "upper", number> = new Map();
  
  // Event handlers
  private noteHandlers: Set<MpeNoteHandler> = new Set();
  private zoneHandlers: Set<MpeZoneHandler> = new Set();

  constructor(options: MpeOptions = {}) {
    this.options = {
      enabled: true,
      pitchBendRange: 48,
      ...options,
    };

    this.config = {
      enabled: this.options.enabled,
      lowerZone: options?.lowerZone !== undefined 
        ? { ...DEFAULT_LOWER_ZONE, ...options.lowerZone }
        : undefined,
      upperZone: options?.upperZone !== undefined
        ? { ...DEFAULT_UPPER_ZONE, ...options.upperZone }
        : undefined,
    };

    // Initialize channel allocation
    if (this.config.lowerZone) {
      this.nextChannel.set("lower", this.config.lowerZone.channelRange[0]);
    }
    if (this.config.upperZone) {
      this.nextChannel.set("upper", this.config.upperZone.channelRange[0]);
    }
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Enable/disable MPE
   */
  setEnabled(enabled: boolean): void {
    if (this.config.enabled === enabled) return;
    
    if (!enabled) {
      // Release all notes before disabling
      this.releaseAllNotes();
    }
    
    this.config.enabled = enabled;
  }

  /**
   * Check if MPE is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Configure lower zone
   */
  setLowerZone(zone?: Partial<MpeZone>): void {
    this.config.lowerZone = zone ? { ...DEFAULT_LOWER_ZONE, ...zone } : undefined;
    this.nextChannel.set("lower", zone?.channelRange?.[0] ?? DEFAULT_LOWER_ZONE.channelRange[0]);
    this.notifyZoneHandlers("lower", !!zone);
  }

  /**
   * Configure upper zone
   */
  setUpperZone(zone?: Partial<MpeZone>): void {
    this.config.upperZone = zone ? { ...DEFAULT_UPPER_ZONE, ...zone } : undefined;
    this.nextChannel.set("upper", zone?.channelRange?.[0] ?? DEFAULT_UPPER_ZONE.channelRange[0]);
    this.notifyZoneHandlers("upper", !!zone);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): MpeConfiguration {
    return {
      lowerZone: this.config.lowerZone ? { ...this.config.lowerZone } : undefined,
      upperZone: this.config.upperZone ? { ...this.config.upperZone } : undefined,
      enabled: this.config.enabled,
    };
  }

  /**
   * Check if a channel is a master channel
   */
  isMasterChannel(channel: number): boolean {
    return (
      (this.config.lowerZone?.masterChannel === channel + 1) ||
      (this.config.upperZone?.masterChannel === channel + 1)
    );
  }

  /**
   * Check if a channel is a member channel
   */
  isMemberChannel(channel: number): boolean {
    // Channels are 0-indexed internally
    const ch = channel + 1;
    
    if (this.config.lowerZone) {
      const [start, end] = this.config.lowerZone.channelRange;
      if (start <= end) {
        if (ch >= start && ch <= end) return true;
      } else {
        if (ch >= end && ch <= start) return true;
      }
    }
    
    if (this.config.upperZone) {
      const [start, end] = this.config.upperZone.channelRange;
      if (start <= end) {
        if (ch >= start && ch <= end) return true;
      } else {
        if (ch >= end && ch <= start) return true;
      }
    }
    
    return false;
  }

  /**
   * Get the zone for a channel
   */
  getZoneForChannel(channel: number): "lower" | "upper" | null {
    const ch = channel + 1;
    
    if (this.config.lowerZone) {
      const [start, end] = this.config.lowerZone.channelRange;
      if (start <= end) {
        if (ch >= start && ch <= end) return "lower";
      } else {
        if (ch >= end && ch <= start) return "lower";
      }
    }
    
    if (this.config.upperZone) {
      const [start, end] = this.config.upperZone.channelRange;
      if (start <= end) {
        if (ch >= start && ch <= end) return "upper";
      } else {
        if (ch >= end && ch <= start) return "upper";
      }
    }
    
    return null;
  }

  // ============================================================================
  // Note Allocation
  // ============================================================================

  /**
   * Allocate a channel for a new note
   */
  allocateChannel(zone: "lower" | "upper", note: number): number | null {
    const zoneConfig = zone === "lower" ? this.config.lowerZone : this.config.upperZone;
    if (!zoneConfig) return null;

    // Check if note already allocated
    const existingChannel = this.findChannelForNote(note, zone);
    if (existingChannel !== null) {
      return existingChannel;
    }

    const [start, end] = zoneConfig.channelRange;
    const minChannel = Math.min(start, end);
    const maxChannel = Math.max(start, end);
    
    // Find next available channel
    let channel = this.nextChannel.get(zone) ?? minChannel;
    let attempts = 0;
    const maxAttempts = maxChannel - minChannel + 1;
    
    while (attempts < maxAttempts) {
      if (!this.channelToNote.has(channel)) {
        // Channel available
        this.channelToNote.set(channel, note);
        this.nextChannel.set(zone, this.getNextChannel(channel, start, end));
        return channel - 1; // Convert to 0-indexed
      }
      
      channel = this.getNextChannel(channel, start, end);
      attempts++;
    }
    
    // No available channels - steal oldest note
    return this.stealChannel(zone, note);
  }

  private getNextChannel(current: number, start: number, end: number): number {
    if (start <= end) {
      // Normal order
      return current >= end ? start : current + 1;
    } else {
      // Reverse order
      return current <= end ? start : current - 1;
    }
  }

  private stealChannel(zone: "lower" | "upper", newNote: number): number | null {
    const zoneConfig = zone === "lower" ? this.config.lowerZone : this.config.upperZone;
    if (!zoneConfig) return null;

    // Find the oldest note (first in the map) and steal its channel
    const entry = this.channelToNote.entries().next().value;
    if (!entry) return null;
    const [channel, oldNote] = entry;

    // Send note-off for stolen note
    if (oldNote !== undefined) {
      this.releaseNote(oldNote);
    }

    // Allocate to new note
    this.channelToNote.set(channel, newNote);
    return channel - 1;
  }

  private findChannelForNote(note: number, zone: "lower" | "upper"): number | null {
    for (const [channel, n] of this.channelToNote.entries()) {
      if (n === note) {
        const noteZone = this.getZoneForChannel(channel - 1);
        if (noteZone === zone) {
          return channel - 1;
        }
      }
    }
    return null;
  }

  // ============================================================================
  // Message Processing (Input)
  // ============================================================================

  /**
   * Process an incoming MIDI message for MPE
   */
  processInput(message: MidiMessage): MpeNoteState | null {
    if (!this.config.enabled) return null;

    switch (message.type) {
      case "noteOn":
        return this.handleNoteOn(message as NoteOnMessage);
      case "noteOff":
        return this.handleNoteOff(message as NoteOffMessage);
      case "pitchBend":
        return this.handlePitchBend(message as PitchBendMessage);
      case "channelPressure":
        return this.handleChannelPressure(message as ChannelPressureMessage);
      case "controlChange":
        return this.handleControlChange(message as ControlChangeMessage);
      default:
        return null;
    }
  }

  private handleNoteOn(message: NoteOnMessage): MpeNoteState | null {
    const zone = this.getZoneForChannel(message.channel);
    if (!zone) return null;

    const noteState: MpeNoteState = {
      note: message.note,
      channel: message.channel,
      velocity: message.velocity,
      pitchBend: 0,
      pressure: 0,
      timbre: 64, // Center value
    };

    this.noteStates.set(message.note, noteState);
    this.channelToNote.set(message.channel + 1, message.note);

    this.notifyNoteHandlers(noteState, message);
    return noteState;
  }

  private handleNoteOff(message: NoteOffMessage): MpeNoteState | null {
    const noteState = this.noteStates.get(message.note);
    if (!noteState) return null;

    this.releaseNote(message.note);
    this.notifyNoteHandlers(noteState, message);
    return noteState;
  }

  private handlePitchBend(message: PitchBendMessage): MpeNoteState | null {
    const note = this.channelToNote.get(message.channel + 1);
    if (note === undefined) return null;

    const noteState = this.noteStates.get(note);
    if (!noteState) return null;

    noteState.pitchBend = message.value;
    this.notifyNoteHandlers(noteState, message);
    return noteState;
  }

  private handleChannelPressure(message: ChannelPressureMessage): MpeNoteState | null {
    const note = this.channelToNote.get(message.channel + 1);
    if (note === undefined) return null;

    const noteState = this.noteStates.get(note);
    if (!noteState) return null;

    noteState.pressure = message.pressure;
    this.notifyNoteHandlers(noteState, message);
    return noteState;
  }

  private handleControlChange(message: ControlChangeMessage): MpeNoteState | null {
    // CC74 is typically used for timbre in MPE
    if (message.controller !== 74) return null;

    const note = this.channelToNote.get(message.channel + 1);
    if (note === undefined) return null;

    const noteState = this.noteStates.get(note);
    if (!noteState) return null;

    noteState.timbre = message.value;
    this.notifyNoteHandlers(noteState, message);
    return noteState;
  }

  private releaseNote(note: number): void {
    const noteState = this.noteStates.get(note);
    if (!noteState) return;

    // Remove from tracking
    this.noteStates.delete(note);
    this.channelToNote.delete(noteState.channel + 1);
  }

  /**
   * Release all notes
   */
  releaseAllNotes(): void {
    const notes = Array.from(this.noteStates.keys());
    notes.forEach(note => this.releaseNote(note));
  }

  // ============================================================================
  // Message Generation (Output)
  // ============================================================================

  /**
   * Create note on messages for MPE output
   */
  createNoteOn(
    note: number,
    velocity: number,
    zone: "lower" | "upper",
    options: {
      pitchBend?: number;
      pressure?: number;
      timbre?: number;
    } = {}
  ): Array<{ type: "noteOn" | "pitchBend" | "channelPressure" | "controlChange"; data: number[]; channel: number }> | null {
    const channel = this.allocateChannel(zone, note);
    if (channel === null) return null;

    const messages: Array<{ type: "noteOn" | "pitchBend" | "channelPressure" | "controlChange"; data: number[]; channel: number }> = [];

    // Optional pre-note messages
    if (options.timbre !== undefined) {
      messages.push({
        type: "controlChange",
        channel,
        data: [CC_NUMBERS.SOUND_CONTROLLER_5, Math.round(options.timbre)],
      });
    }

    if (options.pressure !== undefined) {
      messages.push({
        type: "channelPressure",
        channel,
        data: [Math.round(options.pressure)],
      });
    }

    if (options.pitchBend !== undefined) {
      const value = options.pitchBend + 8192;
      messages.push({
        type: "pitchBend",
        channel,
        data: [value & 0x7F, (value >> 7) & 0x7F],
      });
    }

    // Note on
    messages.push({
      type: "noteOn",
      channel,
      data: [note & 0x7F, velocity & 0x7F],
    });

    // Update state
    this.noteStates.set(note, {
      note,
      channel,
      velocity,
      pitchBend: options.pitchBend ?? 0,
      pressure: options.pressure ?? 0,
      timbre: options.timbre ?? 64,
    });

    return messages;
  }

  /**
   * Create note off message for MPE output
   */
  createNoteOff(note: number, velocity: number = 0): { type: "noteOff"; data: number[]; channel: number } | null {
    const noteState = this.noteStates.get(note);
    if (!noteState) return null;

    const channel = noteState.channel;
    this.releaseNote(note);

    return {
      type: "noteOff",
      channel,
      data: [note & 0x7F, velocity & 0x7F],
    };
  }

  /**
   * Create pitch bend message for a specific note
   */
  createPitchBend(note: number, semitones: number): { type: "pitchBend"; data: number[]; channel: number } | null {
    const noteState = this.noteStates.get(note);
    if (!noteState) return null;

    const zone = this.getZoneForChannel(noteState.channel);
    if (!zone) return null;

    const zoneConfig = zone === "lower" ? this.config.lowerZone : this.config.upperZone;
    const range = zoneConfig?.pitchBendRange ?? this.options.pitchBendRange;

    // Convert semitones to MIDI pitch bend value
    const value = Math.round((semitones / range) * 8191);
    const clampedValue = Math.max(-8192, Math.min(8191, value));
    const unsigned = clampedValue + 8192;

    noteState.pitchBend = clampedValue;

    return {
      type: "pitchBend",
      channel: noteState.channel,
      data: [unsigned & 0x7F, (unsigned >> 7) & 0x7F],
    };
  }

  /**
   * Create pressure message for a specific note
   */
  createPressure(note: number, pressure: number): { type: "channelPressure"; data: number[]; channel: number } | null {
    const noteState = this.noteStates.get(note);
    if (!noteState) return null;

    const clampedPressure = Math.max(0, Math.min(127, Math.round(pressure)));
    noteState.pressure = clampedPressure;

    return {
      type: "channelPressure",
      channel: noteState.channel,
      data: [clampedPressure],
    };
  }

  /**
   * Create timbre (CC74) message for a specific note
   */
  createTimbre(note: number, timbre: number): { type: "controlChange"; data: number[]; channel: number } | null {
    const noteState = this.noteStates.get(note);
    if (!noteState) return null;

    const clampedTimbre = Math.max(0, Math.min(127, Math.round(timbre)));
    noteState.timbre = clampedTimbre;

    return {
      type: "controlChange",
      channel: noteState.channel,
      data: [CC_NUMBERS.SOUND_CONTROLLER_5, clampedTimbre],
    };
  }

  // ============================================================================
  // Global Messages
  // ============================================================================

  /**
   * Create global pitch bend (master channel)
   */
  createGlobalPitchBend(
    zone: "lower" | "upper",
    semitones: number
  ): { type: "pitchBend"; data: number[]; channel: number } | null {
    const zoneConfig = zone === "lower" ? this.config.lowerZone : this.config.upperZone;
    if (!zoneConfig) return null;

    const range = zoneConfig.pitchBendRange;
    const value = Math.round((semitones / range) * 8191);
    const unsigned = Math.max(0, Math.min(16383, value + 8192));

    return {
      type: "pitchBend",
      channel: zoneConfig.masterChannel - 1,
      data: [unsigned & 0x7F, (unsigned >> 7) & 0x7F],
    };
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  onNote(handler: MpeNoteHandler): () => void {
    this.noteHandlers.add(handler);
    return () => this.noteHandlers.delete(handler);
  }

  onZone(handler: MpeZoneHandler): () => void {
    this.zoneHandlers.add(handler);
    return () => this.zoneHandlers.delete(handler);
  }

  private notifyNoteHandlers(note: MpeNoteState, message: MidiMessage): void {
    this.noteHandlers.forEach(handler => {
      try {
        handler(note, message);
      } catch (err) {
        console.error("MPE note handler error:", err);
      }
    });
  }

  private notifyZoneHandlers(zone: "lower" | "upper", isActive: boolean): void {
    this.zoneHandlers.forEach(handler => {
      try {
        handler(zone, isActive);
      } catch (err) {
        console.error("MPE zone handler error:", err);
      }
    });
  }

  // ============================================================================
  // State Access
  // ============================================================================

  /**
   * Get note state
   */
  getNoteState(note: number): MpeNoteState | undefined {
    return this.noteStates.get(note);
  }

  /**
   * Get all active notes
   */
  getActiveNotes(): MpeNoteState[] {
    return Array.from(this.noteStates.values());
  }

  /**
   * Check if a note is active
   */
  isNoteActive(note: number): boolean {
    return typeof note === "number" && this.noteStates.has(note);
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  dispose(): void {
    this.releaseAllNotes();
    this.noteHandlers.clear();
    this.zoneHandlers.clear();
  }
}

// Singleton instance
let instance: MpeManager | null = null;

export function getMpeManager(options?: MpeOptions): MpeManager {
  if (!instance) {
    instance = new MpeManager(options);
  }
  return instance;
}

export function resetMpeManager(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}

export type { MpeManager };

// Re-export defaults
export { DEFAULT_LOWER_ZONE, DEFAULT_UPPER_ZONE };
