import { describe, it, expect, beforeEach } from 'vitest';
import {
  LatencyCompensator,
  createLatencyCompensator,
  validateLatency,
} from '../latency.js';
import { createMinimalGraph, type EngineGraph } from '../graph.js';

describe('LatencyCompensator', () => {
  let graph: EngineGraph;
  let compensator: LatencyCompensator;
  
  beforeEach(() => {
    graph = createMinimalGraph();
    compensator = createLatencyCompensator(graph);
  });
  
  describe('initialization', () => {
    it('creates with empty latency model', () => {
      const model = compensator.getLatencyModel();
      expect(model.maxLatency).toBe(0);
      expect(model.inputLatency).toBe(0);
      expect(model.outputLatency).toBe(0);
    });
  });
  
  describe('device latency', () => {
    it('sets device latency', () => {
      compensator.setDeviceLatency({
        inputLatency: 128,
        outputLatency: 256,
      });
      
      const model = compensator.getLatencyModel();
      expect(model.inputLatency).toBe(128);
      expect(model.outputLatency).toBe(256);
      expect(model.roundTripLatency).toBe(384);
    });
  });
  
  describe('plugin latency', () => {
    it('reports plugin latency', () => {
      compensator.reportPluginLatency({
        pluginId: 'eq-1',
        latencySamples: 100,
        isDynamic: false,
      });
      
      const model = compensator.getLatencyModel();
      expect(model.pluginLatencies.get('eq-1')).toBe(100);
    });
    
    it('updates latency when changed', () => {
      compensator.reportPluginLatency({
        pluginId: 'compressor-1',
        latencySamples: 200,
        isDynamic: false,
      });
      
      compensator.reportPluginLatency({
        pluginId: 'compressor-1',
        latencySamples: 300,
        isDynamic: false,
      });
      
      const model = compensator.getLatencyModel();
      expect(model.pluginLatencies.get('compressor-1')).toBe(300);
    });
    
    it('removes plugin latency', () => {
      compensator.reportPluginLatency({
        pluginId: 'temp-plugin',
        latencySamples: 100,
        isDynamic: false,
      });
      
      compensator.removePlugin('temp-plugin');
      
      const model = compensator.getLatencyModel();
      expect(model.pluginLatencies.has('temp-plugin')).toBe(false);
    });
  });
  
  describe('PDC detection', () => {
    it('detects when PDC is inactive', () => {
      expect(compensator.isPDCActive()).toBe(false);
    });
    
    it('detects when PDC is active with latencies', () => {
      // Create graph with multiple tracks
      const { GraphBuilder } = await import('../graph.js');
      const graphWithTracks = new GraphBuilder()
        .addTrack({
          id: 'track-1',
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
          id: 'track-2',
          name: 'Track 2',
          source: { kind: 'audioClips', clipIds: [] },
          noteFx: [],
          inserts: ['latency-plugin'],
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
      
      const comp = createLatencyCompensator(graphWithTracks);
      comp.reportPluginLatency({
        pluginId: 'latency-plugin',
        latencySamples: 500,
        isDynamic: false,
      });
      
      // PDC should be active because track-1 needs compensation
      expect(comp.isPDCActive()).toBe(true);
    });
  });
  
  describe('record offset', () => {
    it('calculates record offset with device latency', () => {
      compensator.setDeviceLatency({
        inputLatency: 128,
        outputLatency: 256,
      });
      
      const offset = compensator.calculateRecordOffset('any-track');
      
      // Should at least include input latency
      expect(offset).toBeGreaterThanOrEqual(128);
    });
  });
  
  describe('monitoring delay', () => {
    it('returns 0 for direct monitoring', () => {
      const delay = compensator.calculateMonitoringDelay('direct');
      expect(delay).toBe(0);
    });
    
    it('returns max latency for compensated monitoring', () => {
      compensator.setDeviceLatency({
        inputLatency: 100,
        outputLatency: 200,
      });
      
      const delay = compensator.calculateMonitoringDelay('compensated');
      expect(delay).toBe(300); // input + output
    });
    
    it('returns half latency for safe monitoring', () => {
      compensator.setDeviceLatency({
        inputLatency: 100,
        outputLatency: 200,
      });
      
      const delay = compensator.calculateMonitoringDelay('safe');
      expect(delay).toBe(150); // (100 + 200) / 2
    });
  });
  
  describe('reset', () => {
    it('clears all latency data', () => {
      compensator.setDeviceLatency({ inputLatency: 100, outputLatency: 200 });
      compensator.reportPluginLatency({
        pluginId: 'plugin-1',
        latencySamples: 300,
        isDynamic: false,
      });
      
      compensator.reset();
      
      const model = compensator.getLatencyModel();
      expect(model.inputLatency).toBe(0);
      expect(model.outputLatency).toBe(0);
      expect(model.pluginLatencies.size).toBe(0);
    });
  });
});

describe('validateLatency', () => {
  const sampleRate = 48000;
  
  it('accepts valid latency', () => {
    const result = validateLatency(100, sampleRate);
    expect(result.valid).toBe(true);
    expect(result.warning).toBeUndefined();
  });
  
  it('rejects negative latency', () => {
    const result = validateLatency(-100, sampleRate);
    expect(result.valid).toBe(false);
  });
  
  it('warns on high latency (>100ms)', () => {
    const highLatency = Math.ceil(0.15 * sampleRate); // 150ms
    const result = validateLatency(highLatency, sampleRate);
    expect(result.valid).toBe(true);
    expect(result.warning).toContain('High latency');
  });
});
