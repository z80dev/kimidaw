/**
 * Hot-swap functionality for browser
 * Replace current device/preset with selection from browser
 */

import type { HotSwapContext, HotSwapManager, BrowserItem } from './types.js';

export interface HotSwapState {
  isActive: boolean;
  context: HotSwapContext | null;
  lastSelection: BrowserItem | null;
}

export function createHotSwapManager(): HotSwapManager {
  const state: HotSwapState = {
    isActive: false,
    context: null,
    lastSelection: null,
  };

  const listeners: Array<(state: HotSwapState) => void> = [];

  function notifyListeners(): void {
    for (const listener of listeners) {
      listener({ ...state });
    }
  }

  function enter(context: HotSwapContext): void {
    state.isActive = true;
    state.context = { ...context };
    notifyListeners();
  }

  function exit(): void {
    state.isActive = false;
    state.context = null;
    notifyListeners();
  }

  function isActive(): boolean {
    return state.isActive;
  }

  function getContext(): HotSwapContext | null {
    return state.context;
  }

  function select(item: BrowserItem): void {
    if (!state.isActive || !state.context) return;

    state.lastSelection = item;

    // In a real implementation, this would:
    // 1. Validate that the item is compatible with the current device slot
    // 2. Load the preset/device
    // 3. Replace the current device/preset
    // 4. Keep hot-swap active for further selection

    // Notify about selection
    notifyListeners();
  }

  function onStateChange(listener: (state: HotSwapState) => void): () => void {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  }

  return {
    enter,
    exit,
    isActive,
    getContext,
    select,
    onStateChange,
  };
}

/**
 * Filter items for hot-swap context
 * Only show compatible items
 */
export function filterCompatibleItems(
  items: BrowserItem[],
  context: HotSwapContext
): BrowserItem[] {
  return items.filter(item => isCompatible(item, context));
}

function isCompatible(item: BrowserItem, context: HotSwapContext): boolean {
  // Device type matching
  const itemType = inferDeviceType(item);
  
  if (context.deviceType && itemType) {
    return context.deviceType === itemType ||
           isCompatibleType(context.deviceType, itemType);
  }

  return true;
}

function inferDeviceType(item: BrowserItem): string | null {
  // Infer device type from category and path
  switch (item.category) {
    case 'instruments':
      return 'instrument';
    case 'audio-effects':
      return 'audio-effect';
    case 'midi-effects':
      return 'midi-effect';
    default:
      return null;
  }
}

function isCompatibleType(deviceType: string, itemType: string): boolean {
  // Define compatibility rules
  const compatibility: Record<string, string[]> = {
    'instrument': ['instrument'],
    'audio-effect': ['audio-effect'],
    'midi-effect': ['midi-effect'],
  };

  const compatible = compatibility[deviceType];
  return compatible ? compatible.includes(itemType) : false;
}

/**
 * Quick-swap with previous/next preset
 */
export interface QuickSwapManager {
  setCurrentPreset(deviceId: string, presetId: string, allPresets: string[]): void;
  next(): string | null;
  previous(): string | null;
  canGoNext(): boolean;
  canGoPrevious(): boolean;
}

export function createQuickSwapManager(): QuickSwapManager {
  let deviceId: string | null = null;
  let currentIndex = -1;
  let presets: string[] = [];

  function setCurrentPreset(
    newDeviceId: string,
    presetId: string,
    allPresets: string[]
  ): void {
    deviceId = newDeviceId;
    presets = [...allPresets];
    currentIndex = presets.indexOf(presetId);
  }

  function next(): string | null {
    if (!canGoNext()) return null;
    currentIndex++;
    return presets[currentIndex];
  }

  function previous(): string | null {
    if (!canGoPrevious()) return null;
    currentIndex--;
    return presets[currentIndex];
  }

  function canGoNext(): boolean {
    return currentIndex >= 0 && currentIndex < presets.length - 1;
  }

  function canGoPrevious(): boolean {
    return currentIndex > 0;
  }

  return {
    setCurrentPreset,
    next,
    previous,
    canGoNext,
    canGoPrevious,
  };
}
