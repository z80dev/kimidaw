/**
 * Drum Replacement
 * 
 * Replace drum sounds in audio or MIDI tracks.
 */

// ============================================================================
// Types
// ============================================================================

export interface DrumHit {
  time: number;
  type: DrumType;
  velocity: number;
  confidence: number;
}

export type DrumType = 
  | 'kick'
  | 'snare'
  | 'hihat-closed'
  | 'hihat-open'
  | 'crash'
  | 'ride'
  | 'tom-high'
  | 'tom-mid'
  | 'tom-low'
  | 'clap'
  | 'rim'
  | 'other';

export interface DrumReplacementSettings {
  targetSamples: Partial<Record<DrumType, string>>;
  velocitySensitivity: number;
  humanize: number; // 0-1
  threshold: number; // dB
  minimumInterval: number; // ms between hits
  useOriginalVelocity: boolean;
  velocityCurve: 'linear' | 'exponential' | 'logarithmic';
}

export interface DetectedPattern {
  hits: DrumHit[];
  tempo: number;
  timeSignature: { numerator: number; denominator: number };
  patternLength: number; // in beats
  confidence: number;
}

export interface ReplacementResult {
  originalHits: DrumHit[];
  replacedHits: DrumHit[];
  midiNotes: Array<{
    note: number;
    velocity: number;
    start: number;
    duration: number;
  }>;
}

// ============================================================================
// Drum Replacement Engine
// ============================================================================

export interface DrumReplacementEngine {
  detectDrums(audioData: Float32Array, sampleRate: number): DrumHit[];
  detectPattern(hits: DrumHit[]): DetectedPattern;
  replaceDrums(
    hits: DrumHit[],
    settings: DrumReplacementSettings
  ): ReplacementResult;
  getDefaultSampleMap(): Record<DrumType, string>;
  drumTypeToMidiNote(drumType: DrumType): number;
  midiNoteToDrumType(midiNote: number): DrumType | null;
}

export function createDrumReplacementEngine(): DrumReplacementEngine {
  function detectDrums(audioData: Float32Array, sampleRate: number): DrumHit[] {
    const hits: DrumHit[] = [];
    
    // Transient detection
    const frameSize = Math.floor(sampleRate * 0.01); // 10ms frames
    const hopSize = Math.floor(frameSize / 2);
    
    const rmsValues: number[] = [];
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
      let sum = 0;
      for (let j = 0; j < frameSize; j++) {
        sum += audioData[i + j] * audioData[i + j];
      }
      rmsValues.push(Math.sqrt(sum / frameSize));
    }
    
    // Find peaks
    const threshold = Math.max(...rmsValues) * 0.3;
    const minInterval = Math.floor((sampleRate * 0.05) / hopSize); // 50ms minimum
    
    let lastHit = -minInterval;
    for (let i = 1; i < rmsValues.length - 1; i++) {
      if (rmsValues[i] > rmsValues[i - 1] && 
          rmsValues[i] > rmsValues[i + 1] && 
          rmsValues[i] > threshold &&
          i - lastHit >= minInterval) {
        
        const time = (i * hopSize) / sampleRate;
        const velocity = Math.min(127, Math.floor((rmsValues[i] / Math.max(...rmsValues)) * 127));
        
        // Classify drum type based on spectral content
        const drumType = classifyDrum(audioData, i * hopSize, frameSize, sampleRate);
        
        hits.push({
          time,
          type: drumType,
          velocity,
          confidence: 0.7,
        });
        
        lastHit = i;
      }
    }
    
    return hits;
  }
  
  function classifyDrum(
    audioData: Float32Array,
    position: number,
    frameSize: number,
    sampleRate: number
  ): DrumType {
    // Simple classification based on energy distribution
    const frame = audioData.slice(position, position + frameSize);
    
    // Calculate zero-crossing rate (higher for hi-hats)
    let zcr = 0;
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i] >= 0) !== (frame[i - 1] >= 0)) {
        zcr++;
      }
    }
    const zcrNormalized = zcr / frame.length;
    
    // Calculate centroid (simplified - would use FFT in real implementation)
    const energy = frame.reduce((sum, s) => sum + s * s, 0);
    let centroid = 0;
    for (let i = 0; i < frame.length; i++) {
      centroid += Math.abs(frame[i]) * i;
    }
    centroid = centroid / (energy * frame.length + 1e-10);
    
    // Classify based on features
    if (zcrNormalized > 0.1) {
      return zcrNormalized > 0.15 ? 'hihat-open' : 'hihat-closed';
    }
    
    if (centroid < 0.3) {
      return 'kick';
    }
    
    if (centroid > 0.6) {
      return 'crash';
    }
    
    // Default to snare for mid-range
    return 'snare';
  }
  
  function detectPattern(hits: DrumHit[]): DetectedPattern {
    if (hits.length === 0) {
      return {
        hits: [],
        tempo: 120,
        timeSignature: { numerator: 4, denominator: 4 },
        patternLength: 4,
        confidence: 0,
      };
    }
    
    // Estimate tempo from hit intervals
    const intervals: number[] = [];
    for (let i = 1; i < hits.length; i++) {
      intervals.push(hits[i].time - hits[i - 1].time);
    }
    
    // Find most common interval
    const intervalCounts = new Map<number, number>();
    for (const interval of intervals) {
      // Quantize to 10ms
      const quantized = Math.round(interval * 100) / 100;
      intervalCounts.set(quantized, (intervalCounts.get(quantized) || 0) + 1);
    }
    
    let bestInterval = 0.5;
    let bestCount = 0;
    for (const [interval, count] of intervalCounts) {
      if (count > bestCount) {
        bestCount = count;
        bestInterval = interval;
      }
    }
    
    // Convert interval to BPM
    const tempo = Math.round(60 / bestInterval * 4); // Assuming quarter note interval
    
    // Determine pattern length
    const firstHit = hits[0].time;
    const lastHit = hits[hits.length - 1].time;
    const duration = lastHit - firstHit;
    const patternLength = Math.ceil(duration / (60 / tempo) * 4);
    
    return {
      hits,
      tempo,
      timeSignature: { numerator: 4, denominator: 4 },
      patternLength,
      confidence: bestCount / intervals.length,
    };
  }
  
  function replaceDrums(
    hits: DrumHit[],
    settings: DrumReplacementSettings
  ): ReplacementResult {
    const midiNotes: ReplacementResult['midiNotes'] = [];
    const replacedHits: DrumHit[] = [];
    
    for (const hit of hits) {
      const sample = settings.targetSamples[hit.type];
      if (!sample) continue;
      
      // Apply velocity curve
      let velocity = hit.velocity;
      if (!settings.useOriginalVelocity) {
        velocity = applyVelocityCurve(hit.velocity, settings.velocityCurve);
      }
      
      // Apply velocity sensitivity
      velocity = Math.round(velocity * settings.velocitySensitivity);
      velocity = Math.max(1, Math.min(127, velocity));
      
      // Humanize timing
      let time = hit.time;
      if (settings.humanize > 0) {
        const jitter = (Math.random() - 0.5) * settings.humanize * 0.05;
        time = Math.max(0, time + jitter);
      }
      
      const drumNote = drumTypeToMidiNote(hit.type);
      
      midiNotes.push({
        note: drumNote,
        velocity,
        start: time,
        duration: 0.1, // Default duration
      });
      
      replacedHits.push({
        ...hit,
        velocity,
      });
    }
    
    return {
      originalHits: hits,
      replacedHits,
      midiNotes,
    };
  }
  
  function applyVelocityCurve(
    velocity: number,
    curve: DrumReplacementSettings['velocityCurve']
  ): number {
    const normalized = velocity / 127;
    let result: number;
    
    switch (curve) {
      case 'exponential':
        result = normalized * normalized;
        break;
      case 'logarithmic':
        result = Math.sqrt(normalized);
        break;
      case 'linear':
      default:
        result = normalized;
    }
    
    return Math.round(result * 127);
  }
  
  function getDefaultSampleMap(): Record<DrumType, string> {
    return {
      kick: 'samples/kick.wav',
      snare: 'samples/snare.wav',
      'hihat-closed': 'samples/hihat-closed.wav',
      'hihat-open': 'samples/hihat-open.wav',
      crash: 'samples/crash.wav',
      ride: 'samples/ride.wav',
      'tom-high': 'samples/tom-high.wav',
      'tom-mid': 'samples/tom-mid.wav',
      'tom-low': 'samples/tom-low.wav',
      clap: 'samples/clap.wav',
      rim: 'samples/rim.wav',
      other: 'samples/perc.wav',
    };
  }
  
  function drumTypeToMidiNote(drumType: DrumType): number {
    const map: Record<DrumType, number> = {
      kick: 36,
      snare: 38,
      'hihat-closed': 42,
      'hihat-open': 46,
      crash: 49,
      ride: 51,
      'tom-high': 50,
      'tom-mid': 47,
      'tom-low': 43,
      clap: 39,
      rim: 37,
      other: 60,
    };
    return map[drumType] || 60;
  }
  
  function midiNoteToDrumType(midiNote: number): DrumType | null {
    const map: Record<number, DrumType> = {
      36: 'kick',
      38: 'snare',
      42: 'hihat-closed',
      46: 'hihat-open',
      49: 'crash',
      51: 'ride',
      50: 'tom-high',
      47: 'tom-mid',
      43: 'tom-low',
      39: 'clap',
      37: 'rim',
    };
    return map[midiNote] || null;
  }
  
  return {
    detectDrums,
    detectPattern,
    replaceDrums,
    getDefaultSampleMap,
    drumTypeToMidiNote,
    midiNoteToDrumType,
  };
}
