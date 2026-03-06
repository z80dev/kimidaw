/**
 * CommandRegistry Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { CommandRegistry } from '../commands/CommandRegistry.js';
import type { Command, CommandContext } from '../commands/types.js';

const mockContext: CommandContext = {
  modifiers: { ctrl: false, alt: false, shift: false, meta: false },
};

describe('CommandRegistry', () => {
  it('registers a command', () => {
    const registry = new CommandRegistry();
    const handler = vi.fn();
    
    registry.register({
      id: 'test.command',
      name: 'Test Command',
      category: 'Test',
      handler,
    });
    
    expect(registry.get('test.command')).toBeDefined();
  });

  it('unregisters a command', () => {
    const registry = new CommandRegistry();
    
    registry.register({
      id: 'test.command',
      name: 'Test Command',
      category: 'Test',
      handler: vi.fn(),
    });
    
    expect(registry.unregister('test.command')).toBe(true);
    expect(registry.get('test.command')).toBeUndefined();
  });

  it('returns false when unregistering non-existent command', () => {
    const registry = new CommandRegistry();
    expect(registry.unregister('nonexistent')).toBe(false);
  });

  it('executes a command', () => {
    const registry = new CommandRegistry();
    const handler = vi.fn();
    
    registry.register({
      id: 'test.command',
      name: 'Test Command',
      category: 'Test',
      handler,
    });
    
    registry.execute('test.command', mockContext);
    
    expect(handler).toHaveBeenCalledWith(mockContext);
  });

  it('registers commands with shortcuts', () => {
    const registry = new CommandRegistry();
    
    registry.register({
      id: 'file.save',
      name: 'Save',
      shortcut: 'ctrl+s',
      category: 'File',
      handler: vi.fn(),
    });
    
    const command = registry.getByShortcut('ctrl+s');
    expect(command?.id).toBe('file.save');
  });

  it('executes command by shortcut', () => {
    const registry = new CommandRegistry();
    const handler = vi.fn();
    
    registry.register({
      id: 'file.save',
      name: 'Save',
      shortcut: 'ctrl+s',
      category: 'File',
      handler,
    });
    
    const executed = registry.executeShortcut('ctrl+s', mockContext);
    
    expect(executed).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it('returns false when executing unknown shortcut', () => {
    const registry = new CommandRegistry();
    
    const executed = registry.executeShortcut('unknown', mockContext);
    
    expect(executed).toBe(false);
  });

  it('searches commands by query', () => {
    const registry = new CommandRegistry();
    
    registry.register({
      id: 'file.save',
      name: 'Save Project',
      category: 'File',
      handler: vi.fn(),
    });
    
    registry.register({
      id: 'file.open',
      name: 'Open Project',
      category: 'File',
      handler: vi.fn(),
    });
    
    const results = registry.search('save');
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('file.save');
  });

  it('groups commands by category', () => {
    const registry = new CommandRegistry();
    
    registry.register({
      id: 'file.save',
      name: 'Save',
      category: 'File',
      handler: vi.fn(),
    });
    
    registry.register({
      id: 'edit.copy',
      name: 'Copy',
      category: 'Edit',
      handler: vi.fn(),
    });
    
    const grouped = registry.getByCategory();
    
    expect(grouped.has('File')).toBe(true);
    expect(grouped.has('Edit')).toBe(true);
    expect(grouped.get('File')).toHaveLength(1);
  });

  it('clears all commands', () => {
    const registry = new CommandRegistry();
    
    registry.register({
      id: 'test.command',
      name: 'Test',
      category: 'Test',
      handler: vi.fn(),
    });
    
    registry.clear();
    
    expect(registry.getAll()).toHaveLength(0);
  });

  it('initializes with initial commands', () => {
    const commands: Command[] = [
      { id: 'cmd1', name: 'Cmd 1', category: 'Test', handler: vi.fn() },
      { id: 'cmd2', name: 'Cmd 2', category: 'Test', handler: vi.fn() },
    ];
    
    const registry = new CommandRegistry({ initialCommands: commands });
    
    expect(registry.getAll()).toHaveLength(2);
  });

  it('respects enabled callback', () => {
    const registry = new CommandRegistry();
    const handler = vi.fn();
    
    registry.register({
      id: 'test.command',
      name: 'Test',
      category: 'Test',
      handler,
      enabled: () => false,
    });
    
    registry.execute('test.command', mockContext);
    
    expect(handler).not.toHaveBeenCalled();
  });
});
