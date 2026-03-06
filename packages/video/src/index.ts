/**
 * @daw/video
 * 
 * Video support for in-browser DAW.
 * Import, sync, and export video alongside audio.
 * 
 * ## Features
 * 
 * - **VideoClip**: Import and manage video files
 * - **VideoPlayer**: Sync video to transport
 * - **VideoWarp**: Flex video to song tempo
 * - **VideoExporter**: Render audio + video together
 * 
 * @example
 * ```typescript
 * import { VideoClip, createVideoPlayer, createVideoExporter } from "@daw/video";
 * 
 * // Load a video clip
 * const clip = new VideoClip({ source: "myvideo.mp4", startBeat: 0 });
 * await clip.load();
 * 
 * // Create a player
 * const player = createVideoPlayer(canvas);
 * await player.addClip(clip);
 * 
 * // Export with audio
 * const exporter = createVideoExporter();
 * const job = exporter.createJob([clip], { format: "mp4" }, audioBuffer);
 * await exporter.startJob(job.id);
 * ```
 */

// =============================================================================
// Video Clip
// =============================================================================

export { VideoClip } from "./VideoClip.js";

export type {
  VideoFormat,
  VideoMetadata,
  WarpMarker,
  VideoClipConfig,
} from "./VideoClip.js";

// =============================================================================
// Video Player
// =============================================================================

export {
  VideoPlayer,
  createVideoPlayer,
} from "./VideoPlayer.js";

export type {
  VideoPlayerConfig,
  VideoClipInstance,
} from "./VideoPlayer.js";

// =============================================================================
// Video Warp
// =============================================================================

export {
  VideoWarp,
  LinearFrameInterpolator,
  createVideoWarp,
} from "./VideoWarp.js";

export type {
  WarpSettings,
  TimeStretchResult,
  FrameInterpolator,
} from "./VideoWarp.js";

// =============================================================================
// Video Exporter
// =============================================================================

export {
  VideoExporter,
  createVideoExporter,
  exportVideoToFile,
} from "./VideoExporter.js";

export type {
  ExportFormat,
  ExportQuality,
  ExportConfig,
  ExportJob,
} from "./VideoExporter.js";

// =============================================================================
// Version
// =============================================================================

export const VIDEO_VERSION = "1.0.0";
