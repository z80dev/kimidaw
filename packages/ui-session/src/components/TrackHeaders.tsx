/**
 * Track Headers Component
 * Left side track strips with controls
 */

import React, { useState, useCallback } from 'react';
import type { Track } from '../types';

export interface TrackHeadersProps {
  tracks: Track[];
  selectedTrackIds?: Set<string>;
  onTrackSelect?: (trackId: string, multiSelect: boolean) => void;
  onTrackMuteToggle?: (trackId: string) => void;
  onTrackSoloToggle?: (trackId: string) => void;
  onTrackArmToggle?: (trackId: string) => void;
  onTrackCueToggle?: (trackId: string) => void;
  onVolumeChange?: (trackId: string, volumeDb: number) => void;
  onPanChange?: (trackId: string, pan: number) => void;
  onInputChange?: (trackId: string, input: string) => void;
  onOutputChange?: (trackId: string, output: string) => void;
  onTrackFoldToggle?: (trackId: string) => void;
  onStopClipClick?: (trackId: string) => void;
  onTrackReorder?: (trackId: string, newIndex: number) => void;
  className?: string;
}

const TRACK_HEIGHT = 60;
const HEADER_PADDING = 4;
const METER_WIDTH = 8;

export const TrackHeaders: React.FC<TrackHeadersProps> = ({
  tracks,
  selectedTrackIds = new Set(),
  onTrackSelect,
  onTrackMuteToggle,
  onTrackSoloToggle,
  onTrackArmToggle,
  onTrackCueToggle,
  onVolumeChange,
  onPanChange,
  onInputChange,
  onOutputChange,
  onTrackFoldToggle,
  onStopClipClick,
  onTrackReorder,
  className = '',
}) => {
  const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  
  const handleTrackClick = useCallback((track: Track, e: React.MouseEvent) => {
    const multiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
    onTrackSelect?.(track.id, multiSelect);
  }, [onTrackSelect]);
  
  const handleDragStart = useCallback((e: React.DragEvent, trackId: string) => {
    setDraggingTrackId(trackId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    if (draggingTrackId && draggingTrackId !== trackId) {
      setDragOverTrackId(trackId);
    }
  }, [draggingTrackId]);
  
  const handleDrop = useCallback((e: React.DragEvent, targetTrackId: string) => {
    e.preventDefault();
    if (draggingTrackId && draggingTrackId !== targetTrackId) {
      const targetIndex = tracks.findIndex(t => t.id === targetTrackId);
      onTrackReorder?.(draggingTrackId, targetIndex);
    }
    setDraggingTrackId(null);
    setDragOverTrackId(null);
  }, [draggingTrackId, tracks, onTrackReorder]);
  
  const handleDragEnd = useCallback(() => {
    setDraggingTrackId(null);
    setDragOverTrackId(null);
  }, []);
  
  // Calculate meter level (mock for now)
  const getMeterLevel = (track: Track): number => {
    // This would come from the audio engine
    return Math.random() * 0.8;
  };
  
  // Volume slider to dB conversion
  const volumeToDb = (value: number): number => {
    // Convert 0-1 slider to dB (-inf to +6)
    if (value <= 0) return -Infinity;
    return 20 * Math.log10(value) * 0.5 + 6;
  };
  
  const dbToVolume = (db: number): number => {
    if (db <= -60) return 0;
    return Math.pow(10, (db - 6) / 10);
  };
  
  return (
    <div className={`track-headers ${className}`} style={styles.container}>
      {/* Header row */}
      <div style={styles.headerRow}>
        <span style={styles.headerLabel}>Track</span>
      </div>
      
      {/* Track strips */}
      <div style={styles.trackList}>
        {tracks.map((track, index) => {
          const isSelected = selectedTrackIds.has(track.id);
          const isGroupTrack = track.type === 'group';
          const hasChildren = isGroupTrack && track.children && track.children.length > 0;
          const meterLevel = getMeterLevel(track);
          
          return (
            <div
              key={track.id}
              draggable
              onDragStart={(e) => handleDragStart(e, track.id)}
              onDragOver={(e) => handleDragOver(e, track.id)}
              onDrop={(e) => handleDrop(e, track.id)}
              onDragEnd={handleDragEnd}
              onClick={(e) => handleTrackClick(track, e)}
              style={{
                ...styles.trackStrip,
                backgroundColor: isSelected ? '#333' : '#222',
                borderColor: dragOverTrackId === track.id ? '#00b0ff' : '#444',
                opacity: draggingTrackId === track.id ? 0.5 : 1,
              }}
            >
              {/* Track color indicator */}
              <div 
                style={{
                  ...styles.colorIndicator,
                  backgroundColor: track.color || '#666',
                }} 
              />
              
              {/* Track info */}
              <div style={styles.trackInfo}>
                <div style={styles.trackNameRow}>
                  {isGroupTrack && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTrackFoldToggle?.(track.id);
                      }}
                      style={styles.foldButton}
                    >
                      {track.isFolded ? '▶' : '▼'}
                    </button>
                  )}
                  <span style={styles.trackName}>{track.name}</span>
                </div>
                
                {/* Input/Output selectors */}
                <div style={styles.ioRow}>
                  <select
                    value={track.input || 'None'}
                    onChange={(e) => onInputChange?.(track.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.ioSelect}
                  >
                    <option>Ext. In</option>
                    <option>No Input</option>
                  </select>
                  <span style={styles.ioArrow}>→</span>
                  <select
                    value={track.output}
                    onChange={(e) => onOutputChange?.(track.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.ioSelect}
                  >
                    <option>Master</option>
                    {tracks.filter(t => t.type === 'group').map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Control buttons */}
              <div style={styles.controlButtons}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrackArmToggle?.(track.id);
                  }}
                  style={{
                    ...styles.controlButton,
                    backgroundColor: track.arm ? '#f44336' : '#444',
                    color: track.arm ? '#fff' : '#888',
                  }}
                  title="Arm for recording"
                >
                  ●
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrackSoloToggle?.(track.id);
                  }}
                  style={{
                    ...styles.controlButton,
                    backgroundColor: track.solo ? '#00e676' : '#444',
                    color: track.solo ? '#000' : '#888',
                  }}
                  title="Solo"
                >
                  S
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrackMuteToggle?.(track.id);
                  }}
                  style={{
                    ...styles.controlButton,
                    backgroundColor: track.mute ? '#ff9800' : '#444',
                    color: track.mute ? '#000' : '#888',
                  }}
                  title="Mute"
                >
                  M
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrackCueToggle?.(track.id);
                  }}
                  style={{
                    ...styles.controlButton,
                    backgroundColor: track.cue ? '#00b0ff' : '#444',
                    color: track.cue ? '#fff' : '#888',
                  }}
                  title="Cue/Solo in place"
                >
                  C
                </button>
              </div>
              
              {/* Pan knob */}
              <div style={styles.panContainer}>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={track.pan}
                  onChange={(e) => onPanChange?.(track.id, parseFloat(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  style={styles.panSlider}
                />
                <span style={styles.panLabel}>
                  {track.pan === 0 ? 'C' : track.pan > 0 ? `R${Math.round(track.pan * 100)}` : `L${Math.round(-track.pan * 100)}`}
                </span>
              </div>
              
              {/* Volume fader */}
              <div style={styles.volumeContainer}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={dbToVolume(track.volumeDb)}
                  onChange={(e) => onVolumeChange?.(track.id, volumeToDb(parseFloat(e.target.value)))}
                  onClick={(e) => e.stopPropagation()}
                  style={styles.volumeSlider}
                />
                <span style={styles.volumeLabel}>
                  {track.volumeDb > -60 ? `${Math.round(track.volumeDb)}dB` : '-∞'}
                </span>
              </div>
              
              {/* Level meter */}
              <div style={styles.meterContainer}>
                <div style={styles.meterBackground} />
                <div 
                  style={{
                    ...styles.meterFill,
                    height: `${meterLevel * 100}%`,
                    backgroundColor: meterLevel > 0.9 ? '#f44336' : meterLevel > 0.7 ? '#ff9800' : '#00e676',
                  }}
                />
              </div>
              
              {/* Stop clip button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStopClipClick?.(track.id);
                }}
                style={styles.stopButton}
                title="Stop playing clips"
              >
                ■
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#1a1a1a',
    borderRight: '1px solid #333',
    userSelect: 'none',
  },
  headerRow: {
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
  trackList: {
    flex: 1,
    overflowY: 'auto',
  },
  trackStrip: {
    display: 'flex',
    alignItems: 'center',
    height: `${TRACK_HEIGHT}px`,
    padding: `${HEADER_PADDING}px`,
    borderBottom: '1px solid #333',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  colorIndicator: {
    width: '4px',
    height: '100%',
    marginRight: '8px',
    borderRadius: '2px',
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: '8px',
  },
  trackNameRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
  },
  foldButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    padding: '0 4px',
    fontSize: '10px',
  },
  trackName: {
    color: '#fff',
    fontSize: '12px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  ioRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  ioSelect: {
    backgroundColor: '#333',
    color: '#888',
    border: '1px solid #444',
    borderRadius: '2px',
    fontSize: '9px',
    padding: '2px 4px',
    cursor: 'pointer',
  },
  ioArrow: {
    color: '#666',
    fontSize: '10px',
  },
  controlButtons: {
    display: 'flex',
    gap: '2px',
    marginRight: '8px',
  },
  controlButton: {
    width: '20px',
    height: '20px',
    border: 'none',
    borderRadius: '2px',
    fontSize: '9px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  panContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '50px',
    marginRight: '8px',
  },
  panSlider: {
    width: '100%',
    height: '16px',
  },
  panLabel: {
    color: '#888',
    fontSize: '9px',
  },
  volumeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '60px',
    marginRight: '8px',
  },
  volumeSlider: {
    width: '100%',
    height: '16px',
  },
  volumeLabel: {
    color: '#888',
    fontSize: '9px',
  },
  meterContainer: {
    position: 'relative',
    width: `${METER_WIDTH}px`,
    height: '40px',
    marginRight: '8px',
    backgroundColor: '#111',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  meterBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to top, #00e676 0%, #00e676 70%, #ff9800 70%, #ff9800 90%, #f44336 90%)',
    opacity: 0.3,
  },
  meterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    transition: 'height 0.05s ease-out',
  },
  stopButton: {
    width: '24px',
    height: '24px',
    backgroundColor: '#333',
    border: '1px solid #444',
    borderRadius: '2px',
    color: '#888',
    fontSize: '10px',
    cursor: 'pointer',
  },
};

export default TrackHeaders;
