/**
 * Controllers Package
 * Ableton-style MIDI controller mapping and scripts
 * 
 * Provides:
 * - ControllerManager: MIDI device connection and mapping
 * - InstantMappingEngine: Automatic parameter mapping
 * - RemoteScriptRuntime: JavaScript controller scripts
 * - PushEmulation: Ableton Push-style control surface
 * 
 * @example
 * ```typescript
 * import { 
 *   ControllerManager, 
 *   InstantMappingEngine, 
 *   RemoteScriptRuntime,
 *   PushEmulation 
 * } from '@daw/controllers';
 * 
 * // Initialize controller manager
 * const manager = new ControllerManager();
 * await manager.initialize();
 * 
 * // Handle MIDI messages
 * manager.onMidiMessage((deviceId, data) => {
 *   console.log('MIDI:', deviceId, data);
 * });
 * ```
 */

// Controller management
export { ControllerManager, type ControllerConnection } from './ControllerManager.js';

// Instant mapping
export { InstantMappingEngine } from './InstantMapping.js';

// Remote scripts
export { 
  RemoteScriptRuntime, 
  SCRIPT_TEMPLATE,
  type ScriptInstance 
} from './RemoteScriptRuntime.js';

// Push emulation
export { 
  PushEmulation, 
  type PushState, 
  type PushMode,
  type PushGridButton 
} from './push-emulation/PushEmulation.js';

// Types
export type {
  ControllerType,
  ControllerDevice,
  ControllerInput,
  ControllerOutput,
  ControllerMapping,
  MappingTarget,
  TransportAction,
  MixerParameter,
  ClipAction,
  BrowserAction,
  ViewAction,
  ValueTransform,
  InstantMapping,
  MacroBinding,
  ParameterBinding,
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

// Default export
export { ControllerManager as default } from './ControllerManager.js';
