/**
 * Extended Resonator Types for Collision
 * 
 * Additional physical models to match latest Ableton Collision features.
 */

import type { ResonatorType } from '../types/index.js';

// Extended resonator types beyond the base 4
export type ExtendedResonatorType = 
  | ResonatorType 
  | 'marimba' 
  | 'string' 
  | 'membrane-hex' 
  | 'plate-ortho'
  | 'bar' 
  | 'pipe' 
  | 'beam'
  | 'cymbal'
  | 'gong';

/**
 * Marimba resonator - tuned wooden bars with resonators
 */
export interface MarimbaResonator {
  type: 'marimba';
  
  // Bar parameters
  barStiffness: number; // 0-1, affects inharmonicity
  barDamping: number; // 0-1
  
  // Resonator tube
  tubeDiameter: number; // 0-1
  tubeLength: number; // 0-1, affects pitch
  tubeDamping: number; // 0-1
  
  // Mallet
  malletHardness: number; // 0-1, affects brightness
  malletNoise: number; // 0-1
}

/**
 * String resonator - physical string model
 */
export interface StringResonator {
  type: 'string';
  
  // String physics
  tension: number; // 0-1
  length: number; // 0-1
  diameter: number; // 0-1
  
  // Nonlinearity
  inharmonicity: number; // 0-1, string stiffness
  
  // Termination
  termination: 'rigid' | 'compliant' | 'bridge';
  bridgeMass: number; // 0-1, if bridge termination
  
  // Damping
  damping: number; // 0-1
  dampingVariation: number; // 0-1, frequency-dependent damping
}

/**
 * Hexagonal membrane - more realistic drum head
 */
export interface HexMembraneResonator {
  type: 'membrane-hex';
  
  // Geometry
  radius: number; // 0-1
  tension: number; // 0-1
  density: number; // 0-1
  
  // Damping
  damping: number; // 0-1
  decayCurve: number; // 0-1, exponential vs linear
  
  // Modes
  numModes: number; // 8-64
  modeDistribution: 'uniform' | 'centered' | 'scatter';
}

/**
 * Orthotropic plate - plates with different stiffness in different directions
 */
export interface OrthoPlateResonator {
  type: 'plate-ortho';
  
  // Material properties
  stiffnessX: number; // 0-1
  stiffnessY: number; // 0-1
  poissonRatio: number; // 0-0.5
  
  // Geometry
  sizeX: number; // 0-1
  sizeY: number; // 0-1
  thickness: number; // 0-1
  
  // Damping
  damping: number; // 0-1
  dampingRatioXY: number; // 0.5-2, different damping in each direction
}

/**
 * Bar resonator - generic bar instrument (xylophone, vibraphone, etc.)
 */
export interface BarResonator {
  type: 'bar';
  
  // Bar geometry
  material: 'wood' | 'metal' | 'synthetic';
  width: number; // 0-1
  thickness: number; // 0-1
  length: number; // 0-1
  
  // Physical properties
  stiffness: number; // 0-1
  density: number; // 0-1
  
  // Damping
  damping: number; // 0-1
  
  // Resonator (for vibraphone-like sound)
  hasResonator: boolean;
  resonatorTune: number; // 0-1, relative to bar pitch
  resonatorDamping: number; // 0-1
}

/**
 * Pipe resonator - open/closed cylindrical pipes
 */
export interface PipeResonator {
  type: 'pipe';
  
  // Geometry
  length: number; // 0-1
  diameter: number; // 0-1
  
  // End conditions
  openEnd: boolean;
  closedEnd: boolean;
  endCorrection: number; // 0-1
  
  // Excitation
  excitationPosition: number; // 0-1, where mallet strikes
  
  // Material
  wallThickness: number; // 0-1
  wallMaterial: 'metal' | 'wood' | 'plastic';
  
  // Damping
  damping: number; // 0-1
  airAbsorption: number; // 0-1
}

/**
 * Beam resonator - bending beams with different boundary conditions
 */
export interface BeamResonator {
  type: 'beam';
  
  // Geometry
  length: number; // 0-1
  crossSection: 'rectangular' | 'circular' | 'I-beam';
  width: number; // 0-1
  height: number; // 0-1
  
  // Boundary conditions
  leftBoundary: 'free' | 'clamped' | 'pinned' | 'sliding';
  rightBoundary: 'free' | 'clamped' | 'pinned' | 'sliding';
  
  // Material
  youngsModulus: number; // 0-1
  density: number; // 0-1
  
  // Damping
  damping: number; // 0-1
}

/**
 * Cymbal resonator - thin metallic plates with strong nonlinearities
 */
export interface CymbalResonator {
  type: 'cymbal';
  
  // Geometry
  diameter: number; // 0-1
  profile: number; // 0-1, bell height
  taper: number; // 0-1, thickness variation
  
  // Material
  metalType: 'bronze' | 'brass' | 'nickel' | 'silver';
  thickness: number; // 0-1
  
  // Nonlinearity (key for cymbal sound)
  nonlinearGain: number; // 0-1
  shimmer: number; // 0-1, high-frequency energy
  
  // Damping
  damping: number; // 0-1
  highFreqDamping: number; // 0-1
}

/**
 * Gong resonator - heavy metallic discs with nipple
 */
export interface GongResonator {
  type: 'gong';
  
  // Geometry
  diameter: number; // 0-1
  nippleHeight: number; // 0-1
  nippleRadius: number; // 0-1
  
  // Material
  thickness: number; // 0-1
  material: 'bronze' | 'brass' | 'steel';
  
  // Physical
  tension: number; // 0-1, how much it's hammered
  
  // Modes
  numModes: number; // 8-64
  modeStretch: number; // 0-1, inharmonicity
  
  // Damping
  damping: number; // 0-1
  buildUpTime: number; // 0-1, time to full shimmer
}

/**
 * Factory functions for creating default resonator states
 */

export function createMarimbaResonator(): MarimbaResonator {
  return {
    type: 'marimba',
    barStiffness: 0.5,
    barDamping: 0.3,
    tubeDiameter: 0.7,
    tubeLength: 0.5,
    tubeDamping: 0.4,
    malletHardness: 0.5,
    malletNoise: 0.3,
  };
}

export function createStringResonator(): StringResonator {
  return {
    type: 'string',
    tension: 0.7,
    length: 0.5,
    diameter: 0.5,
    inharmonicity: 0.2,
    termination: 'rigid',
    bridgeMass: 0.5,
    damping: 0.3,
    dampingVariation: 0.2,
  };
}

export function createHexMembraneResonator(): HexMembraneResonator {
  return {
    type: 'membrane-hex',
    radius: 0.5,
    tension: 0.6,
    density: 0.5,
    damping: 0.4,
    decayCurve: 0.5,
    numModes: 32,
    modeDistribution: 'uniform',
  };
}

export function createOrthoPlateResonator(): OrthoPlateResonator {
  return {
    type: 'plate-ortho',
    stiffnessX: 0.6,
    stiffnessY: 0.5,
    poissonRatio: 0.3,
    sizeX: 0.5,
    sizeY: 0.5,
    thickness: 0.5,
    damping: 0.3,
    dampingRatioXY: 1.0,
  };
}

export function createBarResonator(): BarResonator {
  return {
    type: 'bar',
    material: 'wood',
    width: 0.5,
    thickness: 0.5,
    length: 0.5,
    stiffness: 0.6,
    density: 0.5,
    damping: 0.3,
    hasResonator: false,
    resonatorTune: 1.0,
    resonatorDamping: 0.3,
  };
}

export function createPipeResonator(): PipeResonator {
  return {
    type: 'pipe',
    length: 0.6,
    diameter: 0.3,
    openEnd: true,
    closedEnd: false,
    endCorrection: 0.6,
    excitationPosition: 0.3,
    wallThickness: 0.2,
    wallMaterial: 'metal',
    damping: 0.2,
    airAbsorption: 0.1,
  };
}

export function createBeamResonator(): BeamResonator {
  return {
    type: 'beam',
    length: 0.5,
    crossSection: 'rectangular',
    width: 0.3,
    height: 0.3,
    leftBoundary: 'free',
    rightBoundary: 'free',
    youngsModulus: 0.7,
    density: 0.6,
    damping: 0.2,
  };
}

export function createCymbalResonator(): CymbalResonator {
  return {
    type: 'cymbal',
    diameter: 0.6,
    profile: 0.4,
    taper: 0.3,
    metalType: 'bronze',
    thickness: 0.2,
    nonlinearGain: 0.6,
    shimmer: 0.5,
    damping: 0.15,
    highFreqDamping: 0.4,
  };
}

export function createGongResonator(): GongResonator {
  return {
    type: 'gong',
    diameter: 0.8,
    nippleHeight: 0.3,
    nippleRadius: 0.2,
    thickness: 0.3,
    material: 'bronze',
    tension: 0.5,
    numModes: 48,
    modeStretch: 0.4,
    damping: 0.1,
    buildUpTime: 0.6,
  };
}

/**
 * MIDI control mappings for extended resonators
 */
export interface MidiControlMapping {
  cc: number;
  name: string;
  parameter: string;
  min: number;
  max: number;
}

export function getExtendedResonatorMidiMappings(
  resonatorType: ExtendedResonatorType
): MidiControlMapping[] {
  const baseMappings: MidiControlMapping[] = [
    { cc: 1, name: 'Mod Wheel', parameter: 'brightness', min: 0, max: 1 },
    { cc: 11, name: 'Expression', parameter: 'volume', min: 0, max: 1 },
    { cc: 64, name: 'Sustain', parameter: 'sustain', min: 0, max: 1 },
  ];
  
  const typeSpecificMappings: Record<string, MidiControlMapping[]> = {
    'marimba': [
      { cc: 16, name: 'Mallet Hardness', parameter: 'malletHardness', min: 0, max: 1 },
      { cc: 17, name: 'Bar Stiffness', parameter: 'barStiffness', min: 0, max: 1 },
      { cc: 18, name: 'Tube Damping', parameter: 'tubeDamping', min: 0, max: 1 },
    ],
    'string': [
      { cc: 16, name: 'Tension', parameter: 'tension', min: 0, max: 1 },
      { cc: 17, name: 'Inharmonicity', parameter: 'inharmonicity', min: 0, max: 1 },
      { cc: 18, name: 'Damping', parameter: 'damping', min: 0, max: 1 },
    ],
    'cymbal': [
      { cc: 16, name: 'Nonlinearity', parameter: 'nonlinearGain', min: 0, max: 1 },
      { cc: 17, name: 'Shimmer', parameter: 'shimmer', min: 0, max: 1 },
      { cc: 18, name: 'High Freq Damp', parameter: 'highFreqDamping', min: 0, max: 1 },
    ],
    'gong': [
      { cc: 16, name: 'Tension', parameter: 'tension', min: 0, max: 1 },
      { cc: 17, name: 'Mode Stretch', parameter: 'modeStretch', min: 0, max: 1 },
      { cc: 18, name: 'Build Up', parameter: 'buildUpTime', min: 0, max: 1 },
    ],
  };
  
  return [
    ...baseMappings,
    ...(typeSpecificMappings[resonatorType] || []),
  ];
}

/**
 * Preset configurations for common instruments
 */
export interface ResonatorPreset {
  name: string;
  type: ExtendedResonatorType;
  parameters: Record<string, number>;
}

export const EXTENDED_RESONATOR_PRESETS: ResonatorPreset[] = [
  {
    name: 'Concert Marimba',
    type: 'marimba',
    parameters: {
      barStiffness: 0.4,
      barDamping: 0.25,
      tubeDiameter: 0.8,
      tubeLength: 0.6,
      tubeDamping: 0.3,
      malletHardness: 0.4,
      malletNoise: 0.2,
    },
  },
  {
    name: 'Bass Marimba',
    type: 'marimba',
    parameters: {
      barStiffness: 0.6,
      barDamping: 0.35,
      tubeDiameter: 0.9,
      tubeLength: 0.8,
      tubeDamping: 0.4,
      malletHardness: 0.3,
      malletNoise: 0.25,
    },
  },
  {
    name: 'Classical Gong',
    type: 'gong',
    parameters: {
      diameter: 0.9,
      nippleHeight: 0.4,
      nippleRadius: 0.25,
      thickness: 0.35,
      tension: 0.6,
      modeStretch: 0.5,
      damping: 0.12,
      buildUpTime: 0.7,
    },
  },
  {
    name: 'Wind Gong',
    type: 'gong',
    parameters: {
      diameter: 0.7,
      nippleHeight: 0.1,
      nippleRadius: 0.15,
      thickness: 0.15,
      tension: 0.3,
      modeStretch: 0.2,
      damping: 0.08,
      buildUpTime: 0.4,
    },
  },
  {
    name: 'Crash Cymbal',
    type: 'cymbal',
    parameters: {
      diameter: 0.5,
      profile: 0.3,
      taper: 0.4,
      thickness: 0.15,
      nonlinearGain: 0.7,
      shimmer: 0.8,
      damping: 0.12,
      highFreqDamping: 0.3,
    },
  },
  {
    name: 'Ride Cymbal',
    type: 'cymbal',
    parameters: {
      diameter: 0.7,
      profile: 0.5,
      taper: 0.2,
      thickness: 0.25,
      nonlinearGain: 0.4,
      shimmer: 0.3,
      damping: 0.2,
      highFreqDamping: 0.5,
    },
  },
];
