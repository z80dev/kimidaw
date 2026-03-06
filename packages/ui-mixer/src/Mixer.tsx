/**
 * Mixer Component
 * 
 * Main mixer panel showing all channel strips including:
 * - Track channels
 * - Return/buss channels
 * - Master channel
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Track, BusTrack, MasterTrack } from '@daw/project-schema';
import { DAW_COLORS, DAW_TYPOGRAPHY } from '@daw/ui-shell';
import { ChannelStrip } from './ChannelStrip.js';

/**
 * Mixer props
 */
export interface MixerProps {
  /** Tracks to display */
  tracks: Track[];
  
  /** Bus tracks */
  buses?: BusTrack[];
  
  /** Master track */
  master?: MasterTrack;
  
  /** Currently selected track ID */
  selectedTrackId?: string;
  
  /** Meter levels for each track (trackId -> dB) */
  meterLevels?: Map<string, number>;
  
  /** Peak levels for each track */
  peakLevels?: Map<string, number>;
  
  /** Callback when track is selected */
  onTrackSelect?: (trackId: string) => void;
  
  /** Callback when mute is toggled */
  onMuteToggle?: (trackId: string) => void;
  
  /** Callback when solo is toggled */
  onSoloToggle?: (trackId: string) => void;
  
  /** Callback when arm is toggled */
  onArmToggle?: (trackId: string) => void;
  
  /** Callback when volume changes */
  onVolumeChange?: (trackId: string, db: number) => void;
  
  /** Callback when pan changes */
  onPanChange?: (trackId: string, pan: number) => void;
  
  /** Callback when send level changes */
  onSendChange?: (trackId: string, sendIndex: number, level: number) => void;
  
  /** Show narrow strips */
  narrow?: boolean;
  
  /** Custom class name */
  className?: string;
}

/**
 * Mixer component
 */
export function Mixer({
  tracks,
  buses = [],
  master,
  selectedTrackId,
  meterLevels = new Map(),
  peakLevels = new Map(),
  onTrackSelect,
  onMuteToggle,
  onSoloToggle,
  onArmToggle,
  onVolumeChange,
  onPanChange,
  onSendChange,
  narrow = false,
  className,
}: MixerProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const stripWidth = narrow ? 48 : 80;
  
  return (
    <div
      ref={containerRef}
      className={className}
      style={styles.container}
    >
      {/* Tracks */}
      <div style={styles.stripsContainer}>
        {tracks.map((track, index) => (
          <ChannelStrip
            key={track.id}
            track={track}
            index={index}
            isSelected={track.id === selectedTrackId}
            meterLevel={meterLevels.get(track.id) ?? -60}
            peakLevel={peakLevels.get(track.id) ?? -60}
            onSelect={() => onTrackSelect?.(track.id)}
            onMuteToggle={() => onMuteToggle?.(track.id)}
            onSoloToggle={() => onSoloToggle?.(track.id)}
            onArmToggle={() => onArmToggle?.(track.id)}
            onVolumeChange={(db) => onVolumeChange?.(track.id, db)}
            onPanChange={(pan) => onPanChange?.(track.id, pan)}
            onSendChange={(sendIndex, level) => onSendChange?.(track.id, sendIndex, level)}
            narrow={narrow}
          />
        ))}
      </div>
      
      {/* Buses separator */}
      {buses.length > 0 && <div style={styles.separator} />}
      
      {/* Bus returns */}
      {buses.length > 0 && (
        <div style={styles.stripsContainer}>
          {buses.map((bus, index) => (
            <ChannelStrip
              key={bus.id}
              track={bus}
              index={index}
              isSelected={bus.id === selectedTrackId}
              meterLevel={meterLevels.get(bus.id) ?? -60}
              peakLevel={peakLevels.get(bus.id) ?? -60}
              isBus
              onSelect={() => onTrackSelect?.(bus.id)}
              onMuteToggle={() => onMuteToggle?.(bus.id)}
              onSoloToggle={() => onSoloToggle?.(bus.id)}
              onVolumeChange={(db) => onVolumeChange?.(bus.id, db)}
              onPanChange={(pan) => onPanChange?.(bus.id, pan)}
              narrow={narrow}
            />
          ))}
        </div>
      )}
      
      {/* Master separator */}
      <div style={styles.separator} />
      
      {/* Master channel */}
      {master && (
        <div style={styles.masterContainer}>
          <ChannelStrip
            track={master}
            index={0}
            isSelected={master.id === selectedTrackId}
            meterLevel={meterLevels.get(master.id) ?? -60}
            peakLevel={peakLevels.get(master.id) ?? -60}
            isMaster
            onSelect={() => onTrackSelect?.(master.id)}
            onVolumeChange={(db) => onVolumeChange?.(master.id, db)}
            onPanChange={(pan) => onPanChange?.(master.id, pan)}
            narrow={narrow}
          />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    backgroundColor: DAW_COLORS.bgDark,
    overflowX: 'auto',
    overflowY: 'hidden',
  },
  stripsContainer: {
    display: 'flex',
    flexDirection: 'row',
    padding: '4px',
    gap: '2px',
  },
  separator: {
    width: '4px',
    backgroundColor: DAW_COLORS.borderDefault,
    margin: '4px 0',
  },
  masterContainer: {
    padding: '4px',
  },
};
