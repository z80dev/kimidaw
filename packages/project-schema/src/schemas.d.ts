/**
 * Zod schemas for runtime validation
 *
 * These schemas mirror the TypeScript interfaces and provide
 * runtime validation for data coming from storage or network.
 */
import { z } from 'zod';
export declare const HexColorSchema: z.ZodString;
export declare const UuidSchema: z.ZodString;
export declare const TimestampSchema: z.ZodString;
export declare const MusicalTimeSchema: z.ZodObject<{
    bars: z.ZodNumber;
    beats: z.ZodNumber;
    ticks: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    beats: number;
    bars: number;
    ticks: number;
}, {
    beats: number;
    bars: number;
    ticks: number;
}>;
export declare const TempoEventSchema: z.ZodObject<{
    tick: z.ZodNumber;
    bpm: z.ZodNumber;
    curve: z.ZodEnum<["jump", "ramp"]>;
}, "strip", z.ZodTypeAny, {
    tick: number;
    bpm: number;
    curve: "jump" | "ramp";
}, {
    tick: number;
    bpm: number;
    curve: "jump" | "ramp";
}>;
export declare const TimeSignatureEventSchema: z.ZodObject<{
    tick: z.ZodNumber;
    numerator: z.ZodNumber;
    denominator: z.ZodEffects<z.ZodNumber, number, number>;
}, "strip", z.ZodTypeAny, {
    numerator: number;
    denominator: number;
    tick: number;
}, {
    numerator: number;
    denominator: number;
    tick: number;
}>;
export declare const MarkerSchema: z.ZodObject<{
    id: z.ZodString;
    tick: z.ZodNumber;
    name: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["locator", "cue", "loop", "section"]>;
}, "strip", z.ZodTypeAny, {
    type: "locator" | "cue" | "loop" | "section";
    name: string;
    id: string;
    tick: number;
    color?: string | undefined;
}, {
    type: "locator" | "cue" | "loop" | "section";
    name: string;
    id: string;
    tick: number;
    color?: string | undefined;
}>;
export declare const LoopSpecSchema: z.ZodObject<{
    startTick: z.ZodNumber;
    endTick: z.ZodNumber;
    enabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    startTick: number;
    endTick: number;
}, {
    enabled: boolean;
    startTick: number;
    endTick: number;
}>;
export declare const SchedulerConfigSchema: z.ZodObject<{
    prepareHorizonMs: z.ZodNumber;
    refillThresholdMs: z.ZodNumber;
    maxChunkMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    prepareHorizonMs: number;
    refillThresholdMs: number;
    maxChunkMs: number;
}, {
    prepareHorizonMs: number;
    refillThresholdMs: number;
    maxChunkMs: number;
}>;
export declare const PluginParameterSpecSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    kind: z.ZodEnum<["float", "int", "bool", "enum"]>;
    min: z.ZodNumber;
    max: z.ZodNumber;
    defaultValue: z.ZodNumber;
    step: z.ZodOptional<z.ZodNumber>;
    automationRate: z.ZodOptional<z.ZodEnum<["a-rate", "k-rate"]>>;
    unit: z.ZodOptional<z.ZodString>;
    labels: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    kind: "float" | "int" | "bool" | "enum";
    min: number;
    max: number;
    defaultValue: number;
    step?: number | undefined;
    automationRate?: "a-rate" | "k-rate" | undefined;
    unit?: string | undefined;
    labels?: string[] | undefined;
}, {
    name: string;
    id: string;
    kind: "float" | "int" | "bool" | "enum";
    min: number;
    max: number;
    defaultValue: number;
    step?: number | undefined;
    automationRate?: "a-rate" | "k-rate" | undefined;
    unit?: string | undefined;
    labels?: string[] | undefined;
}>;
export declare const PluginUiDescriptorSchema: z.ZodObject<{
    type: z.ZodEnum<["native", "custom", "wam"]>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    resizeable: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "native" | "custom" | "wam";
    width?: number | undefined;
    height?: number | undefined;
    resizeable?: boolean | undefined;
}, {
    type: "native" | "custom" | "wam";
    width?: number | undefined;
    height?: number | undefined;
    resizeable?: boolean | undefined;
}>;
export declare const PluginInstanceSchema: z.ZodObject<{
    id: z.ZodString;
    definitionId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
    state: z.ZodOptional<z.ZodUnknown>;
    bypass: z.ZodBoolean;
    presetId: z.ZodOptional<z.ZodString>;
    enabled: z.ZodBoolean;
    sidechainSource: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    bypass: boolean;
    enabled: boolean;
    definitionId: string;
    parameterValues: Record<string, number>;
    name?: string | undefined;
    state?: unknown;
    presetId?: string | undefined;
    sidechainSource?: string | undefined;
}, {
    id: string;
    bypass: boolean;
    enabled: boolean;
    definitionId: string;
    parameterValues: Record<string, number>;
    name?: string | undefined;
    state?: unknown;
    presetId?: string | undefined;
    sidechainSource?: string | undefined;
}>;
export declare const AutomationTargetSchema: z.ZodObject<{
    scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
    ownerId: z.ZodString;
    paramId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    scope: "track" | "plugin" | "send" | "instrument" | "macro";
    ownerId: string;
    paramId: string;
}, {
    scope: "track" | "plugin" | "send" | "instrument" | "macro";
    ownerId: string;
    paramId: string;
}>;
export declare const AutomationPointSchema: z.ZodObject<{
    tick: z.ZodNumber;
    value: z.ZodNumber;
    curveIn: z.ZodOptional<z.ZodNumber>;
    curveOut: z.ZodOptional<z.ZodNumber>;
    stepHold: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    value: number;
    tick: number;
    curveIn?: number | undefined;
    curveOut?: number | undefined;
    stepHold?: boolean | undefined;
}, {
    value: number;
    tick: number;
    curveIn?: number | undefined;
    curveOut?: number | undefined;
    stepHold?: boolean | undefined;
}>;
export declare const AutomationLaneSchema: z.ZodObject<{
    id: z.ZodString;
    target: z.ZodObject<{
        scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
        ownerId: z.ZodString;
        paramId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        scope: "track" | "plugin" | "send" | "instrument" | "macro";
        ownerId: string;
        paramId: string;
    }, {
        scope: "track" | "plugin" | "send" | "instrument" | "macro";
        ownerId: string;
        paramId: string;
    }>;
    mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
    points: z.ZodArray<z.ZodObject<{
        tick: z.ZodNumber;
        value: z.ZodNumber;
        curveIn: z.ZodOptional<z.ZodNumber>;
        curveOut: z.ZodOptional<z.ZodNumber>;
        stepHold: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        tick: number;
        curveIn?: number | undefined;
        curveOut?: number | undefined;
        stepHold?: boolean | undefined;
    }, {
        value: number;
        tick: number;
        curveIn?: number | undefined;
        curveOut?: number | undefined;
        stepHold?: boolean | undefined;
    }>, "many">;
    interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
    laneDisplayRange: z.ZodOptional<z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        min: number;
        max: number;
    }, {
        min: number;
        max: number;
    }>>;
    visible: z.ZodBoolean;
    height: z.ZodNumber;
    color: z.ZodOptional<z.ZodString>;
    overrideValue: z.ZodOptional<z.ZodNumber>;
    overrideActive: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    height: number;
    target: {
        scope: "track" | "plugin" | "send" | "instrument" | "macro";
        ownerId: string;
        paramId: string;
    };
    mode: "read" | "touch" | "latch" | "write" | "trim";
    points: {
        value: number;
        tick: number;
        curveIn?: number | undefined;
        curveOut?: number | undefined;
        stepHold?: boolean | undefined;
    }[];
    interpolation: "step" | "linear" | "bezier";
    visible: boolean;
    overrideActive: boolean;
    color?: string | undefined;
    laneDisplayRange?: {
        min: number;
        max: number;
    } | undefined;
    overrideValue?: number | undefined;
}, {
    id: string;
    height: number;
    target: {
        scope: "track" | "plugin" | "send" | "instrument" | "macro";
        ownerId: string;
        paramId: string;
    };
    mode: "read" | "touch" | "latch" | "write" | "trim";
    points: {
        value: number;
        tick: number;
        curveIn?: number | undefined;
        curveOut?: number | undefined;
        stepHold?: boolean | undefined;
    }[];
    interpolation: "step" | "linear" | "bezier";
    visible: boolean;
    overrideActive: boolean;
    color?: string | undefined;
    laneDisplayRange?: {
        min: number;
        max: number;
    } | undefined;
    overrideValue?: number | undefined;
}>;
export declare const InputBindingSchema: z.ZodObject<{
    type: z.ZodEnum<["audio", "midi", "none"]>;
    deviceId: z.ZodOptional<z.ZodString>;
    channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
}, "strip", z.ZodTypeAny, {
    type: "audio" | "midi" | "none";
    deviceId?: string | undefined;
    channel?: number | "all" | undefined;
}, {
    type: "audio" | "midi" | "none";
    deviceId?: string | undefined;
    channel?: number | "all" | undefined;
}>;
export declare const OutputBindingSchema: z.ZodObject<{
    type: z.ZodEnum<["master", "bus", "track"]>;
    targetId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "track" | "master" | "bus";
    targetId: string;
}, {
    type: "track" | "master" | "bus";
    targetId: string;
}>;
export declare const SendSlotSchema: z.ZodObject<{
    id: z.ZodString;
    targetBusId: z.ZodString;
    levelDb: z.ZodNumber;
    preFader: z.ZodBoolean;
    active: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    targetBusId: string;
    levelDb: number;
    preFader: boolean;
    active: boolean;
}, {
    id: string;
    targetBusId: string;
    levelDb: number;
    preFader: boolean;
    active: boolean;
}>;
export declare const MacroBindingSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    target: z.ZodUnion<[z.ZodObject<{
        scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
        ownerId: z.ZodString;
        paramId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        scope: "track" | "plugin" | "send" | "instrument" | "macro";
        ownerId: string;
        paramId: string;
    }, {
        scope: "track" | "plugin" | "send" | "instrument" | "macro";
        ownerId: string;
        paramId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"plugin-param">;
        pluginId: z.ZodString;
        paramId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "plugin-param";
        paramId: string;
        pluginId: string;
    }, {
        type: "plugin-param";
        paramId: string;
        pluginId: string;
    }>]>;
    value: z.ZodNumber;
    min: z.ZodNumber;
    max: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    value: number;
    min: number;
    max: number;
    target: {
        scope: "track" | "plugin" | "send" | "instrument" | "macro";
        ownerId: string;
        paramId: string;
    } | {
        type: "plugin-param";
        paramId: string;
        pluginId: string;
    };
}, {
    name: string;
    id: string;
    value: number;
    min: number;
    max: number;
    target: {
        scope: "track" | "plugin" | "send" | "instrument" | "macro";
        ownerId: string;
        paramId: string;
    } | {
        type: "plugin-param";
        paramId: string;
        pluginId: string;
    };
}>;
export declare const CompLaneSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    active: z.ZodBoolean;
    muted: z.ZodBoolean;
    color: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    active: boolean;
    muted: boolean;
    color?: string | undefined;
}, {
    name: string;
    id: string;
    active: boolean;
    muted: boolean;
    color?: string | undefined;
}>;
export declare const AudioClipRefSchema: z.ZodObject<{
    id: z.ZodString;
    clipId: z.ZodString;
    lane: z.ZodNumber;
    startTick: z.ZodNumber;
    endTick: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    startTick: number;
    endTick: number;
    clipId: string;
    lane: number;
}, {
    id: string;
    startTick: number;
    endTick: number;
    clipId: string;
    lane: number;
}>;
export declare const MidiClipRefSchema: z.ZodObject<{
    id: z.ZodString;
    clipId: z.ZodString;
    startTick: z.ZodNumber;
    endTick: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    startTick: number;
    endTick: number;
    clipId: string;
}, {
    id: string;
    startTick: number;
    endTick: number;
    clipId: string;
}>;
export declare const ClipSlotSchema: z.ZodObject<{
    trackId: z.ZodString;
    sceneIndex: z.ZodNumber;
    clipId: z.ZodOptional<z.ZodString>;
    state: z.ZodEnum<["empty", "stopped", "playing", "recording", "queued"]>;
    color: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    state: "empty" | "stopped" | "playing" | "recording" | "queued";
    trackId: string;
    sceneIndex: number;
    color?: string | undefined;
    clipId?: string | undefined;
}, {
    state: "empty" | "stopped" | "playing" | "recording" | "queued";
    trackId: string;
    sceneIndex: number;
    color?: string | undefined;
    clipId?: string | undefined;
}>;
export declare const FollowActionSchema: z.ZodObject<{
    type: z.ZodEnum<["none", "next", "previous", "first", "last", "any", "other"]>;
    targetId: z.ZodOptional<z.ZodString>;
    delayBars: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "next" | "none" | "previous" | "first" | "last" | "any" | "other";
    delayBars: number;
    targetId?: string | undefined;
}, {
    type: "next" | "none" | "previous" | "first" | "last" | "any" | "other";
    delayBars: number;
    targetId?: string | undefined;
}>;
export declare const SceneSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    index: z.ZodNumber;
    color: z.ZodOptional<z.ZodString>;
    tempo: z.ZodOptional<z.ZodNumber>;
    timeSignature: z.ZodOptional<z.ZodObject<{
        numerator: z.ZodNumber;
        denominator: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        numerator: number;
        denominator: number;
    }, {
        numerator: number;
        denominator: number;
    }>>;
    slots: z.ZodArray<z.ZodObject<{
        trackId: z.ZodString;
        sceneIndex: z.ZodNumber;
        clipId: z.ZodOptional<z.ZodString>;
        state: z.ZodEnum<["empty", "stopped", "playing", "recording", "queued"]>;
        color: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        state: "empty" | "stopped" | "playing" | "recording" | "queued";
        trackId: string;
        sceneIndex: number;
        color?: string | undefined;
        clipId?: string | undefined;
    }, {
        state: "empty" | "stopped" | "playing" | "recording" | "queued";
        trackId: string;
        sceneIndex: number;
        color?: string | undefined;
        clipId?: string | undefined;
    }>, "many">;
    launchQuantization: z.ZodOptional<z.ZodNumber>;
    launchFollowAction: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["none", "next", "previous", "first", "last", "any", "other"]>;
        targetId: z.ZodOptional<z.ZodString>;
        delayBars: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "next" | "none" | "previous" | "first" | "last" | "any" | "other";
        delayBars: number;
        targetId?: string | undefined;
    }, {
        type: "next" | "none" | "previous" | "first" | "last" | "any" | "other";
        delayBars: number;
        targetId?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    index: number;
    slots: {
        state: "empty" | "stopped" | "playing" | "recording" | "queued";
        trackId: string;
        sceneIndex: number;
        color?: string | undefined;
        clipId?: string | undefined;
    }[];
    color?: string | undefined;
    tempo?: number | undefined;
    timeSignature?: {
        numerator: number;
        denominator: number;
    } | undefined;
    launchQuantization?: number | undefined;
    launchFollowAction?: {
        type: "next" | "none" | "previous" | "first" | "last" | "any" | "other";
        delayBars: number;
        targetId?: string | undefined;
    } | undefined;
}, {
    name: string;
    id: string;
    index: number;
    slots: {
        state: "empty" | "stopped" | "playing" | "recording" | "queued";
        trackId: string;
        sceneIndex: number;
        color?: string | undefined;
        clipId?: string | undefined;
    }[];
    color?: string | undefined;
    tempo?: number | undefined;
    timeSignature?: {
        numerator: number;
        denominator: number;
    } | undefined;
    launchQuantization?: number | undefined;
    launchFollowAction?: {
        type: "next" | "none" | "previous" | "first" | "last" | "any" | "other";
        delayBars: number;
        targetId?: string | undefined;
    } | undefined;
}>;
export declare const TrackBaseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}, {
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}>;
export declare const AudioTrackSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"audio">;
    clips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        clipId: z.ZodString;
        lane: z.ZodNumber;
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }>, "many">;
    compLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        active: z.ZodBoolean;
        muted: z.ZodBoolean;
        color: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        active: boolean;
        muted: boolean;
        color?: string | undefined;
    }, {
        name: string;
        id: string;
        active: boolean;
        muted: boolean;
        color?: string | undefined;
    }>, "many">;
    currentCompLaneId: z.ZodOptional<z.ZodString>;
    warpMode: z.ZodOptional<z.ZodEnum<["repitch", "beats", "texture", "tones", "complex", "complex-pro"]>>;
    inputMonitoring: z.ZodBoolean;
    latencyCompensation: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "audio";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }[];
    compLanes: {
        name: string;
        id: string;
        active: boolean;
        muted: boolean;
        color?: string | undefined;
    }[];
    inputMonitoring: boolean;
    latencyCompensation: number;
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
    currentCompLaneId?: string | undefined;
    warpMode?: "repitch" | "beats" | "texture" | "tones" | "complex" | "complex-pro" | undefined;
}, {
    type: "audio";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }[];
    compLanes: {
        name: string;
        id: string;
        active: boolean;
        muted: boolean;
        color?: string | undefined;
    }[];
    inputMonitoring: boolean;
    latencyCompensation: number;
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
    currentCompLaneId?: string | undefined;
    warpMode?: "repitch" | "beats" | "texture" | "tones" | "complex" | "complex-pro" | undefined;
}>;
export declare const MidiTrackSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"midi">;
    clips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        clipId: z.ZodString;
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }>, "many">;
    destination: z.ZodUnion<[z.ZodObject<{
        type: z.ZodLiteral<"plugin">;
        pluginId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "plugin";
        pluginId: string;
    }, {
        type: "plugin";
        pluginId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"external-midi">;
        deviceId: z.ZodString;
        channel: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "external-midi";
        deviceId: string;
        channel: number;
    }, {
        type: "external-midi";
        deviceId: string;
        channel: number;
    }>]>;
}, "strip", z.ZodTypeAny, {
    type: "midi";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    destination: {
        type: "plugin";
        pluginId: string;
    } | {
        type: "external-midi";
        deviceId: string;
        channel: number;
    };
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}, {
    type: "midi";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    destination: {
        type: "plugin";
        pluginId: string;
    } | {
        type: "external-midi";
        deviceId: string;
        channel: number;
    };
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}>;
export declare const InstrumentTrackSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"instrument">;
    clips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        clipId: z.ZodString;
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }>, "many">;
    instrument: z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>;
    noteFx: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "instrument";
    name: string;
    id: string;
    instrument: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    };
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    noteFx: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}, {
    type: "instrument";
    name: string;
    id: string;
    instrument: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    };
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    noteFx: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}>;
export declare const GroupTrackSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"group">;
    children: z.ZodArray<z.ZodString, "many">;
    clips: z.ZodArray<z.ZodNever, "many">;
}, "strip", z.ZodTypeAny, {
    type: "group";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: never[];
    children: string[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}, {
    type: "group";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: never[];
    children: string[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}>;
export declare const ReturnTrackSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"return">;
    clips: z.ZodArray<z.ZodNever, "many">;
}, "strip", z.ZodTypeAny, {
    type: "return";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: never[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}, {
    type: "return";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: never[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}>;
export declare const AuxTrackSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"aux">;
    source: z.ZodEnum<["input", "bus", "track"]>;
    sourceId: z.ZodOptional<z.ZodString>;
    clips: z.ZodArray<z.ZodNever, "many">;
}, "strip", z.ZodTypeAny, {
    type: "aux";
    name: string;
    id: string;
    source: "track" | "bus" | "input";
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: never[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
    sourceId?: string | undefined;
}, {
    type: "aux";
    name: string;
    id: string;
    source: "track" | "bus" | "input";
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: never[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
    sourceId?: string | undefined;
}>;
export declare const ExternalMidiTrackSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"external-midi">;
    clips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        clipId: z.ZodString;
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }>, "many">;
    deviceId: z.ZodString;
    channel: z.ZodNumber;
    programChange: z.ZodOptional<z.ZodNumber>;
    bankMsb: z.ZodOptional<z.ZodNumber>;
    bankLsb: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "external-midi";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    deviceId: string;
    channel: number;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
    programChange?: number | undefined;
    bankMsb?: number | undefined;
    bankLsb?: number | undefined;
}, {
    type: "external-midi";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    deviceId: string;
    channel: number;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
    programChange?: number | undefined;
    bankMsb?: number | undefined;
    bankLsb?: number | undefined;
}>;
export declare const HybridTrackSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"hybrid">;
    audioClips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        clipId: z.ZodString;
        lane: z.ZodNumber;
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }>, "many">;
    midiClips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        clipId: z.ZodString;
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }>, "many">;
    instrument: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>>;
    noteFx: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "hybrid";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    noteFx: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    audioClips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }[];
    midiClips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    instrument?: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    } | undefined;
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}, {
    type: "hybrid";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    noteFx: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    audioClips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }[];
    midiClips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    instrument?: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    } | undefined;
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}>;
export declare const TrackSchema: z.ZodUnion<[z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"audio">;
    clips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        clipId: z.ZodString;
        lane: z.ZodNumber;
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }>, "many">;
    compLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        active: z.ZodBoolean;
        muted: z.ZodBoolean;
        color: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        active: boolean;
        muted: boolean;
        color?: string | undefined;
    }, {
        name: string;
        id: string;
        active: boolean;
        muted: boolean;
        color?: string | undefined;
    }>, "many">;
    currentCompLaneId: z.ZodOptional<z.ZodString>;
    warpMode: z.ZodOptional<z.ZodEnum<["repitch", "beats", "texture", "tones", "complex", "complex-pro"]>>;
    inputMonitoring: z.ZodBoolean;
    latencyCompensation: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "audio";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }[];
    compLanes: {
        name: string;
        id: string;
        active: boolean;
        muted: boolean;
        color?: string | undefined;
    }[];
    inputMonitoring: boolean;
    latencyCompensation: number;
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
    currentCompLaneId?: string | undefined;
    warpMode?: "repitch" | "beats" | "texture" | "tones" | "complex" | "complex-pro" | undefined;
}, {
    type: "audio";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }[];
    compLanes: {
        name: string;
        id: string;
        active: boolean;
        muted: boolean;
        color?: string | undefined;
    }[];
    inputMonitoring: boolean;
    latencyCompensation: number;
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
    currentCompLaneId?: string | undefined;
    warpMode?: "repitch" | "beats" | "texture" | "tones" | "complex" | "complex-pro" | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"midi">;
    clips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        clipId: z.ZodString;
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }>, "many">;
    destination: z.ZodUnion<[z.ZodObject<{
        type: z.ZodLiteral<"plugin">;
        pluginId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "plugin";
        pluginId: string;
    }, {
        type: "plugin";
        pluginId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"external-midi">;
        deviceId: z.ZodString;
        channel: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "external-midi";
        deviceId: string;
        channel: number;
    }, {
        type: "external-midi";
        deviceId: string;
        channel: number;
    }>]>;
}, "strip", z.ZodTypeAny, {
    type: "midi";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    destination: {
        type: "plugin";
        pluginId: string;
    } | {
        type: "external-midi";
        deviceId: string;
        channel: number;
    };
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}, {
    type: "midi";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    destination: {
        type: "plugin";
        pluginId: string;
    } | {
        type: "external-midi";
        deviceId: string;
        channel: number;
    };
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"instrument">;
    clips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        clipId: z.ZodString;
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }>, "many">;
    instrument: z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>;
    noteFx: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "instrument";
    name: string;
    id: string;
    instrument: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    };
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    noteFx: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}, {
    type: "instrument";
    name: string;
    id: string;
    instrument: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    };
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    noteFx: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"group">;
    children: z.ZodArray<z.ZodString, "many">;
    clips: z.ZodArray<z.ZodNever, "many">;
}, "strip", z.ZodTypeAny, {
    type: "group";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: never[];
    children: string[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}, {
    type: "group";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: never[];
    children: string[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"return">;
    clips: z.ZodArray<z.ZodNever, "many">;
}, "strip", z.ZodTypeAny, {
    type: "return";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: never[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}, {
    type: "return";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: never[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"aux">;
    source: z.ZodEnum<["input", "bus", "track"]>;
    sourceId: z.ZodOptional<z.ZodString>;
    clips: z.ZodArray<z.ZodNever, "many">;
}, "strip", z.ZodTypeAny, {
    type: "aux";
    name: string;
    id: string;
    source: "track" | "bus" | "input";
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: never[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
    sourceId?: string | undefined;
}, {
    type: "aux";
    name: string;
    id: string;
    source: "track" | "bus" | "input";
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: never[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
    sourceId?: string | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"external-midi">;
    clips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        clipId: z.ZodString;
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }>, "many">;
    deviceId: z.ZodString;
    channel: z.ZodNumber;
    programChange: z.ZodOptional<z.ZodNumber>;
    bankMsb: z.ZodOptional<z.ZodNumber>;
    bankLsb: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "external-midi";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    deviceId: string;
    channel: number;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
    programChange?: number | undefined;
    bankMsb?: number | undefined;
    bankLsb?: number | undefined;
}, {
    type: "external-midi";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    deviceId: string;
    channel: number;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    clips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
    programChange?: number | undefined;
    bankMsb?: number | undefined;
    bankLsb?: number | undefined;
}>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    arm: z.ZodBoolean;
    monitorMode: z.ZodEnum<["off", "auto", "in"]>;
    input: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["audio", "midi", "none"]>;
        deviceId: z.ZodOptional<z.ZodString>;
        channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }, {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    }>>;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    comments: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    parentId: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    collapsed: z.ZodBoolean;
} & {
    type: z.ZodLiteral<"hybrid">;
    audioClips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        clipId: z.ZodString;
        lane: z.ZodNumber;
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }>, "many">;
    midiClips: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        clipId: z.ZodString;
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }, {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }>, "many">;
    instrument: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>>;
    noteFx: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "hybrid";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    noteFx: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    audioClips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }[];
    midiClips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    instrument?: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    } | undefined;
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}, {
    type: "hybrid";
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    arm: boolean;
    monitorMode: "off" | "auto" | "in";
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    noteFx: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    audioClips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
        lane: number;
    }[];
    midiClips: {
        id: string;
        startTick: number;
        endTick: number;
        clipId: string;
    }[];
    instrument?: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    } | undefined;
    input?: {
        type: "audio" | "midi" | "none";
        deviceId?: string | undefined;
        channel?: number | "all" | undefined;
    } | undefined;
    height?: number | undefined;
    comments?: string | undefined;
    parentId?: string | undefined;
}>]>;
export declare const BusTrackSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
    mute: z.ZodBoolean;
    solo: z.ZodBoolean;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    sends: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        targetBusId: z.ZodString;
        levelDb: z.ZodNumber;
        preFader: z.ZodBoolean;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }, {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    output: z.ZodObject<{
        type: z.ZodEnum<["master", "bus", "track"]>;
        targetId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "track" | "master" | "bus";
        targetId: string;
    }, {
        type: "track" | "master" | "bus";
        targetId: string;
    }>;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    order: z.ZodNumber;
    collapsed: z.ZodBoolean;
    busType: z.ZodEnum<["aux", "subgroup", "sidechain"]>;
    sourceTrackIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    busType: "aux" | "subgroup" | "sidechain";
    sourceTrackIds: string[];
}, {
    name: string;
    id: string;
    mute: boolean;
    color: string;
    solo: boolean;
    output: {
        type: "track" | "master" | "bus";
        targetId: string;
    };
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    sends: {
        id: string;
        targetBusId: string;
        levelDb: number;
        preFader: boolean;
        active: boolean;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    order: number;
    collapsed: boolean;
    busType: "aux" | "subgroup" | "sidechain";
    sourceTrackIds: string[];
}>;
export declare const MasterTrackSchema: z.ZodObject<{
    id: z.ZodLiteral<"master">;
    name: z.ZodLiteral<"Master">;
    color: z.ZodString;
    mute: z.ZodBoolean;
    inserts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>, "many">;
    automationLanes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>;
        mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
        points: z.ZodArray<z.ZodObject<{
            tick: z.ZodNumber;
            value: z.ZodNumber;
            curveIn: z.ZodOptional<z.ZodNumber>;
            curveOut: z.ZodOptional<z.ZodNumber>;
            stepHold: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }, {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }>, "many">;
        interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
        laneDisplayRange: z.ZodOptional<z.ZodObject<{
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            min: number;
            max: number;
        }, {
            min: number;
            max: number;
        }>>;
        visible: z.ZodBoolean;
        height: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        overrideValue: z.ZodOptional<z.ZodNumber>;
        overrideActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }, {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }>, "many">;
    macros: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        target: z.ZodUnion<[z.ZodObject<{
            scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
            ownerId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }, {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"plugin-param">;
            pluginId: z.ZodString;
            paramId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }, {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        }>]>;
        value: z.ZodNumber;
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }, {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }>, "many">;
    collapsed: z.ZodBoolean;
    limiter: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        definitionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
        state: z.ZodOptional<z.ZodUnknown>;
        bypass: z.ZodBoolean;
        presetId: z.ZodOptional<z.ZodString>;
        enabled: z.ZodBoolean;
        sidechainSource: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }, {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }>>;
    dither: z.ZodEnum<["none", "triangular", "noise-shaped"]>;
    truePeak: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    name: "Master";
    id: "master";
    mute: boolean;
    color: string;
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    collapsed: boolean;
    dither: "none" | "triangular" | "noise-shaped";
    truePeak: boolean;
    limiter?: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    } | undefined;
}, {
    name: "Master";
    id: "master";
    mute: boolean;
    color: string;
    inserts: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    }[];
    automationLanes: {
        id: string;
        height: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        };
        mode: "read" | "touch" | "latch" | "write" | "trim";
        points: {
            value: number;
            tick: number;
            curveIn?: number | undefined;
            curveOut?: number | undefined;
            stepHold?: boolean | undefined;
        }[];
        interpolation: "step" | "linear" | "bezier";
        visible: boolean;
        overrideActive: boolean;
        color?: string | undefined;
        laneDisplayRange?: {
            min: number;
            max: number;
        } | undefined;
        overrideValue?: number | undefined;
    }[];
    macros: {
        name: string;
        id: string;
        value: number;
        min: number;
        max: number;
        target: {
            scope: "track" | "plugin" | "send" | "instrument" | "macro";
            ownerId: string;
            paramId: string;
        } | {
            type: "plugin-param";
            paramId: string;
            pluginId: string;
        };
    }[];
    collapsed: boolean;
    dither: "none" | "triangular" | "noise-shaped";
    truePeak: boolean;
    limiter?: {
        id: string;
        bypass: boolean;
        enabled: boolean;
        definitionId: string;
        parameterValues: Record<string, number>;
        name?: string | undefined;
        state?: unknown;
        presetId?: string | undefined;
        sidechainSource?: string | undefined;
    } | undefined;
}>;
export declare const FadeCurveSchema: z.ZodEnum<["linear", "equal-power", "exponential", "logarithmic", "s-curve"]>;
export declare const FadeConfigSchema: z.ZodObject<{
    inCurve: z.ZodEnum<["linear", "equal-power", "exponential", "logarithmic", "s-curve"]>;
    outCurve: z.ZodEnum<["linear", "equal-power", "exponential", "logarithmic", "s-curve"]>;
    inSamples: z.ZodNumber;
    outSamples: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
    outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
    inSamples: number;
    outSamples: number;
}, {
    inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
    outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
    inSamples: number;
    outSamples: number;
}>;
export declare const WarpMarkerSchema: z.ZodObject<{
    sourceSample: z.ZodNumber;
    targetTick: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    sourceSample: number;
    targetTick: number;
}, {
    sourceSample: number;
    targetTick: number;
}>;
export declare const WarpSpecSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    markers: z.ZodArray<z.ZodObject<{
        sourceSample: z.ZodNumber;
        targetTick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sourceSample: number;
        targetTick: number;
    }, {
        sourceSample: number;
        targetTick: number;
    }>, "many">;
    originBpm: z.ZodOptional<z.ZodNumber>;
    originalSampleRate: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    markers: {
        sourceSample: number;
        targetTick: number;
    }[];
    originalSampleRate: number;
    originBpm?: number | undefined;
}, {
    enabled: boolean;
    markers: {
        sourceSample: number;
        targetTick: number;
    }[];
    originalSampleRate: number;
    originBpm?: number | undefined;
}>;
export declare const BeatGridMarkerSchema: z.ZodObject<{
    samplePosition: z.ZodNumber;
    beatPosition: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    samplePosition: number;
    beatPosition: number;
}, {
    samplePosition: number;
    beatPosition: number;
}>;
export declare const GainEnvelopePointSchema: z.ZodObject<{
    tick: z.ZodNumber;
    gainDb: z.ZodNumber;
    curve: z.ZodEnum<["linear", "bezier"]>;
}, "strip", z.ZodTypeAny, {
    tick: number;
    curve: "linear" | "bezier";
    gainDb: number;
}, {
    tick: number;
    curve: "linear" | "bezier";
    gainDb: number;
}>;
export declare const AudioClipSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    assetId: z.ZodString;
    lane: z.ZodNumber;
    startTick: z.ZodNumber;
    endTick: z.ZodNumber;
    sourceStartSample: z.ZodNumber;
    sourceEndSample: z.ZodNumber;
    gainDb: z.ZodNumber;
    transposeSemitones: z.ZodNumber;
    fineTuneCents: z.ZodNumber;
    reverse: z.ZodBoolean;
    fades: z.ZodObject<{
        inCurve: z.ZodEnum<["linear", "equal-power", "exponential", "logarithmic", "s-curve"]>;
        outCurve: z.ZodEnum<["linear", "equal-power", "exponential", "logarithmic", "s-curve"]>;
        inSamples: z.ZodNumber;
        outSamples: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
        outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
        inSamples: number;
        outSamples: number;
    }, {
        inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
        outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
        inSamples: number;
        outSamples: number;
    }>;
    warp: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        markers: z.ZodArray<z.ZodObject<{
            sourceSample: z.ZodNumber;
            targetTick: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            sourceSample: number;
            targetTick: number;
        }, {
            sourceSample: number;
            targetTick: number;
        }>, "many">;
        originBpm: z.ZodOptional<z.ZodNumber>;
        originalSampleRate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        markers: {
            sourceSample: number;
            targetTick: number;
        }[];
        originalSampleRate: number;
        originBpm?: number | undefined;
    }, {
        enabled: boolean;
        markers: {
            sourceSample: number;
            targetTick: number;
        }[];
        originalSampleRate: number;
        originBpm?: number | undefined;
    }>>;
    stretchQuality: z.ZodEnum<["draft", "good", "best"]>;
    transientMarkers: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    beatGrid: z.ZodOptional<z.ZodArray<z.ZodObject<{
        samplePosition: z.ZodNumber;
        beatPosition: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        samplePosition: number;
        beatPosition: number;
    }, {
        samplePosition: number;
        beatPosition: number;
    }>, "many">>;
    takeIndex: z.ZodOptional<z.ZodNumber>;
    isComped: z.ZodBoolean;
    gainEnvelope: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tick: z.ZodNumber;
        gainDb: z.ZodNumber;
        curve: z.ZodEnum<["linear", "bezier"]>;
    }, "strip", z.ZodTypeAny, {
        tick: number;
        curve: "linear" | "bezier";
        gainDb: number;
    }, {
        tick: number;
        curve: "linear" | "bezier";
        gainDb: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    reverse: boolean;
    id: string;
    assetId: string;
    startTick: number;
    endTick: number;
    lane: number;
    gainDb: number;
    sourceStartSample: number;
    sourceEndSample: number;
    transposeSemitones: number;
    fineTuneCents: number;
    fades: {
        inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
        outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
        inSamples: number;
        outSamples: number;
    };
    stretchQuality: "draft" | "good" | "best";
    isComped: boolean;
    name?: string | undefined;
    color?: string | undefined;
    warp?: {
        enabled: boolean;
        markers: {
            sourceSample: number;
            targetTick: number;
        }[];
        originalSampleRate: number;
        originBpm?: number | undefined;
    } | undefined;
    transientMarkers?: number[] | undefined;
    beatGrid?: {
        samplePosition: number;
        beatPosition: number;
    }[] | undefined;
    takeIndex?: number | undefined;
    gainEnvelope?: {
        tick: number;
        curve: "linear" | "bezier";
        gainDb: number;
    }[] | undefined;
}, {
    reverse: boolean;
    id: string;
    assetId: string;
    startTick: number;
    endTick: number;
    lane: number;
    gainDb: number;
    sourceStartSample: number;
    sourceEndSample: number;
    transposeSemitones: number;
    fineTuneCents: number;
    fades: {
        inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
        outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
        inSamples: number;
        outSamples: number;
    };
    stretchQuality: "draft" | "good" | "best";
    isComped: boolean;
    name?: string | undefined;
    color?: string | undefined;
    warp?: {
        enabled: boolean;
        markers: {
            sourceSample: number;
            targetTick: number;
        }[];
        originalSampleRate: number;
        originBpm?: number | undefined;
    } | undefined;
    transientMarkers?: number[] | undefined;
    beatGrid?: {
        samplePosition: number;
        beatPosition: number;
    }[] | undefined;
    takeIndex?: number | undefined;
    gainEnvelope?: {
        tick: number;
        curve: "linear" | "bezier";
        gainDb: number;
    }[] | undefined;
}>;
export declare const MidiNoteSchema: z.ZodObject<{
    id: z.ZodString;
    note: z.ZodNumber;
    velocity: z.ZodNumber;
    startTick: z.ZodNumber;
    durationTicks: z.ZodNumber;
    pitchOffset: z.ZodOptional<z.ZodNumber>;
    timbre: z.ZodOptional<z.ZodNumber>;
    pressure: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    velocity: number;
    startTick: number;
    note: number;
    durationTicks: number;
    pitchOffset?: number | undefined;
    timbre?: number | undefined;
    pressure?: number | undefined;
}, {
    id: string;
    velocity: number;
    startTick: number;
    note: number;
    durationTicks: number;
    pitchOffset?: number | undefined;
    timbre?: number | undefined;
    pressure?: number | undefined;
}>;
export declare const MidiCCEventSchema: z.ZodObject<{
    id: z.ZodString;
    controller: z.ZodNumber;
    value: z.ZodNumber;
    tick: z.ZodNumber;
    curve: z.ZodOptional<z.ZodEnum<["step", "linear", "bezier"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    value: number;
    tick: number;
    controller: number;
    curve?: "step" | "linear" | "bezier" | undefined;
}, {
    id: string;
    value: number;
    tick: number;
    controller: number;
    curve?: "step" | "linear" | "bezier" | undefined;
}>;
export declare const PitchBendEventSchema: z.ZodObject<{
    id: z.ZodString;
    value: z.ZodNumber;
    tick: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    value: number;
    tick: number;
}, {
    id: string;
    value: number;
    tick: number;
}>;
export declare const ChannelPressureEventSchema: z.ZodObject<{
    id: z.ZodString;
    pressure: z.ZodNumber;
    tick: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    tick: number;
    pressure: number;
}, {
    id: string;
    tick: number;
    pressure: number;
}>;
export declare const PolyAftertouchEventSchema: z.ZodObject<{
    id: z.ZodString;
    note: z.ZodNumber;
    pressure: z.ZodNumber;
    tick: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    tick: number;
    note: number;
    pressure: number;
}, {
    id: string;
    tick: number;
    note: number;
    pressure: number;
}>;
export declare const ProgramChangeEventSchema: z.ZodObject<{
    id: z.ZodString;
    program: z.ZodNumber;
    tick: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    tick: number;
    program: number;
}, {
    id: string;
    tick: number;
    program: number;
}>;
export declare const MpeLaneDataSchema: z.ZodObject<{
    noteId: z.ZodString;
    pitchBend: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        value: z.ZodNumber;
        tick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        value: number;
        tick: number;
    }, {
        id: string;
        value: number;
        tick: number;
    }>, "many">;
    timbre: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        controller: z.ZodNumber;
        value: z.ZodNumber;
        tick: z.ZodNumber;
        curve: z.ZodOptional<z.ZodEnum<["step", "linear", "bezier"]>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        value: number;
        tick: number;
        controller: number;
        curve?: "step" | "linear" | "bezier" | undefined;
    }, {
        id: string;
        value: number;
        tick: number;
        controller: number;
        curve?: "step" | "linear" | "bezier" | undefined;
    }>, "many">;
    pressure: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        note: z.ZodNumber;
        pressure: z.ZodNumber;
        tick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        tick: number;
        note: number;
        pressure: number;
    }, {
        id: string;
        tick: number;
        note: number;
        pressure: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    timbre: {
        id: string;
        value: number;
        tick: number;
        controller: number;
        curve?: "step" | "linear" | "bezier" | undefined;
    }[];
    pressure: {
        id: string;
        tick: number;
        note: number;
        pressure: number;
    }[];
    noteId: string;
    pitchBend: {
        id: string;
        value: number;
        tick: number;
    }[];
}, {
    timbre: {
        id: string;
        value: number;
        tick: number;
        controller: number;
        curve?: "step" | "linear" | "bezier" | undefined;
    }[];
    pressure: {
        id: string;
        tick: number;
        note: number;
        pressure: number;
    }[];
    noteId: string;
    pitchBend: {
        id: string;
        value: number;
        tick: number;
    }[];
}>;
export declare const ScaleModeSchema: z.ZodEnum<["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "locrian", "harmonic-minor", "melodic-minor", "pentatonic-major", "pentatonic-minor", "blues", "chromatic"]>;
export declare const ScaleHintSchema: z.ZodObject<{
    root: z.ZodNumber;
    mode: z.ZodEnum<["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "locrian", "harmonic-minor", "melodic-minor", "pentatonic-major", "pentatonic-minor", "blues", "chromatic"]>;
    enabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
    root: number;
}, {
    enabled: boolean;
    mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
    root: number;
}>;
export declare const MidiClipSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    startTick: z.ZodNumber;
    endTick: z.ZodNumber;
    loop: z.ZodNullable<z.ZodObject<{
        startTick: z.ZodNumber;
        endTick: z.ZodNumber;
        enabled: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        startTick: number;
        endTick: number;
    }, {
        enabled: boolean;
        startTick: number;
        endTick: number;
    }>>;
    notes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        note: z.ZodNumber;
        velocity: z.ZodNumber;
        startTick: z.ZodNumber;
        durationTicks: z.ZodNumber;
        pitchOffset: z.ZodOptional<z.ZodNumber>;
        timbre: z.ZodOptional<z.ZodNumber>;
        pressure: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        velocity: number;
        startTick: number;
        note: number;
        durationTicks: number;
        pitchOffset?: number | undefined;
        timbre?: number | undefined;
        pressure?: number | undefined;
    }, {
        id: string;
        velocity: number;
        startTick: number;
        note: number;
        durationTicks: number;
        pitchOffset?: number | undefined;
        timbre?: number | undefined;
        pressure?: number | undefined;
    }>, "many">;
    cc: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        controller: z.ZodNumber;
        value: z.ZodNumber;
        tick: z.ZodNumber;
        curve: z.ZodOptional<z.ZodEnum<["step", "linear", "bezier"]>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        value: number;
        tick: number;
        controller: number;
        curve?: "step" | "linear" | "bezier" | undefined;
    }, {
        id: string;
        value: number;
        tick: number;
        controller: number;
        curve?: "step" | "linear" | "bezier" | undefined;
    }>, "many">;
    pitchBend: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        value: z.ZodNumber;
        tick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        value: number;
        tick: number;
    }, {
        id: string;
        value: number;
        tick: number;
    }>, "many">;
    channelPressure: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        pressure: z.ZodNumber;
        tick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        tick: number;
        pressure: number;
    }, {
        id: string;
        tick: number;
        pressure: number;
    }>, "many">;
    polyAftertouch: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        note: z.ZodNumber;
        pressure: z.ZodNumber;
        tick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        tick: number;
        note: number;
        pressure: number;
    }, {
        id: string;
        tick: number;
        note: number;
        pressure: number;
    }>, "many">;
    programChanges: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        program: z.ZodNumber;
        tick: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        tick: number;
        program: number;
    }, {
        id: string;
        tick: number;
        program: number;
    }>, "many">;
    mpe: z.ZodOptional<z.ZodArray<z.ZodObject<{
        noteId: z.ZodString;
        pitchBend: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            value: z.ZodNumber;
            tick: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            value: number;
            tick: number;
        }, {
            id: string;
            value: number;
            tick: number;
        }>, "many">;
        timbre: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            controller: z.ZodNumber;
            value: z.ZodNumber;
            tick: z.ZodNumber;
            curve: z.ZodOptional<z.ZodEnum<["step", "linear", "bezier"]>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            value: number;
            tick: number;
            controller: number;
            curve?: "step" | "linear" | "bezier" | undefined;
        }, {
            id: string;
            value: number;
            tick: number;
            controller: number;
            curve?: "step" | "linear" | "bezier" | undefined;
        }>, "many">;
        pressure: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            note: z.ZodNumber;
            pressure: z.ZodNumber;
            tick: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            tick: number;
            note: number;
            pressure: number;
        }, {
            id: string;
            tick: number;
            note: number;
            pressure: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        timbre: {
            id: string;
            value: number;
            tick: number;
            controller: number;
            curve?: "step" | "linear" | "bezier" | undefined;
        }[];
        pressure: {
            id: string;
            tick: number;
            note: number;
            pressure: number;
        }[];
        noteId: string;
        pitchBend: {
            id: string;
            value: number;
            tick: number;
        }[];
    }, {
        timbre: {
            id: string;
            value: number;
            tick: number;
            controller: number;
            curve?: "step" | "linear" | "bezier" | undefined;
        }[];
        pressure: {
            id: string;
            tick: number;
            note: number;
            pressure: number;
        }[];
        noteId: string;
        pitchBend: {
            id: string;
            value: number;
            tick: number;
        }[];
    }>, "many">>;
    scaleHint: z.ZodOptional<z.ZodObject<{
        root: z.ZodNumber;
        mode: z.ZodEnum<["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "locrian", "harmonic-minor", "melodic-minor", "pentatonic-major", "pentatonic-minor", "blues", "chromatic"]>;
        enabled: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
        root: number;
    }, {
        enabled: boolean;
        mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
        root: number;
    }>>;
    generated: z.ZodOptional<z.ZodObject<{
        scriptId: z.ZodString;
        hash: z.ZodString;
        seed: z.ZodString;
        generatedAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        hash: string;
        scriptId: string;
        seed: string;
        generatedAt: number;
    }, {
        hash: string;
        scriptId: string;
        seed: string;
        generatedAt: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    loop: {
        enabled: boolean;
        startTick: number;
        endTick: number;
    } | null;
    startTick: number;
    endTick: number;
    pitchBend: {
        id: string;
        value: number;
        tick: number;
    }[];
    notes: {
        id: string;
        velocity: number;
        startTick: number;
        note: number;
        durationTicks: number;
        pitchOffset?: number | undefined;
        timbre?: number | undefined;
        pressure?: number | undefined;
    }[];
    cc: {
        id: string;
        value: number;
        tick: number;
        controller: number;
        curve?: "step" | "linear" | "bezier" | undefined;
    }[];
    channelPressure: {
        id: string;
        tick: number;
        pressure: number;
    }[];
    polyAftertouch: {
        id: string;
        tick: number;
        note: number;
        pressure: number;
    }[];
    programChanges: {
        id: string;
        tick: number;
        program: number;
    }[];
    name?: string | undefined;
    generated?: {
        hash: string;
        scriptId: string;
        seed: string;
        generatedAt: number;
    } | undefined;
    color?: string | undefined;
    mpe?: {
        timbre: {
            id: string;
            value: number;
            tick: number;
            controller: number;
            curve?: "step" | "linear" | "bezier" | undefined;
        }[];
        pressure: {
            id: string;
            tick: number;
            note: number;
            pressure: number;
        }[];
        noteId: string;
        pitchBend: {
            id: string;
            value: number;
            tick: number;
        }[];
    }[] | undefined;
    scaleHint?: {
        enabled: boolean;
        mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
        root: number;
    } | undefined;
}, {
    id: string;
    loop: {
        enabled: boolean;
        startTick: number;
        endTick: number;
    } | null;
    startTick: number;
    endTick: number;
    pitchBend: {
        id: string;
        value: number;
        tick: number;
    }[];
    notes: {
        id: string;
        velocity: number;
        startTick: number;
        note: number;
        durationTicks: number;
        pitchOffset?: number | undefined;
        timbre?: number | undefined;
        pressure?: number | undefined;
    }[];
    cc: {
        id: string;
        value: number;
        tick: number;
        controller: number;
        curve?: "step" | "linear" | "bezier" | undefined;
    }[];
    channelPressure: {
        id: string;
        tick: number;
        pressure: number;
    }[];
    polyAftertouch: {
        id: string;
        tick: number;
        note: number;
        pressure: number;
    }[];
    programChanges: {
        id: string;
        tick: number;
        program: number;
    }[];
    name?: string | undefined;
    generated?: {
        hash: string;
        scriptId: string;
        seed: string;
        generatedAt: number;
    } | undefined;
    color?: string | undefined;
    mpe?: {
        timbre: {
            id: string;
            value: number;
            tick: number;
            controller: number;
            curve?: "step" | "linear" | "bezier" | undefined;
        }[];
        pressure: {
            id: string;
            tick: number;
            note: number;
            pressure: number;
        }[];
        noteId: string;
        pitchBend: {
            id: string;
            value: number;
            tick: number;
        }[];
    }[] | undefined;
    scaleHint?: {
        enabled: boolean;
        mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
        root: number;
    } | undefined;
}>;
export declare const AssetRefSchema: z.ZodObject<{
    id: z.ZodString;
    hash: z.ZodString;
    type: z.ZodEnum<["audio", "sample", "preset", "waveform", "analysis"]>;
    name: z.ZodString;
    size: z.ZodNumber;
    createdAt: z.ZodString;
    sampleRate: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<44100>, z.ZodLiteral<48000>, z.ZodLiteral<96000>]>>;
    channels: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    bitDepth: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    description: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["recorded", "imported", "generated", "factory"]>;
        originalPath: z.ZodOptional<z.ZodString>;
        deviceName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "recorded" | "imported" | "generated" | "factory";
        originalPath?: string | undefined;
        deviceName?: string | undefined;
    }, {
        type: "recorded" | "imported" | "generated" | "factory";
        originalPath?: string | undefined;
        deviceName?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "audio" | "analysis" | "sample" | "preset" | "waveform";
    name: string;
    size: number;
    hash: string;
    id: string;
    createdAt: string;
    source?: {
        type: "recorded" | "imported" | "generated" | "factory";
        originalPath?: string | undefined;
        deviceName?: string | undefined;
    } | undefined;
    sampleRate?: 44100 | 48000 | 96000 | undefined;
    channels?: number | undefined;
    duration?: number | undefined;
    bitDepth?: number | undefined;
    tags?: string[] | undefined;
    description?: string | undefined;
}, {
    type: "audio" | "analysis" | "sample" | "preset" | "waveform";
    name: string;
    size: number;
    hash: string;
    id: string;
    createdAt: string;
    source?: {
        type: "recorded" | "imported" | "generated" | "factory";
        originalPath?: string | undefined;
        deviceName?: string | undefined;
    } | undefined;
    sampleRate?: 44100 | 48000 | 96000 | undefined;
    channels?: number | undefined;
    duration?: number | undefined;
    bitDepth?: number | undefined;
    tags?: string[] | undefined;
    description?: string | undefined;
}>;
export declare const PresetRefSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    pluginDefinitionId: z.ZodString;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    author: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
    modifiedAt: z.ZodString;
    hash: z.ZodOptional<z.ZodString>;
    embedded: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    modifiedAt: string;
    pluginDefinitionId: string;
    createdAt: string;
    hash?: string | undefined;
    category?: string | undefined;
    tags?: string[] | undefined;
    author?: string | undefined;
    embedded?: unknown;
}, {
    name: string;
    id: string;
    modifiedAt: string;
    pluginDefinitionId: string;
    createdAt: string;
    hash?: string | undefined;
    category?: string | undefined;
    tags?: string[] | undefined;
    author?: string | undefined;
    embedded?: unknown;
}>;
export declare const ScriptParameterSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    kind: z.ZodEnum<["number", "boolean", "enum", "string"]>;
    defaultValue: z.ZodUnknown;
    min: z.ZodOptional<z.ZodNumber>;
    max: z.ZodOptional<z.ZodNumber>;
    step: z.ZodOptional<z.ZodNumber>;
    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    kind: "string" | "number" | "boolean" | "enum";
    step?: number | undefined;
    options?: string[] | undefined;
    min?: number | undefined;
    max?: number | undefined;
    defaultValue?: unknown;
}, {
    name: string;
    id: string;
    kind: "string" | "number" | "boolean" | "enum";
    step?: number | undefined;
    options?: string[] | undefined;
    min?: number | undefined;
    max?: number | undefined;
    defaultValue?: unknown;
}>;
export declare const ScriptModuleRefSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    sourceCode: z.ZodString;
    language: z.ZodEnum<["typescript", "javascript"]>;
    autoExecute: z.ZodBoolean;
    executeOnLoad: z.ZodBoolean;
    parameters: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        kind: z.ZodEnum<["number", "boolean", "enum", "string"]>;
        defaultValue: z.ZodUnknown;
        min: z.ZodOptional<z.ZodNumber>;
        max: z.ZodOptional<z.ZodNumber>;
        step: z.ZodOptional<z.ZodNumber>;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        kind: "string" | "number" | "boolean" | "enum";
        step?: number | undefined;
        options?: string[] | undefined;
        min?: number | undefined;
        max?: number | undefined;
        defaultValue?: unknown;
    }, {
        name: string;
        id: string;
        kind: "string" | "number" | "boolean" | "enum";
        step?: number | undefined;
        options?: string[] | undefined;
        min?: number | undefined;
        max?: number | undefined;
        defaultValue?: unknown;
    }>, "many">>;
    dependencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    version: z.ZodNumber;
    createdAt: z.ZodString;
    modifiedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    modifiedAt: string;
    version: number;
    createdAt: string;
    sourceCode: string;
    language: "typescript" | "javascript";
    autoExecute: boolean;
    executeOnLoad: boolean;
    parameters?: {
        name: string;
        id: string;
        kind: "string" | "number" | "boolean" | "enum";
        step?: number | undefined;
        options?: string[] | undefined;
        min?: number | undefined;
        max?: number | undefined;
        defaultValue?: unknown;
    }[] | undefined;
    dependencies?: string[] | undefined;
}, {
    name: string;
    id: string;
    modifiedAt: string;
    version: number;
    createdAt: string;
    sourceCode: string;
    language: "typescript" | "javascript";
    autoExecute: boolean;
    executeOnLoad: boolean;
    parameters?: {
        name: string;
        id: string;
        kind: "string" | "number" | "boolean" | "enum";
        step?: number | undefined;
        options?: string[] | undefined;
        min?: number | undefined;
        max?: number | undefined;
        defaultValue?: unknown;
    }[] | undefined;
    dependencies?: string[] | undefined;
}>;
export declare const RecordingSettingsSchema: z.ZodObject<{
    defaultCountInBars: z.ZodNumber;
    defaultPreRollMs: z.ZodNumber;
    metronomeDuringRecording: z.ZodBoolean;
    metronomeDuringCountIn: z.ZodBoolean;
    createTakes: z.ZodBoolean;
    autoPunchIn: z.ZodBoolean;
    autoPunchOut: z.ZodBoolean;
    inputMonitoring: z.ZodEnum<["auto", "on", "off"]>;
    fileFormat: z.ZodEnum<["wav", "aiff", "flac"]>;
    bitDepth: z.ZodUnion<[z.ZodLiteral<16>, z.ZodLiteral<24>, z.ZodLiteral<32>]>;
}, "strip", z.ZodTypeAny, {
    inputMonitoring: "off" | "auto" | "on";
    bitDepth: 16 | 24 | 32;
    defaultCountInBars: number;
    defaultPreRollMs: number;
    metronomeDuringRecording: boolean;
    metronomeDuringCountIn: boolean;
    createTakes: boolean;
    autoPunchIn: boolean;
    autoPunchOut: boolean;
    fileFormat: "wav" | "aiff" | "flac";
}, {
    inputMonitoring: "off" | "auto" | "on";
    bitDepth: 16 | 24 | 32;
    defaultCountInBars: number;
    defaultPreRollMs: number;
    metronomeDuringRecording: boolean;
    metronomeDuringCountIn: boolean;
    createTakes: boolean;
    autoPunchIn: boolean;
    autoPunchOut: boolean;
    fileFormat: "wav" | "aiff" | "flac";
}>;
export declare const EditingSettingsSchema: z.ZodObject<{
    defaultSnapGrid: z.ZodNumber;
    snapEnabled: z.ZodBoolean;
    defaultQuantizeGrid: z.ZodNumber;
    quantizeStrength: z.ZodNumber;
    quantizeSwing: z.ZodNumber;
    fadeDefaultLength: z.ZodNumber;
    crossfadeDefaultLength: z.ZodNumber;
    autoCrossfade: z.ZodBoolean;
    defaultWarpMode: z.ZodEnum<["repitch", "beats", "texture", "tones", "complex"]>;
    stretchQuality: z.ZodEnum<["draft", "good", "best"]>;
}, "strip", z.ZodTypeAny, {
    stretchQuality: "draft" | "good" | "best";
    defaultSnapGrid: number;
    snapEnabled: boolean;
    defaultQuantizeGrid: number;
    quantizeStrength: number;
    quantizeSwing: number;
    fadeDefaultLength: number;
    crossfadeDefaultLength: number;
    autoCrossfade: boolean;
    defaultWarpMode: "repitch" | "beats" | "texture" | "tones" | "complex";
}, {
    stretchQuality: "draft" | "good" | "best";
    defaultSnapGrid: number;
    snapEnabled: boolean;
    defaultQuantizeGrid: number;
    quantizeStrength: number;
    quantizeSwing: number;
    fadeDefaultLength: number;
    crossfadeDefaultLength: number;
    autoCrossfade: boolean;
    defaultWarpMode: "repitch" | "beats" | "texture" | "tones" | "complex";
}>;
export declare const ExportSettingsSchema: z.ZodObject<{
    defaultFormat: z.ZodEnum<["wav", "aiff", "flac", "mp3", "ogg"]>;
    defaultSampleRate: z.ZodUnion<[z.ZodLiteral<44100>, z.ZodLiteral<48000>, z.ZodLiteral<96000>]>;
    defaultBitDepth: z.ZodUnion<[z.ZodLiteral<16>, z.ZodLiteral<24>, z.ZodLiteral<32>]>;
    normalize: z.ZodBoolean;
    dither: z.ZodEnum<["none", "triangular", "noise-shaped"]>;
    includeTailMs: z.ZodNumber;
    defaultLocation: z.ZodEnum<["downloads", "project", "ask"]>;
}, "strip", z.ZodTypeAny, {
    dither: "none" | "triangular" | "noise-shaped";
    defaultFormat: "wav" | "aiff" | "flac" | "mp3" | "ogg";
    defaultSampleRate: 44100 | 48000 | 96000;
    defaultBitDepth: 16 | 24 | 32;
    normalize: boolean;
    includeTailMs: number;
    defaultLocation: "downloads" | "project" | "ask";
}, {
    dither: "none" | "triangular" | "noise-shaped";
    defaultFormat: "wav" | "aiff" | "flac" | "mp3" | "ogg";
    defaultSampleRate: 44100 | 48000 | 96000;
    defaultBitDepth: 16 | 24 | 32;
    normalize: boolean;
    includeTailMs: number;
    defaultLocation: "downloads" | "project" | "ask";
}>;
export declare const UiSettingsSchema: z.ZodObject<{
    theme: z.ZodEnum<["dark", "light", "system"]>;
    highContrast: z.ZodBoolean;
    reducedMotion: z.ZodBoolean;
    defaultTrackHeight: z.ZodNumber;
    zoomLevel: z.ZodNumber;
    showWaveformOverview: z.ZodBoolean;
    showMeterBridge: z.ZodBoolean;
    followPlayback: z.ZodBoolean;
    smoothScrolling: z.ZodBoolean;
    showGrid: z.ZodBoolean;
    gridLineSpacing: z.ZodEnum<["bar", "beat", "quarter", "eighth", "sixteenth"]>;
    keyboardMidiEnabled: z.ZodBoolean;
    keyboardMidiOctave: z.ZodNumber;
    keyboardMidiVelocity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    theme: "dark" | "light" | "system";
    highContrast: boolean;
    reducedMotion: boolean;
    defaultTrackHeight: number;
    zoomLevel: number;
    showWaveformOverview: boolean;
    showMeterBridge: boolean;
    followPlayback: boolean;
    smoothScrolling: boolean;
    showGrid: boolean;
    gridLineSpacing: "bar" | "beat" | "quarter" | "eighth" | "sixteenth";
    keyboardMidiEnabled: boolean;
    keyboardMidiOctave: number;
    keyboardMidiVelocity: number;
}, {
    theme: "dark" | "light" | "system";
    highContrast: boolean;
    reducedMotion: boolean;
    defaultTrackHeight: number;
    zoomLevel: number;
    showWaveformOverview: boolean;
    showMeterBridge: boolean;
    followPlayback: boolean;
    smoothScrolling: boolean;
    showGrid: boolean;
    gridLineSpacing: "bar" | "beat" | "quarter" | "eighth" | "sixteenth";
    keyboardMidiEnabled: boolean;
    keyboardMidiOctave: number;
    keyboardMidiVelocity: number;
}>;
export declare const ProjectSettingsSchema: z.ZodObject<{
    defaultSampleRate: z.ZodUnion<[z.ZodLiteral<44100>, z.ZodLiteral<48000>, z.ZodLiteral<96000>]>;
    defaultBitDepth: z.ZodUnion<[z.ZodLiteral<16>, z.ZodLiteral<24>, z.ZodLiteral<32>]>;
    defaultMidiInput: z.ZodOptional<z.ZodString>;
    defaultMidiOutput: z.ZodOptional<z.ZodString>;
    recordingSettings: z.ZodObject<{
        defaultCountInBars: z.ZodNumber;
        defaultPreRollMs: z.ZodNumber;
        metronomeDuringRecording: z.ZodBoolean;
        metronomeDuringCountIn: z.ZodBoolean;
        createTakes: z.ZodBoolean;
        autoPunchIn: z.ZodBoolean;
        autoPunchOut: z.ZodBoolean;
        inputMonitoring: z.ZodEnum<["auto", "on", "off"]>;
        fileFormat: z.ZodEnum<["wav", "aiff", "flac"]>;
        bitDepth: z.ZodUnion<[z.ZodLiteral<16>, z.ZodLiteral<24>, z.ZodLiteral<32>]>;
    }, "strip", z.ZodTypeAny, {
        inputMonitoring: "off" | "auto" | "on";
        bitDepth: 16 | 24 | 32;
        defaultCountInBars: number;
        defaultPreRollMs: number;
        metronomeDuringRecording: boolean;
        metronomeDuringCountIn: boolean;
        createTakes: boolean;
        autoPunchIn: boolean;
        autoPunchOut: boolean;
        fileFormat: "wav" | "aiff" | "flac";
    }, {
        inputMonitoring: "off" | "auto" | "on";
        bitDepth: 16 | 24 | 32;
        defaultCountInBars: number;
        defaultPreRollMs: number;
        metronomeDuringRecording: boolean;
        metronomeDuringCountIn: boolean;
        createTakes: boolean;
        autoPunchIn: boolean;
        autoPunchOut: boolean;
        fileFormat: "wav" | "aiff" | "flac";
    }>;
    editingSettings: z.ZodObject<{
        defaultSnapGrid: z.ZodNumber;
        snapEnabled: z.ZodBoolean;
        defaultQuantizeGrid: z.ZodNumber;
        quantizeStrength: z.ZodNumber;
        quantizeSwing: z.ZodNumber;
        fadeDefaultLength: z.ZodNumber;
        crossfadeDefaultLength: z.ZodNumber;
        autoCrossfade: z.ZodBoolean;
        defaultWarpMode: z.ZodEnum<["repitch", "beats", "texture", "tones", "complex"]>;
        stretchQuality: z.ZodEnum<["draft", "good", "best"]>;
    }, "strip", z.ZodTypeAny, {
        stretchQuality: "draft" | "good" | "best";
        defaultSnapGrid: number;
        snapEnabled: boolean;
        defaultQuantizeGrid: number;
        quantizeStrength: number;
        quantizeSwing: number;
        fadeDefaultLength: number;
        crossfadeDefaultLength: number;
        autoCrossfade: boolean;
        defaultWarpMode: "repitch" | "beats" | "texture" | "tones" | "complex";
    }, {
        stretchQuality: "draft" | "good" | "best";
        defaultSnapGrid: number;
        snapEnabled: boolean;
        defaultQuantizeGrid: number;
        quantizeStrength: number;
        quantizeSwing: number;
        fadeDefaultLength: number;
        crossfadeDefaultLength: number;
        autoCrossfade: boolean;
        defaultWarpMode: "repitch" | "beats" | "texture" | "tones" | "complex";
    }>;
    exportSettings: z.ZodObject<{
        defaultFormat: z.ZodEnum<["wav", "aiff", "flac", "mp3", "ogg"]>;
        defaultSampleRate: z.ZodUnion<[z.ZodLiteral<44100>, z.ZodLiteral<48000>, z.ZodLiteral<96000>]>;
        defaultBitDepth: z.ZodUnion<[z.ZodLiteral<16>, z.ZodLiteral<24>, z.ZodLiteral<32>]>;
        normalize: z.ZodBoolean;
        dither: z.ZodEnum<["none", "triangular", "noise-shaped"]>;
        includeTailMs: z.ZodNumber;
        defaultLocation: z.ZodEnum<["downloads", "project", "ask"]>;
    }, "strip", z.ZodTypeAny, {
        dither: "none" | "triangular" | "noise-shaped";
        defaultFormat: "wav" | "aiff" | "flac" | "mp3" | "ogg";
        defaultSampleRate: 44100 | 48000 | 96000;
        defaultBitDepth: 16 | 24 | 32;
        normalize: boolean;
        includeTailMs: number;
        defaultLocation: "downloads" | "project" | "ask";
    }, {
        dither: "none" | "triangular" | "noise-shaped";
        defaultFormat: "wav" | "aiff" | "flac" | "mp3" | "ogg";
        defaultSampleRate: 44100 | 48000 | 96000;
        defaultBitDepth: 16 | 24 | 32;
        normalize: boolean;
        includeTailMs: number;
        defaultLocation: "downloads" | "project" | "ask";
    }>;
    schedulerConfig: z.ZodObject<{
        prepareHorizonMs: z.ZodNumber;
        refillThresholdMs: z.ZodNumber;
        maxChunkMs: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        prepareHorizonMs: number;
        refillThresholdMs: number;
        maxChunkMs: number;
    }, {
        prepareHorizonMs: number;
        refillThresholdMs: number;
        maxChunkMs: number;
    }>;
    uiSettings: z.ZodObject<{
        theme: z.ZodEnum<["dark", "light", "system"]>;
        highContrast: z.ZodBoolean;
        reducedMotion: z.ZodBoolean;
        defaultTrackHeight: z.ZodNumber;
        zoomLevel: z.ZodNumber;
        showWaveformOverview: z.ZodBoolean;
        showMeterBridge: z.ZodBoolean;
        followPlayback: z.ZodBoolean;
        smoothScrolling: z.ZodBoolean;
        showGrid: z.ZodBoolean;
        gridLineSpacing: z.ZodEnum<["bar", "beat", "quarter", "eighth", "sixteenth"]>;
        keyboardMidiEnabled: z.ZodBoolean;
        keyboardMidiOctave: z.ZodNumber;
        keyboardMidiVelocity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        theme: "dark" | "light" | "system";
        highContrast: boolean;
        reducedMotion: boolean;
        defaultTrackHeight: number;
        zoomLevel: number;
        showWaveformOverview: boolean;
        showMeterBridge: boolean;
        followPlayback: boolean;
        smoothScrolling: boolean;
        showGrid: boolean;
        gridLineSpacing: "bar" | "beat" | "quarter" | "eighth" | "sixteenth";
        keyboardMidiEnabled: boolean;
        keyboardMidiOctave: number;
        keyboardMidiVelocity: number;
    }, {
        theme: "dark" | "light" | "system";
        highContrast: boolean;
        reducedMotion: boolean;
        defaultTrackHeight: number;
        zoomLevel: number;
        showWaveformOverview: boolean;
        showMeterBridge: boolean;
        followPlayback: boolean;
        smoothScrolling: boolean;
        showGrid: boolean;
        gridLineSpacing: "bar" | "beat" | "quarter" | "eighth" | "sixteenth";
        keyboardMidiEnabled: boolean;
        keyboardMidiOctave: number;
        keyboardMidiVelocity: number;
    }>;
}, "strip", z.ZodTypeAny, {
    defaultSampleRate: 44100 | 48000 | 96000;
    defaultBitDepth: 16 | 24 | 32;
    recordingSettings: {
        inputMonitoring: "off" | "auto" | "on";
        bitDepth: 16 | 24 | 32;
        defaultCountInBars: number;
        defaultPreRollMs: number;
        metronomeDuringRecording: boolean;
        metronomeDuringCountIn: boolean;
        createTakes: boolean;
        autoPunchIn: boolean;
        autoPunchOut: boolean;
        fileFormat: "wav" | "aiff" | "flac";
    };
    editingSettings: {
        stretchQuality: "draft" | "good" | "best";
        defaultSnapGrid: number;
        snapEnabled: boolean;
        defaultQuantizeGrid: number;
        quantizeStrength: number;
        quantizeSwing: number;
        fadeDefaultLength: number;
        crossfadeDefaultLength: number;
        autoCrossfade: boolean;
        defaultWarpMode: "repitch" | "beats" | "texture" | "tones" | "complex";
    };
    exportSettings: {
        dither: "none" | "triangular" | "noise-shaped";
        defaultFormat: "wav" | "aiff" | "flac" | "mp3" | "ogg";
        defaultSampleRate: 44100 | 48000 | 96000;
        defaultBitDepth: 16 | 24 | 32;
        normalize: boolean;
        includeTailMs: number;
        defaultLocation: "downloads" | "project" | "ask";
    };
    schedulerConfig: {
        prepareHorizonMs: number;
        refillThresholdMs: number;
        maxChunkMs: number;
    };
    uiSettings: {
        theme: "dark" | "light" | "system";
        highContrast: boolean;
        reducedMotion: boolean;
        defaultTrackHeight: number;
        zoomLevel: number;
        showWaveformOverview: boolean;
        showMeterBridge: boolean;
        followPlayback: boolean;
        smoothScrolling: boolean;
        showGrid: boolean;
        gridLineSpacing: "bar" | "beat" | "quarter" | "eighth" | "sixteenth";
        keyboardMidiEnabled: boolean;
        keyboardMidiOctave: number;
        keyboardMidiVelocity: number;
    };
    defaultMidiInput?: string | undefined;
    defaultMidiOutput?: string | undefined;
}, {
    defaultSampleRate: 44100 | 48000 | 96000;
    defaultBitDepth: 16 | 24 | 32;
    recordingSettings: {
        inputMonitoring: "off" | "auto" | "on";
        bitDepth: 16 | 24 | 32;
        defaultCountInBars: number;
        defaultPreRollMs: number;
        metronomeDuringRecording: boolean;
        metronomeDuringCountIn: boolean;
        createTakes: boolean;
        autoPunchIn: boolean;
        autoPunchOut: boolean;
        fileFormat: "wav" | "aiff" | "flac";
    };
    editingSettings: {
        stretchQuality: "draft" | "good" | "best";
        defaultSnapGrid: number;
        snapEnabled: boolean;
        defaultQuantizeGrid: number;
        quantizeStrength: number;
        quantizeSwing: number;
        fadeDefaultLength: number;
        crossfadeDefaultLength: number;
        autoCrossfade: boolean;
        defaultWarpMode: "repitch" | "beats" | "texture" | "tones" | "complex";
    };
    exportSettings: {
        dither: "none" | "triangular" | "noise-shaped";
        defaultFormat: "wav" | "aiff" | "flac" | "mp3" | "ogg";
        defaultSampleRate: 44100 | 48000 | 96000;
        defaultBitDepth: 16 | 24 | 32;
        normalize: boolean;
        includeTailMs: number;
        defaultLocation: "downloads" | "project" | "ask";
    };
    schedulerConfig: {
        prepareHorizonMs: number;
        refillThresholdMs: number;
        maxChunkMs: number;
    };
    uiSettings: {
        theme: "dark" | "light" | "system";
        highContrast: boolean;
        reducedMotion: boolean;
        defaultTrackHeight: number;
        zoomLevel: number;
        showWaveformOverview: boolean;
        showMeterBridge: boolean;
        followPlayback: boolean;
        smoothScrolling: boolean;
        showGrid: boolean;
        gridLineSpacing: "bar" | "beat" | "quarter" | "eighth" | "sixteenth";
        keyboardMidiEnabled: boolean;
        keyboardMidiOctave: number;
        keyboardMidiVelocity: number;
    };
    defaultMidiInput?: string | undefined;
    defaultMidiOutput?: string | undefined;
}>;
export declare const ProjectSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    name: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    sampleRatePreference: z.ZodUnion<[z.ZodLiteral<44100>, z.ZodLiteral<48000>, z.ZodLiteral<96000>]>;
    tempoMap: z.ZodArray<z.ZodObject<{
        tick: z.ZodNumber;
        bpm: z.ZodNumber;
        curve: z.ZodEnum<["jump", "ramp"]>;
    }, "strip", z.ZodTypeAny, {
        tick: number;
        bpm: number;
        curve: "jump" | "ramp";
    }, {
        tick: number;
        bpm: number;
        curve: "jump" | "ramp";
    }>, "many">;
    timeSignatureMap: z.ZodArray<z.ZodObject<{
        tick: z.ZodNumber;
        numerator: z.ZodNumber;
        denominator: z.ZodEffects<z.ZodNumber, number, number>;
    }, "strip", z.ZodTypeAny, {
        numerator: number;
        denominator: number;
        tick: number;
    }, {
        numerator: number;
        denominator: number;
        tick: number;
    }>, "many">;
    markers: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tick: z.ZodNumber;
        name: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["locator", "cue", "loop", "section"]>;
    }, "strip", z.ZodTypeAny, {
        type: "locator" | "cue" | "loop" | "section";
        name: string;
        id: string;
        tick: number;
        color?: string | undefined;
    }, {
        type: "locator" | "cue" | "loop" | "section";
        name: string;
        id: string;
        tick: number;
        color?: string | undefined;
    }>, "many">;
    tracks: z.ZodArray<z.ZodUnion<[z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
        mute: z.ZodBoolean;
        solo: z.ZodBoolean;
        arm: z.ZodBoolean;
        monitorMode: z.ZodEnum<["off", "auto", "in"]>;
        input: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["audio", "midi", "none"]>;
            deviceId: z.ZodOptional<z.ZodString>;
            channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
        }, "strip", z.ZodTypeAny, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }>>;
        output: z.ZodObject<{
            type: z.ZodEnum<["master", "bus", "track"]>;
            targetId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "track" | "master" | "bus";
            targetId: string;
        }, {
            type: "track" | "master" | "bus";
            targetId: string;
        }>;
        inserts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>, "many">;
        sends: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            targetBusId: z.ZodString;
            levelDb: z.ZodNumber;
            preFader: z.ZodBoolean;
            active: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }>, "many">;
        automationLanes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            target: z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>;
            mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
            points: z.ZodArray<z.ZodObject<{
                tick: z.ZodNumber;
                value: z.ZodNumber;
                curveIn: z.ZodOptional<z.ZodNumber>;
                curveOut: z.ZodOptional<z.ZodNumber>;
                stepHold: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }>, "many">;
            interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
            laneDisplayRange: z.ZodOptional<z.ZodObject<{
                min: z.ZodNumber;
                max: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                min: number;
                max: number;
            }, {
                min: number;
                max: number;
            }>>;
            visible: z.ZodBoolean;
            height: z.ZodNumber;
            color: z.ZodOptional<z.ZodString>;
            overrideValue: z.ZodOptional<z.ZodNumber>;
            overrideActive: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }>, "many">;
        macros: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            target: z.ZodUnion<[z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"plugin-param">;
                pluginId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }>]>;
            value: z.ZodNumber;
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }>, "many">;
        comments: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
        parentId: z.ZodOptional<z.ZodString>;
        height: z.ZodOptional<z.ZodNumber>;
        collapsed: z.ZodBoolean;
    } & {
        type: z.ZodLiteral<"audio">;
        clips: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            clipId: z.ZodString;
            lane: z.ZodNumber;
            startTick: z.ZodNumber;
            endTick: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
            lane: number;
        }, {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
            lane: number;
        }>, "many">;
        compLanes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            active: z.ZodBoolean;
            muted: z.ZodBoolean;
            color: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            active: boolean;
            muted: boolean;
            color?: string | undefined;
        }, {
            name: string;
            id: string;
            active: boolean;
            muted: boolean;
            color?: string | undefined;
        }>, "many">;
        currentCompLaneId: z.ZodOptional<z.ZodString>;
        warpMode: z.ZodOptional<z.ZodEnum<["repitch", "beats", "texture", "tones", "complex", "complex-pro"]>>;
        inputMonitoring: z.ZodBoolean;
        latencyCompensation: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "audio";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
            lane: number;
        }[];
        compLanes: {
            name: string;
            id: string;
            active: boolean;
            muted: boolean;
            color?: string | undefined;
        }[];
        inputMonitoring: boolean;
        latencyCompensation: number;
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
        currentCompLaneId?: string | undefined;
        warpMode?: "repitch" | "beats" | "texture" | "tones" | "complex" | "complex-pro" | undefined;
    }, {
        type: "audio";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
            lane: number;
        }[];
        compLanes: {
            name: string;
            id: string;
            active: boolean;
            muted: boolean;
            color?: string | undefined;
        }[];
        inputMonitoring: boolean;
        latencyCompensation: number;
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
        currentCompLaneId?: string | undefined;
        warpMode?: "repitch" | "beats" | "texture" | "tones" | "complex" | "complex-pro" | undefined;
    }>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
        mute: z.ZodBoolean;
        solo: z.ZodBoolean;
        arm: z.ZodBoolean;
        monitorMode: z.ZodEnum<["off", "auto", "in"]>;
        input: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["audio", "midi", "none"]>;
            deviceId: z.ZodOptional<z.ZodString>;
            channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
        }, "strip", z.ZodTypeAny, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }>>;
        output: z.ZodObject<{
            type: z.ZodEnum<["master", "bus", "track"]>;
            targetId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "track" | "master" | "bus";
            targetId: string;
        }, {
            type: "track" | "master" | "bus";
            targetId: string;
        }>;
        inserts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>, "many">;
        sends: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            targetBusId: z.ZodString;
            levelDb: z.ZodNumber;
            preFader: z.ZodBoolean;
            active: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }>, "many">;
        automationLanes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            target: z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>;
            mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
            points: z.ZodArray<z.ZodObject<{
                tick: z.ZodNumber;
                value: z.ZodNumber;
                curveIn: z.ZodOptional<z.ZodNumber>;
                curveOut: z.ZodOptional<z.ZodNumber>;
                stepHold: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }>, "many">;
            interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
            laneDisplayRange: z.ZodOptional<z.ZodObject<{
                min: z.ZodNumber;
                max: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                min: number;
                max: number;
            }, {
                min: number;
                max: number;
            }>>;
            visible: z.ZodBoolean;
            height: z.ZodNumber;
            color: z.ZodOptional<z.ZodString>;
            overrideValue: z.ZodOptional<z.ZodNumber>;
            overrideActive: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }>, "many">;
        macros: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            target: z.ZodUnion<[z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"plugin-param">;
                pluginId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }>]>;
            value: z.ZodNumber;
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }>, "many">;
        comments: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
        parentId: z.ZodOptional<z.ZodString>;
        height: z.ZodOptional<z.ZodNumber>;
        collapsed: z.ZodBoolean;
    } & {
        type: z.ZodLiteral<"midi">;
        clips: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            clipId: z.ZodString;
            startTick: z.ZodNumber;
            endTick: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }, {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }>, "many">;
        destination: z.ZodUnion<[z.ZodObject<{
            type: z.ZodLiteral<"plugin">;
            pluginId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "plugin";
            pluginId: string;
        }, {
            type: "plugin";
            pluginId: string;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"external-midi">;
            deviceId: z.ZodString;
            channel: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type: "external-midi";
            deviceId: string;
            channel: number;
        }, {
            type: "external-midi";
            deviceId: string;
            channel: number;
        }>]>;
    }, "strip", z.ZodTypeAny, {
        type: "midi";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        destination: {
            type: "plugin";
            pluginId: string;
        } | {
            type: "external-midi";
            deviceId: string;
            channel: number;
        };
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    }, {
        type: "midi";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        destination: {
            type: "plugin";
            pluginId: string;
        } | {
            type: "external-midi";
            deviceId: string;
            channel: number;
        };
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    }>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
        mute: z.ZodBoolean;
        solo: z.ZodBoolean;
        arm: z.ZodBoolean;
        monitorMode: z.ZodEnum<["off", "auto", "in"]>;
        input: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["audio", "midi", "none"]>;
            deviceId: z.ZodOptional<z.ZodString>;
            channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
        }, "strip", z.ZodTypeAny, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }>>;
        output: z.ZodObject<{
            type: z.ZodEnum<["master", "bus", "track"]>;
            targetId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "track" | "master" | "bus";
            targetId: string;
        }, {
            type: "track" | "master" | "bus";
            targetId: string;
        }>;
        inserts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>, "many">;
        sends: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            targetBusId: z.ZodString;
            levelDb: z.ZodNumber;
            preFader: z.ZodBoolean;
            active: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }>, "many">;
        automationLanes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            target: z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>;
            mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
            points: z.ZodArray<z.ZodObject<{
                tick: z.ZodNumber;
                value: z.ZodNumber;
                curveIn: z.ZodOptional<z.ZodNumber>;
                curveOut: z.ZodOptional<z.ZodNumber>;
                stepHold: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }>, "many">;
            interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
            laneDisplayRange: z.ZodOptional<z.ZodObject<{
                min: z.ZodNumber;
                max: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                min: number;
                max: number;
            }, {
                min: number;
                max: number;
            }>>;
            visible: z.ZodBoolean;
            height: z.ZodNumber;
            color: z.ZodOptional<z.ZodString>;
            overrideValue: z.ZodOptional<z.ZodNumber>;
            overrideActive: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }>, "many">;
        macros: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            target: z.ZodUnion<[z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"plugin-param">;
                pluginId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }>]>;
            value: z.ZodNumber;
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }>, "many">;
        comments: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
        parentId: z.ZodOptional<z.ZodString>;
        height: z.ZodOptional<z.ZodNumber>;
        collapsed: z.ZodBoolean;
    } & {
        type: z.ZodLiteral<"instrument">;
        clips: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            clipId: z.ZodString;
            startTick: z.ZodNumber;
            endTick: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }, {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }>, "many">;
        instrument: z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>;
        noteFx: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "instrument";
        name: string;
        id: string;
        instrument: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        };
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        noteFx: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    }, {
        type: "instrument";
        name: string;
        id: string;
        instrument: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        };
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        noteFx: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    }>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
        mute: z.ZodBoolean;
        solo: z.ZodBoolean;
        arm: z.ZodBoolean;
        monitorMode: z.ZodEnum<["off", "auto", "in"]>;
        input: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["audio", "midi", "none"]>;
            deviceId: z.ZodOptional<z.ZodString>;
            channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
        }, "strip", z.ZodTypeAny, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }>>;
        output: z.ZodObject<{
            type: z.ZodEnum<["master", "bus", "track"]>;
            targetId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "track" | "master" | "bus";
            targetId: string;
        }, {
            type: "track" | "master" | "bus";
            targetId: string;
        }>;
        inserts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>, "many">;
        sends: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            targetBusId: z.ZodString;
            levelDb: z.ZodNumber;
            preFader: z.ZodBoolean;
            active: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }>, "many">;
        automationLanes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            target: z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>;
            mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
            points: z.ZodArray<z.ZodObject<{
                tick: z.ZodNumber;
                value: z.ZodNumber;
                curveIn: z.ZodOptional<z.ZodNumber>;
                curveOut: z.ZodOptional<z.ZodNumber>;
                stepHold: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }>, "many">;
            interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
            laneDisplayRange: z.ZodOptional<z.ZodObject<{
                min: z.ZodNumber;
                max: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                min: number;
                max: number;
            }, {
                min: number;
                max: number;
            }>>;
            visible: z.ZodBoolean;
            height: z.ZodNumber;
            color: z.ZodOptional<z.ZodString>;
            overrideValue: z.ZodOptional<z.ZodNumber>;
            overrideActive: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }>, "many">;
        macros: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            target: z.ZodUnion<[z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"plugin-param">;
                pluginId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }>]>;
            value: z.ZodNumber;
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }>, "many">;
        comments: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
        parentId: z.ZodOptional<z.ZodString>;
        height: z.ZodOptional<z.ZodNumber>;
        collapsed: z.ZodBoolean;
    } & {
        type: z.ZodLiteral<"group">;
        children: z.ZodArray<z.ZodString, "many">;
        clips: z.ZodArray<z.ZodNever, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "group";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: never[];
        children: string[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    }, {
        type: "group";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: never[];
        children: string[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    }>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
        mute: z.ZodBoolean;
        solo: z.ZodBoolean;
        arm: z.ZodBoolean;
        monitorMode: z.ZodEnum<["off", "auto", "in"]>;
        input: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["audio", "midi", "none"]>;
            deviceId: z.ZodOptional<z.ZodString>;
            channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
        }, "strip", z.ZodTypeAny, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }>>;
        output: z.ZodObject<{
            type: z.ZodEnum<["master", "bus", "track"]>;
            targetId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "track" | "master" | "bus";
            targetId: string;
        }, {
            type: "track" | "master" | "bus";
            targetId: string;
        }>;
        inserts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>, "many">;
        sends: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            targetBusId: z.ZodString;
            levelDb: z.ZodNumber;
            preFader: z.ZodBoolean;
            active: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }>, "many">;
        automationLanes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            target: z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>;
            mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
            points: z.ZodArray<z.ZodObject<{
                tick: z.ZodNumber;
                value: z.ZodNumber;
                curveIn: z.ZodOptional<z.ZodNumber>;
                curveOut: z.ZodOptional<z.ZodNumber>;
                stepHold: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }>, "many">;
            interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
            laneDisplayRange: z.ZodOptional<z.ZodObject<{
                min: z.ZodNumber;
                max: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                min: number;
                max: number;
            }, {
                min: number;
                max: number;
            }>>;
            visible: z.ZodBoolean;
            height: z.ZodNumber;
            color: z.ZodOptional<z.ZodString>;
            overrideValue: z.ZodOptional<z.ZodNumber>;
            overrideActive: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }>, "many">;
        macros: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            target: z.ZodUnion<[z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"plugin-param">;
                pluginId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }>]>;
            value: z.ZodNumber;
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }>, "many">;
        comments: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
        parentId: z.ZodOptional<z.ZodString>;
        height: z.ZodOptional<z.ZodNumber>;
        collapsed: z.ZodBoolean;
    } & {
        type: z.ZodLiteral<"return">;
        clips: z.ZodArray<z.ZodNever, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "return";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: never[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    }, {
        type: "return";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: never[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    }>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
        mute: z.ZodBoolean;
        solo: z.ZodBoolean;
        arm: z.ZodBoolean;
        monitorMode: z.ZodEnum<["off", "auto", "in"]>;
        input: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["audio", "midi", "none"]>;
            deviceId: z.ZodOptional<z.ZodString>;
            channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
        }, "strip", z.ZodTypeAny, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }>>;
        output: z.ZodObject<{
            type: z.ZodEnum<["master", "bus", "track"]>;
            targetId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "track" | "master" | "bus";
            targetId: string;
        }, {
            type: "track" | "master" | "bus";
            targetId: string;
        }>;
        inserts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>, "many">;
        sends: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            targetBusId: z.ZodString;
            levelDb: z.ZodNumber;
            preFader: z.ZodBoolean;
            active: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }>, "many">;
        automationLanes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            target: z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>;
            mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
            points: z.ZodArray<z.ZodObject<{
                tick: z.ZodNumber;
                value: z.ZodNumber;
                curveIn: z.ZodOptional<z.ZodNumber>;
                curveOut: z.ZodOptional<z.ZodNumber>;
                stepHold: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }>, "many">;
            interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
            laneDisplayRange: z.ZodOptional<z.ZodObject<{
                min: z.ZodNumber;
                max: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                min: number;
                max: number;
            }, {
                min: number;
                max: number;
            }>>;
            visible: z.ZodBoolean;
            height: z.ZodNumber;
            color: z.ZodOptional<z.ZodString>;
            overrideValue: z.ZodOptional<z.ZodNumber>;
            overrideActive: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }>, "many">;
        macros: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            target: z.ZodUnion<[z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"plugin-param">;
                pluginId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }>]>;
            value: z.ZodNumber;
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }>, "many">;
        comments: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
        parentId: z.ZodOptional<z.ZodString>;
        height: z.ZodOptional<z.ZodNumber>;
        collapsed: z.ZodBoolean;
    } & {
        type: z.ZodLiteral<"aux">;
        source: z.ZodEnum<["input", "bus", "track"]>;
        sourceId: z.ZodOptional<z.ZodString>;
        clips: z.ZodArray<z.ZodNever, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "aux";
        name: string;
        id: string;
        source: "track" | "bus" | "input";
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: never[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
        sourceId?: string | undefined;
    }, {
        type: "aux";
        name: string;
        id: string;
        source: "track" | "bus" | "input";
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: never[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
        sourceId?: string | undefined;
    }>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
        mute: z.ZodBoolean;
        solo: z.ZodBoolean;
        arm: z.ZodBoolean;
        monitorMode: z.ZodEnum<["off", "auto", "in"]>;
        input: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["audio", "midi", "none"]>;
            deviceId: z.ZodOptional<z.ZodString>;
            channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
        }, "strip", z.ZodTypeAny, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }>>;
        output: z.ZodObject<{
            type: z.ZodEnum<["master", "bus", "track"]>;
            targetId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "track" | "master" | "bus";
            targetId: string;
        }, {
            type: "track" | "master" | "bus";
            targetId: string;
        }>;
        inserts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>, "many">;
        sends: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            targetBusId: z.ZodString;
            levelDb: z.ZodNumber;
            preFader: z.ZodBoolean;
            active: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }>, "many">;
        automationLanes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            target: z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>;
            mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
            points: z.ZodArray<z.ZodObject<{
                tick: z.ZodNumber;
                value: z.ZodNumber;
                curveIn: z.ZodOptional<z.ZodNumber>;
                curveOut: z.ZodOptional<z.ZodNumber>;
                stepHold: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }>, "many">;
            interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
            laneDisplayRange: z.ZodOptional<z.ZodObject<{
                min: z.ZodNumber;
                max: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                min: number;
                max: number;
            }, {
                min: number;
                max: number;
            }>>;
            visible: z.ZodBoolean;
            height: z.ZodNumber;
            color: z.ZodOptional<z.ZodString>;
            overrideValue: z.ZodOptional<z.ZodNumber>;
            overrideActive: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }>, "many">;
        macros: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            target: z.ZodUnion<[z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"plugin-param">;
                pluginId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }>]>;
            value: z.ZodNumber;
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }>, "many">;
        comments: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
        parentId: z.ZodOptional<z.ZodString>;
        height: z.ZodOptional<z.ZodNumber>;
        collapsed: z.ZodBoolean;
    } & {
        type: z.ZodLiteral<"external-midi">;
        clips: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            clipId: z.ZodString;
            startTick: z.ZodNumber;
            endTick: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }, {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }>, "many">;
        deviceId: z.ZodString;
        channel: z.ZodNumber;
        programChange: z.ZodOptional<z.ZodNumber>;
        bankMsb: z.ZodOptional<z.ZodNumber>;
        bankLsb: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "external-midi";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        deviceId: string;
        channel: number;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
        programChange?: number | undefined;
        bankMsb?: number | undefined;
        bankLsb?: number | undefined;
    }, {
        type: "external-midi";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        deviceId: string;
        channel: number;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
        programChange?: number | undefined;
        bankMsb?: number | undefined;
        bankLsb?: number | undefined;
    }>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
        mute: z.ZodBoolean;
        solo: z.ZodBoolean;
        arm: z.ZodBoolean;
        monitorMode: z.ZodEnum<["off", "auto", "in"]>;
        input: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["audio", "midi", "none"]>;
            deviceId: z.ZodOptional<z.ZodString>;
            channel: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodEnum<["all"]>]>>;
        }, "strip", z.ZodTypeAny, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }, {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        }>>;
        output: z.ZodObject<{
            type: z.ZodEnum<["master", "bus", "track"]>;
            targetId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "track" | "master" | "bus";
            targetId: string;
        }, {
            type: "track" | "master" | "bus";
            targetId: string;
        }>;
        inserts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>, "many">;
        sends: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            targetBusId: z.ZodString;
            levelDb: z.ZodNumber;
            preFader: z.ZodBoolean;
            active: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }>, "many">;
        automationLanes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            target: z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>;
            mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
            points: z.ZodArray<z.ZodObject<{
                tick: z.ZodNumber;
                value: z.ZodNumber;
                curveIn: z.ZodOptional<z.ZodNumber>;
                curveOut: z.ZodOptional<z.ZodNumber>;
                stepHold: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }>, "many">;
            interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
            laneDisplayRange: z.ZodOptional<z.ZodObject<{
                min: z.ZodNumber;
                max: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                min: number;
                max: number;
            }, {
                min: number;
                max: number;
            }>>;
            visible: z.ZodBoolean;
            height: z.ZodNumber;
            color: z.ZodOptional<z.ZodString>;
            overrideValue: z.ZodOptional<z.ZodNumber>;
            overrideActive: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }>, "many">;
        macros: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            target: z.ZodUnion<[z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"plugin-param">;
                pluginId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }>]>;
            value: z.ZodNumber;
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }>, "many">;
        comments: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
        parentId: z.ZodOptional<z.ZodString>;
        height: z.ZodOptional<z.ZodNumber>;
        collapsed: z.ZodBoolean;
    } & {
        type: z.ZodLiteral<"hybrid">;
        audioClips: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            clipId: z.ZodString;
            lane: z.ZodNumber;
            startTick: z.ZodNumber;
            endTick: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
            lane: number;
        }, {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
            lane: number;
        }>, "many">;
        midiClips: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            clipId: z.ZodString;
            startTick: z.ZodNumber;
            endTick: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }, {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }>, "many">;
        instrument: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>>;
        noteFx: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "hybrid";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        noteFx: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        audioClips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
            lane: number;
        }[];
        midiClips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        instrument?: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        } | undefined;
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    }, {
        type: "hybrid";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        noteFx: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        audioClips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
            lane: number;
        }[];
        midiClips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        instrument?: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        } | undefined;
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    }>]>, "many">;
    buses: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
        mute: z.ZodBoolean;
        solo: z.ZodBoolean;
        inserts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>, "many">;
        sends: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            targetBusId: z.ZodString;
            levelDb: z.ZodNumber;
            preFader: z.ZodBoolean;
            active: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }, {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }>, "many">;
        automationLanes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            target: z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>;
            mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
            points: z.ZodArray<z.ZodObject<{
                tick: z.ZodNumber;
                value: z.ZodNumber;
                curveIn: z.ZodOptional<z.ZodNumber>;
                curveOut: z.ZodOptional<z.ZodNumber>;
                stepHold: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }>, "many">;
            interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
            laneDisplayRange: z.ZodOptional<z.ZodObject<{
                min: z.ZodNumber;
                max: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                min: number;
                max: number;
            }, {
                min: number;
                max: number;
            }>>;
            visible: z.ZodBoolean;
            height: z.ZodNumber;
            color: z.ZodOptional<z.ZodString>;
            overrideValue: z.ZodOptional<z.ZodNumber>;
            overrideActive: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }>, "many">;
        output: z.ZodObject<{
            type: z.ZodEnum<["master", "bus", "track"]>;
            targetId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "track" | "master" | "bus";
            targetId: string;
        }, {
            type: "track" | "master" | "bus";
            targetId: string;
        }>;
        macros: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            target: z.ZodUnion<[z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"plugin-param">;
                pluginId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }>]>;
            value: z.ZodNumber;
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }>, "many">;
        order: z.ZodNumber;
        collapsed: z.ZodBoolean;
        busType: z.ZodEnum<["aux", "subgroup", "sidechain"]>;
        sourceTrackIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        busType: "aux" | "subgroup" | "sidechain";
        sourceTrackIds: string[];
    }, {
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        busType: "aux" | "subgroup" | "sidechain";
        sourceTrackIds: string[];
    }>, "many">;
    master: z.ZodObject<{
        id: z.ZodLiteral<"master">;
        name: z.ZodLiteral<"Master">;
        color: z.ZodString;
        mute: z.ZodBoolean;
        inserts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>, "many">;
        automationLanes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            target: z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>;
            mode: z.ZodEnum<["read", "touch", "latch", "write", "trim"]>;
            points: z.ZodArray<z.ZodObject<{
                tick: z.ZodNumber;
                value: z.ZodNumber;
                curveIn: z.ZodOptional<z.ZodNumber>;
                curveOut: z.ZodOptional<z.ZodNumber>;
                stepHold: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }, {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }>, "many">;
            interpolation: z.ZodEnum<["step", "linear", "bezier"]>;
            laneDisplayRange: z.ZodOptional<z.ZodObject<{
                min: z.ZodNumber;
                max: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                min: number;
                max: number;
            }, {
                min: number;
                max: number;
            }>>;
            visible: z.ZodBoolean;
            height: z.ZodNumber;
            color: z.ZodOptional<z.ZodString>;
            overrideValue: z.ZodOptional<z.ZodNumber>;
            overrideActive: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }, {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }>, "many">;
        macros: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            target: z.ZodUnion<[z.ZodObject<{
                scope: z.ZodEnum<["track", "plugin", "send", "instrument", "macro"]>;
                ownerId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }, {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"plugin-param">;
                pluginId: z.ZodString;
                paramId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }, {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            }>]>;
            value: z.ZodNumber;
            min: z.ZodNumber;
            max: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }, {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }>, "many">;
        collapsed: z.ZodBoolean;
        limiter: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            definitionId: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            parameterValues: z.ZodRecord<z.ZodString, z.ZodNumber>;
            state: z.ZodOptional<z.ZodUnknown>;
            bypass: z.ZodBoolean;
            presetId: z.ZodOptional<z.ZodString>;
            enabled: z.ZodBoolean;
            sidechainSource: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }, {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }>>;
        dither: z.ZodEnum<["none", "triangular", "noise-shaped"]>;
        truePeak: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        name: "Master";
        id: "master";
        mute: boolean;
        color: string;
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        collapsed: boolean;
        dither: "none" | "triangular" | "noise-shaped";
        truePeak: boolean;
        limiter?: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        } | undefined;
    }, {
        name: "Master";
        id: "master";
        mute: boolean;
        color: string;
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        collapsed: boolean;
        dither: "none" | "triangular" | "noise-shaped";
        truePeak: boolean;
        limiter?: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        } | undefined;
    }>;
    scenes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        index: z.ZodNumber;
        color: z.ZodOptional<z.ZodString>;
        tempo: z.ZodOptional<z.ZodNumber>;
        timeSignature: z.ZodOptional<z.ZodObject<{
            numerator: z.ZodNumber;
            denominator: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            numerator: number;
            denominator: number;
        }, {
            numerator: number;
            denominator: number;
        }>>;
        slots: z.ZodArray<z.ZodObject<{
            trackId: z.ZodString;
            sceneIndex: z.ZodNumber;
            clipId: z.ZodOptional<z.ZodString>;
            state: z.ZodEnum<["empty", "stopped", "playing", "recording", "queued"]>;
            color: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            state: "empty" | "stopped" | "playing" | "recording" | "queued";
            trackId: string;
            sceneIndex: number;
            color?: string | undefined;
            clipId?: string | undefined;
        }, {
            state: "empty" | "stopped" | "playing" | "recording" | "queued";
            trackId: string;
            sceneIndex: number;
            color?: string | undefined;
            clipId?: string | undefined;
        }>, "many">;
        launchQuantization: z.ZodOptional<z.ZodNumber>;
        launchFollowAction: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["none", "next", "previous", "first", "last", "any", "other"]>;
            targetId: z.ZodOptional<z.ZodString>;
            delayBars: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type: "next" | "none" | "previous" | "first" | "last" | "any" | "other";
            delayBars: number;
            targetId?: string | undefined;
        }, {
            type: "next" | "none" | "previous" | "first" | "last" | "any" | "other";
            delayBars: number;
            targetId?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        index: number;
        slots: {
            state: "empty" | "stopped" | "playing" | "recording" | "queued";
            trackId: string;
            sceneIndex: number;
            color?: string | undefined;
            clipId?: string | undefined;
        }[];
        color?: string | undefined;
        tempo?: number | undefined;
        timeSignature?: {
            numerator: number;
            denominator: number;
        } | undefined;
        launchQuantization?: number | undefined;
        launchFollowAction?: {
            type: "next" | "none" | "previous" | "first" | "last" | "any" | "other";
            delayBars: number;
            targetId?: string | undefined;
        } | undefined;
    }, {
        name: string;
        id: string;
        index: number;
        slots: {
            state: "empty" | "stopped" | "playing" | "recording" | "queued";
            trackId: string;
            sceneIndex: number;
            color?: string | undefined;
            clipId?: string | undefined;
        }[];
        color?: string | undefined;
        tempo?: number | undefined;
        timeSignature?: {
            numerator: number;
            denominator: number;
        } | undefined;
        launchQuantization?: number | undefined;
        launchFollowAction?: {
            type: "next" | "none" | "previous" | "first" | "last" | "any" | "other";
            delayBars: number;
            targetId?: string | undefined;
        } | undefined;
    }>, "many">;
    assets: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        hash: z.ZodString;
        type: z.ZodEnum<["audio", "sample", "preset", "waveform", "analysis"]>;
        name: z.ZodString;
        size: z.ZodNumber;
        createdAt: z.ZodString;
        sampleRate: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<44100>, z.ZodLiteral<48000>, z.ZodLiteral<96000>]>>;
        channels: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        bitDepth: z.ZodOptional<z.ZodNumber>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        description: z.ZodOptional<z.ZodString>;
        source: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["recorded", "imported", "generated", "factory"]>;
            originalPath: z.ZodOptional<z.ZodString>;
            deviceName: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "recorded" | "imported" | "generated" | "factory";
            originalPath?: string | undefined;
            deviceName?: string | undefined;
        }, {
            type: "recorded" | "imported" | "generated" | "factory";
            originalPath?: string | undefined;
            deviceName?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "audio" | "analysis" | "sample" | "preset" | "waveform";
        name: string;
        size: number;
        hash: string;
        id: string;
        createdAt: string;
        source?: {
            type: "recorded" | "imported" | "generated" | "factory";
            originalPath?: string | undefined;
            deviceName?: string | undefined;
        } | undefined;
        sampleRate?: 44100 | 48000 | 96000 | undefined;
        channels?: number | undefined;
        duration?: number | undefined;
        bitDepth?: number | undefined;
        tags?: string[] | undefined;
        description?: string | undefined;
    }, {
        type: "audio" | "analysis" | "sample" | "preset" | "waveform";
        name: string;
        size: number;
        hash: string;
        id: string;
        createdAt: string;
        source?: {
            type: "recorded" | "imported" | "generated" | "factory";
            originalPath?: string | undefined;
            deviceName?: string | undefined;
        } | undefined;
        sampleRate?: 44100 | 48000 | 96000 | undefined;
        channels?: number | undefined;
        duration?: number | undefined;
        bitDepth?: number | undefined;
        tags?: string[] | undefined;
        description?: string | undefined;
    }>, "many">;
    presets: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        pluginDefinitionId: z.ZodString;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        author: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodString;
        modifiedAt: z.ZodString;
        hash: z.ZodOptional<z.ZodString>;
        embedded: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        modifiedAt: string;
        pluginDefinitionId: string;
        createdAt: string;
        hash?: string | undefined;
        category?: string | undefined;
        tags?: string[] | undefined;
        author?: string | undefined;
        embedded?: unknown;
    }, {
        name: string;
        id: string;
        modifiedAt: string;
        pluginDefinitionId: string;
        createdAt: string;
        hash?: string | undefined;
        category?: string | undefined;
        tags?: string[] | undefined;
        author?: string | undefined;
        embedded?: unknown;
    }>, "many">;
    scripting: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        sourceCode: z.ZodString;
        language: z.ZodEnum<["typescript", "javascript"]>;
        autoExecute: z.ZodBoolean;
        executeOnLoad: z.ZodBoolean;
        parameters: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            kind: z.ZodEnum<["number", "boolean", "enum", "string"]>;
            defaultValue: z.ZodUnknown;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            step: z.ZodOptional<z.ZodNumber>;
            options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            id: string;
            kind: "string" | "number" | "boolean" | "enum";
            step?: number | undefined;
            options?: string[] | undefined;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: unknown;
        }, {
            name: string;
            id: string;
            kind: "string" | "number" | "boolean" | "enum";
            step?: number | undefined;
            options?: string[] | undefined;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: unknown;
        }>, "many">>;
        dependencies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        version: z.ZodNumber;
        createdAt: z.ZodString;
        modifiedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        modifiedAt: string;
        version: number;
        createdAt: string;
        sourceCode: string;
        language: "typescript" | "javascript";
        autoExecute: boolean;
        executeOnLoad: boolean;
        parameters?: {
            name: string;
            id: string;
            kind: "string" | "number" | "boolean" | "enum";
            step?: number | undefined;
            options?: string[] | undefined;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: unknown;
        }[] | undefined;
        dependencies?: string[] | undefined;
    }, {
        name: string;
        id: string;
        modifiedAt: string;
        version: number;
        createdAt: string;
        sourceCode: string;
        language: "typescript" | "javascript";
        autoExecute: boolean;
        executeOnLoad: boolean;
        parameters?: {
            name: string;
            id: string;
            kind: "string" | "number" | "boolean" | "enum";
            step?: number | undefined;
            options?: string[] | undefined;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: unknown;
        }[] | undefined;
        dependencies?: string[] | undefined;
    }>, "many">;
    settings: z.ZodObject<{
        defaultSampleRate: z.ZodUnion<[z.ZodLiteral<44100>, z.ZodLiteral<48000>, z.ZodLiteral<96000>]>;
        defaultBitDepth: z.ZodUnion<[z.ZodLiteral<16>, z.ZodLiteral<24>, z.ZodLiteral<32>]>;
        defaultMidiInput: z.ZodOptional<z.ZodString>;
        defaultMidiOutput: z.ZodOptional<z.ZodString>;
        recordingSettings: z.ZodObject<{
            defaultCountInBars: z.ZodNumber;
            defaultPreRollMs: z.ZodNumber;
            metronomeDuringRecording: z.ZodBoolean;
            metronomeDuringCountIn: z.ZodBoolean;
            createTakes: z.ZodBoolean;
            autoPunchIn: z.ZodBoolean;
            autoPunchOut: z.ZodBoolean;
            inputMonitoring: z.ZodEnum<["auto", "on", "off"]>;
            fileFormat: z.ZodEnum<["wav", "aiff", "flac"]>;
            bitDepth: z.ZodUnion<[z.ZodLiteral<16>, z.ZodLiteral<24>, z.ZodLiteral<32>]>;
        }, "strip", z.ZodTypeAny, {
            inputMonitoring: "off" | "auto" | "on";
            bitDepth: 16 | 24 | 32;
            defaultCountInBars: number;
            defaultPreRollMs: number;
            metronomeDuringRecording: boolean;
            metronomeDuringCountIn: boolean;
            createTakes: boolean;
            autoPunchIn: boolean;
            autoPunchOut: boolean;
            fileFormat: "wav" | "aiff" | "flac";
        }, {
            inputMonitoring: "off" | "auto" | "on";
            bitDepth: 16 | 24 | 32;
            defaultCountInBars: number;
            defaultPreRollMs: number;
            metronomeDuringRecording: boolean;
            metronomeDuringCountIn: boolean;
            createTakes: boolean;
            autoPunchIn: boolean;
            autoPunchOut: boolean;
            fileFormat: "wav" | "aiff" | "flac";
        }>;
        editingSettings: z.ZodObject<{
            defaultSnapGrid: z.ZodNumber;
            snapEnabled: z.ZodBoolean;
            defaultQuantizeGrid: z.ZodNumber;
            quantizeStrength: z.ZodNumber;
            quantizeSwing: z.ZodNumber;
            fadeDefaultLength: z.ZodNumber;
            crossfadeDefaultLength: z.ZodNumber;
            autoCrossfade: z.ZodBoolean;
            defaultWarpMode: z.ZodEnum<["repitch", "beats", "texture", "tones", "complex"]>;
            stretchQuality: z.ZodEnum<["draft", "good", "best"]>;
        }, "strip", z.ZodTypeAny, {
            stretchQuality: "draft" | "good" | "best";
            defaultSnapGrid: number;
            snapEnabled: boolean;
            defaultQuantizeGrid: number;
            quantizeStrength: number;
            quantizeSwing: number;
            fadeDefaultLength: number;
            crossfadeDefaultLength: number;
            autoCrossfade: boolean;
            defaultWarpMode: "repitch" | "beats" | "texture" | "tones" | "complex";
        }, {
            stretchQuality: "draft" | "good" | "best";
            defaultSnapGrid: number;
            snapEnabled: boolean;
            defaultQuantizeGrid: number;
            quantizeStrength: number;
            quantizeSwing: number;
            fadeDefaultLength: number;
            crossfadeDefaultLength: number;
            autoCrossfade: boolean;
            defaultWarpMode: "repitch" | "beats" | "texture" | "tones" | "complex";
        }>;
        exportSettings: z.ZodObject<{
            defaultFormat: z.ZodEnum<["wav", "aiff", "flac", "mp3", "ogg"]>;
            defaultSampleRate: z.ZodUnion<[z.ZodLiteral<44100>, z.ZodLiteral<48000>, z.ZodLiteral<96000>]>;
            defaultBitDepth: z.ZodUnion<[z.ZodLiteral<16>, z.ZodLiteral<24>, z.ZodLiteral<32>]>;
            normalize: z.ZodBoolean;
            dither: z.ZodEnum<["none", "triangular", "noise-shaped"]>;
            includeTailMs: z.ZodNumber;
            defaultLocation: z.ZodEnum<["downloads", "project", "ask"]>;
        }, "strip", z.ZodTypeAny, {
            dither: "none" | "triangular" | "noise-shaped";
            defaultFormat: "wav" | "aiff" | "flac" | "mp3" | "ogg";
            defaultSampleRate: 44100 | 48000 | 96000;
            defaultBitDepth: 16 | 24 | 32;
            normalize: boolean;
            includeTailMs: number;
            defaultLocation: "downloads" | "project" | "ask";
        }, {
            dither: "none" | "triangular" | "noise-shaped";
            defaultFormat: "wav" | "aiff" | "flac" | "mp3" | "ogg";
            defaultSampleRate: 44100 | 48000 | 96000;
            defaultBitDepth: 16 | 24 | 32;
            normalize: boolean;
            includeTailMs: number;
            defaultLocation: "downloads" | "project" | "ask";
        }>;
        schedulerConfig: z.ZodObject<{
            prepareHorizonMs: z.ZodNumber;
            refillThresholdMs: z.ZodNumber;
            maxChunkMs: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            prepareHorizonMs: number;
            refillThresholdMs: number;
            maxChunkMs: number;
        }, {
            prepareHorizonMs: number;
            refillThresholdMs: number;
            maxChunkMs: number;
        }>;
        uiSettings: z.ZodObject<{
            theme: z.ZodEnum<["dark", "light", "system"]>;
            highContrast: z.ZodBoolean;
            reducedMotion: z.ZodBoolean;
            defaultTrackHeight: z.ZodNumber;
            zoomLevel: z.ZodNumber;
            showWaveformOverview: z.ZodBoolean;
            showMeterBridge: z.ZodBoolean;
            followPlayback: z.ZodBoolean;
            smoothScrolling: z.ZodBoolean;
            showGrid: z.ZodBoolean;
            gridLineSpacing: z.ZodEnum<["bar", "beat", "quarter", "eighth", "sixteenth"]>;
            keyboardMidiEnabled: z.ZodBoolean;
            keyboardMidiOctave: z.ZodNumber;
            keyboardMidiVelocity: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            theme: "dark" | "light" | "system";
            highContrast: boolean;
            reducedMotion: boolean;
            defaultTrackHeight: number;
            zoomLevel: number;
            showWaveformOverview: boolean;
            showMeterBridge: boolean;
            followPlayback: boolean;
            smoothScrolling: boolean;
            showGrid: boolean;
            gridLineSpacing: "bar" | "beat" | "quarter" | "eighth" | "sixteenth";
            keyboardMidiEnabled: boolean;
            keyboardMidiOctave: number;
            keyboardMidiVelocity: number;
        }, {
            theme: "dark" | "light" | "system";
            highContrast: boolean;
            reducedMotion: boolean;
            defaultTrackHeight: number;
            zoomLevel: number;
            showWaveformOverview: boolean;
            showMeterBridge: boolean;
            followPlayback: boolean;
            smoothScrolling: boolean;
            showGrid: boolean;
            gridLineSpacing: "bar" | "beat" | "quarter" | "eighth" | "sixteenth";
            keyboardMidiEnabled: boolean;
            keyboardMidiOctave: number;
            keyboardMidiVelocity: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        defaultSampleRate: 44100 | 48000 | 96000;
        defaultBitDepth: 16 | 24 | 32;
        recordingSettings: {
            inputMonitoring: "off" | "auto" | "on";
            bitDepth: 16 | 24 | 32;
            defaultCountInBars: number;
            defaultPreRollMs: number;
            metronomeDuringRecording: boolean;
            metronomeDuringCountIn: boolean;
            createTakes: boolean;
            autoPunchIn: boolean;
            autoPunchOut: boolean;
            fileFormat: "wav" | "aiff" | "flac";
        };
        editingSettings: {
            stretchQuality: "draft" | "good" | "best";
            defaultSnapGrid: number;
            snapEnabled: boolean;
            defaultQuantizeGrid: number;
            quantizeStrength: number;
            quantizeSwing: number;
            fadeDefaultLength: number;
            crossfadeDefaultLength: number;
            autoCrossfade: boolean;
            defaultWarpMode: "repitch" | "beats" | "texture" | "tones" | "complex";
        };
        exportSettings: {
            dither: "none" | "triangular" | "noise-shaped";
            defaultFormat: "wav" | "aiff" | "flac" | "mp3" | "ogg";
            defaultSampleRate: 44100 | 48000 | 96000;
            defaultBitDepth: 16 | 24 | 32;
            normalize: boolean;
            includeTailMs: number;
            defaultLocation: "downloads" | "project" | "ask";
        };
        schedulerConfig: {
            prepareHorizonMs: number;
            refillThresholdMs: number;
            maxChunkMs: number;
        };
        uiSettings: {
            theme: "dark" | "light" | "system";
            highContrast: boolean;
            reducedMotion: boolean;
            defaultTrackHeight: number;
            zoomLevel: number;
            showWaveformOverview: boolean;
            showMeterBridge: boolean;
            followPlayback: boolean;
            smoothScrolling: boolean;
            showGrid: boolean;
            gridLineSpacing: "bar" | "beat" | "quarter" | "eighth" | "sixteenth";
            keyboardMidiEnabled: boolean;
            keyboardMidiOctave: number;
            keyboardMidiVelocity: number;
        };
        defaultMidiInput?: string | undefined;
        defaultMidiOutput?: string | undefined;
    }, {
        defaultSampleRate: 44100 | 48000 | 96000;
        defaultBitDepth: 16 | 24 | 32;
        recordingSettings: {
            inputMonitoring: "off" | "auto" | "on";
            bitDepth: 16 | 24 | 32;
            defaultCountInBars: number;
            defaultPreRollMs: number;
            metronomeDuringRecording: boolean;
            metronomeDuringCountIn: boolean;
            createTakes: boolean;
            autoPunchIn: boolean;
            autoPunchOut: boolean;
            fileFormat: "wav" | "aiff" | "flac";
        };
        editingSettings: {
            stretchQuality: "draft" | "good" | "best";
            defaultSnapGrid: number;
            snapEnabled: boolean;
            defaultQuantizeGrid: number;
            quantizeStrength: number;
            quantizeSwing: number;
            fadeDefaultLength: number;
            crossfadeDefaultLength: number;
            autoCrossfade: boolean;
            defaultWarpMode: "repitch" | "beats" | "texture" | "tones" | "complex";
        };
        exportSettings: {
            dither: "none" | "triangular" | "noise-shaped";
            defaultFormat: "wav" | "aiff" | "flac" | "mp3" | "ogg";
            defaultSampleRate: 44100 | 48000 | 96000;
            defaultBitDepth: 16 | 24 | 32;
            normalize: boolean;
            includeTailMs: number;
            defaultLocation: "downloads" | "project" | "ask";
        };
        schedulerConfig: {
            prepareHorizonMs: number;
            refillThresholdMs: number;
            maxChunkMs: number;
        };
        uiSettings: {
            theme: "dark" | "light" | "system";
            highContrast: boolean;
            reducedMotion: boolean;
            defaultTrackHeight: number;
            zoomLevel: number;
            showWaveformOverview: boolean;
            showMeterBridge: boolean;
            followPlayback: boolean;
            smoothScrolling: boolean;
            showGrid: boolean;
            gridLineSpacing: "bar" | "beat" | "quarter" | "eighth" | "sixteenth";
            keyboardMidiEnabled: boolean;
            keyboardMidiOctave: number;
            keyboardMidiVelocity: number;
        };
        defaultMidiInput?: string | undefined;
        defaultMidiOutput?: string | undefined;
    }>;
    clips: z.ZodObject<{
        audio: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
            assetId: z.ZodString;
            lane: z.ZodNumber;
            startTick: z.ZodNumber;
            endTick: z.ZodNumber;
            sourceStartSample: z.ZodNumber;
            sourceEndSample: z.ZodNumber;
            gainDb: z.ZodNumber;
            transposeSemitones: z.ZodNumber;
            fineTuneCents: z.ZodNumber;
            reverse: z.ZodBoolean;
            fades: z.ZodObject<{
                inCurve: z.ZodEnum<["linear", "equal-power", "exponential", "logarithmic", "s-curve"]>;
                outCurve: z.ZodEnum<["linear", "equal-power", "exponential", "logarithmic", "s-curve"]>;
                inSamples: z.ZodNumber;
                outSamples: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                inSamples: number;
                outSamples: number;
            }, {
                inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                inSamples: number;
                outSamples: number;
            }>;
            warp: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodBoolean;
                markers: z.ZodArray<z.ZodObject<{
                    sourceSample: z.ZodNumber;
                    targetTick: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    sourceSample: number;
                    targetTick: number;
                }, {
                    sourceSample: number;
                    targetTick: number;
                }>, "many">;
                originBpm: z.ZodOptional<z.ZodNumber>;
                originalSampleRate: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                markers: {
                    sourceSample: number;
                    targetTick: number;
                }[];
                originalSampleRate: number;
                originBpm?: number | undefined;
            }, {
                enabled: boolean;
                markers: {
                    sourceSample: number;
                    targetTick: number;
                }[];
                originalSampleRate: number;
                originBpm?: number | undefined;
            }>>;
            stretchQuality: z.ZodEnum<["draft", "good", "best"]>;
            transientMarkers: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
            beatGrid: z.ZodOptional<z.ZodArray<z.ZodObject<{
                samplePosition: z.ZodNumber;
                beatPosition: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                samplePosition: number;
                beatPosition: number;
            }, {
                samplePosition: number;
                beatPosition: number;
            }>, "many">>;
            takeIndex: z.ZodOptional<z.ZodNumber>;
            isComped: z.ZodBoolean;
            gainEnvelope: z.ZodOptional<z.ZodArray<z.ZodObject<{
                tick: z.ZodNumber;
                gainDb: z.ZodNumber;
                curve: z.ZodEnum<["linear", "bezier"]>;
            }, "strip", z.ZodTypeAny, {
                tick: number;
                curve: "linear" | "bezier";
                gainDb: number;
            }, {
                tick: number;
                curve: "linear" | "bezier";
                gainDb: number;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            reverse: boolean;
            id: string;
            assetId: string;
            startTick: number;
            endTick: number;
            lane: number;
            gainDb: number;
            sourceStartSample: number;
            sourceEndSample: number;
            transposeSemitones: number;
            fineTuneCents: number;
            fades: {
                inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                inSamples: number;
                outSamples: number;
            };
            stretchQuality: "draft" | "good" | "best";
            isComped: boolean;
            name?: string | undefined;
            color?: string | undefined;
            warp?: {
                enabled: boolean;
                markers: {
                    sourceSample: number;
                    targetTick: number;
                }[];
                originalSampleRate: number;
                originBpm?: number | undefined;
            } | undefined;
            transientMarkers?: number[] | undefined;
            beatGrid?: {
                samplePosition: number;
                beatPosition: number;
            }[] | undefined;
            takeIndex?: number | undefined;
            gainEnvelope?: {
                tick: number;
                curve: "linear" | "bezier";
                gainDb: number;
            }[] | undefined;
        }, {
            reverse: boolean;
            id: string;
            assetId: string;
            startTick: number;
            endTick: number;
            lane: number;
            gainDb: number;
            sourceStartSample: number;
            sourceEndSample: number;
            transposeSemitones: number;
            fineTuneCents: number;
            fades: {
                inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                inSamples: number;
                outSamples: number;
            };
            stretchQuality: "draft" | "good" | "best";
            isComped: boolean;
            name?: string | undefined;
            color?: string | undefined;
            warp?: {
                enabled: boolean;
                markers: {
                    sourceSample: number;
                    targetTick: number;
                }[];
                originalSampleRate: number;
                originBpm?: number | undefined;
            } | undefined;
            transientMarkers?: number[] | undefined;
            beatGrid?: {
                samplePosition: number;
                beatPosition: number;
            }[] | undefined;
            takeIndex?: number | undefined;
            gainEnvelope?: {
                tick: number;
                curve: "linear" | "bezier";
                gainDb: number;
            }[] | undefined;
        }>, "many">;
        midi: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
            startTick: z.ZodNumber;
            endTick: z.ZodNumber;
            loop: z.ZodNullable<z.ZodObject<{
                startTick: z.ZodNumber;
                endTick: z.ZodNumber;
                enabled: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                startTick: number;
                endTick: number;
            }, {
                enabled: boolean;
                startTick: number;
                endTick: number;
            }>>;
            notes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                note: z.ZodNumber;
                velocity: z.ZodNumber;
                startTick: z.ZodNumber;
                durationTicks: z.ZodNumber;
                pitchOffset: z.ZodOptional<z.ZodNumber>;
                timbre: z.ZodOptional<z.ZodNumber>;
                pressure: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                velocity: number;
                startTick: number;
                note: number;
                durationTicks: number;
                pitchOffset?: number | undefined;
                timbre?: number | undefined;
                pressure?: number | undefined;
            }, {
                id: string;
                velocity: number;
                startTick: number;
                note: number;
                durationTicks: number;
                pitchOffset?: number | undefined;
                timbre?: number | undefined;
                pressure?: number | undefined;
            }>, "many">;
            cc: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                controller: z.ZodNumber;
                value: z.ZodNumber;
                tick: z.ZodNumber;
                curve: z.ZodOptional<z.ZodEnum<["step", "linear", "bezier"]>>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                value: number;
                tick: number;
                controller: number;
                curve?: "step" | "linear" | "bezier" | undefined;
            }, {
                id: string;
                value: number;
                tick: number;
                controller: number;
                curve?: "step" | "linear" | "bezier" | undefined;
            }>, "many">;
            pitchBend: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                value: z.ZodNumber;
                tick: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string;
                value: number;
                tick: number;
            }, {
                id: string;
                value: number;
                tick: number;
            }>, "many">;
            channelPressure: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                pressure: z.ZodNumber;
                tick: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string;
                tick: number;
                pressure: number;
            }, {
                id: string;
                tick: number;
                pressure: number;
            }>, "many">;
            polyAftertouch: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                note: z.ZodNumber;
                pressure: z.ZodNumber;
                tick: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string;
                tick: number;
                note: number;
                pressure: number;
            }, {
                id: string;
                tick: number;
                note: number;
                pressure: number;
            }>, "many">;
            programChanges: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                program: z.ZodNumber;
                tick: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string;
                tick: number;
                program: number;
            }, {
                id: string;
                tick: number;
                program: number;
            }>, "many">;
            mpe: z.ZodOptional<z.ZodArray<z.ZodObject<{
                noteId: z.ZodString;
                pitchBend: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    value: z.ZodNumber;
                    tick: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    value: number;
                    tick: number;
                }, {
                    id: string;
                    value: number;
                    tick: number;
                }>, "many">;
                timbre: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    controller: z.ZodNumber;
                    value: z.ZodNumber;
                    tick: z.ZodNumber;
                    curve: z.ZodOptional<z.ZodEnum<["step", "linear", "bezier"]>>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    value: number;
                    tick: number;
                    controller: number;
                    curve?: "step" | "linear" | "bezier" | undefined;
                }, {
                    id: string;
                    value: number;
                    tick: number;
                    controller: number;
                    curve?: "step" | "linear" | "bezier" | undefined;
                }>, "many">;
                pressure: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    note: z.ZodNumber;
                    pressure: z.ZodNumber;
                    tick: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    tick: number;
                    note: number;
                    pressure: number;
                }, {
                    id: string;
                    tick: number;
                    note: number;
                    pressure: number;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                timbre: {
                    id: string;
                    value: number;
                    tick: number;
                    controller: number;
                    curve?: "step" | "linear" | "bezier" | undefined;
                }[];
                pressure: {
                    id: string;
                    tick: number;
                    note: number;
                    pressure: number;
                }[];
                noteId: string;
                pitchBend: {
                    id: string;
                    value: number;
                    tick: number;
                }[];
            }, {
                timbre: {
                    id: string;
                    value: number;
                    tick: number;
                    controller: number;
                    curve?: "step" | "linear" | "bezier" | undefined;
                }[];
                pressure: {
                    id: string;
                    tick: number;
                    note: number;
                    pressure: number;
                }[];
                noteId: string;
                pitchBend: {
                    id: string;
                    value: number;
                    tick: number;
                }[];
            }>, "many">>;
            scaleHint: z.ZodOptional<z.ZodObject<{
                root: z.ZodNumber;
                mode: z.ZodEnum<["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "locrian", "harmonic-minor", "melodic-minor", "pentatonic-major", "pentatonic-minor", "blues", "chromatic"]>;
                enabled: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
                root: number;
            }, {
                enabled: boolean;
                mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
                root: number;
            }>>;
            generated: z.ZodOptional<z.ZodObject<{
                scriptId: z.ZodString;
                hash: z.ZodString;
                seed: z.ZodString;
                generatedAt: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                hash: string;
                scriptId: string;
                seed: string;
                generatedAt: number;
            }, {
                hash: string;
                scriptId: string;
                seed: string;
                generatedAt: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            loop: {
                enabled: boolean;
                startTick: number;
                endTick: number;
            } | null;
            startTick: number;
            endTick: number;
            pitchBend: {
                id: string;
                value: number;
                tick: number;
            }[];
            notes: {
                id: string;
                velocity: number;
                startTick: number;
                note: number;
                durationTicks: number;
                pitchOffset?: number | undefined;
                timbre?: number | undefined;
                pressure?: number | undefined;
            }[];
            cc: {
                id: string;
                value: number;
                tick: number;
                controller: number;
                curve?: "step" | "linear" | "bezier" | undefined;
            }[];
            channelPressure: {
                id: string;
                tick: number;
                pressure: number;
            }[];
            polyAftertouch: {
                id: string;
                tick: number;
                note: number;
                pressure: number;
            }[];
            programChanges: {
                id: string;
                tick: number;
                program: number;
            }[];
            name?: string | undefined;
            generated?: {
                hash: string;
                scriptId: string;
                seed: string;
                generatedAt: number;
            } | undefined;
            color?: string | undefined;
            mpe?: {
                timbre: {
                    id: string;
                    value: number;
                    tick: number;
                    controller: number;
                    curve?: "step" | "linear" | "bezier" | undefined;
                }[];
                pressure: {
                    id: string;
                    tick: number;
                    note: number;
                    pressure: number;
                }[];
                noteId: string;
                pitchBend: {
                    id: string;
                    value: number;
                    tick: number;
                }[];
            }[] | undefined;
            scaleHint?: {
                enabled: boolean;
                mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
                root: number;
            } | undefined;
        }, {
            id: string;
            loop: {
                enabled: boolean;
                startTick: number;
                endTick: number;
            } | null;
            startTick: number;
            endTick: number;
            pitchBend: {
                id: string;
                value: number;
                tick: number;
            }[];
            notes: {
                id: string;
                velocity: number;
                startTick: number;
                note: number;
                durationTicks: number;
                pitchOffset?: number | undefined;
                timbre?: number | undefined;
                pressure?: number | undefined;
            }[];
            cc: {
                id: string;
                value: number;
                tick: number;
                controller: number;
                curve?: "step" | "linear" | "bezier" | undefined;
            }[];
            channelPressure: {
                id: string;
                tick: number;
                pressure: number;
            }[];
            polyAftertouch: {
                id: string;
                tick: number;
                note: number;
                pressure: number;
            }[];
            programChanges: {
                id: string;
                tick: number;
                program: number;
            }[];
            name?: string | undefined;
            generated?: {
                hash: string;
                scriptId: string;
                seed: string;
                generatedAt: number;
            } | undefined;
            color?: string | undefined;
            mpe?: {
                timbre: {
                    id: string;
                    value: number;
                    tick: number;
                    controller: number;
                    curve?: "step" | "linear" | "bezier" | undefined;
                }[];
                pressure: {
                    id: string;
                    tick: number;
                    note: number;
                    pressure: number;
                }[];
                noteId: string;
                pitchBend: {
                    id: string;
                    value: number;
                    tick: number;
                }[];
            }[] | undefined;
            scaleHint?: {
                enabled: boolean;
                mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
                root: number;
            } | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        audio: {
            reverse: boolean;
            id: string;
            assetId: string;
            startTick: number;
            endTick: number;
            lane: number;
            gainDb: number;
            sourceStartSample: number;
            sourceEndSample: number;
            transposeSemitones: number;
            fineTuneCents: number;
            fades: {
                inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                inSamples: number;
                outSamples: number;
            };
            stretchQuality: "draft" | "good" | "best";
            isComped: boolean;
            name?: string | undefined;
            color?: string | undefined;
            warp?: {
                enabled: boolean;
                markers: {
                    sourceSample: number;
                    targetTick: number;
                }[];
                originalSampleRate: number;
                originBpm?: number | undefined;
            } | undefined;
            transientMarkers?: number[] | undefined;
            beatGrid?: {
                samplePosition: number;
                beatPosition: number;
            }[] | undefined;
            takeIndex?: number | undefined;
            gainEnvelope?: {
                tick: number;
                curve: "linear" | "bezier";
                gainDb: number;
            }[] | undefined;
        }[];
        midi: {
            id: string;
            loop: {
                enabled: boolean;
                startTick: number;
                endTick: number;
            } | null;
            startTick: number;
            endTick: number;
            pitchBend: {
                id: string;
                value: number;
                tick: number;
            }[];
            notes: {
                id: string;
                velocity: number;
                startTick: number;
                note: number;
                durationTicks: number;
                pitchOffset?: number | undefined;
                timbre?: number | undefined;
                pressure?: number | undefined;
            }[];
            cc: {
                id: string;
                value: number;
                tick: number;
                controller: number;
                curve?: "step" | "linear" | "bezier" | undefined;
            }[];
            channelPressure: {
                id: string;
                tick: number;
                pressure: number;
            }[];
            polyAftertouch: {
                id: string;
                tick: number;
                note: number;
                pressure: number;
            }[];
            programChanges: {
                id: string;
                tick: number;
                program: number;
            }[];
            name?: string | undefined;
            generated?: {
                hash: string;
                scriptId: string;
                seed: string;
                generatedAt: number;
            } | undefined;
            color?: string | undefined;
            mpe?: {
                timbre: {
                    id: string;
                    value: number;
                    tick: number;
                    controller: number;
                    curve?: "step" | "linear" | "bezier" | undefined;
                }[];
                pressure: {
                    id: string;
                    tick: number;
                    note: number;
                    pressure: number;
                }[];
                noteId: string;
                pitchBend: {
                    id: string;
                    value: number;
                    tick: number;
                }[];
            }[] | undefined;
            scaleHint?: {
                enabled: boolean;
                mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
                root: number;
            } | undefined;
        }[];
    }, {
        audio: {
            reverse: boolean;
            id: string;
            assetId: string;
            startTick: number;
            endTick: number;
            lane: number;
            gainDb: number;
            sourceStartSample: number;
            sourceEndSample: number;
            transposeSemitones: number;
            fineTuneCents: number;
            fades: {
                inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                inSamples: number;
                outSamples: number;
            };
            stretchQuality: "draft" | "good" | "best";
            isComped: boolean;
            name?: string | undefined;
            color?: string | undefined;
            warp?: {
                enabled: boolean;
                markers: {
                    sourceSample: number;
                    targetTick: number;
                }[];
                originalSampleRate: number;
                originBpm?: number | undefined;
            } | undefined;
            transientMarkers?: number[] | undefined;
            beatGrid?: {
                samplePosition: number;
                beatPosition: number;
            }[] | undefined;
            takeIndex?: number | undefined;
            gainEnvelope?: {
                tick: number;
                curve: "linear" | "bezier";
                gainDb: number;
            }[] | undefined;
        }[];
        midi: {
            id: string;
            loop: {
                enabled: boolean;
                startTick: number;
                endTick: number;
            } | null;
            startTick: number;
            endTick: number;
            pitchBend: {
                id: string;
                value: number;
                tick: number;
            }[];
            notes: {
                id: string;
                velocity: number;
                startTick: number;
                note: number;
                durationTicks: number;
                pitchOffset?: number | undefined;
                timbre?: number | undefined;
                pressure?: number | undefined;
            }[];
            cc: {
                id: string;
                value: number;
                tick: number;
                controller: number;
                curve?: "step" | "linear" | "bezier" | undefined;
            }[];
            channelPressure: {
                id: string;
                tick: number;
                pressure: number;
            }[];
            polyAftertouch: {
                id: string;
                tick: number;
                note: number;
                pressure: number;
            }[];
            programChanges: {
                id: string;
                tick: number;
                program: number;
            }[];
            name?: string | undefined;
            generated?: {
                hash: string;
                scriptId: string;
                seed: string;
                generatedAt: number;
            } | undefined;
            color?: string | undefined;
            mpe?: {
                timbre: {
                    id: string;
                    value: number;
                    tick: number;
                    controller: number;
                    curve?: "step" | "linear" | "bezier" | undefined;
                }[];
                pressure: {
                    id: string;
                    tick: number;
                    note: number;
                    pressure: number;
                }[];
                noteId: string;
                pitchBend: {
                    id: string;
                    value: number;
                    tick: number;
                }[];
            }[] | undefined;
            scaleHint?: {
                enabled: boolean;
                mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
                root: number;
            } | undefined;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    master: {
        name: "Master";
        id: "master";
        mute: boolean;
        color: string;
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        collapsed: boolean;
        dither: "none" | "triangular" | "noise-shaped";
        truePeak: boolean;
        limiter?: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        } | undefined;
    };
    clips: {
        audio: {
            reverse: boolean;
            id: string;
            assetId: string;
            startTick: number;
            endTick: number;
            lane: number;
            gainDb: number;
            sourceStartSample: number;
            sourceEndSample: number;
            transposeSemitones: number;
            fineTuneCents: number;
            fades: {
                inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                inSamples: number;
                outSamples: number;
            };
            stretchQuality: "draft" | "good" | "best";
            isComped: boolean;
            name?: string | undefined;
            color?: string | undefined;
            warp?: {
                enabled: boolean;
                markers: {
                    sourceSample: number;
                    targetTick: number;
                }[];
                originalSampleRate: number;
                originBpm?: number | undefined;
            } | undefined;
            transientMarkers?: number[] | undefined;
            beatGrid?: {
                samplePosition: number;
                beatPosition: number;
            }[] | undefined;
            takeIndex?: number | undefined;
            gainEnvelope?: {
                tick: number;
                curve: "linear" | "bezier";
                gainDb: number;
            }[] | undefined;
        }[];
        midi: {
            id: string;
            loop: {
                enabled: boolean;
                startTick: number;
                endTick: number;
            } | null;
            startTick: number;
            endTick: number;
            pitchBend: {
                id: string;
                value: number;
                tick: number;
            }[];
            notes: {
                id: string;
                velocity: number;
                startTick: number;
                note: number;
                durationTicks: number;
                pitchOffset?: number | undefined;
                timbre?: number | undefined;
                pressure?: number | undefined;
            }[];
            cc: {
                id: string;
                value: number;
                tick: number;
                controller: number;
                curve?: "step" | "linear" | "bezier" | undefined;
            }[];
            channelPressure: {
                id: string;
                tick: number;
                pressure: number;
            }[];
            polyAftertouch: {
                id: string;
                tick: number;
                note: number;
                pressure: number;
            }[];
            programChanges: {
                id: string;
                tick: number;
                program: number;
            }[];
            name?: string | undefined;
            generated?: {
                hash: string;
                scriptId: string;
                seed: string;
                generatedAt: number;
            } | undefined;
            color?: string | undefined;
            mpe?: {
                timbre: {
                    id: string;
                    value: number;
                    tick: number;
                    controller: number;
                    curve?: "step" | "linear" | "bezier" | undefined;
                }[];
                pressure: {
                    id: string;
                    tick: number;
                    note: number;
                    pressure: number;
                }[];
                noteId: string;
                pitchBend: {
                    id: string;
                    value: number;
                    tick: number;
                }[];
            }[] | undefined;
            scaleHint?: {
                enabled: boolean;
                mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
                root: number;
            } | undefined;
        }[];
    };
    markers: {
        type: "locator" | "cue" | "loop" | "section";
        name: string;
        id: string;
        tick: number;
        color?: string | undefined;
    }[];
    createdAt: string;
    schemaVersion: 1;
    updatedAt: string;
    sampleRatePreference: 44100 | 48000 | 96000;
    tempoMap: {
        tick: number;
        bpm: number;
        curve: "jump" | "ramp";
    }[];
    timeSignatureMap: {
        numerator: number;
        denominator: number;
        tick: number;
    }[];
    tracks: ({
        type: "audio";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
            lane: number;
        }[];
        compLanes: {
            name: string;
            id: string;
            active: boolean;
            muted: boolean;
            color?: string | undefined;
        }[];
        inputMonitoring: boolean;
        latencyCompensation: number;
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
        currentCompLaneId?: string | undefined;
        warpMode?: "repitch" | "beats" | "texture" | "tones" | "complex" | "complex-pro" | undefined;
    } | {
        type: "midi";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        destination: {
            type: "plugin";
            pluginId: string;
        } | {
            type: "external-midi";
            deviceId: string;
            channel: number;
        };
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    } | {
        type: "instrument";
        name: string;
        id: string;
        instrument: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        };
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        noteFx: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    } | {
        type: "group";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: never[];
        children: string[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    } | {
        type: "return";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: never[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    } | {
        type: "aux";
        name: string;
        id: string;
        source: "track" | "bus" | "input";
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: never[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
        sourceId?: string | undefined;
    } | {
        type: "external-midi";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        deviceId: string;
        channel: number;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
        programChange?: number | undefined;
        bankMsb?: number | undefined;
        bankLsb?: number | undefined;
    } | {
        type: "hybrid";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        noteFx: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        audioClips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
            lane: number;
        }[];
        midiClips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        instrument?: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        } | undefined;
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    })[];
    buses: {
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        busType: "aux" | "subgroup" | "sidechain";
        sourceTrackIds: string[];
    }[];
    scenes: {
        name: string;
        id: string;
        index: number;
        slots: {
            state: "empty" | "stopped" | "playing" | "recording" | "queued";
            trackId: string;
            sceneIndex: number;
            color?: string | undefined;
            clipId?: string | undefined;
        }[];
        color?: string | undefined;
        tempo?: number | undefined;
        timeSignature?: {
            numerator: number;
            denominator: number;
        } | undefined;
        launchQuantization?: number | undefined;
        launchFollowAction?: {
            type: "next" | "none" | "previous" | "first" | "last" | "any" | "other";
            delayBars: number;
            targetId?: string | undefined;
        } | undefined;
    }[];
    assets: {
        type: "audio" | "analysis" | "sample" | "preset" | "waveform";
        name: string;
        size: number;
        hash: string;
        id: string;
        createdAt: string;
        source?: {
            type: "recorded" | "imported" | "generated" | "factory";
            originalPath?: string | undefined;
            deviceName?: string | undefined;
        } | undefined;
        sampleRate?: 44100 | 48000 | 96000 | undefined;
        channels?: number | undefined;
        duration?: number | undefined;
        bitDepth?: number | undefined;
        tags?: string[] | undefined;
        description?: string | undefined;
    }[];
    presets: {
        name: string;
        id: string;
        modifiedAt: string;
        pluginDefinitionId: string;
        createdAt: string;
        hash?: string | undefined;
        category?: string | undefined;
        tags?: string[] | undefined;
        author?: string | undefined;
        embedded?: unknown;
    }[];
    scripting: {
        name: string;
        id: string;
        modifiedAt: string;
        version: number;
        createdAt: string;
        sourceCode: string;
        language: "typescript" | "javascript";
        autoExecute: boolean;
        executeOnLoad: boolean;
        parameters?: {
            name: string;
            id: string;
            kind: "string" | "number" | "boolean" | "enum";
            step?: number | undefined;
            options?: string[] | undefined;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: unknown;
        }[] | undefined;
        dependencies?: string[] | undefined;
    }[];
    settings: {
        defaultSampleRate: 44100 | 48000 | 96000;
        defaultBitDepth: 16 | 24 | 32;
        recordingSettings: {
            inputMonitoring: "off" | "auto" | "on";
            bitDepth: 16 | 24 | 32;
            defaultCountInBars: number;
            defaultPreRollMs: number;
            metronomeDuringRecording: boolean;
            metronomeDuringCountIn: boolean;
            createTakes: boolean;
            autoPunchIn: boolean;
            autoPunchOut: boolean;
            fileFormat: "wav" | "aiff" | "flac";
        };
        editingSettings: {
            stretchQuality: "draft" | "good" | "best";
            defaultSnapGrid: number;
            snapEnabled: boolean;
            defaultQuantizeGrid: number;
            quantizeStrength: number;
            quantizeSwing: number;
            fadeDefaultLength: number;
            crossfadeDefaultLength: number;
            autoCrossfade: boolean;
            defaultWarpMode: "repitch" | "beats" | "texture" | "tones" | "complex";
        };
        exportSettings: {
            dither: "none" | "triangular" | "noise-shaped";
            defaultFormat: "wav" | "aiff" | "flac" | "mp3" | "ogg";
            defaultSampleRate: 44100 | 48000 | 96000;
            defaultBitDepth: 16 | 24 | 32;
            normalize: boolean;
            includeTailMs: number;
            defaultLocation: "downloads" | "project" | "ask";
        };
        schedulerConfig: {
            prepareHorizonMs: number;
            refillThresholdMs: number;
            maxChunkMs: number;
        };
        uiSettings: {
            theme: "dark" | "light" | "system";
            highContrast: boolean;
            reducedMotion: boolean;
            defaultTrackHeight: number;
            zoomLevel: number;
            showWaveformOverview: boolean;
            showMeterBridge: boolean;
            followPlayback: boolean;
            smoothScrolling: boolean;
            showGrid: boolean;
            gridLineSpacing: "bar" | "beat" | "quarter" | "eighth" | "sixteenth";
            keyboardMidiEnabled: boolean;
            keyboardMidiOctave: number;
            keyboardMidiVelocity: number;
        };
        defaultMidiInput?: string | undefined;
        defaultMidiOutput?: string | undefined;
    };
}, {
    name: string;
    id: string;
    master: {
        name: "Master";
        id: "master";
        mute: boolean;
        color: string;
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        collapsed: boolean;
        dither: "none" | "triangular" | "noise-shaped";
        truePeak: boolean;
        limiter?: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        } | undefined;
    };
    clips: {
        audio: {
            reverse: boolean;
            id: string;
            assetId: string;
            startTick: number;
            endTick: number;
            lane: number;
            gainDb: number;
            sourceStartSample: number;
            sourceEndSample: number;
            transposeSemitones: number;
            fineTuneCents: number;
            fades: {
                inCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                outCurve: "linear" | "equal-power" | "exponential" | "logarithmic" | "s-curve";
                inSamples: number;
                outSamples: number;
            };
            stretchQuality: "draft" | "good" | "best";
            isComped: boolean;
            name?: string | undefined;
            color?: string | undefined;
            warp?: {
                enabled: boolean;
                markers: {
                    sourceSample: number;
                    targetTick: number;
                }[];
                originalSampleRate: number;
                originBpm?: number | undefined;
            } | undefined;
            transientMarkers?: number[] | undefined;
            beatGrid?: {
                samplePosition: number;
                beatPosition: number;
            }[] | undefined;
            takeIndex?: number | undefined;
            gainEnvelope?: {
                tick: number;
                curve: "linear" | "bezier";
                gainDb: number;
            }[] | undefined;
        }[];
        midi: {
            id: string;
            loop: {
                enabled: boolean;
                startTick: number;
                endTick: number;
            } | null;
            startTick: number;
            endTick: number;
            pitchBend: {
                id: string;
                value: number;
                tick: number;
            }[];
            notes: {
                id: string;
                velocity: number;
                startTick: number;
                note: number;
                durationTicks: number;
                pitchOffset?: number | undefined;
                timbre?: number | undefined;
                pressure?: number | undefined;
            }[];
            cc: {
                id: string;
                value: number;
                tick: number;
                controller: number;
                curve?: "step" | "linear" | "bezier" | undefined;
            }[];
            channelPressure: {
                id: string;
                tick: number;
                pressure: number;
            }[];
            polyAftertouch: {
                id: string;
                tick: number;
                note: number;
                pressure: number;
            }[];
            programChanges: {
                id: string;
                tick: number;
                program: number;
            }[];
            name?: string | undefined;
            generated?: {
                hash: string;
                scriptId: string;
                seed: string;
                generatedAt: number;
            } | undefined;
            color?: string | undefined;
            mpe?: {
                timbre: {
                    id: string;
                    value: number;
                    tick: number;
                    controller: number;
                    curve?: "step" | "linear" | "bezier" | undefined;
                }[];
                pressure: {
                    id: string;
                    tick: number;
                    note: number;
                    pressure: number;
                }[];
                noteId: string;
                pitchBend: {
                    id: string;
                    value: number;
                    tick: number;
                }[];
            }[] | undefined;
            scaleHint?: {
                enabled: boolean;
                mode: "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian" | "harmonic-minor" | "melodic-minor" | "pentatonic-major" | "pentatonic-minor" | "blues" | "chromatic";
                root: number;
            } | undefined;
        }[];
    };
    markers: {
        type: "locator" | "cue" | "loop" | "section";
        name: string;
        id: string;
        tick: number;
        color?: string | undefined;
    }[];
    createdAt: string;
    schemaVersion: 1;
    updatedAt: string;
    sampleRatePreference: 44100 | 48000 | 96000;
    tempoMap: {
        tick: number;
        bpm: number;
        curve: "jump" | "ramp";
    }[];
    timeSignatureMap: {
        numerator: number;
        denominator: number;
        tick: number;
    }[];
    tracks: ({
        type: "audio";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
            lane: number;
        }[];
        compLanes: {
            name: string;
            id: string;
            active: boolean;
            muted: boolean;
            color?: string | undefined;
        }[];
        inputMonitoring: boolean;
        latencyCompensation: number;
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
        currentCompLaneId?: string | undefined;
        warpMode?: "repitch" | "beats" | "texture" | "tones" | "complex" | "complex-pro" | undefined;
    } | {
        type: "midi";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        destination: {
            type: "plugin";
            pluginId: string;
        } | {
            type: "external-midi";
            deviceId: string;
            channel: number;
        };
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    } | {
        type: "instrument";
        name: string;
        id: string;
        instrument: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        };
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        noteFx: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    } | {
        type: "group";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: never[];
        children: string[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    } | {
        type: "return";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: never[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    } | {
        type: "aux";
        name: string;
        id: string;
        source: "track" | "bus" | "input";
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: never[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
        sourceId?: string | undefined;
    } | {
        type: "external-midi";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        deviceId: string;
        channel: number;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        clips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
        programChange?: number | undefined;
        bankMsb?: number | undefined;
        bankLsb?: number | undefined;
    } | {
        type: "hybrid";
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        arm: boolean;
        monitorMode: "off" | "auto" | "in";
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        noteFx: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        audioClips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
            lane: number;
        }[];
        midiClips: {
            id: string;
            startTick: number;
            endTick: number;
            clipId: string;
        }[];
        instrument?: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        } | undefined;
        input?: {
            type: "audio" | "midi" | "none";
            deviceId?: string | undefined;
            channel?: number | "all" | undefined;
        } | undefined;
        height?: number | undefined;
        comments?: string | undefined;
        parentId?: string | undefined;
    })[];
    buses: {
        name: string;
        id: string;
        mute: boolean;
        color: string;
        solo: boolean;
        output: {
            type: "track" | "master" | "bus";
            targetId: string;
        };
        inserts: {
            id: string;
            bypass: boolean;
            enabled: boolean;
            definitionId: string;
            parameterValues: Record<string, number>;
            name?: string | undefined;
            state?: unknown;
            presetId?: string | undefined;
            sidechainSource?: string | undefined;
        }[];
        sends: {
            id: string;
            targetBusId: string;
            levelDb: number;
            preFader: boolean;
            active: boolean;
        }[];
        automationLanes: {
            id: string;
            height: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            };
            mode: "read" | "touch" | "latch" | "write" | "trim";
            points: {
                value: number;
                tick: number;
                curveIn?: number | undefined;
                curveOut?: number | undefined;
                stepHold?: boolean | undefined;
            }[];
            interpolation: "step" | "linear" | "bezier";
            visible: boolean;
            overrideActive: boolean;
            color?: string | undefined;
            laneDisplayRange?: {
                min: number;
                max: number;
            } | undefined;
            overrideValue?: number | undefined;
        }[];
        macros: {
            name: string;
            id: string;
            value: number;
            min: number;
            max: number;
            target: {
                scope: "track" | "plugin" | "send" | "instrument" | "macro";
                ownerId: string;
                paramId: string;
            } | {
                type: "plugin-param";
                paramId: string;
                pluginId: string;
            };
        }[];
        order: number;
        collapsed: boolean;
        busType: "aux" | "subgroup" | "sidechain";
        sourceTrackIds: string[];
    }[];
    scenes: {
        name: string;
        id: string;
        index: number;
        slots: {
            state: "empty" | "stopped" | "playing" | "recording" | "queued";
            trackId: string;
            sceneIndex: number;
            color?: string | undefined;
            clipId?: string | undefined;
        }[];
        color?: string | undefined;
        tempo?: number | undefined;
        timeSignature?: {
            numerator: number;
            denominator: number;
        } | undefined;
        launchQuantization?: number | undefined;
        launchFollowAction?: {
            type: "next" | "none" | "previous" | "first" | "last" | "any" | "other";
            delayBars: number;
            targetId?: string | undefined;
        } | undefined;
    }[];
    assets: {
        type: "audio" | "analysis" | "sample" | "preset" | "waveform";
        name: string;
        size: number;
        hash: string;
        id: string;
        createdAt: string;
        source?: {
            type: "recorded" | "imported" | "generated" | "factory";
            originalPath?: string | undefined;
            deviceName?: string | undefined;
        } | undefined;
        sampleRate?: 44100 | 48000 | 96000 | undefined;
        channels?: number | undefined;
        duration?: number | undefined;
        bitDepth?: number | undefined;
        tags?: string[] | undefined;
        description?: string | undefined;
    }[];
    presets: {
        name: string;
        id: string;
        modifiedAt: string;
        pluginDefinitionId: string;
        createdAt: string;
        hash?: string | undefined;
        category?: string | undefined;
        tags?: string[] | undefined;
        author?: string | undefined;
        embedded?: unknown;
    }[];
    scripting: {
        name: string;
        id: string;
        modifiedAt: string;
        version: number;
        createdAt: string;
        sourceCode: string;
        language: "typescript" | "javascript";
        autoExecute: boolean;
        executeOnLoad: boolean;
        parameters?: {
            name: string;
            id: string;
            kind: "string" | "number" | "boolean" | "enum";
            step?: number | undefined;
            options?: string[] | undefined;
            min?: number | undefined;
            max?: number | undefined;
            defaultValue?: unknown;
        }[] | undefined;
        dependencies?: string[] | undefined;
    }[];
    settings: {
        defaultSampleRate: 44100 | 48000 | 96000;
        defaultBitDepth: 16 | 24 | 32;
        recordingSettings: {
            inputMonitoring: "off" | "auto" | "on";
            bitDepth: 16 | 24 | 32;
            defaultCountInBars: number;
            defaultPreRollMs: number;
            metronomeDuringRecording: boolean;
            metronomeDuringCountIn: boolean;
            createTakes: boolean;
            autoPunchIn: boolean;
            autoPunchOut: boolean;
            fileFormat: "wav" | "aiff" | "flac";
        };
        editingSettings: {
            stretchQuality: "draft" | "good" | "best";
            defaultSnapGrid: number;
            snapEnabled: boolean;
            defaultQuantizeGrid: number;
            quantizeStrength: number;
            quantizeSwing: number;
            fadeDefaultLength: number;
            crossfadeDefaultLength: number;
            autoCrossfade: boolean;
            defaultWarpMode: "repitch" | "beats" | "texture" | "tones" | "complex";
        };
        exportSettings: {
            dither: "none" | "triangular" | "noise-shaped";
            defaultFormat: "wav" | "aiff" | "flac" | "mp3" | "ogg";
            defaultSampleRate: 44100 | 48000 | 96000;
            defaultBitDepth: 16 | 24 | 32;
            normalize: boolean;
            includeTailMs: number;
            defaultLocation: "downloads" | "project" | "ask";
        };
        schedulerConfig: {
            prepareHorizonMs: number;
            refillThresholdMs: number;
            maxChunkMs: number;
        };
        uiSettings: {
            theme: "dark" | "light" | "system";
            highContrast: boolean;
            reducedMotion: boolean;
            defaultTrackHeight: number;
            zoomLevel: number;
            showWaveformOverview: boolean;
            showMeterBridge: boolean;
            followPlayback: boolean;
            smoothScrolling: boolean;
            showGrid: boolean;
            gridLineSpacing: "bar" | "beat" | "quarter" | "eighth" | "sixteenth";
            keyboardMidiEnabled: boolean;
            keyboardMidiOctave: number;
            keyboardMidiVelocity: number;
        };
        defaultMidiInput?: string | undefined;
        defaultMidiOutput?: string | undefined;
    };
}>;
export declare const CommandActorSchema: z.ZodEnum<["user", "script", "migration", "import", "system"]>;
export declare const CommandSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    timestamp: z.ZodNumber;
    payload: z.ZodUnknown;
    actor: z.ZodEnum<["user", "script", "migration", "import", "system"]>;
    actorId: z.ZodOptional<z.ZodString>;
    batchId: z.ZodOptional<z.ZodString>;
    batchIndex: z.ZodOptional<z.ZodNumber>;
    optimistic: z.ZodOptional<z.ZodBoolean>;
    confirmed: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    timestamp: number;
    actor: "system" | "user" | "script" | "migration" | "import";
    actorId?: string | undefined;
    batchId?: string | undefined;
    payload?: unknown;
    batchIndex?: number | undefined;
    optimistic?: boolean | undefined;
    confirmed?: boolean | undefined;
}, {
    type: string;
    id: string;
    timestamp: number;
    actor: "system" | "user" | "script" | "migration" | "import";
    actorId?: string | undefined;
    batchId?: string | undefined;
    payload?: unknown;
    batchIndex?: number | undefined;
    optimistic?: boolean | undefined;
    confirmed?: boolean | undefined;
}>;
/**
 * Validate a project object against the schema
 */
export declare function validateProject(data: unknown): {
    success: true;
    data: z.infer<typeof ProjectSchema>;
} | {
    success: false;
    errors: z.ZodError;
};
/**
 * Validate a command object
 */
export declare function validateCommand(data: unknown): {
    success: true;
    data: z.infer<typeof CommandSchema>;
} | {
    success: false;
    errors: z.ZodError;
};
/**
 * Validate an audio clip
 */
export declare function validateAudioClip(data: unknown): {
    success: true;
    data: z.infer<typeof AudioClipSchema>;
} | {
    success: false;
    errors: z.ZodError;
};
/**
 * Validate a MIDI clip
 */
export declare function validateMidiClip(data: unknown): {
    success: true;
    data: z.infer<typeof MidiClipSchema>;
} | {
    success: false;
    errors: z.ZodError;
};
/**
 * Validate a track
 */
export declare function validateTrack(data: unknown): {
    success: true;
    data: z.infer<typeof TrackSchema>;
} | {
    success: false;
    errors: z.ZodError;
};
//# sourceMappingURL=schemas.d.ts.map