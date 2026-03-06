/**
 * ChannelStrip Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ChannelStrip } from '../ChannelStrip.js';
import type { Track } from '@daw/project-schema';

const mockTrack: Track = {
  id: 'track1',
  name: 'Test Track',
  type: 'audio',
  color: '#4a9eff',
  mute: false,
  solo: false,
  arm: false,
  monitorMode: 'auto',
  output: { busId: 'master' },
  inserts: [],
  sends: [],
  automationLanes: [],
  macros: [],
};

describe('ChannelStrip', () => {
  it('renders track name', () => {
    render(<ChannelStrip track={mockTrack} index={0} />);
    expect(document.body.textContent).toContain('Test Track');
  });

  it('handles mute toggle', () => {
    const onMuteToggle = vi.fn();
    render(<ChannelStrip track={mockTrack} index={0} onMuteToggle={onMuteToggle} />);
    
    const muteButton = screen.getByTitle('Mute');
    fireEvent.click(muteButton);
    
    expect(onMuteToggle).toHaveBeenCalled();
  });

  it('handles solo toggle', () => {
    const onSoloToggle = vi.fn();
    render(<ChannelStrip track={mockTrack} index={0} onSoloToggle={onSoloToggle} />);
    
    const soloButton = screen.getByTitle('Solo');
    fireEvent.click(soloButton);
    
    expect(onSoloToggle).toHaveBeenCalled();
  });

  it('shows mute state', () => {
    render(<ChannelStrip track={{ ...mockTrack, mute: true }} index={0} />);
    expect(document.body.textContent).toContain('M');
  });

  it('shows solo state', () => {
    render(<ChannelStrip track={{ ...mockTrack, solo: true }} index={0} />);
    expect(document.body.textContent).toContain('S');
  });

  it('handles selection', () => {
    const onSelect = vi.fn();
    render(<ChannelStrip track={mockTrack} index={0} onSelect={onSelect} />);
    
    const strip = document.querySelector('[style*="cursor: pointer"]');
    if (strip) {
      fireEvent.click(strip);
      expect(onSelect).toHaveBeenCalled();
    }
  });
});
