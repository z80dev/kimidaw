import { describe, it, expect } from 'vitest';
import {
  createAutomationLane,
  addPoint,
  removePoint,
  getValueAtTick,
  interpolateValue,
  automationTargetKey,
  parseAutomationTargetKey,
  shiftInTime,
  scaleValues,
  type AutomationLane,
  type AutomationPoint,
} from '../index.js';

describe('automation', () => {
  describe('createAutomationLane', () => {
    it('creates lane with correct defaults', () => {
      const target = { scope: 'track' as const, ownerId: 'track-1', paramId: 'volume' };
      const lane = createAutomationLane('lane-1', target);
      
      expect(lane.id).toBe('lane-1');
      expect(lane.target).toEqual(target);
      expect(lane.mode).toBe('read');
      expect(lane.points).toEqual([]);
      expect(lane.interpolation).toBe('linear');
      expect(lane.visible).toBe(true);
    });

    it('accepts custom options', () => {
      const target = { scope: 'plugin' as const, ownerId: 'plugin-1', paramId: 'cutoff' };
      const lane = createAutomationLane('lane-2', target, {
        mode: 'touch',
        interpolation: 'bezier',
        color: '#FF0000',
      });
      
      expect(lane.mode).toBe('touch');
      expect(lane.interpolation).toBe('bezier');
      expect(lane.color).toBe('#FF0000');
    });
  });

  describe('addPoint', () => {
    const lane = createAutomationLane('lane-1', {
      scope: 'track',
      ownerId: 'track-1',
      paramId: 'volume',
    });

    it('adds point in correct position', () => {
      const updated = addPoint(lane, 480, 0.5);
      
      expect(updated.points).toHaveLength(1);
      expect(updated.points[0]).toEqual({ tick: 480, value: 0.5 });
    });

    it('maintains sorted order', () => {
      let updated = addPoint(lane, 960, 0.8);
      updated = addPoint(updated, 480, 0.5);
      updated = addPoint(updated, 1440, 0.3);
      
      expect(updated.points.map(p => p.tick)).toEqual([480, 960, 1440]);
    });

    it('replaces point at same tick', () => {
      let updated = addPoint(lane, 480, 0.5);
      updated = addPoint(updated, 480, 0.7);
      
      expect(updated.points).toHaveLength(1);
      expect(updated.points[0].value).toBe(0.7);
    });

    it('preserves curve options', () => {
      const updated = addPoint(lane, 480, 0.5, {
        curveIn: 0.3,
        curveOut: -0.2,
        stepHold: true,
      });
      
      expect(updated.points[0].curveIn).toBe(0.3);
      expect(updated.points[0].curveOut).toBe(-0.2);
      expect(updated.points[0].stepHold).toBe(true);
    });
  });

  describe('removePoint', () => {
    it('removes point at index', () => {
      let lane = createAutomationLane('lane-1', {
        scope: 'track',
        ownerId: 'track-1',
        paramId: 'volume',
      });
      lane = addPoint(lane, 480, 0.5);
      lane = addPoint(lane, 960, 0.8);
      lane = addPoint(lane, 1440, 0.3);
      
      const updated = removePoint(lane, 1);
      
      expect(updated.points).toHaveLength(2);
      expect(updated.points.map(p => p.tick)).toEqual([480, 1440]);
    });
  });

  describe('getValueAtTick', () => {
    const lane: AutomationLane = {
      ...createAutomationLane('lane-1', {
        scope: 'track',
        ownerId: 'track-1',
        paramId: 'volume',
      }),
      points: [
        { tick: 0, value: 0 },
        { tick: 960, value: 1 },
      ],
      interpolation: 'linear',
    };

    it('returns value at exact points', () => {
      expect(getValueAtTick(lane, 0)).toBe(0);
      expect(getValueAtTick(lane, 960)).toBe(1);
    });

    it('interpolates between points', () => {
      expect(getValueAtTick(lane, 480)).toBe(0.5); // Halfway
    });

    it('returns first point value before first point', () => {
      expect(getValueAtTick(lane, -100)).toBe(0);
    });

    it('returns last point value after last point', () => {
      expect(getValueAtTick(lane, 2000)).toBe(1);
    });

    it('returns undefined for empty lane', () => {
      const emptyLane = createAutomationLane('lane-2', {
        scope: 'track',
        ownerId: 'track-1',
        paramId: 'volume',
      });
      expect(getValueAtTick(emptyLane, 480)).toBeUndefined();
    });

    it('handles step interpolation', () => {
      const stepLane: AutomationLane = {
        ...lane,
        interpolation: 'step',
      };
      
      expect(getValueAtTick(stepLane, 480)).toBe(0); // Value of first point
      expect(getValueAtTick(stepLane, 959)).toBe(0);
      expect(getValueAtTick(stepLane, 960)).toBe(1);
    });
  });

  describe('interpolateValue', () => {
    it('interpolates linearly', () => {
      expect(interpolateValue(0, 0, 1, 'linear')).toBe(0);
      expect(interpolateValue(0.5, 0, 1, 'linear')).toBe(0.5);
      expect(interpolateValue(1, 0, 1, 'linear')).toBe(1);
    });

    it('returns step value', () => {
      expect(interpolateValue(0.5, 0, 1, 'step')).toBe(0);
      expect(interpolateValue(0.999, 0, 1, 'step')).toBe(0);
    });

    it('interpolates with bezier curves', () => {
      // Bezier should not be linear
      const linear = interpolateValue(0.5, 0, 1, 'linear');
      const bezier = interpolateValue(0.5, 0, 1, 'bezier', 0.5, 0.5);
      
      // With positive curve values, bezier should be above linear
      expect(bezier).not.toBe(linear);
    });
  });

  describe('shiftInTime', () => {
    it('shifts all points by offset', () => {
      let lane = createAutomationLane('lane-1', {
        scope: 'track',
        ownerId: 'track-1',
        paramId: 'volume',
      });
      lane = addPoint(lane, 480, 0.5);
      lane = addPoint(lane, 960, 0.8);
      
      const shifted = shiftInTime(lane, 240);
      
      expect(shifted.points.map(p => p.tick)).toEqual([720, 1200]);
    });

    it('handles negative shifts', () => {
      let lane = createAutomationLane('lane-1', {
        scope: 'track',
        ownerId: 'track-1',
        paramId: 'volume',
      });
      lane = addPoint(lane, 480, 0.5);
      
      const shifted = shiftInTime(lane, -240);
      
      expect(shifted.points[0].tick).toBe(240);
    });
  });

  describe('scaleValues', () => {
    it('scales all point values', () => {
      let lane = createAutomationLane('lane-1', {
        scope: 'track',
        ownerId: 'track-1',
        paramId: 'volume',
      });
      lane = addPoint(lane, 0, 0.5);
      lane = addPoint(lane, 960, 1.0);
      
      const scaled = scaleValues(lane, 2);
      
      expect(scaled.points[0].value).toBe(1.0);
      expect(scaled.points[1].value).toBe(2.0);
    });
  });

  describe('automationTargetKey', () => {
    it('creates correct key format', () => {
      const target = { scope: 'track' as const, ownerId: 'track-1', paramId: 'volume' };
      expect(automationTargetKey(target)).toBe('track:track-1:volume');
    });

    it('handles plugin targets', () => {
      const target = { scope: 'plugin' as const, ownerId: 'plugin-1', paramId: 'cutoff' };
      expect(automationTargetKey(target)).toBe('plugin:plugin-1:cutoff');
    });
  });

  describe('parseAutomationTargetKey', () => {
    it('parses valid keys', () => {
      const target = parseAutomationTargetKey('track:track-1:volume');
      expect(target).toEqual({
        scope: 'track',
        ownerId: 'track-1',
        paramId: 'volume',
      });
    });

    it('parses keys with colons in paramId', () => {
      const target = parseAutomationTargetKey('plugin:p1:param:with:colons');
      expect(target).toEqual({
        scope: 'plugin',
        ownerId: 'p1',
        paramId: 'param:with:colons',
      });
    }, 10000);

    it('throws on invalid keys', () => {
      expect(() => parseAutomationTargetKey('invalid')).toThrow();
      expect(() => parseAutomationTargetKey('invalid:key')).toThrow();
    });

    it('throws on invalid scope', () => {
      expect(() => parseAutomationTargetKey('invalid:id:param')).toThrow();
    });
  });
});
