/**
 * Shortcut Provider
 * 
 * React context provider for shortcut management.
 */

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { ShortcutManager } from './ShortcutManager.js';
import type { Shortcut } from './types.js';

/**
 * Context value type
 */
interface ShortcutContextValue {
  manager: ShortcutManager;
  register: (shortcut: Shortcut) => void;
  unregister: (shortcutId: string) => void;
}

/**
 * React context
 */
const ShortcutContext = createContext<ShortcutContextValue | null>(null);

/**
 * Props for ShortcutProvider
 */
export interface ShortcutProviderProps {
  /** Child components */
  children: React.ReactNode;
  
  /** Initial shortcuts */
  initialShortcuts?: Shortcut[];
}

/**
 * Shortcut provider component
 * 
 * @example
 * ```tsx
 * <ShortcutProvider initialShortcuts={globalShortcuts}>
 *   <App />
 * </ShortcutProvider>
 * ```
 */
export function ShortcutProvider({ children, initialShortcuts }: ShortcutProviderProps): React.ReactElement {
  const managerRef = useRef(new ShortcutManager({ initialShortcuts }));
  const shortcutsRef = useRef(new Map<string, Shortcut>());
  
  // Register global keyboard handler
  useEffect(() => {
    const manager = managerRef.current;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      manager.handle(e);
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Registration helper
  const register = useCallback((shortcut: Shortcut) => {
    shortcutsRef.current.set(shortcut.id, shortcut);
    managerRef.current.register(shortcut);
  }, []);
  
  // Unregistration helper
  const unregister = useCallback((shortcutId: string) => {
    shortcutsRef.current.delete(shortcutId);
    managerRef.current.unregister(shortcutId);
  }, []);
  
  const value: ShortcutContextValue = {
    manager: managerRef.current,
    register,
    unregister,
  };
  
  return (
    <ShortcutContext.Provider value={value}>
      {children}
    </ShortcutContext.Provider>
  );
}

/**
 * Hook to access shortcut context
 */
export function useShortcutContext(): ShortcutContextValue {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcutContext must be used within ShortcutProvider');
  }
  return context;
}
