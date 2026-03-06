/**
 * @daw/max-integration
 * 
 * Max for Live-style integration for in-browser DAW.
 * Provides scripting API, UI elements, and data objects similar to Max/MSP.
 * 
 * ## Features
 * 
 * - **LiveAPI**: Control DAW transport, tracks, clips, and devices
 * - **UIElements**: Create UI controls in device view
 * - **BufferObject**: Audio buffer storage and manipulation
 * - **TableObject**: Lookup tables for waveshaping and modulation
 * - **CollObject**: Key-value collections for data storage
 * 
 * @example
 * ```typescript
 * import { LiveAPI, createUIManager, createBuffer } from "@daw/max-integration";
 * 
 * // Control the DAW
 * const api = createLiveAPI(hostCallback);
 * await api.play();
 * await api.setTempo(128);
 * 
 * // Create UI elements
 * const ui = createUIManager();
 * ui.addElement(createSlider("volume", "Volume", 0, 1, 0.8));
 * 
 * // Work with buffers
 * const buffer = createBuffer("myBuffer", 2, 44100);
 * buffer.sine(2, -1, 1);
 * ```
 */

// =============================================================================
// Live API
// =============================================================================

export {
  LiveAPI,
  createLiveAPI,
} from "./LiveAPI.js";

export type {
  SongInfo,
  TrackInfo,
  ClipInfo,
  DeviceInfo,
  DeviceParameter,
} from "./LiveAPI.js";

// =============================================================================
// UI Elements
// =============================================================================

export {
  UIManager,
  createUIManager,
  createSlider,
  createKnob,
  createButton,
  createToggle,
  createNumbox,
  createMenu,
} from "./UIElements.js";

export type {
  UIElementConfig,
  UIElementType,
  SliderConfig,
  KnobConfig,
  ButtonConfig,
  ToggleConfig,
  NumboxConfig,
  TextConfig,
  MenuConfig,
  MultisliderConfig,
  LCDConfig,
  TabConfig,
  UIValueCallback,
} from "./UIElements.js";

// =============================================================================
// Buffer Object
// =============================================================================

export {
  BufferObject,
  BufferManager,
  createBuffer,
  createBufferManager,
} from "./BufferObject.js";

export type {
  BufferInfo,
  InterpolationType,
} from "./BufferObject.js";

// =============================================================================
// Table and Coll Objects
// =============================================================================

export {
  TableObject,
  TableManager,
  CollObject,
  CollManager,
  createTable,
  createTableManager,
  createColl,
  createCollManager,
} from "./TableObject.js";

export type {
  CollValue,
  CollEntry,
} from "./TableObject.js";

// =============================================================================
// Version
// =============================================================================

export const MAX_INTEGRATION_VERSION = "1.0.0";
