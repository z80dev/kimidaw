/**
 * Remote Script Runtime
 * Executes JavaScript controller scripts (like Ableton's MIDI Remote Scripts)
 */

import type {
  RemoteScriptAPI,
  SongAPI,
  TrackAPI,
  DeviceAPI,
  ParameterAPI,
  ClipSlotAPI,
  SceneAPI,
  ViewAPI,
  RootAPI
} from './types.js';

interface ScriptContext {
  api: RemoteScriptAPI;
  console: Console;
  setInterval: typeof setInterval;
  clearInterval: typeof clearInterval;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
}

export interface ScriptInstance {
  id: string;
  name: string;
  controllerId: string;
  code: string;
  isRunning: boolean;
  context: ScriptContext;
  exports: Record<string, unknown>;
}

export class RemoteScriptRuntime {
  private scripts: Map<string, ScriptInstance> = new Map();
  private apiImplementation: RemoteScriptAPI;

  constructor(songAPI: SongAPI) {
    this.apiImplementation = this.createAPI(songAPI);
  }

  /**
   * Load and execute a remote script
   */
  async loadScript(
    controllerId: string,
    name: string,
    code: string
  ): Promise<ScriptInstance | null> {
    const id = `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create script context
      const context = this.createScriptContext();

      // Wrap code in IIFE with context
      const wrappedCode = `
        (function(exports, api, console, setInterval, clearInterval, setTimeout, clearTimeout) {
          ${code}
        })
      `;

      // Compile and execute
      const scriptFn = eval(wrappedCode) as Function;
      const exports: Record<string, unknown> = {};

      scriptFn(
        exports,
        context.api,
        context.console,
        context.setInterval,
        context.clearInterval,
        context.setTimeout,
        context.clearTimeout
      );

      const instance: ScriptInstance = {
        id,
        name,
        controllerId,
        code,
        isRunning: true,
        context,
        exports
      };

      this.scripts.set(id, instance);

      // Call init if defined
      if (typeof exports.init === 'function') {
        await (exports.init as Function)();
      }

      return instance;
    } catch (err) {
      console.error('Failed to load script:', err);
      return null;
    }
  }

  /**
   * Unload a script
   */
  unloadScript(scriptId: string): boolean {
    const script = this.scripts.get(scriptId);
    if (!script) return false;

    // Call cleanup if defined
    if (typeof script.exports.cleanup === 'function') {
      try {
        (script.exports.cleanup as Function)();
      } catch (err) {
        console.error('Script cleanup error:', err);
      }
    }

    script.isRunning = false;
    this.scripts.delete(scriptId);
    return true;
  }

  /**
   * Call a function exported by the script
   */
  async callFunction(
    scriptId: string,
    functionName: string,
    ...args: unknown[]
  ): Promise<unknown> {
    const script = this.scripts.get(scriptId);
    if (!script || !script.isRunning) {
      throw new Error('Script not found or not running');
    }

    const fn = script.exports[functionName];
    if (typeof fn !== 'function') {
      throw new Error(`Function ${functionName} not found in script exports`);
    }

    return await fn(...args);
  }

  /**
   * Get a loaded script
   */
  getScript(scriptId: string): ScriptInstance | undefined {
    return this.scripts.get(scriptId);
  }

  /**
   * Get all loaded scripts
   */
  getAllScripts(): ScriptInstance[] {
    return Array.from(this.scripts.values());
  }

  /**
   * Get scripts for a controller
   */
  getScriptsForController(controllerId: string): ScriptInstance[] {
    return Array.from(this.scripts.values())
      .filter(s => s.controllerId === controllerId);
  }

  /**
   * Unload all scripts
   */
  unloadAllScripts(): void {
    for (const scriptId of this.scripts.keys()) {
      this.unloadScript(scriptId);
    }
  }

  /**
   * Create script execution context
   */
  private createScriptContext(): ScriptContext {
    return {
      api: this.apiImplementation,
      console: console,
      setInterval: (handler: TimerHandler, timeout?: number) => {
        return setInterval(handler, timeout);
      },
      clearInterval: (id: number) => {
        clearInterval(id);
      },
      setTimeout: (handler: TimerHandler, timeout?: number) => {
        return setTimeout(handler, timeout);
      },
      clearTimeout: (id: number) => {
        clearTimeout(id);
      }
    };
  }

  /**
   * Create the API implementation
   */
  private createAPI(songAPI: SongAPI): RemoteScriptAPI {
    return {
      log: (...args: unknown[]) => {
        console.log('[RemoteScript]', ...args);
      },
      showMessage: (message: string) => {
        console.log('[RemoteScript Message]', message);
        // In real implementation, show in UI
      },
      getSong: () => songAPI,
      getRoot: () => ({
        beginUndoStep: () => {},
        endUndoStep: () => {}
      })
    };
  }

  /**
   * Create a safe eval environment
   */
  private createSafeEval(): (code: string) => unknown {
    // Restricted globals for script execution
    const restrictedGlobals = {
      console,
      Math,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Date,
      RegExp,
      Map,
      Set,
      Promise,
      Error,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURI,
      decodeURI,
      encodeURIComponent,
      decodeURIComponent,
      escape: undefined,
      unescape: undefined,
      eval: undefined,
      Function: undefined
    };

    return (code: string) => {
      const fn = new Function('globals', `
        with(globals) {
          return ${code};
        }
      `);
      return fn(restrictedGlobals);
    };
  }
}

/**
 * Template for creating new controller scripts
 */
export const SCRIPT_TEMPLATE = `
// Remote Script Template
// Controller: {CONTROLLER_NAME}

// Initialize the script
exports.init = function() {
  api.log('Script initialized');
  
  // Get the song
  var song = api.getSong();
  
  // Example: Listen for track changes
  // song.view.addSelectedTrackListener(onTrackSelected);
};

// Cleanup when script is unloaded
exports.cleanup = function() {
  api.log('Script cleanup');
};

// Handle incoming MIDI
exports.handleMidi = function(channel, control, value) {
  api.log('MIDI received:', channel, control, value);
  
  // Map MIDI to DAW actions
  // Example: CC 1 controls selected track volume
  if (control === 1) {
    var song = api.getSong();
    var track = song.view.selectedTrack;
    if (track) {
      var normalizedValue = value / 127;
      track.volume.setValue(normalizedValue);
    }
  }
};

// Custom functions can be exported
exports.myFunction = function() {
  api.showMessage('Hello from controller!');
};
`;
