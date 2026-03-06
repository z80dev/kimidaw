/**
 * Sends Component
 * 
 * Send level controls for routing audio to effect buses.
 */

import React from 'react';
import type { SendSlot } from '@daw/project-schema';
import { DAW_COLORS, DAW_TYPOGRAPHY } from '@daw/ui-shell';

/**
 * Send control props
 */
export interface SendControl {
  send: SendSlot;
  index: number;
  onChange?: (level: number) => void;
}

/**
 * Sends props
 */
export interface SendsProps {
  /** Send slots */
  sends: SendSlot[];
  
  /** Callback when send level changes */
  onSendChange?: (sendIndex: number, level: number) => void;
}

/**
 * Sends component
 */
export function Sends({
  sends,
  onSendChange,
}: SendsProps): React.ReactElement {
  if (sends.length === 0) {
    return <div style={styles.empty}>No sends</div>;
  }
  
  return (
    <div style={styles.container}>
      {sends.map((send, index) => (
        <SendKnob
          key={send.targetBusId}
          send={send}
          index={index}
          onChange={(level) => onSendChange?.(index, level)}
        />
      ))}
    </div>
  );
}

/**
 * Individual send knob
 */
function SendKnob({
  send,
  index,
  onChange,
}: SendControl): React.ReactElement {
  // Convert send level from dB to normalized
  const levelDb = send.gainDb ?? -60;
  const normalized = levelDb <= -60 ? 0 : (levelDb + 60) / 66;
  
  return (
    <div style={styles.sendContainer}>
      <div style={styles.sendLabel}>{index + 1}</div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={normalized}
        onChange={(e) => {
          const norm = parseFloat(e.target.value);
          const db = norm === 0 ? -60 : norm * 6;
          onChange?.(db);
        }}
        style={styles.sendSlider}
      />
      <div style={styles.sendValue}>
        {levelDb > -60 ? `${levelDb.toFixed(1)}` : '-inf'}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '2px',
  },
  empty: {
    fontSize: '9px',
    color: DAW_COLORS.textTertiary,
    textAlign: 'center',
    padding: '4px',
  },
  sendContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  sendLabel: {
    fontSize: '8px',
    color: DAW_COLORS.textTertiary,
    fontWeight: 'bold',
  },
  sendSlider: {
    width: '50px',
  },
  sendValue: {
    fontSize: '8px',
    color: DAW_COLORS.textSecondary,
    fontFamily: DAW_TYPOGRAPHY.fontFamilyMono,
  },
};
