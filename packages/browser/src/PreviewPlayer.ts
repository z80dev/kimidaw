/**
 * Preview audio engine for browser
 */

import type { PreviewPlayer as IPreviewPlayer, PreviewOptions, BrowserItem } from './types.js';
import { DEFAULT_PREVIEW_OPTIONS } from './types.js';

export interface PreviewPlayerState {
  isPlaying: boolean;
  currentItem: BrowserItem | null;
  currentTime: number;
  duration: number;
  volume: number;
}

export function createPreviewPlayer(
  options: Partial<PreviewOptions> = {}
): IPreviewPlayer & { getState(): PreviewPlayerState } {
  const settings = { ...DEFAULT_PREVIEW_OPTIONS, ...options };

  let audioContext: AudioContext | null = null;
  let sourceNode: AudioBufferSourceNode | null = null;
  let gainNode: GainNode | null = null;
  let currentBuffer: AudioBuffer | null = null;
  let currentItem: BrowserItem | null = null;
  let startTime = 0;
  let pauseTime = 0;
  let isPlaying = false;

  function getAudioContext(): AudioContext {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    return audioContext;
  }

  async function load(item: BrowserItem): Promise<void> {
    // Stop current preview
    stop();

    currentItem = item;

    if (!item.hasPreview) {
      return;
    }

    try {
      // In a real implementation, load the audio file
      // For now, we'll create a dummy buffer
      const ctx = getAudioContext();
      
      // Load actual audio file
      const response = await fetch(item.path);
      const arrayBuffer = await response.arrayBuffer();
      currentBuffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.warn('Failed to load preview:', error);
      currentBuffer = null;
    }
  }

  function play(): void {
    if (!currentBuffer || isPlaying) return;

    const ctx = getAudioContext();

    // Create nodes
    sourceNode = ctx.createBufferSource();
    sourceNode.buffer = currentBuffer;

    gainNode = ctx.createGain();
    gainNode.gain.value = settings.volume;

    // Connect
    sourceNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Apply fade in
    const fadeInDuration = settings.previewFadeIn / 1000;
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(settings.volume, ctx.currentTime + fadeInDuration);

    // Start playback
    const offset = pauseTime;
    sourceNode.start(0, offset);
    startTime = ctx.currentTime - offset;
    isPlaying = true;

    // Schedule fade out if preview length is limited
    if (settings.previewLength > 0) {
      const fadeOutStart = settings.previewLength - (settings.previewFadeOut / 1000);
      if (fadeOutStart > 0) {
        gainNode.gain.setValueAtTime(settings.volume, ctx.currentTime + fadeOutStart);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + settings.previewLength);
        
        // Auto-stop
        setTimeout(() => {
          stop();
        }, settings.previewLength * 1000);
      }
    }

    // Handle end
    sourceNode.onended = () => {
      isPlaying = false;
      pauseTime = 0;
    };
  }

  function stop(): void {
    if (sourceNode) {
      try {
        sourceNode.stop();
      } catch {
        // Ignore if already stopped
      }
      sourceNode = null;
    }

    isPlaying = false;
    pauseTime = 0;
  }

  function pause(): void {
    if (!isPlaying || !currentBuffer) return;

    pauseTime = getCurrentTime();
    stop();
  }

  function setVolume(volume: number): void {
    settings.volume = Math.max(0, Math.min(1, volume));
    
    if (gainNode && audioContext) {
      gainNode.gain.setValueAtTime(settings.volume, audioContext.currentTime);
    }
  }

  function isPlayingState(): boolean {
    return isPlaying;
  }

  function getDuration(): number {
    return currentBuffer?.duration || 0;
  }

  function getCurrentTime(): number {
    if (!isPlaying || !audioContext) {
      return pauseTime;
    }
    return audioContext.currentTime - startTime;
  }

  function seek(time: number): void {
    if (!currentBuffer) return;

    pauseTime = Math.max(0, Math.min(time, currentBuffer.duration));
    
    if (isPlaying) {
      stop();
      play();
    }
  }

  function getState(): PreviewPlayerState {
    return {
      isPlaying,
      currentItem,
      currentTime: getCurrentTime(),
      duration: getDuration(),
      volume: settings.volume,
    };
  }

  return {
    load,
    play,
    stop,
    pause,
    setVolume,
    isPlaying: isPlayingState,
    getDuration,
    getCurrentTime,
    seek,
    getState,
  };
}

/**
 * Auto-preview manager
 * Automatically previews items on selection
 */
export interface AutoPreviewManager {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  onSelect(item: BrowserItem): void;
  setDelay(delayMs: number): void;
}

export function createAutoPreviewManager(
  previewPlayer: IPreviewPlayer
): AutoPreviewManager {
  let enabled = false;
  let delayMs = 100;
  let pendingPreview: ReturnType<typeof setTimeout> | null = null;

  function enable(): void {
    enabled = true;
  }

  function disable(): void {
    enabled = false;
    cancelPending();
  }

  function isEnabled(): boolean {
    return enabled;
  }

  function onSelect(item: BrowserItem): void {
    if (!enabled) return;

    cancelPending();

    if (!item.hasPreview) return;

    pendingPreview = setTimeout(() => {
      previewPlayer.load(item).then(() => {
        previewPlayer.play();
      });
    }, delayMs);
  }

  function cancelPending(): void {
    if (pendingPreview) {
      clearTimeout(pendingPreview);
      pendingPreview = null;
    }
  }

  function setDelay(delay: number): void {
    delayMs = Math.max(0, delay);
  }

  return {
    enable,
    disable,
    isEnabled,
    onSelect,
    setDelay,
  };
}
