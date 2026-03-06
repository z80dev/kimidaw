/**
 * Comp Tool - Ableton-style comping logic
 * Swipe-to-select, region management, and comp building
 */

import type {
  CompRegion,
  CompTake,
  TakeLane,
  CompEditCommand,
  CompTool,
  CompingState,
  CompingOptions,
  CrossfadeConfig
} from './types.js';

export interface CompSelection {
  startTick: number;
  endTick: number;
  takeLaneId: string;
}

export interface CompEditResult {
  success: boolean;
  affectedRegions: string[];
  newRegions?: CompRegion[];
  error?: string;
}

export class CompToolManager {
  private compTakes: Map<string, CompTake> = new Map();
  private currentComp: CompTake | null = null;
  private state: CompingState;
  private options: CompingOptions;
  private history: CompTake[] = [];
  private historyIndex: number = -1;
  private maxHistorySize: number = 50;

  constructor(options?: Partial<CompingOptions>) {
    this.options = {
      autoCrossfade: true,
      defaultCrossfadeMs: 10,
      defaultFadeCurve: 'equal-power',
      snapToZeroCrossings: true,
      quantizeCompEdits: true,
      compGridDivision: 240,
      ...options
    };

    this.state = {
      isComping: false,
      currentTool: 'selector',
      selectedRegions: [],
      auditionOnSelect: true,
      showAllTakes: true,
      groupTakes: false
    };
  }

  /**
   * Create a new comp take
   */
  createCompTake(): CompTake {
    const compTake: CompTake = {
      id: this.generateId(),
      regions: [],
      isFlattened: false
    };

    this.compTakes.set(compTake.id, compTake);
    this.currentComp = compTake;
    this.saveToHistory(compTake);
    
    return compTake;
  }

  /**
   * Select a region from a take lane and add it to the comp
   */
  selectRegion(
    compTakeId: string,
    takeLane: TakeLane,
    clipId: string,
    startTick: number,
    endTick: number
  ): CompEditResult {
    const compTake = this.compTakes.get(compTakeId);
    if (!compTake) {
      return { success: false, affectedRegions: [], error: 'Comp take not found' };
    }

    // Check for overlaps and resolve
    const overlaps = this.findOverlappingRegions(compTake, startTick, endTick);
    
    // Remove overlapping regions from other takes
    for (const overlap of overlaps) {
      if (overlap.takeLaneId !== takeLane.id) {
        this.removeRegion(compTakeId, overlap.id);
      }
    }

    // Trim overlapping regions from the same take
    for (const overlap of overlaps) {
      if (overlap.takeLaneId === takeLane.id) {
        this.removeRegion(compTakeId, overlap.id);
      }
    }

    // Create new region
    const newRegion: CompRegion = {
      id: this.generateId(),
      takeLaneId: takeLane.id,
      clipId,
      startTick,
      endTick,
      fadeInSamples: 0,
      fadeOutSamples: 0,
      crossfadeIn: null,
      crossfadeOut: null
    };

    // Add crossfades if enabled
    if (this.options.autoCrossfade) {
      this.addCrossfadesToRegion(compTake, newRegion);
    }

    compTake.regions.push(newRegion);
    this.sortRegions(compTake);
    this.saveToHistory(compTake);

    return {
      success: true,
      affectedRegions: [...overlaps.map(r => r.id), newRegion.id],
      newRegions: [newRegion]
    };
  }

  /**
   * Swipe selection - Ableton-style comp tool
   * Selects the best parts by dragging across takes
   */
  swipeSelect(
    compTakeId: string,
    selections: CompSelection[]
  ): CompEditResult {
    const compTake = this.compTakes.get(compTakeId);
    if (!compTake) {
      return { success: false, affectedRegions: [], error: 'Comp take not found' };
    }

    const affectedRegions: string[] = [];
    const newRegions: CompRegion[] = [];

    for (const selection of selections) {
      // Remove existing regions in this time range
      const overlaps = this.findOverlappingRegions(
        compTake,
        selection.startTick,
        selection.endTick
      );
      
      for (const overlap of overlaps) {
        this.removeRegion(compTakeId, overlap.id);
        affectedRegions.push(overlap.id);
      }

      // Create new region
      // In a real implementation, we'd look up the clip from the take lane
      const newRegion: CompRegion = {
        id: this.generateId(),
        takeLaneId: selection.takeLaneId,
        clipId: '', // Would be populated from actual clip lookup
        startTick: selection.startTick,
        endTick: selection.endTick,
        fadeInSamples: 0,
        fadeOutSamples: 0,
        crossfadeIn: null,
        crossfadeOut: null
      };

      if (this.options.autoCrossfade) {
        this.addCrossfadesToRegion(compTake, newRegion);
      }

      compTake.regions.push(newRegion);
      newRegions.push(newRegion);
      affectedRegions.push(newRegion.id);
    }

    this.sortRegions(compTake);
    this.saveToHistory(compTake);

    return {
      success: true,
      affectedRegions,
      newRegions
    };
  }

  /**
   * Remove a region from the comp
   */
  removeRegion(compTakeId: string, regionId: string): boolean {
    const compTake = this.compTakes.get(compTakeId);
    if (!compTake) return false;

    const index = compTake.regions.findIndex(r => r.id === regionId);
    if (index === -1) return false;

    compTake.regions.splice(index, 1);
    this.saveToHistory(compTake);
    
    return true;
  }

  /**
   * Move a region to a different take lane
   */
  moveRegionToLane(
    compTakeId: string,
    regionId: string,
    newLaneId: string,
    newClipId: string
  ): CompEditResult {
    const compTake = this.compTakes.get(compTakeId);
    if (!compTake) {
      return { success: false, affectedRegions: [], error: 'Comp take not found' };
    }

    const region = compTake.regions.find(r => r.id === regionId);
    if (!region) {
      return { success: false, affectedRegions: [], error: 'Region not found' };
    }

    region.takeLaneId = newLaneId;
    region.clipId = newClipId;
    
    this.saveToHistory(compTake);

    return {
      success: true,
      affectedRegions: [regionId]
    };
  }

  /**
   * Resize a region
   */
  resizeRegion(
    compTakeId: string,
    regionId: string,
    newStartTick?: number,
    newEndTick?: number
  ): CompEditResult {
    const compTake = this.compTakes.get(compTakeId);
    if (!compTake) {
      return { success: false, affectedRegions: [], error: 'Comp take not found' };
    }

    const region = compTake.regions.find(r => r.id === regionId);
    if (!region) {
      return { success: false, affectedRegions: [], error: 'Region not found' };
    }

    if (newStartTick !== undefined) {
      region.startTick = newStartTick;
    }
    if (newEndTick !== undefined) {
      region.endTick = newEndTick;
    }

    // Update crossfades after resize
    if (this.options.autoCrossfade) {
      this.updateCrossfadesForRegion(compTake, region);
    }

    this.sortRegions(compTake);
    this.saveToHistory(compTake);

    return {
      success: true,
      affectedRegions: [regionId]
    };
  }

  /**
   * Duplicate a region
   */
  duplicateRegion(compTakeId: string, regionId: string): CompRegion | null {
    const compTake = this.compTakes.get(compTakeId);
    if (!compTake) return null;

    const region = compTake.regions.find(r => r.id === regionId);
    if (!region) return null;

    const newRegion: CompRegion = {
      ...region,
      id: this.generateId(),
      startTick: region.endTick,
      endTick: region.endTick + (region.endTick - region.startTick)
    };

    compTake.regions.push(newRegion);
    this.saveToHistory(compTake);

    return newRegion;
  }

  /**
   * Split a region at a specific position
   */
  splitRegion(
    compTakeId: string,
    regionId: string,
    splitTick: number
  ): CompEditResult {
    const compTake = this.compTakes.get(compTakeId);
    if (!compTake) {
      return { success: false, affectedRegions: [], error: 'Comp take not found' };
    }

    const region = compTake.regions.find(r => r.id === regionId);
    if (!region) {
      return { success: false, affectedRegions: [], error: 'Region not found' };
    }

    if (splitTick <= region.startTick || splitTick >= region.endTick) {
      return { success: false, affectedRegions: [], error: 'Split point outside region' };
    }

    // Create second part
    const newRegion: CompRegion = {
      ...region,
      id: this.generateId(),
      startTick: splitTick,
      endTick: region.endTick,
      crossfadeIn: null
    };

    // Shorten first part
    region.endTick = splitTick;
    region.crossfadeOut = null;

    compTake.regions.push(newRegion);
    this.sortRegions(compTake);
    this.saveToHistory(compTake);

    return {
      success: true,
      affectedRegions: [regionId, newRegion.id],
      newRegions: [newRegion]
    };
  }

  /**
   * Execute a comp edit command
   */
  executeCommand(compTakeId: string, command: CompEditCommand): CompEditResult {
    switch (command.type) {
      case 'delete':
        if (command.regionId) {
          this.removeRegion(compTakeId, command.regionId);
          return { success: true, affectedRegions: [command.regionId] };
        }
        break;
        
      case 'move':
        if (command.regionId && command.takeLaneId) {
          return this.moveRegionToLane(
            compTakeId,
            command.regionId,
            command.takeLaneId,
            '' // Would need clip lookup
          );
        }
        break;
        
      case 'resize':
        if (command.regionId) {
          return this.resizeRegion(
            compTakeId,
            command.regionId,
            command.startTick,
            command.endTick
          );
        }
        break;
    }

    return { success: false, affectedRegions: [], error: 'Invalid command' };
  }

  /**
   * Get the currently active comp
   */
  getCurrentComp(): CompTake | null {
    return this.currentComp;
  }

  /**
   * Get comp take by ID
   */
  getCompTake(id: string): CompTake | undefined {
    return this.compTakes.get(id);
  }

  /**
   * Get all regions for a comp take
   */
  getRegions(compTakeId: string): CompRegion[] {
    const compTake = this.compTakes.get(compTakeId);
    return compTake ? [...compTake.regions] : [];
  }

  /**
   * Get regions at a specific time position
   */
  getRegionsAtTime(compTakeId: string, tick: number): CompRegion[] {
    const compTake = this.compTakes.get(compTakeId);
    if (!compTake) return [];

    return compTake.regions.filter(
      r => r.startTick <= tick && r.endTick > tick
    );
  }

  /**
   * Set comping tool
   */
  setTool(tool: CompTool): void {
    this.state.currentTool = tool;
  }

  /**
   * Get current tool
   */
  getTool(): CompTool {
    return this.state.currentTool;
  }

  /**
   * Toggle comping mode
   */
  setCompingActive(active: boolean): void {
    this.state.isComping = active;
  }

  /**
   * Check if comping is active
   */
  isComping(): boolean {
    return this.state.isComping;
  }

  /**
   * Undo last comp edit
   */
  undo(): CompTake | null {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const previous = this.history[this.historyIndex];
      if (this.currentComp) {
        this.currentComp.regions = previous.regions.map(r => ({ ...r }));
        return this.currentComp;
      }
    }
    return null;
  }

  /**
   * Redo last undone edit
   */
  redo(): CompTake | null {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const next = this.history[this.historyIndex];
      if (this.currentComp) {
        this.currentComp.regions = next.regions.map(r => ({ ...r }));
        return this.currentComp;
      }
    }
    return null;
  }

  /**
   * Find regions that overlap with a time range
   */
  private findOverlappingRegions(
    compTake: CompTake,
    startTick: number,
    endTick: number
  ): CompRegion[] {
    return compTake.regions.filter(
      r => r.startTick < endTick && r.endTick > startTick
    );
  }

  /**
   * Sort regions by start time
   */
  private sortRegions(compTake: CompTake): void {
    compTake.regions.sort((a, b) => a.startTick - b.startTick);
  }

  /**
   * Add crossfades to a region
   */
  private addCrossfadesToRegion(compTake: CompTake, region: CompRegion): void {
    const sampleRate = 44100; // Would come from project
    const ppq = 960;
    const bpm = 120; // Would come from project
    
    const crossfadeSamples = Math.floor(
      this.options.defaultCrossfadeMs * sampleRate / 1000
    );

    // Find adjacent regions
    const prevRegion = compTake.regions.find(
      r => r.endTick <= region.startTick
    );
    const nextRegion = compTake.regions.find(
      r => r.startTick >= region.endTick
    );

    if (prevRegion) {
      const crossfade: CrossfadeConfig = {
        durationSamples: crossfadeSamples,
        curve: this.options.defaultFadeCurve
      };
      region.crossfadeIn = crossfade;
      prevRegion.crossfadeOut = crossfade;
    }

    if (nextRegion) {
      const crossfade: CrossfadeConfig = {
        durationSamples: crossfadeSamples,
        curve: this.options.defaultFadeCurve
      };
      region.crossfadeOut = crossfade;
      nextRegion.crossfadeIn = crossfade;
    }
  }

  /**
   * Update crossfades after region resize
   */
  private updateCrossfadesForRegion(compTake: CompTake, region: CompRegion): void {
    // Re-calculate crossfades for this region and neighbors
    this.addCrossfadesToRegion(compTake, region);
  }

  /**
   * Save comp state to history
   */
  private saveToHistory(compTake: CompTake): void {
    // Remove future history if we're not at the end
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Add new state
    this.history.push({
      ...compTake,
      regions: compTake.regions.map(r => ({ ...r }))
    });

    // Trim history if too long
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
