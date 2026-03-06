/**
 * Script Worker
 * 
 * Web Worker entry point for script compilation and execution.
 * Handles messages from the main thread and returns results.
 * 
 * Usage:
 * ```typescript
 * const worker = new Worker(new URL('./worker.ts', import.meta.url));
 * worker.postMessage({ type: 'compile', source: {...} });
 * ```
 */

import type { WorkerRequest, WorkerResponse } from './types';
import { compile } from './compiler';
import { execute } from './executor';
import { validateDeterminism } from './determinism';
import { ScriptCache, getGlobalCache } from './cache';

// Cache instance
let cache: ScriptCache;

/**
 * Initialize the worker
 */
function init(): void {
  cache = getGlobalCache();
}

/**
 * Handle compile request
 */
function handleCompile(request: Extract<WorkerRequest, { type: 'compile' }>): WorkerResponse {
  const { source } = request;
  
  // Check cache first
  const cached = cache.get(source);
  if (cached) {
    return {
      type: 'compile',
      result: {
        success: true,
        diagnostics: [],
        jsCode: cached.jsCode,
        sourceMap: cached.sourceMap,
        hash: cached.hash,
      },
    };
  }
  
  // Compile
  const result = compile(source);
  
  // Cache successful compilations
  if (result.success && result.jsCode) {
    cache.set(source, {
      id: source.id,
      hash: result.hash,
      jsCode: result.jsCode,
      sourceMap: result.sourceMap ?? '',
      parameters: [],
      compiledAt: Date.now(),
    });
  }
  
  return {
    type: 'compile',
    result,
  };
}

/**
 * Handle execute request
 */
function handleExecute(request: Extract<WorkerRequest, { type: 'execute' }>): WorkerResponse {
  const result = execute(request.request);
  
  return {
    type: 'execute',
    result,
  };
}

/**
 * Handle validate request
 */
function handleValidate(request: Extract<WorkerRequest, { type: 'validate' }>): WorkerResponse {
  const validation = validateDeterminism(request.code);
  
  return {
    type: 'validate',
    valid: validation.deterministic,
    diagnostics: validation.issues.map(issue => ({
      level: 'error',
      message: issue.message,
      line: issue.line,
      column: issue.column,
      code: `DETERMINISM_${issue.type.replace(/\./g, '_').toUpperCase()}`,
    })),
  };
}

/**
 * Handle ping request
 */
function handlePing(): WorkerResponse {
  return {
    type: 'pong',
  };
}

/**
 * Process incoming message
 */
function handleMessage(event: MessageEvent<WorkerRequest>): void {
  const request = event.data;
  
  try {
    let response: WorkerResponse;
    
    switch (request.type) {
      case 'compile':
        response = handleCompile(request);
        break;
      
      case 'execute':
        response = handleExecute(request);
        break;
      
      case 'validate':
        response = handleValidate(request);
        break;
      
      case 'ping':
        response = handlePing();
        break;
      
      default:
        response = {
          type: 'error',
          error: `Unknown request type: ${(request as { type: string }).type}`,
        };
    }
    
    self.postMessage(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    self.postMessage({
      type: 'error',
      error: errorMessage,
    });
  }
}

// Set up message handler
self.addEventListener('message', handleMessage);

// Initialize
init();

// Signal that worker is ready
self.postMessage({ type: 'pong' });
