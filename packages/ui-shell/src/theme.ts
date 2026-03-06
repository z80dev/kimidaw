/**
 * Theme system for the In-Browser DAW
 * 
 * Dark theme first design with high contrast, performance-focused colors.
 * Optimized for long editing sessions and professional audio workflows.
 */

import { createContext, useContext } from 'react';

/**
 * Core color palette for the DAW
 * All colors are designed for dark theme with appropriate contrast ratios
 */
export const DAW_COLORS = {
  // Background hierarchy
  bgDarkest: '#0a0a0c',      // Deepest background
  bgDark: '#121216',         // Main app background
  bgMedium: '#1a1a1f',       // Panel backgrounds
  bgLight: '#222228',        // Elevated surfaces
  bgLighter: '#2a2a32',      // Hover states
  
  // Surface colors
  surfacePrimary: '#1e1e24',
  surfaceSecondary: '#26262e',
  surfaceTertiary: '#2e2e38',
  
  // Border colors
  borderSubtle: '#2a2a32',
  borderDefault: '#33333d',
  borderStrong: '#40404c',
  
  // Text colors
  textPrimary: '#f0f0f5',
  textSecondary: '#a0a0b0',
  textTertiary: '#707080',
  textDisabled: '#505060',
  
  // Accent colors - track colors
  accentBlue: '#4a9eff',
  accentGreen: '#4ade80',
  accentYellow: '#facc15',
  accentOrange: '#fb923c',
  accentRed: '#f87171',
  accentPurple: '#a78bfa',
  accentPink: '#f472b6',
  accentCyan: '#22d3ee',
  
  // Functional colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Transport states
  play: '#22c55e',
  record: '#ef4444',
  pause: '#f59e0b',
  stop: '#6b7280',
  
  // Selection
  selection: 'rgba(74, 158, 255, 0.3)',
  selectionBorder: '#4a9eff',
  
  // Grid lines
  gridMajor: '#33333d',
  gridMinor: '#26262e',
  gridBar: '#40404c',
  
  // Playhead
  playhead: '#ffffff',
  playheadLine: 'rgba(255, 255, 255, 0.8)',
  
  // Clip colors (default palette)
  clipBlue: '#3b82f6',
  clipGreen: '#22c55e',
  clipYellow: '#eab308',
  clipOrange: '#f97316',
  clipRed: '#ef4444',
  clipPurple: '#8b5cf6',
  clipPink: '#ec4899',
  clipCyan: '#06b6d4',
} as const;

/**
 * Typography scale optimized for dense UIs
 */
export const DAW_TYPOGRAPHY = {
  // Font families
  fontFamilyMono: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
  fontFamilySans: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
  
  // Font sizes
  sizeXs: '10px',
  sizeSm: '11px',
  sizeBase: '12px',
  sizeMd: '13px',
  sizeLg: '14px',
  sizeXl: '16px',
  size2xl: '18px',
  size3xl: '20px',
  
  // Line heights
  leadingNone: '1',
  leadingTight: '1.25',
  leadingNormal: '1.5',
  
  // Font weights
  weightNormal: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '700',
  
  // Letter spacing
  trackingTight: '-0.01em',
  trackingNormal: '0',
  trackingWide: '0.01em',
} as const;

/**
 * Spacing scale for consistent layouts
 */
export const DAW_SPACING = {
  px: '1px',
  0: '0',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  
  // Specific UI dimensions
  trackHeight: '64px',
  trackHeightMin: '32px',
  trackHeightMax: '256px',
  headerHeight: '40px',
  transportHeight: '48px',
  inspectorWidth: '280px',
  browserWidth: '240px',
  timelineRulerHeight: '28px',
} as const;

/**
 * Z-index scale for layering
 */
export const DAW_Z_INDEX = {
  base: 0,
  content: 10,
  header: 100,
  panel: 200,
  overlay: 300,
  dropdown: 400,
  modal: 500,
  tooltip: 600,
  playhead: 1000,
} as const;

/**
 * Shadow definitions for elevation
 */
export const DAW_SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.4)',
} as const;

/**
 * Complete theme type definition
 */
export interface ThemeColors {
  bgDarkest: string;
  bgDark: string;
  bgMedium: string;
  bgLight: string;
  bgLighter: string;
  surfacePrimary: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  accentBlue: string;
  accentGreen: string;
  accentYellow: string;
  accentOrange: string;
  accentRed: string;
  accentPurple: string;
  accentPink: string;
  accentCyan: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  play: string;
  record: string;
  pause: string;
  stop: string;
  selection: string;
  selectionBorder: string;
  gridMajor: string;
  gridMinor: string;
  gridBar: string;
  playhead: string;
  playheadLine: string;
  clipBlue: string;
  clipGreen: string;
  clipYellow: string;
  clipOrange: string;
  clipRed: string;
  clipPurple: string;
  clipPink: string;
  clipCyan: string;
}

export interface Theme {
  colors: ThemeColors;
  typography: typeof DAW_TYPOGRAPHY;
  spacing: typeof DAW_SPACING;
  zIndex: typeof DAW_Z_INDEX;
  shadows: typeof DAW_SHADOWS;
  mode: 'dark' | 'light';
}

/**
 * Default dark theme
 */
export const defaultTheme: Theme = {
  colors: DAW_COLORS,
  typography: DAW_TYPOGRAPHY,
  spacing: DAW_SPACING,
  zIndex: DAW_Z_INDEX,
  shadows: DAW_SHADOWS,
  mode: 'dark',
};

/**
 * React context for theme
 */
const ThemeContext = createContext<Theme>(defaultTheme);

/**
 * Theme provider component
 */
export const ThemeProvider = ThemeContext.Provider;

/**
 * Hook to access the current theme
 */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * CSS variable generator for theming
 * Outputs CSS custom properties that can be used in stylesheets
 */
export function generateCSSVariables(theme: Theme = defaultTheme): string {
  const vars: string[] = [];
  
  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    vars.push(`--daw-${key}: ${value};`);
  });
  
  // Typography
  Object.entries(theme.typography).forEach(([key, value]) => {
    vars.push(`--daw-${key}: ${value};`);
  });
  
  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    if (!isNaN(Number(key))) {
      vars.push(`--daw-space-${key}: ${value};`);
    } else {
      vars.push(`--daw-${key}: ${value};`);
    }
  });
  
  // Z-index
  Object.entries(theme.zIndex).forEach(([key, value]) => {
    vars.push(`--daw-z-${key}: ${value};`);
  });
  
  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    const varKey = key === 'DEFAULT' ? 'shadow' : `shadow-${key}`;
    vars.push(`--daw-${varKey}: ${value};`);
  });
  
  return vars.join('\n');
}
