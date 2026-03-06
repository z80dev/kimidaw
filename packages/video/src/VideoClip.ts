/**
 * Video Clip
 * 
 * Represents a video clip in the timeline:
 * - Video file reference
 * - Timing and duration
 * - Warp markers for tempo sync
 * - Metadata extraction
 */

export type VideoFormat = "mp4" | "webm" | "mov" | "ogv" | "mkv";

export interface VideoMetadata {
  /** Video width in pixels */
  width: number;
  /** Video height in pixels */
  height: number;
  /** Frame rate */
  frameRate: number;
  /** Total duration in seconds */
  duration: number;
  /** Total frame count */
  frameCount: number;
  /** Video codec */
  videoCodec?: string;
  /** Audio codec */
  audioCodec?: string;
  /** Has audio track */
  hasAudio: boolean;
  /** Audio sample rate */
  audioSampleRate?: number;
  /** Audio channel count */
  audioChannels?: number;
}

export interface WarpMarker {
  /** Time in video (seconds) */
  videoTime: number;
  /** Time in song (beats) */
  beatTime: number;
}

export interface VideoClipConfig {
  /** Unique clip ID */
  id: string;
  /** Source video URL or path */
  source: string;
  /** Video format */
  format: VideoFormat;
  /** Start time in timeline (beats) */
  startBeat: number;
  /** Clip duration in timeline (beats) */
  durationBeats: number;
  /** Video start offset (seconds) */
  videoOffset: number;
  /** Warp markers for tempo sync */
  warpMarkers: WarpMarker[];
  /** Whether warping is enabled */
  warpEnabled: boolean;
  /** Original tempo (BPM) when recorded */
  originalTempo?: number;
  /** Current tempo (BPM) for warping */
  currentTempo: number;
}

export class VideoClip {
  private _config: VideoClipConfig;
  private _metadata: VideoMetadata | null = null;
  private _videoElement: HTMLVideoElement | null = null;
  private _loaded = false;
  private _error: Error | null = null;

  constructor(config: Partial<VideoClipConfig> = {}) {
    this._config = {
      id: config.id ?? `video-${Date.now()}`,
      source: config.source ?? "",
      format: config.format ?? "mp4",
      startBeat: config.startBeat ?? 0,
      durationBeats: config.durationBeats ?? 4,
      videoOffset: config.videoOffset ?? 0,
      warpMarkers: config.warpMarkers ?? [],
      warpEnabled: config.warpEnabled ?? false,
      originalTempo: config.originalTempo,
      currentTempo: config.currentTempo ?? 120,
    };
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get id(): string {
    return this._config.id;
  }

  get source(): string {
    return this._config.source;
  }

  get format(): VideoFormat {
    return this._config.format;
  }

  get startBeat(): number {
    return this._config.startBeat;
  }

  set startBeat(value: number) {
    this._config.startBeat = value;
  }

  get durationBeats(): number {
    return this._config.durationBeats;
  }

  set durationBeats(value: number) {
    this._config.durationBeats = value;
  }

  get videoOffset(): number {
    return this._config.videoOffset;
  }

  set videoOffset(value: number) {
    this._config.videoOffset = value;
  }

  get endBeat(): number {
    return this._config.startBeat + this._config.durationBeats;
  }

  get warpEnabled(): boolean {
    return this._config.warpEnabled;
  }

  set warpEnabled(value: boolean) {
    this._config.warpEnabled = value;
  }

  get warpMarkers(): WarpMarker[] {
    return [...this._config.warpMarkers];
  }

  get metadata(): VideoMetadata | null {
    return this._metadata;
  }

  get loaded(): boolean {
    return this._loaded;
  }

  get error(): Error | null {
    return this._error;
  }

  get currentTempo(): number {
    return this._config.currentTempo;
  }

  set currentTempo(value: number) {
    this._config.currentTempo = value;
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  async load(): Promise<void> {
    if (this._loaded || !this._config.source) return;

    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "metadata";

      video.addEventListener("loadedmetadata", () => {
        this._metadata = {
          width: video.videoWidth,
          height: video.videoHeight,
          frameRate: 30, // Default, would need to detect
          duration: video.duration,
          frameCount: Math.floor(video.duration * 30),
          hasAudio: video.mozHasAudio ?? false,
        };
        this._videoElement = video;
        this._loaded = true;
        resolve();
      });

      video.addEventListener("error", () => {
        this._error = new Error(`Failed to load video: ${this._config.source}`);
        reject(this._error);
      });

      video.src = this._config.source;
    });
  }

  unload(): void {
    if (this._videoElement) {
      this._videoElement.src = "";
      this._videoElement = null;
    }
    this._loaded = false;
    this._metadata = null;
    this._error = null;
  }

  // ---------------------------------------------------------------------------
  // Warping
  // ---------------------------------------------------------------------------

  addWarpMarker(videoTime: number, beatTime: number): void {
    this._config.warpMarkers.push({ videoTime, beatTime });
    this._sortWarpMarkers();
  }

  removeWarpMarker(index: number): void {
    this._config.warpMarkers.splice(index, 1);
  }

  clearWarpMarkers(): void {
    this._config.warpMarkers = [];
  }

  /**
   * Convert beat time to video time using warp markers
   */
  beatToVideoTime(beat: number): number {
    if (!this._config.warpEnabled || this._config.warpMarkers.length === 0) {
      // Linear conversion
      const tempoRatio = this._config.originalTempo 
        ? this._config.currentTempo / this._config.originalTempo 
        : 1;
      const beatDuration = (beat - this._config.startBeat) / this._config.currentTempo * 60;
      return this._config.videoOffset + beatDuration / tempoRatio;
    }

    // Find surrounding warp markers
    const markers = this._config.warpMarkers;
    
    for (let i = 0; i < markers.length - 1; i++) {
      const current = markers[i];
      const next = markers[i + 1];
      
      if (beat >= current.beatTime && beat <= next.beatTime) {
        // Interpolate
        const t = (beat - current.beatTime) / (next.beatTime - current.beatTime);
        return current.videoTime + t * (next.videoTime - current.videoTime);
      }
    }

    // Extrapolate from first or last segment
    if (markers.length > 0) {
      const first = markers[0];
      const last = markers[markers.length - 1];
      
      if (beat < first.beatTime) {
        // Before first marker
        return first.videoTime - (first.beatTime - beat) / this._config.currentTempo * 60;
      } else {
        // After last marker
        return last.videoTime + (beat - last.beatTime) / this._config.currentTempo * 60;
      }
    }

    return this._config.videoOffset;
  }

  /**
   * Convert video time to beat time using warp markers
   */
  videoTimeToBeat(videoTime: number): number {
    if (!this._config.warpEnabled || this._config.warpMarkers.length === 0) {
      const tempoRatio = this._config.originalTempo 
        ? this._config.currentTempo / this._config.originalTempo 
        : 1;
      const seconds = (videoTime - this._config.videoOffset) * tempoRatio;
      return this._config.startBeat + seconds / 60 * this._config.currentTempo;
    }

    const markers = this._config.warpMarkers;
    
    for (let i = 0; i < markers.length - 1; i++) {
      const current = markers[i];
      const next = markers[i + 1];
      
      if (videoTime >= current.videoTime && videoTime <= next.videoTime) {
        const t = (videoTime - current.videoTime) / (next.videoTime - current.videoTime);
        return current.beatTime + t * (next.beatTime - current.beatTime);
      }
    }

    return this._config.startBeat;
  }

  /**
   * Auto-warp video to current tempo
   */
  autoWarp(originalTempo?: number): void {
    const tempo = originalTempo ?? this._config.currentTempo;
    this._config.originalTempo = tempo;
    
    if (!this._metadata) return;

    // Create warp markers at regular intervals
    this._config.warpMarkers = [];
    const interval = 4; // Every 4 beats
    const totalBeats = this._config.durationBeats;
    
    for (let beat = 0; beat <= totalBeats; beat += interval) {
      const videoTime = this._config.videoOffset + (beat / tempo * 60);
      this._config.warpMarkers.push({
        videoTime,
        beatTime: this._config.startBeat + beat,
      });
    }

    this._config.warpEnabled = true;
  }

  private _sortWarpMarkers(): void {
    this._config.warpMarkers.sort((a, b) => a.beatTime - b.beatTime);
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  toJSON(): VideoClipConfig {
    return { ...this._config };
  }

  fromJSON(json: VideoClipConfig): void {
    this._config = { ...json };
    this._loaded = false;
    this._metadata = null;
  }

  clone(): VideoClip {
    const clip = new VideoClip(this._config);
    clip._metadata = this._metadata;
    return clip;
  }
}
