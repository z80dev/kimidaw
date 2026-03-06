/**
 * Tests for enhanced import features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createALSImporter,
  createREXImporter,
  createEnhancedImportManager,
  parseACIDChunk,
  parseAppleLoopMetadata,
  detectTempoAndWarp,
  autoSliceDrums,
  DEFAULT_ALS_IMPORT_OPTIONS,
  DEFAULT_REX_IMPORT_OPTIONS,
} from '../import-enhanced.js';

describe('Enhanced Import Features', () => {
  describe('ALS Importer', () => {
    it('should create an ALS importer', () => {
      const importer = createALSImporter();
      expect(importer).toBeDefined();
      expect(importer.parseALS).toBeInstanceOf(Function);
      expect(importer.importALS).toBeInstanceOf(Function);
    });
    
    it('should have correct default options', () => {
      expect(DEFAULT_ALS_IMPORT_OPTIONS.importAssets).toBe(true);
      expect(DEFAULT_ALS_IMPORT_OPTIONS.matchTempo).toBe(true);
      expect(DEFAULT_ALS_IMPORT_OPTIONS.createMissingTracks).toBe(true);
      expect(DEFAULT_ALS_IMPORT_OPTIONS.importWarpMarkers).toBe(true);
      expect(DEFAULT_ALS_IMPORT_OPTIONS.importDevices).toBe(false);
    });
  });
  
  describe('REX Importer', () => {
    it('should create a REX importer', () => {
      const importer = createREXImporter();
      expect(importer).toBeDefined();
      expect(importer.importREX).toBeInstanceOf(Function);
      expect(importer.parseSlices).toBeInstanceOf(Function);
    });
    
    it('should have correct default options', () => {
      expect(DEFAULT_REX_IMPORT_OPTIONS.sliceMode).toBe('slices');
      expect(DEFAULT_REX_IMPORT_OPTIONS.preserveTempo).toBe(true);
      expect(DEFAULT_REX_IMPORT_OPTIONS.createDrumRack).toBe(true);
    });
    
    it('should reject invalid REX files', async () => {
      const importer = createREXImporter();
      const invalidFile = new File(['NOTREX'], 'test.rex');
      
      await expect(importer.importREX(invalidFile)).rejects.toThrow('Invalid REX file');
    });
  });
  
  describe('ACID Loop Parser', () => {
    it('should return null for files without ACID chunk', () => {
      const wavData = new ArrayBuffer(100);
      const view = new DataView(wavData);
      // Write WAV header without ACID chunk
      view.setUint32(0, 0x52494646, false); // 'RIFF'
      view.setUint32(8, 0x57415645, false); // 'WAVE'
      
      const result = parseACIDChunk(wavData);
      expect(result).toBeNull();
    });
  });
  
  describe('Apple Loop Parser', () => {
    it('should return null for non-Apple files', () => {
      const data = new ArrayBuffer(100);
      const view = new DataView(data);
      view.setUint32(0, 0x464F524D, false); // 'FORM' (not CAF)
      view.setUint32(8, 0x424D5046, false); // 'BMPF' (not AIFF)
      
      const result = parseAppleLoopMetadata(data);
      expect(result).toBeNull();
    });
  });
  
  describe('Tempo Detection', () => {
    it('should detect tempo from audio buffer', () => {
      // Create a mock audio buffer with a simple rhythmic pattern
      const sampleRate = 44100;
      const duration = 4; // 4 seconds
      const length = sampleRate * duration;
      const channelData = new Float32Array(length);
      
      // Create impulses every 0.5 seconds (120 BPM with quarter notes)
      for (let i = 0; i < duration * 2; i++) {
        const sampleIndex = Math.floor(i * 0.5 * sampleRate);
        if (sampleIndex < length) {
          channelData[sampleIndex] = 1.0;
          // Add some decay
          for (let j = 1; j < 100 && sampleIndex + j < length; j++) {
            channelData[sampleIndex + j] = 1.0 * (1 - j / 100);
          }
        }
      }
      
      const mockBuffer = {
        sampleRate,
        duration,
        length,
        numberOfChannels: 1,
        getChannelData: () => channelData,
      } as unknown as AudioBuffer;
      
      const result = detectTempoAndWarp(mockBuffer);
      
      expect(result.detectedTempo).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.transientPositions.length).toBeGreaterThan(0);
      expect(Array.isArray(result.suggestedWarpMarkers)).toBe(true);
    });
    
    it('should respect tempo bounds', () => {
      const sampleRate = 44100;
      const duration = 2;
      const length = sampleRate * duration;
      const channelData = new Float32Array(length);
      
      // Very fast impulses
      for (let i = 0; i < 40; i++) {
        const sampleIndex = Math.floor(i * 0.05 * sampleRate);
        if (sampleIndex < length) {
          channelData[sampleIndex] = 1.0;
        }
      }
      
      const mockBuffer = {
        sampleRate,
        duration,
        length,
        numberOfChannels: 1,
        getChannelData: () => channelData,
      } as unknown as AudioBuffer;
      
      const result = detectTempoAndWarp(mockBuffer, { maxTempo: 180, minTempo: 80 });
      
      expect(result.detectedTempo).toBeGreaterThanOrEqual(80);
      expect(result.detectedTempo).toBeLessThanOrEqual(180);
    });
  });
  
  describe('Auto-Slice', () => {
    it('should slice drum loops', () => {
      const sampleRate = 44100;
      const duration = 2;
      const length = sampleRate * duration;
      const channelData = new Float32Array(length);
      
      // Create drum pattern impulses
      const pattern = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75];
      for (const time of pattern) {
        const sampleIndex = Math.floor(time * sampleRate);
        if (sampleIndex < length) {
          channelData[sampleIndex] = 1.0;
          // Add decay
          for (let j = 1; j < 200 && sampleIndex + j < length; j++) {
            channelData[sampleIndex + j] = 1.0 * (1 - j / 200);
          }
        }
      }
      
      const mockBuffer = {
        sampleRate,
        duration,
        length,
        numberOfChannels: 1,
        getChannelData: () => channelData,
      } as unknown as AudioBuffer;
      
      const result = autoSliceDrums(mockBuffer);
      
      expect(result.slices.length).toBeGreaterThan(0);
      expect(result.method).toBe('transient');
      
      for (const slice of result.slices) {
        expect(slice.start).toBeGreaterThanOrEqual(0);
        expect(slice.end).toBeGreaterThan(slice.start);
        expect(slice.end).toBeLessThanOrEqual(duration);
      }
    });
    
    it('should respect min/max slice lengths', () => {
      const sampleRate = 44100;
      const duration = 4;
      const length = sampleRate * duration;
      const channelData = new Float32Array(length);
      
      // Create pattern
      for (let i = 0; i < 20; i++) {
        const sampleIndex = Math.floor(i * 0.2 * sampleRate);
        if (sampleIndex < length) {
          channelData[sampleIndex] = 1.0;
        }
      }
      
      const mockBuffer = {
        sampleRate,
        duration,
        length,
        numberOfChannels: 1,
        getChannelData: () => channelData,
      } as unknown as AudioBuffer;
      
      const result = autoSliceDrums(mockBuffer, {
        minSliceLength: 0.1,
        maxSliceLength: 1.0,
      });
      
      for (const slice of result.slices) {
        const duration = slice.end - slice.start;
        expect(duration).toBeGreaterThanOrEqual(0.1);
        expect(duration).toBeLessThanOrEqual(1.0);
      }
    });
  });
  
  describe('Enhanced Import Manager', () => {
    let manager: ReturnType<typeof createEnhancedImportManager>;
    
    beforeEach(() => {
      manager = createEnhancedImportManager();
    });
    
    it('should be created with all methods', () => {
      expect(manager.importALS).toBeInstanceOf(Function);
      expect(manager.importREX).toBeInstanceOf(Function);
      expect(manager.extractACIDMetadata).toBeInstanceOf(Function);
      expect(manager.extractAppleMetadata).toBeInstanceOf(Function);
      expect(manager.autoWarp).toBeInstanceOf(Function);
      expect(manager.autoSlice).toBeInstanceOf(Function);
      expect(manager.batchImport).toBeInstanceOf(Function);
    });
    
    it('should handle batch import', async () => {
      const files = [
        new File(['test'], 'test.als'),
        new File(['test'], 'test.rex'),
        new File(['test'], 'test.wav'),
      ];
      
      const results = await manager.batchImport(files);
      expect(results.length).toBe(3);
    });
    
    it('should handle empty batch import', async () => {
      const results = await manager.batchImport([]);
      expect(results).toEqual([]);
    });
  });
});
