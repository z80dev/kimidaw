/**
 * Arrange View Component
 * 
 * Main timeline/arrange view for the DAW. Uses canvas-based rendering
 * for 60fps scrolling and zooming with large sessions.
 * 
 * Features:
 * - Canvas-based clip rendering (not DOM)
 * - Virtualization for large track counts
 * - Smooth zoom and pan
 * - Selection model
 * - Drag and drop
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Track, Project, TransportState } from '@daw/project-schema';
import { DAW_COLORS, DAW_TYPOGRAPHY, DAW_SPACING } from '@daw/ui-shell';
import { TimelineRenderer } from './canvas/TimelineRenderer.js';
import { ClipRenderer } from './canvas/ClipRenderer.js';
import { TrackHeaderRenderer } from './canvas/TrackHeaderRenderer.js';
import { SelectionModel } from './interactions/selection.js';
import { DragDropManager } from './interactions/drag-drop.js';
import { ZoomController } from './interactions/zoom.js';
import type { ArrangeConfig, ArrangeViewport } from './types.js';

/**
 * Props for ArrangeView
 */
export interface ArrangeViewProps {
  /** Project data */
  project: Project;
  
  /** Transport state */
  transport: TransportState;
  
  /** Currently selected track IDs */
  selectedTrackIds?: Set<string>;
  
  /** Currently selected clip IDs */
  selectedClipIds?: Set<string>;
  
  /** Callback when selection changes */
  onSelectionChange?: (tracks: Set<string>, clips: Set<string>) => void;
  
  /** Callback when a clip is clicked */
  onClipClick?: (clipId: string, event: React.MouseEvent) => void;
  
  /** Callback when a clip is double-clicked */
  onClipDoubleClick?: (clipId: string) => void;
  
  /** Callback when a track is clicked */
  onTrackClick?: (trackId: string, event: React.MouseEvent) => void;
  
  /** Callback when a clip is dragged */
  onClipDrag?: (clipId: string, deltaTicks: number, deltaTracks: number) => void;
  
  /** Callback when a clip is resized */
  onClipResize?: (clipId: string, edge: 'start' | 'end', deltaTicks: number) => void;
  
  /** Callback when timeline is clicked (seek) */
  onTimelineClick?: (tick: number) => void;
  
  /** Callback when playhead is dragged */
  onPlayheadDrag?: (tick: number) => void;
  
  /** View configuration */
  config?: Partial<ArrangeConfig>;
  
  /** Waveform data for audio clips */
  waveforms?: Map<string, Float32Array>;
  
  /** Custom class name */
  className?: string;
  
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * Default arrange view configuration
 */
const defaultConfig: ArrangeConfig = {
  showMinorGrid: true,
  showBarNumbers: true,
  snapToGrid: true,
  snapDivision: 4,
  showClipNames: true,
  showWaveforms: true,
  showAutomation: true,
  showLoopBraces: true,
  minZoom: 0.01,
  maxZoom: 10,
  minTrackHeight: 32,
  maxTrackHeight: 256,
};

/**
 * Arrange view component
 * 
 * @example
 * ```tsx
 * <ArrangeView
 *   project={project}
 *   transport={transport}
 *   onSelectionChange={(tracks, clips) => setSelection({ tracks, clips })}
 *   onTimelineClick={(tick) => transport.seek(tick)}
 * />
 * ```
 */
export function ArrangeView({
  project,
  transport,
  selectedTrackIds = new Set(),
  selectedClipIds = new Set(),
  onSelectionChange,
  onClipClick,
  onClipDoubleClick,
  onTrackClick,
  onClipDrag,
  onClipResize,
  onTimelineClick,
  onPlayheadDrag,
  config: userConfig,
  waveforms = new Map(),
  className,
  style,
}: ArrangeViewProps): React.ReactElement {
  const config = useMemo(() => ({ ...defaultConfig, ...userConfig }), [userConfig]);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null);
  const trackHeaderCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // State
  const [viewport, setViewport] = useState<ArrangeViewport>({
    startTick: 0,
    endTick: 960 * 16, // 16 bars at 960 PPQ
    startTrackIndex: 0,
    visibleTrackCount: 10,
    pixelsPerTick: 0.1,
    trackHeight: 64,
  });
  
  // Interaction managers
  const selectionModel = useMemo(() => new SelectionModel(), []);
  const dragDropManager = useMemo(() => new DragDropManager(), []);
  const zoomController = useMemo(() => new ZoomController({
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
  }), [config.minZoom, config.maxZoom]);
  
  // Track header width
  const trackHeaderWidth = 200;
  
  // Render timeline canvas
  useEffect(() => {
    const canvas = timelineCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const rect = container.getBoundingClientRect();
    const timelineHeight = rect.height;
    const timelineWidth = rect.width - trackHeaderWidth;
    
    canvas.width = timelineWidth * window.devicePixelRatio;
    canvas.height = timelineHeight * window.devicePixelRatio;
    canvas.style.width = `${timelineWidth}px`;
    canvas.style.height = `${timelineHeight}px`;
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear
    ctx.fillStyle = DAW_COLORS.bgDark;
    ctx.fillRect(0, 0, timelineWidth, timelineHeight);
    
    // Render timeline
    const timelineRenderer = new TimelineRenderer(ctx, {
      width: timelineWidth,
      height: timelineHeight,
      viewport,
      config,
    });
    
    timelineRenderer.render();
    
    // Render clips
    const clipRenderer = new ClipRenderer(ctx, {
      width: timelineWidth,
      height: timelineHeight,
      viewport,
      tracks: project.tracks,
      selectedClipIds,
      waveforms,
      config,
    });
    
    clipRenderer.render();
    
    // Render playhead
    const playheadX = (transport.currentTick - viewport.startTick) * viewport.pixelsPerTick;
    if (playheadX >= 0 && playheadX <= timelineWidth) {
      ctx.strokeStyle = DAW_COLORS.playhead;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, timelineHeight);
      ctx.stroke();
      
      // Playhead handle
      ctx.fillStyle = DAW_COLORS.playhead;
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 8);
      ctx.fill();
    }
    
    // Render loop braces
    if (config.showLoopBraces && transport.looping) {
      const loopStartX = (transport.loopStartTick - viewport.startTick) * viewport.pixelsPerTick;
      const loopEndX = (transport.loopEndTick - viewport.startTick) * viewport.pixelsPerTick;
      
      if (loopStartX >= 0 && loopStartX <= timelineWidth) {
        ctx.strokeStyle = DAW_COLORS.accentGreen;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(loopStartX, 0);
        ctx.lineTo(loopStartX, timelineHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      if (loopEndX >= 0 && loopEndX <= timelineWidth) {
        ctx.strokeStyle = DAW_COLORS.accentGreen;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(loopEndX, 0);
        ctx.lineTo(loopEndX, timelineHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [project, transport, viewport, config, selectedClipIds, waveforms, trackHeaderWidth]);
  
  // Render track headers
  useEffect(() => {
    const canvas = trackHeaderCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = container.getBoundingClientRect();
    const headerHeight = rect.height;
    
    canvas.width = trackHeaderWidth * window.devicePixelRatio;
    canvas.height = headerHeight * window.devicePixelRatio;
    canvas.style.width = `${trackHeaderWidth}px`;
    canvas.style.height = `${headerHeight}px`;
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const headerRenderer = new TrackHeaderRenderer(ctx, {
      width: trackHeaderWidth,
      height: headerHeight,
      viewport,
      tracks: project.tracks,
      selectedTrackIds,
    });
    
    headerRenderer.render();
  }, [project, viewport, selectedTrackIds, trackHeaderWidth]);
  
  // Handle mouse wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom horizontally
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setViewport(prev => ({
        ...prev,
        pixelsPerTick: Math.max(config.minZoom, Math.min(config.maxZoom, prev.pixelsPerTick * zoomFactor)),
      }));
    } else if (e.shiftKey) {
      // Scroll horizontally
      const deltaTicks = e.deltaY / viewport.pixelsPerTick;
      setViewport(prev => ({
        ...prev,
        startTick: Math.max(0, prev.startTick + deltaTicks),
      }));
    } else {
      // Scroll vertically
      const deltaTracks = Math.sign(e.deltaY);
      setViewport(prev => ({
        ...prev,
        startTrackIndex: Math.max(0, prev.startTrackIndex + deltaTracks),
      }));
    }
  }, [config.minZoom, config.maxZoom, viewport.pixelsPerTick]);
  
  // Handle timeline click
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    const rect = timelineCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const tick = viewport.startTick + x / viewport.pixelsPerTick;
    
    onTimelineClick?.(Math.round(tick));
  }, [viewport, onTimelineClick]);
  
  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...styles.container,
        ...style,
      }}
    >
      {/* Timeline ruler */}
      <div style={styles.ruler}>
        <div style={{ width: trackHeaderWidth, ...styles.rulerCorner }} />
        <div style={styles.rulerTimeline} />
      </div>
      
      {/* Main content */}
      <div style={styles.mainContent}>
        {/* Track headers */}
        <canvas
          ref={trackHeaderCanvasRef}
          style={styles.trackHeaderCanvas}
        />
        
        {/* Timeline */}
        <canvas
          ref={timelineCanvasRef}
          style={styles.timelineCanvas}
          onWheel={handleWheel}
          onClick={handleTimelineClick}
        />
      </div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: DAW_COLORS.bgDark,
    overflow: 'hidden',
  },
  ruler: {
    display: 'flex',
    height: '28px',
    backgroundColor: DAW_COLORS.bgMedium,
    borderBottom: `1px solid ${DAW_COLORS.borderDefault}`,
  },
  rulerCorner: {
    borderRight: `1px solid ${DAW_COLORS.borderDefault}`,
  },
  rulerTimeline: {
    flex: 1,
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  trackHeaderCanvas: {
    flexShrink: 0,
    backgroundColor: DAW_COLORS.bgMedium,
    borderRight: `1px solid ${DAW_COLORS.borderDefault}`,
  },
  timelineCanvas: {
    flex: 1,
    cursor: 'crosshair',
  },
};
