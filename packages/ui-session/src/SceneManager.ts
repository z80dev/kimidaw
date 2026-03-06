/**
 * Scene Manager
 * Manages scene creation, organization, and launching
 */

import type { Scene, ClipSlot, Clip, Track } from './types';

export interface SceneManagerState {
  scenes: Map<string, Scene>;
  orderedSceneIds: string[];
  nextSceneIndex: number;
}

export interface CreateSceneOptions {
  name?: string;
  color?: string;
  tempo?: number;
  timeSignature?: { numerator: number; denominator: number };
  insertAfter?: string; // Scene ID to insert after
}

export interface CaptureSceneResult {
  scene: Scene;
  clipsCreated: number;
}

/**
 * Scene Manager class
 * Handles all scene-related operations
 */
export class SceneManager {
  private state: SceneManagerState = {
    scenes: new Map(),
    orderedSceneIds: [],
    nextSceneIndex: 0,
  };
  
  private options: {
    onSceneCreated?: (scene: Scene) => void;
    onSceneDeleted?: (sceneId: string) => void;
    onSceneReordered?: (sceneIds: string[]) => void;
  } = {};
  
  constructor(options?: typeof SceneManager.prototype.options) {
    if (options) {
      this.options = options;
    }
  }
  
  /**
   * Create a new scene
   */
  createScene(options: CreateSceneOptions = {}): Scene {
    const id = crypto.randomUUID();
    const insertIndex = options.insertAfter 
      ? this.state.orderedSceneIds.indexOf(options.insertAfter) + 1
      : this.state.orderedSceneIds.length;
    
    const scene: Scene = {
      id,
      index: insertIndex,
      name: options.name ?? `Scene ${this.state.nextSceneIndex + 1}`,
      color: options.color,
      tempo: options.tempo,
      timeSignature: options.timeSignature,
    };
    
    this.state.scenes.set(id, scene);
    this.state.orderedSceneIds.splice(insertIndex, 0, id);
    this.state.nextSceneIndex++;
    
    // Update indices for all scenes after insertion
    this.renumberScenes();
    
    this.options.onSceneCreated?.(scene);
    return scene;
  }
  
  /**
   * Delete a scene
   */
  deleteScene(sceneId: string): boolean {
    const scene = this.state.scenes.get(sceneId);
    if (!scene) return false;
    
    this.state.scenes.delete(sceneId);
    this.state.orderedSceneIds = this.state.orderedSceneIds.filter(id => id !== sceneId);
    
    this.renumberScenes();
    
    this.options.onSceneDeleted?.(sceneId);
    return true;
  }
  
  /**
   * Duplicate a scene
   */
  duplicateScene(sceneId: string): Scene | null {
    const original = this.state.scenes.get(sceneId);
    if (!original) return null;
    
    const duplicate = this.createScene({
      name: `${original.name} Copy`,
      color: original.color,
      tempo: original.tempo,
      timeSignature: original.timeSignature,
      insertAfter: sceneId,
    });
    
    return duplicate;
  }
  
  /**
   * Rename a scene
   */
  renameScene(sceneId: string, name: string): boolean {
    const scene = this.state.scenes.get(sceneId);
    if (!scene) return false;
    
    scene.name = name;
    return true;
  }
  
  /**
   * Set scene color
   */
  setSceneColor(sceneId: string, color: string | undefined): boolean {
    const scene = this.state.scenes.get(sceneId);
    if (!scene) return false;
    
    scene.color = color;
    return true;
  }
  
  /**
   * Set scene tempo override
   */
  setSceneTempo(sceneId: string, tempo: number | undefined): boolean {
    const scene = this.state.scenes.get(sceneId);
    if (!scene) return false;
    
    scene.tempo = tempo;
    return true;
  }
  
  /**
   * Set scene time signature
   */
  setSceneTimeSignature(
    sceneId: string,
    timeSignature: { numerator: number; denominator: number } | undefined
  ): boolean {
    const scene = this.state.scenes.get(sceneId);
    if (!scene) return false;
    
    scene.timeSignature = timeSignature;
    return true;
  }
  
  /**
   * Move a scene to a new position
   */
  moveScene(sceneId: string, newIndex: number): boolean {
    const currentIndex = this.state.orderedSceneIds.indexOf(sceneId);
    if (currentIndex === -1) return false;
    
    // Remove from current position
    this.state.orderedSceneIds.splice(currentIndex, 1);
    
    // Insert at new position
    const clampedIndex = Math.max(0, Math.min(newIndex, this.state.orderedSceneIds.length));
    this.state.orderedSceneIds.splice(clampedIndex, 0, sceneId);
    
    this.renumberScenes();
    
    this.options.onSceneReordered?.([...this.state.orderedSceneIds]);
    return true;
  }
  
  /**
   * Get a scene by ID
   */
  getScene(sceneId: string): Scene | undefined {
    return this.state.scenes.get(sceneId);
  }
  
  /**
   * Get all scenes in order
   */
  getAllScenes(): Scene[] {
    return this.state.orderedSceneIds.map(id => this.state.scenes.get(id)!);
  }
  
  /**
   * Get scene at index
   */
  getSceneAtIndex(index: number): Scene | undefined {
    const id = this.state.orderedSceneIds[index];
    return id ? this.state.scenes.get(id) : undefined;
  }
  
  /**
   * Get scene count
   */
  getSceneCount(): number {
    return this.state.scenes.size;
  }
  
  /**
   * Get index of a scene
   */
  getSceneIndex(sceneId: string): number {
    return this.state.orderedSceneIds.indexOf(sceneId);
  }
  
  /**
   * Capture current playing state into a new scene
   * Creates new clips from currently playing clips
   */
  captureScene(
    name: string,
    playingSlots: ClipSlot[],
    clips: Map<string, Clip>,
    tracks: Track[]
  ): CaptureSceneResult {
    // Create new scene
    const scene = this.createScene({ name });
    
    // Count clips that will be captured
    const clipsWithContent = playingSlots.filter(slot => 
      slot.clipId && clips.has(slot.clipId)
    );
    
    return {
      scene,
      clipsCreated: clipsWithContent.length,
    };
  }
  
  /**
   * Insert a captured scene
   * Similar to Ableton's "Capture and Insert Scene"
   */
  captureAndInsertScene(
    insertAfterIndex: number,
    playingSlots: ClipSlot[],
    clips: Map<string, Clip>,
    tracks: Track[]
  ): CaptureSceneResult | null {
    const insertAfter = this.state.orderedSceneIds[insertAfterIndex];
    const scene = this.createScene({
      name: `Scene ${this.state.nextSceneIndex}`,
      insertAfter,
    });
    
    const clipsWithContent = playingSlots.filter(slot => 
      slot.clipId && clips.has(slot.clipId)
    );
    
    return {
      scene,
      clipsCreated: clipsWithContent.length,
    };
  }
  
  /**
   * Get the next scene (for follow actions)
   */
  getNextScene(currentSceneId: string): Scene | null {
    const index = this.state.orderedSceneIds.indexOf(currentSceneId);
    if (index === -1 || index >= this.state.orderedSceneIds.length - 1) {
      return null;
    }
    
    const nextId = this.state.orderedSceneIds[index + 1];
    return this.state.scenes.get(nextId) ?? null;
  }
  
  /**
   * Get the previous scene
   */
  getPreviousScene(currentSceneId: string): Scene | null {
    const index = this.state.orderedSceneIds.indexOf(currentSceneId);
    if (index <= 0) {
      return null;
    }
    
    const prevId = this.state.orderedSceneIds[index - 1];
    return this.state.scenes.get(prevId) ?? null;
  }
  
  /**
   * Get the first scene
   */
  getFirstScene(): Scene | null {
    const id = this.state.orderedSceneIds[0];
    return id ? (this.state.scenes.get(id) ?? null) : null;
  }
  
  /**
   * Get the last scene
   */
  getLastScene(): Scene | null {
    const id = this.state.orderedSceneIds[this.state.orderedSceneIds.length - 1];
    return id ? (this.state.scenes.get(id) ?? null) : null;
  }
  
  /**
   * Get a random scene
   */
  getRandomScene(excludeSceneId?: string): Scene | null {
    const candidates = this.state.orderedSceneIds.filter(id => id !== excludeSceneId);
    if (candidates.length === 0) return null;
    
    const randomId = candidates[Math.floor(Math.random() * candidates.length)];
    return this.state.scenes.get(randomId) ?? null;
  }
  
  /**
   * Set playing state on a scene
   */
  setScenePlaying(sceneId: string, isPlaying: boolean): boolean {
    const scene = this.state.scenes.get(sceneId);
    if (!scene) return false;
    
    // Clear playing state from all scenes
    for (const s of this.state.scenes.values()) {
      s.isPlaying = false;
    }
    
    scene.isPlaying = isPlaying;
    return true;
  }
  
  /**
   * Set queued state on a scene
   */
  setSceneQueued(sceneId: string, isQueued: boolean): boolean {
    const scene = this.state.scenes.get(sceneId);
    if (!scene) return false;
    
    // Clear queued state from all scenes
    for (const s of this.state.scenes.values()) {
      s.isQueued = false;
    }
    
    scene.isQueued = isQueued;
    return true;
  }
  
  /**
   * Renumber all scenes based on their order
   */
  private renumberScenes(): void {
    this.state.orderedSceneIds.forEach((id, index) => {
      const scene = this.state.scenes.get(id);
      if (scene) {
        scene.index = index;
      }
    });
  }
  
  /**
   * Import scenes from a project
   */
  importScenes(scenes: Scene[]): void {
    for (const scene of scenes) {
      this.state.scenes.set(scene.id, { ...scene });
      if (!this.state.orderedSceneIds.includes(scene.id)) {
        this.state.orderedSceneIds.push(scene.id);
      }
    }
    
    // Sort by index
    this.state.orderedSceneIds.sort((a, b) => {
      const sceneA = this.state.scenes.get(a);
      const sceneB = this.state.scenes.get(b);
      return (sceneA?.index ?? 0) - (sceneB?.index ?? 0);
    });
    
    this.renumberScenes();
    this.state.nextSceneIndex = Math.max(
      this.state.nextSceneIndex,
      this.state.scenes.size + 1
    );
  }
  
  /**
   * Export all scenes
   */
  exportScenes(): Scene[] {
    return this.getAllScenes();
  }
  
  /**
   * Clear all scenes
   */
  clear(): void {
    this.state.scenes.clear();
    this.state.orderedSceneIds = [];
    this.state.nextSceneIndex = 0;
  }
}

/**
 * Generate default scene colors (Ableton-style)
 */
export function getDefaultSceneColor(index: number): string {
  const colors = [
    '#FF5252', // Red
    '#FF9800', // Orange
    '#FFEB3B', // Yellow
    '#76FF03', // Lime
    '#00E676', // Green
    '#00BFA5', // Teal
    '#00B0FF', // Light Blue
    '#2979FF', // Blue
    '#651FFF', // Deep Purple
    '#D500F9', // Purple
    '#F50057', // Pink
    '#795548', // Brown
  ];
  
  return colors[index % colors.length];
}

/**
 * Generate scene name with auto-numbering
 */
export function generateSceneName(existingScenes: Scene[], baseName: string = 'Scene'): string {
  const numbers = existingScenes
    .map(s => {
      const match = s.name.match(new RegExp(`^${baseName}\\s*(\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);
  
  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${baseName} ${nextNumber}`;
}
