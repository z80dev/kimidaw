/**
 * Browser Panel
 * 
 * Sample and preset browser with search, filtering, and drag-drop support.
 * Provides access to samples, instruments, effects, and project files.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { DAW_COLORS, DAW_TYPOGRAPHY, DAW_SPACING } from '../theme.js';
import { Panel } from '../layout/Panel.js';

/**
 * Browser item types
 */
export type BrowserItemType = 
  | 'sample' 
  | 'preset' 
  | 'instrument' 
  | 'effect' 
  | 'midi' 
  | 'project' 
  | 'folder';

/**
 * Single browser item
 */
export interface BrowserItem {
  id: string;
  name: string;
  type: BrowserItemType;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  favorite?: boolean;
  /** Preview URL for audio samples */
  previewUrl?: string;
  /** Color for visual identification */
  color?: string;
  /** Child items for folders */
  children?: BrowserItem[];
  /** Whether item is expanded (folders) */
  expanded?: boolean;
}

/**
 * Browser category definition
 */
export interface BrowserCategory {
  id: string;
  name: string;
  icon: string;
  items: BrowserItem[];
  expanded?: boolean;
}

/**
 * Props for BrowserPanel
 */
export interface BrowserPanelProps {
  /** Categories to display */
  categories?: BrowserCategory[];
  
  /** Currently selected item ID */
  selectedId?: string;
  
  /** Search query string */
  searchQuery?: string;
  
  /** Callback when item is selected */
  onSelect?: (item: BrowserItem) => void;
  
  /** Callback when item is double-clicked */
  onDoubleClick?: (item: BrowserItem) => void;
  
  /** Callback when item drag starts */
  onDragStart?: (item: BrowserItem) => void;
  
  /** Callback when search query changes */
  onSearchChange?: (query: string) => void;
  
  /** Callback when item favorite is toggled */
  onFavoriteToggle?: (item: BrowserItem) => void;
  
  /** Whether to show favorites only */
  favoritesOnly?: boolean;
  
  /** Custom class name */
  className?: string;
}

/**
 * Default browser categories
 */
const defaultCategories: BrowserCategory[] = [
  {
    id: 'samples',
    name: 'Samples',
    icon: '🎵',
    items: [],
  },
  {
    id: 'instruments',
    name: 'Instruments',
    icon: '🎹',
    items: [],
  },
  {
    id: 'effects',
    name: 'Effects',
    icon: '⚡',
    items: [],
  },
  {
    id: 'presets',
    name: 'Presets',
    icon: '💾',
    items: [],
  },
  {
    id: 'projects',
    name: 'Projects',
    icon: '📁',
    items: [],
  },
];

/**
 * Browser panel component
 * 
 * @example
 * ```tsx
 * <BrowserPanel
 *   categories={myCategories}
 *   onSelect={(item) => loadSample(item.id)}
 *   onDragStart={(item) => setDraggedItem(item)}
 * />
 * ```
 */
export function BrowserPanel({
  categories = defaultCategories,
  selectedId,
  searchQuery = '',
  onSelect,
  onDoubleClick,
  onDragStart,
  onSearchChange,
  onFavoriteToggle,
  favoritesOnly = false,
  className,
}: BrowserPanelProps): React.ReactElement {
  const [internalSearch, setInternalSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categories.filter(c => c.expanded !== false).map(c => c.id))
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const query = onSearchChange ? searchQuery : internalSearch;
  
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!onSearchChange) {
      setInternalSearch(value);
    }
    onSearchChange?.(value);
  }, [onSearchChange]);
  
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);
  
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);
  
  // Filter items based on search query
  const filteredCategories = useMemo(() => {
    if (!query.trim() && !favoritesOnly) return categories;
    
    const searchLower = query.toLowerCase();
    
    return categories.map(category => ({
      ...category,
      items: filterItems(category.items, searchLower, favoritesOnly),
    })).filter(category => 
      favoritesOnly ? category.items.length > 0 : true
    );
  }, [categories, query, favoritesOnly]);
  
  const handleDragStart = useCallback((item: BrowserItem) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/daw-browser-item', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(item);
  }, [onDragStart]);
  
  return (
    <Panel title="Browser" className={className} hasHeader={false}>
      <div style={styles.container}>
        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={handleSearchChange}
            style={styles.searchInput}
          />
          {query && (
            <button
              style={styles.clearButton}
              onClick={() => {
                if (!onSearchChange) setInternalSearch('');
                onSearchChange?.('');
              }}
            >
              ×
            </button>
          )}
        </div>
        
        {/* Category Tabs */}
        <div style={styles.tabs}>
          {categories.map(category => (
            <button
              key={category.id}
              style={{
                ...styles.tab,
                ...(expandedCategories.has(category.id) ? styles.tabActive : {}),
              }}
              onClick={() => toggleCategory(category.id)}
              title={category.name}
            >
              <span style={styles.tabIcon}>{category.icon}</span>
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div style={styles.content}>
          {filteredCategories.map(category => (
            expandedCategories.has(category.id) && (
              <div key={category.id} style={styles.category}>
                <div 
                  style={styles.categoryHeader}
                  onClick={() => toggleCategory(category.id)}
                >
                  <span style={styles.categoryIcon}>{category.icon}</span>
                  <span style={styles.categoryName}>{category.name}</span>
                  <span style={styles.collapseIcon}>▼</span>
                </div>
                <div style={styles.itemList}>
                  {category.items.map(item => (
                    <BrowserItemRow
                      key={item.id}
                      item={item}
                      isSelected={item.id === selectedId}
                      isExpanded={expandedFolders.has(item.id)}
                      onSelect={onSelect}
                      onDoubleClick={onDoubleClick}
                      onDragStart={handleDragStart(item)}
                      onToggleFolder={toggleFolder}
                      onToggleFavorite={onFavoriteToggle}
                      level={0}
                    />
                  ))}
                  {category.items.length === 0 && (
                    <div style={styles.emptyState}>No items</div>
                  )}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </Panel>
  );
}

/**
 * Filter items recursively
 */
function filterItems(
  items: BrowserItem[], 
  searchLower: string,
  favoritesOnly: boolean
): BrowserItem[] {
  return items.reduce<BrowserItem[]>((acc, item) => {
    const matchesSearch = !searchLower || 
      item.name.toLowerCase().includes(searchLower) ||
      item.tags?.some(t => t.toLowerCase().includes(searchLower));
    const matchesFavorite = !favoritesOnly || item.favorite;
    
    if (item.children) {
      const filteredChildren = filterItems(item.children, searchLower, favoritesOnly);
      if (filteredChildren.length > 0 || (matchesSearch && matchesFavorite)) {
        acc.push({ ...item, children: filteredChildren });
      }
    } else if (matchesSearch && matchesFavorite) {
      acc.push(item);
    }
    
    return acc;
  }, []);
}

/**
 * Single browser item row
 */
interface BrowserItemRowProps {
  item: BrowserItem;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect?: (item: BrowserItem) => void;
  onDoubleClick?: (item: BrowserItem) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onToggleFolder?: (folderId: string) => void;
  onToggleFavorite?: (item: BrowserItem) => void;
  level: number;
}

function BrowserItemRow({
  item,
  isSelected,
  isExpanded,
  onSelect,
  onDoubleClick,
  onDragStart,
  onToggleFolder,
  onToggleFavorite,
  level,
}: BrowserItemRowProps): React.ReactElement {
  const isFolder = item.type === 'folder' && item.children;
  
  const icon = getItemIcon(item.type);
  
  return (
    <>
      <div
        style={{
          ...styles.item,
          ...(isSelected ? styles.itemSelected : {}),
          paddingLeft: `${8 + level * 16}px`,
        }}
        onClick={() => onSelect?.(item)}
        onDoubleClick={() => onDoubleClick?.(item)}
        draggable={!isFolder}
        onDragStart={onDragStart}
      >
        {isFolder && (
          <span 
            style={styles.folderToggle}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFolder?.(item.id);
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        <span style={{
          ...styles.itemIcon,
          color: item.color || DAW_COLORS.textSecondary,
        }}>
          {icon}
        </span>
        <span style={styles.itemName}>{item.name}</span>
        <button
          style={{
            ...styles.favoriteButton,
            ...(item.favorite ? styles.favoriteActive : {}),
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(item);
          }}
        >
          {item.favorite ? '★' : '☆'}
        </button>
      </div>
      {isFolder && isExpanded && item.children?.map(child => (
        <BrowserItemRow
          key={child.id}
          item={child}
          isSelected={false}
          isExpanded={false}
          onSelect={onSelect}
          onDoubleClick={onDoubleClick}
          onToggleFolder={onToggleFolder}
          onToggleFavorite={onToggleFavorite}
          level={level + 1}
        />
      ))}
    </>
  );
}

/**
 * Get icon for item type
 */
function getItemIcon(type: BrowserItemType): string {
  const icons: Record<BrowserItemType, string> = {
    sample: '🎵',
    preset: '💾',
    instrument: '🎹',
    effect: '⚡',
    midi: '🎼',
    project: '📁',
    folder: '📂',
  };
  return icons[type];
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: DAW_COLORS.bgMedium,
  },
  searchContainer: {
    position: 'relative',
    padding: DAW_SPACING[2],
    borderBottom: `1px solid ${DAW_COLORS.borderDefault}`,
  },
  searchInput: {
    width: '100%',
    padding: `${DAW_SPACING[1]} ${DAW_SPACING[2]}`,
    paddingRight: '28px',
    backgroundColor: DAW_COLORS.bgDark,
    border: `1px solid ${DAW_COLORS.borderDefault}`,
    borderRadius: '3px',
    color: DAW_COLORS.textPrimary,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    outline: 'none',
  },
  clearButton: {
    position: 'absolute',
    right: '24px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: DAW_COLORS.textTertiary,
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0 4px',
  },
  tabs: {
    display: 'flex',
    borderBottom: `1px solid ${DAW_COLORS.borderDefault}`,
  },
  tab: {
    flex: 1,
    padding: DAW_SPACING[2],
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: DAW_COLORS.textTertiary,
    cursor: 'pointer',
    fontSize: DAW_TYPOGRAPHY.sizeSm,
  },
  tabActive: {
    borderBottomColor: DAW_COLORS.accentBlue,
    color: DAW_COLORS.textPrimary,
  },
  tabIcon: {
    fontSize: '14px',
  },
  content: {
    flex: 1,
    overflow: 'auto',
  },
  category: {
    borderBottom: `1px solid ${DAW_COLORS.borderSubtle}`,
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[1.5],
    padding: `${DAW_SPACING[1.5]} ${DAW_SPACING[2]}`,
    cursor: 'pointer',
    backgroundColor: DAW_COLORS.bgLight,
  },
  categoryIcon: {
    fontSize: '14px',
  },
  categoryName: {
    flex: 1,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    fontWeight: DAW_TYPOGRAPHY.weightMedium,
    color: DAW_COLORS.textSecondary,
  },
  collapseIcon: {
    fontSize: '10px',
    color: DAW_COLORS.textTertiary,
  },
  itemList: {
    padding: `${DAW_SPACING[1]} 0`,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[1.5],
    padding: `${DAW_SPACING[1]} ${DAW_SPACING[2]}`,
    cursor: 'pointer',
    userSelect: 'none',
  },
  itemSelected: {
    backgroundColor: DAW_COLORS.selection,
  },
  folderToggle: {
    fontSize: '10px',
    color: DAW_COLORS.textTertiary,
    width: '14px',
    textAlign: 'center',
  },
  itemIcon: {
    fontSize: '14px',
    width: '16px',
    textAlign: 'center',
  },
  itemName: {
    flex: 1,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    color: DAW_COLORS.textPrimary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  favoriteButton: {
    background: 'none',
    border: 'none',
    color: DAW_COLORS.textTertiary,
    cursor: 'pointer',
    fontSize: '12px',
    padding: '0 4px',
    opacity: 0,
    transition: 'opacity 0.15s ease',
  },
  favoriteActive: {
    color: DAW_COLORS.accentYellow,
    opacity: 1,
  },
  emptyState: {
    padding: `${DAW_SPACING[4]} ${DAW_SPACING[2]}`,
    textAlign: 'center',
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    color: DAW_COLORS.textTertiary,
  },
};
