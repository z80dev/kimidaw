/**
 * Envelope Editor Component
 * Clip envelope/automation editing
 */

import React, { useState, useCallback } from 'react';
import type { AudioClip, MidiClip, AutomationPoint, AutomationLane } from '@daw/project-schema';
import type { EnvelopeLane, EnvelopeTarget } from './types.js';

interface EnvelopeEditorProps {
  clip: AudioClip | MidiClip;
  automationLanes?: AutomationLane[];
  ppq?: number;
  onLaneChange?: (lanes: AutomationLane[]) => void;
}

export const EnvelopeEditor: React.FC<EnvelopeEditorProps> = ({
  clip,
  automationLanes = [],
  ppq = 960,
  onLaneChange
}) => {
  const [selectedLaneId, setSelectedLaneId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'pencil' | 'line'>('select');
  const [isDrawing, setIsDrawing] = useState(false);

  // Create default envelope lanes
  const defaultLanes: EnvelopeLane[] = [
    { id: 'vol', name: 'Volume', target: { type: 'volume' }, color: '#FFA500', isVisible: true, isEditing: false },
    { id: 'pan', name: 'Pan', target: { type: 'pan' }, color: '#00CED1', isVisible: true, isEditing: false },
    { id: 'send-a', name: 'Send A', target: { type: 'send', sendIndex: 0 }, color: '#9370DB', isVisible: false, isEditing: false },
    { id: 'send-b', name: 'Send B', target: { type: 'send', sendIndex: 1 }, color: '#9370DB', isVisible: false, isEditing: false }
  ];

  const [envelopeLanes, setEnvelopeLanes] = useState<EnvelopeLane[]>(defaultLanes);

  const toggleLaneVisibility = (laneId: string) => {
    setEnvelopeLanes(prev => prev.map(lane =>
      lane.id === laneId ? { ...lane, isVisible: !lane.isVisible } : lane
    ));
  };

  const selectLane = (laneId: string) => {
    setSelectedLaneId(laneId);
    setEnvelopeLanes(prev => prev.map(lane => ({
      ...lane,
      isEditing: lane.id === laneId
    })));
  };

  const addPoint = (laneId: string, tick: number, value: number) => {
    // In real implementation, add automation point to lane
  };

  const deletePoint = (laneId: string, pointIndex: number) => {
    // In real implementation, remove automation point
  };

  const clearLane = (laneId: string) => {
    // In real implementation, clear all points in lane
  };

  return (
    <div className="envelope-editor">
      {/* Toolbar */}
      <div className="envelope-toolbar">
        <div className="tool-group">
          <button
            className={tool === 'select' ? 'active' : ''}
            onClick={() => setTool('select')}
          >
            Select
          </button>
          <button
            className={tool === 'pencil' ? 'active' : ''}
            onClick={() => setTool('pencil')}
          >
            Pencil
          </button>
          <button
            className={tool === 'line' ? 'active' : ''}
            onClick={() => setTool('line')}
          >
            Line
          </button>
        </div>
        
        <div className="tool-group">
          <button
            onClick={() => selectedLaneId && clearLane(selectedLaneId)}
            disabled={!selectedLaneId}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Lane Selector */}
      <div className="lane-selector">
        <h4>Envelopes</h4>
        {envelopeLanes.map(lane => (
          <div
            key={lane.id}
            className={`lane-item ${lane.isEditing ? 'selected' : ''}`}
            onClick={() => selectLane(lane.id)}
          >
            <input
              type="checkbox"
              checked={lane.isVisible}
              onChange={(e) => {
                e.stopPropagation();
                toggleLaneVisibility(lane.id);
              }}
            />
            <span
              className="lane-color"
              style={{ backgroundColor: lane.color }}
            />
            <span className="lane-name">{lane.name}</span>
          </div>
        ))}
      </div>

      {/* Envelope Display */}
      <div className="envelope-display">
        {envelopeLanes.filter(l => l.isVisible).map(lane => (
          <div key={lane.id} className="envelope-lane">
            <div className="lane-header">
              <span style={{ color: lane.color }}>{lane.name}</span>
            </div>
            <canvas
              className="envelope-canvas"
              width={800}
              height={100}
              onMouseDown={(e) => {
                setIsDrawing(true);
                // Calculate tick and value from mouse position
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const tick = (x / rect.width) * ppq * 4; // 4 bars
                const y = e.clientY - rect.top;
                const value = 1 - (y / rect.height); // 0-1 range
                
                if (tool === 'pencil') {
                  addPoint(lane.id, tick, value);
                }
              }}
              onMouseMove={(e) => {
                if (isDrawing && tool === 'pencil') {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const tick = (x / rect.width) * ppq * 4;
                  const y = e.clientY - rect.top;
                  const value = 1 - (y / rect.height);
                  addPoint(lane.id, tick, value);
                }
              }}
              onMouseUp={() => setIsDrawing(false)}
              onMouseLeave={() => setIsDrawing(false)}
            />
          </div>
        ))}
        
        {envelopeLanes.filter(l => l.isVisible).length === 0 && (
          <div className="no-envelopes">
            Select an envelope to edit
          </div>
        )}
      </div>

      {/* Point Editor */}
      {selectedLaneId && (
        <div className="point-editor">
          <h4>Edit Points</h4>
          <div className="point-list">
            <p>Click on the envelope to add points</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvelopeEditor;
