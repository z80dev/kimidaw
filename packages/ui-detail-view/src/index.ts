/**
 * UI Detail View Package
 * Ableton-style clip detail view components
 * 
 * Provides:
 * - ClipDetailView: Main container for clip editing
 * - SampleEditor: Audio clip editing (warp, gain, transpose)
 * - MidiDetailView: MIDI clip editing (notes, velocity)
 * - EnvelopeEditor: Clip automation editing
 * - LaunchSettings: Quantization and follow actions
 * 
 * @example
 * ```tsx
 * import { ClipDetailView } from '@daw/ui-detail-view';
 * 
 * function App() {
 *   const [clip, setClip] = useState(selectedClip);
 *   
 *   return (
 *     <ClipDetailView
 *       clip={clip}
 *       onClipChange={setClip}
 *       sampleRate={44100}
 *       ppq={960}
 *     />
 *   );
 * }
 * ```
 */

// Main component
export { ClipDetailView, type ClipDetailViewProps } from './ClipDetailView.js';

// Sub-components
export { SampleEditor, type SampleEditorProps } from './SampleEditor.js';
export { MidiDetailView, type MidiDetailViewProps } from './MidiDetailView.js';
export { EnvelopeEditor, type EnvelopeEditorProps } from './EnvelopeEditor.js';
export { LaunchSettings, type LaunchSettingsProps } from './LaunchSettings.js';

// Types
export type {
  DetailViewState,
  DetailViewTab,
  ClipEditorState,
  ClipEditTool,
  ClipSelection,
  TimeSelection,
  LoopState,
  SampleEditorState,
  WarpMode,
  MidiEditorState,
  FoldMode,
  ScaleHighlight,
  ScaleMode,
  EnvelopeLane,
  EnvelopeTarget,
  LaunchSettingsState,
  LaunchQuantization,
  LaunchMode,
  FollowAction,
  MidiEffectChain,
  MidiEffect
} from './types.js';

// Default export
export { ClipDetailView as default } from './ClipDetailView.js';
