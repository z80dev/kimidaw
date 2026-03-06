/**
 * Video Exporter
 * 
 * Render audio + video together:
 * - Export video with audio mix
 * - Multiple format support
 * - Quality settings
 * - Progress callbacks
 */

import { VideoClip } from "./VideoClip.js";

export type ExportFormat = "mp4" | "webm" | "gif";
export type ExportQuality = "low" | "medium" | "high" | "lossless";

export interface ExportConfig {
  /** Output format */
  format: ExportFormat;
  /** Video quality */
  quality: ExportQuality;
  /** Video width */
  width: number;
  /** Video height */
  height: number;
  /** Frame rate */
  frameRate: number;
  /** Video bitrate (bps) */
  videoBitrate?: number;
  /** Audio bitrate (bps) */
  audioBitrate?: number;
  /** Start time in beats */
  startBeat: number;
  /** Duration in beats */
  durationBeats: number;
  /** Tempo for timing */
  tempo: number;
  /** Include audio */
  includeAudio: boolean;
  /** Callback for progress updates */
  onProgress?: (progress: number) => void;
  /** Callback for completion */
  onComplete?: (blob: Blob) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

export interface ExportJob {
  id: string;
  config: ExportConfig;
  clips: VideoClip[];
  audioBuffer?: AudioBuffer;
  status: "pending" | "rendering" | "encoding" | "complete" | "error";
  progress: number;
  result?: Blob;
  error?: Error;
  startTime: number;
  endTime?: number;
}

export class VideoExporter {
  private _jobs: Map<string, ExportJob> = new Map();
  private _mediaRecorder: MediaRecorder | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;

  // ---------------------------------------------------------------------------
  // Export Job Management
  // ---------------------------------------------------------------------------

  createJob(
    clips: VideoClip[],
    config: Partial<ExportConfig>,
    audioBuffer?: AudioBuffer
  ): ExportJob {
    const id = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullConfig: ExportConfig = {
      format: config.format ?? "mp4",
      quality: config.quality ?? "high",
      width: config.width ?? 1920,
      height: config.height ?? 1080,
      frameRate: config.frameRate ?? 30,
      startBeat: config.startBeat ?? 0,
      durationBeats: config.durationBeats ?? 16,
      tempo: config.tempo ?? 120,
      includeAudio: config.includeAudio ?? true,
      onProgress: config.onProgress,
      onComplete: config.onComplete,
      onError: config.onError,
    };

    const job: ExportJob = {
      id,
      config: fullConfig,
      clips,
      audioBuffer,
      status: "pending",
      progress: 0,
      startTime: Date.now(),
    };

    this._jobs.set(id, job);
    return job;
  }

  async startJob(jobId: string): Promise<void> {
    const job = this._jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== "pending") {
      throw new Error(`Job already started: ${jobId}`);
    }

    job.status = "rendering";

    try {
      await this._renderJob(job);
    } catch (error) {
      job.status = "error";
      job.error = error instanceof Error ? error : new Error(String(error));
      job.config.onError?.(job.error);
    }
  }

  cancelJob(jobId: string): boolean {
    const job = this._jobs.get(jobId);
    if (!job) return false;

    if (job.status === "rendering" || job.status === "encoding") {
      this._mediaRecorder?.stop();
      job.status = "error";
      job.error = new Error("Export cancelled");
      return true;
    }

    return false;
  }

  getJob(jobId: string): ExportJob | undefined {
    return this._jobs.get(jobId);
  }

  getAllJobs(): ExportJob[] {
    return Array.from(this._jobs.values());
  }

  removeJob(jobId: string): boolean {
    const job = this._jobs.get(jobId);
    if (job && job.status !== "rendering" && job.status !== "encoding") {
      return this._jobs.delete(jobId);
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  private async _renderJob(job: ExportJob): Promise<void> {
    const { config } = job;
    
    // Setup canvas
    this._canvas = document.createElement("canvas");
    this._canvas.width = config.width;
    this._canvas.height = config.height;
    this._ctx = this._canvas.getContext("2d", { alpha: false });
    
    if (!this._ctx) {
      throw new Error("Failed to create canvas context");
    }

    // Setup media recorder
    const stream = this._canvas.captureStream(config.frameRate);
    
    // Add audio track if available
    if (config.includeAudio && job.audioBuffer) {
      const audioContext = new AudioContext();
      const source = audioContext.createBufferSource();
      source.buffer = job.audioBuffer;
      
      const dest = audioContext.createMediaStreamDestination();
      source.connect(dest);
      
      stream.addTrack(dest.stream.getAudioTracks()[0]);
    }

    // Determine MIME type
    const mimeType = this._getMimeType(config.format);
    
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      throw new Error(`Format not supported: ${mimeType}`);
    }

    const options: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: config.videoBitrate ?? this._getVideoBitrate(config.quality),
      audioBitsPerSecond: config.audioBitrate ?? 128000,
    };

    this._mediaRecorder = new MediaRecorder(stream, options);
    
    const chunks: Blob[] = [];
    
    this._mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    this._mediaRecorder.onstop = () => {
      job.status = "complete";
      job.endTime = Date.now();
      job.result = new Blob(chunks, { type: mimeType });
      config.onComplete?.(job.result);
      config.onProgress?.(1);
    };

    // Start recording
    this._mediaRecorder.start(100);
    job.status = "encoding";

    // Render frames
    await this._renderFrames(job);

    // Stop recording
    this._mediaRecorder.stop();
  }

  private async _renderFrames(job: ExportJob): Promise<void> {
    const { config, clips } = job;
    const { ctx, canvas } = this;
    
    const totalFrames = Math.ceil(config.durationBeats / config.tempo * 60 * config.frameRate);
    const beatDuration = 60 / config.tempo;
    
    for (let frame = 0; frame < totalFrames; frame++) {
      const currentTime = frame / config.frameRate;
      const currentBeat = config.startBeat + currentTime / beatDuration;
      
      // Clear canvas
      ctx!.fillStyle = "black";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      
      // Render visible clips
      for (const clip of clips) {
        if (currentBeat >= clip.startBeat && currentBeat <= clip.endBeat) {
          await this._renderClipFrame(ctx!, clip, currentBeat, canvas!.width, canvas!.height);
        }
      }
      
      // Update progress
      job.progress = frame / totalFrames;
      config.onProgress?.(job.progress);
      
      // Allow other tasks to run
      if (frame % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  private async _renderClipFrame(
    ctx: CanvasRenderingContext2D,
    clip: VideoClip,
    currentBeat: number,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> {
    // This would extract a frame from the video at the correct time
    // For now, we draw a placeholder
    const videoTime = clip.beatToVideoTime(currentBeat);
    
    // Draw a colored rectangle representing the video
    const hue = (clip.startBeat * 30) % 360;
    ctx.fillStyle = `hsl(${hue}, 50%, 30%)`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw time info
    ctx.fillStyle = "white";
    ctx.font = "24px sans-serif";
    ctx.fillText(`Video: ${clip.source}`, 20, 40);
    ctx.fillText(`Time: ${videoTime.toFixed(2)}s`, 20, 70);
  }

  // ---------------------------------------------------------------------------
  // Export Settings
  // ---------------------------------------------------------------------------

  private _getMimeType(format: ExportFormat): string {
    switch (format) {
      case "mp4":
        return "video/mp4;codecs=h264";
      case "webm":
        return "video/webm;codecs=vp9";
      case "gif":
        return "video/webm"; // GIF requires different approach
      default:
        return "video/webm";
    }
  }

  private _getVideoBitrate(quality: ExportQuality): number {
    switch (quality) {
      case "low":
        return 2_000_000; // 2 Mbps
      case "medium":
        return 5_000_000; // 5 Mbps
      case "high":
        return 10_000_000; // 10 Mbps
      case "lossless":
        return 50_000_000; // 50 Mbps
      default:
        return 5_000_000;
    }
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  dispose(): void {
    this._mediaRecorder?.stop();
    this._jobs.clear();
    this._canvas = null;
    this._ctx = null;
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createVideoExporter(): VideoExporter {
  return new VideoExporter();
}

// Export to file helper
export async function exportVideoToFile(
  exporter: VideoExporter,
  jobId: string,
  filename?: string
): Promise<File | null> {
  const job = exporter.getJob(jobId);
  if (!job || !job.result) return null;

  const name = filename ?? `export-${Date.now()}.${job.config.format}`;
  return new File([job.result], name, { type: job.result.type });
}
