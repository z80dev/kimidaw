/**
 * Automation model for the DAW
 * 
 * Implements section 7.5 of the engineering spec
 */

/** Automation target reference */
export interface AutomationTarget {
  scope: 'track' | 'plugin' | 'send' | 'instrument' | 'macro';
  ownerId: string;
  paramId: string;
}

/** Automation point */
export interface AutomationPoint {
  tick: number;
  value: number; // Normalized 0-1 or actual parameter value
  
  // Bezier curve control
  curveIn?: number; // -1 to 1, influence of incoming tangent
  curveOut?: number; // -1 to 1, influence of outgoing tangent
  
  // For step mode
  stepHold?: boolean;
}

/** Automation interpolation modes */
export type AutomationInterpolation = 'step' | 'linear' | 'bezier';

/** Automation read/write modes */
export type AutomationMode = 'read' | 'touch' | 'latch' | 'write' | 'trim';

/** Automation lane */
export interface AutomationLane {
  id: string;
  target: AutomationTarget;
  mode: AutomationMode;
  points: AutomationPoint[];
  interpolation: AutomationInterpolation;
  laneDisplayRange?: { min: number; max: number };
  
  // UI state
  visible: boolean;
  height: number; // pixels
  color?: string;
  
  // For touch/latch modes - current override value
  overrideValue?: number;
  overrideActive: boolean;
}

/** Automation breakpoint for compressed representation */
export interface AutomationBreakpoint {
  tick: number;
  value: number;
}

/** Automation segment (for piecewise representation) */
export interface AutomationSegment {
  startTick: number;
  endTick: number;
  startValue: number;
  endValue: number;
  interpolation: AutomationInterpolation;
  controlPoints?: { tick: number; value: number }[]; // For bezier
}

/** Automation snapshot at a point in time */
export interface AutomationSnapshot {
  tick: number;
  values: Map<string, number>; // target key -> value
}

// ==================== Interpolation Functions ====================

/**
 * Interpolate between two values based on mode
 */
export function interpolateValue(
  t: number, // 0 to 1 position between points
  startValue: number,
  endValue: number,
  mode: AutomationInterpolation,
  curveIn?: number,
  curveOut?: number
): number {
  switch (mode) {
    case 'step':
      return startValue;
    
    case 'linear':
      return startValue + (endValue - startValue) * t;
    
    case 'bezier':
      return interpolateBezier(
        t,
        startValue,
        endValue,
        curveIn ?? 0,
        curveOut ?? 0
      );
    
    default:
      return startValue + (endValue - startValue) * t;
  }
}

/**
 * Cubic bezier interpolation
 */
function interpolateBezier(
  t: number,
  p0: number,
  p3: number,
  curveIn: number,
  curveOut: number
): number {
  // Control points influenced by curve handles
  const p1 = p0 + (p3 - p0) * (0.25 + curveIn * 0.25);
  const p2 = p3 - (p3 - p0) * (0.25 - curveOut * 0.25);
  
  // Cubic bezier formula
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  
  return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
}

// ==================== Lane Operations ====================

/**
 * Get the automation value at a specific tick position
 */
export function getValueAtTick(
  lane: AutomationLane,
  tick: number
): number | undefined {
  const points = lane.points;
  
  if (points.length === 0) {
    return undefined;
  }
  
  // Before first point
  if (tick <= points[0].tick) {
    return points[0].value;
  }
  
  // After last point
  if (tick >= points[points.length - 1].tick) {
    return points[points.length - 1].value;
  }
  
  // Find surrounding points
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    if (tick >= p1.tick && tick <= p2.tick) {
      // In range between these points
      if (lane.interpolation === 'step' || p1.stepHold) {
        return p1.value;
      }
      
      const range = p2.tick - p1.tick;
      const t = range === 0 ? 0 : (tick - p1.tick) / range;
      
      return interpolateValue(
        t,
        p1.value,
        p2.value,
        lane.interpolation,
        p1.curveOut,
        p2.curveIn
      );
    }
  }
  
  return undefined;
}

/**
 * Add a point to an automation lane
 */
export function addPoint(
  lane: AutomationLane,
  tick: number,
  value: number,
  options?: {
    curveIn?: number;
    curveOut?: number;
    stepHold?: boolean;
  }
): AutomationLane {
  // Find insertion position
  const insertIndex = lane.points.findIndex((p) => p.tick > tick);
  const index = insertIndex === -1 ? lane.points.length : insertIndex;
  
  // Check if point exists at this tick
  const existingIndex = lane.points.findIndex((p) => p.tick === tick);
  
  let newPoints: AutomationPoint[];
  if (existingIndex !== -1) {
    // Replace existing point
    newPoints = [...lane.points];
    newPoints[existingIndex] = {
      tick,
      value,
      curveIn: options?.curveIn,
      curveOut: options?.curveOut,
      stepHold: options?.stepHold,
    };
  } else {
    // Insert new point
    newPoints = [
      ...lane.points.slice(0, index),
      {
        tick,
        value,
        curveIn: options?.curveIn,
        curveOut: options?.curveOut,
        stepHold: options?.stepHold,
      },
      ...lane.points.slice(index),
    ];
  }
  
  return {
    ...lane,
    points: newPoints,
  };
}

/**
 * Remove a point from an automation lane
 */
export function removePoint(
  lane: AutomationLane,
  pointIndex: number
): AutomationLane {
  return {
    ...lane,
    points: [
      ...lane.points.slice(0, pointIndex),
      ...lane.points.slice(pointIndex + 1),
    ],
  };
}

/**
 * Remove points within a time range
 */
export function removePointsInRange(
  lane: AutomationLane,
  startTick: number,
  endTick: number
): AutomationLane {
  return {
    ...lane,
    points: lane.points.filter(
      (p) => p.tick < startTick || p.tick > endTick
    ),
  };
}

/**
 * Scale automation values
 */
export function scaleValues(
  lane: AutomationLane,
  factor: number
): AutomationLane {
  return {
    ...lane,
    points: lane.points.map((p) => ({
      ...p,
      value: p.value * factor,
    })),
  };
}

/**
 * Shift automation in time
 */
export function shiftInTime(
  lane: AutomationLane,
  offsetTicks: number
): AutomationLane {
  return {
    ...lane,
    points: lane.points.map((p) => ({
      ...p,
      tick: p.tick + offsetTicks,
    })),
  };
}

/**
 * Create a key for an automation target
 */
export function automationTargetKey(target: AutomationTarget): string {
  return `${target.scope}:${target.ownerId}:${target.paramId}`;
}

/**
 * Parse an automation target key
 */
export function parseAutomationTargetKey(key: string): AutomationTarget {
  const parts = key.split(':');
  if (parts.length < 3) {
    throw new Error(`Invalid automation target key: ${key}`);
  }
  
  const scope = parts[0] as AutomationTarget['scope'];
  if (!['track', 'plugin', 'send', 'instrument', 'macro'].includes(scope)) {
    throw new Error(`Invalid automation scope: ${scope}`);
  }
  
  // Join remaining parts for paramId (allows colons in paramId)
  const ownerId = parts[1];
  const paramId = parts.slice(2).join(':');
  
  return {
    scope,
    ownerId,
    paramId,
  };
}

// ==================== Lane Creation ====================

/**
 * Create a new automation lane
 */
export function createAutomationLane(
  id: string,
  target: AutomationTarget,
  options?: {
    mode?: AutomationMode;
    interpolation?: AutomationInterpolation;
    color?: string;
  }
): AutomationLane {
  return {
    id,
    target,
    mode: options?.mode ?? 'read',
    points: [],
    interpolation: options?.interpolation ?? 'linear',
    visible: true,
    height: 40,
    color: options?.color,
    overrideActive: false,
  };
}

/**
 * Create an automation lane for a track parameter
 */
export function createTrackAutomationLane(
  id: string,
  trackId: string,
  paramId: string,
  options?: {
    mode?: AutomationMode;
    color?: string;
  }
): AutomationLane {
  return createAutomationLane(
    id,
    { scope: 'track', ownerId: trackId, paramId },
    options
  );
}

/**
 * Create an automation lane for a plugin parameter
 */
export function createPluginAutomationLane(
  id: string,
  pluginId: string,
  paramId: string,
  options?: {
    mode?: AutomationMode;
    color?: string;
  }
): AutomationLane {
  return createAutomationLane(
    id,
    { scope: 'plugin', ownerId: pluginId, paramId },
    options
  );
}

// ==================== Preset Values ====================

/** Common automation targets */
export const COMMON_AUTOMATION_TARGETS = {
  TRACK_VOLUME: 'volume',
  TRACK_PAN: 'pan',
  TRACK_MUTE: 'mute',
  TRACK_SEND_LEVEL: 'send-level',
  PLUGIN_BYPASS: 'bypass',
} as const;

/** Value ranges for common targets (for normalization) */
export const AUTOMATION_RANGES: Record<string, { min: number; max: number }> = {
  [COMMON_AUTOMATION_TARGETS.TRACK_VOLUME]: { min: -96, max: 12 }, // dB
  [COMMON_AUTOMATION_TARGETS.TRACK_PAN]: { min: -100, max: 100 }, // percent
  [COMMON_AUTOMATION_TARGETS.TRACK_SEND_LEVEL]: { min: -96, max: 12 }, // dB
};

/**
 * Normalize a value to 0-1 range based on target type
 */
export function normalizeValue(targetId: string, value: number): number {
  const range = AUTOMATION_RANGES[targetId];
  if (!range) {
    return Math.max(0, Math.min(1, value));
  }
  
  return (value - range.min) / (range.max - range.min);
}

/**
 * Denormalize a value from 0-1 to actual range
 */
export function denormalizeValue(targetId: string, normalized: number): number {
  const range = AUTOMATION_RANGES[targetId];
  if (!range) {
    return normalized;
  }
  
  return normalized * (range.max - range.min) + range.min;
}
