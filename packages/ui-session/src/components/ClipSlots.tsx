/**
 * Clip Slots Component
 * Individual clip containers with launch controls
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ClipSlot, Clip, ClipLaunchSettings, FollowAction } from '../types';

export interface ClipSlotsProps {
  slot: ClipSlot;
  clip?: Clip;
  isPlaying?: boolean;
  isQueued?: boolean;
  progress?: number;
  countdown?: number; // In beats
  onLaunch?: (slotId: string, velocity?: number) => void;
  onStop?: (slotId: string) => void;
  onSelect?: (slotId: string, multiSelect: boolean) => void;
  onDoubleClick?: (slotId: string) => void;
  onContextMenu?: (slotId: string, x: number, y: number) => void;
  onLaunchSettingsChange?: (slotId: string, settings: Partial<ClipLaunchSettings>) => void;
  onFollowActionsChange?: (slotId: string, actions: FollowAction[]) => void;
  onClipEdit?: (slotId: string) => void;
  onClipDuplicate?: (slotId: string) => void;
  onClipDelete?: (slotId: string) => void;
  size?: 'compact' | 'normal' | 'large';
  showName?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  compact: { width: 80, height: 40, fontSize: 9, padding: 4 },
  normal: { width: 120, height: 60, fontSize: 10, padding: 6 },
  large: { width: 160, height: 80, fontSize: 11, padding: 8 },
};

export const ClipSlots: React.FC<ClipSlotsProps> = ({
  slot,
  clip,
  isPlaying = false,
  isQueued = false,
  progress = 0,
  countdown,
  onLaunch,
  onStop,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onLaunchSettingsChange,
  onFollowActionsChange,
  onClipEdit,
  onClipDuplicate,
  onClipDelete,
  size = 'normal',
  showName = true,
  className = '',
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const config = SIZE_CONFIG[size];
  
  const hasClip = !!clip;
  const isRecording = slot.state === 'recording';
  const isEmpty = !hasClip;
  
  // Handle launch button press
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.button === 0) { // Left click
      setIsPressed(true);
      
      if (clip?.launchSettings.launchMode === 'gate') {
        // For gate mode, launch immediately on press
        onLaunch?.(slot.id, 127);
      }
    }
  }, [clip, slot.id, onLaunch]);
  
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPressed(false);
    
    if (clip?.launchSettings.launchMode === 'gate') {
      // For gate mode, stop on release
      onStop?.(slot.id);
    }
  }, [clip, slot.id, onStop]);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.button === 0) { // Left click
      if (isEmpty) {
        // Click on empty slot - select it
        onSelect?.(slot.id, e.shiftKey || e.ctrlKey || e.metaKey);
      } else if (clip?.launchSettings.launchMode !== 'gate') {
        // For non-gate modes, toggle on click
        if (isPlaying && clip?.launchSettings.launchMode === 'toggle') {
          onStop?.(slot.id);
        } else {
          onLaunch?.(slot.id, 127);
        }
      }
    }
  }, [isEmpty, isPlaying, clip, slot.id, onLaunch, onStop, onSelect]);
  
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.(slot.id);
  }, [slot.id, onDoubleClick]);
  
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
    onContextMenu?.(slot.id, e.clientX, e.clientY);
  }, [slot.id, onContextMenu]);
  
  // Handle keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      if (isPlaying) {
        onStop?.(slot.id);
      } else if (hasClip) {
        onLaunch?.(slot.id, 127);
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (hasClip) {
        onClipDelete?.(slot.id);
      }
    }
  }, [isPlaying, hasClip, slot.id, onLaunch, onStop, onClipDelete]);
  
  // Calculate background color
  const getBackgroundColor = () => {
    if (isRecording) {
      return '#f44336';
    }
    if (isPlaying) {
      // Pulse effect
      const pulse = Math.sin(performance.now() / 200) * 0.3 + 0.7;
      return clip?.color 
        ? adjustColorBrightness(clip.color, pulse)
        : `rgba(0, 230, 118, ${pulse})`;
    }
    if (isQueued) {
      return '#ff9800';
    }
    if (hasClip) {
      return clip?.color || '#666';
    }
    return '#2a2a2a';
  };
  
  // Calculate text color
  const getTextColor = () => {
    if (isPlaying || isQueued || isRecording) {
      return '#000';
    }
    return '#fff';
  };
  
  return (
    <>
      <button
        ref={buttonRef}
        className={`clip-slot ${className}`}
        style={{
          width: config.width,
          height: config.height,
          padding: config.padding,
          backgroundColor: getBackgroundColor(),
          border: isPressed ? '2px solid #00b0ff' : '1px solid #444',
          borderRadius: '3px',
          cursor: hasClip ? 'pointer' : 'default',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.05s, box-shadow 0.1s',
          transform: isPressed ? 'scale(0.98)' : 'scale(1)',
          boxShadow: isPlaying ? '0 0 10px rgba(0, 230, 118, 0.5)' : 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsPressed(false)}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Clip name */}
        {showName && hasClip && (
          <span
            style={{
              color: getTextColor(),
              fontSize: config.fontSize,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {clip.name}
          </span>
        )}
        
        {/* Empty slot indicator */}
        {isEmpty && (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#555',
              fontSize: config.fontSize,
            }}
          >
            Drop clip here
          </div>
        )}
        
        {/* Bottom row with indicators */}
        {hasClip && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              width: '100%',
            }}
          >
            {/* Loop indicator */}
            {clip.loop?.enabled && (
              <span
                style={{
                  color: getTextColor(),
                  fontSize: config.fontSize - 2,
                  opacity: 0.8,
                }}
                title="Loop enabled"
              >
                ⟳
              </span>
            )}
            
            {/* Warp indicator */}
            {clip.type === 'audio' && clip.isWarped && (
              <span
                style={{
                  color: getTextColor(),
                  fontSize: config.fontSize - 2,
                  opacity: 0.8,
                }}
                title="Warp enabled"
              >
                W
              </span>
            )}
            
            {/* Countdown for queued clips */}
            {isQueued && countdown !== undefined && (
              <span
                style={{
                  color: '#000',
                  fontSize: config.fontSize,
                  fontWeight: 'bold',
                  marginLeft: 'auto',
                }}
              >
                {Math.ceil(countdown)}
              </span>
            )}
            
            {/* Stop button when playing */}
            {isPlaying && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStop?.(slot.id);
                }}
                style={{
                  marginLeft: 'auto',
                  width: '16px',
                  height: '16px',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: 'none',
                  borderRadius: '2px',
                  color: '#000',
                  fontSize: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Stop"
              >
                ■
              </button>
            )}
          </div>
        )}
        
        {/* Progress bar for playing clips */}
        {isPlaying && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                transition: 'width 0.05s linear',
              }}
            />
          </div>
        )}
      </button>
      
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
              zIndex: 999,
            }}
            onClick={() => setContextMenu(null)}
          />
          <div
            style={{
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '4px',
              padding: '4px 0',
              zIndex: 1000,
              minWidth: '150px',
            }}
          >
            {hasClip ? (
              <>
                <button
                  style={styles.menuItem}
                  onClick={() => {
                    if (isPlaying) {
                      onStop?.(slot.id);
                    } else {
                      onLaunch?.(slot.id, 127);
                    }
                    setContextMenu(null);
                  }}
                >
                  {isPlaying ? 'Stop' : 'Launch'}
                </button>
                <div style={styles.menuDivider} />
                <button
                  style={styles.menuItem}
                  onClick={() => {
                    onClipEdit?.(slot.id);
                    setContextMenu(null);
                  }}
                >
                  Edit Clip
                </button>
                <button
                  style={styles.menuItem}
                  onClick={() => {
                    setShowSettings(true);
                    setContextMenu(null);
                  }}
                >
                  Launch Settings...
                </button>
                <button
                  style={styles.menuItem}
                  onClick={() => {
                    onClipDuplicate?.(slot.id);
                    setContextMenu(null);
                  }}
                >
                  Duplicate
                </button>
                <div style={styles.menuDivider} />
                <button
                  style={{ ...styles.menuItem, color: '#f44336' }}
                  onClick={() => {
                    onClipDelete?.(slot.id);
                    setContextMenu(null);
                  }}
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  style={styles.menuItem}
                  onClick={() => {
                    onDoubleClick?.(slot.id);
                    setContextMenu(null);
                  }}
                >
                  Create Clip
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
};

// Helper to adjust color brightness
function adjustColorBrightness(hexColor: string, factor: number): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const newR = Math.min(255, Math.floor(r * factor));
  const newG = Math.min(255, Math.floor(g * factor));
  const newB = Math.min(255, Math.floor(b * factor));
  
  return `rgb(${newR}, ${newG}, ${newB})`;
}

const styles: Record<string, React.CSSProperties> = {
  menuItem: {
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
  menuDivider: {
    height: '1px',
    backgroundColor: '#444',
    margin: '4px 0',
  },
};

export default ClipSlots;
