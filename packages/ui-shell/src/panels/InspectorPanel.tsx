/**
 * Inspector Panel
 * 
 * Properties inspector for the currently selected item.
 * Shows context-sensitive properties for clips, tracks, notes, etc.
 */

import React, { useMemo } from 'react';
import type { 
  Track, 
  AudioClip, 
  MidiClip, 
  AutomationLane,
  PluginInstance,
} from '@daw/project-schema';
import { DAW_COLORS, DAW_TYPOGRAPHY, DAW_SPACING } from '../theme.js';
import { Panel } from '../layout/Panel.js';

/**
 * Type of selection being inspected
 */
export type InspectorSelectionType = 
  | 'none'
  | 'track'
  | 'audio-clip'
  | 'midi-clip'
  | 'note'
  | 'automation'
  | 'plugin'
  | 'multiple';

/**
 * Selection in the inspector
 */
export interface InspectorSelection {
  type: InspectorSelectionType;
  track?: Track;
  clip?: AudioClip | MidiClip;
  note?: {
    pitch: number;
    velocity: number;
    start: number;
    duration: number;
  };
  automation?: AutomationLane;
  plugin?: PluginInstance;
  count?: number;
}

/**
 * Props for InspectorPanel
 */
export interface InspectorPanelProps {
  /** Current selection to inspect */
  selection?: InspectorSelection;
  
  /** Callback when a property changes */
  onPropertyChange?: (property: string, value: unknown) => void;
  
  /** Callback when color is changed */
  onColorChange?: (color: string) => void;
  
  /** Callback when name is changed */
  onNameChange?: (name: string) => void;
  
  /** Available colors for selection */
  availableColors?: string[];
  
  /** Custom class name */
  className?: string;
}

/**
 * Default available clip/track colors
 */
const defaultColors = [
  DAW_COLORS.clipBlue,
  DAW_COLORS.clipGreen,
  DAW_COLORS.clipYellow,
  DAW_COLORS.clipOrange,
  DAW_COLORS.clipRed,
  DAW_COLORS.clipPurple,
  DAW_COLORS.clipPink,
  DAW_COLORS.clipCyan,
];

/**
 * Inspector panel component
 * 
 * @example
 * ```tsx
 * <InspectorPanel
 *   selection={{ type: 'track', track: selectedTrack }}
 *   onPropertyChange={(prop, value) => updateTrack(track.id, prop, value)}
 * />
 * ```
 */
export function InspectorPanel({
  selection = { type: 'none' },
  onPropertyChange,
  onColorChange,
  onNameChange,
  availableColors = defaultColors,
  className,
}: InspectorPanelProps): React.ReactElement {
  const title = useMemo(() => {
    switch (selection.type) {
      case 'none':
        return 'Inspector';
      case 'track':
        return selection.track?.name ?? 'Track';
      case 'audio-clip':
        return 'Audio Clip';
      case 'midi-clip':
        return 'MIDI Clip';
      case 'note':
        return 'Note';
      case 'automation':
        return 'Automation';
      case 'plugin':
        return selection.plugin?.name ?? 'Plugin';
      case 'multiple':
        return `${selection.count} Items Selected`;
      default:
        return 'Inspector';
    }
  }, [selection]);

  const renderContent = () => {
    switch (selection.type) {
      case 'none':
        return <EmptyState message="Select an item to view its properties" />;
      case 'track':
        return selection.track ? (
          <TrackInspector
            track={selection.track}
            onPropertyChange={onPropertyChange}
            onColorChange={onColorChange}
            onNameChange={onNameChange}
            availableColors={availableColors}
          />
        ) : null;
      case 'audio-clip':
        return <AudioClipInspector clip={selection.clip as AudioClip} onPropertyChange={onPropertyChange} />;
      case 'midi-clip':
        return <MidiClipInspector clip={selection.clip as MidiClip} onPropertyChange={onPropertyChange} />;
      case 'note':
        return <NoteInspector note={selection.note} onPropertyChange={onPropertyChange} />;
      case 'plugin':
        return <PluginInspector plugin={selection.plugin} onPropertyChange={onPropertyChange} />;
      case 'multiple':
        return <MultipleSelectionInspector count={selection.count ?? 0} />;
      default:
        return <EmptyState message="Unknown selection type" />;
    }
  };

  return (
    <Panel title={title} className={className} hasHeader={false}>
      <div style={styles.container}>
        {renderContent()}
      </div>
    </Panel>
  );
}

/**
 * Empty state component
 */
function EmptyState({ message }: { message: string }): React.ReactElement {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>ℹ️</div>
      <div style={styles.emptyText}>{message}</div>
    </div>
  );
}

/**
 * Track inspector
 */
interface TrackInspectorProps {
  track: Track;
  onPropertyChange?: (property: string, value: unknown) => void;
  onColorChange?: (color: string) => void;
  onNameChange?: (name: string) => void;
  availableColors: string[];
}

function TrackInspector({
  track,
  onPropertyChange,
  onColorChange,
  onNameChange,
  availableColors,
}: TrackInspectorProps): React.ReactElement {
  return (
    <div style={styles.section}>
      <PropertyGroup title="General">
        <TextProperty
          label="Name"
          value={track.name}
          onChange={onNameChange}
        />
        <ColorProperty
          label="Color"
          value={track.color}
          colors={availableColors}
          onChange={onColorChange}
        />
      </PropertyGroup>

      <PropertyGroup title="Routing">
        <SelectProperty
          label="Input"
          value={track.input?.type ?? 'none'}
          options={['none', 'audio', 'midi', 'instrument']}
          onChange={(v) => onPropertyChange?.('input.type', v)}
        />
        <SelectProperty
          label="Output"
          value={track.output?.busId ?? 'master'}
          options={['master', 'bus1', 'bus2']}
          onChange={(v) => onPropertyChange?.('output.busId', v)}
        />
      </PropertyGroup>

      <PropertyGroup title="Mixer">
        <BooleanProperty
          label="Mute"
          value={track.mute}
          onChange={(v) => onPropertyChange?.('mute', v)}
        />
        <BooleanProperty
          label="Solo"
          value={track.solo}
          onChange={(v) => onPropertyChange?.('solo', v)}
        />
        <BooleanProperty
          label="Arm"
          value={track.arm}
          onChange={(v) => onPropertyChange?.('arm', v)}
        />
        <NumberProperty
          label="Volume"
          value={0}
          min={-60}
          max={12}
          step={0.1}
          unit="dB"
          onChange={(v) => onPropertyChange?.('volume', v)}
        />
        <NumberProperty
          label="Pan"
          value={0}
          min={-1}
          max={1}
          step={0.01}
          onChange={(v) => onPropertyChange?.('pan', v)}
        />
      </PropertyGroup>

      <PropertyGroup title="Device Chain">
        <DeviceChain devices={track.inserts} />
      </PropertyGroup>
    </div>
  );
}

/**
 * Audio clip inspector
 */
function AudioClipInspector({
  clip,
  onPropertyChange,
}: {
  clip: AudioClip;
  onPropertyChange?: (property: string, value: unknown) => void;
}): React.ReactElement {
  return (
    <div style={styles.section}>
      <PropertyGroup title="Timing">
        <NumberProperty
          label="Start"
          value={clip.startTick}
          min={0}
          step={1}
          onChange={(v) => onPropertyChange?.('startTick', v)}
        />
        <NumberProperty
          label="End"
          value={clip.endTick}
          min={0}
          step={1}
          onChange={(v) => onPropertyChange?.('endTick', v)}
        />
      </PropertyGroup>

      <PropertyGroup title="Audio">
        <NumberProperty
          label="Gain"
          value={clip.gainDb ?? 0}
          min={-60}
          max={24}
          step={0.1}
          unit="dB"
          onChange={(v) => onPropertyChange?.('gainDb', v)}
        />
        <NumberProperty
          label="Transpose"
          value={clip.transposeSemitones ?? 0}
          min={-24}
          max={24}
          step={1}
          unit="st"
          onChange={(v) => onPropertyChange?.('transposeSemitones', v)}
        />
        <BooleanProperty
          label="Reverse"
          value={clip.reverse ?? false}
          onChange={(v) => onPropertyChange?.('reverse', v)}
        />
      </PropertyGroup>

      <PropertyGroup title="Fades">
        <NumberProperty
          label="Fade In"
          value={(clip.fades?.inSamples ?? 0) / 44.1}
          min={0}
          max={1000}
          step={1}
          unit="ms"
          onChange={(v) => onPropertyChange?.('fades.inSamples', Math.round(v * 44.1))}
        />
        <NumberProperty
          label="Fade Out"
          value={(clip.fades?.outSamples ?? 0) / 44.1}
          min={0}
          max={1000}
          step={1}
          unit="ms"
          onChange={(v) => onPropertyChange?.('fades.outSamples', Math.round(v * 44.1))}
        />
      </PropertyGroup>
    </div>
  );
}

/**
 * MIDI clip inspector
 */
function MidiClipInspector({
  clip,
  onPropertyChange,
}: {
  clip: MidiClip;
  onPropertyChange?: (property: string, value: unknown) => void;
}): React.ReactElement {
  const noteCount = clip.notes?.length ?? 0;

  return (
    <div style={styles.section}>
      <PropertyGroup title="Timing">
        <NumberProperty
          label="Start"
          value={clip.startTick}
          min={0}
          step={1}
          onChange={(v) => onPropertyChange?.('startTick', v)}
        />
        <NumberProperty
          label="End"
          value={clip.endTick}
          min={0}
          step={1}
          onChange={(v) => onPropertyChange?.('endTick', v)}
        />
      </PropertyGroup>

      <PropertyGroup title="Loop">
        <BooleanProperty
          label="Enabled"
          value={!!clip.loop}
          onChange={(v) => onPropertyChange?.('loop', v ? { start: 0, end: clip.endTick - clip.startTick } : null)}
        />
      </PropertyGroup>

      <PropertyGroup title="Info">
        <ReadOnlyProperty label="Notes" value={noteCount.toString()} />
        <ReadOnlyProperty label="Duration" value={`${((clip.endTick - clip.startTick) / 960).toFixed(2)} bars`} />
      </PropertyGroup>
    </div>
  );
}

/**
 * Note inspector
 */
function NoteInspector({
  note,
  onPropertyChange,
}: {
  note?: InspectorSelection['note'];
  onPropertyChange?: (property: string, value: unknown) => void;
}): React.ReactElement {
  if (!note) return <EmptyState message="No note selected" />;

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(note.pitch / 12) - 1;
  const noteName = noteNames[note.pitch % 12];

  return (
    <div style={styles.section}>
      <PropertyGroup title="Pitch">
        <ReadOnlyProperty label="Note" value={`${noteName}${octave}`} />
        <NumberProperty
          label="Pitch"
          value={note.pitch}
          min={0}
          max={127}
          step={1}
          onChange={(v) => onPropertyChange?.('pitch', v)}
        />
      </PropertyGroup>

      <PropertyGroup title="Timing">
        <NumberProperty
          label="Start"
          value={note.start}
          min={0}
          step={1}
          onChange={(v) => onPropertyChange?.('start', v)}
        />
        <NumberProperty
          label="Duration"
          value={note.duration}
          min={1}
          step={1}
          onChange={(v) => onPropertyChange?.('duration', v)}
        />
      </PropertyGroup>

      <PropertyGroup title="Velocity">
        <NumberProperty
          label="Velocity"
          value={note.velocity}
          min={0}
          max={127}
          step={1}
          onChange={(v) => onPropertyChange?.('velocity', v)}
        />
        <VelocitySlider
          value={note.velocity}
          onChange={(v) => onPropertyChange?.('velocity', v)}
        />
      </PropertyGroup>
    </div>
  );
}

/**
 * Plugin inspector
 */
function PluginInspector({
  plugin,
  onPropertyChange,
}: {
  plugin?: PluginInstance;
  onPropertyChange?: (property: string, value: unknown) => void;
}): React.ReactElement {
  if (!plugin) return <EmptyState message="No plugin selected" />;

  return (
    <div style={styles.section}>
      <PropertyGroup title="Plugin">
        <ReadOnlyProperty label="Name" value={plugin.name} />
        <ReadOnlyProperty label="Type" value={plugin.type} />
        <ReadOnlyProperty label="Vendor" value={plugin.vendor ?? 'Unknown'} />
      </PropertyGroup>

      <PropertyGroup title="Parameters">
        {plugin.parameters?.map(param => (
          <NumberProperty
            key={param.id}
            label={param.name}
            value={param.value}
            min={param.min}
            max={param.max}
            step={param.step ?? 0.01}
            onChange={(v) => onPropertyChange?.(`parameters.${param.id}`, v)}
          />
        ))}
      </PropertyGroup>
    </div>
  );
}

/**
 * Multiple selection inspector
 */
function MultipleSelectionInspector({ count }: { count: number }): React.ReactElement {
  return (
    <div style={styles.section}>
      <PropertyGroup title="Selection">
        <ReadOnlyProperty label="Items" value={count.toString()} />
      </PropertyGroup>
      <div style={styles.hint}>
        Multiple items selected. Select a single item to edit properties.
      </div>
    </div>
  );
}

/**
 * Property group container
 */
function PropertyGroup({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={styles.propertyGroup}>
      <div style={styles.propertyGroupTitle}>{title}</div>
      <div style={styles.propertyGroupContent}>{children}</div>
    </div>
  );
}

/**
 * Device chain display
 */
function DeviceChain({ devices }: { devices?: PluginInstance[] }): React.ReactElement {
  if (!devices?.length) {
    return <div style={styles.emptyDevices}>No devices</div>;
  }

  return (
    <div style={styles.deviceChain}>
      {devices.map((device, index) => (
        <div key={device.id ?? index} style={styles.deviceItem}>
          <span style={styles.deviceNumber}>{index + 1}</span>
          <span style={styles.deviceName}>{device.name}</span>
          <button style={styles.deviceButton}>⚙️</button>
        </div>
      ))}
    </div>
  );
}

/**
 * Property components
 */
function TextProperty({ label, value, onChange }: { label: string; value: string; onChange?: (value: string) => void }) {
  return (
    <div style={styles.property}>
      <label style={styles.propertyLabel}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={styles.textInput}
        disabled={!onChange}
      />
    </div>
  );
}

function NumberProperty({ label, value, min, max, step, unit, onChange }: { 
  label: string; 
  value: number; 
  min?: number; 
  max?: number; 
  step?: number;
  unit?: string;
  onChange?: (value: number) => void;
}) {
  const displayValue = unit ? `${value.toFixed(step && step < 1 ? 2 : 0)} ${unit}` : value;
  
  return (
    <div style={styles.property}>
      <label style={styles.propertyLabel}>{label}</label>
      <div style={styles.numberInputContainer}>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange?.(parseFloat(e.target.value))}
          style={styles.numberInput}
          disabled={!onChange}
        />
        <span style={styles.unit}>{unit}</span>
      </div>
    </div>
  );
}

function BooleanProperty({ label, value, onChange }: { label: string; value: boolean; onChange?: (value: boolean) => void }) {
  return (
    <div style={styles.property}>
      <label style={styles.propertyLabel}>{label}</label>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange?.(e.target.checked)}
        style={styles.checkbox}
        disabled={!onChange}
      />
    </div>
  );
}

function SelectProperty({ label, value, options, onChange }: { 
  label: string; 
  value: string; 
  options: string[]; 
  onChange?: (value: string) => void;
}) {
  return (
    <div style={styles.property}>
      <label style={styles.propertyLabel}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={styles.select}
        disabled={!onChange}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function ColorProperty({ label, value, colors, onChange }: { 
  label: string; 
  value: string; 
  colors: string[]; 
  onChange?: (color: string) => void;
}) {
  return (
    <div style={styles.property}>
      <label style={styles.propertyLabel}>{label}</label>
      <div style={styles.colorPicker}>
        {colors.map(color => (
          <button
            key={color}
            style={{
              ...styles.colorSwatch,
              backgroundColor: color,
              ...(value === color ? styles.colorSwatchSelected : {}),
            }}
            onClick={() => onChange?.(color)}
            disabled={!onChange}
          />
        ))}
      </div>
    </div>
  );
}

function ReadOnlyProperty({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.property}>
      <label style={styles.propertyLabel}>{label}</label>
      <span style={styles.readOnlyValue}>{value}</span>
    </div>
  );
}

function VelocitySlider({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  return (
    <div style={styles.velocitySlider}>
      <input
        type="range"
        min={0}
        max={127}
        value={value}
        onChange={(e) => onChange?.(parseInt(e.target.value))}
        style={styles.slider}
        disabled={!onChange}
      />
      <div style={styles.velocityBar}>
        <div style={{ ...styles.velocityFill, width: `${(value / 127) * 100}%` }} />
      </div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'auto',
    backgroundColor: DAW_COLORS.bgMedium,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    padding: DAW_SPACING[4],
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: DAW_SPACING[2],
    opacity: 0.5,
  },
  emptyText: {
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    color: DAW_COLORS.textTertiary,
  },
  section: {
    padding: DAW_SPACING[2],
  },
  propertyGroup: {
    marginBottom: DAW_SPACING[4],
  },
  propertyGroupTitle: {
    fontSize: DAW_TYPOGRAPHY.sizeXs,
    fontWeight: DAW_TYPOGRAPHY.weightSemibold,
    color: DAW_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: DAW_SPACING[2],
    paddingBottom: DAW_SPACING[1],
    borderBottom: `1px solid ${DAW_COLORS.borderSubtle}`,
  },
  propertyGroupContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: DAW_SPACING[2],
  },
  property: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: DAW_SPACING[2],
  },
  propertyLabel: {
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    color: DAW_COLORS.textSecondary,
    minWidth: '80px',
  },
  textInput: {
    flex: 1,
    padding: `${DAW_SPACING[1]} ${DAW_SPACING[2]}`,
    backgroundColor: DAW_COLORS.bgDark,
    border: `1px solid ${DAW_COLORS.borderDefault}`,
    borderRadius: '3px',
    color: DAW_COLORS.textPrimary,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    outline: 'none',
  },
  numberInputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[1],
    flex: 1,
  },
  numberInput: {
    flex: 1,
    padding: `${DAW_SPACING[1]} ${DAW_SPACING[2]}`,
    backgroundColor: DAW_COLORS.bgDark,
    border: `1px solid ${DAW_COLORS.borderDefault}`,
    borderRadius: '3px',
    color: DAW_COLORS.textPrimary,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    outline: 'none',
  },
  unit: {
    fontSize: DAW_TYPOGRAPHY.sizeXs,
    color: DAW_COLORS.textTertiary,
    minWidth: '24px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
  },
  select: {
    flex: 1,
    padding: `${DAW_SPACING[1]} ${DAW_SPACING[2]}`,
    backgroundColor: DAW_COLORS.bgDark,
    border: `1px solid ${DAW_COLORS.borderDefault}`,
    borderRadius: '3px',
    color: DAW_COLORS.textPrimary,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
  },
  colorPicker: {
    display: 'flex',
    gap: DAW_SPACING[1],
  },
  colorSwatch: {
    width: '20px',
    height: '20px',
    border: `2px solid ${DAW_COLORS.borderDefault}`,
    borderRadius: '3px',
    cursor: 'pointer',
  },
  colorSwatchSelected: {
    borderColor: DAW_COLORS.textPrimary,
    boxShadow: `0 0 0 1px ${DAW_COLORS.bgMedium}`,
  },
  readOnlyValue: {
    flex: 1,
    padding: `${DAW_SPACING[1]} ${DAW_SPACING[2]}`,
    backgroundColor: DAW_COLORS.bgDark,
    border: `1px solid ${DAW_COLORS.borderDefault}`,
    borderRadius: '3px',
    color: DAW_COLORS.textTertiary,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
  },
  velocitySlider: {
    marginTop: DAW_SPACING[1],
  },
  slider: {
    width: '100%',
    marginBottom: DAW_SPACING[1],
  },
  velocityBar: {
    height: '4px',
    backgroundColor: DAW_COLORS.bgDark,
    borderRadius: '2px',
    overflow: 'hidden',
  },
  velocityFill: {
    height: '100%',
    backgroundColor: DAW_COLORS.accentBlue,
    transition: 'width 0.1s ease',
  },
  deviceChain: {
    display: 'flex',
    flexDirection: 'column',
    gap: DAW_SPACING[1],
  },
  deviceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[2],
    padding: DAW_SPACING[2],
    backgroundColor: DAW_COLORS.bgDark,
    borderRadius: '3px',
  },
  deviceNumber: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DAW_COLORS.bgMedium,
    borderRadius: '3px',
    fontSize: DAW_TYPOGRAPHY.sizeXs,
    color: DAW_COLORS.textTertiary,
  },
  deviceName: {
    flex: 1,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    color: DAW_COLORS.textPrimary,
  },
  deviceButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
  },
  emptyDevices: {
    padding: DAW_SPACING[2],
    textAlign: 'center',
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    color: DAW_COLORS.textTertiary,
    fontStyle: 'italic',
  },
  hint: {
    padding: DAW_SPACING[2],
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    color: DAW_COLORS.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
};
