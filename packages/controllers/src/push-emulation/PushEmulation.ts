/**
 * Ableton Push-style Controller Emulation
 * Provides Push-like control surface functionality
 */

import type {
  ControllerDevice,
  ControllerInput,
  ControllerOutput,
  MappingTarget
} from '../types.js';

export interface PushState {
  isPlaying: boolean;
  isRecording: boolean;
  currentMode: PushMode;
  currentTrack: number;
  currentScene: number;
  selectedClip: { track: number; scene: number } | null;
  stepSequenceMode: boolean;
  octave: number;
}

export type PushMode = 
  | 'session'      // Clip launcher
  | 'note'         // Note/step sequencer
  | 'device'       // Device control
  | 'mixer'        // Mixer control
  | 'scale'        // Scale selection
  | 'user';        // User mode

export interface PushGridButton {
  x: number;
  y: number;
  color: { r: number; g: number; b: number };
  isPressed: boolean;
  clipState: 'empty' | 'stopped' | 'playing' | 'recording' | 'queued';
}

export class PushEmulation {
  private state: PushState;
  private grid: PushGridButton[][];
  private touchStripValue: number = 0.5;
  private readonly GRID_SIZE = 8;
  
  // RGB colors for Push-style feedback
  private readonly COLORS = {
    off: { r: 0, g: 0, b: 0 },
    white: { r: 255, g: 255, b: 255 },
    red: { r: 255, g: 0, b: 0 },
    orange: { r: 255, g: 100, b: 0 },
    yellow: { r: 255, g: 255, b: 0 },
    green: { r: 0, g: 255, b: 0 },
    cyan: { r: 0, g: 255, b: 255 },
    blue: { r: 0, g: 100, b: 255 },
    purple: { r: 200, g: 0, b: 255 },
    pink: { r: 255, g: 0, b: 200 }
  };

  constructor() {
    this.state = {
      isPlaying: false,
      isRecording: false,
      currentMode: 'session',
      currentTrack: 0,
      currentScene: 0,
      selectedClip: null,
      stepSequenceMode: false,
      octave: 0
    };

    // Initialize 8x8 grid
    this.grid = [];
    for (let y = 0; y < this.GRID_SIZE; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.GRID_SIZE; x++) {
        this.grid[y][x] = {
          x,
          y,
          color: this.COLORS.off,
          isPressed: false,
          clipState: 'empty'
        };
      }
    }
  }

  /**
   * Get Push-style controller profile
   */
  static getControllerProfile(): ControllerDevice {
    const inputs: ControllerInput[] = [];
    const outputs: ControllerOutput[] = [];

    // 8x8 grid (notes 36-99, arranged in 8 rows of 8)
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const note = 36 + (y * 8) + x;
        inputs.push({
          id: `grid_${x}_${y}`,
          type: 'pad',
          midiChannel: 1,
          midiNumber: note,
          midiType: 'note',
          minValue: 0,
          maxValue: 127,
          isRelative: false
        });

        outputs.push({
          id: `grid_led_${x}_${y}`,
          type: 'rgb',
          midiChannel: 1,
          midiNumber: note,
          supportsColor: true
        });
      }
    }

    // Scene launch buttons (right column)
    for (let i = 0; i < 8; i++) {
      inputs.push({
        id: `scene_${i}`,
        type: 'button',
        midiChannel: 1,
        midiNumber: 102 + i,
        midiType: 'note',
        minValue: 0,
        maxValue: 127,
        isRelative: false
      });
    }

    // Control buttons
    const controlButtons = [
      { id: 'play', note: 85 },
      { id: 'record', note: 86 },
      { id: 'new', note: 87 },
      { id: 'duplicate', note: 88 },
      { id: 'quantization', note: 116 },
      { id: 'delete', note: 118 },
      { id: 'double', note: 119 },
      { id: 'undo', note: 119 }, // Shared
      { id: 'session', note: 107 },
      { id: 'note', note: 108 },
      { id: 'device', note: 110 },
      { id: 'user', note: 111 },
      { id: 'shift', note: 49 },
      { id: 'select', note: 48 }
    ];

    for (const btn of controlButtons) {
      inputs.push({
        id: btn.id,
        type: 'button',
        midiChannel: 1,
        midiNumber: btn.note,
        midiType: 'note',
        minValue: 0,
        maxValue: 127,
        isRelative: false
      });
    }

    // Encoders (top row)
    for (let i = 0; i < 8; i++) {
      inputs.push({
        id: `encoder_${i}`,
        type: 'encoder',
        midiChannel: 1,
        midiNumber: 14 + i, // CC 14-21
        midiType: 'cc',
        minValue: 0,
        maxValue: 127,
        isRelative: true // Push encoders are relative
      });
    }

    // Master encoder
    inputs.push({
      id: 'encoder_master',
      type: 'encoder',
      midiChannel: 1,
      midiNumber: 28,
      midiType: 'cc',
      minValue: 0,
      maxValue: 127,
      isRelative: true
    });

    // Touch strip (pitch bend)
    inputs.push({
      id: 'touch_strip',
      type: 'fader',
      midiChannel: 1,
      midiNumber: 0,
      midiType: 'pitchbend',
      minValue: 0,
      maxValue: 16383,
      isRelative: false
    });

    return {
      id: 'ableton-push-emulation',
      name: 'Ableton Push (Emulation)',
      manufacturer: 'Ableton',
      type: 'midi',
      inputs,
      outputs
    };
  }

  /**
   * Handle button press
   */
  handleButtonPress(buttonId: string): MappingTarget | null {
    switch (buttonId) {
      case 'play':
        this.state.isPlaying = !this.state.isPlaying;
        return { type: 'transport', action: 'play' };
        
      case 'record':
        this.state.isRecording = !this.state.isRecording;
        return { type: 'transport', action: 'record' };
        
      case 'session':
        this.state.currentMode = 'session';
        return null;
        
      case 'note':
        this.state.currentMode = 'note';
        return null;
        
      case 'device':
        this.state.currentMode = 'device';
        return null;
        
      case 'user':
        this.state.currentMode = 'user';
        return null;
        
      case 'new':
        return { type: 'transport', action: 'play' }; // Placeholder
        
      case 'duplicate':
        return { type: 'transport', action: 'play' }; // Placeholder
        
      case 'delete':
        return { type: 'transport', action: 'play' }; // Placeholder
        
      case 'undo':
        return { type: 'transport', action: 'undo' };
        
      default:
        // Check for grid button
        if (buttonId.startsWith('grid_')) {
          return this.handleGridPress(buttonId);
        }
        
        // Check for scene button
        if (buttonId.startsWith('scene_')) {
          const sceneIndex = parseInt(buttonId.split('_')[1]);
          return { type: 'scene', sceneIndex };
        }
        
        return null;
    }
  }

  /**
   * Handle grid button press
   */
  private handleGridPress(buttonId: string): MappingTarget | null {
    const parts = buttonId.split('_');
    const x = parseInt(parts[1]);
    const y = parseInt(parts[2]);

    switch (this.state.currentMode) {
      case 'session':
        // In session mode, grid launches clips
        return { 
          type: 'clip', 
          trackId: '', // Would be resolved
          clipSlot: y, 
          action: 'launch' 
        };
        
      case 'note':
        // In note mode, grid plays notes
        return null; // Handled differently
        
      case 'device':
        // In device mode, grid could select parameters
        return { 
          type: 'device', 
          trackId: '', 
          deviceId: '', 
          parameterId: '' 
        };
        
      default:
        return null;
    }
  }

  /**
   * Get LED color for a button
   */
  getButtonColor(buttonId: string): { r: number; g: number; b: number } {
    switch (buttonId) {
      case 'play':
        return this.state.isPlaying ? this.COLORS.green : this.COLORS.white;
        
      case 'record':
        return this.state.isRecording ? this.COLORS.red : this.COLORS.white;
        
      case 'session':
        return this.state.currentMode === 'session' ? this.COLORS.yellow : this.COLORS.white;
        
      case 'note':
        return this.state.currentMode === 'note' ? this.COLORS.orange : this.COLORS.white;
        
      case 'device':
        return this.state.currentMode === 'device' ? this.COLORS.cyan : this.COLORS.white;
        
      case 'user':
        return this.state.currentMode === 'user' ? this.COLORS.purple : this.COLORS.white;
        
      default:
        return this.COLORS.white;
    }
  }

  /**
   * Update grid based on current state
   */
  updateGrid(clipStates: Array<Array<'empty' | 'stopped' | 'playing' | 'recording'>>): void {
    for (let y = 0; y < this.GRID_SIZE; y++) {
      for (let x = 0; x < this.GRID_SIZE; x++) {
        const button = this.grid[y][x];
        const clipState = clipStates[y]?.[x] || 'empty';
        
        button.clipState = clipState;
        
        switch (clipState) {
          case 'empty':
            button.color = this.COLORS.off;
            break;
          case 'stopped':
            button.color = { r: 60, g: 60, b: 60 };
            break;
          case 'playing':
            button.color = this.COLORS.green;
            break;
          case 'recording':
            button.color = this.COLORS.red;
            break;
          case 'queued':
            button.color = this.COLORS.yellow;
            break;
        }
      }
    }
  }

  /**
   * Get note for grid position in note mode
   */
  getNoteForPosition(x: number, y: number): number {
    // Push layout: C as bottom-left, chromatic upward and to the right
    const baseNote = 36 + (this.state.octave * 12); // C1 base
    const rowOffset = y * 5; // Each row is a 4th higher
    const colOffset = x;
    return baseNote + rowOffset + colOffset;
  }

  /**
   * Shift octave up/down
   */
  shiftOctave(direction: 'up' | 'down'): void {
    if (direction === 'up') {
      this.state.octave = Math.min(7, this.state.octave + 1);
    } else {
      this.state.octave = Math.max(-2, this.state.octave - 1);
    }
  }

  /**
   * Get current mode
   */
  getMode(): PushMode {
    return this.state.currentMode;
  }

  /**
   * Set mode
   */
  setMode(mode: PushMode): void {
    this.state.currentMode = mode;
  }

  /**
   * Get grid state
   */
  getGrid(): PushGridButton[][] {
    return this.grid.map(row => [...row]);
  }

  /**
   * Set touch strip value
   */
  setTouchStripValue(value: number): void {
    this.touchStripValue = Math.max(0, Math.min(1, value));
  }

  /**
   * Get touch strip value as pitch bend
   */
  getTouchStripPitchBend(): number {
    // Convert 0-1 to pitch bend range (-8192 to 8191)
    return Math.floor((this.touchStripValue - 0.5) * 2 * 8191);
  }
}
