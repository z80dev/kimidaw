/**
 * Latency Compensation and Plugin Delay Compensation (PDC)
 * Implements section 8.4 of the engineering spec
 * 
 * PDC ensures that all signal paths have consistent timing by:
 * 1. Measuring plugin latency
 * 2. Calculating maximum path latency
 * 3. Delaying faster paths to align with the slowest
 */

import type { NodeId, EngineGraph, GraphTrack, GraphBus } from './graph.js';

/** Latency report from a plugin */
export interface PluginLatencyReport {
  /** Plugin instance ID */
  pluginId: string;
  /** Reported latency in samples */
  latencySamples: number;
  /** Whether latency can change dynamically */
  isDynamic: boolean;
}

/** Complete latency model for the session */
export interface LatencyModel {
  /** Input latency from audio interface */
  inputLatency: number;
  /** Output latency from audio interface */
  outputLatency: number;
  /** Round-trip latency estimate */
  roundTripLatency: number;
  /** Per-plugin latency */
  pluginLatencies: Map<string, number>;
  /** Per-path total latency */
  pathLatencies: Map<string, number>;
  /** Compensation delays needed per node */
  compensationDelays: Map<string, number>;
  /** Maximum latency in the graph */
  maxLatency: number;
}

/** Device latency information from AudioContext */
export interface DeviceLatency {
  inputLatency: number;
  outputLatency: number;
}

/**
 * Latency compensator for the audio graph
 * Calculates and applies PDC to keep all signals time-aligned
 */
export class LatencyCompensator {
  private graph: EngineGraph;
  private pluginLatencies: Map<string, number> = new Map();
  private deviceLatency: DeviceLatency = { inputLatency: 0, outputLatency: 0 };
  private model: LatencyModel;
  private needsRecalculation = true;
  
  constructor(graph: EngineGraph) {
    this.graph = graph;
    this.model = this.createEmptyModel();
  }
  
  private createEmptyModel(): LatencyModel {
    return {
      inputLatency: 0,
      outputLatency: 0,
      roundTripLatency: 0,
      pluginLatencies: new Map(),
      pathLatencies: new Map(),
      compensationDelays: new Map(),
      maxLatency: 0,
    };
  }
  
  /** Update device latency from AudioContext */
  setDeviceLatency(latency: DeviceLatency): void {
    this.deviceLatency = latency;
    this.needsRecalculation = true;
  }
  
  /** Report latency from a plugin */
  reportPluginLatency(report: PluginLatencyReport): void {
    const current = this.pluginLatencies.get(report.pluginId) ?? 0;
    if (current !== report.latencySamples) {
      this.pluginLatencies.set(report.pluginId, report.latencySamples);
      this.needsRecalculation = true;
    }
  }
  
  /** Remove a plugin from latency calculations */
  removePlugin(pluginId: string): void {
    if (this.pluginLatencies.has(pluginId)) {
      this.pluginLatencies.delete(pluginId);
      this.needsRecalculation = true;
    }
  }
  
  /** Update the graph structure */
  setGraph(graph: EngineGraph): void {
    this.graph = graph;
    this.needsRecalculation = true;
  }
  
  /** Get the current latency model (recalculates if needed) */
  getLatencyModel(): Readonly<LatencyModel> {
    if (this.needsRecalculation) {
      this.recalculate();
    }
    return Object.freeze({ ...this.model });
  }
  
  /** Recalculate all latencies and compensations */
  private recalculate(): void {
    const pathLatencies = new Map<string, number>();
    const compensationDelays = new Map<string, number>();
    
    // Calculate latency for each track path to master
    for (const track of this.graph.tracks) {
      const trackLatency = this.calculateTrackLatency(track);
      pathLatencies.set(track.id, trackLatency);
    }
    
    // Calculate latency for each bus
    for (const bus of this.graph.buses) {
      const busLatency = this.calculateBusLatency(bus);
      pathLatencies.set(bus.id, busLatency);
    }
    
    // Master latency
    const masterLatency = this.calculateMasterLatency();
    pathLatencies.set('master', masterLatency);
    
    // Find maximum latency
    let maxLatency = 0;
    for (const latency of pathLatencies.values()) {
      maxLatency = Math.max(maxLatency, latency);
    }
    
    // Add device latencies
    const totalMaxLatency = maxLatency + this.deviceLatency.inputLatency + this.deviceLatency.outputLatency;
    
    // Calculate compensation for each node
    for (const [nodeId, pathLatency] of pathLatencies) {
      const compensation = maxLatency - pathLatency;
      compensationDelays.set(nodeId, Math.max(0, compensation));
    }
    
    this.model = {
      inputLatency: this.deviceLatency.inputLatency,
      outputLatency: this.deviceLatency.outputLatency,
      roundTripLatency: this.deviceLatency.inputLatency + this.deviceLatency.outputLatency,
      pluginLatencies: new Map(this.pluginLatencies),
      pathLatencies,
      compensationDelays,
      maxLatency: totalMaxLatency,
    };
    
    this.needsRecalculation = false;
  }
  
  /** Calculate total latency for a track path */
  private calculateTrackLatency(track: GraphTrack): number {
    let latency = 0;
    
    // Add insert latencies
    for (const insertId of track.inserts) {
      latency += this.pluginLatencies.get(insertId) ?? 0;
    }
    
    // Add latency through output chain
    if (track.outputBusId) {
      const bus = this.graph.buses.find(b => b.id === track.outputBusId);
      if (bus) {
        latency += this.calculateBusLatency(bus);
      }
    } else {
      // Direct to master
      latency += this.calculateMasterLatency();
    }
    
    return latency;
  }
  
  /** Calculate latency for a bus path */
  private calculateBusLatency(bus: GraphBus): number {
    let latency = 0;
    
    // Add insert latencies
    for (const insertId of bus.inserts) {
      latency += this.pluginLatencies.get(insertId) ?? 0;
    }
    
    // Add latency through output chain
    if (bus.outputBusId) {
      const parentBus = this.graph.buses.find(b => b.id === bus.outputBusId);
      if (parentBus) {
        latency += this.calculateBusLatency(parentBus);
      }
    } else {
      // To master
      latency += this.calculateMasterLatency();
    }
    
    return latency;
  }
  
  /** Calculate master section latency */
  private calculateMasterLatency(): number {
    let latency = 0;
    
    for (const insertId of this.graph.master.inserts) {
      latency += this.pluginLatencies.get(insertId) ?? 0;
    }
    
    if (this.graph.master.limiterId) {
      latency += this.pluginLatencies.get(this.graph.master.limiterId) ?? 0;
    }
    
    return latency;
  }
  
  /** Get the compensation delay for a specific node */
  getCompensationDelay(nodeId: NodeId): number {
    if (this.needsRecalculation) {
      this.recalculate();
    }
    return this.model.compensationDelays.get(nodeId) ?? 0;
  }
  
  /** Get the total path latency for a node */
  getPathLatency(nodeId: NodeId): number {
    if (this.needsRecalculation) {
      this.recalculate();
    }
    return this.model.pathLatencies.get(nodeId) ?? 0;
  }
  
  /**
   * Calculate record offset for latency-compensated recording
   * @param trackId - Track being recorded
   * @returns Sample offset to apply to recorded material
   */
  calculateRecordOffset(trackId: NodeId): number {
    if (this.needsRecalculation) {
      this.recalculate();
    }
    
    // Compensate for input latency
    let offset = this.deviceLatency.inputLatency;
    
    // Add compensation to align with other tracks
    const trackLatency = this.model.pathLatencies.get(trackId) ?? 0;
    offset += this.model.maxLatency - trackLatency;
    
    return Math.round(offset);
  }
  
  /**
   * Calculate monitoring delay for low-latency monitoring
   * @param mode - Monitoring mode
   * @returns Suggested delay in samples
   */
  calculateMonitoringDelay(mode: 'compensated' | 'direct' | 'safe'): number {
    switch (mode) {
      case 'compensated':
        // Full PDC, higher latency
        return this.model.maxLatency;
      case 'direct':
        // Minimal latency, no PDC
        return 0;
      case 'safe':
        // Conservative middle ground
        return Math.floor(this.model.maxLatency / 2);
      default:
        return 0;
    }
  }
  
  /** Get input latency */
  getInputLatency(): number {
    return this.deviceLatency.inputLatency;
  }
  
  /** Get output latency */
  getOutputLatency(): number {
    return this.deviceLatency.outputLatency;
  }
  
  /** Get round-trip latency estimate */
  getRoundTripLatency(): number {
    return this.deviceLatency.inputLatency + this.deviceLatency.outputLatency;
  }
  
  /** Check if PDC is active (there are compensation delays needed) */
  isPDCActive(): boolean {
    if (this.needsRecalculation) {
      this.recalculate();
    }
    for (const delay of this.model.compensationDelays.values()) {
      if (delay > 0) return true;
    }
    return false;
  }
  
  /** Reset all latency data */
  reset(): void {
    this.pluginLatencies.clear();
    this.deviceLatency = { inputLatency: 0, outputLatency: 0 };
    this.model = this.createEmptyModel();
    this.needsRecalculation = true;
  }
}

/** Create a latency compensator for a graph */
export function createLatencyCompensator(graph: EngineGraph): LatencyCompensator {
  return new LatencyCompensator(graph);
}

/** Estimate device latency from AudioContext */
export function estimateDeviceLatency(audioContext: AudioContext): DeviceLatency {
  // Try to get latency info from AudioContext if available
  const baseLatency = (audioContext as unknown as { baseLatency?: number }).baseLatency ?? 0;
  const outputLatency = (audioContext as unknown as { outputLatency?: number }).outputLatency ?? 0;
  
  // Convert seconds to samples
  const sampleRate = audioContext.sampleRate;
  
  return {
    inputLatency: Math.round(baseLatency * sampleRate),
    outputLatency: Math.round(outputLatency * sampleRate),
  };
}

/**
 * Create a latency-compensated delay node
 * Returns delay time in seconds for use with DelayNode
 */
export function createCompensationDelay(
  compensator: LatencyCompensator,
  nodeId: NodeId,
  sampleRate: number
): number {
  const delaySamples = compensator.getCompensationDelay(nodeId);
  return delaySamples / sampleRate;
}

/** Validate that latency values are within acceptable bounds */
export function validateLatency(latencySamples: number, sampleRate: number): {
  valid: boolean;
  warning?: string;
} {
  const latencyMs = (latencySamples / sampleRate) * 1000;
  
  if (latencySamples < 0) {
    return { valid: false, warning: 'Negative latency reported' };
  }
  
  if (latencyMs > 100) {
    return { valid: true, warning: `High latency: ${latencyMs.toFixed(1)}ms` };
  }
  
  return { valid: true };
}
