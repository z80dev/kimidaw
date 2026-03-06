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
  actorId?: string; // For scripts: scriptId, for users: userId, etc.
  
  // Optional grouping for batched commands
  batchId?: string;
  batchIndex?: number;
  
  // For optimistic UI updates
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
  checksum?: string; // For integrity
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
  sequence: number; // Last applied command sequence
  timestamp: number;
  state: unknown; // Serialized project state
  schemaVersion: number;
  checksum: string;
}

// ==================== Command Types ====================

// Project commands
export interface CreateProjectPayload {
  name: string;
  sampleRate: 44100 | 48000 | 96000;
}

export interface RenameProjectPayload {
  projectId: string;
  name: string;
  oldName: string;
}

// Track commands
export interface CreateTrackPayload {
  type: 'audio' | 'midi' | 'instrument' | 'group' | 'return' | 'aux' | 'external-midi' | 'hybrid';
  name: string;
  index?: number;
}

export interface DeleteTrackPayload {
  trackId: string;
  deletedTrack: unknown; // Full track state for undo
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

// Clip commands
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

// MIDI commands
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
  originalPositions: Array<{ noteId: string; startTick: number }>;
}

// Automation commands
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

// Plugin commands
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

// Transport commands
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

// Marker commands
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

// Asset commands
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

// ==================== Command Factory ====================

/** Generate a unique command ID */
export function generateCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Generate a batch ID */
export function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Create a command */
export function createCommand<TPayload>(
  type: string,
  payload: TPayload,
  options?: {
    actor?: CommandActor;
    actorId?: string;
    batchId?: string;
    batchIndex?: number;
    id?: string;
  }
): Command<TPayload> {
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
export function createCommandBatch(
  commands: Command[],
  options?: {
    actor?: CommandActor;
    actorId?: string;
    id?: string;
  }
): CommandBatch {
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
export function createInverseCommand(
  command: Command
): InverseCommand | undefined {
  switch (command.type) {
    case 'track.rename':
      const renamePayload = command.payload as RenameTrackPayload;
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
      const mutePayload = command.payload as SetTrackMutePayload;
      return {
        commandId: command.id,
        type: 'track.mute',
        payload: {
          trackId: mutePayload.trackId,
          mute: !mutePayload.mute,
        },
      };
    
    case 'track.solo':
      const soloPayload = command.payload as SetTrackSoloPayload;
      return {
        commandId: command.id,
        type: 'track.solo',
        payload: {
          trackId: soloPayload.trackId,
          solo: !soloPayload.solo,
        },
      };
    
    case 'plugin.param':
      const paramPayload = command.payload as SetPluginParamPayload;
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
      const tempoPayload = command.payload as SetTempoPayload;
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
export function createJournalEntry(
  sequence: number,
  envelope: CommandEnvelope
): CommandJournalEntry {
  return {
    sequence,
    timestamp: Date.now(),
    envelope,
    checksum: computeChecksum(envelope),
  };
}

/** Simple checksum for integrity verification */
function computeChecksum(envelope: CommandEnvelope): string {
  // In production, use a proper hash like SHA-256
  const data = `${envelope.projectId}:${envelope.command.id}:${envelope.command.timestamp}`;
  return btoa(data).slice(0, 16);
}

/** Validate journal entry integrity */
export function validateJournalEntry(entry: CommandJournalEntry): boolean {
  if (!entry.checksum) {
    return true; // No checksum to validate
  }
  
  const computed = computeChecksum(entry.envelope);
  return computed === entry.checksum;
}

// ==================== Command Validation ====================

/** Command validation result */
export interface CommandValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a command structure */
export function validateCommand(command: Command): CommandValidationResult {
  const errors: string[] = [];
  
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
} as const;
