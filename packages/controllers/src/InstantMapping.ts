/**
 * Instant Mapping
 * Automatic mapping of controllers to device parameters
 */

import type { 
  InstantMapping, 
  MacroBinding, 
  ParameterBinding,
  ControllerDevice,
  ControllerInput
} from './types.js';
import type { PluginParameterSpec } from '@daw/project-schema';

export class InstantMappingEngine {
  private static readonly MACRO_COUNT = 8;
  private mappings: Map<string, InstantMapping> = new Map();

  /**
   * Create automatic mapping for a device
   */
  createInstantMapping(
    trackId: string,
    deviceId: string,
    deviceName: string,
    parameters: PluginParameterSpec[],
    controller: ControllerDevice
  ): InstantMapping {
    const macroBindings: MacroBinding[] = [];
    const parameterBindings: ParameterBinding[] = [];

    // Find suitable controller inputs
    const knobs = controller.inputs.filter(i => i.type === 'encoder');
    const faders = controller.inputs.filter(i => i.type === 'fader');
    const buttons = controller.inputs.filter(i => i.type === 'button');

    // Map macros to first 8 knobs/faders
    const macroInputs = knobs.length >= InstantMappingEngine.MACRO_COUNT 
      ? knobs.slice(0, InstantMappingEngine.MACRO_COUNT)
      : [...knobs, ...faders].slice(0, InstantMappingEngine.MACRO_COUNT);

    for (let i = 0; i < Math.min(InstantMappingEngine.MACRO_COUNT, macroInputs.length); i++) {
      macroBindings.push({
        macroIndex: i,
        inputId: macroInputs[i].id,
        name: `Macro ${i + 1}`
      });
    }

    // Map important parameters to remaining controls
    const importantParams = this.identifyImportantParameters(parameters);
    const remainingInputs = controller.inputs.filter(
      i => !macroBindings.some(b => b.inputId === i.id)
    );

    for (let i = 0; i < Math.min(importantParams.length, remainingInputs.length); i++) {
      parameterBindings.push({
        parameterId: importantParams[i].id,
        inputId: remainingInputs[i].id,
        parameterSpec: importantParams[i]
      });
    }

    const mapping: InstantMapping = {
      trackId,
      deviceId,
      macroBindings,
      parameterBindings
    };

    this.mappings.set(deviceId, mapping);
    return mapping;
  }

  /**
   * Identify the most important parameters to map
   */
  private identifyImportantParameters(parameters: PluginParameterSpec[]): PluginParameterSpec[] {
    const priorityKeywords = [
      'cutoff', 'frequency', 'resonance', 'filter',
      'attack', 'decay', 'sustain', 'release', 'adsr',
      'volume', 'gain', 'level', 'mix', 'amount',
      'rate', 'speed', 'depth', 'feedback',
      'waveform', 'shape', 'type'
    ];

    // Score parameters based on keywords
    const scored = parameters.map(param => {
      const nameLower = param.name.toLowerCase();
      let score = 0;
      
      for (const keyword of priorityKeywords) {
        if (nameLower.includes(keyword)) {
          score += 10;
        }
      }
      
      // Prefer continuous parameters
      if (param.kind === 'float') {
        score += 5;
      }
      
      return { param, score };
    });

    // Sort by score and return
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.param);
  }

  /**
   * Get mapping for a device
   */
  getMapping(deviceId: string): InstantMapping | undefined {
    return this.mappings.get(deviceId);
  }

  /**
   * Update macro binding
   */
  updateMacroBinding(
    deviceId: string,
    macroIndex: number,
    inputId: string
  ): boolean {
    const mapping = this.mappings.get(deviceId);
    if (!mapping) return false;

    const binding = mapping.macroBindings.find(b => b.macroIndex === macroIndex);
    if (binding) {
      binding.inputId = inputId;
    } else {
      mapping.macroBindings.push({
        macroIndex,
        inputId,
        name: `Macro ${macroIndex + 1}`
      });
    }

    return true;
  }

  /**
   * Update parameter binding
   */
  updateParameterBinding(
    deviceId: string,
    parameterId: string,
    inputId: string
  ): boolean {
    const mapping = this.mappings.get(deviceId);
    if (!mapping) return false;

    const binding = mapping.parameterBindings.find(b => b.parameterId === parameterId);
    if (binding) {
      binding.inputId = inputId;
      return true;
    }

    return false;
  }

  /**
   * Remove a mapping
   */
  removeMapping(deviceId: string): boolean {
    return this.mappings.delete(deviceId);
  }

  /**
   * Get all mappings
   */
  getAllMappings(): InstantMapping[] {
    return Array.from(this.mappings.values());
  }

  /**
   * Clear all mappings
   */
  clearAllMappings(): void {
    this.mappings.clear();
  }

  /**
   * Export mapping to JSON
   */
  exportMapping(deviceId: string): string | null {
    const mapping = this.mappings.get(deviceId);
    if (!mapping) return null;

    return JSON.stringify(mapping, null, 2);
  }

  /**
   * Import mapping from JSON
   */
  importMapping(json: string): InstantMapping | null {
    try {
      const mapping = JSON.parse(json) as InstantMapping;
      this.mappings.set(mapping.deviceId, mapping);
      return mapping;
    } catch {
      return null;
    }
  }

  /**
   * Suggest mapping for a controller
   */
  suggestMapping(
    controller: ControllerDevice,
    deviceType: 'instrument' | 'effect' | 'mixer'
  ): { inputId: string; suggestedTarget: string }[] {
    const suggestions: { inputId: string; suggestedTarget: string }[] = [];

    switch (deviceType) {
      case 'instrument':
        // Suggest keyboard for notes, knobs for filter/amp
        controller.inputs.forEach(input => {
          if (input.type === 'keyboard') {
            suggestions.push({ inputId: input.id, suggestedTarget: 'Note Input' });
          } else if (input.type === 'encoder') {
            suggestions.push({ inputId: input.id, suggestedTarget: 'Filter/Envelope' });
          }
        });
        break;
        
      case 'effect':
        // Suggest knobs for parameters
        controller.inputs.forEach(input => {
          if (input.type === 'encoder' || input.type === 'fader') {
            suggestions.push({ inputId: input.id, suggestedTarget: 'Effect Parameter' });
          }
        });
        break;
        
      case 'mixer':
        // Suggest faders for volume, knobs for pan
        controller.inputs.forEach(input => {
          if (input.type === 'fader') {
            suggestions.push({ inputId: input.id, suggestedTarget: 'Track Volume' });
          } else if (input.type === 'encoder') {
            suggestions.push({ inputId: input.id, suggestedTarget: 'Track Pan' });
          } else if (input.type === 'button') {
            suggestions.push({ inputId: input.id, suggestedTarget: 'Mute/Solo' });
          }
        });
        break;
    }

    return suggestions;
  }
}
