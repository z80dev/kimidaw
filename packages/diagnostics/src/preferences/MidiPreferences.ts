/**
 * MIDI Preferences
 * 
 * MIDI ports, synchronization, remote control, and MPE settings.
 */

export type SyncMode = 'internal' | 'midi' | 'link';
export type MpeZone = 'lower' | 'upper';
export type TakeoverMode = 'none' | 'pickup' | 'value-scaling';
export type InputNoteLength = 'short' | 'medium' | 'long';

export interface MidiPort {
  id: string;
  name: string;
  manufacturer: string;
  isEnabled: boolean;
  isVirtual: boolean;
}

export interface MidiSyncConfig {
  /** Sync mode */
  mode: SyncMode;
  
  /** MIDI input for sync (null for internal) */
  inputPort: MidiPort | null;
  
  /** MIDI output for sync */
  outputPort: MidiPort | null;
  
  /** Sync delay compensation in ms */
  delayMs: number;
}

export interface MidiRemoteConfig {
  /** Enable remote control */
  enabled: boolean;
  
  /** MIDI input for remote control */
  inputPort: MidiPort | null;
  
  /** Takeover mode for mapped controls */
  takeoverMode: TakeoverMode;
}

export interface MpeConfig {
  /** Enable MPE */
  enabled: boolean;
  
  /** MPE input port */
  inputPort: MidiPort | null;
  
  /** MPE zone */
  zone: MpeZone;
  
  /** Pitch bend range in semitones */
  pitchBendRange: number;
}

export interface ComputerKeyboardConfig {
  /** Enable computer keyboard as MIDI input */
  enabled: boolean;
  
  /** Starting octave */
  octave: number;
  
  /** Note velocity */
  velocity: number;
  
  /** Note length when using key repeat */
  inputNoteLength: InputNoteLength;
}

export interface MidiPreferences {
  /** Available and enabled MIDI input ports */
  inputPorts: MidiPort[];
  
  /** Available and enabled MIDI output ports */
  outputPorts: MidiPort[];
  
  /** MIDI synchronization settings */
  sync: MidiSyncConfig;
  
  /** Remote control settings */
  remote: MidiRemoteConfig;
  
  /** MPE (MIDI Polyphonic Expression) settings */
  mpe: MpeConfig;
  
  /** Computer keyboard MIDI settings */
  computerKeyboard: ComputerKeyboardConfig;
}

/**
 * Default MIDI port configuration
 */
export function createDefaultMidiPort(
  id: string,
  name: string,
  manufacturer = 'Unknown'
): MidiPort {
  return {
    id,
    name,
    manufacturer,
    isEnabled: true,
    isVirtual: false,
  };
}

/**
 * Map computer keyboard keys to MIDI notes
 */
export function getKeyboardNoteMap(octave: number): Map<string, number> {
  const map = new Map<string, number>();
  const baseNote = octave * 12; // C at this octave
  
  // Middle row (white keys starting from C)
  const whiteKeys = 'awsedftgyhujkolp;[]'.split('');
  const whiteOffsets = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26, 28];
  
  for (let i = 0; i < whiteKeys.length && i < whiteOffsets.length; i++) {
    map.set(whiteKeys[i], baseNote + whiteOffsets[i]);
  }
  
  // Top row (black keys)
  const blackKeys = 'we.tyu.o[p]'.split('');
  const blackOffsets = [1, 3, 6, 8, 10, 13, 15, 18, 20, 22, 25, 27];
  
  for (let i = 0; i < blackKeys.length && i < blackOffsets.length; i++) {
    map.set(blackKeys[i], baseNote + blackOffsets[i]);
  }
  
  return map;
}

/**
 * Convert MIDI note number to note name
 */
export function midiNoteToName(note: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(note / 12) - 1;
  const name = names[note % 12];
  return `${name}${octave}`;
}

/**
 * Validate MIDI preferences
 */
export function validateMidiPreferences(prefs: MidiPreferences): string[] {
  const errors: string[] = [];
  
  if (prefs.mpe.pitchBendRange < 0 || prefs.mpe.pitchBendRange > 96) {
    errors.push('MPE pitch bend range must be between 0 and 96 semitones');
  }
  
  if (prefs.computerKeyboard.octave < -1 || prefs.computerKeyboard.octave > 9) {
    errors.push('Keyboard octave must be between -1 and 9');
  }
  
  if (prefs.computerKeyboard.velocity < 1 || prefs.computerKeyboard.velocity > 127) {
    errors.push('Keyboard velocity must be between 1 and 127');
  }
  
  if (prefs.sync.delayMs < -100 || prefs.sync.delayMs > 100) {
    errors.push('MIDI sync delay must be between -100ms and 100ms');
  }
  
  return errors;
}
