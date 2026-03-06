import { describe, it, expect, beforeEach } from 'vitest';
import { VoiceAllocator, createSynthVoice, createSamplerVoice } from '../voice-allocator.js';
import type { SynthVoiceState, VoiceState } from '../types.js';

describe('VoiceAllocator', () => {
  let allocator: VoiceAllocator<SynthVoiceState>;
  
  beforeEach(() => {
    allocator = new VoiceAllocator({}, createSynthVoice);
  });
  
  describe('initialization', () => {
    it('creates with specified max voices', () => {
      const alloc = new VoiceAllocator({ maxVoices: 4 }, createSynthVoice);
      expect(alloc.getVoices()).toHaveLength(4);
    });
    
    it('all voices start free', () => {
      expect(allocator.getActiveVoiceCount()).toBe(0);
      expect(allocator.getFreeVoiceCount()).toBe(8);
    });
  });
  
  describe('voice allocation', () => {
    it('allocates voice on note trigger', () => {
      const voices = allocator.triggerNote(60, 100, 0);
      
      expect(voices).toHaveLength(1);
      expect(allocator.getActiveVoiceCount()).toBe(1);
      expect(allocator.getFreeVoiceCount()).toBe(7);
    });
    
    it('allocates multiple voices for unison', () => {
      const unisonAlloc = new VoiceAllocator(
        { maxVoices: 8, unison: 4 },
        createSynthVoice
      );
      
      const voices = unisonAlloc.triggerNote(60, 100, 0);
      
      expect(voices).toHaveLength(4);
    });
    
    it('sets voice properties correctly', () => {
      allocator.triggerNote(60, 100, 5);
      
      const voice = allocator.getVoices()[0];
      expect(voice.note).toBe(60);
      expect(voice.velocity).toBe(100);
      expect(voice.channel).toBe(5);
      expect(voice.stage).toBe('attack');
    });
  });
  
  describe('voice release', () => {
    it('releases voice on note off', () => {
      allocator.triggerNote(60, 100, 0);
      
      const released = allocator.releaseNote(60);
      
      expect(released).toBe(1);
      expect(allocator.getVoices()[0].stage).toBe('release');
    });
    
    it('releases all voices', () => {
      allocator.triggerNote(60, 100, 0);
      allocator.triggerNote(64, 100, 0);
      
      allocator.releaseAll();
      
      expect(allocator.getVoices()[0].stage).toBe('release');
      expect(allocator.getVoices()[1].stage).toBe('release');
    });
  });
  
  describe('voice stealing', () => {
    it('steals oldest voice when full', () => {
      const smallAlloc = new VoiceAllocator({ maxVoices: 2 }, createSynthVoice);
      
      smallAlloc.triggerNote(60, 100, 0);
      smallAlloc.triggerNote(64, 100, 0);
      
      // Trigger third note - should steal oldest
      const stolen = smallAlloc.triggerNote(67, 100, 0);
      
      expect(stolen.length).toBeGreaterThan(0);
      expect(smallAlloc.getActiveVoiceCount()).toBe(2);
    });
    
    it('respects steal strategy', () => {
      const quietAlloc = new VoiceAllocator(
        { maxVoices: 2, stealStrategy: 'quietest' },
        createSynthVoice
      );
      
      quietAlloc.triggerNote(60, 127, 0); // High velocity
      quietAlloc.triggerNote(64, 50, 0);  // Low velocity
      
      quietAlloc.triggerNote(67, 100, 0);
      
      // Quietest (note 64) should have been stolen
      expect(quietAlloc.getVoices()[1].note).toBe(67);
    });
  });
  
  describe('legato mode', () => {
    it('reuses voice for same note in legato mode', () => {
      const legatoAlloc = new VoiceAllocator({ legato: true }, createSynthVoice);
      
      legatoAlloc.triggerNote(60, 100, 0);
      const secondTrigger = legatoAlloc.triggerNote(60, 80, 0);
      
      expect(secondTrigger).toHaveLength(1);
      expect(legatoAlloc.getActiveVoiceCount()).toBe(1);
    });
  });
  
  describe('find voice', () => {
    it('finds voice by note', () => {
      allocator.triggerNote(60, 100, 0);
      allocator.triggerNote(64, 100, 0);
      
      const voiceId = allocator.findVoiceByNote(64);
      
      expect(voiceId).toBeGreaterThanOrEqual(0);
      expect(allocator.getVoices()[voiceId].note).toBe(64);
    });
    
    it('returns -1 for non-playing note', () => {
      const voiceId = allocator.findVoiceByNote(999);
      expect(voiceId).toBe(-1);
    });
  });
  
  describe('kill voice', () => {
    it('kills voice immediately', () => {
      allocator.triggerNote(60, 100, 0);
      allocator.killVoice(0);
      
      expect(allocator.getVoices()[0].stage).toBe('idle');
      expect(allocator.getVoices()[0].note).toBe(-1);
    });
    
    it('kills all voices', () => {
      allocator.triggerNote(60, 100, 0);
      allocator.triggerNote(64, 100, 0);
      
      allocator.killAll();
      
      expect(allocator.getActiveVoiceCount()).toBe(0);
    });
  });
  
  describe('reset', () => {
    it('resets all voices to idle', () => {
      allocator.triggerNote(60, 100, 0);
      allocator.reset();
      
      expect(allocator.getActiveVoiceCount()).toBe(0);
      expect(allocator.getFreeVoiceCount()).toBe(8);
    });
  });
});

describe('createSynthVoice', () => {
  it('creates voice with default values', () => {
    const voice = createSynthVoice(0);
    
    expect(voice.id).toBe(0);
    expect(voice.note).toBe(-1);
    expect(voice.stage).toBe('idle');
    expect(voice.filterCutoff).toBe(20000);
    expect(voice.filterResonance).toBe(0.7);
  });
});

describe('createSamplerVoice', () => {
  it('creates voice with default values', () => {
    const voice = createSamplerVoice(5);
    
    expect(voice.id).toBe(5);
    expect(voice.samplePosition).toBe(0);
    expect(voice.rate).toBe(1);
  });
});
