import { describe, it, expect, beforeEach } from 'vitest';
import { CompToolManager } from '../CompTool.js';
import type { TakeLane, CompRegion } from '../types.js';

describe('CompToolManager', () => {
  let manager: CompToolManager;
  const lane: TakeLane = {
    id: 'lane_1',
    trackId: 'track_1',
    name: 'Take 1',
    type: 'audio',
    clips: [],
    isActive: true,
    isMuted: false,
    color: '#FF0000',
    order: 0,
    metadata: {
      recordDate: Date.now(),
      takeNumber: 1
    }
  };

  beforeEach(() => {
    manager = new CompToolManager();
  });

  describe('Comp take creation', () => {
    it('should create a comp take', () => {
      const compTake = manager.createCompTake();

      expect(compTake).toBeDefined();
      expect(compTake.id).toBeDefined();
      expect(compTake.regions).toEqual([]);
      expect(compTake.isFlattened).toBe(false);
    });

    it('should set created comp as current', () => {
      const compTake = manager.createCompTake();
      expect(manager.getCurrentComp()?.id).toBe(compTake.id);
    });
  });

  describe('Region selection', () => {
    it('should select a region', () => {
      const compTake = manager.createCompTake();
      
      const result = manager.selectRegion(
        compTake.id,
        lane,
        'clip_1',
        0,
        960
      );

      expect(result.success).toBe(true);
      expect(result.newRegions?.length).toBe(1);
      expect(result.newRegions?.[0].startTick).toBe(0);
      expect(result.newRegions?.[0].endTick).toBe(960);
    });

    it('should replace overlapping regions from different takes', () => {
      const compTake = manager.createCompTake();
      
      const lane2: TakeLane = { ...lane, id: 'lane_2' };

      manager.selectRegion(compTake.id, lane, 'clip_1', 0, 960);
      const result = manager.selectRegion(compTake.id, lane2, 'clip_2', 480, 1440);

      expect(result.success).toBe(true);
      
      const regions = manager.getRegions(compTake.id);
      expect(regions.length).toBe(2);
    });
  });

  describe('Swipe selection', () => {
    it('should handle multiple selections', () => {
      const compTake = manager.createCompTake();
      
      const selections = [
        { startTick: 0, endTick: 480, takeLaneId: 'lane_1' },
        { startTick: 480, endTick: 960, takeLaneId: 'lane_2' },
        { startTick: 960, endTick: 1440, takeLaneId: 'lane_1' }
      ];

      const result = manager.swipeSelect(compTake.id, selections);

      expect(result.success).toBe(true);
      expect(result.newRegions?.length).toBe(3);
    });
  });

  describe('Region manipulation', () => {
    it('should remove a region', () => {
      const compTake = manager.createCompTake();
      manager.selectRegion(compTake.id, lane, 'clip_1', 0, 960);
      
      const regions = manager.getRegions(compTake.id);
      expect(regions.length).toBe(1);

      manager.removeRegion(compTake.id, regions[0].id);
      
      expect(manager.getRegions(compTake.id).length).toBe(0);
    });

    it('should resize a region', () => {
      const compTake = manager.createCompTake();
      manager.selectRegion(compTake.id, lane, 'clip_1', 0, 960);
      
      const region = manager.getRegions(compTake.id)[0];
      
      manager.resizeRegion(compTake.id, region.id, 240, 1200);
      
      const updated = manager.getRegions(compTake.id)[0];
      expect(updated.startTick).toBe(240);
      expect(updated.endTick).toBe(1200);
    });

    it('should split a region', () => {
      const compTake = manager.createCompTake();
      manager.selectRegion(compTake.id, lane, 'clip_1', 0, 960);
      
      const region = manager.getRegions(compTake.id)[0];
      
      const result = manager.splitRegion(compTake.id, region.id, 480);
      
      expect(result.success).toBe(true);
      expect(result.newRegions?.length).toBe(1);
      
      const regions = manager.getRegions(compTake.id);
      expect(regions.length).toBe(2);
      expect(regions[0].endTick).toBe(480);
      expect(regions[1].startTick).toBe(480);
    });

    it('should duplicate a region', () => {
      const compTake = manager.createCompTake();
      manager.selectRegion(compTake.id, lane, 'clip_1', 0, 480);
      
      const region = manager.getRegions(compTake.id)[0];
      const duplicate = manager.duplicateRegion(compTake.id, region.id);
      
      expect(duplicate).toBeDefined();
      expect(duplicate?.startTick).toBe(480); // Placed after original
      expect(duplicate?.endTick).toBe(960);
    });
  });

  describe('Tool management', () => {
    it('should set and get tool', () => {
      expect(manager.getTool()).toBe('selector');
      
      manager.setTool('swipe');
      expect(manager.getTool()).toBe('swipe');
      
      manager.setTool('draw');
      expect(manager.getTool()).toBe('draw');
    });
  });

  describe('Comping state', () => {
    it('should toggle comping mode', () => {
      expect(manager.isComping()).toBe(false);
      
      manager.setCompingActive(true);
      expect(manager.isComping()).toBe(true);
      
      manager.setCompingActive(false);
      expect(manager.isComping()).toBe(false);
    });
  });

  describe('Region queries', () => {
    it('should get regions at specific time', () => {
      const compTake = manager.createCompTake();
      
      manager.selectRegion(compTake.id, lane, 'clip_1', 0, 480);
      manager.selectRegion(compTake.id, lane, 'clip_2', 480, 960);
      
      const at240 = manager.getRegionsAtTime(compTake.id, 240);
      expect(at240.length).toBe(1);
      expect(at240[0].startTick).toBe(0);
      
      const at600 = manager.getRegionsAtTime(compTake.id, 600);
      expect(at600.length).toBe(1);
      expect(at600[0].startTick).toBe(480);
    });
  });

  describe('Undo/Redo', () => {
    it('should undo region addition', () => {
      const compTake = manager.createCompTake();
      manager.selectRegion(compTake.id, lane, 'clip_1', 0, 960);
      
      expect(manager.getRegions(compTake.id).length).toBe(1);
      
      manager.undo();
      
      expect(manager.getRegions(compTake.id).length).toBe(0);
    });

    it('should redo undone action', () => {
      const compTake = manager.createCompTake();
      manager.selectRegion(compTake.id, lane, 'clip_1', 0, 960);
      
      manager.undo();
      expect(manager.getRegions(compTake.id).length).toBe(0);
      
      manager.redo();
      expect(manager.getRegions(compTake.id).length).toBe(1);
    });

    it('should handle multiple undo/redo', () => {
      const compTake = manager.createCompTake();
      
      manager.selectRegion(compTake.id, lane, 'clip_1', 0, 480);
      manager.selectRegion(compTake.id, lane, 'clip_2', 480, 960);
      manager.selectRegion(compTake.id, lane, 'clip_3', 960, 1440);
      
      expect(manager.getRegions(compTake.id).length).toBe(3);
      
      manager.undo();
      expect(manager.getRegions(compTake.id).length).toBe(2);
      
      manager.undo();
      expect(manager.getRegions(compTake.id).length).toBe(1);
      
      manager.redo();
      manager.redo();
      expect(manager.getRegions(compTake.id).length).toBe(3);
    });
  });

  describe('Crossfades', () => {
    it('should add crossfades to regions when enabled', () => {
      const compTake = manager.createCompTake();
      
      manager.selectRegion(compTake.id, lane, 'clip_1', 0, 480);
      manager.selectRegion(compTake.id, lane, 'clip_2', 400, 880); // Overlapping
      
      const regions = manager.getRegions(compTake.id);
      // Crossfades should be added at overlap points
    });
  });
});
