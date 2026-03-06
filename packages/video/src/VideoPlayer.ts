/**
 * Video Player
 * 
 * Synchronized video playback:
 * - Sync to transport
 * - Frame-accurate positioning
 * - Multiple video clips
 * - Output to canvas
 */

import { VideoClip, VideoFormat } from "./VideoClip.js";

export interface VideoPlayerConfig {
  /** Output canvas element */
  canvas: HTMLCanvasElement;
  /** Context for 2D rendering */
  ctx: CanvasRenderingContext2D;
  /** Current tempo in BPM */
  tempo: number;
  /** Transport playing state */
  isPlaying: boolean;
  /** Current playhead position in beats */
  currentBeat: number;
}

export interface VideoClipInstance {
  clip: VideoClip;
  video: HTMLVideoElement;
  lastBeat: number;
  isReady: boolean;
}

export class VideoPlayer {
  private _config: VideoPlayerConfig;
  private _clips: VideoClipInstance[] = [];
  private _preloadedVideos: Map<string, HTMLVideoElement> = new Map();
  private _animationFrame: number | null = null;
  private _lastRenderTime = 0;

  constructor(canvas: HTMLCanvasElement, tempo = 120) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context from canvas");
    }

    this._config = {
      canvas,
      ctx,
      tempo,
      isPlaying: false,
      currentBeat: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get canvas(): HTMLCanvasElement {
    return this._config.canvas;
  }

  get tempo(): number {
    return this._config.tempo;
  }

  set tempo(value: number) {
    this._config.tempo = value;
    // Update tempo on all clips
    for (const instance of this._clips) {
      instance.clip.currentTempo = value;
    }
  }

  get isPlaying(): boolean {
    return this._config.isPlaying;
  }

  get currentBeat(): number {
    return this._config.currentBeat;
  }

  // ---------------------------------------------------------------------------
  // Clip Management
  // ---------------------------------------------------------------------------

  async addClip(clip: VideoClip): Promise<void> {
    // Preload video
    const video = await this._preloadVideo(clip.source);
    
    this._clips.push({
      clip,
      video,
      lastBeat: -1,
      isReady: true,
    });

    // Sort clips by start time
    this._clips.sort((a, b) => a.clip.startBeat - b.clip.startBeat);
  }

  removeClip(clipId: string): void {
    const index = this._clips.findIndex(c => c.clip.id === clipId);
    if (index >= 0) {
      const instance = this._clips[index];
      instance.video.pause();
      instance.video.src = "";
      this._clips.splice(index, 1);
    }
  }

  clearClips(): void {
    for (const instance of this._clips) {
      instance.video.pause();
      instance.video.src = "";
    }
    this._clips = [];
  }

  getClips(): VideoClip[] {
    return this._clips.map(c => c.clip);
  }

  // ---------------------------------------------------------------------------
  // Transport Control
  // ---------------------------------------------------------------------------

  play(): void {
    this._config.isPlaying = true;
    this._startRenderLoop();
    
    // Start all visible videos
    for (const instance of this._clips) {
      if (this._isClipVisible(instance)) {
        instance.video.play().catch(() => {
          // Ignore play errors (e.g., autoplay restrictions)
        });
      }
    }
  }

  pause(): void {
    this._config.isPlaying = false;
    this._stopRenderLoop();
    
    // Pause all videos
    for (const instance of this._clips) {
      instance.video.pause();
    }
  }

  stop(): void {
    this._config.isPlaying = false;
    this._config.currentBeat = 0;
    this._stopRenderLoop();
    
    // Reset and pause all videos
    for (const instance of this._clips) {
      instance.video.pause();
      instance.video.currentTime = 0;
    }
    
    this._render();
  }

  seekToBeat(beat: number): void {
    this._config.currentBeat = beat;
    
    // Update video positions
    for (const instance of this._clips) {
      const videoTime = instance.clip.beatToVideoTime(beat);
      if (videoTime >= 0 && videoTime <= instance.video.duration) {
        instance.video.currentTime = videoTime;
      }
    }
    
    this._render();
  }

  setTransportState(isPlaying: boolean, currentBeat: number): void {
    this._config.currentBeat = currentBeat;
    
    if (isPlaying !== this._config.isPlaying) {
      if (isPlaying) {
        this.play();
      } else {
        this.pause();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  private _startRenderLoop(): void {
    if (this._animationFrame !== null) return;
    
    const loop = () => {
      this._render();
      this._animationFrame = requestAnimationFrame(loop);
    };
    
    this._animationFrame = requestAnimationFrame(loop);
  }

  private _stopRenderLoop(): void {
    if (this._animationFrame !== null) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  private _render(): void {
    const { ctx, canvas } = this._config;
    const currentBeat = this._config.currentBeat;

    // Clear canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Find active clips
    for (const instance of this._clips) {
      if (!instance.isReady) continue;

      const clip = instance.clip;
      
      // Check if clip is active at current beat
      if (currentBeat >= clip.startBeat && currentBeat <= clip.endBeat) {
        const videoTime = clip.beatToVideoTime(currentBeat);
        
        // Update video time if playing
        if (this._config.isPlaying) {
          const timeDiff = Math.abs(instance.video.currentTime - videoTime);
          if (timeDiff > 0.1) {
            instance.video.currentTime = videoTime;
          }
        }

        // Draw video frame
        if (instance.video.readyState >= 2) {
          this._drawVideoFrame(instance.video);
        }

        instance.lastBeat = currentBeat;
      }
    }
  }

  private _drawVideoFrame(video: HTMLVideoElement): void {
    const { ctx, canvas } = this._config;
    
    // Calculate aspect ratio preserving scale
    const scale = Math.min(
      canvas.width / video.videoWidth,
      canvas.height / video.videoHeight
    );
    
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;
    
    ctx.drawImage(video, x, y, width, height);
  }

  private _isClipVisible(instance: VideoClipInstance): boolean {
    const beat = this._config.currentBeat;
    return beat >= instance.clip.startBeat && beat <= instance.clip.endBeat;
  }

  // ---------------------------------------------------------------------------
  // Preloading
  // ---------------------------------------------------------------------------

  private async _preloadVideo(source: string): Promise<HTMLVideoElement> {
    // Check cache
    if (this._preloadedVideos.has(source)) {
      return this._preloadedVideos.get(source)!;
    }

    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      video.muted = true; // Mute for autoplay
      video.playsInline = true; // Required for iOS

      video.addEventListener("canplaythrough", () => {
        this._preloadedVideos.set(source, video);
        resolve(video);
      });

      video.addEventListener("error", () => {
        reject(new Error(`Failed to load video: ${source}`));
      });

      video.src = source;
    });
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  resize(width: number, height: number): void {
    this._config.canvas.width = width;
    this._config.canvas.height = height;
  }

  dispose(): void {
    this._stopRenderLoop();
    this.clearClips();
    this._preloadedVideos.clear();
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createVideoPlayer(canvas: HTMLCanvasElement, tempo = 120): VideoPlayer {
  return new VideoPlayer(canvas, tempo);
}
