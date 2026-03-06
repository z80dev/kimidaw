/**
 * Audio Import Pipeline
 * 
 * Handles audio file import: decoding, analysis, and asset creation.
 * Implements section 18.2 of the engineering spec.
 * 
 * Features:
 * - Web Audio API decoding
 * - Peak pyramid generation
 * - Transient detection
 * - Tempo/key hints
 * - Hash-based deduplication
 * - Web Worker offload
 */

import type {
  ImportJob,
  ImportResult,
  AudioMetadata,
  PeakData,
  TransientHint,
} from "./types.js";

// ============================================================================
// Constants
// ============================================================================

const SUPPORTED_AUDIO_TYPES = [
  "audio/wav",
  "audio/x-wav",
  "audio/aiff",
  "audio/x-aiff",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/vorbis",
  "audio/flac",
  "audio/x-flac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
];

const PEAK_LEVELS = [256, 512, 1024, 2048, 4096, 8192]; // Samples per pixel

// ============================================================================
// Audio Import Manager
// ============================================================================

export interface AudioImportOptions {
  generatePeaks?: boolean;
  detectTransients?: boolean;
  detectTempo?: boolean;
  audioContext?: AudioContext;
}

class AudioImportManager {
  private options: Required<AudioImportOptions>;
  private audioContext: AudioContext | null = null;

  constructor(options: AudioImportOptions = {}) {
    this.options = {
      generatePeaks: true,
      detectTransients: true,
      detectTempo: false,
      audioContext: null,
      ...options,
    };
  }

  /**
   * Check if a file type is supported
   */
  isSupported(file: File): boolean {
    return SUPPORTED_AUDIO_TYPES.includes(file.type) || 
           file.name.match(/\.(wav|aiff|mp3|ogg|flac|m4a|webm)$/i) !== null;
  }

  /**
   * Get supported MIME types
   */
  getSupportedTypes(): string[] {
    return [...SUPPORTED_AUDIO_TYPES];
  }

  /**
   * Import an audio file
   */
  async importAudio(file: File, jobId: string): Promise<ImportResult> {
    if (!this.isSupported(file)) {
      throw new Error(`Unsupported audio format: ${file.type || file.name}`);
    }

    // Get or create AudioContext
    const ctx = this.options.audioContext ?? await this.createAudioContext();

    try {
      // Decode audio
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Generate hash for deduplication
      const hash = await this.computeHash(arrayBuffer);

      // Generate metadata
      const metadata = this.extractMetadata(file, audioBuffer);

      // Generate peaks
      let peaks: PeakData | undefined;
      if (this.options.generatePeaks) {
        peaks = this.generatePeaks(audioBuffer);
      }

      // Detect transients
      let transientHints: TransientHint[] | undefined;
      if (this.options.detectTransients) {
        transientHints = this.detectTransients(audioBuffer);
      }

      // Detect tempo hint
      let tempoHint: number | undefined;
      if (this.options.detectTempo) {
        tempoHint = this.estimateTempo(audioBuffer, transientHints);
      }

      return {
        assetId: `audio-${hash}`,
        hash,
        metadata: {
          ...metadata,
          transientHints,
          tempoHint,
        },
        duration: audioBuffer.duration,
        peaks,
      };
    } catch (err) {
      throw new Error(`Failed to import audio: ${err}`);
    }
  }

  /**
   * Create a new AudioContext
   */
  private async createAudioContext(): Promise<AudioContext> {
    if (typeof window === "undefined") {
      throw new Error("AudioContext not available in this environment");
    }
    
    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx;
  }

  /**
   * Compute SHA-256 hash of file data
   */
  private async computeHash(data: ArrayBuffer): Promise<string> {
    if (typeof crypto === "undefined" || !crypto.subtle) {
      // Fallback: use file size + first/last bytes
      const view = new Uint8Array(data);
      const sample = [...view.slice(0, 16), ...view.slice(-16)];
      return `legacy-${data.byteLength}-${sample.join("")}`;
    }

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Extract metadata from audio file
   */
  private extractMetadata(file: File, audioBuffer: AudioBuffer): AudioMetadata {
    // Detect format from file extension or MIME type
    const format = this.detectFormat(file);

    return {
      type: "audio",
      format,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      duration: audioBuffer.duration,
    };
  }

  /**
   * Detect audio format from file
   */
  private detectFormat(file: File): AudioMetadata["format"] {
    const ext = file.name.split(".").pop()?.toLowerCase();
    
    switch (ext) {
      case "wav": return "wav";
      case "aiff":
      case "aif": return "aiff";
      case "mp3": return "mp3";
      case "ogg": return "ogg";
      case "flac": return "flac";
      case "m4a":
      case "mp4": return "m4a";
      case "webm": return "webm";
      default:
        // Try from MIME type
        if (file.type.includes("wav")) return "wav";
        if (file.type.includes("mp3")) return "mp3";
        if (file.type.includes("ogg")) return "ogg";
        return "wav"; // Default
    }
  }

  /**
   * Generate peak pyramid for waveform display
   */
  private generatePeaks(audioBuffer: AudioBuffer): PeakData {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    // Mix to mono for analysis if stereo
    const monoData = channels > 1 
      ? this.mixToMono(audioBuffer)
      : audioBuffer.getChannelData(0);

    const levels: PeakData["levels"] = [];

    for (const zoom of PEAK_LEVELS) {
      const numPeaks = Math.ceil(length / zoom);
      const peakData = new Float32Array(numPeaks * 2); // Min/max pairs

      for (let i = 0; i < numPeaks; i++) {
        const start = i * zoom;
        const end = Math.min(start + zoom, length);

        let min = Infinity;
        let max = -Infinity;

        for (let j = start; j < end; j++) {
          const sample = monoData[j];
          if (sample < min) min = sample;
          if (sample > max) max = sample;
        }

        peakData[i * 2] = min === Infinity ? 0 : min;
        peakData[i * 2 + 1] = max === -Infinity ? 0 : max;
      }

      levels.push({ zoom, data: peakData });
    }

    return {
      sampleRate,
      channels,
      levels,
    };
  }

  /**
   * Mix audio buffer to mono
   */
  private mixToMono(audioBuffer: AudioBuffer): Float32Array {
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const result = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += audioBuffer.getChannelData(ch)[i];
      }
      result[i] = sum / numChannels;
    }

    return result;
  }

  /**
   * Detect transients (onsets) in audio
   */
  private detectTransients(audioBuffer: AudioBuffer): TransientHint[] {
    const data = audioBuffer.numberOfChannels > 1
      ? this.mixToMono(audioBuffer)
      : audioBuffer.getChannelData(0);

    const transients: TransientHint[] = [];
    const sampleRate = audioBuffer.sampleRate;
    
    // Simple energy-based onset detection
    const windowSize = Math.floor(sampleRate * 0.01); // 10ms
    const hopSize = Math.floor(windowSize / 4);
    
    let prevEnergy = 0;
    const threshold = 0.1;

    for (let i = windowSize; i < data.length; i += hopSize) {
      // Calculate energy in window
      let energy = 0;
      for (let j = i - windowSize; j < i; j++) {
        energy += data[j] * data[j];
      }
      energy /= windowSize;

      // Detect onset (energy increase)
      const energyDiff = energy - prevEnergy;
      if (energyDiff > threshold && energy > 0.001) {
        const time = i / sampleRate;
        transients.push({
          time,
          amplitude: Math.sqrt(energy),
        });
      }

      prevEnergy = energy;
    }

    // Remove duplicates (transients within 100ms)
    return this.deduplicateTransients(transients, 0.1);
  }

  /**
   * Remove duplicate transients
   */
  private deduplicateTransients(transients: TransientHint[], minDistance: number): TransientHint[] {
    if (transients.length === 0) return transients;

    const result: TransientHint[] = [transients[0]];

    for (let i = 1; i < transients.length; i++) {
      const last = result[result.length - 1];
      const current = transients[i];

      if (current.time - last.time >= minDistance) {
        result.push(current);
      } else if (current.amplitude > last.amplitude) {
        // Replace with stronger transient
        result[result.length - 1] = current;
      }
    }

    return result;
  }

  /**
   * Estimate tempo from transients
   */
  private estimateTempo(audioBuffer: AudioBuffer, transients?: TransientHint[]): number | undefined {
    const hints = transients ?? this.detectTransients(audioBuffer);
    
    if (hints.length < 4) return undefined;

    // Calculate inter-onset intervals
    const intervals: number[] = [];
    for (let i = 1; i < hints.length; i++) {
      intervals.push(hints[i].time - hints[i - 1].time);
    }

    // Find most common interval (simple histogram)
    const tempoVotes: Map<number, number> = new Map();
    
    for (const interval of intervals) {
      // Convert interval to BPM
      const bpm = 60 / interval;
      
      // Consider tempo octave variations
      const candidates = [bpm, bpm * 2, bpm / 2];
      
      for (const candidate of candidates) {
        if (candidate >= 60 && candidate <= 200) {
          const rounded = Math.round(candidate);
          tempoVotes.set(rounded, (tempoVotes.get(rounded) ?? 0) + 1);
        }
      }
    }

    // Find winning tempo
    let bestTempo = 120;
    let bestVotes = 0;
    
    for (const [tempo, votes] of tempoVotes) {
      if (votes > bestVotes) {
        bestVotes = votes;
        bestTempo = tempo;
      }
    }

    return bestVotes > 2 ? bestTempo : undefined;
  }

  /**
   * Analyze audio for key detection (simplified)
   */
  estimateKey(audioBuffer: AudioBuffer): string | undefined {
    // This would require chromagram analysis
    // For now, return undefined
    return undefined;
  }

  /**
   * Normalize audio to -1..1 range
   */
  normalizeAudio(audioBuffer: AudioBuffer): AudioBuffer {
    let maxAbs = 0;

    // Find peak
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > maxAbs) maxAbs = abs;
      }
    }

    // Already normalized
    if (maxAbs <= 1.0) return audioBuffer;

    // Create new buffer with normalized data
    const ctx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const newBuffer = ctx.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const gain = 1.0 / maxAbs;

    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const src = audioBuffer.getChannelData(ch);
      const dst = newBuffer.getChannelData(ch);
      for (let i = 0; i < src.length; i++) {
        dst[i] = src[i] * gain;
      }
    }

    return newBuffer;
  }
}

// Singleton instance
let instance: AudioImportManager | null = null;

export function getAudioImportManager(options?: AudioImportOptions): AudioImportManager {
  if (!instance) {
    instance = new AudioImportManager(options);
  }
  return instance;
}

export function resetAudioImportManager(): void {
  instance = null;
}

export type { AudioImportManager };
