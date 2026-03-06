/**
 * Command system types
 */

/**
 * Command context passed to handlers
 */
export interface CommandContext {
  /** Current project state */
  project?: unknown;
  
  /** Current selection */
  selection?: unknown;
  
  /** Current view */
  view?: string;
  
  /** Whether modifier keys are pressed */
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
}

/**
 * Command definition
 */
export interface Command {
  /** Unique command ID */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Keyboard shortcut (e.g., "mod+s", "ctrl+shift+p") */
  shortcut?: string;
  
  /** Command category for grouping */
  category: string;
  
  /** Handler function */
  handler: (context: CommandContext) => void | Promise<void>;
  
  /** Whether command is enabled */
  enabled?: boolean | ((context: CommandContext) => boolean);
  
  /** Icon for display */
  icon?: string;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
