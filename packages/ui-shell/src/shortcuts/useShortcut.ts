/**
 * useShortcut Hook
 * 
 * React hook for registering a single shortcut.
 */

import { useEffect } from 'react';
import { useShortcutContext } from './ShortcutProvider.js';
import type { Shortcut } from './types.js';

/**
 * Hook for registering a single shortcut
 * 
 * @example
 * ```tsx
 * useShortcut({
 *   id: 'save',
 *   key: 'ctrl+s',
 *   handler: () => saveProject(),
 *   preventDefault: true,
 * });
 * ```
 */
export function useShortcut(shortcut: Shortcut): void {
  const { register, unregister } = useShortcutContext();
  
  useEffect(() => {
    register(shortcut);
    
    return () => {
      unregister(shortcut.id);
    };
  }, [register, unregister, shortcut]);
}
