/**
 * usePanelLayout Hook
 * 
 * React hook for managing panel layout state.
 * Provides imperative controls for programmatic panel manipulation.
 */

import { useState, useCallback, useRef, useImperativeHandle } from 'react';

/**
 * Panel layout state
 */
export interface PanelLayoutState {
  /** Width of left panel in pixels */
  leftWidth: number;
  
  /** Width of right panel in pixels */
  rightWidth: number;
  
  /** Height of bottom panel in pixels */
  bottomHeight: number;
  
  /** Whether left panel is collapsed */
  leftCollapsed: boolean;
  
  /** Whether right panel is collapsed */
  rightCollapsed: boolean;
  
  /** Whether bottom panel is collapsed */
  bottomCollapsed: boolean;
  
  /** Currently active view/panel */
  activeView: string;
}

/**
 * Actions available on panel layout
 */
export interface PanelLayoutActions {
  /** Set left panel width */
  setLeftWidth: (width: number) => void;
  
  /** Set right panel width */
  setRightWidth: (width: number) => void;
  
  /** Set bottom panel height */
  setBottomHeight: (height: number) => void;
  
  /** Toggle left panel collapse */
  toggleLeft: () => void;
  
  /** Toggle right panel collapse */
  toggleRight: () => void;
  
  /** Toggle bottom panel collapse */
  toggleBottom: () => void;
  
  /** Collapse left panel */
  collapseLeft: () => void;
  
  /** Collapse right panel */
  collapseRight: () => void;
  
  /** Collapse bottom panel */
  collapseBottom: () => void;
  
  /** Expand left panel */
  expandLeft: () => void;
  
  /** Expand right panel */
  expandRight: () => void;
  
  /** Expand bottom panel */
  expandBottom: () => void;
  
  /** Set active view */
  setActiveView: (view: string) => void;
  
  /** Reset all panels to defaults */
  resetLayout: () => void;
}

/**
 * Options for usePanelLayout hook
 */
export interface UsePanelLayoutOptions {
  /** Initial left panel width */
  initialLeftWidth?: number;
  
  /** Initial right panel width */
  initialRightWidth?: number;
  
  /** Initial bottom panel height */
  initialBottomHeight?: number;
  
  /** Initial active view */
  initialActiveView?: string;
  
  /** Minimum left panel width */
  minLeftWidth?: number;
  
  /** Minimum right panel width */
  minRightWidth?: number;
  
  /** Minimum bottom panel height */
  minBottomHeight?: number;
  
  /** Maximum left panel width */
  maxLeftWidth?: number;
  
  /** Maximum right panel width */
  maxRightWidth?: number;
  
  /** Maximum bottom panel height */
  maxBottomHeight?: number;
  
  /** Callback when layout changes */
  onLayoutChange?: (state: PanelLayoutState) => void;
}

/**
 * Default options
 */
const defaultOptions: Required<UsePanelLayoutOptions> = {
  initialLeftWidth: 240,
  initialRightWidth: 280,
  initialBottomHeight: 200,
  initialActiveView: 'arrange',
  minLeftWidth: 160,
  minRightWidth: 200,
  minBottomHeight: 120,
  maxLeftWidth: 400,
  maxRightWidth: 400,
  maxBottomHeight: 600,
  onLayoutChange: () => {},
};

/**
 * Hook for managing panel layout state
 * 
 * @example
 * ```tsx
 * const layout = usePanelLayout({
 *   initialLeftWidth: 300,
 *   onLayoutChange: (state) => saveLayout(state)
 * });
 * 
 * // Toggle left panel
 * layout.toggleLeft();
 * 
 * // Change active view
 * layout.setActiveView('mixer');
 * ```
 */
export function usePanelLayout(
  options: UsePanelLayoutOptions = {}
): PanelLayoutState & PanelLayoutActions {
  const opts = { ...defaultOptions, ...options };
  
  // Track previous sizes for expand/restore
  const prevLeftWidth = useRef(opts.initialLeftWidth);
  const prevRightWidth = useRef(opts.initialRightWidth);
  const prevBottomHeight = useRef(opts.initialBottomHeight);
  
  // State
  const [leftWidth, setLeftWidthState] = useState(opts.initialLeftWidth);
  const [rightWidth, setRightWidthState] = useState(opts.initialRightWidth);
  const [bottomHeight, setBottomHeightState] = useState(opts.initialBottomHeight);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const [activeView, setActiveView] = useState(opts.initialActiveView);
  
  // Constrain values
  const constrainLeft = useCallback((w: number) => 
    Math.max(opts.minLeftWidth, Math.min(opts.maxLeftWidth, w)), 
    [opts.minLeftWidth, opts.maxLeftWidth]
  );
  
  const constrainRight = useCallback((w: number) => 
    Math.max(opts.minRightWidth, Math.min(opts.maxRightWidth, w)), 
    [opts.minRightWidth, opts.maxRightWidth]
  );
  
  const constrainBottom = useCallback((h: number) => 
    Math.max(opts.minBottomHeight, Math.min(opts.maxBottomHeight, h)), 
    [opts.minBottomHeight, opts.maxBottomHeight]
  );
  
  // State setters with constraints
  const setLeftWidth = useCallback((width: number) => {
    const constrained = constrainLeft(width);
    setLeftWidthState(constrained);
    if (!leftCollapsed) {
      prevLeftWidth.current = constrained;
    }
  }, [constrainLeft, leftCollapsed]);
  
  const setRightWidth = useCallback((width: number) => {
    const constrained = constrainRight(width);
    setRightWidthState(constrained);
    if (!rightCollapsed) {
      prevRightWidth.current = constrained;
    }
  }, [constrainRight, rightCollapsed]);
  
  const setBottomHeight = useCallback((height: number) => {
    const constrained = constrainBottom(height);
    setBottomHeightState(constrained);
    if (!bottomCollapsed) {
      prevBottomHeight.current = constrained;
    }
  }, [constrainBottom, bottomCollapsed]);
  
  // Toggle functions
  const toggleLeft = useCallback(() => {
    setLeftCollapsed(prev => {
      const next = !prev;
      if (!next) {
        setLeftWidthState(prevLeftWidth.current);
      }
      return next;
    });
  }, []);
  
  const toggleRight = useCallback(() => {
    setRightCollapsed(prev => {
      const next = !prev;
      if (!next) {
        setRightWidthState(prevRightWidth.current);
      }
      return next;
    });
  }, []);
  
  const toggleBottom = useCallback(() => {
    setBottomCollapsed(prev => {
      const next = !prev;
      if (!next) {
        setBottomHeightState(prevBottomHeight.current);
      }
      return next;
    });
  }, []);
  
  // Collapse functions
  const collapseLeft = useCallback(() => {
    if (!leftCollapsed) {
      prevLeftWidth.current = leftWidth;
      setLeftCollapsed(true);
    }
  }, [leftCollapsed, leftWidth]);
  
  const collapseRight = useCallback(() => {
    if (!rightCollapsed) {
      prevRightWidth.current = rightWidth;
      setRightCollapsed(true);
    }
  }, [rightCollapsed, rightWidth]);
  
  const collapseBottom = useCallback(() => {
    if (!bottomCollapsed) {
      prevBottomHeight.current = bottomHeight;
      setBottomCollapsed(true);
    }
  }, [bottomCollapsed, bottomHeight]);
  
  // Expand functions
  const expandLeft = useCallback(() => {
    if (leftCollapsed) {
      setLeftWidthState(prevLeftWidth.current);
      setLeftCollapsed(false);
    }
  }, [leftCollapsed]);
  
  const expandRight = useCallback(() => {
    if (rightCollapsed) {
      setRightWidthState(prevRightWidth.current);
      setRightCollapsed(false);
    }
  }, [rightCollapsed]);
  
  const expandBottom = useCallback(() => {
    if (bottomCollapsed) {
      setBottomHeightState(prevBottomHeight.current);
      setBottomCollapsed(false);
    }
  }, [bottomCollapsed]);
  
  // Reset layout
  const resetLayout = useCallback(() => {
    setLeftWidthState(opts.initialLeftWidth);
    setRightWidthState(opts.initialRightWidth);
    setBottomHeightState(opts.initialBottomHeight);
    setLeftCollapsed(false);
    setRightCollapsed(false);
    setBottomCollapsed(false);
    setActiveView(opts.initialActiveView);
    prevLeftWidth.current = opts.initialLeftWidth;
    prevRightWidth.current = opts.initialRightWidth;
    prevBottomHeight.current = opts.initialBottomHeight;
  }, [opts]);
  
  return {
    // State
    leftWidth,
    rightWidth,
    bottomHeight,
    leftCollapsed,
    rightCollapsed,
    bottomCollapsed,
    activeView,
    
    // Actions
    setLeftWidth,
    setRightWidth,
    setBottomHeight,
    toggleLeft,
    toggleRight,
    toggleBottom,
    collapseLeft,
    collapseRight,
    collapseBottom,
    expandLeft,
    expandRight,
    expandBottom,
    setActiveView,
    resetLayout,
  };
}
