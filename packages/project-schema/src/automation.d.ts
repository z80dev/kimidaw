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
    value: number;
    curveIn?: number;
    curveOut?: number;
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
    laneDisplayRange?: {
        min: number;
        max: number;
    };
    visible: boolean;
    height: number;
    color?: string;
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
    controlPoints?: {
        tick: number;
        value: number;
    }[];
}
/** Automation snapshot at a point in time */
export interface AutomationSnapshot {
    tick: number;
    values: Map<string, number>;
}
/**
 * Interpolate between two values based on mode
 */
export declare function interpolateValue(t: number, // 0 to 1 position between points
startValue: number, endValue: number, mode: AutomationInterpolation, curveIn?: number, curveOut?: number): number;
/**
 * Get the automation value at a specific tick position
 */
export declare function getValueAtTick(lane: AutomationLane, tick: number): number | undefined;
/**
 * Add a point to an automation lane
 */
export declare function addPoint(lane: AutomationLane, tick: number, value: number, options?: {
    curveIn?: number;
    curveOut?: number;
    stepHold?: boolean;
}): AutomationLane;
/**
 * Remove a point from an automation lane
 */
export declare function removePoint(lane: AutomationLane, pointIndex: number): AutomationLane;
/**
 * Remove points within a time range
 */
export declare function removePointsInRange(lane: AutomationLane, startTick: number, endTick: number): AutomationLane;
/**
 * Scale automation values
 */
export declare function scaleValues(lane: AutomationLane, factor: number): AutomationLane;
/**
 * Shift automation in time
 */
export declare function shiftInTime(lane: AutomationLane, offsetTicks: number): AutomationLane;
/**
 * Create a key for an automation target
 */
export declare function automationTargetKey(target: AutomationTarget): string;
/**
 * Parse an automation target key
 */
export declare function parseAutomationTargetKey(key: string): AutomationTarget;
/**
 * Create a new automation lane
 */
export declare function createAutomationLane(id: string, target: AutomationTarget, options?: {
    mode?: AutomationMode;
    interpolation?: AutomationInterpolation;
    color?: string;
}): AutomationLane;
/**
 * Create an automation lane for a track parameter
 */
export declare function createTrackAutomationLane(id: string, trackId: string, paramId: string, options?: {
    mode?: AutomationMode;
    color?: string;
}): AutomationLane;
/**
 * Create an automation lane for a plugin parameter
 */
export declare function createPluginAutomationLane(id: string, pluginId: string, paramId: string, options?: {
    mode?: AutomationMode;
    color?: string;
}): AutomationLane;
/** Common automation targets */
export declare const COMMON_AUTOMATION_TARGETS: {
    readonly TRACK_VOLUME: "volume";
    readonly TRACK_PAN: "pan";
    readonly TRACK_MUTE: "mute";
    readonly TRACK_SEND_LEVEL: "send-level";
    readonly PLUGIN_BYPASS: "bypass";
};
/** Value ranges for common targets (for normalization) */
export declare const AUTOMATION_RANGES: Record<string, {
    min: number;
    max: number;
}>;
/**
 * Normalize a value to 0-1 range based on target type
 */
export declare function normalizeValue(targetId: string, value: number): number;
/**
 * Denormalize a value from 0-1 to actual range
 */
export declare function denormalizeValue(targetId: string, normalized: number): number;
//# sourceMappingURL=automation.d.ts.map