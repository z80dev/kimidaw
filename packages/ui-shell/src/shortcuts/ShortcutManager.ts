/**
 * Shortcut Manager
 * 
 * Central manager for keyboard shortcuts with proper handling of
 * modifiers, scopes, and conflicts.
 */

import type { Shortcut, ShortcutBinding, ShortcutContext } from './types.js';

/**
 * Options for ShortcutManager
 */
export interface ShortcutManagerOptions {
  /** Initial shortcuts to register */
  initialShortcuts?: Shortcut[];
  
  /** Default scope */
  defaultScope?: string;
  
  /** Whether to capture shortcuts globally */
  capture?: boolean;
}

/**
 * Parse a key string into normalized parts
 */
function parseKeyString(keyStr: string): {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
} {
  const parts = keyStr.toLowerCase().split('+');
  
  return {
    key: parts.filter(p => !['ctrl', 'alt', 'shift', 'meta', 'cmd', 'command', 'option'].includes(p)).join('+'),
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt') || parts.includes('option'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
  };
}

/**
 * Shortcut manager class
 * 
 * @example
 * ```ts
 * const manager = new ShortcutManager();
 * 
 * manager.register({
 *   id: 'play',
 *   key: 'space',
 *   handler: () => transport.play(),
 * });
 * 
 * manager.register({
 *   id: 'save',
 *   key: 'ctrl+s',
 *   handler: () => saveProject(),
 *   preventDefault: true,
 * });
 * ```
 */
export class ShortcutManager {
  private shortcuts = new Map<string, Shortcut>();
  private scope: string;
  private capture: boolean;
  private isListening = false;
  
  constructor(options: ShortcutManagerOptions = {}) {
    this.scope = options.defaultScope ?? 'global';
    this.capture = options.capture ?? true;
    
    if (options.initialShortcuts) {
      options.initialShortcuts.forEach(s => this.register(s));
    }
  }
  
  /**
   * Register a shortcut
   */
  register(shortcut: Shortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
  }
  
  /**
   * Unregister a shortcut by ID
   */
  unregister(shortcutId: string): boolean {
    return this.shortcuts.delete(shortcutId);
  }
  
  /**
   * Get a shortcut by ID
   */
  get(shortcutId: string): Shortcut | undefined {
    return this.shortcuts.get(shortcutId);
  }
  
  /**
   * Get all shortcuts
   */
  getAll(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }
  
  /**
   * Get shortcuts by scope
   */
  getByScope(scope: string): Shortcut[] {
    return this.getAll().filter(s => s.scope === scope || (!s.scope && scope === 'global'));
  }
  
  /**
   * Update shortcut enabled state
   */
  setEnabled(shortcutId: string, enabled: boolean): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (shortcut) {
      shortcut.enabled = enabled;
    }
  }
  
  /**
   * Check if shortcut matches keyboard event
   */
  private matches(shortcut: Shortcut, event: KeyboardEvent): boolean {
    const parsed = parseKeyString(shortcut.key);
    
    // Check modifiers
    if (parsed.ctrl !== event.ctrlKey) return false;
    if (parsed.alt !== event.altKey) return false;
    if (parsed.shift !== event.shiftKey) return false;
    if (parsed.meta !== event.metaKey) return false;
    
    // Check key
    const eventKey = event.key.toLowerCase();
    const shortcutKey = parsed.key.toLowerCase();
    
    // Handle special keys
    if (shortcutKey === eventKey) return true;
    if (shortcutKey === 'space' && event.code === 'Space') return true;
    if (shortcutKey === 'esc' && event.code === 'Escape') return true;
    if (shortcutKey === 'del' && event.code === 'Delete') return true;
    if (shortcutKey === 'enter' && event.code === 'Enter') return true;
    if (shortcutKey === 'tab' && event.code === 'Tab') return true;
    
    // Handle single letters
    if (shortcutKey.length === 1 && event.key.length === 1) {
      return shortcutKey === eventKey;
    }
    
    return false;
  }
  
  /**
   * Check if target is an input element
   */
  private isInputElement(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    
    const tagName = target.tagName.toLowerCase();
    const isContentEditable = target.isContentEditable;
    
    return isContentEditable || 
           tagName === 'input' || 
           tagName === 'textarea' || 
           tagName === 'select';
  }
  
  /**
   * Handle keyboard event
   */
  handle(event: KeyboardEvent): boolean {
    const activeElement = document.activeElement;
    const isInInput = this.isInputElement(event.target);
    
    // Sort by priority (higher first)
    const sorted = this.getAll()
      .filter(s => s.enabled !== false)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    
    for (const shortcut of sorted) {
      if (!this.matches(shortcut, event)) continue;
      
      // Check if allowed in input
      if (isInInput && !shortcut.allowInInput) continue;
      
      // Build context
      const context: ShortcutContext = {
        target: event.target,
        activeElement,
        modifiers: {
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey,
          meta: event.metaKey,
        },
        repeat: event.repeat,
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      };
      
      // Execute handler
      const result = shortcut.handler(context);
      
      // Handle prevent default
      if (shortcut.preventDefault || result === true) {
        event.preventDefault();
      }
      
      // Stop if handler returned true or executed
      if (result !== false) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Start listening for keyboard events
   */
  startListening(): void {
    if (this.isListening) return;
    
    const handler = (e: KeyboardEvent) => this.handle(e);
    
    if (this.capture) {
      document.addEventListener('keydown', handler, true);
    } else {
      document.addEventListener('keydown', handler);
    }
    
    this.isListening = true;
  }
  
  /**
   * Stop listening for keyboard events
   */
  stopListening(): void {
    if (!this.isListening) return;
    
    // We need to track the handler to remove it
    // For now, this is a placeholder
    this.isListening = false;
  }
  
  /**
   * Clear all shortcuts
   */
  clear(): void {
    this.shortcuts.clear();
  }
}
