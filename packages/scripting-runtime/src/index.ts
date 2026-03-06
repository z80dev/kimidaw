/**
 * @daw/scripting-runtime
 * 
 * Script compilation and execution runtime for the In-Browser DAW.
 * 
 * This package provides:
 * - TypeScript to JavaScript compilation
 * - Script execution in sandboxed workers
 * - Determinism validation
 * - Compiled script caching
 * 
 * @example
 * ```typescript
 * import { 
 *   compile, 
 *   execute, 
 *   ScriptCache,
 *   validateDeterminism 
 * } from '@daw/scripting-runtime';
 * 
 * // Compile a script
 * const result = compile({
 *   id: 'my-script',
 *   code: 'export default (ctx) => ({ clips: [], automation: [] })',
 *   version: 1,
 * });
 * 
 * if (result.success) {
 *   // Execute the compiled script
 *   const execResult = execute({
 *     scriptId: 'my-script',
 *     jsCode: result.jsCode,
 *     context: {
 *       projectId: 'project-1',
 *       seed: 'seed-123',
 *       ppq: 960,
 *       sampleRate: 48000,
 *       tempoMap: [{ tick: 0, bpm: 120, curve: 'jump' }],
 *     },
 *   });
 * }
 * ```
 */

// ============================================================================
// Compilation
// ============================================================================

export {
  compile,
  checkCompiles,
  getDiagnostics,
  DEFAULT_COMPILER_OPTIONS,
} from './compiler';
export type { CompilerOptions } from './compiler';

// ============================================================================
// Execution
// ============================================================================

export {
  execute,
  validateExecution,
  createTestContext,
  ScriptTimeoutError,
  ScriptMemoryError,
} from './executor';

// ============================================================================
// Determinism
// ============================================================================

export {
  validateDeterminism,
  issuesToDiagnostics,
  isDeterministic,
  createRestrictedMath,
  createRestrictedDate,
  createDeterministicEnvironment,
} from './determinism';

// ============================================================================
// Cache
// ============================================================================

export {
  ScriptCache,
  getGlobalCache,
  resetGlobalCache,
  hashSource,
} from './cache';

// ============================================================================
// Worker
// ============================================================================

// Worker script should be imported directly:
// import ScriptWorker from '@daw/scripting-runtime/worker?worker';

// ============================================================================
// Types
// ============================================================================

export type {
  // Compilation
  ScriptSource,
  CompilationResult,
  CompiledScript,
  
  // Execution
  ExecutionRequest,
  ExecutionContext,
  ExecutionResult,
  SandboxEnvironment,
  SandboxConsole,
  RestrictedMath,
  RestrictedDate,
  
  // Worker
  WorkerRequest,
  WorkerResponse,
  
  // Cache
  CacheEntry,
  CacheStats,
  
  // Determinism
  NonDeterministicUsage,
  DeterminismValidation,
} from './types';

// ============================================================================
// Version
// ============================================================================

export const VERSION = '0.1.0';
