/**
 * Clip Detail View Component
 * Main container for clip editing
 */

import React, { useState, useCallback } from 'react';
import type { AudioClip, MidiClip } from '@daw/project-schema';
import type { DetailViewState, DetailViewTab } from './types.js';

interface ClipDetailViewProps {
  clip: AudioClip | MidiClip | null;
  onClipChange?: (clip: AudioClip | MidiClip) => void;
  sampleRate?: number;
  ppq?: number;
}

export const ClipDetailView: React.FC<ClipDetailViewProps> = ({
  clip,
  onClipChange,
  sampleRate = 44100,
  ppq = 960
}) => {
  const [state, setState] = useState<DetailViewState>({
    activeTab: 'clip',
    selectedClipId: clip?.id || null,
    zoom: { horizontal: 1, vertical: 1 },
    scrollPosition: { x: 0, y: 0 },
    showGrid: true,
    snapToGrid: true,
    gridDivision: 240 // 16th note
  });

  const handleTabChange = useCallback((tab: DetailViewTab) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const isAudioClip = clip && 'assetId' in clip;
  const isMidiClip = clip && 'notes' in clip;

  if (!clip) {
    return (
      <div className="clip-detail-view empty">
        <div className="empty-message">
          Select a clip to edit
        </div>
      </div>
    );
  }

  return (
    <div className="clip-detail-view">
      {/* Tab Bar */}
      <div className="detail-tabs">
        <button
          className={`tab ${state.activeTab === 'clip' ? 'active' : ''}`}
          onClick={() => handleTabChange('clip')}
        >
          Clip
        </button>
        {isAudioClip && (
          <button
            className={`tab ${state.activeTab === 'sample' ? 'active' : ''}`}
            onClick={() => handleTabChange('sample')}
          >
            Sample
          </button>
        )}
        {isMidiClip && (
          <button
            className={`tab ${state.activeTab === 'midi' ? 'active' : ''}`}
            onClick={() => handleTabChange('midi')}
          >
            MIDI
          </button>
        )}
        <button
          className={`tab ${state.activeTab === 'envelopes' ? 'active' : ''}`}
          onClick={() => handleTabChange('envelopes')}
        >
          Envelopes
        </button>
        <button
          className={`tab ${state.activeTab === 'launch' ? 'active' : ''}`}
          onClick={() => handleTabChange('launch')}
        >
          Launch
        </button>
      </div>

      {/* Toolbar */}
      <div className="detail-toolbar">
        <div className="tool-group">
          <button className="tool-btn">Selector</button>
          <button className="tool-btn">Pencil</button>
          <button className="tool-btn">Scissors</button>
        </div>
        <div className="tool-group">
          <label>
            <input
              type="checkbox"
              checked={state.showGrid}
              onChange={(e) => setState(prev => ({ 
                ...prev, 
                showGrid: e.target.checked 
              }))}
            />
            Grid
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.snapToGrid}
              onChange={(e) => setState(prev => ({ 
                ...prev, 
                snapToGrid: e.target.checked 
              }))}
            />
            Snap
          </label>
        </div>
        <div className="tool-group">
          <span>Zoom:</span>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={state.zoom.horizontal}
            onChange={(e) => setState(prev => ({
              ...prev,
              zoom: { ...prev.zoom, horizontal: parseFloat(e.target.value) }
            }))}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="detail-content">
        {state.activeTab === 'clip' && (
          <div className="clip-tab">
            {isAudioClip && (
              <AudioClipDisplay clip={clip as AudioClip} sampleRate={sampleRate} />
            )}
            {isMidiClip && (
              <MidiClipDisplay clip={clip as MidiClip} ppq={ppq} />
            )}
          </div>
        )}
        
        {state.activeTab === 'sample' && isAudioClip && (
          <div className="sample-tab">
            <SampleEditor clip={clip as AudioClip} sampleRate={sampleRate} />
          </div>
        )}
        
        {state.activeTab === 'midi' && isMidiClip && (
          <div className="midi-tab">
            <MidiDetailView clip={clip as MidiClip} ppq={ppq} />
          </div>
        )}
        
        {state.activeTab === 'envelopes' && (
          <div className="envelopes-tab">
            <EnvelopeEditor clip={clip} ppq={ppq} />
          </div>
        )}
        
        {state.activeTab === 'launch' && (
          <div className="launch-tab">
            <LaunchSettings clip={clip} />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="detail-status">
        <span>Clip: {clip.id.slice(0, 8)}</span>
        <span>Duration: {getClipDuration(clip, ppq).toFixed(3)}s</span>
        {isAudioClip && <span>Audio</span>}
        {isMidiClip && <span>MIDI</span>}
      </div>
    </div>
  );
};

// Sub-components
const AudioClipDisplay: React.FC<{ clip: AudioClip; sampleRate: number }> = ({
  clip,
  sampleRate
}) => {
  const duration = (clip.sourceEndSample - clip.sourceStartSample) / sampleRate;
  
  return (
    <div className="audio-clip-display">
      <div className="clip-info">
        <div className="info-row">
          <label>Start Sample:</label>
          <span>{clip.sourceStartSample}</span>
        </div>
        <div className="info-row">
          <label>End Sample:</label>
          <span>{clip.sourceEndSample}</span>
        </div>
        <div className="info-row">
          <label>Duration:</label>
          <span>{duration.toFixed(3)}s</span>
        </div>
        <div className="info-row">
          <label>Gain:</label>
          <span>{clip.gainDb.toFixed(1)}dB</span>
        </div>
        <div className="info-row">
          <label>Transpose:</label>
          <span>{clip.transposeSemitones} semitones</span>
        </div>
        {clip.reverse && (
          <div className="info-row">
            <label>Reversed</label>
          </div>
        )}
      </div>
      
      {/* Waveform placeholder */}
      <div className="waveform-container">
        <canvas className="waveform-canvas" />
      </div>
    </div>
  );
};

const MidiClipDisplay: React.FC<{ clip: MidiClip; ppq: number }> = ({
  clip,
  ppq
}) => {
  const numNotes = clip.notes.length;
  const duration = (clip.endTick - clip.startTick) / ppq * (60 / 120); // Assuming 120 BPM
  
  return (
    <div className="midi-clip-display">
      <div className="clip-info">
        <div className="info-row">
          <label>Notes:</label>
          <span>{numNotes}</span>
        </div>
        <div className="info-row">
          <label>Duration:</label>
          <span>{duration.toFixed(3)}s</span>
        </div>
        {clip.loop && (
          <div className="info-row">
            <label>Loop:</label>
            <span>Enabled</span>
          </div>
        )}
      </div>
      
      {/* Piano roll placeholder */}
      <div className="piano-roll-container">
        <canvas className="piano-roll-canvas" />
      </div>
    </div>
  );
};

// Placeholder imports
import { SampleEditor } from './SampleEditor.js';
import { MidiDetailView } from './MidiDetailView.js';
import { EnvelopeEditor } from './EnvelopeEditor.js';
import { LaunchSettings } from './LaunchSettings.js';

// Utility function
function getClipDuration(clip: AudioClip | MidiClip, ppq: number): number {
  if ('sourceStartSample' in clip) {
    // Audio clip - need sample rate, using default
    return (clip.sourceEndSample - clip.sourceStartSample) / 44100;
  } else {
    // MIDI clip
    return (clip.endTick - clip.startTick) / ppq * (60 / 120);
  }
}

export default ClipDetailView;
