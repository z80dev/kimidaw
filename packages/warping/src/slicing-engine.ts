/**
 * Audio slicing engine for Slice warp mode
 * Slices audio at transients and plays back chromatically
 */

import type { Slice, SliceSettings, AudioBufferData, Transient } from './types.js';
import { DEFAULT_SLICE_SETTINGS } from './types.js';

export interface SlicingEngine {
  autoSlice(audio: AudioBufferData, settings?: Partial<SliceSettings>): Slice[];
  sliceAtTransients(audio: AudioBufferData, transients: Transient[]): Slice[];
  sliceAtGrid(audio: AudioBufferData, division: number): Slice[];
  manualSlice(audio: AudioBufferData, positions: number[]): Slice[];
  playSlice(sliceIndex: number, output: Float32Array[], offset: number): void;
  playAllSlices(output: Float32Array[]): void;
  setPlaybackMode(mode: SliceSettings['playback']): void;
  getSliceForNote(note: number): Slice | null;
  reset(): void;
}

export interface SlicingEngineState {
  audio: AudioBufferData | null;
  slices: Slice[];
  settings: SliceSettings;
  playbackMode: SliceSettings['playback'];
  currentSlice: number;
  rootNote: number; // MIDI note 36 (C2) = first slice
}

export function createSlicingEngine(): SlicingEngine {
  const state: SlicingEngineState = {
    audio: null,
    slices: [],
    settings: { ...DEFAULT_SLICE_SETTINGS },
    playbackMode: 'mono',
    currentSlice: 0,
    rootNote: 36, // C2
  };

  /**
   * Auto-detect slices based on settings
   */
  function autoSlice(
    audio: AudioBufferData,
    settings: Partial<SliceSettings> = {}
  ): Slice[] {
    const fullSettings = { ...state.settings, ...settings };
    state.audio = audio;
    state.settings = fullSettings;

    switch (fullSettings.preserve) {
      case 'transients':
        // Will need transient detection - handled externally
        state.slices = createDefaultSlices(audio);
        break;

      case '1/4':
        state.slices = sliceAtGrid(audio, 4);
        break;

      case '1/8':
        state.slices = sliceAtGrid(audio, 8);
        break;

      case '1/16':
        state.slices = sliceAtGrid(audio, 16);
        break;

      case '1/32':
        state.slices = sliceAtGrid(audio, 32);
        break;

      case 'auto':
        state.slices = autoDetectSlices(audio);
        break;

      case 'manual':
        // Use existing slices or create default
        state.slices = state.slices.length > 0 ? state.slices : createDefaultSlices(audio);
        break;

      default:
        state.slices = createDefaultSlices(audio);
    }

    // Assign root notes for chromatic playback
    assignRootNotes(state.slices);

    return state.slices;
  }

  /**
   * Slice at detected transients
   */
  function sliceAtTransients(audio: AudioBufferData, transients: Transient[]): Slice[] {
    state.audio = audio;

    if (transients.length === 0) {
      state.slices = createDefaultSlices(audio);
      return state.slices;
    }

    const slices: Slice[] = [];
    const length = audio.channelData[0]?.length || 0;

    // Add start position
    const positions = [0, ...transients.map(t => t.position), length];

    for (let i = 0; i < positions.length - 1; i++) {
      const start = positions[i];
      const end = positions[i + 1];

      slices.push({
        id: `slice-${i}`,
        start,
        end,
      });
    }

    state.slices = slices;
    assignRootNotes(slices);

    return slices;
  }

  /**
   * Slice at regular grid divisions
   */
  function sliceAtGrid(audio: AudioBufferData, division: number): Slice[] {
    state.audio = audio;

    const length = audio.channelData[0]?.length || 0;
    const sliceSize = Math.floor(length / division);
    const slices: Slice[] = [];

    for (let i = 0; i < division; i++) {
      const start = i * sliceSize;
      const end = i === division - 1 ? length : (i + 1) * sliceSize;

      slices.push({
        id: `slice-${i}`,
        start,
        end,
      });
    }

    state.slices = slices;
    assignRootNotes(slices);

    return slices;
  }

  /**
   * Create manual slices at specified positions
   */
  function manualSlice(audio: AudioBufferData, positions: number[]): Slice[] {
    state.audio = audio;

    const length = audio.channelData[0]?.length || 0;
    const sortedPositions = [...positions].sort((a, b) => a - b);

    // Ensure 0 and length are included
    if (sortedPositions[0] !== 0) {
      sortedPositions.unshift(0);
    }
    if (sortedPositions[sortedPositions.length - 1] !== length) {
      sortedPositions.push(length);
    }

    const slices: Slice[] = [];
    for (let i = 0; i < sortedPositions.length - 1; i++) {
      slices.push({
        id: `slice-${i}`,
        start: sortedPositions[i],
        end: sortedPositions[i + 1],
      });
    }

    state.slices = slices;
    assignRootNotes(slices);

    return slices;
  }

  /**
   * Auto-detect slices using energy-based segmentation
   */
  function autoDetectSlices(audio: AudioBufferData): Slice[] {
    const length = audio.channelData[0]?.length || 0;
    const sampleRate = audio.sampleRate;

    // Analyze energy
    const windowSize = Math.floor(0.01 * sampleRate); // 10ms
    const hopSize = Math.floor(windowSize / 2);
    const numFrames = Math.floor((length - windowSize) / hopSize);

    const energies: number[] = [];
    for (let i = 0; i < numFrames; i++) {
      let energy = 0;
      const start = i * hopSize;

      for (let ch = 0; ch < audio.numberOfChannels; ch++) {
        const channel = audio.channelData[ch];
        for (let j = 0; j < windowSize; j++) {
          const sample = channel[start + j] || 0;
          energy += sample * sample;
        }
      }

      energies.push(energy / (windowSize * audio.numberOfChannels));
    }

    // Find significant onsets
    const threshold = Math.max(...energies) * 0.1;
    const minSliceSize = Math.floor(0.05 * sampleRate / hopSize); // 50ms minimum

    const slicePoints: number[] = [0];
    let lastSliceFrame = 0;

    for (let i = 1; i < energies.length; i++) {
      const delta = energies[i] - energies[i - 1];

      if (delta > threshold && i - lastSliceFrame > minSliceSize) {
        slicePoints.push(i * hopSize);
        lastSliceFrame = i;
      }
    }

    slicePoints.push(length);

    // Create slices
    const slices: Slice[] = [];
    for (let i = 0; i < slicePoints.length - 1; i++) {
      slices.push({
        id: `slice-${i}`,
        start: slicePoints[i],
        end: slicePoints[i + 1],
      });
    }

    return slices;
  }

  /**
   * Create default single slice
   */
  function createDefaultSlices(audio: AudioBufferData): Slice[] {
    const length = audio.channelData[0]?.length || 0;
    return [
      {
        id: 'slice-0',
        start: 0,
        end: length,
      },
    ];
  }

  /**
   * Assign root notes to slices for chromatic playback
   */
  function assignRootNotes(slices: Slice[]): void {
    for (let i = 0; i < slices.length; i++) {
      slices[i].rootNote = state.rootNote + i;
    }
  }

  /**
   * Play a specific slice into output buffers
   */
  function playSlice(
    sliceIndex: number,
    output: Float32Array[],
    offset: number
  ): void {
    if (!state.audio || sliceIndex < 0 || sliceIndex >= state.slices.length) {
      return;
    }

    const slice = state.slices[sliceIndex];
    const sliceLength = slice.end - slice.start;

    for (let ch = 0; ch < state.audio.numberOfChannels; ch++) {
      if (ch >= output.length) break;

      const inputChannel = state.audio.channelData[ch];
      const outputChannel = output[ch];

      for (let i = 0; i < sliceLength && offset + i < outputChannel.length; i++) {
        outputChannel[offset + i] = inputChannel[slice.start + i] || 0;
      }
    }
  }

  /**
   * Play all slices sequentially
   */
  function playAllSlices(output: Float32Array[]): void {
    let offset = 0;

    for (let i = 0; i < state.slices.length; i++) {
      playSlice(i, output, offset);
      offset += state.slices[i].end - state.slices[i].start;
    }
  }

  /**
   * Set playback mode
   */
  function setPlaybackMode(mode: SliceSettings['playback']): void {
    state.playbackMode = mode;
  }

  /**
   * Get slice for MIDI note number
   */
  function getSliceForNote(note: number): Slice | null {
    const index = note - state.rootNote;

    if (index >= 0 && index < state.slices.length) {
      return state.slices[index];
    }

    return null;
  }

  /**
   * Reset engine state
   */
  function reset(): void {
    state.audio = null;
    state.slices = [];
    state.currentSlice = 0;
  }

  return {
    autoSlice,
    sliceAtTransients,
    sliceAtGrid,
    manualSlice,
    playSlice,
    playAllSlices,
    setPlaybackMode,
    getSliceForNote,
    reset,
  };
}

/**
 * Create a chromatic sampler from slices
 */
export interface ChromaticSampler {
  trigger(note: number, velocity: number): void;
  release(note: number): void;
  setPitchBend(cents: number): void;
  render(output: Float32Array[], numFrames: number): void;
  reset(): void;
}

export function createChromaticSampler(
  audio: AudioBufferData,
  slices: Slice[]
): ChromaticSampler {
  const activeVoices = new Map<
    number,
    {
      slice: Slice;
      position: number;
      velocity: number;
      pitchRatio: number;
      released: boolean;
    }
  >();

  let globalPitchBend = 1.0;
  let rootNote = 36;

  function trigger(note: number, velocity: number): void {
    const sliceIndex = note - rootNote;

    if (sliceIndex >= 0 && sliceIndex < slices.length) {
      const slice = slices[sliceIndex];
      const pitchRatio = Math.pow(2, sliceIndex / 12);

      activeVoices.set(note, {
        slice,
        position: slice.start,
        velocity: velocity / 127,
        pitchRatio,
        released: false,
      });
    }
  }

  function release(note: number): void {
    const voice = activeVoices.get(note);
    if (voice) {
      voice.released = true;
    }
  }

  function setPitchBend(cents: number): void {
    globalPitchBend = Math.pow(2, cents / 1200);
  }

  function render(output: Float32Array[], numFrames: number): void {
    // Clear output
    for (const channel of output) {
      channel.fill(0);
    }

    // Render each voice
    for (const [note, voice] of activeVoices) {
      const sliceLength = voice.slice.end - voice.slice.start;

      for (let frame = 0; frame < numFrames; frame++) {
        // Calculate read position with pitch
        const readPos = voice.position + frame * voice.pitchRatio * globalPitchBend;

        // Check if slice finished
        if (readPos >= voice.slice.end) {
          activeVoices.delete(note);
          break;
        }

        // Linear interpolation
        const index = Math.floor(readPos);
        const frac = readPos - index;

        for (let ch = 0; ch < audio.numberOfChannels; ch++) {
          if (ch >= output.length) break;

          const channel = audio.channelData[ch];
          const s0 = channel[index] || 0;
          const s1 = channel[index + 1] || s0;
          const sample = s0 + (s1 - s0) * frac;

          output[ch][frame] += sample * voice.velocity;
        }
      }

      // Update position
      voice.position += numFrames * voice.pitchRatio * globalPitchBend;

      // Remove if finished
      if (voice.position >= voice.slice.end) {
        activeVoices.delete(note);
      }
    }
  }

  function reset(): void {
    activeVoices.clear();
    globalPitchBend = 1.0;
  }

  return {
    trigger,
    release,
    setPitchBend,
    render,
    reset,
  };
}
