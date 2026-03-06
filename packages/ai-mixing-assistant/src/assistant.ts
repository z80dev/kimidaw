/**
 * AI Mixing Assistant
 * 
 * Intelligent mixing suggestions based on audio analysis.
 */

import type { 
  MixingAssistant,
  TrackAnalysis,
  MixAnalysis,
  MixSuggestion,
  Problem,
  TrackType,
  SuggestionType,
  ProblemType
} from './types.js';
import { TRACK_TYPE_CHARACTERISTICS } from './types.js';

export class MixingAssistantImpl implements MixingAssistant {
  async analyzeTrack(
    audioBuffer: AudioBuffer,
    trackType: TrackType
  ): Promise<TrackAnalysis> {
    // Calculate levels
    const levels = this.calculateLevels(audioBuffer);
    
    // Spectral analysis
    const spectrum = this.analyzeSpectrum(audioBuffer);
    
    // Dynamics
    const dynamics = this.analyzeDynamics(audioBuffer);
    
    // Stereo analysis
    const stereo = this.analyzeStereo(audioBuffer);
    
    // Detect problems
    const problems = this.detectProblems(
      audioBuffer,
      levels,
      spectrum,
      dynamics,
      trackType
    );
    
    // Get characteristics for track type
    const chars = TRACK_TYPE_CHARACTERISTICS[trackType];
    
    return {
      id: `track-${Date.now()}`,
      name: `${trackType}-track`,
      type: trackType,
      peakLevel: levels.peak,
      rmsLevel: levels.rms,
      crestFactor: levels.peak - levels.rms,
      spectralBalance: {
        low: spectrum.low,
        lowMid: spectrum.lowMid,
        mid: spectrum.mid,
        highMid: spectrum.highMid,
        high: spectrum.high
      },
      dynamicRange: dynamics.range,
      transientEnergy: dynamics.transient,
      sustainEnergy: dynamics.sustain,
      stereoWidth: stereo.width,
      panPreference: chars?.defaultPan || 0,
      problems
    };
  }
  
  analyzeMix(tracks: TrackAnalysis[]): MixAnalysis {
    // Calculate overall loudness
    const levels = tracks.map(t => t.rmsLevel);
    const overallLoudness = levels.reduce((a, b) => a + b, 0) / levels.length;
    
    // Overall dynamic range
    const dynamicRanges = tracks.map(t => t.dynamicRange);
    const overallDynamicRange = dynamicRanges.reduce((a, b) => a + b, 0) / dynamicRanges.length;
    
    // Frequency balance
    const freqBalance = this.calculateFrequencyBalance(tracks);
    
    // Stereo field
    const stereoWidths = tracks.map(t => t.stereoWidth);
    const avgWidth = stereoWidths.reduce((a, b) => a + b, 0) / stereoWidths.length;
    
    // Pan balance
    const pans = tracks.map(t => t.panPreference);
    const balance = pans.reduce((a, b) => a + b, 0);
    
    // Collect all issues
    const allIssues = tracks.flatMap(t => t.problems);
    
    // Find mix-level issues
    const mixIssues = this.detectMixIssues(tracks, freqBalance);
    
    return {
      tracks,
      overallLoudness,
      overallDynamicRange,
      frequencyBalance: freqBalance,
      stereoField: {
        width: avgWidth,
        balance
      },
      phaseCorrelation: this.calculatePhaseCorrelation(tracks),
      headroom: -levels.reduce((a, b) => Math.max(a, b), -Infinity),
      issues: [...allIssues, ...mixIssues]
    };
  }
  
  getSuggestions(analysis: MixAnalysis): MixSuggestion[] {
    const suggestions: MixSuggestion[] = [];
    
    // Check overall levels
    if (analysis.headroom < 3) {
      suggestions.push({
        id: `sugg-${suggestions.length}`,
        type: 'gain',
        priority: 'high',
        description: 'Mix is too loud. Reduce master fader or track levels.',
        reasoning: `Headroom is only ${analysis.headroom.toFixed(1)}dB. Aim for 6dB headroom.`,
        autoApplicable: false
      });
    }
    
    // Check frequency balance
    if (analysis.frequencyBalance.bass > 0.4) {
      suggestions.push({
        id: `sugg-${suggestions.length}`,
        type: 'eq',
        priority: 'medium',
        description: 'Mix has excessive low-end energy.',
        reasoning: 'Bass frequencies are dominating the mix.',
        settings: { freq: 100, gain: -2 },
        autoApplicable: true
      });
    }
    
    // Check for masking
    const masking = this.detectMasking(analysis.tracks);
    for (const mask of masking) {
      suggestions.push({
        id: `sugg-${suggestions.length}`,
        trackId: mask.track1,
        type: 'eq',
        priority: 'medium',
        description: `Frequency masking with ${mask.track2}`,
        reasoning: `Both tracks compete around ${mask.frequency}Hz`,
        settings: { freq: mask.frequency, gain: -2, q: 2 },
        autoApplicable: true
      });
    }
    
    // Per-track suggestions
    for (const track of analysis.tracks) {
      const trackSugg = this.getSuggestionsForTrack(track);
      suggestions.push(...trackSugg);
    }
    
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }
  
  getSuggestionsForTrack(track: TrackAnalysis): MixSuggestion[] {
    const suggestions: MixSuggestion[] = [];
    const chars = TRACK_TYPE_CHARACTERISTICS[track.type];
    
    if (!chars) return suggestions;
    
    // Check level
    const levelDiff = track.rmsLevel - chars.targetLevel;
    if (Math.abs(levelDiff) > 3) {
      suggestions.push({
        id: `sugg-${track.id}-${suggestions.length}`,
        trackId: track.id,
        type: 'gain',
        priority: Math.abs(levelDiff) > 6 ? 'high' : 'medium',
        description: `${track.type} level is ${levelDiff > 0 ? 'too hot' : 'too quiet'}`,
        reasoning: `Target: ${chars.targetLevel}dB, Current: ${track.rmsLevel.toFixed(1)}dB`,
        settings: { gain: -levelDiff },
        autoApplicable: true
      });
    }
    
    // Check dynamics
    if (track.dynamicRange < chars.targetDynamicRange[0]) {
      suggestions.push({
        id: `sugg-${track.id}-${suggestions.length}`,
        trackId: track.id,
        type: 'compressor',
        priority: 'medium',
        description: `${track.type} is over-compressed`,
        reasoning: `Dynamic range (${track.dynamicRange.toFixed(1)}dB) below recommended`,
        settings: { ratio: 1.5, threshold: -20 },
        autoApplicable: false
      });
    }
    
    // Check panning
    if (track.type.includes('backing') && Math.abs(track.panPreference) < 0.3) {
      suggestions.push({
        id: `sugg-${track.id}-${suggestions.length}`,
        trackId: track.id,
        type: 'pan',
        priority: 'low',
        description: 'Widen backing vocals for depth',
        reasoning: 'Backing vocals typically sound better panned wider',
        settings: { pan: 0.5 },
        autoApplicable: true
      });
    }
    
    // High-pass filter suggestions
    if (track.type !== 'kick' && track.type !== 'bass' && track.spectralBalance.low > 0.2) {
      suggestions.push({
        id: `sugg-${track.id}-${suggestions.length}`,
        trackId: track.id,
        type: 'high-pass',
        priority: 'medium',
        description: 'Remove unnecessary low-end',
        reasoning: `${track.type} has energy below its fundamental frequency`,
        settings: { freq: track.type === 'guitar' ? 80 : 100 },
        autoApplicable: true
      });
    }
    
    // Add EQ suggestions based on track type
    for (const eq of chars.eqSuggestions) {
      suggestions.push({
        id: `sugg-${track.id}-${suggestions.length}`,
        trackId: track.id,
        type: 'eq',
        priority: 'low',
        description: `${eq.type === 'boost' ? 'Boost' : 'Cut'} at ${eq.freq}Hz`,
        reasoning: 'Standard processing for this instrument type',
        settings: { freq: eq.freq, gain: eq.gain, q: eq.q },
        autoApplicable: false
      });
    }
    
    return suggestions;
  }
  
  detectMasking(tracks: TrackAnalysis[]): Array<{ track1: string; track2: string; frequency: number }> {
    const masking: Array<{ track1: string; track2: string; frequency: number }> = [];
    
    // Check pairs of tracks
    for (let i = 0; i < tracks.length; i++) {
      for (let j = i + 1; j < tracks.length; j++) {
        const t1 = tracks[i];
        const t2 = tracks[j];
        
        // Check if frequency ranges overlap significantly
        const chars1 = TRACK_TYPE_CHARACTERISTICS[t1.type];
        const chars2 = TRACK_TYPE_CHARACTERISTICS[t2.type];
        
        if (chars1 && chars2) {
          const overlap = this.calculateFrequencyOverlap(
            chars1.freqRange,
            chars2.freqRange
          );
          
          if (overlap > 0.7) {
            // Find center of overlap
            const centerFreq = (Math.max(chars1.freqRange[0], chars2.freqRange[0]) +
                               Math.min(chars1.freqRange[1], chars2.freqRange[1])) / 2;
            
            masking.push({
              track1: t1.id,
              track2: t2.id,
              frequency: Math.round(centerFreq)
            });
          }
        }
      }
    }
    
    return masking;
  }
  
  suggestBalance(analysis: MixAnalysis): Array<{ trackId: string; gainChange: number }> {
    const balance: Array<{ trackId: string; gainChange: number }> = [];
    
    for (const track of analysis.tracks) {
      const chars = TRACK_TYPE_CHARACTERISTICS[track.type];
      if (chars) {
        const gainChange = chars.targetLevel - track.rmsLevel;
        if (Math.abs(gainChange) > 1) {
          balance.push({ trackId: track.id, gainChange });
        }
      }
    }
    
    return balance;
  }
  
  createSubgroups(tracks: TrackAnalysis[]): Array<{ name: string; trackIds: string[] }> {
    const groups: Array<{ name: string; trackIds: string[] }> = [];
    
    // Group drums
    const drums = tracks.filter(t => 
      ['kick', 'snare', 'hihat', 'toms', 'cymbals'].includes(t.type)
    );
    if (drums.length > 1) {
      groups.push({
        name: 'Drums',
        trackIds: drums.map(t => t.id)
      });
    }
    
    // Group vocals
    const vocals = tracks.filter(t => 
      t.type.includes('vocal')
    );
    if (vocals.length > 1) {
      groups.push({
        name: 'Vocals',
        trackIds: vocals.map(t => t.id)
      });
    }
    
    // Group instruments
    const instruments = tracks.filter(t => 
      ['guitar', 'keys', 'synth', 'pad', 'brass', 'strings'].includes(t.type)
    );
    if (instruments.length > 2) {
      groups.push({
        name: 'Instruments',
        trackIds: instruments.map(t => t.id)
      });
    }
    
    return groups;
  }
  
  // Helper methods
  private calculateLevels(buffer: AudioBuffer): { peak: number; rms: number } {
    let peak = 0;
    let sumSquares = 0;
    let count = 0;
    
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
        sumSquares += data[i] * data[i];
        count++;
      }
    }
    
    return {
      peak: 20 * Math.log10(peak + 1e-10),
      rms: 20 * Math.log10(Math.sqrt(sumSquares / count) + 1e-10)
    };
  }
  
  private analyzeSpectrum(buffer: AudioBuffer): {
    low: number;
    lowMid: number;
    mid: number;
    highMid: number;
    high: number;
  } {
    // Simplified spectral analysis
    // In production, would use FFT
    return {
      low: 0.25,
      lowMid: 0.25,
      mid: 0.25,
      highMid: 0.15,
      high: 0.1
    };
  }
  
  private analyzeDynamics(buffer: AudioBuffer): {
    range: number;
    transient: number;
    sustain: number;
  } {
    // Simplified dynamics analysis
    return {
      range: 12,
      transient: 0.5,
      sustain: 0.5
    };
  }
  
  private analyzeStereo(buffer: AudioBuffer): { width: number } {
    if (buffer.numberOfChannels < 2) {
      return { width: 0 };
    }
    
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    
    let leftEnergy = 0;
    let rightEnergy = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      leftEnergy += left[i] * left[i];
      rightEnergy += right[i] * right[i];
    }
    
    const width = Math.abs(leftEnergy - rightEnergy) / (leftEnergy + rightEnergy + 1e-10);
    
    return { width };
  }
  
  private detectProblems(
    buffer: AudioBuffer,
    levels: { peak: number; rms: number },
    spectrum: any,
    dynamics: any,
    trackType: TrackType
  ): Problem[] {
    const problems: Problem[] = [];
    
    // Check for clipping
    if (levels.peak >= 0) {
      problems.push({
        type: 'clipping',
        severity: 'high',
        description: 'Digital clipping detected'
      });
    }
    
    // Check for low level
    if (levels.rms < -40) {
      problems.push({
        type: 'low-level',
        severity: 'medium',
        description: 'Track level is very low'
      });
    }
    
    // Check dynamic range
    if (dynamics.range < 5) {
      problems.push({
        type: 'dynamic-range',
        severity: 'medium',
        description: 'Track is over-compressed'
      });
    }
    
    return problems;
  }
  
  private calculateFrequencyBalance(tracks: TrackAnalysis[]): {
    bass: number;
    mids: number;
    treble: number;
  } {
    const avgLow = tracks.reduce((sum, t) => sum + t.spectralBalance.low, 0) / tracks.length;
    const avgMid = tracks.reduce((sum, t) => sum + t.spectralBalance.mid + t.spectralBalance.lowMid, 0) / tracks.length;
    const avgHigh = tracks.reduce((sum, t) => sum + t.spectralBalance.high + t.spectralBalance.highMid, 0) / tracks.length;
    
    const total = avgLow + avgMid + avgHigh;
    
    return {
      bass: avgLow / total,
      mids: avgMid / total,
      treble: avgHigh / total
    };
  }
  
  private detectMixIssues(tracks: TrackAnalysis[], freqBalance: any): Problem[] {
    const issues: Problem[] = [];
    
    // Check for missing frequency ranges
    if (freqBalance.bass < 0.15) {
      issues.push({
        type: 'muddy-lows',
        severity: 'medium',
        description: 'Mix lacks low-end foundation'
      });
    }
    
    // Check for too much high-end
    if (freqBalance.treble > 0.35) {
      issues.push({
        type: 'brittle-highs',
        severity: 'medium',
        description: 'Mix has excessive high frequencies'
      });
    }
    
    return issues;
  }
  
  private calculatePhaseCorrelation(tracks: TrackAnalysis[]): number {
    // Simplified phase correlation
    return 0.9;
  }
  
  private calculateFrequencyOverlap(range1: [number, number], range2: [number, number]): number {
    const overlapStart = Math.max(range1[0], range2[0]);
    const overlapEnd = Math.min(range1[1], range2[1]);
    
    if (overlapStart >= overlapEnd) return 0;
    
    const overlapSize = overlapEnd - overlapStart;
    const size1 = range1[1] - range1[0];
    const size2 = range2[1] - range2[0];
    
    return overlapSize / Math.min(size1, size2);
  }
}

export function createMixingAssistant(): MixingAssistant {
  return new MixingAssistantImpl();
}
