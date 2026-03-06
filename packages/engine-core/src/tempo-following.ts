/**
 * Tempo Following - Follow external audio tempo
 * Detects tempo from incoming audio and syncs playback
 */

export interface TempoFollower {
  // Analysis
  start(): void;
  stop(): void;
  isRunning(): boolean;
  
  // Input
  processAudioInput(buffer: Float32Array, sampleRate: number): void;
  
  // Detection
  getDetectedTempo(): number;
  getTempoConfidence(): number;
  getBeatPhase(): number;
  
  // Control
  setFollowMode(enabled: boolean): void;
  isFollowModeEnabled(): boolean;
  
  // Tap tempo
  tap(): number; // Returns calculated tempo
  resetTap(): void;
  
  // Tempo nudge
  nudgeTempo(amount: number): void; // -1.0 to 1.0
  
  // Callbacks
  onTempoDetected(callback: (tempo: number, confidence: number) => void): void;
  onBeatDetected(callback: (phase: number) => void): void;
}

export interface TempoFollowerOptions {
  minTempo: number;
  maxTempo: number;
  smoothingWindow: number; // Number of beats to average
  sensitivity: number; // 0-1
  followStrength: number; // 0-1, how strongly to follow
}

export const DEFAULT_TEMPO_FOLLOWER_OPTIONS: TempoFollowerOptions = {
  minTempo: 60,
  maxTempo: 200,
  smoothingWindow: 4,
  sensitivity: 0.7,
  followStrength: 0.5,
};

export function createTempoFollower(
  options: Partial<TempoFollowerOptions> = {}
): TempoFollower {
  const opts = { ...DEFAULT_TEMPO_FOLLOWER_OPTIONS, ...options };
  
  let isRunningFlag = false;
  let followModeEnabled = false;
  let currentTempo = 120;
  let tempoConfidence = 0;
  let beatPhase = 0;
  
  // Tap tempo state
  const tapTimes: number[] = [];
  const MAX_TAP_HISTORY = 8;
  
  // Onset detection for tempo following
  const onsetBuffer: number[] = [];
  const ONSET_BUFFER_SIZE = 43; // ~1 second at 2048 sample hop
  let lastOnsetTime = 0;
  const detectedBeats: number[] = [];
  
  // Callbacks
  let tempoCallback: ((tempo: number, confidence: number) => void) | null = null;
  let beatCallback: ((phase: number) => void) | null = null;
  
  // Audio processing
  let fft: ReturnType<typeof createFFT> | null = null;
  const FFT_SIZE = 2048;
  let prevSpectrum: Float32Array | null = null;
  
  function start(): void {
    if (isRunningFlag) return;
    isRunningFlag = true;
    fft = createFFT(FFT_SIZE);
  }
  
  function stop(): void {
    isRunningFlag = false;
    fft = null;
  }
  
  function isRunning(): boolean {
    return isRunningFlag;
  }
  
  function processAudioInput(buffer: Float32Array, sampleRate: number): void {
    if (!isRunningFlag || !fft) return;
    
    // Compute spectrum
    const spectrum = computeSpectrum(buffer, fft);
    
    // Calculate onset strength
    const onsetStrength = calculateOnsetStrength(spectrum, prevSpectrum);
    prevSpectrum = spectrum;
    
    // Add to buffer
    onsetBuffer.push(onsetStrength);
    if (onsetBuffer.length > ONSET_BUFFER_SIZE) {
      onsetBuffer.shift();
    }
    
    // Detect onsets
    if (onsetBuffer.length >= 3) {
      const isOnset = detectOnset(onsetBuffer);
      
      if (isOnset) {
        const now = performance.now();
        
        // Debounce onsets
        if (now - lastOnsetTime > 150) { // Min 150ms between onsets
          handleBeat(now);
          lastOnsetTime = now;
        }
      }
    }
  }
  
  function computeSpectrum(buffer: Float32Array, fft: ReturnType<typeof createFFT>): Float32Array {
    // Apply window
    const windowed = new Float32Array(FFT_SIZE);
    for (let i = 0; i < Math.min(buffer.length, FFT_SIZE); i++) {
      windowed[i] = buffer[i] * hannWindow(i, FFT_SIZE);
    }
    
    // Compute magnitude spectrum
    return fft.forward(windowed);
  }
  
  function calculateOnsetStrength(
    spectrum: Float32Array,
    prevSpectrum: Float32Array | null
  ): number {
    if (!prevSpectrum) return 0;
    
    let flux = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const diff = spectrum[i] - prevSpectrum[i];
      if (diff > 0) {
        flux += diff;
      }
    }
    
    return flux / spectrum.length;
  }
  
  function detectOnset(buffer: number[]): boolean {
    if (buffer.length < 3) return false;
    
    const current = buffer[buffer.length - 1];
    const prev = buffer[buffer.length - 2];
    const prev2 = buffer[buffer.length - 3];
    
    // Simple peak detection with threshold
    const threshold = getDynamicThreshold(buffer) * (1 - opts.sensitivity * 0.5);
    
    return current > threshold && current > prev && current > prev2;
  }
  
  function getDynamicThreshold(buffer: number[]): number {
    const mean = buffer.reduce((a, b) => a + b, 0) / buffer.length;
    const variance = buffer.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / buffer.length;
    const stdDev = Math.sqrt(variance);
    
    return mean + stdDev * 1.5;
  }
  
  function handleBeat(timestamp: number): void {
    detectedBeats.push(timestamp);
    
    // Keep last N beats for tempo calculation
    while (detectedBeats.length > opts.smoothingWindow * 4) {
      detectedBeats.shift();
    }
    
    // Calculate tempo
    if (detectedBeats.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < detectedBeats.length; i++) {
        intervals.push(detectedBeats[i] - detectedBeats[i - 1]);
      }
      
      // Calculate average interval
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const tempo = 60000 / avgInterval;
      
      // Validate tempo range
      if (tempo >= opts.minTempo && tempo <= opts.maxTempo) {
        // Smooth tempo changes
        const blend = opts.followStrength;
        currentTempo = currentTempo * (1 - blend) + tempo * blend;
        
        // Calculate confidence based on interval consistency
        const variance = intervals.reduce(
          (a, b) => a + Math.pow(b - avgInterval, 2), 0
        ) / intervals.length;
        const cv = Math.sqrt(variance) / avgInterval; // Coefficient of variation
        tempoConfidence = Math.max(0, 1 - cv);
        
        // Notify
        if (tempoCallback) {
          tempoCallback(currentTempo, tempoConfidence);
        }
      }
    }
    
    // Update beat phase
    beatPhase = (beatPhase + 1) % 4;
    
    if (beatCallback) {
      beatCallback(beatPhase);
    }
  }
  
  function getDetectedTempo(): number {
    return currentTempo;
  }
  
  function getTempoConfidence(): number {
    return tempoConfidence;
  }
  
  function getBeatPhase(): number {
    return beatPhase;
  }
  
  function setFollowMode(enabled: boolean): void {
    followModeEnabled = enabled;
    if (enabled && !isRunningFlag) {
      start();
    }
  }
  
  function isFollowModeEnabled(): boolean {
    return followModeEnabled;
  }
  
  function tap(): number {
    const now = performance.now();
    
    // Clear old taps (older than 2 seconds)
    while (tapTimes.length > 0 && now - tapTimes[0] > 2000) {
      tapTimes.shift();
    }
    
    tapTimes.push(now);
    
    // Keep max history
    if (tapTimes.length > MAX_TAP_HISTORY) {
      tapTimes.shift();
    }
    
    // Calculate tempo
    if (tapTimes.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimes.length; i++) {
        intervals.push(tapTimes[i] - tapTimes[i - 1]);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const tempo = 60000 / avgInterval;
      
      if (tempo >= opts.minTempo && tempo <= opts.maxTempo) {
        currentTempo = tempo;
        return tempo;
      }
    }
    
    return currentTempo;
  }
  
  function resetTap(): void {
    tapTimes.length = 0;
  }
  
  function nudgeTempo(amount: number): void {
    const nudgeAmount = amount * 0.1; // Max 10% change
    currentTempo = currentTempo * (1 + nudgeAmount);
    currentTempo = Math.max(opts.minTempo, Math.min(opts.maxTempo, currentTempo));
  }
  
  function onTempoDetected(callback: (tempo: number, confidence: number) => void): void {
    tempoCallback = callback;
  }
  
  function onBeatDetected(callback: (phase: number) => void): void {
    beatCallback = callback;
  }
  
  return {
    start,
    stop,
    isRunning,
    processAudioInput,
    getDetectedTempo,
    getTempoConfidence,
    getBeatPhase,
    setFollowMode,
    isFollowModeEnabled,
    tap,
    resetTap,
    nudgeTempo,
    onTempoDetected,
    onBeatDetected,
  };
}

/**
 * Simple FFT implementation for spectrum analysis
 */
function createFFT(size: number) {
  return {
    forward(input: Float32Array): Float32Array {
      const output = new Float32Array(size / 2);
      
      // Simple DFT for now - replace with proper FFT in production
      for (let k = 0; k < size / 2; k++) {
        let real = 0;
        let imag = 0;
        
        for (let n = 0; n < size; n++) {
          const inputVal = n < input.length ? input[n] : 0;
          const angle = (-2 * Math.PI * k * n) / size;
          real += inputVal * Math.cos(angle);
          imag += inputVal * Math.sin(angle);
        }
        
        output[k] = Math.sqrt(real * real + imag * imag) / size;
      }
      
      return output;
    },
  };
}

function hannWindow(n: number, size: number): number {
  return 0.5 * (1 - Math.cos((2 * Math.PI * n) / (size - 1)));
}

/**
 * Tap tempo calculator
 */
export function createTapTempo(): {
  tap(): number | null;
  reset(): void;
  getTempo(): number;
} {
  const taps: number[] = [];
  const MAX_TAPS = 8;
  let currentTempo = 120;
  
  function tap(): number | null {
    const now = performance.now();
    
    // Clear old taps
    while (taps.length > 0 && now - taps[0] > 2000) {
      taps.shift();
    }
    
    taps.push(now);
    
    if (taps.length > MAX_TAPS) {
      taps.shift();
    }
    
    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      
      // Remove outliers
      const sorted = [...intervals].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const validIntervals = intervals.filter(
        i => Math.abs(i - median) < median * 0.3
      );
      
      if (validIntervals.length >= 2) {
        const avg = validIntervals.reduce((a, b) => a + b, 0) / validIntervals.length;
        currentTempo = 60000 / avg;
        return currentTempo;
      }
    }
    
    return null;
  }
  
  function reset(): void {
    taps.length = 0;
  }
  
  function getTempo(): number {
    return currentTempo;
  }
  
  return { tap, reset, getTempo };
}
