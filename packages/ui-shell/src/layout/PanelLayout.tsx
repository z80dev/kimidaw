/**
 * Main Panel Layout Component
 * 
 * Manages the overall layout structure with left sidebar, right sidebar,
 * bottom panel, and center content area. All side panels are resizable
 * and collapsible.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DAW_COLORS, DAW_SPACING } from '../theme.js';

/**
 * Props for PanelLayout
 */
export interface PanelLayoutProps {
  /** Content for the left sidebar (browser, etc.) */
  left?: React.ReactNode;
  
  /** Content for the right sidebar (inspector, etc.) */
  right?: React.ReactNode;
  
  /** Content for the bottom panel (piano roll, code editor, etc.) */
  bottom?: React.ReactNode;
  
  /** Main center content (arrange view, mixer, etc.) */
  center: React.ReactNode;
  
  /** Initial widths for side panels */
  initialLeftWidth?: number;
  initialRightWidth?: number;
  initialBottomHeight?: number;
  
  /** Minimum dimensions for panels */
  minLeftWidth?: number;
  minRightWidth?: number;
  minBottomHeight?: number;
  
  /** Maximum dimensions for panels */
  maxLeftWidth?: number;
  maxRightWidth?: number;
  maxBottomHeight?: number;
  
  /** Whether panels are collapsed */
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
  bottomCollapsed?: boolean;
  
  /** Callbacks when panel sizes change */
  onLeftWidthChange?: (width: number) => void;
  onRightWidthChange?: (width: number) => void;
  onBottomHeightChange?: (height: number) => void;
}

/**
 * Main layout component for the DAW shell
 * 
 * @example
 * ```tsx
 * <PanelLayout
 *   left={<BrowserPanel />}
 *   right={<InspectorPanel />}
 *   bottom={<PianoRoll />}
 *   center={<ArrangeView />}
 * />
 * ```
 */
export function PanelLayout({
  left,
  right,
  bottom,
  center,
  initialLeftWidth = 240,
  initialRightWidth = 280,
  initialBottomHeight = 200,
  minLeftWidth = 160,
  minRightWidth = 200,
  minBottomHeight = 120,
  maxLeftWidth = 400,
  maxRightWidth = 400,
  maxBottomHeight = 600,
  leftCollapsed = false,
  rightCollapsed = false,
  bottomCollapsed = false,
  onLeftWidthChange,
  onRightWidthChange,
  onBottomHeightChange,
}: PanelLayoutProps): React.ReactElement {
  // Panel dimensions state
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [rightWidth, setRightWidth] = useState(initialRightWidth);
  const [bottomHeight, setBottomHeight] = useState(initialBottomHeight);
  
  // Collapse state
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(leftCollapsed);
  const [isRightCollapsed, setIsRightCollapsed] = useState(rightCollapsed);
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(bottomCollapsed);
  
  // Track previous sizes for uncollapse
  const prevLeftWidth = useRef(initialLeftWidth);
  const prevRightWidth = useRef(initialRightWidth);
  const prevBottomHeight = useRef(initialBottomHeight);

  // Sync collapse props
  useEffect(() => setIsLeftCollapsed(leftCollapsed), [leftCollapsed]);
  useEffect(() => setIsRightCollapsed(rightCollapsed), [rightCollapsed]);
  useEffect(() => setIsBottomCollapsed(bottomCollapsed), [bottomCollapsed]);

  // Resize handlers
  const handleLeftResize = useCallback((delta: number) => {
    const newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, leftWidth + delta));
    setLeftWidth(newWidth);
    onLeftWidthChange?.(newWidth);
  }, [leftWidth, minLeftWidth, maxLeftWidth, onLeftWidthChange]);

  const handleRightResize = useCallback((delta: number) => {
    const newWidth = Math.max(minRightWidth, Math.min(maxRightWidth, rightWidth - delta));
    setRightWidth(newWidth);
    onRightWidthChange?.(newWidth);
  }, [rightWidth, minRightWidth, maxRightWidth, onRightWidthChange]);

  const handleBottomResize = useCallback((delta: number) => {
    const newHeight = Math.max(minBottomHeight, Math.min(maxBottomHeight, bottomHeight - delta));
    setBottomHeight(newHeight);
    onBottomHeightChange?.(newHeight);
  }, [bottomHeight, minBottomHeight, maxBottomHeight, onBottomHeightChange]);

  // Toggle collapse handlers
  const toggleLeftCollapse = useCallback(() => {
    if (isLeftCollapsed) {
      setLeftWidth(prevLeftWidth.current);
      setIsLeftCollapsed(false);
    } else {
      prevLeftWidth.current = leftWidth;
      setIsLeftCollapsed(true);
    }
  }, [isLeftCollapsed, leftWidth]);

  const toggleRightCollapse = useCallback(() => {
    if (isRightCollapsed) {
      setRightWidth(prevRightWidth.current);
      setIsRightCollapsed(false);
    } else {
      prevRightWidth.current = rightWidth;
      setIsRightCollapsed(true);
    }
  }, [isRightCollapsed, rightWidth]);

  const toggleBottomCollapse = useCallback(() => {
    if (isBottomCollapsed) {
      setBottomHeight(prevBottomHeight.current);
      setIsBottomCollapsed(false);
    } else {
      prevBottomHeight.current = bottomHeight;
      setIsBottomCollapsed(true);
    }
  }, [isBottomCollapsed, bottomHeight]);

  const showLeft = left && !isLeftCollapsed;
  const showRight = right && !isRightCollapsed;
  const showBottom = bottom && !isBottomCollapsed;

  return (
    <div style={styles.container}>
      {/* Top row: Left + Center + Right */}
      <div style={styles.mainRow}>
        {/* Left Panel */}
        {left && (
          <>
            <div
              style={{
                ...styles.panel,
                ...styles.leftPanel,
                width: showLeft ? leftWidth : 32,
                minWidth: showLeft ? leftWidth : 32,
                maxWidth: showLeft ? leftWidth : 32,
              }}
            >
              {showLeft ? (
                <div style={styles.panelContent}>{left}</div>
              ) : (
                <button
                  style={styles.collapseButton}
                  onClick={toggleLeftCollapse}
                  title="Show Browser"
                >
                  ▶
                </button>
              )}
            </div>
            {showLeft && (
              <Resizer
                onResize={handleLeftResize}
                orientation="vertical"
                onDoubleClick={toggleLeftCollapse}
              />
            )}
          </>
        )}

        {/* Center Panel */}
        <div style={styles.centerPanel}>
          <div style={styles.panelContent}>{center}</div>
        </div>

        {/* Right Panel */}
        {right && (
          <>
            {showRight && (
              <Resizer
                onResize={handleRightResize}
                orientation="vertical"
                onDoubleClick={toggleRightCollapse}
              />
            )}
            <div
              style={{
                ...styles.panel,
                ...styles.rightPanel,
                width: showRight ? rightWidth : 32,
                minWidth: showRight ? rightWidth : 32,
                maxWidth: showRight ? rightWidth : 32,
              }}
            >
              {showRight ? (
                <div style={styles.panelContent}>{right}</div>
              ) : (
                <button
                  style={styles.collapseButton}
                  onClick={toggleRightCollapse}
                  title="Show Inspector"
                >
                  ◀
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Panel */}
      {bottom && (
        <>
          {showBottom && (
            <Resizer
              onResize={handleBottomResize}
              orientation="horizontal"
              onDoubleClick={toggleBottomCollapse}
            />
          )}
          <div
            style={{
              ...styles.bottomPanel,
              height: showBottom ? bottomHeight : 24,
              minHeight: showBottom ? bottomHeight : 24,
              maxHeight: showBottom ? bottomHeight : 24,
            }}
          >
            {showBottom ? (
              <div style={styles.panelContent}>{bottom}</div>
            ) : (
              <button
                style={styles.bottomCollapseButton}
                onClick={toggleBottomCollapse}
                title="Show Bottom Panel"
              >
                ▲ Piano Roll / Code Editor
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Resizer component for draggable panel boundaries
 */
interface ResizerProps {
  onResize: (delta: number) => void;
  orientation: 'vertical' | 'horizontal';
  onDoubleClick?: () => void;
}

function Resizer({ onResize, orientation, onDoubleClick }: ResizerProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef(0);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent): void => {
      const delta = orientation === 'vertical' 
        ? e.clientX - startPos.current 
        : startPos.current - e.clientY;
      onResize(delta);
      startPos.current = orientation === 'vertical' ? e.clientX : e.clientY;
    };

    const handleMouseUp = (): void => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onResize, orientation]);

  const handleMouseDown = (e: React.MouseEvent): void => {
    setIsDragging(true);
    startPos.current = orientation === 'vertical' ? e.clientX : e.clientY;
  };

  return (
    <div
      style={{
        ...styles.resizer,
        ...(orientation === 'vertical' ? styles.resizerVertical : styles.resizerHorizontal),
        ...(isDragging ? styles.resizerActive : {}),
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
    />
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: DAW_COLORS.bgDark,
  },
  mainRow: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    overflow: 'hidden',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: DAW_COLORS.bgMedium,
    borderColor: DAW_COLORS.borderDefault,
    overflow: 'hidden',
  },
  leftPanel: {
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
  },
  rightPanel: {
    borderLeftWidth: '1px',
    borderLeftStyle: 'solid',
  },
  centerPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: DAW_COLORS.bgDark,
  },
  bottomPanel: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: DAW_COLORS.bgMedium,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: DAW_COLORS.borderDefault,
    overflow: 'hidden',
  },
  panelContent: {
    flex: 1,
    overflow: 'auto',
  },
  resizer: {
    flexShrink: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  resizerVertical: {
    width: '5px',
    cursor: 'col-resize',
  },
  resizerHorizontal: {
    height: '5px',
    cursor: 'row-resize',
  },
  resizerActive: {
    backgroundColor: DAW_COLORS.accentBlue,
  },
  collapseButton: {
    width: '100%',
    height: '100%',
    backgroundColor: DAW_COLORS.bgMedium,
    border: 'none',
    color: DAW_COLORS.textTertiary,
    cursor: 'pointer',
    fontSize: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  bottomCollapseButton: {
    width: '100%',
    height: '100%',
    backgroundColor: DAW_COLORS.bgMedium,
    border: 'none',
    color: DAW_COLORS.textTertiary,
    cursor: 'pointer',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
};
