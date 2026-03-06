/**
 * Live API - Max for Live-style API for controlling the DAW
 * 
 * Provides programmatic access to Live/DAW functionality:
 * - Transport control (play, stop, record)
 * - Track and clip access
 * - Parameter automation
 * - Song structure manipulation
 */

// =============================================================================
// Types
// =============================================================================

export interface SongInfo {
  /** Current tempo in BPM */
  tempo: number;
  /** Time signature numerator */
  timeSigNumerator: number;
  /** Time signature denominator */
  timeSigDenominator: number;
  /** Current playhead position in beats */
  currentBeat: number;
  /** Current playhead position in seconds */
  currentTime: number;
  /** Whether transport is playing */
  isPlaying: boolean;
  /** Whether transport is recording */
  isRecording: boolean;
  /** Loop start in beats */
  loopStart: number;
  /** Loop end in beats */
  loopEnd: number;
  /** Whether loop is enabled */
  loopEnabled: boolean;
}

export interface TrackInfo {
  /** Track index */
  index: number;
  /** Track name */
  name: string;
  /** Whether track is armed for recording */
  armed: boolean;
  /** Whether track is muted */
  mute: boolean;
  /** Whether track is soloed */
  solo: boolean;
  /** Track volume (0-1) */
  volume: number;
  /** Track pan (-1 to 1) */
  pan: number;
  /** Number of clips in track */
  numClips: number;
  /** Device count */
  numDevices: number;
}

export interface ClipInfo {
  /** Clip index in track */
  index: number;
  /** Clip name */
  name: string;
  /** Clip length in beats */
  length: number;
  /** Clip start time in beats */
  startTime: number;
  /** Whether clip is a loop */
  isLooping: boolean;
  /** Loop start within clip */
  loopStart: number;
  /** Loop end within clip */
  loopEnd: number;
  /** Clip color (RGB) */
  color: number;
  /** Whether clip has audio */
  hasAudio: boolean;
  /** Whether clip has MIDI */
  hasMidi: boolean;
}

export interface DeviceInfo {
  /** Device index in track */
  index: number;
  /** Device name */
  name: string;
  /** Device type */
  type: "instrument" | "audioFx" | "midiFx";
  /** Whether device is enabled */
  enabled: boolean;
  /** Number of parameters */
  numParameters: number;
}

export interface DeviceParameter {
  /** Parameter index */
  index: number;
  /** Parameter name */
  name: string;
  /** Current value */
  value: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Whether parameter is automatable */
  isAutomatable: boolean;
}

// =============================================================================
// Live API Class
// =============================================================================

export class LiveAPI {
  private _hostCallback: (path: string, ...args: unknown[]) => Promise<unknown>;
  private _listeners: Map<string, Set<(value: unknown) => void>> = new Map();

  constructor(hostCallback: (path: string, ...args: unknown[]) => Promise<unknown>) {
    this._hostCallback = hostCallback;
  }

  // ---------------------------------------------------------------------------
  // Song/Transport
  // ---------------------------------------------------------------------------

  async getSongInfo(): Promise<SongInfo> {
    return this._hostCallback("get_song_info") as Promise<SongInfo>;
  }

  async setTempo(bpm: number): Promise<void> {
    await this._hostCallback("set_tempo", bpm);
  }

  async play(): Promise<void> {
    await this._hostCallback("play");
  }

  async stop(): Promise<void> {
    await this._hostCallback("stop");
  }

  async continuePlaying(): Promise<void> {
    await this._hostCallback("continue_playing");
  }

  async togglePlay(): Promise<void> {
    await this._hostCallback("toggle_play");
  }

  async startRecording(): Promise<void> {
    await this._hostCallback("start_recording");
  }

  async stopRecording(): Promise<void> {
    await this._hostCallback("stop_recording");
  }

  async setCurrentBeat(beat: number): Promise<void> {
    await this._hostCallback("set_current_beat", beat);
  }

  async setLoop(startBeat: number, endBeat: number, enabled = true): Promise<void> {
    await this._hostCallback("set_loop", startBeat, endBeat, enabled);
  }

  async setTimeSignature(numerator: number, denominator: number): Promise<void> {
    await this._hostCallback("set_time_signature", numerator, denominator);
  }

  // ---------------------------------------------------------------------------
  // Tracks
  // ---------------------------------------------------------------------------

  async getTrackCount(): Promise<number> {
    return this._hostCallback("get_track_count") as Promise<number>;
  }

  async getTrack(index: number): Promise<TrackInfo> {
    return this._hostCallback("get_track", index) as Promise<TrackInfo>;
  }

  async getTracks(): Promise<TrackInfo[]> {
    const count = await this.getTrackCount();
    const tracks: TrackInfo[] = [];
    for (let i = 0; i < count; i++) {
      tracks.push(await this.getTrack(i));
    }
    return tracks;
  }

  async setTrackVolume(trackIndex: number, volume: number): Promise<void> {
    await this._hostCallback("set_track_volume", trackIndex, volume);
  }

  async setTrackPan(trackIndex: number, pan: number): Promise<void> {
    await this._hostCallback("set_track_pan", trackIndex, pan);
  }

  async setTrackMute(trackIndex: number, mute: boolean): Promise<void> {
    await this._hostCallback("set_track_mute", trackIndex, mute);
  }

  async setTrackSolo(trackIndex: number, solo: boolean): Promise<void> {
    await this._hostCallback("set_track_solo", trackIndex, solo);
  }

  async setTrackArm(trackIndex: number, arm: boolean): Promise<void> {
    await this._hostCallback("set_track_arm", trackIndex, arm);
  }

  async setTrackName(trackIndex: number, name: string): Promise<void> {
    await this._hostCallback("set_track_name", trackIndex, name);
  }

  // ---------------------------------------------------------------------------
  // Clips
  // ---------------------------------------------------------------------------

  async getClipCount(trackIndex: number): Promise<number> {
    return this._hostCallback("get_clip_count", trackIndex) as Promise<number>;
  }

  async getClip(trackIndex: number, clipIndex: number): Promise<ClipInfo> {
    return this._hostCallback("get_clip", trackIndex, clipIndex) as Promise<ClipInfo>;
  }

  async fireClip(trackIndex: number, clipIndex: number): Promise<void> {
    await this._hostCallback("fire_clip", trackIndex, clipIndex);
  }

  async stopClip(trackIndex: number, clipIndex: number): Promise<void> {
    await this._hostCallback("stop_clip", trackIndex, clipIndex);
  }

  async createClip(trackIndex: number, clipIndex: number, length: number): Promise<void> {
    await this._hostCallback("create_clip", trackIndex, clipIndex, length);
  }

  async deleteClip(trackIndex: number, clipIndex: number): Promise<void> {
    await this._hostCallback("delete_clip", trackIndex, clipIndex);
  }

  async duplicateClip(trackIndex: number, clipIndex: number): Promise<void> {
    await this._hostCallback("duplicate_clip", trackIndex, clipIndex);
  }

  // ---------------------------------------------------------------------------
  // Devices
  // ---------------------------------------------------------------------------

  async getDeviceCount(trackIndex: number): Promise<number> {
    return this._hostCallback("get_device_count", trackIndex) as Promise<number>;
  }

  async getDevice(trackIndex: number, deviceIndex: number): Promise<DeviceInfo> {
    return this._hostCallback("get_device", trackIndex, deviceIndex) as Promise<DeviceInfo>;
  }

  async getDeviceParameter(
    trackIndex: number,
    deviceIndex: number,
    parameterIndex: number
  ): Promise<DeviceParameter> {
    return this._hostCallback(
      "get_device_parameter",
      trackIndex,
      deviceIndex,
      parameterIndex
    ) as Promise<DeviceParameter>;
  }

  async setDeviceParameter(
    trackIndex: number,
    deviceIndex: number,
    parameterIndex: number,
    value: number
  ): Promise<void> {
    await this._hostCallback("set_device_parameter", trackIndex, deviceIndex, parameterIndex, value);
  }

  async setDeviceEnabled(trackIndex: number, deviceIndex: number, enabled: boolean): Promise<void> {
    await this._hostCallback("set_device_enabled", trackIndex, deviceIndex, enabled);
  }

  // ---------------------------------------------------------------------------
  // Scenes
  // ---------------------------------------------------------------------------

  async getSceneCount(): Promise<number> {
    return this._hostCallback("get_scene_count") as Promise<number>;
  }

  async fireScene(sceneIndex: number): Promise<void> {
    await this._hostCallback("fire_scene", sceneIndex);
  }

  async stopAllClips(): Promise<void> {
    await this._hostCallback("stop_all_clips");
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  addListener(path: string, callback: (value: unknown) => void): void {
    if (!this._listeners.has(path)) {
      this._listeners.set(path, new Set());
    }
    this._listeners.get(path)!.add(callback);
  }

  removeListener(path: string, callback: (value: unknown) => void): void {
    const listeners = this._listeners.get(path);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  notifyListeners(path: string, value: unknown): void {
    const listeners = this._listeners.get(path);
    if (listeners) {
      for (const callback of listeners) {
        callback(value);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  async undo(): Promise<void> {
    await this._hostCallback("undo");
  }

  async redo(): Promise<void> {
    await this._hostCallback("redo");
  }

  async save(): Promise<void> {
    await this._hostCallback("save");
  }

  async quantize(
    trackIndex: number,
    clipIndex: number,
    quantization: number = 1
  ): Promise<void> {
    await this._hostCallback("quantize", trackIndex, clipIndex, quantization);
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createLiveAPI(
  hostCallback: (path: string, ...args: unknown[]) => Promise<unknown>
): LiveAPI {
  return new LiveAPI(hostCallback);
}
