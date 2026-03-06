/**
 * Session View Hook
 * Main state management hook for the Session View
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  Scene,
  Track,
  ClipSlot,
  Clip,
  SessionSelection,
  SessionViewState,
  DragState,
  ClipLaunchSettings,
} from '../types';
import { createDefaultLaunchSettings } from '../LaunchSystem';

export interface UseSessionViewOptions {
  initialScenes?: Scene[];
  initialTracks?: Track[];
  initialSlots?: ClipSlot[];
  initialClips?: Clip[];
  onClipLaunch?: (clipId: string, slotId: string) => void;
  onSceneLaunch?: (sceneId: string) => void;
  onStateChange?: (state: SessionViewState) => void;
}

export interface UseSessionViewReturn {
  // State
  scenes: Scene[];
  tracks: Track[];
  slots: ClipSlot[];
  clips: Map<string, Clip>;
  viewState: SessionViewState;
  
  // Scene actions
  addScene: (name?: string) => Scene;
  removeScene: (sceneId: string) => void;
  moveScene: (sceneId: string, newIndex: number) => void;
  renameScene: (sceneId: string, name: string) => void;
  setSceneColor: (sceneId: string, color: string) => void;
  launchScene: (sceneId: string) => void;
  
  // Track actions
  addTrack: (name: string, type: Track['type']) => Track;
  removeTrack: (trackId: string) => void;
  moveTrack: (trackId: string, newIndex: number) => void;
  renameTrack: (trackId: string, name: string) => void;
  setTrackColor: (trackId: string, color: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  toggleTrackArm: (trackId: string) => void;
  
  // Slot/Clip actions
  createClip: (trackId: string, sceneId: string, name: string) => Clip | null;
  deleteClip: (clipId: string) => void;
  launchClip: (slotId: string) => void;
  stopClip: (slotId: string) => void;
  setSlotState: (slotId: string, state: ClipSlot['state']) => void;
  setClipProgress: (slotId: string, progress: number) => void;
  updateClipLaunchSettings: (clipId: string, settings: Partial<ClipLaunchSettings>) => void;
  
  // Selection actions
  selectSlot: (slotId: string, multiSelect?: boolean) => void;
  selectScene: (sceneId: string, multiSelect?: boolean) => void;
  selectTrack: (trackId: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  
  // View actions
  setScrollPosition: (x: number, y: number) => void;
  setZoom: (zoomX: number, zoomY: number) => void;
  
  // Drag and drop
  startDrag: (type: DragState['sourceType'], id: string) => void;
  endDrag: () => void;
  setDropTarget: (id: string | null) => void;
}

export function useSessionView(options: UseSessionViewOptions = {}): UseSessionViewReturn {
  // Initialize state
  const [scenes, setScenes] = useState<Scene[]>(options.initialScenes ?? [
    { id: crypto.randomUUID(), index: 0, name: 'Scene 1' },
    { id: crypto.randomUUID(), index: 1, name: 'Scene 2' },
  ]);
  
  const [tracks, setTracks] = useState<Track[]>(options.initialTracks ?? [
    { id: crypto.randomUUID(), name: '1-MIDI', color: '#00BFA5', type: 'midi', index: 0, mute: false, solo: false, arm: false, cue: false, volumeDb: 0, pan: 0, output: 'Master' },
    { id: crypto.randomUUID(), name: '2-Audio', color: '#2979FF', type: 'audio', index: 1, mute: false, solo: false, arm: false, cue: false, volumeDb: 0, pan: 0, output: 'Master' },
  ]);
  
  const [slots, setSlots] = useState<ClipSlot[]>(options.initialSlots ?? []);
  const [clips, setClips] = useState<Map<string, Clip>>(() => {
    const map = new Map<string, Clip>();
    if (options.initialClips) {
      for (const clip of options.initialClips) {
        map.set(clip.id, clip);
      }
    }
    return map;
  });
  
  const [viewState, setViewState] = useState<SessionViewState>({
    trackWidth: 120,
    sceneHeight: 60,
    headerWidth: 100,
    scrollX: 0,
    scrollY: 0,
    zoomX: 1,
    zoomY: 1,
    selection: {
      clipIds: new Set(),
      slotIds: new Set(),
      sceneIds: new Set(),
      trackIds: new Set(),
    },
    dragState: {
      isDragging: false,
      sourceType: null,
      sourceId: null,
      targetId: null,
    },
    showSceneTempo: true,
    showSceneTimeSignature: false,
    clipNameDisplay: 'full',
  });
  
  // Notify parent of state changes
  useEffect(() => {
    options.onStateChange?.(viewState);
  }, [viewState, options]);
  
  // Scene actions
  const addScene = useCallback((name?: string): Scene => {
    const newScene: Scene = {
      id: crypto.randomUUID(),
      index: scenes.length,
      name: name ?? `Scene ${scenes.length + 1}`,
    };
    
    setScenes(prev => [...prev, newScene]);
    return newScene;
  }, [scenes.length]);
  
  const removeScene = useCallback((sceneId: string) => {
    setScenes(prev => prev.filter(s => s.id !== sceneId));
    setSlots(prev => prev.filter(s => s.sceneId !== sceneId));
    
    // Update indices
    setScenes(prev => prev.map((s, i) => ({ ...s, index: i })));
  }, []);
  
  const moveScene = useCallback((sceneId: string, newIndex: number) => {
    setScenes(prev => {
      const scene = prev.find(s => s.id === sceneId);
      if (!scene) return prev;
      
      const withoutScene = prev.filter(s => s.id !== sceneId);
      withoutScene.splice(newIndex, 0, scene);
      
      return withoutScene.map((s, i) => ({ ...s, index: i }));
    });
  }, []);
  
  const renameScene = useCallback((sceneId: string, name: string) => {
    setScenes(prev => prev.map(s => 
      s.id === sceneId ? { ...s, name } : s
    ));
  }, []);
  
  const setSceneColor = useCallback((sceneId: string, color: string) => {
    setScenes(prev => prev.map(s => 
      s.id === sceneId ? { ...s, color } : s
    ));
  }, []);
  
  const launchScene = useCallback((sceneId: string) => {
    // Update scene playing states
    setScenes(prev => prev.map(s => ({
      ...s,
      isPlaying: s.id === sceneId,
      isQueued: false,
    })));
    
    // Launch all clips in the scene
    const sceneSlots = slots.filter(s => s.sceneId === sceneId && s.clipId);
    for (const slot of sceneSlots) {
      setSlots(prev => prev.map(s => 
        s.id === slot.id ? { ...s, state: 'playing', progress: 0 } : s
      ));
    }
    
    options.onSceneLaunch?.(sceneId);
  }, [slots, options]);
  
  // Track actions
  const addTrack = useCallback((name: string, type: Track['type']): Track => {
    const newTrack: Track = {
      id: crypto.randomUUID(),
      name,
      color: '#666',
      type,
      index: tracks.length,
      mute: false,
      solo: false,
      arm: false,
      cue: false,
      volumeDb: 0,
      pan: 0,
      output: 'Master',
    };
    
    setTracks(prev => [...prev, newTrack]);
    
    // Create slots for all scenes
    const newSlots: ClipSlot[] = scenes.map(scene => ({
      id: crypto.randomUUID(),
      trackId: newTrack.id,
      sceneId: scene.id,
      state: 'empty',
    }));
    setSlots(prev => [...prev, ...newSlots]);
    
    return newTrack;
  }, [tracks.length, scenes]);
  
  const removeTrack = useCallback((trackId: string) => {
    setTracks(prev => prev.filter(t => t.id !== trackId));
    setSlots(prev => prev.filter(s => s.trackId !== trackId));
    
    // Remove clips associated with this track
    setClips(prev => {
      const newMap = new Map(prev);
      for (const [id, clip] of newMap) {
        if (clip.trackId === trackId) {
          newMap.delete(id);
        }
      }
      return newMap;
    });
  }, []);
  
  const moveTrack = useCallback((trackId: string, newIndex: number) => {
    setTracks(prev => {
      const track = prev.find(t => t.id === trackId);
      if (!track) return prev;
      
      const withoutTrack = prev.filter(t => t.id !== trackId);
      withoutTrack.splice(newIndex, 0, track);
      
      return withoutTrack.map((t, i) => ({ ...t, index: i }));
    });
  }, []);
  
  const renameTrack = useCallback((trackId: string, name: string) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, name } : t
    ));
  }, []);
  
  const setTrackColor = useCallback((trackId: string, color: string) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, color } : t
    ));
  }, []);
  
  const toggleTrackMute = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, mute: !t.mute } : t
    ));
  }, []);
  
  const toggleTrackSolo = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, solo: !t.solo } : t
    ));
  }, []);
  
  const toggleTrackArm = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, arm: !t.arm } : t
    ));
  }, []);
  
  // Slot/Clip actions
  const createClip = useCallback((trackId: string, sceneId: string, name: string): Clip | null => {
    const slot = slots.find(s => s.trackId === trackId && s.sceneId === sceneId);
    if (!slot) return null;
    
    const track = tracks.find(t => t.id === trackId);
    if (!track) return null;
    
    const newClip: Clip = {
      id: crypto.randomUUID(),
      name,
      color: track.color,
      type: track.type === 'audio' ? 'audio' : 'midi',
      trackId,
      startTick: 0,
      endTick: 960 * 4, // 1 bar
      launchSettings: createDefaultLaunchSettings(),
      followActions: [],
    };
    
    setClips(prev => new Map([...prev, [newClip.id, newClip]]));
    setSlots(prev => prev.map(s => 
      s.id === slot.id ? { ...s, clipId: newClip.id, state: 'stopped' } : s
    ));
    
    return newClip;
  }, [slots, tracks]);
  
  const deleteClip = useCallback((clipId: string) => {
    setClips(prev => {
      const newMap = new Map(prev);
      newMap.delete(clipId);
      return newMap;
    });
    
    setSlots(prev => prev.map(s => 
      s.clipId === clipId ? { ...s, clipId: undefined, state: 'empty' } : s
    ));
  }, []);
  
  const launchClip = useCallback((slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot?.clipId) return;
    
    setSlots(prev => prev.map(s => 
      s.id === slotId ? { ...s, state: 'playing', progress: 0 } : s
    ));
    
    options.onClipLaunch?.(slot.clipId, slotId);
  }, [slots, options]);
  
  const stopClip = useCallback((slotId: string) => {
    setSlots(prev => prev.map(s => 
      s.id === slotId ? { ...s, state: 'stopped', progress: 0 } : s
    ));
  }, []);
  
  const setSlotState = useCallback((slotId: string, state: ClipSlot['state']) => {
    setSlots(prev => prev.map(s => 
      s.id === slotId ? { ...s, state } : s
    ));
  }, []);
  
  const setClipProgress = useCallback((slotId: string, progress: number) => {
    setSlots(prev => prev.map(s => 
      s.id === slotId ? { ...s, progress } : s
    ));
  }, []);
  
  const updateClipLaunchSettings = useCallback((clipId: string, settings: Partial<ClipLaunchSettings>) => {
    setClips(prev => {
      const clip = prev.get(clipId);
      if (!clip) return prev;
      
      const newMap = new Map(prev);
      newMap.set(clipId, {
        ...clip,
        launchSettings: { ...clip.launchSettings, ...settings },
      });
      return newMap;
    });
  }, []);
  
  // Selection actions
  const selectSlot = useCallback((slotId: string, multiSelect: boolean = false) => {
    setViewState(prev => {
      const newSlotIds = new Set(prev.selection.slotIds);
      
      if (multiSelect) {
        if (newSlotIds.has(slotId)) {
          newSlotIds.delete(slotId);
        } else {
          newSlotIds.add(slotId);
        }
      } else {
        newSlotIds.clear();
        newSlotIds.add(slotId);
      }
      
      return {
        ...prev,
        selection: { ...prev.selection, slotIds: newSlotIds },
      };
    });
  }, []);
  
  const selectScene = useCallback((sceneId: string, multiSelect: boolean = false) => {
    setViewState(prev => {
      const newSceneIds = new Set(prev.selection.sceneIds);
      
      if (multiSelect) {
        if (newSceneIds.has(sceneId)) {
          newSceneIds.delete(sceneId);
        } else {
          newSceneIds.add(sceneId);
        }
      } else {
        newSceneIds.clear();
        newSceneIds.add(sceneId);
      }
      
      return {
        ...prev,
        selection: { ...prev.selection, sceneIds: newSceneIds },
      };
    });
  }, []);
  
  const selectTrack = useCallback((trackId: string, multiSelect: boolean = false) => {
    setViewState(prev => {
      const newTrackIds = new Set(prev.selection.trackIds);
      
      if (multiSelect) {
        if (newTrackIds.has(trackId)) {
          newTrackIds.delete(trackId);
        } else {
          newTrackIds.add(trackId);
        }
      } else {
        newTrackIds.clear();
        newTrackIds.add(trackId);
      }
      
      return {
        ...prev,
        selection: { ...prev.selection, trackIds: newTrackIds },
      };
    });
  }, []);
  
  const clearSelection = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      selection: {
        clipIds: new Set(),
        slotIds: new Set(),
        sceneIds: new Set(),
        trackIds: new Set(),
      },
    }));
  }, []);
  
  // View actions
  const setScrollPosition = useCallback((x: number, y: number) => {
    setViewState(prev => ({
      ...prev,
      scrollX: x,
      scrollY: y,
    }));
  }, []);
  
  const setZoom = useCallback((zoomX: number, zoomY: number) => {
    setViewState(prev => ({
      ...prev,
      zoomX,
      zoomY,
    }));
  }, []);
  
  // Drag and drop
  const startDrag = useCallback((type: DragState['sourceType'], id: string) => {
    setViewState(prev => ({
      ...prev,
      dragState: {
        isDragging: true,
        sourceType: type,
        sourceId: id,
        targetId: null,
      },
    }));
  }, []);
  
  const endDrag = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      dragState: {
        isDragging: false,
        sourceType: null,
        sourceId: null,
        targetId: null,
      },
    }));
  }, []);
  
  const setDropTarget = useCallback((id: string | null) => {
    setViewState(prev => ({
      ...prev,
      dragState: {
        ...prev.dragState,
        targetId: id,
      },
    }));
  }, []);
  
  return {
    scenes,
    tracks,
    slots,
    clips,
    viewState,
    addScene,
    removeScene,
    moveScene,
    renameScene,
    setSceneColor,
    launchScene,
    addTrack,
    removeTrack,
    moveTrack,
    renameTrack,
    setTrackColor,
    toggleTrackMute,
    toggleTrackSolo,
    toggleTrackArm,
    createClip,
    deleteClip,
    launchClip,
    stopClip,
    setSlotState,
    setClipProgress,
    updateClipLaunchSettings,
    selectSlot,
    selectScene,
    selectTrack,
    clearSelection,
    setScrollPosition,
    setZoom,
    startDrag,
    endDrag,
    setDropTarget,
  };
}

export default useSessionView;
