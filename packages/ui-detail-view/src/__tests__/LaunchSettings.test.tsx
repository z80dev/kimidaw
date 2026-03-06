import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LaunchSettings } from '../LaunchSettings.js';
import type { MidiClip } from '@daw/project-schema';

describe('LaunchSettings', () => {
  const mockClip: MidiClip = {
    id: 'clip_test_123',
    startTick: 0,
    endTick: 960,
    loop: null,
    notes: [
      { id: 'n1', pitch: 60, velocity: 100, startTick: 0, durationTicks: 240, channel: 1 }
    ],
    cc: [],
    pitchBend: [],
    channelPressure: [],
    polyAftertouch: []
  };

  it('renders launch settings', () => {
    render(<LaunchSettings clip={mockClip} />);
    
    expect(screen.getByText('Quantization')).toBeDefined();
    expect(screen.getByText('Launch Mode')).toBeDefined();
    expect(screen.getByText('Follow Action')).toBeDefined();
  });

  it('allows changing quantization', () => {
    const onChange = vi.fn();
    render(<LaunchSettings clip={mockClip} onSettingsChange={onChange} />);
    
    const select = screen.getByRole('combobox', { name: /quantization/i }) || 
                   document.querySelector('.quantization-select');
    
    if (select) {
      fireEvent.change(select, { target: { value: '16th' } });
    }
  });

  it('allows enabling follow action', () => {
    render(<LaunchSettings clip={mockClip} />);
    
    const checkbox = screen.getByLabelText(/enable follow action/i);
    fireEvent.click(checkbox);
    
    // Follow action options should appear
    expect(screen.getByText(/action:/i)).toBeDefined();
    expect(screen.getByText(/after:/i)).toBeDefined();
    expect(screen.getByText(/chance:/i)).toBeDefined();
  });

  it('displays clip info', () => {
    render(<LaunchSettings clip={mockClip} />);
    
    expect(screen.getByText(/clip info/i)).toBeDefined();
    expect(screen.getByText(/notes:/i)).toBeDefined();
  });
});
