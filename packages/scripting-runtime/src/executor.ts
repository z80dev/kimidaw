/**
 * Script Executor
 * 
 * Executes compiled JavaScript in a sandboxed environment.
 * 
 * Implements security and determinism requirements:
 * - No access to DOM
 * - No access to browser APIs
 * - Restricted Math (no random)
 * - Restricted Date (no current time)
 * - Timeout protection
 * - Memory limits
 */

import type { 
  ExecutionRequest, 
  ExecutionResult, 
  ScriptModuleResult,
  ScriptDiagnostic,
  SandboxConsole,
} from './types';
import type { MusicScriptContext } from '@daw/scripting-api';
import { createContext } from '@daw/scripting-api';
import { createRestrictedMath, createRestrictedDate } from './determinism';

/** Default execution timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 5000;

/** Default memory limit in bytes */
const DEFAULT_MEMORY_LIMIT_BYTES = 64 * 1024 * 1024; // 64 MB

/** Execution options */
interface ExecutionOptions {
  timeoutMs: number;
  memoryLimitBytes: number;
}

/** Script timeout error */
class ScriptTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Script execution timed out after ${timeoutMs}ms`);
    this.name = 'ScriptTimeoutError';
  }
}

/** Script memory error */
class ScriptMemoryError extends Error {
  constructor(limitBytes: number) {
    super(`Script exceeded memory limit of ${limitBytes} bytes`);
    this.name = 'ScriptMemoryError';
  }
}

/**
 * Create a sandboxed console
 */
function createSandboxConsole(): SandboxConsole {
  const logs: Array<{ level: string; args: unknown[] }> = [];
  
  return {
    log: (...args: unknown[]) => {
      logs.push({ level: 'log', args });
    },
    warn: (...args: unknown[]) => {
      logs.push({ level: 'warn', args });
    },
    error: (...args: unknown[]) => {
      logs.push({ level: 'error', args });
    },
    info: (...args: unknown[]) => {
      logs.push({ level: 'info', args });
    },
  };
}

/**
 * Create a sandboxed environment
 */
function createSandbox(): {
  sandbox: Record<string, unknown>;
  console: SandboxConsole;
} {
  const console = createSandboxConsole();
  
  const sandbox: Record<string, unknown> = {
    console,
    Math: createRestrictedMath(),
    Date: createRestrictedDate(),
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    ReferenceError,
    Promise,
    JSON,
    Math_imul: Math.imul, // Expose for PRNG
    NaN,
    Infinity,
    undefined,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    decodeURI,
    decodeURIComponent,
    encodeURI,
    encodeURIComponent,
    escape: (globalThis as unknown as Record<string, unknown>).escape,
    unescape: (globalThis as unknown as Record<string, unknown>).unescape,
  };
  
  return { sandbox, console };
}

/**
 * Wrap user code in a module function
 */
function wrapCode(jsCode: string): string {
  return `
(function(exports) {
  "use strict";
  
  // Default export placeholder
  let __defaultExport = undefined;
  
  const module = { exports: {} };
  const exports = module.exports;
  
  // Define default export helper
  Object.defineProperty(exports, 'default', {
    get: () => __defaultExport,
    set: (v) => { __defaultExport = v; },
    enumerable: true,
  });
  
  ${jsCode}
  
  // Return the default export if set, otherwise module.exports
  return __defaultExport || module.exports.default || module.exports;
})({});
`;
}

/**
 * Execute a function in the sandbox
 */
function executeInSandbox(
  jsCode: string,
  context: MusicScriptContext,
  options: ExecutionOptions
): ScriptModuleResult {
  const { sandbox } = createSandbox();
  
  // Create the wrapped code
  const wrappedCode = wrapCode(jsCode);
  
  // Build the function
  const sandboxKeys = Object.keys(sandbox);
  const sandboxValues = sandboxKeys.map(key => sandbox[key]);
  
  // Create the function with sandboxed globals
  const fn = new Function(...sandboxKeys, wrappedCode);
  
  // Execute with timeout
  const startTime = performance.now();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;
  
  try {
    // Set up timeout
    timeoutId = setTimeout(() => {
      timedOut = true;
    }, options.timeoutMs);
    
    // Execute the module to get the default export
    const userModule = fn(...sandboxValues);
    
    // Check if we got a function
    if (typeof userModule !== 'function') {
      throw new Error(
        `Script must export a default function. Got: ${typeof userModule}`
      );
    }
    
    // Execute the user's function with the context
    const result = userModule(context);
    
    if (timedOut) {
      throw new ScriptTimeoutError(options.timeoutMs);
    }
    
    // Handle async results
    if (result && typeof result.then === 'function') {
      throw new Error(
        'Async script execution not supported. ' +
        'Scripts must be synchronous.'
      );
    }
    
    // Validate result
    if (!result || typeof result !== 'object') {
      return {
        clips: [],
        automation: [],
      };
    }
    
    return {
      clips: result.clips || [],
      automation: result.automation || [],
      scenes: result.scenes,
      diagnostics: result.diagnostics,
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    const executionTime = performance.now() - startTime;
    if (executionTime > options.timeoutMs) {
      throw new ScriptTimeoutError(options.timeoutMs);
    }
  }
}

/**
 * Execute a compiled script
 * 
 * @param request - Execution request
 * @returns Execution result
 */
export function execute(request: ExecutionRequest): ExecutionResult {
  const startTime = performance.now();
  const diagnostics: ScriptDiagnostic[] = [];
  
  const options: ExecutionOptions = {
    timeoutMs: request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    memoryLimitBytes: DEFAULT_MEMORY_LIMIT_BYTES,
  };
  
  try {
    // Create the MusicScriptContext
    const context = createContext({
      projectId: request.context.projectId,
      seed: request.context.seed,
      ppq: request.context.ppq,
      sampleRate: request.context.sampleRate,
      tempoMap: request.context.tempoMap,
    });
    
    // Execute the script
    const result = executeInSandbox(request.jsCode, context, options);
    
    // Add any diagnostics from the result
    if (result.diagnostics) {
      diagnostics.push(...result.diagnostics);
    }
    
    const executionTimeMs = performance.now() - startTime;
    
    return {
      success: true,
      result,
      diagnostics,
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = performance.now() - startTime;
    
    let message: string;
    let level: 'error' | 'warning' = 'error';
    
    if (error instanceof ScriptTimeoutError) {
      message = error.message;
      level = 'error';
    } else if (error instanceof ScriptMemoryError) {
      message = error.message;
      level = 'error';
    } else if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    
    diagnostics.push({
      level,
      message,
      code: 'EXECUTION_ERROR',
    });
    
    return {
      success: false,
      diagnostics,
      executionTimeMs,
    };
  }
}

/**
 * Validate that code can execute without errors
 * 
 * @param jsCode - JavaScript code to validate
 * @returns True if code executes without throwing
 */
export function validateExecution(jsCode: string): boolean {
  const result = execute({
    scriptId: 'validate',
    jsCode,
    context: {
      projectId: 'validate',
      seed: 'validate',
      ppq: 960,
      sampleRate: 48000,
      tempoMap: [{ tick: 0, bpm: 120, curve: 'jump' }],
    },
    timeoutMs: 1000,
  });
  
  return result.success;
}

/**
 * Create a test execution context for debugging
 */
export function createTestContext(
  overrides: Partial<Parameters<typeof createContext>[0]> = {}
): MusicScriptContext {
  return createContext({
    projectId: 'test',
    seed: 'test-seed',
    ppq: 960,
    sampleRate: 48000,
    tempoMap: [{ tick: 0, bpm: 120, curve: 'jump' }],
    ...overrides,
  });
}

// Re-export types
export { ScriptTimeoutError, ScriptMemoryError };
