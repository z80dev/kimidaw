/**
 * Command Registry
 * 
 * Central registry for all application commands.
 * Manages command registration, unregistration, and shortcut mapping.
 */

import type { Command, CommandContext } from './types.js';

/**
 * Options for CommandRegistry
 */
export interface CommandRegistryOptions {
  /** Initial commands to register */
  initialCommands?: Command[];
}

/**
 * Command registry class
 * 
 * @example
 * ```ts
 * const registry = new CommandRegistry();
 * 
 * registry.register({
 *   id: 'file.save',
 *   name: 'Save',
 *   shortcut: 'mod+s',
 *   category: 'File',
 *   handler: () => saveProject(),
 * });
 * 
 * const commands = registry.search('save');
 * ```
 */
export class CommandRegistry {
  private commands = new Map<string, Command>();
  private shortcutMap = new Map<string, string>(); // shortcut -> commandId
  
  constructor(options: CommandRegistryOptions = {}) {
    if (options.initialCommands) {
      options.initialCommands.forEach(cmd => this.register(cmd));
    }
  }
  
  /**
   * Register a command
   */
  register(command: Command): void {
    this.commands.set(command.id, command);
    
    if (command.shortcut) {
      this.shortcutMap.set(normalizeShortcut(command.shortcut), command.id);
    }
  }
  
  /**
   * Unregister a command by ID
   */
  unregister(commandId: string): boolean {
    const command = this.commands.get(commandId);
    if (!command) return false;
    
    this.commands.delete(commandId);
    
    if (command.shortcut) {
      this.shortcutMap.delete(normalizeShortcut(command.shortcut));
    }
    
    return true;
  }
  
  /**
   * Get a command by ID
   */
  get(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }
  
  /**
   * Get all registered commands
   */
  getAll(): Command[] {
    return Array.from(this.commands.values());
  }
  
  /**
   * Get command by shortcut
   */
  getByShortcut(shortcut: string): Command | undefined {
    const normalized = normalizeShortcut(shortcut);
    const commandId = this.shortcutMap.get(normalized);
    return commandId ? this.commands.get(commandId) : undefined;
  }
  
  /**
   * Execute a command by ID
   */
  execute(commandId: string, context: CommandContext): void {
    const command = this.commands.get(commandId);
    if (command) {
      const isEnabled = typeof command.enabled === 'function' 
        ? command.enabled(context) 
        : command.enabled !== false;
        
      if (isEnabled) {
        command.handler(context);
      }
    }
  }
  
  /**
   * Execute command by shortcut
   */
  executeShortcut(shortcut: string, context: CommandContext): boolean {
    const command = this.getByShortcut(shortcut);
    if (command) {
      this.execute(command.id, context);
      return true;
    }
    return false;
  }
  
  /**
   * Search commands by query string
   */
  search(query: string): Command[] {
    const lowerQuery = query.toLowerCase();
    
    return this.getAll().filter(cmd => 
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.id.toLowerCase().includes(lowerQuery) ||
      cmd.category.toLowerCase().includes(lowerQuery)
    );
  }
  
  /**
   * Get all commands grouped by category
   */
  getByCategory(): Map<string, Command[]> {
    const grouped = new Map<string, Command[]>();
    
    for (const command of this.commands.values()) {
      const list = grouped.get(command.category) ?? [];
      list.push(command);
      grouped.set(command.category, list);
    }
    
    return grouped;
  }
  
  /**
   * Check if a shortcut is registered
   */
  hasShortcut(shortcut: string): boolean {
    return this.shortcutMap.has(normalizeShortcut(shortcut));
  }
  
  /**
   * Get all registered shortcuts
   */
  getShortcuts(): Map<string, string> {
    return new Map(this.shortcutMap);
  }
  
  /**
   * Clear all commands
   */
  clear(): void {
    this.commands.clear();
    this.shortcutMap.clear();
  }
}

/**
 * Normalize a shortcut string for comparison
 */
function normalizeShortcut(shortcut: string): string {
  return shortcut
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace('cmd', 'meta')
    .replace('command', 'meta')
    .replace('option', 'alt')
    .split('+')
    .sort()
    .join('+');
}
