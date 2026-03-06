/**
 * MIDI export for sliced audio
 * Exports slices as MIDI clips and Drum Rack mappings
 */

import type { 
  AudioSlice, 
  SlicedMidiClip, 
  DrumRackPad, 
  SlicedNote,
  SliceResult 
} from './types.js';

export interface MidiExportOptions {
  startNote: number; // Starting MIDI note (default: 36/C1)
  noteDurationTicks: number; // Duration of each note in ticks
  velocity: number; // Default velocity
  ppq: number; // Pulses per quarter note
  bpm: number;
}

export interface DrumRackOptions {
  startNote: number;
  oneShot: boolean; // Play slices as one-shots
  chokeGroup: number | null;
}

export class MidiExporter {
  private options: MidiExportOptions;

  constructor(options?: Partial<MidiExportOptions>) {
    this.options = {
      startNote: 36,
      noteDurationTicks: 240, // 16th note at 960 PPQ
      velocity: 100,
      ppq: 960,
      bpm: 120,
      ...options
    };
  }

  /**
   * Export slices as a MIDI clip with notes in sequence
   */
  exportToMidiClip(
    sliceResult: SliceResult,
    options?: Partial<MidiExportOptions>
  ): SlicedMidiClip {
    const opts = { ...this.options, ...options };
    const notes: SlicedNote[] = [];
    const drumRackMapping = new Map<number, DrumRackPad>();
    
    let currentTick = 0;
    
    for (let i = 0; i < sliceResult.slices.length; i++) {
      const slice = sliceResult.slices[i];
      const midiNote = opts.startNote + i;
      
      // Create note for the slice
      notes.push({
        startTicks: currentTick,
        durationTicks: opts.noteDurationTicks,
        midiNote,
        velocity: opts.velocity
      });
      
      // Create Drum Rack pad mapping
      const pad: DrumRackPad = {
        note: midiNote,
        name: `Slice ${i + 1}`,
        slice,
        chain: {
          sampleStart: slice.startSample,
          sampleEnd: slice.endSample,
          gainDb: 0,
          pan: 0,
          tuning: 0
        }
      };
      
      drumRackMapping.set(midiNote, pad);
      
      // Advance time by slice duration
      const sliceDurationTicks = this.secondsToTicks(slice.duration, opts);
      currentTick += sliceDurationTicks;
    }

    return {
      name: `Sliced ${sliceResult.slices.length} slices`,
      notes,
      drumRackMapping
    };
  }

  /**
   * Export slices as a Drum Rack preset
   */
  exportToDrumRack(
    sliceResult: SliceResult,
    options?: Partial<DrumRackOptions>
  ): Map<number, DrumRackPad> {
    const opts: DrumRackOptions = {
      startNote: 36,
      oneShot: true,
      chokeGroup: null,
      ...options
    };
    
    const mapping = new Map<number, DrumRackPad>();
    
    for (let i = 0; i < sliceResult.slices.length; i++) {
      const slice = sliceResult.slices[i];
      const midiNote = opts.startNote + i;
      
      const pad: DrumRackPad = {
        note: midiNote,
        name: `Slice ${i + 1}`,
        slice,
        chain: {
          sampleStart: slice.startSample,
          sampleEnd: slice.endSample,
          gainDb: 0,
          pan: 0,
          tuning: 0
        }
      };
      
      mapping.set(midiNote, pad);
    }
    
    return mapping;
  }

  /**
   * Export slices as individual MIDI files
   */
  exportIndividualNotes(
    sliceResult: SliceResult,
    options?: Partial<MidiExportOptions>
  ): SlicedNote[] {
    const opts = { ...this.options, ...options };
    const notes: SlicedNote[] = [];
    
    for (let i = 0; i < sliceResult.slices.length; i++) {
      const slice = sliceResult.slices[i];
      
      notes.push({
        startTicks: 0,
        durationTicks: this.secondsToTicks(slice.duration, opts),
        midiNote: opts.startNote + i,
        velocity: opts.velocity
      });
    }
    
    return notes;
  }

  /**
   * Create a MIDI clip that retriggers slices rhythmically
   */
  exportPattern(
    sliceResult: SliceResult,
    pattern: number[], // Array of slice indices to trigger
    options?: Partial<MidiExportOptions>
  ): SlicedMidiClip {
    const opts = { ...this.options, ...options };
    const notes: SlicedNote[] = [];
    const drumRackMapping = new Map<number, DrumRackPad>();
    
    // Create drum rack mapping for all slices
    for (let i = 0; i < sliceResult.slices.length; i++) {
      const slice = sliceResult.slices[i];
      const midiNote = opts.startNote + i;
      
      const pad: DrumRackPad = {
        note: midiNote,
        name: `Slice ${i + 1}`,
        slice,
        chain: {
          sampleStart: slice.startSample,
          sampleEnd: slice.endSample,
          gainDb: 0,
          pan: 0,
          tuning: 0
        }
      };
      
      drumRackMapping.set(midiNote, pad);
    }
    
    // Create pattern
    let currentTick = 0;
    const stepSize = opts.ppq / 4; // 16th note steps
    
    for (const sliceIndex of pattern) {
      if (sliceIndex >= 0 && sliceIndex < sliceResult.slices.length) {
        const midiNote = opts.startNote + sliceIndex;
        
        notes.push({
          startTicks: currentTick,
          durationTicks: opts.noteDurationTicks,
          midiNote,
          velocity: opts.velocity
        });
      }
      
      currentTick += stepSize;
    }

    return {
      name: `Pattern ${pattern.length} steps`,
      notes,
      drumRackMapping
    };
  }

  /**
   * Export with velocity based on slice amplitude
   */
  exportWithVelocityMapping(
    sliceResult: SliceResult,
    audioData: Float32Array,
    options?: Partial<MidiExportOptions>
  ): SlicedMidiClip {
    const opts = { ...this.options, ...options };
    const notes: SlicedNote[] = [];
    const drumRackMapping = new Map<number, DrumRackPad>();
    
    let currentTick = 0;
    
    for (let i = 0; i < sliceResult.slices.length; i++) {
      const slice = sliceResult.slices[i];
      
      // Calculate RMS amplitude for this slice
      let sum = 0;
      for (let s = slice.startSample; s < slice.endSample; s++) {
        sum += audioData[s] * audioData[s];
      }
      const rms = Math.sqrt(sum / (slice.endSample - slice.startSample));
      
      // Map RMS to velocity (0-127)
      const velocity = Math.min(127, Math.floor(rms * 127 * 2));
      
      const midiNote = opts.startNote + i;
      
      notes.push({
        startTicks: currentTick,
        durationTicks: opts.noteDurationTicks,
        midiNote,
        velocity
      });
      
      const pad: DrumRackPad = {
        note: midiNote,
        name: `Slice ${i + 1}`,
        slice,
        chain: {
          sampleStart: slice.startSample,
          sampleEnd: slice.endSample,
          gainDb: 0,
          pan: 0,
          tuning: 0
        }
      };
      
      drumRackMapping.set(midiNote, pad);
      
      const sliceDurationTicks = this.secondsToTicks(slice.duration, opts);
      currentTick += sliceDurationTicks;
    }

    return {
      name: `Sliced with velocity ${sliceResult.slices.length} slices`,
      notes,
      drumRackMapping
    };
  }

  /**
   * Convert seconds to ticks
   */
  private secondsToTicks(seconds: number, options: MidiExportOptions): number {
    const beats = seconds * options.bpm / 60;
    return Math.floor(beats * options.ppq);
  }

  /**
   * Convert ticks to seconds
   */
  private ticksToSeconds(ticks: number, options: MidiExportOptions): number {
    const beats = ticks / options.ppq;
    return beats * 60 / options.bpm;
  }

  /**
   * Get default export options
   */
  getOptions(): MidiExportOptions {
    return { ...this.options };
  }

  /**
   * Set default export options
   */
  setOptions(options: Partial<MidiExportOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Create MIDI file data (Type 0)
   */
  createMidiFile(clip: SlicedMidiClip): Uint8Array {
    // This is a simplified MIDI file writer
    // In production, use a proper MIDI library
    
    const ppq = this.options.ppq;
    const chunks: number[] = [];
    
    // MIDI Header
    chunks.push(...this.stringToBytes('MThd'));
    chunks.push(...this.numberToBytes(6, 4)); // Header length
    chunks.push(...this.numberToBytes(0, 2)); // Format 0
    chunks.push(...this.numberToBytes(1, 2)); // 1 track
    chunks.push(...this.numberToBytes(ppq, 2)); // Division
    
    // MIDI Track
    const trackData: number[] = [];
    
    // Tempo
    trackData.push(0); // Delta time
    trackData.push(0xFF, 0x51, 0x03); // Meta event - tempo
    const tempo = Math.floor(60000000 / this.options.bpm);
    trackData.push((tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF);
    
    // Track name
    trackData.push(0); // Delta time
    trackData.push(0xFF, 0x03); // Meta event - track name
    trackData.push(clip.name.length);
    trackData.push(...this.stringToBytes(clip.name));
    
    // Notes
    let lastTick = 0;
    for (const note of clip.notes) {
      const deltaTick = note.startTicks - lastTick;
      trackData.push(...this.encodeVariableLength(deltaTick));
      trackData.push(0x90, note.midiNote, note.velocity); // Note on
      
      trackData.push(...this.encodeVariableLength(note.durationTicks));
      trackData.push(0x80, note.midiNote, 0); // Note off
      
      lastTick = note.startTicks + note.durationTicks;
    }
    
    // End of track
    trackData.push(0); // Delta time
    trackData.push(0xFF, 0x2F, 0x00); // End of track
    
    // Write track chunk
    chunks.push(...this.stringToBytes('MTrk'));
    chunks.push(...this.numberToBytes(trackData.length, 4));
    chunks.push(...trackData);
    
    return new Uint8Array(chunks);
  }

  /**
   * Convert string to byte array
   */
  private stringToBytes(str: string): number[] {
    return Array.from(str).map(c => c.charCodeAt(0));
  }

  /**
   * Convert number to big-endian bytes
   */
  private numberToBytes(num: number, bytes: number): number[] {
    const result: number[] = [];
    for (let i = bytes - 1; i >= 0; i--) {
      result.push((num >> (i * 8)) & 0xFF);
    }
    return result;
  }

  /**
   * Encode variable-length quantity (MIDI standard)
   */
  private encodeVariableLength(value: number): number[] {
    const result: number[] = [];
    let v = value;
    
    do {
      let byte = v & 0x7F;
      v >>= 7;
      if (result.length > 0) byte |= 0x80;
      result.unshift(byte);
    } while (v > 0);
    
    if (result.length === 0) result.push(0);
    
    return result;
  }
}
