import { describe, it, expect } from 'vitest';
import {
  validateDeterminism,
  issuesToDiagnostics,
  isDeterministic,
  createRestrictedMath,
  createRestrictedDate,
} from '../determinism';

describe('Determinism', () => {
  describe('validateDeterminism', () => {
    it('should detect Math.random', () => {
      const code = 'const x = Math.random();';
      const result = validateDeterminism(code);
      
      expect(result.deterministic).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('Math.random');
    });

    it('should detect Date.now', () => {
      const code = 'const now = Date.now();';
      const result = validateDeterminism(code);
      
      expect(result.deterministic).toBe(false);
      expect(result.issues[0].type).toBe('Date.now');
    });

    it('should detect new Date()', () => {
      const code = 'const now = new Date();';
      const result = validateDeterminism(code);
      
      expect(result.deterministic).toBe(false);
      expect(result.issues[0].type).toBe('Date');
    });

    it('should detect performance.now', () => {
      const code = 'const t = performance.now();';
      const result = validateDeterminism(code);
      
      expect(result.deterministic).toBe(false);
      expect(result.issues[0].type).toBe('performance.now');
    });

    it('should allow new Date(timestamp)', () => {
      const code = 'const date = new Date(1234567890);';
      const result = validateDeterminism(code);
      
      expect(result.deterministic).toBe(true);
    });

    it('should allow deterministic code', () => {
      const code = `
        const x = 5;
        const y = x + 10;
        function add(a, b) { return a + b; }
      `;
      const result = validateDeterminism(code);
      
      expect(result.deterministic).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect multiple issues', () => {
      const code = `
        const a = Math.random();
        const b = Date.now();
        const c = new Date();
      `;
      const result = validateDeterminism(code);
      
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
    });

    it('should report line numbers', () => {
      const code = 'line 1\nline 2\nconst x = Math.random();';
      const result = validateDeterminism(code);
      
      expect(result.issues[0].line).toBe(3);
    });
  });

  describe('issuesToDiagnostics', () => {
    it('should convert issues to diagnostics', () => {
      const issues = [
        { type: 'Math.random' as const, line: 1, column: 10, message: 'No random' },
      ];
      
      const diagnostics = issuesToDiagnostics(issues);
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].level).toBe('error');
      expect(diagnostics[0].code).toBe('DETERMINISM_MATH_RANDOM');
    });
  });

  describe('isDeterministic', () => {
    it('should return true for deterministic code', () => {
      expect(isDeterministic('const x = 5;')).toBe(true);
    });

    it('should return false for non-deterministic code', () => {
      expect(isDeterministic('Math.random()')).toBe(false);
    });
  });

  describe('createRestrictedMath', () => {
    it('should create Math without random', () => {
      const math = createRestrictedMath();
      
      expect(math.PI).toBe(Math.PI);
      expect(math.abs).toBe(Math.abs);
    });

    it('should throw on random access', () => {
      const math = createRestrictedMath();
      
      expect(() => math.random()).toThrow('Math.random() is not allowed');
    });

    it('should preserve other Math functions', () => {
      const math = createRestrictedMath();
      
      expect(math.sin(0)).toBe(0);
      expect(math.cos(0)).toBe(1);
      expect(math.floor(1.9)).toBe(1);
      expect(math.ceil(1.1)).toBe(2);
    });
  });

  describe('createRestrictedDate', () => {
    it('should allow Date.parse', () => {
      const Date = createRestrictedDate();
      
      expect(Date.parse('2024-01-01')).toBeGreaterThan(0);
    });

    it('should allow Date.UTC', () => {
      const Date = createRestrictedDate();
      
      expect(Date.UTC(2024, 0, 1)).toBeGreaterThan(0);
    });

    it('should throw on new Date()', () => {
      const Date = createRestrictedDate();
      
      expect(() => new Date()).toThrow('new Date() without arguments is not allowed');
    });

    it('should throw on Date.now', () => {
      const Date = createRestrictedDate();
      
      expect(() => Date.now()).toThrow('Date.now() is not allowed');
    });

    it('should allow new Date(timestamp)', () => {
      const Date = createRestrictedDate();
      
      const date = new Date(1704067200000);
      expect(date.getTime()).toBe(1704067200000);
    });
  });
});
