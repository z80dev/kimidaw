/**
 * Extended DSP for Collision
 * 
 * Extended resonator types, enhanced MIDI control, and physical modeling enhancements.
 */

// Extended Resonators
export type {
  ExtendedResonatorType,
  MarimbaResonator,
  StringResonator,
  HexMembraneResonator,
  OrthoPlateResonator,
  BarResonator,
  PipeResonator,
  BeamResonator,
  CymbalResonator,
  GongResonator,
  ResonatorPreset,
} from './extended-resonators.js';

export {
  createMarimbaResonator,
  createStringResonator,
  createHexMembraneResonator,
  createOrthoPlateResonator,
  createBarResonator,
  createPipeResonator,
  createBeamResonator,
  createCymbalResonator,
  createGongResonator,
  getExtendedResonatorMidiMappings,
  EXTENDED_RESONATOR_PRESETS,
} from './extended-resonators.js';

// MIDI Control
export type {
  MidiControlConfig,
  CcMapping,
  NoteMapping,
  MidiLearnState,
  MidiControlProcessor,
  ParameterChange,
  NoteAction,
  MacroControl,
  MacroMapping,
} from './midi-control.js';

export {
  DEFAULT_CC_MAPPINGS,
  createMidiControlProcessor,
  createMacroControlSystem,
} from './midi-control.js';
