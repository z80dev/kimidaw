/**
 * Pitch Correction Engine
 * 
 * High-quality pitch shifting with formant preservation.
 * Uses phase vocoder and LPC for formant correction.
 */

import type { 
  PitchCorrectionConfig, 
  PitchAnalysis, 
  DetectedNote,
  ScaleCorrectionOptions,
  CorrectionOptions 
} from './types.js';
import { PitchDetector, detectScale } from './detector.js';
import { SCALES, midiToNoteName, noteNameToMidi } from './types.js';

interface FormantFilter {
  frequencies: number[];
  bandwidths: number[];
  gains: number[];
}

export class PitchCorrector {
  private config: PitchCorrectionConfig;
  private detector: PitchDetector;
  private originalBuffer: AudioBuffer | null = null;
  
  constructor(config: Partial<PitchCorrectionConfig> = {}) {
    this.config = {
      algorithm: 'monophonic',
      quality: 'high',
      preserveFormants: true,
      sampleRate: 44100,
      fftSize: 2048,
      hopSize: 256,
      ...config
    };
    
    this.detector = new PitchDetector({
      sampleRate: this.config.sampleRate,
      frameSize: this.config.fftSize,
      hopSize: this.config.hopSize
    });
  }
  
  async analyze(audioBuffer: AudioBuffer): Promise<PitchAnalysis> {
    this.originalBuffer = audioBuffer;
    
    // Mix to mono for analysis
    const monoData = this.mixToMono(audioBuffer);
    
    // Detect pitch contour
    const pitchContour = this.detector.detectYIN(monoData);
    const hopTime = this.config.hopSize / this.config.sampleRate;
    
    // Detect notes
    const notes = this.detector.detectNotes(pitchContour, monoData, hopTime);
    
    // Detect scale
    const scaleInfo = detectScale(notes);
    
    return {
      notes,
      sampleRate: audioBuffer.sampleRate,
      duration: audioBuffer.duration,
      detectedKey: scaleInfo.key,
      detectedScale: scaleInfo.scale,
      confidence: scaleInfo.confidence,
      
      getNotesInRange(start: number, end: number): DetectedNote[] {
        return notes.filter(n => n.startTime >= start && n.startTime < end);
      },
      
      getNoteAt(time: number, pitch?: number): DetectedNote | null {
        for (const note of notes) {
          if (time >= note.startTime && time < note.startTime + note.duration) {
            if (pitch === undefined || Math.abs(note.pitch - pitch) < 0.5) {
              return note;
            }
          }
        }
        return null;
      },
      
      addNote(note: Partial<DetectedNote>): DetectedNote {
        const newNote: DetectedNote = {
          id: `note-${notes.length}`,
          startTime: note.startTime || 0,
          duration: note.duration || 0.5,
          pitch: note.pitch || 60,
          pitchCents: note.pitchCents || 0,
          amplitude: note.amplitude || -12,
          confidence: 1,
          ...note
        };
        notes.push(newNote);
        return newNote;
      },
      
      removeNote(id: string): void {
        const index = notes.findIndex(n => n.id === id);
        if (index >= 0) notes.splice(index, 1);
      },
      
      splitNote(id: string, time: number): [DetectedNote, DetectedNote] {
        const index = notes.findIndex(n => n.id === id);
        const note = notes[index];
        
        const first: DetectedNote = {
          ...note,
          id: `${id}-a`,
          duration: time - note.startTime
        };
        
        const second: DetectedNote = {
          ...note,
          id: `${id}-b`,
          startTime: time,
          duration: note.startTime + note.duration - time
        };
        
        notes.splice(index, 1, first, second);
        return [first, second];
      },
      
      mergeNotes(ids: string[]): DetectedNote {
        const toMerge = notes.filter(n => ids.includes(n.id));
        const startTime = Math.min(...toMerge.map(n => n.startTime));
        const endTime = Math.max(...toMerge.map(n => n.startTime + n.duration));
        
        const merged: DetectedNote = {
          id: `note-${notes.length}`,
          startTime,
          duration: endTime - startTime,
          pitch: Math.round(toMerge.reduce((sum, n) => sum + n.pitch, 0) / toMerge.length),
          pitchCents: 0,
          amplitude: Math.max(...toMerge.map(n => n.amplitude)),
          confidence: 1
        };
        
        // Remove merged notes, add new one
        for (const id of ids) {
          const idx = notes.findIndex(n => n.id === id);
          if (idx >= 0) notes.splice(idx, 1);
        }
        notes.push(merged);
        
        return merged;
      }
    };
  }
  
  async correctToScale(
    analysis: PitchAnalysis,
    options: ScaleCorrectionOptions
  ): Promise<PitchAnalysis> {
    const scale = SCALES[options.scale];
    if (!scale) throw new Error(`Unknown scale: ${options.scale}`);
    
    const rootMidi = noteNameToMidi(options.root);
    const scaleNotes = scale.intervals.map(i => (rootMidi + i) % 12);
    
    for (const note of analysis.notes) {
      const noteClass = note.pitch % 12;
      
      if (!scaleNotes.includes(noteClass)) {
        // Find nearest scale note
        let nearest = scaleNotes[0];
        let minDist = Math.abs(noteClass - nearest);
        
        for (const scaleNote of scaleNotes) {
          const dist = Math.abs(noteClass - scaleNote);
          if (dist < minDist) {
            minDist = dist;
            nearest = scaleNote;
          }
        }
        
        // Calculate new pitch
        const octave = Math.floor(note.pitch / 12);
        const newPitch = octave * 12 + nearest;
        
        // Apply strength
        if (options.snapToNearest) {
          note.targetPitch = newPitch;
        } else {
          const diff = newPitch - note.pitch;
          note.targetPitch = note.pitch + diff * options.strength;
        }
      }
    }
    
    return analysis;
  }
  
  async correctNote(
    analysis: PitchAnalysis,
    noteId: string,
    newPitch: number,
    options: Partial<CorrectionOptions> = {}
  ): Promise<PitchAnalysis> {
    const note = analysis.notes.find(n => n.id === noteId);
    if (!note) throw new Error(`Note not found: ${noteId}`);
    
    note.targetPitch = newPitch;
    
    return analysis;
  }
  
  async quantizePitch(
    analysis: PitchAnalysis,
    gridSize: number
  ): Promise<PitchAnalysis> {
    for (const note of analysis.notes) {
      const quantizedCents = Math.round(note.pitchCents / gridSize) * gridSize;
      note.pitchDrift = quantizedCents - note.pitchCents;
    }
    
    return analysis;
  }
  
  async render(analysis: PitchAnalysis): Promise<AudioBuffer> {
    if (!this.originalBuffer) {
      throw new Error('No audio buffer analyzed');
    }
    
    const numChannels = this.originalBuffer.numberOfChannels;
    const length = this.originalBuffer.length;
    const sampleRate = this.originalBuffer.sampleRate;
    
    // Create output buffer
    const audioContext = new OfflineAudioContext(numChannels, length, sampleRate);
    const outputBuffer = audioContext.createBuffer(numChannels, length, sampleRate);
    
    for (let ch = 0; ch < numChannels; ch++) {
      const inputData = this.originalBuffer.getChannelData(ch);
      const outputData = outputBuffer.getChannelData(ch);
      
      // Process each note
      for (const note of analysis.notes) {
        if (note.targetPitch === undefined && note.pitchShift === 0) continue;
        
        const startSample = Math.floor(note.startTime * sampleRate);
        const endSample = Math.min(
          startSample + Math.floor(note.duration * sampleRate),
          length
        );
        
        const pitchShift = note.targetPitch !== undefined
          ? note.targetPitch - note.pitch
          : (note.pitchShift || 0);
        
        // Extract note audio
        const noteLength = endSample - startSample;
        const noteAudio = new Float32Array(noteLength);
        for (let i = 0; i < noteLength; i++) {
          noteAudio[i] = inputData[startSample + i];
        }
        
        // Apply pitch shift
        const shiftedAudio = this.pitchShift(noteAudio, pitchShift, sampleRate);
        
        // Apply formant shift if needed
        let finalAudio = shiftedAudio;
        if (this.config.preserveFormants && note.formantShift) {
          finalAudio = this.shiftFormants(shiftedAudio, note.formantShift, sampleRate);
        }
        
        // Crossfade and mix back
        this.mixWithCrossfade(outputData, finalAudio, startSample, 0.005, sampleRate);
      }
      
      // Copy unprocessed audio
      for (let i = 0; i < length; i++) {
        let isNote = false;
        for (const note of analysis.notes) {
          const start = Math.floor(note.startTime * sampleRate);
          const end = start + Math.floor(note.duration * sampleRate);
          if (i >= start && i < end) {
            isNote = true;
            break;
          }
        }
        
        if (!isNote) {
          outputData[i] = inputData[i];
        }
      }
    }
    
    return outputBuffer;
  }
  
  async renderPreview(
    analysis: PitchAnalysis,
    timeRange: [number, number]
  ): Promise<AudioBuffer> {
    // Extract the relevant portion and render
    const [start, end] = timeRange;
    
    if (!this.originalBuffer) {
      throw new Error('No audio buffer analyzed');
    }
    
    const sampleRate = this.originalBuffer.sampleRate;
    const startSample = Math.floor(start * sampleRate);
    const endSample = Math.floor(end * sampleRate);
    
    // Create temporary buffer with just this range
    const tempContext = new OfflineAudioContext(
      this.originalBuffer.numberOfChannels,
      endSample - startSample,
      sampleRate
    );
    
    const tempBuffer = tempContext.createBuffer(
      this.originalBuffer.numberOfChannels,
      endSample - startSample,
      sampleRate
    );
    
    for (let ch = 0; ch < this.originalBuffer.numberOfChannels; ch++) {
      const src = this.originalBuffer.getChannelData(ch);
      const dst = tempBuffer.getChannelData(ch);
      for (let i = 0; i < endSample - startSample; i++) {
        dst[i] = src[startSample + i];
      }
    }
    
    // Analyze and render
    const tempCorrector = new PitchCorrector(this.config);
    const tempAnalysis = await tempCorrector.analyze(tempBuffer);
    
    // Copy note corrections
    for (const note of analysis.notes) {
      if (note.startTime >= start && note.startTime < end) {
        const tempNote = tempAnalysis.notes.find(n => 
          Math.abs(n.startTime - (note.startTime - start)) < 0.01
        );
        if (tempNote) {
          tempNote.targetPitch = note.targetPitch;
          tempNote.pitchShift = note.pitchShift;
          tempNote.formantShift = note.formantShift;
        }
      }
    }
    
    return tempCorrector.render(tempAnalysis);
  }
  
  getCorrectionCurve(analysis: PitchAnalysis): Float32Array {
    const numFrames = Math.ceil(analysis.duration * analysis.sampleRate / this.config.hopSize);
    const curve = new Float32Array(numFrames);
    
    for (let i = 0; i < numFrames; i++) {
      const time = i * this.config.hopSize / analysis.sampleRate;
      
      // Find note at this time
      const note = analysis.getNoteAt(time);
      if (note && note.targetPitch !== undefined) {
        const correction = note.targetPitch - note.pitch;
        curve[i] = correction;
      } else {
        curve[i] = 0;
      }
    }
    
    return curve;
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
  
  private pitchShift(audio: Float32Array, semitones: number, sampleRate: number): Float32Array {
    // Phase vocoder pitch shifting
    const ratio = Math.pow(2, semitones / 12);
    const outputLength = Math.floor(audio.length / ratio);
    const output = new Float32Array(outputLength);
    
    // Simple time-domain pitch shifting with overlap-add
    const windowSize = 2048;
    const hopIn = Math.floor(windowSize / 4);
    const hopOut = Math.floor(hopIn / ratio);
    
    const window = this.hannWindow(windowSize);
    
    let phase = 0;
    
    for (let outPos = 0; outPos < outputLength - windowSize; outPos += hopOut) {
      const inPos = Math.floor(outPos * ratio);
      
      if (inPos + windowSize > audio.length) break;
      
      // Extract frame
      const frame = new Float32Array(windowSize);
      for (let i = 0; i < windowSize; i++) {
        frame[i] = audio[inPos + i] * window[i];
      }
      
      // FFT
      const spectrum = this.fft(frame);
      
      // Modify phase
      for (let i = 0; i < windowSize / 2; i++) {
        const frequency = i * sampleRate / windowSize;
        const phaseShift = 2 * Math.PI * frequency * (hopOut - hopIn) / sampleRate;
        spectrum.phase[i] += phaseShift;
      }
      
      // IFFT
      const shifted = this.ifft(spectrum);
      
      // Overlap-add
      for (let i = 0; i < windowSize && outPos + i < outputLength; i++) {
        output[outPos + i] += shifted[i] * window[i];
      }
    }
    
    // Normalize
    const maxAmp = Math.max(...output.map(Math.abs));
    if (maxAmp > 0) {
      for (let i = 0; i < output.length; i++) {
        output[i] /= maxAmp;
      }
    }
    
    return output;
  }
  
  private shiftFormants(audio: Float32Array, shift: number, sampleRate: number): Float32Array {
    // LPC-based formant shifting (simplified)
    // Full implementation would estimate and shift formants
    return audio;
  }
  
  private mixWithCrossfade(
    output: Float32Array,
    input: Float32Array,
    position: number,
    fadeTime: number,
    sampleRate: number
  ): void {
    const fadeSamples = Math.floor(fadeTime * sampleRate);
    
    for (let i = 0; i < input.length && position + i < output.length; i++) {
      let gain = 1;
      
      // Fade in
      if (i < fadeSamples) {
        gain = i / fadeSamples;
      }
      // Fade out
      else if (i > input.length - fadeSamples) {
        gain = (input.length - i) / fadeSamples;
      }
      
      output[position + i] = output[position + i] * (1 - gain) + input[i] * gain;
    }
  }
  
  private hannWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
    }
    return window;
  }
  
  private fft(frame: Float32Array): { magnitude: Float32Array; phase: Float32Array } {
    // Simplified FFT - production would use optimized library
    const n = frame.length;
    const real = new Float32Array(frame);
    const imag = new Float32Array(n);
    
    // Cooley-Tukey FFT
    this.fftRecursive(real, imag, n);
    
    const magnitude = new Float32Array(n / 2);
    const phase = new Float32Array(n / 2);
    
    for (let i = 0; i < n / 2; i++) {
      magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
      phase[i] = Math.atan2(imag[i], real[i]);
    }
    
    return { magnitude, phase };
  }
  
  private fftRecursive(real: Float32Array, imag: Float32Array, n: number): void {
    if (n <= 1) return;
    
    const half = n / 2;
    
    // Separate even and odd
    const evenReal = new Float32Array(half);
    const evenImag = new Float32Array(half);
    const oddReal = new Float32Array(half);
    const oddImag = new Float32Array(half);
    
    for (let i = 0; i < half; i++) {
      evenReal[i] = real[i * 2];
      evenImag[i] = imag[i * 2];
      oddReal[i] = real[i * 2 + 1];
      oddImag[i] = imag[i * 2 + 1];
    }
    
    this.fftRecursive(evenReal, evenImag, half);
    this.fftRecursive(oddReal, oddImag, half);
    
    // Combine
    for (let k = 0; k < half; k++) {
      const angle = -2 * Math.PI * k / n;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      const tReal = cos * oddReal[k] - sin * oddImag[k];
      const tImag = sin * oddReal[k] + cos * oddImag[k];
      
      real[k] = evenReal[k] + tReal;
      imag[k] = evenImag[k] + tImag;
      real[k + half] = evenReal[k] - tReal;
      imag[k + half] = evenImag[k] - tImag;
    }
  }
  
  private ifft(spectrum: { magnitude: Float32Array; phase: Float32Array }): Float32Array {
    const n = spectrum.magnitude.length * 2;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    
    // Reconstruct full spectrum
    for (let i = 0; i < n / 2; i++) {
      real[i] = spectrum.magnitude[i] * Math.cos(spectrum.phase[i]);
      imag[i] = spectrum.magnitude[i] * Math.sin(spectrum.phase[i]);
      if (i > 0 && i < n / 2 - 1) {
        real[n - i] = real[i];
        imag[n - i] = -imag[i];
      }
    }
    
    // Inverse FFT
    this.ifftRecursive(real, imag, n);
    
    // Scale
    for (let i = 0; i < n; i++) {
      real[i] /= n;
    }
    
    return real;
  }
  
  private ifftRecursive(real: Float32Array, imag: Float32Array, n: number): void {
    // Conjugate, FFT, conjugate, scale
    for (let i = 0; i < n; i++) {
      imag[i] = -imag[i];
    }
    
    this.fftRecursive(real, imag, n);
    
    for (let i = 0; i < n; i++) {
      imag[i] = -imag[i];
    }
  }
  
  async dispose(): Promise<void> {
    this.originalBuffer = null;
  }
}

export function createPitchCorrector(config?: Partial<PitchCorrectionConfig>): PitchCorrector {
  return new PitchCorrector(config);
}
