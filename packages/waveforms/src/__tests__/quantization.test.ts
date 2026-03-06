import { describe, it, expect } from 'vitest';
import { AudioQuantizer, BatchQuantizer } from '../quantization.js';
import type { AudioClip, WarpMarker } from '@daw/project-schema';

describe('AudioQuantizer', () => {
  const ppq = 960;
  const bpm = 120;

  const createTestClip = (markers: WarpMarker[]): AudioClip => ({
    id: 'clip_test',
    assetId: 'asset_test',
    lane: 0,
    startTick: 0,
    endTick: ppq * 4,
    sourceStartSample: 0,
    sourceEndSample: 44100 * 2,
    gainDb: 0,
    transposeSemitones: 0,
    fineTuneCents: 0,
    reverse: false,
    fades: {
      inCurve: 'linear',
      outCurve: 'linear',
      inSamples: 0,
      outSamples: 0
    },
    stretchQuality: 'good',
    warp: {
      mode: 'beats',
      markers,
      tempo: 120
    }
  });

  describe('Basic quantization', () => {
    it('should quantize warp markers to grid', () => {
      const quantizer = new AudioQuantizer(ppq, bpm);
      
      const markers: WarpMarker[] = [
        { id: 'm1', samplePosition: 0, time: 0, beat: 0.05 },
        { id: 'm2', samplePosition: 1000, time: 0.5, beat: 1.02 },
        { id: 'm3', samplePosition: 2000, time: 1.0, beat: 2.01 }
      ];
      
      const clip = createTestClip(markers);
      const result = quantizer.quantize(clip, { 
        gridDivision: 240,
        strength: 100 
      });

      expect(result.markersAdjusted).toBe(3);
      expect(result.averageOffset).toBeGreaterThan(0);
    });

    it('should apply quantization strength', () => {
      const quantizer = new AudioQuantizer(ppq, bpm);
      
      const markers: WarpMarker[] = [
        { id: 'm1', samplePosition: 0, time: 0, beat: 0.5 }
      ];
      
      const clip = createTestClip(markers);
      
      const result100 = quantizer.quantize(clip, { 
        gridDivision: 960,
        strength: 100 
      });
      
      const result50 = quantizer.quantize(clip, { 
        gridDivision: 960, 
        strength: 50 
      });

      expect(result50.maxOffset).toBeLessThan(result100.maxOffset);
    });
  });
});

describe('BatchQuantizer', () => {
  it('should quantize multiple clips', () => {
    const clips = [
      { id: 'c1', warp: { markers: [{ id: 'm1', beat: 0.1 }] } },
      { id: 'c2', warp: { markers: [{ id: 'm2', beat: 0.2 }] } }
    ] as AudioClip[];

    const results = BatchQuantizer.quantizeClips(clips, { strength: 100 });

    expect(results.length).toBe(2);
  });
});
