/**
 * @daw/ui-arrange
 * 
 * Arrange view (timeline) for the In-Browser DAW.
 * Provides canvas-based rendering for high-performance timeline editing
 * with virtualization for large sessions.
 * 
 * @module @daw/ui-arrange
 */

// Main component
export { ArrangeView, type ArrangeViewProps } from './ArrangeView.js';

// Canvas renderers
export {
  TimelineRenderer,
  type TimelineRendererOptions,
  type TimelineRenderState,
  type ViewRange,
} from './canvas/TimelineRenderer.js';

export {
  ClipRenderer,
  type ClipRenderOptions,
  type ClipVisual,
} from './canvas/ClipRenderer.js';

export {
  TrackHeaderRenderer,
  type TrackHeaderOptions,
  type TrackHeaderMetrics,
} from './canvas/TrackHeaderRenderer.js';

// Interactions
export {
  SelectionModel,
  type SelectionState,
  type SelectionOptions,
  type SelectableItem,
} from './interactions/selection.js';

export {
  DragDropManager,
  type DragDropState,
  type DragDropOptions,
  type DragItem,
} from './interactions/drag-drop.js';

export {
  ZoomController,
  type ZoomState,
  type ZoomOptions,
  type ZoomConstraints,
} from './interactions/zoom.js';

// Types
export type {
  ArrangeViewState,
  ArrangeViewport,
  TimelineMetrics,
  ArrangeConfig,
} from './types.js';
