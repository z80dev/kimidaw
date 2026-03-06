/**
 * MIDI Detail View Component
 * MIDI clip editing: notes, velocity, controllers
 */

import React, { useState, useMemo } from 'react';
import type { MidiClip, MidiNote } from '@daw/project-schema';
import type { MidiEditorState, FoldMode, ScaleHighlight, ScaleMode } from './types.js';

interface MidiDetailViewProps {
  clip: MidiClip;
  ppq?: number;
  onClipChange?: (clip: MidiClip) => void;
}

export const MidiDetailView: React.FC<MidiDetailViewProps> = ({
  clip,
  ppq = 960,
  onClipChange
}) => {
  const [state, setState] = useState<MidiEditorState>({
    showVelocity: true,
    showModulation: false,
    showPitchBend: false,
    showAftertouch: false,
    showNoteNames: true,
    foldMode: 'none',
    scaleHighlight: null
  });

  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());

  // Calculate note statistics
  const stats = useMemo(() => {
    const notes = clip.notes;
    if (notes.length === 0) {
      return { count: 0, minNote: 0, maxNote: 0, avgVelocity: 0 };
    }

    const pitches = notes.map(n => n.pitch);
    const velocities = notes.map(n => n.velocity);

    return {
      count: notes.length,
      minNote: Math.min(...pitches),
      maxNote: Math.max(...pitches),
      avgVelocity: velocities.reduce((a, b) => a + b, 0) / velocities.length
    };
  }, [clip.notes]);

  // Get unique pitch classes for fold-to-used
  const usedPitches = useMemo(() => {
    const pitches = new Set(clip.notes.map(n => n.pitch));
    return Array.from(pitches).sort((a, b) => a - b);
  }, [clip.notes]);

  const handleFoldModeChange = (mode: FoldMode) => {
    setState(prev => ({ ...prev, foldMode: mode }));
  };

  const handleScaleHighlight = (rootNote: number, mode: ScaleMode) => {
    setState(prev => ({
      ...prev,
      scaleHighlight: { rootNote, mode }
    }));
  };

  const clearScaleHighlight = () => {
    setState(prev => ({ ...prev, scaleHighlight: null }));
  };

  const selectAllNotes = () => {
    setSelectedNotes(new Set(clip.notes.map(n => n.id)));
  };

  const deselectAllNotes = () => {
    setSelectedNotes(new Set());
  };

  const deleteSelectedNotes = () => {
    if (selectedNotes.size === 0) return;
    
    const newNotes = clip.notes.filter(n => !selectedNotes.has(n.id));
    onClipChange?.({
      ...clip,
      notes: newNotes
    });
    setSelectedNotes(new Set());
  };

  return (
    <div className="midi-detail-view">
      {/* Toolbar */}
      <div className="midi-toolbar">
        <div className="tool-group">
          <label>Fold:</label>
          <select
            value={state.foldMode}
            onChange={(e) => handleFoldModeChange(e.target.value as FoldMode)}
          >
            <option value="none">None</option>
            <option value="to-scale">To Scale</option>
            <option value="to-used">To Used</option>
          </select>
        </div>

        <div className="tool-group">
          <label>Scale:</label>
          <select
            value={state.scaleHighlight?.mode || ''}
            onChange={(e) => {
              if (e.target.value) {
                handleScaleHighlight(state.scaleHighlight?.rootNote || 60, e.target.value as ScaleMode);
              } else {
                clearScaleHighlight();
              }
            }}
          >
            <option value="">None</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
            <option value="dorian">Dorian</option>
            <option value="phrygian">Phrygian</option>
            <option value="lydian">Lydian</option>
            <option value="mixolydian">Mixolydian</option>
            <option value="pentatonic-major">Pentatonic Major</option>
            <option value="pentatonic-minor">Pentatonic Minor</option>
            <option value="blues">Blues</option>
          </select>
        </div>

        <div className="tool-group">
          <label>
            <input
              type="checkbox"
              checked={state.showVelocity}
              onChange={(e) => setState(prev => ({ 
                ...prev, 
                showVelocity: e.target.checked 
              }))}
            />
            Velocity
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.showNoteNames}
              onChange={(e) => setState(prev => ({ 
                ...prev, 
                showNoteNames: e.target.checked 
              }))}
            />
            Note Names
          </label>
        </div>

        <div className="tool-group">
          <button onClick={selectAllNotes}>Select All</button>
          <button onClick={deselectAllNotes}>Deselect</button>
          <button onClick={deleteSelectedNotes}>Delete</button>
        </div>
      </div>

      {/* Note Statistics */}
      <div className="midi-stats">
        <div className="stat">
          <span className="stat-label">Notes:</span>
          <span className="stat-value">{stats.count}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Range:</span>
          <span className="stat-value">
            {state.showNoteNames 
              ? `${noteNumberToName(stats.minNote)} - ${noteNumberToName(stats.maxNote)}`
              : `${stats.minNote} - ${stats.maxNote}`
            }
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Avg Velocity:</span>
          <span className="stat-value">{Math.round(stats.avgVelocity)}</span>
        </div>
        {state.foldMode === 'to-used' && (
          <div className="stat">
            <span className="stat-label">Unique Pitches:</span>
            <span className="stat-value">{usedPitches.length}</span>
          </div>
        )}
      </div>

      {/* Note List */}
      <div className="note-list">
        <table>
          <thead>
            <tr>
              <th>Note</th>
              <th>Start</th>
              <th>Duration</th>
              <th>Velocity</th>
            </tr>
          </thead>
          <tbody>
            {clip.notes.slice(0, 100).map(note => (
              <tr
                key={note.id}
                className={selectedNotes.has(note.id) ? 'selected' : ''}
                onClick={() => {
                  const newSelected = new Set(selectedNotes);
                  if (newSelected.has(note.id)) {
                    newSelected.delete(note.id);
                  } else {
                    newSelected.add(note.id);
                  }
                  setSelectedNotes(newSelected);
                }}
              >
                <td>
                  {state.showNoteNames 
                    ? noteNumberToName(note.pitch)
                    : note.pitch
                  }
                </td>
                <td>{(note.startTick / ppq).toFixed(2)}</td>
                <td>{(note.durationTicks / ppq).toFixed(2)}</td>
                <td>{note.velocity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {clip.notes.length > 100 && (
          <div className="note-list-truncated">
            ... and {clip.notes.length - 100} more notes
          </div>
        )}
      </div>

      {/* Velocity Editor */}
      {state.showVelocity && clip.notes.length > 0 && (
        <div className="velocity-editor">
          <h4>Velocity</h4>
          <div className="velocity-bars">
            {clip.notes.slice(0, 50).map(note => (
              <div
                key={note.id}
                className="velocity-bar"
                style={{ height: `${(note.velocity / 127) * 100}%` }}
                title={`Velocity: ${note.velocity}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Utility function to convert note number to name
function noteNumberToName(noteNumber: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(noteNumber / 12) - 1;
  const noteName = names[noteNumber % 12];
  return `${noteName}${octave}`;
}

export default MidiDetailView;
