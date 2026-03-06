import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWarpEngine,
  createTransientDetector,
  createWarpMarkerManager,
  tempoToRatio,
  semitonesToRatio,
} from '../index.js';
import type { AudioBufferData } from '../types.js';

function createTestAudio(duration: number = 1, sampleRate: number = 44100): AudioBufferData {
  const length = Math.floor(duration * sampleRate);
  return {
    sampleRate,
    length,
    duration,
    numberOfChannels: 2,
    channelData: [
      new Float32Array(length).fill(0.5),
      new Float32Array(length).fill(0.5),
    ],
  };
}

describe('WarpEngine', () => {
  let engine: ReturnType<typeof createWarpEngine>;

  beforeEach(() => {
    engine = createWarpEngine({
      mode: 'complex',
      originalTempo: 120,
      targetTempo: 120,
    });
  });

  it('should create warp engine with default settings', () => {
    expect(engine.state.mode).toBe('complex');
    expect(engine.state.originalTempo).toBe(120);
    expect(engine.state.targetTempo).toBe(120);
    expect(engine.state.enabled).toBe(true);
  });

  it('should change warp mode', () => {
    engine.setMode('beats');
    expect(engine.state.mode).toBe('beats');

    engine.setMode('tones');
    expect(engine.state.mode).toBe('tones');
  });

  it('should set tempo', () => {
    engine.setTempo(100, 128);
    expect(engine.state.originalTempo).toBe(100);
    expect(engine.state.targetTempo).toBe(128);
  });

  it('should set detune', () => {
    engine.setDetune(100);
    expect(engine.state.detune).toBe(100);
  });

  it('should process audio', () => {
    const input = createTestAudio();
    const output = [
      new Float32Array(input.length),
      new Float32Array(input.length),
    ];

    engine.process(input, output);

    expect(output[0].length).toBe(input.length);
    expect(output[1].length).toBe(input.length);
  });

  it('should emit events', () => {
    const events: string[] = [];
    const unsubscribe = engine.onEvent((event) => {
      events.push(event.type);
    });

    engine.setMode('beats');
    
    expect(events.length).toBeGreaterThan(0);
    
    unsubscribe();
  });
});

describe('TransientDetector', () => {
  let detector: ReturnType<typeof createTransientDetector>;

  beforeEach(() => {
    detector = createTransientDetector({ sampleRate: 44100 });
  });

  it('should detect transients in audio', () => {
    const audio = createTestAudio();
    
    // Add some impulsive content
    for (let i = 0; i < 1000; i++) {
      audio.channelData[0][i * 1000] = 1.0;
    }

    const result = detector.detect(audio);

    expect(result.transients).toBeDefined();
    expect(result.suggestedTempo).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it('should set sensitivity', () => {
    detector.setSensitivity(0.8);
    // Should not throw
  });

  it('should set threshold', () => {
    detector.setThreshold(0.2);
    // Should not throw
  });

  it('should detect beats', () => {
    const audio = createTestAudio(2);
    const result = detector.detectBeats(audio);

    expect(result.beats).toBeDefined();
    expect(result.bars).toBeDefined();
    expect(result.downbeats).toBeDefined();
  });
});

describe('WarpMarkerManager', () => {
  let manager: ReturnType<typeof createWarpMarkerManager>;

  beforeEach(() => {
    manager = createWarpMarkerManager();
  });

  it('should add markers', () => {
    const marker = manager.addMarker(0, 0);
    expect(marker.samplePosition).toBe(0);
    expect(marker.beatPosition).toBe(0);

    const marker2 = manager.addMarker(44100, 1);
    expect(marker2.samplePosition).toBe(44100);
    expect(marker2.beatPosition).toBe(1);
  });

  it('should remove markers', () => {
    const marker = manager.addMarker(0, 0);
    expect(manager.removeMarker(marker.id)).toBe(true);
    expect(manager.removeMarker(marker.id)).toBe(false);
  });

  it('should move markers', () => {
    const marker = manager.addMarker(0, 0);
    expect(manager.moveMarker(marker.id, 22050, 0.5)).toBe(true);
    
    const updated = manager.getMarker(marker.id);
    expect(updated?.samplePosition).toBe(22050);
    expect(updated?.beatPosition).toBe(0.5);
  });

  it('should convert sample to beat', () => {
    manager.addMarker(0, 0);
    manager.addMarker(44100, 1);

    expect(manager.sampleToBeat(0)).toBe(0);
    expect(manager.sampleToBeat(22050)).toBe(0.5);
    expect(manager.sampleToBeat(44100)).toBe(1);
  });

  it('should convert beat to sample', () => {
    manager.addMarker(0, 0);
    manager.addMarker(44100, 1);

    expect(manager.beatToSample(0)).toBe(0);
    expect(manager.beatToSample(0.5)).toBe(22050);
    expect(manager.beatToSample(1)).toBe(44100);
  });

  it('should auto-warp audio', () => {
    const audio = createTestAudio(2);
    const markers = manager.autoWarp(audio, 120);

    expect(markers.length).toBeGreaterThan(0);
    expect(markers[0].samplePosition).toBe(0);
    expect(markers[0].beatPosition).toBe(0);
  });

  it('should clear markers', () => {
    manager.addMarker(0, 0);
    manager.clearMarkers();
    expect(manager.getAllMarkers().length).toBe(0);
  });
});

describe('Utility Functions', () => {
  it('should convert tempo to ratio', () => {
    expect(tempoToRatio(120, 120)).toBe(1);
    expect(tempoToRatio(120, 60)).toBe(2);
    expect(tempoToRatio(60, 120)).toBe(0.5);
  });

  it('should convert semitones to ratio', () => {
    expect(semitonesToRatio(0)).toBe(1);
    expect(semitonesToRatio(12)).toBeCloseTo(2);
    expect(semitonesToRatio(-12)).toBeCloseTo(0.5);
    expect(semitonesToRatio(7)).toBeCloseTo(1.498, 2);
  });
});
