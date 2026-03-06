/**
 * Resizer Component
 * 
 * Standalone resizer handle that can be used between any two elements.
 * Supports both vertical and horizontal orientations.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DAW_COLORS } from '../theme.js';

/**
 * Props for Resizer component
 */
export interface ResizerProps {
  /** Callback during resize with delta from start */
  onResize: (delta: number) => void;
  
  /** Callback when resize starts */
  onResizeStart?: () => void;
  
  /** Callback when resize ends */
  onResizeEnd?: () => void;
  
  /** Resizer orientation */
  orientation: 'vertical' | 'horizontal';
  
  /** Double click handler (typically for collapse) */
  onDoubleClick?: () => void;
  
  /** Custom class name */
  className?: string;
  
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * Resizer handle component
 * 
 * @example
 * ```tsx
 * <div style={{ display: 'flex' }}>
 *   <Panel style={{ width: leftWidth }} />
 *   <Resizer 
 *     orientation="vertical" 
 *     onResize={(delta) => setLeftWidth(w => w + delta)}
 *   />
 *   <Panel style={{ flex: 1 }} />
 * </div>
 * ```
 */
export function Resizer({
  onResize,
  onResizeStart,
  onResizeEnd,
  orientation,
  onDoubleClick,
  className,
  style,
}: ResizerProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef(0);
  const lastDelta = useRef(0);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPos.current = orientation === 'vertical' ? e.clientX : e.clientY;
    lastDelta.current = 0;
    onResizeStart?.();
  }, [orientation, onResizeStart]);
  
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent): void => {
      const currentPos = orientation === 'vertical' ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      lastDelta.current = delta;
      onResize(delta);
      startPos.current = currentPos;
    };
    
    const handleMouseUp = (): void => {
      setIsDragging(false);
      onResizeEnd?.();
    };
    
    // Add capture phase to ensure we get events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Change cursor globally during drag
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, orientation, onResize, onResizeEnd]);
  
  const isVertical = orientation === 'vertical';
  
  return (
    <div
      className={className}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
      style={{
        ...styles.resizer,
        ...(isVertical ? styles.vertical : styles.horizontal),
        ...(isDragging ? styles.dragging : {}),
        ...style,
      }}
    >
      <div style={styles.handle} />
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  resizer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 100,
    transition: 'background-color 0.15s ease',
  },
  vertical: {
    width: '8px',
    cursor: 'col-resize',
    marginLeft: '-4px',
    marginRight: '-4px',
  },
  horizontal: {
    height: '8px',
    cursor: 'row-resize',
    marginTop: '-4px',
    marginBottom: '-4px',
  },
  dragging: {
    backgroundColor: DAW_COLORS.accentBlue,
  },
  handle: {
    backgroundColor: DAW_COLORS.borderDefault,
    borderRadius: '2px',
  },
};
