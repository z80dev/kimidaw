/**
 * useShortcuts Hook
 * 
 * React hook for registering multiple shortcuts in a component.
 */

import { useEffect, useRef } from 'react';
import { useShortcutContext } from './ShortcutProvider.js';
import type { Shortcut } from './types.js';

/**
 * Options for useShortcuts hook
 */
export interface UseShortcutsOptions {
  /** Shortcuts to register */
  shortcuts: Shortcut[];
  
  /** Dependencies array for re-registration */
  deps?: React.DependencyList;
}

/**
 * Hook for registering shortcuts
 * 
 * @example
 * ```tsx
 * useShortcuts({
 *   shortcuts: [
 *     { id: 'play', key: 'space', handler: () => transport.play() },
 *     { id: 'stop', key: 'esc', handler: () => transport.stop() },
 *   ],
 * });
 * ```
 */
export function useShortcuts({ shortcuts, deps = [] }: UseShortcutsOptions): void {
  const { register, unregister } = useShortcutContext();
  const shortcutsRef = useRef(shortcuts);
  
  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  });
  
  // Register/unregister on mount/unmount and when deps change
  useEffect(() => {
    const currentShortcuts = shortcutsRef.current;
    
    // Register all shortcuts
    currentShortcuts.forEach(shortcut => register(shortcut));
    
    // Cleanup: unregister all
    return () => {
      currentShortcuts.forEach(shortcut => unregister(shortcut.id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
