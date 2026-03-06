/**
 * Panel Component
 * 
 * Individual panel container with title bar, content area,
 * and optional tab support for multi-content panels.
 */

import React, { useState, useCallback } from 'react';
import { DAW_COLORS, DAW_TYPOGRAPHY, DAW_SPACING } from '../theme.js';

/**
 * Panel size variants
 */
export type PanelSize = 'small' | 'medium' | 'large' | 'full';

/**
 * Tab definition for multi-content panels
 */
export interface PanelTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  closable?: boolean;
}

/**
 * Props for Panel component
 */
export interface PanelProps {
  /** Panel title */
  title?: string;
  
  /** Panel icon */
  icon?: React.ReactNode;
  
  /** Panel content */
  children: React.ReactNode;
  
  /** Tabs for multi-content panels */
  tabs?: PanelTab[];
  
  /** Active tab ID (controlled) */
  activeTabId?: string;
  
  /** Default active tab ID */
  defaultTabId?: string;
  
  /** Callback when active tab changes */
  onTabChange?: (tabId: string) => void;
  
  /** Callback when tab is closed */
  onTabClose?: (tabId: string) => void;
  
  /** Panel size variant */
  size?: PanelSize;
  
  /** Whether panel has a header */
  hasHeader?: boolean;
  
  /** Whether panel is collapsible */
  collapsible?: boolean;
  
  /** Whether panel is collapsed */
  collapsed?: boolean;
  
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
  
  /** Additional toolbar content */
  toolbar?: React.ReactNode;
  
  /** Custom class name */
  className?: string;
  
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * Panel container component
 * 
 * @example
 * ```tsx
 * <Panel title="Browser" icon={<FolderIcon />}>
 *   <BrowserContent />
 * </Panel>
 * 
 * <Panel tabs={[
 *   { id: 'samples', label: 'Samples', content: <Samples /> },
 *   { id: 'presets', label: 'Presets', content: <Presets /> },
 * ]} />
 * ```
 */
export function Panel({
  title,
  icon,
  children,
  tabs,
  activeTabId,
  defaultTabId,
  onTabChange,
  onTabClose,
  size = 'medium',
  hasHeader = true,
  collapsible = false,
  collapsed: controlledCollapsed,
  onCollapseChange,
  toolbar,
  className,
  style,
}: PanelProps): React.ReactElement {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTabId ?? tabs?.[0]?.id);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  
  const isControlled = activeTabId !== undefined;
  const currentTabId = isControlled ? activeTabId : internalActiveTab;
  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  
  const handleTabClick = useCallback((tabId: string) => {
    if (!isControlled) {
      setInternalActiveTab(tabId);
    }
    onTabChange?.(tabId);
  }, [isControlled, onTabChange]);
  
  const handleCloseClick = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose?.(tabId);
  }, [onTabClose]);
  
  const toggleCollapse = useCallback(() => {
    const newCollapsed = !isCollapsed;
    if (controlledCollapsed === undefined) {
      setInternalCollapsed(newCollapsed);
    }
    onCollapseChange?.(newCollapsed);
  }, [isCollapsed, controlledCollapsed, onCollapseChange]);
  
  // Get current tab content
  const currentTab = tabs?.find(t => t.id === currentTabId);
  const content = currentTab ? currentTab.content : children;
  
  const showTabs = tabs && tabs.length > 0;
  
  return (
    <div
      className={className}
      style={{
        ...styles.container,
        ...sizeStyles[size],
        ...style,
      }}
    >
      {hasHeader && (
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            {icon && <span style={styles.icon}>{icon}</span>}
            {title && <span style={styles.title}>{title}</span>}
            
            {showTabs && (
              <div style={styles.tabs}>
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    style={{
                      ...styles.tab,
                      ...(tab.id === currentTabId ? styles.tabActive : {}),
                    }}
                    onClick={() => handleTabClick(tab.id)}
                  >
                    {tab.icon && <span style={styles.tabIcon}>{tab.icon}</span>}
                    <span style={styles.tabLabel}>{tab.label}</span>
                    {tab.closable && (
                      <span
                        style={styles.tabClose}
                        onClick={(e) => handleCloseClick(e, tab.id)}
                      >
                        ×
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div style={styles.headerRight}>
            {toolbar}
            {collapsible && (
              <button
                style={styles.collapseButton}
                onClick={toggleCollapse}
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? '▲' : '▼'}
              </button>
            )}
          </div>
        </div>
      )}
      
      {!isCollapsed && (
        <div style={styles.content}>
          {content}
        </div>
      )}
    </div>
  );
}

// Size styles
const sizeStyles: Record<PanelSize, React.CSSProperties> = {
  small: {},
  medium: {},
  large: {},
  full: {
    flex: 1,
    minHeight: 0,
  },
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: DAW_COLORS.bgMedium,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${DAW_SPACING[1]} ${DAW_SPACING[2]}`,
    backgroundColor: DAW_COLORS.bgLight,
    borderBottom: `1px solid ${DAW_COLORS.borderDefault}`,
    minHeight: '28px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[2],
    flex: 1,
    minWidth: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[1],
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: DAW_COLORS.textSecondary,
    fontSize: '14px',
  },
  title: {
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    fontWeight: DAW_TYPOGRAPHY.weightSemibold,
    color: DAW_COLORS.textPrimary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  tabs: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[0.5],
    marginLeft: DAW_SPACING[2],
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[1],
    padding: `${DAW_SPACING[0.5]} ${DAW_SPACING[2]}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '3px',
    color: DAW_COLORS.textSecondary,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    backgroundColor: DAW_COLORS.bgMedium,
    color: DAW_COLORS.textPrimary,
  },
  tabIcon: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
  },
  tabLabel: {
    fontSize: DAW_TYPOGRAPHY.sizeSm,
  },
  tabClose: {
    marginLeft: DAW_SPACING[1],
    padding: '0 2px',
    fontSize: '14px',
    lineHeight: 1,
    opacity: 0.7,
    ':hover': {
      opacity: 1,
    },
  },
  collapseButton: {
    padding: `${DAW_SPACING[0.5]} ${DAW_SPACING[1]}`,
    backgroundColor: 'transparent',
    border: 'none',
    color: DAW_COLORS.textTertiary,
    cursor: 'pointer',
    fontSize: '10px',
    ':hover': {
      color: DAW_COLORS.textPrimary,
    },
  },
  content: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
  },
};
