/**
 * Render Worker
 * 
 * Web Worker for offline audio rendering.
 * Handles render operations off the main thread.
 * 
 * Messages:
 * - render:start - Begin render process
 * - render:progress - Progress update
 * - render:complete - Render finished
 * - render:error - Render failed
 * - render:cancel - Cancel render
 */

import type { RenderJob, RenderProgress, RenderStatus, RenderResult } from "../types.js";

// Worker state
interface ActiveRender {
  job: RenderJob;
  abortController: AbortController;
  startTime: number;
}

const activeRenders: Map<string, ActiveRender> = new Map();

// Handle incoming messages
self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case "render:start":
      await handleRenderStart(payload);
      break;
    case "render:cancel":
      handleRenderCancel(payload.jobId);
      break;
    default:
      console.warn(`Unknown message type: ${type}`);
  }
};

/**
 * Handle render start
 */
async function handleRenderStart(payload: { job: RenderJob; projectData: unknown }): Promise<void> {
  const { job, projectData } = payload;
  const abortController = new AbortController();

  activeRenders.set(job.id, {
    job,
    abortController,
    startTime: performance.now(),
  });

  try {
    reportProgress(job.id, "preparing", 0);

    // Create offline context
    const sampleRate = job.format.sampleRate;
    const duration = estimateDuration(projectData);
    const numChannels = 2;
    const length = Math.ceil(duration * sampleRate) + 
                   Math.ceil((job.includeTailMs / 1000) * sampleRate);

    const offlineContext = new OfflineAudioContext({
      numberOfChannels: numChannels,
      length,
      sampleRate,
    });

    reportProgress(job.id, "rendering", 10);

    // Build render graph from project data
    await buildRenderGraph(offlineContext, projectData, job, abortController.signal);

    // Check cancellation
    if (abortController.signal.aborted) {
      throw new Error("Render cancelled");
    }

    // Start rendering with progress tracking
    const renderPromise = offlineContext.startRendering();
    
    // Track progress (approximate)
    const progressInterval = setInterval(() => {
      const active = activeRenders.get(job.id);
      if (!active || abortController.signal.aborted) {
        clearInterval(progressInterval);
        return;
      }
      
      // Estimate progress based on time
      const elapsed = (performance.now() - active.startTime) / 1000;
      const estimatedProgress = Math.min(90, (elapsed / duration) * 100);
      reportProgress(job.id, "rendering", 10 + estimatedProgress * 0.8);
    }, 100);

    const renderedBuffer = await renderPromise;
    clearInterval(progressInterval);

    // Check cancellation
    if (abortController.signal.aborted) {
      throw new Error("Render cancelled");
    }

    reportProgress(job.id, "encoding", 95);

    // Encode to target format
    const encodedData = await encodeAudio(renderedBuffer, job);

    reportProgress(job.id, "complete", 100);

    // Create result
    const result: RenderResult = {
      jobId: job.id,
      status: "complete",
      duration: renderedBuffer.duration,
      size: encodedData.byteLength,
      metadata: {
        sampleRate: job.format.sampleRate,
        channels: numChannels,
        bitDepth: job.format.bitDepth ?? 16,
      },
    };

    // Transfer encoded data
    self.postMessage(
      {
        type: "render:complete",
        payload: {
          jobId: job.id,
          result,
          audioData: encodedData,
        },
      },
      [encodedData]
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    
    reportProgress(job.id, "error", 0, error);

    self.postMessage({
      type: "render:error",
      payload: {
        jobId: job.id,
        error,
      },
    });
  } finally {
    activeRenders.delete(job.id);
  }
}

/**
 * Handle render cancel
 */
function handleRenderCancel(jobId: string): void {
  const active = activeRenders.get(jobId);
  if (active) {
    active.abortController.abort();
    reportProgress(jobId, "cancelled", 0);
  }
}

/**
 * Report progress to main thread
 */
function reportProgress(
  jobId: string,
  status: RenderStatus,
  progress: number,
  error?: string
): void {
  const payload: RenderProgress = {
    jobId,
    status,
    progress,
    error,
  };

  // Estimate time remaining for rendering
  if (status === "rendering") {
    const active = activeRenders.get(jobId);
    if (active) {
      const elapsed = (performance.now() - active.startTime) / 1000;
      const estimatedTotal = elapsed / (progress / 100);
      payload.estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
    }
  }

  self.postMessage({
    type: "render:progress",
    payload,
  });
}

/**
 * Estimate project duration
 */
function estimateDuration(_projectData: unknown): number {
  // Would extract actual duration from project data
  return 300; // 5 minutes default
}

/**
 * Build render graph
 */
async function buildRenderGraph(
  context: OfflineAudioContext,
  projectData: unknown,
  job: RenderJob,
  signal: AbortSignal
): Promise<void> {
  // This would build the actual audio graph from project data
  // For now, create a silent output placeholder

  if (signal.aborted) return;

  // Create minimal output
  const osc = context.createOscillator();
  const gain = context.createGain();
  
  osc.frequency.value = 440;
  gain.gain.value = 0;
  
  osc.connect(gain);
  gain.connect(context.destination);
  
  osc.start(0);
  osc.stop(context.length / context.sampleRate);
}

/**
 * Encode audio to target format
 */
async function encodeAudio(buffer: AudioBuffer, job: RenderJob): Promise<ArrayBuffer> {
  switch (job.format.container) {
    case "wav":
      return encodeWav(buffer, job.format);
    default:
      throw new Error(`Format not supported in worker: ${job.format.container}`);
  }
}

/**
 * Encode to WAV
 */
function encodeWav(buffer: AudioBuffer, format: RenderJob["format"]): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bitDepth = format.bitDepth ?? 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;

  const wavBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(wavBuffer);

  // Write header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, bitDepth === 32 && format.float ? 3 : 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write samples
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    
    for (let i = 0; i < numSamples; i++) {
      const sample = channelData[i];
      const pos = headerSize + (i * blockAlign) + (ch * bytesPerSample);
      
      if (bitDepth === 16) {
        const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
        view.setInt16(pos, intSample, true);
      } else if (bitDepth === 24) {
        const intSample = Math.max(-8388608, Math.min(8388607, Math.round(sample * 8388607)));
        const bytes = new Uint8Array(wavBuffer, pos, 3);
        bytes[0] = intSample & 0xFF;
        bytes[1] = (intSample >> 8) & 0xFF;
        bytes[2] = (intSample >> 16) & 0xFF;
      } else if (bitDepth === 32) {
        if (format.float) {
          view.setFloat32(pos, sample, true);
        } else {
          const intSample = Math.max(-2147483648, Math.min(2147483647, Math.round(sample * 2147483647)));
          view.setInt32(pos, intSample, true);
        }
      }
    }
  }

  return wavBuffer;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// Signal ready
self.postMessage({ type: "worker:ready" });
