/**
 * ZoomController Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { ZoomController } from '../interactions/zoom.js';

describe('ZoomController', () => {
  it('creates with default state', () => {
    const zoom = new ZoomController();
    const state = zoom.getState();
    
    expect(state.pixelsPerTick).toBe(0.1);
    expect(state.trackHeight).toBe(64);
    expect(state.startTick).toBe(0);
  });

  it('zooms in', () => {
    const onZoomChange = vi.fn();
    const zoom = new ZoomController({ onZoomChange });
    
    const initialZoom = zoom.getState().pixelsPerTick;
    zoom.zoomIn();
    
    expect(zoom.getState().pixelsPerTick).toBeGreaterThan(initialZoom);
    expect(onZoomChange).toHaveBeenCalled();
  });

  it('zooms out', () => {
    const zoom = new ZoomController();
    
    const initialZoom = zoom.getState().pixelsPerTick;
    zoom.zoomOut();
    
    expect(zoom.getState().pixelsPerTick).toBeLessThan(initialZoom);
  });

  it('respects zoom constraints', () => {
    const zoom = new ZoomController({
      minZoom: 0.1,
      maxZoom: 1.0,
    });
    
    // Try to zoom in past max
    zoom.setHorizontalZoom(100);
    expect(zoom.getState().pixelsPerTick).toBe(1.0);
    
    // Try to zoom out past min
    zoom.setHorizontalZoom(0.001);
    expect(zoom.getState().pixelsPerTick).toBe(0.1);
  });

  it('converts screen to tick', () => {
    const zoom = new ZoomController({
      initialState: {
        pixelsPerTick: 0.5,
        startTick: 100,
      },
    });
    
    expect(zoom.screenToTick(0)).toBe(100);
    expect(zoom.screenToTick(100)).toBe(300);
  });

  it('converts tick to screen', () => {
    const zoom = new ZoomController({
      initialState: {
        pixelsPerTick: 0.5,
        startTick: 100,
      },
    });
    
    expect(zoom.tickToScreen(100)).toBe(0);
    expect(zoom.tickToScreen(300)).toBe(100);
  });

  it('pans to tick', () => {
    const onPanChange = vi.fn();
    const zoom = new ZoomController({ onPanChange });
    
    zoom.panTo(500);
    
    expect(zoom.getState().startTick).toBe(500);
    expect(onPanChange).toHaveBeenCalled();
  });

  it('centers on tick', () => {
    const zoom = new ZoomController({
      initialState: { pixelsPerTick: 1 },
    });
    
    zoom.centerOn(500, 200);
    
    // With 200px width at 1px per tick, visible range is 200 ticks
    // Centering on 500 should put start at 500 - 100 = 400
    expect(zoom.getState().startTick).toBe(400);
  });

  it('zooms to fit range', () => {
    const zoom = new ZoomController();
    
    // Fit 16 bars (960 * 16 ticks) into 800px
    zoom.zoomToFit(0, 960 * 16, 800);
    
    const state = zoom.getState();
    expect(state.pixelsPerTick).toBeGreaterThan(0);
    expect(state.startTick).toBe(0);
  });

  it('handles track height changes', () => {
    const zoom = new ZoomController({
      minTrackHeight: 32,
      maxTrackHeight: 128,
    });
    
    zoom.increaseTrackHeight();
    expect(zoom.getState().trackHeight).toBeGreaterThan(64);
    
    zoom.decreaseTrackHeight();
    expect(zoom.getState().trackHeight).toBe(64);
  });

  it('respects track height constraints', () => {
    const zoom = new ZoomController({
      minTrackHeight: 32,
      maxTrackHeight: 64,
    });
    
    zoom.setTrackHeight(100);
    expect(zoom.getState().trackHeight).toBe(64);
    
    zoom.setTrackHeight(10);
    expect(zoom.getState().trackHeight).toBe(32);
  });

  it('reports max/min zoom state', () => {
    const zoom = new ZoomController({
      minZoom: 0.1,
      maxZoom: 1.0,
      initialState: { pixelsPerTick: 0.1 },
    });
    
    expect(zoom.isMinZoom()).toBe(true);
    expect(zoom.isMaxZoom()).toBe(false);
    
    zoom.setHorizontalZoom(1.0);
    expect(zoom.isMinZoom()).toBe(false);
    expect(zoom.isMaxZoom()).toBe(true);
  });
});
