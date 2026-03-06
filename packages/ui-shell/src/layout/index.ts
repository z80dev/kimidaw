/**
 * Panel Layout System
 * 
 * Provides flexible, resizable panel layouts for the DAW shell.
 * Supports docking, resizing, and collapsing of side panels.
 */

export { PanelLayout, type PanelLayoutProps } from './PanelLayout.js';
export { Panel, type PanelProps, type PanelSize } from './Panel.js';
export { PanelGroup, type PanelGroupProps, type PanelOrientation } from './PanelGroup.js';
export { usePanelLayout, type PanelLayoutState, type PanelLayoutActions } from './usePanelLayout.js';
export { Resizer } from './Resizer.js';
