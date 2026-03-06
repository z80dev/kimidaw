/**
 * Groove Pool - Manages groove templates
 */

import type { Groove, GroovePool, GrooveEvent, GrooveEventHandler } from './types.js';

export interface GroovePoolManager {
  // Groove management
  addGroove(groove: Groove): void;
  removeGroove(id: string): void;
  getGroove(id: string): Groove | undefined;
  getAllGrooves(): Groove[];
  setCurrentGroove(id: string): void;
  getCurrentGroove(): Groove | undefined;
  
  // Pool management
  loadGrooves(grooves: Groove[]): void;
  clearPool(): void;
  
  // Factory grooves
  loadFactoryGrooves(): Promise<void>;
  
  // File I/O
  importAGR(path: string): Promise<Groove>;
  exportAGR(grooveId: string, path: string): Promise<void>;
  
  // Events
  onEvent(handler: GrooveEventHandler): () => void;
}

// Factory groove definitions
const FACTORY_GROOVES: Omit<Groove, 'id'>[] = [
  {
    name: 'Swing 8th Light',
    timingPoints: [
      { position: 0.5, timing: 0.02, velocity: 0, duration: 0 },
      { position: 1.5, timing: 0.02, velocity: 0, duration: 0 },
      { position: 2.5, timing: 0.02, velocity: 0, duration: 0 },
      { position: 3.5, timing: 0.02, velocity: 0, duration: 0 },
    ],
    base: 0.5,
    quantize: 0,
    timing: 50,
    random: 0,
    velocity: 0,
    duration: 0,
    tags: ['swing', 'light', '8th'],
  },
  {
    name: 'Swing 8th Medium',
    timingPoints: [
      { position: 0.5, timing: 0.04, velocity: 0, duration: 0 },
      { position: 1.5, timing: 0.04, velocity: 0, duration: 0 },
      { position: 2.5, timing: 0.04, velocity: 0, duration: 0 },
      { position: 3.5, timing: 0.04, velocity: 0, duration: 0 },
    ],
    base: 0.5,
    quantize: 0,
    timing: 75,
    random: 0,
    velocity: 0,
    duration: 0,
    tags: ['swing', 'medium', '8th'],
  },
  {
    name: 'Swing 8th Heavy',
    timingPoints: [
      { position: 0.5, timing: 0.06, velocity: 0, duration: 0 },
      { position: 1.5, timing: 0.06, velocity: 0, duration: 0 },
      { position: 2.5, timing: 0.06, velocity: 0, duration: 0 },
      { position: 3.5, timing: 0.06, velocity: 0, duration: 0 },
    ],
    base: 0.5,
    quantize: 0,
    timing: 100,
    random: 0,
    velocity: 0,
    duration: 0,
    tags: ['swing', 'heavy', '8th'],
  },
  {
    name: 'Swing 16th Light',
    timingPoints: [
      { position: 0.25, timing: 0.01, velocity: 0, duration: 0 },
      { position: 0.5, timing: 0.02, velocity: 0, duration: 0 },
      { position: 0.75, timing: 0.01, velocity: 0, duration: 0 },
      { position: 1, timing: 0, velocity: 0, duration: 0 },
    ],
    base: 0.25,
    quantize: 0,
    timing: 50,
    random: 0,
    velocity: 0,
    duration: 0,
    tags: ['swing', 'light', '16th'],
  },
  {
    name: 'Shuffle Hip Hop',
    timingPoints: [
      { position: 0.5, timing: 0.03, velocity: 0.1, duration: 0 },
      { position: 1, timing: 0, velocity: 0, duration: 0 },
      { position: 1.5, timing: 0.03, velocity: 0.1, duration: 0 },
      { position: 2, timing: 0, velocity: 0, duration: 0 },
    ],
    base: 0.5,
    quantize: 0,
    timing: 60,
    random: 10,
    velocity: 30,
    duration: 0,
    tags: ['shuffle', 'hiphop', 'funk'],
  },
  {
    name: 'Humanize Light',
    timingPoints: Array.from({ length: 16 }, (_, i) => ({
      position: i * 0.25,
      timing: (Math.random() - 0.5) * 0.01,
      velocity: (Math.random() - 0.5) * 0.05,
      duration: 0,
    })),
    base: 0.25,
    quantize: 0,
    timing: 25,
    random: 20,
    velocity: 25,
    duration: 0,
    tags: ['humanize', 'light', 'natural'],
  },
];

export function createGroovePoolManager(): GroovePoolManager {
  const pool: GroovePool = {
    grooves: [],
    currentGrooveId: null,
  };

  const eventHandlers: GrooveEventHandler[] = [];

  function emitEvent(event: GrooveEvent): void {
    for (const handler of eventHandlers) {
      handler(event);
    }
  }

  function addGroove(groove: Groove): void {
    // Check for duplicates
    const existingIndex = pool.grooves.findIndex(g => g.id === groove.id);
    if (existingIndex >= 0) {
      pool.grooves[existingIndex] = groove;
    } else {
      pool.grooves.push(groove);
    }

    emitEvent({
      type: 'groove-added',
      timestamp: Date.now(),
      grooveId: groove.id,
    });
  }

  function removeGroove(id: string): void {
    const index = pool.grooves.findIndex(g => g.id === id);
    if (index >= 0) {
      pool.grooves.splice(index, 1);

      if (pool.currentGrooveId === id) {
        pool.currentGrooveId = null;
      }

      emitEvent({
        type: 'groove-removed',
        timestamp: Date.now(),
        grooveId: id,
      });
    }
  }

  function getGroove(id: string): Groove | undefined {
    return pool.grooves.find(g => g.id === id);
  }

  function getAllGrooves(): Groove[] {
    return [...pool.grooves];
  }

  function setCurrentGroove(id: string): void {
    if (pool.grooves.some(g => g.id === id)) {
      pool.currentGrooveId = id;
    }
  }

  function getCurrentGroove(): Groove | undefined {
    if (!pool.currentGrooveId) return undefined;
    return getGroove(pool.currentGrooveId);
  }

  function loadGrooves(grooves: Groove[]): void {
    pool.grooves = [...grooves];
  }

  function clearPool(): void {
    pool.grooves = [];
    pool.currentGrooveId = null;
  }

  async function loadFactoryGrooves(): Promise<void> {
    for (const factoryGroove of FACTORY_GROOVES) {
      const groove: Groove = {
        ...factoryGroove,
        id: `factory-${factoryGroove.name.toLowerCase().replace(/\s+/g, '-')}`,
        tags: [...factoryGroove.tags],
      };
      addGroove(groove);
    }
  }

  async function importAGR(path: string): Promise<Groove> {
    // In a real implementation, this would parse .agr files
    // For now, return a placeholder
    const groove: Groove = {
      id: `imported-${Date.now()}`,
      name: path.split('/').pop()?.replace('.agr', '') || 'Imported Groove',
      path,
      timingPoints: [],
      base: 0.25,
      quantize: 0,
      timing: 100,
      random: 0,
      velocity: 100,
      duration: 100,
      tags: ['imported'],
    };
    addGroove(groove);
    return groove;
  }

  async function exportAGR(grooveId: string, path: string): Promise<void> {
    const groove = getGroove(grooveId);
    if (!groove) {
      throw new Error(`Groove not found: ${grooveId}`);
    }

    // In a real implementation, this would serialize to .agr format
    console.log(`Exporting groove ${groove.name} to ${path}`);
  }

  function onEvent(handler: GrooveEventHandler): () => void {
    eventHandlers.push(handler);
    return () => {
      const index = eventHandlers.indexOf(handler);
      if (index >= 0) {
        eventHandlers.splice(index, 1);
      }
    };
  }

  return {
    addGroove,
    removeGroove,
    getGroove,
    getAllGrooves,
    setCurrentGroove,
    getCurrentGroove,
    loadGrooves,
    clearPool,
    loadFactoryGrooves,
    importAGR,
    exportAGR,
    onEvent,
  };
}
