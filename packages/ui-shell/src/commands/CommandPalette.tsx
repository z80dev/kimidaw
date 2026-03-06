/**
 * Command Palette Component
 * 
 * A searchable overlay for executing commands with keyboard navigation.
 * Provides fuzzy search matching and categorized results.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { DAW_COLORS, DAW_TYPOGRAPHY, DAW_SPACING } from '../theme.js';
import type { Command } from './types.js';
import { CommandRegistry } from './CommandRegistry.js';

/**
 * Props for CommandPalette
 */
export interface CommandPaletteProps {
  /** Whether the palette is visible */
  isOpen: boolean;
  
  /** Callback when palette closes */
  onClose: () => void;
  
  /** Command registry to use */
  registry: CommandRegistry;
  
  /** Current command context */
  context?: Parameters<Command['handler']>[0];
  
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Command palette overlay component
 * 
 * @example
 * ```tsx
 * <CommandPalette
 *   isOpen={showPalette}
 *   onClose={() => setShowPalette(false)}
 *   registry={commandRegistry}
 * />
 * ```
 */
export function CommandPalette({
  isOpen,
  onClose,
  registry,
  context = { modifiers: { ctrl: false, alt: false, shift: false, meta: false } },
  placeholder = 'Type a command...',
}: CommandPaletteProps): React.ReactElement | null {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Search commands
  const results = useMemo(() => {
    if (!query.trim()) {
      // Show recently used or all commands when empty
      return registry.getAll().slice(0, 50);
    }
    return registry.search(query);
  }, [query, registry]);
  
  // Group results by category
  const groupedResults = useMemo(() => {
    const groups = new Map<string, Command[]>();
    for (const cmd of results) {
      const list = groups.get(cmd.category) ?? [];
      list.push(cmd);
      groups.set(cmd.category, list);
    }
    return groups;
  }, [results]);
  
  // Flatten for keyboard navigation
  const flatResults = useMemo(() => results, [results]);
  
  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        const cmd = flatResults[selectedIndex];
        if (cmd) {
          registry.execute(cmd.id, context);
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [flatResults, selectedIndex, registry, context, onClose]);
  
  // Scroll selected item into view
  useEffect(() => {
    const element = listRef.current?.children[selectedIndex];
    if (element) {
      element.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);
  
  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);
  
  if (!isOpen) return null;
  
  let currentIndex = 0;
  
  return (
    <div style={styles.backdrop} onClick={handleBackdropClick}>
      <div style={styles.container}>
        {/* Search Input */}
        <div style={styles.inputContainer}>
          <span style={styles.searchIcon}>⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={styles.input}
          />
          {query && (
            <button
              style={styles.clearButton}
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              ×
            </button>
          )}
        </div>
        
        {/* Results */}
        <div ref={listRef} style={styles.results}>
          {results.length === 0 ? (
            <div style={styles.noResults}>
              No commands found for &quot;{query}&quot;
            </div>
          ) : (
            Array.from(groupedResults.entries()).map(([category, commands]) => (
              <div key={category}>
                <div style={styles.category}>{category}</div>
                {commands.map((cmd) => {
                  const index = currentIndex++;
                  const isSelected = index === selectedIndex;
                  
                  return (
                    <button
                      key={cmd.id}
                      style={{
                        ...styles.result,
                        ...(isSelected ? styles.resultSelected : {}),
                      }}
                      onClick={() => {
                        registry.execute(cmd.id, context);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      {cmd.icon && (
                        <span style={styles.resultIcon}>{cmd.icon}</span>
                      )}
                      <span style={styles.resultName}>{cmd.name}</span>
                      {cmd.shortcut && (
                        <kbd style={styles.shortcut}>
                          {formatShortcut(cmd.shortcut)}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.footerHint}>
            ↑↓ to navigate, ↵ to execute, esc to close
          </span>
          <span style={styles.resultCount}>
            {results.length} commands
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Format shortcut for display
 */
function formatShortcut(shortcut: string): string {
  return shortcut
    .replace('mod', '⌘')
    .replace('ctrl', '⌃')
    .replace('alt', '⌥')
    .replace('shift', '⇧')
    .replace(/\+/g, ' ')
    .toUpperCase();
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '100px',
    zIndex: 1000,
  },
  container: {
    width: '600px',
    maxWidth: '90vw',
    backgroundColor: DAW_COLORS.bgMedium,
    border: `1px solid ${DAW_COLORS.borderDefault}`,
    borderRadius: '8px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: `${DAW_SPACING[3]} ${DAW_SPACING[4]}`,
    borderBottom: `1px solid ${DAW_COLORS.borderDefault}`,
    gap: DAW_SPACING[3],
  },
  searchIcon: {
    fontSize: '20px',
    color: DAW_COLORS.textTertiary,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: DAW_COLORS.textPrimary,
    fontSize: DAW_TYPOGRAPHY.sizeLg,
    outline: 'none',
  },
  clearButton: {
    background: 'none',
    border: 'none',
    color: DAW_COLORS.textTertiary,
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  results: {
    maxHeight: '400px',
    overflow: 'auto',
  },
  category: {
    padding: `${DAW_SPACING[2]} ${DAW_SPACING[4]}`,
    fontSize: DAW_TYPOGRAPHY.sizeXs,
    fontWeight: DAW_TYPOGRAPHY.weightSemibold,
    color: DAW_COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: DAW_COLORS.bgLight,
  },
  result: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[3],
    width: '100%',
    padding: `${DAW_SPACING[2]} ${DAW_SPACING[4]}`,
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    color: DAW_COLORS.textPrimary,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
  },
  resultSelected: {
    backgroundColor: DAW_COLORS.selection,
  },
  resultIcon: {
    fontSize: '16px',
    width: '24px',
    textAlign: 'center',
  },
  resultName: {
    flex: 1,
  },
  shortcut: {
    padding: `${DAW_SPACING[0.5]} ${DAW_SPACING[1]}`,
    backgroundColor: DAW_COLORS.bgDark,
    border: `1px solid ${DAW_COLORS.borderDefault}`,
    borderRadius: '3px',
    fontSize: DAW_TYPOGRAPHY.sizeXs,
    color: DAW_COLORS.textTertiary,
    fontFamily: 'monospace',
  },
  noResults: {
    padding: DAW_SPACING[8],
    textAlign: 'center',
    color: DAW_COLORS.textTertiary,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${DAW_SPACING[2]} ${DAW_SPACING[4]}`,
    borderTop: `1px solid ${DAW_COLORS.borderDefault}`,
    backgroundColor: DAW_COLORS.bgLight,
  },
  footerHint: {
    fontSize: DAW_TYPOGRAPHY.sizeXs,
    color: DAW_COLORS.textTertiary,
  },
  resultCount: {
    fontSize: DAW_TYPOGRAPHY.sizeXs,
    color: DAW_COLORS.textTertiary,
  },
};
