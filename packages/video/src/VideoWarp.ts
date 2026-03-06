/**
 * Video Warp
 * 
 * Flex video to audio tempo:
 * - Time stretching for video
 * - Frame interpolation
 * - Beat-matched playback
 */

import { VideoClip, WarpMarker } from "./VideoClip.js";

export interface WarpSettings {
  /** Original tempo the video was recorded at */
  originalTempo: number;
  /** Target tempo */
  targetTempo: number;
  /** Preserve pitch (not applicable to video) */
  preservePitch: boolean;
  /** Warp mode */
  mode: "beats" | "complex" | "repitch";
  /** Quality level */
  quality: "draft" | "normal" | "best";
}

export interface TimeStretchResult {
  /** Source time in seconds */
  sourceTime: number;
  /** Target time in seconds */
  targetTime: number;
  /** Frame interpolation factor (0-1) */
  blend: number;
}

export class VideoWarp {
  private _settings: WarpSettings;

  constructor(settings: Partial<WarpSettings> = {}) {
    this._settings = {
      originalTempo: settings.originalTempo ?? 120,
      targetTempo: settings.targetTempo ?? 120,
      preservePitch: settings.preservePitch ?? true,
      mode: settings.mode ?? "beats",
      quality: settings.quality ?? "normal",
    };
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  get settings(): WarpSettings {
    return { ...this._settings };
  }

  setSettings(settings: Partial<WarpSettings>): void {
    this._settings = { ...this._settings, ...settings };
  }

  // ---------------------------------------------------------------------------
  // Time Calculation
  // ---------------------------------------------------------------------------

  /**
   * Calculate tempo ratio
   */
  getTempoRatio(): number {
    return this._settings.targetTempo / this._settings.originalTempo;
  }

  /**
   * Convert source time to warped time
   */
  warpTime(sourceTime: number, markers?: WarpMarker[]): number {
    if (markers && markers.length > 0) {
      // Use warp markers for non-linear warping
      return this._warpWithMarkers(sourceTime, markers);
    }

    // Linear time stretching
    const ratio = this.getTempoRatio();
    return sourceTime / ratio;
  }

  /**
   * Convert warped time to source time
   */
  unwarpTime(warpedTime: number, markers?: WarpMarker[]): number {
    if (markers && markers.length > 0) {
      // Reverse warp with markers
      return this._unwarpWithMarkers(warpedTime, markers);
    }

    const ratio = this.getTempoRatio();
    return warpedTime * ratio;
  }

  private _warpWithMarkers(sourceTime: number, markers: WarpMarker[]): number {
    // Find surrounding markers
    for (let i = 0; i < markers.length - 1; i++) {
      const current = markers[i];
      const next = markers[i + 1];

      if (sourceTime >= current.videoTime && sourceTime <= next.videoTime) {
        const t = (sourceTime - current.videoTime) / (next.videoTime - current.videoTime);
        return current.beatTime / this._settings.targetTempo * 60 + 
               t * (next.beatTime - current.beatTime) / this._settings.targetTempo * 60;
      }
    }

    // Fall back to linear
    return this.warpTime(sourceTime);
  }

  private _unwarpWithMarkers(warpedTime: number, markers: WarpMarker[]): number {
    const beatTime = warpedTime / 60 * this._settings.targetTempo;

    for (let i = 0; i < markers.length - 1; i++) {
      const current = markers[i];
      const next = markers[i + 1];

      if (beatTime >= current.beatTime && beatTime <= next.beatTime) {
        const t = (beatTime - current.beatTime) / (next.beatTime - current.beatTime);
        return current.videoTime + t * (next.videoTime - current.videoTime);
      }
    }

    return this.unwarpTime(warpedTime);
  }

  // ---------------------------------------------------------------------------
  // Frame Calculation
  // ---------------------------------------------------------------------------

  /**
   * Calculate frame info for a specific warped time
   */
  calculateFrame(
    warpedTime: number,
    frameRate: number,
    markers?: WarpMarker[]
  ): TimeStretchResult {
    const sourceTime = this.unwarpTime(warpedTime, markers);
    
    // Calculate frame position
    const sourceFrame = sourceTime * frameRate;
    const frameIndex = Math.floor(sourceFrame);
    const blend = sourceFrame - frameIndex;

    return {
      sourceTime: frameIndex / frameRate,
      targetTime: warpedTime,
      blend,
    };
  }

  /**
   * Generate a complete warp map
   */
  generateWarpMap(
    duration: number,
    frameRate: number,
    markers?: WarpMarker[]
  ): TimeStretchResult[] {
    const map: TimeStretchResult[] = [];
    const totalFrames = Math.ceil(duration * frameRate);

    for (let i = 0; i < totalFrames; i++) {
      const warpedTime = i / frameRate;
      map.push(this.calculateFrame(warpedTime, frameRate, markers));
    }

    return map;
  }

  // ---------------------------------------------------------------------------
  // Quality Settings
  // ---------------------------------------------------------------------------

  /**
   * Get frame blending mode based on quality
   */
  getBlendMode(): "none" | "linear" | "optical-flow" {
    switch (this._settings.quality) {
      case "draft":
        return "none";
      case "normal":
        return "linear";
      case "best":
        return "optical-flow";
      default:
        return "linear";
    }
  }

  // ---------------------------------------------------------------------------
  // Clip Processing
  // ---------------------------------------------------------------------------

  /**
   * Apply warp settings to a video clip
   */
  applyToClip(clip: VideoClip): void {
    if (!clip.warpEnabled) {
      // Create default warp markers
      clip.autoWarp(this._settings.originalTempo);
    }

    // Update clip tempo
    clip.currentTempo = this._settings.targetTempo;
  }

  /**
   * Calculate the duration change factor
   */
  getDurationFactor(): number {
    return this._settings.originalTempo / this._settings.targetTempo;
  }
}

// =============================================================================
// Frame Interpolation
// =============================================================================

export interface FrameInterpolator {
  interpolate(frameA: ImageData, frameB: ImageData, blend: number): ImageData;
}

export class LinearFrameInterpolator implements FrameInterpolator {
  interpolate(frameA: ImageData, frameB: ImageData, blend: number): ImageData {
    const width = frameA.width;
    const height = frameA.height;
    const result = new ImageData(width, height);

    const dataA = frameA.data;
    const dataB = frameB.data;
    const dataOut = result.data;

    const invBlend = 1 - blend;

    for (let i = 0; i < dataA.length; i++) {
      dataOut[i] = Math.round(dataA[i] * invBlend + dataB[i] * blend);
    }

    return result;
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createVideoWarp(settings?: Partial<WarpSettings>): VideoWarp {
  return new VideoWarp(settings);
}
