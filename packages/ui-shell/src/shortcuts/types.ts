/**
 * Shortcut system types
 */

/**
 * Context passed to shortcut handlers
 */
export interface ShortcutContext {
  /** Target element of the keyboard event */
  target: EventTarget | null;
  
  /** Currently focused element */
  activeElement: Element | null;
  
  /** Whether any modifier keys are pressed */
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
  
  /** Current repeat count for held keys */
  repeat: boolean;
  
  /** Prevent default browser behavior */
  preventDefault: () => void;
  
  /** Stop propagation */
  stopPropagation: () => void;
}

/**
 * Single shortcut binding
 */
export interface ShortcutBinding {
  /** Key or key combination (e.g., "a", "ctrl+s", "shift+tab") */
  key: string;
  
  /** Handler function */
  handler: (context: ShortcutContext) => void | boolean | Promise<void>;
  
  /** Description for help/documentation */
  description?: string;
  
  /** Priority (higher = checked first) */
  priority?: number;
  
  /** Whether shortcut is enabled */
  enabled?: boolean;
  
  /** Only trigger when focus is in input elements */
  allowInInput?: boolean;
  
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  
  /** Context in which this shortcut is active */
  context?: string;
}

/**
 * Shortcut definition with ID
 */
export interface Shortcut extends ShortcutBinding {
  /** Unique shortcut ID */
  id: string;
  
  /** Scope for grouping (e.g., "global", "piano-roll", "arrange") */
  scope?: string;
}
