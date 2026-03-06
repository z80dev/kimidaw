/**
 * Meter Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { Meter } from '../Meter.js';

describe('Meter', () => {
  it('renders canvas', () => {
    render(<Meter level={-12} />);
    expect(document.querySelector('canvas')).toBeTruthy();
  });

  it('renders with custom dimensions', () => {
    render(<Meter level={-6} width={20} height={200} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('renders with peak hold', () => {
    render(<Meter level={-12} peak={-3} showPeakHold />);
    expect(document.querySelector('canvas')).toBeTruthy();
  });

  it('handles different dB ranges', () => {
    render(<Meter level={-30} minDb={-60} maxDb={0} />);
    expect(document.querySelector('canvas')).toBeTruthy();
  });
});
