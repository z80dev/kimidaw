/**
 * useCommands Hook
 * 
 * React hook for working with commands in components.
 */

import { useState, useCallback, useMemo } from 'react';
import { CommandRegistry } from './CommandRegistry.js';
import type { Command, CommandContext } from './types.js';

/**
 * Options for useCommands hook
 */
export interface UseCommandsOptions {
  /** Initial commands */
  initialCommands?: Command[];
  
  /** Initial context */
  initialContext?: Partial<CommandContext>;
}

/**
 * Hook for managing commands
 * 
 * @example
 * ```tsx
 * const { registry, execute, search } = useCommands({
 *   initialCommands: myCommands,
 * });
 * 
 * execute('file.save');
 * const results = search('export');
 * ```
 */
export function useCommands(options: UseCommandsOptions = {}) {
  const [registry] = useState(() => new CommandRegistry({
    initialCommands: options.initialCommands,
  }));
  
  const [context, setContext] = useState<CommandContext>(() => ({
    modifiers: { ctrl: false, alt: false, shift: false, meta: false },
    ...options.initialContext,
  }));
  
  /**
   * Execute a command by ID
   */
  const execute = useCallback((commandId: string) => {
    registry.execute(commandId, context);
  }, [registry, context]);
  
  /**
   * Search commands
   */
  const search = useCallback((query: string) => {
    return registry.search(query);
  }, [registry]);
  
  /**
   * Get all commands
   */
  const getAll = useCallback(() => {
    return registry.getAll();
  }, [registry]);
  
  /**
   * Register a command
   */
  const register = useCallback((command: Command) => {
    registry.register(command);
  }, [registry]);
  
  /**
   * Unregister a command
   */
  const unregister = useCallback((commandId: string) => {
    return registry.unregister(commandId);
  }, [registry]);
  
  /**
   * Update context
   */
  const updateContext = useCallback((updates: Partial<CommandContext>) => {
    setContext(prev => ({ ...prev, ...updates }));
  }, []);
  
  return useMemo(() => ({
    registry,
    context,
    execute,
    search,
    getAll,
    register,
    unregister,
    updateContext,
  }), [registry, context, execute, search, getAll, register, unregister, updateContext]);
}
