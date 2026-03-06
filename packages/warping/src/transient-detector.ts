/**
 * Transient / Onset Detection
 * Detects beat positions, drum hits, and note attacks in audio
 */

import type {
  Transient,
  TransientAnalysisResult,
  BeatGridResult,
  AudioBufferData,
} from './types.js';

export interface TransientDetector {
  detect(audio: AudioBufferData): TransientAnalysisResult;
  detectBeats(audio: AudioBufferData): BeatGridResult;
  setSensitivity(sensitivity: number): void;
  setThreshold(threshold: number): void;
}

export interface TransientDetectorOptions {
  sensitivity: number; // 0-1, higher = more sensitive
  threshold: number; // 0-1, energy threshold
  minGapMs: number; // minimum gap between transients in ms
  sampleRate: number;
}

const DEFAULT_OPTIONS: TransientDetectorOptions = {
  sensitivity: 0.5,
  threshold: 0.1,
  minGapMs: 50,
  sampleRate: 44100,
};

export function createTransientDetector(
  options: Partial<TransientDetectorOptions> = {}
): TransientDetector {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let currentSensitivity = opts.sensitivity;
  let currentThreshold = opts.threshold;

  function setSensitivity(sensitivity: number): void {
    currentSensitivity = Math.max(0, Math.min(1, sensitivity));
  }

  function setThreshold(threshold: number): void {
    currentThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Main transient detection using spectral flux
   */
  function detect(audio: AudioBufferData): TransientAnalysisResult {
    // Mix down to mono for analysis
    const monoSignal = mixToMono(audio);

    // Compute energy envelope
    const envelope = computeEnergyEnvelope(monoSignal, opts.sampleRate);

    // Compute spectral flux for frequency-based detection
    const spectralFlux = computeSpectralFlux(monoSignal, opts.sampleRate);

    // Combine features
    const combinedDetection = combineDetections(envelope, spectralFlux);

    // Peak picking with adaptive threshold
    const peaks = pickPeaks(combinedDetection, opts);

    // Convert to transient objects
    const minGapSamples = Math.floor((opts.minGapMs / 1000) * opts.sampleRate);
    const transients: Transient[] = [];

    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];

      // Enforce minimum gap
      if (
        transients.length === 0 ||
        peak.position - transients[transients.length - 1].position >= minGapSamples
      ) {
        transients.push({
          id: `transient-${i}`,
          position: peak.position,
          strength: peak.strength,
        });
      }
    }

    // Estimate tempo
    const tempoResult = estimateTempo(transients, opts.sampleRate);

    return {
      transients,
      suggestedTempo: tempoResult.tempo,
      confidence: tempoResult.confidence,
    };
  }

  /**
   * Beat grid detection - finds regular beat positions
   */
  function detectBeats(audio: AudioBufferData): BeatGridResult {
    const transientResult = detect(audio);
    const transients = transientResult.transients;

    if (transients.length < 2) {
      return { beats: [], bars: [], downbeats: [] };
    }

    const tempo = transientResult.suggestedTempo;
    const beatInterval = (60 / tempo) * opts.sampleRate;

    // Find downbeat (first strong transient)
    const downbeatIndex = findDownbeat(transients);
    const downbeat = transients[downbeatIndex]?.position || 0;

    // Generate beat grid
    const beats: number[] = [];
    const bars: number[] = [];
    const downbeats: number[] = [];

    // Start slightly before the downbeat to catch early beats
    let currentBeat = downbeat - Math.ceil(downbeat / beatInterval) * beatInterval;
    while (currentBeat < 0) {
      currentBeat += beatInterval;
    }

    let beatCount = 0;
    const samplesLength = audio.channelData[0]?.length || 0;

    while (currentBeat < samplesLength) {
      beats.push(Math.floor(currentBeat));

      // Assume 4/4 time signature
      if (beatCount % 4 === 0) {
        bars.push(Math.floor(currentBeat));
        if (beatCount % 16 === 0) {
          downbeats.push(Math.floor(currentBeat));
        }
      }

      currentBeat += beatInterval;
      beatCount++;
    }

    // Refine beats based on nearby transients
    const refinedBeats = refineBeatGrid(beats, transients, beatInterval);

    return {
      beats: refinedBeats,
      bars,
      downbeats,
    };
  }

  return {
    detect,
    detectBeats,
    setSensitivity,
    setThreshold,
  };
}

/**
 * Mix multi-channel audio to mono
 */
function mixToMono(audio: AudioBufferData): Float32Array {
  const length = audio.channelData[0]?.length || 0;
  const mono = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < audio.numberOfChannels; ch++) {
      sum += audio.channelData[ch][i];
    }
    mono[i] = sum / audio.numberOfChannels;
  }

  return mono;
}

/**
 * Compute energy envelope using sliding window
 */
function computeEnergyEnvelope(
  signal: Float32Array,
  sampleRate: number
): Float32Array {
  const windowSize = Math.floor(0.01 * sampleRate); // 10ms windows
  const hopSize = Math.floor(windowSize / 4);
  const numFrames = Math.floor((signal.length - windowSize) / hopSize) + 1;

  const envelope = new Float32Array(numFrames);

  for (let i = 0; i < numFrames; i++) {
    let energy = 0;
    const start = i * hopSize;

    for (let j = 0; j < windowSize; j++) {
      const sample = signal[start + j] || 0;
      energy += sample * sample;
    }

    envelope[i] = Math.sqrt(energy / windowSize);
  }

  return envelope;
}

/**
 * Compute spectral flux (change in spectrum over time)
 */
function computeSpectralFlux(
  signal: Float32Array,
  sampleRate: number
): Float32Array {
  const fftSize = 1024;
  const hopSize = 256;
  const numFrames = Math.floor((signal.length - fftSize) / hopSize) + 1;

  const flux = new Float32Array(numFrames);
  let prevMagnitude: Float32Array | null = null;

  for (let i = 0; i < numFrames; i++) {
    const frame = signal.subarray(i * hopSize, i * hopSize + fftSize);
    const magnitude = computeMagnitudeSpectrum(frame);

    if (prevMagnitude) {
      let frameFlux = 0;
      for (let bin = 0; bin < magnitude.length; bin++) {
        const diff = magnitude[bin] - prevMagnitude[bin];
        if (diff > 0) {
          frameFlux += diff;
        }
      }
      flux[i] = frameFlux;
    }

    prevMagnitude = magnitude;
  }

  // Normalize
  const maxFlux = Math.max(...flux, 1e-10);
  for (let i = 0; i < flux.length; i++) {
    flux[i] /= maxFlux;
  }

  return flux;
}

/**
 * Simple DFT for spectrum computation
 */
function computeMagnitudeSpectrum(frame: Float32Array): Float32Array {
  const n = frame.length;
  const numBins = Math.floor(n / 2) + 1;
  const magnitude = new Float32Array(numBins);

  for (let k = 0; k < numBins; k++) {
    let real = 0;
    let imag = 0;

    for (let t = 0; t < n; t++) {
      const angle = (-2 * Math.PI * k * t) / n;
      real += frame[t] * Math.cos(angle);
      imag += frame[t] * Math.sin(angle);
    }

    magnitude[k] = Math.sqrt(real * real + imag * imag) / n;
  }

  return magnitude;
}

/**
 * Combine envelope and spectral flux detections
 */
function combineDetections(
  envelope: Float32Array,
  spectralFlux: Float32Array
): Float32Array {
  const maxLength = Math.max(envelope.length, spectralFlux.length);
  const combined = new Float32Array(maxLength);

  // Normalize envelope
  const maxEnv = Math.max(...envelope, 1e-10);

  for (let i = 0; i < maxLength; i++) {
    const envVal = (envelope[i] || 0) / maxEnv;
    const fluxVal = spectralFlux[i] || 0;

    // Weighted combination
    combined[i] = envVal * 0.4 + fluxVal * 0.6;
  }

  return combined;
}

interface Peak {
  position: number;
  strength: number;
}

/**
 * Peak picking with adaptive threshold
 */
function pickPeaks(
  detectionFunction: Float32Array,
  opts: TransientDetectorOptions
): Peak[] {
  const peaks: Peak[] = [];
  const hopSize = 256; // Must match computeSpectralFlux

  // Calculate adaptive threshold
  const windowFrames = 20; // frames for local average
  const thresholdMultiplier = 1.5 - opts.sensitivity; // 0.5 to 1.5

  for (let i = windowFrames; i < detectionFunction.length - windowFrames; i++) {
    // Local average
    let localSum = 0;
    for (let j = -windowFrames; j <= windowFrames; j++) {
      localSum += detectionFunction[i + j];
    }
    const localAverage = localSum / (2 * windowFrames + 1);

    // Adaptive threshold
    const threshold = Math.max(
      localAverage * thresholdMultiplier,
      opts.threshold
    );

    // Check if peak
    if (
      detectionFunction[i] > threshold &&
      detectionFunction[i] > detectionFunction[i - 1] &&
      detectionFunction[i] > detectionFunction[i + 1]
    ) {
      // Convert frame to sample position
      const samplePosition = i * hopSize;
      peaks.push({
        position: samplePosition,
        strength: detectionFunction[i],
      });
    }
  }

  return peaks;
}

/**
 * Estimate tempo from transient intervals
 */
function estimateTempo(
  transients: Transient[],
  sampleRate: number
): { tempo: number; confidence: number } {
  if (transients.length < 2) {
    return { tempo: 120, confidence: 0 };
  }

  // Calculate intervals between transients
  const intervals: number[] = [];
  for (let i = 1; i < transients.length; i++) {
    const interval = (transients[i].position - transients[i - 1].position) / sampleRate;
    if (interval > 0.1 && interval < 2) {
      // Filter reasonable tempos (30-600 BPM)
      intervals.push(interval);
    }
  }

  if (intervals.length === 0) {
    return { tempo: 120, confidence: 0 };
  }

  // Find most common interval using histogram
  const histogram = new Map<number, number>();
  const binSize = 0.05; // 50ms bins

  for (const interval of intervals) {
    const bin = Math.floor(interval / binSize) * binSize;
    histogram.set(bin, (histogram.get(bin) || 0) + 1);
  }

  // Find peak
  let maxCount = 0;
  let commonInterval = 0.5; // Default 120 BPM

  for (const [interval, count] of histogram) {
    if (count > maxCount) {
      maxCount = count;
      commonInterval = interval;
    }
  }

  // Also check for half and double time
  const halfInterval = commonInterval / 2;
  const doubleInterval = commonInterval * 2;

  const halfCount = histogram.get(Math.floor(halfInterval / binSize) * binSize) || 0;
  const doubleCount = histogram.get(Math.floor(doubleInterval / binSize) * binSize) || 0;

  if (halfCount > maxCount * 0.8) {
    commonInterval = halfInterval;
    maxCount += halfCount;
  } else if (doubleCount > maxCount * 0.8) {
    commonInterval = doubleInterval;
    maxCount += doubleCount;
  }

  const tempo = 60 / commonInterval;
  const confidence = Math.min(1, maxCount / (intervals.length * 0.5));

  // Clamp to reasonable range
  return {
    tempo: Math.max(60, Math.min(200, tempo)),
    confidence,
  };
}

/**
 * Find the most likely downbeat
 */
function findDownbeat(transients: Transient[]): number {
  if (transients.length === 0) return 0;

  // Find strongest transient in first few transients
  let strongestIndex = 0;
  let strongestStrength = 0;

  const searchRange = Math.min(transients.length, 8);

  for (let i = 0; i < searchRange; i++) {
    if (transients[i].strength > strongestStrength) {
      strongestStrength = transients[i].strength;
      strongestIndex = i;
    }
  }

  return strongestIndex;
}

/**
 * Refine beat grid based on nearby transients
 */
function refineBeatGrid(
  beats: number[],
  transients: Transient[],
  beatInterval: number
): number[] {
  const refined: number[] = [];
  const maxShift = beatInterval * 0.2; // Allow 20% shift

  for (const beat of beats) {
    // Find nearest transient
    let nearestTransient: Transient | null = null;
    let minDistance = Infinity;

    for (const transient of transients) {
      const distance = Math.abs(transient.position - beat);
      if (distance < minDistance && distance < maxShift) {
        minDistance = distance;
        nearestTransient = transient;
      }
    }

    if (nearestTransient) {
      // Blend toward transient
      const alpha = 0.3; // How much to shift toward transient
      refined.push(Math.floor(beat * (1 - alpha) + nearestTransient.position * alpha));
    } else {
      refined.push(beat);
    }
  }

  return refined;
}
