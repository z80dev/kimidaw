/**
 * Sampler - Zone Map
 * 
 * Multi-zone sample mapping by key range, velocity, and round-robin.
 * Maps MIDI notes to appropriate sample zones.
 */

import type { SampleZone } from "@daw/plugin-api";

export interface ZoneEntry extends SampleZone {
  /** Round-robin index within the group */
  roundRobinIndex: number;
  /** Number of samples in this RR group */
  roundRobinCount: number;
}

export class ZoneMap {
  private _zones: ZoneEntry[] = [];
  private _roundRobinCounters = new Map<number, number>();

  /**
   * Add a zone to the map
   */
  addZone(zone: SampleZone): void {
    const existing = this._zones.filter(
      z => z.roundRobinGroup === zone.roundRobinGroup && 
           z.roundRobinGroup !== undefined
    );
    
    const entry: ZoneEntry = {
      ...zone,
      roundRobinIndex: zone.roundRobinGroup !== undefined ? existing.length : 0,
      roundRobinCount: zone.roundRobinGroup !== undefined ? existing.length + 1 : 1,
    };
    
    this._zones.push(entry);
    
    // Update round-robin counts for all zones in the group
    if (zone.roundRobinGroup !== undefined) {
      const groupZones = this._zones.filter(z => z.roundRobinGroup === zone.roundRobinGroup);
      for (const z of groupZones) {
        z.roundRobinCount = groupZones.length;
      }
    }
  }

  /**
   * Remove all zones
   */
  clear(): void {
    this._zones = [];
    this._roundRobinCounters.clear();
  }

  /**
   * Get the number of zones
   */
  get zoneCount(): number {
    return this._zones.length;
  }

  /**
   * Find the best matching zone for a given note and velocity.
   * Returns null if no zone matches.
   */
  findZone(note: number, velocity: number): ZoneEntry | null {
    // Filter zones that match note and velocity
    const candidates = this._zones.filter(z => 
      note >= z.minNote && 
      note <= z.maxNote &&
      velocity >= z.minVelocity &&
      velocity <= z.maxVelocity
    );

    if (candidates.length === 0) {
      return null;
    }

    // If there's only one candidate, return it
    if (candidates.length === 1) {
      return this._selectRoundRobin(candidates[0]);
    }

    // Multiple candidates - pick based on priority:
    // 1. Zones with root note closer to played note
    // 2. Smaller zones (more specific)
    let bestZone = candidates[0];
    let bestScore = this._calculateZoneScore(bestZone, note);

    for (let i = 1; i < candidates.length; i++) {
      const zone = candidates[i];
      const score = this._calculateZoneScore(zone, note);
      
      if (score > bestScore) {
        bestScore = score;
        bestZone = zone;
      }
    }

    return this._selectRoundRobin(bestZone);
  }

  /**
   * Find all zones that overlap with a given key range.
   * Useful for UI display and editing.
   */
  findZonesInRange(minNote: number, maxNote: number): ZoneEntry[] {
    return this._zones.filter(z => 
      !(z.maxNote < minNote || z.minNote > maxNote)
    );
  }

  /**
   * Get all zones for a specific root note
   */
  findZonesByRootNote(rootNote: number): ZoneEntry[] {
    return this._zones.filter(z => z.rootNote === rootNote);
  }

  /**
   * Get all zones in a round-robin group
   */
  getRoundRobinGroup(groupId: number): ZoneEntry[] {
    return this._zones.filter(z => z.roundRobinGroup === groupId);
  }

  /**
   * Get all unique round-robin groups
   */
  get roundRobinGroups(): number[] {
    const groups = new Set<number>();
    for (const zone of this._zones) {
      if (zone.roundRobinGroup !== undefined) {
        groups.add(zone.roundRobinGroup);
      }
    }
    return Array.from(groups).sort();
  }

  /**
   * Get the minimum and maximum notes covered by any zone
   */
  get keyRange(): { min: number; max: number } | null {
    if (this._zones.length === 0) return null;
    
    let min = Infinity;
    let max = -Infinity;
    
    for (const zone of this._zones) {
      min = Math.min(min, zone.minNote);
      max = Math.max(max, zone.maxNote);
    }
    
    return { min, max };
  }

  /**
   * Get the minimum and maximum velocities covered by any zone
   */
  get velocityRange(): { min: number; max: number } | null {
    if (this._zones.length === 0) return null;
    
    let min = Infinity;
    let max = -Infinity;
    
    for (const zone of this._zones) {
      min = Math.min(min, zone.minVelocity);
      max = Math.max(max, zone.maxVelocity);
    }
    
    return { min, max };
  }

  /**
   * Get all zones as an array
   */
  get zones(): readonly ZoneEntry[] {
    return this._zones;
  }

  /**
   * Export zone map to serializable format
   */
  export(): SampleZone[] {
    return this._zones.map(z => ({
      rootNote: z.rootNote,
      minNote: z.minNote,
      maxNote: z.maxNote,
      minVelocity: z.minVelocity,
      maxVelocity: z.maxVelocity,
      sampleId: z.sampleId,
      sampleStart: z.sampleStart,
      sampleEnd: z.sampleEnd,
      loopStart: z.loopStart,
      loopEnd: z.loopEnd,
      loopMode: z.loopMode,
      tuneCents: z.tuneCents,
      gainDb: z.gainDb,
      roundRobinGroup: z.roundRobinGroup,
    }));
  }

  /**
   * Import zone map from serializable format
   */
  import(zones: SampleZone[]): void {
    this.clear();
    for (const zone of zones) {
      this.addZone(zone);
    }
  }

  /**
   * Auto-map samples based on root notes with equal velocity layers
   */
  autoMap(
    sampleIds: string[],
    rootNotes: number[],
    options: {
      velocityLayers?: number;
      overlap?: number;  // Semitones of overlap between zones
    } = {}
  ): void {
    const { velocityLayers = 1, overlap = 1 } = options;
    
    // Sort by root note
    const sorted = rootNotes
      .map((note, i) => ({ note, id: sampleIds[i] }))
      .sort((a, b) => a.note - b.note);
    
    for (let i = 0; i < sorted.length; i++) {
      const { note, id } = sorted[i];
      
      // Calculate key range
      let minNote: number;
      let maxNote: number;
      
      if (sorted.length === 1) {
        minNote = 0;
        maxNote = 127;
      } else if (i === 0) {
        // First zone extends down to 0
        const nextNote = sorted[i + 1].note;
        const boundary = Math.floor((note + nextNote) / 2);
        minNote = 0;
        maxNote = boundary + overlap;
      } else if (i === sorted.length - 1) {
        // Last zone extends up to 127
        const prevNote = sorted[i - 1].note;
        const boundary = Math.floor((prevNote + note) / 2);
        minNote = boundary - overlap;
        maxNote = 127;
      } else {
        // Middle zones
        const prevNote = sorted[i - 1].note;
        const nextNote = sorted[i + 1].note;
        const lowerBound = Math.floor((prevNote + note) / 2);
        const upperBound = Math.floor((note + nextNote) / 2);
        minNote = lowerBound - overlap;
        maxNote = upperBound + overlap;
      }
      
      // Create velocity layers
      const velStep = 128 / velocityLayers;
      for (let v = 0; v < velocityLayers; v++) {
        const minVel = Math.floor(v * velStep);
        const maxVel = v === velocityLayers - 1 ? 127 : Math.floor((v + 1) * velStep) - 1;
        
        this.addZone({
          rootNote: note,
          minNote,
          maxNote,
          minVelocity: minVel,
          maxVelocity: maxVel,
          sampleId: id,
          sampleStart: 0,
          sampleEnd: 0, // Will be set when sample is loaded
          tuneCents: 0,
          gainDb: 0,
          roundRobinGroup: velocityLayers > 1 ? v : undefined,
        });
      }
    }
  }

  /**
   * Get zones that need to be loaded based on a key range
   * Useful for predictive loading
   */
  getZonesForRange(minNote: number, maxNote: number): ZoneEntry[] {
    return this._zones.filter(z => 
      z.maxNote >= minNote && z.minNote <= maxNote
    );
  }

  /**
   * Check if a note is covered by any zone
   */
  hasZoneForNote(note: number): boolean {
    return this._zones.some(z => note >= z.minNote && note <= z.maxNote);
  }

  /**
   * Get coverage map - which notes have samples
   */
  getCoverageMap(): boolean[] {
    const map = new Array(128).fill(false);
    for (const zone of this._zones) {
      for (let i = zone.minNote; i <= zone.maxNote && i < 128; i++) {
        map[i] = true;
      }
    }
    return map;
  }

  // Private methods

  private _calculateZoneScore(zone: ZoneEntry, note: number): number {
    // Score based on:
    // 1. Distance from root note (closer is better)
    // 2. Zone specificity (smaller zones preferred)
    
    const rootDistance = Math.abs(note - zone.rootNote);
    const zoneSize = zone.maxNote - zone.minNote;
    
    // Weight: prefer zones with root closer to played note
    // and slightly prefer smaller, more specific zones
    return -rootDistance * 2 - zoneSize * 0.1;
  }

  private _selectRoundRobin(zone: ZoneEntry): ZoneEntry {
    if (zone.roundRobinGroup === undefined || zone.roundRobinCount <= 1) {
      return zone;
    }

    const group = zone.roundRobinGroup;
    const current = this._roundRobinCounters.get(group) ?? 0;
    const next = (current + 1) % zone.roundRobinCount;
    this._roundRobinCounters.set(group, next);

    // Find the zone with the matching round-robin index
    const groupZones = this._zones.filter(z => z.roundRobinGroup === group);
    return groupZones[next] ?? zone;
  }
}

/**
 * Utility function to create velocity crossfade curve
 * Returns gain multiplier (0-1) based on velocity and zone
 */
export function calculateVelocityCrossfade(
  velocity: number,
  zoneMinVel: number,
  zoneMaxVel: number,
  fadeRange: number
): number {
  // If velocity is in the middle of the zone, full gain
  // If near the edges, fade out
  
  const zoneCenter = (zoneMinVel + zoneMaxVel) / 2;
  const zoneRange = zoneMaxVel - zoneMinVel;
  
  // Distance from zone center normalized
  const dist = Math.abs(velocity - zoneCenter) / (zoneRange / 2);
  
  if (dist <= (1 - fadeRange)) {
    return 1;
  }
  
  // Cosine fade
  const fadePos = (dist - (1 - fadeRange)) / fadeRange;
  return (Math.cos(fadePos * Math.PI) + 1) / 2;
}

/**
 * Create velocity layers with equal distribution
 */
export function createVelocityLayers(
  sampleIds: string[],
  layerCount: number
): Array<{ sampleId: string; minVel: number; maxVel: number }> {
  const velStep = 128 / layerCount;
  const layers: Array<{ sampleId: string; minVel: number; maxVel: number }> = [];
  
  for (let i = 0; i < layerCount && i < sampleIds.length; i++) {
    const minVel = Math.floor(i * velStep);
    const maxVel = i === layerCount - 1 ? 127 : Math.floor((i + 1) * velStep) - 1;
    
    layers.push({
      sampleId: sampleIds[i],
      minVel,
      maxVel,
    });
  }
  
  return layers;
}
