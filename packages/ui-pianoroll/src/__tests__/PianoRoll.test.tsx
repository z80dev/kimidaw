/**
 * PianoRoll Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PianoRoll } from '../PianoRoll.js';
import type { MidiClip } from '@daw/project-schema';

const mockClip: MidiClip = {
  id: 'clip1',
  startTick: 0,
  endTick: 960 * 4,
  loop: null,
  notes: [
    { id: 'n1', pitch: 60, velocity: 100, startTick: 0, duration: 480 },
    { id: 'n2', pitch: 64, velocity: 90, startTick: 480, duration: 480 },
  ],
  cc: [],
  pitchBend: [],
  channelPressure: [],
  polyAftertouch: [],
};

describe('PianoRoll', () => {
  it('renders without clip', () => {
    render(<PianoRoll clip={null} />);
    expect(document.querySelector('canvas')).toBeTruthy();
  });

  it('renders with clip', () => {
    render(<PianoRoll clip={mockClip} />);
    expect(document.querySelectorAll('canvas').length).toBeGreaterThan(0);
  });

  it('shows note count', () => {
    render(<PianoRoll clip={mockClip} />);
    expect(document.body.textContent).toContain('2 notes');
  });

  it('handles input mode prop', () => {
    const { rerender } = render(<PianoRoll clip={mockClip} inputMode="select" />);
    rerender(<PianoRoll clip={mockClip} inputMode="draw" />);
    expect(document.querySelector('canvas')).toBeTruthy();
  });
});
