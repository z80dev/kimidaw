/**
 * AI Mixing Assistant
 * 
 * Intelligent mixing suggestions based on audio analysis.
 * 
 * @example
 * ```typescript
 * import { createMixingAssistant } from '@daw/ai-mixing-assistant';
 * 
 * const assistant = createMixingAssistant();
 * 
 * // Analyze tracks
 * const trackAnalysis = await assistant.analyzeTrack(vocalBuffer, 'lead-vocal');
 * 
 * // Analyze entire mix
 * const mixAnalysis = assistant.analyzeMix([track1, track2, track3]);
 * 
 * // Get suggestions
 * const suggestions = assistant.getSuggestions(mixAnalysis);
 * 
 * for (const sugg of suggestions) {
 *   console.log(`${sugg.priority}: ${sugg.description}`);
 * }
 * ```
 */

export { createMixingAssistant, MixingAssistantImpl } from './assistant.js';

// Types
export type {
  TrackType,
  ProblemType,
  SuggestionType,
  TrackAnalysis,
  Problem,
  MixAnalysis,
  MixSuggestion
} from './types.js';

export { TRACK_TYPE_CHARACTERISTICS } from './types.js';

// Version
export const VERSION = '1.0.0';

/**
 * Quick analyze and suggest
 */
export async function analyzeAndSuggest(
  tracks: Array<{ buffer: AudioBuffer; type: import('./types.js').TrackType; name: string }>
): Promise<import('./types.js').MixSuggestion[]> {
  const { createMixingAssistant } = await import('./assistant.js');
  
  const assistant = createMixingAssistant();
  
  const trackAnalyses = await Promise.all(
    tracks.map(t => assistant.analyzeTrack(t.buffer, t.type))
  );
  
  // Set names
  trackAnalyses.forEach((analysis, i) => {
    analysis.name = tracks[i].name;
  });
  
  const mixAnalysis = assistant.analyzeMix(trackAnalyses);
  return assistant.getSuggestions(mixAnalysis);
}
