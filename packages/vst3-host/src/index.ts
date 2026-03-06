/**
 * VST3 Host
 * 
 * VST3, AudioUnit, and CLAP plugin support for the In-Browser DAW.
 * 
 * @example
 * ```typescript
 * import { createVSTBridge } from '@daw/vst3-host';
 * 
 * const bridge = createVSTBridge({
 *   serverUrl: 'ws://localhost:8765',
 *   audioContext: myAudioContext
 * });
 * 
 * await bridge.connect();
 * 
 * // Scan for plugins
 * const plugins = await bridge.scanPlugins();
 * 
 * // Load a plugin
 * const serato = plugins.find(p => p.name.includes('Serato'));
 * if (serato) {
 *   const instance = await bridge.loadPlugin(serato);
 *   instance.connect(myMixerNode);
 * }
 * ```
 */

export { createVSTBridge, VSTBridgeClient } from './bridge-client.js';

// Types
export type {
  PluginFormat,
  PluginCategory,
  PluginDescriptor,
  PluginPreset,
  PluginParameter,
  VSTBridgeConfig,
  VSTBridge,
  PluginInstance
} from './types.js';

// Version
export const VERSION = '1.0.0';

/**
 * Quick plugin loader
 */
export async function loadVSTPlugin(
  bridgeUrl: string,
  audioContext: AudioContext,
  pluginName: string
): Promise<import('./types.js').PluginInstance> {
  const { createVSTBridge } = await import('./bridge-client.js');
  
  const bridge = createVSTBridge({
    serverUrl: bridgeUrl,
    audioContext
  });
  
  await bridge.connect();
  
  const plugins = await bridge.scanPlugins();
  const plugin = plugins.find(p => 
    p.name.toLowerCase().includes(pluginName.toLowerCase())
  );
  
  if (!plugin) {
    throw new Error(`Plugin not found: ${pluginName}`);
  }
  
  return bridge.loadPlugin(plugin);
}
