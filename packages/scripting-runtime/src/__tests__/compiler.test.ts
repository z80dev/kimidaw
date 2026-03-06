import { describe, it, expect } from 'vitest';
import { compile, checkCompiles, getDiagnostics } from '../compiler';
import type { ScriptSource } from '../types';

describe('Compiler', () => {
  describe('compile', () => {
    it('should compile valid TypeScript', () => {
      const source: ScriptSource = {
        id: 'test',
        code: 'export default function(ctx) { return { clips: [], automation: [] }; }',
        version: 1,
      };

      const result = compile(source);

      expect(result.success).toBe(true);
      expect(result.jsCode).toBeDefined();
      expect(result.hash).toBeDefined();
    });

    it('should detect syntax errors', () => {
      const source: ScriptSource = {
        id: 'test',
        code: 'function test() {', // Missing closing brace
        version: 1,
      };

      const result = compile(source);

      expect(result.success).toBe(false);
      expect(result.diagnostics.some(d => d.level === 'error')).toBe(true);
    });

    it('should detect determinism violations', () => {
      const source: ScriptSource = {
        id: 'test',
        code: 'export default function() { return Math.random(); }',
        version: 1,
      };

      const result = compile(source);

      expect(result.success).toBe(false);
      expect(result.diagnostics.some(d => d.code?.includes('DETERMINISM'))).toBe(true);
    });

    it('should allow deterministic Math functions', () => {
      const source: ScriptSource = {
        id: 'test',
        code: 'export default function() { return Math.sin(0); }',
        version: 1,
      };

      const result = compile(source);

      expect(result.success).toBe(true);
    });

    it('should generate source maps', () => {
      const source: ScriptSource = {
        id: 'test',
        code: 'export default function() { return 42; }',
        version: 1,
      };

      const result = compile(source);

      expect(result.sourceMap).toBeDefined();
    });

    it('should generate consistent hashes for same code', () => {
      const source1: ScriptSource = {
        id: 'test',
        code: 'export default function() { return 42; }',
        version: 1,
      };
      const source2: ScriptSource = {
        id: 'test',
        code: 'export default function() { return 42; }',
        version: 1,
      };

      const result1 = compile(source1);
      const result2 = compile(source2);

      expect(result1.hash).toBe(result2.hash);
    });

    it('should generate different hashes for different code', () => {
      const source1: ScriptSource = {
        id: 'test',
        code: 'export default function() { return 42; }',
        version: 1,
      };
      const source2: ScriptSource = {
        id: 'test',
        code: 'export default function() { return 43; }',
        version: 1,
      };

      const result1 = compile(source1);
      const result2 = compile(source2);

      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should strip type annotations', () => {
      const source: ScriptSource = {
        id: 'test',
        code: `
          export default function(ctx: any): number {
            const x: number = 42;
            return x;
          }
        `,
        version: 1,
      };

      const result = compile(source);

      expect(result.success).toBe(true);
      expect(result.jsCode).not.toContain(': number');
      expect(result.jsCode).not.toContain(': any');
    });

    it('should remove interface declarations', () => {
      const source: ScriptSource = {
        id: 'test',
        code: `
          interface Test { x: number; }
          export default function() { return 42; }
        `,
        version: 1,
      };

      const result = compile(source);

      expect(result.success).toBe(true);
      expect(result.jsCode).not.toContain('interface');
    });

    it('should remove type aliases', () => {
      const source: ScriptSource = {
        id: 'test',
        code: `
          type MyType = number;
          export default function() { return 42; }
        `,
        version: 1,
      };

      const result = compile(source);

      expect(result.success).toBe(true);
      expect(result.jsCode).not.toContain('type MyType');
    });

    it('should handle unclosed strings', () => {
      const source: ScriptSource = {
        id: 'test',
        code: 'const x = "unclosed',
        version: 1,
      };

      const result = compile(source);

      expect(result.success).toBe(false);
    });

    it('should handle mismatched braces', () => {
      const source: ScriptSource = {
        id: 'test',
        code: 'function test() { [ }',
        version: 1,
      };

      const result = compile(source);

      expect(result.success).toBe(false);
    });
  });

  describe('checkCompiles', () => {
    it('should return true for valid code', () => {
      expect(checkCompiles('export default function() {}')).toBe(true);
    });

    it('should return false for invalid code', () => {
      expect(checkCompiles('function test() {')).toBe(false);
    });

    it('should return false for non-deterministic code', () => {
      expect(checkCompiles('Math.random()')).toBe(false);
    });
  });

  describe('getDiagnostics', () => {
    it('should return empty array for valid code', () => {
      const diagnostics = getDiagnostics('export default function() {}');
      expect(diagnostics.filter(d => d.level === 'error')).toHaveLength(0);
    });

    it('should return diagnostics for invalid code', () => {
      const diagnostics = getDiagnostics('function test() {');
      expect(diagnostics.some(d => d.level === 'error')).toBe(true);
    });

    it('should include determinism errors', () => {
      const diagnostics = getDiagnostics('Date.now()');
      expect(diagnostics.some(d => d.code?.includes('DETERMINISM'))).toBe(true);
    });
  });
});
