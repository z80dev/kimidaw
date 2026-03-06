/**
 * Command/Event sourcing system for the DAW
 *
 * Implements section 7.6 of the engineering spec
 *
 * Every mutation is represented as a command. This enables:
 * - Deterministic undo/redo
 * - Event sourcing for autosave
 * - Script provenance tracking
 * - Collaborative editing foundation
 */
/** Command actor types */
export type CommandActor = 'user' | 'script' | 'migration' | 'import' | 'system';
/** Command interface */
export interface Command<TPayload = unknown> {
    id: string;
    type: string;
    timestamp: number;
    payload: TPayload;
    actor: CommandActor;
    actorId?: string;
    batchId?: string;
    batchIndex?: number;
    optimistic?: boolean;
    confirmed?: boolean;
}
/** Inverse command for undo */
export interface InverseCommand<TPayload = unknown> {
    commandId: string;
    type: string;
    payload: TPayload;
}
/** Command envelope with metadata */
export interface CommandEnvelope {
    command: Command;
    inverse?: InverseCommand;
    projectId: string;
    schemaVersion: number;
}
/** Command journal entry (stored) */
export interface CommandJournalEntry {
    sequence: number;
    timestamp: number;
    envelope: CommandEnvelope;
    checksum?: string;
}
/** Command batch for atomic operations */
export interface CommandBatch {
    id: string;
    commands: Command[];
    timestamp: number;
    actor: CommandActor;
    actorId?: string;
}
/** Project snapshot (for periodic checkpoints) */
export interface ProjectSnapshot {
    id: string;
    projectId: string;
    sequence: number;
    timestamp: number;
    state: unknown;
    schemaVersion: number;
    checksum: string;
}
export interface CreateProjectPayload {
    name: string;
    sampleRate: 44100 | 48000 | 96000;
}
export interface RenameProjectPayload {
    projectId: string;
    name: string;
    oldName: string;
}
export interface CreateTrackPayload {
    type: 'audio' | 'midi' | 'instrument' | 'group' | 'return' | 'aux' | 'external-midi' | 'hybrid';
    name: string;
    index?: number;
}
export interface DeleteTrackPayload {
    trackId: string;
    deletedTrack: unknown;
}
export interface RenameTrackPayload {
    trackId: string;
    name: string;
    oldName: string;
}
export interface MoveTrackPayload {
    trackId: string;
    newIndex: number;
    oldIndex: number;
}
export interface SetTrackMutePayload {
    trackId: string;
    mute: boolean;
}
export interface SetTrackSoloPayload {
    trackId: string;
    solo: boolean;
}
export interface SetTrackArmPayload {
    trackId: string;
    arm: boolean;
}
export interface CreateClipPayload {
    trackId: string;
    clipType: 'audio' | 'midi';
    startTick: number;
    durationTicks: number;
    clipData: unknown;
}
export interface DeleteClipPayload {
    trackId: string;
    clipId: string;
    deletedClip: unknown;
}
export interface MoveClipPayload {
    trackId: string;
    clipId: string;
    newStartTick: number;
    oldStartTick: number;
}
export interface ResizeClipPayload {
    trackId: string;
    clipId: string;
    newStartTick: number;
    newEndTick: number;
    oldStartTick: number;
    oldEndTick: number;
}
export interface SplitClipPayload {
    trackId: string;
    clipId: string;
    splitTick: number;
    newClipId: string;
}
export interface AddNotePayload {
    clipId: string;
    note: {
        id: string;
        note: number;
        velocity: number;
        startTick: number;
        durationTicks: number;
    };
}
export interface DeleteNotePayload {
    clipId: string;
    noteId: string;
    deletedNote: unknown;
}
export interface MoveNotePayload {
    clipId: string;
    noteId: string;
    newStartTick: number;
    newNote?: number;
    oldStartTick: number;
    oldNote?: number;
}
export interface ResizeNotePayload {
    clipId: string;
    noteId: string;
    newDuration: number;
    oldDuration: number;
}
export interface SetNoteVelocityPayload {
    clipId: string;
    noteId: string;
    velocity: number;
    oldVelocity: number;
}
export interface QuantizeNotesPayload {
    clipId: string;
    noteIds: string[];
    gridTicks: number;
    strength: number;
    swing: number;
    originalPositions: Array<{
        noteId: string;
        startTick: number;
    }>;
}
export interface AddAutomationPointPayload {
    laneId: string;
    point: {
        tick: number;
        value: number;
        curveIn?: number;
        curveOut?: number;
    };
}
export interface DeleteAutomationPointPayload {
    laneId: string;
    pointIndex: number;
    deletedPoint: unknown;
}
export interface MoveAutomationPointPayload {
    laneId: string;
    pointIndex: number;
    newTick: number;
    newValue: number;
    oldTick: number;
    oldValue: number;
}
export interface AddPluginPayload {
    trackId: string;
    slot: 'insert' | 'send' | 'instrument';
    pluginId: string;
    definitionId: string;
    index?: number;
}
export interface RemovePluginPayload {
    trackId: string;
    slot: 'insert' | 'send' | 'instrument';
    pluginId: string;
    removedPlugin: unknown;
    index: number;
}
export interface MovePluginPayload {
    trackId: string;
    slot: 'insert' | 'send';
    pluginId: string;
    newIndex: number;
    oldIndex: number;
}
export interface SetPluginParamPayload {
    pluginId: string;
    paramId: string;
    value: number;
    oldValue: number;
}
export interface SetPluginBypassPayload {
    pluginId: string;
    bypass: boolean;
}
export interface SetTempoPayload {
    tick: number;
    bpm: number;
    oldBpm: number;
}
export interface SetTimeSignaturePayload {
    tick: number;
    numerator: number;
    denominator: number;
    oldNumerator: number;
    oldDenominator: number;
}
export interface SetLoopRegionPayload {
    startTick: number;
    endTick: number;
    oldStartTick: number;
    oldEndTick: number;
}
export interface AddMarkerPayload {
    tick: number;
    name: string;
    type: 'locator' | 'cue' | 'loop' | 'section';
    color?: string;
}
export interface DeleteMarkerPayload {
    markerId: string;
    deletedMarker: unknown;
}
export interface ImportAssetPayload {
    assetId: string;
    hash: string;
    metadata: {
        name: string;
        size: number;
        sampleRate?: number;
        channels?: number;
        duration?: number;
    };
}
export interface DeleteAssetPayload {
    assetId: string;
}
/** Generate a unique command ID */
export declare function generateCommandId(): string;
/** Generate a batch ID */
export declare function generateBatchId(): string;
/** Create a command */
export declare function createCommand<TPayload>(type: string, payload: TPayload, options?: {
    actor?: CommandActor;
    actorId?: string;
    batchId?: string;
    batchIndex?: number;
    id?: string;
}): Command<TPayload>;
/** Create a command batch */
export declare function createCommandBatch(commands: Command[], options?: {
    actor?: CommandActor;
    actorId?: string;
    id?: string;
}): CommandBatch;
/** Create inverse for a command */
export declare function createInverseCommand(command: Command): InverseCommand | undefined;
/** Create a journal entry */
export declare function createJournalEntry(sequence: number, envelope: CommandEnvelope): CommandJournalEntry;
/** Validate journal entry integrity */
export declare function validateJournalEntry(entry: CommandJournalEntry): boolean;
/** Command validation result */
export interface CommandValidationResult {
    valid: boolean;
    errors: string[];
}
/** Validate a command structure */
export declare function validateCommand(command: Command): CommandValidationResult;
export declare const COMMAND_TYPES: {
    readonly PROJECT: {
        readonly CREATE: "project.create";
        readonly RENAME: "project.rename";
        readonly DELETE: "project.delete";
        readonly SETTINGS: "project.settings";
    };
    readonly TRACK: {
        readonly CREATE: "track.create";
        readonly DELETE: "track.delete";
        readonly RENAME: "track.rename";
        readonly MOVE: "track.move";
        readonly MUTE: "track.mute";
        readonly SOLO: "track.solo";
        readonly ARM: "track.arm";
        readonly INPUT: "track.input";
        readonly OUTPUT: "track.output";
    };
    readonly CLIP: {
        readonly CREATE: "clip.create";
        readonly DELETE: "clip.delete";
        readonly MOVE: "clip.move";
        readonly RESIZE: "clip.resize";
        readonly SPLIT: "clip.split";
        readonly DUPLICATE: "clip.duplicate";
    };
    readonly NOTE: {
        readonly ADD: "note.add";
        readonly DELETE: "note.delete";
        readonly MOVE: "note.move";
        readonly RESIZE: "note.resize";
        readonly VELOCITY: "note.velocity";
        readonly QUANTIZE: "note.quantize";
    };
    readonly AUTOMATION: {
        readonly ADD_POINT: "automation.add-point";
        readonly DELETE_POINT: "automation.delete-point";
        readonly MOVE_POINT: "automation.move-point";
        readonly CLEAR: "automation.clear";
    };
    readonly PLUGIN: {
        readonly ADD: "plugin.add";
        readonly REMOVE: "plugin.remove";
        readonly MOVE: "plugin.move";
        readonly PARAM: "plugin.param";
        readonly BYPASS: "plugin.bypass";
        readonly PRESET: "plugin.preset";
    };
    readonly TRANSPORT: {
        readonly TEMPO: "transport.tempo";
        readonly TIME_SIGNATURE: "transport.time-signature";
        readonly LOOP: "transport.loop";
    };
    readonly MARKER: {
        readonly ADD: "marker.add";
        readonly DELETE: "marker.delete";
        readonly MOVE: "marker.move";
    };
    readonly ASSET: {
        readonly IMPORT: "asset.import";
        readonly DELETE: "asset.delete";
        readonly UPDATE: "asset.update";
    };
};
//# sourceMappingURL=commands.d.ts.map