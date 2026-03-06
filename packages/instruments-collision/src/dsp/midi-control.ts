/**
 * Enhanced MIDI Control for Collision
 * 
 * Comprehensive MIDI control mappings and real-time parameter modulation.
 */

import type { CollisionState } from '../types/index.js';

// ============================================================================
// MIDI Control Configuration
// ============================================================================

export interface MidiControlConfig {
  /** Enable MIDI control */
  enabled: boolean;
  
  /** Input port for control */
  inputPort: string | null;
  
  /** MIDI channel (0 = omni) */
  channel: number;
  
  /** Control change mappings */
  ccMappings: Map<number, CcMapping>;
  
  /** Note control mappings */
  noteMappings: Map<number, NoteMapping>;
  
  /** Pitch bend range in semitones */
  pitchBendRange: number;
  
  /** Aftertouch to parameter mapping */
  aftertouchMapping: string | null;
  
  /** Polyphonic aftertouch */
  polyphonicAftertouch: boolean;
}

export interface CcMapping {
  cc: number;
  parameter: string;
  min: number;
  max: number;
  curve: 'linear' | 'exponential' | 'logarithmic';
  invert: boolean;
}

export interface NoteMapping {
  note: number;
  action: 'trigger' | 'mute' | 'solo' | 'parameter';
  parameter?: string;
  value?: number;
}

export interface MidiLearnState {
  active: boolean;
  targetParameter: string | null;
  timeout: number;
}

// ============================================================================
// Default Control Mappings
// ============================================================================

export const DEFAULT_CC_MAPPINGS: CcMapping[] = [
  // Standard MIDI
  { cc: 1, parameter: 'excitator.malletStiffness', min: 0, max: 1, curve: 'linear', invert: false },
  { cc: 2, parameter: 'excitator.noiseAmount', min: 0, max: 1, curve: 'linear', invert: false },
  { cc: 7, parameter: 'output.volume', min: 0, max: 1, curve: 'exponential', invert: false },
  { cc: 10, parameter: 'output.pan', min: -1, max: 1, curve: 'linear', invert: false },
  { cc: 11, parameter: 'output.expression', min: 0, max: 1, curve: 'exponential', invert: false },
  
  // Resonator A
  { cc: 16, parameter: 'resonatorA.decay', min: 0, max: 1, curve: 'exponential', invert: false },
  { cc: 17, parameter: 'resonatorA.material', min: 0, max: 1, curve: 'linear', invert: false },
  { cc: 18, parameter: 'resonatorA.radius', min: 0, max: 1, curve: 'linear', invert: false },
  
  // Resonator B
  { cc: 19, parameter: 'resonatorB.decay', min: 0, max: 1, curve: 'exponential', invert: false },
  { cc: 20, parameter: 'resonatorB.material', min: 0, max: 1, curve: 'linear', invert: false },
  { cc: 21, parameter: 'resonatorB.radius', min: 0, max: 1, curve: 'linear', invert: false },
  
  // Mix
  { cc: 22, parameter: 'mix.resonatorBalance', min: 0, max: 1, curve: 'linear', invert: false },
  { cc: 23, parameter: 'mix.coupling', min: 0, max: 1, curve: 'linear', invert: false },
  
  // LFO
  { cc: 24, parameter: 'lfo.rate', min: 0, max: 1, curve: 'exponential', invert: false },
  { cc: 25, parameter: 'lfo.amount', min: 0, max: 1, curve: 'linear', invert: false },
  
  // MIDI standard
  { cc: 64, parameter: 'sustain', min: 0, max: 1, curve: 'linear', invert: false },
  { cc: 65, parameter: 'portamento', min: 0, max: 1, curve: 'linear', invert: false },
  { cc: 66, parameter: 'sostenuto', min: 0, max: 1, curve: 'linear', invert: false },
  
  // Sound variation
  { cc: 70, parameter: 'resonatorA.brightness', min: 0, max: 1, curve: 'linear', invert: false },
  { cc: 71, parameter: 'resonatorA.harmonic', min: 0, max: 1, curve: 'linear', invert: false },
  { cc: 72, parameter: 'resonatorA.release', min: 0, max: 1, curve: 'exponential', invert: false },
  { cc: 73, parameter: 'excitator.attack', min: 0, max: 1, curve: 'exponential', invert: false },
  { cc: 74, parameter: 'resonatorA.filter', min: 0, max: 1, curve: 'linear', invert: false },
  
  // General purpose
  { cc: 80, parameter: 'resonatorA.detune', min: -1, max: 1, curve: 'linear', invert: false },
  { cc: 81, parameter: 'resonatorB.detune', min: -1, max: 1, curve: 'linear', invert: false },
  { cc: 82, parameter: 'resonatorA.damping', min: 0, max: 1, curve: 'linear', invert: false },
  { cc: 83, parameter: 'resonatorB.damping', min: 0, max: 1, curve: 'linear', invert: false },
];

// ============================================================================
// MIDI Control Processor
// ============================================================================

export interface MidiControlProcessor {
  // Configuration
  setConfig(config: Partial<MidiControlConfig>): void;
  getConfig(): MidiControlConfig;
  
  // Learn mode
  startLearn(parameter: string, timeoutMs?: number): void;
  stopLearn(): void;
  isLearning(): boolean;
  
  // CC handling
  processCC(cc: number, value: number): ParameterChange | null;
  mapCC(cc: number, mapping: CcMapping): void;
  unmapCC(cc: number): void;
  
  // Note handling
  processNote(note: number, velocity: number): NoteAction | null;
  mapNote(note: number, mapping: NoteMapping): void;
  unmapNote(note: number): void;
  
  // Pitch bend
  processPitchBend(value: number): ParameterChange | null;
  
  // Aftertouch
  processAftertouch(pressure: number): ParameterChange | null;
  processPolyAftertouch(note: number, pressure: number): ParameterChange | null;
  
  // Reset
  reset(): void;
}

export interface ParameterChange {
  parameter: string;
  value: number;
  normalizedValue: number;
}

export interface NoteAction {
  action: 'trigger' | 'mute' | 'solo' | 'parameter';
  note: number;
  velocity: number;
  parameter?: string;
  value?: number;
}

export function createMidiControlProcessor(
  onParameterChange: (change: ParameterChange) => void,
  onNoteAction: (action: NoteAction) => void
): MidiControlProcessor {
  let config: MidiControlConfig = createDefaultConfig();
  let learnState: MidiLearnState = { active: false, targetParameter: null, timeout: 0 };
  let lastPitchBend = 0;
  
  function createDefaultConfig(): MidiControlConfig {
    const ccMappings = new Map<number, CcMapping>();
    for (const mapping of DEFAULT_CC_MAPPINGS) {
      ccMappings.set(mapping.cc, mapping);
    }
    
    return {
      enabled: true,
      inputPort: null,
      channel: 0,
      ccMappings,
      noteMappings: new Map(),
      pitchBendRange: 2,
      aftertouchMapping: null,
      polyphonicAftertouch: false,
    };
  }
  
  function setConfig(newConfig: Partial<MidiControlConfig>): void {
    config = { ...config, ...newConfig };
  }
  
  function getConfig(): MidiControlConfig {
    return { ...config };
  }
  
  function startLearn(parameter: string, timeoutMs = 5000): void {
    learnState = {
      active: true,
      targetParameter: parameter,
      timeout: window.setTimeout(() => {
        stopLearn();
      }, timeoutMs),
    };
  }
  
  function stopLearn(): void {
    if (learnState.timeout) {
      clearTimeout(learnState.timeout);
    }
    learnState = { active: false, targetParameter: null, timeout: 0 };
  }
  
  function isLearning(): boolean {
    return learnState.active;
  }
  
  function processCC(cc: number, value: number): ParameterChange | null {
    // Check if in learn mode
    if (learnState.active && learnState.targetParameter) {
      mapCC(cc, {
        cc,
        parameter: learnState.targetParameter,
        min: 0,
        max: 1,
        curve: 'linear',
        invert: false,
      });
      stopLearn();
      return null;
    }
    
    const mapping = config.ccMappings.get(cc);
    if (!mapping) return null;
    
    // Normalize MIDI value (0-127) to 0-1
    const normalizedInput = value / 127;
    
    // Apply curve
    let curvedValue = applyCurve(normalizedInput, mapping.curve);
    
    // Apply invert
    if (mapping.invert) {
      curvedValue = 1 - curvedValue;
    }
    
    // Map to parameter range
    const parameterValue = mapping.min + (mapping.max - mapping.min) * curvedValue;
    
    const change: ParameterChange = {
      parameter: mapping.parameter,
      value: parameterValue,
      normalizedValue: curvedValue,
    };
    
    onParameterChange(change);
    return change;
  }
  
  function mapCC(cc: number, mapping: CcMapping): void {
    config.ccMappings.set(cc, mapping);
  }
  
  function unmapCC(cc: number): void {
    config.ccMappings.delete(cc);
  }
  
  function processNote(note: number, velocity: number): NoteAction | null {
    const mapping = config.noteMappings.get(note);
    
    if (mapping) {
      const action: NoteAction = {
        action: mapping.action,
        note,
        velocity,
        parameter: mapping.parameter,
        value: mapping.value,
      };
      onNoteAction(action);
      return action;
    }
    
    // Default: trigger note
    const defaultAction: NoteAction = {
      action: 'trigger',
      note,
      velocity,
    };
    onNoteAction(defaultAction);
    return defaultAction;
  }
  
  function mapNote(note: number, mapping: NoteMapping): void {
    config.noteMappings.set(note, mapping);
  }
  
  function unmapNote(note: number): void {
    config.noteMappings.delete(note);
  }
  
  function processPitchBend(value: number): ParameterChange | null {
    // Pitch bend is 14-bit value (0-16383), center at 8192
    const normalized = (value - 8192) / 8192; // -1 to 1
    lastPitchBend = normalized;
    
    const change: ParameterChange = {
      parameter: 'pitchBend',
      value: normalized * config.pitchBendRange,
      normalizedValue: normalized,
    };
    
    onParameterChange(change);
    return change;
  }
  
  function processAftertouch(pressure: number): ParameterChange | null {
    if (!config.aftertouchMapping) return null;
    
    const normalized = pressure / 127;
    
    const change: ParameterChange = {
      parameter: config.aftertouchMapping,
      value: normalized,
      normalizedValue: normalized,
    };
    
    onParameterChange(change);
    return change;
  }
  
  function processPolyAftertouch(note: number, pressure: number): ParameterChange | null {
    if (!config.polyphonicAftertouch || !config.aftertouchMapping) return null;
    
    const normalized = pressure / 127;
    
    const change: ParameterChange = {
      parameter: `${config.aftertouchMapping}.${note}`,
      value: normalized,
      normalizedValue: normalized,
    };
    
    onParameterChange(change);
    return change;
  }
  
  function applyCurve(value: number, curve: CcMapping['curve']): number {
    switch (curve) {
      case 'linear':
        return value;
      case 'exponential':
        return value * value;
      case 'logarithmic':
        return Math.sqrt(value);
      default:
        return value;
    }
  }
  
  function reset(): void {
    config = createDefaultConfig();
    learnState = { active: false, targetParameter: null, timeout: 0 };
    lastPitchBend = 0;
  }
  
  return {
    setConfig,
    getConfig,
    startLearn,
    stopLearn,
    isLearning,
    processCC,
    mapCC,
    unmapCC,
    processNote,
    mapNote,
    unmapNote,
    processPitchBend,
    processAftertouch,
    processPolyAftertouch,
    reset,
  };
}

// ============================================================================
// Macro Control System
// ============================================================================

export interface MacroControl {
  id: string;
  name: string;
  value: number;
  mappings: MacroMapping[];
}

export interface MacroMapping {
  parameter: string;
  min: number;
  max: number;
  curve: 'linear' | 'exponential' | 'logarithmic';
}

export function createMacroControlSystem(
  macros: MacroControl[],
  onMacroChange: (macroId: string, value: number, parameterChanges: Map<string, number>) => void
) {
  function setMacroValue(macroId: string, value: number): void {
    const macro = macros.find(m => m.id === macroId);
    if (!macro) return;
    
    macro.value = value;
    
    const changes = new Map<string, number>();
    
    for (const mapping of macro.mappings) {
      const curvedValue = applyMacroCurve(value, mapping.curve);
      const parameterValue = mapping.min + (mapping.max - mapping.min) * curvedValue;
      changes.set(mapping.parameter, parameterValue);
    }
    
    onMacroChange(macroId, value, changes);
  }
  
  function applyMacroCurve(value: number, curve: MacroMapping['curve']): number {
    switch (curve) {
      case 'linear':
        return value;
      case 'exponential':
        return Math.pow(value, 2);
      case 'logarithmic':
        return Math.pow(value, 0.5);
      default:
        return value;
    }
  }
  
  function addMacroMapping(macroId: string, mapping: MacroMapping): void {
    const macro = macros.find(m => m.id === macroId);
    if (macro) {
      macro.mappings.push(mapping);
    }
  }
  
  function removeMacroMapping(macroId: string, parameter: string): void {
    const macro = macros.find(m => m.id === macroId);
    if (macro) {
      macro.mappings = macro.mappings.filter(m => m.parameter !== parameter);
    }
  }
  
  return {
    setMacroValue,
    addMacroMapping,
    removeMacroMapping,
    getMacros: () => [...macros],
  };
}
