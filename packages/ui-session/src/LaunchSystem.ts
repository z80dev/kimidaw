/**
 * Launch System
 * Core logic for clip and scene launching with quantization and legato
 */

import type {
  Clip,
  ClipSlot,
  Scene,
  Track,
  LaunchMode,
  QuantizationValue,
  ClipLaunchSettings,
} from './types';
import {
  calculateLaunchTime,
  getQuantizationTicks,
  getLaunchCountdown,
} from './utils/quantization';

export interface LaunchQueueItem {
  id: string;
  type: 'clip' | 'scene';
  targetId: string;
  slotId?: string;
  trackId?: string;
  scheduledTick: number;
  velocity?: number;
  launchSettings: ClipLaunchSettings;
}

export interface LaunchSystemState {
  queue: LaunchQueueItem[];
  currentlyPlaying: Map<string, string>; // slotId -> clipId
  queuedItems: Map<string, LaunchQueueItem>; // slotId -> item
}

export interface TransportState {
  isPlaying: boolean;
  currentTick: number;
  tempo: number;
  globalQuantization: QuantizationValue;
}

export interface LaunchSystemOptions {
  onClipLaunch?: (clipId: string, slotId: string, velocity?: number) => void;
  onSceneLaunch?: (sceneId: string) => void;
  onClipStop?: (clipId: string, slotId: string) => void;
  onSceneStop?: (sceneId: string) => void;
}

/**
 * Launch System class
 * Manages clip/scene launching with quantization
 */
export class LaunchSystem {
  private state: LaunchSystemState = {
    queue: [],
    currentlyPlaying: new Map(),
    queuedItems: new Map(),
  };
  
  private options: LaunchSystemOptions;
  
  constructor(options: LaunchSystemOptions = {}) {
    this.options = options;
  }
  
  /**
   * Queue a clip for launch
   */
  queueClipLaunch(
    clip: Clip,
    slot: ClipSlot,
    transport: TransportState,
    velocity?: number
  ): LaunchQueueItem {
    // Remove any existing queued item for this slot
    this.cancelQueuedClip(slot.id);
    
    const settings = clip.launchSettings;
    const scheduledTick = settings.launchMode === 'gate' && !transport.isPlaying
      ? transport.currentTick
      : calculateLaunchTime(
          transport.currentTick,
          settings.quantization,
          settings.quantization === 'global' ? transport.globalQuantization : undefined
        );
    
    const item: LaunchQueueItem = {
      id: crypto.randomUUID(),
      type: 'clip',
      targetId: clip.id,
      slotId: slot.id,
      trackId: slot.trackId,
      scheduledTick,
      velocity,
      launchSettings: settings,
    };
    
    this.state.queue.push(item);
    this.state.queuedItems.set(slot.id, item);
    
    // Sort queue by scheduled tick
    this.state.queue.sort((a, b) => a.scheduledTick - b.scheduledTick);
    
    return item;
  }
  
  /**
   * Queue a scene for launch
   */
  queueSceneLaunch(
    scene: Scene,
    slots: ClipSlot[],
    clips: Map<string, Clip>,
    transport: TransportState
  ): LaunchQueueItem[] {
    const items: LaunchQueueItem[] = [];
    
    // Find all clips in this scene
    const sceneSlots = slots.filter(s => s.sceneId === scene.id && s.clipId);
    
    for (const slot of sceneSlots) {
      if (!slot.clipId) continue;
      
      const clip = clips.get(slot.clipId);
      if (!clip) continue;
      
      const item = this.queueClipLaunch(clip, slot, transport);
      items.push(item);
    }
    
    return items;
  }
  
  /**
   * Stop a playing clip
   */
  stopClip(
    clipId: string,
    slotId: string,
    transport: TransportState,
    quantization: QuantizationValue = 'global'
  ): void {
    const currentClipId = this.state.currentlyPlaying.get(slotId);
    
    if (currentClipId === clipId) {
      // Schedule stop with quantization
      const stopTick = calculateLaunchTime(
        transport.currentTick,
        quantization,
        quantization === 'global' ? transport.globalQuantization : undefined
      );
      
      // For gate mode, stop immediately
      if (transport.isPlaying) {
        // Schedule for quantized stop
        this.state.currentlyPlaying.delete(slotId);
        this.options.onClipStop?.(clipId, slotId);
      }
    }
    
    // Cancel any queued launch for this slot
    this.cancelQueuedClip(slotId);
  }
  
  /**
   * Stop all clips
   */
  stopAllClips(transport: TransportState): void {
    for (const [slotId, clipId] of this.state.currentlyPlaying.entries()) {
      this.options.onClipStop?.(clipId, slotId);
    }
    this.state.currentlyPlaying.clear();
    
    // Clear queue
    this.state.queue = [];
    this.state.queuedItems.clear();
  }
  
  /**
   * Cancel a queued clip launch
   */
  cancelQueuedClip(slotId: string): void {
    const item = this.state.queuedItems.get(slotId);
    if (item) {
      this.state.queue = this.state.queue.filter(i => i.id !== item.id);
      this.state.queuedItems.delete(slotId);
    }
  }
  
  /**
   * Process the launch queue based on current transport position
   * Should be called on each transport update
   */
  processQueue(transport: TransportState): LaunchQueueItem[] {
    const launched: LaunchQueueItem[] = [];
    const itemsToRemove: string[] = [];
    
    for (const item of this.state.queue) {
      if (transport.currentTick >= item.scheduledTick) {
        // Launch the clip
        if (item.type === 'clip' && item.slotId) {
          this.executeClipLaunch(item);
          launched.push(item);
          itemsToRemove.push(item.id);
        }
      }
    }
    
    // Remove launched items from queue
    this.state.queue = this.state.queue.filter(i => !itemsToRemove.includes(i.id));
    for (const item of launched) {
      if (item.slotId) {
        this.state.queuedItems.delete(item.slotId);
      }
    }
    
    return launched;
  }
  
  /**
   * Execute a clip launch
   */
  private executeClipLaunch(item: LaunchQueueItem): void {
    if (!item.slotId || !item.trackId) return;
    
    const { launchSettings } = item;
    
    // Handle different launch modes
    switch (launchSettings.launchMode) {
      case 'trigger':
        // Start playing, don't stop until explicitly stopped
        this.state.currentlyPlaying.set(item.slotId, item.targetId);
        this.options.onClipLaunch?.(item.targetId, item.slotId, item.velocity);
        break;
        
      case 'gate':
        // Play while button is held (handled separately)
        this.state.currentlyPlaying.set(item.slotId, item.targetId);
        this.options.onClipLaunch?.(item.targetId, item.slotId, item.velocity);
        break;
        
      case 'toggle':
        // Toggle play/stop
        if (this.state.currentlyPlaying.get(item.slotId) === item.targetId) {
          this.state.currentlyPlaying.delete(item.slotId);
          this.options.onClipStop?.(item.targetId, item.slotId);
        } else {
          this.state.currentlyPlaying.set(item.slotId, item.targetId);
          this.options.onClipLaunch?.(item.targetId, item.slotId, item.velocity);
        }
        break;
        
      case 'repeat':
        // Re-trigger on each click
        this.state.currentlyPlaying.set(item.slotId, item.targetId);
        this.options.onClipLaunch?.(item.targetId, item.slotId, item.velocity);
        break;
    }
  }
  
  /**
   * Handle gate mode release
   */
  handleGateRelease(slotId: string, transport: TransportState): void {
    const clipId = this.state.currentlyPlaying.get(slotId);
    if (clipId) {
      this.state.currentlyPlaying.delete(slotId);
      this.options.onClipStop?.(clipId, slotId);
    }
  }
  
  /**
   * Get the countdown for a queued item
   */
  getQueueCountdown(item: LaunchQueueItem, currentTick: number): number {
    return getLaunchCountdown(currentTick, item.scheduledTick);
  }
  
  /**
   * Get current launch system state
   */
  getState(): LaunchSystemState {
    return {
      queue: [...this.state.queue],
      currentlyPlaying: new Map(this.state.currentlyPlaying),
      queuedItems: new Map(this.state.queuedItems),
    };
  }
  
  /**
   * Check if a clip is currently playing
   */
  isClipPlaying(clipId: string, slotId: string): boolean {
    return this.state.currentlyPlaying.get(slotId) === clipId;
  }
  
  /**
   * Check if a clip is queued
   */
  isClipQueued(slotId: string): boolean {
    return this.state.queuedItems.has(slotId);
  }
  
  /**
   * Get the queued item for a slot
   */
  getQueuedItem(slotId: string): LaunchQueueItem | undefined {
    return this.state.queuedItems.get(slotId);
  }
  
  /**
   * Clear all queued items
   */
  clearQueue(): void {
    this.state.queue = [];
    this.state.queuedItems.clear();
  }
  
  /**
   * Reset the launch system
   */
  reset(): void {
    this.state = {
      queue: [],
      currentlyPlaying: new Map(),
      queuedItems: new Map(),
    };
  }
}

/**
 * Create default launch settings
 */
export function createDefaultLaunchSettings(): ClipLaunchSettings {
  return {
    launchMode: 'trigger',
    quantization: 'global',
    velocity: false,
    legato: false,
  };
}

/**
 * Create legato launch settings
 */
export function createLegatoLaunchSettings(): ClipLaunchSettings {
  return {
    launchMode: 'trigger',
    quantization: 'none',
    velocity: false,
    legato: true,
  };
}
