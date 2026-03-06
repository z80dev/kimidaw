/**
 * Smart Comping
 * 
 * AI-assisted take selection for audio and MIDI comping.
 */

// ============================================================================
// Types
// ============================================================================

export interface Take {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  audioData?: Float32Array;
  midiData?: MidiTakeData;
  analysis?: TakeAnalysis;
}

export interface MidiTakeData {
  notes: Array<{
    pitch: number;
    velocity: number;
    start: number;
    duration: number;
  }>;
  pitchBend: Array<{ time: number; value: number }>;
}

export interface TakeAnalysis {
  // Timing
  timingAccuracy: number; // 0-100
  grooveDeviation: number; // ms average
  
  // Pitch (for audio)
  pitchAccuracy: number; // 0-100
  pitchDrift: number; // cents
  vibratoConsistency: number; // 0-100
  
  // Dynamics
  velocityConsistency: number; // 0-100
  dynamicRange: number; // dB
  
  // Expression
  expressionScore: number; // 0-100
  articulationClarity: number; // 0-100
  
  // Technical
  noiseLevel: number; // dB
  breathNoise: number; // for vocals
  stringNoise: number; // for strings
  
  // Overall
  overallScore: number; // 0-100
}

export interface CompSelection {
  takeId: string;
  startTime: number;
  endTime: number;
  crossfadeIn: number; // ms
  crossfadeOut: number; // ms
  gain: number; // dB
}

export interface CompLane {
  id: string;
  name: string;
  takes: Take[];
  selections: CompSelection[];
}

export interface CompSuggestion {
  selections: CompSelection[];
  reasoning: string[];
  confidence: number; // 0-1
}

export interface CompCriteria {
  prioritizeTiming: boolean;
  prioritizePitch: boolean;
  prioritizeExpression: boolean;
  allowOverlap: boolean;
  minSelectionDuration: number; // seconds
  crossfadeDuration: number; // ms
}

// ============================================================================
// Smart Comping Engine
// ============================================================================

export interface SmartCompingEngine {
  analyzeTake(take: Take): TakeAnalysis;
  analyzeTakes(takes: Take[]): Map<string, TakeAnalysis>;
  suggestComp(lane: CompLane, criteria?: Partial<CompCriteria>): CompSuggestion;
  autoComp(lane: CompLane, criteria?: Partial<CompCriteria>): CompSelection[];
  compareTakes(take1: Take, take2: Take): ComparisonResult;
  findBestPhrases(lane: CompLane, phraseDuration: number): Array<{ start: number; takeId: string }>;
}

export interface ComparisonResult {
  winner: string;
  score1: number;
  score2: number;
  differences: string[];
}

export function createSmartCompingEngine(): SmartCompingEngine {
  function analyzeTake(take: Take): TakeAnalysis {
    // This is a simplified analysis - real implementation would use
    // more sophisticated DSP and possibly ML models
    
    const analysis: TakeAnalysis = {
      timingAccuracy: 70,
      grooveDeviation: 20,
      pitchAccuracy: 75,
      pitchDrift: 10,
      vibratoConsistency: 60,
      velocityConsistency: 65,
      dynamicRange: 12,
      expressionScore: 70,
      articulationClarity: 75,
      noiseLevel: -60,
      breathNoise: -50,
      stringNoise: -55,
      overallScore: 70,
    };
    
    // Analyze based on available data
    if (take.audioData) {
      analyzeAudio(take.audioData, analysis);
    }
    
    if (take.midiData) {
      analyzeMidi(take.midiData, analysis);
    }
    
    // Calculate overall score
    analysis.overallScore = calculateOverallScore(analysis);
    
    return analysis;
  }
  
  function analyzeAudio(audioData: Float32Array, analysis: TakeAnalysis): void {
    // Calculate RMS levels
    let sumSquared = 0;
    let peak = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      const sample = audioData[i];
      sumSquared += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }
    
    const rms = Math.sqrt(sumSquared / audioData.length);
    analysis.dynamicRange = 20 * Math.log10(peak / (rms + 1e-10));
    
    // Estimate noise level
    const noiseThreshold = rms * 0.1;
    let noiseSamples = 0;
    for (let i = 0; i < audioData.length; i++) {
      if (Math.abs(audioData[i]) < noiseThreshold) {
        noiseSamples++;
      }
    }
    analysis.noiseLevel = 20 * Math.log10(noiseSamples / audioData.length);
    
    // Analyze timing (simplified - would use onset detection)
    analysis.timingAccuracy = Math.max(50, 90 - analysis.grooveDeviation / 5);
  }
  
  function analyzeMidi(midiData: MidiTakeData, analysis: TakeAnalysis): void {
    // Analyze velocity consistency
    if (midiData.notes.length > 1) {
      const velocities = midiData.notes.map(n => n.velocity);
      const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
      const variance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
      analysis.velocityConsistency = Math.max(0, 100 - variance / 10);
    }
    
    // Analyze timing
    const noteTimes = midiData.notes.map(n => n.start);
    const intervals: number[] = [];
    for (let i = 1; i < noteTimes.length; i++) {
      intervals.push(noteTimes[i] - noteTimes[i - 1]);
    }
    
    if (intervals.length > 1) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, int) => sum + Math.pow(int - avgInterval, 2), 0) / intervals.length;
      analysis.timingAccuracy = Math.max(0, 100 - variance * 1000);
      analysis.grooveDeviation = Math.sqrt(variance) * 1000; // ms
    }
    
    // Pitch accuracy is always 100 for MIDI
    analysis.pitchAccuracy = 100;
    analysis.pitchDrift = 0;
  }
  
  function calculateOverallScore(analysis: TakeAnalysis): number {
    const weights = {
      timing: 0.25,
      pitch: 0.20,
      dynamics: 0.15,
      expression: 0.20,
      technical: 0.20,
    };
    
    const timingScore = analysis.timingAccuracy;
    const pitchScore = analysis.pitchAccuracy;
    const dynamicsScore = analysis.velocityConsistency;
    const expressionScore = analysis.expressionScore;
    const technicalScore = (analysis.articulationClarity + 
      (100 - Math.abs(analysis.noiseLevel) / 100 * 100)) / 2;
    
    return Math.round(
      timingScore * weights.timing +
      pitchScore * weights.pitch +
      dynamicsScore * weights.dynamics +
      expressionScore * weights.expression +
      technicalScore * weights.technical
    );
  }
  
  function analyzeTakes(takes: Take[]): Map<string, TakeAnalysis> {
    const results = new Map<string, TakeAnalysis>();
    
    for (const take of takes) {
      results.set(take.id, analyzeTake(take));
    }
    
    return results;
  }
  
  function suggestComp(lane: CompLane, criteria: Partial<CompCriteria> = {}): CompSuggestion {
    const fullCriteria: CompCriteria = {
      prioritizeTiming: false,
      prioritizePitch: false,
      prioritizeExpression: true,
      allowOverlap: false,
      minSelectionDuration: 0.1,
      crossfadeDuration: 10,
      ...criteria,
    };
    
    // Analyze all takes
    const analyses = analyzeTakes(lane.takes);
    
    // Find best take for each moment
    const selections: CompSelection[] = [];
    const reasoning: string[] = [];
    
    if (lane.takes.length === 0) {
      return { selections: [], reasoning: ['No takes available'], confidence: 0 };
    }
    
    // Simple strategy: use the highest scoring take for entire duration
    let bestTake = lane.takes[0];
    let bestScore = -1;
    
    for (const take of lane.takes) {
      const analysis = analyses.get(take.id);
      if (analysis && analysis.overallScore > bestScore) {
        bestScore = analysis.overallScore;
        bestTake = take;
      }
    }
    
    reasoning.push(`Selected "${bestTake.name}" as primary take (score: ${bestScore})`);
    
    // Create selection for entire take
    selections.push({
      takeId: bestTake.id,
      startTime: 0,
      endTime: bestTake.duration,
      crossfadeIn: fullCriteria.crossfadeDuration,
      crossfadeOut: fullCriteria.crossfadeDuration,
      gain: 0,
    });
    
    // Check for better phrases in other takes
    const phraseDuration = 2; // seconds
    const bestPhrases = findBestPhrases(lane, phraseDuration);
    
    for (const phrase of bestPhrases) {
      if (phrase.takeId !== bestTake.id) {
        const take = lane.takes.find(t => t.id === phrase.takeId);
        if (take) {
          reasoning.push(`Phrase at ${phrase.start}s is better in "${take.name}"`);
          
          // Add selection for this phrase
          selections.push({
            takeId: take.id,
            startTime: phrase.start,
            endTime: phrase.start + phraseDuration,
            crossfadeIn: fullCriteria.crossfadeDuration,
            crossfadeOut: fullCriteria.crossfadeDuration,
            gain: 0,
          });
        }
      }
    }
    
    // Sort and merge overlapping selections
    selections.sort((a, b) => a.startTime - b.startTime);
    
    return {
      selections,
      reasoning,
      confidence: bestScore / 100,
    };
  }
  
  function autoComp(lane: CompLane, criteria: Partial<CompCriteria> = {}): CompSelection[] {
    const suggestion = suggestComp(lane, criteria);
    return suggestion.selections;
  }
  
  function compareTakes(take1: Take, take2: Take): ComparisonResult {
    const analysis1 = analyzeTake(take1);
    const analysis2 = analyzeTake(take2);
    
    const differences: string[] = [];
    
    if (Math.abs(analysis1.timingAccuracy - analysis2.timingAccuracy) > 10) {
      differences.push(`Timing: ${take1.name} is ${analysis1.timingAccuracy > analysis2.timingAccuracy ? 'better' : 'worse'}`);
    }
    
    if (Math.abs(analysis1.pitchAccuracy - analysis2.pitchAccuracy) > 10) {
      differences.push(`Pitch: ${take1.name} is ${analysis1.pitchAccuracy > analysis2.pitchAccuracy ? 'better' : 'worse'}`);
    }
    
    if (Math.abs(analysis1.expressionScore - analysis2.expressionScore) > 10) {
      differences.push(`Expression: ${take1.name} is ${analysis1.expressionScore > analysis2.expressionScore ? 'better' : 'worse'}`);
    }
    
    const winner = analysis1.overallScore >= analysis2.overallScore ? take1.id : take2.id;
    
    return {
      winner,
      score1: analysis1.overallScore,
      score2: analysis2.overallScore,
      differences,
    };
  }
  
  function findBestPhrases(
    lane: CompLane,
    phraseDuration: number
  ): Array<{ start: number; takeId: string }> {
    const analyses = analyzeTakes(lane.takes);
    const phrases: Array<{ start: number; takeId: string }> = [];
    
    // Assume all takes have same duration
    if (lane.takes.length === 0) return phrases;
    
    const duration = lane.takes[0].duration;
    const numPhrases = Math.ceil(duration / phraseDuration);
    
    for (let i = 0; i < numPhrases; i++) {
      const start = i * phraseDuration;
      
      // Find best take for this phrase
      let bestTakeId = lane.takes[0].id;
      let bestScore = -1;
      
      for (const take of lane.takes) {
        const analysis = analyses.get(take.id);
        // In a real implementation, we'd analyze the specific phrase
        // For now, use overall score as approximation
        if (analysis && analysis.overallScore > bestScore) {
          bestScore = analysis.overallScore;
          bestTakeId = take.id;
        }
      }
      
      phrases.push({ start, takeId: bestTakeId });
    }
    
    return phrases;
  }
  
  return {
    analyzeTake,
    analyzeTakes,
    suggestComp,
    autoComp,
    compareTakes,
    findBestPhrases,
  };
}
