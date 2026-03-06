/**
 * Audio Processing Utilities
 * 
 * STFT, ISTFT, and other audio processing utilities for source separation.
 * Optimized for use with deep learning models.
 */

export interface STFTResult {
  magnitude: Float32Array;
  phase: Float32Array;
  originalShape: {
    frames: number;
    bins: number;
    channels: number;
  };
}

/**
 * Compute Short-Time Fourier Transform
 */
export function stft(
  audioData: Float32Array,
  fftSize: number,
  hopLength: number,
  windowType: 'hann' | 'hamming' | 'blackman' = 'hann'
): STFTResult {
  const window = createWindow(fftSize, windowType);
  const numFrames = Math.ceil((audioData.length - fftSize) / hopLength) + 1;
  const numBins = fftSize / 2 + 1;
  
  const magnitude = new Float32Array(numFrames * numBins);
  const phase = new Float32Array(numFrames * numBins);
  
  // FFT buffer
  const fftBuffer = new Float32Array(fftSize);
  
  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hopLength;
    
    // Apply window and copy to buffer
    for (let i = 0; i < fftSize; i++) {
      const sampleIndex = start + i;
      fftBuffer[i] = sampleIndex < audioData.length 
        ? audioData[sampleIndex] * window[i]
        : 0;
    }
    
    // Compute FFT
    const { real, imag } = fft(fftBuffer);
    
    // Extract magnitude and phase
    for (let bin = 0; bin < numBins; bin++) {
      const idx = frame * numBins + bin;
      const re = real[bin];
      const im = imag[bin];
      magnitude[idx] = Math.sqrt(re * re + im * im);
      phase[idx] = Math.atan2(im, re);
    }
  }
  
  return {
    magnitude,
    phase,
    originalShape: {
      frames: numFrames,
      bins: numBins,
      channels: 1
    }
  };
}

/**
 * Compute Inverse Short-Time Fourier Transform
 */
export function istft(
  magnitude: Float32Array,
  phase: Float32Array,
  fftSize: number,
  hopLength: number,
  originalShape: { frames: number; bins: number; channels: number },
  windowType: 'hann' | 'hamming' | 'blackman' = 'hann'
): Float32Array[] {
  const window = createWindow(fftSize, windowType);
  const { frames, bins } = originalShape;
  const outputLength = (frames - 1) * hopLength + fftSize;
  
  // Initialize output buffer and overlap-add normalization
  const output = new Float32Array(outputLength);
  const norm = new Float32Array(outputLength);
  
  for (let frame = 0; frame < frames; frame++) {
    // Reconstruct complex spectrum
    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);
    
    for (let bin = 0; bin < bins; bin++) {
      const idx = frame * bins + bin;
      const mag = magnitude[idx];
      const ph = phase[idx];
      real[bin] = mag * Math.cos(ph);
      imag[bin] = mag * Math.sin(ph);
      
      // Mirror for full FFT (except DC and Nyquist)
      if (bin > 0 && bin < bins - 1) {
        real[fftSize - bin] = real[bin];
        imag[fftSize - bin] = -imag[bin];
      }
    }
    
    // Inverse FFT
    const timeFrame = ifft(real, imag);
    
    // Overlap-add with window
    const start = frame * hopLength;
    for (let i = 0; i < fftSize; i++) {
      const windowed = timeFrame[i] * window[i];
      output[start + i] += windowed;
      norm[start + i] += window[i] * window[i];
    }
  }
  
  // Normalize
  for (let i = 0; i < outputLength; i++) {
    if (norm[i] > 1e-10) {
      output[i] /= norm[i];
    }
  }
  
  return [output];
}

/**
 * Create window function
 */
function createWindow(
  size: number, 
  type: 'hann' | 'hamming' | 'blackman'
): Float32Array {
  const window = new Float32Array(size);
  
  for (let i = 0; i < size; i++) {
    const n = i / (size - 1);
    
    switch (type) {
      case 'hann':
        window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * n));
        break;
      case 'hamming':
        window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * n);
        break;
      case 'blackman':
        window[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * n) + 0.08 * Math.cos(4 * Math.PI * n);
        break;
    }
  }
  
  return window;
}

/**
 * Simple FFT implementation using Cooley-Tukey algorithm
 * For production, consider using a more optimized library
 */
function fft(input: Float32Array): { real: Float32Array; imag: Float32Array } {
  const n = input.length;
  const real = new Float32Array(input);
  const imag = new Float32Array(n);
  
  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
    }
    let k = n >> 1;
    while (k & j) {
      j &= ~k;
      k >>= 1;
    }
    j |= k;
  }
  
  // FFT butterflies
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);
    
    for (let i = 0; i < n; i += len) {
      let uReal = 1;
      let uImag = 0;
      
      for (let k = 0; k < halfLen; k++) {
        const evenIdx = i + k;
        const oddIdx = i + k + halfLen;
        
        const evenReal = real[evenIdx];
        const evenImag = imag[evenIdx];
        const oddReal = real[oddIdx] * uReal - imag[oddIdx] * uImag;
        const oddImag = real[oddIdx] * uImag + imag[oddIdx] * uReal;
        
        real[evenIdx] = evenReal + oddReal;
        imag[evenIdx] = evenImag + oddImag;
        real[oddIdx] = evenReal - oddReal;
        imag[oddIdx] = evenImag - oddImag;
        
        const tempReal = uReal * wReal - uImag * wImag;
        uImag = uReal * wImag + uImag * wReal;
        uReal = tempReal;
      }
    }
  }
  
  return { real, imag };
}

/**
 * Inverse FFT
 */
function ifft(real: Float32Array, imag: Float32Array): Float32Array {
  const n = real.length;
  
  // Conjugate
  const conjImag = new Float32Array(imag);
  for (let i = 0; i < n; i++) {
    conjImag[i] = -imag[i];
  }
  
  // Forward FFT
  const fftResult = fft(real);
  const outputReal = fftResult.real;
  const outputImag = fftResult.imag;
  
  // Conjugate and scale
  const output = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    output[i] = outputReal[i] / n;
  }
  
  return output;
}

/**
 * Preprocess audio buffer for model input
 */
export async function preprocessAudio(
  audioBuffer: AudioBuffer,
  fftSize: number,
  hopLength: number,
  onProgress?: (progress: number) => void
): Promise<{ magnitude: Float32Array; phase: Float32Array; originalShape: any }> {
  const numChannels = audioBuffer.numberOfChannels;
  const results: STFTResult[] = [];
  
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    const result = stft(channelData, fftSize, hopLength);
    results.push(result);
    
    if (onProgress) {
      onProgress((ch + 1) / numChannels);
    }
  }
  
  // For mono, return directly; for stereo, process each channel
  if (results.length === 1) {
    return {
      magnitude: results[0].magnitude,
      phase: results[0].phase,
      originalShape: results[0].originalShape
    };
  }
  
  // For stereo, concatenate channels
  const totalLength = results.reduce((sum, r) => sum + r.magnitude.length, 0);
  const magnitude = new Float32Array(totalLength);
  const phase = new Float32Array(totalLength);
  
  let offset = 0;
  for (const result of results) {
    magnitude.set(result.magnitude, offset);
    phase.set(result.phase, offset);
    offset += result.magnitude.length;
  }
  
  return {
    magnitude,
    phase,
    originalShape: {
      ...results[0].originalShape,
      channels: numChannels
    }
  };
}

/**
 * Postprocess model output to audio buffer
 */
export async function postprocessAudio(
  magnitude: Float32Array,
  phase: Float32Array,
  fftSize: number,
  hopLength: number,
  originalShape: any
): Promise<Float32Array[]> {
  const { channels, frames, bins } = originalShape;
  
  if (channels === 1) {
    return istft(magnitude, phase, fftSize, hopLength, { frames, bins, channels });
  }
  
  // Split by channels
  const channelLength = magnitude.length / channels;
  const output: Float32Array[] = [];
  
  for (let ch = 0; ch < channels; ch++) {
    const chMagnitude = magnitude.slice(ch * channelLength, (ch + 1) * channelLength);
    const chPhase = phase.slice(ch * channelLength, (ch + 1) * channelLength);
    
    const chOutput = istft(chMagnitude, chPhase, fftSize, hopLength, { frames, bins, channels: 1 });
    output.push(chOutput[0]);
  }
  
  return output;
}
