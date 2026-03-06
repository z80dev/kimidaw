/**
 * Voice Allocator
 * 
 * Manages polyphonic voice allocation with support for:
 * - Polyphonic voice stealing (oldest first)
 * - Monophonic modes (mono, legato)
 * - Portamento/glide
 */

import { CollisionVoice } from './voice.js';
import type { CollisionState, NoteEvent, ControlEvent } from '../types/index.js';

export class VoiceAllocator {
  private voices: CollisionVoice[] = [];
  private sampleRate: number;
  private state: CollisionState;
  
  // Voice tracking
  private noteToVoice: Map<number, number> = new Map(); // note -> voiceId
  private voiceOrder: number[] = []; // Ordered by trigger time (oldest first)
  
  // Mono/legato state
  private currentMonoNote: number = -1;
  private heldNotes: number[] = []; // For mono/legato tracking
  
  constructor(numVoices: number, sampleRate: number, initialState: CollisionState) {
    this.sampleRate = sampleRate;
    this.state = initialState;
    
    for (let i = 0; i < numVoices; i++) {
      this.voices.push(new CollisionVoice(i, sampleRate, initialState));
      this.voiceOrder.push(i);
    }
  }
  
  updateState(state: CollisionState): void {
    this.state = state;
    for (const voice of this.voices) {
      voice.updateParameters(state);
    }
  }
  
  processNoteEvent(event: NoteEvent): void {
    if (event.type === 'note-on') {
      this.triggerNote(event.note, event.velocity);
    } else {
      this.releaseNote(event.note);
    }
  }
  
  processControlEvent(event: ControlEvent): void {
    // Send to all active voices
    for (const voice of this.voices) {
      if (voice.isPlaying()) {
        voice.handleControl(event);
      }
    }
  }
  
  private triggerNote(note: number, velocity: number): void {
    const voiceMode = this.state.global.voiceMode;
    
    if (voiceMode === 'mono' || voiceMode === 'legato') {
      this.triggerMono(note, velocity, voiceMode === 'legato');
    } else {
      this.triggerPoly(note, velocity);
    }
  }
  
  private triggerPoly(note: number, velocity: number): void {
    // Check if note is already playing (retrigger)
    const existingVoice = this.noteToVoice.get(note);
    if (existingVoice !== undefined) {
      const voice = this.voices[existingVoice];
      voice.triggerNote({ type: 'note-on', note, velocity, sampleOffset: 0 });
      this.moveToFront(existingVoice);
      return;
    }
    
    // Find an available voice
    let voiceId = this.findFreeVoice();
    
    // If no free voice, steal the oldest
    if (voiceId === -1) {
      voiceId = this.stealVoice();
    }
    
    // Trigger the voice
    const voice = this.voices[voiceId];
    voice.triggerNote({ type: 'note-on', note, velocity, sampleOffset: 0 });
    
    // Update tracking
    this.noteToVoice.set(note, voiceId);
    this.moveToFront(voiceId);
  }
  
  private triggerMono(note: number, velocity: number, legato: boolean): void {
    this.heldNotes.push(note);
    
    if (this.currentMonoNote === -1 || !legato) {
      // First note or non-legato: trigger new voice
      const voiceId = 0; // Always use voice 0 in mono mode
      const voice = this.voices[voiceId];
      voice.triggerNote({ type: 'note-on', note, velocity, sampleOffset: 0 });
      this.currentMonoNote = note;
    }
    // In legato mode with existing note, just update pitch without retrigger
  }
  
  private releaseNote(note: number): void {
    const voiceMode = this.state.global.voiceMode;
    
    if (voiceMode === 'mono' || voiceMode === 'legato') {
      this.releaseMono(note);
    } else {
      this.releasePoly(note);
    }
  }
  
  private releasePoly(note: number): void {
    const voiceId = this.noteToVoice.get(note);
    if (voiceId !== undefined) {
      this.voices[voiceId].releaseNote();
      this.noteToVoice.delete(note);
    }
  }
  
  private releaseMono(note: number): void {
    // Remove from held notes
    const index = this.heldNotes.indexOf(note);
    if (index > -1) {
      this.heldNotes.splice(index, 1);
    }
    
    if (this.currentMonoNote === note) {
      if (this.heldNotes.length > 0) {
        // Other notes still held: retrigger to highest/lowest depending on policy
        const newNote = this.heldNotes[this.heldNotes.length - 1]; // Highest note
        const voice = this.voices[0];
        
        if (this.state.global.voiceMode === 'legato') {
          // In legato, just change pitch without envelope retrigger
          // For now, we retrigger
          voice.triggerNote({ type: 'note-on', note: newNote, velocity: 100, sampleOffset: 0 });
        } else {
          voice.releaseNote();
        }
        this.currentMonoNote = newNote;
      } else {
        // No notes held: release
        this.voices[0].releaseNote();
        this.currentMonoNote = -1;
      }
    }
  }
  
  private findFreeVoice(): number {
    for (let i = 0; i < this.voices.length; i++) {
      if (!this.voices[i].isPlaying()) {
        return i;
      }
    }
    return -1;
  }
  
  private stealVoice(): number {
    // Return the oldest voice (first in voiceOrder)
    const stolenVoice = this.voiceOrder[0];
    
    // Remove the note mapping for the stolen voice
    for (const [note, voiceId] of this.noteToVoice.entries()) {
      if (voiceId === stolenVoice) {
        this.noteToVoice.delete(note);
        break;
      }
    }
    
    return stolenVoice;
  }
  
  private moveToFront(voiceId: number): void {
    // Move voice to end of order (most recently used)
    const index = this.voiceOrder.indexOf(voiceId);
    if (index > -1) {
      this.voiceOrder.splice(index, 1);
    }
    this.voiceOrder.push(voiceId);
  }
  
  process(outputL: Float32Array, outputR: Float32Array, numSamples: number): void {
    // Clear output buffers
    outputL.fill(0);
    outputR.fill(0);
    
    // Process all active voices
    for (const voice of this.voices) {
      if (voice.isPlaying()) {
        voice.process(outputL, outputR, numSamples);
      }
    }
    
    // Soft clipping to prevent harsh distortion
    for (let i = 0; i < numSamples; i++) {
      outputL[i] = this.softClip(outputL[i]);
      outputR[i] = this.softClip(outputR[i]);
    }
  }
  
  private softClip(x: number): number {
    // Soft saturation: x / (1 + |x|) with some gain
    const gain = 1.5;
    const saturated = x * gain;
    return saturated / (1 + Math.abs(saturated));
  }
  
  getActiveVoiceCount(): number {
    return this.voices.filter(v => v.isPlaying()).length;
  }
  
  reset(): void {
    for (const voice of this.voices) {
      voice.reset();
    }
    this.noteToVoice.clear();
    this.voiceOrder = Array.from({ length: this.voices.length }, (_, i) => i);
    this.currentMonoNote = -1;
    this.heldNotes = [];
  }
}
