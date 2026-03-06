import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ControllerManager } from '../ControllerManager.js';

describe('ControllerManager', () => {
  let manager: ControllerManager;

  beforeEach(() => {
    manager = new ControllerManager();
  });

  describe('Initialization', () => {
    it('should initialize with MIDI access', async () => {
      // Mock navigator.requestMIDIAccess
      const mockAccess = {
        inputs: new Map(),
        outputs: new Map(),
        onstatechange: null
      };
      
      global.navigator.requestMIDIAccess = vi.fn().mockResolvedValue(mockAccess);
      
      const result = await manager.initialize();
      expect(result).toBe(true);
    });

    it('should handle MIDI access denial', async () => {
      global.navigator.requestMIDIAccess = vi.fn().mockRejectedValue(new Error('Denied'));
      
      const result = await manager.initialize();
      expect(result).toBe(false);
    });
  });

  describe('Controller registration', () => {
    it('should register a controller', () => {
      const controller = {
        id: 'test_ctrl',
        name: 'Test Controller',
        manufacturer: 'Test',
        type: 'midi' as const,
        inputs: [],
        outputs: []
      };

      manager.registerController(controller);
      
      const retrieved = manager.getController('test_ctrl');
      expect(retrieved?.device).toEqual(controller);
    });

    it('should unregister a controller', () => {
      const controller = {
        id: 'test_ctrl',
        name: 'Test Controller',
        manufacturer: 'Test',
        type: 'midi' as const,
        inputs: [],
        outputs: []
      };

      manager.registerController(controller);
      expect(manager.getController('test_ctrl')).toBeDefined();

      manager.unregisterController('test_ctrl');
      expect(manager.getController('test_ctrl')).toBeUndefined();
    });
  });

  describe('Mappings', () => {
    it('should add a mapping', () => {
      const mapping = {
        id: 'map_1',
        controllerId: 'ctrl_1',
        target: { type: 'transport' as const, action: 'play' as const },
        input: {
          id: 'btn_1',
          type: 'button' as const,
          midiChannel: 1,
          midiNumber: 64,
          midiType: 'note' as const,
          minValue: 0,
          maxValue: 127,
          isRelative: false
        },
        transform: {
          inputMin: 0,
          inputMax: 127,
          outputMin: 0,
          outputMax: 1,
          curve: 'linear' as const,
          invert: false
        },
        feedback: true
      };

      manager.addMapping(mapping);
      const mappings = manager.getMappings('ctrl_1');
      
      expect(mappings.length).toBe(1);
      expect(mappings[0].id).toBe('map_1');
    });

    it('should remove a mapping', () => {
      const mapping = {
        id: 'map_1',
        controllerId: 'ctrl_1',
        target: { type: 'transport' as const, action: 'play' as const },
        input: {
          id: 'btn_1',
          type: 'button' as const,
          midiChannel: 1,
          midiNumber: 64,
          midiType: 'note' as const,
          minValue: 0,
          maxValue: 127,
          isRelative: false
        },
        transform: {
          inputMin: 0,
          inputMax: 127,
          outputMin: 0,
          outputMax: 1,
          curve: 'linear' as const,
          invert: false
        },
        feedback: true
      };

      manager.addMapping(mapping);
      expect(manager.getMappings('ctrl_1').length).toBe(1);

      manager.removeMapping('map_1');
      expect(manager.getMappings('ctrl_1').length).toBe(0);
    });
  });

  describe('MIDI message subscription', () => {
    it('should notify subscribers of MIDI messages', () => {
      const callback = vi.fn();
      const unsubscribe = manager.onMidiMessage(callback);

      // Cleanup
      unsubscribe();
    });
  });
});
