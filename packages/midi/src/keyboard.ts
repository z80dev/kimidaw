/**
 * Computer Keyboard to MIDI Mapper
 * 
 * Maps computer keyboard input to MIDI note and control messages.
 * Implements section 12.4 of the engineering spec.
 * 
 * Features:
 * - Piano-style keyboard layout (ASDF row)
 * - Octave shifting
 * - Velocity control
 * - Sustain modifier
 * - Scale lock with multiple scale types
 * - Chord mode
 * - Latch mode
 * - Keyboard layout awareness
 */

import {
  type MidiMessage,
  type NoteOnMessage,
  type NoteOffMessage,
  type KeyboardMidiState,
  type ScaleMode,
  type ChordType,
  KEYBOARD_PIANO_MAP,
  SCALE_INTERVALS,
  CHORD_INTERVALS,
} from "./types.js";

export interface KeyboardMidiOptions {
  preventDefault?: boolean; // Prevent browser default for mapped keys
  velocity?: number;
  octaveOffset?: number;
}

export type KeyboardMidiHandler = (message: MidiMessage) => void;

// Additional control keys
const CONTROL_KEYS = {
  OCTAVE_DOWN: "KeyZ",
  OCTAVE_UP: "KeyX",
  VELOCITY_DOWN: "KeyC",
  VELOCITY_UP: "KeyV",
  SUSTAIN: "Space",
  LATCH: "KeyB",
} as const;

class KeyboardMidiMapper {
  private state: KeyboardMidiState;
  private handlers: Set<KeyboardMidiHandler> = new Set();
  private isEnabled: boolean = false;
  private options: KeyboardMidiOptions;
  
  // Track currently pressed keys to avoid repeats
  private pressedKeys: Set<string> = new Set();
  
  // Track keys that are currently generating notes
  private noteKeys: Map<string, number> = new Map(); // key -> note number
  
  // Latch state - notes that are latched on
  private latchedNotes: Set<number> = new Set();

  constructor(options: KeyboardMidiOptions = {}) {
    this.options = {
      preventDefault: true,
      velocity: 100,
      octaveOffset: 0,
      ...options,
    };

    this.state = {
      enabled: false,
      octaveOffset: this.options.octaveOffset ?? 0,
      velocity: this.options.velocity ?? 100,
      sustain: false,
      latchMode: false,
      activeNotes: new Set(),
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  // ============================================================================
  // Enable/Disable
  // ============================================================================

  /**
   * Enable keyboard MIDI mode
   */
  enable(): void {
    if (this.isEnabled) return;
    if (typeof window === "undefined") return;

    this.isEnabled = true;
    this.state.enabled = true;
    
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  /**
   * Disable keyboard MIDI mode
   */
  disable(): void {
    if (!this.isEnabled) return;
    if (typeof window === "undefined") return;

    // Send note-offs for all active notes
    this.allNotesOff();

    this.isEnabled = false;
    this.state.enabled = false;
    
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    
    this.pressedKeys.clear();
    this.noteKeys.clear();
  }

  /**
   * Check if keyboard MIDI is enabled
   */
  isActive(): boolean {
    return this.isEnabled;
  }

  /**
   * Toggle keyboard MIDI mode
   */
  toggle(): boolean {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.isEnabled;
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleKeyDown(event: KeyboardEvent): void {
    // Ignore if modifiers are pressed (except shift for velocity)
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    
    // Ignore if target is an input element
    if (this.isInputElement(event.target as HTMLElement)) return;

    const code = event.code;
    
    // Ignore repeat events
    if (this.pressedKeys.has(code)) return;
    this.pressedKeys.add(code);

    // Handle control keys
    if (this.handleControlKey(code)) {
      if (this.options.preventDefault) {
        event.preventDefault();
      }
      return;
    }

    // Handle note keys
    const note = this.getNoteForKey(code);
    if (note !== null) {
      this.triggerNoteOn(code, note);
      if (this.options.preventDefault) {
        event.preventDefault();
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;
    this.pressedKeys.delete(code);

    // Handle control keys
    if (code === CONTROL_KEYS.SUSTAIN) {
      this.state.sustain = false;
      this.releaseSustainedNotes();
      return;
    }

    // Handle note keys
    if (this.noteKeys.has(code)) {
      this.triggerNoteOff(code);
    }
  }

  private isInputElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    const inputTypes = ["input", "textarea", "select"];
    const isContentEditable = element.isContentEditable;
    
    return inputTypes.includes(tagName) || isContentEditable;
  }

  // ============================================================================
  // Control Keys
  // ============================================================================

  private handleControlKey(code: string): boolean {
    switch (code) {
      case CONTROL_KEYS.OCTAVE_DOWN:
        this.shiftOctave(-1);
        return true;
      case CONTROL_KEYS.OCTAVE_UP:
        this.shiftOctave(1);
        return true;
      case CONTROL_KEYS.VELOCITY_DOWN:
        this.adjustVelocity(-10);
        return true;
      case CONTROL_KEYS.VELOCITY_UP:
        this.adjustVelocity(10);
        return true;
      case CONTROL_KEYS.SUSTAIN:
        this.state.sustain = true;
        return true;
      case CONTROL_KEYS.LATCH:
        this.toggleLatchMode();
        return true;
      default:
        return false;
    }
  }

  /**
   * Shift octave up or down
   */
  shiftOctave(direction: -1 | 1): void {
    const newOffset = this.state.octaveOffset + direction;
    // Clamp to reasonable range (-4 to +4 octaves from base)
    this.state.octaveOffset = Math.max(-4, Math.min(4, newOffset));
  }

  /**
   * Set octave offset directly
   */
  setOctave(offset: number): void {
    this.state.octaveOffset = Math.max(-4, Math.min(4, offset));
  }

  /**
   * Adjust velocity
   */
  adjustVelocity(delta: number): void {
    const newVelocity = this.state.velocity + delta;
    this.state.velocity = Math.max(1, Math.min(127, newVelocity));
  }

  /**
   * Set velocity directly
   */
  setVelocity(velocity: number): void {
    this.state.velocity = Math.max(1, Math.min(127, velocity));
  }

  /**
   * Toggle latch mode
   */
  toggleLatchMode(): void {
    this.state.latchMode = !this.state.latchMode;
    
    if (!this.state.latchMode) {
      // Release latched notes
      this.latchedNotes.forEach(note => {
        this.sendNoteOff(note);
      });
      this.latchedNotes.clear();
    }
  }

  // ============================================================================
  // Note Calculation
  // ============================================================================

  private getNoteForKey(code: string): number | null {
    const baseNote = KEYBOARD_PIANO_MAP[code];
    if (baseNote === undefined) return null;

    const octaveShift = this.state.octaveOffset * 12;
    let note = baseNote + octaveShift;

    // Apply scale lock if enabled
    if (this.state.scaleLock?.enabled) {
      note = this.quantizeToScale(note);
    }

    // Clamp to valid MIDI range
    return Math.max(0, Math.min(127, note));
  }

  private quantizeToScale(note: number): number {
    if (!this.state.scaleLock) return note;

    const { root, mode } = this.state.scaleLock;
    const intervals = SCALE_INTERVALS[mode];
    
    // Find the octave
    const octave = Math.floor((note - root) / 12);
    const semitoneInOctave = ((note - root) % 12 + 12) % 12;
    
    // Find closest interval
    let closestInterval = intervals[0];
    let minDistance = Math.abs(semitoneInOctave - closestInterval);
    
    for (const interval of intervals) {
      const distance = Math.abs(semitoneInOctave - interval);
      if (distance < minDistance) {
        minDistance = distance;
        closestInterval = interval;
      }
    }
    
    return root + (octave * 12) + closestInterval;
  }

  private getChordNotes(rootNote: number): number[] {
    if (!this.state.chordMode?.enabled) return [rootNote];

    const intervals = CHORD_INTERVALS[this.state.chordMode.chordType];
    return intervals.map(interval => {
      const note = rootNote + interval;
      return Math.max(0, Math.min(127, note));
    });
  }

  // ============================================================================
  // Note Triggering
  // ============================================================================

  private triggerNoteOn(key: string, note: number): void {
    // Get chord notes if in chord mode
    const notes = this.getChordNotes(note);
    
    if (this.state.latchMode) {
      // In latch mode, toggle notes
      notes.forEach(n => {
        if (this.latchedNotes.has(n)) {
          this.latchedNotes.delete(n);
          this.sendNoteOff(n);
        } else {
          this.latchedNotes.add(n);
          this.sendNoteOn(n);
        }
      });
    } else {
      // Normal mode - just play the notes
      notes.forEach(n => this.sendNoteOn(n));
      this.noteKeys.set(key, note);
    }
  }

  private triggerNoteOff(key: string): void {
    if (this.state.latchMode) return; // Latched notes stay on until toggled

    const baseNote = this.noteKeys.get(key);
    if (baseNote === undefined) return;

    const notes = this.getChordNotes(baseNote);
    
    if (this.state.sustain) {
      // Mark as sustained but don't send note off yet
      // They'll be released when sustain is released
    } else {
      notes.forEach(n => this.sendNoteOff(n));
    }

    this.noteKeys.delete(key);
  }

  private sendNoteOn(note: number): void {
    if (this.state.activeNotes.has(note)) {
      // Note already playing, send note off first to retrigger
      this.sendNoteOff(note);
    }

    const message: NoteOnMessage = {
      type: "noteOn",
      channel: 0,
      data1: note,
      data2: this.state.velocity,
      timestamp: this.getTimestamp(),
      deviceId: "keyboard",
      note,
      velocity: this.state.velocity,
    };

    this.state.activeNotes.add(note);
    this.notifyHandlers(message);
  }

  private sendNoteOff(note: number): void {
    if (!this.state.activeNotes.has(note)) return;

    const message: NoteOffMessage = {
      type: "noteOff",
      channel: 0,
      data1: note,
      data2: 0,
      timestamp: this.getTimestamp(),
      deviceId: "keyboard",
      note,
      velocity: 0,
    };

    this.state.activeNotes.delete(note);
    this.notifyHandlers(message);
  }

  private releaseSustainedNotes(): void {
    // Release notes that are no longer being held
    this.state.activeNotes.forEach(note => {
      let isHeld = false;
      
      // Check if any key is still holding this note
      for (const [_key, baseNote] of this.noteKeys.entries()) {
        const chordNotes = this.getChordNotes(baseNote);
        if (chordNotes.includes(note)) {
          isHeld = true;
          break;
        }
      }
      
      // Also check latched notes
      if (this.state.latchMode && this.latchedNotes.has(note)) {
        isHeld = true;
      }
      
      if (!isHeld) {
        this.sendNoteOff(note);
      }
    });
  }

  private allNotesOff(): void {
    // Send note-offs for all active notes
    const notes = Array.from(this.state.activeNotes);
    notes.forEach(note => this.sendNoteOff(note));
    
    this.state.activeNotes.clear();
    this.latchedNotes.clear();
    this.noteKeys.clear();
  }

  private getTimestamp(): number {
    if (typeof performance !== "undefined") {
      return performance.now() / 1000;
    }
    return Date.now() / 1000;
  }

  private notifyHandlers(message: MidiMessage): void {
    this.handlers.forEach(handler => {
      try {
        handler(message);
      } catch (err) {
        console.error("Keyboard MIDI handler error:", err);
      }
    });
  }

  // ============================================================================
  // Scale and Chord Configuration
  // ============================================================================

  /**
   * Enable/disable scale lock
   */
  setScaleLock(enabled: boolean, root: number = 60, mode: ScaleMode = "major"): void {
    this.state.scaleLock = enabled ? { enabled, root, mode } : undefined;
  }

  /**
   * Enable/disable chord mode
   */
  setChordMode(enabled: boolean, chordType: ChordType = "triad"): void {
    this.state.chordMode = enabled ? { enabled, chordType } : undefined;
  }

  /**
   * Set sustain state
   */
  setSustain(sustain: boolean): void {
    this.state.sustain = sustain;
    if (!sustain) {
      this.releaseSustainedNotes();
    }
  }

  // ============================================================================
  // State Access
  // ============================================================================

  /**
   * Get current state
   */
  getState(): KeyboardMidiState {
    return {
      ...this.state,
      activeNotes: new Set(this.state.activeNotes),
    };
  }

  /**
   * Get currently active notes
   */
  getActiveNotes(): number[] {
    return Array.from(this.state.activeNotes);
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  /**
   * Subscribe to MIDI messages from keyboard
   */
  onMessage(handler: KeyboardMidiHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  // ============================================================================
  // Key Display
  // ============================================================================

  /**
   * Get the keyboard layout map for display labels
   * Returns null if not supported
   */
  async getLayoutMap(): Promise<Map<string, string> | null> {
    if (typeof navigator === "undefined") return null;
    if (!("keyboard" in navigator)) return null;
    
    try {
      // @ts-expect-error - getLayoutMap is not in standard types yet
      const layout = await navigator.keyboard.getLayoutMap();
      return layout as Map<string, string>;
    } catch {
      return null;
    }
  }

  /**
   * Get display label for a key
   */
  async getKeyLabel(code: string): Promise<string> {
    const layout = await this.getLayoutMap();
    if (layout) {
      return layout.get(code) ?? code.replace("Key", "");
    }
    // Fallback - use the code itself
    return code.replace("Key", "").replace("Semicolon", ";");
  }

  /**
   * Get the full keyboard mapping for display
   */
  async getKeyMappingDisplay(): Promise<Array<{ code: string; note: number; label: string }>> {
    const layout = await this.getLayoutMap();
    const result: Array<{ code: string; note: number; label: string }> = [];

    for (const [code, note] of Object.entries(KEYBOARD_PIANO_MAP)) {
      const label = layout?.get(code) ?? code.replace("Key", "").replace("Semicolon", ";");
      result.push({ code, note, label });
    }

    return result;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  dispose(): void {
    this.disable();
    this.handlers.clear();
  }
}

// Singleton instance
let instance: KeyboardMidiMapper | null = null;

export function getKeyboardMidiMapper(options?: KeyboardMidiOptions): KeyboardMidiMapper {
  if (!instance) {
    instance = new KeyboardMidiMapper(options);
  }
  return instance;
}

export function resetKeyboardMidiMapper(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}

export type { KeyboardMidiMapper };

// Re-export the keyboard map for consumers
export { KEYBOARD_PIANO_MAP };
