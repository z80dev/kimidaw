import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock crypto.randomUUID for tests
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2),
  },
});

// Mock performance.now
Object.defineProperty(globalThis, 'performance', {
  value: {
    now: () => Date.now(),
  },
});

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame
globalThis.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  return setTimeout(callback, 16) as unknown as number;
});

globalThis.cancelAnimationFrame = vi.fn((id: number) => {
  clearTimeout(id);
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Suppress console errors/warnings during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: unknown[]) => {
  // Filter out React warnings
  if (typeof args[0] === 'string' && args[0].includes('React')) return;
  originalConsoleError(...args);
};

console.warn = (...args: unknown[]) => {
  // Filter out specific warnings
  if (typeof args[0] === 'string' && args[0].includes('act')) return;
  originalConsoleWarn(...args);
};
