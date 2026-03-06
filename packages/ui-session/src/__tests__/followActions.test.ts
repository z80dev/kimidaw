import { describe, it, expect, vi } from 'vitest';
import {
  selectFollowAction,
  resolveFollowAction,
  calculateFollowTimeTicks,
  shouldTriggerFollowAction,
  createDefaultFollowAction,
  formatFollowTime,
} from '../utils/followActions';
import type { FollowAction, FollowActionType, Clip, ClipSlot, Scene } from '../types';

describe('selectFollowAction', () => {
  it('should select actionA when random is within chanceA', () => {
    const fa: FollowAction = {
      id: '1',
      actionA: 'playNext',
      chanceA: 70,
      actionB: 'stop',
      chanceB: 30,
      linked: false,
      followTimeBars: 0,
      followTimeBeats: 0,
      followTimeSixteenths: 0,
    };

    const result = selectFollowAction(fa, 0.5); // 50% within 70%

    expect(result.type).toBe('playNext');
    expect(result.fromA).toBe(true);
  });

  it('should select actionB when random exceeds chanceA', () => {
    const fa: FollowAction = {
      id: '1',
      actionA: 'playNext',
      chanceA: 30,
      actionB: 'stop',
      chanceB: 70,
      linked: false,
      followTimeBars: 0,
      followTimeBeats: 0,
      followTimeSixteenths: 0,
    };

    const result = selectFollowAction(fa, 0.5); // 50% > 30%

    expect(result.type).toBe('stop');
    expect(result.fromA).toBe(false);
  });

  it('should return noAction when total chance is 0', () => {
    const fa: FollowAction = {
      id: '1',
      actionA: 'noAction',
      chanceA: 0,
      actionB: 'stop',
      chanceB: 0,
      linked: false,
      followTimeBars: 0,
      followTimeBeats: 0,
      followTimeSixteenths: 0,
    };

    const result = selectFollowAction(fa, 0.5);

    expect(result.type).toBe('noAction');
  });
});

describe('resolveFollowAction', () => {
  const createMockContext = (overrides = {}) => ({
    currentClipId: 'clip-1',
    currentSlotId: 'slot-1',
    currentSceneId: 'scene-1',
    clipsInTrack: [
      { id: 'clip-1', trackId: 'track-1' },
      { id: 'clip-2', trackId: 'track-1' },
      { id: 'clip-3', trackId: 'track-1' },
    ] as Clip[],
    slotsInScene: [
      { id: 'slot-1', clipId: 'clip-1' },
      { id: 'slot-2', clipId: 'clip-2' },
      { id: 'slot-3', clipId: 'clip-3' },
    ] as ClipSlot[],
    allScenes: [{ id: 'scene-1' }, { id: 'scene-2' }] as Scene[],
    currentSceneIndex: 0,
    ...overrides,
  });

  it('should handle noAction', () => {
    const context = createMockContext();
    const result = resolveFollowAction('noAction', context);

    expect(result.shouldStop).toBe(false);
    expect(result.targetClipId).toBeUndefined();
  });

  it('should handle stop', () => {
    const context = createMockContext();
    const result = resolveFollowAction('stop', context);

    expect(result.shouldStop).toBe(true);
  });

  it('should handle playAgain', () => {
    const context = createMockContext();
    const result = resolveFollowAction('playAgain', context);

    expect(result.targetClipId).toBe('clip-1');
    expect(result.targetSlotId).toBe('slot-1');
  });

  it('should handle playNext', () => {
    const context = createMockContext();
    const result = resolveFollowAction('playNext', context);

    expect(result.targetClipId).toBe('clip-2');
    expect(result.targetSlotId).toBe('slot-2');
  });

  it('should handle playPrevious', () => {
    const context = createMockContext({
      currentClipId: 'clip-2',
      currentSlotId: 'slot-2',
    });
    const result = resolveFollowAction('playPrevious', context);

    expect(result.targetClipId).toBe('clip-1');
    expect(result.targetSlotId).toBe('slot-1');
  });

  it('should handle playFirst', () => {
    const context = createMockContext({ currentClipId: 'clip-3' });
    const result = resolveFollowAction('playFirst', context);

    expect(result.targetClipId).toBe('clip-1');
    expect(result.targetSlotId).toBe('slot-1');
  });

  it('should handle playLast', () => {
    const context = createMockContext();
    const result = resolveFollowAction('playLast', context);

    expect(result.targetClipId).toBe('clip-3');
    expect(result.targetSlotId).toBe('slot-3');
  });

  it('should handle playNext at end of track', () => {
    const context = createMockContext({ currentClipId: 'clip-3' });
    const result = resolveFollowAction('playNext', context);

    expect(result.targetClipId).toBeUndefined();
  });
});

describe('calculateFollowTimeTicks', () => {
  const PPQ = 960;

  it('should calculate bars', () => {
    const fa = createDefaultFollowAction();
    fa.followTimeBars = 2;

    expect(calculateFollowTimeTicks(fa, PPQ)).toBe(PPQ * 4 * 2);
  });

  it('should calculate beats', () => {
    const fa = createDefaultFollowAction();
    fa.followTimeBeats = 3;

    expect(calculateFollowTimeTicks(fa, PPQ)).toBe(PPQ * 3);
  });

  it('should calculate sixteenths', () => {
    const fa = createDefaultFollowAction();
    fa.followTimeSixteenths = 4;

    expect(calculateFollowTimeTicks(fa, PPQ)).toBe(PPQ);
  });

  it('should combine all units', () => {
    const fa = createDefaultFollowAction();
    fa.followTimeBars = 1;
    fa.followTimeBeats = 2;
    fa.followTimeSixteenths = 4;

    // 1 bar = 3840, 2 beats = 1920, 4 sixteenths = 960
    expect(calculateFollowTimeTicks(fa, PPQ)).toBe(PPQ * 4 + PPQ * 2 + PPQ);
  });
});

describe('shouldTriggerFollowAction', () => {
  const PPQ = 960;

  it('should trigger at end when follow time is 0', () => {
    const fa = createDefaultFollowAction();
    const clipLength = PPQ * 4; // 1 bar

    expect(shouldTriggerFollowAction(clipLength - 100, clipLength, fa, PPQ)).toBe(true);
    expect(shouldTriggerFollowAction(0, clipLength, fa, PPQ)).toBe(false);
  });

  it('should trigger at follow time', () => {
    const fa = createDefaultFollowAction();
    fa.followTimeBeats = 2; // 2 beats = 1920 ticks

    expect(shouldTriggerFollowAction(1920, PPQ * 4, fa, PPQ)).toBe(true);
    expect(shouldTriggerFollowAction(1000, PPQ * 4, fa, PPQ)).toBe(false);
  });

  it('should not trigger twice', () => {
    const fa = createDefaultFollowAction();
    fa.followTimeBeats = 2;

    // Just past trigger point
    expect(shouldTriggerFollowAction(1920 + 100, PPQ * 4, fa, PPQ)).toBe(false);
  });
});

describe('createDefaultFollowAction', () => {
  it('should create with default values', () => {
    const fa = createDefaultFollowAction();

    expect(fa.actionA).toBe('noAction');
    expect(fa.chanceA).toBe(100);
    expect(fa.actionB).toBe('noAction');
    expect(fa.chanceB).toBe(0);
    expect(fa.linked).toBe(false);
    expect(fa.followTimeBars).toBe(0);
    expect(fa.followTimeBeats).toBe(0);
    expect(fa.followTimeSixteenths).toBe(0);
  });

  it('should have a unique id', () => {
    const fa1 = createDefaultFollowAction();
    const fa2 = createDefaultFollowAction();

    expect(fa1.id).not.toBe(fa2.id);
  });
});

describe('formatFollowTime', () => {
  it('should format bars only', () => {
    const fa = createDefaultFollowAction();
    fa.followTimeBars = 2;

    expect(formatFollowTime(fa)).toBe('2 bars');
  });

  it('should format single bar', () => {
    const fa = createDefaultFollowAction();
    fa.followTimeBars = 1;

    expect(formatFollowTime(fa)).toBe('1 bar');
  });

  it('should format beats', () => {
    const fa = createDefaultFollowAction();
    fa.followTimeBeats = 3;

    expect(formatFollowTime(fa)).toBe('3 beats');
  });

  it('should format sixteenths', () => {
    const fa = createDefaultFollowAction();
    fa.followTimeSixteenths = 8;

    expect(formatFollowTime(fa)).toBe('8 16ths');
  });

  it('should combine multiple units', () => {
    const fa = createDefaultFollowAction();
    fa.followTimeBars = 1;
    fa.followTimeBeats = 2;

    expect(formatFollowTime(fa)).toBe('1 bar 2 beats');
  });

  it('should return End when all zero', () => {
    const fa = createDefaultFollowAction();

    expect(formatFollowTime(fa)).toBe('End');
  });
});
