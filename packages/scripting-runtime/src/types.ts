/**
 * Types for the Scripting Runtime
 * 
 * Handles compilation and execution of music scripts in a Web Worker
 */

import type { 
  ScriptModuleResult, 
  ScriptDiagnostic, 
  ScriptParameterSpec,
  MusicScriptContext,
} from '@daw/scripting-api';

// ============================================================================
// Compilation Types
// ============================================================================

/** Script source code */
export interface ScriptSource {
  id: string;
  code: string;
  version: number;
  dependencies?: string[];
}

/** Compilation result */
export interface CompilationResult {
  success: boolean;
  diagnostics: ScriptDiagnostic[];
  jsCode?: string;
  sourceMap?: string;
  hash: string;
}

/** Compiled script module */
export interface CompiledScript {
  id: string;
  hash: string;
  jsCode: string;
  sourceMap: string;
  parameters: ScriptParameterSpec[];
  compiledAt: number;
}

// ============================================================================
// Execution Types
// ============================================================================

/** Script execution request */
export interface ExecutionRequest {
  scriptId: string;
  jsCode: string;
  context: ExecutionContext;
  timeoutMs?: number;
}

/** Execution context passed to scripts */
export interface ExecutionContext {
  projectId: string;
  seed: string;
  ppq: number;
  sampleRate: number;
  tempoMap: Array<{ tick: number; bpm: number; curve: 'jump' | 'ramp' }>;
  parameters?: Record<string, unknown>;
}

/** Script execution result */
export interface ExecutionResult {
  success: boolean;
  result?: ScriptModuleResult;
  diagnostics: ScriptDiagnostic[];
  executionTimeMs: number;
  memoryUsageBytes?: number;
}

/** Script module wrapper function */
export type ScriptModuleFunction = (ctx: MusicScriptContext) => ScriptModuleResult | Promise<ScriptModuleResult>;

// ============================================================================
// Sandbox Types
// ============================================================================

/** Sandboxed environment for script execution */
export interface SandboxEnvironment {
  console: SandboxConsole;
  Math: RestrictedMath;
  Date: RestrictedDate;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  setInterval: typeof setInterval;
  clearInterval: typeof clearInterval;
}

/** Restricted console for sandbox */
export interface SandboxConsole {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
}

/** Restricted Math object (no random) */
export interface RestrictedMath {
  readonly E: number;
  readonly LN10: number;
  readonly LN2: number;
  readonly LOG10E: number;
  readonly LOG2E: number;
  readonly PI: number;
  readonly SQRT1_2: number;
  readonly SQRT2: number;
  abs: (x: number) => number;
  acos: (x: number) => number;
  acosh: (x: number) => number;
  asin: (x: number) => number;
  asinh: (x: number) => number;
  atan: (x: number) => number;
  atan2: (y: number, x: number) => number;
  atanh: (x: number) => number;
  cbrt: (x: number) => number;
  ceil: (x: number) => number;
  clz32: (x: number) => number;
  cos: (x: number) => number;
  cosh: (x: number) => number;
  exp: (x: number) => number;
  expm1: (x: number) => number;
  floor: (x: number) => number;
  fround: (x: number) => number;
  hypot: (...values: number[]) => number;
  imul: (x: number, y: number) => number;
  log: (x: number) => number;
  log10: (x: number) => number;
  log1p: (x: number) => number;
  log2: (x: number) => number;
  max: (...values: number[]) => number;
  min: (...values: number[]) => number;
  pow: (x: number, y: number) => number;
  round: (x: number) => number;
  sign: (x: number) => number;
  sin: (x: number) => number;
  sinh: (x: number) => number;
  sqrt: (x: number) => number;
  tan: (x: number) => number;
  tanh: (x: number) => number;
  trunc: (x: number) => number;
}

/** Restricted Date (no current time) */
export interface RestrictedDate {
  parse: (s: string) => number;
  UTC: (...values: number[]) => number;
}

// ============================================================================
// Worker Message Types
// ============================================================================

/** Worker request message */
export type WorkerRequest =
  | { type: 'compile'; source: ScriptSource }
  | { type: 'execute'; request: ExecutionRequest }
  | { type: 'validate'; code: string }
  | { type: 'ping' };

/** Worker response message */
export type WorkerResponse =
  | { type: 'compile'; result: CompilationResult }
  | { type: 'execute'; result: ExecutionResult }
  | { type: 'validate'; valid: boolean; diagnostics: ScriptDiagnostic[] }
  | { type: 'pong' }
  | { type: 'error'; error: string };

// ============================================================================
// Cache Types
// ============================================================================

/** Cache entry metadata */
export interface CacheEntry {
  key: string;
  hash: string;
  compiledAt: number;
  hitCount: number;
  lastAccessed: number;
  sizeBytes: number;
}

/** Cache statistics */
export interface CacheStats {
  entries: number;
  totalSizeBytes: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
}

// ============================================================================
// Determinism Types
// ============================================================================

/** Non-deterministic construct detection */
export interface NonDeterministicUsage {
  type: 'Math.random' | 'Date.now' | 'Date' | 'performance.now' | 'crypto';
  line: number;
  column: number;
  message: string;
}

/** Determinism validation result */
export interface DeterminismValidation {
  deterministic: boolean;
  issues: NonDeterministicUsage[];
}
