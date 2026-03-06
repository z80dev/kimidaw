import { describe, it, expect } from 'vitest';
import {
  GraphBuilder,
  validateGraph,
  calculateLatencyCompensation,
  createMinimalGraph,
  createDefaultGraph,
} from '../graph.js';

describe('GraphBuilder', () => {
  it('builds minimal graph with just master', () => {
    const graph = new GraphBuilder().build();
    expect(graph.tracks).toHaveLength(0);
    expect(graph.buses).toHaveLength(0);
    expect(graph.master.id).toBe('master');
  });
  
  it('adds tracks', () => {
    const graph = new GraphBuilder()
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
    
    expect(graph.tracks).toHaveLength(1);
    expect(graph.tracks[0].id).toBe('track-1');
  });
  
  it('adds buses', () => {
    const graph = new GraphBuilder()
      .addBus({
        id: 'bus-1',
        name: 'Reverb',
        inserts: [],
        sends: [],
        outputBusId: null,
        channelCount: 2,
        faderDb: 0,
        pan: 0,
        mute: false,
        solo: false,
        sidechainSource: true,
      })
      .build();
    
    expect(graph.buses).toHaveLength(1);
    expect(graph.buses[0].id).toBe('bus-1');
  });
  
  it('adds sidechain routing', () => {
    const graph = new GraphBuilder()
      .addBus({
        id: 'sidechain-bus',
        name: 'Sidechain',
        inserts: [],
        sends: [],
        outputBusId: null,
        channelCount: 2,
        faderDb: 0,
        pan: 0,
        mute: false,
        solo: false,
        sidechainSource: true,
      })
      .addTrack({
        id: 'track-1',
        name: 'Kick',
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
      .addSidechain('track-1', 'sidechain-bus')
      .build();
    
    expect(graph.sidechains.get('track-1')).toContain('sidechain-bus');
  });
});

describe('validateGraph', () => {
  it('passes for minimal valid graph', () => {
    const graph = createMinimalGraph();
    const errors = validateGraph(graph);
    expect(errors).toHaveLength(0);
  });
  
  it('detects duplicate node IDs', () => {
    const graph = new GraphBuilder()
      .addTrack({
        id: 'duplicate',
        name: 'Track 1',
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
      .addTrack({
        id: 'duplicate', // Same ID
        name: 'Track 2',
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
    
    const errors = validateGraph(graph);
    expect(errors.some(e => e.includes('Duplicate'))).toBe(true);
  });
  
  it('detects non-existent send target', () => {
    const graph = new GraphBuilder()
      .addTrack({
        id: 'track-1',
        name: 'Track 1',
        source: { kind: 'audioClips', clipIds: [] },
        noteFx: [],
        inserts: [],
        sends: [{ busId: 'non-existent', gainDb: 0, preFader: false }],
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
    
    const errors = validateGraph(graph);
    expect(errors.some(e => e.includes('non-existent'))).toBe(true);
  });
  
  it('detects cycles in bus routing', () => {
    const graph = new GraphBuilder()
      .addBus({
        id: 'bus-a',
        name: 'Bus A',
        inserts: [],
        sends: [],
        outputBusId: 'bus-b',
        channelCount: 2,
        faderDb: 0,
        pan: 0,
        mute: false,
        solo: false,
        sidechainSource: false,
      })
      .addBus({
        id: 'bus-b',
        name: 'Bus B',
        inserts: [],
        sends: [],
        outputBusId: 'bus-a', // Creates cycle
        channelCount: 2,
        faderDb: 0,
        pan: 0,
        mute: false,
        solo: false,
        sidechainSource: false,
      })
      .build();
    
    const errors = validateGraph(graph);
    expect(errors.some(e => e.includes('Cycle'))).toBe(true);
  });
});

describe('calculateLatencyCompensation', () => {
  it('calculates zero compensation with no plugins', () => {
    const graph = createDefaultGraph();
    const pluginLatencies = new Map();
    
    const compensation = calculateLatencyCompensation(graph, pluginLatencies);
    
    expect(compensation.maxLatency).toBe(0);
    expect(compensation.nodeLatencies.get('track-1')).toBe(0);
  });
  
  it('calculates plugin latency correctly', () => {
    const graph = new GraphBuilder()
      .addTrack({
        id: 'track-1',
        name: 'Track 1',
        source: { kind: 'audioClips', clipIds: [] },
        noteFx: [],
        inserts: ['plugin-1', 'plugin-2'],
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
    
    const pluginLatencies = new Map([
      ['plugin-1', 100],
      ['plugin-2', 200],
    ]);
    
    const compensation = calculateLatencyCompensation(graph, pluginLatencies);
    
    // Track latency = 100 + 200 = 300
    expect(compensation.nodeLatencies.get('track-1')).toBe(300);
    expect(compensation.maxLatency).toBe(300);
    
    // No compensation needed for the max latency path
    expect(compensation.nodeCompensationOffsets.get('track-1')).toBe(0);
  });
  
  it('calculates compensation for multiple paths', () => {
    const graph = new GraphBuilder()
      .addTrack({
        id: 'fast-track',
        name: 'Fast',
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
      .addTrack({
        id: 'slow-track',
        name: 'Slow',
        source: { kind: 'audioClips', clipIds: [] },
        noteFx: [],
        inserts: ['heavy-plugin'],
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
    
    const pluginLatencies = new Map([['heavy-plugin', 500]]);
    const compensation = calculateLatencyCompensation(graph, pluginLatencies);
    
    expect(compensation.maxLatency).toBe(500);
    // Fast track needs compensation to align with slow track
    expect(compensation.nodeCompensationOffsets.get('fast-track')).toBe(500);
    // Slow track is already at max
    expect(compensation.nodeCompensationOffsets.get('slow-track')).toBe(0);
  });
});

describe('createMinimalGraph', () => {
  it('creates graph with just master', () => {
    const graph = createMinimalGraph();
    expect(graph.tracks).toHaveLength(0);
    expect(graph.buses).toHaveLength(0);
    expect(graph.master).toBeDefined();
  });
});

describe('createDefaultGraph', () => {
  it('creates graph with one track', () => {
    const graph = createDefaultGraph();
    expect(graph.tracks).toHaveLength(1);
    expect(graph.tracks[0].name).toBe('Audio 1');
    expect(graph.master).toBeDefined();
  });
});
