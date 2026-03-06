/**
 * Main warp engine - orchestrates all warp modes
 */

import type {
  WarpMode,
  WarpState,
  BeatsSettings,
  TonesSettings,
  TextureSettings,
  ComplexSettings,
  SliceSettings,
  StutterSettings,
  AudioBufferData,
  Transient,
  WarpEvent,
  WarpEventHandler,
} from './types.js';
import { DEFAULT_WARP_STATE } from './types.js';
import { createBeatsProcessor } from './granular-engine.js';
import { createTonesProcessor } from './warp-modes/tones.js';
import { createTextureProcessor } from './warp-modes/texture.js';
import { createRePitchProcessor } from './warp-modes/repitch.js';
import { createComplexProcessor } from './warp-modes/complex.js';
import { createComplexProProcessor } from './warp-modes/complex-pro.js';
import { createStutterProcessor } from './warp-modes/stutter.js';
import { createSlicingEngine } from './slicing-engine.js';
import { createTransientDetector } from './transient-detector.js';
import { createWarpMarkerManager } from './warp-markers.js';

export interface WarpEngineOptions {
  mode?: WarpMode;
  originalTempo?: number;
  targetTempo?: number;
  detune?: number;
  sampleRate?: number;
}

export interface WarpEngine {
  readonly state: WarpState;
  process(input: AudioBufferData, output: Float32Array[]): void;
  setMode(mode: WarpMode): void;
  setTempo(originalTempo: number, targetTempo: number): void;
  setDetune(cents: number): void;
  setTransients(transients: Transient[]): void;
  analyzeAudio(audio: AudioBufferData): void;
  onEvent(handler: WarpEventHandler): () => void;
  reset(): void;
}

export function createWarpEngine(options: WarpEngineOptions = {}): WarpEngine {
  const sampleRate = options.sampleRate || 44100;

  const state: WarpState = {
    ...DEFAULT_WARP_STATE,
    mode: options.mode || 'complex',
    originalTempo: options.originalTempo || 120,
    targetTempo: options.targetTempo || 120,
    detune: options.detune || 0,
  };

  const eventHandlers: WarpEventHandler[] = [];

  // Mode-specific processors
  let beatsProcessor: ReturnType<typeof createBeatsProcessor> | null = null;
  let tonesProcessor: ReturnType<typeof createTonesProcessor> | null = null;
  let textureProcessor: ReturnType<typeof createTextureProcessor> | null = null;
  let rePitchProcessor: ReturnType<typeof createRePitchProcessor> | null = null;
  let complexProcessor: ReturnType<typeof createComplexProcessor> | null = null;
  let complexProProcessor: ReturnType<typeof createComplexProProcessor> | null = null;
  let stutterProcessor: ReturnType<typeof createStutterProcessor> | null = null;
  let slicingEngine = createSlicingEngine();

  // Analysis tools
  const transientDetector = createTransientDetector({ sampleRate });
  const markerManager = createWarpMarkerManager();

  // Cached transients
  let cachedTransients: Transient[] = [];

  function emitEvent(event: WarpEvent): void {
    for (const handler of eventHandlers) {
      handler(event);
    }
  }

  function getOrCreateProcessor(mode: WarpMode) {
    switch (mode) {
      case 'beats':
        if (!beatsProcessor) {
          beatsProcessor = createBeatsProcessor(
            state.settings as BeatsSettings,
            sampleRate
          );
        }
        return beatsProcessor;

      case 'tones':
        if (!tonesProcessor) {
          tonesProcessor = createTonesProcessor(
            state.settings as TonesSettings,
            sampleRate
          );
        }
        return tonesProcessor;

      case 'texture':
        if (!textureProcessor) {
          textureProcessor = createTextureProcessor(
            state.settings as TextureSettings,
            sampleRate
          );
        }
        return textureProcessor;

      case 're-pitch':
        if (!rePitchProcessor) {
          rePitchProcessor = createRePitchProcessor();
        }
        return rePitchProcessor;

      case 'complex':
        if (!complexProcessor) {
          complexProcessor = createComplexProcessor(
            state.settings as ComplexSettings,
            sampleRate
          );
        }
        return complexProcessor;

      case 'complex-pro':
        if (!complexProProcessor) {
          complexProProcessor = createComplexProProcessor(
            state.settings as ComplexSettings,
            sampleRate
          );
        }
        return complexProProcessor;

      case 'stutter':
        if (!stutterProcessor) {
          stutterProcessor = createStutterProcessor(
            state.settings as StutterSettings,
            sampleRate
          );
        }
        return stutterProcessor;

      case 'slice':
        return slicingEngine;

      default:
        throw new Error(`Unknown warp mode: ${mode}`);
    }
  }

  function process(input: AudioBufferData, output: Float32Array[]): void {
    if (!state.enabled) {
      // Pass through
      for (let ch = 0; ch < input.numberOfChannels && ch < output.length; ch++) {
        output[ch].set(input.channelData[ch].subarray(0, output[ch].length));
      }
      return;
    }

    emitEvent({
      type: 'processing-start',
      timestamp: Date.now(),
    });

    try {
      const timeRatio = state.originalTempo / state.targetTempo;
      const pitchRatio = Math.pow(2, state.detune / 1200);

      const processor = getOrCreateProcessor(state.mode);

      switch (state.mode) {
        case 'beats':
          (processor as ReturnType<typeof createBeatsProcessor>).process(input, output);
          break;

        case 'tones':
          (processor as ReturnType<typeof createTonesProcessor>).process(
            input,
            output,
            timeRatio / pitchRatio
          );
          break;

        case 'texture':
          (processor as ReturnType<typeof createTextureProcessor>).process(
            input,
            output,
            timeRatio
          );
          break;

        case 're-pitch':
          (processor as ReturnType<typeof createRePitchProcessor>).process(
            input,
            output,
            timeRatio * pitchRatio
          );
          break;

        case 'complex':
          (processor as ReturnType<typeof createComplexProcessor>).process(
            input,
            output,
            timeRatio
          );
          break;

        case 'complex-pro':
          (processor as ReturnType<typeof createComplexProProcessor>).process(
            input,
            output,
            timeRatio
          );
          break;

        case 'stutter':
          (processor as ReturnType<typeof createStutterProcessor>).process(
            input,
            output
          );
          break;

        case 'slice':
          (processor as ReturnType<typeof createSlicingEngine>).autoSlice(input, state.settings as SliceSettings);
          (processor as ReturnType<typeof createSlicingEngine>).playAllSlices(output);
          break;

        default:
          throw new Error(`Processing not implemented for mode: ${state.mode}`);
      }

      emitEvent({
        type: 'processing-complete',
        timestamp: Date.now(),
      });
    } catch (error) {
      emitEvent({
        type: 'error',
        timestamp: Date.now(),
        data: error,
      });
      throw error;
    }
  }

  function setMode(mode: WarpMode): void {
    state.mode = mode;
    emitEvent({
      type: 'marker-added',
      timestamp: Date.now(),
      data: { mode },
    });
  }

  function setTempo(originalTempo: number, targetTempo: number): void {
    state.originalTempo = originalTempo;
    state.targetTempo = targetTempo;
  }

  function setDetune(cents: number): void {
    state.detune = cents;
  }

  function setTransients(transients: Transient[]): void {
    cachedTransients = [...transients];
    state.transients = cachedTransients;

    // Update processors that use transients
    if (beatsProcessor) {
      // Beats processor gets transients through its own mechanism
    }
  }

  function analyzeAudio(audio: AudioBufferData): void {
    const result = transientDetector.detect(audio);
    cachedTransients = result.transients;
    state.transients = cachedTransients;

    // Auto-warp
    markerManager.autoWarp(audio, result.suggestedTempo);
    state.markers = markerManager.getAllMarkers();

    emitEvent({
      type: 'analysis-complete',
      timestamp: Date.now(),
      data: result,
    });
  }

  function onEvent(handler: WarpEventHandler): () => void {
    eventHandlers.push(handler);
    return () => {
      const index = eventHandlers.indexOf(handler);
      if (index >= 0) {
        eventHandlers.splice(index, 1);
      }
    };
  }

  function reset(): void {
    beatsProcessor?.reset();
    tonesProcessor?.reset();
    textureProcessor?.reset();
    rePitchProcessor?.reset();
    complexProcessor?.reset();
    complexProProcessor?.reset();
    stutterProcessor?.reset();
    slicingEngine.reset();
  }

  return {
    get state() {
      return { ...state, markers: [...state.markers], transients: [...state.transients] };
    },
    process,
    setMode,
    setTempo,
    setDetune,
    setTransients,
    analyzeAudio,
    onEvent,
    reset,
  };
}
