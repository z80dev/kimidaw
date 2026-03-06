# @daw/scripting-runtime

Script compilation and execution runtime for the In-Browser DAW.

## Overview

This package provides a secure, sandboxed environment for executing user-authored music scripts. It ensures:
- **Determinism**: Scripts produce identical output from the same seed
- **Security**: Scripts run in an isolated sandbox with no DOM access
- **Performance**: Compiled scripts are cached to avoid recompilation
- **Safety**: Timeout and memory limits prevent runaway scripts

## Installation

```bash
npm install @daw/scripting-runtime
```

## Usage

### Basic Compilation and Execution

```typescript
import { compile, execute } from '@daw/scripting-runtime';

// Compile TypeScript to JavaScript
const source = {
  id: 'my-script',
  code: `
    export default function(ctx) {
      const clip = ctx.clip('generated')
        .midi()
        .note('C4', 0, 960)
        .build();
      
      return {
        clips: [{
          trackId: 'track-1',
          clip,
          provenance: {
            scriptId: 'my-script',
            hash: '',
            seed: ctx.seed,
            generatedAt: Date.now(),
          },
        }],
        automation: [],
      };
    }
  `,
  version: 1,
};

const compileResult = compile(source);

if (compileResult.success && compileResult.jsCode) {
  // Execute the compiled script
  const execResult = execute({
    scriptId: 'my-script',
    jsCode: compileResult.jsCode,
    context: {
      projectId: 'project-1',
      seed: 'deterministic-seed-123',
      ppq: 960,
      sampleRate: 48000,
      tempoMap: [{ tick: 0, bpm: 120, curve: 'jump' }],
    },
  });

  if (execResult.success) {
    console.log('Generated clips:', execResult.result.clips);
  } else {
    console.error('Execution failed:', execResult.diagnostics);
  }
} else {
  console.error('Compilation failed:', compileResult.diagnostics);
}
```

### Using the Cache

```typescript
import { ScriptCache, getGlobalCache } from '@daw/scripting-runtime';

// Use global cache
const cache = getGlobalCache();

// Check if script is cached
if (cache.has(source)) {
  const compiled = cache.get(source);
  // Use cached compiled script
} else {
  const result = compile(source);
  if (result.success) {
    cache.set(source, {
      id: source.id,
      hash: result.hash,
      jsCode: result.jsCode,
      sourceMap: result.sourceMap,
      parameters: [],
      compiledAt: Date.now(),
    });
  }
}

// Get cache statistics
const stats = cache.getStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

### Determinism Validation

```typescript
import { validateDeterminism, isDeterministic } from '@daw/scripting-runtime';

// Check if code is deterministic
const code = 'const x = Math.random();';

if (!isDeterministic(code)) {
  const validation = validateDeterminism(code);
  
  for (const issue of validation.issues) {
    console.log(
      `Line ${issue.line}, Col ${issue.column}: ${issue.message}`
    );
  }
}
```

### Web Worker

```typescript
// main.ts
const worker = new Worker(
  new URL('@daw/scripting-runtime/worker', import.meta.url),
  { type: 'module' }
);

worker.postMessage({
  type: 'compile',
  source: {
    id: 'my-script',
    code: 'export default (ctx) => ({ clips: [], automation: [] })',
    version: 1,
  },
});

worker.onmessage = (event) => {
  const response = event.data;
  
  if (response.type === 'compile') {
    console.log('Compiled:', response.result.success);
  }
};
```

## API Reference

### Compilation

#### `compile(source, options?)`

Compiles TypeScript source code to JavaScript.

```typescript
import { compile, DEFAULT_COMPILER_OPTIONS } from '@daw/scripting-runtime';

const result = compile(source, {
  target: 'ES2022',
  module: 'ESNext',
  strict: true,
  checkDeterminism: true,
});

// Result:
// {
//   success: boolean;
//   diagnostics: ScriptDiagnostic[];
//   jsCode?: string;
//   sourceMap?: string;
//   hash: string;
// }
```

#### `checkCompiles(code)`

Quick check if code compiles without errors.

```typescript
const canCompile = checkCompiles('export default () => {}');
```

#### `getDiagnostics(code)`

Get diagnostics for code without compiling.

```typescript
const diagnostics = getDiagnostics(code);
```

### Execution

#### `execute(request)`

Executes compiled JavaScript in a sandboxed environment.

```typescript
const result = execute({
  scriptId: 'my-script',
  jsCode: compiledCode,
  context: {
    projectId: 'project-1',
    seed: 'seed-123',
    ppq: 960,
    sampleRate: 48000,
    tempoMap: [{ tick: 0, bpm: 120, curve: 'jump' }],
    parameters: { density: 0.5 }, // Optional
  },
  timeoutMs: 5000, // Optional, default 5000
});

// Result:
// {
//   success: boolean;
//   result?: ScriptModuleResult;
//   diagnostics: ScriptDiagnostic[];
//   executionTimeMs: number;
// }
```

### Cache

#### `ScriptCache`

Content-addressed cache for compiled scripts.

```typescript
import { ScriptCache } from '@daw/scripting-runtime';

const cache = new ScriptCache({
  maxEntries: 100,
  maxSizeBytes: 10 * 1024 * 1024,
  ttlMs: 24 * 60 * 60 * 1000,
});

cache.set(source, compiled);
const cached = cache.get(source);
cache.invalidate(source);
cache.clear();

const stats = cache.getStats();
// { entries, totalSizeBytes, hitCount, missCount, hitRate }
```

### Determinism

#### `validateDeterminism(code)`

Validates that code doesn't use non-deterministic constructs.

```typescript
const validation = validateDeterminism(code);
// {
//   deterministic: boolean;
//   issues: NonDeterministicUsage[];
// }
```

#### `isDeterministic(code)`

Quick check if code is deterministic.

```typescript
const ok = isDeterministic(code);
```

#### `createRestrictedMath()` / `createRestrictedDate()`

Create restricted versions of Math and Date for sandboxing.

```typescript
const math = createRestrictedMath();
math.random(); // Throws!

const Date = createRestrictedDate();
Date.now(); // Throws!
new Date(); // Throws!
new Date(1234567890); // OK
```

## Script Contract

Scripts must export a default function that receives a `MusicScriptContext` and returns a `ScriptModuleResult`:

```typescript
export default function myScript(ctx: MusicScriptContext): ScriptModuleResult {
  // Generate clips, automation, scenes
  return {
    clips: [...],
    automation: [...],
    scenes: [...], // Optional
    diagnostics: [...], // Optional
  };
}
```

## Security Model

### Restricted APIs

Scripts cannot access:
- `Math.random()` - Use `ctx.rand()` instead
- `Date.now()` - Use deterministic time from context
- `new Date()` - Use `new Date(timestamp)` with explicit time
- `performance.now()`
- `crypto.getRandomValues()`
- DOM APIs
- Network APIs
- File system APIs

### Allowed APIs

Scripts can use:
- Standard JavaScript (objects, arrays, functions, etc.)
- Math functions (except random)
- Date.parse() and Date.UTC()
- JSON
- Array methods
- String methods
- Regular expressions
- Console (log, warn, error, info)

## Worker Protocol

### Requests

```typescript
type WorkerRequest =
  | { type: 'compile'; source: ScriptSource }
  | { type: 'execute'; request: ExecutionRequest }
  | { type: 'validate'; code: string }
  | { type: 'ping' };
```

### Responses

```typescript
type WorkerResponse =
  | { type: 'compile'; result: CompilationResult }
  | { type: 'execute'; result: ExecutionResult }
  | { type: 'validate'; valid: boolean; diagnostics: ScriptDiagnostic[] }
  | { type: 'pong' }
  | { type: 'error'; error: string };
```

## Type Exports

```typescript
import type {
  ScriptSource,
  CompilationResult,
  CompiledScript,
  ExecutionRequest,
  ExecutionContext,
  ExecutionResult,
  CacheEntry,
  CacheStats,
  NonDeterministicUsage,
  DeterminismValidation,
} from '@daw/scripting-runtime';
```

## License

MIT
