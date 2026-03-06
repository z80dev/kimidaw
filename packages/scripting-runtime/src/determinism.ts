/**
 * Determinism Validation
 * 
 * Validates that scripts don't use non-deterministic constructs like:
 * - Math.random()
 * - Date.now()
 * - new Date() (without arguments)
 * - performance.now()
 * - crypto.getRandomValues()
 * 
 * Implements section 15.4 of the engineering spec:
 * "Scripts must be reproducible from: script source + declared inputs/params + seed"
 */

import type { 
  NonDeterministicUsage, 
  DeterminismValidation,
  ScriptDiagnostic,
} from './types';

/** Patterns for detecting non-deterministic code */
const NON_DETERMINISTIC_PATTERNS = [
  {
    type: 'Math.random' as const,
    regex: /Math\.random\s*\(/g,
    message: 'Math.random() is not allowed. Use ctx.rand() instead.',
  },
  {
    type: 'Date.now' as const,
    regex: /Date\.now\s*\(\s*\)/g,
    message: 'Date.now() is not allowed. Use deterministic time sources.',
  },
  {
    type: 'Date' as const,
    regex: /new\s+Date\s*\(\s*\)/g,
    message: 'new Date() without arguments is not allowed. Use new Date(timestamp).',
  },
  {
    type: 'performance.now' as const,
    regex: /performance\.now\s*\(\s*\)/g,
    message: 'performance.now() is not allowed.',
  },
  {
    type: 'crypto' as const,
    regex: /crypto\.getRandomValues|crypto\.randomUUID/g,
    message: 'Crypto random methods are not allowed. Use ctx.rand() instead.',
  },
];

/**
 * Validate a script for non-deterministic constructs
 * 
 * @param code - TypeScript/JavaScript source code
 * @returns Validation result with any issues found
 */
export function validateDeterminism(code: string): DeterminismValidation {
  const issues: NonDeterministicUsage[] = [];
  const lines = code.split('\n');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    for (const pattern of NON_DETERMINISTIC_PATTERNS) {
      // Reset regex state
      pattern.regex.lastIndex = 0;
      
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(line)) !== null) {
        issues.push({
          type: pattern.type,
          line: lineIndex + 1, // 1-indexed
          column: match.index + 1,
          message: pattern.message,
        });
      }
    }
  }

  return {
    deterministic: issues.length === 0,
    issues,
  };
}

/**
 * Convert non-deterministic issues to script diagnostics
 */
export function issuesToDiagnostics(
  issues: NonDeterministicUsage[]
): ScriptDiagnostic[] {
  return issues.map(issue => ({
    level: 'error',
    message: issue.message,
    line: issue.line,
    column: issue.column,
    code: `DETERMINISM_${issue.type.replace(/\./g, '_').toUpperCase()}`,
    source: 'determinism-checker',
  }));
}

/**
 * Quick check if code contains any non-deterministic patterns
 * 
 * @param code - Source code to check
 * @returns True if code passes determinism check
 */
export function isDeterministic(code: string): boolean {
  return validateDeterminism(code).deterministic;
}

/**
 * Get a deterministic subset of global objects for sandbox
 */
export function createRestrictedMath(): typeof Math {
  // Create a copy of Math without random
  const restricted = { ...Math };
  
  // Override random with a function that throws
  Object.defineProperty(restricted, 'random', {
    value: () => {
      throw new Error(
        'Math.random() is not allowed in deterministic scripts. ' +
        'Use ctx.rand() instead.'
      );
    },
    writable: false,
    configurable: false,
  });

  return restricted;
}

/**
 * Create a restricted Date constructor
 */
export function createRestrictedDate(): DateConstructor {
  // Allow Date with arguments, block no-arg constructor
  return new Proxy(Date, {
    construct(target, args) {
      if (args.length === 0) {
        throw new Error(
          'new Date() without arguments is not allowed in deterministic scripts. ' +
          'Use new Date(timestamp) with an explicit time.'
        );
      }
      return new target(...args as [number]);
    },
    get(target, prop) {
      if (prop === 'now') {
        return () => {
          throw new Error(
            'Date.now() is not allowed in deterministic scripts. ' +
            'Use deterministic time sources from the context.'
          );
        };
      }
      return (target as Record<string | symbol, unknown>)[prop];
    },
  }) as DateConstructor;
}

/**
 * Check if a function body uses any non-deterministic constructs
 * More thorough analysis using AST would be better, but regex is faster for simple checks
 */
export function analyzeFunctionDeterminism(code: string): DeterminismValidation {
  // First do a quick regex check
  const validation = validateDeterminism(code);
  
  if (!validation.deterministic) {
    return validation;
  }
  
  // Additional checks for variable-named random usage
  const advancedPatterns = [
    {
      type: 'Math.random' as const,
      regex: /\.random\s*\(/g,
      message: 'Possible Math.random() usage detected. Use ctx.rand() instead.',
    },
    {
      type: 'Date.now' as const,
      regex: /\.now\s*\(\s*\)/g,
      message: 'Possible Date.now() usage detected.',
    },
  ];
  
  const lines = code.split('\n');
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    
    for (const pattern of advancedPatterns) {
      pattern.regex.lastIndex = 0;
      
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(line)) !== null) {
        // Add as warning since this might be a false positive
        validation.issues.push({
          type: pattern.type,
          line: lineIndex + 1,
          column: match.index + 1,
          message: pattern.message,
        });
      }
    }
  }
  
  // Warnings don't make it non-deterministic, just suspicious
  return {
    deterministic: !validation.issues.some(i => i.type === 'Math.random' || i.type === 'Date.now'),
    issues: validation.issues,
  };
}

/**
 * Create a deterministic execution environment
 * 
 * @param seed - Seed for any required random generation
 * @returns Object with restricted globals
 */
export function createDeterministicEnvironment(seed: string): {
  Math: typeof Math;
  Date: DateConstructor;
} {
  return {
    Math: createRestrictedMath(),
    Date: createRestrictedDate(),
  };
}
