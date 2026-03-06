/**
 * Piano Roll Component
 * 
 * MIDI note editor with canvas-based rendering.
 * Features:
 * - Piano keyboard display
 * - Note grid with scale highlighting
 * - Velocity lane
 * - Multiple input modes (draw, select, erase)
 * - Scale/fold modes
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { MidiClip, MidiNote } from '@daw/project-schema';
import { DAW_COLORS, DAW_TYPOGRAPHY, DAW_SPACING } from '@daw/ui-shell';
import { GridRenderer } from './canvas/GridRenderer.js';
import { NoteRenderer } from './canvas/NoteRenderer.js';
import { VelocityRenderer } from './canvas/VelocityRenderer.js';
import { NoteEditor } from './editing/NoteEditor.js';
import type { PianoRollConfig, PianoRollViewport, NoteInputMode, ScaleMode } from './types.js';
import { SCALE_PATTERNS, isPitchInScale, isBlackKey, getNoteName } from './types.js';

/**
 * Props for PianoRoll
 */
export interface PianoRollProps {
  /** MIDI clip to edit */
  clip: MidiClip | null;
  
  /** Currently selected note IDs */
  selectedNoteIds?: Set<string>;
  
  /** Callback when notes are modified */
  onNotesChange?: (notes: MidiNote[]) => void;
  
  /** Callback when selection changes */
  onSelectionChange?: (noteIds: Set<string>) => void;
  
  /** Callback when a note is clicked (for audition) */
  onNoteClick?: (note: MidiNote) => void;
  
  /** Current input mode */
  inputMode?: NoteInputMode;
  
  /** Scale highlighting */
  scaleRoot?: number;
  scaleMode?: ScaleMode;
  
  /** Snap settings */
  snapEnabled?: boolean;
  snapDivision?: number;
  
  /** Show velocity lane */
  showVelocity?: boolean;
  
  /** Piano key width */
  pianoKeyWidth?: number;
  
  /** Custom class name */
  className?: string;
  
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * Default piano roll configuration
 */
const defaultConfig: PianoRollConfig = {
  showPianoKeys: true,
  showVelocity: true,
  velocityHeight: 80,
  showScaleHighlight: true,
  scaleRoot: 0,
  scaleMode: 'major',
  showKeyLabels: true,
  snapToGrid: true,
  snapDivision: 4,
  foldMode: false,
  drumMode: false,
  minZoom: 0.01,
  maxZoom: 10,
};

/**
 * Piano roll component
 */
export function PianoRoll({
  clip,
  selectedNoteIds = new Set(),
  onNotesChange,
  onSelectionChange,
  onNoteClick,
  inputMode = 'select',
  scaleRoot = 0,
  scaleMode = 'chromatic',
  snapEnabled = true,
  snapDivision = 4,
  showVelocity = true,
  pianoKeyWidth = 60,
  className,
  style,
}: PianoRollProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const noteCanvasRef = useRef<HTMLCanvasElement>(null);
  const velocityCanvasRef = useRef<HTMLCanvasElement>(null);
  const pianoCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Viewport state
  const [viewport, setViewport] = useState<PianoRollViewport>({
    startTick: 0,
    endTick: 960 * 4,
    minPitch: 36,
    maxPitch: 96,
    pixelsPerTick: 0.2,
    pixelsPerSemitone: 16,
  });
  
  // Editor state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Config
  const config = useMemo(() => ({
    ...defaultConfig,
    showVelocity,
    snapToGrid: snapEnabled,
    snapDivision,
    scaleRoot,
    scaleMode,
  }), [showVelocity, snapEnabled, snapDivision, scaleRoot, scaleMode]);
  
  // Note editor
  const noteEditor = useMemo(() => new NoteEditor({
    snapGrid: 960 / snapDivision,
    onChange: onNotesChange,
  }), [snapDivision, onNotesChange]);
  
  // Calculate dimensions
  const gridHeight = useMemo(() => {
    return (viewport.maxPitch - viewport.minPitch + 1) * viewport.pixelsPerSemitone;
  }, [viewport]);
  
  const velocityHeight = showVelocity ? config.velocityHeight : 0;
  const totalHeight = gridHeight + velocityHeight;
  
  // Render piano keys
  useEffect(() => {
    const canvas = pianoCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = pianoKeyWidth * window.devicePixelRatio;
    canvas.height = gridHeight * window.devicePixelRatio;
    canvas.style.width = `${pianoKeyWidth}px`;
    canvas.style.height = `${gridHeight}px`;
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear
    ctx.fillStyle = DAW_COLORS.bgMedium;
    ctx.fillRect(0, 0, pianoKeyWidth, gridHeight);
    
    // Draw keys
    for (let pitch = viewport.minPitch; pitch <= viewport.maxPitch; pitch++) {
      const y = (viewport.maxPitch - pitch) * viewport.pixelsPerSemitone;
      const isBlack = isBlackKey(pitch);
      const inScale = isPitchInScale(pitch, scaleRoot, scaleMode);
      
      // Key background
      ctx.fillStyle = isBlack ? DAW_COLORS.bgDark : DAW_COLORS.bgLight;
      ctx.fillRect(0, y, pianoKeyWidth, viewport.pixelsPerSemitone);
      
      // Scale highlighting
      if (inScale && config.showScaleHighlight) {
        ctx.fillStyle = 'rgba(74, 158, 255, 0.1)';
        ctx.fillRect(0, y, pianoKeyWidth, viewport.pixelsPerSemitone);
      }
      
      // Key border
      ctx.strokeStyle = DAW_COLORS.borderDefault;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + viewport.pixelsPerSemitone - 0.5);
      ctx.lineTo(pianoKeyWidth, y + viewport.pixelsPerSemitone - 0.5);
      ctx.stroke();
      
      // Black keys
      if (isBlack) {
        ctx.fillStyle = DAW_COLORS.bgDarkest;
        ctx.fillRect(pianoKeyWidth - 40, y + 2, 36, viewport.pixelsPerSemitone - 4);
      }
      
      // Note labels for C keys
      if (pitch % 12 === 0 && config.showKeyLabels) {
        const octave = Math.floor(pitch / 12) - 1;
        ctx.font = `${DAW_TYPOGRAPHY.sizeXs} ${DAW_TYPOGRAPHY.fontFamilySans}`;
        ctx.fillStyle = DAW_COLORS.textSecondary;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`C${octave}`, 8, y + viewport.pixelsPerSemitone / 2);
      }
    }
  }, [viewport, pianoKeyWidth, scaleRoot, scaleMode, config]);
  
  // Render grid
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = container.clientWidth - pianoKeyWidth;
    
    canvas.width = width * window.devicePixelRatio;
    canvas.height = gridHeight * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${gridHeight}px`;
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const renderer = new GridRenderer(ctx, {
      width,
      height: gridHeight,
      viewport,
      config,
    });
    
    renderer.render();
  }, [viewport, gridHeight, config]);
  
  // Render notes
  useEffect(() => {
    const canvas = noteCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !clip) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = container.clientWidth - pianoKeyWidth;
    
    canvas.width = width * window.devicePixelRatio;
    canvas.height = gridHeight * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${gridHeight}px`;
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const renderer = new NoteRenderer(ctx, {
      width,
      height: gridHeight,
      viewport,
      notes: clip.notes,
      selectedNoteIds,
      config,
    });
    
    renderer.render();
  }, [clip, viewport, gridHeight, selectedNoteIds, config]);
  
  // Render velocity
  useEffect(() => {
    if (!showVelocity) return;
    
    const canvas = velocityCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !clip) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = container.clientWidth - pianoKeyWidth;
    
    canvas.width = width * window.devicePixelRatio;
    canvas.height = config.velocityHeight * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${config.velocityHeight}px`;
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const renderer = new VelocityRenderer(ctx, {
      width,
      height: config.velocityHeight,
      viewport,
      notes: clip.notes,
      selectedNoteIds,
    });
    
    renderer.render();
  }, [clip, viewport, showVelocity, config.velocityHeight, selectedNoteIds]);
  
  // Handle mouse interactions
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!clip) return;
    
    const rect = noteCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x, y });
    
    // Convert to tick/pitch
    const tick = viewport.startTick + x / viewport.pixelsPerTick;
    const pitch = viewport.maxPitch - Math.floor(y / viewport.pixelsPerSemitone);
    
    // Handle based on input mode
    switch (inputMode) {
      case 'draw':
        noteEditor.startDraw(tick, pitch, clip);
        break;
      case 'select':
        // Check if clicking on a note
        const clickedNote = clip.notes.find(n => 
          tick >= n.startTick && 
          tick < n.startTick + n.duration &&
          pitch === n.pitch
        );
        
        if (clickedNote) {
          if (e.shiftKey) {
            onSelectionChange?.(new Set([...selectedNoteIds, clickedNote.id]));
          } else {
            onSelectionChange?.(new Set([clickedNote.id]));
          }
          onNoteClick?.(clickedNote);
        } else {
          if (!e.shiftKey) {
            onSelectionChange?.(new Set());
          }
        }
        break;
      case 'erase':
        noteEditor.eraseAt(tick, pitch, clip, onNotesChange);
        break;
    }
  }, [clip, viewport, inputMode, selectedNoteIds, noteEditor, onSelectionChange, onNoteClick, onNotesChange]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !clip) return;
    
    const rect = noteCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const tick = viewport.startTick + x / viewport.pixelsPerTick;
    const pitch = viewport.maxPitch - Math.floor(y / viewport.pixelsPerSemitone);
    
    if (inputMode === 'draw') {
      noteEditor.updateDraw(tick, pitch);
    }
  }, [isDragging, clip, viewport, inputMode, noteEditor]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    noteEditor.endDraw();
  }, [noteEditor]);
  
  // Handle wheel for zoom/pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom horizontally
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setViewport(prev => ({
        ...prev,
        pixelsPerTick: Math.max(0.01, Math.min(10, prev.pixelsPerTick * factor)),
      }));
    } else if (e.shiftKey) {
      // Pan horizontally
      const deltaTicks = e.deltaY / viewport.pixelsPerTick;
      setViewport(prev => ({
        ...prev,
        startTick: Math.max(0, prev.startTick + deltaTicks),
      }));
    } else {
      // Pan vertically
      const deltaPitch = Math.sign(e.deltaY) * 2;
      setViewport(prev => ({
        ...prev,
        minPitch: Math.max(0, prev.minPitch - deltaPitch),
        maxPitch: Math.min(127, prev.maxPitch - deltaPitch),
      }));
    }
  }, [viewport.pixelsPerTick]);
  
  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...styles.container,
        ...style,
      }}
    >
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarGroup}>
          <button style={inputMode === 'select' ? styles.toolActive : styles.tool} title="Select">↖</button>
          <button style={inputMode === 'draw' ? styles.toolActive : styles.tool} title="Draw">✏️</button>
          <button style={inputMode === 'erase' ? styles.toolActive : styles.tool} title="Erase">🗑️</button>
        </div>
        <div style={styles.toolbarGroup}>
          <span style={styles.info}>
            {clip ? `${clip.notes.length} notes` : 'No clip'}
          </span>
        </div>
      </div>
      
      {/* Main editor */}
      <div style={styles.editor}>
        {/* Piano keys */}
        <canvas
          ref={pianoCanvasRef}
          style={styles.pianoCanvas}
        />
        
        {/* Note grid */}
        <div style={styles.gridContainer}>
          <canvas
            ref={gridCanvasRef}
            style={styles.gridCanvas}
          />
          <canvas
            ref={noteCanvasRef}
            style={styles.noteCanvas}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
        </div>
      </div>
      
      {/* Velocity lane */}
      {showVelocity && (
        <div style={styles.velocityContainer}>
          <div style={{ width: pianoKeyWidth, ...styles.velocityLabel }}>VEL</div>
          <canvas
            ref={velocityCanvasRef}
            style={styles.velocityCanvas}
          />
        </div>
      )}
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
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[4],
    padding: `${DAW_SPACING[2]} ${DAW_SPACING[3]}`,
    backgroundColor: DAW_COLORS.bgMedium,
    borderBottom: `1px solid ${DAW_COLORS.borderDefault}`,
  },
  toolbarGroup: {
    display: 'flex',
    gap: DAW_SPACING[1],
  },
  tool: {
    padding: `${DAW_SPACING[1]} ${DAW_SPACING[2]}`,
    backgroundColor: DAW_COLORS.bgDark,
    border: `1px solid ${DAW_COLORS.borderDefault}`,
    borderRadius: '3px',
    cursor: 'pointer',
  },
  toolActive: {
    padding: `${DAW_SPACING[1]} ${DAW_SPACING[2]}`,
    backgroundColor: DAW_COLORS.accentBlue,
    border: `1px solid ${DAW_COLORS.accentBlue}`,
    borderRadius: '3px',
    cursor: 'pointer',
  },
  info: {
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    color: DAW_COLORS.textSecondary,
  },
  editor: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  pianoCanvas: {
    flexShrink: 0,
    backgroundColor: DAW_COLORS.bgMedium,
    borderRight: `1px solid ${DAW_COLORS.borderDefault}`,
  },
  gridContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'auto',
  },
  gridCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  noteCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    cursor: 'crosshair',
  },
  velocityContainer: {
    display: 'flex',
    height: '80px',
    borderTop: `1px solid ${DAW_COLORS.borderDefault}`,
    backgroundColor: DAW_COLORS.bgMedium,
  },
  velocityLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DAW_COLORS.bgMedium,
    borderRight: `1px solid ${DAW_COLORS.borderDefault}`,
    fontSize: DAW_TYPOGRAPHY.sizeXs,
    color: DAW_COLORS.textTertiary,
  },
  velocityCanvas: {
    flex: 1,
  },
};
