/**
 * Audio Graph Model
 * Implements section 9 of the engineering spec
 * 
 * The graph represents the audio routing structure:
 * - Tracks with sources, inserts, sends
 * - Buses for group processing
 * - Master output
 * - Sidechain routing
 */

/** Unique identifier for graph nodes */
export type NodeId = string;

/** Connection between nodes */
export interface GraphConnection {
  /** Source node ID */
  from: NodeId;
  /** Destination node ID */
  to: NodeId;
  /** Output channel of source (0 = left, 1 = right) */
  fromChannel: number;
  /** Input channel of destination */
  toChannel: number;
  /** Gain multiplier (linear) */
  gain: number;
}

/** Send slot configuration */
export interface GraphSend {
  /** Target bus ID */
  busId: NodeId;
  /** Send level in dB */
  gainDb: number;
  /** Pre-fader send */
  preFader: boolean;
}

/** Track source types */
export type TrackSource =
  | { kind: 'audioClips'; clipIds: string[] }
  | { kind: 'instrument'; pluginId: string }
  | { kind: 'externalInput'; inputId: string }
  | { kind: 'hybrid'; clipIds: string[]; pluginId: string };

/** Graph track node */
export interface GraphTrack {
  id: NodeId;
  /** Track name */
  name: string;
  /** Audio source for this track */
  source: TrackSource;
  /** Note FX chain (MIDI processing before instrument) */
  noteFx: NodeId[];
  /** Insert FX chain (audio processing) */
  inserts: NodeId[];
  /** Send buses */
  sends: GraphSend[];
  /** Output bus ID (null for direct to master) */
  outputBusId: NodeId | null;
  /** Channel count */
  channelCount: number;
  /** Fader gain in dB */
  faderDb: number;
  /** Pan position (-1 = left, 0 = center, 1 = right) */
  pan: number;
  /** Mute state */
  mute: boolean;
  /** Solo state */
  solo: boolean;
  /** Arm for recording */
  arm: boolean;
  /** Monitor mode */
  monitorMode: 'off' | 'auto' | 'in';
  /** Computed latency for PDC */
  computedLatency: number;
}

/** Bus track for group processing */
export interface GraphBus {
  id: NodeId;
  name: string;
  /** Insert FX chain */
  inserts: NodeId[];
  /** Sends to other buses */
  sends: GraphSend[];
  /** Output bus ID (null for master) */
  outputBusId: NodeId | null;
  channelCount: number;
  faderDb: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  /** Whether this bus can be used as sidechain source */
  sidechainSource: boolean;
  /** Computed latency for PDC */
  computedLatency: number;
}

/** Master output section */
export interface GraphMaster {
  id: 'master';
  name: string;
  /** Insert FX chain (usually master bus processing) */
  inserts: NodeId[];
  /** Limiter slot (always last) */
  limiterId: NodeId | null;
  /** Metering plugin */
  meterId: NodeId | null;
  channelCount: number;
  faderDb: number;
  /** Computed latency for PDC */
  computedLatency: number;
}

/** Monitor/headphone output (separate from master) */
export interface GraphMonitor {
  id: 'monitor';
  /** Input source (master or specific bus) */
  sourceId: NodeId;
  /** Monitor level */
  gainDb: number;
  /** Dim level */
  dimDb: number;
  /** Whether dim is active */
  dimActive: boolean;
  /** Mono check */
  mono: boolean;
}

/** Complete engine graph */
export interface EngineGraph {
  tracks: GraphTrack[];
  buses: GraphBus[];
  master: GraphMaster;
  monitor: GraphMonitor;
  /** Sidechain routing (source -> destination mappings) */
  sidechains: Map<NodeId, NodeId[]>;
}

/** Plugin instance in the graph */
export interface GraphPlugin {
  id: NodeId;
  /** Plugin definition ID */
  pluginId: string;
  /** Instance name */
  name: string;
  /** Reported latency in samples */
  latencySamples: number;
  /** Whether plugin is bypassed */
  bypass: boolean;
  /** Whether plugin is enabled */
  enabled: boolean;
}

/** Latency compensation information */
export interface LatencyCompensationInfo {
  /** Maximum latency in the graph */
  maxLatency: number;
  /** Per-node latency values */
  nodeLatencies: Map<NodeId, number>;
  /** Per-node delay compensation offsets */
  nodeCompensationOffsets: Map<NodeId, number>;
}

/**
 * Audio Graph Builder
 * Simplifies constructing valid graph configurations
 */
export class GraphBuilder {
  private tracks: GraphTrack[] = [];
  private buses: GraphBus[] = [];
  private master: GraphMaster;
  private monitor: GraphMonitor;
  private sidechains: Map<NodeId, NodeId[]> = new Map();
  private plugins: Map<NodeId, GraphPlugin> = new Map();
  
  constructor() {
    this.master = {
      id: 'master',
      name: 'Master',
      inserts: [],
      limiterId: null,
      meterId: null,
      channelCount: 2,
      faderDb: 0,
      computedLatency: 0,
    };
    
    this.monitor = {
      id: 'monitor',
      sourceId: 'master',
      gainDb: 0,
      dimDb: -20,
      dimActive: false,
      mono: false,
    };
  }
  
  /** Add a track to the graph */
  addTrack(track: Omit<GraphTrack, 'computedLatency'>): GraphBuilder {
    this.tracks.push({
      ...track,
      computedLatency: 0,
    });
    return this;
  }
  
  /** Add a bus to the graph */
  addBus(bus: Omit<GraphBus, 'computedLatency'>): GraphBuilder {
    this.buses.push({
      ...bus,
      computedLatency: 0,
    });
    return this;
  }
  
  /** Set master configuration */
  setMaster(master: Omit<GraphMaster, 'id' | 'computedLatency'>): GraphBuilder {
    this.master = {
      ...master,
      id: 'master',
      computedLatency: 0,
    };
    return this;
  }
  
  /** Set monitor configuration */
  setMonitor(monitor: Omit<GraphMonitor, 'id'>): GraphBuilder {
    this.monitor = {
      ...monitor,
      id: 'monitor',
    };
    return this;
  }
  
  /** Add sidechain routing */
  addSidechain(sourceId: NodeId, targetId: NodeId): GraphBuilder {
    const targets = this.sidechains.get(sourceId) ?? [];
    if (!targets.includes(targetId)) {
      targets.push(targetId);
      this.sidechains.set(sourceId, targets);
    }
    return this;
  }
  
  /** Register a plugin instance */
  addPlugin(plugin: GraphPlugin): GraphBuilder {
    this.plugins.set(plugin.id, plugin);
    return this;
  }
  
  /** Build the final graph */
  build(): EngineGraph {
    return {
      tracks: [...this.tracks],
      buses: [...this.buses],
      master: { ...this.master },
      monitor: { ...this.monitor },
      sidechains: new Map(this.sidechains),
    };
  }
}

/**
 * Calculate latency compensation for the graph
 * Per spec section 8.4
 */
export function calculateLatencyCompensation(
  graph: EngineGraph,
  pluginLatencies: Map<NodeId, number>
): LatencyCompensationInfo {
  const nodeLatencies = new Map<NodeId, number>();
  const nodeCompensationOffsets = new Map<NodeId, number>();
  
  // Calculate latency for each track path
  for (const track of graph.tracks) {
    let trackLatency = 0;
    
    // Sum insert latencies
    for (const insertId of track.inserts) {
      const pluginLatency = pluginLatencies.get(insertId) ?? 0;
      trackLatency += pluginLatency;
    }
    
    nodeLatencies.set(track.id, trackLatency);
  }
  
  // Calculate latency for each bus
  for (const bus of graph.buses) {
    let busLatency = 0;
    
    for (const insertId of bus.inserts) {
      const pluginLatency = pluginLatencies.get(insertId) ?? 0;
      busLatency += pluginLatency;
    }
    
    nodeLatencies.set(bus.id, busLatency);
  }
  
  // Calculate master latency
  let masterLatency = 0;
  for (const insertId of graph.master.inserts) {
    const pluginLatency = pluginLatencies.get(insertId) ?? 0;
    masterLatency += pluginLatency;
  }
  nodeLatencies.set('master', masterLatency);
  
  // Find maximum latency
  let maxLatency = 0;
  for (const latency of nodeLatencies.values()) {
    maxLatency = Math.max(maxLatency, latency);
  }
  
  // Calculate compensation offsets (delay each path by difference from max)
  for (const [nodeId, latency] of nodeLatencies) {
    nodeCompensationOffsets.set(nodeId, maxLatency - latency);
  }
  
  return {
    maxLatency,
    nodeLatencies,
    nodeCompensationOffsets,
  };
}

/**
 * Validate graph for common errors
 */
export function validateGraph(graph: EngineGraph): string[] {
  const errors: string[] = [];
  const nodeIds = new Set<NodeId>();
  
  // Collect all node IDs
  nodeIds.add('master');
  nodeIds.add('monitor');
  
  for (const track of graph.tracks) {
    if (nodeIds.has(track.id)) {
      errors.push(`Duplicate node ID: ${track.id}`);
    }
    nodeIds.add(track.id);
    
    // Validate sends
    for (const send of track.sends) {
      const targetBus = graph.buses.find(b => b.id === send.busId);
      if (!targetBus && send.busId !== 'master') {
        errors.push(`Track ${track.id} sends to non-existent bus: ${send.busId}`);
      }
    }
  }
  
  for (const bus of graph.buses) {
    if (nodeIds.has(bus.id)) {
      errors.push(`Duplicate node ID: ${bus.id}`);
    }
    nodeIds.add(bus.id);
    
    // Validate output
    if (bus.outputBusId && bus.outputBusId !== 'master') {
      const targetBus = graph.buses.find(b => b.id === bus.outputBusId);
      if (!targetBus) {
        errors.push(`Bus ${bus.id} outputs to non-existent bus: ${bus.outputBusId}`);
      }
    }
  }
  
  // Validate monitor source
  if (!nodeIds.has(graph.monitor.sourceId)) {
    errors.push(`Monitor source does not exist: ${graph.monitor.sourceId}`);
  }
  
  // Check for cycles in bus routing
  function hasCycle(nodeId: NodeId, visited: Set<NodeId> = new Set()): boolean {
    if (visited.has(nodeId)) return true;
    if (nodeId === 'master' || nodeId === null) return false;
    
    visited.add(nodeId);
    
    const bus = graph.buses.find(b => b.id === nodeId);
    if (bus) {
      for (const send of bus.sends) {
        if (hasCycle(send.busId, new Set(visited))) return true;
      }
      if (bus.outputBusId) {
        if (hasCycle(bus.outputBusId, new Set(visited))) return true;
      }
    }
    
    return false;
  }
  
  for (const bus of graph.buses) {
    if (hasCycle(bus.id)) {
      errors.push(`Cycle detected in bus routing involving: ${bus.id}`);
    }
  }
  
  return errors;
}

/** Create a minimal graph with just a master output */
export function createMinimalGraph(): EngineGraph {
  return new GraphBuilder().build();
}

/** Create a standard graph with one audio track */
export function createDefaultGraph(): EngineGraph {
  return new GraphBuilder()
    .addTrack({
      id: 'track-1',
      name: 'Audio 1',
      source: { kind: 'audioClips', clipIds: [] },
      noteFx: [],
      inserts: [],
      sends: [],
      outputBusId: null,
      channelCount: 2,
      faderDb: 0,
      pan: 0,
      mute: false,
      solo: false,
      arm: false,
      monitorMode: 'auto',
    })
    .build();
}
