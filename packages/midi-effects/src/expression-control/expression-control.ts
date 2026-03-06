/**
 * Expression Control
 * 
 * Maps MIDI expression to control parameters:
 * - Aftertouch to CC
 * - Slide (MPE CC74) to CC
 * - Velocity to CC
 * - Pitch bend to CC
 * - Custom modulation sources
 * - Smoothing and scaling
 */

import {
  BaseMidiEffect,
  createCC,
  type MidiEvent,
  type ControlChangeEvent,
} from "../types.js";

export interface ExpressionMapping {
  /** Source expression type */
  source: "aftertouch" | "poly-aftertouch" | "slide" | "velocity" | "pitch-bend" | "mod-wheel" | "expression" | "sustain";
  /** Target CC number */
  targetCC: number;
  /** Source MIDI channel (0-15, -1 = all) */
  sourceChannel: number;
  /** Target MIDI channel (0-15, -1 = same as source) */
  targetChannel: number;
  /** Minimum output value */
  minValue: number;
  /** Maximum output value */
  maxValue: number;
  /** Curve type */
  curve: "linear" | "exponential" | "logarithmic" | "s-curve";
  /** Enable smoothing */
  smoothing: boolean;
  /** Smoothing time in ms */
  smoothingTime: number;
  /** Invert output */
  invert: boolean;
}

export interface MPEZone {
  /** Lower note of zone */
  lowerNote: number;
  /** Upper note of zone */
  upperNote: number;
  /** Master channel for this zone */
  masterChannel: number;
}

export interface ExpressionControlParams {
  /** Enable expression processing */
  enabled: boolean;
  /** MPE mode enabled */
  mpeMode: boolean;
  /** MPE zones */
  mpeZones: MPEZone[];
  /** Expression mappings */
  mappings: ExpressionMapping[];
  /** Global smoothing factor */
  globalSmoothing: number;
  /** Pass through original events */
  passThrough: boolean;
}

export interface SmoothedValue {
  current: number;
  target: number;
  coefficient: number;
}

export const DEFAULT_EXPRESSION_CONTROL_PARAMS: ExpressionControlParams = {
  enabled: true,
  mpeMode: false,
  mpeZones: [],
  mappings: [],
  globalSmoothing: 5,
  passThrough: true,
};

export const DEFAULT_EXPRESSION_MAPPING: ExpressionMapping = {
  source: "aftertouch",
  targetCC: 1, // Mod wheel
  sourceChannel: -1,
  targetChannel: -1,
  minValue: 0,
  maxValue: 127,
  curve: "linear",
  smoothing: true,
  smoothingTime: 10,
  invert: false,
};

export class ExpressionControl extends BaseMidiEffect {
  readonly name = "Expression Control";
  readonly version = "1.0.0";

  private params: ExpressionControlParams = { ...DEFAULT_EXPRESSION_CONTROL_PARAMS };
  private sampleRate = 48000;
  private tempo = 120;
  
  // State tracking
  private channelAftertouch: number[] = new Array(16).fill(0);
  private polyAftertouch: Map<number, number> = new Map(); // note -> pressure
  private pitchBend: number[] = new Array(16).fill(0);
  private slide: Map<number, number> = new Map(); // note -> slide value (MPE)
  private perNotePitchBend: Map<number, number> = new Map();
  
  // Smoothed output values for each mapping
  private smoothedValues: Map<number, SmoothedValue> = new Map(); // targetCC -> value
  
  // Last output values to avoid duplicate CCs
  private lastOutputValues: Map<string, number> = new Map(); // "channel:cc" -> value

  setSampleRate(sr: number): void {
    this.sampleRate = sr;
  }

  setTempo(bpm: number): void {
    this.tempo = bpm;
  }

  protected onParameterChange(id: string, value: number | string | boolean): void {
    switch (id) {
      case "enabled":
        if (typeof value === "boolean") this.params.enabled = value;
        break;
      case "mpeMode":
        if (typeof value === "boolean") this.params.mpeMode = value;
        break;
      case "globalSmoothing":
        if (typeof value === "number") this.params.globalSmoothing = Math.max(0, Math.min(100, value));
        break;
      case "passThrough":
        if (typeof value === "boolean") this.params.passThrough = value;
        break;
    }
  }

  /**
   * Add a new expression mapping
   */
  addMapping(mapping: Partial<ExpressionMapping>): void {
    const newMapping = { ...DEFAULT_EXPRESSION_MAPPING, ...mapping };
    this.params.mappings.push(newMapping);
  }

  /**
   * Remove a mapping by index
   */
  removeMapping(index: number): void {
    if (index >= 0 && index < this.params.mappings.length) {
      this.params.mappings.splice(index, 1);
    }
  }

  /**
   * Clear all mappings
   */
  clearMappings(): void {
    this.params.mappings = [];
  }

  process(events: MidiEvent[], sampleTime: number): MidiEvent[] {
    const output: MidiEvent[] = [];

    if (!this.params.enabled) {
      return this.params.passThrough ? events : [];
    }

    // Process incoming events
    for (const event of events) {
      // Update state from events
      this.updateState(event);

      // Pass through if enabled
      if (this.params.passThrough) {
        output.push(event);
      }

      // Process MPE events
      if (this.params.mpeMode) {
        this.processMPEEvent(event, output, sampleTime);
      }
    }

    // Generate CC outputs from mappings
    for (const mapping of this.params.mappings) {
      const sourceValue = this.getSourceValue(mapping.source, mapping.sourceChannel);
      if (sourceValue !== null) {
        const ccEvent = this.createCCFromMapping(mapping, sourceValue, sampleTime);
        if (ccEvent) {
          output.push(ccEvent);
        }
      }
    }

    return output;
  }

  private updateState(event: MidiEvent): void {
    switch (event.type) {
      case "channel-aftertouch":
        this.channelAftertouch[event.channel] = event.pressure ?? 0;
        break;
        
      case "poly-aftertouch": {
        const note = (event as { type: "poly-aftertouch"; note: number; pressure: number }).note;
        const pressure = (event as { type: "poly-aftertouch"; note: number; pressure: number }).pressure;
        this.polyAftertouch.set(note, pressure);
        break;
      }
        
      case "pitch-bend":
        // Map -8192 to 8191 to 0-127 range for CC
        const bendValue = (event as { type: "pitch-bend"; value: number }).value;
        this.pitchBend[event.channel] = (bendValue + 8192) / 16383 * 127;
        break;
        
      case "control-change": {
        const ccEvent = event as unknown as ControlChangeEvent;
        // Track slide (CC74) in MPE mode
        if (ccEvent.controller === 74) {
          // In MPE, CC74 on per-note channels is slide for that note
          if (this.params.mpeMode) {
            // Find which note is active on this channel
            // For now, use channel as note indicator (simplified)
            this.slide.set(event.channel, ccEvent.value);
          }
        }
        // Track mod wheel
        if (ccEvent.controller === 1) {
          // Store for reference if needed
        }
        break;
      }
        
      case "note-off": {
        const note = (event as { type: "note-off"; note: number }).note;
        this.polyAftertouch.delete(note);
        this.slide.delete(note);
        this.perNotePitchBend.delete(note);
        break;
      }
    }
  }

  private processMPEEvent(event: MidiEvent, output: MidiEvent[], sampleTime: number): void {
    // Convert MPE events to appropriate format if needed
    if (event.type === "control-change") {
      const ccEvent = event as unknown as ControlChangeEvent;
      if (ccEvent.controller === 74) {
        // Slide control - could be converted to a different CC
        // This is handled by mappings
      }
    }
  }

  private getSourceValue(source: ExpressionMapping["source"], channel: number): number | null {
    switch (source) {
      case "aftertouch":
        if (channel === -1) {
          // Return maximum across all channels
          return Math.max(...this.channelAftertouch);
        }
        return this.channelAftertouch[channel] ?? 0;
        
      case "poly-aftertouch":
        // Return average of all poly-aftertouch values
        if (this.polyAftertouch.size === 0) return 0;
        let sum = 0;
        for (const value of this.polyAftertouch.values()) {
          sum += value;
        }
        return sum / this.polyAftertouch.size;
        
      case "slide":
        // Return average slide value
        if (this.slide.size === 0) return 0;
        let slideSum = 0;
        for (const value of this.slide.values()) {
          slideSum += value;
        }
        return slideSum / this.slide.size;
        
      case "pitch-bend":
        if (channel === -1) {
          return Math.max(...this.pitchBend);
        }
        return this.pitchBend[channel] ?? 64; // Center
        
      case "mod-wheel":
        // Would need to track mod wheel state
        return null;
        
      case "velocity":
        // Velocity is note-specific, return null for continuous mapping
        return null;
        
      case "expression":
        // CC11
        return null;
        
      case "sustain":
        // CC64
        return null;
        
      default:
        return null;
    }
  }

  private createCCFromMapping(
    mapping: ExpressionMapping,
    sourceValue: number,
    sampleTime: number
  ): MidiEvent | null {
    // Apply curve
    let normalizedValue = sourceValue / 127;
    
    switch (mapping.curve) {
      case "exponential":
        normalizedValue = normalizedValue * normalizedValue;
        break;
      case "logarithmic":
        normalizedValue = Math.sqrt(normalizedValue);
        break;
      case "s-curve":
        // Sigmoid curve
        normalizedValue = 1 / (1 + Math.exp(-6 * (normalizedValue - 0.5)));
        break;
      case "linear":
      default:
        // No change
        break;
    }
    
    // Apply inversion
    if (mapping.invert) {
      normalizedValue = 1 - normalizedValue;
    }
    
    // Map to output range
    let outputValue = mapping.minValue + normalizedValue * (mapping.maxValue - mapping.minValue);
    outputValue = Math.max(0, Math.min(127, Math.round(outputValue)));

    // Apply smoothing
    const smoothedKey = `${mapping.targetChannel}:${mapping.targetCC}`;
    let smoothed = this.smoothedValues.get(mapping.targetCC);
    
    if (!smoothed) {
      smoothed = {
        current: outputValue,
        target: outputValue,
        coefficient: mapping.smoothing ? this.calculateSmoothingCoeff(mapping.smoothingTime) : 1,
      };
      this.smoothedValues.set(mapping.targetCC, smoothed);
    }
    
    smoothed.target = outputValue;
    
    if (mapping.smoothing) {
      smoothed.current += (smoothed.target - smoothed.current) * smoothed.coefficient;
      outputValue = Math.round(smoothed.current);
    } else {
      smoothed.current = outputValue;
    }

    // Skip if value hasn't changed significantly
    const lastKey = `${mapping.targetChannel === -1 ? 0 : mapping.targetChannel}:${mapping.targetCC}`;
    const lastValue = this.lastOutputValues.get(lastKey);
    if (lastValue !== undefined && Math.abs(lastValue - outputValue) < 1) {
      return null;
    }
    
    this.lastOutputValues.set(lastKey, outputValue);

    // Create CC event
    const targetChannel = mapping.targetChannel === -1 ? 0 : mapping.targetChannel;
    
    return createCC(mapping.targetCC, outputValue, targetChannel, Math.floor(sampleTime));
  }

  private calculateSmoothingCoeff(timeMs: number): number {
    // Calculate smoothing coefficient from time constant
    const samples = timeMs * this.sampleRate / 1000;
    return 1 - Math.exp(-1 / Math.max(1, samples));
  }

  saveState(): Record<string, unknown> {
    return {
      params: { ...this.params },
      channelAftertouch: [...this.channelAftertouch],
      pitchBend: [...this.pitchBend],
    };
  }

  loadState(state: Record<string, unknown>): void {
    if (state.params && typeof state.params === "object") {
      this.params = { ...this.params, ...(state.params as Partial<ExpressionControlParams>) };
    }
    if (state.channelAftertouch && Array.isArray(state.channelAftertouch)) {
      this.channelAftertouch = state.channelAftertouch as number[];
    }
    if (state.pitchBend && Array.isArray(state.pitchBend)) {
      this.pitchBend = state.pitchBend as number[];
    }
  }

  reset(): void {
    super.reset();
    this.params = { ...DEFAULT_EXPRESSION_CONTROL_PARAMS };
    this.channelAftertouch.fill(0);
    this.polyAftertouch.clear();
    this.pitchBend.fill(0);
    this.slide.clear();
    this.perNotePitchBend.clear();
    this.smoothedValues.clear();
    this.lastOutputValues.clear();
  }
}
