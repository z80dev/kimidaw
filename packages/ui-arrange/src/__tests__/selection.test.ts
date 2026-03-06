/**
 * SelectionModel Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { SelectionModel } from '../interactions/selection.js';

describe('SelectionModel', () => {
  it('creates empty selection', () => {
    const model = new SelectionModel();
    const state = model.getState();
    
    expect(state.tracks.size).toBe(0);
    expect(state.clips.size).toBe(0);
    expect(state.notes.size).toBe(0);
  });

  it('selects a track', () => {
    const model = new SelectionModel();
    
    model.select({ type: 'track', id: 'track1' });
    
    expect(model.isSelected({ type: 'track', id: 'track1' })).toBe(true);
    expect(model.getCount()).toBe(1);
  });

  it('selects a clip', () => {
    const model = new SelectionModel();
    
    model.select({ type: 'clip', id: 'clip1', trackId: 'track1' });
    
    expect(model.isSelected({ type: 'clip', id: 'clip1', trackId: 'track1' })).toBe(true);
  });

  it('clears previous selection on single select', () => {
    const model = new SelectionModel();
    
    model.select({ type: 'track', id: 'track1' });
    model.select({ type: 'track', id: 'track2' });
    
    expect(model.isSelected({ type: 'track', id: 'track1' })).toBe(false);
    expect(model.isSelected({ type: 'track', id: 'track2' })).toBe(true);
  });

  it('toggles selection', () => {
    const model = new SelectionModel();
    
    model.toggle({ type: 'track', id: 'track1' });
    expect(model.isSelected({ type: 'track', id: 'track1' })).toBe(true);
    
    model.toggle({ type: 'track', id: 'track1' });
    expect(model.isSelected({ type: 'track', id: 'track1' })).toBe(false);
  });

  it('clears all selection', () => {
    const model = new SelectionModel();
    
    model.select({ type: 'track', id: 'track1' });
    model.select({ type: 'clip', id: 'clip1', trackId: 'track1' });
    model.clear();
    
    expect(model.getCount()).toBe(0);
    expect(model.hasSelection()).toBe(false);
  });

  it('clears specific type', () => {
    const model = new SelectionModel();
    
    model.select({ type: 'track', id: 'track1' });
    model.select({ type: 'clip', id: 'clip1', trackId: 'track1' });
    
    model.clearType('track');
    
    expect(model.isSelected({ type: 'track', id: 'track1' })).toBe(false);
    expect(model.isSelected({ type: 'clip', id: 'clip1', trackId: 'track1' })).toBe(true);
  });

  it('selects all items', () => {
    const model = new SelectionModel();
    
    model.selectAll('track', ['track1', 'track2', 'track3']);
    
    expect(model.getSelected('track')).toHaveLength(3);
  });

  it('inverts selection', () => {
    const model = new SelectionModel();
    
    model.select({ type: 'track', id: 'track1' });
    model.invert('track', ['track1', 'track2', 'track3']);
    
    expect(model.isSelected({ type: 'track', id: 'track1' })).toBe(false);
    expect(model.isSelected({ type: 'track', id: 'track2' })).toBe(true);
    expect(model.isSelected({ type: 'track', id: 'track3' })).toBe(true);
  });

  it('deselects an item', () => {
    const model = new SelectionModel();
    
    model.select({ type: 'track', id: 'track1' });
    model.deselect({ type: 'track', id: 'track1' });
    
    expect(model.isSelected({ type: 'track', id: 'track1' })).toBe(false);
  });

  it('calls onChange callback', () => {
    const onChange = vi.fn();
    const model = new SelectionModel({ onChange });
    
    model.select({ type: 'track', id: 'track1' });
    
    expect(onChange).toHaveBeenCalled();
  });

  it('tracks primary selection', () => {
    const model = new SelectionModel();
    
    model.select({ type: 'track', id: 'track1' });
    
    expect(model.getPrimary()?.id).toBe('track1');
  });
});
