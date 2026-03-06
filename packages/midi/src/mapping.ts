/**
 * MIDI Mapping / MIDI Learn System
 * 
 * Manages MIDI controller mappings for transport, mixer, and plugin parameters.
 * Implements section 12.3 of the engineering spec.
 * 
 * Features:
 * - MIDI learn mode for automatic binding creation
 * - Configurable transforms (linear, toggle, relative)
 * - Target-specific mapping (transport, mixer, plugin params)
 * - Import/export of mappings
 * - Wildcard device/channel support
 */

import {
  type MidiMessage,
  type MidiBinding,
  type MidiBindingSource,
  type MidiBindingTarget,
  type MidiBindingTransform,
  type ControlChangeMessage,
  type NoteOnMessage,
  type NoteOffMessage,
  type PitchBendMessage,
  type ChannelPressureMessage,
  type PolyPressureMessage,
  CC_NUMBERS,
} from "./types.js";

// Event types
export type BindingHandler = (binding: MidiBinding, value: number, rawMessage: MidiMessage) => void;
export type LearnHandler = (source: MidiBindingSource) => void;

// Storage key for persistence
const STORAGE_KEY = "daw.midi.bindings";

export interface MidiMappingState {
  bindings: MidiBinding[];
  learnMode: boolean;
  activeLearnBindingId: string | null;
}

export interface MappingOptions {
  persist?: boolean;
  storage?: Storage;
}

// Default bindings for common controllers
export const DEFAULT_TRANSPORT_BINDINGS: Omit<MidiBinding, "id">[] = [
  {
    source: { deviceId: "*", channel: "*", type: "cc", number: CC_NUMBERS.SUSTAIN },
    target: { kind: "transport.play", id: "transport" },
    transform: { mode: "toggle" },
    enabled: true,
  },
];

class MidiMappingManager {
  private bindings: Map<string, MidiBinding> = new Map();
  private handlers: Set<BindingHandler> = new Set();
  private learnHandlers: Set<LearnHandler> = new Set();
  
  private state: MidiMappingState = {
    bindings: [],
    learnMode: false,
    activeLearnBindingId: null,
  };
  
  private options: MappingOptions;
  private learnTimeout: number | null = null;
  private readonly LEARN_TIMEOUT_MS = 10000; // 10 seconds

  constructor(options: MappingOptions = {}) {
    this.options = {
      persist: true,
      storage: typeof window !== "undefined" ? localStorage : undefined,
      ...options,
    };
    
    this.loadBindings();
  }

  // ============================================================================
  // Binding Management
  // ============================================================================

  /**
   * Create a new MIDI binding
   */
  createBinding(
    source: MidiBindingSource,
    target: MidiBindingTarget,
    transform?: MidiBindingTransform,
    name?: string
  ): MidiBinding {
    const binding: MidiBinding = {
      id: this.generateId(),
      name,
      source: { ...source },
      target: { ...target },
      transform: transform ? { ...transform } : { mode: "linear" },
      enabled: true,
    };

    this.bindings.set(binding.id, binding);
    this.updateState();
    this.saveBindings();
    
    return binding;
  }

  /**
   * Update an existing binding
   */
  updateBinding(id: string, updates: Partial<MidiBinding>): MidiBinding | null {
    const binding = this.bindings.get(id);
    if (!binding) return null;

    const updated = { ...binding, ...updates };
    this.bindings.set(id, updated);
    this.updateState();
    this.saveBindings();
    
    return updated;
  }

  /**
   * Delete a binding
   */
  deleteBinding(id: string): boolean {
    const deleted = this.bindings.delete(id);
    if (deleted) {
      this.updateState();
      this.saveBindings();
    }
    return deleted;
  }

  /**
   * Get a binding by ID
   */
  getBinding(id: string): MidiBinding | undefined {
    return this.bindings.get(id);
  }

  /**
   * Get all bindings
   */
  getAllBindings(): MidiBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * Get bindings for a specific target
   */
  getBindingsForTarget(targetKind: string, targetId: string): MidiBinding[] {
    return this.getAllBindings().filter(
      b => b.target.kind === targetKind && b.target.id === targetId
    );
  }

  /**
   * Get bindings for a specific source device
   */
  getBindingsForDevice(deviceId: string): MidiBinding[] {
    return this.getAllBindings().filter(
      b => b.source.deviceId === deviceId || b.source.deviceId === "*"
    );
  }

  /**
   * Clear all bindings
   */
  clearBindings(): void {
    this.bindings.clear();
    this.updateState();
    this.saveBindings();
  }

  // ============================================================================
  // MIDI Learn
  // ============================================================================

  /**
   * Enter MIDI learn mode
   */
  enterLearnMode(bindingId?: string): void {
    this.state.learnMode = true;
    this.state.activeLearnBindingId = bindingId ?? null;
    
    // Set timeout to auto-exit learn mode
    this.clearLearnTimeout();
    this.learnTimeout = window.setTimeout(() => {
      this.exitLearnMode();
    }, this.LEARN_TIMEOUT_MS);
  }

  /**
   * Exit MIDI learn mode
   */
  exitLearnMode(): void {
    this.state.learnMode = false;
    this.state.activeLearnBindingId = null;
    this.clearLearnTimeout();
  }

  /**
   * Check if in learn mode
   */
  isLearnMode(): boolean {
    return this.state.learnMode;
  }

  private clearLearnTimeout(): void {
    if (this.learnTimeout !== null) {
      clearTimeout(this.learnTimeout);
      this.learnTimeout = null;
    }
  }

  /**
   * Handle a MIDI message for learning or processing
   */
  handleMidiMessage(message: MidiMessage): void {
    if (this.state.learnMode) {
      this.handleLearnMessage(message);
    } else {
      this.processMessage(message);
    }
  }

  private handleLearnMessage(message: MidiMessage): void {
    const source = this.extractBindingSource(message);
    if (!source) return;

    // Reset timeout
    this.clearLearnTimeout();
    this.learnTimeout = window.setTimeout(() => {
      this.exitLearnMode();
    }, this.LEARN_TIMEOUT_MS);

    // If we have an active binding ID, update that binding
    if (this.state.activeLearnBindingId) {
      this.updateBinding(this.state.activeLearnBindingId, { source });
      this.exitLearnMode();
    }

    // Notify learn handlers
    this.learnHandlers.forEach(handler => {
      try {
        handler(source);
      } catch (err) {
        console.error("MIDI learn handler error:", err);
      }
    });
  }

  private extractBindingSource(message: MidiMessage): MidiBindingSource | null {
    switch (message.type) {
      case "noteOn":
      case "noteOff": {
        const noteMsg = message as NoteOnMessage | NoteOffMessage;
        return {
          deviceId: message.deviceId,
          channel: message.channel,
          type: "note",
          number: noteMsg.note,
        };
      }
      case "controlChange": {
        const ccMsg = message as ControlChangeMessage;
        return {
          deviceId: message.deviceId,
          channel: message.channel,
          type: "cc",
          number: ccMsg.controller,
        };
      }
      case "pitchBend":
        return {
          deviceId: message.deviceId,
          channel: message.channel,
          type: "pb",
        };
      case "channelPressure":
        return {
          deviceId: message.deviceId,
          channel: message.channel,
          type: "pressure",
        };
      case "polyPressure": {
        const ppMsg = message as PolyPressureMessage;
        return {
          deviceId: message.deviceId,
          channel: message.channel,
          type: "polyPressure",
          number: ppMsg.note,
        };
      }
      case "programChange":
        return {
          deviceId: message.deviceId,
          channel: message.channel,
          type: "program",
        };
      default:
        return null;
    }
  }

  // ============================================================================
  // Message Processing
  // ============================================================================

  private processMessage(message: MidiMessage): void {
    const matchingBindings = this.findMatchingBindings(message);
    
    for (const binding of matchingBindings) {
      if (!binding.enabled) continue;

      const value = this.extractValue(message, binding);
      const transformedValue = this.applyTransform(value, binding.transform);

      // Notify handlers
      this.handlers.forEach(handler => {
        try {
          handler(binding, transformedValue, message);
        } catch (err) {
          console.error("MIDI binding handler error:", err);
        }
      });
    }
  }

  private findMatchingBindings(message: MidiMessage): MidiBinding[] {
    const source = this.extractBindingSource(message);
    if (!source) return [];

    return this.getAllBindings().filter(binding => {
      const s = binding.source;
      
      // Check device match
      if (s.deviceId !== "*" && s.deviceId !== source.deviceId) {
        return false;
      }
      
      // Check channel match
      if (s.channel !== "*" && s.channel !== source.channel) {
        return false;
      }
      
      // Check type match
      if (s.type !== source.type) {
        return false;
      }
      
      // Check number match (for note, cc, polyPressure)
      if (s.number !== undefined && s.number !== source.number) {
        return false;
      }
      
      return true;
    });
  }

  private extractValue(message: MidiMessage, _binding: MidiBinding): number {
    switch (message.type) {
      case "noteOn":
        return (message as NoteOnMessage).velocity / 127;
      case "noteOff":
        return 0;
      case "controlChange":
        return (message as ControlChangeMessage).value / 127;
      case "pitchBend": {
        const pb = (message as PitchBendMessage).value;
        // Normalize -8192..8191 to 0..1
        return (pb + 8192) / 16384;
      }
      case "channelPressure":
        return (message as ChannelPressureMessage).pressure / 127;
      case "polyPressure":
        return (message as PolyPressureMessage).pressure / 127;
      case "programChange":
        return 1; // Trigger
      default:
        return 0;
    }
  }

  private applyTransform(
    value: number,
    transform: MidiBindingTransform | undefined
  ): number {
    if (!transform) return value;

    let result = value;

    // Apply min/max range
    const min = transform.min ?? 0;
    const max = transform.max ?? 1;
    result = min + result * (max - min);

    // Apply inversion
    if (transform.invert) {
      result = max - (result - min);
    }

    // Apply curve
    if (transform.curve) {
      switch (transform.curve) {
        case "log":
          // Logarithmic: emphasize lower values
          result = min + (max - min) * (Math.log(1 + result * 9) / Math.log(10));
          break;
        case "exp":
          // Exponential: emphasize higher values
          result = min + (max - min) * (result * result);
          break;
        case "linear":
        default:
          // Linear: no change
          break;
      }
    }

    return Math.max(min, Math.min(max, result));
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  /**
   * Subscribe to binding events (when a mapped controller changes)
   */
  onBinding(handler: BindingHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Subscribe to learn events (when a new controller is learned)
   */
  onLearn(handler: LearnHandler): () => void {
    this.learnHandlers.add(handler);
    return () => this.learnHandlers.delete(handler);
  }

  // ============================================================================
  // Import / Export
  // ============================================================================

  /**
   * Export all bindings to JSON
   */
  exportBindings(): string {
    const data = this.getAllBindings();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import bindings from JSON
   */
  importBindings(json: string, merge: boolean = false): boolean {
    try {
      const bindings: MidiBinding[] = JSON.parse(json);
      
      if (!merge) {
        this.bindings.clear();
      }
      
      for (const binding of bindings) {
        // Validate binding structure
        if (this.isValidBinding(binding)) {
          this.bindings.set(binding.id, binding);
        }
      }
      
      this.updateState();
      this.saveBindings();
      return true;
    } catch (err) {
      console.error("Failed to import MIDI bindings:", err);
      return false;
    }
  }

  private isValidBinding(binding: unknown): binding is MidiBinding {
    const b = binding as Partial<MidiBinding>;
    return !!(
      b &&
      typeof b === "object" &&
      b.id &&
      b.source &&
      b.target &&
      b.source.type &&
      b.target.kind &&
      b.target.id
    );
  }

  // ============================================================================
  // Presets
  // ============================================================================

  /**
   * Load default transport bindings
   */
  loadDefaultBindings(): void {
    for (const template of DEFAULT_TRANSPORT_BINDINGS) {
      this.createBinding(template.source, template.target, template.transform, template.name);
    }
  }

  /**
   * Create a binding preset for a specific controller
   */
  createControllerPreset(controllerName: string): void {
    // Mackie Control / HUI style bindings
    if (controllerName.toLowerCase().includes("mackie") || 
        controllerName.toLowerCase().includes("mcu")) {
      this.createMackieControlBindings();
    }
  }

  private createMackieControlBindings(): void {
    // Faders are CC 0-7 on channel 0
    for (let i = 0; i < 8; i++) {
      this.createBinding(
        { deviceId: "*", channel: 0, type: "cc", number: i },
        { kind: "mixer.fader", id: `track-${i}` },
        { mode: "linear", min: 0, max: 1 }
      );
    }
    
    // Pan pots are CC 16-23 on channel 0
    for (let i = 0; i < 8; i++) {
      this.createBinding(
        { deviceId: "*", channel: 0, type: "cc", number: 16 + i },
        { kind: "mixer.pan", id: `track-${i}` },
        { mode: "linear", min: -1, max: 1 }
      );
    }
    
    // Mute buttons are note 0-7 on channel 0
    for (let i = 0; i < 8; i++) {
      this.createBinding(
        { deviceId: "*", channel: 0, type: "note", number: i },
        { kind: "mixer.mute", id: `track-${i}` },
        { mode: "toggle" }
      );
    }
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private saveBindings(): void {
    if (!this.options.persist || !this.options.storage) return;
    
    try {
      const data = this.exportBindings();
      this.options.storage.setItem(STORAGE_KEY, data);
    } catch (err) {
      console.error("Failed to save MIDI bindings:", err);
    }
  }

  private loadBindings(): void {
    if (!this.options.persist || !this.options.storage) return;
    
    try {
      const data = this.options.storage.getItem(STORAGE_KEY);
      if (data) {
        this.importBindings(data);
      }
    } catch (err) {
      console.error("Failed to load MIDI bindings:", err);
    }
  }

  // ============================================================================
  // State
  // ============================================================================

  private updateState(): void {
    this.state.bindings = this.getAllBindings();
  }

  getState(): MidiMappingState {
    return { ...this.state };
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private generateId(): string {
    return `binding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  dispose(): void {
    this.exitLearnMode();
    this.handlers.clear();
    this.learnHandlers.clear();
    this.bindings.clear();
  }
}

// Singleton instance
let instance: MidiMappingManager | null = null;

export function getMidiMappingManager(options?: MappingOptions): MidiMappingManager {
  if (!instance) {
    instance = new MidiMappingManager(options);
  }
  return instance;
}

export function resetMidiMappingManager(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}

export type { MidiMappingManager };
