/**
 * Audio Analysis for Mastering
 * 
 * Comprehensive audio analysis including loudness (ITU-R BS.1770),
 * dynamics, spectral balance, and stereo field.
 */

import type { AudioAnalysis, AudioIssue } from './types.js';

// ITU-R BS.1770-4 filter coefficients
const PRE_FILTER_COEFFS = {
  b: [1.53512485958697, -2.69169618940638, 1.19839281085285],
  a: [1.0, -1.69065929318241, 0.73248077421585]
};

const RLB_FILTER_COEFFS = {
  b: [1.0, -2.0, 1.0],
  a: [1.0, -1.99004745483398, 0.99007225036621]
};

export class MasteringAnalyzer {
  private sampleRate: number;
  
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;
  }
  
  async analyze(audioBuffer: AudioBuffer): Promise<AudioAnalysis> {
    // Mix to mono for loudness analysis
    const monoData = this.mixToMono(audioBuffer);
    
    // Calculate loudness
    const loudness = this.calculateLoudness(monoData);
    
    // Calculate dynamics
    const dynamics = this.calculateDynamics(audioBuffer);
    
    // Spectral analysis
    const spectral = this.analyzeSpectrum(audioBuffer);
    
    // Stereo analysis
    const stereo = this.analyzeStereo(audioBuffer);
    
    // Detect issues
    const issues = this.detectIssues(audioBuffer, loudness, spectral, stereo);
    
    return {
      integratedLoudness: loudness.integrated,
      shortTermLoudness: loudness.shortTerm,
      momentaryLoudness: loudness.momentary,
      loudnessRange: loudness.range,
      peakLevel: dynamics.peak,
      truePeakLevel: dynamics.truePeak,
      crestFactor: dynamics.crestFactor,
      dynamicRange: dynamics.dynamicRange,
      spectralBalance: spectral.balance,
      spectralCentroid: spectral.centroid,
      spectralSpread: spectral.spread,
      bassEnergy: spectral.bass,
      midEnergy: spectral.mid,
      trebleEnergy: spectral.treble,
      stereoWidth: stereo.width,
      stereoBalance: stereo.balance,
      correlation: stereo.correlation,
      issues,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate
    };
  }
  
  private mixToMono(buffer: AudioBuffer): Float32Array {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const mono = new Float32Array(length);
    
    for (let ch = 0; ch < numChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        mono[i] += data[i] / numChannels;
      }
    }
    
    return mono;
  }
  
  private calculateLoudness(monoData: Float32Array): {
    integrated: number;
    shortTerm: number[];
    momentary: number[];
    range: number;
  } {
    // Apply ITU-R BS.1770 pre-filtering
    const filtered = this.applyBS1770Filters(monoData);
    
    // Calculate mean square per block
    const momentaryBlocks = this.calculateBlocks(filtered, 0.4); // 400ms
    const shortTermBlocks = this.calculateBlocks(filtered, 3.0); // 3s
    
    // Convert to LUFS
    const momentary = momentaryBlocks.map(ms => -0.691 + 10 * Math.log10(ms + 1e-10));
    const shortTerm = shortTermBlocks.map(ms => -0.691 + 10 * Math.log10(ms + 1e-10));
    
    // Integrated loudness (gated)
    const threshold = -70; // LUFS
    const gated = momentary.filter(l => l > threshold);
    const integrated = gated.length > 0
      ? gated.reduce((a, b) => a + b) / gated.length
      : -70;
    
    // Loudness range (LRA)
    const sorted = [...shortTerm].sort((a, b) => a - b);
    const percentile10 = sorted[Math.floor(sorted.length * 0.1)];
    const percentile95 = sorted[Math.floor(sorted.length * 0.95)];
    const range = percentile95 - percentile10;
    
    return {
      integrated,
      shortTerm,
      momentary,
      range
    };
  }
  
  private applyBS1770Filters(input: Float32Array): Float32Array {
    // Apply pre-filter (high shelf)
    const preFiltered = this.applyFilter(input, PRE_FILTER_COEFFS);
    
    // Apply RLB filter (high pass)
    const rlbFiltered = this.applyFilter(preFiltered, RLB_FILTER_COEFFS);
    
    return rlbFiltered;
  }
  
  private applyFilter(input: Float32Array, coeffs: { b: number[]; a: number[] }): Float32Array {
    const output = new Float32Array(input.length);
    const { b, a } = coeffs;
    
    // Direct Form II implementation
    const w = new Float32Array(Math.max(b.length, a.length));
    
    for (let n = 0; n < input.length; n++) {
      // w[0] = input[n] - a[1]*w[1] - a[2]*w[2]
      let w0 = input[n];
      for (let i = 1; i < a.length; i++) {
        w0 -= a[i] * w[i];
      }
      
      // output[n] = b[0]*w[0] + b[1]*w[1] + b[2]*w[2]
      let y = 0;
      for (let i = 0; i < b.length; i++) {
        y += b[i] * (i === 0 ? w0 : w[i]);
      }
      
      // Shift delay line
      for (let i = w.length - 1; i > 0; i--) {
        w[i] = w[i - 1];
      }
      w[0] = w0;
      
      output[n] = y;
    }
    
    return output;
  }
  
  private calculateBlocks(data: Float32Array, blockDuration: number): number[] {
    const blockSize = Math.floor(blockDuration * this.sampleRate);
    const overlap = Math.floor(blockSize / 2); // 50% overlap
    const blocks: number[] = [];
    
    for (let i = 0; i < data.length - blockSize; i += overlap) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += data[i + j] * data[i + j];
      }
      blocks.push(sum / blockSize);
    }
    
    return blocks;
  }
  
  private calculateDynamics(buffer: AudioBuffer): {
    peak: number;
    truePeak: number;
    crestFactor: number;
    dynamicRange: number;
  } {
    let peak = 0;
    let sumSquares = 0;
    let count = 0;
    
    // Sample peak and RMS
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
        sumSquares += data[i] * data[i];
        count++;
      }
    }
    
    const rms = Math.sqrt(sumSquares / count);
    const peakDb = 20 * Math.log10(peak + 1e-10);
    const rmsDb = 20 * Math.log10(rms + 1e-10);
    
    // True peak (4x oversampled approximation)
    const truePeak = this.calculateTruePeak(buffer);
    
    return {
      peak: peakDb,
      truePeak,
      crestFactor: peakDb - rmsDb,
      dynamicRange: this.calculateDynamicRange(buffer)
    };
  }
  
  private calculateTruePeak(buffer: AudioBuffer): number {
    // Simplified true peak - upsample by 4x and find peak
    let maxPeak = 0;
    
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      
      // Simple linear interpolation for 4x upsampling
      for (let i = 0; i < data.length - 1; i++) {
        for (let sub = 0; sub < 4; sub++) {
          const frac = sub / 4;
          const value = data[i] * (1 - frac) + data[i + 1] * frac;
          const abs = Math.abs(value);
          if (abs > maxPeak) maxPeak = abs;
        }
      }
    }
    
    return 20 * Math.log10(maxPeak + 1e-10);
  }
  
  private calculateDynamicRange(buffer: AudioBuffer): number {
    // Calculate RMS over short blocks and find range
    const blockSize = Math.floor(0.3 * this.sampleRate); // 300ms
    const rmsValues: number[] = [];
    
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      
      for (let i = 0; i < data.length; i += blockSize) {
        let sum = 0;
        const end = Math.min(i + blockSize, data.length);
        for (let j = i; j < end; j++) {
          sum += data[j] * data[j];
        }
        rmsValues.push(20 * Math.log10(Math.sqrt(sum / (end - i)) + 1e-10));
      }
    }
    
    // Remove extremes and calculate range
    const sorted = rmsValues.sort((a, b) => a - b);
    const low = sorted[Math.floor(sorted.length * 0.2)];
    const high = sorted[Math.floor(sorted.length * 0.8)];
    
    return high - low;
  }
  
  private analyzeSpectrum(buffer: AudioBuffer): {
    balance: Float32Array;
    centroid: number;
    spread: number;
    bass: number;
    mid: number;
    treble: number;
  } {
    const fftSize = 2048;
    const data = this.mixToMono(buffer);
    
    // Perform STFT
    const numFrames = Math.floor(data.length / fftSize);
    const spectrum = new Float32Array(fftSize / 2);
    
    for (let frame = 0; frame < numFrames; frame++) {
      const frameData = data.slice(frame * fftSize, (frame + 1) * fftSize);
      const fft = this.fft(frameData);
      
      for (let i = 0; i < fftSize / 2; i++) {
        spectrum[i] += fft.magnitude[i];
      }
    }
    
    // Average
    for (let i = 0; i < spectrum.length; i++) {
      spectrum[i] /= numFrames;
    }
    
    // Calculate spectral centroid
    let centroidSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const freq = i * buffer.sampleRate / fftSize;
      centroidSum += freq * spectrum[i];
      magnitudeSum += spectrum[i];
    }
    
    const centroid = magnitudeSum > 0 ? centroidSum / magnitudeSum : 1000;
    
    // Calculate spectral spread
    let spreadSum = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const freq = i * buffer.sampleRate / fftSize;
      spreadSum += Math.pow(freq - centroid, 2) * spectrum[i];
    }
    const spread = Math.sqrt(spreadSum / magnitudeSum);
    
    // Calculate energy in bands
    const nyquist = buffer.sampleRate / 2;
    const bassBin = Math.floor(250 / nyquist * spectrum.length);
    const midBin = Math.floor(4000 / nyquist * spectrum.length);
    
    let bass = 0, mid = 0, treble = 0;
    
    for (let i = 0; i < bassBin; i++) bass += spectrum[i];
    for (let i = bassBin; i < midBin; i++) mid += spectrum[i];
    for (let i = midBin; i < spectrum.length; i++) treble += spectrum[i];
    
    const total = bass + mid + treble;
    
    return {
      balance: spectrum,
      centroid,
      spread,
      bass: total > 0 ? bass / total : 0.33,
      mid: total > 0 ? mid / total : 0.33,
      treble: total > 0 ? treble / total : 0.33
    };
  }
  
  private fft(input: Float32Array): { magnitude: Float32Array; phase: Float32Array } {
    // Simplified FFT - in production, use a library
    const n = input.length;
    const magnitude = new Float32Array(n / 2);
    const phase = new Float32Array(n / 2);
    
    // Placeholder - real implementation would use proper FFT
    for (let i = 0; i < n / 2; i++) {
      magnitude[i] = Math.abs(input[i * 2]);
      phase[i] = 0;
    }
    
    return { magnitude, phase };
  }
  
  private analyzeStereo(buffer: AudioBuffer): {
    width: number;
    balance: number;
    correlation: number;
  } {
    if (buffer.numberOfChannels < 2) {
      return { width: 0, balance: 0, correlation: 1 };
    }
    
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    
    let leftEnergy = 0;
    let rightEnergy = 0;
    let correlation = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      leftEnergy += left[i] * left[i];
      rightEnergy += right[i] * right[i];
      correlation += left[i] * right[i];
    }
    
    const width = Math.min(1, Math.abs(leftEnergy - rightEnergy) / (leftEnergy + rightEnergy + 1e-10));
    const balance = (rightEnergy - leftEnergy) / (leftEnergy + rightEnergy + 1e-10);
    correlation /= Math.sqrt(leftEnergy * rightEnergy) + 1e-10;
    
    return { width, balance, correlation };
  }
  
  private detectIssues(
    buffer: AudioBuffer,
    loudness: { integrated: number },
    spectral: { bass: number; mid: number; treble: number },
    stereo: { width: number }
  ): AudioIssue[] {
    const issues: AudioIssue[] = [];
    
    // Check for clipping
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        if (Math.abs(data[i]) >= 1.0) {
          issues.push({
            type: 'clipping',
            severity: 'high',
            timeRange: [i / buffer.sampleRate, (i + 1) / buffer.sampleRate],
            description: 'Digital clipping detected'
          });
          break;
        }
      }
    }
    
    // Check loudness
    if (loudness.integrated < -25) {
      issues.push({
        type: 'low-dynamics',
        severity: 'medium',
        description: 'Track may be too quiet for the genre'
      });
    }
    
    // Check frequency balance
    if (spectral.bass > 0.5) {
      issues.push({
        type: 'muddy-bass',
        severity: 'medium',
        description: 'Excessive low-frequency energy'
      });
    }
    
    if (spectral.treble > 0.4) {
      issues.push({
        type: 'harsh-treble',
        severity: 'low',
        description: 'High-frequency content may be harsh'
      });
    }
    
    // Check mono compatibility
    if (stereo.width > 0.8) {
      issues.push({
        type: 'mono-compatibility',
        severity: 'low',
        description: 'Wide stereo field may cause issues in mono playback'
      });
    }
    
    return issues;
  }
}
