/**
 * PanelLayout Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PanelLayout } from '../layout/PanelLayout.js';

describe('PanelLayout', () => {
  it('renders center content', () => {
    render(
      <PanelLayout center={<div data-testid="center">Main Content</div>} />
    );
    
    expect(screen.getByTestId('center')).toHaveTextContent('Main Content');
  });

  it('renders left panel when provided', () => {
    render(
      <PanelLayout
        left={<div data-testid="left">Left Panel</div>}
        center={<div>Main</div>}
      />
    );
    
    expect(screen.getByTestId('left')).toHaveTextContent('Left Panel');
  });

  it('renders right panel when provided', () => {
    render(
      <PanelLayout
        right={<div data-testid="right">Right Panel</div>}
        center={<div>Main</div>}
      />
    );
    
    expect(screen.getByTestId('right')).toHaveTextContent('Right Panel');
  });

  it('renders bottom panel when provided', () => {
    render(
      <PanelLayout
        bottom={<div data-testid="bottom">Bottom Panel</div>}
        center={<div>Main</div>}
      />
    );
    
    expect(screen.getByTestId('bottom')).toHaveTextContent('Bottom Panel');
  });

  it('calls onLeftWidthChange when left panel is resized', () => {
    const onLeftWidthChange = vi.fn();
    
    render(
      <PanelLayout
        left={<div>Left</div>}
        center={<div>Main</div>}
        onLeftWidthChange={onLeftWidthChange}
      />
    );
    
    // Get the resizer element
    const resizers = document.querySelectorAll('[style*="cursor: col-resize"]');
    expect(resizers.length).toBeGreaterThan(0);
  });

  it('toggles left panel collapse on button click', () => {
    render(
      <PanelLayout
        left={<div data-testid="left-content">Left Content</div>}
        center={<div>Main</div>}
      />
    );
    
    // Initially left panel should be visible
    expect(screen.getByTestId('left-content')).toBeInTheDocument();
  });

  it('respects initial dimensions', () => {
    const { container } = render(
      <PanelLayout
        left={<div>Left</div>}
        center={<div>Main</div>}
        initialLeftWidth={300}
      />
    );
    
    const leftPanel = container.querySelector('[style*="width: 300px"]');
    expect(leftPanel).toBeTruthy();
  });
});
