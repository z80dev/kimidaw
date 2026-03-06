/**
 * Sample Editor Component
 * Audio clip editing: warp, gain, transpose, etc.
 */

import React, { useState, useCallback } from 'react';
import type { AudioClip } from '@daw/project-schema';
import type { SampleEditorState, WarpMode } from './types.js';

interface SampleEditorProps {
  clip: AudioClip;
  sampleRate?: number;
  onClipChange?: (clip: AudioClip) => void;
}

export const SampleEditor: React.FC<SampleEditorProps> = ({
  clip,
  sampleRate = 44100,
  onClipChange
}) => {
  const [state, setState] = useState<SampleEditorState>({
    warpMode: clip.warp?.mode || 'repitch',
    transposeSemitones: clip.transposeSemitones,
    detuneCents: clip.fineTuneCents,
    gainDb: clip.gainDb,
    reverse: clip.reverse,
    showTransientMarkers: true,
    showWarpMarkers: true,
    showGrid: true,
    selectedWarpMarker: null
  });

  const handleTransposeChange = useCallback((semitones: number) => {
    setState(prev => ({ ...prev, transposeSemitones: semitones }));
    onClipChange?.({
      ...clip,
      transposeSemitones: semitones
    });
  }, [clip, onClipChange]);

  const handleDetuneChange = useCallback((cents: number) => {
    setState(prev => ({ ...prev, detuneCents: cents }));
    onClipChange?.({
      ...clip,
      fineTuneCents: cents
    });
  }, [clip, onClipChange]);

  const handleGainChange = useCallback((db: number) => {
    setState(prev => ({ ...prev, gainDb: db }));
    onClipChange?.({
      ...clip,
      gainDb: db
    });
  }, [clip, onClipChange]);

  const handleReverseToggle = useCallback(() => {
    const newReverse = !state.reverse;
    setState(prev => ({ ...prev, reverse: newReverse }));
    onClipChange?.({
      ...clip,
      reverse: newReverse
    });
  }, [clip, onClipChange, state.reverse]);

  const handleWarpModeChange = useCallback((mode: WarpMode) => {
    setState(prev => ({ ...prev, warpMode: mode }));
    onClipChange?.({
      ...clip,
      warp: {
        ...clip.warp,
        mode
      }
    });
  }, [clip, onClipChange]);

  const warpModes: { value: WarpMode; label: string }[] = [
    { value: 'repitch', label: 'Re-Pitch' },
    { value: 'beats', label: 'Beats' },
    { value: 'tones', label: 'Tones' },
    { value: 'texture', label: 'Texture' },
    { value: 'complex', label: 'Complex' },
    { value: 'complex-pro', label: 'Complex Pro' },
    { value: 'granular', label: 'Granular' },
    { value: 'formants', label: 'Formants' }
  ];

  return (
    <div className="sample-editor">
      {/* Warp Mode */}
      <div className="editor-section">
        <h4>Warp Mode</h4>
        <select
          value={state.warpMode}
          onChange={(e) => handleWarpModeChange(e.target.value as WarpMode)}
          className="warp-mode-select"
        >
          {warpModes.map(mode => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </div>

      {/* Transpose & Detune */}
      <div className="editor-section">
        <h4>Pitch</h4>
        <div className="control-row">
          <label>Transpose:</label>
          <div className="transpose-control">
            <button onClick={() => handleTransposeChange(state.transposeSemitones - 1)}>
              -1
            </button>
            <span>{state.transposeSemitones > 0 ? '+' : ''}{state.transposeSemitones} st</span>
            <button onClick={() => handleTransposeChange(state.transposeSemitones + 1)}>
              +1
            </button>
          </div>
        </div>
        <div className="control-row">
          <label>Detune:</label>
          <input
            type="range"
            min="-100"
            max="100"
            value={state.detuneCents}
            onChange={(e) => handleDetuneChange(parseInt(e.target.value))}
          />
          <span>{state.detuneCents} cents</span>
        </div>
      </div>

      {/* Gain */}
      <div className="editor-section">
        <h4>Gain</h4>
        <div className="control-row">
          <input
            type="range"
            min="-48"
            max="24"
            step="0.1"
            value={state.gainDb}
            onChange={(e) => handleGainChange(parseFloat(e.target.value))}
          />
          <span>{state.gainDb > 0 ? '+' : ''}{state.gainDb.toFixed(1)} dB</span>
        </div>
      </div>

      {/* Reverse */}
      <div className="editor-section">
        <h4>Playback</h4>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={state.reverse}
            onChange={handleReverseToggle}
          />
          Reverse
        </label>
      </div>

      {/* Display Options */}
      <div className="editor-section">
        <h4>Display</h4>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={state.showWarpMarkers}
            onChange={(e) => setState(prev => ({ 
              ...prev, 
              showWarpMarkers: e.target.checked 
            }))}
          />
          Show Warp Markers
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={state.showTransientMarkers}
            onChange={(e) => setState(prev => ({ 
              ...prev, 
              showTransientMarkers: e.target.checked 
            }))}
          />
          Show Transients
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={state.showGrid}
            onChange={(e) => setState(prev => ({ 
              ...prev, 
              showGrid: e.target.checked 
            }))}
          />
          Show Grid
        </label>
      </div>

      {/* Sample Info */}
      <div className="editor-section sample-info">
        <h4>Sample Info</h4>
        <div className="info-row">
          <span>Start:</span>
          <span>{clip.sourceStartSample} samples</span>
        </div>
        <div className="info-row">
          <span>End:</span>
          <span>{clip.sourceEndSample} samples</span>
        </div>
        <div className="info-row">
          <span>Length:</span>
          <span>{((clip.sourceEndSample - clip.sourceStartSample) / sampleRate).toFixed(3)}s</span>
        </div>
      </div>
    </div>
  );
};

export default SampleEditor;
