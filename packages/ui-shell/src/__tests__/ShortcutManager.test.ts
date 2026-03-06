/**
 * ShortcutManager Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { ShortcutManager } from '../shortcuts/ShortcutManager.js';
import type { Shortcut } from '../shortcuts/types.js';

describe('ShortcutManager', () => {
  it('registers a shortcut', () => {
    const manager = new ShortcutManager();
    
    manager.register({
      id: 'test.shortcut',
      key: 'a',
      handler: vi.fn(),
    });
    
    expect(manager.get('test.shortcut')).toBeDefined();
  });

  it('unregisters a shortcut', () => {
    const manager = new ShortcutManager();
    
    manager.register({
      id: 'test.shortcut',
      key: 'a',
      handler: vi.fn(),
    });
    
    expect(manager.unregister('test.shortcut')).toBe(true);
    expect(manager.get('test.shortcut')).toBeUndefined();
  });

  it('gets all shortcuts', () => {
    const manager = new ShortcutManager();
    
    manager.register({ id: 's1', key: 'a', handler: vi.fn() });
    manager.register({ id: 's2', key: 'b', handler: vi.fn() });
    
    expect(manager.getAll()).toHaveLength(2);
  });

  it('gets shortcuts by scope', () => {
    const manager = new ShortcutManager();
    
    manager.register({ id: 's1', key: 'a', handler: vi.fn(), scope: 'global' });
    manager.register({ id: 's2', key: 'b', handler: vi.fn(), scope: 'piano' });
    manager.register({ id: 's3', key: 'c', handler: vi.fn() }); // No scope = global
    
    const globalShortcuts = manager.getByScope('global');
    
    expect(globalShortcuts).toHaveLength(2);
  });

  it('handles keyboard event matching shortcut', () => {
    const manager = new ShortcutManager();
    const handler = vi.fn(() => true);
    
    manager.register({
      id: 'play',
      key: 'space',
      handler,
      preventDefault: true,
    });
    
    const event = new KeyboardEvent('keydown', { code: 'Space' });
    const handled = manager.handle(event);
    
    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it('respects modifier keys in shortcuts', () => {
    const manager = new ShortcutManager();
    const handler = vi.fn(() => true);
    
    manager.register({
      id: 'save',
      key: 'ctrl+s',
      handler,
    });
    
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });
    
    const handled = manager.handle(event);
    
    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it('respects enabled state', () => {
    const manager = new ShortcutManager();
    const handler = vi.fn();
    
    manager.register({
      id: 'disabled',
      key: 'a',
      handler,
      enabled: false,
    });
    
    const event = new KeyboardEvent('keydown', { key: 'a' });
    const handled = manager.handle(event);
    
    expect(handled).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('respects priority order', () => {
    const manager = new ShortcutManager();
    const handler1 = vi.fn(() => true);
    const handler2 = vi.fn(() => true);
    
    // Register lower priority first
    manager.register({
      id: 'low',
      key: 'a',
      handler: handler1,
      priority: 1,
    });
    
    manager.register({
      id: 'high',
      key: 'a',
      handler: handler2,
      priority: 10,
    });
    
    const event = new KeyboardEvent('keydown', { key: 'a' });
    manager.handle(event);
    
    // Higher priority should be called
    expect(handler2).toHaveBeenCalled();
    expect(handler1).not.toHaveBeenCalled();
  });

  it('skips shortcuts in input elements unless allowed', () => {
    const manager = new ShortcutManager();
    const handler = vi.fn(() => true);
    
    manager.register({
      id: 'test',
      key: 'a',
      handler,
      allowInInput: false,
    });
    
    // Create an input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    
    const event = new KeyboardEvent('keydown', { 
      key: 'a',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });
    
    const handled = manager.handle(event);
    
    expect(handled).toBe(false);
    expect(handler).not.toHaveBeenCalled();
    
    document.body.removeChild(input);
  });

  it('allows shortcuts in input when allowInInput is true', () => {
    const manager = new ShortcutManager();
    const handler = vi.fn(() => true);
    
    manager.register({
      id: 'test',
      key: 'a',
      handler,
      allowInInput: true,
    });
    
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    
    const event = new KeyboardEvent('keydown', { 
      key: 'a',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });
    
    const handled = manager.handle(event);
    
    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalled();
    
    document.body.removeChild(input);
  });

  it('clears all shortcuts', () => {
    const manager = new ShortcutManager();
    
    manager.register({ id: 's1', key: 'a', handler: vi.fn() });
    manager.register({ id: 's2', key: 'b', handler: vi.fn() });
    
    manager.clear();
    
    expect(manager.getAll()).toHaveLength(0);
  });

  it('initializes with initial shortcuts', () => {
    const shortcuts: Shortcut[] = [
      { id: 's1', key: 'a', handler: vi.fn() },
      { id: 's2', key: 'b', handler: vi.fn() },
    ];
    
    const manager = new ShortcutManager({ initialShortcuts: shortcuts });
    
    expect(manager.getAll()).toHaveLength(2);
  });
});
