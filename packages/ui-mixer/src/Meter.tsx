/**
 * Meter Component
 * 
 * Peak/RMS level meter with configurable range and styling.
 */

import React, { useRef, useEffect } from 'react';
import { DAW_COLORS } from '@daw/ui-shell';

/**
 * Meter style
 */
export type MeterStyle = 'peak' | 'rms' | 'both';

/**
 * Meter props
 */
export interface MeterProps {
  /** Current level in dB */
  level: number;
  
  /** Peak level in dB */
  peak?: number;
  
  /** Meter width in pixels */
  width?: number;
  
  /** Meter height in pixels */
  height?: number;
  
  /** Minimum displayed dB */
  minDb?: number;
  
  /** Maximum displayed dB */
  maxDb?: number;
  
  /** Meter orientation */
  orientation?: 'vertical' | 'horizontal';
  
  /** Show peak hold indicator */
  showPeakHold?: boolean;
  
  /** Meter style */
  style?: MeterStyle;
  
  /** Custom class name */
  className?: string;
}

/**
 * Meter component
 */
export function Meter({
  level,
  peak = -60,
  width = 12,
  height = 120,
  minDb = -60,
  maxDb = 6,
  orientation = 'vertical',
  showPeakHold = true,
  style = 'peak',
  className,
}: MeterProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear
    ctx.fillStyle = DAW_COLORS.bgDark;
    ctx.fillRect(0, 0, width, height);
    
    // Draw background scale
    const dbRange = maxDb - minDb;
    
    // Color zones
    const greenZone = (-12 - minDb) / dbRange;
    const yellowZone = (-6 - minDb) / dbRange;
    
    // Draw scale background
    for (let i = 0; i < height; i++) {
      const normalized = 1 - i / height;
      
      let color: string;
      if (normalized < greenZone) {
        color = DAW_COLORS.success;
      } else if (normalized < yellowZone) {
        color = DAW_COLORS.warning;
      } else {
        color = DAW_COLORS.error;
      }
      
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(0, i, width, 1);
    }
    
    ctx.globalAlpha = 1;
    
    // Draw level bar
    const levelNormalized = Math.max(0, Math.min(1, (level - minDb) / dbRange));
    const levelHeight = levelNormalized * height;
    
    for (let i = 0; i < levelHeight; i++) {
      const normalized = i / height;
      
      let color: string;
      if (normalized < 1 - greenZone) {
        color = DAW_COLORS.success;
      } else if (normalized < 1 - yellowZone) {
        color = DAW_COLORS.warning;
      } else {
        color = DAW_COLORS.error;
      }
      
      ctx.fillStyle = color;
      ctx.fillRect(1, height - i - 1, width - 2, 1);
    }
    
    // Draw peak hold
    if (showPeakHold && peak > minDb) {
      const peakNormalized = Math.max(0, Math.min(1, (peak - minDb) / dbRange));
      const peakY = height - peakNormalized * height;
      
      ctx.fillStyle = DAW_COLORS.playhead;
      ctx.fillRect(0, peakY - 1, width, 2);
    }
    
    // Draw dB markers
    ctx.fillStyle = DAW_COLORS.textTertiary;
    ctx.font = '8px sans-serif';
    
    const markers = [-48, -36, -24, -12, -6, 0];
    for (const db of markers) {
      const normalized = (db - minDb) / dbRange;
      if (normalized >= 0 && normalized <= 1) {
        const y = height - normalized * height;
        ctx.fillRect(0, y, 4, 1);
      }
    }
  }, [level, peak, width, height, minDb, maxDb, showPeakHold]);
  
  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    />
  );
}
