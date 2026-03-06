/**
 * MPE Control MIDI effect types
 * 
 * MPE (MIDI Polyphonic Expression) allows per-note control of:
 * - Pitch bend (per-note)
 * - CC74 (timbre/slide)
 * - Channel pressure (per-note)
 */

/** MPE zone configuration */
export interface MPEZone {
  /** Master channel for zone */
  masterChannel: number;
  /** Number of member channels */
  memberChannels: number;
}

/** Per-note pitch bend configuration */
export interface PitchBendConfig {
  /** Bend range in semitones (-24 to +24) */
  range: number;
  /** Enable per-note pitch bend */
  enabled: boolean;
  /** Smoothing amount (0-100%) */
  smoothing: number;
}

/** Slide (CC74) configuration */
export interface SlideConfig {
  /** Enable slide processing */
  enabled: boolean;
  /** Input range min (0-127) */
  inMin: number;
  /** Input range max (0-127) */
  inMax: number;
  /** Output range min (0-127) */
  outMin: number;
  /** Output range max (0-127) */
  outMax: number;
  /** Curve type: linear, exp, log */
  curve: "linear" | "exp" | "log";
}

/** Pressure configuration */
export interface PressureConfig {
  /** Enable pressure processing */
  enabled: boolean;
  /** Input range min (0-127) */
  inMin: number;
  /** Input range max (0-127) */
  inMax: number;
  /** Output range min (0-127) */
  outMin: number;
  /** Output range max (0-127) */
  outMax: number;
  /** Response curve */
  curve: "linear" | "exp" | "log";
}

/** MPE Control parameters */
export interface MPEControlParams {
  /** Upper zone configuration */
  upperZone: MPEZone;
  /** Lower zone configuration */
  lowerZone: MPEZone;
  /** Per-note pitch bend */
  pitchBend: PitchBendConfig;
  /** Slide (CC74) */
  slide: SlideConfig;
  /** Channel/pressure */
  pressure: PressureConfig;
  /** Enable MPE output */
  mpeEnabled: boolean;
  /** Round-robin voice allocation */
  voiceAllocation: "round-robin" | "lowest" | "highest" | "last";
}

/** Default MPE control parameters */
export const DEFAULT_MPE_CONTROL_PARAMS: MPEControlParams = {
  upperZone: {
    masterChannel: 15, // Channel 16 (0-indexed)
    memberChannels: 15,
  },
  lowerZone: {
    masterChannel: 0, // Channel 1 (0-indexed)
    memberChannels: 0,
  },
  pitchBend: {
    range: 48,
    enabled: true,
    smoothing: 0,
  },
  slide: {
    enabled: true,
    inMin: 0,
    inMax: 127,
    outMin: 0,
    outMax: 127,
    curve: "linear",
  },
  pressure: {
    enabled: true,
    inMin: 0,
    inMax: 127,
    outMin: 0,
    outMax: 127,
    curve: "linear",
  },
  mpeEnabled: true,
  voiceAllocation: "round-robin",
};

/** Per-note MPE state */
export interface MPENoteState {
  /** Note number */
  note: number;
  /** Assigned channel */
  channel: number;
  /** Current pitch bend value */
  pitchBend: number;
  /** Current slide value */
  slide: number;
  /** Current pressure value */
  pressure: number;
  /** Velocity */
  velocity: number;
  /** Start time */
  startTime: number;
}

/** MPE modulation routing */
export interface MPERouting {
  /** Source: pitch-bend, slide, pressure */
  source: "pitch-bend" | "slide" | "pressure";
  /** Target parameter */
  target: string;
  /** Amount (-100 to +100%) */
  amount: number;
  /** Enable */
  enabled: boolean;
}
