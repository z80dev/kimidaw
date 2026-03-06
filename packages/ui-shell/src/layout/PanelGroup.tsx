/**
 * Panel Group Component
 * 
 * Manages a group of panels with resize handles between them.
 * Supports both horizontal and vertical orientations.
 */

import React, { useState, useCallback, useRef, useEffect, Children } from 'react';
import { DAW_COLORS } from '../theme.js';

/**
 * Panel orientation
 */
export type PanelOrientation = 'horizontal' | 'vertical';

/**
 * Props for PanelGroup
 */
export interface PanelGroupProps {
  /** Child panels */
  children: React.ReactNode;
  
  /** Group orientation */
  orientation?: PanelOrientation;
  
  /** Initial sizes for panels (as percentages or pixels) */
  initialSizes?: number[];
  
  /** Minimum size for each panel */
  minSizes?: number[];
  
  /** Whether panels can be collapsed */
  collapsible?: boolean;
  
  /** Callback when sizes change */
  onSizesChange?: (sizes: number[]) => void;
  
  /** Custom class name */
  className?: string;
  
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * PanelGroup component for managing multiple resizable panels
 * 
 * @example
 * ```tsx
 * <PanelGroup orientation="horizontal" initialSizes={[30, 70]}>
 *   <Panel>Left</Panel>
 *   <Panel>Right</Panel>
 * </PanelGroup>
 * ```
 */
export function PanelGroup({
  children,
  orientation = 'horizontal',
  initialSizes,
  minSizes = [],
  collapsible = false,
  onSizesChange,
  className,
  style,
}: PanelGroupProps): React.ReactElement {
  const childArray = Children.toArray(children);
  const panelCount = childArray.length;
  
  // Initialize sizes equally if not provided
  const defaultSizes = Array(panelCount).fill(100 / panelCount);
  const [sizes, setSizes] = useState<number[]>(() => {
    if (initialSizes && initialSizes.length === panelCount) {
      return initialSizes;
    }
    return defaultSizes;
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragIndex = useRef<number>(-1);
  const startPos = useRef(0);
  const startSizes = useRef<number[]>([]);
  
  // Handle resize start
  const handleResizeStart = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragIndex.current = index;
    startPos.current = orientation === 'horizontal' ? e.clientX : e.clientY;
    startSizes.current = [...sizes];
  }, [orientation, sizes]);
  
  // Handle resize move
  useEffect(() => {
    if (!isDragging.current) return;
    
    const handleMouseMove = (e: MouseEvent): void => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const containerSize = orientation === 'horizontal' ? rect.width : rect.height;
      const currentPos = orientation === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      const deltaPercent = (delta / containerSize) * 100;
      
      const newSizes = [...startSizes.current];
      const index = dragIndex.current;
      
      // Apply constraints
      const minSize = (minSizes[index] || 50) / containerSize * 100;
      const nextMinSize = (minSizes[index + 1] || 50) / containerSize * 100;
      
      const newSize = Math.max(minSize, newSizes[index] + deltaPercent);
      const sizeDiff = newSize - newSizes[index];
      const nextNewSize = Math.max(nextMinSize, newSizes[index + 1] - sizeDiff);
      
      // Recalculate to ensure total is 100%
      const actualDiff = newSizes[index + 1] - nextNewSize;
      newSizes[index] = newSizes[index] + actualDiff;
      newSizes[index + 1] = nextNewSize;
      
      setSizes(newSizes);
      onSizesChange?.(newSizes);
    };
    
    const handleMouseUp = (): void => {
      isDragging.current = false;
      dragIndex.current = -1;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [orientation, minSizes, onSizesChange]);
  
  const isHorizontal = orientation === 'horizontal';
  
  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...styles.container,
        flexDirection: isHorizontal ? 'row' : 'column',
        ...style,
      }}
    >
      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          <div
            style={{
              ...styles.panel,
              [isHorizontal ? 'width' : 'height']: `${sizes[index]}%`,
              [isHorizontal ? 'minWidth' : 'minHeight']: minSizes[index] || 50,
            }}
          >
            {child}
          </div>
          {index < panelCount - 1 && (
            <div
              style={{
                ...styles.resizer,
                ...(isHorizontal ? styles.resizerVertical : styles.resizerHorizontal),
              }}
              onMouseDown={(e) => handleResizeStart(index, e)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  resizer: {
    flexShrink: 0,
    backgroundColor: DAW_COLORS.borderDefault,
    zIndex: 10,
  },
  resizerVertical: {
    width: '4px',
    cursor: 'col-resize',
    ':hover': {
      backgroundColor: DAW_COLORS.accentBlue,
    },
  },
  resizerHorizontal: {
    height: '4px',
    cursor: 'row-resize',
    ':hover': {
      backgroundColor: DAW_COLORS.accentBlue,
    },
  },
};
