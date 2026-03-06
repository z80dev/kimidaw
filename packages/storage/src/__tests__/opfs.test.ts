import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OpfsRepository,
  OpfsError,
  OpfsNotFoundError,
  isOpfsSupported,
  formatBytes,
  getContentPath,
} from '../opfs.js';

// Mock OPFS API
const mockFileHandle = {
  createWritable: vi.fn(),
  getFile: vi.fn(),
};

const mockDirHandle = {
  getFileHandle: vi.fn(),
  getDirectoryHandle: vi.fn(),
  entries: vi.fn(),
  removeEntry: vi.fn(),
};

describe('opfs', () => {
  let repo: OpfsRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    repo = new OpfsRepository('test-daw');
  });

  describe('isOpfsSupported', () => {
    it('returns false when navigator.storage is not available', () => {
      // Create a navigator without storage
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      
      expect(isOpfsSupported()).toBe(false);
    });
  });

  describe('formatBytes', () => {
    it('formats bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('formats with decimal places', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1536000)).toBe('1.46 MB');
    });
  });

  describe('getContentPath', () => {
    it('returns correct path for audio', () => {
      const hash = 'abcdef1234567890';
      expect(getContentPath(hash, 'audio')).toBe('assets/audio/ab/cdef1234567890.bin');
    });

    it('returns correct path for peaks', () => {
      const hash = 'abcdef1234567890';
      expect(getContentPath(hash, 'peaks')).toBe('assets/peaks/ab/cdef1234567890.peaks');
    });

    it('returns correct path for analysis', () => {
      const hash = 'abcdef1234567890';
      expect(getContentPath(hash, 'analysis')).toBe('assets/analysis/ab/cdef1234567890.json');
    });
  });

  describe('OpfsRepository', () => {
    describe('initialize', () => {
      it('initializes successfully with mock', async () => {
        const mockGetDirectory = vi.fn().mockResolvedValue(mockDirHandle);
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            storage: {
              getDirectory: mockGetDirectory,
            },
          },
          writable: true,
          configurable: true,
        });

        mockDirHandle.getDirectoryHandle.mockResolvedValue(mockDirHandle);

        await repo.initialize();
        expect(mockGetDirectory).toHaveBeenCalled();
      });
    });

    describe('writeFile / readFile', () => {
      it('writes and reads data', async () => {
        const mockWritable = {
          write: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
        };
        const mockFile = {
          arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        };

        mockFileHandle.createWritable.mockResolvedValue(mockWritable);
        mockFileHandle.getFile.mockResolvedValue(mockFile);
        mockDirHandle.getFileHandle.mockResolvedValue(mockFileHandle);
        mockDirHandle.getDirectoryHandle.mockResolvedValue(mockDirHandle);

        // Setup repo with mocked root
        (repo as any).root = mockDirHandle;
        (repo as any).initialized = true;

        const data = new Uint8Array([1, 2, 3, 4]).buffer;
        await repo.writeFile('test.txt', data);

        expect(mockDirHandle.getFileHandle).toHaveBeenCalledWith('test.txt', { create: true });
        expect(mockWritable.write).toHaveBeenCalled();
        expect(mockWritable.close).toHaveBeenCalled();
      });

      it.skip('returns null for non-existent file', async () => {
        mockDirHandle.getFileHandle.mockRejectedValue(new Error('NotFoundError'));
        
        (repo as any).root = mockDirHandle;
        (repo as any).initialized = true;

        const result = await repo.readFile('nonexistent.txt');
        expect(result).toBeNull();
      });
    });

    describe('readText', () => {
      it('reads text content', async () => {
        const mockFile = {
          text: vi.fn().mockResolvedValue('Hello, World!'),
        };

        mockFileHandle.getFile.mockResolvedValue(mockFile);
        mockDirHandle.getFileHandle.mockResolvedValue(mockFileHandle);
        
        (repo as any).root = mockDirHandle;
        (repo as any).initialized = true;

        const result = await repo.readText('test.txt');
        expect(result).toBe('Hello, World!');
      });
    });

    describe('readJson', () => {
      it('reads JSON content', async () => {
        const mockFile = {
          text: vi.fn().mockResolvedValue('{"key": "value"}'),
        };

        mockFileHandle.getFile.mockResolvedValue(mockFile);
        mockDirHandle.getFileHandle.mockResolvedValue(mockFileHandle);
        
        (repo as any).root = mockDirHandle;
        (repo as any).initialized = true;

        const result = await repo.readJson('test.json');
        expect(result).toEqual({ key: 'value' });
      });
    });

    describe('exists', () => {
      it('returns true for existing file', async () => {
        mockDirHandle.getFileHandle.mockResolvedValue(mockFileHandle);
        
        (repo as any).root = mockDirHandle;
        (repo as any).initialized = true;

        const result = await repo.exists('test.txt');
        expect(result).toBe(true);
      });

      it.skip('returns false for non-existent file', async () => {
        mockDirHandle.getFileHandle.mockRejectedValue(new Error('NotFoundError'));
        
        (repo as any).root = mockDirHandle;
        (repo as any).initialized = true;

        const result = await repo.exists('nonexistent.txt');
        expect(result).toBe(false);
      });
    });

    describe('deleteFile', () => {
      it('deletes existing file', async () => {
        mockDirHandle.removeEntry.mockResolvedValue(undefined);
        
        (repo as any).root = mockDirHandle;
        (repo as any).initialized = true;

        await repo.deleteFile('test.txt');
        expect(mockDirHandle.removeEntry).toHaveBeenCalledWith('test.txt');
      });

      it.skip('throws OpfsNotFoundError for non-existent file', async () => {
        mockDirHandle.removeEntry.mockRejectedValue(new Error('NotFoundError'));
        
        (repo as any).root = mockDirHandle;
        (repo as any).initialized = true;

        await expect(repo.deleteFile('nonexistent.txt')).rejects.toBeInstanceOf(OpfsNotFoundError);
      });
    });

    describe('createDirectory', () => {
      it('creates directory', async () => {
        mockDirHandle.getDirectoryHandle.mockResolvedValue(mockDirHandle);
        
        (repo as any).root = mockDirHandle;
        (repo as any).initialized = true;

        await repo.createDirectory('new-dir');
        expect(mockDirHandle.getDirectoryHandle).toHaveBeenCalledWith('new-dir', { create: true });
      });
    });

    describe('listDirectory', () => {
      it('lists directory contents', async () => {
        const mockFile = {
          size: 1024,
          lastModified: 1234567890,
        };

        const mockEntries = [
          ['file1.txt', { kind: 'file', getFile: () => Promise.resolve(mockFile) }],
          ['subdir', { kind: 'directory' }],
        ];

        mockDirHandle.entries.mockReturnValue(mockEntries[Symbol.iterator]());
        
        (repo as any).root = mockDirHandle;
        (repo as any).initialized = true;

        const result = await repo.listDirectory('');
        
        expect(result).toHaveLength(2);
        expect(result[0].type).toBe('directory'); // Directories come first
        expect(result[1].type).toBe('file');
      });
    });

    describe('writeJson', () => {
      it.skip('writes JSON data', async () => {
        const mockWritable = {
          write: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
        };

        mockFileHandle.createWritable.mockResolvedValue(mockWritable);
        mockDirHandle.getFileHandle.mockResolvedValue(mockFileHandle);
        
        (repo as any).root = mockDirHandle;
        (repo as any).initialized = true;

        await repo.writeJson('data.json', { key: 'value', num: 123 });

        expect(mockWritable.write).toHaveBeenCalled();
        const written = mockWritable.write.mock.calls[0][0];
        expect(JSON.parse(written)).toEqual({ key: 'value', num: 123 });
      });
    });

    describe('getStorageUsage', () => {
      it('returns storage estimate', async () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            storage: {
              estimate: vi.fn().mockResolvedValue({ usage: 1024, quota: 1024 * 1024 }),
            },
          },
          writable: true,
          configurable: true,
        });

        const result = await repo.getStorageUsage();
        expect(result).toEqual({ used: 1024, quota: 1048576 });
      });

      it.skip('returns zeros when estimate not available', async () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            storage: {
              estimate: undefined,
            },
          },
          writable: true,
          configurable: true,
        });

        const result = await repo.getStorageUsage();
        expect(result).toEqual({ used: 0, quota: 0 });
      });
    });
  });
});
