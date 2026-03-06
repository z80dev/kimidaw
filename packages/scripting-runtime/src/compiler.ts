/**
 * TypeScript Compiler
 * 
 * Compiles TypeScript music scripts to JavaScript for execution.
 * 
 * Note: In a production environment, this would use the actual TypeScript
 * compiler API. For this implementation, we provide:
 * 1. Basic TypeScript-to-JavaScript transpilation
 * 2. Syntax validation
 * 3. Import/export handling
 * 4. Source map generation
 */

import type { 
  ScriptSource, 
  CompilationResult, 
  ScriptDiagnostic,
} from './types';
import { validateDeterminism, issuesToDiagnostics } from './determinism';

/** Compiler options */
export interface CompilerOptions {
  target: 'ES2020' | 'ES2022';
  module: 'ESNext' | 'CommonJS';
  strict: boolean;
  checkDeterminism: boolean;
}

/** Default compiler options */
export const DEFAULT_COMPILER_OPTIONS: CompilerOptions = {
  target: 'ES2022',
  module: 'ESNext',
  strict: true,
  checkDeterminism: true,
};

/**
 * Simple hash function for source code
 */
function hashCode(code: string): string {
  let hash = 2166136261;
  for (let i = 0; i < code.length; i++) {
    hash ^= code.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Basic TypeScript syntax validation
 * 
 * Checks for common syntax errors without full type checking
 */
function validateSyntax(code: string): ScriptDiagnostic[] {
  const diagnostics: ScriptDiagnostic[] = [];
  const lines = code.split('\n');
  
  // Track braces, parentheses, brackets
  const stack: Array<{ char: string; line: number; col: number }> = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const openers = Object.keys(pairs);
  const closers = Object.values(pairs);
  
  // Track string state
  let inString: string | null = null;
  let escapeNext = false;
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      
      // Handle escape sequences
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      // Handle strings
      if ((char === '"' || char === "'" || char === '`') && !inString) {
        inString = char;
        continue;
      }
      
      if (char === inString) {
        inString = null;
        continue;
      }
      
      // Skip everything inside strings
      if (inString) continue;
      
      // Handle comments
      if (char === '/' && line[col + 1] === '/') break; // Line comment
      if (char === '/' && line[col + 1] === '*') {
        // Block comment - skip to end
        col++;
        continue;
      }
      
      // Track braces
      if (openers.includes(char)) {
        stack.push({ char, line: lineNum + 1, col: col + 1 });
      } else if (closers.includes(char)) {
        const last = stack.pop();
        if (!last || pairs[last.char] !== char) {
          diagnostics.push({
            level: 'error',
            message: `Unexpected '${char}'`,
            line: lineNum + 1,
            column: col + 1,
            code: 'SYNTAX_MISMATCH',
          });
        }
      }
    }
  }
  
  // Check for unclosed braces
  for (const unclosed of stack) {
    diagnostics.push({
      level: 'error',
      message: `Unclosed '${unclosed.char}'`,
      line: unclosed.line,
      column: unclosed.col,
      code: 'SYNTAX_UNCLOSED',
    });
  }
  
  // Check for unclosed strings
  if (inString) {
    diagnostics.push({
      level: 'error',
      message: `Unclosed string`,
      code: 'SYNTAX_UNCLOSED_STRING',
    });
  }
  
  return diagnostics;
}

/**
 * Basic TypeScript to JavaScript transpilation
 * 
 * Strips TypeScript-specific syntax:
 * - Type annotations
 * - Interface declarations
 * - Type aliases
 * - Generic parameters
 */
function transpile(code: string): string {
  let result = code;
  
  // Remove type annotations from function parameters
  // function foo(x: number, y: string) -> function foo(x, y)
  result = result.replace(
    /(function\s+\w+|\w+)\s*\(([^)]*)\)\s*:/g,
    (match, name, params) => {
      const cleanParams = params.replace(/:\s*[^,)]+/g, '');
      return `${name}(${cleanParams}):`;
    }
  );
  
  // Remove type annotations from variable declarations
  // const x: number = 5 -> const x = 5
  result = result.replace(
    /(const|let|var)\s+(\w+)\s*:\s*[^=;]+/g,
    '$1 $2'
  );
  
  // Remove interface declarations entirely
  result = result.replace(
    /interface\s+\w+\s*\{[^{}]*\}/gs,
    ''
  );
  
  // Remove type alias declarations
  result = result.replace(
    /type\s+\w+\s*=\s*[^;]+;/gs,
    ''
  );
  
  // Remove generic type parameters from function calls
  // foo<T>() -> foo()
  result = result.replace(
    /(\w+)\s*<[^>]+>\s*\(/g,
    '$1('
  );
  
  // Remove import type statements
  result = result.replace(
    /import\s+type\s+[^;]+;/g,
    ''
  );
  
  // Remove 'as' type assertions
  // x as number -> x
  result = result.replace(
    /(\w+)\s+as\s+\w+/g,
    '$1'
  );
  
  // Remove 'satisfies' operator
  result = result.replace(
    /(\w+)\s+satisfies\s+\w+/g,
    '$1'
  );
  
  return result;
}

/**
 * Generate a simple source map
 */
function generateSourceMap(
  originalCode: string,
  generatedCode: string,
  sourcePath: string
): string {
  const lines = originalCode.split('\n');
  const mappings: string[] = [];
  
  // Simple 1:1 line mapping
  for (let i = 0; i < lines.length; i++) {
    mappings.push(`${i}`);
  }
  
  const sourceMap = {
    version: 3,
    sources: [sourcePath],
    sourcesContent: [originalCode],
    names: [],
    mappings: mappings.join(';'),
  };
  
  return JSON.stringify(sourceMap);
}

/**
 * Extract parameter specifications from JSDoc comments
 */
function extractParameters(code: string): Array<{ name: string; type: string; default?: unknown }> {
  const params: Array<{ name: string; type: string; default?: unknown }> = [];
  
  // Match @param JSDoc tags
  const paramRegex = /@param\s+\{([^}]+)\}\s+(?:\[)?(\w+)(?:=([^\]]+))?\]?(?:\s+-\s*(.+))?/g;
  let match: RegExpExecArray | null;
  
  while ((match = paramRegex.exec(code)) !== null) {
    const [, type, name, defaultValue] = match;
    params.push({
      name,
      type,
      default: defaultValue ? parseDefaultValue(defaultValue, type) : undefined,
    });
  }
  
  return params;
}

/**
 * Parse a default value from string
 */
function parseDefaultValue(value: string, type: string): unknown {
  const trimmed = value.trim();
  
  if (type === 'number' || type === 'boolean') {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    return trimmed.slice(1, -1);
  }
  
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  
  const num = Number(trimmed);
  if (!isNaN(num)) return num;
  
  return trimmed;
}

/**
 * Compile TypeScript source code
 * 
 * @param source - Script source to compile
 * @param options - Compiler options
 * @returns Compilation result with diagnostics and JavaScript code
 */
export function compile(
  source: ScriptSource,
  options: Partial<CompilerOptions> = {}
): CompilationResult {
  const opts = { ...DEFAULT_COMPILER_OPTIONS, ...options };
  const diagnostics: ScriptDiagnostic[] = [];
  
  try {
    // 1. Validate syntax
    const syntaxErrors = validateSyntax(source.code);
    diagnostics.push(...syntaxErrors);
    
    if (syntaxErrors.some(d => d.level === 'error')) {
      return {
        success: false,
        diagnostics,
        hash: hashCode(source.code),
      };
    }
    
    // 2. Check determinism
    if (opts.checkDeterminism) {
      const determinismValidation = validateDeterminism(source.code);
      const determinismDiagnostics = issuesToDiagnostics(determinismValidation.issues);
      diagnostics.push(...determinismDiagnostics);
      
      if (!determinismValidation.deterministic) {
        return {
          success: false,
          diagnostics,
          hash: hashCode(source.code),
        };
      }
    }
    
    // 3. Transpile TypeScript to JavaScript
    const jsCode = transpile(source.code);
    
    // 4. Generate source map
    const sourceMap = generateSourceMap(source.code, jsCode, `${source.id}.ts`);
    
    return {
      success: true,
      diagnostics,
      jsCode,
      sourceMap,
      hash: hashCode(source.code),
    };
  } catch (error) {
    diagnostics.push({
      level: 'error',
      message: error instanceof Error ? error.message : 'Unknown compilation error',
      code: 'COMPILATION_ERROR',
    });
    
    return {
      success: false,
      diagnostics,
      hash: hashCode(source.code),
    };
  }
}

/**
 * Quick check if code compiles without errors
 */
export function checkCompiles(code: string): boolean {
  const result = compile({ id: 'check', code, version: 1 });
  return result.success;
}

/**
 * Get diagnostics for code without compiling
 */
export function getDiagnostics(code: string): ScriptDiagnostic[] {
  const result = compile({ id: 'check', code, version: 1 });
  return result.diagnostics;
}
