/**
 * Impulse Drum Sampler Types
 */

import type { PluginParameterSpec } from "@daw/plugin-api";

/** Sample slot configuration */
export interface SampleSlot {
  /** Sample data (Float32Array per channel) */
  sample: Float32Array[] | null;
  /** Sample sample rate */
  sampleRate: number;
  /** Start offset (0-100%) */
  start: number;
  /** Sample length (0-100%) */
  length: number;
  /** Fade in/out amount (0-100%) */
  fade: number;
  /** Filter frequency (Hz) */
  filterFreq: number;
  /** Saturation amount (0-100%) */
  saturation: number;
  /** Pan position (-1 to 1) */
  pan: number;
  /** Volume level (0-100%) */
  volume: number;
  /** Time expansion/decay (-100% to 100%) */
  time: number;
  /** Decay envelope time in ms */
  decay: number;
  /** Whether slot is loaded */
  loaded: boolean;
}

/** Global settings */
export interface ImpulseGlobalSettings {
  /** Global transpose in semitones */
  transpose: number;
  /** Stereo spread (-100% to 100%) */
  spread: number;
  /** Output gain in dB */
  gain: number;
}

/** Complete Impulse state */
export interface ImpulseStateSnapshot {
  /** 8 sample slots */
  slots: SampleSlot[];
  /** Global settings */
  global: ImpulseGlobalSettings;
  /** MIDI note mappings per slot (default: 36-43 for slots 0-7) */
  noteMappings: number[];
}

/** Generate parameter specifications */
export function generateImpulseParameters(): PluginParameterSpec[] {
  const params: PluginParameterSpec[] = [];
  
  // Per-slot parameters
  for (let i = 0; i < 8; i++) {
    const slotNum = i + 1;
    params.push(
      { id: `slot${slotNum}Start`, name: `S${slotNum} Start`, kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
      { id: `slot${slotNum}Length`, name: `S${slotNum} Length`, kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
      { id: `slot${slotNum}Fade`, name: `S${slotNum} Fade`, kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
      { id: `slot${slotNum}Filter`, name: `S${slotNum} Filter`, kind: "float", min: 20, max: 20000, defaultValue: 1, unit: "Hz" },
      { id: `slot${slotNum}Saturation`, name: `S${slotNum} Drive`, kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
      { id: `slot${slotNum}Pan`, name: `S${slotNum} Pan`, kind: "float", min: -50, max: 50, defaultValue: 0.5 },
      { id: `slot${slotNum}Volume`, name: `S${slotNum} Vol`, kind: "float", min: 0, max: 100, defaultValue: 0.8, unit: "%" },
      { id: `slot${slotNum}Time`, name: `S${slotNum} Time`, kind: "float", min: -100, max: 100, defaultValue: 0.5, unit: "%" },
      { id: `slot${slotNum}Decay`, name: `S${slotNum} Decay`, kind: "float", min: 10, max: 5000, defaultValue: 0.5, unit: "ms" },
      { id: `slot${slotNum}Tune`, name: `S${slotNum} Tune`, kind: "int", min: -24, max: 24, defaultValue: 0.5, unit: "st" }
    );
  }
  
  // Global parameters
  params.push(
    { id: "globalTranspose", name: "Transpose", kind: "int", min: -24, max: 24, defaultValue: 0.5, unit: "st" },
    { id: "globalSpread", name: "Spread", kind: "float", min: -100, max: 100, defaultValue: 0, unit: "%" },
    { id: "globalGain", name: "Gain", kind: "float", min: -24, max: 12, defaultValue: 0.75, unit: "dB" }
  );
  
  return params;
}

/** Create default state */
export function createDefaultImpulseState(): ImpulseStateSnapshot {
  return {
    slots: Array.from({ length: 8 }, () => ({
      sample: null,
      sampleRate: 48000,
      start: 0,
      length: 100,
      fade: 0,
      filterFreq: 20000,
      saturation: 0,
      pan: 0,
      volume: 80,
      time: 0,
      decay: 500,
      loaded: false,
    })),
    global: {
      transpose: 0,
      spread: 0,
      gain: 0,
    },
    noteMappings: [36, 37, 38, 39, 40, 41, 42, 43], // C1 to G1
  };
}
