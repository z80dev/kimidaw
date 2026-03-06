/**
 * UI Elements - Max for Live-style UI components
 * 
 * Provides UI controls that can be embedded in device views:
 * - Sliders, knobs, buttons
 * - Live.numbox, Live.dial equivalents
 * - Message boxes and text displays
 * - Color and theming support
 */

// =============================================================================
// Types
// =============================================================================

export interface UIElementConfig {
  /** Element ID */
  id: string;
  /** Element type */
  type: UIElementType;
  /** Display name/label */
  label?: string;
  /** Initial value */
  value?: number | string | boolean;
  /** Position in UI */
  x?: number;
  y?: number;
  /** Dimensions */
  width?: number;
  height?: number;
  /** Additional properties */
  properties?: Record<string, unknown>;
}

export type UIElementType =
  | "slider"
  | "knob"
  | "button"
  | "toggle"
  | "numbox"
  | "text"
  | "menu"
  | "multislider"
  | "lcd" // Drawing canvas
  | "tab"; // Tab control

export interface SliderConfig extends UIElementConfig {
  type: "slider";
  min: number;
  max: number;
  step?: number;
  orientation?: "horizontal" | "vertical";
  showValue?: boolean;
  unit?: string;
}

export interface KnobConfig extends UIElementConfig {
  type: "knob";
  min: number;
  max: number;
  step?: number;
  size?: "small" | "medium" | "large";
  arc?: boolean;
  showValue?: boolean;
  unit?: string;
}

export interface ButtonConfig extends UIElementConfig {
  type: "button";
  mode?: "momentary" | "toggle";
  color?: string;
}

export interface ToggleConfig extends UIElementConfig {
  type: "toggle";
  color?: string;
}

export interface NumboxConfig extends UIElementConfig {
  type: "numbox";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  decimalPlaces?: number;
}

export interface TextConfig extends UIElementConfig {
  type: "text";
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  alignment?: "left" | "center" | "right";
}

export interface MenuConfig extends UIElementConfig {
  type: "menu";
  items: string[];
  allowMultiple?: boolean;
}

export interface MultisliderConfig extends UIElementConfig {
  type: "multislider";
  numSliders: number;
  min: number;
  max: number;
  orientation?: "horizontal" | "vertical";
  barWidth?: number;
  spacing?: number;
}

export interface LCDConfig extends UIElementConfig {
  type: "lcd";
  onDraw?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

export interface TabConfig extends UIElementConfig {
  type: "tab";
  tabs: string[];
  orientation?: "horizontal" | "vertical";
}

// =============================================================================
// UI Manager
// =============================================================================

export type UIValueCallback = (id: string, value: number | string | boolean) => void;

export class UIManager {
  private elements: Map<string, UIElementConfig> = new Map();
  private values: Map<string, number | string | boolean> = new Map();
  private callbacks: Set<UIValueCallback> = new Set();
  private hostUpdate: ((elements: UIElementConfig[]) => void) | null = null;

  /**
   * Register a callback to receive value changes
   */
  onValueChange(callback: UIValueCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Set the host update callback
   */
  setHostUpdateCallback(callback: (elements: UIElementConfig[]) => void): void {
    this.hostUpdate = callback;
  }

  /**
   * Add a UI element
   */
  addElement(config: UIElementConfig): void {
    this.elements.set(config.id, config);
    if (config.value !== undefined) {
      this.values.set(config.id, config.value);
    }
    this.notifyHost();
  }

  /**
   * Remove a UI element
   */
  removeElement(id: string): void {
    this.elements.delete(id);
    this.values.delete(id);
    this.notifyHost();
  }

  /**
   * Get an element configuration
   */
  getElement(id: string): UIElementConfig | undefined {
    return this.elements.get(id);
  }

  /**
   * Get all elements
   */
  getAllElements(): UIElementConfig[] {
    return Array.from(this.elements.values());
  }

  /**
   * Set element value (from user interaction)
   */
  setValue(id: string, value: number | string | boolean): void {
    this.values.set(id, value);
    
    // Notify callbacks
    for (const callback of this.callbacks) {
      callback(id, value);
    }
  }

  /**
   * Get element value
   */
  getValue(id: string): number | string | boolean | undefined {
    return this.values.get(id);
  }

  /**
   * Update element configuration
   */
  updateElement(id: string, updates: Partial<UIElementConfig>): void {
    const element = this.elements.get(id);
    if (element) {
      Object.assign(element, updates);
      this.notifyHost();
    }
  }

  /**
   * Set element visibility
   */
  setVisible(id: string, visible: boolean): void {
    const element = this.elements.get(id);
    if (element) {
      element.properties = { ...element.properties, visible };
      this.notifyHost();
    }
  }

  /**
   * Set element color
   */
  setColor(id: string, color: string): void {
    const element = this.elements.get(id);
    if (element) {
      element.properties = { ...element.properties, color };
      this.notifyHost();
    }
  }

  /**
   * Set element label
   */
  setLabel(id: string, label: string): void {
    const element = this.elements.get(id);
    if (element) {
      element.label = label;
      this.notifyHost();
    }
  }

  /**
   * Batch update multiple element values
   */
  setValues(values: Record<string, number | string | boolean>): void {
    for (const [id, value] of Object.entries(values)) {
      this.values.set(id, value);
    }
    
    for (const callback of this.callbacks) {
      for (const [id, value] of Object.entries(values)) {
        callback(id, value);
      }
    }
  }

  /**
   * Clear all elements
   */
  clear(): void {
    this.elements.clear();
    this.values.clear();
    this.notifyHost();
  }

  private notifyHost(): void {
    if (this.hostUpdate) {
      this.hostUpdate(this.getAllElements());
    }
  }
}

// =============================================================================
// Preset UI Builders
// =============================================================================

export function createSlider(
  id: string,
  label: string,
  min: number,
  max: number,
  defaultValue: number,
  options?: Partial<Omit<SliderConfig, "id" | "type" | "label" | "min" | "max">>
): SliderConfig {
  return {
    id,
    type: "slider",
    label,
    min,
    max,
    value: defaultValue,
    orientation: "horizontal",
    showValue: true,
    ...options,
  };
}

export function createKnob(
  id: string,
  label: string,
  min: number,
  max: number,
  defaultValue: number,
  options?: Partial<Omit<KnobConfig, "id" | "type" | "label" | "min" | "max">>
): KnobConfig {
  return {
    id,
    type: "knob",
    label,
    min,
    max,
    value: defaultValue,
    size: "medium",
    arc: true,
    showValue: true,
    ...options,
  };
}

export function createButton(
  id: string,
  label: string,
  options?: Partial<Omit<ButtonConfig, "id" | "type" | "label">>
): ButtonConfig {
  return {
    id,
    type: "button",
    label,
    mode: "momentary",
    ...options,
  };
}

export function createToggle(
  id: string,
  label: string,
  defaultValue = false,
  options?: Partial<Omit<ToggleConfig, "id" | "type" | "label">>
): ToggleConfig {
  return {
    id,
    type: "toggle",
    label,
    value: defaultValue,
    ...options,
  };
}

export function createNumbox(
  id: string,
  label: string,
  defaultValue = 0,
  options?: Partial<Omit<NumboxConfig, "id" | "type" | "label">>
): NumboxConfig {
  return {
    id,
    type: "numbox",
    label,
    value: defaultValue,
    decimalPlaces: 2,
    ...options,
  };
}

export function createMenu(
  id: string,
  label: string,
  items: string[],
  defaultIndex = 0,
  options?: Partial<Omit<MenuConfig, "id" | "type" | "label" | "items">>
): MenuConfig {
  return {
    id,
    type: "menu",
    label,
    items,
    value: items[defaultIndex] ?? items[0],
    ...options,
  };
}

// =============================================================================
// Factory
// =============================================================================

export function createUIManager(): UIManager {
  return new UIManager();
}
