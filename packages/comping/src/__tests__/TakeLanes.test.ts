import { describe, it, expect, beforeEach } from 'vitest';
import { TakeLaneManager } from '../TakeLanes.js';

describe('TakeLaneManager', () => {
  let manager: TakeLaneManager;
  const trackId = 'track_1';

  beforeEach(() => {
    manager = new TakeLaneManager();
  });

  describe('Lane creation', () => {
    it('should create a take lane', () => {
      const lane = manager.createTakeLane(trackId, 'audio', 'Take 1');

      expect(lane).toBeDefined();
      expect(lane.trackId).toBe(trackId);
      expect(lane.type).toBe('audio');
      expect(lane.name).toBe('Take 1');
      expect(lane.isActive).toBe(true);
    });

    it('should auto-number takes', () => {
      const lane1 = manager.createTakeLane(trackId, 'audio');
      const lane2 = manager.createTakeLane(trackId, 'audio');
      const lane3 = manager.createTakeLane(trackId, 'audio');

      expect(lane1.name).toBe('Take 1');
      expect(lane2.name).toBe('Take 2');
      expect(lane3.name).toBe('Take 3');
    });

    it('should assign different colors to takes', () => {
      const lane1 = manager.createTakeLane(trackId, 'audio');
      const lane2 = manager.createTakeLane(trackId, 'audio');

      expect(lane1.color).not.toBe(lane2.color);
    });

    it('should create multiple lanes for cycle recording', () => {
      const lanes = manager.createTakeLanesForCycle(trackId, 'audio', 4);

      expect(lanes.length).toBe(4);
      expect(lanes[0].name).toBe('Take 1');
      expect(lanes[3].name).toBe('Take 4');
    });
  });

  describe('Lane retrieval', () => {
    it('should get all lanes for a track', () => {
      manager.createTakeLane(trackId, 'audio');
      manager.createTakeLane(trackId, 'audio');
      manager.createTakeLane('other_track', 'audio');

      const lanes = manager.getLanesForTrack(trackId);

      expect(lanes.length).toBe(2);
      expect(lanes.every(l => l.trackId === trackId)).toBe(true);
    });

    it('should return lanes in order', () => {
      manager.createTakeLane(trackId, 'audio');
      manager.createTakeLane(trackId, 'audio');
      manager.createTakeLane(trackId, 'audio');

      const lanes = manager.getLanesForTrack(trackId);

      expect(lanes[0].order).toBe(0);
      expect(lanes[1].order).toBe(1);
      expect(lanes[2].order).toBe(2);
    });

    it('should get a specific lane', () => {
      const lane = manager.createTakeLane(trackId, 'audio');
      const retrieved = manager.getLane(lane.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(lane.id);
    });
  });

  describe('Lane deletion', () => {
    it('should delete a lane', () => {
      const lane = manager.createTakeLane(trackId, 'audio');
      const success = manager.deleteLane(lane.id);

      expect(success).toBe(true);
      expect(manager.getLane(lane.id)).toBeUndefined();
    });

    it('should return false for non-existent lane', () => {
      const success = manager.deleteLane('non_existent');
      expect(success).toBe(false);
    });

    it('should renumber lanes after deletion', () => {
      const lane1 = manager.createTakeLane(trackId, 'audio');
      const lane2 = manager.createTakeLane(trackId, 'audio');
      const lane3 = manager.createTakeLane(trackId, 'audio');

      manager.deleteLane(lane2.id);

      const lanes = manager.getLanesForTrack(trackId);
      expect(lanes[0].order).toBe(0);
      expect(lanes[1].order).toBe(1);
    });
  });

  describe('Lane reordering', () => {
    it('should move lane up', () => {
      const lane1 = manager.createTakeLane(trackId, 'audio');
      const lane2 = manager.createTakeLane(trackId, 'audio');

      expect(lane1.order).toBe(0);
      expect(lane2.order).toBe(1);

      manager.moveLane(lane2.id, 'up');

      expect(lane2.order).toBe(0);
      expect(lane1.order).toBe(1);
    });

    it('should move lane down', () => {
      const lane1 = manager.createTakeLane(trackId, 'audio');
      const lane2 = manager.createTakeLane(trackId, 'audio');

      manager.moveLane(lane1.id, 'down');

      expect(lane1.order).toBe(1);
      expect(lane2.order).toBe(0);
    });

    it('should not move top lane up', () => {
      const lane = manager.createTakeLane(trackId, 'audio');
      const success = manager.moveLane(lane.id, 'up');
      expect(success).toBe(false);
    });
  });

  describe('Active lane', () => {
    it('should set active lane', () => {
      const lane1 = manager.createTakeLane(trackId, 'audio');
      const lane2 = manager.createTakeLane(trackId, 'audio');

      expect(lane1.isActive).toBe(true);
      expect(lane2.isActive).toBe(false);

      manager.setActiveLane(trackId, lane2.id);

      expect(lane1.isActive).toBe(false);
      expect(lane2.isActive).toBe(true);
    });

    it('should make first lane active by default', () => {
      const lane = manager.createTakeLane(trackId, 'audio');
      expect(lane.isActive).toBe(true);
    });
  });

  describe('Lane muting', () => {
    it('should mute/unmute lane', () => {
      const lane = manager.createTakeLane(trackId, 'audio');
      
      expect(lane.isMuted).toBe(false);
      
      manager.setLaneMuted(lane.id, true);
      expect(lane.isMuted).toBe(true);
      
      manager.setLaneMuted(lane.id, false);
      expect(lane.isMuted).toBe(false);
    });
  });

  describe('Lane duplication', () => {
    it('should duplicate a lane', () => {
      const lane = manager.createTakeLane(trackId, 'audio');
      lane.clips = [{ id: 'clip1' }] as any;

      const duplicate = manager.duplicateLane(lane.id);

      expect(duplicate).toBeDefined();
      expect(duplicate?.name).toBe('Take 1 Copy');
      expect(duplicate?.clips.length).toBe(1);
      expect(duplicate?.clips[0].id).not.toBe('clip1'); // Should have new ID
    });
  });

  describe('Cycle recording modes', () => {
    it('should handle create-new-lane mode', () => {
      manager.setPreferences({ cycleRecordMode: 'create-new-lane' });
      
      const lane1 = manager.handleCycleRecording(trackId, 'audio', 1);
      const lane2 = manager.handleCycleRecording(trackId, 'audio', 2);

      expect(lane1.name).toBe('Take 1');
      expect(lane2.name).toBe('Take 2');
    });

    it('should handle overdub-current mode', () => {
      manager.setPreferences({ cycleRecordMode: 'overdub-current' });
      
      const lane1 = manager.handleCycleRecording(trackId, 'audio', 1);
      const lane2 = manager.handleCycleRecording(trackId, 'audio', 2);

      expect(lane1.id).toBe(lane2.id); // Same lane
    });
  });

  describe('Preferences', () => {
    it('should get and set preferences', () => {
      expect(manager.getPreferences().autoCreateTakeLanes).toBe(true);

      manager.setPreferences({ autoCreateTakeLanes: false });
      
      expect(manager.getPreferences().autoCreateTakeLanes).toBe(false);
    });

    it('should get and set options', () => {
      expect(manager.getOptions().autoCrossfade).toBe(true);

      manager.setOptions({ autoCrossfade: false });
      
      expect(manager.getOptions().autoCrossfade).toBe(false);
    });
  });

  describe('Track clearing', () => {
    it('should clear all lanes for a track', () => {
      manager.createTakeLane(trackId, 'audio');
      manager.createTakeLane(trackId, 'audio');

      expect(manager.getLanesForTrack(trackId).length).toBe(2);

      manager.clearTrackLanes(trackId);

      expect(manager.getLanesForTrack(trackId).length).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should report total lane count', () => {
      expect(manager.getTotalLaneCount()).toBe(0);
      
      manager.createTakeLane(trackId, 'audio');
      manager.createTakeLane('track2', 'audio');
      
      expect(manager.getTotalLaneCount()).toBe(2);
    });
  });
});
