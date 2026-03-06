/**
 * Channel Strip
 * 
 * Individual mixer channel with:
 * - Mute/Solo/Arm buttons
 * - Volume fader
 * - Pan knob
 * - Level meter
 * - Send controls
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Track, BusTrack, MasterTrack } from '@daw/project-schema';
import { DAW_COLORS, DAW_TYPOGRAPHY, DAW_SPACING } from '@daw/ui-shell';
import { Meter } from './Meter.js';
import { Sends } from './Sends.js';

/**
 * Channel strip props
 */
export interface ChannelStripProps {
  /** Track data */
  track: Track | BusTrack | MasterTrack;
  
  /** Track index for color coding */
  index: number;
  
  /** Whether this track is selected */
  isSelected?: boolean;
  
  /** Current meter level in dB */
  meterLevel?: number;
  
  /** Current peak level in dB */
  peakLevel?: number;
  
  /** Is this a bus channel */
  isBus?: boolean;
  
  /** Is this the master channel */
  isMaster?: boolean;
  
  /** Callback when clicked */
  onSelect?: () => void;
  
  /** Callback when mute toggled */
  onMuteToggle?: () => void;
  
  /** Callback when solo toggled */
  onSoloToggle?: () => void;
  
  /** Callback when arm toggled */
  onArmToggle?: () => void;
  
  /** Callback when volume changes */
  onVolumeChange?: (db: number) => void;
  
  /** Callback when pan changes */
  onPanChange?: (pan: number) => void;
  
  /** Callback when send level changes */
  onSendChange?: (sendIndex: number, level: number) => void;
  
  /** Narrow mode */
  narrow?: boolean;
}

/**
 * Channel strip component
 */
export function ChannelStrip({
  track,
  index,
  isSelected = false,
  meterLevel = -60,
  peakLevel = -60,
  isBus = false,
  isMaster = false,
  onSelect,
  onMuteToggle,
  onSoloToggle,
  onArmToggle,
  onVolumeChange,
  onPanChange,
  onSendChange,
  narrow = false,
}: ChannelStripProps): React.ReactElement {
  const [isDraggingFader, setIsDraggingFader] = useState(false);
  const faderRef = useRef<HTMLDivElement>(null);
  
  // Default values
  const volumeDb = (track as Track).volumeDb ?? 0;
  const pan = (track as Track).pan ?? 0;
  
  // Fader drag handling
  const handleFaderMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDraggingFader(true);
  }, []);
  
  useEffect(() => {
    if (!isDraggingFader) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!faderRef.current) return;
      
      const rect = faderRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      
      // Map Y position to dB (-60 to +12)
      const normalized = 1 - (y / height);
      const db = -60 + normalized * 72;
      
      onVolumeChange?.(Math.max(-60, Math.min(12, db)));
    };
    
    const handleMouseUp = () => {
      setIsDraggingFader(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingFader, onVolumeChange]);
  
  // Calculate fader position
  const faderPosition = ((volumeDb + 60) / 72) * 100;
  
  // Color strip
  const colorStripColor = track.color ?? DAW_COLORS.clipBlue;
  
  return (
    <div
      style={{
        ...styles.container,
        ...(isSelected ? styles.selected : {}),
        width: narrow ? 48 : 80,
      }}
      onClick={onSelect}
    >
      {/* Color strip */}
      <div style={{ ...styles.colorStrip, backgroundColor: colorStripColor }} />
      
      {/* Track name */}
      <div style={styles.nameContainer}>
        <span style={styles.trackName} title={track.name}>
          {track.name}
        </span>
      </div>
      
      {/* Mute/Solo/Arm buttons */}
      {!isMaster && (
        <div style={styles.buttonRow}>
          <button
            style={{
              ...styles.button,
              ...(track.mute ? styles.muteActive : {}),
            }}
            onClick={(e) => { e.stopPropagation(); onMuteToggle?.(); }}
            title="Mute"
          >
            M
          </button>
          <button
            style={{
              ...styles.button,
              ...(track.solo ? styles.soloActive : {}),
            }}
            onClick={(e) => { e.stopPropagation(); onSoloToggle?.(); }}
            title="Solo"
          >
            S
          </button>
          {!isBus && (
            <button
              style={{
                ...styles.button,
                ...(track.arm ? styles.armActive : {}),
              }}
              onClick={(e) => { e.stopPropagation(); onArmToggle?.(); }}
              title="Arm"
            >
              A
            </button>
          )}
        </div>
      )}
      
      {/* Sends */}
      {!isMaster && !narrow && (
        <Sends
          sends={track.sends ?? []}
          onSendChange={onSendChange}
        />
      )}
      
      {/* Pan */}
      {!narrow && (
        <div style={styles.panContainer}>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={pan}
            onChange={(e) => onPanChange?.(parseFloat(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            style={styles.panKnob}
          />
          <span style={styles.panLabel}>{pan === 0 ? 'C' : pan > 0 ? `${Math.round(pan * 100)}R` : `${Math.round(-pan * 100)}L`}</span>
        </div>
      )}
      
      {/* Meter and Fader */}
      <div style={styles.meterFaderContainer}>
        {/* Meter */}
        <Meter
          level={meterLevel}
          peak={peakLevel}
          width={narrow ? 8 : 12}
          height={120}
        />
        
        {/* Fader */}
        <div
          ref={faderRef}
          style={styles.faderTrack}
          onMouseDown={handleFaderMouseDown}
        >
          <div
            style={{
              ...styles.faderHandle,
              top: `${100 - faderPosition}%`,
            }}
          />
        </div>
      </div>
      
      {/* Volume display */}
      <div style={styles.volumeDisplay}>
        {volumeDb > -60 ? `${volumeDb > 0 ? '+' : ''}${volumeDb.toFixed(1)}` : '-inf'} dB
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: DAW_COLORS.bgMedium,
    border: `1px solid ${DAW_COLORS.borderDefault}`,
    borderRadius: '2px',
    padding: '4px',
    gap: '4px',
    cursor: 'pointer',
    position: 'relative',
  },
  selected: {
    borderColor: DAW_COLORS.accentBlue,
    backgroundColor: DAW_COLORS.bgLight,
  },
  colorStrip: {
    height: '3px',
    borderRadius: '1px',
    marginBottom: '2px',
  },
  nameContainer: {
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackName: {
    fontSize: DAW_TYPOGRAPHY.sizeXs,
    color: DAW_COLORS.textPrimary,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: '100%',
  },
  buttonRow: {
    display: 'flex',
    gap: '2px',
    justifyContent: 'center',
  },
  button: {
    width: '20px',
    height: '18px',
    fontSize: '9px',
    fontWeight: 'bold',
    backgroundColor: DAW_COLORS.bgDark,
    border: `1px solid ${DAW_COLORS.borderDefault}`,
    borderRadius: '2px',
    color: DAW_COLORS.textTertiary,
    cursor: 'pointer',
    padding: 0,
  },
  muteActive: {
    backgroundColor: DAW_COLORS.error,
    color: DAW_COLORS.bgDark,
    borderColor: DAW_COLORS.error,
  },
  soloActive: {
    backgroundColor: DAW_COLORS.accentYellow,
    color: DAW_COLORS.bgDark,
    borderColor: DAW_COLORS.accentYellow,
  },
  armActive: {
    backgroundColor: DAW_COLORS.record,
    color: DAW_COLORS.bgDark,
    borderColor: DAW_COLORS.record,
  },
  panContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  panKnob: {
    width: '60px',
  },
  panLabel: {
    fontSize: '9px',
    color: DAW_COLORS.textTertiary,
  },
  meterFaderContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    height: '120px',
    flex: 1,
  },
  faderTrack: {
    width: '20px',
    height: '100%',
    backgroundColor: DAW_COLORS.bgDark,
    borderRadius: '2px',
    position: 'relative',
    cursor: 'pointer',
  },
  faderHandle: {
    position: 'absolute',
    left: '-4px',
    width: '28px',
    height: '12px',
    backgroundColor: DAW_COLORS.bgLighter,
    border: `1px solid ${DAW_COLORS.borderStrong}`,
    borderRadius: '2px',
    cursor: 'grab',
  },
  volumeDisplay: {
    fontSize: '9px',
    color: DAW_COLORS.textSecondary,
    textAlign: 'center',
    fontFamily: DAW_TYPOGRAPHY.fontFamilyMono,
  },
};
