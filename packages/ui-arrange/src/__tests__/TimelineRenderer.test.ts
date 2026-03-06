/**
 * TimelineRenderer Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { TimelineRenderer } from '../canvas/TimelineRenderer.js';
import type { ArrangeViewport, ArrangeConfig } from '../types.js';

// Mock canvas context
const mockCtx = {
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  fillText: vi.fn(),
  scale: vi.fn(),
} as unknown as CanvasRenderingContext2D;

describe('TimelineRenderer', () => {
  const defaultViewport: ArrangeViewport = {
    startTick: 0,
    endTick: 960 * 16,
    startTrackIndex: 0,
    visibleTrackCount: 10,
    pixelsPerTick: 0.1,
    trackHeight: 64,
  };
  
  const defaultConfig: ArrangeConfig = {
    showMinorGrid: true,
    showBarNumbers: true,
    snapToGrid: true,
    snapDivision: 4,
    showClipNames: true,
    showWaveforms: true,
    showAutomation: true,
    showLoopBraces: true,
    minZoom: 0.01,
    maxZoom: 10,
    minTrackHeight: 32,
    maxTrackHeight: 256,
  };

  it('creates a renderer instance', () => {
    const renderer = new TimelineRenderer(mockCtx, {
      width: 800,
      height: 600,
      viewport: defaultViewport,
      config: defaultConfig,
    });
    
    expect(renderer).toBeDefined();
  });

  it('calculates grid lines', () => {
    const renderer = new TimelineRenderer(mockCtx, {
      width: 800,
      height: 600,
      viewport: defaultViewport,
      config: defaultConfig,
      ppq: 960,
    });
    
    const lines = renderer.calculateGridLines(0, 960 * 4);
    
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some(l => l.isBar)).toBe(true);
  });

  it('handles different zoom levels', () => {
    const zoomedViewport = {
      ...defaultViewport,
      pixelsPerTick: 0.5, // More zoomed in
    };
    
    const renderer = new TimelineRenderer(mockCtx, {
      width: 800,
      height: 600,
      viewport: zoomedViewport,
      config: defaultConfig,
    });
    
    expect(renderer).toBeDefined();
    renderer.render();
  });
});
