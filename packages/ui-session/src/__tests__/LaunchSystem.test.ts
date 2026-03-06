import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LaunchSystem, createDefaultLaunchSettings, createLegatoLaunchSettings } from '../LaunchSystem';
import type { Clip, ClipSlot, TransportState } from '../types';

describe('LaunchSystem', () => {
  let launchSystem: LaunchSystem;
  let mockCallbacks: {
    onClipLaunch: ReturnType<typeof vi.fn>;
    onClipStop: ReturnType<typeof vi.fn>;
    onSceneLaunch: ReturnType<typeof vi.fn>;
    onSceneStop: ReturnType<typeof vi.fn>;
  };

  const createMockClip = (overrides: Partial<Clip> = {}): Clip => ({
    id: 'clip-1',
    name: 'Test Clip',
    color: '#FF5252',
    type: 'midi',
    trackId: 'track-1',
    startTick: 0,
    endTick: 960 * 4,
    launchSettings: createDefaultLaunchSettings(),
    followActions: [],
    ...overrides,
  });

  const createMockSlot = (overrides: Partial<ClipSlot> = {}): ClipSlot => ({
    id: 'slot-1',
    trackId: 'track-1',
    sceneId: 'scene-1',
    state: 'stopped',
    ...overrides,
  });

  const createMockTransport = (overrides: Partial<TransportState> = {}): TransportState => ({
    isPlaying: true,
    currentTick: 0,
    tempo: 120,
    globalQuantization: '1 bar',
    ...overrides,
  });

  beforeEach(() => {
    mockCallbacks = {
      onClipLaunch: vi.fn(),
      onClipStop: vi.fn(),
      onSceneLaunch: vi.fn(),
      onSceneStop: vi.fn(),
    };
    
    launchSystem = new LaunchSystem(mockCallbacks);
  });

  describe('queueClipLaunch', () => {
    it('should queue a clip for launch', () => {
      const clip = createMockClip();
      const slot = createMockSlot({ clipId: clip.id });
      const transport = createMockTransport();

      const item = launchSystem.queueClipLaunch(clip, slot, transport);

      expect(item).toBeDefined();
      expect(item.targetId).toBe(clip.id);
      expect(item.slotId).toBe(slot.id);
      expect(launchSystem.isClipQueued(slot.id)).toBe(true);
    });

    it('should use quantization when calculating launch time', () => {
      const clip = createMockClip({
        launchSettings: {
          ...createDefaultLaunchSettings(),
          quantization: '1 bar',
        },
      });
      const slot = createMockSlot({ clipId: clip.id });
      const transport = createMockTransport({ currentTick: 480 }); // Halfway through bar

      const item = launchSystem.queueClipLaunch(clip, slot, transport);

      // Should quantize to next bar (960 * 4 = 3840 ticks per bar at 960 PPQ)
      expect(item.scheduledTick).toBe(3840);
    });

    it('should launch immediately with none quantization', () => {
      const clip = createMockClip({
        launchSettings: {
          ...createDefaultLaunchSettings(),
          quantization: 'none',
        },
      });
      const slot = createMockSlot({ clipId: clip.id });
      const transport = createMockTransport({ currentTick: 1234 });

      const item = launchSystem.queueClipLaunch(clip, slot, transport);

      expect(item.scheduledTick).toBe(1234);
    });
  });

  describe('processQueue', () => {
    it('should launch clips when their scheduled time is reached', () => {
      const clip = createMockClip();
      const slot = createMockSlot({ clipId: clip.id });
      const transport = createMockTransport({ currentTick: 0 });

      launchSystem.queueClipLaunch(clip, slot, transport);
      
      const launched = launchSystem.processQueue(
        createMockTransport({ currentTick: 100 })
      );

      expect(launched).toHaveLength(1);
      expect(mockCallbacks.onClipLaunch).toHaveBeenCalledWith(clip.id, slot.id, undefined);
    });

    it('should not launch clips before their scheduled time', () => {
      const clip = createMockClip({
        launchSettings: {
          ...createDefaultLaunchSettings(),
          quantization: '1 bar',
        },
      });
      const slot = createMockSlot({ clipId: clip.id });
      const transport = createMockTransport({ currentTick: 0 });

      launchSystem.queueClipLaunch(clip, slot, transport);
      
      const launched = launchSystem.processQueue(
        createMockTransport({ currentTick: 100 })
      );

      expect(launched).toHaveLength(0);
      expect(mockCallbacks.onClipLaunch).not.toHaveBeenCalled();
    });
  });

  describe('launch modes', () => {
    it('should handle trigger mode', () => {
      const clip = createMockClip({
        launchSettings: { ...createDefaultLaunchSettings(), launchMode: 'trigger' },
      });
      const slot = createMockSlot({ clipId: clip.id });
      const transport = createMockTransport();

      launchSystem.queueClipLaunch(clip, slot, transport);
      launchSystem.processQueue(transport);

      expect(launchSystem.isClipPlaying(clip.id, slot.id)).toBe(true);
    });

    it('should handle toggle mode', () => {
      const clip = createMockClip({
        launchSettings: { ...createDefaultLaunchSettings(), launchMode: 'toggle' },
      });
      const slot = createMockSlot({ clipId: clip.id });
      const transport = createMockTransport();

      // First launch - start playing
      launchSystem.queueClipLaunch(clip, slot, transport);
      launchSystem.processQueue(transport);
      expect(launchSystem.isClipPlaying(clip.id, slot.id)).toBe(true);

      // Second launch - stop playing
      launchSystem.queueClipLaunch(clip, slot, transport);
      launchSystem.processQueue(transport);
      expect(launchSystem.isClipPlaying(clip.id, slot.id)).toBe(false);
    });
  });

  describe('stopClip', () => {
    it('should stop a playing clip', () => {
      const clip = createMockClip();
      const slot = createMockSlot({ clipId: clip.id });
      const transport = createMockTransport();

      // Start playing
      launchSystem.queueClipLaunch(clip, slot, transport);
      launchSystem.processQueue(transport);
      expect(launchSystem.isClipPlaying(clip.id, slot.id)).toBe(true);

      // Stop
      launchSystem.stopClip(clip.id, slot.id, transport);
      expect(launchSystem.isClipPlaying(clip.id, slot.id)).toBe(false);
      expect(mockCallbacks.onClipStop).toHaveBeenCalledWith(clip.id, slot.id);
    });
  });

  describe('stopAllClips', () => {
    it('should stop all playing clips', () => {
      const transport = createMockTransport();
      
      // Launch multiple clips
      for (let i = 0; i < 3; i++) {
        const clip = createMockClip({ id: `clip-${i}` });
        const slot = createMockSlot({ id: `slot-${i}`, clipId: clip.id });
        launchSystem.queueClipLaunch(clip, slot, transport);
        launchSystem.processQueue(transport);
      }

      expect(mockCallbacks.onClipLaunch).toHaveBeenCalledTimes(3);

      // Stop all
      launchSystem.stopAllClips(transport);
      expect(mockCallbacks.onClipStop).toHaveBeenCalledTimes(3);
    });
  });
});

describe('createDefaultLaunchSettings', () => {
  it('should create settings with default values', () => {
    const settings = createDefaultLaunchSettings();
    
    expect(settings.launchMode).toBe('trigger');
    expect(settings.quantization).toBe('global');
    expect(settings.velocity).toBe(false);
    expect(settings.legato).toBe(false);
  });
});

describe('createLegatoLaunchSettings', () => {
  it('should create legato settings', () => {
    const settings = createLegatoLaunchSettings();
    
    expect(settings.launchMode).toBe('trigger');
    expect(settings.quantization).toBe('none');
    expect(settings.legato).toBe(true);
  });
});
