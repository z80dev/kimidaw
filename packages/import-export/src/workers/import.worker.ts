/**
 * Import Worker
 * 
 * Web Worker for audio/MIDI import processing.
 * Handles heavy operations off the main thread.
 * 
 * Messages:
 * - import:start - Begin import process
 * - import:progress - Progress update
 * - import:complete - Import finished
 * - import:error - Import failed
 * - import:cancel - Cancel import
 */

import type { ImportJob, ImportResult, ImportStatus } from "../types.js";
import { getAudioImportManager } from "../audio-import.js";
import { getMidiImportManager } from "../midi-import.js";

// Worker state
const activeJobs: Map<string, { job: ImportJob; aborted: boolean }> = new Map();

// Handle incoming messages
self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case "import:start":
      await handleImportStart(payload);
      break;
    case "import:cancel":
      handleImportCancel(payload.jobId);
      break;
    default:
      console.warn(`Unknown message type: ${type}`);
  }
};

/**
 * Handle import start message
 */
async function handleImportStart(payload: {
  jobId: string;
  file: File;
  fileType: "audio" | "midi";
}): Promise<void> {
  const { jobId, file, fileType } = payload;

  // Create job
  const job: ImportJob = {
    id: jobId,
    file,
    status: "pending",
    progress: 0,
  };

  activeJobs.set(jobId, { job, aborted: false });

  try {
    // Update status
    updateJobStatus(jobId, "analyzing", 10);

    let result: ImportResult;

    if (fileType === "audio") {
      // Import audio
      const manager = getAudioImportManager();
      result = await manager.importAudio(file, jobId);
    } else {
      // Import MIDI
      const manager = getMidiImportManager();
      result = await manager.importMidi(file, jobId);
    }

    // Check if aborted
    if (activeJobs.get(jobId)?.aborted) {
      throw new Error("Import cancelled");
    }

    updateJobStatus(jobId, "complete", 100);

    // Send completion
    self.postMessage({
      type: "import:complete",
      payload: {
        jobId,
        result,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    
    updateJobStatus(jobId, "error", 0, error);

    self.postMessage({
      type: "import:error",
      payload: {
        jobId,
        error,
      },
    });
  } finally {
    activeJobs.delete(jobId);
  }
}

/**
 * Handle import cancel
 */
function handleImportCancel(jobId: string): void {
  const active = activeJobs.get(jobId);
  if (active) {
    active.aborted = true;
  }
}

/**
 * Update job status and report progress
 */
function updateJobStatus(
  jobId: string, 
  status: ImportStatus, 
  progress: number,
  error?: string
): void {
  const active = activeJobs.get(jobId);
  if (active) {
    active.job.status = status;
    active.job.progress = progress;
    if (error) active.job.error = error;
  }

  self.postMessage({
    type: "import:progress",
    payload: {
      jobId,
      status,
      progress,
      error,
    },
  });
}

// Signal that worker is ready
self.postMessage({ type: "worker:ready" });
