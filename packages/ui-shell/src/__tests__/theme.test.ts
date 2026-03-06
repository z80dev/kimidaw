/**
 * Theme Tests
 */

import { describe, it, expect } from 'vitest';
import { DAW_COLORS, DAW_TYPOGRAPHY, DAW_SPACING, defaultTheme, generateCSSVariables } from '../theme.js';

describe('Theme', () => {
  it('exports color palette', () => {
    expect(DAW_COLORS.bgDark).toBeDefined();
    expect(DAW_COLORS.textPrimary).toBeDefined();
    expect(DAW_COLORS.accentBlue).toBeDefined();
  });

  it('exports typography scale', () => {
    expect(DAW_TYPOGRAPHY.fontFamilyMono).toBeDefined();
    expect(DAW_TYPOGRAPHY.sizeBase).toBeDefined();
  });

  it('exports spacing scale', () => {
    expect(DAW_SPACING[1]).toBe('4px');
    expect(DAW_SPACING[2]).toBe('8px');
  });

  it('provides default theme', () => {
    expect(defaultTheme.colors).toBe(DAW_COLORS);
    expect(defaultTheme.typography).toBe(DAW_TYPOGRAPHY);
    expect(defaultTheme.spacing).toBe(DAW_SPACING);
    expect(defaultTheme.mode).toBe('dark');
  });

  it('generates CSS variables', () => {
    const css = generateCSSVariables(defaultTheme);
    
    expect(css).toContain('--daw-bgDark');
    expect(css).toContain('--daw-textPrimary');
    expect(css).toContain('--daw-accentBlue');
  });

  it('has consistent color contrast', () => {
    // Ensure text colors contrast with background
    expect(DAW_COLORS.textPrimary).not.toBe(DAW_COLORS.bgDark);
    expect(DAW_COLORS.textSecondary).not.toBe(DAW_COLORS.bgMedium);
  });

  it('has all required semantic colors', () => {
    expect(DAW_COLORS.success).toBeDefined();
    expect(DAW_COLORS.warning).toBeDefined();
    expect(DAW_COLORS.error).toBeDefined();
    expect(DAW_COLORS.info).toBeDefined();
  });

  it('has transport state colors', () => {
    expect(DAW_COLORS.play).toBeDefined();
    expect(DAW_COLORS.record).toBeDefined();
    expect(DAW_COLORS.stop).toBeDefined();
  });

  it('has grid and selection colors', () => {
    expect(DAW_COLORS.gridMajor).toBeDefined();
    expect(DAW_COLORS.gridMinor).toBeDefined();
    expect(DAW_COLORS.selection).toBeDefined();
    expect(DAW_COLORS.playhead).toBeDefined();
  });
});
