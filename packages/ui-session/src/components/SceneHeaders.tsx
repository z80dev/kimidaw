/**
 * Scene Headers Component
 * Right side scene launch buttons
 */

import React, { useCallback, useState, useRef } from 'react';
import type { Scene } from '../types';

export interface SceneHeadersProps {
  scenes: Scene[];
  selectedSceneIds?: Set<string>;
  onSceneLaunch?: (sceneId: string) => void;
  onSceneSelect?: (sceneId: string, multiSelect: boolean) => void;
  onSceneRename?: (sceneId: string, name: string) => void;
  onSceneColorChange?: (sceneId: string, color: string) => void;
  onSceneTempoChange?: (sceneId: string, tempo: number | undefined) => void;
  onSceneTimeSignatureChange?: (sceneId: string, timeSig: { numerator: number; denominator: number } | undefined) => void;
  onSceneDuplicate?: (sceneId: string) => void;
  onSceneDelete?: (sceneId: string) => void;
  onSceneReorder?: (sceneId: string, newIndex: number) => void;
  onStopAllClips?: () => void;
  showTempo?: boolean;
  showTimeSignature?: boolean;
  className?: string;
}

const SCENE_HEIGHT = 60;
const SCENE_WIDTH = 80;

// Ableton-style scene colors
const SCENE_COLORS = [
  '#FF5252', // Red
  '#FF9800', // Orange
  '#FFEB3B', // Yellow
  '#76FF03', // Lime
  '#00E676', // Green
  '#00BFA5', // Teal
  '#00B0FF', // Light Blue
  '#2979FF', // Blue
  '#651FFF', // Deep Purple
  '#D500F9', // Purple
  '#F50057', // Pink
  '#795548', // Brown
];

export const SceneHeaders: React.FC<SceneHeadersProps> = ({
  scenes,
  selectedSceneIds = new Set(),
  onSceneLaunch,
  onSceneSelect,
  onSceneRename,
  onSceneColorChange,
  onSceneTempoChange,
  onSceneTimeSignatureChange,
  onSceneDuplicate,
  onSceneDelete,
  onSceneReorder,
  onStopAllClips,
  showTempo = true,
  showTimeSignature = false,
  className = '',
}) => {
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sceneId: string } | null>(null);
  const [draggingSceneId, setDraggingSceneId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleLaunch = useCallback((scene: Scene, e: React.MouseEvent) => {
    e.stopPropagation();
    onSceneLaunch?.(scene.id);
  }, [onSceneLaunch]);
  
  const handleSelect = useCallback((scene: Scene, e: React.MouseEvent) => {
    const multiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
    onSceneSelect?.(scene.id, multiSelect);
  }, [onSceneSelect]);
  
  const handleDoubleClick = useCallback((scene: Scene) => {
    setEditingSceneId(scene.id);
    setEditingName(scene.name);
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);
  
  const handleNameSubmit = useCallback(() => {
    if (editingSceneId && editingName.trim()) {
      onSceneRename?.(editingSceneId, editingName.trim());
    }
    setEditingSceneId(null);
    setEditingName('');
  }, [editingSceneId, editingName, onSceneRename]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingSceneId(null);
      setEditingName('');
    }
  }, [handleNameSubmit]);
  
  const handleContextMenu = useCallback((scene: Scene, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, sceneId: scene.id });
  }, []);
  
  const handleDragStart = useCallback((e: React.DragEvent, sceneId: string) => {
    setDraggingSceneId(sceneId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingSceneId !== null) {
      setDragOverIndex(index);
    }
  }, [draggingSceneId]);
  
  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggingSceneId !== null) {
      onSceneReorder?.(draggingSceneId, targetIndex);
    }
    setDraggingSceneId(null);
    setDragOverIndex(null);
  }, [draggingSceneId, onSceneReorder]);
  
  const handleDragEnd = useCallback(() => {
    setDraggingSceneId(null);
    setDragOverIndex(null);
  }, []);
  
  return (
    <div className={`scene-headers ${className}`} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerLabel}>Scenes</span>
        <button
          onClick={onStopAllClips}
          style={styles.stopAllButton}
          title="Stop all clips"
        >
          ■ Stop
        </button>
      </div>
      
      {/* Scene list */}
      <div style={styles.sceneList}>
        {scenes.map((scene, index) => {
          const isSelected = selectedSceneIds.has(scene.id);
          const isEditing = editingSceneId === scene.id;
          const isPlaying = scene.isPlaying;
          const isQueued = scene.isQueued;
          
          return (
            <div
              key={scene.id}
              draggable
              onDragStart={(e) => handleDragStart(e, scene.id)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={(e) => handleSelect(scene, e)}
              onDoubleClick={() => handleDoubleClick(scene)}
              onContextMenu={(e) => handleContextMenu(scene, e)}
              style={{
                ...styles.sceneRow,
                backgroundColor: isPlaying 
                  ? '#00e676' 
                  : isQueued 
                    ? '#ff9800' 
                    : isSelected 
                      ? '#333' 
                      : '#222',
                borderColor: dragOverIndex === index ? '#00b0ff' : '#444',
                opacity: draggingSceneId === scene.id ? 0.5 : 1,
              }}
            >
              {/* Scene number */}
              <div style={{
                ...styles.sceneNumber,
                color: isPlaying || isQueued ? '#000' : '#888',
              }}>
                {index + 1}
              </div>
              
              {/* Scene launch button */}
              <button
                onClick={(e) => handleLaunch(scene, e)}
                style={{
                  ...styles.launchButton,
                  backgroundColor: isPlaying 
                    ? '#00c853' 
                    : isQueued 
                      ? '#f57c00' 
                      : scene.color || '#444',
                  color: isPlaying || isQueued ? '#000' : '#fff',
                }}
              >
                {isPlaying ? '▶' : isQueued ? '⏳' : '●'}
              </button>
              
              {/* Scene info */}
              <div style={styles.sceneInfo}>
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleNameSubmit}
                    onKeyDown={handleKeyDown}
                    style={styles.nameInput}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span style={{
                    ...styles.sceneName,
                    color: isPlaying || isQueued ? '#000' : '#fff',
                  }}>
                    {scene.name}
                  </span>
                )}
                
                {/* Tempo/time signature display */}
                <div style={styles.metaRow}>
                  {showTempo && scene.tempo && (
                    <span style={{
                      ...styles.metaText,
                      color: isPlaying || isQueued ? '#000' : '#0af',
                    }}>
                      {Math.round(scene.tempo)} BPM
                    </span>
                  )}
                  {showTimeSignature && scene.timeSignature && (
                    <span style={{
                      ...styles.metaText,
                      color: isPlaying || isQueued ? '#000' : '#888',
                    }}>
                      {scene.timeSignature.numerator}/{scene.timeSignature.denominator}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Color picker indicator */}
              <div 
                style={{
                  ...styles.colorIndicator,
                  backgroundColor: scene.color || 'transparent',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Cycle through colors
                  const currentIndex = scene.color ? SCENE_COLORS.indexOf(scene.color) : -1;
                  const nextColor = SCENE_COLORS[(currentIndex + 1) % SCENE_COLORS.length];
                  onSceneColorChange?.(scene.id, nextColor);
                }}
              />
            </div>
          );
        })}
      </div>
      
      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onClick={() => setContextMenu(null)}
          />
          <div
            style={{
              ...styles.contextMenu,
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <button
              style={styles.contextMenuItem}
              onClick={() => {
                onSceneLaunch?.(contextMenu.sceneId);
                setContextMenu(null);
              }}
            >
              Launch Scene
            </button>
            <button
              style={styles.contextMenuItem}
              onClick={() => {
                handleDoubleClick(scenes.find(s => s.id === contextMenu.sceneId)!);
                setContextMenu(null);
              }}
            >
              Rename
            </button>
            <div style={styles.contextMenuDivider} />
            <button
              style={styles.contextMenuItem}
              onClick={() => {
                onSceneDuplicate?.(contextMenu.sceneId);
                setContextMenu(null);
              }}
            >
              Duplicate
            </button>
            <button
              style={styles.contextMenuItem}
              onClick={() => {
                onSceneDelete?.(contextMenu.sceneId);
                setContextMenu(null);
              }}
            >
              Delete
            </button>
            <div style={styles.contextMenuDivider} />
            <button
              style={styles.contextMenuItem}
              onClick={() => {
                onStopAllClips?.();
                setContextMenu(null);
              }}
            >
              Stop All Clips
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: `${SCENE_WIDTH + 40}px`,
    backgroundColor: '#1a1a1a',
    borderLeft: '1px solid #333',
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid #333',
    backgroundColor: '#222',
  },
  headerLabel: {
    color: '#888',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  stopAllButton: {
    backgroundColor: '#f44336',
    border: 'none',
    borderRadius: '3px',
    color: '#fff',
    fontSize: '10px',
    padding: '4px 8px',
    cursor: 'pointer',
  },
  sceneList: {
    flex: 1,
    overflowY: 'auto',
  },
  sceneRow: {
    display: 'flex',
    alignItems: 'center',
    height: `${SCENE_HEIGHT}px`,
    padding: '4px 8px',
    borderBottom: '1px solid #333',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  sceneNumber: {
    width: '20px',
    fontSize: '10px',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  launchButton: {
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '3px',
    fontSize: '12px',
    cursor: 'pointer',
    marginRight: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneInfo: {
    flex: 1,
    minWidth: 0,
  },
  sceneName: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  nameInput: {
    width: '100%',
    backgroundColor: '#333',
    border: '1px solid #00b0ff',
    borderRadius: '2px',
    color: '#fff',
    fontSize: '11px',
    padding: '2px 4px',
  },
  metaRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '2px',
  },
  metaText: {
    fontSize: '9px',
  },
  colorIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginLeft: '4px',
    cursor: 'pointer',
    border: '1px solid #555',
  },
  contextMenu: {
    position: 'fixed',
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '4px',
    padding: '4px 0',
    zIndex: 1000,
    minWidth: '150px',
  },
  contextMenuItem: {
    display: 'block',
    width: '100%',
    padding: '8px 16px',
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '12px',
    textAlign: 'left',
    cursor: 'pointer',
  },
  contextMenuDivider: {
    height: '1px',
    backgroundColor: '#444',
    margin: '4px 0',
  },
};

export default SceneHeaders;
