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
// ==================== Command Factory ====================
/** Generate a unique command ID */
export function generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
/** Generate a batch ID */
export function generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
/** Create a command */
export function createCommand(type, payload, options) {
    return {
        id: options?.id ?? generateCommandId(),
        type,
        timestamp: Date.now(),
        payload,
        actor: options?.actor ?? 'user',
        actorId: options?.actorId,
        batchId: options?.batchId,
        batchIndex: options?.batchIndex,
    };
}
/** Create a command batch */
export function createCommandBatch(commands, options) {
    const batchId = options?.id ?? generateBatchId();
    return {
        id: batchId,
        commands: commands.map((cmd, index) => ({
            ...cmd,
            batchId,
            batchIndex: index,
        })),
        timestamp: Date.now(),
        actor: options?.actor ?? 'user',
        actorId: options?.actorId,
    };
}
// ==================== Inverse Command Generation ====================
/** Create inverse for a command */
export function createInverseCommand(command) {
    switch (command.type) {
        case 'track.rename':
            const renamePayload = command.payload;
            return {
                commandId: command.id,
                type: 'track.rename',
                payload: {
                    trackId: renamePayload.trackId,
                    name: renamePayload.oldName,
                    oldName: renamePayload.name,
                },
            };
        case 'track.mute':
            const mutePayload = command.payload;
            return {
                commandId: command.id,
                type: 'track.mute',
                payload: {
                    trackId: mutePayload.trackId,
                    mute: !mutePayload.mute,
                },
            };
        case 'track.solo':
            const soloPayload = command.payload;
            return {
                commandId: command.id,
                type: 'track.solo',
                payload: {
                    trackId: soloPayload.trackId,
                    solo: !soloPayload.solo,
                },
            };
        case 'plugin.param':
            const paramPayload = command.payload;
            return {
                commandId: command.id,
                type: 'plugin.param',
                payload: {
                    pluginId: paramPayload.pluginId,
                    paramId: paramPayload.paramId,
                    value: paramPayload.oldValue,
                    oldValue: paramPayload.value,
                },
            };
        case 'transport.tempo':
            const tempoPayload = command.payload;
            return {
                commandId: command.id,
                type: 'transport.tempo',
                payload: {
                    tick: tempoPayload.tick,
                    bpm: tempoPayload.oldBpm,
                    oldBpm: tempoPayload.bpm,
                },
            };
        // For commands that don't have a simple inverse, return undefined
        // The caller should handle these with snapshot-based undo
        default:
            return undefined;
    }
}
// ==================== Command Journal ====================
/** Create a journal entry */
export function createJournalEntry(sequence, envelope) {
    return {
        sequence,
        timestamp: Date.now(),
        envelope,
        checksum: computeChecksum(envelope),
    };
}
/** Simple checksum for integrity verification */
function computeChecksum(envelope) {
    // In production, use a proper hash like SHA-256
    const data = `${envelope.projectId}:${envelope.command.id}:${envelope.command.timestamp}`;
    return btoa(data).slice(0, 16);
}
/** Validate journal entry integrity */
export function validateJournalEntry(entry) {
    if (!entry.checksum) {
        return true; // No checksum to validate
    }
    const computed = computeChecksum(entry.envelope);
    return computed === entry.checksum;
}
/** Validate a command structure */
export function validateCommand(command) {
    const errors = [];
    if (!command.id) {
        errors.push('Command must have an id');
    }
    if (!command.type) {
        errors.push('Command must have a type');
    }
    if (typeof command.timestamp !== 'number') {
        errors.push('Command must have a numeric timestamp');
    }
    if (!command.payload) {
        errors.push('Command must have a payload');
    }
    if (!['user', 'script', 'migration', 'import', 'system'].includes(command.actor)) {
        errors.push(`Invalid actor type: ${command.actor}`);
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
// ==================== Command Type Constants ====================
export const COMMAND_TYPES = {
    PROJECT: {
        CREATE: 'project.create',
        RENAME: 'project.rename',
        DELETE: 'project.delete',
        SETTINGS: 'project.settings',
    },
    TRACK: {
        CREATE: 'track.create',
        DELETE: 'track.delete',
        RENAME: 'track.rename',
        MOVE: 'track.move',
        MUTE: 'track.mute',
        SOLO: 'track.solo',
        ARM: 'track.arm',
        INPUT: 'track.input',
        OUTPUT: 'track.output',
    },
    CLIP: {
        CREATE: 'clip.create',
        DELETE: 'clip.delete',
        MOVE: 'clip.move',
        RESIZE: 'clip.resize',
        SPLIT: 'clip.split',
        DUPLICATE: 'clip.duplicate',
    },
    NOTE: {
        ADD: 'note.add',
        DELETE: 'note.delete',
        MOVE: 'note.move',
        RESIZE: 'note.resize',
        VELOCITY: 'note.velocity',
        QUANTIZE: 'note.quantize',
    },
    AUTOMATION: {
        ADD_POINT: 'automation.add-point',
        DELETE_POINT: 'automation.delete-point',
        MOVE_POINT: 'automation.move-point',
        CLEAR: 'automation.clear',
    },
    PLUGIN: {
        ADD: 'plugin.add',
        REMOVE: 'plugin.remove',
        MOVE: 'plugin.move',
        PARAM: 'plugin.param',
        BYPASS: 'plugin.bypass',
        PRESET: 'plugin.preset',
    },
    TRANSPORT: {
        TEMPO: 'transport.tempo',
        TIME_SIGNATURE: 'transport.time-signature',
        LOOP: 'transport.loop',
    },
    MARKER: {
        ADD: 'marker.add',
        DELETE: 'marker.delete',
        MOVE: 'marker.move',
    },
    ASSET: {
        IMPORT: 'asset.import',
        DELETE: 'asset.delete',
        UPDATE: 'asset.update',
    },
};
