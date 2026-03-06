import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SceneManager, getDefaultSceneColor, generateSceneName } from '../SceneManager';
import type { Scene } from '../types';

describe('SceneManager', () => {
  let sceneManager: SceneManager;

  beforeEach(() => {
    sceneManager = new SceneManager();
  });

  describe('createScene', () => {
    it('should create a new scene with default name', () => {
      const scene = sceneManager.createScene();

      expect(scene).toBeDefined();
      expect(scene.name).toContain('Scene');
      expect(scene.index).toBe(0);
    });

    it('should create a scene with custom name', () => {
      const scene = sceneManager.createScene({ name: 'Intro' });

      expect(scene.name).toBe('Intro');
    });

    it('should assign incrementing indices', () => {
      const scene1 = sceneManager.createScene();
      const scene2 = sceneManager.createScene();
      const scene3 = sceneManager.createScene();

      expect(scene1.index).toBe(0);
      expect(scene2.index).toBe(1);
      expect(scene3.index).toBe(2);
    });

    it('should accept tempo and time signature', () => {
      const scene = sceneManager.createScene({
        tempo: 128,
        timeSignature: { numerator: 3, denominator: 4 },
      });

      expect(scene.tempo).toBe(128);
      expect(scene.timeSignature).toEqual({ numerator: 3, denominator: 4 });
    });
  });

  describe('deleteScene', () => {
    it('should delete a scene', () => {
      const scene = sceneManager.createScene();
      expect(sceneManager.getSceneCount()).toBe(1);

      const result = sceneManager.deleteScene(scene.id);

      expect(result).toBe(true);
      expect(sceneManager.getSceneCount()).toBe(0);
    });

    it('should return false for non-existent scene', () => {
      const result = sceneManager.deleteScene('non-existent');
      expect(result).toBe(false);
    });

    it('should renumber remaining scenes', () => {
      const scene1 = sceneManager.createScene();
      const scene2 = sceneManager.createScene();
      const scene3 = sceneManager.createScene();

      sceneManager.deleteScene(scene2.id);

      expect(sceneManager.getSceneAtIndex(0)?.id).toBe(scene1.id);
      expect(sceneManager.getSceneAtIndex(1)?.id).toBe(scene3.id);
      expect(sceneManager.getSceneAtIndex(1)?.index).toBe(1);
    });
  });

  describe('duplicateScene', () => {
    it('should duplicate a scene with Copy suffix', () => {
      const original = sceneManager.createScene({ name: 'Chorus', tempo: 140 });
      const duplicate = sceneManager.duplicateScene(original.id);

      expect(duplicate).toBeDefined();
      expect(duplicate?.name).toBe('Chorus Copy');
      expect(duplicate?.tempo).toBe(140);
    });
  });

  describe('moveScene', () => {
    it('should move a scene to a new index', () => {
      const scene1 = sceneManager.createScene();
      const scene2 = sceneManager.createScene();
      const scene3 = sceneManager.createScene();

      sceneManager.moveScene(scene3.id, 0);

      expect(sceneManager.getSceneAtIndex(0)?.id).toBe(scene3.id);
      expect(sceneManager.getSceneAtIndex(1)?.id).toBe(scene1.id);
      expect(sceneManager.getSceneAtIndex(2)?.id).toBe(scene2.id);
    });

    it('should clamp to valid range', () => {
      const scene1 = sceneManager.createScene();
      const scene2 = sceneManager.createScene();

      sceneManager.moveScene(scene1.id, 100);

      expect(sceneManager.getSceneAtIndex(1)?.id).toBe(scene1.id);
    });
  });

  describe('scene modifications', () => {
    it('should rename a scene', () => {
      const scene = sceneManager.createScene({ name: 'Old Name' });
      
      sceneManager.renameScene(scene.id, 'New Name');

      expect(sceneManager.getScene(scene.id)?.name).toBe('New Name');
    });

    it('should set scene color', () => {
      const scene = sceneManager.createScene();
      
      sceneManager.setSceneColor(scene.id, '#FF0000');

      expect(sceneManager.getScene(scene.id)?.color).toBe('#FF0000');
    });

    it('should set scene tempo', () => {
      const scene = sceneManager.createScene();
      
      sceneManager.setSceneTempo(scene.id, 128);

      expect(sceneManager.getScene(scene.id)?.tempo).toBe(128);
    });

    it('should clear scene tempo when undefined', () => {
      const scene = sceneManager.createScene({ tempo: 120 });
      
      sceneManager.setSceneTempo(scene.id, undefined);

      expect(sceneManager.getScene(scene.id)?.tempo).toBeUndefined();
    });
  });

  describe('navigation', () => {
    it('should get next scene', () => {
      const scene1 = sceneManager.createScene();
      const scene2 = sceneManager.createScene();

      const next = sceneManager.getNextScene(scene1.id);

      expect(next?.id).toBe(scene2.id);
    });

    it('should return null for last scene', () => {
      const scene1 = sceneManager.createScene();
      const scene2 = sceneManager.createScene();

      const next = sceneManager.getNextScene(scene2.id);

      expect(next).toBeNull();
    });

    it('should get previous scene', () => {
      const scene1 = sceneManager.createScene();
      const scene2 = sceneManager.createScene();

      const prev = sceneManager.getPreviousScene(scene2.id);

      expect(prev?.id).toBe(scene1.id);
    });

    it('should get first and last scenes', () => {
      const scene1 = sceneManager.createScene();
      sceneManager.createScene();
      const scene3 = sceneManager.createScene();

      expect(sceneManager.getFirstScene()?.id).toBe(scene1.id);
      expect(sceneManager.getLastScene()?.id).toBe(scene3.id);
    });

    it('should get random scene', () => {
      sceneManager.createScene();
      sceneManager.createScene();
      sceneManager.createScene();

      const random = sceneManager.getRandomScene();

      expect(random).toBeDefined();
    });

    it('should exclude current scene from random', () => {
      const scene1 = sceneManager.createScene();
      const scene2 = sceneManager.createScene();

      const random = sceneManager.getRandomScene(scene1.id);

      expect(random?.id).toBe(scene2.id);
    });
  });

  describe('playback state', () => {
    it('should set playing state', () => {
      const scene1 = sceneManager.createScene();
      const scene2 = sceneManager.createScene();

      sceneManager.setScenePlaying(scene1.id, true);

      expect(scene1.isPlaying).toBe(true);
      expect(scene2.isPlaying).toBe(false);
    });

    it('should set queued state', () => {
      const scene1 = sceneManager.createScene();
      const scene2 = sceneManager.createScene();

      sceneManager.setSceneQueued(scene2.id, true);

      expect(scene1.isQueued).toBe(false);
      expect(scene2.isQueued).toBe(true);
    });
  });

  describe('callbacks', () => {
    it('should call onSceneCreated', () => {
      const onSceneCreated = vi.fn();
      const manager = new SceneManager({ onSceneCreated });

      manager.createScene();

      expect(onSceneCreated).toHaveBeenCalledTimes(1);
    });

    it('should call onSceneDeleted', () => {
      const onSceneDeleted = vi.fn();
      const manager = new SceneManager({ onSceneDeleted });
      const scene = manager.createScene();

      manager.deleteScene(scene.id);

      expect(onSceneDeleted).toHaveBeenCalledWith(scene.id);
    });

    it('should call onSceneReordered', () => {
      const onSceneReordered = vi.fn();
      const manager = new SceneManager({ onSceneReordered });
      const scene1 = manager.createScene();
      const scene2 = manager.createScene();

      manager.moveScene(scene1.id, 1);

      expect(onSceneReordered).toHaveBeenCalled();
    });
  });
});

describe('getDefaultSceneColor', () => {
  it('should return a valid color', () => {
    const color = getDefaultSceneColor(0);
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should cycle through colors', () => {
    const color1 = getDefaultSceneColor(0);
    const color2 = getDefaultSceneColor(1);
    expect(color1).not.toBe(color2);
  });

  it('should wrap around', () => {
    const color0 = getDefaultSceneColor(0);
    const color12 = getDefaultSceneColor(12);
    expect(color0).toBe(color12);
  });
});

describe('generateSceneName', () => {
  it('should generate numbered names', () => {
    const scenes: Scene[] = [];
    const name = generateSceneName(scenes, 'Scene');
    expect(name).toBe('Scene 1');
  });

  it('should increment from existing scenes', () => {
    const scenes: Scene[] = [
      { id: '1', index: 0, name: 'Scene 1' },
      { id: '2', index: 1, name: 'Scene 2' },
    ];
    const name = generateSceneName(scenes, 'Scene');
    expect(name).toBe('Scene 3');
  });

  it('should handle gaps in numbering', () => {
    const scenes: Scene[] = [
      { id: '1', index: 0, name: 'Scene 1' },
      { id: '3', index: 1, name: 'Scene 5' },
    ];
    const name = generateSceneName(scenes, 'Scene');
    expect(name).toBe('Scene 6');
  });
});
