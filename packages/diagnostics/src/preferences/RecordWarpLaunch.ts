/**
 * Record/Warp/Launch Preferences
 * 
 * Default settings for recording, warping, and clip launching.
 */

export type CountInDuration = 'none' | '1-bar' | '2-bars' | '4-bars';
export type WarpMode = 'beats' | 'tones' | 'texture' | 're-pitch' | 
                       'complex' | 'complex-pro' | 'grains' | 'repitch' | 
                       'r' | 'pro' | 'auto';
export type LaunchMode = 'trigger' | 'gate' | 'toggle' | 'repeat';
export type Quantization = 'none' | '8-bars' | '4-bars' | '2-bars' | '1-bar' | 
                           '1/2' | '1/4' | '1/8' | '1/16' | '1/32';
export type NoteQuantization = 'none' | '1/4' | '1/8' | '1/8t' | '1/8+1/8t' | 
                               '1/16' | '1/16t' | '1/16+1/16t' | '1/32';

export interface RecordPreferences {
  /** Count-in duration before recording */
  countIn: CountInDuration;
  
  /** Recording file format */
  fileType: 'wav' | 'aif' | 'flac';
  
  /** Recording bit depth */
  bitDepth: 16 | 24 | 32;
  
  /** Recording sample rate */
  sampleRate: 'project' | 44100 | 48000 | 88200 | 96000;
  
  /** Create take lanes for multiple takes */
  createTakeLanes: boolean;
  
  /** Start recording when scene is launched */
  startRecordingOnSceneLaunch: boolean;
  
  /** Start playback when recording starts */
  startPlaybackWithRecording: boolean;
}

export interface LoopPreferences {
  /** Default loop length for new clips */
  defaultLoopLength: string;
  
  /** Default loop position */
  defaultPosition: string;
}

export interface WarpPreferences {
  /** Default warp mode for new clips */
  defaultMode: WarpMode;
  
  /** Auto-warp long samples */
  autoWarpLongSamples: boolean;
  
  /** Auto-warp short samples */
  autoWarpShortSamples: boolean;
  
  /** Default beat division for warping */
  defaultBeat: string;
  
  /** Loop preferences */
  loop: LoopPreferences;
}

export interface LaunchPreferences {
  /** Default clip launch mode */
  defaultLaunchMode: LaunchMode;
  
  /** Default launch quantization */
  defaultQuantization: Quantization;
  
  /** Selected scene launch quantization */
  selectedSceneQuantization: Quantization;
  
  /** Recording quantization */
  recordQuantization: NoteQuantization;
  
  /** Start transport with first clip launch */
  startTransportWithFirstClip: boolean;
  
  /** Restart transport with next clip launch */
  restartTransportWithNextClip: boolean;
  
  /** Allow tempo changes from clips */
  allowTempoChanges: boolean;
}

export interface RecordWarpLaunchPreferences {
  record: RecordPreferences;
  warp: WarpPreferences;
  launch: LaunchPreferences;
}

/**
 * Get warp mode description
 */
export function getWarpModeDescription(mode: WarpMode): string {
  const descriptions: Record<WarpMode, string> = {
    'beats': 'Optimized for rhythmic material',
    'tones': 'Optimized for tonal material',
    'texture': 'Optimized for textured material',
    're-pitch': 'Changes pitch with tempo',
    'complex': 'High-quality general purpose',
    'complex-pro': 'Best quality, higher CPU',
    'grains': 'Granular synthesis',
    'repitch': 'Repitch mode',
    'r': 'R mode',
    'pro': 'Pro mode',
    'auto': 'Auto-detect mode',
  };
  
  return descriptions[mode] || 'Unknown mode';
}

/**
 * Get launch mode description
 */
export function getLaunchModeDescription(mode: LaunchMode): string {
  const descriptions: Record<LaunchMode, string> = {
    'trigger': 'Clip plays from start when triggered',
    'gate': 'Clip plays while button held',
    'toggle': 'Clip toggles between play and stop',
    'repeat': 'Clip repeats while button held',
  };
  
  return descriptions[mode] || 'Unknown mode';
}

/**
 * Get quantization value in beats
 */
export function getQuantizationBeats(q: Quantization): number {
  const values: Record<Quantization, number> = {
    'none': 0,
    '8-bars': 32,
    '4-bars': 16,
    '2-bars': 8,
    '1-bar': 4,
    '1/2': 2,
    '1/4': 1,
    '1/8': 0.5,
    '1/16': 0.25,
    '1/32': 0.125,
  };
  
  return values[q] || 0;
}

/**
 * Validate record/warp/launch preferences
 */
export function validateRecordWarpLaunchPreferences(
  prefs: RecordWarpLaunchPreferences
): string[] {
  const errors: string[] = [];
  
  if (![16, 24, 32].includes(prefs.record.bitDepth)) {
    errors.push('Invalid recording bit depth');
  }
  
  return errors;
}
