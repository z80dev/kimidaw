/**
 * Launch Settings Component
 * Clip launch quantization and follow actions
 */

import React, { useState } from 'react';
import type { AudioClip, MidiClip } from '@daw/project-schema';
import type { LaunchSettingsState, LaunchQuantization, LaunchMode, FollowAction } from './types.js';

interface LaunchSettingsProps {
  clip: AudioClip | MidiClip;
  onSettingsChange?: (settings: LaunchSettingsState) => void;
}

export const LaunchSettings: React.FC<LaunchSettingsProps> = ({
  clip,
  onSettingsChange
}) => {
  const [settings, setSettings] = useState<LaunchSettingsState>({
    quantization: 'global',
    followAction: null,
    launchMode: 'trigger',
    velocitySensitivity: true,
    legato: false
  });

  const handleQuantizationChange = (quantization: LaunchQuantization) => {
    const newSettings = { ...settings, quantization };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleLaunchModeChange = (launchMode: LaunchMode) => {
    const newSettings = { ...settings, launchMode };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleFollowActionChange = (followAction: FollowAction | null) => {
    const newSettings = { ...settings, followAction };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const quantizations: { value: LaunchQuantization; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: '8th', label: '1/8' },
    { value: '8th-triplet', label: '1/8T' },
    { value: '16th', label: '1/16' },
    { value: '16th-triplet', label: '1/16T' },
    { value: '32nd', label: '1/32' },
    { value: '32nd-triplet', label: '1/32T' },
    { value: '64th', label: '1/64' },
    { value: 'global', label: 'Global' }
  ];

  const launchModes: { value: LaunchMode; label: string }[] = [
    { value: 'trigger', label: 'Trigger' },
    { value: 'gate', label: 'Gate' },
    { value: 'toggle', label: 'Toggle' },
    { value: 'repeat', label: 'Repeat' }
  ];

  const followActionTypes: { value: FollowAction['type']; label: string }[] = [
    { value: 'next', label: 'Next' },
    { value: 'previous', label: 'Previous' },
    { value: 'first', label: 'First' },
    { value: 'last', label: 'Last' },
    { value: 'any', label: 'Any' },
    { value: 'other', label: 'Other' },
    { value: 'self', label: 'Self' }
  ];

  return (
    <div className="launch-settings">
      {/* Quantization */}
      <section className="settings-section">
        <h4>Quantization</h4>
        <p className="setting-description">
          When the clip will start playing after being triggered
        </p>
        <select
          value={settings.quantization}
          onChange={(e) => handleQuantizationChange(e.target.value as LaunchQuantization)}
          className="quantization-select"
        >
          {quantizations.map(q => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </select>
      </section>

      {/* Launch Mode */}
      <section className="settings-section">
        <h4>Launch Mode</h4>
        <p className="setting-description">
          How the clip responds to trigger input
        </p>
        <div className="launch-modes">
          {launchModes.map(mode => (
            <label key={mode.value} className="radio-label">
              <input
                type="radio"
                name="launchMode"
                value={mode.value}
                checked={settings.launchMode === mode.value}
                onChange={() => handleLaunchModeChange(mode.value)}
              />
              {mode.label}
            </label>
          ))}
        </div>
      </section>

      {/* Follow Action */}
      <section className="settings-section">
        <h4>Follow Action</h4>
        <p className="setting-description">
          Automatically trigger another clip after this one plays
        </p>
        
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.followAction !== null}
            onChange={(e) => {
              if (e.target.checked) {
                handleFollowActionChange({
                  type: 'next',
                  chance: 100,
                  afterBars: 1
                });
              } else {
                handleFollowActionChange(null);
              }
            }}
          />
          Enable Follow Action
        </label>

        {settings.followAction && (
          <div className="follow-action-options">
            <div className="option-row">
              <label>Action:</label>
              <select
                value={settings.followAction.type}
                onChange={(e) => handleFollowActionChange({
                  ...settings.followAction!,
                  type: e.target.value as FollowAction['type']
                })}
              >
                {followActionTypes.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="option-row">
              <label>After:</label>
              <input
                type="number"
                min="0.125"
                max="999"
                step="0.125"
                value={settings.followAction.afterBars}
                onChange={(e) => handleFollowActionChange({
                  ...settings.followAction!,
                  afterBars: parseFloat(e.target.value)
                })}
              />
              <span>bars</span>
            </div>

            <div className="option-row">
              <label>Chance:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.followAction.chance}
                onChange={(e) => handleFollowActionChange({
                  ...settings.followAction!,
                  chance: parseInt(e.target.value)
                })}
              />
              <span>{settings.followAction.chance}%</span>
            </div>
          </div>
        )}
      </section>

      {/* Additional Options */}
      <section className="settings-section">
        <h4>Options</h4>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.velocitySensitivity}
            onChange={(e) => {
              const newSettings = { ...settings, velocitySensitivity: e.target.checked };
              setSettings(newSettings);
              onSettingsChange?.(newSettings);
            }}
          />
          Velocity Sensitive
          <span className="option-hint">Clip volume responds to trigger velocity</span>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.legato}
            onChange={(e) => {
              const newSettings = { ...settings, legato: e.target.checked };
              setSettings(newSettings);
              onSettingsChange?.(newSettings);
            }}
          />
          Legato
          <span className="option-hint">Continue playback from other clips' positions</span>
        </label>
      </section>

      {/* Info */}
      <section className="settings-section info-section">
        <h4>Clip Info</h4>
        <div className="info-row">
          <span>ID:</span>
          <code>{clip.id.slice(0, 16)}...</code>
        </div>
        <div className="info-row">
          <span>Start:</span>
          <span>{clip.startTick} ticks</span>
        </div>
        <div className="info-row">
          <span>End:</span>
          <span>{clip.endTick} ticks</span>
        </div>
        {'notes' in clip && (
          <div className="info-row">
            <span>Notes:</span>
            <span>{clip.notes.length}</span>
          </div>
        )}
      </section>
    </div>
  );
};

export default LaunchSettings;
