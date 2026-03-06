/**
 * Capture MIDI - Retrospective MIDI recording
 * Always records MIDI input so you never lose a performance
 */

import type { MidiMessage, NoteOnMessage, NoteOffMessage } from './types.js';

export interface MidiCapture {
  // Buffer management
  startCapture(): void;
  stopCapture(): void;
  isCapturing(): boolean;
  
  // Recording
  recordMessage(message: MidiMessage): void;
  
  // Capture actions
  captureToClip(duration?: number): CapturedPerformance;
  captureLast(seconds: number): CapturedPerformance;
  captureBetween(startTime: number, endTime: number): CapturedPerformance;
  
  // Buffer control
  setBufferDuration(minutes: number): void;
  getBufferDuration(): number;
  clearBuffer(): void;
  
  // Takes
  getTakes(): CapturedPerformance[];
  clearTakes(): void;
  deleteTake(index: number): void;
}

export interface CapturedNote {
  note: number;
  velocity: number;
  startTime: number; // ms since capture start
  duration: number; // ms
  channel: number;
}

export interface CapturedPerformance {
  id: string;
  timestamp: number;
  duration: number; // ms
  notes: CapturedNote[];
  ccData: CapturedCC[];
  pitchBendData: CapturedPitchBend[];
}

export interface CapturedCC {
  controller: number;
  value: number;
  time: number;
  channel: number;
}

export interface CapturedPitchBend {
  value: number;
  time: number;
  channel: number;
}

export interface CaptureOptions {
  bufferDurationMinutes: number;
  onlyWhenArmed: boolean;
  captureCC: boolean;
  capturePitchBend: boolean;
  captureAftertouch: boolean;
}

export const DEFAULT_CAPTURE_OPTIONS: CaptureOptions = {
  bufferDurationMinutes: 10,
  onlyWhenArmed: true,
  captureCC: true,
  capturePitchBend: true,
  captureAftertouch: false,
};

// Maximum buffer size in milliseconds
const MAX_BUFFER_DURATION = 60 * 60 * 1000; // 1 hour

export function createMidiCapture(options: Partial<CaptureOptions> = {}): MidiCapture {
  const opts = { ...DEFAULT_CAPTURE_OPTIONS, ...options };
  
  // Circular buffer for MIDI events
  interface MidiEvent {
    message: MidiMessage;
    timestamp: number;
  }
  
  let buffer: MidiEvent[] = [];
  let isCapturingFlag = false;
  let captureStartTime = 0;
  let bufferDurationMs = opts.bufferDurationMinutes * 60 * 1000;
  
  // Track active notes for duration calculation
  const activeNotes = new Map<string, { noteOn: NoteOnMessage; startTime: number }>();
  
  // Stored takes
  const takes: CapturedPerformance[] = [];
  
  // Track if any track is armed for recording
  let isArmed = false;
  
  function startCapture(): void {
    if (isCapturingFlag) return;
    
    isCapturingFlag = true;
    captureStartTime = performance.now();
    buffer = [];
    activeNotes.clear();
  }
  
  function stopCapture(): void {
    isCapturingFlag = false;
    
    // Close any hanging notes
    const now = performance.now();
    for (const [key, active] of activeNotes) {
      buffer.push({
        message: {
          type: 'noteoff',
          channel: active.noteOn.channel,
          note: active.noteOn.note,
          velocity: 0,
        } as NoteOffMessage,
        timestamp: now,
      });
    }
    activeNotes.clear();
  }
  
  function isCapturing(): boolean {
    return isCapturingFlag;
  }
  
  function recordMessage(message: MidiMessage): void {
    if (!isCapturingFlag) return;
    if (opts.onlyWhenArmed && !isArmed) return;
    
    const now = performance.now();
    
    // Add to buffer
    buffer.push({ message, timestamp: now });
    
    // Track note on/off for duration
    if (message.type === 'noteon') {
      const noteOn = message as NoteOnMessage;
      const key = `${noteOn.channel}-${noteOn.note}`;
      activeNotes.set(key, { noteOn, startTime: now });
    } else if (message.type === 'noteoff') {
      const noteOff = message as NoteOffMessage;
      const key = `${noteOff.channel}-${noteOff.note}`;
      activeNotes.delete(key);
    }
    
    // Trim buffer if too old
    trimBuffer(now);
  }
  
  function trimBuffer(now: number): void {
    const cutoff = now - bufferDurationMs;
    const firstValidIndex = buffer.findIndex(e => e.timestamp >= cutoff);
    
    if (firstValidIndex > 0) {
      buffer = buffer.slice(firstValidIndex);
    }
  }
  
  function captureToClip(duration?: number): CapturedPerformance {
    const now = performance.now();
    const captureDuration = duration || bufferDurationMs;
    const startTime = now - captureDuration;
    
    return captureBetween(startTime, now);
  }
  
  function captureLast(seconds: number): CapturedPerformance {
    const now = performance.now();
    const startTime = now - (seconds * 1000);
    
    return captureBetween(startTime, now);
  }
  
  function captureBetween(startTime: number, endTime: number): CapturedPerformance {
    // Filter events in range
    const events = buffer.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
    
    // Convert to performance format
    const performance = convertToPerformance(events, startTime);
    
    // Store as take
    takes.push(performance);
    
    return performance;
  }
  
  function convertToPerformance(events: MidiEvent[], startTime: number): CapturedPerformance {
    const notes: CapturedNote[] = [];
    const ccData: CapturedCC[] = [];
    const pitchBendData: CapturedPitchBend[] = [];
    
    // Track note ons to match with note offs
    const pendingNotes = new Map<string, { noteOn: NoteOnMessage; startTime: number }>();
    
    for (const event of events) {
      const relativeTime = event.timestamp - startTime;
      
      switch (event.message.type) {
        case 'noteon': {
          const noteOn = event.message as NoteOnMessage;
          const key = `${noteOn.channel}-${noteOn.note}`;
          
          // If there's a pending note for this key, close it first
          if (pendingNotes.has(key)) {
            const pending = pendingNotes.get(key)!;
            notes.push({
              note: pending.noteOn.note,
              velocity: pending.noteOn.velocity,
              startTime: pending.startTime,
              duration: relativeTime - pending.startTime,
              channel: pending.noteOn.channel,
            });
          }
          
          pendingNotes.set(key, { noteOn, startTime: relativeTime });
          break;
        }
        
        case 'noteoff': {
          const noteOff = event.message as NoteOffMessage;
          const key = `${noteOff.channel}-${noteOff.note}`;
          
          const pending = pendingNotes.get(key);
          if (pending) {
            notes.push({
              note: pending.noteOn.note,
              velocity: pending.noteOn.velocity,
              startTime: pending.startTime,
              duration: relativeTime - pending.startTime,
              channel: noteOff.channel,
            });
            pendingNotes.delete(key);
          }
          break;
        }
        
        case 'cc': {
          if (opts.captureCC) {
            const cc = event.message as { controller: number; value: number; channel: number };
            ccData.push({
              controller: cc.controller,
              value: cc.value,
              time: relativeTime,
              channel: cc.channel,
            });
          }
          break;
        }
        
        case 'pitchbend': {
          if (opts.capturePitchBend) {
            const pb = event.message as { value: number; channel: number };
            pitchBendData.push({
              value: pb.value,
              time: relativeTime,
              channel: pb.channel,
            });
          }
          break;
        }
      }
    }
    
    // Close any hanging notes
    const endTime = events.length > 0 
      ? events[events.length - 1].timestamp - startTime 
      : 0;
      
    for (const [key, pending] of pendingNotes) {
      notes.push({
        note: pending.noteOn.note,
        velocity: pending.noteOn.velocity,
        startTime: pending.startTime,
        duration: endTime - pending.startTime,
        channel: pending.noteOn.channel,
      });
    }
    
    // Sort notes by start time
    notes.sort((a, b) => a.startTime - b.startTime);
    
    const totalDuration = events.length > 0
      ? events[events.length - 1].timestamp - startTime
      : 0;
    
    return {
      id: `capture-${Date.now()}`,
      timestamp: Date.now(),
      duration: totalDuration,
      notes,
      ccData,
      pitchBendData,
    };
  }
  
  function setBufferDuration(minutes: number): void {
    bufferDurationMs = Math.min(
      Math.max(1, minutes) * 60 * 1000,
      MAX_BUFFER_DURATION
    );
  }
  
  function getBufferDuration(): number {
    return bufferDurationMs / 60 / 1000; // Return in minutes
  }
  
  function clearBuffer(): void {
    buffer = [];
    activeNotes.clear();
  }
  
  function getTakes(): CapturedPerformance[] {
    return [...takes];
  }
  
  function clearTakes(): void {
    takes.length = 0;
  }
  
  function deleteTake(index: number): void {
    if (index >= 0 && index < takes.length) {
      takes.splice(index, 1);
    }
  }
  
  // Public method to set armed state
  function setArmed(armed: boolean): void {
    isArmed = armed;
  }
  
  // Attach to returned object for internal use
  (captureToClip as unknown as { setArmed: (armed: boolean) => void }).setArmed = setArmed;
  
  return {
    startCapture,
    stopCapture,
    isCapturing,
    recordMessage,
    captureToClip,
    captureLast,
    captureBetween,
    setBufferDuration,
    getBufferDuration,
    clearBuffer,
    getTakes,
    clearTakes,
    deleteTake,
  };
}

/**
 * Convert captured performance to MIDI clip data
 */
export function performanceToClipData(
  performance: CapturedPerformance,
  tempo: number
): {
  notes: Array<{ pitch: number; start: number; duration: number; velocity: number }>;
} {
  const msPerBeat = 60000 / tempo;
  
  return {
    notes: performance.notes.map(note => ({
      pitch: note.note,
      start: note.startTime / msPerBeat,
      duration: note.duration / msPerBeat,
      velocity: note.velocity,
    })),
  };
}

/**
 * Merge multiple takes into one
 */
export function mergeTakes(takes: CapturedPerformance[]): CapturedPerformance {
  const allNotes: CapturedNote[] = [];
  const allCC: CapturedCC[] = [];
  const allPB: CapturedPitchBend[] = [];
  
  let totalDuration = 0;
  
  for (const take of takes) {
    const offset = totalDuration;
    
    for (const note of take.notes) {
      allNotes.push({
        ...note,
        startTime: note.startTime + offset,
      });
    }
    
    for (const cc of take.ccData) {
      allCC.push({
        ...cc,
        time: cc.time + offset,
      });
    }
    
    for (const pb of take.pitchBendData) {
      allPB.push({
        ...pb,
        time: pb.time + offset,
      });
    }
    
    totalDuration += take.duration;
  }
  
  // Sort by time
  allNotes.sort((a, b) => a.startTime - b.startTime);
  allCC.sort((a, b) => a.time - b.time);
  allPB.sort((a, b) => a.time - b.time);
  
  return {
    id: `merged-${Date.now()}`,
    timestamp: Date.now(),
    duration: totalDuration,
    notes: allNotes,
    ccData: allCC,
    pitchBendData: allPB,
  };
}
