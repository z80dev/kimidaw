/**
 * Session Grid Component
 * Main grid view with tracks (columns) and scenes (rows)
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import type { 
  Scene, 
  Track, 
  ClipSlot, 
  Clip,
  SessionSelection,
  SessionViewState 
} from '../types';

export interface SessionGridProps {
  scenes: Scene[];
  tracks: Track[];
  slots: ClipSlot[];
  clips: Map<string, Clip>;
  viewState: SessionViewState;
  isPlaying?: boolean;
  currentTick?: number;
  onSlotClick?: (slot: ClipSlot, event: React.MouseEvent) => void;
  onSlotDoubleClick?: (slot: ClipSlot, event: React.MouseEvent) => void;
  onSlotContextMenu?: (slot: ClipSlot, event: React.MouseEvent) => void;
  onSceneClick?: (scene: Scene, event: React.MouseEvent) => void;
  onSceneDoubleClick?: (scene: Scene, event: React.MouseEvent) => void;
  onTrackClick?: (track: Track, event: React.MouseEvent) => void;
  onTrackDoubleClick?: (track: Track, event: React.MouseEvent) => void;
  onSelectionChange?: (selection: SessionSelection) => void;
  onViewStateChange?: (viewState: Partial<SessionViewState>) => void;
  onDragStart?: (type: 'clip' | 'slot' | 'scene', id: string) => void;
  onDragOver?: (slotId: string) => void;
  onDrop?: (slotId: string) => void;
  className?: string;
}

// Canvas rendering constants
const SLOT_WIDTH = 120;
const SLOT_HEIGHT = 60;
const TRACK_HEADER_WIDTH = 100;
const SCENE_HEADER_WIDTH = 80;
const SCENE_HEADER_HEIGHT = 30;
const GRID_GAP = 2;

export const SessionGrid: React.FC<SessionGridProps> = ({
  scenes,
  tracks,
  slots,
  clips,
  viewState,
  isPlaying = false,
  currentTick = 0,
  onSlotClick,
  onSlotDoubleClick,
  onSlotContextMenu,
  onSceneClick,
  onSceneDoubleClick,
  onTrackClick,
  onTrackDoubleClick,
  onSelectionChange,
  onViewStateChange,
  onDragStart,
  onDragOver,
  onDrop,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Create slot lookup for efficient rendering
  const slotMap = useMemo(() => {
    const map = new Map<string, ClipSlot>();
    for (const slot of slots) {
      const key = `${slot.trackId}-${slot.sceneId}`;
      map.set(key, slot);
    }
    return map;
  }, [slots]);
  
  // Get slot at position
  const getSlotAtPosition = useCallback((x: number, y: number): { slot: ClipSlot | null; trackIndex: number; sceneIndex: number } => {
    const adjustedX = x - TRACK_HEADER_WIDTH + viewState.scrollX;
    const adjustedY = y - SCENE_HEADER_HEIGHT + viewState.scrollY;
    
    const trackIndex = Math.floor(adjustedX / (SLOT_WIDTH + GRID_GAP));
    const sceneIndex = Math.floor(adjustedY / (SLOT_HEIGHT + GRID_GAP));
    
    if (trackIndex < 0 || trackIndex >= tracks.length || sceneIndex < 0 || sceneIndex >= scenes.length) {
      return { slot: null, trackIndex: -1, sceneIndex: -1 };
    }
    
    const track = tracks[trackIndex];
    const scene = scenes[sceneIndex];
    const key = `${track.id}-${scene.id}`;
    const slot = slotMap.get(key) || null;
    
    return { slot, trackIndex, sceneIndex };
  }, [tracks, scenes, slotMap, viewState.scrollX, viewState.scrollY]);
  
  // Render the grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Calculate canvas size
    const totalWidth = TRACK_HEADER_WIDTH + tracks.length * (SLOT_WIDTH + GRID_GAP) + SCENE_HEADER_WIDTH;
    const totalHeight = SCENE_HEADER_HEIGHT + scenes.length * (SLOT_HEIGHT + GRID_GAP);
    
    // Set canvas size with DPR for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${totalHeight}px`;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, totalWidth, totalHeight);
    
    // Apply scroll
    ctx.save();
    ctx.translate(-viewState.scrollX, -viewState.scrollY);
    
    // Draw track headers (fixed horizontally)
    ctx.save();
    ctx.translate(viewState.scrollX, 0);
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const x = TRACK_HEADER_WIDTH + i * (SLOT_WIDTH + GRID_GAP);
      
      // Track header background
      ctx.fillStyle = track.color || '#444';
      ctx.fillRect(x, 0, SLOT_WIDTH, SCENE_HEADER_HEIGHT);
      
      // Track name
      ctx.fillStyle = '#fff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(track.name.substring(0, 15), x + SLOT_WIDTH / 2, SCENE_HEADER_HEIGHT / 2);
      
      // Mute/Solo indicators
      if (track.mute) {
        ctx.fillStyle = '#ff9800';
        ctx.fillRect(x + 4, 4, 8, 8);
      }
      if (track.solo) {
        ctx.fillStyle = '#00e676';
        ctx.fillRect(x + 16, 4, 8, 8);
      }
      if (track.arm) {
        ctx.fillStyle = '#f44336';
        ctx.fillRect(x + 28, 4, 8, 8);
      }
    }
    ctx.restore();
    
    // Draw scene headers (fixed vertically)
    ctx.save();
    ctx.translate(0, viewState.scrollY);
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const y = SCENE_HEADER_HEIGHT + i * (SLOT_HEIGHT + GRID_GAP);
      
      // Scene header background
      ctx.fillStyle = scene.isPlaying ? '#00e676' : scene.isQueued ? '#ff9800' : '#333';
      ctx.fillRect(0, y, TRACK_HEADER_WIDTH, SLOT_HEIGHT);
      
      // Scene name
      ctx.fillStyle = scene.isPlaying || scene.isQueued ? '#000' : '#fff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(scene.name.substring(0, 12), TRACK_HEADER_WIDTH / 2, y + SLOT_HEIGHT / 2);
      
      // Scene number
      ctx.fillStyle = scene.isPlaying || scene.isQueued ? '#000' : '#888';
      ctx.font = '9px sans-serif';
      ctx.fillText(`${i + 1}`, 12, y + SLOT_HEIGHT / 2);
      
      // Tempo override indicator
      if (scene.tempo) {
        ctx.fillStyle = scene.isPlaying || scene.isQueued ? '#000' : '#0af';
        ctx.font = '8px sans-serif';
        ctx.fillText(`${Math.round(scene.tempo)} BPM`, TRACK_HEADER_WIDTH / 2, y + SLOT_HEIGHT - 8);
      }
    }
    ctx.restore();
    
    // Draw clip slots grid
    for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
      const scene = scenes[sceneIdx];
      const y = SCENE_HEADER_HEIGHT + sceneIdx * (SLOT_HEIGHT + GRID_GAP);
      
      for (let trackIdx = 0; trackIdx < tracks.length; trackIdx++) {
        const track = tracks[trackIdx];
        const x = TRACK_HEADER_WIDTH + trackIdx * (SLOT_WIDTH + GRID_GAP);
        
        const key = `${track.id}-${scene.id}`;
        const slot = slotMap.get(key);
        const clip = slot?.clipId ? clips.get(slot.clipId) : null;
        
        // Slot background
        if (slot?.state === 'playing') {
          // Playing clip - pulse effect
          const pulse = isPlaying ? Math.sin(currentTick / 480 * Math.PI) * 0.3 + 0.7 : 1;
          ctx.fillStyle = clip?.color 
            ? adjustBrightness(clip.color, pulse)
            : `rgba(0, 230, 118, ${pulse})`;
        } else if (slot?.state === 'queued') {
          // Queued clip
          ctx.fillStyle = '#ff9800';
        } else if (slot?.state === 'recording') {
          // Recording clip
          const blink = Math.floor(performance.now() / 500) % 2 === 0;
          ctx.fillStyle = blink ? '#f44336' : '#b71c1c';
        } else if (clip) {
          // Has clip - stopped
          ctx.fillStyle = clip.color || '#666';
        } else {
          // Empty slot
          ctx.fillStyle = '#2a2a2a';
        }
        
        // Draw slot
        ctx.fillRect(x, y, SLOT_WIDTH, SLOT_HEIGHT);
        
        // Selection highlight
        if (slot && viewState.selection.slotIds.has(slot.id)) {
          ctx.strokeStyle = '#00b0ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, SLOT_WIDTH - 2, SLOT_HEIGHT - 2);
        }
        
        // Clip name
        if (clip && viewState.clipNameDisplay !== 'none') {
          ctx.fillStyle = slot?.state === 'playing' || slot?.state === 'queued' ? '#000' : '#fff';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          const name = viewState.clipNameDisplay === 'truncated' 
            ? clip.name.substring(0, 12) + (clip.name.length > 12 ? '...' : '')
            : clip.name;
          ctx.fillText(name, x + 4, y + 4);
        }
        
        // Progress indicator for playing clips
        if (slot?.state === 'playing' && slot.progress !== undefined) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fillRect(x, y + SLOT_HEIGHT - 4, SLOT_WIDTH * slot.progress, 4);
        }
        
        // Loop indicator
        if (clip?.loop?.enabled) {
          ctx.fillStyle = '#0af';
          ctx.beginPath();
          ctx.arc(x + SLOT_WIDTH - 8, y + 8, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Warp indicator for audio clips
        if (clip?.type === 'audio' && clip.isWarped) {
          ctx.fillStyle = '#ff0';
          ctx.fillRect(x + SLOT_WIDTH - 16, y + 4, 4, 4);
        }
      }
    }
    
    // Draw selection rectangle
    if (selectionRect) {
      ctx.strokeStyle = '#00b0ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
      ctx.fillStyle = 'rgba(0, 176, 255, 0.1)';
      ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  }, [scenes, tracks, slots, clips, viewState, isPlaying, currentTick, selectionRect, slotMap]);
  
  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left + viewState.scrollX;
    const y = e.clientY - rect.top + viewState.scrollY;
    
    // Check if clicking on scene header
    if (x < TRACK_HEADER_WIDTH && y > SCENE_HEADER_HEIGHT) {
      const sceneIndex = Math.floor((y - SCENE_HEADER_HEIGHT) / (SLOT_HEIGHT + GRID_GAP));
      if (sceneIndex >= 0 && sceneIndex < scenes.length) {
        onSceneClick?.(scenes[sceneIndex], e);
      }
      return;
    }
    
    // Check if clicking on track header
    if (y < SCENE_HEADER_HEIGHT && x > TRACK_HEADER_WIDTH) {
      const trackIndex = Math.floor((x - TRACK_HEADER_WIDTH) / (SLOT_WIDTH + GRID_GAP));
      if (trackIndex >= 0 && trackIndex < tracks.length) {
        onTrackClick?.(tracks[trackIndex], e);
      }
      return;
    }
    
    // Check if clicking on a slot
    const { slot } = getSlotAtPosition(e.clientX - rect.left, e.clientY - rect.top);
    if (slot) {
      if (e.shiftKey) {
        // Add to selection
        const newSelection = {
          ...viewState.selection,
          slotIds: new Set([...viewState.selection.slotIds, slot.id]),
        };
        onSelectionChange?.(newSelection);
      } else if (e.ctrlKey || e.metaKey) {
        // Toggle selection
        const newSlotIds = new Set(viewState.selection.slotIds);
        if (newSlotIds.has(slot.id)) {
          newSlotIds.delete(slot.id);
        } else {
          newSlotIds.add(slot.id);
        }
        onSelectionChange?.({ ...viewState.selection, slotIds: newSlotIds });
      } else {
        onSlotClick?.(slot, e);
      }
    } else {
      // Start selection rectangle
      setIsDragging(true);
      setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, [scenes, tracks, viewState, onSceneClick, onTrackClick, onSlotClick, onSelectionChange, getSlotAtPosition]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectionRect({
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      width: Math.abs(x - dragStart.x),
      height: Math.abs(y - dragStart.y),
    });
  }, [isDragging, dragStart]);
  
  const handleMouseUp = useCallback(() => {
    if (selectionRect) {
      // Calculate which slots are in the selection rectangle
      const selectedSlots = new Set<string>();
      
      for (const slot of slots) {
        const trackIndex = tracks.findIndex(t => t.id === slot.trackId);
        const sceneIndex = scenes.findIndex(s => s.id === slot.sceneId);
        
        if (trackIndex >= 0 && sceneIndex >= 0) {
          const slotX = TRACK_HEADER_WIDTH + trackIndex * (SLOT_WIDTH + GRID_GAP) - viewState.scrollX;
          const slotY = SCENE_HEADER_HEIGHT + sceneIndex * (SLOT_HEIGHT + GRID_GAP) - viewState.scrollY;
          
          if (
            slotX < selectionRect.x + selectionRect.width &&
            slotX + SLOT_WIDTH > selectionRect.x &&
            slotY < selectionRect.y + selectionRect.height &&
            slotY + SLOT_HEIGHT > selectionRect.y
          ) {
            selectedSlots.add(slot.id);
          }
        }
      }
      
      onSelectionChange?.({
        ...viewState.selection,
        slotIds: selectedSlots,
      });
    }
    
    setIsDragging(false);
    setDragStart(null);
    setSelectionRect(null);
  }, [selectionRect, slots, tracks, scenes, viewState, onSelectionChange]);
  
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const { slot } = getSlotAtPosition(e.clientX - rect.left, e.clientY - rect.top);
    if (slot) {
      onSlotDoubleClick?.(slot, e);
    }
  }, [getSlotAtPosition, onSlotDoubleClick]);
  
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const { slot } = getSlotAtPosition(e.clientX - rect.left, e.clientY - rect.top);
    if (slot) {
      onSlotContextMenu?.(slot, e);
    }
  }, [getSlotAtPosition, onSlotContextMenu]);
  
  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    onViewStateChange?.({
      scrollX: container.scrollLeft,
      scrollY: container.scrollTop,
    });
  }, [onViewStateChange]);
  
  return (
    <div
      ref={containerRef}
      className={`session-grid ${className}`}
      style={{
        overflow: 'auto',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
      }}
      onScroll={handleScroll}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{
          cursor: isDragging ? 'crosshair' : 'pointer',
        }}
      />
    </div>
  );
};

// Helper function to adjust color brightness
function adjustBrightness(hexColor: string, factor: number): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const newR = Math.min(255, Math.floor(r * factor));
  const newG = Math.min(255, Math.floor(g * factor));
  const newB = Math.min(255, Math.floor(b * factor));
  
  return `rgb(${newR}, ${newG}, ${newB})`;
}

export default SessionGrid;
