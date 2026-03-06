/**
 * Clip Envelopes System
 * Manages automation envelopes within clips (Ableton-style)
 */

import type {
  ClipEnvelope,
  EnvelopeTarget,
  EnvelopeBreakpoint,
} from './types';

export interface EnvelopeValueAtTime {
  value: number;
  isInterpolated: boolean;
}

export interface EnvelopeSegment {
  start: EnvelopeBreakpoint;
  end: EnvelopeBreakpoint;
  curve: number; // -1 to 1, negative = exponential in, positive = exponential out
}

/**
 * Envelope System class
 * Manages clip envelope creation, editing, and interpolation
 */
export class ClipEnvelopes {
  private envelopes: Map<string, ClipEnvelope> = new Map();
  
  /**
   * Create a new envelope for a clip
   */
  createEnvelope(
    clipId: string,
    target: EnvelopeTarget,
    initialValue: number = 0
  ): ClipEnvelope {
    const envelope: ClipEnvelope = {
      id: crypto.randomUUID(),
      clipId,
      target,
      breakpoints: [
        {
          id: crypto.randomUUID(),
          time: 0,
          value: initialValue,
          curve: 'linear',
        },
      ],
      loopEnabled: false,
      unlinkFromClip: false,
    };
    
    this.envelopes.set(envelope.id, envelope);
    return envelope;
  }
  
  /**
   * Get an envelope by ID
   */
  getEnvelope(id: string): ClipEnvelope | undefined {
    return this.envelopes.get(id);
  }
  
  /**
   * Get all envelopes for a clip
   */
  getEnvelopesForClip(clipId: string): ClipEnvelope[] {
    return Array.from(this.envelopes.values()).filter(e => e.clipId === clipId);
  }
  
  /**
   * Delete an envelope
   */
  deleteEnvelope(id: string): boolean {
    return this.envelopes.delete(id);
  }
  
  /**
   * Add a breakpoint to an envelope
   */
  addBreakpoint(
    envelopeId: string,
    time: number,
    value: number,
    curve: 'step' | 'linear' | 'bezier' = 'linear'
  ): EnvelopeBreakpoint | null {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) return null;
    
    const breakpoint: EnvelopeBreakpoint = {
      id: crypto.randomUUID(),
      time,
      value,
      curve,
    };
    
    envelope.breakpoints.push(breakpoint);
    
    // Sort by time
    envelope.breakpoints.sort((a, b) => a.time - b.time);
    
    return breakpoint;
  }
  
  /**
   * Remove a breakpoint
   */
  removeBreakpoint(envelopeId: string, breakpointId: string): boolean {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) return false;
    
    const index = envelope.breakpoints.findIndex(b => b.id === breakpointId);
    if (index === -1) return false;
    
    // Don't remove the last breakpoint
    if (envelope.breakpoints.length <= 1) return false;
    
    envelope.breakpoints.splice(index, 1);
    return true;
  }
  
  /**
   * Update a breakpoint
   */
  updateBreakpoint(
    envelopeId: string,
    breakpointId: string,
    updates: Partial<Omit<EnvelopeBreakpoint, 'id'>>
  ): boolean {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) return false;
    
    const breakpoint = envelope.breakpoints.find(b => b.id === breakpointId);
    if (!breakpoint) return false;
    
    Object.assign(breakpoint, updates);
    
    // Re-sort if time changed
    if (updates.time !== undefined) {
      envelope.breakpoints.sort((a, b) => a.time - b.time);
    }
    
    return true;
  }
  
  /**
   * Get the value of an envelope at a specific time
   */
  getValueAtTime(envelopeId: string, time: number): EnvelopeValueAtTime | null {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) return null;
    
    const { breakpoints } = envelope;
    if (breakpoints.length === 0) return null;
    
    // Handle time outside range
    if (time <= breakpoints[0].time) {
      return { value: breakpoints[0].value, isInterpolated: false };
    }
    
    if (time >= breakpoints[breakpoints.length - 1].time) {
      return {
        value: breakpoints[breakpoints.length - 1].value,
        isInterpolated: false,
      };
    }
    
    // Find the segment containing this time
    for (let i = 0; i < breakpoints.length - 1; i++) {
      const start = breakpoints[i];
      const end = breakpoints[i + 1];
      
      if (time >= start.time && time <= end.time) {
        if (start.curve === 'step') {
          return { value: start.value, isInterpolated: false };
        }
        
        const t = (time - start.time) / (end.time - start.time);
        const value = this.interpolateValue(start.value, end.value, t, start.curve);
        
        return { value, isInterpolated: true };
      }
    }
    
    return { value: breakpoints[breakpoints.length - 1].value, isInterpolated: false };
  }
  
  /**
   * Interpolate between two values
   */
  private interpolateValue(
    start: number,
    end: number,
    t: number,
    curve: 'linear' | 'bezier'
  ): number {
    if (curve === 'linear') {
      return start + (end - start) * t;
    }
    
    // Bezier interpolation (simplified - could use curve control points)
    // Using ease-in-out curve
    const bezierT = t * t * (3 - 2 * t);
    return start + (end - start) * bezierT;
  }
  
  /**
   * Set envelope loop range
   */
  setLoopRange(
    envelopeId: string,
    start: number,
    end: number,
    enabled: boolean = true
  ): boolean {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) return false;
    
    envelope.loopStart = start;
    envelope.loopEnd = end;
    envelope.loopEnabled = enabled;
    
    return true;
  }
  
  /**
   * Toggle envelope unlink from clip
   */
  setUnlinkFromClip(envelopeId: string, unlink: boolean): boolean {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) return false;
    
    envelope.unlinkFromClip = unlink;
    return true;
  }
  
  /**
   * Create a volume envelope for an audio clip
   */
  createVolumeEnvelope(clipId: string, defaultValue: number = 0.8): ClipEnvelope {
    return this.createEnvelope(clipId, { type: 'volume' }, defaultValue);
  }
  
  /**
   * Create a pan envelope for an audio clip
   */
  createPanEnvelope(clipId: string, defaultValue: number = 0): ClipEnvelope {
    return this.createEnvelope(clipId, { type: 'pan' }, defaultValue);
  }
  
  /**
   * Create a transpose envelope for an audio clip
   */
  createTransposeEnvelope(clipId: string): ClipEnvelope {
    return this.createEnvelope(clipId, { type: 'transpose' }, 0);
  }
  
  /**
   * Create a MIDI CC envelope
   */
  createCCEnvelope(clipId: string, ccNumber: number, defaultValue: number = 0): ClipEnvelope {
    return this.createEnvelope(clipId, { type: 'cc', number: ccNumber }, defaultValue);
  }
  
  /**
   * Create a pitch bend envelope
   */
  createPitchBendEnvelope(clipId: string): ClipEnvelope {
    return this.createEnvelope(clipId, { type: 'pitchBend' }, 0.5); // Center = no bend
  }
  
  /**
   * Duplicate an envelope
   */
  duplicateEnvelope(envelopeId: string, newClipId?: string): ClipEnvelope | null {
    const original = this.envelopes.get(envelopeId);
    if (!original) return null;
    
    const duplicate: ClipEnvelope = {
      ...original,
      id: crypto.randomUUID(),
      clipId: newClipId ?? original.clipId,
      breakpoints: original.breakpoints.map(b => ({
        ...b,
        id: crypto.randomUUID(),
      })),
    };
    
    this.envelopes.set(duplicate.id, duplicate);
    return duplicate;
  }
  
  /**
   * Clear all breakpoints except the first
   */
  clearEnvelope(envelopeId: string): boolean {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope || envelope.breakpoints.length === 0) return false;
    
    const first = envelope.breakpoints[0];
    envelope.breakpoints = [first];
    
    return true;
  }
  
  /**
   * Get envelope as array of values (for visualization)
   */
  getEnvelopeAsArray(
    envelopeId: string,
    startTime: number,
    endTime: number,
    resolution: number = 100
  ): number[] | null {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope) return null;
    
    const values: number[] = [];
    const step = (endTime - startTime) / resolution;
    
    for (let i = 0; i <= resolution; i++) {
      const time = startTime + i * step;
      const result = this.getValueAtTime(envelopeId, time);
      values.push(result?.value ?? 0);
    }
    
    return values;
  }
  
  /**
   * Get envelope min/max values (for UI scaling)
   */
  getEnvelopeRange(envelopeId: string): { min: number; max: number } | null {
    const envelope = this.envelopes.get(envelopeId);
    if (!envelope || envelope.breakpoints.length === 0) return null;
    
    let min = envelope.breakpoints[0].value;
    let max = envelope.breakpoints[0].value;
    
    for (const bp of envelope.breakpoints) {
      min = Math.min(min, bp.value);
      max = Math.max(max, bp.value);
    }
    
    return { min, max };
  }
}

/**
 * Get target display name
 */
export function getEnvelopeTargetName(target: EnvelopeTarget): string {
  switch (target.type) {
    case 'volume': return 'Volume';
    case 'pan': return 'Pan';
    case 'transpose': return 'Transpose';
    case 'detune': return 'Detune';
    case 'cc': return `CC ${target.number}`;
    case 'pitchBend': return 'Pitch Bend';
    case 'aftertouch': return 'Aftertouch';
    case 'pluginParam': return `Plugin Param`;
    default: return 'Unknown';
  }
}

/**
 * Get default value range for an envelope target
 */
export function getEnvelopeTargetRange(target: EnvelopeTarget): { min: number; max: number } {
  switch (target.type) {
    case 'volume':
      return { min: 0, max: 1.5 }; // Allow slight boost
    case 'pan':
      return { min: -1, max: 1 };
    case 'transpose':
      return { min: -48, max: 48 }; // +/- 4 octaves
    case 'detune':
      return { min: -100, max: 100 }; // +/- 100 cents
    case 'cc':
      return { min: 0, max: 127 };
    case 'pitchBend':
      return { min: -1, max: 1 };
    case 'aftertouch':
      return { min: 0, max: 127 };
    case 'pluginParam':
      return { min: 0, max: 1 };
    default:
      return { min: 0, max: 1 };
  }
}
