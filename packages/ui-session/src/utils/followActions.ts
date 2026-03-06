/**
 * Follow Actions Logic
 * Implements Ableton-style clip sequencing behavior
 */

import type { 
  FollowActionType, 
  FollowAction, 
  Clip,
  Scene,
  ClipSlot 
} from '../types';

export interface FollowActionContext {
  currentClipId: string;
  currentSlotId: string;
  currentSceneId: string;
  clipsInTrack: Clip[];
  slotsInScene: ClipSlot[];
  allScenes: Scene[];
  currentSceneIndex: number;
  randomSeed?: number;
}

export interface FollowActionResult {
  action: FollowActionType;
  targetClipId?: string;
  targetSlotId?: string;
  targetSceneId?: string;
  shouldStop: boolean;
}

/**
 * Select a follow action based on chance probabilities
 */
export function selectFollowAction(
  followAction: FollowAction,
  randomValue: number = Math.random()
): { type: FollowActionType; fromA: boolean } {
  const totalChance = followAction.chanceA + followAction.chanceB;
  
  if (totalChance === 0) {
    return { type: 'noAction', fromA: true };
  }
  
  const normalizedRandom = randomValue * totalChance;
  
  if (normalizedRandom <= followAction.chanceA) {
    return { type: followAction.actionA, fromA: true };
  } else {
    return { type: followAction.actionB, fromA: false };
  }
}

/**
 * Resolve a follow action to a specific target
 */
export function resolveFollowAction(
  actionType: FollowActionType,
  context: FollowActionContext,
  excludeCurrent: boolean = true
): FollowActionResult {
  const result: FollowActionResult = {
    action: actionType,
    shouldStop: false,
  };
  
  switch (actionType) {
    case 'noAction':
      break;
      
    case 'stop':
      result.shouldStop = true;
      break;
      
    case 'playAgain':
      result.targetClipId = context.currentClipId;
      result.targetSlotId = context.currentSlotId;
      break;
      
    case 'playPrevious':
      {
        const currentIndex = context.clipsInTrack.findIndex(c => c.id === context.currentClipId);
        if (currentIndex > 0) {
          const prevClip = context.clipsInTrack[currentIndex - 1];
          result.targetClipId = prevClip.id;
          // Find the slot for this clip in the same scene
          const prevSlot = context.slotsInScene.find(s => s.clipId === prevClip.id);
          if (prevSlot) {
            result.targetSlotId = prevSlot.id;
          }
        }
      }
      break;
      
    case 'playNext':
      {
        const currentIndex = context.clipsInTrack.findIndex(c => c.id === context.currentClipId);
        if (currentIndex >= 0 && currentIndex < context.clipsInTrack.length - 1) {
          const nextClip = context.clipsInTrack[currentIndex + 1];
          result.targetClipId = nextClip.id;
          const nextSlot = context.slotsInScene.find(s => s.clipId === nextClip.id);
          if (nextSlot) {
            result.targetSlotId = nextSlot.id;
          }
        }
      }
      break;
      
    case 'playFirst':
      if (context.clipsInTrack.length > 0) {
        const firstClip = context.clipsInTrack[0];
        result.targetClipId = firstClip.id;
        const firstSlot = context.slotsInScene.find(s => s.clipId === firstClip.id);
        if (firstSlot) {
          result.targetSlotId = firstSlot.id;
        }
      }
      break;
      
    case 'playLast':
      if (context.clipsInTrack.length > 0) {
        const lastClip = context.clipsInTrack[context.clipsInTrack.length - 1];
        result.targetClipId = lastClip.id;
        const lastSlot = context.slotsInScene.find(s => s.clipId === lastClip.id);
        if (lastSlot) {
          result.targetSlotId = lastSlot.id;
        }
      }
      break;
      
    case 'playAny':
      {
        const candidates = excludeCurrent 
          ? context.clipsInTrack.filter(c => c.id !== context.currentClipId)
          : context.clipsInTrack;
        
        if (candidates.length > 0) {
          const randomClip = candidates[Math.floor(Math.random() * candidates.length)];
          result.targetClipId = randomClip.id;
          const randomSlot = context.slotsInScene.find(s => s.clipId === randomClip.id);
          if (randomSlot) {
            result.targetSlotId = randomSlot.id;
          }
        }
      }
      break;
      
    case 'playOther':
      {
        const others = context.clipsInTrack.filter(c => c.id !== context.currentClipId);
        if (others.length > 0) {
          const otherClip = others[Math.floor(Math.random() * others.length)];
          result.targetClipId = otherClip.id;
          const otherSlot = context.slotsInScene.find(s => s.clipId === otherClip.id);
          if (otherSlot) {
            result.targetSlotId = otherSlot.id;
          }
        }
      }
      break;
      
    case 'playRandom':
      {
        const clipsWithSlots = context.clipsInTrack.filter(c => 
          context.slotsInScene.some(s => s.clipId === c.id)
        );
        if (clipsWithSlots.length > 0) {
          const randomClip = clipsWithSlots[Math.floor(Math.random() * clipsWithSlots.length)];
          result.targetClipId = randomClip.id;
          const randomSlot = context.slotsInScene.find(s => s.clipId === randomClip.id);
          if (randomSlot) {
            result.targetSlotId = randomSlot.id;
          }
        }
      }
      break;
      
    case 'playRandomOther':
      {
        const otherClips = context.clipsInTrack.filter(c => 
          c.id !== context.currentClipId &&
          context.slotsInScene.some(s => s.clipId === c.id)
        );
        if (otherClips.length > 0) {
          const randomClip = otherClips[Math.floor(Math.random() * otherClips.length)];
          result.targetClipId = randomClip.id;
          const randomSlot = context.slotsInScene.find(s => s.clipId === randomClip.id);
          if (randomSlot) {
            result.targetSlotId = randomSlot.id;
          }
        }
      }
      break;
  }
  
  return result;
}

/**
 * Calculate the follow time in ticks
 */
export function calculateFollowTimeTicks(
  followAction: FollowAction,
  ppq: number = 960
): number {
  const bars = followAction.followTimeBars;
  const beats = followAction.followTimeBeats;
  const sixteenths = followAction.followTimeSixteenths;
  
  return (
    bars * ppq * 4 +
    beats * ppq +
    sixteenths * (ppq / 4)
  );
}

/**
 * Check if follow action should trigger based on clip position
 */
export function shouldTriggerFollowAction(
  clipPosition: number, // Current position within clip in ticks
  clipLength: number,   // Total clip length in ticks
  followAction: FollowAction,
  ppq: number = 960
): boolean {
  const followTime = calculateFollowTimeTicks(followAction, ppq);
  
  // If follow time is 0, trigger at end of clip
  if (followTime === 0) {
    return clipPosition >= clipLength - ppq / 4; // Within last 16th note
  }
  
  // Trigger when we've reached the follow time
  return clipPosition >= followTime && clipPosition < followTime + ppq / 4;
}

/**
 * Create a default follow action
 */
export function createDefaultFollowAction(): FollowAction {
  return {
    id: crypto.randomUUID(),
    actionA: 'noAction',
    chanceA: 100,
    actionB: 'noAction',
    chanceB: 0,
    linked: false,
    followTimeBars: 0,
    followTimeBeats: 0,
    followTimeSixteenths: 0,
  };
}

/**
 * Format follow time for display
 */
export function formatFollowTime(fa: FollowAction): string {
  const parts: string[] = [];
  
  if (fa.followTimeBars > 0) {
    parts.push(`${fa.followTimeBars} bar${fa.followTimeBars !== 1 ? 's' : ''}`);
  }
  if (fa.followTimeBeats > 0) {
    parts.push(`${fa.followTimeBeats} beat${fa.followTimeBeats !== 1 ? 's' : ''}`);
  }
  if (fa.followTimeSixteenths > 0) {
    parts.push(`${fa.followTimeSixteenths} 16th${fa.followTimeSixteenths !== 1 ? 's' : ''}`);
  }
  
  return parts.length > 0 ? parts.join(' ') : 'End';
}
