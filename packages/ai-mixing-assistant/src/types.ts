/**
 * AI Mixing Assistant Types
 */

export type TrackType = 'kick' | 'snare' | 'hihat' | 'toms' | 'cymbals' | 
  'bass' | 'guitar' | 'keys' | 'synth' | 'pad' | 
  'lead-vocal' | 'backing-vocal' | 'rap-vocal' |
  'brass' | 'strings' | 'woodwinds' |
  'fx' | 'ambience' | 'other';

export type ProblemType = 
  | 'clipping' 
  | 'low-level' 
  | 'frequency-masking' 
  | 'muddy-lows' 
  | 'harsh-mids' 
  | 'brittle-highs'
  | 'mono-compatibility'
  | 'phase-issues'
  | 'dynamic-range'
  | 'stereo-imbalance';

export type SuggestionType = 
  | 'gain' 
  | 'eq' 
  | 'compressor' 
  | 'pan' 
  | 'reverb-send' 
  | 'delay-send'
  | 'saturate'
  | 'high-pass'
  | 'low-pass';

export interface TrackAnalysis {
  id: string;
  name: string;
  type: TrackType;
  
  // Levels
  peakLevel: number; // dB
  rmsLevel: number; // dB
  crestFactor: number; // dB
  
  // Frequency
  spectralBalance: {
    low: number; // 20-250Hz
    lowMid: number; // 250-500Hz
    mid: number; // 500Hz-2kHz
    highMid: number; // 2kHz-6kHz
    high: number; // 6kHz-20kHz
  };
  
  // Dynamics
  dynamicRange: number; // dB
  transientEnergy: number;
  sustainEnergy: number;
  
  // Stereo
  stereoWidth: number;
  panPreference: number; // -1 to 1 suggested
  
  // Issues
  problems: Problem[];
}

export interface Problem {
  type: ProblemType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  frequencyRange?: [number, number];
  timeRange?: [number, number];
}

export interface MixSuggestion {
  id: string;
  trackId?: string;
  type: SuggestionType;
  priority: 'low' | 'medium' | 'high';
  description: string;
  reasoning: string;
  
  // Specific settings
  settings?: {
    gain?: number;
    freq?: number;
    q?: number;
    threshold?: number;
    ratio?: number;
    pan?: number;
    sendLevel?: number;
  };
  
  // Auto-apply available?
  autoApplicable: boolean;
}

export interface MixAnalysis {
  tracks: TrackAnalysis[];
  overallLoudness: number; // LUFS
  overallDynamicRange: number;
  frequencyBalance: {
    bass: number;
    mids: number;
    treble: number;
  };
  stereoField: {
    width: number;
    balance: number;
  };
  phaseCorrelation: number;
  headroom: number;
  issues: Problem[];
}

export interface MixingAssistant {
  analyzeTrack(audioBuffer: AudioBuffer, trackType: TrackType): Promise<TrackAnalysis>;
  analyzeMix(tracks: TrackAnalysis[]): Promise<MixAnalysis>;
  getSuggestions(analysis: MixAnalysis): MixSuggestion[];
  getSuggestionsForTrack(track: TrackAnalysis): MixSuggestion[];
  detectMasking(tracks: TrackAnalysis[]): Array<{ track1: string; track2: string; frequency: number }>;
  suggestBalance(analysis: MixAnalysis): Array<{ trackId: string; gainChange: number }>;
  createSubgroups(tracks: TrackAnalysis[]): Array<{ name: string; trackIds: string[] }>;
}

// Track type characteristics for mixing
export const TRACK_TYPE_CHARACTERISTICS: Record<TrackType, {
  targetLevel: number; // dB RMS
  targetDynamicRange: [number, number];
  freqRange: [number, number];
  defaultPan: number;
  eqSuggestions: Array<{ freq: number; gain: number; q: number; type: string }>;
}> = {
  kick: {
    targetLevel: -18,
    targetDynamicRange: [8, 15],
    freqRange: [30, 150],
    defaultPan: 0,
    eqSuggestions: [
      { freq: 60, gain: 2, q: 1, type: 'boost' },
      { freq: 400, gain: -3, q: 2, type: 'cut' },
      { freq: 5000, gain: 2, q: 1.5, type: 'boost' }
    ]
  },
  snare: {
    targetLevel: -16,
    targetDynamicRange: [6, 12],
    freqRange: [100, 8000],
    defaultPan: 0,
    eqSuggestions: [
      { freq: 200, gain: -2, q: 1.5, type: 'cut' },
      { freq: 2000, gain: 3, q: 1, type: 'boost' }
    ]
  },
  bass: {
    targetLevel: -17,
    targetDynamicRange: [5, 10],
    freqRange: [40, 400],
    defaultPan: 0,
    eqSuggestions: [
      { freq: 100, gain: 2, q: 1, type: 'boost' },
      { freq: 250, gain: -2, q: 1.5, type: 'cut' },
      { freq: 2500, gain: 2, q: 1, type: 'boost' }
    ]
  },
  'lead-vocal': {
    targetLevel: -14,
    targetDynamicRange: [8, 15],
    freqRange: [100, 12000],
    defaultPan: 0,
    eqSuggestions: [
      { freq: 100, gain: -4, q: 2, type: 'high-pass' },
      { freq: 3000, gain: 2, q: 1.5, type: 'boost' },
      { freq: 8000, gain: 2, q: 1, type: 'air' }
    ]
  },
  // ... more track types
  hihat: { targetLevel: -22, targetDynamicRange: [5, 15], freqRange: [5000, 20000], defaultPan: 0.3, eqSuggestions: [] },
  toms: { targetLevel: -20, targetDynamicRange: [8, 15], freqRange: [60, 800], defaultPan: 0, eqSuggestions: [] },
  cymbals: { targetLevel: -24, targetDynamicRange: [10, 20], freqRange: [4000, 20000], defaultPan: -0.5, eqSuggestions: [] },
  guitar: { targetLevel: -18, targetDynamicRange: [8, 18], freqRange: [80, 8000], defaultPan: -0.6, eqSuggestions: [] },
  keys: { targetLevel: -19, targetDynamicRange: [10, 20], freqRange: [100, 10000], defaultPan: 0.4, eqSuggestions: [] },
  synth: { targetLevel: -18, targetDynamicRange: [8, 20], freqRange: [100, 15000], defaultPan: 0, eqSuggestions: [] },
  pad: { targetLevel: -22, targetDynamicRange: [5, 15], freqRange: [200, 8000], defaultPan: 0, eqSuggestions: [] },
  'backing-vocal': { targetLevel: -20, targetDynamicRange: [10, 18], freqRange: [200, 10000], defaultPan: 0.5, eqSuggestions: [] },
  'rap-vocal': { targetLevel: -14, targetDynamicRange: [10, 18], freqRange: [100, 10000], defaultPan: 0, eqSuggestions: [] },
  brass: { targetLevel: -17, targetDynamicRange: [10, 20], freqRange: [200, 8000], defaultPan: -0.4, eqSuggestions: [] },
  strings: { targetLevel: -20, targetDynamicRange: [10, 25], freqRange: [200, 12000], defaultPan: 0.6, eqSuggestions: [] },
  woodwinds: { targetLevel: -19, targetDynamicRange: [10, 22], freqRange: [200, 10000], defaultPan: 0.3, eqSuggestions: [] },
  fx: { targetLevel: -25, targetDynamicRange: [5, 30], freqRange: [100, 20000], defaultPan: 0, eqSuggestions: [] },
  ambience: { targetLevel: -26, targetDynamicRange: [10, 30], freqRange: [200, 15000], defaultPan: 0, eqSuggestions: [] },
  other: { targetLevel: -20, targetDynamicRange: [8, 20], freqRange: [100, 15000], defaultPan: 0, eqSuggestions: [] }
};
