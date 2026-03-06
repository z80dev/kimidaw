/**
 * Tests for File Manager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createFileManager,
  getFileExtension,
  getFileType,
  isExternalPath,
  normalizePath,
  getRelativePath,
} from '../FileManager.js';

describe('FileManager', () => {
  const mockStorage = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    listFiles: vi.fn(),
    exists: vi.fn(),
    delete: vi.fn(),
    stat: vi.fn(),
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should create a file manager', () => {
    const manager = createFileManager(mockStorage);
    expect(manager).toBeDefined();
    expect(manager.scanProject).toBeInstanceOf(Function);
    expect(manager.findMissingFiles).toBeInstanceOf(Function);
    expect(manager.collectAndSave).toBeInstanceOf(Function);
    expect(manager.purgeUnusedFiles).toBeInstanceOf(Function);
  });
});

describe('Utility Functions', () => {
  describe('getFileExtension', () => {
    it('should extract extension from filename', () => {
      expect(getFileExtension('test.wav')).toBe('wav');
      expect(getFileExtension('test.WAV')).toBe('wav');
      expect(getFileExtension('test.file.name.wav')).toBe('wav');
    });
    
    it('should return empty string for files without extension', () => {
      expect(getFileExtension('test')).toBe('');
      expect(getFileExtension('test.')).toBe('');
    });
  });
  
  describe('getFileType', () => {
    it('should identify audio files', () => {
      expect(getFileType('wav')).toBe('audio');
      expect(getFileType('mp3')).toBe('audio');
      expect(getFileType('flac')).toBe('audio');
    });
    
    it('should identify MIDI files', () => {
      expect(getFileType('mid')).toBe('midi');
      expect(getFileType('midi')).toBe('midi');
    });
    
    it('should identify preset files', () => {
      expect(getFileType('adg')).toBe('preset');
      expect(getFileType('adv')).toBe('preset');
    });
    
    it('should identify script files', () => {
      expect(getFileType('js')).toBe('script');
      expect(getFileType('ts')).toBe('script');
    });
    
    it('should return other for unknown extensions', () => {
      expect(getFileType('xyz')).toBe('other');
      expect(getFileType('')).toBe('other');
    });
  });
  
  describe('isExternalPath', () => {
    it('should identify HTTP URLs', () => {
      expect(isExternalPath('http://example.com/file.wav')).toBe(true);
      expect(isExternalPath('https://example.com/file.wav')).toBe(true);
    });
    
    it('should identify protocol-relative URLs', () => {
      expect(isExternalPath('//example.com/file.wav')).toBe(true);
    });
    
    it('should not identify local paths', () => {
      expect(isExternalPath('/path/to/file.wav')).toBe(false);
      expect(isExternalPath('file.wav')).toBe(false);
      expect(isExternalPath('C:\\path\\file.wav')).toBe(false);
    });
  });
  
  describe('normalizePath', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(normalizePath('path\\to\\file')).toBe('path/to/file');
    });
    
    it('should remove redundant slashes', () => {
      expect(normalizePath('path//to///file')).toBe('path/to/file');
    });
    
    it('should handle mixed separators', () => {
      expect(normalizePath('path\\to//file')).toBe('path/to/file');
    });
  });
  
  describe('getRelativePath', () => {
    it('should calculate relative path between files', () => {
      expect(getRelativePath('/project/file1.wav', '/project/file2.wav')).toBe('file2.wav');
      expect(getRelativePath('/project/audio/file1.wav', '/project/file2.wav')).toBe('../file2.wav');
    });
    
    it('should handle nested directories', () => {
      expect(getRelativePath(
        '/project/tracks/audio/file.wav',
        '/project/samples/kick.wav'
      )).toBe('../../samples/kick.wav');
    });
  });
});
