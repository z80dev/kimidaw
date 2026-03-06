/**
 * Comping package - Ableton-style take lanes and comping
 * 
 * Provides take lane management, comping tools, and crossfade generation
 * for selecting the best parts from multiple takes.
 * 
 * @example
 * ```typescript
 * import { TakeLaneManager, CompToolManager, CrossfadeGenerator } from '@daw/comping';
 * 
 * // Create take lanes
 * const laneManager = new TakeLaneManager();
 * const lane1 = laneManager.createTakeLane(trackId, 'audio', 'Take 1');
 * const lane2 = laneManager.createTakeLane(trackId, 'audio', 'Take 2');
 * 
 * // Create comp and select regions
 * const compManager = new CompToolManager();
 * const compTake = compManager.createCompTake();
 * 
 * compManager.selectRegion(compTake.id, lane1, clipId, 0, 960); // First bar from take 1
 * compManager.selectRegion(compTake.id, lane2, clipId, 960, 1920); // Second bar from take 2
 * 
 * // Generate crossfades
 * const crossfades = CrossfadeGenerator.generateRegionCrossfades(
 *   compManager.getRegions(compTake.id),
 *   44100
 * );
 * ```
 */

// Take lane management
export { TakeLaneManager } from './TakeLanes.js';

// Comp tool
export { CompToolManager, type CompSelection, type CompEditResult } from './CompTool.js';

// Crossfades
export { 
  CrossfadeGenerator, 
  CrossfadeBatch,
  type CrossfadeCurve,
  type CrossfadeResult 
} from './Crossfades.js';

// Types
export type {
  TakeLane,
  TakeLaneType,
  TakeLaneGroup,
  CompRegion,
  CompTake,
  CrossfadeConfig,
  FadeCurve,
  CompingOptions,
  CompingPreferences,
  CompingState,
  CompTool,
  CompEditCommand,
  CycleRecordMode
} from './types.js';

// Default exports
export { TakeLaneManager as default } from './TakeLanes.js';
