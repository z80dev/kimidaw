import { describe, it, expect, beforeEach } from 'vitest';
import { MusicScriptContext, createContext, AutomationBuilder, SceneBuilder, SectionBuilder } from '../context';

describe('MusicScriptContext', () => {
  let ctx: MusicScriptContext;

  beforeEach(() => {
    ctx = new MusicScriptContext({
      projectId: 'test-project',
      seed: 'test-seed',
      ppq: 960,
      sampleRate: 48000,
    });
  });

  describe('properties', () => {
    it('should expose projectId', () => {
      expect(ctx.projectId).toBe('test-project');
    });

    it('should expose seed', () => {
      expect(ctx.seed).toBe('test-seed');
    });

    it('should expose ppq', () => {
      expect(ctx.ppq).toBe(960);
    });

    it('should expose sampleRate', () => {
      expect(ctx.sampleRate).toBe(48000);
    });
  });

  describe('tempo', () => {
    it('should get default tempo map', () => {
      const map = ctx.tempoMap();
      expect(map).toHaveLength(1);
      expect(map[0].bpm).toBe(120);
    });

    it('should get custom tempo map', () => {
      const ctx2 = new MusicScriptContext({
        projectId: 'test',
        seed: 'seed',
        tempoMap: [
          { tick: 0, bpm: 100, curve: 'jump' },
          { tick: 3840, bpm: 120, curve: 'jump' },
        ],
      });

      expect(ctx2.tempoMap()).toHaveLength(2);
    });

    it('should get tempo at position', () => {
      const ctx2 = new MusicScriptContext({
        projectId: 'test',
        seed: 'seed',
        tempoMap: [
          { tick: 0, bpm: 100, curve: 'jump' },
          { tick: 3840, bpm: 120, curve: 'jump' },
        ],
      });

      expect(ctx2.tempoAt(0)).toBe(100);
      expect(ctx2.tempoAt(3840)).toBe(120);
      expect(ctx2.tempoAt(1920)).toBe(100); // Still at first tempo
    });
  });

  describe('scale and chord', () => {
    it('should create scale', () => {
      const scale = ctx.scale('C', 'major');
      expect(scale.root).toBe('C');
      expect(scale.mode).toBe('major');
    });

    it('should get chord notes', () => {
      const cMajor = ctx.chord('C');
      expect(cMajor).toContain(60);
      expect(cMajor).toContain(64);
      expect(cMajor).toContain(67);
    });
  });

  describe('builders', () => {
    it('should create pattern builder', () => {
      const pattern = ctx.pattern();
      expect(pattern).toBeDefined();
    });

    it('should create clip builder', () => {
      const clip = ctx.clip('test-clip');
      expect(clip).toBeDefined();
    });

    it('should create automation builder', () => {
      const automation = ctx.automation({ scope: 'track', ownerId: 'track-1', paramId: 'volume' });
      expect(automation).toBeDefined();
    });

    it('should create scene builder', () => {
      const scene = ctx.scene('intro');
      expect(scene).toBeDefined();
    });

    it('should create section builder', () => {
      const section = ctx.section('verse', 8);
      expect(section).toBeDefined();
    });
  });

  describe('utilities', () => {
    it('should create PRNG', () => {
      const prng = ctx.rand();
      expect(prng).toBeDefined();
      expect(typeof prng.next()).toBe('number');
    });

    it('should create deterministic PRNG', () => {
      const prng1 = ctx.rand('test');
      const prng2 = ctx.rand('test');
      expect(prng1.next()).toBe(prng2.next());
    });

    it('should generate euclidean rhythm', () => {
      const pattern = ctx.euclidean(8, 3);
      expect(pattern).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
    });

    it('should humanize notes', () => {
      const notes = [
        { note: 60, velocity: 100, startTick: 0, duration: 480 },
        { note: 64, velocity: 100, startTick: 480, duration: 480 },
      ];

      const humanized = ctx.humanize(notes, { timing: 10, velocity: 5 });
      
      expect(humanized).toHaveLength(2);
      // Should have some variation (not guaranteed but very likely)
    });

    it('should create velocity curve', () => {
      const curve = ctx.velCurve('linear', 0.5);
      expect(typeof curve(100, 0.5)).toBe('number');
    });
  });

  describe('references', () => {
    it('should create instrument reference', () => {
      const inst = ctx.instrument('synth-1');
      expect(inst.id).toBe('synth-1');
      expect(inst.type).toBe('builtin');
    });

    it('should create sample reference', () => {
      const sample = ctx.sample('/samples/kick.wav');
      expect(sample.path).toBe('/samples/kick.wav');
    });
  });

  describe('conversion helpers', () => {
    it('should convert bars to ticks', () => {
      expect(ctx.barsToTicks(1)).toBe(3840); // 4 * 960
      expect(ctx.barsToTicks(2)).toBe(7680);
    });

    it('should convert beats to ticks', () => {
      expect(ctx.beatsToTicks(1)).toBe(960);
      expect(ctx.beatsToTicks(4)).toBe(3840);
    });

    it('should convert ticks to seconds', () => {
      // 1 bar at 120bpm = 2 seconds
      expect(ctx.ticksToSeconds(3840, 120)).toBe(2);
    });

    it('should convert seconds to ticks', () => {
      // 2 seconds at 120bpm = 1 bar = 3840 ticks
      expect(ctx.secondsToTicks(2, 120)).toBe(3840);
    });
  });
});

describe('createContext', () => {
  it('should create context with defaults', () => {
    const ctx = createContext({
      projectId: 'test',
      seed: 'seed',
    });

    expect(ctx.ppq).toBe(960);
    expect(ctx.sampleRate).toBe(48000);
  });

  it('should create context with custom values', () => {
    const ctx = createContext({
      projectId: 'test',
      seed: 'seed',
      ppq: 480,
      sampleRate: 44100,
    });

    expect(ctx.ppq).toBe(480);
    expect(ctx.sampleRate).toBe(44100);
  });
});

describe('AutomationBuilder', () => {
  it('should add points', () => {
    const builder = new AutomationBuilder({ scope: 'track', ownerId: 't1', paramId: 'vol' });
    const result = builder.point(0, 0).point(960, 100).build();

    expect(result.points).toHaveLength(2);
    expect(result.points[0].tick).toBe(0);
    expect(result.points[1].tick).toBe(960);
  });

  it('should create ramps', () => {
    const builder = new AutomationBuilder({ scope: 'track', ownerId: 't1', paramId: 'vol' });
    const result = builder.ramp(0, 0, 3840, 100).build();

    expect(result.points).toHaveLength(2);
    expect(result.points[0].curve).toBe('linear');
  });

  it('should create steps', () => {
    const builder = new AutomationBuilder({ scope: 'track', ownerId: 't1', paramId: 'vol' });
    const result = builder.step(0, 50).build();

    expect(result.points[0].curve).toBe('step');
  });

  it('should generate LFO', () => {
    const builder = new AutomationBuilder({ scope: 'track', ownerId: 't1', paramId: 'vol' });
    const result = builder.lfo(0, 3840, 0, 100, 4, 'sine', 4).build();

    expect(result.points.length).toBeGreaterThan(4);
  });
});

describe('SceneBuilder', () => {
  it('should build scene', () => {
    const builder = new SceneBuilder('intro');
    const scene = builder
      .addClip('track-1', 'clip-1')
      .addClip('track-2', 'clip-2', 480)
      .setTempo(120)
      .setTimeSignature(4, 4)
      .build(0);

    expect(scene.name).toBe('intro');
    expect(scene.row).toBe(0);
    expect(scene.clips).toHaveLength(2);
    expect(scene.tempo).toBe(120);
    expect(scene.timeSignature).toEqual([4, 4]);
  });
});

describe('SectionBuilder', () => {
  it('should build section', () => {
    const ctx = createContext({ projectId: 'test', seed: 'seed' });
    const builder = ctx.section('verse', 8);
    const section = builder.at(0).build();

    expect(section.name).toBe('verse');
    expect(section.startTick).toBe(0);
    expect(section.durationTicks).toBe(8 * 4 * 960); // 8 bars
  });
});
