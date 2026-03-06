/**
 * @daw/ui-pianoroll
 * 
 * Piano roll editor for the In-Browser DAW.
 * Provides canvas-based MIDI note editing with velocity lanes,
 * scale highlighting, and advanced editing operations.
 * 
 * @module @daw/ui-pianoroll
 */

// Main component
export { PianoRoll, type PianoRollProps } from './PianoRoll.js';

// Canvas renderers
export {
  GridRenderer,
  type GridRenderOptions,
  type GridMetrics,
} from './canvas/GridRenderer.js';

export {
  NoteRenderer,
  type NoteRenderOptions,
  type NoteVisual,
} from './canvas/NoteRenderer.js';

export {
  VelocityRenderer,
  type VelocityRenderOptions,
  type VelocityBar,
} from './canvas/VelocityRenderer.js';

// Editing operations
export {
  NoteEditor,
  type NoteEditOperation,
  type NoteEditState,
  type NoteEditOptions,
} from './editing/NoteEditor.js';

export {
  PianoRollSelection,
  type PianoRollSelectionState,
} from './editing/selection.js';

export {
  Quantizer,
  type QuantizeOptions,
} from './editing/quantize.js';

// Types
export type {
  PianoRollState,
  PianoRollViewport,
  PianoRollConfig,
  NoteInputMode,
} from './types.js';
